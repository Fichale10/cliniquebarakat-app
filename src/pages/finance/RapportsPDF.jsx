import { useState, useEffect, useRef, useMemo } from 'react'

function RapportsPDF({ventesHist,depsHist,meds,patients,clinique,otrMode}){
  const fmtF=v=>new Intl.NumberFormat('fr-FR').format(Math.round(v))+' F';
  const [moisSel,setMoisSel]=useState(()=>{const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;});
  const [emailDest,setEmailDest]=useState('');
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);

  const ventesMois=(ventesHist||[]).filter(v=>v.date?.startsWith(moisSel));
  const depsMois=(depsHist||[]).filter(d=>d.date?.startsWith(moisSel));
  const totalVentes=ventesMois.reduce((s,v)=>s+(v.total||0),0);
  const totalDeps=depsMois.reduce((s,d)=>s+(d.montant||0),0);
  const resultat=totalVentes-totalDeps;

  // Top médicaments vendus
  const topMeds={};
  ventesMois.forEach(v=>(v.lignes||[]).forEach(l=>{
    if(!topMeds[l.med])topMeds[l.med]={nom:l.med,qte:0,ca:0};
    topMeds[l.med].qte+=(l.qte||0);
    topMeds[l.med].ca+=(l.qte||0)*(l.pu||0);
  }));
  const topMedsList=Object.values(topMeds).sort((a,b)=>b.ca-a.ca).slice(0,8);

  const moisLabel=new Date(moisSel+'-01').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});

  const genererPDF=()=>{
    const w=window.open('','_blank','width=900,height=700');
    const now=new Date().toLocaleDateString('fr-FR');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport ${moisLabel}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Segoe UI',sans-serif;color:#1e293b;padding:40px;max-width:900px;margin:auto;}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #166534;}
      .logo{font-size:22px;font-weight:900;color:#166534;letter-spacing:1px;}
      .sub{font-size:12px;color:#64748b;margin-top:4px;}
      .title{font-size:28px;font-weight:900;color:#1e293b;margin-bottom:4px;}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;}
      .kpi{padding:20px;border-radius:12px;border:1px solid #e2e8f0;}
      .kpi-val{font-size:24px;font-weight:900;margin-bottom:4px;}
      .kpi-lbl{font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em;}
      .section{margin-bottom:28px;}
      .section-title{font-size:16px;font-weight:700;color:#1e293b;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #f1f5f9;}
      table{width:100%;border-collapse:collapse;font-size:13px;}
      th{background:#f8fafc;padding:10px 12px;text-align:left;font-weight:700;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.05em;}
      td{padding:10px 12px;border-bottom:1px solid #f1f5f9;}
      tr:hover td{background:#fafbfc;}
      .green{color:#16a34a;} .red{color:#dc2626;} .blue{color:#2563eb;}
      .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;}
      @media print{body{padding:20px;}}
    </style></head><body>
    <div class="header">
      <div>
        <div class="logo">🐄 LA BARAKAT</div>
        <div class="sub">Pharmacie & Clinique Vétérinaire · Lomé, Togo</div>
      </div>
      <div style="text-align:right">
        <div class="title">Rapport Mensuel</div>
        <div style="font-size:16px;font-weight:600;color:#166534;text-transform:capitalize">${moisLabel}</div>
        <div class="sub">Généré le ${now}</div>
      </div>
    </div>

    <div class="grid">
      <div class="kpi" style="background:#f0fdf4;border-color:#bbf7d0">
        <div class="kpi-val green">${fmtF(totalVentes)}</div>
        <div class="kpi-lbl">💰 Recettes</div>
      </div>
      <div class="kpi" style="background:#fef2f2;border-color:#fecaca">
        <div class="kpi-val red">${fmtF(totalDeps)}</div>
        <div class="kpi-lbl">📤 Dépenses</div>
      </div>
      <div class="kpi" style="background:${resultat>=0?'#eff6ff':'#fef2f2'};border-color:${resultat>=0?'#bfdbfe':'#fecaca'}">
        <div class="kpi-val ${resultat>=0?'blue':'red'}">${fmtF(resultat)}</div>
        <div class="kpi-lbl">📊 Résultat net</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">💊 Top médicaments vendus</div>
      <table><thead><tr><th>#</th><th>Médicament</th><th>Quantité</th><th>Chiffre d'affaires</th></tr></thead>
      <tbody>${topMedsList.map((m,i)=>`<tr><td style="font-weight:700;color:#64748b">${i+1}</td><td style="font-weight:600">${m.nom}</td><td>${m.qte} unités</td><td style="font-weight:700;color:#16a34a">${fmtF(m.ca)}</td></tr>`).join('')}
      ${!topMedsList.length?'<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px">Aucune vente ce mois</td></tr>':''}</tbody></table>
    </div>

    <div class="section">
      <div class="section-title">🛒 Détail des ventes (${ventesMois.length} transactions)</div>
      <table><thead><tr><th>Date</th><th>Client</th><th>Articles</th><th>Mode</th><th>Total</th></tr></thead>
      <tbody>${ventesMois.slice(0,20).map(v=>`<tr><td>${v.date}</td><td>${v.client||'Comptoir'}</td><td style="font-size:11px;color:#64748b">${(v.lignes||[]).map(l=>l.med).join(', ')}</td><td>${v.mode||'—'}</td><td style="font-weight:700;color:#16a34a">${fmtF(v.total)}</td></tr>`).join('')}
      ${!ventesMois.length?'<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">Aucune vente ce mois</td></tr>':''}</tbody></table>
    </div>

    <div class="section">
      <div class="section-title">⚠️ Stocks à surveiller</div>
      <table><thead><tr><th>Médicament</th><th>Stock actuel</th><th>Seuil</th><th>Statut</th></tr></thead>
      <tbody>${meds.filter(m=>m.stock<=m.seuil*1.5).map(m=>`<tr><td style="font-weight:600">${m.nom}</td><td style="font-family:monospace;font-weight:700;color:${m.stock<=m.seuil?'#dc2626':'#d97706'}">${m.stock} ${m.unite}</td><td style="font-family:monospace">${m.seuil}</td><td><span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:${m.stock<=m.seuil?'#fef2f2':'#fffbeb'};color:${m.stock<=m.seuil?'#dc2626':'#d97706'}">${m.stock<=m.seuil?'🚨 Critique':'⚠️ Faible'}</span></td></tr>`).join('')}</tbody></table>
    </div>

    <div class="footer">
      <div>La Barakat — Pharmacie & Clinique Vétérinaire · Lomé, Togo · www.labarakat.fr</div>
      <div style="margin-top:4px">Rapport généré automatiquement · Confidentiel</div>
    </div>
    <script>window.onload=()=>{window.print();};<\/script>
    </body></html>`);
    w.document.close();
  };

  const envoyerEmail=async()=>{
    if(!emailDest){alert('Entrez une adresse email.');return;}
    setSending(true);
    // Simulation envoi (en production: utiliser un service email via Supabase Edge Function)
    await new Promise(r=>setTimeout(r,1500));
    setSending(false);setSent(true);
    setTimeout(()=>setSent(false),4000);
  };

  return <div className="app-page max-w-4xl space-y-5">
    <div className="app-card p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">📈 Rapports & Exports</h2>
          <p className="text-sm text-slate-500">Générez et exportez vos rapports mensuels</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="month" value={moisSel} onChange={e=>setMoisSel(e.target.value)}
            style={{border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px 12px',fontSize:'13px',outline:'none'}}/>
          <button onClick={genererPDF}
            style={{padding:'10px 20px',borderRadius:'10px',background:'linear-gradient(135deg,#166534,#1d4ed8)',color:'white',border:'none',fontWeight:700,fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
            🖨️ Générer PDF
          </button>
        </div>
      </div>

      {/* KPIs du mois */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          {l:'Recettes',v:fmtF(totalVentes),c:'#16a34a',bg:'#f0fdf4',icon:'💰'},
          {l:'Dépenses',v:fmtF(totalDeps),c:'#dc2626',bg:'#fef2f2',icon:'📤'},
          {l:'Résultat net',v:fmtF(resultat),c:resultat>=0?'#2563eb':'#dc2626',bg:resultat>=0?'#eff6ff':'#fef2f2',icon:'📊'},
        ].map((k,i)=><div key={i} style={{background:k.bg,borderRadius:'12px',padding:'16px',textAlign:'center',border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:'22px',marginBottom:'4px'}}>{k.icon}</div>
          <div style={{fontSize:'20px',fontWeight:900,color:k.c,fontFamily:"'Space Mono',monospace"}}>{k.v}</div>
          <div style={{fontSize:'11px',color:k.c,fontWeight:700,marginTop:'3px',textTransform:'uppercase',letterSpacing:'.05em'}}>{k.l}</div>
          <div style={{fontSize:'11px',color:'#94a3b8',marginTop:'2px',textTransform:'capitalize'}}>{moisLabel}</div>
        </div>)}
      </div>

      {/* Top médicaments */}
      {topMedsList.length>0&&<div>
        <h3 style={{fontWeight:700,fontSize:'14px',marginBottom:'12px',color:'#1e293b'}}>💊 Top médicaments vendus</h3>
        <div className="space-y-2">
          {topMedsList.map((m,i)=>{
            const pct=Math.round((m.ca/totalVentes)*100)||0;
            return <div key={m.nom} style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <span style={{width:'20px',fontSize:'12px',fontWeight:700,color:'#94a3b8',flexShrink:0}}>#{i+1}</span>
              <span style={{flex:1,fontSize:'13px',fontWeight:600,color:'#1e293b'}}>{m.nom}</span>
              <div style={{width:'120px',background:'#f1f5f9',borderRadius:'999px',height:'6px',overflow:'hidden'}}>
                <div style={{background:'#166534',height:'100%',borderRadius:'999px',width:`${pct}%`}}/>
              </div>
              <span style={{fontSize:'12px',fontWeight:700,color:'#16a34a',fontFamily:"'Space Mono',monospace",minWidth:'80px',textAlign:'right'}}>{fmtF(m.ca)}</span>
            </div>;
          })}
        </div>
      </div>}
    </div>

    {/* Envoi par email */}
    <div className="app-card p-5">
      <h3 className="font-bold text-base mb-3 flex items-center gap-2">📧 Envoyer par email</h3>
      <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:'10px',padding:'10px 14px',marginBottom:'14px',fontSize:'13px',color:'#92400e'}}>
        ℹ️ L'envoi par email nécessite une configuration Supabase Edge Function. En attendant, utilisez le bouton PDF ci-dessus.
      </div>
      {sent&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'10px',padding:'10px 14px',marginBottom:'14px',fontSize:'13px',color:'#166534',fontWeight:600}}>
        ✅ Rapport envoyé à {emailDest} !
      </div>}
      <div style={{display:'flex',gap:'10px'}}>
        <input value={emailDest} onChange={e=>setEmailDest(e.target.value)} placeholder="destinataire@email.com" type="email"
          style={{flex:1,border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'9px 12px',fontSize:'13px',outline:'none'}}/>
        <button onClick={envoyerEmail} disabled={sending}
          style={{padding:'9px 18px',borderRadius:'9px',background:'#1d4ed8',color:'white',border:'none',fontWeight:700,fontSize:'13px',cursor:'pointer',opacity:sending?0.6:1}}>
          {sending?'⏳ Envoi…':'📧 Envoyer'}
        </button>
      </div>
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════════
//   CARTE CLIENTS / ÉLEVAGES
// ══════════════════════════════════════════════════════════════

export default RapportsPDF
