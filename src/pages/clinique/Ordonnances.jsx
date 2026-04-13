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
function Ordonnances({patients,meds}){
  const [ords,setOrds]=useState([
    {id:1,date:'2025-02-14',patient:'Mimi',proprio:'Martin Sophie',espece:'Chat',
     lignes:[{med:'Métronidazole 250mg',dose:'2 comprimés/jour',duree:'5 jours',qte:10},{med:'Probiotiques',dose:'1 sachet/jour',duree:'7 jours',qte:7}],
     note:'Ne pas donner avec du lait.'},
  ]);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({patient:'',proprio:'',espece:'',lignes:[{med:'',dose:'',duree:'',qte:''}],note:''});
  const [patSugg,setPatSugg]=useState([]);
  const [printOrd,setPrintOrd]=useState(null);

  const updLigne=(i,k,v)=>{const l=[...form.lignes];l[i]={...l[i],[k]:v};setForm({...form,lignes:l});};

  const OrdPrint=({o,clinique})=>{
    const now=new Date();
    const dateStr=now.toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
    return <div id="ord-print" className="hidden">
    <div style={{fontFamily:'Georgia,serif',padding:'32px 40px',maxWidth:'680px',margin:'0 auto',background:'white',color:'#111'}}>

      {/* En-tête avec logo */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px',paddingBottom:'16px',borderBottom:'3px solid #166534'}}>
        <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#166534,#1e3a8a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',flexShrink:0}}>🐄</div>
          <div>
            <div style={{fontFamily:'Outfit,sans-serif',fontWeight:900,fontSize:'18px',color:'#166534',letterSpacing:'1px'}}>LA BARAKAT</div>
            <div style={{fontSize:'11px',color:'#64748b',marginTop:'2px'}}>Pharmacie & Clinique Vétérinaire</div>
            <div style={{fontSize:'11px',color:'#64748b'}}>Lomé, Togo · www.labarakat.fr</div>
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontFamily:'Outfit,sans-serif',fontWeight:900,fontSize:'16px',color:'#1e3a8a',letterSpacing:'2px',textTransform:'uppercase'}}>Ordonnance</div>
          <div style={{fontSize:'12px',color:'#64748b',marginTop:'4px'}}>N° {o.id}</div>
          <div style={{fontSize:'12px',color:'#64748b'}}>{dateStr}</div>
          <div style={{marginTop:'8px',padding:'4px 8px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'6px',fontSize:'11px',fontWeight:600,color:'#166534',textAlign:'center'}}>ORIGINAL</div>
        </div>
      </div>

      {/* Patient */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px',padding:'14px',background:'#f8fafc',borderRadius:'10px',border:'1px solid #e2e8f0'}}>
        <div><span style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em'}}>Patient</span><div style={{fontWeight:700,fontSize:'14px',marginTop:'2px'}}>{o.patient}</div></div>
        <div><span style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em'}}>Espèce / Race</span><div style={{fontWeight:700,fontSize:'14px',marginTop:'2px'}}>{o.espece}</div></div>
        <div><span style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em'}}>Propriétaire</span><div style={{fontSize:'13px',marginTop:'2px'}}>{o.proprio}</div></div>
        <div><span style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em'}}>Date</span><div style={{fontSize:'13px',marginTop:'2px'}}>{o.date}</div></div>
      </div>

      {/* Médicaments */}
      <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'20px'}}>
        <thead>
          <tr style={{background:'#f0fdf4',borderTop:'2px solid #166534',borderBottom:'2px solid #166534'}}>
            {['Médicament','Posologie','Durée','Qté','Remarques'].map(h=><th key={h} style={{padding:'8px 10px',textAlign:'left',fontSize:'11px',fontWeight:700,color:'#166534',textTransform:'uppercase',letterSpacing:'.04em'}}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {o.lignes.map((l,i)=><tr key={i} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafbfc'}}>
            <td style={{padding:'10px',fontSize:'13px',fontWeight:600}}>{l.medicament}</td>
            <td style={{padding:'10px',fontSize:'12px',color:'#374151'}}>{l.posologie}</td>
            <td style={{padding:'10px',fontSize:'12px',color:'#374151'}}>{l.duree}</td>
            <td style={{padding:'10px',fontSize:'12px',fontWeight:600,color:'#166534',fontFamily:'monospace'}}>{l.qte}</td>
            <td style={{padding:'10px',fontSize:'11px',color:'#64748b',fontStyle:'italic'}}>{l.remarques||'—'}</td>
          </tr>)}
        </tbody>
      </table>

      {/* Observations */}
      {o.notes&&<div style={{padding:'12px 14px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'8px',marginBottom:'20px'}}>
        <div style={{fontSize:'11px',fontWeight:700,color:'#92400e',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.05em'}}>Observations</div>
        <div style={{fontSize:'13px',color:'#374151'}}>{o.notes}</div>
      </div>}

      {/* Pied de page */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginTop:'32px',paddingTop:'16px',borderTop:'2px solid #e2e8f0'}}>
        <div>
          <div style={{fontSize:'11px',color:'#64748b',marginBottom:'4px'}}>Prescrit par</div>
          <div style={{fontWeight:700,fontSize:'13px',color:'#166534'}}>{o.veterinaire||'Dr. Vétérinaire'}</div>
          <div style={{marginTop:'40px',borderTop:'1px solid #cbd5e1',paddingTop:'4px',width:'180px',fontSize:'10px',color:'#94a3b8',textAlign:'center'}}>Signature & Cachet</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'10px',color:'#94a3b8',lineHeight:1.6}}>
            <div>Valable 3 mois à compter de la date de délivrance</div>
            <div>Non remboursable · Usage vétérinaire uniquement</div>
            <div style={{marginTop:'4px',fontStyle:'italic'}}>La Barakat · Lomé, Togo</div>
          </div>
        </div>
      </div>
    </div>
  </div>;
  };
  return <div className="app-page space-y-5">
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

export default Ordonnances
