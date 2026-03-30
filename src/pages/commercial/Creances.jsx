import { useState, useEffect, useRef, useMemo } from 'react'
import { Badge } from '../../components/ui'

function Creances({ventesHist,setVentesHist,otrMode}){
  const fmtF = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'
  const creances=(ventesHist||[]).filter(v=>['À crédit','Partiellement payé','En attente'].includes(v.statut));
  const totalDu=creances.reduce((s,v)=>s+(v.total||0),0);
  const mask=v=>otrMode?'••••• F':fmtF(v);

  const marquerPaye=(id)=>setVentesHist(prev=>{
    const updated=prev.map(v=>v.id===id?{...v,statut:'Payé'}:v);
    localStorage.setItem('lb_ventes_hist',JSON.stringify(updated));
    return updated;
  });

  // Grouper par client
  const parClient={};
  creances.forEach(v=>{
    if(!parClient[v.client])parClient[v.client]={client:v.client,total:0,ventes:[]};
    parClient[v.client].total+=v.total||0;
    parClient[v.client].ventes.push(v);
  });
  const listeClients=Object.values(parClient).sort((a,b)=>b.total-a.total);
  const [expanded,setExpanded]=useState(null);

  return <div className="app-page space-y-5">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="stat-tile stat-tile--orange">
        <div className="stat-tile__label">💰 Total à recouvrer</div>
        <div className="stat-tile__value">{mask(totalDu)}</div>
      </div>
      <div className="stat-tile stat-tile--slate">
        <div className="stat-tile__label">👥 Clients débiteurs</div>
        <div className="stat-tile__value">{listeClients.length}</div>
      </div>
      <div className="stat-tile stat-tile--blue">
        <div className="stat-tile__label">📋 Créances en cours</div>
        <div className="stat-tile__value">{creances.length}</div>
      </div>
    </div>

    <div className="app-card">
      <div className="p-5 border-b">
        <h2 className="text-xl font-bold flex items-center gap-2">💰 Suivi des créances</h2>
        <p className="text-xs text-slate-400 mt-0.5">Clients qui n'ont pas encore payé — groupés par client</p>
      </div>
      {!listeClients.length&&<div className="text-center py-12 text-slate-400">
        <div className="text-4xl mb-2">✅</div>
        <p className="font-semibold">Aucune créance en attente</p>
        <p className="text-sm mt-1">Tous vos clients sont à jour 🎉</p>
      </div>}
      <div className="divide-y">
        {listeClients.map(c=><div key={c.client}>
          <div className="p-5 hover:bg-slate-50 cursor-pointer" onClick={()=>setExpanded(expanded===c.client?null:c.client)}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-black text-orange-600">
                    {c.client.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{c.client}</p>
                    <p className="text-xs text-slate-500">{c.ventes.length} vente(s) impayée(s)</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-orange-600 font-mono">{mask(c.total)}</div>
                <div className="text-xs text-slate-400">{expanded===c.client?'▲ Masquer':'▼ Voir détail'}</div>
              </div>
            </div>
          </div>
          {expanded===c.client&&<div className="px-5 pb-4 bg-orange-50/30 border-t">
            <div className="space-y-2 mt-3">
              {c.ventes.map(v=><div key={v.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-orange-200 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge color={v.statut==='À crédit'?'orange':'yellow'}>{v.statut}</Badge>
                    <span className="text-xs text-slate-400">{v.date}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(v.lignes||[]).map((l,i)=><span key={i} className="text-xs bg-slate-100 rounded px-2 py-0.5">💊 {l.med} ×{l.qte}</span>)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-orange-600 font-mono">{mask(v.total)}</div>
                  <button onClick={()=>marquerPaye(v.id)} className="mt-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold block">✓ Marquer payé</button>
                </div>
              </div>)}
            </div>
            <div className="mt-3 text-right font-bold text-orange-700">Total : {mask(c.total)}</div>
          </div>}
        </div>)}
      </div>
    </div>
  </div>;
}

// ── JOURNAL D'ACTIVITÉ ────────────────────────────────────────

export default Creances
