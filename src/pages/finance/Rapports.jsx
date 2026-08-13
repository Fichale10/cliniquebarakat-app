import { useState, useMemo } from 'react'
import { fmtF } from "../../lib/utils"
import { venteMarge, ligneCA, ligneCoutAchat, isCession } from "../../lib/ventes"
import { BarChart3 } from 'lucide-react'

const today = () => new Date().toISOString().split('T')[0]

function Rapports({ventesHist,depsHist,otrMode,meds=[]}){
  const [periode,setPeriode]=useState('jour');
  const mask=v=>otrMode?'••••• F':fmtF(v);

  const now=new Date();
  const isoToday=today();
  const debutMap={
    jour:   isoToday,
    semaine:new Date(now.getTime()-now.getDay()*86400000).toISOString().split('T')[0],
    mois:   new Date(now.getFullYear(),now.getMonth(),1).toISOString().split('T')[0],
    annee:  new Date(now.getFullYear(),0,1).toISOString().split('T')[0],
  };
  const labelMap={jour:"Aujourd'hui",semaine:"Cette semaine",mois:"Ce mois",annee:"Cette année"};
  const debut=debutMap[periode];
  const fin=isoToday;
  const inP=date=>date>=debut&&date<=fin;

  const ventesP=(ventesHist||[]).filter(v=>v.date&&inP(v.date));
  const depsP  =(depsHist||[]).filter(d=>d.date&&inP(d.date));

  // Ventes internes (pharmacie → clinique) exclues du CA consolidé
  const ventesReelles=ventesP.filter(v=>!isCession(v));
  const ttcV=v=>(v.total||0)+(v.tva_amt||0);

  const ca     =ventesReelles.filter(v=>v.statut==='Payé').reduce((s,v)=>s+ttcV(v),0);
  const credit =ventesReelles.filter(v=>v.statut!=='Payé'&&v.statut!=='Annulé').reduce((s,v)=>s+Math.max(0,ttcV(v)-(v.montant_paye||0)),0);
  const totalD =depsP.reduce((s,d)=>s+(d.montant||0),0);
  const benefice=ca-totalD;
  const nbV=ventesReelles.length;
  const panier=nbV>0?Math.round(ca/nbV):0;

  // ── Répartition Pharmacie / Clinique (2 caisses) ──
  const caPharmacie =ventesP.filter(v=>v.statut==='Payé'&&(!v.type||v.type==='detail'||v.type==='gros')).reduce((s,v)=>s+ttcV(v),0);
  const caCessions  =ventesP.filter(v=>v.statut==='Payé'&&isCession(v)).reduce((s,v)=>s+ttcV(v),0);
  const caClinique  =ventesP.filter(v=>v.statut==='Payé'&&v.type==='clinique').reduce((s,v)=>s+ttcV(v),0);

  // ── Marge brute (prix vente − prix d'achat, figé à la vente si dispo) ──
  const ventesPayees = ventesReelles.filter(v=>v.statut==='Payé');
  const margeBrute   = ventesPayees.reduce((s,v)=>s+venteMarge(v,meds),0);
  const margePct     = ca>0?Math.round((margeBrute/ca)*100):0;
  const hasPaFige    = ventesPayees.some(v=>(v.lignes||[]).some(l=>parseFloat(l.pa)>0));

  // ── CA par jour de la semaine (Lun → Dim) ──
  const JOURS=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const caParJourSem = useMemo(()=>{
    const acc=[0,0,0,0,0,0,0], cnt=[0,0,0,0,0,0,0];
    ventesPayees.forEach(v=>{
      if(!v.date)return;
      const idx=(new Date(v.date+'T00:00:00').getDay()+6)%7; // 0=Lun
      acc[idx]+=(v.total||0)+(v.tva_amt||0); cnt[idx]++;
    });
    return JOURS.map((j,i)=>({jour:j,ca:acc[i],nb:cnt[i]}));
  },[ventesHist,periode]);
  const maxJourCA=Math.max(...caParJourSem.map(j=>j.ca),1);
  const meilleurJour=caParJourSem.reduce((b,j)=>j.ca>b.ca?j:b,caParJourSem[0]);

  // Série chronologique
  const caByDate={};   ventesReelles.filter(v=>v.statut==='Payé').forEach(v=>{caByDate[v.date]=(caByDate[v.date]||0)+(v.total||0)+(v.tva_amt||0);});
  const depByDate={};  depsP.forEach(d=>{depByDate[d.date]=(depByDate[d.date]||0)+(d.montant||0);});

  const allDates=[];
  {let d=new Date(debut),fend=new Date(fin);
   while(d<=fend){allDates.push(d.toISOString().split('T')[0]);d=new Date(d.getTime()+86400000);}}

  let serie;
  if(allDates.length>60){
    const bm={};
    allDates.forEach(d=>{const m=d.slice(0,7);if(!bm[m])bm[m]={label:d.slice(0,7),ca:0,deps:0};bm[m].ca+=(caByDate[d]||0);bm[m].deps+=(depByDate[d]||0);});
    serie=Object.values(bm);
  } else if(allDates.length>14){
    const bw={};
    allDates.forEach(d=>{const dt=new Date(d);const ws=new Date(dt.getTime()-dt.getDay()*86400000).toISOString().split('T')[0];if(!bw[ws])bw[ws]={label:ws.slice(5),ca:0,deps:0};bw[ws].ca+=(caByDate[d]||0);bw[ws].deps+=(depByDate[d]||0);});
    serie=Object.values(bw);
  } else {
    serie=allDates.map(d=>({label:d.slice(5),ca:caByDate[d]||0,deps:depByDate[d]||0}));
  }
  const maxV=Math.max(...serie.map(s=>Math.max(s.ca,s.deps)),1);

  // Top produits (CA + marge) — hors ventes internes
  const tp={};
  ventesReelles.filter(v=>v.statut==='Payé').forEach(v=>(v.lignes||[]).forEach(l=>{
    if(!l.med)return;
    if(!tp[l.med])tp[l.med]={nom:l.med,qte:0,ca:0,marge:0};
    tp[l.med].qte+=parseInt(l.qte)||0;
    tp[l.med].ca+=ligneCA(l);
    tp[l.med].marge+=ligneCA(l)-ligneCoutAchat(l,meds);
  }));
  const topList=Object.values(tp).sort((a,b)=>b.ca-a.ca).slice(0,6);

  // Dépenses par catégorie
  const dc={};depsP.forEach(d=>{dc[d.categorie]=(dc[d.categorie]||0)+(d.montant||0);});
  const depsRep=Object.entries(dc).sort((a,b)=>b[1]-a[1]);
  const CAT_ICON={'Achats stock':'📦','Salaires':'👤','Électricité':'⚡','Eau':'💧','Loyer':'🏠','WiFi / Internet':'📡','Entretien':'🔧','Transport':'🚗','Autres':'📌'};

  return <div className="app-page space-y-5">
    {/* Header */}
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><BarChart3 size={22} color="#16a34a" strokeWidth={2.3} /> Rapports & Analyse</h2>
          <p className="text-sm text-slate-400 mt-0.5">Recettes · Dépenses · Bénéfices — {labelMap[periode]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[{k:'jour',l:"Auj."},{k:'semaine',l:'Semaine'},{k:'mois',l:'Mois'},{k:'annee',l:'Année'}].map(p=>(
            <button key={p.k} onClick={()=>setPeriode(p.k)}
              className={"px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all "+(periode===p.k?'text-white border-transparent shadow-md':'border-slate-200 text-slate-500 hover:border-slate-300')}
              style={periode===p.k?{background:'linear-gradient(135deg,#166534,#1d4ed8)'}:{}}>{p.l}</button>
          ))}
        </div>
      </div>
    </div>

    {/* KPIs */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {[
        {l:'CA Encaissé',v:mask(ca),c:'green',i:'💰',sub:nbV+' vente(s)'},
        {l:'Marge brute',v:mask(margeBrute),c:'teal',i:'📈',sub:margePct+'% du CA'+(hasPaFige?'':' (estimée)')},
        {l:'À crédit',v:mask(credit),c:'orange',i:'⏳',sub:'non payé'},
        {l:'Dépenses',v:mask(totalD),c:'red',i:'💸',sub:depsP.length+' op.'},
        {l:benefice>=0?'Bénéfice':'Déficit',v:mask(Math.abs(benefice)),c:benefice>=0?'blue':'red',i:benefice>=0?'📈':'📉',sub:benefice>=0?'Positif ✅':'Attention ⚠️'},
        {l:'Panier moyen',v:mask(panier),c:'purple',i:'🛒',sub:'par vente'},
      ].map((s,i)=>(
        <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-1"><span className="text-xl">{s.i}</span><span className={"text-xs font-bold text-"+s.c+"-500 uppercase tracking-wide"}>{s.l}</span></div>
          <div className={"text-xl font-black text-"+s.c+"-700 font-mono"}>{s.v}</div>
          <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
        </div>
      ))}
    </div>

    {/* Répartition Pharmacie / Clinique */}
    {(caPharmacie>0||caClinique>0||caCessions>0)&&(
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h3 className="font-bold text-lg mb-1">🏪 Répartition Pharmacie / Clinique — {labelMap[periode]}</h3>
        <p className="text-xs text-slate-400 mb-4">Les achats internes de la clinique à la pharmacie sont exclus du CA consolidé (pas de double comptage)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4">
            <div className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-1">💊 CA Pharmacie</div>
            <div className="text-xl font-black text-violet-700 font-mono">{mask(caPharmacie+caCessions)}</div>
            <div className="text-xs text-violet-500 mt-1">dont ventes clients : {mask(caPharmacie)}<br/>dont ventes à la clinique : {mask(caCessions)}</div>
          </div>
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">🩺 CA Clinique</div>
            <div className="text-xl font-black text-blue-700 font-mono">{mask(caClinique)}</div>
            <div className="text-xs text-blue-500 mt-1">actes + produits facturés aux clients<br/>coût d'achats internes : {mask(caCessions)}</div>
          </div>
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
            <div className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">✅ CA Consolidé</div>
            <div className="text-xl font-black text-green-700 font-mono">{mask(ca)}</div>
            <div className="text-xs text-green-500 mt-1">argent réellement entré des clients<br/>(ventes internes neutralisées)</div>
          </div>
        </div>
      </div>
    )}

    {/* Graphique */}
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <h3 className="font-bold text-lg mb-1">📈 CA vs Dépenses — {labelMap[periode]}</h3>
      <p className="text-xs text-slate-400 mb-4">🟢 Recettes encaissées · 🔴 Dépenses</p>
      {serie.every(s=>s.ca===0&&s.deps===0)
        ?<div className="text-center py-12 text-slate-400"><div className="text-4xl mb-2">📭</div><p className="font-semibold">Aucune donnée pour cette période</p><p className="text-sm mt-1">Enregistrez des ventes et dépenses pour voir le graphique</p></div>
        :<div className="flex items-end gap-1 h-52 overflow-x-auto pb-1">
          {serie.map((s,i)=>{
            const hC=Math.max(3,Math.round((s.ca/maxV)*184));
            const hD=Math.max(3,Math.round((s.deps/maxV)*184));
            const ben=s.ca-s.deps;
            return <div key={i} className="flex-shrink-0 flex flex-col items-center" style={{minWidth:'38px'}}>
              {!otrMode&&<div className={"text-center font-bold "+(ben>=0?'text-green-600':'text-red-500')} style={{fontSize:'9px'}}>{ben>=0?'+':''}{Math.round(ben/1000)}k</div>}
              <div className="flex items-end gap-0.5 h-48">
                <div className={'w-4 rounded-t transition-all '+(s.ca>0?'bg-green-500':'bg-green-100')} style={{height:hC+'px'}} title={'CA: '+fmtF(s.ca)}/>
                <div className={'w-4 rounded-t transition-all '+(s.deps>0?'bg-red-400':'bg-red-100')} style={{height:hD+'px'}} title={'Dépenses: '+fmtF(s.deps)}/>
              </div>
              <div className="text-slate-400 text-center" style={{fontSize:'8px',maxWidth:'38px'}}>{s.label}</div>
            </div>;
          })}
        </div>
      }
    </div>

    {/* CA par jour de la semaine */}
    {ca>0 && (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h3 className="font-bold text-lg mb-1">📅 CA par jour de la semaine — {labelMap[periode]}</h3>
        <p className="text-xs text-slate-400 mb-4">Repérez vos jours forts et faibles{!otrMode&&meilleurJour.ca>0?` · meilleur jour : ${meilleurJour.jour} (${fmtF(meilleurJour.ca)})`:''}</p>
        <div className="grid grid-cols-7 gap-2">
          {caParJourSem.map((j,i)=>{
            const pct=Math.round((j.ca/maxJourCA)*100);
            const isBest=j.jour===meilleurJour.jour&&j.ca>0;
            return <div key={i} className="flex flex-col items-center">
              <div className="w-full flex flex-col justify-end" style={{height:90}}>
                <div className={"w-full rounded-t-lg transition-all "+(isBest?'bg-green-600':j.ca>0?'bg-green-400':'bg-slate-100')} style={{height:Math.max(4,pct*0.9)+'px'}} title={fmtF(j.ca)} />
              </div>
              <span className={"text-xs mt-1 "+(isBest?'font-black text-green-700':'font-semibold text-slate-500')}>{j.jour}</span>
              {!otrMode&&<span className="text-slate-400" style={{fontSize:9}}>{j.ca>0?fmtF(j.ca):'—'}</span>}
              <span className="text-slate-300" style={{fontSize:9}}>{j.nb>0?j.nb+' v.':''}</span>
            </div>;
          })}
        </div>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Top produits */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h3 className="font-bold text-lg mb-1">🏆 Top produits vendus</h3>
        <p className="text-xs text-slate-400 mb-4">CA et marge brute par produit{hasPaFige?'':' (marge estimée sur prix d\'achat actuels)'}</p>
        {topList.length===0
          ?<div className="text-center text-slate-400 py-8"><div className="text-3xl mb-2">💊</div><p>Aucune vente sur cette période</p></div>
          :<div className="space-y-3">{topList.map((p,i)=>{
            const pct=Math.round((p.ca/(topList[0].ca||1))*100);
            const mPct=p.ca>0?Math.round((p.marge/p.ca)*100):0;
            return <div key={i}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <span className={"w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white "+(i===0?'bg-yellow-500':i===1?'bg-slate-400':'bg-amber-700')}>{i+1}</span>
                  <span className="font-semibold text-sm truncate" style={{maxWidth:'130px'}}>{p.nom}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-slate-400">{p.qte} u.</span>
                  <span className={"font-black text-green-600 font-mono ml-2"}>{mask(p.ca)}</span>
                </div>
              </div>
              <div className="bg-slate-100 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{width:pct+'%'}}/></div>
              {!otrMode&&<div className="flex justify-end mt-0.5">
                <span className={"text-xs font-bold "+(p.marge>=0?'text-teal-600':'text-red-500')}>marge : {fmtF(p.marge)} ({mPct}%)</span>
              </div>}
            </div>;
          })}</div>
        }
      </div>

      {/* Dépenses par catégorie */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h3 className="font-bold text-lg mb-4">💸 Dépenses par catégorie</h3>
        {depsRep.length===0
          ?<div className="text-center text-slate-400 py-8"><div className="text-3xl mb-2">📭</div><p>Aucune dépense sur cette période</p></div>
          :<div className="space-y-3">{depsRep.map(([cat,mont],i)=>{
            const pct=Math.round((mont/(totalD||1))*100);
            return <div key={i}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm">{CAT_ICON[cat]||'📌'} {cat}</span>
                <div className="text-right"><span className="text-xs text-slate-400">{pct}%</span><span className="font-black text-red-600 font-mono ml-2">{mask(mont)}</span></div>
              </div>
              <div className="bg-slate-100 rounded-full h-2"><div className="bg-red-400 h-2 rounded-full" style={{width:pct+'%'}}/></div>
            </div>;
          })}</div>
        }
      </div>
    </div>

    {/* Bilan */}
    <div className={"rounded-2xl p-5 border-2 "+(benefice>=0?'bg-green-50 border-green-200':'bg-red-50 border-red-200')}>
      <h3 className="font-bold text-xl mb-4">{benefice>=0?'✅':'⚠️'} Bilan — {labelMap[periode]}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {l:'Recettes encaissées',v:ca,c:'green'},
          {l:'Marge brute (produits)',v:margeBrute,c:'teal'},
          {l:'Total dépenses',v:totalD,c:'red'},
          {l:benefice>=0?'Bénéfice net':'Déficit',v:Math.abs(benefice),c:benefice>=0?'blue':'red'},
        ].map((r,i)=>(
          <div key={i} className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">{r.l}</p>
            <p className={"text-xl font-black font-mono text-"+r.c+"-600"}>{mask(r.v)}</p>
            {i===1&&!otrMode&&ca>0&&<p className="text-xs font-semibold mt-1 text-teal-500">{margePct}% du CA</p>}
          </div>
        ))}
      </div>
    </div>
    {otrMode&&<div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 flex items-center gap-3">
      <span className="text-3xl">🙈</span>
      <div><p className="font-bold text-orange-800">Mode OTR activé</p><p className="text-sm text-orange-600">Désactivez dans la barre latérale pour voir les montants.</p></div>
    </div>}
  </div>;
}


// ── DEVIS & ESTIMATIONS ──────────────────────────────────────

export default Rapports
