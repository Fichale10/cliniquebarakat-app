import { useState, useMemo, useEffect } from 'react';
import { today, fmtF, findDups, getCache, setCache, newId, dbInsert, dbUpdate, dbDelete } from '../../lib/utils';
import { Btn, Badge, Field, PrintBtn, DupWarning, AutoSuggest, FilterBar, FilterBtns, FilterSelect, FilterPeriode, useDateFilter } from '../../components/ui';
import { usePersist } from '../../lib/usePersist';

function Chirurgies({patients,equipe=[]}){
  const [chirs,setChirs]=usePersist('chirurgies', [
    {id:1,date:'2024-09-05',patient:'Mimi',proprio:'Martin Sophie',type:'Ovariohystérectomie',anesthesie:'Isoflurane + Propofol induction',duree:'45 min',chirurgien:'',statut:'Terminé',suivi:'Cicatrisation complète J+10',montant:85000},
    {id:2,date:'2025-02-01',patient:'Rex',proprio:'Dupont Jean',type:'Ablation corps étranger',anesthesie:'Propofol IV',duree:'30 min',chirurgien:'',statut:'Terminé',suivi:'Contrôle J+7 OK',montant:65000},
  ]);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({date:today(),patient:'',proprio:'',type:'',anesthesie:'',duree:'',chirurgien:'',statut:'Planifié',suivi:'',montant:''});
  const nomsEquipe=equipe.length?equipe.map(m=>m.nom):['–'];
  const [patSugg,setPatSugg]=useState([]);
  const SC={Planifié:'yellow',Terminé:'green',Annulé:'red','En cours':'blue'};

  return <div id="chirurgies-print" className="space-y-5">
    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">🔬 Chirurgies & Actes</h2>
        <div className="flex gap-2 no-print"><PrintBtn zoneId="chirurgies-print" label="🖨"/><Btn onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Annuler':'+ Nouvel acte'}</Btn></div>
      </div>
      {showForm&&<div className="p-5 bg-blue-50 border-b border-blue-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} type="date"/>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block">Patient</label>
            <AutoSuggest value={form.patient} onChange={e=>{setForm({...form,patient:e.target.value});setPatSugg(patients.filter(p=>p.nom.toLowerCase().includes(e.target.value.toLowerCase())));}} list={patSugg} onSelect={p=>{setForm({...form,patient:p.nom,proprio:p.proprio});setPatSugg([]);}} placeholder="Nom"/>
          </div>
          <Field label="Propriétaire" value={form.proprio} onChange={e=>setForm({...form,proprio:e.target.value})} placeholder="Propriétaire"/>
          <Field label="Type d'acte" value={form.type} onChange={e=>setForm({...form,type:e.target.value})} options={['Ovariohystérectomie','Castration','Ablation corps étranger','Suture plaie','Amputation','Césarienne','Biopsie','Laparotomie','Autre']}/>
          <Field label="Anesthésie" value={form.anesthesie} onChange={e=>setForm({...form,anesthesie:e.target.value})} placeholder="Protocole"/>
          <Field label="Durée" value={form.duree} onChange={e=>setForm({...form,duree:e.target.value})} placeholder="ex: 45 min"/>
          <Field label="Chirurgien" value={form.chirurgien} onChange={e=>setForm({...form,chirurgien:e.target.value})} options={nomsEquipe.length?nomsEquipe:['–']}/>
          <Field label="Montant (F)" value={form.montant} onChange={e=>setForm({...form,montant:e.target.value})} type="number" placeholder="0"/>
          <Field label="Statut" value={form.statut} onChange={e=>setForm({...form,statut:e.target.value})} options={['Planifié','En cours','Terminé','Annulé']}/>
          <Field label="Suivi post-op" value={form.suivi} onChange={e=>setForm({...form,suivi:e.target.value})} placeholder="Notes de suivi…" className="md:col-span-4"/>
        </div>
        <div className="mt-3"><Btn onClick={()=>{if(!form.patient||!form.type)return alert('Patient et type requis');setChirs([{...form,id:Date.now(),montant:parseInt(form.montant)||0},...chirs]);setForm({date:today(),patient:'',proprio:'',type:'',anesthesie:'',duree:'',chirurgien:'',statut:'Planifié',suivi:'',montant:''});setShowForm(false);}}>✓ Enregistrer</Btn></div>
      </div>}
      <div className="overflow-x-auto">
        <table className="w-full"><thead className="bg-slate-50"><tr>{['Date','Patient','Type d\'acte','Anesthésie','Durée','Montant','Statut','Suivi'].map(h=><th key={h} className="text-left p-3 text-xs font-bold text-slate-600 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{chirs.map(c=><tr key={c.id} className="border-t hover:bg-slate-50">
            <td className="p-3 text-sm">{c.date}</td>
            <td className="p-3 font-semibold">{c.patient}<div className="text-xs text-slate-400">{c.proprio}</div></td>
            <td className="p-3 font-medium text-purple-700">{c.type}</td>
            <td className="p-3 text-sm text-slate-600">{c.anesthesie}</td>
            <td className="p-3 text-sm">{c.duree}</td>
            <td className="p-3 font-bold font-mono text-blue-600 whitespace-nowrap">{fmtF(c.montant)}</td>
            <td className="p-3"><Badge color={SC[c.statut]}>{c.statut}</Badge></td>
            <td className="p-3 text-xs text-slate-500 max-w-[150px] truncate">{c.suivi||'–'}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  </div>;
}

// ── CLIENTS ──────────────────────────────────────────────────


export default Chirurgies;