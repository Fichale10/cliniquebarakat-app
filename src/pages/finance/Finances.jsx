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
function Finances(){
  const DATA=[{m:'Sept',r:1800000,d:950000},{m:'Oct',r:2100000,d:1050000},{m:'Nov',r:1950000,d:980000},{m:'Déc',r:2300000,d:1100000},{m:'Jan',r:2200000,d:1080000},{m:'Fév',r:2450000,d:1120000}];
  const cur=DATA[DATA.length-1];const res=cur.r-cur.d;const marge=Math.round((res/cur.r)*100);
  const max=Math.max(...DATA.flatMap(m=>[m.r,m.d]));
  const RP=[{t:'Consultations',m:1260000,p:51},{t:'Médicaments vendus',m:840000,p:34},{t:'Actes chirurgicaux',m:270000,p:11},{t:'Autres',m:80000,p:4}];
  const DP=[{t:'Achats stock',m:540000,p:48},{t:'Salaires',m:300000,p:27},{t:'Électricité',m:120000,p:11},{t:'Entretien',m:90000,p:8},{t:'Autres',m:70000,p:6}];
  return <div className="app-page space-y-5">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { l: 'Recettes (Fév)', v: fmtF(cur.r), mod: 'stat-tile--green' },
        { l: 'Dépenses (Fév)', v: fmtF(cur.d), mod: 'stat-tile--red' },
        { l: 'Résultat net', v: fmtF(res), mod: 'stat-tile--blue' },
        { l: 'Taux de marge', v: `${marge}%`, mod: 'stat-tile--purple' },
      ].map((s, i) => (
        <div key={i} className={`stat-tile ${s.mod}`}>
          <div className="stat-tile__label">{s.l}</div>
          <div className="stat-tile__value text-xl">{s.v}</div>
        </div>
      ))}
    </div>
    <div id="finances-print" className="space-y-5">
      <div className="panel-surface p-5">
        <div className="flex items-center justify-between mb-5"><h3 className="font-bold text-lg flex items-center gap-2">📈 Évolution 6 mois</h3><PrintBtn zoneId="finances-print" label="🖨 Rapport"/></div>
        <div className="flex items-end gap-3 h-44">{DATA.map((m,i)=>{const hR=Math.round((m.r/max)*168);const hD=Math.round((m.d/max)*168);return<div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-end gap-1 h-44"><div className="w-4 bg-green-400 rounded-t" style={{height:`${hR}px`}}/><div className="w-4 bg-red-400 rounded-t" style={{height:`${hD}px`}}/></div>
          <div className="text-xs font-bold text-slate-500">{m.m}</div>
          <div className="text-xs font-bold text-green-600">+{((m.r-m.d)/1000).toFixed(0)}k</div>
        </div>;})}
        </div>
        <div className="flex gap-5 mt-3 justify-center">
          <div className="flex items-center gap-2 text-xs text-[var(--app-text)]"><div className="w-3 h-3 bg-green-400 rounded" />Recettes</div>
          <div className="flex items-center gap-2 text-xs text-[var(--app-text)]"><div className="w-3 h-3 bg-red-400 rounded" />Dépenses</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5">
        {[[RP,'📥 Recettes par type','green'],[DP,'📤 Dépenses par catégorie','red']].map(([data,title,color],i)=><div key={i} className="panel-surface p-5">
          <h3 className="font-bold mb-4 text-[var(--app-text)]">{title}</h3>
          <div className="space-y-3">{data.map((r,j)=><div key={j}><div className="flex justify-between text-sm mb-1"><span className="font-semibold text-[var(--app-text)]">{r.t}</span><span className="text-[var(--app-muted)]">{fmtF(r.m)} · <strong>{r.p}%</strong></span></div><div className="rounded-full h-2" style={{ background: 'var(--app-border)' }}><div className={`h-2 rounded-full ${color==='green'?'bg-green-500':'bg-red-500'}`} style={{width:`${r.p}%`}}/></div></div>)}</div>
        </div>)}
      </div>
      <div className="app-card">
        <div className="p-5 border-b"><h3 className="font-bold">📋 Bilan mensuel</h3></div>
        <table className="w-full"><thead className="bg-slate-50"><tr>{['Mois','Recettes','Dépenses','Résultat','Marge'].map(h=><th key={h} className="text-left p-3 text-xs font-bold text-slate-600 uppercase">{h}</th>)}</tr></thead>
          <tbody>{[...DATA].reverse().map((m,i)=>{const r=m.r-m.d;const mg=Math.round((r/m.r)*100);return<tr key={i} className={`border-t hover:bg-slate-50 ${i===0?'bg-blue-50/40':''}`}>
            <td className="p-3 font-semibold">{m.m}{i===0&&<span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Mois courant</span>}</td>
            <td className="p-3 font-mono text-green-600 font-bold">{fmtF(m.r)}</td>
            <td className="p-3 font-mono text-red-600 font-bold">{fmtF(m.d)}</td>
            <td className="p-3 font-mono text-blue-600 font-bold">{fmtF(r)}</td>
            <td className="p-3"><Badge color={mg>=50?'green':mg>=30?'yellow':'red'}>{mg}%</Badge></td>
          </tr>;})}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}

// ── PARAMÈTRES (Équipe + Clinique) ───────────────────────────

export default Finances
