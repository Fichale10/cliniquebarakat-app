import { useState, useMemo } from 'react'

const VILLES = {
  'lomé':      { lat:6.1375,  lng:1.2123, nom:'Lomé',      region:'Maritime' },
  'tsévié':    { lat:6.4333,  lng:1.2167, nom:'Tsévié',    region:'Maritime' },
  'vogan':     { lat:6.2667,  lng:1.5333, nom:'Vogan',     region:'Maritime' },
  'aneho':     { lat:6.2333,  lng:1.6000, nom:'Aného',     region:'Maritime' },
  'aného':     { lat:6.2333,  lng:1.6000, nom:'Aného',     region:'Maritime' },
  'bè':        { lat:6.1200,  lng:1.2200, nom:'Bè',        region:'Maritime' },
  'adidogomé': { lat:6.1700,  lng:1.2000, nom:'Adidogomé', region:'Maritime' },
  'tokoin':    { lat:6.1500,  lng:1.2300, nom:'Tokoin',    region:'Maritime' },
  'kpalimé':   { lat:6.9000,  lng:0.6333, nom:'Kpalimé',   region:'Plateaux' },
  'agou':      { lat:6.8333,  lng:0.7500, nom:'Agou',      region:'Plateaux' },
  'notse':     { lat:6.9500,  lng:1.1667, nom:'Notsé',     region:'Plateaux' },
  'notsé':     { lat:6.9500,  lng:1.1667, nom:'Notsé',     region:'Plateaux' },
  'atakpamé':  { lat:7.5333,  lng:1.1333, nom:'Atakpamé',  region:'Plateaux' },
  'badou':     { lat:7.5833,  lng:0.6000, nom:'Badou',     region:'Plateaux' },
  'sokodé':    { lat:8.9833,  lng:1.1333, nom:'Sokodé',    region:'Centrale' },
  'sotouboua': { lat:8.5667,  lng:0.9833, nom:'Sotouboua', region:'Centrale' },
  'kara':      { lat:9.5500,  lng:1.1833, nom:'Kara',      region:'Kara'     },
  'bassar':    { lat:9.2500,  lng:0.7833, nom:'Bassar',    region:'Kara'     },
  'niamtougou':{ lat:9.7667,  lng:1.1000, nom:'Niamtougou',region:'Kara'     },
  'dapaong':   { lat:10.8667, lng:0.2000, nom:'Dapaong',   region:'Savanes'  },
  'mango':     { lat:10.3667, lng:0.4667, nom:'Mango',     region:'Savanes'  },
  'kandé':     { lat:10.1167, lng:1.0667, nom:'Kandé',     region:'Savanes'  },
}

const REGION_COLOR = {
  Maritime: '#0d9488',
  Plateaux: '#3b82f6',
  Centrale: '#8b5cf6',
  Kara:     '#f97316',
  Savanes:  '#d97706',
}

// Bornes de la carte dans l'image PNG (en % de la taille de l'image)
const X_LEFT = 15, X_RIGHT = 87
const Y_TOP  = 2,  Y_BOT   = 96
const LAT_MAX = 11.15, LAT_MIN = 6.05
const LNG_MIN = 0.00,  LNG_MAX = 1.85

