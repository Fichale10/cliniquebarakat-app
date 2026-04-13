import { useState, useMemo, useEffect } from 'react';
import { today, fmtF, findDups, getCache, setCache, newId, dbInsert, dbUpdate, dbDelete } from '../../lib/utils';
import { Btn, Badge, Field, PrintBtn, DupWarning, AutoSuggest, FilterBar, FilterBtns, FilterSelect, FilterPeriode, useDateFilter } from '../../components/ui';
import { usePersist } from '../../lib/usePersist';

function Agenda({patients}){
  const TYPE_COLORS={
    'Consultation':'bg-blue-100 text-blue-800 border-blue-300',
    'Vaccination':'bg-green-100 text-green-800 border-green-300',
    'Chirurgie':'bg-purple-100 text-purple-800 border-purple-300',
    'Contrôle post-op':'bg-orange-100 text-orange-800 border-orange-300',
    'Urgence':'bg-red-100 text-red-800 border-red-300',
    'Echographie':'bg-cyan-100 text-cyan-800 border-cyan-300',
    'Détartrage':'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Autre':'bg-slate-100 text-slate-800 border-slate-300',
  };
  const TYPE_DOT={Consultation:'🔵',Vaccination:'🟢',Chirurgie:'🟣',Urgence:'🔴','Contrôle post-op':'🟠',Echographie:'🩵',Détartrage:'🟡',Autre:'⚪'};

  const [rdvs,setRdvs]=usePersist('rdvs', [
    {id:1,date:today(),heure:'09:00',patient:'Rex',proprio:'Dupont Jean',type:'Vaccination',statut:'Confirmé',note:''},
    {id:2,date:today(),heure:'10:30',patient:'Mimi',proprio:'Martin Sophie',type:'Contrôle post-op',statut:'Confirmé',note:'Suivi op 05/09'},
    {id:3,date:today(),heure:'14:00',patient:'Bella',proprio:'Ferme Kokou',type:'Echographie',statut:'En attente',note:'Contrôle gestation'},
    {id:4,date:new Date(Date.now()+86400000).toISOString().split('T')[0],heure:'09:30',patient:'Simba',proprio:'Akouavi Afi',type:'Consultation',statut:'Confirmé',note:''},
    {id:5,date:new Date(Date.now()+86400000).toISOString().split('T')[0],heure:'11:00',patient:'Rex',proprio:'Dupont Jean',type:'Urgence',statut:'En attente',note:'Boiterie aggravée'},
  ]);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({date:today(),heure:'09:00',patient:'',proprio:'',type:'Consultation',statut:'En attente',note:''});
  const [patSugg,setPatSugg]=useState([]);
  const f=v=>e=>setForm({...form,[v]:e.target.value});

  const todayRdvs=rdvs.filter(r=>r.date===today()).sort((a,b)=>a.heure.localeCompare(b.heure));
  const futureRdvs=rdvs.filter(r=>r.date>today()).sort((a,b)=>a.date.localeCompare(b.date)||a.heure.localeCompare(b.heure));

  const RDVCard=({r})=><div className={`flex items-start gap-3 p-4 border-2 rounded-xl transition-all hover:shadow-md ${TYPE_COLORS[r.type]||TYPE_COLORS['Autre']}`}>
    <div className="text-center min-w-[55px] bg-white rounded-xl p-2 border border-white/50 shadow-sm">
      <div className="text-base font-black">{r.heure}</div>
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 flex-wrap mb-0.5">
        <span className="text-lg">{TYPE_DOT[r.type]||'⚪'}</span>
        <span className="font-bold">{r.patient}</span>
        <span className="text-sm opacity-70">· {r.proprio}</span>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${r.statut==='Confirmé'?'bg-green-200 text-green-800':'bg-white/70 text-slate-600'}`}>{r.statut}</span>
      </div>
      <div className="text-sm font-semibold">{r.type}</div>
      {r.note&&<p className="text-xs opacity-70 mt-0.5">📌 {r.note}</p>}
    </div>
    <div className="flex gap-1 no-print">
      {r.statut!=='Terminé'&&r.statut!=='Annulé'&&<>
        <button onClick={()=>setRdvs(rdvs.map(x=>x.id===r.id?{...x,statut:'Terminé'}:x))} className="text-xs bg-white/70 hover:bg-green-100 px-2 py-1 rounded-lg">✓</button>
        <button onClick={()=>setRdvs(rdvs.map(x=>x.id===r.id?{...x,statut:'Annulé'}:x))} className="text-xs bg-white/70 hover:bg-red-100 px-2 py-1 rounded-lg">✕</button>
      </>}
    </div>
  </div>;

  return <div className="space-y-5">
    {/* Légende */}
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <h3 className="font-bold text-sm text-slate-600 mb-2">Légende des types de RDV</h3>
      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_DOT).map(([type,dot])=><div key={type} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${TYPE_COLORS[type]}`}><span>{dot}</span>{type}</div>)}
      </div>
    </div>

    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">📅 Agenda & Rendez-vous</h2>
        <Btn onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Annuler':'+ Nouveau RDV'}</Btn>
      </div>
      {showForm&&<div className="p-5 bg-blue-50 border-b border-blue-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Date" value={form.date} onChange={f('date')} type="date"/>
          <Field label="Heure" value={form.heure} onChange={f('heure')} type="time"/>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block">Patient</label>
            <AutoSuggest value={form.patient} onChange={e=>{setForm({...form,patient:e.target.value});setPatSugg(patients.filter(p=>p.nom.toLowerCase().includes(e.target.value.toLowerCase())));}} list={patSugg} onSelect={p=>setForm({...form,patient:p.nom,proprio:p.proprio})} placeholder="Nom"/>
          </div>
          <Field label="Propriétaire" value={form.proprio} onChange={f('proprio')} placeholder="Propriétaire"/>
          <Field label="Type de RDV" value={form.type} onChange={f('type')} options={Object.keys(TYPE_COLORS)}/>
          <Field label="Statut" value={form.statut} onChange={f('statut')} options={['En attente','Confirmé']}/>
          <Field label="Note" value={form.note} onChange={f('note')} placeholder="Information…" className="md:col-span-2"/>
        </div>
        <div className="mt-3"><Btn onClick={()=>{if(!form.patient)return alert('Patient requis');setRdvs([...rdvs,{...form,id:Date.now()}].sort((a,b)=>a.date.localeCompare(b.date)));setForm({date:today(),heure:'09:00',patient:'',proprio:'',type:'Consultation',statut:'En attente',note:''});setShowForm(false);}}>✓ Enregistrer</Btn></div>
      </div>}
      <div className="p-5 space-y-6">
        <div>
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">📍 Aujourd'hui <span className="text-sm font-normal text-slate-400">{today()}</span></h3>
          {todayRdvs.length?<div className="space-y-2">{todayRdvs.map(r=><RDVCard key={r.id} r={r}/>)}</div>
          :<div className="bg-slate-50 rounded-xl p-6 text-center text-slate-400 text-sm">Journée libre 🎉</div>}
        </div>
        {futureRdvs.length>0&&<div>
          <h3 className="font-bold text-slate-700 mb-3">📆 Prochains RDV</h3>
          <div className="space-y-3">{futureRdvs.map(r=><div key={r.id}><div className="text-xs font-bold text-slate-400 mb-1 pl-1">{r.date}</div><RDVCard r={r}/></div>)}</div>
        </div>}
      </div>
    </div>
  </div>;
}

// ── TÂCHES ÉQUIPE ────────────────────────────────────────────


export default Agenda;