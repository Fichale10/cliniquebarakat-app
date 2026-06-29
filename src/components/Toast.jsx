import { useState, useEffect, useCallback, useRef } from 'react'

// ── Registre global ─────────────────────────────────────────────
let _addToast = null

export function toast(msg, type = 'success') {
  if (_addToast) _addToast(String(msg), type)
}

// Détecte le type selon le contenu du message
function detectType(msg) {
  const m = msg.toLowerCase()
  if (m.includes('erreur') || m.includes('impossible') || m.startsWith('❌')) return 'error'
  if (
    m.includes('requis') || m.includes('invalide') || m.includes('obligatoire') ||
    m.includes('entrez') || m.includes('sélectionnez') || m.includes('ajoutez') ||
    m.includes('choisissez') || m.includes('saisissez') || m.includes('veuillez')
  ) return 'warning'
  if (
    m.includes('envoyé') || m.includes('converti') || m.includes('réussi') ||
    m.includes('supprim') || m.startsWith('✓') || m.startsWith('✅')
  ) return 'success'
  return 'info'
}

const CONFIG = {
  success: { bg:'#f0fdf4', border:'#86efac', bar:'#16a34a', icon:'✓', iconBg:'#16a34a', text:'#14532d' },
  error:   { bg:'#fff1f2', border:'#fca5a5', bar:'#dc2626', icon:'✕', iconBg:'#dc2626', text:'#7f1d1d' },
  warning: { bg:'#fffbeb', border:'#fde68a', bar:'#d97706', icon:'⚠', iconBg:'#d97706', text:'#78350f' },
  info:    { bg:'#eff6ff', border:'#93c5fd', bar:'#2563eb', icon:'ℹ', iconBg:'#2563eb', text:'#1e3a8a' },
}

const DURATION = 4000

function ToastItem({ id, msg, type, onDismiss }) {
  const [visible, setVisible] = useState(false)
  const c = CONFIG[type] || CONFIG.info

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    const t = setTimeout(() => dismiss(), DURATION)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    setVisible(false)
    setTimeout(() => onDismiss(id), 300)
  }

  return (
    <div
      onClick={dismiss}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        borderRadius: 14,
        padding: '12px 14px 0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
        maxWidth: 340, minWidth: 260,
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        transition: 'opacity 0.28s ease, transform 0.28s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(24px)',
        marginTop: 8,
      }}
    >
      {/* Icône */}
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: c.iconBg, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 900, flexShrink: 0, marginTop: 1,
      }}>
        {c.icon}
      </div>

      {/* Message */}
      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: c.text, lineHeight: 1.45, paddingBottom: 12, paddingRight: 4 }}>
        {msg}
      </div>

      {/* Bouton fermer */}
      <button
        onClick={e => { e.stopPropagation(); dismiss() }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, opacity: 0.5, fontSize: 16, lineHeight: 1, padding: '0 0 10px', flexShrink: 0 }}
      >×</button>

      {/* Barre de progression */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, height: 3,
        background: c.bar, borderRadius: '0 0 0 14px',
        animation: `toastProgress ${DURATION}ms linear forwards`,
      }}/>
    </div>
  )
}

// ── Conteneur principal ──────────────────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  const add = useCallback((msg, type) => {
    const id = Date.now() + Math.random()
    const resolvedType = type || detectType(msg)
    setToasts(t => [...t.slice(-4), { id, msg, type: resolvedType }])
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  // Enregistrement global + override de window.alert
  useEffect(() => {
    _addToast = add
    const origAlert = window.alert
    window.alert = (msg) => add(String(msg), detectType(String(msg)))
    return () => {
      _addToast = null
      window.alert = origAlert
    }
  }, [add])

  if (!toasts.length) return null

  return (
    <>
      {/* Keyframes injectées une fois */}
      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column-reverse',
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem {...t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </>
  )
}
