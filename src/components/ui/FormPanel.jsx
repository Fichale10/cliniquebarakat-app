const THEMES = {
  teal:    { grad: 'linear-gradient(90deg,#0d9488,#14b8a6)', bg: '#f0fdfa', border: '#99f6e4' },
  blue:    { grad: 'linear-gradient(90deg,#3b82f6,#0ea5e9)', bg: '#eff6ff', border: '#bfdbfe' },
  green:   { grad: 'linear-gradient(90deg,#16a34a,#0d9488)', bg: '#f0fdf4', border: '#bbf7d0' },
  orange:  { grad: 'linear-gradient(90deg,#f97316,#f59e0b)', bg: '#fff7ed', border: '#fed7aa' },
  emerald: { grad: 'linear-gradient(90deg,#059669,#0d9488)', bg: '#ecfdf5', border: '#a7f3d0' },
  purple:  { grad: 'linear-gradient(90deg,#7c3aed,#a855f7)', bg: '#faf5ff', border: '#e9d5ff' },
  amber:   { grad: 'linear-gradient(90deg,#d97706,#f59e0b)', bg: '#fffbeb', border: '#fde68a' },
}

const BARS = {
  teal: '#0d9488', blue: '#3b82f6', green: '#16a34a',
  orange: '#f97316', emerald: '#059669', purple: '#7c3aed', amber: '#d97706',
}

function FormPanel({ icon, title, subtitle, color = 'teal', onClose, children }) {
  const t = THEMES[color] || THEMES.teal
  return (
    <div style={{ borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ height: 3, background: t.grad }} />
      <div className="p-5 bg-white">
        {(icon || title) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            {icon && (
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: t.bg, border: `1.5px solid ${t.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 21, flexShrink: 0,
                boxShadow: '0 1px 5px rgba(0,0,0,0.07)',
              }}>
                {icon}
              </div>
            )}
            {(title || subtitle) && (
              <div style={{ flex: 1 }}>
                {title    && <p style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.3 }}>{title}</p>}
                {subtitle && <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '3px 0 0', letterSpacing: '.01em' }}>{subtitle}</p>}
              </div>
            )}
            {onClose && (
              <button type="button" onClick={onClose}
                style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20, lineHeight: 1, flexShrink: 0, transition: 'all .15s' }}
                className="hover:bg-slate-100 hover:!text-slate-600">
                ×
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function FormSection({ label, icon, color = 'teal', action, children, noTopMargin }) {
  const bar = BARS[color] || BARS.teal
  return (
    <div style={{ marginTop: noTopMargin ? 0 : 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <span style={{ width: 3, height: 15, background: bar, borderRadius: 99, flexShrink: 0 }} />
        {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
        {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
      </div>
      {children}
    </div>
  )
}

export default FormPanel
