import { useState, useEffect, useRef, useMemo } from 'react'
import { sb } from '../../lib/supabase'
import { ROLES } from '../../lib/roles'
import { setCache } from '../../lib/db'
import { Btn, Field } from '../../components/ui'

function GestionComptes({comptes,setComptes,currentUser}){
  const pending=comptes.filter(c=>c.pending&&!c.actif);
  const approuver=async(id)=>{
    const up=comptes.map(c=>c.id===id?{...c,actif:true,pending:false}:c);
    setComptes(up);setCache('comptes',up);
    if(navigator.onLine&&sb)try{await sb.from('comptes').update({actif:true,pending:false}).eq('id',id);}catch(e){}
  };
  const rejeter=async(id)=>{
    const up=comptes.filter(c=>c.id!==id);
    setComptes(up);setCache('comptes',up);
    if(navigator.onLine&&sb)try{await sb.from('comptes').delete().eq('id',id);}catch(e){}
  };
  const [step,setStep]=useState(0); // 0=list, 1=nom, 2=details
  const [form,setForm]=useState({nom:'',email:'',pw:'',role:'utilisateur',actif:true});
  const [editId,setEditId]=useState(null);
  const [editPw,setEditPw]=useState('');
  const [editRole,setEditRole]=useState(null);

  const nextStep=()=>{
    if(step===1){
      if(!form.nom.trim())return alert('Le nom est requis');
      // Auto-suggest email from name
      const slug=form.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'.');
      setForm(f=>({...f, email:f.email||`${slug}@labarakat.tg`}));
      setStep(2);
    }
  };
  const addCompte=()=>{
    if(!form.nom||!form.email||!form.pw)return alert('Tous les champs sont requis');
    if(comptes.find(c=>c.email===form.email))return alert('Cet email existe déjà');
    setComptes([...comptes,{...form,id:Date.now()}]);
    setForm({nom:'',email:'',pw:'',role:'utilisateur',actif:true});
    setStep(0);
  };
  const cancelForm=()=>{setStep(0);setForm({nom:'',email:'',pw:'',role:'utilisateur',actif:true});};
  const toggleActif=id=>setComptes(comptes.map(c=>c.id===id?{...c,actif:!c.actif}:c));
  const deleteCompte=id=>{
    if(comptes.find(c=>c.id===id)?.email===currentUser?.email)return alert('Impossible de supprimer votre propre compte');
    if(confirm('Supprimer ce compte définitivement ?'))setComptes(comptes.filter(c=>c.id!==id));
  };
  const savePw=id=>{
    if(!editPw||editPw.length<4)return alert('Minimum 4 caractères');
    setComptes(comptes.map(c=>c.id===id?{...c,pw:editPw}:c));
    setEditId(null);setEditPw('');
  };
  const saveRole=id=>{
    setComptes(comptes.map(c=>c.id===id?{...c,role:editRole}:c));
    setEditRole(null);setEditId(null);
  };

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
        <div><h2 className="text-xl font-bold flex items-center gap-2">🔐 Comptes utilisateurs</h2>
          <p className="text-xs text-slate-400 mt-0.5">{comptes.length} compte(s) · {comptes.filter(c=>c.actif).length} actif(s)</p></div>
        {step===0&&<Btn onClick={()=>setStep(1)}>+ Nouvel utilisateur</Btn>}
      </div>

      {/* ── Étape 1 : Saisir le nom ── */}
      {step===1&&<div className="p-6 bg-green-50 border-b border-green-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-black text-sm">1</div>
          <div><p className="font-bold text-green-800">Qui est cet utilisateur ?</p><p className="text-xs text-green-600">Commencez par renseigner le nom complet</p></div>
        </div>
        <Field label="Nom complet *" value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Ex: Dr. Kofi Mensah"/>
        <div className="flex gap-2 mt-4">
          <Btn onClick={nextStep}>Suivant →</Btn>
          <button onClick={cancelForm} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Annuler</button>
        </div>
      </div>}

      {/* ── Étape 2 : Détails + Rôle ── */}
      {step===2&&<div className="p-6 bg-green-50 border-b border-green-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-black text-sm">2</div>
          <div>
            <p className="font-bold text-green-800">Informations de connexion pour <span className="text-green-700">{form.nom}</span></p>
            <p className="text-xs text-green-600">Définissez l'email, le mot de passe et le rôle</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <Field label="Email *" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} type="email" placeholder="email@labarakat.tg"/>
          <Field label="Mot de passe *" value={form.pw} onChange={e=>setForm({...form,pw:e.target.value})} type="password" placeholder="Minimum 4 caractères"/>
          {/* Choix du rôle avec cards visuelles */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-2 block">Rôle *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
  {
    r:'admin',
    icon:'👑',
    label:'Administrateur',
    desc:'Accès complet : tout le système',
    color:'amber'
  },
  {
    r:'admin_secondaire',
    icon:'🛡️',
    label:'Admin secondaire',
    desc:'Accès complet sauf gestion des comptes',
    color:'purple'
  },
  {
    r:'utilisateur',
    icon:'👤',
    label:'Utilisateur',
    desc:'Accès clinique : patients, RDV, etc.',
    color:'blue'
  }
].map(opt=>(
                <div key={opt.r} onClick={()=>setForm({...form,role:opt.r})}
                  className={`cursor-pointer rounded-xl p-4 border-2 transition-all ${form.role===opt.r?(opt.color==='amber'?'border-amber-400 bg-amber-50':'border-blue-400 bg-blue-50'):'border-slate-200 hover:border-slate-300 bg-[var(--app-surface)]'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{opt.icon}</span>
                    <span className={`font-bold text-sm ${form.role===opt.r?(opt.color==='amber'?'text-amber-700':'text-blue-700'):'text-slate-700'}`}>{opt.label}</span>
                    {form.role===opt.r&&<span className="ml-auto text-green-500 text-base">✓</span>}
                  </div>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={()=>setStep(1)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">← Retour</button>
          <Btn onClick={addCompte}>✓ Créer le compte</Btn>
          <button onClick={cancelForm} className="px-4 py-2 text-sm text-red-400 hover:text-red-600">Annuler</button>
        </div>
      </div>}

      {/* ── Liste des comptes ── */}
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
              {/* Actions */}
              <div className="flex flex-col gap-1.5 shrink-0">
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
                {!isMe&&<button onClick={()=>deleteCompte(c.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-semibold transition-all">🗑 Supprimer</button>}
              </div>
            </div>
            {/* Changer rôle inline */}
            {editId===c.id&&editRole!==null&&<div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-bold text-amber-800 mb-2">Changer le rôle de {c.nom} :</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
  {r:'admin',icon:'👑',label:'Administrateur'},
  {r:'admin_secondaire',icon:'🛡️',label:'Admin secondaire'},
  {r:'utilisateur',icon:'👤',label:'Utilisateur'}
].map(opt=>(
                  <div key={opt.r} onClick={()=>setEditRole(opt.r)} className={`cursor-pointer p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${editRole===opt.r?'border-amber-400 bg-amber-100':'border-slate-200 bg-white'}`}>
                    <span>{opt.icon}</span><span className="font-semibold text-sm">{opt.label}</span>
                    {editRole===opt.r&&<span className="ml-auto text-green-500">✓</span>}
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
                  placeholder="Nouveau mot de passe (min. 4 car.)" value={editPw} onChange={e=>setEditPw(e.target.value)}/>
                <Btn onClick={()=>savePw(c.id)} sm>✓</Btn>
                <button onClick={()=>setEditId(null)} className="text-slate-400 px-2">✕</button>
              </div>
            </div>}
          </div>;
        })}
      </div>
    </div>

    {/* Info rôles */}
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">ℹ️ Différence entre les rôles</h3>
      <div className="grid grid-cols-2 gap-4">
        {[{icon:'👑',role:'Administrateur',color:'amber',items:['Tous les modules cliniques','Finances & Facturation','Fournisseurs & Dépenses','Paramètres & Comptes','Rapports complets']},
          {icon:'👤',role:'Utilisateur',color:'blue',items:['Patients & Consultations','Ordonnances & RDV','Chirurgies & Hospitalisation','Médicaments & Inventaire','Tâches équipe']}].map((r,i)=>(
          <div key={i} className="bg-[var(--app-surface)] rounded-xl p-4 border border-amber-200">
            <p className={`font-bold mb-2 ${r.color==='amber'?'text-amber-700':'text-blue-700'}`}>{r.icon} {r.role}</p>
            <ul className="space-y-1">{r.items.map((item,j)=><li key={j} className="text-xs text-slate-600 flex items-center gap-1.5"><span className="text-green-500">✓</span>{item}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  </div>;
}


// ── VENTES ───────────────────────────────────────────────────

export default GestionComptes
