import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Btn,
  Badge,
  PrintBtn,
  FilterPeriode,
  DupWarning,
  FilterBar,
  FilterSelect,
  FilterBtns
} from "../../components/ui"
function Historique({ventesHist,achatsHist,meds}){
  const [tab,setTab]=useState('ventes');
  const [search,setSearch]=useState('');
  const [fHStatut,setFHStatut]=useState('');
  const [fHPeriode,setFHPeriode]=useState('');
  const [fHProduit,setFHProduit]=useState('');
  const today = () => new Date().toISOString().split('T')[0];
  const now4=new Date();
  const hDebutMap={jour:today(),semaine:new Date(now4.getTime()-now4.getDay()*86400000).toISOString().split('T')[0],mois:new Date(now4.getFullYear(),now4.getMonth(),1).toISOString().split('T')[0],annee:new Date(now4.getFullYear(),0,1).toISOString().split('T')[0]};
  // Tous produits distincts dans l'historique
  const allProds=[...new Set((ventesHist||[]).flatMap(v=>(v.lignes||[]).map(l=>l.med)).filter(Boolean))];
  const all=tab==='ventes'?ventesHist:achatsHist;
  const filtered=(all||[]).filter(e=>{
    if(fHStatut&&e.statut!==fHStatut)return false;
    if(fHPeriode&&hDebutMap[fHPeriode]&&e.date<hDebutMap[fHPeriode])return false;
    if(fHProduit&&!JSON.stringify(e.lignes||[]).includes(fHProduit))return false;
    if(search){const q=search.toLowerCase();if(!JSON.stringify(e).toLowerCase().includes(q))return false;}
    return true;
  });
  const activeHist=[fHStatut,fHPeriode,fHProduit,search].filter(Boolean).length;

  return <div className="app-page space-y-5">
    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">🗂️ Historique des produits</h2>
        <div className="flex gap-2">
          {[{k:'ventes',l:'🛒 Ventes',c:ventesHist.length},{k:'achats',l:'📦 Commandes',c:achatsHist.length}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${tab===t.k?'border-green-500 bg-green-50 text-green-700':'border-slate-200 text-slate-500'}`}>
              {t.l} <span className="ml-1 text-xs bg-slate-100 px-1.5 py-0.5 rounded-full">{t.c}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <FilterBar search={search} onSearch={setSearch} placeholder="🔍 Client, produit, montant…" activeCount={activeHist} onReset={()=>{setSearch('');setFHStatut('');setFHPeriode('');setFHProduit('');}}>
          {tab==='ventes'&&<FilterSelect label="📋 Statut" value={fHStatut} onChange={setFHStatut} options={['Payé','À crédit','Partiellement payé','En attente','Annulé'].map(s=>({v:s,l:s}))}/>}
          <FilterPeriode value={fHPeriode} onChange={setFHPeriode}/>
          {tab==='ventes'&&allProds.length>0&&<FilterSelect label="💊 Produit" value={fHProduit} onChange={setFHProduit} options={allProds.map(p=>({v:p,l:p}))}/>}
          <span className="text-xs text-slate-400">{filtered.length} résultat(s)</span>
        </FilterBar>
        {!filtered.length?<div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-2">{tab==='ventes'?'🛒':'📦'}</div>
          <p className="font-semibold">Aucun historique disponible</p>
          <p className="text-sm mt-1">Les {tab==='ventes'?'ventes enregistrées':'commandes reçues'} apparaîtront ici</p>
        </div>:
        <div className="space-y-2">{filtered.slice(0,100).map((e,i)=><div key={i} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs text-slate-400 font-mono">{e.date}</span>
                {tab==='ventes'?<span className="font-semibold">👤 {e.client}</span>:<span className="font-semibold">🏭 {e.fournisseur}</span>}
                <Badge color={e.statut==='Payé'||e.statut==='Reçu'?'green':e.statut==='En attente'?'yellow':'blue'}>{e.statut}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tab==='ventes'?(e.lignes||[]).map((l,j)=><span key={j} className="text-xs bg-blue-50 text-blue-700 rounded-lg px-2.5 py-1">
                  💊 {l.med} · {l.cond} × {l.qte}
                </span>):(e.lignes||[]).map((l,j)=><span key={j} className="text-xs bg-green-50 text-green-700 rounded-lg px-2.5 py-1">
                  📦 {l.produit} × {l.qte}
                </span>)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-black text-blue-600 font-mono">{fmtF(e.total||e.montant||0)}</div>
              {tab==='ventes'&&<div className="text-xs text-slate-400">{e.mode}</div>}
            </div>
          </div>
        </div>)}</div>}
        {filtered.length>100&&<p className="text-center text-slate-400 text-sm mt-3">Affichage limité aux 100 derniers résultats</p>}
      </div>
    </div>
  </div>;
}

// ── RAPPORTS & ANALYSE ────────────────────────────────────────

export default Historique
