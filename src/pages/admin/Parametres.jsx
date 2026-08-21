import { Settings, Trash2, Building2, Users, Coins, Lock, Save } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { ROLES } from '../../lib/roles'
import { fmtF } from '../../lib/utils'

function Parametres({equipe,setEquipe,clinique,setClinique,tva,saveTva,saveClinique,saveEquipe}){
  const [tab,setTab]=useState('clinique');
  const [savingCli,setSavingCli]=useState(false);
  const [savingEq,setSavingEq]=useState(false);
  const [savedMsg,setSavedMsg]=useState('');
  const ROLES_EQUIPE=['Vétérinaire','Chirurgien','ASV','Réceptionniste','Autre'];

  // ── Verrouillage automatique (réglage par poste, stocké localement) ──
  const [autolock,setAutolock]=useState(()=>parseInt(localStorage.getItem('lb_autolock_min')||'0')||0);
  const saveAutolock=(min)=>{ setAutolock(min); try{ localStorage.setItem('lb_autolock_min', String(min)) }catch(e){} };

  // ── Export complet des données (JSON, depuis le cache local) ──
  const exportAll=()=>{
    const tables=['patients','clients','medicaments','ventes','consultations','commandes','depenses','fournisseurs','devis','factures','rdvs','ordonnances','chirurgies','hospitalisations','taches','inventaires','versements_fournisseurs','equipe','clinique_settings'];
    const data={ export_date:new Date().toISOString(), clinique:clinique?.nom||'La Barakat' };
    tables.forEach(t=>{ try{ const v=JSON.parse(localStorage.getItem('lb_'+t)||'null'); if(v) data[t]=v }catch(e){} });
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=`sauvegarde_labarakat_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const flashSaved=(msg)=>{setSavedMsg(msg);setTimeout(()=>setSavedMsg(''),3000);}
  const handleSaveClinique=async()=>{
    setSavingCli(true);
    try{ await saveClinique(clinique); flashSaved('clinique'); }
    catch(e){ alert('Erreur sauvegarde : '+(e?.message||e)); }
    finally{ setSavingCli(false); }
  };
  const handleSaveEquipe=async()=>{
    setSavingEq(true);
    try{ await saveEquipe(equipe); flashSaved('equipe'); }
    catch(e){ alert('Erreur sauvegarde : '+(e?.message||e)); }
    finally{ setSavingEq(false); }
  };

  const updateMembre=(id,k,v)=>setEquipe(equipe.map(m=>m.id===id?{...m,[k]:v}:m));
  const addMembre=()=>setEquipe([...equipe,{id:(crypto?.randomUUID?.()||String(Date.now())),nom:'',role:'ASV',tel:'',actif:true}]);
  const removeMembre=(id)=>setEquipe(equipe.filter(m=>m.id!==id));

  return <div className="app-page max-w-3xl space-y-5">
    <div className="app-card">
      <div className="p-5 border-b"><h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20} color="#0d9488" strokeWidth={2.3} /> Paramètres</h2></div>
      <div className="flex border-b overflow-x-auto">
        {[{k:'clinique',l:'Ma clinique',i:Building2},{k:'equipe',l:'Mon équipe',i:Users},{k:'tva',l:'TVA & Taxes',i:Coins},{k:'securite',l:'Sécurité & Données',i:Lock}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap inline-flex items-center gap-1.5 ${tab===t.k?'border-green-600 text-green-700':'border-transparent text-slate-500 hover:text-slate-700'}`}><t.i size={14} strokeWidth={2.3} />{t.l}</button>
        ))}
      </div>

      {/* Sécurité & Données tab */}
      {tab==='securite'&&<div className="p-6 space-y-5">
        <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
          <p className="font-bold text-slate-800 mb-1">⏱️ Verrouillage automatique</p>
          <p className="text-sm text-slate-500 mb-3">Déconnexion automatique de ce poste après une période d'inactivité — protège la caisse si quelqu'un passe derrière le comptoir. Réglage propre à cet appareil.</p>
          <div className="flex gap-3 flex-wrap">
            {[{v:0,l:'Désactivé'},{v:5,l:'5 min'},{v:10,l:'10 min'},{v:15,l:'15 min'},{v:30,l:'30 min'}].map(o=>(
              <button key={o.v} onClick={()=>saveAutolock(o.v)}
                className={`px-5 py-2.5 rounded-xl font-bold border-2 transition-all ${autolock===o.v?'border-green-500 bg-green-50 text-green-700':'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                {o.l}
              </button>
            ))}
          </div>
          {autolock>0&&<p className="text-xs text-green-600 mt-3">✓ Ce poste se déconnectera après {autolock} minute(s) sans activité.</p>}
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
          <p className="font-bold text-slate-800 mb-1">Sauvegarde des données</p>
          <p className="text-sm text-slate-500 mb-3">Télécharge un fichier JSON contenant toutes vos données (patients, ventes, stock, clients, dépenses…). À conserver régulièrement en lieu sûr (clé USB, Drive…).</p>
          <button onClick={exportAll}
            className="px-5 py-2.5 rounded-xl font-bold text-white transition-all"
            style={{background:'linear-gradient(135deg,#166534,#1d4ed8)'}}>
            Exporter toutes les données (JSON)
          </button>
          <p className="text-xs text-slate-400 mt-2">Astuce : faites cet export au moins une fois par semaine, après la clôture.</p>
        </div>
      </div>}

      {/* TVA tab */}
      {tab==='tva'&&<div className="p-6 space-y-5">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-bold text-amber-800 mb-1">TVA & Obligations fiscales</h3>
          <p className="text-sm text-amber-700">Configurez ici si vos prix sont assujettis à la TVA. Une fois activée, la TVA sera calculée et affichée sur toutes vos factures et reçus.</p>
        </div>
        {/* Toggle TVA */}
        <div className="flex items-center justify-between p-4 bg-white border-2 border-slate-200 rounded-xl">
          <div>
            <p className="font-bold text-slate-800">Activer la TVA sur les ventes</p>
            <p className="text-sm text-slate-500">Applicable sur les factures et reçus clients</p>
          </div>
          <div onClick={()=>saveTva({...tva,active:!tva.active})}
            className={`w-14 h-7 rounded-full transition-all cursor-pointer relative ${tva?.active?'bg-green-500':'bg-slate-300'}`}>
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${tva?.active?'left-8':'left-1'}`}/>
          </div>
        </div>
        {/* Taux */}
        {tva?.active&&<div className="space-y-3">
          <div><label className="text-xs font-bold text-slate-600 mb-2 block">Taux de TVA (%)</label>
            <div className="flex gap-3 flex-wrap">
              {[10,18,20,25].map(t=>(
                <button key={t} onClick={()=>saveTva({...tva,taux:t})}
                  className={`px-5 py-2.5 rounded-xl font-bold border-2 transition-all ${tva.taux===t?'border-green-500 bg-green-50 text-green-700':'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {t}%
                </button>
              ))}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Autre :</span>
                <input type="number" min="0" max="100"
                  className="w-20 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-green-400 outline-none"
                  value={tva.taux} onChange={e=>saveTva({...tva,taux:parseFloat(e.target.value)||0})}/>
                <span className="text-sm text-slate-500">%</span>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="font-bold text-green-800 mb-1">Aperçu du calcul :</p>
            <div className="text-sm space-y-1 text-green-700">
              <div className="flex justify-between"><span>Prix HT (exemple)</span><span className="font-mono">10 000 F</span></div>
              <div className="flex justify-between"><span>TVA {tva.taux}%</span><span className="font-mono">+ {fmtF(10000*tva.taux/100)}</span></div>
              <div className="flex justify-between font-bold border-t border-green-300 pt-1"><span>Total TTC</span><span className="font-mono">{fmtF(10000*(1+tva.taux/100))}</span></div>
            </div>
          </div>
        </div>}
      </div>}

      {tab==='clinique'&&<div className="p-6 space-y-4">
        <h3 className="font-bold text-slate-700">Informations de la structure</h3>
        <div className="grid grid-cols-2 gap-4">
          {[{l:'Nom de la structure',k:'nom',ph:'Ex: La Barakat'},{l:'Sous-titre / spécialité',k:'sousTitre',ph:'Ex: Pharmacie et Clinique Vétérinaire'},{l:'Téléphone',k:'tel',ph:'+228 XX XX XX XX'},{l:'Adresse',k:'adresse',ph:'Numéro, Rue…'},{l:'Ville',k:'ville',ph:'Ex: Anié'},{l:'Email',k:'email',ph:'contact@labarakat.tg'},{l:'N° agrément / registre',k:'agrement',ph:'Ex: AGR-2024-0123'}].map(f=>(
            <div key={f.k}><label className="text-xs font-bold text-slate-600 mb-1 block">{f.l}</label>
              <input className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none" placeholder={f.ph} value={clinique[f.k]||''} onChange={e=>setClinique({...clinique,[f.k]:e.target.value})}/></div>
          ))}
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-2">
          <p className="text-sm font-semibold text-green-800 mb-1">Aperçu en-tête des documents imprimés :</p>
          <p className="font-black text-green-900">{clinique.nom||'La Barakat'}</p>
          <p className="text-sm text-green-700">{clinique.sousTitre||'Pharmacie et Clinique Vétérinaire'}</p>
          {clinique.adresse&&<p className="text-xs text-green-600">{clinique.adresse}, {clinique.ville}</p>}
          {clinique.tel&&<p className="text-xs text-green-600">Tél : {clinique.tel}</p>}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
          Ces informations apparaîtront automatiquement sur toutes vos factures, ordonnances et consentements imprimés.
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSaveClinique} disabled={savingCli}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all">
            {savingCli?'Enregistrement…':'Enregistrer'}
          </button>
          {savedMsg==='clinique'&&<span className="text-sm font-bold text-green-600">✓ Enregistré — synchronisé sur tous les appareils</span>}
        </div>
      </div>}

      {tab==='equipe'&&<div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-700">Membres de l'équipe</h3>
          <button onClick={addMembre} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all">+ Ajouter un membre</button>
        </div>
        <div className="space-y-3">
          {equipe.map(m=><div key={m.id} className={`border-2 rounded-xl p-4 transition-all ${m.actif?'border-slate-200':'border-slate-100 opacity-50'}`}>
            <div className="grid grid-cols-4 gap-3 items-end">
              <div className="col-span-2"><label className="text-xs font-bold text-slate-600 mb-1 block">Nom complet *</label>
                <input className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none" placeholder="Dr. Prénom NOM" value={m.nom} onChange={e=>updateMembre(m.id,'nom',e.target.value)}/></div>
              <div><label className="text-xs font-bold text-slate-600 mb-1 block">Rôle</label>
                <select className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none" value={m.role} onChange={e=>updateMembre(m.id,'role',e.target.value)}>
                  {ROLES_EQUIPE.map(r=><option key={r}>{r}</option>)}
                </select></div>
              <div><label className="text-xs font-bold text-slate-600 mb-1 block">Téléphone</label>
                <input className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none" placeholder="+228…" value={m.tel||''} onChange={e=>updateMembre(m.id,'tel',e.target.value)}/></div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={()=>updateMembre(m.id,'actif',!m.actif)} className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${m.actif?'bg-green-500':'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${m.actif?'left-5':'left-0.5'}`}/>
                </div>
                <span className="text-xs font-semibold text-slate-600">{m.actif?'Actif':'Inactif'}</span>
              </label>
              <button onClick={()=>removeMembre(m.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition-all inline-flex items-center gap-1"><Trash2 size={12} strokeWidth={2.4} /> Retirer</button>
            </div>
          </div>)}
        </div>
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
          Les membres actifs avec un nom renseigné apparaîtront automatiquement dans les menus déroulants (tâches, RDV, chirurgies, consentements…)
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={handleSaveEquipe} disabled={savingEq}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all">
            {savingEq?'Enregistrement…':'Enregistrer l\'équipe'}
          </button>
          {savedMsg==='equipe'&&<span className="text-sm font-bold text-green-600">✓ Enregistré — synchronisé sur tous les appareils</span>}
        </div>
      </div>}
    </div>
  </div>;
}

// ── MON PROFIL ────────────────────────────────────────────────

export default Parametres
