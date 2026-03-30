import { useState, useEffect, useRef, useMemo } from 'react'
import { Btn, Badge, Field, DupWarning, FilterBar, FilterSelect, FilterBtns } from '../../components/ui'

function Patients({patients,setPatients,clients}){
  const [search,setSearch]=useState('');
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({nom:'',espece:'Chien',race:'',age:'',sexe:'M',proprio:'',tel:'',poids:'',couleur:'',allergies:'',antecedents:''});
  const [dups,setDups]=useState([]);
  const [pending,setPending]=useState(false);
  const f=v=>e=>setForm({...form,[v]:e.target.value});
  const emoji={Chien:'🐕',Chat:'🐈',Bovin:'🐄',Caprin:'🐐',Ovin:'🐑',Volaille:'🐓'};

  const doAdd=()=>{setPatients([...patients,{...form,id:Date.now()}]);setForm({nom:'',espece:'Chien',race:'',age:'',sexe:'M',proprio:'',tel:'',poids:'',couleur:'',allergies:'',antecedents:''});setShowForm(false);setDups([]);setPending(false);};
  const handleAdd=()=>{if(!form.nom||!form.proprio)return alert('Nom et propriétaire requis');const d=findDups(form.nom,patients);if(d.length){setDups(d);setPending(true);}else doAdd();};

  const [fEspece,setFEspece]=useState('');
  const [fAllergies,setFAllergies]=useState('');
  const especes=[...new Set(patients.map(p=>p.espece))].filter(Boolean);
  const filtered=patients.filter(p=>{
    const q=search.toLowerCase();
    if(q&&!p.nom.toLowerCase().includes(q)&&!p.proprio.toLowerCase().includes(q)&&!p.espece.toLowerCase().includes(q))return false;
    if(fEspece&&p.espece!==fEspece)return false;
    if(fAllergies==='oui'&&!p.allergies)return false;
    if(fAllergies==='non'&&p.allergies)return false;
    return true;
  });
  const activeFilters=[fEspece,fAllergies].filter(Boolean).length;
  const resetFilters=()=>{setSearch('');setFEspece('');setFAllergies('');};
  const clientSugg=form.proprio.length>1?clients.filter(c=>c.nom.toLowerCase().includes(form.proprio.toLowerCase())):[];

  return <div className="app-page space-y-5">
    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between">
        <div><h2 className="text-xl font-bold flex items-center gap-2">🐾 Patients</h2><p className="text-sm text-slate-500">{patients.length} patient(s)</p></div>
        <Btn onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Annuler':'+ Nouveau patient'}</Btn>
      </div>
      {showForm&&<div className="p-5 bg-blue-50 border-b border-blue-200">
        <h3 className="font-bold text-blue-800 mb-3">Nouveau patient</h3>
        {pending&&<DupWarning dups={dups} entity="patient" onOk={doAdd} onCancel={()=>{setDups([]);setPending(false);}}/>}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
          <Field label="Nom *" value={form.nom} onChange={f('nom')} placeholder="Nom de l'animal"/>
          <Field label="Espèce" value={form.espece} onChange={f('espece')} options={['Chien','Chat','Bovin','Caprin','Ovin','Volaille']}/>
          <Field label="Race" value={form.race} onChange={f('race')} placeholder="Race"/>
          <Field label="Âge" value={form.age} onChange={f('age')} placeholder="ex: 3 ans"/>
          <Field label="Sexe" value={form.sexe} onChange={f('sexe')} options={['M – Mâle','F – Femelle']}/>
          <Field label="Poids" value={form.poids} onChange={f('poids')} placeholder="ex: 12 kg"/>
          <Field label="Couleur" value={form.couleur} onChange={f('couleur')} placeholder="Couleur"/>
          <div className="relative"><label className="text-xs font-bold text-slate-600 mb-1 block">Propriétaire *</label>
            <input className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none" placeholder="Nom du propriétaire" value={form.proprio} onChange={f('proprio')}/>
            {clientSugg.length>0&&<div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-lg shadow-lg mt-1">{clientSugg.map((c,i)=><div key={i} onClick={()=>setForm({...form,proprio:c.nom,tel:c.tel})} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between"><span className="font-semibold">{c.nom}</span><span className="text-slate-400">{c.tel}</span></div>)}</div>}
          </div>
          <Field label="Téléphone" value={form.tel} onChange={f('tel')} placeholder="+228 XX XX XX XX"/>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="⚠️ Allergies connues" value={form.allergies} onChange={f('allergies')} placeholder="ex: Pénicilline, Aspirine…"/>
          <Field label="📋 Antécédents médicaux" value={form.antecedents} onChange={f('antecedents')} placeholder="ex: Stérilisation 2024, Fracture…"/>
          <Field label="📷 Photo URL (optionnel)" value={form.photo||''} onChange={f('photo')} placeholder="https://… lien vers une photo" className="md:col-span-2"/>
          <Field label="📷 Photo URL" value={form.photo||''} onChange={f('photo')} placeholder="https://… (optionnel)" className="md:col-span-2"/>
        </div>
        <Btn onClick={handleAdd}>✓ Enregistrer</Btn>
      </div>}
      <FilterBar search={search} onSearch={setSearch} placeholder="🔍 Patient, propriétaire, espèce…" activeCount={activeFilters} onReset={resetFilters}>
        <FilterSelect label="🐾 Espèce" value={fEspece} onChange={setFEspece} options={especes.map(e=>({v:e,l:e}))}/>
        <FilterBtns options={[{v:'oui',l:'🚨 Avec allergies'},{v:'non',l:'✓ Sans allergies'}]} value={fAllergies} onChange={setFAllergies} colorFn={v=>v==='oui'?'red':'green'}/>
        <span className="text-xs text-slate-400">{filtered.length}/{patients.length} patient(s)</span>
      </FilterBar>
      <div className="p-4">
        <div className="space-y-3">
          {filtered.map(p=>{
            const vaccins=p.vaccins||[];
            const prochainVaccin=vaccins.find(v=>v.prochain&&new Date(v.prochain)>=new Date());
            return <div key={p.id} className="app-card p-4 hover:shadow-md transition-all" style={{cursor:'default'}}>
              <div className="flex items-start gap-4">
                {/* Avatar espèce */}
                <div style={{width:'52px',height:'52px',borderRadius:'14px',background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',flexShrink:0}}>
                  {emoji[p.espece]||'🐾'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-lg text-slate-900">{p.nom}</h3>
                    <Badge color="slate">{p.sexe==='M'?'Mâle':'Femelle'}</Badge>
                    {p.allergies&&<Badge color="red">⚠️ Allergie</Badge>}
                    {prochainVaccin&&<Badge color="green">💉 Vaccin J-{Math.round((new Date(prochainVaccin.prochain)-new Date())/86400000)}</Badge>}
                  </div>
                  <p className="text-sm text-slate-600">{p.espece} · {p.race} {p.age?`· ${p.age}`:''} {p.poids?<span className="font-semibold text-slate-700"> · ⚖️ {p.poids}</span>:''}</p>
                  <p className="text-sm text-slate-500">👤 {p.proprio} · 📞 {p.tel}</p>
                  {p.allergies&&<p className="text-xs text-red-500 mt-1 font-semibold">⚠️ Allergie : {p.allergies}</p>}
                  {p.antecedents&&<p className="text-xs text-slate-400 mt-1">📋 {p.antecedents}</p>}
                  {/* Vaccins */}
                  {vaccins.length>0&&<div className="flex flex-wrap gap-1 mt-2">
                    {vaccins.map((v,vi)=><span key={vi} style={{fontSize:'11px',padding:'2px 7px',borderRadius:'999px',background:'#f0fdf4',color:'#166534',border:'1px solid #bbf7d0',fontWeight:600}}>
                      💉 {v.nom} · {v.date}
                    </span>)}
                  </div>}
                </div>
                <button onClick={()=>{if(confirm('Supprimer ?'))setPatients(patients.filter(x=>x.id!==p.id));}} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 shrink-0">🗑</button>
              </div>
            </div>;
          })}
          {!filtered.length&&<p className="text-center text-slate-400 py-8">Aucun patient</p>}
        </div>
      </div>
    </div>
  </div>;
}

// ── CONSULTATIONS (avec SOAP) ────────────────────────────────

export default Patients
