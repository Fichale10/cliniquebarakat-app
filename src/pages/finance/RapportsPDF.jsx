import { FileDown, Printer, Coins, TrendingDown, BarChart3, Pill } from 'lucide-react'
import { useState } from 'react'

function RapportsPDF({ventesHist,depsHist,meds,patients,clinique,otrMode}){
  const fmtF=v=>new Intl.NumberFormat('fr-FR').format(Math.round(v))+' F';
  const [moisSel,setMoisSel]=useState(()=>{const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;});
  const [emailDest,setEmailDest]=useState('');
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);

  const ventesMois=(ventesHist||[]).filter(v=>v.date?.startsWith(moisSel)&&v.type!=='cession');
  const depsMois=(depsHist||[]).filter(d=>d.date?.startsWith(moisSel));
  const totalVentes=ventesMois.filter(v=>v.statut!=='Annulé').reduce((s,v)=>s+(v.total||0)+(v.tva_amt||0),0);
  const totalDeps=depsMois.reduce((s,d)=>s+(d.montant||0),0);
  const resultat=totalVentes-totalDeps;

  // Top médicaments vendus (hors ventes annulées, qte × mult pour le gros)
  const topMeds={};
  ventesMois.filter(v=>v.statut!=='Annulé').forEach(v=>(v.lignes||[]).forEach(l=>{
    if(!l.med)return;
    if(!topMeds[l.med])topMeds[l.med]={nom:l.med,qte:0,ca:0};
    const q=(parseFloat(l.qte)||0)*(parseFloat(l.mult)||1);
    topMeds[l.med].qte+=q;
    topMeds[l.med].ca+=(parseFloat(l.qte)||0)*(parseFloat(l.pu)||0);
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
        <div class="sub">Pharmacie & Clinique Vétérinaire · Anié, Togo</div>
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
      <div>La Barakat — Pharmacie & Clinique Vétérinaire · Anié, Togo</div>
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

  // Téléchargement direct .pdf avec logo (jsPDF, même design premium que le certificat)
  const telechargerPDFLogo=async()=>{
    try{
      const { jsPDF }=await import('jspdf');
      const { default: autoTable }=await import('jspdf-autotable');
      const doc=new jsPDF({unit:'mm',format:'a4'});
      const W=210,H=297,M=16;
      const VERT=[20,83,45],ARDOISE=[30,41,59],GRIS=[100,116,139];
      const nomClinique=clinique?.nom||'La Barakat';

      // Bandeau + logo
      doc.setFillColor(240,253,244);doc.rect(0,0,W,44,'F');
      doc.setFillColor(...VERT);doc.rect(0,44,W,1.4,'F');
      const logoData=await new Promise(res=>{const img=new Image();
        img.onload=()=>{try{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);res(c.toDataURL('image/png'))}catch{res(null)}};
        img.onerror=()=>res(null);img.src='/logo.png';});
      if(logoData)doc.addImage(logoData,'PNG',M,10.5,22,22);
      doc.setFont('helvetica','bold');doc.setTextColor(...VERT);doc.setFontSize(16);
      doc.text(nomClinique,M+27,18);
      doc.setFontSize(9.5);doc.setTextColor(22,101,52);
      doc.text(clinique?.sousTitre||'Pharmacie & Clinique Vétérinaire',M+27,24);
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(71,85,105);
      const coords=[[clinique?.adresse,clinique?.ville].filter(Boolean).join(', '),clinique?.tel&&`Tél : ${clinique.tel}`].filter(Boolean).join('  ·  ');
      if(coords)doc.text(coords,M+27,29.5);
      doc.setFont('helvetica','bold');doc.setFontSize(13);doc.setTextColor(...ARDOISE);
      doc.text('RAPPORT MENSUEL',W-M,18,{align:'right'});
      doc.setFontSize(11);doc.setTextColor(...VERT);
      doc.text(moisLabel.charAt(0).toUpperCase()+moisLabel.slice(1),W-M,24.5,{align:'right'});
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...GRIS);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`,W-M,29.5,{align:'right'});

      let y=56;
      // KPI
      const kpis=[['Recettes',fmtF(totalVentes),[22,163,74],[240,253,244]],['Dépenses',fmtF(totalDeps),[220,38,38],[254,242,242]],['Résultat net',fmtF(resultat),resultat>=0?[37,99,235]:[220,38,38],resultat>=0?[239,246,255]:[254,242,242]]];
      const kw=(W-2*M-12)/3;
      kpis.forEach((k,i)=>{const x=M+i*(kw+6);
        doc.setFillColor(...k[3]);doc.setDrawColor(226,232,240);doc.setLineWidth(0.3);
        doc.roundedRect(x,y,kw,22,2,2,'FD');
        doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(...GRIS);
        doc.text(k[0].toUpperCase(),x+kw/2,y+7,{align:'center',charSpace:0.5});
        doc.setFontSize(13);doc.setTextColor(...k[2]);
        doc.text(k[1],x+kw/2,y+16,{align:'center'});
      });
      y+=32;

      const section=(t,yy)=>{doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...VERT);
        doc.text(t.toUpperCase(),M,yy,{charSpace:0.8});
        doc.setDrawColor(226,232,240);doc.setLineWidth(0.3);
        doc.line(M+doc.getTextWidth(t.toUpperCase())+4,yy-1.2,W-M,yy-1.2);return yy+5;};

      // Top produits
      y=section('Top produits vendus',y);
      autoTable(doc,{startY:y,margin:{left:M,right:M},
        head:[['#','Produit','Quantité',"Chiffre d'affaires"]],
        body:topMedsList.length?topMedsList.map((m,i)=>[i+1,m.nom,String(m.qte),fmtF(m.ca)]):[['—','Aucune vente ce mois','—','—']],
        styles:{fontSize:8.6,cellPadding:2.2,textColor:ARDOISE,lineColor:[226,232,240],lineWidth:0.2},
        headStyles:{fillColor:VERT,textColor:[255,255,255],fontStyle:'bold'},
        alternateRowStyles:{fillColor:[248,250,252]}});
      y=doc.lastAutoTable.finalY+9;

      // Ventes du mois (20 premières)
      y=section(`Ventes du mois (${ventesMois.length} transactions)`,y);
      autoTable(doc,{startY:y,margin:{left:M,right:M},
        head:[['Date','Client','Mode','Statut','Total']],
        body:ventesMois.length?ventesMois.slice(0,20).map(v=>[v.date,v.client||'Comptoir',v.mode||'—',v.statut||'—',fmtF(v.total||0)]):[['—','Aucune vente','—','—','—']],
        styles:{fontSize:8.2,cellPadding:2,textColor:ARDOISE,lineColor:[226,232,240],lineWidth:0.2},
        headStyles:{fillColor:VERT,textColor:[255,255,255],fontStyle:'bold'},
        alternateRowStyles:{fillColor:[248,250,252]}});
      y=doc.lastAutoTable.finalY+9;

      // Stocks à surveiller
      const stocksAlerte=meds.filter(m=>m.stock<=(m.seuil||0)*1.5).slice(0,12);
      if(stocksAlerte.length&&y<H-60){
        y=section('Stocks à surveiller',y);
        autoTable(doc,{startY:y,margin:{left:M,right:M},
          head:[['Produit','Stock','Seuil','Statut']],
          body:stocksAlerte.map(m=>[m.nom,`${m.stock} ${m.unite||''}`,String(m.seuil||0),m.stock<=(m.seuil||0)?'CRITIQUE':'Faible']),
          styles:{fontSize:8.2,cellPadding:2,textColor:ARDOISE,lineColor:[226,232,240],lineWidth:0.2},
          headStyles:{fillColor:VERT,textColor:[255,255,255],fontStyle:'bold'},
          alternateRowStyles:{fillColor:[248,250,252]},
          didParseCell:(d)=>{if(d.section==='body'&&d.column.index===3){d.cell.styles.textColor=d.cell.raw==='CRITIQUE'?[220,38,38]:[217,119,6];d.cell.styles.fontStyle='bold';}}});
      }

      // Pied de page sur chaque page
      const pages=doc.getNumberOfPages();
      for(let p=1;p<=pages;p++){doc.setPage(p);
        doc.setDrawColor(226,232,240);doc.setLineWidth(0.3);doc.line(M,H-13,W-M,H-13);
        doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(148,163,184);
        doc.text(`${nomClinique} · Rapport ${moisLabel} · Confidentiel · Page ${p}/${pages}`,W/2,H-8,{align:'center'});}

      doc.save(`Rapport_${nomClinique.replace(/[^a-z0-9]/gi,'_')}_${moisSel}.pdf`);
    }catch(e){alert('Erreur PDF : '+(e?.message||e))}
  };

  return <div className="app-page max-w-4xl space-y-5">
    <div className="app-card p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><FileDown size={20} color="#16a34a" strokeWidth={2.3} /> Rapports & Exports</h2>
          <p className="text-sm text-slate-500">Générez et exportez vos rapports mensuels</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="month" value={moisSel} onChange={e=>setMoisSel(e.target.value)}
            style={{border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px 12px',fontSize:'13px',outline:'none'}}/>
          <button onClick={telechargerPDFLogo}
            style={{padding:'10px 20px',borderRadius:'10px',background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',fontWeight:700,fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
            <FileDown size={15} strokeWidth={2.4} /> Télécharger PDF
          </button>
          <button onClick={genererPDF}
            style={{padding:'10px 20px',borderRadius:'10px',background:'linear-gradient(135deg,#166534,#1d4ed8)',color:'white',border:'none',fontWeight:700,fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
            <Printer size={15} strokeWidth={2.4} /> Imprimer
          </button>
        </div>
      </div>

      {/* KPIs du mois */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          {l:'Recettes',v:fmtF(totalVentes),c:'#16a34a',bg:'#f0fdf4',icon:Coins},
          {l:'Dépenses',v:fmtF(totalDeps),c:'#dc2626',bg:'#fef2f2',icon:TrendingDown},
          {l:'Résultat net',v:fmtF(resultat),c:resultat>=0?'#2563eb':'#dc2626',bg:resultat>=0?'#eff6ff':'#fef2f2',icon:BarChart3},
        ].map((k,i)=><div key={i} style={{background:k.bg,borderRadius:'12px',padding:'16px',textAlign:'center',border:'1px solid #e2e8f0'}}>
          <div style={{marginBottom:'6px',display:'flex',justifyContent:'center'}}><k.icon size={20} color={k.c} strokeWidth={2.2}/></div>
          <div style={{fontSize:'20px',fontWeight:900,color:k.c,fontFamily:"'Space Mono',monospace"}}>{k.v}</div>
          <div style={{fontSize:'11px',color:k.c,fontWeight:700,marginTop:'3px',textTransform:'uppercase',letterSpacing:'.05em'}}>{k.l}</div>
          <div style={{fontSize:'11px',color:'#94a3b8',marginTop:'2px',textTransform:'capitalize'}}>{moisLabel}</div>
        </div>)}
      </div>

      {/* Top médicaments */}
      {topMedsList.length>0&&<div>
        <h3 style={{fontWeight:700,fontSize:'14px',marginBottom:'12px',color:'#1e293b',display:'flex',alignItems:'center',gap:'6px'}}><Pill size={15} color="#166534" strokeWidth={2.3}/> Top médicaments vendus</h3>
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
