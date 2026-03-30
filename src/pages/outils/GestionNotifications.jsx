import { useState, useEffect, useRef, useMemo } from 'react'

function GestionNotifications({meds, user}){
  const [pushEnabled, setPushEnabled]=useState(false);
  const [notifStatus, setNotifStatus]=useState('idle');
  const [schedules, setSchedules]=useState(()=>{
    try{return JSON.parse(localStorage.getItem('lb_notif_schedules')||'[]');}catch{return [];}
  });
  const [form, setForm]=useState({type:'stock', heure:'08:00', actif:true, message:''});

  const today=()=>new Date().toISOString().split('T')[0];

  // Alertes stock critique
  const alertesStock=meds.filter(m=>m.stock<=m.seuil);
  // RDV du jour
  const rdvs=JSON.parse(localStorage.getItem('lb_rdvs')||'[]');
  const rdvsAujourdhui=rdvs.filter(r=>r.date===today());

  const demanderPermission=async()=>{
    if(!('Notification' in window)){
      setNotifStatus('unsupported');
      return;
    }
    setNotifStatus('requesting');
    const perm=await Notification.requestPermission();
    if(perm==='granted'){
      setPushEnabled(true);
      setNotifStatus('granted');
      localStorage.setItem('lb_push','1');
      new Notification('La Barakat 🐄',{
        body:'Notifications activées ! Vous recevrez les alertes stock et RDV.',
        icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🐄</text></svg>'
      });
    } else {
      setNotifStatus('denied');
    }
  };

  const envoyerTest=(titre, corps)=>{
    if(Notification.permission==='granted'){
      new Notification(titre,{
        body:corps,
        icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🐄</text></svg>'
      });
    }
  };

  const saveSchedule=()=>{
    const s=[...schedules,{...form,id:Date.now()}];
    setSchedules(s);
    localStorage.setItem('lb_notif_schedules',JSON.stringify(s));
    setForm({type:'stock',heure:'08:00',actif:true,message:''});
  };

  // Vérifier et envoyer les notifs programmées
  useEffect(()=>{
    const check=()=>{
      if(Notification.permission!=='granted') return;
      const now=new Date();
      const hNow=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
      schedules.filter(s=>s.actif&&s.heure===hNow).forEach(s=>{
        if(s.type==='stock'&&alertesStock.length>0){
          envoyerTest('🚨 Stock critique — La Barakat',`${alertesStock.length} médicament(s) en rupture : ${alertesStock.slice(0,3).map(m=>m.nom).join(', ')}`);
        } else if(s.type==='rdv'&&rdvsAujourdhui.length>0){
          envoyerTest('📅 RDV du jour — La Barakat',`${rdvsAujourdhui.length} rendez-vous aujourd'hui. Premier : ${rdvsAujourdhui[0]?.heure} — ${rdvsAujourdhui[0]?.patient}`);
        } else if(s.type==='custom'&&s.message){
          envoyerTest('🔔 La Barakat',s.message);
        }
      });
    };
    const t=setInterval(check,60000);
    return ()=>clearInterval(t);
  },[schedules,alertesStock,rdvsAujourdhui]);

  useEffect(()=>{
    if(localStorage.getItem('lb_push')==='1'&&Notification.permission==='granted'){
      setPushEnabled(true); setNotifStatus('granted');
    }
  },[]);

  const statusColor={granted:'#16a34a',denied:'#dc2626',requesting:'#d97706',unsupported:'#64748b',idle:'#94a3b8'};
  const statusLabel={granted:'✅ Activées',denied:'❌ Refusées (modifier dans les paramètres du navigateur)',requesting:'⏳ En attente…',unsupported:'⚠️ Non supporté par ce navigateur',idle:'Non activées'};

  return <div className="app-page max-w-3xl space-y-5">
    {/* Statut */}
    <div className="app-card p-5">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-4">🔔 Notifications Push</h2>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px',flexWrap:'wrap',padding:'16px',borderRadius:'12px',background:pushEnabled?'#f0fdf4':'#f8fafc',border:`1px solid ${pushEnabled?'#bbf7d0':'#e2e8f0'}`}}>
        <div>
          <div style={{fontWeight:700,color:statusColor[notifStatus]||'#94a3b8',fontSize:'15px'}}>{statusLabel[notifStatus]||statusLabel.idle}</div>
          <div style={{fontSize:'12px',color:'#64748b',marginTop:'3px'}}>Les notifications apparaissent même lorsque l'application est en arrière-plan</div>
        </div>
        {!pushEnabled&&<button onClick={demanderPermission}
          style={{padding:'10px 20px',borderRadius:'10px',background:'linear-gradient(135deg,#166534,#1d4ed8)',color:'white',border:'none',fontWeight:700,fontSize:'14px',cursor:'pointer',whiteSpace:'nowrap'}}>
          🔔 Activer les notifications
        </button>}
        {pushEnabled&&<button onClick={()=>envoyerTest('🧪 Test La Barakat','Notification de test envoyée avec succès !')}
          style={{padding:'10px 20px',borderRadius:'10px',background:'#166534',color:'white',border:'none',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
          🧪 Envoyer un test
        </button>}
      </div>
    </div>

    {/* Alertes en temps réel */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="app-card p-4">
        <h3 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">🚨 Stocks critiques ({alertesStock.length})</h3>
        {alertesStock.length===0
          ? <p className="text-sm text-slate-400 text-center py-4">✅ Tous les stocks sont OK</p>
          : <div className="space-y-2">
              {alertesStock.map(m=><div key={m.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 10px',borderRadius:'9px',background:'#fef2f2',border:'1px solid #fecaca'}}>
                <span style={{fontSize:'13px',fontWeight:600,color:'#991b1b'}}>{m.nom}</span>
                <span style={{fontSize:'12px',color:'#dc2626',fontFamily:"'Space Mono',monospace",fontWeight:700}}>{m.stock}/{m.seuil}</span>
              </div>)}
              {pushEnabled&&<button onClick={()=>envoyerTest('🚨 Stock critique — La Barakat',`${alertesStock.length} médicament(s) en rupture : ${alertesStock.map(m=>m.nom).join(', ')}`)}
                style={{width:'100%',marginTop:'8px',padding:'8px',borderRadius:'8px',background:'#dc2626',color:'white',border:'none',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                📤 Envoyer alerte maintenant
              </button>}
            </div>}
      </div>
      <div className="app-card p-4">
        <h3 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">📅 RDV aujourd'hui ({rdvsAujourdhui.length})</h3>
        {rdvsAujourdhui.length===0
          ? <p className="text-sm text-slate-400 text-center py-4">📭 Aucun RDV aujourd'hui</p>
          : <div className="space-y-2">
              {rdvsAujourdhui.slice(0,4).map((r,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 10px',borderRadius:'9px',background:'#eff6ff',border:'1px solid #bfdbfe'}}>
                <span style={{fontSize:'13px',fontWeight:600,color:'#1e40af'}}>{r.patient}</span>
                <span style={{fontSize:'12px',color:'#2563eb',fontFamily:"'Space Mono',monospace",fontWeight:700}}>{r.heure}</span>
              </div>)}
              {pushEnabled&&<button onClick={()=>envoyerTest('📅 RDV du jour — La Barakat',`${rdvsAujourdhui.length} RDV aujourd'hui. Premier : ${rdvsAujourdhui[0]?.heure} — ${rdvsAujourdhui[0]?.patient}`)}
                style={{width:'100%',marginTop:'8px',padding:'8px',borderRadius:'8px',background:'#2563eb',color:'white',border:'none',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                📤 Envoyer rappel RDV
              </button>}
            </div>}
      </div>
    </div>

    {/* Programmer des notifications */}
    <div className="app-card p-5">
      <h3 className="font-bold text-base mb-4 flex items-center gap-2">⏰ Notifications programmées</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Type</label>
          <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}
            style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none'}}>
            <option value="stock">🚨 Alerte stock</option>
            <option value="rdv">📅 Rappel RDV</option>
            <option value="custom">✏️ Message custom</option>
          </select>
        </div>
        <div>
          <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Heure</label>
          <input type="time" value={form.heure} onChange={e=>setForm({...form,heure:e.target.value})}
            style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none'}}/>
        </div>
        {form.type==='custom'&&<div className="md:col-span-2">
          <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Message</label>
          <input value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Votre message…"
            style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none'}}/>
        </div>}
        <div style={{display:'flex',alignItems:'flex-end'}}>
          <button onClick={saveSchedule} style={{padding:'8px 16px',borderRadius:'9px',background:'linear-gradient(135deg,#166534,#1d4ed8)',color:'white',border:'none',fontWeight:700,fontSize:'13px',cursor:'pointer',width:'100%'}}>
            + Programmer
          </button>
        </div>
      </div>
      {schedules.length>0&&<div className="space-y-2">
        {schedules.map(s=><div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderRadius:'9px',background:'#f8fafc',border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <span style={{fontSize:'20px'}}>{s.type==='stock'?'🚨':s.type==='rdv'?'📅':'✏️'}</span>
            <div>
              <div style={{fontSize:'13px',fontWeight:600,color:'#1e293b'}}>{s.type==='stock'?'Alerte stock critique':s.type==='rdv'?'Rappel RDV du jour':s.message}</div>
              <div style={{fontSize:'11px',color:'#94a3b8'}}>Chaque jour à {s.heure}</div>
            </div>
          </div>
          <button onClick={()=>{const ns=schedules.filter(x=>x.id!==s.id);setSchedules(ns);localStorage.setItem('lb_notif_schedules',JSON.stringify(ns));}}
            style={{background:'none',border:'none',color:'#dc2626',cursor:'pointer',fontSize:'18px'}}>×</button>
        </div>)}
      </div>}
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════════
//   RAPPORTS PDF & EXPORTS
// ══════════════════════════════════════════════════════════════

export default GestionNotifications
