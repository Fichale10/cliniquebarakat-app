import { useState, useEffect, useRef, useMemo } from 'react'
import { Btn, PrintBtn, Field, AutoSuggest, Badge } from '../../components/ui'

const today = () => new Date().toISOString().split('T')[0]
const fmtF = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'
const printZone = (zoneId) => {
  const el = document.getElementById(zoneId)
  if (!el) return
  const w = window.open('', '_blank', 'width=900,height=700')
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' + el.innerHTML + '</body></html>')
  w.document.close()
  w.focus()
  w.print()
}

function Factures({clients}){
  const [facs,setFacs]=useState([
    {id:1,num:'FAC-2025-001',date:'2025-02-15',client:'Dupont Jean',description:'Consultation + Vaccin annuel',montant:9440,statut:'Payé',mode:'Espèces'},
    {id:2,num:'FAC-2025-002',date:'2025-02-14',client:'Martin Sophie',description:'Consultation + Métronidazole',montant:12000,statut:'Payé',mode:'Mobile Money'},
    {id:3,num:'FAC-2025-003',date:'2025-02-13',client:'Ferme Kokou',description:'Contrôle gestation + Vitamines',montant:25000,statut:'En attente',mode:'–'},
  ]);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({date:today(),client:'',description:'',montant:'',statut:'En attente',mode:'Espèces'});
  const [cliSugg,setCliSugg]=useState([]);

  const totalP=facs.filter(f=>f.statut==='Payé').reduce((s,f)=>s+f.montant,0);
  const totalA=facs.filter(f=>f.statut==='En attente').reduce((s,f)=>s+f.montant,0);

  const FacPrint=({f})=><div id={`fp-${f.id}`} className="hidden">
    <div style={{fontFamily:'sans-serif',padding:'40px',maxWidth:'600px',margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',borderBottom:'3px solid #16a34a',paddingBottom:'20px',marginBottom:'24px'}}>
        <div><h1 style={{margin:0,fontSize:'22px',color:'#14532d',fontWeight:'900'}}>🐾 La Barakat</h1><p style={{margin:'4px 0 0',color:'#64748b',fontSize:'12px'}}>La Barakat – Pharmacie & Clinique Vétérinaire · Lomé, Togo</p></div>
        <div style={{textAlign:'right'}}><div style={{fontSize:'20px',fontWeight:'900',color:'#16a34a'}}>FACTURE</div><div style={{color:'#64748b',fontSize:'12px'}}>{f.num} · {f.date}</div></div>
      </div>
      <div style={{marginBottom:'20px'}}><div style={{fontSize:'12px',color:'#94a3b8',fontWeight:'700',marginBottom:'4px'}}>FACTURÉ À</div><div style={{fontSize:'16px',fontWeight:'700'}}>{f.client}</div></div>
      <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'20px'}}>
        <thead><tr style={{background:'#f0fdf4'}}><th style={{padding:'10px',textAlign:'left',fontSize:'12px',fontWeight:'700',color:'#16a34a',borderBottom:'2px solid #bbf7d0'}}>Description</th><th style={{padding:'10px',textAlign:'right',fontSize:'12px',fontWeight:'700',color:'#16a34a',borderBottom:'2px solid #bbf7d0'}}>Montant</th></tr></thead>
        <tbody><tr><td style={{padding:'12px 10px',borderBottom:'1px solid #e2e8f0'}}>{f.description}</td><td style={{padding:'12px 10px',textAlign:'right',fontWeight:'700',borderBottom:'1px solid #e2e8f0'}}>{fmtF(f.montant)}</td></tr></tbody>
      </table>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'20px'}}><div style={{background:'#f0fdf4',borderRadius:'8px',padding:'12px 20px',minWidth:'200px'}}><div style={{display:'flex',justifyContent:'space-between',fontSize:'16px',fontWeight:'900',color:'#16a34a'}}><span>Total</span><span>{fmtF(f.montant)}</span></div></div></div>
      <div style={{background:'#f8fafc',borderRadius:'6px',padding:'10px 14px',fontSize:'12px',color:'#64748b'}}>Mode : <strong>{f.mode}</strong> · Statut : <strong style={{color:f.statut==='Payé'?'#16a34a':'#d97706'}}>{f.statut}</strong></div>
      <div style={{marginTop:'20px',paddingTop:'12px',borderTop:'1px solid #e2e8f0',fontSize:'11px',color:'#94a3b8',textAlign:'center'}}>Merci de votre confiance · La Barakat · Lomé</div>
    </div>
  </div>;

  return <div id="factures-print" className="app-page space-y-5">
    {facs.map(f=><FacPrint key={f.id} f={f}/>)}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="stat-tile stat-tile--green">
        <div className="stat-tile__label">✅ Total encaissé</div>
        <div className="stat-tile__value">{fmtF(totalP)}</div>
      </div>
      <div className="stat-tile stat-tile--yellow">
        <div className="stat-tile__label">⏳ En attente</div>
        <div className="stat-tile__value">{fmtF(totalA)}</div>
      </div>
    </div>
    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between">
        <div><h2 className="text-xl font-bold flex items-center gap-2">📄 Factures</h2></div><div className="flex gap-2"><PrintBtn zoneId="factures-print" label="🖨 Imprimer"/><Btn onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Annuler':'+ Nouvelle facture'}</Btn></div>
      </div>
      {showForm&&<div className="p-5 bg-blue-50 border-b border-blue-200">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} type="date"/>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block">Client *</label>
            <AutoSuggest value={form.client} onChange={e=>{setForm({...form,client:e.target.value});setCliSugg(clients.filter(c=>c.nom.toLowerCase().includes(e.target.value.toLowerCase())));}} list={cliSugg} onSelect={c=>{setForm({...form,client:c.nom});setCliSugg([]);}} placeholder="Nom du client"/>
          </div>
          <Field label="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Prestations"/>
          <Field label="Montant (F) *" value={form.montant} onChange={e=>setForm({...form,montant:e.target.value})} type="number" placeholder="0"/>
          <Field label="Statut" value={form.statut} onChange={e=>setForm({...form,statut:e.target.value})} options={['En attente','Payé']}/>
          <Field label="Mode paiement" value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})} options={['Espèces','Mobile Money','Virement','–']}/>
        </div>
        <div className="mt-3"><Btn onClick={()=>{if(!form.client||!form.montant)return alert('Client et montant requis');const num=`FAC-2025-${String(facs.length+1).padStart(3,'0')}`;setFacs([{...form,id:Date.now(),num,montant:parseInt(form.montant)},...facs]);setForm({date:today(),client:'',description:'',montant:'',statut:'En attente',mode:'Espèces'});setShowForm(false);}}>✓ Créer</Btn></div>
      </div>}
      <div className="overflow-x-auto">
        <table className="w-full"><thead className="bg-slate-50"><tr>{['N°','Date','Client','Description','Montant','Mode','Statut','Actions'].map(h=><th key={h} className="text-left p-3 text-xs font-bold text-slate-600 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{facs.map(f=><tr key={f.id} className="border-t hover:bg-slate-50">
            <td className="p-3 font-mono text-xs font-bold text-slate-500">{f.num}</td>
            <td className="p-3 text-sm">{f.date}</td>
            <td className="p-3 font-semibold">{f.client}</td>
            <td className="p-3 text-sm text-slate-600 max-w-[150px] truncate">{f.description}</td>
            <td className="p-3 font-bold font-mono text-blue-600 whitespace-nowrap">{fmtF(f.montant)}</td>
            <td className="p-3 text-sm">{f.mode}</td>
            <td className="p-3"><Badge color={f.statut==='Payé'?'green':'yellow'}>{f.statut}</Badge></td>
            <td className="p-3 flex gap-1">
              <button onClick={()=>setFacs(facs.map(x=>x.id===f.id?{...x,statut:x.statut==='Payé'?'En attente':'Payé'}:x))} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg">{f.statut==='Payé'?'↩':'✓ Payé'}</button>
              <button onClick={()=>{const el=document.getElementById(`fp-${f.id}`);el.classList.remove('hidden');setTimeout(()=>{printZone(`fp-${f.id}`);el.classList.add('hidden');},100);}} className="text-xs bg-slate-700 hover:bg-slate-800 text-white px-2 py-1 rounded-lg no-print">🖨</button>
            </td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  </div>;
}

// ── MÉDICAMENTS ──────────────────────────────────────────────

export default Factures
