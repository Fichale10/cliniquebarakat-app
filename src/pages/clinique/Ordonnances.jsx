import { useState, useMemo, useEffect } from 'react';
import { today, fmtF, findDups, getCache, setCache, newId, dbInsert, dbUpdate, dbDelete } from '../../lib/utils';
import { Btn, Badge, Field, PrintBtn, DupWarning, AutoSuggest, FilterBar, FilterBtns, FilterSelect, FilterPeriode, useDateFilter } from '../../components/ui';
import { usePersist } from '../../lib/usePersist';

function Ordonnances({patients,meds}){
  const [ords,setOrds]=usePersist('ordonnances', [
    {id:1,date:'2025-02-14',patient:'Mimi',proprio:'Martin Sophie',espece:'Chat',
     lignes:[{med:'Métronidazole 250mg',dose:'2 comprimés/jour',duree:'5 jours',qte:10},{med:'Probiotiques',dose:'1 sachet/jour',duree:'7 jours',qte:7}],
     note:'Ne pas donner avec du lait.'},
  ]);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({patient:'',proprio:'',espece:'',lignes:[{med:'',dose:'',duree:'',qte:''}],note:''});
  const [patSugg,setPatSugg]=useState([]);
  const [printOrd,setPrintOrd]=useState(null);

  const updLigne=(i,k,v)=>{const l=[...form.lignes];l[i]={...l[i],[k]:v};setForm({...form,lignes:l});};

  const OrdPrint=({o})=><div id="ord-print" className="hidden">
    <div style={{fontFamily:'sans-serif',padding:'30px',maxWidth:'620px',margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',borderBottom:'3px solid #16a34a',paddingBottom:'16px',marginBottom:'20px'}}>
        <div><h1 style={{margin:0,fontSize:'20px',color:'#14532d',fontWeight:'900'}}>🐾 La Barakat</h1><p style={{margin:'4px 0 0',color:'#64748b',fontSize:'12px'}}>La Barakat – Pharmacie & Clinique Vétérinaire · Lomé, Togo</p></div>
        <div style={{textAlign:'right'}}><div style={{fontSize:'18px',fontWeight:'900',color:'#16a34a'}}>ORDONNANCE</div><div style={{color:'#64748b',fontSize:'12px'}}>N° {o.id} · {o.date}</div></div>
      </div>
      <div style={{background:'#f8fafc',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
        <div><strong>Patient :</strong> {o.patient}</div><div><strong>Espèce :</strong> {o.espece}</div>
        <div><strong>Propriétaire :</strong> {o.proprio}</div>
      </div>
      <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'16px'}}>
        <thead><tr style={{background:'#f0fdf4'}}>{['Médicament','Posologie','Durée','Qté'].map(h=><th key={h} style={{padding:'8px',textAlign:'left',fontSize:'12px',fontWeight:'700',color:'#16a34a',borderBottom:'2px solid #bbf7d0'}}>{h}</th>)}</tr></thead>
        <tbody>{o.lignes.map((l,i)=><tr key={i} style={{borderBottom:'1px solid #e2e8f0'}}><td style={{padding:'8px',fontWeight:'600',fontSize:'13px'}}>{l.med}</td><td style={{padding:'8px',fontSize:'13px'}}>{l.dose}</td><td style={{padding:'8px',fontSize:'13px'}}>{l.duree}</td><td style={{padding:'8px',fontSize:'13px'}}>{l.qte}</td></tr>)}</tbody>
      </table>
      {o.note&&<div style={{background:'#fefce8',border:'1px solid #fef08a',borderRadius:'6px',padding:'8px 12px',marginBottom:'16px',fontSize:'13px'}}>📌 {o.note}</div>}
      <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid #e2e8f0',paddingTop:'16px'}}>
        <div style={{fontSize:'12px',color:'#94a3b8'}}>Valable 30 jours</div>
        <div style={{textAlign:'center'}}><div style={{borderBottom:'1px solid #334155',width:'200px',marginBottom:'4px',height:'30px'}}></div><div style={{fontSize:'12px',color:'#334155'}}>Vétérinaire – Signature & Cachet</div></div>
      </div>
    </div>
  </div>;

  return <div className="space-y-5">
    {printOrd&&<OrdPrint o={printOrd}/>}
    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">📝 Ordonnances</h2>
        <Btn onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Annuler':'+ Nouvelle ordonnance'}</Btn>
      </div>
      {showForm&&<div className="p-5 bg-blue-50 border-b border-blue-200">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div><label className="text-xs font-bold text-slate-600 mb-1 block">Patient</label>
            <AutoSuggest value={form.patient} onChange={e=>{setForm({...form,patient:e.target.value});setPatSugg(patients.filter(p=>p.nom.toLowerCase().includes(e.target.value.toLowerCase())));}} list={patSugg} onSelect={p=>{setForm({...form,patient:p.nom,proprio:p.proprio,espece:p.espece});setPatSugg([]);}} placeholder="Nom"/>
          </div>
          <Field label="Propriétaire" value={form.proprio} onChange={e=>setForm({...form,proprio:e.target.value})} placeholder="Propriétaire"/>
          <Field label="Espèce" value={form.espece} onChange={e=>setForm({...form,espece:e.target.value})} placeholder="Espèce"/>
        </div>
        <div className="mb-3">
          <div className="flex justify-between mb-2"><label className="text-xs font-bold text-slate-600">Médicaments</label><button onClick={()=>setForm({...form,lignes:[...form.lignes,{med:'',dose:'',duree:'',qte:''}]})} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-semibold">+ Ajouter</button></div>
          {form.lignes.map((l,i)=><div key={i} className="grid grid-cols-5 gap-2 mb-2">
            <div className="col-span-2"><select className="w-full border-2 border-slate-200 rounded-lg px-2 py-2 text-sm focus:border-blue-400 outline-none" value={l.med} onChange={e=>updLigne(i,'med',e.target.value)}>
              <option value="">-- Médicament --</option>{meds.map(m=><option key={m.id}>{m.nom}</option>)}<option>Autre</option>
            </select></div>
            <input className="border-2 border-slate-200 rounded-lg px-2 py-2 text-sm focus:border-blue-400 outline-none" placeholder="Posologie" value={l.dose} onChange={e=>updLigne(i,'dose',e.target.value)}/>
            <input className="border-2 border-slate-200 rounded-lg px-2 py-2 text-sm focus:border-blue-400 outline-none" placeholder="Durée" value={l.duree} onChange={e=>updLigne(i,'duree',e.target.value)}/>
            <div className="flex gap-1"><input type="number" className="flex-1 border-2 border-slate-200 rounded-lg px-2 py-2 text-sm focus:border-blue-400 outline-none" placeholder="Qté" value={l.qte} onChange={e=>updLigne(i,'qte',e.target.value)}/>
              {form.lignes.length>1&&<button onClick={()=>setForm({...form,lignes:form.lignes.filter((_,j)=>j!==i)})} className="text-red-400 px-1">✕</button>}</div>
          </div>)}
        </div>
        <Field label="Note / Conseils" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} rows={2} placeholder="Conseils au propriétaire…"/>
        <div className="mt-3"><Btn onClick={()=>{if(!form.patient)return alert('Patient requis');setOrds([{...form,id:Date.now(),date:today()},...ords]);setForm({patient:'',proprio:'',espece:'',lignes:[{med:'',dose:'',duree:'',qte:''}],note:''});setShowForm(false);}}>✓ Créer l'ordonnance</Btn></div>
      </div>}
      <div className="p-5 space-y-4">
        {ords.map(o=><div key={o.id} className="border-2 border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-all">
          <div className="flex justify-between mb-3">
            <div><span className="font-mono text-xs text-slate-400">ORD-{o.id}</span> <span className="text-xs text-slate-400">{o.date}</span>
              <h3 className="font-bold text-lg mt-0.5">{o.patient} <span className="text-slate-500 font-normal">({o.espece}) · {o.proprio}</span></h3></div>
            <button onClick={()=>{setPrintOrd(o);setTimeout(()=>{const el=document.getElementById('ord-print');el.classList.remove('hidden');setTimeout(()=>{printZone('ord-print');el.classList.add('hidden');},100);},50);}} className="no-print bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">🖨 Imprimer</button>
          </div>
          <div className="space-y-1.5">{o.lignes.map((l,i)=><div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
            <span className="font-semibold text-sm text-blue-700 min-w-[160px]">💊 {l.med}</span>
            <span className="text-sm">{l.dose}</span><span className="text-sm text-slate-500">· {l.duree}</span>
            <Badge color="blue" className="ml-auto">Qté : {l.qte}</Badge>
          </div>)}</div>
          {o.note&&<p className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">📌 {o.note}</p>}
        </div>)}
      </div>
    </div>
  </div>;
}

// ── CHIRURGIES ───────────────────────────────────────────────


export default Ordonnances;