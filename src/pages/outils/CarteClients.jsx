import { Map as MapIcon, ClipboardList } from 'lucide-react'
import { useState, useMemo, useRef, useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const VILLES = {
  // ── Grand Lomé & Maritime ──
  'lomé':          { lat:6.1375,  lng:1.2123, nom:'Lomé',          region:'Maritime' },
  'bè':            { lat:6.1200,  lng:1.2200, nom:'Bè',            region:'Maritime' },
  'tokoin':        { lat:6.1500,  lng:1.2300, nom:'Tokoin',        region:'Maritime' },
  'adidogomé':     { lat:6.1700,  lng:1.2000, nom:'Adidogomé',     region:'Maritime' },
  'agoè':          { lat:6.2300,  lng:1.2100, nom:'Agoè',          region:'Maritime' },
  'agoe':          { lat:6.2300,  lng:1.2100, nom:'Agoè',          region:'Maritime' },
  'baguida':       { lat:6.1600,  lng:1.3200, nom:'Baguida',       region:'Maritime' },
  'adétikopé':     { lat:6.3000,  lng:1.2100, nom:'Adétikopé',     region:'Maritime' },
  'adetikope':     { lat:6.3000,  lng:1.2100, nom:'Adétikopé',     region:'Maritime' },
  'sanguéra':      { lat:6.2500,  lng:1.1500, nom:'Sanguéra',      region:'Maritime' },
  'sanguera':      { lat:6.2500,  lng:1.1500, nom:'Sanguéra',      region:'Maritime' },
  'kégué':         { lat:6.1900,  lng:1.2200, nom:'Kégué',         region:'Maritime' },
  'kegue':         { lat:6.1900,  lng:1.2200, nom:'Kégué',         region:'Maritime' },
  'agbalépédogan': { lat:6.1700,  lng:1.2000, nom:'Agbalépédogan', region:'Maritime' },
  'djidjolé':      { lat:6.1600,  lng:1.1900, nom:'Djidjolé',      region:'Maritime' },
  'nyékonakpoè':   { lat:6.1300,  lng:1.2100, nom:'Nyékonakpoè',   region:'Maritime' },
  'hédzranawoé':   { lat:6.1700,  lng:1.2300, nom:'Hédzranawoé',   region:'Maritime' },
  'cacavéli':      { lat:6.1900,  lng:1.2000, nom:'Cacavéli',      region:'Maritime' },
  'amoutivé':      { lat:6.1300,  lng:1.2300, nom:'Amoutivé',      region:'Maritime' },
  'aflao':         { lat:6.1200,  lng:1.1900, nom:'Aflao',         region:'Maritime' },
  'zanguéra':      { lat:6.2800,  lng:1.1200, nom:'Zanguéra',      region:'Maritime' },
  'légbassito':    { lat:6.2700,  lng:1.1800, nom:'Légbassito',    region:'Maritime' },
  'tsévié':        { lat:6.4333,  lng:1.2167, nom:'Tsévié',        region:'Maritime' },
  'tsevie':        { lat:6.4333,  lng:1.2167, nom:'Tsévié',        region:'Maritime' },
  'vogan':         { lat:6.2667,  lng:1.5333, nom:'Vogan',         region:'Maritime' },
  'aneho':         { lat:6.2333,  lng:1.6000, nom:'Aného',         region:'Maritime' },
  'aného':         { lat:6.2333,  lng:1.6000, nom:'Aného',         region:'Maritime' },
  'afagnan':       { lat:6.3200,  lng:1.6000, nom:'Afagnan',       region:'Maritime' },
  'tabligbo':      { lat:6.5800,  lng:1.5000, nom:'Tabligbo',      region:'Maritime' },
  'assahoun':      { lat:6.4500,  lng:0.9000, nom:'Assahoun',      region:'Maritime' },
  'kévé':          { lat:6.4300,  lng:0.9300, nom:'Kévé',          region:'Maritime' },
  'noépé':         { lat:6.3300,  lng:1.0200, nom:'Noépé',         region:'Maritime' },
  // ── Plateaux ──
  'kpalimé':       { lat:6.9000,  lng:0.6333, nom:'Kpalimé',       region:'Plateaux' },
  'kpalime':       { lat:6.9000,  lng:0.6333, nom:'Kpalimé',       region:'Plateaux' },
  'agou':          { lat:6.8333,  lng:0.7500, nom:'Agou',          region:'Plateaux' },
  'notse':         { lat:6.9500,  lng:1.1667, nom:'Notsé',         region:'Plateaux' },
  'notsé':         { lat:6.9500,  lng:1.1667, nom:'Notsé',         region:'Plateaux' },
  'atakpamé':      { lat:7.5333,  lng:1.1333, nom:'Atakpamé',      region:'Plateaux' },
  'atakpame':      { lat:7.5333,  lng:1.1333, nom:'Atakpamé',      region:'Plateaux' },
  'badou':         { lat:7.5833,  lng:0.6000, nom:'Badou',         region:'Plateaux' },
  'anié':          { lat:7.7500,  lng:1.2000, nom:'Anié',          region:'Plateaux' },
  'amlamé':        { lat:7.4700,  lng:0.9000, nom:'Amlamé',        region:'Plateaux' },
  'danyi':         { lat:7.1500,  lng:0.6200, nom:'Danyi',         region:'Plateaux' },
  // ── Centrale ──
  'sokodé':        { lat:8.9833,  lng:1.1333, nom:'Sokodé',        region:'Centrale' },
  'sokode':        { lat:8.9833,  lng:1.1333, nom:'Sokodé',        region:'Centrale' },
  'sotouboua':     { lat:8.5667,  lng:0.9833, nom:'Sotouboua',     region:'Centrale' },
  'tchamba':       { lat:9.0300,  lng:1.4200, nom:'Tchamba',       region:'Centrale' },
  'blitta':        { lat:8.3200,  lng:0.9800, nom:'Blitta',        region:'Centrale' },
  // ── Kara ──
  'kara':          { lat:9.5500,  lng:1.1833, nom:'Kara',          region:'Kara'     },
  'bassar':        { lat:9.2500,  lng:0.7833, nom:'Bassar',        region:'Kara'     },
  'niamtougou':    { lat:9.7667,  lng:1.1000, nom:'Niamtougou',    region:'Kara'     },
  'bafilo':        { lat:9.3500,  lng:1.2700, nom:'Bafilo',        region:'Kara'     },
  'pagouda':       { lat:9.7500,  lng:1.3300, nom:'Pagouda',       region:'Kara'     },
  'kabou':         { lat:9.4500,  lng:0.8200, nom:'Kabou',         region:'Kara'     },
  // ── Savanes ──
  'dapaong':       { lat:10.8667, lng:0.2000, nom:'Dapaong',       region:'Savanes'  },
  'mango':         { lat:10.3667, lng:0.4667, nom:'Mango',         region:'Savanes'  },
  'kandé':         { lat:10.1167, lng:1.0667, nom:'Kandé',         region:'Savanes'  },
  'tandjouaré':    { lat:10.6500, lng:0.1500, nom:'Tandjouaré',    region:'Savanes'  },
  'cinkassé':      { lat:11.0600, lng:0.0200, nom:'Cinkassé',      region:'Savanes'  },
}

const REGION_COLOR = {
  Maritime: '#0d9488',
  Plateaux: '#3b82f6',
  Centrale: '#8b5cf6',
  Kara:     '#f97316',
  Savanes:  '#d97706',
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
  const mapDivRef   = useRef(null)
  const mapRef      = useRef(null)
  const markersRef  = useRef(null)

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

  // ── Initialisation de la carte Leaflet (une seule fois) ───────
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return
    const map = L.map(mapDivRef.current, { scrollWheelZoom: true }).setView([8.4, 1.0], 7)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)
    markersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // ── Marqueurs par ville (mis à jour avec les filtres) ─────────
  useEffect(() => {
    const group = markersRef.current
    if (!group) return
    group.clearLayers()
    parVille.forEach(v => {
      const color = REGION_COLOR[v.ville.region] || '#0d9488'
      const marker = L.circleMarker([v.ville.lat, v.ville.lng], {
        radius: 10 + Math.min(v.clients.length * 2, 12),
        color: 'white', weight: 2.5,
        fillColor: color, fillOpacity: 0.9,
      })
      marker.bindTooltip(`${v.ville.nom} — ${v.clients.length} client(s)`, { direction: 'top', offset: [0, -8] })
      marker.on('click', () => setActiveVille(prev => prev === v.ville.nom ? null : v.ville.nom))
      group.addLayer(marker)
    })
  }, [parVille])

  // ── Zoom sur la ville sélectionnée ─────────────────────────
  useEffect(() => {
    if (mapRef.current && villeActive) {
      mapRef.current.flyTo([villeActive.ville.lat, villeActive.ville.lng], 12, { duration: 0.8 })
    }
  }, [activeVille])

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
              <h2 className="font-bold text-lg flex items-center gap-2"><MapIcon size={19} color="#0d9488" strokeWidth={2.3} /> Répartition géographique — Togo</h2>
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

          <div style={{ padding:'16px 20px' }}>
            {/* Carte interactive OpenStreetMap */}
            <div ref={mapDivRef} style={{ height:420, borderRadius:14, overflow:'hidden', border:'1px solid #e2e8f0', zIndex:0 }} />

            {/* Détail ville sélectionnée */}
            {villeActive && (
              <div style={{
                marginTop:12, background:'white', borderRadius:14, padding:'14px 16px',
                boxShadow:'0 4px 16px rgba(0,0,0,0.06)', border:'1px solid #e2e8f0',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, flexWrap:'wrap', gap:8 }}>
                  <span style={{ fontWeight:800, fontSize:14, color:'#1e293b' }}>
                    📍 {villeActive.ville.nom}
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'#dbeafe', color:'#1d4ed8', marginLeft:8 }}>
                      {villeActive.clients.length} client(s)
                    </span>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'#dcfce7', color:'#166534', marginLeft:5 }}>
                      {villeActive.clients.reduce((s, c) => s + c.animaux.length, 0)} 🐾
                    </span>
                  </span>
                  <div style={{ display:'flex', gap:6 }}>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${villeActive.ville.lat},${villeActive.ville.lng}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:12, fontWeight:700, padding:'5px 12px', borderRadius:9, background:'#f0fdfa', border:'1px solid #99f6e4', color:'#0d9488', textDecoration:'none' }}>
                      🧭 Itinéraire
                    </a>
                    <button
                      onClick={() => setActiveVille(null)}
                      style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:9, cursor:'pointer', color:'#94a3b8', fontSize:15, lineHeight:1, padding:'4px 10px' }}
                    >×</button>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:6 }}>
                  {villeActive.clients.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setSelected(c)}
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
            <h2 className="font-bold text-base flex items-center gap-2"><ClipboardList size={16} color="#0d9488" /> Clients par ville</h2>
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