function toPercent(lat, lng) {
  const x = X_LEFT + (lng - LNG_MIN) / (LNG_MAX - LNG_MIN) * (X_RIGHT - X_LEFT)
  const y = Y_TOP  + (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * (Y_BOT   - Y_TOP)
  return { x, y }
}

function getVille(adresse) {
  if (!adresse) return null
  const a = adresse.toLowerCase()
  for (const [key, val] of Object.entries(VILLES)) {
    if (a.includes(key)) return val
  }
  return null
}

function CarteClients({ clients = [], patients = [] }) {
  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState(null)
  const [activeVille, setActiveVille] = useState(null)

  const enriched = useMemo(() => clients.map(c => ({
    ...c,
    ville:   getVille(c.adresse),
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

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l:'Total clients',    v:clients.length,    mod:'stat-tile--blue'   },
          { l:'Géolocalisés',     v:geolocated.length, mod:'stat-tile--teal'   },
          { l:'Villes couvertes', v:parVille.length,   mod:'stat-tile--purple' },
          { l:'Animaux recensés', v:totalAnimaux,      mod:'stat-tile--green'  },
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
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-bold text-lg">🗺️ Répartition géographique — Togo</h2>
              <p className="text-xs text-slate-400 mt-0.5">Cliquez sur un marqueur pour voir les clients</p>
            </div>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Rechercher un client…"
              style={{ border:'1.5px solid #e2e8f0', borderRadius:10, padding:'7px 12px', fontSize:13, outline:'none', width:190 }}
              onFocus={e => e.target.style.borderColor='#0d9488'}
              onBlur={e  => e.target.style.borderColor='#e2e8f0'}
            />
          </div>

          <div style={{ padding:'20px 24px', background:'linear-gradient(135deg,#f8fafc,#f0fdf4)' }}>
            <div style={{ position:'relative', maxWidth:340, margin:'0 auto' }}>

              {/* Teinture colorée régions — derrière l'image, blending multiply */}
              <div style={{
                position:'absolute', inset:0, pointerEvents:'none', zIndex:1,
                background:`linear-gradient(to bottom,
                  rgba(217,119,6,0.20)  0%   23%,
                  rgba(249,115,22,0.20) 23%  40%,
                  rgba(139,92,246,0.20) 40%  60%,
                  rgba(59,130,246,0.20) 60%  81%,
                  rgba(13,148,136,0.20) 81% 100%
                )`,
                mixBlendMode:'multiply',
              }}/>

              {/* Image de la carte (fond blanc + contours noirs des régions) */}
              <img
                src="/togo-regions.png"
                alt="Carte des régions du Togo"
                style={{ width:'100%', display:'block', position:'relative', zIndex:2 }}
                draggable={false}
              />

              {/* Marqueurs de villes */}
              {parVille.map(v => {
                const { x, y } = toPercent(v.ville.lat, v.ville.lng)
                const color    = REGION_COLOR[v.ville.region] || '#0d9488'
                const isActive = activeVille === v.ville.nom
                const size     = 22 + Math.min(v.clients.length * 3, 12)
                return (
                  <div
                    key={v.ville.nom}
                    onClick={() => setActiveVille(isActive ? null : v.ville.nom)}
                    style={{
                      position:'absolute',
                      left:`${x}%`, top:`${y}%`,
                      transform:'translate(-50%,-50%)',
                      cursor:'pointer', zIndex:10,
                    }}
                  >
                    {isActive && (
                      <div style={{
                        position:'absolute', inset:-8,
                        borderRadius:'50%', background:color, opacity:0.22,
                      }}/>
                    )}
                    <div style={{
                      width:size, height:size, borderRadius:'50%',
                      background:color,
                      border:`${isActive ? 3 : 2.5}px solid white`,
                      boxShadow:`0 2px 8px ${color}99, 0 1px 3px rgba(0,0,0,0.18)`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'white', fontSize:size > 30 ? 10 : 8, fontWeight:900,
                      position:'relative', zIndex:2,
                      transition:'all .15s',
                    }}>
                      {v.clients.length}
                    </div>
                    <div style={{
                      position:'absolute', bottom:'100%', left:'50%',
                      transform:'translateX(-50%)',
                      fontSize:8.5, fontWeight:800, color:'#1e293b',
                      whiteSpace:'nowrap', marginBottom:2,
                      textShadow:'0 0 4px white, 0 0 4px white, 0 0 4px white',
                      pointerEvents:'none',
                    }}>
                      {v.ville.nom}
                    </div>
                  </div>
                )
              })}

              {/* Popup ville */}
              {villeActive && (
                <div style={{
                  position:'absolute', top:0, right:-10,
                  background:'white', borderRadius:14, padding:'14px 16px',
                  boxShadow:'0 8px 32px rgba(0,0,0,0.15)',
                  minWidth:185, maxWidth:215,
                  border:'1px solid #e2e8f0', zIndex:30,
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span style={{ fontWeight:800, fontSize:13, color:'#1e293b' }}>
                      📍 {villeActive.ville.nom}
                    </span>
                    <button
                      onClick={() => setActiveVille(null)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:18, lineHeight:1, padding:0 }}
                    >×</button>
                  </div>
                  <div style={{ display:'flex', gap:5, marginBottom:10 }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'#dbeafe', color:'#1d4ed8' }}>
                      {villeActive.clients.length} client(s)
                    </span>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'#dcfce7', color:'#166534' }}>
                      {villeActive.clients.reduce((s, c) => s + c.animaux.length, 0)} 🐾
                    </span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {villeActive.clients.map(c => (
                      <div
                        key={c.id}
                        onClick={() => { setSelected(c); setActiveVille(null) }}
                        style={{ padding:'7px 9px', borderRadius:9, background:'#f8fafc', border:'1px solid #e2e8f0', cursor:'pointer', transition:'all .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background='#f0fdf4'}
                        onMouseLeave={e => e.currentTarget.style.background='#f8fafc'}
                      >
                        <div style={{ fontWeight:700, fontSize:12, color:'#1e293b' }}>{c.nom}</div>
                        <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>
                          {c.animaux.length} animal(aux) · {c.tel || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Légende régions */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, justifyContent:'center', marginTop:14 }}>
              {Object.entries(REGION_COLOR).reverse().map(([nom, color]) => (
                <div key={nom} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#475569', fontWeight:600 }}>
                  <span style={{ width:10, height:10, borderRadius:'50%', background:color, display:'inline-block' }}/>
                  {nom}
                </div>
              ))}
            </div>

            {clients.length > geolocated.length && (
              <div style={{ marginTop:12, padding:'8px 14px', background:'#fffbeb', borderRadius:10, border:'1px solid #fde68a' }}>
                <p style={{ fontSize:12, color:'#92400e', fontWeight:600, margin:0 }}>
                  ⚠️ {clients.length - geolocated.length} client(s) sans ville reconnue — ajoutez une ville dans leur adresse (ex : "Lomé", "Kpalimé"…)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Liste villes ── */}
        <div className="app-card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-base">📋 Clients par ville</h2>
            <p className="text-xs text-slate-400 mt-0.5">{parVille.length} ville(s) couvertes</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight:520 }}>
            {parVille.map(v => {
              const color    = REGION_COLOR[v.ville.region] || '#0d9488'
              const isActive = activeVille === v.ville.nom
              return (
                <div
                  key={v.ville.nom}
                  onClick={() => setActiveVille(isActive ? null : v.ville.nom)}
                  style={{
                    padding:'10px 12px', borderRadius:12,
                    border:`1.5px solid ${isActive ? color : '#e2e8f0'}`,
                    background:isActive ? '#f0fdf4' : '#f8fafc',
                    cursor:'pointer', transition:'all .15s',
                  }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:13, color:'#1e293b', display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }}/>
                      {v.ville.nom}
                    </span>
                    <span style={{
                      fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:999,
                      background:isActive ? color : '#e2e8f0',
                      color:isActive ? 'white' : '#64748b',
                    }}>
                      {v.clients.length}
                    </span>
                  </div>
                  <p style={{ fontSize:11, color:'#94a3b8', margin:'0 0 0 14px' }}>
                    {v.clients.map(c => c.nom).slice(0, 3).join(', ')}{v.clients.length > 3 ? '…' : ''}
                  </p>
                </div>
              )
            })}
            {!parVille.length && (
              <div style={{ textAlign:'center', padding:'32px 16px', color:'#94a3b8' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📍</div>
                <p style={{ fontWeight:600, fontSize:13 }}>Aucun client géolocalisé</p>
                <p style={{ fontSize:12, marginTop:4 }}>Ajoutez une ville dans les adresses (ex : "Lomé", "Kpalimé"…)</p>
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
                <div style={{
                  width:56, height:56, borderRadius:16,
                  background:'linear-gradient(135deg,#0d9488,#3b82f6)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'white', fontWeight:900, fontSize:20, flexShrink:0,
                }}>
                  {selected.nom.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontWeight:800, fontSize:18, color:'#1e293b', margin:0 }}>{selected.nom}</h3>
                  <p style={{ fontSize:12, color:'#94a3b8', margin:'3px 0 0' }}>
                    {selected.ville?.nom}{selected.tel ? ` · ${selected.tel}` : ''}{selected.email ? ` · ${selected.email}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background:'none', border:'1.5px solid #e2e8f0', borderRadius:10, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#94a3b8', fontSize:18, flexShrink:0 }}
              >×</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {selected.animaux.map(p => (
                <div key={p.id} style={{ padding:'12px 14px', borderRadius:12, border:'1.5px solid #e2e8f0', background:'#f8fafc' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{
                      width:38, height:38, borderRadius:10,
                      background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',
                      border:'1px solid #bbf7d0',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:20, flexShrink:0,
                    }}>
                      {({'Chien':'🐕','Chat':'🐈','Bovin':'🐄','Caprin':'🐐','Ovin':'🐑','Volaille':'🐓'})[p.espece] || '🐾'}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, color:'#1e293b' }}>{p.nom}</div>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>{p.espece} · {p.race || '—'} · {p.age || '—'}</div>
                      {p.allergies && (
                        <div style={{ fontSize:11, color:'#dc2626', fontWeight:600, marginTop:2 }}>⚠️ {p.allergies}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!selected.animaux.length && (
                <p style={{ color:'#94a3b8', fontSize:13 }}>Aucun animal enregistré</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CarteClients
