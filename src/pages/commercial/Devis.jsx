import { useState, useEffect, useRef, useMemo } from 'react'
import { Btn, Field, AutoSuggest, Badge } from '../../components/ui'

const today = () => new Date().toISOString().split('T')[0]
const fmtF = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'

function Devis({clients,meds,otrMode,tva,devis,setDevis}){
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({date:today(),client:'',objet:'',lignes:[{description:'',qte:1,pu:''}],validite:'2026-12-31',notes:''});
  const [cliSugg,setCLiSugg]=useState([]);
  const [printId,setPrintId]=useState(null);

  const updL=(i,updates)=>setForm(prev=>{const nl=[...prev.lignes];nl[i]={...nl[i],...updates};return {...prev,lignes:nl};});
  const total=form.lignes.reduce((s,l)=>s+(parseInt(l.qte)||0)*(parseInt(l.pu)||0),0);
  const tvaAmt=ht=>tva?.active?Math.round(ht*(tva.taux||0)/100):0;

  const STATUS_COLOR={Brouillon:'slate',Envoyé:'blue',Accepté:'green',Refusé:'red',Converti:'purple'};

  const addDevis=()=>{
    if(!form.client||!form.objet)return alert('Client et objet requis');
    const num=`DEV-${String((devis.length||0)+1).padStart(3,'0')}`;
    setDevis([{...form,id:Date.now(),num,total,statut:'Brouillon'},...(devis||[])]);
    setForm({date:today(),client:'',objet:'',lignes:[{description:'',qte:1,pu:''}],validite:'2026-12-31',notes:''});
    setShowForm(false);
  };

  const convertirFacture=(d)=>{
    setDevis((devis||[]).map(x=>x.id===d.id?{...x,statut:'Converti'}:x));
    alert(`Devis ${d.num} marqué comme converti. Créez la facture correspondante dans Factures.`);
  };

  const printDevis=(d)=>{
    const ta=tvaAmt(d.total||0);
    const w=window.open('','_blank','width=700,height=800');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Devis ${d.num}</title>
<style>body{font-family:sans-serif;padding:30px;max-width:640px;margin:0 auto}
table{width:100%;border-collapse:collapse;margin:16px 0}
th{background:#f0fdf4;padding:8px;text-align:left;font-size:12px;color:#166534;border-bottom:2px solid #bbf7d0}
td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:13px}
.total-row{font-weight:900;font-size:16px;color:#166534}
@media print{button{display:none}}</style></head><body>
<div style="display:flex;justify-content:space-between;border-bottom:3px solid #166534;padding-bottom:16px;margin-bottom:20px">
  <div><h1 style="margin:0;color:#14532d">LA BARAKAT</h1><p style="margin:4px 0;color:#666;font-size:12px">Pharmacie & Clinique Vétérinaire</p></div>
  <div style="text-align:right"><div style="font-size:20px;font-weight:900;color:#166534">DEVIS</div><div style="color:#666;font-size:12px">${d.num} · ${d.date}</div></div>
</div>
<div style="margin-bottom:16px"><b>Client :</b> ${d.client}<br><b>Objet :</b> ${d.objet}<br><b>Validité :</b> ${d.validite}</div>
<table><thead><tr><th>Description</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr></thead><tbody>
${(d.lignes||[]).map(l=>`<tr><td>${l.description}</td><td>${l.qte}</td><td>${fmtF(l.pu)}</td><td>${fmtF((parseInt(l.qte)||0)*(parseInt(l.pu)||0))}</td></tr>`).join('')}
</tbody></table>
<div style="display:flex;justify-content:flex-end"><div style="min-width:220px">
  <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Sous-total HT</span><span>${fmtF(d.total)}</span></div>
  ${ta>0?`<div style="display:flex;justify-content:space-between;padding:4px 0"><span>TVA ${tva?.taux||0}%</span><span>+ ${fmtF(ta)}</span></div>`:''}
  <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #166534;font-weight:900;font-size:16px;color:#166534"><span>TOTAL${ta>0?' TTC':''}</span><span>${fmtF(ta>0?(d.total||0)+ta:d.total)}</span></div>
</div></div>
${d.notes?`<p style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;font-size:13px"><b>Notes :</b> ${d.notes}</p>`:''}
<div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
  <div style="text-align:center"><div style="border-bottom:1px solid #334155;height:40px;margin-bottom:4px"></div><div style="font-size:12px;color:#666">Signature client</div></div>
  <div style="text-align:center"><div style="border-bottom:1px solid #334155;height:40px;margin-bottom:4px"></div><div style="font-size:12px;color:#666">Signature & Cachet La Barakat</div></div>
</div>
<br><button onclick="window.print()" style="width:100%;padding:10px;background:#166534;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨️ Imprimer le devis</button>
</body></html>`);
    w.document.close();
  };

  return <div className="app-page space-y-5">
    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between">
        <div><h2 className="text-xl font-bold flex items-center gap-2">📋 Devis & Estimations</h2>
          <p className="text-xs text-slate-400 mt-0.5">{(devis||[]).length} devis · {(devis||[]).filter(d=>d.statut==='Accepté').length} accepté(s)</p></div>
        <Btn onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Annuler':'+ Nouveau devis'}</Btn>
      </div>

      {showForm&&<div className="p-5 bg-green-50 border-b border-green-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Field label="Date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} type="date"/>
          <div><label className="text-xs font-bold text-slate-600 mb-1 block">Client *</label>
            <AutoSuggest value={form.client} onChange={e=>{setForm(p=>({...p,client:e.target.value}));setCLiSugg(clients.filter(c=>c.nom.toLowerCase().includes(e.target.value.toLowerCase())));}}
              list={cliSugg} onSelect={c=>{setForm(p=>({...p,client:c.nom}));setCLiSugg([]);}} placeholder="Nom du client"/>
          </div>
          <Field label="Objet du devis *" value={form.objet} onChange={e=>setForm({...form,objet:e.target.value})} placeholder="Ex: Chirurgie Rex" className="md:col-span-2"/>
          <Field label="Valide jusqu'au" value={form.validite} onChange={e=>setForm({...form,validite:e.target.value})} type="date"/>
        </div>
        {/* Lignes */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <label className="text-xs font-bold text-slate-600 uppercase">Prestations / Produits</label>
            <button onClick={()=>setForm(p=>({...p,lignes:[...p.lignes,{description:'',qte:1,pu:''}]}))} className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg font-bold">+ Ajouter</button>
          </div>
          {form.lignes.map((l,i)=><div key={i} className="grid gap-2 mb-2" style={{gridTemplateColumns:'2fr 0.6fr 1fr 28px'}}>
            <div className="relative">
              <input className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 outline-none" placeholder="Description de la prestation ou produit"
                value={l.description} onChange={e=>{
                  const val=e.target.value;
                  const med=meds.find(m=>m.nom.toLowerCase().includes(val.toLowerCase()));
                  updL(i,{description:val,pu:med?med.prixVente||'':l.pu});
                }}/>
            </div>
            <input type="number" min="1" className="border-2 border-slate-200 rounded-xl px-2 py-2.5 text-sm focus:border-green-400 outline-none text-center" value={l.qte} onChange={e=>updL(i,{qte:e.target.value})} placeholder="1"/>
            <input type="number" className="border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-green-400 outline-none" value={l.pu} onChange={e=>updL(i,{pu:e.target.value})} placeholder="Prix (F)"/>
            {form.lignes.length>1?<button onClick={()=>setForm(p=>({...p,lignes:p.lignes.filter((_,j)=>j!==i)}))} className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg text-xs">✕</button>:<div/>}
          </div>)}
        </div>
        <Field label="Notes / Conditions" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder="Conditions de paiement, remarques…"/>
        <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-green-200 mt-3 mb-3">
          <span className="font-bold">Total HT :</span><span className="font-black text-green-600 font-mono">{fmtF(total)}</span>
        </div>
        <Btn onClick={addDevis}>✓ Créer le devis</Btn>
      </div>}

      <div className="divide-y">
        {!(devis||[]).length&&<div className="text-center py-12 text-slate-400"><div className="text-4xl mb-2">📋</div><p className="font-semibold">Aucun devis pour le moment</p></div>}
        {(devis||[]).map(d=><div key={d.id} className="p-5 hover:bg-slate-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs text-slate-400">{d.num}</span>
                <span className="font-bold">{d.client}</span>
                <Badge color={STATUS_COLOR[d.statut]||'slate'}>{d.statut}</Badge>
                <span className="text-xs text-slate-400">valide jusqu'au {d.validite}</span>
              </div>
              <p className="text-sm text-slate-700 font-medium">{d.objet}</p>
              <p className="text-xs text-slate-400 mt-0.5">{d.date} · {(d.lignes||[]).length} ligne(s)</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xl font-black text-blue-600 font-mono">{otrMode?'••••• F':fmtF(d.total)}</div>
              {tva?.active&&!otrMode&&<div className="text-xs text-slate-400">TTC: {fmtF((d.total||0)+tvaAmt(d.total||0))}</div>}
              <div className="flex gap-1.5 mt-2 justify-end flex-wrap">
                <button onClick={()=>printDevis(d)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold no-print">🖨️ Imprimer</button>
                {d.statut!=='Converti'&&d.statut!=='Refusé'&&<>
                  {d.statut!=='Accepté'&&<button onClick={()=>setDevis((devis||[]).map(x=>x.id===d.id?{...x,statut:'Accepté'}:x))} className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold">✓ Accepté</button>}
                  {d.statut==='Accepté'&&<button onClick={()=>convertirFacture(d)} className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg font-bold">→ Facturer</button>}
                  <button onClick={()=>setDevis((devis||[]).map(x=>x.id===d.id?{...x,statut:'Refusé'}:x))} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1.5 rounded-lg font-bold">✕</button>
                </>}
              </div>
            </div>
          </div>
        </div>)}
      </div>
    </div>
  </div>;
}

// ── SUIVI CRÉANCES ────────────────────────────────────────────

export default Devis
