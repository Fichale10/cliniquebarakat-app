import { useState, useEffect, useRef, useMemo } from 'react'

function CarteClients({clients, patients}){
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState(null);

  // Villes connues du Togo avec coordonnées approximatives
  const VILLES_TOGO={
    'lomé':{lat:6.1375,lng:1.2123,nom:'Lomé'},
    'kpalimé':{lat:6.9000,lng:0.6333,nom:'Kpalimé'},
    'atakpamé':{lat:7.5333,lng:1.1333,nom:'Atakpamé'},
    'sokodé':{lat:8.9833,lng:1.1333,nom:'Sokodé'},
    'kara':{lat:9.5500,lng:1.1833,nom:'Kara'},
    'dapaong':{lat:10.8667,lng:0.2000,nom:'Dapaong'},
    'tsévié':{lat:6.4333,lng:1.2167,nom:'Tsévié'},
    'agou':{lat:6.8333,lng:0.7500,nom:'Agou'},
    'notse':{lat:6.9500,lng:1.1667,nom:'Notsé'},
    'vogan':{lat:6.2667,lng:1.5333,nom:'Vogan'},
    'aneho':{lat:6.2333,lng:1.6000,nom:'Aného'},
    'tokoin':{lat:6.1500,lng:1.2300,nom:'Tokoin (Lomé)'},
    'bè':{lat:6.1200,lng:1.2200,nom:'Bè (Lomé)'},
    'adidogomé':{lat:6.1700,lng:1.2000,nom:'Adidogomé (Lomé)'},
  };

  const getCoords=(adresse)=>{
    if(!adresse) return null;
    const a=adresse.toLowerCase();
    for(const [key,val] of Object.entries(VILLES_TOGO)){
      if(a.includes(key)) return val;
    }
    return null;
  };

  const clientsAvecPos=clients.map(c=>({
    ...c,
    coords:getCoords(c.adresse),
    nbPatients:patients.filter(p=>p.proprio===c.nom).length,
  })).filter(c=>c.coords);

  const filtered=clientsAvecPos.filter(c=>{
    const q=search.toLowerCase();
    return !q||(c.nom?.toLowerCase().includes(q)||c.adresse?.toLowerCase().includes(q));
  });

  // Grouper par ville
  const parVille={};
  filtered.forEach(c=>{
    const v=c.coords.nom;
    if(!parVille[v]) parVille[v]={nom:v,coords:c.coords,clients:[],totalPatients:0};
    parVille[v].clients.push(c);
    parVille[v].totalPatients+=c.nbPatients;
  });
  const villesList=Object.values(parVille).sort((a,b)=>b.clients.length-a.clients.length);

  return <div className="app-page space-y-5">
    <div className="app-card p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">🗺️ Carte clients & élevages</h2>
          <p className="text-sm text-slate-500">{filtered.length} client(s) géolocalisé(s) sur {clients.length} · Togo</p>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher…"
          style={{border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'7px 12px',fontSize:'13px',outline:'none',width:'200px'}}/>
      </div>

      {/* Carte SVG du Togo */}
      <div style={{position:'relative',background:'linear-gradient(135deg,#e0f2fe,#bfdbfe)',borderRadius:'16px',overflow:'hidden',marginBottom:'20px',minHeight:'420px',border:'1px solid #bfdbfe'}}>
        <svg viewBox="0 0 200 380" style={{width:'100%',maxWidth:'400px',display:'block',margin:'0 auto'}}>
          {/* Contour simplifié du Togo */}
          <path d="M60,20 L140,25 L148,60 L145,100 L150,140 L148,180 L152,220 L148,260 L140,300 L130,340 L110,360 L90,360 L70,340 L60,300 L52,260 L48,220 L52,180 L50,140 L55,100 L52,60 Z"
            fill="#dcfce7" stroke="#166534" strokeWidth="2" opacity="0.7"/>
          {/* Grille légère */}
          {[60,120,180,240,300].map(y=><line key={y} x1="40" y1={y} x2="170" y2={y} stroke="#e2e8f0" strokeWidth="0.5"/>)}
          {/* Nom du pays */}
          <text x="100" y="15" textAnchor="middle" fontSize="9" fill="#166534" fontWeight="700">TOGO</text>
          {/* Points des villes */}
          {villesList.map((v,i)=>{
            // Convertir coords en position SVG (approximation)
            const svgX=40+(v.coords.lng-0.2)/1.6*130;
            const svgY=360-(v.coords.lat-6.1)/4.9*340;
            const size=4+Math.min(v.clients.length*3,16);
            const isSelected=selected?.nom===v.nom;
            return <g key={v.nom} style={{cursor:'pointer'}} onClick={()=>setSelected(isSelected?null:v)}>
              <circle cx={svgX} cy={svgY} r={size} fill={isSelected?'#166534':'#3b82f6'} opacity="0.85" stroke="white" strokeWidth="1.5"/>
              <text x={svgX} y={svgY-size-3} textAnchor="middle" fontSize="7" fill="#1e293b" fontWeight="600">{v.nom.split('(')[0].trim()}</text>
              <text x={svgX} y={svgY+3} textAnchor="middle" fontSize="7" fill="white" fontWeight="700">{v.clients.length}</text>
            </g>;
          })}
          {/* Légende */}
          <circle cx="20" cy="350" r="5" fill="#3b82f6" opacity="0.85"/>
          <text x="29" y="354" fontSize="7" fill="#64748b">= clients</text>
        </svg>
        {selected&&<div style={{position:'absolute',top:'16px',right:'16px',background:'white',borderRadius:'12px',padding:'14px 16px',boxShadow:'0 4px 20px rgba(0,0,0,0.12)',maxWidth:'200px',border:'1px solid #e2e8f0'}}>
          <div style={{fontWeight:800,fontSize:'14px',color:'#1e293b',marginBottom:'8px'}}>📍 {selected.nom}</div>
          {selected.clients.map(c=><div key={c.id} style={{fontSize:'12px',padding:'4px 0',borderBottom:'1px solid #f1f5f9',color:'#374151'}}>
            <div style={{fontWeight:600}}>{c.nom}</div>
            <div style={{color:'#94a3b8'}}>{c.nbPatients} animal(aux)</div>
          </div>)}
          <button onClick={()=>setSelected(null)} style={{marginTop:'8px',fontSize:'11px',color:'#94a3b8',background:'none',border:'none',cursor:'pointer'}}>Fermer ×</button>
        </div>}
      </div>

      {/* Liste par ville */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {villesList.map(v=><div key={v.nom} onClick={()=>setSelected(selected?.nom===v.nom?null:v)}
          style={{padding:'12px 14px',borderRadius:'12px',border:`1px solid ${selected?.nom===v.nom?'#166534':'#e2e8f0'}`,background:selected?.nom===v.nom?'#f0fdf4':'#f8fafc',cursor:'pointer',transition:'all .15s'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
            <span style={{fontWeight:700,fontSize:'14px',color:'#1e293b'}}>📍 {v.nom}</span>
            <div style={{display:'flex',gap:'8px'}}>
              <span style={{fontSize:'11px',fontWeight:700,padding:'2px 7px',borderRadius:'999px',background:'#dbeafe',color:'#1d4ed8'}}>{v.clients.length} client(s)</span>
              <span style={{fontSize:'11px',fontWeight:700,padding:'2px 7px',borderRadius:'999px',background:'#dcfce7',color:'#166534'}}>{v.totalPatients} animal(aux)</span>
            </div>
          </div>
          <div style={{fontSize:'12px',color:'#64748b'}}>{v.clients.map(c=>c.nom).join(' · ')}</div>
        </div>)}
        {!villesList.length&&<div className="md:col-span-2" style={{textAlign:'center',padding:'32px',color:'#94a3b8'}}>
          <div style={{fontSize:'36px',marginBottom:'8px'}}>🗺️</div>
          <p style={{fontWeight:600}}>Aucun client géolocalisé</p>
          <p style={{fontSize:'13px',marginTop:'4px'}}>Ajoutez des villes du Togo dans les adresses clients (ex: "Lomé", "Kpalimé", "Agou"…)</p>
        </div>}
      </div>
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════════════
//   SUIVI TRAITEMENTS & RAPPELS
// ══════════════════════════════════════════════════════════════

export default CarteClients
