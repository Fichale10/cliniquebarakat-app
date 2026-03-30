import { useState, useEffect, useRef, useMemo } from 'react'

function SuiviTraitements({patients, meds, user}){
  const today=()=>new Date().toISOString().split('T')[0];
  const [traitements,setTraitements]=useState(()=>{
    try{return JSON.parse(localStorage.getItem('lb_traitements')||'[]');}catch{return [];}
  });
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({patient:'',medicament:'',posologie:'',frequence:'1x/jour',debut:today(),fin:'',notes:'',actif:true});
  const [filter,setFilter]=useState('actifs');
  const f=k=>e=>setForm({...form,[k]:e.target.value});

  const save=(t)=>{localStorage.setItem('lb_traitements',JSON.stringify(t));};

  const addTraitement=()=>{
    if(!form.patient||!form.medicament){alert('Patient et médicament requis.');return;}
    const t=[...traitements,{...form,id:Date.now(),created_at:new Date().toISOString()}];
    setTraitements(t);save(t);
    setForm({patient:'',medicament:'',posologie:'',frequence:'1x/jour',debut:today(),fin:'',notes:'',actif:true});
    setShowForm(false);
  };

  const toggleActif=(id)=>{
    const t=traitements.map(tr=>tr.id===id?{...tr,actif:!tr.actif}:tr);
    setTraitements(t);save(t);
  };
  const supprimer=(id)=>{
    const t=traitements.filter(tr=>tr.id!==id);
    setTraitements(t);save(t);
  };

  const filtered=traitements.filter(t=>{
    if(filter==='actifs') return t.actif;
    if(filter==='termines') return !t.actif;
    return true;
  });

  // Traitements se terminant bientôt
  const bientotFin=traitements.filter(t=>{
    if(!t.actif||!t.fin) return false;
    const j=Math.round((new Date(t.fin)-new Date())/86400000);
    return j>=0&&j<=3;
  });

  const envoyerRappelWA=(t)=>{
    const p=patients.find(pa=>pa.nom===t.patient);
    const msg=encodeURIComponent(`Bonjour ${p?.proprio||''},\n\nRappel traitement pour ${t.patient} :\n💊 ${t.medicament}\n📋 Posologie : ${t.posologie}\n🔁 Fréquence : ${t.frequence}\n${t.fin?`📅 Fin du traitement : ${t.fin}`:''}.\n\nMerci de votre confiance — La Barakat 🐄`);
    window.open('https://wa.me/?text='+msg,'_blank');
  };

  const FREQ=['1x/jour','2x/jour','3x/jour','1x/semaine','Tous les 2 jours','Au besoin','Autre'];

  return <div className="app-page space-y-5">
    {/* Alertes fin de traitement */}
    {bientotFin.length>0&&<div style={{background:'#fffbeb',border:'2px solid #fde68a',borderRadius:'14px',padding:'14px 18px'}}>
      <div style={{fontWeight:800,color:'#d97706',marginBottom:'8px',display:'flex',alignItems:'center',gap:'6px'}}>⏰ {bientotFin.length} traitement(s) se terminent dans moins de 3 jours</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
        {bientotFin.map(t=>{
          const j=Math.round((new Date(t.fin)-new Date())/86400000);
          return <div key={t.id} style={{background:'white',borderRadius:'9px',padding:'8px 12px',border:'1px solid #fde68a',fontSize:'13px'}}>
            <span style={{fontWeight:700}}>{t.patient}</span> · {t.medicament}
            <span style={{color:'#d97706',fontWeight:700,marginLeft:'6px'}}>{j===0?'Aujourd\'hui !':j===1?'Demain':j+'j restants'}</span>
          </div>;
        })}
      </div>
    </div>}

    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">💊 Suivi des traitements</h2>
          <p className="text-sm text-slate-500">{traitements.filter(t=>t.actif).length} actif(s) · {traitements.filter(t=>!t.actif).length} terminé(s)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['actifs','termines','tous'].map(f=><button key={f} onClick={()=>setFilter(f)}
            style={{padding:'7px 14px',borderRadius:'9px',fontSize:'13px',fontWeight:700,cursor:'pointer',
              background:filter===f?'linear-gradient(135deg,#166534,#1d4ed8)':'white',
              color:filter===f?'white':'#64748b',border:`1px solid ${filter===f?'transparent':'#e2e8f0'}`}}>
            {f==='actifs'?'🟢 Actifs':f==='termines'?'⚫ Terminés':'📋 Tous'}
          </button>)}
          <button onClick={()=>setShowForm(!showForm)}
            style={{padding:'7px 14px',borderRadius:'9px',fontSize:'13px',fontWeight:700,cursor:'pointer',background:showForm?'#ef4444':'linear-gradient(135deg,#166534,#1d4ed8)',color:'white',border:'none'}}>
            {showForm?'✕ Annuler':'+ Nouveau traitement'}
          </button>
        </div>
      </div>

      {showForm&&<div style={{padding:'20px',background:'#eff6ff',borderBottom:'1px solid #bfdbfe'}}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Patient *</label>
            <select value={form.patient} onChange={f('patient')}
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}>
              <option value="">— Choisir —</option>
              {patients.map(p=><option key={p.id} value={p.nom}>{p.nom} ({p.espece})</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Médicament *</label>
            <select value={form.medicament} onChange={f('medicament')}
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}>
              <option value="">— Choisir —</option>
              {meds.filter(m=>m.stock>0).map(m=><option key={m.id} value={m.nom}>{m.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Posologie</label>
            <input value={form.posologie} onChange={f('posologie')} placeholder="ex: 1 cp matin et soir"
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}/>
          </div>
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Fréquence</label>
            <select value={form.frequence} onChange={f('frequence')}
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}>
              {FREQ.map(fr=><option key={fr}>{fr}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Date début</label>
            <input type="date" value={form.debut} onChange={f('debut')}
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}/>
          </div>
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Date fin</label>
            <input type="date" value={form.fin} onChange={f('fin')}
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}/>
          </div>
          <div className="md:col-span-3">
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Notes</label>
            <input value={form.notes} onChange={f('notes')} placeholder="Instructions particulières, effets à surveiller…"
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}/>
          </div>
        </div>
        <button onClick={addTraitement}
          style={{padding:'9px 20px',borderRadius:'10px',background:'linear-gradient(135deg,#166534,#1d4ed8)',color:'white',border:'none',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
          ✓ Enregistrer le traitement
        </button>
      </div>}

      <div className="divide-y">
        {!filtered.length&&<div style={{textAlign:'center',padding:'40px',color:'#94a3b8'}}>
          <div style={{fontSize:'36px',marginBottom:'8px'}}>💊</div>
          <p style={{fontWeight:600}}>{filter==='actifs'?'Aucun traitement actif':filter==='termines'?'Aucun traitement terminé':'Aucun traitement enregistré'}</p>
        </div>}
        {filtered.map(t=>{
          const pat=patients.find(p=>p.nom===t.patient);
          const jRestants=t.fin?Math.round((new Date(t.fin)-new Date())/86400000):null;
          const bientot=jRestants!==null&&jRestants>=0&&jRestants<=3;
          return <div key={t.id} style={{padding:'14px 18px',background:bientot?'#fffbeb':'white',transition:'background .2s'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:'12px',flexWrap:'wrap'}}>
              {/* Avatar patient */}
              <div style={{width:'42px',height:'42px',borderRadius:'12px',background:t.actif?'#f0fdf4':'#f1f5f9',border:`1px solid ${t.actif?'#bbf7d0':'#e2e8f0'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',flexShrink:0}}>
                {{'Chien':'🐕','Chat':'🐈','Bovin':'🐄','Caprin':'🐐','Ovin':'🐑','Volaille':'🐓'}[pat?.espece]||'🐾'}
              </div>
              <div style={{flex:1,minWidth:'200px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'4px'}}>
                  <span style={{fontWeight:800,fontSize:'15px',color:'#1e293b'}}>{t.patient}</span>
                  <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'999px',
                    background:t.actif?'#dcfce7':'#f1f5f9',color:t.actif?'#166534':'#64748b'}}>
                    {t.actif?'🟢 Actif':'⚫ Terminé'}
                  </span>
                  {bientot&&<span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'999px',background:'#fef3c7',color:'#d97706'}}>
                    ⏰ {jRestants===0?'Termine aujourd\'hui':jRestants+'j restants'}
                  </span>}
                </div>
                <div style={{fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'3px'}}>💊 {t.medicament}</div>
                <div style={{fontSize:'12px',color:'#64748b',display:'flex',gap:'14px',flexWrap:'wrap'}}>
                  {t.posologie&&<span>📋 {t.posologie}</span>}
                  <span>🔁 {t.frequence}</span>
                  <span>📅 {t.debut}{t.fin?` → ${t.fin}`:''}</span>
                </div>
                {t.notes&&<div style={{fontSize:'12px',color:'#94a3b8',marginTop:'4px',fontStyle:'italic'}}>📌 {t.notes}</div>}
              </div>
              <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                <button onClick={()=>envoyerRappelWA(t)} title="Rappel WhatsApp"
                  style={{padding:'7px 12px',borderRadius:'8px',background:'#22c55e',color:'white',border:'none',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                  💬
                </button>
                <button onClick={()=>toggleActif(t.id)}
                  style={{padding:'7px 12px',borderRadius:'8px',background:t.actif?'#f1f5f9':'#dcfce7',color:t.actif?'#64748b':'#166534',border:`1px solid ${t.actif?'#e2e8f0':'#bbf7d0'}`,fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                  {t.actif?'Terminer':'Réactiver'}
                </button>
                <button onClick={()=>{if(confirm('Supprimer ce traitement ?'))supprimer(t.id);}}
                  style={{padding:'7px 10px',borderRadius:'8px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                  🗑
                </button>
              </div>
            </div>
          </div>;
        })}
      </div>
    </div>
  </div>;
}


// ── RENDER ───────────────────────────────────────────────────

export default SuiviTraitements
