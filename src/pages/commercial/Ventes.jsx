import { useState, useEffect, useRef, useMemo } from 'react'
import { INIT_MEDS } from '../../lib/data'
import { Btn, Badge, Field, AutoSuggest, FilterBar, FilterSelect, FilterPeriode } from '../../components/ui'

const today = () => new Date().toISOString().split('T')[0]
const fmtF = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'

function Ventes({meds,setMeds,clients,ventesHist,setVentesHist,otrMode,tva}){
  const [ventes,setVentes]=useState([
    {id:1,date:'2025-02-15',client:'Dupont Jean',lignes:[{med:'Amoxicilline 500mg',cond:'Plaquette (10 cp)',qte:2,pu:2200}],total:4400,statut:'Payé',mode:'Espèces'},
    {id:2,date:'2025-02-14',client:'Martin Sophie',lignes:[{med:'Métronidazole 250mg',cond:'Comprimé',qte:10,pu:180},{med:'Kétoprofène injectable',cond:'Flacon',qte:1,pu:2800}],total:4600,statut:'Payé',mode:'Mobile Money'},
    {id:3,date:'2025-02-13',client:'Ferme Kokou',lignes:[{med:'Ivermectine 1%',cond:'Flacon 50ml',qte:3,pu:5000}],total:15000,statut:'À crédit',mode:'–'},
  ]);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({date:today(),client:'',lignes:[{med:'',cond:'',qte:1,pu:''}],mode:'Espèces',statut:'Payé'});
  const [cliSugg,setCliSugg]=useState([]);
  const [fVStatut,setFVStatut]=useState('');
  const [fVMode,setFVMode]=useState('');
  const [fVPeriode,setFVPeriode]=useState('');
  const [searchV,setSearchV]=useState('');

  // ── Mise à jour atomique d'une ligne (évite la closure périmée) ──
  const updL=(i,updates)=>setForm(prev=>{
    const newLignes=[...prev.lignes];
    newLignes[i]={...newLignes[i],...updates};
    return {...prev,lignes:newLignes};
  });

  const total=form.lignes.reduce((s,l)=>s+(parseInt(l.qte)||0)*(parseInt(l.pu)||0),0);
  const totalPaye=ventes.filter(v=>v.statut==='Payé').reduce((s,v)=>s+v.total,0);
  const totalCredit=ventes.filter(v=>['À crédit','Partiellement payé','En attente'].includes(v.statut)).reduce((s,v)=>s+v.total,0);

  const STATUTS=['Payé','À crédit','Partiellement payé','En attente','Annulé'];
  const STATUT_COLOR={Payé:'green','À crédit':'orange','Partiellement payé':'amber','En attente':'yellow',Annulé:'red'};

  const addVente=()=>{
    const lignesOk=form.lignes.filter(l=>l.med&&l.qte&&l.pu);
    if(!form.client||!lignesOk.length)return alert('Client et au moins un produit requis');
    const newVente={...form,id:Date.now(),lignes:lignesOk,total};
    setVentes(v=>[newVente,...v]);
    const hist=[newVente,...(ventesHist||[])].slice(0,500);
    setVentesHist(hist);
    localStorage.setItem('lb_ventes_hist',JSON.stringify(hist));
    if(form.statut==='Payé'){
      setMeds(meds.map(m=>{
        const l=lignesOk.find(x=>x.med===m.nom);
        return l?{...m,stock:Math.max(0,m.stock-parseInt(l.qte))}:m;
      }));
    }
    setForm({date:today(),client:'',lignes:[{med:'',cond:'',qte:1,pu:''}],mode:'Espèces',statut:'Payé'});
    setShowForm(false);
  };

  const tvaAmt=v=>tva?.active?Math.round((v.total||0)*(tva.taux||0)/100):0;
  const totalTTC=v=>(v.total||0)+tvaAmt(v);
  const printRecu=(v)=>{
    const ta=tvaAmt(v);const ttc=totalTTC(v);
    const w=window.open('','_blank','width=400,height=650');
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Recu</title><style>body{font-family:sans-serif;padding:20px;max-width:360px;margin:0 auto;font-size:13px}h1{font-size:16px;margin:0}hr{border:1px dashed #ccc;margin:10px 0}.row{display:flex;justify-content:space-between;margin:3px 0}.total{font-size:18px;font-weight:900;color:#166534}.footer{text-align:center;color:#999;font-size:11px;margin-top:16px}@media print{button{display:none}}</style></head><body>'+
      '<div style="text-align:center"><h1>LA BARAKAT</h1><p style="margin:2px 0;color:#666">Pharmacie & Clinique Veterinaire</p></div><hr>'+
      '<div class="row"><span>Date</span><span>'+v.date+'</span></div>'+
      '<div class="row"><span>Client</span><span><b>'+v.client+'</b></span></div>'+
      '<div class="row"><span>Mode</span><span>'+v.mode+'</span></div>'+
      '<div class="row"><span>Statut</span><span>'+v.statut+'</span></div><hr>'+
      '<b>Produits :</b><br>'+
      (v.lignes||[]).map(l=>'<div class="row"><span>'+l.med+'<br><small>'+(l.cond||'')+' x '+l.qte+'</small></span><span>'+fmtF((parseInt(l.qte)||0)*(parseInt(l.pu)||0))+'</span></div>').join('')+
      '<hr><div class="row"><span>Sous-total HT</span><span>'+fmtF(v.total)+'</span></div>'+
      (ta>0?'<div class="row"><span>TVA '+(tva?.taux||0)+'%</span><span>+ '+fmtF(ta)+'</span></div>':'')+
      '<div class="row total"><span>TOTAL'+(ta>0?' TTC':'')+'</span><span>'+fmtF(ta>0?ttc:v.total)+'</span></div>'+
      '<hr><div class="footer">Merci de votre confiance - La Barakat</div>'+
      '<br><button onclick="window.print()" style="width:100%;padding:10px;background:#166534;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">Imprimer</button>'+
      '</body></html>');
    w.document.close();
  };
  const mask=v=>otrMode?'••••• F':fmtF(v);

  return <div className="app-page space-y-5">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { l: 'Ventes ce mois', v: ventes.length, mod: 'stat-tile--blue' },
        { l: 'Encaissé', v: mask(totalPaye), mod: 'stat-tile--green' },
        { l: 'À recouvrer', v: mask(totalCredit), mod: 'stat-tile--orange' },
        { l: 'Lignes vendues', v: ventes.reduce((s, v) => s + (v.lignes?.length || 0), 0), mod: 'stat-tile--purple' },
      ].map((s, i) => (
        <div key={i} className={`stat-tile ${s.mod}`}>
          <div className="stat-tile__label">{s.l}</div>
          <div className="stat-tile__value text-xl">{s.v}</div>
        </div>
      ))}
    </div>

    <div className="app-card">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div><h2 className="text-xl font-bold flex items-center gap-2">🛒 Ventes au comptoir</h2>
          <p className="text-xs text-slate-400 mt-0.5">{ventes.length} vente(s)</p></div>
        <Btn onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Annuler':'+ Nouvelle vente'}</Btn>
      </div>

      {showForm&&<div className="p-5 bg-green-50 border-b border-green-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Field label="Date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} type="date"/>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block">Client *</label>
            <AutoSuggest value={form.client}
              onChange={e=>{setForm(p=>({...p,client:e.target.value}));setCliSugg(clients.filter(c=>c.nom.toLowerCase().includes(e.target.value.toLowerCase())));}}
              list={cliSugg} onSelect={c=>{setForm(p=>({...p,client:c.nom}));setCliSugg([]);}} placeholder="Nom du client"/>
          </div>
          <Field label="Mode de paiement" value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})} options={['Espèces','Mobile Money','Virement','Chèque','–']}/>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Statut paiement</label>
            <select className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 outline-none bg-white"
              value={form.statut} onChange={e=>setForm({...form,statut:e.target.value})}>
              {STATUTS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            {form.statut!=='Payé'&&<p className="text-xs text-orange-600 mt-1">⚠️ Stock non décrémenté tant que non payé</p>}
          </div>
        </div>

        {/* Lignes produits */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Produits vendus</label>
            <button onClick={()=>setForm(p=>({...p,lignes:[...p.lignes,{med:'',cond:'',qte:1,pu:''}]}))}
              className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg font-bold">+ Ajouter</button>
          </div>
          {/* En-têtes */}
          <div className="grid gap-2 mb-1.5 px-1" style={{gridTemplateColumns:'2fr 1.5fr 0.6fr 1fr 28px'}}>
            {['Médicament','Conditionnement','Qté','Prix unit. (F)',''].map((h,i)=><div key={i} className="text-xs font-bold text-slate-400">{h}</div>)}
          </div>
          {form.lignes.map((l,i)=>{
            const medObj=meds.find(m=>m.nom===l.med);
            // tarifs depuis local (INIT_MEDS) ou Supabase — avec fallback selon l'unité
            const tarifs=medObj?.tarifs||(medObj?[
              ...(medObj.unite==='comprimés'||medObj.unite==='cp'?[
                {conditionnement:'Comprimé',prix:medObj.prixVente||0},
                {conditionnement:'Plaquette (10 cp)',prix:(medObj.prixVente||0)*10},
                {conditionnement:'Boîte (30 cp)',prix:(medObj.prixVente||0)*30},
                {conditionnement:'Boîte (50 cp)',prix:(medObj.prixVente||0)*50},
                {conditionnement:'Boîte (100 cp)',prix:(medObj.prixVente||0)*100},
              ]:[]),
              ...(medObj.unite==='flacons'||medObj.unite==='flacon'?[
                {conditionnement:'Flacon',prix:medObj.prixVente||0},
              ]:[]),
              ...(medObj.unite==='doses'?[
                {conditionnement:'Dose',prix:medObj.prixVente||0},
                {conditionnement:'Pack 5 doses',prix:(medObj.prixVente||0)*5},
              ]:[]),
              {conditionnement:'Unité',prix:medObj.prixVente||0},
            ]:[]);
            const hasTarifs = tarifs.length > 0;
            return <div key={i} className="grid gap-2 mb-2 items-center" style={{gridTemplateColumns:'2fr 1.5fr 0.6fr 1fr 28px'}}>
              {/* Médicament */}
              <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 outline-none bg-white"
                value={l.med}
                onChange={e=>{
                  const nom=e.target.value;
                  const m2=meds.find(m=>m.nom===nom);
                  // Construire tarifs dynamiquement
                  const t2=m2?.tarifs||(m2?[
                    ...(m2.unite==='comprimés'||m2.unite==='cp'?[
                      {conditionnement:'Comprimé',prix:m2.prixVente||0},
                      {conditionnement:'Plaquette (10 cp)',prix:(m2.prixVente||0)*10},
                      {conditionnement:'Boîte (30 cp)',prix:(m2.prixVente||0)*30},
                      {conditionnement:'Boîte (50 cp)',prix:(m2.prixVente||0)*50},
                      {conditionnement:'Boîte (100 cp)',prix:(m2.prixVente||0)*100},
                    ]:[]),
                    ...(m2.unite==='flacons'?[{conditionnement:'Flacon',prix:m2.prixVente||0}]:[]),
                    ...(m2.unite==='doses'?[{conditionnement:'Dose',prix:m2.prixVente||0},{conditionnement:'Pack 5 doses',prix:(m2.prixVente||0)*5}]:[]),
                    {conditionnement:'Unité',prix:m2.prixVente||0},
                  ]:[]);
                  const firstTarif=t2?.[0];
                  updL(i,{med:nom, cond:firstTarif?.conditionnement||'Unité', pu:firstTarif?.prix||m2?.prixVente||''});
                }}>
                <option value="">— Choisir —</option>
                {meds.filter(m=>m.stock>0).map(m=><option key={m.id||m.nom} value={m.nom}>{m.nom} (stk:{m.stock})</option>)}
              </select>
              {/* Conditionnement — toujours actif si médicament choisi */}
              <select
                className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm outline-none bg-white ${!l.med?'border-slate-100 text-slate-300':'border-slate-200 focus:border-green-400'}`}
                value={l.cond}
                disabled={!l.med}
                onChange={e=>{
                  const condNom=e.target.value;
                  const t=tarifs.find(t=>t.conditionnement===condNom);
                  updL(i,{cond:condNom, pu:t?t.prix:l.pu});
                }}>
                <option value="">{l.med?'— Sélectionner —':'(choisir médicament)'}</option>
                {tarifs.map(t=><option key={t.conditionnement} value={t.conditionnement}>{t.conditionnement}{t.prix?' — '+fmtF(t.prix):''}</option>)}
                <option value="__libre__">✏️ Prix libre…</option>
              </select>
              {/* Quantité */}
              <input type="number" min="1"
                className="w-full border-2 border-slate-200 rounded-xl px-2 py-2.5 text-sm focus:border-green-400 outline-none text-center"
                value={l.qte} onChange={e=>updL(i,{qte:e.target.value})}/>
              {/* Prix */}
              <input type="number"
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 outline-none"
                value={l.pu} onChange={e=>updL(i,{pu:e.target.value})} placeholder="0"/>
              {form.lignes.length>1
                ?<button onClick={()=>setForm(p=>({...p,lignes:p.lignes.filter((_,j)=>j!==i)}))}
                  className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg text-xs">✕</button>
                :<div/>}
            </div>;
          })}
        </div>

        <div className="flex items-center justify-between bg-white rounded-xl p-4 border-2 border-green-300 mb-4">
          <span className="font-bold text-slate-700 text-lg">Total :</span>
          <span className="text-2xl font-black text-green-600 font-mono">{fmtF(total)}</span>
        </div>
        <Btn onClick={addVente}>✓ Enregistrer la vente</Btn>
      </div>}

      <FilterBar search={searchV} onSearch={setSearchV} placeholder="🔍 Client, produit…" activeCount={[fVStatut,fVMode,fVPeriode,searchV].filter(Boolean).length} onReset={()=>{setSearchV('');setFVStatut('');setFVMode('');setFVPeriode('');}}>
        <FilterSelect label="📋 Statut" value={fVStatut} onChange={setFVStatut} options={STATUTS.map(s=>({v:s,l:s}))}/>
        <FilterSelect label="💳 Paiement" value={fVMode} onChange={setFVMode} options={['Espèces','Mobile Money','Virement','Chèque'].map(m=>({v:m,l:m}))}/>
        <FilterPeriode value={fVPeriode} onChange={setFVPeriode}/>
      </FilterBar>
      <div className="divide-y divide-slate-100">
        {ventes.filter(v=>{
          if(fVStatut&&v.statut!==fVStatut)return false;
          if(fVMode&&v.mode!==fVMode)return false;
          if(fVPeriode){const now2=new Date();const d={semaine:new Date(now2.getTime()-now2.getDay()*86400000).toISOString().split('T')[0],mois:new Date(now2.getFullYear(),now2.getMonth(),1).toISOString().split('T')[0],annee:new Date(now2.getFullYear(),0,1).toISOString().split('T')[0],jour:today()}[fVPeriode];if(d&&v.date<d)return false;}
          if(searchV){const q=searchV.toLowerCase();if(!v.client.toLowerCase().includes(q)&&!JSON.stringify(v.lignes||[]).toLowerCase().includes(q))return false;}
          return true;
        }).map(v=><div key={v.id} className="p-5 hover:bg-slate-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold">👤 {v.client}</span>
                <Badge color={STATUT_COLOR[v.statut]||'slate'}>{v.statut}</Badge>
                <Badge color="slate">{v.mode}</Badge>
                <span className="text-xs text-slate-400">{v.date}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(v.lignes||[]).map((l,i)=><span key={i} className="text-xs bg-slate-100 rounded-lg px-2.5 py-1">
                  💊 {l.med} · {l.cond} × {l.qte}
                </span>)}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className={`text-xl font-black font-mono ${otrMode?'text-slate-300':'text-green-600'}`}>{mask(v.total)}</div>
              {tva?.active&&!otrMode&&<div className="text-xs text-slate-400 mt-0.5">TTC: {fmtF(totalTTC(v))} (TVA {fmtF(tvaAmt(v))})</div>}
              <div className="flex gap-1 mt-1 justify-end flex-wrap">
                <button onClick={()=>printRecu(v)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1.5 rounded-lg font-bold no-print" title="Imprimer le reçu">🖨️</button>
                {v.statut!=='Payé'&&v.statut!=='Annulé'&&<>
                  <button onClick={()=>setVentes(ventes.map(x=>x.id===v.id?{...x,statut:'Payé'}:x))}
                    className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold">✓ Payé</button>
                  <button onClick={()=>setVentes(ventes.map(x=>x.id===v.id?{...x,statut:'Annulé'}:x))}
                    className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1.5 rounded-lg font-bold">✕</button>
                </>}
              </div>
            </div>
          </div>
        </div>)}
      </div>
    </div>
  </div>;
}

// ── HISTORIQUE PRODUITS ───────────────────────────────────────

export default Ventes
