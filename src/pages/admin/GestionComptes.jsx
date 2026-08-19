import { ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { sb } from '../../lib/supabase'
import { ROLES } from '../../lib/roles'
import { setCache } from '../../lib/db'
import { Btn, Field, ValidationBanner } from '../../components/ui'
import {
  validateUserAccount,
  validateUserAccountStep1,
  validateAccountRole,
} from '../../lib/validation'
import { createUserAccount, updateProfile, deleteProfile, mergeProfiles } from '../../lib/accounts'

function GestionComptes({ comptes, setComptes, currentUser, reloadComptes }) {
  const pending=comptes.filter(c=>c.pending&&!c.actif);
  // Admin secondaire : approbation/rejet des inscriptions uniquement —
  // création, changement de rôle, désactivation et suppression réservés à l'admin principal.
  const isFullAdmin = currentUser?.role === 'admin'

  const syncComptesList = async (updated) => {
    setComptes(updated)
    setCache('comptes', updated)
  }

  const refreshComptes = async (extra = []) => {
    if (reloadComptes) {
      const data = await reloadComptes()
      const merged = mergeProfiles(data, comptes, extra)
      setComptes(merged)
      setCache('comptes', merged)
      return merged
    }
    const merged = mergeProfiles(comptes, extra)
    await syncComptesList(merged)
    return merged
  }

  const saveProfileUpdate = async (id, updates) => {
    let row = null
    if (navigator.onLine && sb) {
      row = await updateProfile(id, updates)
    }
    const updated = comptes.map(c => (c.id === id ? { ...c, ...updates, ...row } : c))
    await syncComptesList(updated)
  }

  const approuver = async (id) => {
    try {
      await saveProfileUpdate(id, { actif: true, pending: false })
    } catch (e) {
      console.error('[GestionComptes] approuver:', e)
      alert('Erreur lors de l\'approbation.')
    }
  }

  const rejeter = async (id) => {
    if (!confirm('Rejeter cette demande d\'accès ?')) return
    try {
      if (navigator.onLine && sb) await deleteProfile(id)
      await refreshComptes()
    } catch (e) {
      console.error('[GestionComptes] rejeter:', e)
      alert('Erreur lors du rejet.')
    }
  }

  const [step,setStep]=useState(0);
  const [form,setForm]=useState({nom:'',email:'',pw:'',role:'utilisateur',actif:true});
  const [editId,setEditId]=useState(null);
  const [editPw,setEditPw]=useState('');
  const [editRole,setEditRole]=useState(null);
  const [formErrors,setFormErrors]=useState({});
  const [validationMessages,setValidationMessages]=useState([]);
  const [creating,setCreating]=useState(false);

  const patchForm=(patch)=>{
    setForm(f=>({...f,...patch}));
    const keys=Object.keys(patch);
    setFormErrors(prev=>{const next={...prev};keys.forEach(k=>delete next[k]);return next;});
    if(validationMessages.length)setValidationMessages([]);
  };

  const nextStep=()=>{
    if(step!==1) return;
    const checked=validateUserAccountStep1(form);
    if(!checked.ok){
      setFormErrors(checked.fieldErrors);
      setValidationMessages(checked.messages);
      return;
    }
    setForm(f=>({...f, nom:checked.data.nom}));
    setFormErrors({});
    setValidationMessages([]);
    setStep(2);
  };

  const addCompte = async () => {
    const checked = validateUserAccount(form)
    if (!checked.ok) {
      setFormErrors(checked.fieldErrors)
      setValidationMessages(checked.messages)
      return
    }
    const data = checked.data
    if (comptes.find(c => c.email === data.email)) return alert('Cet email existe déjà')

    if (!navigator.onLine) {
      return alert('Connexion requise pour créer un compte utilisateur.')
    }

    setCreating(true)
    try {
      const result = await createUserAccount({
        nom: data.nom,
        email: data.email,
        pw: data.pw,
        role: data.role,
        actif: true,
        pending: false,
      })

      if (!result.ok) {
        const msg = result.msg || ''
        let detail
        if (msg.includes('already registered') || msg.includes('already been registered')) {
          detail = `L'email ${data.email} est déjà utilisé par un autre compte.`
        } else if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many')) {
          detail = `Trop de tentatives — Supabase limite les créations de comptes. Attendez quelques minutes et réessayez.`
        } else if (msg.includes('Password') || msg.includes('password')) {
          detail = `Mot de passe trop faible. Utilisez au moins 6 caractères avec lettres et chiffres.`
        } else {
          detail = msg || 'Erreur lors de la création du compte.'
        }
        setValidationMessages([detail])
        return
      }

      await new Promise(r => setTimeout(r, 800))
      await refreshComptes()
      setForm({ nom: '', email: '', pw: '', role: 'utilisateur', actif: true })
      setStep(0)
      setFormErrors({})
      setValidationMessages([])
    } catch (e) {
      console.error('[GestionComptes] addCompte:', e)
      setValidationMessages(['Erreur réseau lors de la création. Vérifiez votre connexion.'])
    } finally {
      setCreating(false)
    }
  }

  const cancelForm=()=>{
    setStep(0);
    setForm({nom:'',email:'',pw:'',role:'utilisateur',actif:true});
    setFormErrors({});setValidationMessages([]);
  };

  const toggleActif = async (id) => {
    const compte = comptes.find(c => c.id === id)
    if (!compte) return
    try {
      await saveProfileUpdate(id, { actif: !compte.actif })
    } catch (e) {
      console.error('[GestionComptes] toggleActif:', e)
      alert('Erreur lors de la mise à jour.')
    }
  }

  const deleteCompte = async (id) => {
    if (comptes.find(c => c.id === id)?.email === currentUser?.email) {
      return alert('Impossible de supprimer votre propre compte')
    }
    if (!confirm('Supprimer ce compte définitivement ?')) return
    try {
      if (navigator.onLine && sb) await deleteProfile(id)
      await refreshComptes()
    } catch (e) {
      console.error('[GestionComptes] deleteCompte:', e)
      alert('Erreur lors de la suppression.')
    }
  }

  const savePw = async (id) => {
    const compte = comptes.find(c => c.id === id)
    if (!compte?.email) return
    try {
      const { error } = await sb.auth.resetPasswordForEmail(compte.email, {
        redirectTo: window.location.origin,
      })
      if (error) throw error
      alert(`Un lien de réinitialisation a été envoyé à ${compte.email}`)
      setEditId(null)
      setEditPw('')
    } catch (e) {
      console.error('[GestionComptes] savePw:', e)
      alert('Impossible d\'envoyer le lien de réinitialisation.')
    }
  }

  const saveRole = async (id) => {
    const checked = validateAccountRole(editRole)
    if (!checked.ok) return alert(checked.messages.join('\n'))
    try {
      await saveProfileUpdate(id, { role: checked.data })
      setEditRole(null)
      setEditId(null)
    } catch (e) {
      console.error('[GestionComptes] saveRole:', e)
      alert('Erreur lors du changement de rôle.')
    }
  }

  return <div className="app-page max-w-3xl space-y-5">

    {/* ── Demandes en attente ── */}
    {pending.length>0&&<div className="app-card overflow-hidden">
      <div className="p-4 flex items-center gap-3" style={{background:'linear-gradient(135deg,rgba(251,146,60,0.1),rgba(239,68,68,0.08))'}}>
        <span className="text-2xl">🔔</span>
        <div><h3 className="font-bold text-orange-700">{pending.length} demande(s) d'accès en attente</h3>
        <p className="text-xs text-orange-500">Ces comptes attendent votre approbation</p></div>
      </div>
      <div className="divide-y">
        {pending.map(c=><div key={c.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-bold text-slate-800">{c.nom}</p>
            <p className="text-sm text-slate-500">{c.email}</p>
            <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'999px',
              background:ROLES[c.role]?.bg||'#f1f5f9',color:ROLES[c.role]?.color||'#64748b'}}>
              {ROLES[c.role]?.icon} {ROLES[c.role]?.label||c.role}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>approuver(c.id)}
              style={{padding:'7px 16px',borderRadius:'9px',border:'none',background:'#16a34a',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
              ✓ Approuver
            </button>
            <button onClick={()=>rejeter(c.id)}
              style={{padding:'7px 16px',borderRadius:'9px',border:'1px solid #fca5a5',background:'rgba(239,68,68,0.08)',color:'#dc2626',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
              ✕ Rejeter
            </button>
          </div>
        </div>)}
      </div>
    </div>}

    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between">
        <div><h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck size={20} color="#0d9488" strokeWidth={2.3} /> Comptes utilisateurs</h2>
          <p className="text-xs text-slate-400 mt-0.5">{comptes.length} compte(s) · {comptes.filter(c=>c.actif).length} actif(s)</p></div>
        {step===0&&isFullAdmin&&<Btn onClick={()=>setStep(1)}>+ Nouvel utilisateur</Btn>}
      </div>

      {/* ── Étape 1 ── */}
      {step===1&&<div className="p-6 bg-green-50 border-b border-green-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-black text-sm">1</div>
          <div><p className="font-bold text-green-800">Qui est cet utilisateur ?</p><p className="text-xs text-green-600">Commencez par renseigner le nom complet</p></div>
        </div>
        <ValidationBanner messages={validationMessages} onDismiss={()=>setValidationMessages([])} />
        <Field label="Nom complet *" value={form.nom} onChange={e=>patchForm({nom:e.target.value})} error={formErrors.nom} placeholder="Ex: Dr. Kofi Mensah"/>
        <div className="flex gap-2 mt-4">
          <Btn onClick={nextStep}>Suivant →</Btn>
          <button onClick={cancelForm} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Annuler</button>
        </div>
      </div>}

      {/* ── Étape 2 ── */}
      {step===2&&<div className="p-6 bg-green-50 border-b border-green-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-black text-sm">2</div>
          <div>
            <p className="font-bold text-green-800">Informations de connexion pour <span className="text-green-700">{form.nom}</span></p>
            <p className="text-xs text-green-600">Définissez l'email, le mot de passe et le rôle</p>
          </div>
        </div>
        <ValidationBanner messages={validationMessages} onDismiss={()=>setValidationMessages([])} />
        <div className="grid grid-cols-1 gap-3">
          <Field label="Email *" value={form.email} onChange={e=>patchForm({email:e.target.value})} error={formErrors.email} type="email" placeholder="ex: kofi@gmail.com"/>
          <Field label="Mot de passe *" value={form.pw} onChange={e=>patchForm({pw:e.target.value})} error={formErrors.pw} type="password" placeholder="Minimum 6 caractères"/>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-2 block">Rôle *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {r:'admin',      icon:'👑',  label:'Administrateur',    desc:'Accès complet à tout le système',                         color:'#d97706', bg:'#fffbeb', border:'#fde68a'},
                {r:'admin2',     icon:'🛡️', label:'Admin secondaire',  desc:'Accès complet sauf gestion des comptes',                  color:'#7c3aed', bg:'#faf5ff', border:'#e9d5ff'},
                {r:'veterinaire',icon:'🩺',  label:'Vétérinaire',       desc:'Patients, consultations, ordonnances, RDV, chirurgies',   color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe'},
                {r:'pharmacien', icon:'💊',  label:'Pharmacien',        desc:'Médicaments, stock, ventes, caisse, commandes',           color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0'},
                {r:'technicien', icon:'🔬',  label:'Technicien',        desc:'Patients, préparations, inventaire, tâches, agenda',      color:'#0891b2', bg:'#ecfeff', border:'#a5f3fc'},
                {r:'caissier',   icon:'🛒',  label:'Caissier',          desc:'Ventes, facturation, créances, caisse',                   color:'#7c3aed', bg:'#faf5ff', border:'#e9d5ff'},
              ].map(opt=>(
                <div key={opt.r} onClick={()=>patchForm({role:opt.r})}
                  style={{cursor:'pointer',borderRadius:12,padding:'12px',border:`2px solid ${form.role===opt.r?opt.border:'#e2e8f0'}`,background:form.role===opt.r?opt.bg:'var(--app-surface)',transition:'all .15s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                    <span style={{fontSize:18}}>{opt.icon}</span>
                    <span style={{fontWeight:700,fontSize:13,color:form.role===opt.r?opt.color:'#334155'}}>{opt.label}</span>
                    {form.role===opt.r&&<span style={{marginLeft:'auto',color:'#16a34a',fontSize:14}}>✓</span>}
                  </div>
                  <p style={{fontSize:11,color:'#94a3b8',lineHeight:1.4}}>{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={()=>setStep(1)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">← Retour</button>
          <Btn onClick={addCompte} disabled={creating}>{creating ? '⏳ Création…' : '✓ Créer le compte'}</Btn>
          <button onClick={cancelForm} className="px-4 py-2 text-sm text-red-400 hover:text-red-600">Annuler</button>
        </div>
      </div>}

      {/* ── Liste ── */}
      <div className="divide-y divide-slate-100">
        {comptes.map(c=>{
          const isMe=c.email===currentUser?.email;
          return <div key={c.id} className={`p-5 transition-all hover:bg-slate-50 ${!c.actif?'opacity-50':''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-base shrink-0"
                  style={{background:c.role==='admin'?'linear-gradient(135deg,#f59e0b,#d97706)':'linear-gradient(135deg,#166534,#1d4ed8)'}}>
                  {c.nom.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900">{c.nom}</p>
                    {isMe&&<span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Vous</span>}
                    {c.pending&&<span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">⏳ En attente</span>}
                  </div>
                  <p className="text-sm text-slate-500">{c.email}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${c.role==='admin'?'bg-yellow-100 text-yellow-700':'bg-blue-100 text-blue-700'}`}>
                      {ROLES[c.role]?.icon} {ROLES[c.role]?.label}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${c.actif?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                      {c.actif?'✓ Actif':'✕ Inactif'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {isFullAdmin&&<>
                <button onClick={()=>{setEditId(editId===c.id&&editRole===null?null:c.id);setEditRole(c.role);setEditPw('');}}
                  className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-semibold transition-all text-left">
                  🎭 Changer rôle
                </button>
                <button onClick={()=>{setEditId(editId===c.id&&editRole!==null?null:c.id);setEditRole(null);setEditPw('');}}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold transition-all">
                  🔑 Mot de passe
                </button>
                {!isMe&&<button onClick={()=>toggleActif(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${c.actif?'bg-red-50 hover:bg-red-100 text-red-600':'bg-green-50 hover:bg-green-100 text-green-600'}`}>
                  {c.actif?'⏸ Désactiver':'▶ Activer'}
                </button>}
                {!isMe&&<button onClick={()=>deleteCompte(c.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-semibold transition-all inline-flex items-center gap-1"><Trash2 size={12} strokeWidth={2.4} /> Supprimer</button>}
                </>}
              </div>
            </div>
            {/* Changer rôle inline */}
            {editId===c.id&&editRole!==null&&<div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-bold text-amber-800 mb-2">Changer le rôle de {c.nom} :</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  {r:'admin',      icon:'👑',  label:'Administrateur',   color:'#d97706', bg:'#fffbeb', border:'#fde68a'},
                  {r:'admin2',     icon:'🛡️', label:'Admin secondaire', color:'#7c3aed', bg:'#faf5ff', border:'#e9d5ff'},
                  {r:'veterinaire',icon:'🩺',  label:'Vétérinaire',      color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe'},
                  {r:'pharmacien', icon:'💊',  label:'Pharmacien',       color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0'},
                  {r:'technicien', icon:'🔬',  label:'Technicien',       color:'#0891b2', bg:'#ecfeff', border:'#a5f3fc'},
                  {r:'caissier',   icon:'🛒',  label:'Caissier',         color:'#7c3aed', bg:'#faf5ff', border:'#e9d5ff'},
                ].map(opt=>(
                  <div key={opt.r} onClick={()=>setEditRole(opt.r)}
                    style={{cursor:'pointer',padding:'10px 12px',borderRadius:10,border:`2px solid ${editRole===opt.r?opt.border:'#e2e8f0'}`,background:editRole===opt.r?opt.bg:'white',display:'flex',alignItems:'center',gap:8,transition:'all .15s'}}>
                    <span style={{fontSize:16}}>{opt.icon}</span>
                    <span style={{fontWeight:700,fontSize:12,color:editRole===opt.r?opt.color:'#475569'}}>{opt.label}</span>
                    {editRole===opt.r&&<span style={{marginLeft:'auto',color:'#16a34a',fontSize:14}}>✓</span>}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Btn onClick={()=>saveRole(c.id)} sm color="amber">✓ Enregistrer</Btn>
                <button onClick={()=>{setEditId(null);setEditRole(null);}} className="text-slate-500 text-sm px-3">Annuler</button>
              </div>
            </div>}
            {/* Changer mot de passe inline */}
            {editId===c.id&&editRole===null&&<div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-sm font-bold text-slate-700 mb-2">Nouveau mot de passe pour {c.nom} :</p>
              <div className="flex gap-2">
                <input type="password" className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 outline-none"
                  placeholder="Nouveau mot de passe (min. 6 car.)" value={editPw} onChange={e=>setEditPw(e.target.value)}/>
                <Btn onClick={()=>savePw(c.id)} sm title="Envoyer un lien de réinitialisation par email">✉️ Envoyer lien</Btn>
                <button onClick={()=>setEditId(null)} className="text-slate-400 px-2">✕</button>
              </div>
            </div>}
          </div>;
        })}
      </div>
    </div>

    {/* Info rôles */}
    <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:20,padding:20}}>
      <h3 style={{fontWeight:800,color:'#92400e',marginBottom:16,fontSize:14,display:'flex',alignItems:'center',gap:8}}>ℹ️ Récapitulatif des accès par rôle</h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
        {[
          {icon:'👑', role:'Administrateur',   color:'#d97706', bg:'#fff7ed', items:['Tous les modules','Comptes utilisateurs','Finances & rapports','Paramètres clinique']},
          {icon:'🛡️',role:'Admin secondaire',  color:'#7c3aed', bg:'#faf5ff', items:['Tous les modules','Approbation des inscriptions','Finances & rapports','Paramètres']},
          {icon:'🩺', role:'Vétérinaire',       color:'#2563eb', bg:'#eff6ff', items:['Patients & dossiers','Consultations & RDV','Ordonnances','Chirurgies & hospitalisation']},
          {icon:'💊', role:'Pharmacien',        color:'#16a34a', bg:'#f0fdf4', items:['Médicaments & stock','Ventes & caisse','Commandes fournisseurs','Ordonnances']},
          {icon:'🔬', role:'Technicien',        color:'#0891b2', bg:'#ecfeff', items:['Patients (consultation)','Médicaments & inventaire','Lots & préparations','Tâches & agenda']},
          {icon:'🛒', role:'Caissier',          color:'#7c3aed', bg:'#faf5ff', items:['Ventes & facturation','Créances clients','Caisse','Historique ventes']},
        ].map((r,i)=>(
          <div key={i} style={{background:r.bg,borderRadius:14,padding:'12px 14px',border:`1px solid ${r.color}22`}}>
            <p style={{fontWeight:800,marginBottom:10,fontSize:13,color:r.color,display:'flex',alignItems:'center',gap:6}}><span>{r.icon}</span>{r.role}</p>
            <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:5}}>
              {r.items.map((item,j)=>(
                <li key={j} style={{fontSize:11,color:'#475569',display:'flex',alignItems:'center',gap:6}}>
                  <span style={{color:'#16a34a',fontSize:10,flexShrink:0}}>✓</span>{item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>

    {/* Aide configuration Supabase */}
    <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:16,padding:16}}>
      <h3 style={{fontWeight:800,color:'#1e40af',marginBottom:10,fontSize:13,display:'flex',alignItems:'center',gap:8}}>🔧 Si la création de compte échoue (erreur 400)</h3>
      <p style={{fontSize:12,color:'#1e3a8a',marginBottom:8}}>Dans le tableau de bord Supabase, vérifiez les points suivants :</p>
      <ol style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:6}}>
        {[
          ['Authentication → Providers → Email', 'Activez "Enable Email provider" et désactivez "Confirm email" (ou laissez activé si vous voulez que l\'utilisateur confirme son email)'],
          ['Authentication → URL Configuration → Redirect URLs', `Ajoutez : https://la-barakat.pages.dev et http://localhost:5173`],
          ['Authentication → Rate Limits', 'Si vous voyez "429 Too Many Requests", attendez quelques minutes avant de réessayer'],
        ].map(([label, desc], i) => (
          <li key={i} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
            <span style={{width:20,height:20,borderRadius:'50%',background:'#2563eb',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,flexShrink:0,marginTop:1}}>{i+1}</span>
            <div>
              <p style={{fontSize:12,fontWeight:700,color:'#1e40af',marginBottom:2}}>{label}</p>
              <p style={{fontSize:11,color:'#3b82f6'}}>{desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </div>;
}

export default GestionComptes