import { useState, useEffect, useRef, useMemo } from 'react'
function AgendaCalendrier({rdvs}){
  const [moisOffset,setMoisOffset]=useState(0);
  const now=new Date();
  const moisRef=new Date(now.getFullYear(),now.getMonth()+moisOffset,1);
  const moisNom=moisRef.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  const premierJour=moisRef.getDay()||7;
  const nbJours=new Date(moisRef.getFullYear(),moisRef.getMonth()+1,0).getDate();
  const jours=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const COLORS={'Consultation':'#3b82f6','Vaccination':'#22c55e','Chirurgie':'#a855f7','Urgence':'#ef4444','Contrôle post-op':'#f97316','Autre':'#64748b'};

  const rdvParJour={};
  rdvs.forEach(r=>{
    const d=r.date;
    if(!rdvParJour[d])rdvParJour[d]=[];
    rdvParJour[d].push(r);
  });

  const cells=[];
  for(let i=1;i<premierJour;i++) cells.push(null);
  for(let d=1;d<=nbJours;d++) cells.push(d);

  const todayStr=new Date().toISOString().split('T')[0];

  return <div style={{background:'white',borderRadius:'14px',border:'1px solid #e2e8f0',overflow:'hidden'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'1px solid #e2e8f0'}}>
      <button onClick={()=>setMoisOffset(m=>m-1)} style={{background:'#f1f5f9',border:'none',borderRadius:'8px',padding:'6px 12px',cursor:'pointer',fontSize:'16px'}}>‹</button>
      <span style={{fontWeight:700,fontSize:'15px',color:'#1e293b',textTransform:'capitalize'}}>{moisNom}</span>
      <button onClick={()=>setMoisOffset(m=>m+1)} style={{background:'#f1f5f9',border:'none',borderRadius:'8px',padding:'6px 12px',cursor:'pointer',fontSize:'16px'}}>›</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'1px',background:'#f1f5f9'}}>
      {jours.map(j=><div key={j} style={{background:'#f8fafc',padding:'8px 4px',textAlign:'center',fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase'}}>{j}</div>)}
      {cells.map((d,i)=>{
        if(!d) return <div key={`e${i}`} style={{background:'white',minHeight:'72px'}}/>;
        const dateStr=`${moisRef.getFullYear()}-${String(moisRef.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const rdvsJour=rdvParJour[dateStr]||[];
        const isToday=dateStr===todayStr;
        return <div key={d} style={{background:'white',minHeight:'72px',padding:'4px',position:'relative',borderTop:isToday?'2px solid #166534':'2px solid transparent'}}>
          <div style={{fontSize:'12px',fontWeight:isToday?900:500,color:isToday?'#166534':'#1e293b',width:'22px',height:'22px',borderRadius:'50%',background:isToday?'#dcfce7':'transparent',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'2px'}}>{d}</div>
          {rdvsJour.slice(0,3).map((r,ri)=><div key={ri} style={{fontSize:'10px',fontWeight:600,padding:'1px 4px',borderRadius:'3px',marginBottom:'1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',background:(COLORS[r.type]||'#64748b')+'20',color:COLORS[r.type]||'#64748b'}}>{r.heure} {r.patient}</div>)}
          {rdvsJour.length>3&&<div style={{fontSize:'9px',color:'#94a3b8',fontWeight:600}}>+{rdvsJour.length-3}</div>}
        </div>;
      })}
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════════
//   ASSISTANT IA
// ══════════════════════════════════════════════════════════════

export default AgendaCalendrier
