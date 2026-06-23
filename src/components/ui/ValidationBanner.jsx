function ValidationBanner({ messages, onDismiss }) {
  if (!messages?.length) return null
  return (
    <div
      role="alert"
      style={{
        marginBottom: '16px',
        borderRadius: '12px',
        border: '1.5px solid #fca5a5',
        background: 'linear-gradient(135deg,#fef2f2,#fff5f5)',
        padding: '12px 16px',
        color: '#991b1b',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p style={{ fontSize: '13px', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span> Données invalides
          </p>
          <ul style={{ fontSize: '12.5px', listStyleType: 'disc', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {messages.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            style={{ color: '#f87171', fontSize: '18px', lineHeight: 1, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="Fermer"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

export default ValidationBanner
