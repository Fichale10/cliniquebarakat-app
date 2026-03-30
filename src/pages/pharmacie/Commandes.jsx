import { useState } from 'react'
import { fmtF } from "../../lib/utils";
import {
  Btn,
  Badge,
  Field,
  FilterPeriode,
  DupWarning,
  FilterBar,
  FilterSelect,
  FilterBtns
} from "../../components/ui"

function Commandes({meds}){
  const [cmds,setCmds]=useState([
    {id:1,num:'CMD-2025-001',date:'2025-02-10',fournisseur:'MediVet SARL',lignes:[{produit:'Amoxicilline 500mg',qte:500,pu:150},{produit:'Métronidazole 250mg',qte:300,pu:100}],montant:195000,statut:'Reçu',dateReception:'2025-02-13'},
    {id:2,num:'CMD-2025-002',date:'2025-02-14',fournisseur:'Afrique Pharma',lignes:[{produit:'Ivermectine 1%',qte:50,pu:3500},{produit:'Vaccin Rage',qte:30,pu:2000}],montant:237500,statut:'En transit',dateReception:'–'},
    {id:3,num:'CMD-2025-003',date:'2025-02-15',fournisseur:'AgroVet Togo',lignes:[{produit:'Seringues 5ml',qte:200,pu:150},{produit:'Gants latex',qte:100,pu:100}],montant:45000,statut:'En attente',dateReception:'–'},
  ]);
  const today = () => new Date().toISOString().split('T')[0];
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({date:today(),fournisseur:'MediVet SARL',lignes:[{produit:'',qte:'',pu:''}]});
  const SC={Reçu:'green','En transit':'blue','En attente':'yellow',Annulé:'red'};
  const chg=(id,s)=>setCmds(cmds.map(c=>c.id===id?{...c,statut:s,dateReception:s==='Reçu'?today():c.dateReception}:c));
  const updLigne=(i,updates)=>setForm(prev=>{const nl=[...prev.lignes];nl[i]={...nl[i],...updates};return {...prev,lignes:nl};});
  const montantTotal=form.lignes.reduce((s,l)=>s+(parseInt(l.qte)||0)*(parseInt(l.pu)||0),0);
  const [exp,setExp]=useState(null);
  const [fCmdStatut,setFCmdStatut]=useState('');
  const [fCmdFourn,setFCmdFourn]=useState('');
  const [fCmdPeriode,setFCmdPeriode]=useState('');
  const [searchCmd,setSearchCmd]=useState('');
  const fournisseurs=[...new Set(cmds.map(c=>c.fournisseur))].filter(Boolean);

  const cmdFiltered=cmds.filter(c=>{
    if(fCmdStatut&&c.statut!==fCmdStatut)return false;
    if(fCmdFourn&&c.fournisseur!==fCmdFourn)return false;
    if(fCmdPeriode){const now2=new Date();const d={semaine:new Date(now2.getTime()-now2.getDay()*86400000).toISOString().split('T')[0],mois:new Date(now2.getFullYear(),now2.getMonth(),1).toISOString().split('T')[0],annee:new Date(now2.getFullYear(),0,1).toISOString().split('T')[0],jour:today()}[fCmdPeriode];if(d&&c.date<d)return false;}
    if(searchCmd){const q=searchCmd.toLowerCase();if(!c.fournisseur.toLowerCase().includes(q)&&!(c.articles||'').toLowerCase().includes(q)&&!(c.num||'').toLowerCase().includes(q))return false;}
    return true;
  });

  return <div className="app-page space-y-5">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { l: 'En attente', f: 'En attente', mod: 'stat-tile--yellow' },
        { l: 'En transit', f: 'En transit', mod: 'stat-tile--blue' },
        { l: 'Reçu ce mois', f: 'Reçu', mod: 'stat-tile--green' },
      ].map((s, i) => (
        <div key={i} className={`stat-tile ${s.mod}`}>
          <div className="stat-tile__label">{s.l}</div>
          <div className="stat-tile__value">{cmds.filter((c) => c.statut === s.f).length}</div>
        </div>
      ))}
    </div>
    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between">
        <div><h2 className="text-xl font-bold flex items-center gap-2">📦 Commandes fournisseurs</h2>
          <p className="text-xs text-slate-400 mt-0.5">{cmds.length} commande(s) enregistrée(s)</p></div>
        <Btn onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Annuler':'+ Nouvelle commande'}</Btn>
      </div>

      {showForm&&<div className="p-5 bg-blue-50 border-b border-blue-200">
        <h3 className="font-bold text-blue-800 mb-3">Nouvelle commande fournisseur</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} type="date"/>
          <Field label="Fournisseur" value={form.fournisseur} onChange={e=>setForm({...form,fournisseur:e.target.value})} options={['MediVet SARL','Afrique Pharma','AgroVet Togo','Autre']}/>
        </div>

        {/* Lignes produits */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Produits commandés</label>
            <button onClick={()=>setForm({...form,lignes:[...form.lignes,{produit:'',qte:'',pu:''}]})}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg font-bold transition-all">+ Ajouter un produit</button>
          </div>
          {/* En-têtes */}
          <div className="grid gap-2" style={{gridTemplateColumns:'2fr 1fr 1fr auto'}}>
            <div className="text-xs font-bold text-slate-500 px-1">Produit</div>
            <div className="text-xs font-bold text-slate-500 px-1">Quantité</div>
            <div className="text-xs font-bold text-slate-500 px-1">Prix unitaire (F)</div>
            <div/>
          </div>
          {form.lignes.map((l,i)=><div key={i} className="grid gap-2 mt-1.5 items-center" style={{gridTemplateColumns:'2fr 1fr 1fr auto'}}>
            {/* Dropdown produits depuis base */}
            <div className="relative">
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 outline-none bg-white"
                value={l.produit} onChange={e=>{
                  const med=meds.find(m=>m.nom===e.target.value);
                  updLigne(i,{produit:e.target.value, pu:med?med.prixAchat||'':l.pu});
                }}>
                <option value="">— Choisir un produit —</option>
                {(meds||[]).map(m=><option key={m.id} value={m.nom}>{m.nom} ({m.unite})</option>)}
                <option value="__autre__">Autre produit…</option>
              </select>
            </div>
            {l.produit==='__autre__'
              ? <input className="border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 outline-none col-span-1"
                  placeholder="Nom du produit" value={l.nomLibre||''} onChange={e=>updLigne(i,{nomLibre:e.target.value})}/>
              : null
            }
            <input type="number" className="border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 outline-none"
              placeholder="0" value={l.qte} onChange={e=>updLigne(i,{qte:e.target.value})}/>
            <input type="number" className="border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 outline-none"
              placeholder="0" value={l.pu} onChange={e=>updLigne(i,{pu:e.target.value})}/>
            {form.lignes.length>1&&<button onClick={()=>setForm({...form,lignes:form.lignes.filter((_,j)=>j!==i)})}
              className="text-red-400 hover:text-red-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-all">✕</button>}
          </div>)}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-blue-200 mb-4">
          <span className="font-bold text-slate-700">Total commande :</span>
          <span className="text-xl font-black text-blue-600 font-mono">{fmtF(montantTotal)}</span>
        </div>

        <Btn onClick={()=>{
          if(form.lignes.every(l=>!l.produit))return alert('Ajoutez au moins un produit');
          const articles=form.lignes.filter(l=>l.produit).map(l=>`${l.produit==='__autre__'?l.nomLibre||'?':l.produit} × ${l.qte}`).join(', ');
          const num=`CMD-2025-${String(cmds.length+1).padStart(3,'0')}`;
          setCmds([{...form,id:Date.now(),num,articles,montant:montantTotal,statut:'En attente',dateReception:'–'},...cmds]);
          setForm({date:today(),fournisseur:'MediVet SARL',lignes:[{produit:'',qte:'',pu:''}]});
          setShowForm(false);
        }}>✓ Passer la commande</Btn>
      </div>}

      <FilterBar search={searchCmd} onSearch={setSearchCmd} placeholder="🔍 N° commande, fournisseur, produit…" activeCount={[fCmdStatut,fCmdFourn,fCmdPeriode,searchCmd].filter(Boolean).length} onReset={()=>{setSearchCmd('');setFCmdStatut('');setFCmdFourn('');setFCmdPeriode('');}}>
        <FilterBtns options={[{v:'En attente',l:'🟡 En attente'},{v:'En transit',l:'🔵 Transit'},{v:'Reçu',l:'🟢 Reçu'},{v:'Annulé',l:'🔴 Annulé'}]} value={fCmdStatut} onChange={setFCmdStatut} colorFn={v=>({'En attente':'yellow','En transit':'blue',Reçu:'green',Annulé:'red'}[v]||'slate')}/>
        <FilterSelect label="🏭 Fournisseur" value={fCmdFourn} onChange={setFCmdFourn} options={fournisseurs.map(f=>({v:f,l:f}))}/>
        <FilterPeriode value={fCmdPeriode} onChange={setFCmdPeriode}/>
        <span className="text-xs text-slate-400">{cmdFiltered.length}/{cmds.length}</span>
      </FilterBar>
      <div className="divide-y">{cmdFiltered.map(c=><div key={c.id}>
        <div className="p-5 hover:bg-slate-50 cursor-pointer" onClick={()=>setExp(exp===c.id?null:c.id)}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-slate-400">{c.num}</span>
                <Badge color={SC[c.statut]}>{c.statut}</Badge>
              </div>
              <h3 className="font-bold flex items-center gap-2">🏭 {c.fournisseur}</h3>
              <p className="text-sm text-slate-500 mt-0.5 truncate">{c.articles||c.lignes?.map(l=>`${l.produit} ×${l.qte}`).join(', ')}</p>
              <p className="text-xs text-slate-400 mt-1">📅 {c.date}{c.dateReception&&c.dateReception!=='–'?` · Reçu le ${c.dateReception}`:''}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-black text-blue-600 font-mono mb-2">{fmtF(c.montant)}</div>
              {c.statut!=='Reçu'&&c.statut!=='Annulé'&&<div className="flex gap-1 justify-end">
                {c.statut==='En attente'&&<Btn onClick={e=>{e.stopPropagation();chg(c.id,'En transit');}} color="blue" sm>🚚 Transit</Btn>}
                <Btn onClick={e=>{e.stopPropagation();chg(c.id,'Reçu');}} color="green" sm>✓ Reçu</Btn>
                <Btn onClick={e=>{e.stopPropagation();chg(c.id,'Annulé');}} color="red" sm>✕</Btn>
              </div>}
            </div>
          </div>
        </div>
        {exp===c.id&&<div className="px-5 pb-4 bg-slate-50 border-t">
          <p className="text-xs font-bold text-slate-400 uppercase mb-2 mt-3">Détail des produits commandés</p>
          <div className="space-y-1.5">
            {(c.lignes||[]).map((l,i)=><div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-slate-200">
              <span className="font-medium text-sm">{l.produit==='__autre__'?l.nomLibre:l.produit}</span>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span>Qté : <strong>{l.qte}</strong></span>
                <span>PU : <strong>{fmtF(l.pu)}</strong></span>
                <span className="font-black text-blue-600">{fmtF((parseInt(l.qte)||0)*(parseInt(l.pu)||0))}</span>
              </div>
            </div>)}
          </div>
        </div>}
      </div>)}</div>
    </div>
  </div>;
}



// ── INVENTAIRE ───────────────────────────────────────────────

export default Commandes
