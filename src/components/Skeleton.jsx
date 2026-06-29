import { useEffect, useRef } from 'react'

// ── Animation shimmer injectée une seule fois ────────────────────
let styleInjected = false
function injectStyle() {
  if (styleInjected) return
  styleInjected = true
  const s = document.createElement('style')
  s.textContent = `
    @keyframes sk-shimmer {
      0%   { background-position: -600px 0; }
      100% { background-position: 600px 0; }
    }
    .sk {
      background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
      background-size: 600px 100%;
      animation: sk-shimmer 1.4s infinite linear;
      border-radius: 8px;
      display: block;
    }
    .dark-mode .sk {
      background: linear-gradient(90deg, #1e293b 25%, #273549 50%, #1e293b 75%);
      background-size: 600px 100%;
    }
  `
  document.head.appendChild(s)
}

// Primitive : rectangle shimmer
export function Sk({ w = '100%', h = 16, r = 8, style = {} }) {
  const ref = useRef(null)
  useEffect(() => { injectStyle() }, [])
  return (
    <span
      ref={ref}
      className="sk"
      style={{ width: w, height: h, borderRadius: r, ...style }}
    />
  )
}

// ── Tuile stat ───────────────────────────────────────────────────
export function SkStat() {
  return (
    <div style={{ padding: '18px 20px', borderRadius: 16, background: 'white', border: '1.5px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
      <Sk w="55%" h={11} style={{ marginBottom: 10 }} />
      <Sk w="45%" h={28} r={10} />
    </div>
  )
}

// ── Ligne de tableau ─────────────────────────────────────────────
export function SkRow({ cols = 5 }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 20px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
      {Array.from({ length: cols }, (_, i) => (
        <Sk key={i} w={i === 0 ? '18%' : i === cols - 1 ? '10%' : `${Math.floor(60 / (cols - 1))}%`} h={12} />
      ))}
    </div>
  )
}

// ── Card générique ───────────────────────────────────────────────
export function SkCard({ lines = 3 }) {
  return (
    <div style={{ padding: '18px 20px', borderRadius: 16, background: 'white', border: '1.5px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: lines }, (_, i) => (
        <Sk key={i} w={i === 0 ? '60%' : i === lines - 1 ? '40%' : '85%'} h={i === 0 ? 16 : 12} />
      ))}
    </div>
  )
}

// ── Page type "liste + stats" ────────────────────────────────────
export function SkPage({ stats = 4, rows = 7 }) {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tuiles stat */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats}, 1fr)`, gap: 16 }}>
        {Array.from({ length: stats }, (_, i) => <SkStat key={i} />)}
      </div>
      {/* Card tableau */}
      <div style={{ borderRadius: 16, background: 'white', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        {/* Header de la card */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Sk w={160} h={16} />
            <Sk w={90}  h={10} />
          </div>
          <Sk w={110} h={36} r={12} />
        </div>
        {/* En-tête colonnes */}
        <div style={{ display: 'flex', gap: 12, padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
          {[22, 14, 18, 14, 10].map((w, i) => (
            <Sk key={i} w={`${w}%`} h={10} />
          ))}
        </div>
        {/* Lignes */}
        {Array.from({ length: rows }, (_, i) => <SkRow key={i} cols={5} />)}
      </div>
    </div>
  )
}

// ── Squelette complet de l'application (splash initial) ──────────
export function SkAppShell() {
  useEffect(() => { injectStyle() }, [])
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f0fdf4' }}>

      {/* Sidebar */}
      <div style={{
        width: 220, flexShrink: 0, background: 'linear-gradient(180deg,#14532d 0%,#0f3d21 100%)',
        padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }}/>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Sk w="80%" h={10} style={{ background: 'linear-gradient(90deg,rgba(255,255,255,0.12) 25%,rgba(255,255,255,0.22) 50%,rgba(255,255,255,0.12) 75%)', backgroundSize:'600px 100%' }} />
            <Sk w="60%" h={8}  style={{ background: 'linear-gradient(90deg,rgba(255,255,255,0.08) 25%,rgba(255,255,255,0.16) 50%,rgba(255,255,255,0.08) 75%)', backgroundSize:'600px 100%' }} />
          </div>
        </div>
        {/* Items de menu */}
        {[1,1,1,0,1,1,1,0,1,1,0,1,1].map((v, i) =>
          v ? (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }}/>
              <Sk w="65%" h={10} style={{ background: 'linear-gradient(90deg,rgba(255,255,255,0.10) 25%,rgba(255,255,255,0.18) 50%,rgba(255,255,255,0.10) 75%)', backgroundSize:'600px 100%' }} />
            </div>
          ) : (
            <div key={i} style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 8px' }}/>
          )
        )}
      </div>

      {/* Contenu principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ height: 60, borderBottom: '1.5px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', gap: 16, flexShrink: 0 }}>
          <Sk w={200} h={32} r={20} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Sk w={32} h={32} r={10} />
            <Sk w={32} h={32} r={10} />
            <Sk w={36} h={36} r="50%" />
          </div>
        </div>

        {/* Contenu page */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <SkPage stats={4} rows={6} />
        </div>
      </div>
    </div>
  )
}

export default Sk
