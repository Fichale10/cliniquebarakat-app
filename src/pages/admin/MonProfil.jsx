import { useState } from 'react'
import { sb } from '../../lib/supabase'        
import { setCache } from '../../lib/db'         
import { Btn, Field } from '../../components/ui'

function MonProfil({user,comptes,setComptes}){
  const [pwActuel,setPwActuel]=useState('');
  const [pwNew,setPwNew]=useState('');
  const [pwConfirm,setPwConfirm]=useState('');
  const [msg,setMsg]=useState(null);

  const monCompte = comptes.find(c=>c.email===user?.email);

  const changerMDP = async () => {
  if(!pwActuel||!pwNew||!pwConfirm){
    setMsg({type:'error',text:'Tous les champs sont requis.'});return;
  }
  if(monCompte?.pw !== pwActuel){
    setMsg({type:'error',text:'Mot de passe actuel incorrect.'});return;
  }
  if(pwNew.length < 4){
    setMsg({type:'error',text:'Minimum 4 caractères.'});return;
  }
  if(pwNew !== pwConfirm){
    setMsg({type:'error',text:'Les deux mots de passe ne correspondent pas.'});return;
  }

  // 1. Mettre à jour React state
  const updated = comptes.map(c => c.email===user.email ? {...c, pw:pwNew} : c);
  setComptes(updated);

  // 2. Mettre à jour localStorage ← manquait !
  setCache('comptes', updated);

  // 3. Mettre à jour Supabase ← manquait !
  if(navigator.onLine && sb && monCompte?.id){
    try {
      await sb.from('comptes').update({pw: pwNew}).eq('id', monCompte.id);
    } catch(e){
      console.warn('Erreur sync Supabase mdp', e);
    }
  }

  setPwActuel(''); setPwNew(''); setPwConfirm('');
  setMsg({type:'success', text:'Mot de passe modifié avec succès !'});
  setTimeout(()=>setMsg(null), 4000);
};


  return <div className="app-page max-w-lg space-y-5">
    {/* Carte identité */}
    <div className="app-card">
      <div className="h-2" style={{background:'linear-gradient(135deg,#166534,#1e3a8a)'}}/>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center font-black text-white text-xl shadow-lg" style={{background:user?.role==='admin'?'linear-gradient(135deg,#f59e0b,#d97706)':'linear-gradient(135deg,#166534,#1d4ed8)'}}>
            {user?.initials}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">{user?.name}</h2>
            <p className="text-slate-500 text-sm">{user?.email}</p>
            <span className={`mt-1 inline-block text-xs font-bold px-2.5 py-1 rounded-full ${user?.role==='admin'?'bg-yellow-100 text-yellow-700':'bg-blue-100 text-blue-700'}`}>
              {user?.role==='admin'?'👑 Administrateur':'👤 Utilisateur'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 font-bold uppercase mb-1">Rôle</p>
            <p className="font-bold text-slate-700">{user?.role==='admin'?'Administrateur':'Utilisateur'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 font-bold uppercase mb-1">Statut</p>
            <p className="font-bold text-green-600">✓ Actif</p>
          </div>
        </div>
      </div>
    </div>

    {/* Changer mot de passe */}
    <div className="app-card">
      <div className="p-5 border-b border-slate-100">
        <h3 className="font-bold text-lg flex items-center gap-2">🔑 Changer mon mot de passe</h3>
        <p className="text-sm text-slate-400 mt-0.5">Accessible depuis votre propre compte</p>
      </div>
      <div className="p-6 space-y-4">
        {msg&&<div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${msg.type==='success'?'bg-green-50 border border-green-200 text-green-700':'bg-red-50 border border-red-200 text-red-700'}`}>
          {msg.type==='success'?'✅':'⚠️'} {msg.text}
        </div>}
        <Field label="Mot de passe actuel" value={pwActuel} onChange={e=>setPwActuel(e.target.value)} type="password" placeholder="Votre mot de passe actuel"/>
        <Field label="Nouveau mot de passe" value={pwNew} onChange={e=>setPwNew(e.target.value)} type="password" placeholder="Minimum 4 caractères"/>
        <Field label="Confirmer le nouveau mot de passe" value={pwConfirm} onChange={e=>setPwConfirm(e.target.value)} type="password" placeholder="Répétez le nouveau mot de passe"/>
        <Btn onClick={changerMDP} className="w-full justify-center">🔑 Modifier le mot de passe</Btn>
      </div>
    </div>
  </div>;
}

// ── GESTION COMPTES ──────────────────────────────────────────

export default MonProfil
