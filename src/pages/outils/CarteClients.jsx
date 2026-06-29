import { useState, useMemo } from 'react'

const VILLES = {
  'lomé':       { lat:6.1375, lng:1.2123, nom:'Lomé',       region:'Maritime' },
  'tsévié':     { lat:6.4333, lng:1.2167, nom:'Tsévié',     region:'Maritime' },
  'vogan':      { lat:6.2667, lng:1.5333, nom:'Vogan',      region:'Maritime' },
  'aneho':      { lat:6.2333, lng:1.6000, nom:'Aného',      region:'Maritime' },
  'bè':         { lat:6.1200, lng:1.2200, nom:'Bè',         region:'Maritime' },
  'adidogomé':  { lat:6.1700, lng:1.2000, nom:'Adidogomé',  region:'Maritime' },
  'tokoin':     { lat:6.1500, lng:1.2300, nom:'Tokoin',     region:'Maritime' },
  'kpalimé':    { lat:6.9000, lng:0.6333, nom:'Kpalimé',    region:'Plateaux' },
  'agou':       { lat:6.8333, lng:0.7500, nom:'Agou',       region:'Plateaux' },
  'notse':      { lat:6.9500, lng:1.1667, nom:'Notsé',      region:'Plateaux' },
  'atakpamé':   { lat:7.5333, lng:1.1333, nom:'Atakpamé',   region:'Plateaux' },
  'sokodé':     { lat:8.9833, lng:1.1333, nom:'Sokodé',     region:'Centrale' },
  'kara':       { lat:9.5500, lng:1.1833, nom:'Kara',       region:'Kara'     },
  'dapaong':    { lat:10.8667,lng:0.2000, nom:'Dapaong',    region:'Savanes'  },
}

const REGION_COLOR = {
  Maritime: '#0d9488',
  Plateaux: '#3b82f6',
  Centrale: '#8b5cf6',
  Kara:     '#f97316',
  Savanes:  '#eab308',
}

function getVille(adresse) {
  if (!adresse) return null
  const a = adresse.toLowerCase()
  for (const [key, val] of Object.entries(VILLES)) {
    if (a.includes(key)) return val
  }
  return null
}

function toSvg(lat, lng) {
  const x = 30 + (lng - 0.05) / 1.7 * 140
  const y = 370 - (lat - 6.0) / 5.1 * 355
  return { x, y }
}

