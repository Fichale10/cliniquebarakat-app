import { useState, useEffect, useRef, useMemo } from 'react'

function FilterBtns({label,options,value,onChange,colorFn}){
  return <div className="flex items-center gap-1.5 flex-wrap">
    {label&&<span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1">{label}</span>}
    {options.map(o=>{
      const active=value===o.v;
      const color=colorFn?colorFn(o.v):'blue';
      return <button key={o.v} onClick={()=>onChange(active?'':o.v)}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all whitespace-nowrap
          ${active?`border-${color}-500 bg-${color}-50 text-${color}-700 shadow-sm`:'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}>
        {o.l}{o.n!==undefined&&<span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${active?`bg-${color}-200`:'bg-slate-100'}`}>{o.n}</span>}
      </button>;
    })}
  </div>;
}

// Barre de filtres complète avec recherche + dropdowns + période

export default FilterBtns
