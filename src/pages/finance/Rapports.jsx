import { useState, useEffect, useRef, useMemo } from 'react'

function Rapports({ventesHist,depsHist,otrMode}){
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

  const ca     =ventesP.filter(v=>v.statut==='Payé').reduce((s,v)=>s+(v.total||0),0);
  const credit =ventesP.filter(v=>v.statut!=='Payé'&&v.statut!=='Annulé').reduce((s,v)=>s+(v.total||0),0);
  const totalD =depsP.reduce((s,d)=>s+(d.montant||0),0);
  const benefice=ca-totalD;
  const nbV=ventesP.length;
  const panier=nbV>0?Math.round(ca/nbV):0;

  // Série chronologique
  const caByDate={};   ventesP.filter(v=>v.statut==='Payé').forEach(v=>{caByDate[v.date]=(caByDate[v.date]||0)+(v.total||0);});
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

  // Top produits
  const tp={};
  ventesP.filter(v=>v.statut==='Payé').forEach(v=>(v.lignes||[]).forEach(l=>{
    if(!l.med)return;
    if(!tp[l.med])tp[l.med]={nom:l.med,qte:0,ca:0};
    tp[l.med].qte+=parseInt(l.qte)||0;
    tp[l.med].ca+=(parseInt(l.qte)||0)*(parseInt(l.pu)||0);
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
          <h2 className="text-2xl font-black text-slate-800">📊 Rapports & Analyse</h2>
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
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {[
        {l:'CA Encaissé',v:mask(ca),c:'green',i:'💰',sub:nbV+' vente(s)'},
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

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Top produits */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h3 className="font-bold text-lg mb-4">🏆 Top produits vendus</h3>
        {topList.length===0
          ?<div className="text-center text-slate-400 py-8"><div className="text-3xl mb-2">💊</div><p>Aucune vente sur cette période</p></div>
          :<div className="space-y-3">{topList.map((p,i)=>{
            const pct=Math.round((p.ca/(topList[0].ca||1))*100);
            return <div key={i}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <span className={"w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white "+(i===0?'bg-yellow-500':i===1?'bg-slate-400':'bg-amber-700')}>{i+1}</span>
                  <span className="font-semibold text-sm truncate" style={{maxWidth:'140px'}}>{p.nom}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-slate-400">{p.qte} u.</span>
                  <span className={"font-black text-green-600 font-mono ml-2"}>{mask(p.ca)}</span>
                </div>
              </div>
              <div className="bg-slate-100 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{width:pct+'%'}}/></div>
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
      <div className="grid grid-cols-3 gap-4">
        {[
          {l:'Recettes encaissées',v:ca,c:'green'},
          {l:'Total dépenses',v:totalD,c:'red'},
          {l:benefice>=0?'Bénéfice net':'Déficit',v:Math.abs(benefice),c:benefice>=0?'blue':'red'},
        ].map((r,i)=>(
          <div key={i} className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">{r.l}</p>
            <p className={"text-xl font-black font-mono text-"+r.c+"-600"}>{mask(r.v)}</p>
            {i===2&&!otrMode&&totalD>0&&<p className={"text-xs font-semibold mt-1 text-"+r.c+"-500"}>Marge : {Math.round((ca/(ca+totalD||1))*100)}%</p>}
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
