import { useState, useEffect, useRef, useMemo } from 'react'
import { Btn, Field, DupWarning, Badge } from '../../components/ui'

function Fournisseurs(){
  const SPEC_COLORS={'Médicaments vétérinaires':'green','Vaccins et antiparasitaires':'blue','Matériel et consommables':'purple','Alimentation animale':'yellow','Autre':'slate'};
  const SPEC_THEME={'Médicaments vétérinaires':'four-card--green','Vaccins et antiparasitaires':'four-card--blue','Matériel et consommables':'four-card--purple','Alimentation animale':'four-card--yellow','Autre':'four-card--slate'};
  const [fours,setFours]=useState([
    {id:1,nom:'MediVet SARL',contact:'Kofi Mensah',tel:'+228 22 00 00 00',email:'contact@medivet.tg',adresse:'Zone industrielle, Lomé',specialite:'Médicaments vétérinaires'},
    {id:2,nom:'Afrique Pharma',contact:'Amara Diallo',tel:'+228 90 11 22 33',email:'info@afriquepharma.com',adresse:'Blvd 13 Janvier, Lomé',specialite:'Vaccins et antiparasitaires'},
    {id:3,nom:'AgroVet Togo',contact:'Yves Agbeko',tel:'+228 93 44 55 66',email:'agrovet@togo.net',adresse:'Kara',specialite:'Matériel et consommables'},
  ]);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({nom:'',contact:'',tel:'',email:'',adresse:'',specialite:'Médicaments vétérinaires'});
  const [dups,setDups]=useState([]);const [pending,setPending]=useState(false);
  const doAdd=()=>{setFours([...fours,{...form,id:Date.now()}]);setForm({nom:'',contact:'',tel:'',email:'',adresse:'',specialite:'Médicaments vétérinaires'});setShowForm(false);setDups([]);setPending(false);};
  const handleAdd=()=>{if(!form.nom)return alert('Nom requis');const d=findDups(form.nom,fours);if(d.length){setDups(d);setPending(true);}else doAdd();};
  const ICONS={'Médicaments vétérinaires':'💊','Vaccins et antiparasitaires':'💉','Matériel et consommables':'🔧','Alimentation animale':'🌾','Autre':'📦'};
  return <div className="app-page space-y-5">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="stat-tile stat-tile--green">
        <div className="stat-tile__label">Fournisseurs actifs</div>
        <div className="stat-tile__value">{fours.length}</div>
      </div>
      <div className="stat-tile stat-tile--blue">
        <div className="stat-tile__label">Médicaments &amp; Vaccins</div>
        <div className="stat-tile__value">{fours.filter(f=>f.specialite.includes('édicament')||f.specialite.includes('accin')).length}</div>
      </div>
      <div className="stat-tile stat-tile--purple">
        <div className="stat-tile__label">Matériel &amp; Autres</div>
        <div className="stat-tile__value">{fours.filter(f=>!f.specialite.includes('édicament')&&!f.specialite.includes('accin')).length}</div>
      </div>
    </div>
    <div className="app-card">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div><h2 className="text-xl font-bold flex items-center gap-2">🏭 Fournisseurs</h2><p className="text-xs text-slate-400 mt-0.5">{fours.length} fournisseur(s) enregistré(s)</p></div>
        <Btn onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Annuler':'+ Nouveau fournisseur'}</Btn>
      </div>
      {showForm&&<div className="p-5 bg-green-50 border-b border-green-200">
        <h3 className="font-bold text-green-800 mb-3">Nouveau fournisseur</h3>
        {pending&&<DupWarning dups={dups} entity="fournisseur" onOk={doAdd} onCancel={()=>{setDups([]);setPending(false);}}/>}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Nom *" value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Raison sociale"/>
          <Field label="Contact" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="Nom du responsable"/>
          <Field label="Téléphone" value={form.tel} onChange={e=>setForm({...form,tel:e.target.value})} placeholder="+228 XX XX XX XX"/>
          <Field label="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="contact@fournisseur.com"/>
          <Field label="Adresse / Ville" value={form.adresse} onChange={e=>setForm({...form,adresse:e.target.value})} placeholder="Lomé, Togo"/>
          <Field label="Spécialité" value={form.specialite} onChange={e=>setForm({...form,specialite:e.target.value})} options={Object.keys(SPEC_COLORS)}/>
        </div>
        <div className="mt-3"><Btn onClick={handleAdd}>✓ Enregistrer</Btn></div>
      </div>}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {fours.map(f=>{
          const theme=SPEC_THEME[f.specialite]||'four-card--slate';
          const icon=ICONS[f.specialite]||'📦';
          return <div key={f.id} className={`group relative four-card ${theme} hover:shadow-lg`}>
            <div className="four-card__bar" aria-hidden />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="four-card__icon">{icon}</div>
                  <div>
                    <h3 className="font-bold text-[var(--app-text)] text-base leading-tight">{f.nom}</h3>
                    {f.contact&&<p className="text-sm text-slate-500 mt-0.5">👤 {f.contact}</p>}
                  </div>
                </div>
                <span className="four-card__tag">{f.specialite}</span>
              </div>
              <div className="space-y-1.5 pt-3 border-t border-[var(--app-border)]">
                <div className="flex items-center gap-2 text-sm text-slate-600"><span>📞</span><span>{f.tel||'–'}</span></div>
                {f.email&&<div className="flex items-center gap-2 text-sm text-slate-600"><span>✉️</span><span className="truncate">{f.email}</span></div>}
                <div className="flex items-center gap-2 text-sm text-slate-500"><span>📍</span><span>{f.adresse||'–'}</span></div>
              </div>
            </div>
            <button onClick={()=>{if(confirm('Supprimer ?'))setFours(fours.filter(x=>x.id!==f.id));}} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs px-1.5 py-0.5 rounded hover:bg-red-50 transition-all no-print">🗑</button>
          </div>;
        })}
      </div>
    </div>
  </div>;
}

// ── FACTURES ─────────────────────────────────────────────────

export default Fournisseurs
