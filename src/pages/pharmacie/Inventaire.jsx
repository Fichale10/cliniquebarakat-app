import { useState, useEffect, useRef, useMemo } from 'react'
import { fmtF } from "../../lib/utils";
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
function Inventaire({meds,setMeds}){
  const [adjId,setAdjId]=useState(null);
  const [adjQty,setAdjQty]=useState('');
  const valTotal=meds.reduce((s,m)=>s+(m.stock*(m.prixAchat||0)),0);
  const crits=meds.filter(m=>m.stock<=m.seuil);
  const doAdj=(id)=>{const q=parseInt(adjQty);if(isNaN(q))return;setMeds(meds.map(m=>m.id===id?{...m,stock:Math.max(0,m.stock+q)}:m));setAdjId(null);setAdjQty('');};
  return <div className="app-page space-y-5">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { l: 'Références', v: meds.length, mod: 'stat-tile--blue' },
        { l: 'Valeur stock', v: fmtF(valTotal), mod: 'stat-tile--green' },
        { l: 'Critique', v: crits.length, mod: 'stat-tile--red' },
        { l: 'Produits OK', v: meds.length - crits.length, mod: 'stat-tile--purple' },
      ].map((s, i) => (
        <div key={i} className={`stat-tile ${s.mod}`}>
          <div className="stat-tile__label">{s.l}</div>
          <div className="stat-tile__value">{s.v}</div>
        </div>
      ))}
    </div>
    {crits.length>0&&<div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
      <h3 className="font-bold text-red-700 mb-2">🚨 Stock critique</h3>
      <div className="space-y-1.5">{crits.map(m=><div key={m.id} className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 border border-red-200"><span className="font-bold text-sm text-red-700">{m.nom}</span><span className="text-xs text-red-600">→ {m.stock} {m.unite} (seuil : {m.seuil})</span></div>)}</div>
    </div>}
    <div id="inventaire-print" className="app-card">
      <div className="p-5 border-b flex items-center justify-between"><h2 className="text-xl font-bold flex items-center gap-2">📊 État de l'inventaire</h2><PrintBtn zoneId="inventaire-print" label="🖨 Imprimer"/></div>
      <div className="overflow-x-auto">
        <table className="w-full"><thead className="bg-slate-50"><tr>{['Réf.','Produit','Catégorie','Stock','Unité','Seuil','Valeur stock','Statut','Ajuster'].map(h=><th key={h} className="text-left p-3 text-xs font-bold text-slate-600 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{meds.map(m=>{
            const crit=m.stock<=m.seuil;
            const pct=Math.min(100,Math.round((m.stock/((m.seuil*3)||1))*100));
            return [
              <tr key={m.id} className={`border-t hover:bg-slate-50 ${crit?'bg-red-50/40':''}`}>
              <td className="p-3 font-mono text-xs text-slate-400">{m.ref}</td>
              <td className="p-3 font-semibold">{m.nom}</td>
              <td className="p-3"><Badge color="purple">{m.categorie}</Badge></td>
              <td className="p-3"><div className="font-bold font-mono">{m.stock}</div><div className="w-16 bg-slate-200 rounded-full h-1.5 mt-1"><div className={`h-1.5 rounded-full ${crit?'bg-red-500':'bg-green-500'}`} style={{width:`${pct}%`}}/></div></td>
              <td className="p-3 text-sm text-slate-500">{m.unite}</td>
              <td className="p-3 text-sm">{m.seuil}</td>
              <td className="p-3 font-mono text-sm font-bold">{fmtF(m.stock*(m.prixAchat||0))}</td>
              <td className="p-3">{crit?<Badge color="red">🚨</Badge>:<Badge color="green">✓</Badge>}</td>
              <td className="p-3 no-print"><button onClick={()=>setAdjId(adjId===m.id?null:m.id)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-semibold">± Ajuster</button></td>
              </tr>,
              adjId===m.id ? (
                <tr key={`${m.id}-adj`} className="no-print">
                  <td colSpan="9" className="bg-blue-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-blue-800">Ajustement :</span>
                      <input
                        type="number"
                        className="border-2 border-slate-200 rounded-lg px-3 py-1.5 text-sm w-28 focus:border-blue-400 outline-none"
                        placeholder="+50 ou -10"
                        value={adjQty}
                        onChange={e=>setAdjQty(e.target.value)}
                      />
                      <Btn onClick={()=>doAdj(m.id)} sm>✓ Valider</Btn>
                      <button onClick={()=>setAdjId(null)} className="text-slate-500 text-sm">✕</button>
                    </div>
                  </td>
                </tr>
              ) : null
            ];
          })}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}

// ── DÉPENSES ─────────────────────────────────────────────────

export default Inventaire
