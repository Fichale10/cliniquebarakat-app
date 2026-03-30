import { useState } from "react"
import {
  Btn,
  Badge,
  PrintBtn,
  FilterPeriode,
  Field,
  FilterBar,
  FilterSelect,
  FilterBtns
} from "../../components/ui"
const today = () => new Date().toISOString().split('T')[0];

function Taches({equipe=[]}){
  const MEMBRES=equipe.length?equipe.map(m=>m.nom):['Membre 1','Membre 2','Membre 3'];
  const PRIORITES=['Haute','Normale','Basse'];
  const [taches,setTaches]=useState([
    {id:1,titre:'Préparer la salle de chirurgie – 14h',membres:[],priorite:'Haute',statut:'À faire',echeance:today(),categorie:'Préparation'},
    {id:2,titre:'Vérifier les stocks d\'antibiotiques',membres:[],priorite:'Normale',statut:'En cours',echeance:today(),categorie:'Stock'},
    {id:3,titre:'Rappels vaccins du mois',membres:[],priorite:'Normale',statut:'À faire',echeance:today(),categorie:'Rappels'},
    {id:4,titre:'Nettoyer et désinfecter les cages',membres:[],priorite:'Basse',statut:'Terminé',echeance:today(),categorie:'Entretien'},
    {id:5,titre:'Mettre à jour les dossiers du matin',membres:[],priorite:'Normale',statut:'En cours',echeance:today(),categorie:'Administratif'},
  ]);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({titre:'',membres:[],priorite:'Normale',statut:'À faire',echeance:today(),categorie:'Autre'});
  const [filtre,setFiltre]=useState('Tous');
  const [showMembresDropdown,setShowMembresDropdown]=useState(false);
  const [searchT,setSearchT]=useState('');
  const [fTPrio,setFTPrio]=useState('');
  const toggleMembre=(nom)=>setForm(f=>{
    const already=f.membres.includes(nom);
    return {...f,membres:already?f.membres.filter(m=>m!==nom):[...f.membres,nom]};
  });
  const COLS=['À faire','En cours','Terminé'];
  const PRIO_COL={Haute:'red',Normale:'blue',Basse:'slate'};
  const CAT_ICON={Préparation:'🔧',Stock:'📦',Rappels:'📞',Entretien:'🧹',Administratif:'📝',Autre:'📌',Soins:'💉'};

  const filtred=taches.filter(t=>{
    if(filtre!=='Tous'&&!(t.membres||[]).includes(filtre)&&t.membre!==filtre)return false;
    if(fTPrio&&t.priorite!==fTPrio)return false;
    if(searchT&&!t.titre.toLowerCase().includes(searchT.toLowerCase())&&!(t.categorie||'').toLowerCase().includes(searchT.toLowerCase()))return false;
    return true;
  });

  return <div className="app-page space-y-5">
    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between flex-wrap gap-3">
        <div><h2 className="text-xl font-bold flex items-center gap-2">✅ Tâches de l'équipe</h2>
          <p className="text-sm text-slate-500">{taches.filter(t=>t.statut!=='Terminé').length} tâche(s) en cours · {filtred.length} affichée(s)</p></div>
        <div className="flex gap-2 flex-wrap no-print">
          <input className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none w-44" placeholder="🔍 Titre…" value={searchT} onChange={e=>setSearchT(e.target.value)}/>
          <select className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none" value={fTPrio} onChange={e=>setFTPrio(e.target.value)}>
            <option value="">Toutes priorités</option>
            {PRIORITES.map(p=><option key={p}>{p}</option>)}
          </select>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none" value={filtre} onChange={e=>setFiltre(e.target.value)}>
            <option value="Tous">Tous les membres</option>{MEMBRES.map(m=><option key={m}>{m}</option>)}
          </select>
          {(searchT||fTPrio||filtre!=='Tous')&&<button onClick={()=>{setSearchT('');setFTPrio('');setFiltre('Tous');}} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded-xl font-bold">✕ Reset</button>}
          <Btn onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Annuler':'+ Nouvelle tâche'}</Btn>
        </div>
      </div>

      {showForm&&<div className="p-5 bg-blue-50 border-b border-blue-200">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Titre *" value={form.titre} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Description de la tâche" className="md:col-span-3"/>

          {/* Multi-membre */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-600 mb-1 block">Assigner à (plusieurs membres possibles)</label>
            <div className="relative">
              <button type="button" onClick={()=>setShowMembresDropdown(p=>!p)}
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm text-left bg-white focus:border-blue-400 flex items-center justify-between">
                <span className={form.membres.length?'text-slate-800':'text-slate-400'}>
                  {form.membres.length?form.membres.join(', '):'— Choisir des membres —'}
                </span>
                <span className="text-slate-400">{showMembresDropdown?'▲':'▼'}</span>
              </button>
              {showMembresDropdown&&<div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto">
                {MEMBRES.map(m=><label key={m} className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${form.membres.includes(m)?'bg-blue-500 border-blue-500':'border-slate-300'}`}>
                    {form.membres.includes(m)&&<span className="text-white text-xs font-black">✓</span>}
                  </div>
                  <span className="text-sm font-medium">{m}</span>
                </label>).map((el,i)=><div key={i} onClick={()=>toggleMembre(MEMBRES[i])}>{el}</div>)}
                <div className="border-t p-2">
                  <button onClick={()=>setShowMembresDropdown(false)} className="w-full text-xs text-center text-blue-600 hover:underline py-1">✓ Confirmer</button>
                </div>
              </div>}
            </div>
            {form.membres.length>0&&<div className="flex flex-wrap gap-1.5 mt-2">
              {form.membres.map(m=><span key={m} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                {m}<button onClick={()=>toggleMembre(m)} className="hover:text-red-500 ml-0.5">✕</button>
              </span>)}
            </div>}
          </div>

          <Field label="Priorité" value={form.priorite} onChange={e=>setForm({...form,priorite:e.target.value})} options={PRIORITES}/>
          <Field label="Catégorie" value={form.categorie} onChange={e=>setForm({...form,categorie:e.target.value})} options={['Préparation','Stock','Rappels','Entretien','Administratif','Soins','Autre']}/>
          <Field label="Échéance" value={form.echeance} onChange={e=>setForm({...form,echeance:e.target.value})} type="date"/>
        </div>
        <div className="mt-3">
          <Btn onClick={()=>{
            if(!form.titre)return alert('Titre requis');
            setTaches([...taches,{...form,id:Date.now()}]);
            setForm({titre:'',membres:[],priorite:'Normale',statut:'À faire',echeance:today(),categorie:'Autre'});
            setShowForm(false);setShowMembresDropdown(false);
          }}>✓ Créer la tâche</Btn>
        </div>
      </div>}

      {/* Kanban */}
      <div className="p-5">
        <div className="grid grid-cols-3 gap-4">
          {COLS.map(col=>{
            const colTaches=filtred.filter(t=>t.statut===col);
            return <div key={col} className="bg-slate-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-700">{col==='À faire'?'📋':col==='En cours'?'⚡':'✅'} {col}</h3>
                <Badge color={col==='À faire'?'slate':col==='En cours'?'blue':'green'}>{colTaches.length}</Badge>
              </div>
              <div className="space-y-2">
                {colTaches.map(t=><div key={t.id} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium leading-snug">{CAT_ICON[t.categorie]||'📌'} {t.titre}</p>
                    <Badge color={PRIO_COL[t.priorite]}>{t.priorite}</Badge>
                  </div>
                  {/* Membres assignés */}
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {(t.membres||[t.membre]).filter(Boolean).map((m,i)=><span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">👤 {m}</span>)}
                    {!(t.membres||[]).length&&!t.membre&&<span className="text-xs text-slate-300">Non assignée</span>}
                  </div>
                  <div className="text-xs text-slate-400 mb-2">📅 {t.echeance}</div>
                  <div className="flex gap-1">
                    {col!=='Terminé'&&<button onClick={()=>setTaches(taches.map(x=>x.id===t.id?{...x,statut:col==='À faire'?'En cours':'Terminé'}:x))}
                      className="flex-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded-lg font-semibold transition-all">{col==='À faire'?'▶ Démarrer':'✓ Terminer'}</button>}
                    {col!=='À faire'&&<button onClick={()=>setTaches(taches.map(x=>x.id===t.id?{...x,statut:col==='En cours'?'À faire':'En cours'}:x))}
                      className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">↩</button>}
                    <button onClick={()=>{if(confirm('Supprimer ?'))setTaches(taches.filter(x=>x.id!==t.id));}}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">🗑</button>
                  </div>
                </div>)}
                {!colTaches.length&&<div className="text-center text-slate-300 text-sm py-6">Aucune tâche</div>}
              </div>
            </div>;
          })}
        </div>
      </div>
    </div>
  </div>;
}
// ── CALCULATEUR DE DOSES ─────────────────────────────────────

export default Taches
