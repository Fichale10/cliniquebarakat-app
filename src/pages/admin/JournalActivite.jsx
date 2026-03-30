import { useState, useEffect, useRef, useMemo } from 'react'
import { sb } from '../../lib/supabase'
import { ROLES } from '../../lib/roles'

function JournalActivite({user}){
  const [logs,setLogs]=useState([]);
  const [search,setSearch]=useState('');
  const [filterRole,setFilterRole]=useState('');

  useEffect(()=>{
    // Charger depuis localStorage
    try{
      const local=JSON.parse(localStorage.getItem('lb_logs')||'[]');
      setLogs(local);
    }catch(e){}
    // Charger depuis Supabase
    if(navigator.onLine&&sb){
      sb.from('activity_logs').select('*').order('created_at',{ascending:false}).limit(200)
        .then(({data})=>{ if(data&&data.length) setLogs(data); })
        .catch(()=>{});
    }
  },[]);

  const filtered=logs.filter(l=>{
    const q=search.toLowerCase();
    if(q&&!l.user_name?.toLowerCase().includes(q)&&!l.user_email?.toLowerCase().includes(q)&&!l.action?.toLowerCase().includes(q)&&!l.details?.toLowerCase().includes(q)) return false;
    if(filterRole&&l.user_role!==filterRole) return false;
    return true;
  });

  const fmt=d=>{try{return new Date(d).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch{return d;}};

  const actionColor={'connexion':'#16a34a','deconnexion':'#dc2626'};
  const roleInfo=r=>ROLES[r]||{label:r,icon:'👤',color:'#64748b'};

  return <div className="app-page space-y-5">
    <div className="app-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">📜 Journal d'activité</h2>
          <p className="text-sm text-slate-500">{filtered.length} entrée(s)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-green-400"
            style={{width:'180px'}}/>
          <select value={filterRole} onChange={e=>setFilterRole(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-green-400">
            <option value="">Tous les rôles</option>
            {Object.entries(ROLES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>
      </div>

      {!filtered.length&&<div className="text-center py-12 text-slate-400"><div className="text-4xl mb-2">📋</div><p>Aucune activité enregistrée</p></div>}

      <div className="overflow-hidden rounded-xl border border-slate-100">
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
          <thead>
            <tr style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
              <th style={{padding:'10px 14px',textAlign:'left',fontWeight:700,color:'#64748b',fontSize:'11px',textTransform:'uppercase',letterSpacing:'.05em'}}>Date & Heure</th>
              <th style={{padding:'10px 14px',textAlign:'left',fontWeight:700,color:'#64748b',fontSize:'11px',textTransform:'uppercase',letterSpacing:'.05em'}}>Utilisateur</th>
              <th style={{padding:'10px 14px',textAlign:'left',fontWeight:700,color:'#64748b',fontSize:'11px',textTransform:'uppercase',letterSpacing:'.05em'}}>Rôle</th>
              <th style={{padding:'10px 14px',textAlign:'left',fontWeight:700,color:'#64748b',fontSize:'11px',textTransform:'uppercase',letterSpacing:'.05em'}}>Action</th>
              <th style={{padding:'10px 14px',textAlign:'left',fontWeight:700,color:'#64748b',fontSize:'11px',textTransform:'uppercase',letterSpacing:'.05em'}}>Détails</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l,i)=>{
              const ri=roleInfo(l.user_role);
              return <tr key={l.id||i} className="tbl-row" style={{borderBottom:'1px solid #f1f5f9'}}>
                <td style={{padding:'10px 14px',color:'#64748b',whiteSpace:'nowrap',fontFamily:"'Space Mono',monospace",fontSize:'12px'}}>{fmt(l.created_at)}</td>
                <td style={{padding:'10px 14px'}}>
                  <div style={{fontWeight:600,color:'#1e293b'}}>{l.user_name||'—'}</div>
                  <div style={{fontSize:'11px',color:'#94a3b8'}}>{l.user_email}</div>
                </td>
                <td style={{padding:'10px 14px'}}>
                  <span style={{fontSize:'11px',fontWeight:700,padding:'3px 8px',borderRadius:'999px',background:ri.bg||'#f1f5f9',color:ri.color||'#64748b'}}>
                    {ri.icon} {ri.label}
                  </span>
                </td>
                <td style={{padding:'10px 14px'}}>
                  <span style={{fontSize:'12px',fontWeight:700,padding:'3px 8px',borderRadius:'6px',
                    background:actionColor[l.action]?actionColor[l.action]+'20':'#f1f5f9',
                    color:actionColor[l.action]||'#475569'}}>
                    {l.action}
                  </span>
                </td>
                <td style={{padding:'10px 14px',color:'#64748b',fontSize:'12px',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.details||'—'}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}


// ══════════════════════════════════════════════════════════════
//   GESTION LOTS & TRAÇABILITÉ
// ══════════════════════════════════════════════════════════════

export default JournalActivite
