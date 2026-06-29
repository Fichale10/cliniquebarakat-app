export function EmptyState({ icon = '📋', title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '52px 24px', textAlign: 'center',
      userSelect: 'none',
    }}>
      {/* Icône dans un cercle dégradé */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, #f0fdf4, #dbeafe)',
        border: '2px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 34, marginBottom: 18,
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}>
        {icon}
      </div>

      {/* Titre */}
      <p style={{ fontWeight: 800, fontSize: 15, color: '#334155', margin: 0 }}>
        {title}
      </p>

      {/* Sous-titre */}
      {subtitle && (
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6, maxWidth: 280, lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}

      {/* Bouton action */}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 18, padding: '9px 20px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #166534, #1d4ed8)',
            color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(22,101,52,0.3)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