function CarteClients({ clients, patients }) {
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)
  const [activeVille, setActiveVille] = useState(null)

  const enriched = useMemo(() => clients.map(c => ({
    ...c,
    ville: getVille(c.adresse),
    animaux: patients.filter(p => p.proprio === c.nom),
  })), [clients, patients])

  const geolocated = enriched.filter(c => c.ville)

  const filtered = geolocated.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.nom?.toLowerCase().includes(q) || c.adresse?.toLowerCase().includes(q)
  })

  const parVille = useMemo(() => {
    const map = {}
    filtered.forEach(c => {
      const k = c.ville.nom
      if (!map[k]) map[k] = { ville: c.ville, clients: [] }
      map[k].clients.push(c)
    })
    return Object.values(map).sort((a, b) => b.clients.length - a.clients.length)
  }, [filtered])

  const totalAnimaux = geolocated.reduce((s, c) => s + c.animaux.length, 0)
  const villeActive  = parVille.find(v => v.ville.nom === activeVille)

  return (
    <div className="app-page space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Total clients',      v: clients.length,     mod: 'stat-tile--blue'   },
          { l: 'Géolocalisés',       v: geolocated.length,  mod: 'stat-tile--teal'   },
          { l: 'Villes couvertes',   v: parVille.length,    mod: 'stat-tile--purple' },
          { l: 'Animaux recensés',   v: totalAnimaux,       mod: 'stat-tile--green'  },
        ].map((s, i) => (
          <div key={i} className={`stat-tile ${s.mod}`}>
            <div className="stat-tile__label">{s.l}</div>
            <div className="stat-tile__value">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* ── Carte ── */}
        <div className="md:col-span-2 app-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2">🗺️ Répartition géographique</h2>
              <p className="text-xs text-slate-400 mt-0.5">Cliquez sur une ville pour voir ses clients</p>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Rechercher…"
              style={{ border:'1.5px solid #e2e8f0', borderRadius:10, padding:'7px 12px', fontSize:13, outline:'none', width:180 }}
              onFocus={e => e.target.style.borderColor='#0d9488'}
              onBlur={e => e.target.style.borderColor='#e2e8f0'} />
          </div>

          <div style={{ position:'relative', background:'linear-gradient(160deg,#f0fdf4 0%,#eff6ff 60%,#faf5ff 100%)', padding:'20px' }}>
            <svg viewBox="0 0 200 400" style={{ width:'100%', maxWidth:340, display:'block', margin:'0 auto', filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.08))' }}>
              {/* Contour du Togo */}
              <defs>
                <linearGradient id="togoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#dcfce7" />
                  <stop offset="100%" stopColor="#d1fae5" />
                </linearGradient>
                <filter id="shadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
                </filter>
              </defs>
              <path
                d="M62,18 L138,22 L146,55 L143,98 L148,138 L146,178 L150,218 L146,258 L138,298 L128,338 L108,358 L92,358 L72,338 L62,298 L54,258 L50,218 L54,178 L52,138 L57,98 L54,55 Z"
                fill="url(#togoGrad)" stroke="#86efac" strokeWidth="1.5" filter="url(#shadow)"
              />
              {/* Lignes de latitude légères */}
              {[80,140,200,260,320].map(y => (
                <line key={y} x1="50" y1={y} x2="158" y2={y} stroke="#bbf7d0" strokeWidth="0.4" strokeDasharray="4,4"/>
              ))}

              {/* Points des villes */}
              {parVille.map(v => {
                const { x, y } = toSvg(v.ville.lat, v.ville.lng)
                const r = 5 + Math.min(v.clients.length * 2.5, 14)
                const isActive = activeVille === v.ville.nom
                const color = REGION_COLOR[v.ville.region] || '#0d9488'
                return (
                  <g key={v.ville.nom} style={{ cursor:'pointer' }} onClick={() => setActiveVille(isActive ? null : v.ville.nom)}>
                    {isActive && <circle cx={x} cy={y} r={r + 6} fill={color} opacity="0.15"/>}
                    <circle cx={x} cy={y} r={r} fill={color} opacity={isActive ? 1 : 0.8}
                      stroke="white" strokeWidth="2"
                      style={{ filter: isActive ? `drop-shadow(0 0 6px ${color})` : 'none', transition:'all .2s' }}
                    />
                    <text x={x} y={y + 3.5} textAnchor="middle" fontSize="8" fill="white" fontWeight="800">
                      {v.clients.length}
                    </text>
                    <text x={x} y={y - r - 4} textAnchor="middle" fontSize="6.5" fill="#1e293b" fontWeight="700">
                      {v.ville.nom.split('(')[0].trim()}
                    </text>
                  </g>
                )
              })}

              {/* Légende régions */}
              {Object.entries(REGION_COLOR).map(([region, color], i) => (
                <g key={region} transform={`translate(6, ${318 + i * 10})`}>
                  <circle cx="4" cy="4" r="3.5" fill={color} opacity="0.85"/>
                  <text x="10" y="7.5" fontSize="6" fill="#64748b" fontWeight="600">{region}</text>
                </g>
              ))}
            </svg>

            {/* Popup ville active */}
            {villeActive && (
              <div style={{ position:'absolute', top:16, right:16, background:'white', borderRadius:14, padding:'14px 16px', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', maxWidth:200, border:'1px solid #e2e8f0', minWidth:170 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontWeight:800, fontSize:13, color:'#1e293b' }}>📍 {villeActive.ville.nom}</span>
                  <button onClick={() => setActiveVille(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:16, lineHeight:1, padding:0 }}>×</button>
                </div>
                <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'#dbeafe', color:'#1d4ed8' }}>
                    {villeActive.clients.length} client(s)
                  </span>
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'#dcfce7', color:'#166534' }}>
                    {villeActive.clients.reduce((s,c) => s + c.animaux.length, 0)} animal(aux)
                  </span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {villeActive.clients.map(c => (
                    <div key={c.id} onClick={() => setSelected(c)}
                      style={{ padding:'7px 9px', borderRadius:9, background:'#f8fafc', border:'1px solid #e2e8f0', cursor:'pointer', transition:'all .15s' }}
                      onMouseEnter={e => e.currentTarget.style.background='#f0fdf4'}
                      onMouseLeave={e => e.currentTarget.style.background='#f8fafc'}>
                      <div style={{ fontWeight:700, fontSize:12, color:'#1e293b' }}>{c.nom}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{c.animaux.length} animal(aux) · {c.tel || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Villes sans géolocalisation */}
          {clients.length > geolocated.length && (
            <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
              <p className="text-xs text-amber-700 font-semibold">
                ⚠️ {clients.length - geolocated.length} client(s) sans ville reconnue — ajoutez une ville du Togo dans leur adresse
              </p>
            </div>
          )}
        </div>

        {/* ── Liste villes ── */}
        <div className="app-card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-base">📋 Clients par ville</h2>
            <p className="text-xs text-slate-400 mt-0.5">{parVille.length} ville(s)</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: 480 }}>
            {parVille.map(v => {
              const color = REGION_COLOR[v.ville.region] || '#0d9488'
              const isActive = activeVille === v.ville.nom
              return (
                <div key={v.ville.nom} onClick={() => setActiveVille(isActive ? null : v.ville.nom)}
                  style={{ padding:'10px 12px', borderRadius:12, border:`1.5px solid ${isActive ? color : '#e2e8f0'}`, background: isActive ? '#f0fdf4' : '#f8fafc', cursor:'pointer', transition:'all .15s' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:13, color:'#1e293b', display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }}/>
                      {v.ville.nom}
                    </span>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:999, background: isActive ? color : '#e2e8f0', color: isActive ? 'white' : '#64748b' }}>
                      {v.clients.length}
                    </span>
                  </div>
                  <p style={{ fontSize:11, color:'#94a3b8', marginLeft:14 }}>{v.clients.map(c => c.nom).slice(0,3).join(', ')}{v.clients.length > 3 ? `…` : ''}</p>
                </div>
              )
            })}
            {!parVille.length && (
              <div style={{ textAlign:'center', padding:'32px 16px', color:'#94a3b8' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📍</div>
                <p style={{ fontWeight:600, fontSize:13 }}>Aucun client géolocalisé</p>
                <p style={{ fontSize:12, marginTop:4 }}>Ajoutez une ville du Togo dans les adresses (ex: "Lomé", "Kpalimé"…)</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Fiche client ── */}
      {selected && (
        <div className="app-card overflow-hidden">
          <div style={{ height:3, background:'linear-gradient(90deg,#0d9488,#3b82f6)' }}/>
          <div className="p-5">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-4">
                <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#0d9488,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:900, fontSize:20, flexShrink:0 }}>
                  {selected.nom.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontWeight:800, fontSize:18, color:'#1e293b', margin:0 }}>{selected.nom}</h3>
                  <p style={{ fontSize:12, color:'#94a3b8', margin:'3px 0 0' }}>
                    {selected.ville?.nom} · {selected.tel || 'Pas de téléphone'} {selected.email ? `· ${selected.email}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ background:'none', border:'1.5px solid #e2e8f0', borderRadius:10, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#94a3b8', fontSize:18, flexShrink:0 }}>
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {selected.animaux.map(p => (
                <div key={p.id} style={{ padding:'12px 14px', borderRadius:12, border:'1.5px solid #e2e8f0', background:'#f8fafc' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                      {({'Chien':'🐕','Chat':'🐈','Bovin':'🐄','Caprin':'🐐','Ovin':'🐑','Volaille':'🐓'})[p.espece] || '🐾'}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, color:'#1e293b' }}>{p.nom}</div>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>{p.espece} · {p.race || '—'} · {p.age || '—'}</div>
                      {p.allergies && <div style={{ fontSize:11, color:'#dc2626', fontWeight:600, marginTop:2 }}>⚠️ {p.allergies}</div>}
                    </div>
                  </div>
                </div>
              ))}
              {!selected.animaux.length && (
                <div style={{ padding:'16px', color:'#94a3b8', fontSize:13, textAlign:'center' }}>Aucun animal enregistré</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CarteClients
