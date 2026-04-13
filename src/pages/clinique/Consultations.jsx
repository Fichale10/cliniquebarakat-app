import { useState, useMemo, useEffect } from 'react';
import { today, fmtF, findDups, getCache, setCache, newId, dbInsert, dbUpdate, dbDelete } from '../../lib/utils';
import { Btn, Badge, Field, PrintBtn, DupWarning, AutoSuggest, FilterBar, FilterBtns, FilterSelect, FilterPeriode, useDateFilter } from '../../components/ui';
import { usePersist } from '../../lib/usePersist';

function Consultations({patients}){
  const [consults,setConsults]=usePersist('consultations', [
    {id:1,date:'2025-02-15',patient:'Rex',proprio:'Dupont Jean',poids:'32 kg',temperature:'38.5°C',fc:'80 bpm',
     soap_s:'Propriétaire signale une boiterie du membre antérieur droit depuis 3 jours',
     soap_o:'Légère claudication G2/5. Pas de chaleur locale. Réflexes normaux.',
     soap_a:'Suspicion entorse légère. Aucune fracture visible cliniquement.',
     soap_p:'Anti-inflammatoire 5j. Repos. Contrôle à J+10.',
     montant:15000,statut:'Payé'},
    {id:2,date:'2025-02-14',patient:'Mimi',proprio:'Martin Sophie',poids:'4 kg',temperature:'39.1°C',fc:'160 bpm',
     soap_s:'Vomissements depuis 24h, perte d\'appétit',
     soap_o:'Déshydratation légère (5%). Douleur abdominale à la palpation.',
     soap_a:'Gastro-entérite aiguë',
     soap_p:'Métronidazole 250mg 2cp/j × 5j. Diète 24h puis alimentation adaptée.',
     montant:12000,statut:'Payé'},
  ]);
  const [showForm,setShowForm]=useState(false);
  const [exp,setExp]=useState(null);
  const [form,setForm]=useState({date:today(),patient:'',proprio:'',poids:'',temperature:'',fc:'',soap_s:'',soap_o:'',soap_a:'',soap_p:'',montant:'',statut:'En attente'});
  const f=v=>e=>setForm({...form,[v]:e.target.value});
  const [patSugg,setPatSugg]=useState([]);

  const [searchC,setSearchC]=useState('');
  const [fCStatut,setFCStatut]=useState('');
  const [fCPeriode,setFCPeriode]=useState('');
  const now3=new Date();
  const cDebutMap={jour:today(),semaine:new Date(now3.getTime()-now3.getDay()*86400000).toISOString().split('T')[0],mois:new Date(now3.getFullYear(),now3.getMonth(),1).toISOString().split('T')[0],annee:new Date(now3.getFullYear(),0,1).toISOString().split('T')[0]};
  const cFiltered=consults.filter(c=>{
    if(fCStatut&&c.statut!==fCStatut)return false;
    if(fCPeriode&&cDebutMap[fCPeriode]&&c.date<cDebutMap[fCPeriode])return false;
    if(searchC){const q=searchC.toLowerCase();if(!c.patient.toLowerCase().includes(q)&&!c.proprio.toLowerCase().includes(q)&&!(c.soap_a||'').toLowerCase().includes(q))return false;}
    return true;
  });

  const handleAdd=()=>{
    if(!form.patient||!form.soap_a)return alert('Patient et diagnostic (SOAP-A) requis');
    setConsults([{...form,id:Date.now(),montant:parseInt(form.montant)||0},...consults]);
    setForm({date:today(),patient:'',proprio:'',poids:'',temperature:'',fc:'',soap_s:'',soap_o:'',soap_a:'',soap_p:'',montant:'',statut:'En attente'});
    setShowForm(false);
  };

  const PrintConsult=({c})=><div id={`cp-${c.id}`} className="hidden">
    <div style={{fontFamily:'sans-serif',padding:'30px',maxWidth:'620px',margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',borderBottom:'3px solid #16a34a',paddingBottom:'15px',marginBottom:'20px'}}>
        <div><h1 style={{margin:0,fontSize:'22px',color:'#14532d',fontWeight:'900'}}>🐾 La Barakat</h1><p style={{margin:'4px 0 0',color:'#64748b',fontSize:'12px'}}>La Barakat – Pharmacie & Clinique Vétérinaire · Lomé, Togo</p></div>
        <div style={{textAlign:'right',fontSize:'12px',color:'#64748b'}}><div style={{fontWeight:'900',fontSize:'16px',color:'#16a34a'}}>FICHE CONSULTATION</div><div>N° {c.id} · {c.date}</div></div>
      </div>
      <div style={{background:'#f8fafc',borderRadius:'8px',padding:'12px',marginBottom:'16px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',fontSize:'13px'}}>
        <div><strong>Patient :</strong> {c.patient}</div><div><strong>Propriétaire :</strong> {c.proprio}</div><div><strong>Poids :</strong> {c.poids||'–'}</div>
        <div><strong>Température :</strong> {c.temperature||'–'}</div><div><strong>FC :</strong> {c.fc||'–'}</div>
      </div>
      {[['S – Subjectif (plainte)',c.soap_s],['O – Objectif (examen)',c.soap_o],['A – Analyse (diagnostic)',c.soap_a],['P – Plan (traitement)',c.soap_p]].map(([l,v],i)=>v&&<div key={i} style={{marginBottom:'12px'}}><div style={{fontWeight:'700',color:'#16a34a',fontSize:'12px',marginBottom:'4px'}}>{l}</div><div style={{background:'#f1f5f9',borderRadius:'6px',padding:'8px 10px',fontSize:'13px'}}>{v}</div></div>)}
      <div style={{borderTop:'2px solid #e2e8f0',paddingTop:'12px',display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'16px'}}>
        <div style={{fontSize:'12px',color:'#64748b'}}>La Barakat</div>
        <div style={{fontSize:'20px',fontWeight:'900',color:'#16a34a'}}>{fmtF(c.montant)}</div>
      </div>
    </div>
  </div>;

  return <div className="space-y-5">
    {consults.map(c=><PrintConsult key={c.id} c={c}/>)}
    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">🩺 Consultations <span className="text-sm font-normal text-slate-400">(format SOAP)</span></h2>
        <Btn onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Annuler':'+ Nouvelle consultation'}</Btn>
      </div>
      {showForm&&<div className="p-5 bg-blue-50 border-b border-blue-200">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          <Field label="Date" value={form.date} onChange={f('date')} type="date"/>
          <div className="md:col-span-2"><label className="text-xs font-bold text-slate-600 mb-1 block">Patient</label>
            <AutoSuggest value={form.patient} onChange={e=>{setForm({...form,patient:e.target.value});setPatSugg(patients.filter(p=>p.nom.toLowerCase().includes(e.target.value.toLowerCase())))}} list={patSugg} onSelect={p=>setForm({...form,patient:p.nom,proprio:p.proprio,poids:p.poids||''})} placeholder="Nom de l'animal"/>
          </div>
          <Field label="Propriétaire" value={form.proprio} onChange={f('proprio')} placeholder="Propriétaire"/>
          <Field label="Poids" value={form.poids} onChange={f('poids')} placeholder="ex: 12 kg"/>
          <Field label="Température" value={form.temperature} onChange={f('temperature')} placeholder="38.5°C"/>
          <Field label="Fréq. cardiaque" value={form.fc} onChange={f('fc')} placeholder="80 bpm"/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-white rounded-xl p-3 border-2 border-blue-100">
            <div className="text-xs font-black text-blue-600 uppercase mb-2">S — Subjectif</div>
            <p className="text-xs text-slate-400 mb-2">Motif de consultation, plainte du propriétaire</p>
            <textarea rows="3" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none" placeholder="Que dit le propriétaire ?" value={form.soap_s} onChange={f('soap_s')}/>
          </div>
          <div className="bg-white rounded-xl p-3 border-2 border-green-100">
            <div className="text-xs font-black text-green-600 uppercase mb-2">O — Objectif</div>
            <p className="text-xs text-slate-400 mb-2">Résultats de l'examen clinique</p>
            <textarea rows="3" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 outline-none" placeholder="Paramètres vitaux, palpation…" value={form.soap_o} onChange={f('soap_o')}/>
          </div>
          <div className="bg-white rounded-xl p-3 border-2 border-orange-100">
            <div className="text-xs font-black text-orange-600 uppercase mb-2">A — Analyse / Diagnostic *</div>
            <p className="text-xs text-slate-400 mb-2">Hypothèse(s) diagnostique(s)</p>
            <textarea rows="3" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 outline-none" placeholder="Diagnostic principal…" value={form.soap_a} onChange={f('soap_a')}/>
          </div>
          <div className="bg-white rounded-xl p-3 border-2 border-purple-100">
            <div className="text-xs font-black text-purple-600 uppercase mb-2">P — Plan thérapeutique</div>
            <p className="text-xs text-slate-400 mb-2">Traitements, examens complémentaires, suivi</p>
            <textarea rows="3" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-purple-400 outline-none" placeholder="Médicaments, conseils, prochain RDV…" value={form.soap_p} onChange={f('soap_p')}/>
          </div>
        </div>
        <div className="flex gap-3 items-end">
          <Field label="Montant (F)" value={form.montant} onChange={f('montant')} type="number" placeholder="0" className="w-36"/>
          <Field label="Statut" value={form.statut} onChange={f('statut')} options={['En attente','Payé']} className="w-36"/>
          <Btn onClick={handleAdd} className="mb-0.5">✓ Enregistrer</Btn>
        </div>
      </div>}
      <FilterBar search={searchC} onSearch={setSearchC} placeholder="🔍 Patient, propriétaire, diagnostic…" activeCount={[fCStatut,fCPeriode,searchC].filter(Boolean).length} onReset={()=>{setSearchC('');setFCStatut('');setFCPeriode('');}}>
        <FilterBtns options={[{v:'Payé',l:'✓ Payé'},{v:'En attente',l:'⏳ En attente'}]} value={fCStatut} onChange={setFCStatut} colorFn={v=>v==='Payé'?'green':'amber'}/>
        <FilterPeriode value={fCPeriode} onChange={setFCPeriode}/>
        <span className="text-xs text-slate-400">{cFiltered.length}/{consults.length}</span>
      </FilterBar>
      <div className="divide-y">
        {cFiltered.map(c=><div key={c.id}>
          <div className="p-4 hover:bg-slate-50 transition-all cursor-pointer" onClick={()=>setExp(exp===c.id?null:c.id)}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm text-slate-400">{c.date}</span>
                  <span className="font-bold">{c.patient}</span>
                  <span className="text-sm text-slate-500">· {c.proprio}</span>
                  {c.temperature&&<Badge color="slate">T° {c.temperature}</Badge>}
                  {c.fc&&<Badge color="slate">FC {c.fc}</Badge>}
                </div>
                <p className="text-sm font-semibold text-orange-600">🔎 {c.soap_a}</p>
                {exp!==c.id&&c.soap_p&&<p className="text-xs text-slate-500 mt-1">💊 {c.soap_p.substring(0,80)}{c.soap_p.length>80?'…':''}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold font-mono text-blue-600">{fmtF(c.montant)}</span>
                <Badge color={c.statut==='Payé'?'green':'yellow'}>{c.statut}</Badge>
                <button onClick={e=>{e.stopPropagation();const el=document.getElementById(`cp-${c.id}`);el.classList.remove('hidden');setTimeout(()=>{printZone(`cp-${c.id}`);el.classList.add('hidden');},100);}} className="no-print bg-slate-700 hover:bg-slate-800 text-white text-xs px-2 py-1 rounded-lg">🖨</button>
              </div>
            </div>
          </div>
          {exp===c.id&&<div className="px-4 pb-4 bg-slate-50 border-t grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['S – Subjectif',c.soap_s,'blue'],['O – Objectif',c.soap_o,'green'],['A – Diagnostic',c.soap_a,'orange'],['P – Plan',c.soap_p,'purple']].map(([l,v,col],i)=>v&&(
              <div key={i} className={`bg-white rounded-xl p-3 border-l-4 border-l-${col}-400`}>
                <div className={`text-xs font-bold text-${col}-600 mb-2`}>{l}</div>
                <p className="text-sm">{v}</p>
              </div>
            ))}
          </div>}
        </div>)}
      </div>
    </div>
  </div>;
}

// ── DOSSIERS MÉDICAUX ────────────────────────────────────────


export default Consultations;