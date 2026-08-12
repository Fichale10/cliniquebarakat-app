import{j as e}from"./index-DGPpRcdE.js";import{r as p}from"./vendor-BvZC-oez.js";import"./supabase-C9oWVvfZ.js";function W({ventesHist:v,depsHist:y,meds:w,patients:D,clinique:F,otrMode:M}){const s=t=>new Intl.NumberFormat("fr-FR").format(Math.round(t))+" F",[r,j]=p.useState(()=>{const t=new Date;return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}`}),[f,S]=p.useState(""),[x,m]=p.useState(!1),[$,u]=p.useState(!1),n=(v||[]).filter(t=>{var i;return(i=t.date)==null?void 0:i.startsWith(r)}),k=(y||[]).filter(t=>{var i;return(i=t.date)==null?void 0:i.startsWith(r)}),l=n.filter(t=>t.statut!=="Annulé").reduce((t,i)=>t+(i.total||0)+(i.tva_amt||0),0),g=k.reduce((t,i)=>t+(i.montant||0),0),a=l-g,d={};n.forEach(t=>(t.lignes||[]).forEach(i=>{d[i.med]||(d[i.med]={nom:i.med,qte:0,ca:0}),d[i.med].qte+=i.qte||0,d[i.med].ca+=(i.qte||0)*(i.pu||0)}));const c=Object.values(d).sort((t,i)=>i.ca-t.ca).slice(0,8),h=new Date(r+"-01").toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),z=()=>{const t=window.open("","_blank","width=900,height=700"),i=new Date().toLocaleDateString("fr-FR");t.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport ${h}</title>
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
        <div style="font-size:16px;font-weight:600;color:#166534;text-transform:capitalize">${h}</div>
        <div class="sub">Généré le ${i}</div>
      </div>
    </div>

    <div class="grid">
      <div class="kpi" style="background:#f0fdf4;border-color:#bbf7d0">
        <div class="kpi-val green">${s(l)}</div>
        <div class="kpi-lbl">💰 Recettes</div>
      </div>
      <div class="kpi" style="background:#fef2f2;border-color:#fecaca">
        <div class="kpi-val red">${s(g)}</div>
        <div class="kpi-lbl">📤 Dépenses</div>
      </div>
      <div class="kpi" style="background:${a>=0?"#eff6ff":"#fef2f2"};border-color:${a>=0?"#bfdbfe":"#fecaca"}">
        <div class="kpi-val ${a>=0?"blue":"red"}">${s(a)}</div>
        <div class="kpi-lbl">📊 Résultat net</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">💊 Top médicaments vendus</div>
      <table><thead><tr><th>#</th><th>Médicament</th><th>Quantité</th><th>Chiffre d'affaires</th></tr></thead>
      <tbody>${c.map((o,b)=>`<tr><td style="font-weight:700;color:#64748b">${b+1}</td><td style="font-weight:600">${o.nom}</td><td>${o.qte} unités</td><td style="font-weight:700;color:#16a34a">${s(o.ca)}</td></tr>`).join("")}
      ${c.length?"":'<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px">Aucune vente ce mois</td></tr>'}</tbody></table>
    </div>

    <div class="section">
      <div class="section-title">🛒 Détail des ventes (${n.length} transactions)</div>
      <table><thead><tr><th>Date</th><th>Client</th><th>Articles</th><th>Mode</th><th>Total</th></tr></thead>
      <tbody>${n.slice(0,20).map(o=>`<tr><td>${o.date}</td><td>${o.client||"Comptoir"}</td><td style="font-size:11px;color:#64748b">${(o.lignes||[]).map(b=>b.med).join(", ")}</td><td>${o.mode||"—"}</td><td style="font-weight:700;color:#16a34a">${s(o.total)}</td></tr>`).join("")}
      ${n.length?"":'<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">Aucune vente ce mois</td></tr>'}</tbody></table>
    </div>

    <div class="section">
      <div class="section-title">⚠️ Stocks à surveiller</div>
      <table><thead><tr><th>Médicament</th><th>Stock actuel</th><th>Seuil</th><th>Statut</th></tr></thead>
      <tbody>${w.filter(o=>o.stock<=o.seuil*1.5).map(o=>`<tr><td style="font-weight:600">${o.nom}</td><td style="font-family:monospace;font-weight:700;color:${o.stock<=o.seuil?"#dc2626":"#d97706"}">${o.stock} ${o.unite}</td><td style="font-family:monospace">${o.seuil}</td><td><span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:${o.stock<=o.seuil?"#fef2f2":"#fffbeb"};color:${o.stock<=o.seuil?"#dc2626":"#d97706"}">${o.stock<=o.seuil?"🚨 Critique":"⚠️ Faible"}</span></td></tr>`).join("")}</tbody></table>
    </div>

    <div class="footer">
      <div>La Barakat — Pharmacie & Clinique Vétérinaire · Lomé, Togo · www.labarakat.fr</div>
      <div style="margin-top:4px">Rapport généré automatiquement · Confidentiel</div>
    </div>
    <script>window.onload=()=>{window.print();};<\/script>
    </body></html>`),t.document.close()},R=async()=>{if(!f){alert("Entrez une adresse email.");return}m(!0),await new Promise(t=>setTimeout(t,1500)),m(!1),u(!0),setTimeout(()=>u(!1),4e3)};return e.jsxs("div",{className:"app-page max-w-4xl space-y-5",children:[e.jsxs("div",{className:"app-card p-5",children:[e.jsxs("div",{className:"flex items-center justify-between flex-wrap gap-3 mb-5",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-bold flex items-center gap-2",children:"📈 Rapports & Exports"}),e.jsx("p",{className:"text-sm text-slate-500",children:"Générez et exportez vos rapports mensuels"})]}),e.jsxs("div",{className:"flex items-center gap-3 flex-wrap",children:[e.jsx("input",{type:"month",value:r,onChange:t=>j(t.target.value),style:{border:"1.5px solid #e2e8f0",borderRadius:"9px",padding:"8px 12px",fontSize:"13px",outline:"none"}}),e.jsx("button",{onClick:z,style:{padding:"10px 20px",borderRadius:"10px",background:"linear-gradient(135deg,#166534,#1d4ed8)",color:"white",border:"none",fontWeight:700,fontSize:"14px",cursor:"pointer",display:"flex",alignItems:"center",gap:"6px"},children:"🖨️ Générer PDF"})]})]}),e.jsx("div",{className:"grid grid-cols-3 gap-4 mb-5",children:[{l:"Recettes",v:s(l),c:"#16a34a",bg:"#f0fdf4",icon:"💰"},{l:"Dépenses",v:s(g),c:"#dc2626",bg:"#fef2f2",icon:"📤"},{l:"Résultat net",v:s(a),c:a>=0?"#2563eb":"#dc2626",bg:a>=0?"#eff6ff":"#fef2f2",icon:"📊"}].map((t,i)=>e.jsxs("div",{style:{background:t.bg,borderRadius:"12px",padding:"16px",textAlign:"center",border:"1px solid #e2e8f0"},children:[e.jsx("div",{style:{fontSize:"22px",marginBottom:"4px"},children:t.icon}),e.jsx("div",{style:{fontSize:"20px",fontWeight:900,color:t.c,fontFamily:"'Space Mono',monospace"},children:t.v}),e.jsx("div",{style:{fontSize:"11px",color:t.c,fontWeight:700,marginTop:"3px",textTransform:"uppercase",letterSpacing:".05em"},children:t.l}),e.jsx("div",{style:{fontSize:"11px",color:"#94a3b8",marginTop:"2px",textTransform:"capitalize"},children:h})]},i))}),c.length>0&&e.jsxs("div",{children:[e.jsx("h3",{style:{fontWeight:700,fontSize:"14px",marginBottom:"12px",color:"#1e293b"},children:"💊 Top médicaments vendus"}),e.jsx("div",{className:"space-y-2",children:c.map((t,i)=>{const o=Math.round(t.ca/l*100)||0;return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"12px"},children:[e.jsxs("span",{style:{width:"20px",fontSize:"12px",fontWeight:700,color:"#94a3b8",flexShrink:0},children:["#",i+1]}),e.jsx("span",{style:{flex:1,fontSize:"13px",fontWeight:600,color:"#1e293b"},children:t.nom}),e.jsx("div",{style:{width:"120px",background:"#f1f5f9",borderRadius:"999px",height:"6px",overflow:"hidden"},children:e.jsx("div",{style:{background:"#166534",height:"100%",borderRadius:"999px",width:`${o}%`}})}),e.jsx("span",{style:{fontSize:"12px",fontWeight:700,color:"#16a34a",fontFamily:"'Space Mono',monospace",minWidth:"80px",textAlign:"right"},children:s(t.ca)})]},t.nom)})})]})]}),e.jsxs("div",{className:"app-card p-5",children:[e.jsx("h3",{className:"font-bold text-base mb-3 flex items-center gap-2",children:"📧 Envoyer par email"}),e.jsx("div",{style:{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:"10px",padding:"10px 14px",marginBottom:"14px",fontSize:"13px",color:"#92400e"},children:"ℹ️ L'envoi par email nécessite une configuration Supabase Edge Function. En attendant, utilisez le bouton PDF ci-dessus."}),$&&e.jsxs("div",{style:{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:"10px",padding:"10px 14px",marginBottom:"14px",fontSize:"13px",color:"#166534",fontWeight:600},children:["✅ Rapport envoyé à ",f," !"]}),e.jsxs("div",{style:{display:"flex",gap:"10px"},children:[e.jsx("input",{value:f,onChange:t=>S(t.target.value),placeholder:"destinataire@email.com",type:"email",style:{flex:1,border:"1.5px solid #e2e8f0",borderRadius:"9px",padding:"9px 12px",fontSize:"13px",outline:"none"}}),e.jsx("button",{onClick:R,disabled:x,style:{padding:"9px 18px",borderRadius:"9px",background:"#1d4ed8",color:"white",border:"none",fontWeight:700,fontSize:"13px",cursor:"pointer",opacity:x?.6:1},children:x?"⏳ Envoi…":"📧 Envoyer"})]})]})]})}export{W as default};
