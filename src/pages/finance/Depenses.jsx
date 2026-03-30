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
import { fmtF } from "../../lib/utils";
function Depenses({otrMode, depsHist, setDepsHist}){
  const CATS=['Achats stock','Salaires','Électricité','Eau','Loyer','WiFi / Internet','Entretien','Transport','Frais vétérinaires','Autres'];
  const [deps,setDeps]=useState([
    {id:1,date:'2025-02-15',categorie:'Électricité',description:'Facture EDO',montant:45000,mode:'Virement'},
    {id:2,date:'2025-02-10',categorie:'Salaires',description:'Salaire assistant',montant:120000,mode:'Mobile Money'},
    {id:3,date:'2025-02-08',categorie:'Achats stock',description:'Commande MediVet',montant:350000,mode:'Virement'},
  ]);
  const [showForm,setShowForm]=useState(false);
  const today = () => new Date().toISOString().split('T')[0];
  const [form,setForm]=useState({date:today(),categorie:'Achats stock',description:'',autresDetail:'',montant:'',mode:'Espèces'});
  const [fDepCat,setFDepCat]=useState('');
  const [fDepMode,setFDepMode]=useState('');
  const [fDepPeriode,setFDepPeriode]=useState('');
  const [searchDep,setSearchDep]=useState('');
  const depsFiltered=deps.filter(d=>{
    if(fDepCat&&d.categorie!==fDepCat)return false;
    if(fDepMode&&d.mode!==fDepMode)return false;
    if(fDepPeriode){const now2=new Date();const deb={semaine:new Date(now2.getTime()-now2.getDay()*86400000).toISOString().split('T')[0],mois:new Date(now2.getFullYear(),now2.getMonth(),1).toISOString().split('T')[0],annee:new Date(now2.getFullYear(),0,1).toISOString().split('T')[0],jour:today()}[fDepPeriode];if(deb&&d.date<deb)return false;}
    if(searchDep&&!d.description.toLowerCase().includes(searchDep.toLowerCase())&&!d.categorie.toLowerCase().includes(searchDep.toLowerCase()))return false;
    return true;
  });
  const total=deps.reduce((s,d)=>s+d.montant,0);
  const totalFiltered=depsFiltered.reduce((s,d)=>s+d.montant,0);
  const mask=v=>otrMode?'••••• F':fmtF(v);
  const addDep=()=>{
    if(!form.montant)return alert('Montant requis');
    const desc=form.categorie==='Autres'&&form.autresDetail?form.autresDetail:form.description;
    if(!desc)return alert('Description requise');
    const newDep={...form,id:Date.now(),description:desc,montant:parseInt(form.montant)};
    setDeps([newDep,...deps]);
    // Historique persistant pour les rapports
    if(setDepsHist){
      const hist=[newDep,...(depsHist||[])].slice(0,500);
      setDepsHist(hist);
      localStorage.setItem('lb_deps_hist',JSON.stringify(hist));
    }
    setForm({date:today(),categorie:'Achats stock',description:'',autresDetail:'',montant:'',mode:'Espèces'});
    setShowForm(false);
  };
  const CAT_ICON={'Achats stock':'📦','Salaires':'👤','Électricité':'⚡','Eau':'💧','Loyer':'🏠','WiFi / Internet':'📡','Entretien':'🔧','Transport':'🚗','Frais vétérinaires':'🐾','Autres':'📌'};

  return <div className="app-page space-y-5">
    <div id="depenses-print">
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="text-sm text-red-600 font-bold mb-1">💸 Total dépenses</div>
          <div className={"text-2xl font-black text-red-700 font-mono"}>{mask(total)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 mb-2">Répartition par catégorie</div>
          {CATS.map(c=>{const m=deps.filter(d=>d.categorie===c).reduce((s,d)=>s+d.montant,0);return m>0?<div key={c} className="flex justify-between text-sm py-0.5"><span className="flex items-center gap-1">{CAT_ICON[c]||'📌'} {c}</span><span className="font-bold font-mono">{mask(m)}</span></div>:null;}).filter(Boolean)}
        </div>
      </div>

      <div className="app-card">
        <div className="p-5 border-b flex items-center justify-between">
          <div><h2 className="text-xl font-bold flex items-center gap-2">💸 Dépenses</h2>
            <p className="text-xs text-slate-400 mt-0.5">{deps.length} dépense(s)</p></div>
          <div className="flex gap-2 no-print">
            <PrintBtn zoneId="depenses-print" label="🖨 Imprimer"/>
            <Btn onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Annuler':'+ Nouvelle dépense'}</Btn>
          </div>
        </div>
        {showForm&&<div className="p-5 bg-red-50 border-b border-red-200">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} type="date"/>
            <Field label="Catégorie" value={form.categorie} onChange={e=>setForm({...form,categorie:e.target.value})} options={CATS}/>
            <Field label="Mode" value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})} options={['Espèces','Mobile Money','Virement','Chèque']}/>
            {form.categorie==='Autres'
              ?<div className="md:col-span-2"><label className="text-xs font-bold text-slate-600 mb-1 block">Préciser *</label>
                <input className="w-full border-2 border-amber-300 rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none bg-amber-50"
                  placeholder="ex: Achat désinfectant, Réparation équipement…" value={form.autresDetail} onChange={e=>setForm({...form,autresDetail:e.target.value})}/></div>
              :<Field label="Description *" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Ex: Facture EDO, Abonnement…" className="md:col-span-2"/>}
            <Field label="Montant (F) *" value={form.montant} onChange={e=>setForm({...form,montant:e.target.value})} type="number" placeholder="0"/>
          </div>
          <div className="mt-3"><Btn onClick={addDep} color="red">✓ Enregistrer</Btn></div>
        </div>}
        <FilterBar search={searchDep} onSearch={setSearchDep} placeholder="🔍 Description, catégorie…" activeCount={[fDepCat,fDepMode,fDepPeriode,searchDep].filter(Boolean).length} onReset={()=>{setSearchDep('');setFDepCat('');setFDepMode('');setFDepPeriode('');}}>
          <FilterSelect label="📂 Catégorie" value={fDepCat} onChange={setFDepCat} options={CATS.map(c=>({v:c,l:c}))}/>
          <FilterSelect label="💳 Mode" value={fDepMode} onChange={setFDepMode} options={['Espèces','Mobile Money','Virement','Chèque'].map(m=>({v:m,l:m}))}/>
          <FilterPeriode value={fDepPeriode} onChange={setFDepPeriode}/>
          <span className="text-xs text-slate-400">{depsFiltered.length}/{deps.length} · {mask(totalFiltered)}</span>
        </FilterBar>
        <div className="overflow-x-auto">
          <table className="w-full"><thead className="bg-slate-50"><tr>{['Date','Catégorie','Description','Mode',otrMode?'Montant (masqué)':'Montant',''].map(h=><th key={h} className="text-left p-3 text-xs font-bold text-slate-600 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>{depsFiltered.map(d=><tr key={d.id} className="border-t hover:bg-slate-50">
              <td className="p-3 text-sm">{d.date}</td>
              <td className="p-3"><span className="flex items-center gap-1.5 text-sm font-semibold">{CAT_ICON[d.categorie]||'📌'} {d.categorie}</span></td>
              <td className="p-3 text-sm">{d.description}</td>
              <td className="p-3 text-sm">{d.mode}</td>
              <td className={"p-3 font-bold font-mono "+(otrMode?'text-slate-300':'text-red-600')}>{mask(d.montant)}</td>
              <td className="p-3 no-print"><button onClick={()=>{if(confirm('Supprimer ?'))setDeps(deps.filter(x=>x.id!==d.id));}} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50">🗑</button></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  </div>;
}

// ── FINANCES ─────────────────────────────────────────────────

export default Depenses
