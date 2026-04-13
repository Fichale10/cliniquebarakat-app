import { useState, useEffect, useRef, useMemo } from 'react'
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
function Hospitalisation({patients}){
  const [hospi,setHospi]=useState([
    {id:1,cage:'A1',patient:'Rex',espece:'Chien',proprio:'Dupont Jean',dateEntree:'2025-02-14',dateSortie:'',motif:'Observation post-chirurgie',statut:'Hospitalisé',soins:[
      {heure:'08:00',type:'Médicament',detail:'Kétoprofène 1ml IV',fait:true},
      {heure:'12:00',type:'Repas',detail:'Ration digestive 200g',fait:true},
      {heure:'16:00',type:'Médicament',detail:'Amoxicilline 500mg PO',fait:false},
      {heure:'18:00',type:'Vitaux',detail:'T° – FC – FR',fait:false},
    ],vitaux:[{heure:'08:00',temp:'38.8',fc:'82',fr:'22',note:'Stable'}]},
    {id:2,cage:'B2',patient:'Simba',espece:'Chien',proprio:'Akouavi Afi',dateEntree:'2025-02-15',dateSortie:'',motif:'Parvo – réhydratation IV',statut:'Hospitalisé',soins:[
      {heure:'08:00',type:'Perfusion',detail:'NaCl 0.9% 250ml IV',fait:true},
      {heure:'14:00',type:'Médicament',detail:'Métronidazole 50mg IV',fait:false},
    ],vitaux:[]},
  ]);
  const today = () => new Date().toISOString().split('T')[0];
  const [showForm,setShowForm]=useState(false);
  const [selHospi,setSelHospi]=useState(null);
  const [newVital,setNewVital]=useState({heure:new Date().toTimeString().slice(0,5),temp:'',fc:'',fr:'',note:''});
  const [form,setForm]=useState({cage:'',patient:'',espece:'Chien',proprio:'',dateEntree:today(),motif:''});
  const f=v=>e=>setForm({...form,[v]:e.target.value});
  const [patSugg,setPatSugg]=useState([]);

  const CAGES=['A1','A2','A3','B1','B2','B3','C1','C2'];
  const occupees=hospi.filter(h=>h.statut==='Hospitalisé').map(h=>h.cage);
  const h=selHospi?hospi.find(x=>x.id===selHospi):null;

  const toggleSoin=(hospiId,soinIdx)=>setHospi(hospi.map(h=>h.id===hospiId?{...h,soins:h.soins.map((s,i)=>i===soinIdx?{...s,fait:!s.fait}:s)}:h));
  const addVital=(hospiId)=>{
    if(!newVital.temp)return;
    setHospi(hospi.map(h=>h.id===hospiId?{...h,vitaux:[...h.vitaux,{...newVital}]}:h));
    setNewVital({heure:new Date().toTimeString().slice(0,5),temp:'',fc:'',fr:'',note:''});
  };
  const sortir=(id)=>{setHospi(hospi.map(h=>h.id===id?{...h,statut:'Sorti',dateSortie:today()}:h));if(selHospi===id)setSelHospi(null);};

  return <div className="app-page space-y-5">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { l: 'Cages totales', v: CAGES.length, mod: 'stat-tile--blue' },
        { l: 'Occupées', v: occupees.length, mod: 'stat-tile--orange' },
        { l: 'Disponibles', v: CAGES.length - occupees.length, mod: 'stat-tile--green' },
        { l: 'Sorties ce mois', v: hospi.filter((h) => h.statut === 'Sorti').length, mod: 'stat-tile--slate' },
      ].map((s, i) => (
        <div key={i} className={`stat-tile ${s.mod}`}>
          <div className="stat-tile__label">{s.l}</div>
          <div className="stat-tile__value">{s.v}</div>
        </div>
      ))}
    </div>

    {/* Plan des cages */}
    <div className="panel-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg flex items-center gap-2">🏥 Plan des cages</h3>
        <Btn onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Annuler':'+ Hospitaliser un patient'}</Btn>
      </div>
      {showForm&&<div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <div><label className="text-xs font-bold text-slate-600 mb-1 block">Cage</label>
            <select className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none" value={form.cage} onChange={f('cage')}>
              <option value="">-- Choisir --</option>{CAGES.filter(c=>!occupees.includes(c)).map(c=><option key={c}>{c}</option>)}
            </select></div>
          <div className="relative"><label className="text-xs font-bold text-slate-600 mb-1 block">Patient</label>
            <AutoSuggest value={form.patient} onChange={e=>{setForm({...form,patient:e.target.value});setPatSugg(patients.filter(p=>p.nom.toLowerCase().includes(e.target.value.toLowerCase())));}} list={patSugg} onSelect={p=>setForm({...form,patient:p.nom,proprio:p.proprio,espece:p.espece})} placeholder="Nom"/>
          </div>
          <Field label="Espèce" value={form.espece} onChange={f('espece')} options={['Chien','Chat','Bovin','Caprin','Ovin']}/>
          <Field label="Propriétaire" value={form.proprio} onChange={f('proprio')} placeholder="Propriétaire"/>
          <Field label="Date entrée" value={form.dateEntree} onChange={f('dateEntree')} type="date"/>
          <Field label="Motif" value={form.motif} onChange={f('motif')} placeholder="Motif d'hospitalisation"/>
        </div>
        <div className="mt-3"><Btn onClick={()=>{if(!form.cage||!form.patient)return alert('Cage et patient requis');setHospi([...hospi,{...form,id:Date.now(),statut:'Hospitalisé',dateSortie:'',soins:[],vitaux:[]}]);setForm({cage:'',patient:'',espece:'Chien',proprio:'',dateEntree:today(),motif:''});setShowForm(false);}}>✓ Hospitaliser</Btn></div>
      </div>}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {CAGES.map(cage=>{
          const occ=hospi.find(h=>h.cage===cage&&h.statut==='Hospitalisé');
          return <div key={cage} onClick={()=>occ&&setSelHospi(selHospi===occ.id?null:occ.id)} className={`rounded-xl p-3 border-2 text-center transition-all ${occ?'border-orange-400 bg-orange-50 cursor-pointer hover:shadow-md '+(selHospi===occ.id?'ring-2 ring-blue-400':''):'border-dashed border-slate-200 bg-slate-50'}`}>
            <div className="text-2xl mb-1">{occ?'🐾':'🟩'}</div>
            <div className="font-bold text-sm">{cage}</div>
            {occ&&<div className="text-xs text-orange-700 font-semibold truncate">{occ.patient}</div>}
            {!occ&&<div className="text-xs text-slate-400">Libre</div>}
          </div>;
        })}
      </div>
    </div>

    {/* Fiche hospitalisation sélectionnée */}
    {h&&<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b bg-orange-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">🐾 {h.patient} <Badge color="orange">Cage {h.cage}</Badge></h3>
          <p className="text-sm text-slate-600 mt-1">{h.espece} · {h.proprio} · Entrée le {h.dateEntree}</p>
          <p className="text-sm text-slate-600">Motif : {h.motif}</p>
        </div>
        <Btn onClick={()=>sortir(h.id)} color="green" sm>✓ Sortie du patient</Btn>
      </div>
      <div className="grid grid-cols-2 divide-x">
        {/* Feuille de soins */}
        <div className="p-5">
          <h4 className="font-bold mb-3 flex items-center gap-2">📋 Feuille de soins du jour</h4>
          <div className="space-y-2">
            {h.soins.map((s,i)=><div key={i} onClick={()=>toggleSoin(h.id,i)} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${s.fait?'border-green-200 bg-green-50':'border-slate-200 hover:border-blue-300'}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${s.fait?'bg-green-500 border-green-500':'border-slate-300'}`}>{s.fait&&<span className="text-white text-xs">✓</span>}</div>
              <div className="flex-1"><div className="flex items-center gap-2"><span className="font-mono text-xs text-slate-400">{s.heure}</span><Badge color={s.type==='Médicament'?'blue':s.type==='Repas'?'green':s.type==='Perfusion'?'cyan':'slate'}>{s.type}</Badge></div>
                <p className={`text-sm mt-0.5 ${s.fait?'line-through text-slate-400':''}`}>{s.detail}</p>
              </div>
            </div>)}
          </div>
          <div className="mt-3 text-sm text-slate-500 text-center">{h.soins.filter(s=>s.fait).length}/{h.soins.length} soins effectués</div>
        </div>
        {/* Paramètres vitaux */}
        <div className="p-5">
          <h4 className="font-bold mb-3 flex items-center gap-2">📊 Paramètres vitaux</h4>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[['Heure','heure','time'],['T° (°C)','temp','text'],['FC (bpm)','fc','text'],['FR (/min)','fr','text']].map(([l,k,t])=>(
              <div key={k}><label className="text-xs font-bold text-slate-500 mb-1 block">{l}</label><input type={t} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:border-blue-400 outline-none" value={newVital[k]} onChange={e=>setNewVital({...newVital,[k]:e.target.value})}/></div>
            ))}
          </div>
          <div className="flex gap-2 mb-4"><input className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:border-blue-400 outline-none" placeholder="Note clinique…" value={newVital.note} onChange={e=>setNewVital({...newVital,note:e.target.value})}/><Btn onClick={()=>addVital(h.id)} sm>+ Ajouter</Btn></div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {h.vitaux.length?h.vitaux.map((v,i)=><div key={i} className="flex gap-3 bg-slate-50 rounded-lg px-3 py-2 text-sm">
              <span className="font-mono text-slate-400">{v.heure}</span>
              <span>T° <strong>{v.temp}°C</strong></span><span>FC <strong>{v.fc}</strong></span><span>FR <strong>{v.fr}</strong></span>
              {v.note&&<span className="text-slate-500 italic">{v.note}</span>}
            </div>):<p className="text-slate-400 text-sm text-center py-4">Aucune mesure enregistrée</p>}
          </div>
        </div>
      </div>
    </div>}
  </div>;
}

// ── AGENDA (codes couleurs) ──────────────────────────────────

export default Hospitalisation
