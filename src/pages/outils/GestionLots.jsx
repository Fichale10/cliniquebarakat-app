import { useState, useEffect, useRef, useMemo } from 'react'

function GestionLots({meds, ventesHist, user}){
  const [search,setSearch]=useState('');
  const [filterMed,setFilterMed]=useState('');

  // Construire la liste des lots depuis les médicaments
  const lots=meds.filter(m=>m.lot).map(m=>({
    id:m.id, ref:m.ref, medicament:m.nom, lot:m.lot,
    peremption:m.peremption, stock:m.stock, unite:m.unite,
    fournisseur:m.fournisseur||'—',
    statut: m.peremption
      ? (new Date(m.peremption)<new Date() ? 'Expiré'
        : Math.round((new Date(m.peremption)-new Date())/86400000)<=30 ? 'Expire bientôt'
        : 'Valide')
      : 'Valide',
  }));

  // Historique ventes par lot
  const ventesParLot={};
  (ventesHist||[]).forEach(v=>(v.lignes||[]).forEach(l=>{
    const med=meds.find(m=>m.nom===l.med);
    if(med?.lot){
      if(!ventesParLot[med.lot]) ventesParLot[med.lot]={qte:0,montant:0};
      ventesParLot[med.lot].qte+=(l.qte||0);
      ventesParLot[med.lot].montant+=(l.qte||0)*(l.pu||0);
    }
  }));

  const filtered=lots.filter(l=>{
    const q=search.toLowerCase();
    if(q&&!l.lot?.toLowerCase().includes(q)&&!l.medicament?.toLowerCase().includes(q)) return false;
    if(filterMed&&l.medicament!==filterMed) return false;
    return true;
  });

  const statColor={Valide:'#16a34a',Expiré:'#dc2626','Expire bientôt':'#d97706'};
  const statBg={Valide:'#f0fdf4',Expiré:'#fef2f2','Expire bientôt':'#fffbeb'};

  return <div className="app-page space-y-5">
    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">🔬 Lots & Traçabilité</h2>
          <p className="text-sm text-slate-500">{filtered.length} lot(s) · {lots.filter(l=>l.statut==='Expiré').length} expiré(s)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher lot…"
            style={{border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'7px 12px',fontSize:'13px',outline:'none',width:'180px'}}/>
          <select value={filterMed} onChange={e=>setFilterMed(e.target.value)}
            style={{border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'7px 12px',fontSize:'13px',outline:'none'}}>
            <option value="">Tous les médicaments</option>
            {meds.map(m=><option key={m.id} value={m.nom}>{m.nom}</option>)}
          </select>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4 p-5 border-b">
        {[
          {l:'Lots valides',v:lots.filter(l=>l.statut==='Valide').length,c:'#16a34a',bg:'#f0fdf4'},
          {l:'Expirent bientôt',v:lots.filter(l=>l.statut==='Expire bientôt').length,c:'#d97706',bg:'#fffbeb'},
          {l:'Lots expirés',v:lots.filter(l=>l.statut==='Expiré').length,c:'#dc2626',bg:'#fef2f2'},
        ].map((s,i)=><div key={i} style={{background:s.bg,borderRadius:'12px',padding:'14px',textAlign:'center'}}>
          <div style={{fontSize:'24px',fontWeight:900,color:s.c,fontFamily:"'Space Mono',monospace"}}>{s.v}</div>
          <div style={{fontSize:'12px',color:s.c,fontWeight:600,marginTop:'3px'}}>{s.l}</div>
        </div>)}
      </div>

      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
          <thead><tr style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
            {['N° Lot','Médicament','Réf.','Fournisseur','Péremption','Stock','Vendu','Statut'].map(h=>
              <th key={h} style={{padding:'10px 14px',textAlign:'left',fontWeight:700,color:'#64748b',fontSize:'11px',textTransform:'uppercase',letterSpacing:'.05em',whiteSpace:'nowrap'}}>{h}</th>
            )}
          </tr></thead>
          <tbody>
            {filtered.map(l=>{
              const vente=ventesParLot[l.lot]||{qte:0,montant:0};
              const jExp=l.peremption?Math.round((new Date(l.peremption)-new Date())/86400000):null;
              return <tr key={l.id} className="tbl-row" style={{borderBottom:'1px solid #f1f5f9'}}>
                <td style={{padding:'10px 14px',fontFamily:"'Space Mono',monospace",fontWeight:700,color:'#1e293b'}}>{l.lot}</td>
                <td style={{padding:'10px 14px',fontWeight:600,color:'#1e293b'}}>{l.medicament}</td>
                <td style={{padding:'10px 14px',color:'#64748b',fontSize:'12px'}}>{l.ref}</td>
                <td style={{padding:'10px 14px',color:'#64748b'}}>{l.fournisseur}</td>
                <td style={{padding:'10px 14px'}}>
                  {l.peremption
                    ? <div>
                        <div style={{fontWeight:600,color:jExp<0?'#dc2626':jExp<=30?'#d97706':'#16a34a'}}>{l.peremption}</div>
                        {jExp!==null&&<div style={{fontSize:'11px',color:'#94a3b8'}}>{jExp<0?`Expiré il y a ${-jExp}j`:`Dans ${jExp}j`}</div>}
                      </div>
                    : <span style={{color:'#94a3b8'}}>—</span>}
                </td>
                <td style={{padding:'10px 14px',fontFamily:"'Space Mono',monospace",fontWeight:700,color:l.stock<=0?'#dc2626':'#1e293b'}}>{l.stock} {l.unite}</td>
                <td style={{padding:'10px 14px',color:'#64748b',fontSize:'12px'}}>{vente.qte>0?`${vente.qte} unités`:'—'}</td>
                <td style={{padding:'10px 14px'}}>
                  <span style={{fontSize:'11px',fontWeight:700,padding:'3px 9px',borderRadius:'999px',
                    background:statBg[l.statut],color:statColor[l.statut]}}>
                    {l.statut==='Valide'?'✓':l.statut==='Expiré'?'☠️':'⚠️'} {l.statut}
                  </span>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
        {!filtered.length&&<div style={{textAlign:'center',padding:'40px',color:'#94a3b8'}}>
          <div style={{fontSize:'36px',marginBottom:'8px'}}>🔬</div>
          <p>Aucun lot trouvé</p>
        </div>}
      </div>
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════════
//   CAISSE & REÇUS PDF
// ══════════════════════════════════════════════════════════════

export default GestionLots
