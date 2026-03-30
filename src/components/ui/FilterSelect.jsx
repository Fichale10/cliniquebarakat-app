import { useState, useEffect, useRef, useMemo } from 'react'

function FilterSelect({label,value,onChange,options}){
  return <select className={`border-2 rounded-xl px-3 py-1.5 text-xs font-bold outline-none transition-all ${value?'border-blue-400 bg-blue-50 text-blue-700':'border-slate-200 bg-white text-slate-500'}`}
    value={value} onChange={e=>onChange(e.target.value)}>
    <option value="">{label}</option>
    {options.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
  </select>;
}

// Filtre période

export default FilterSelect
