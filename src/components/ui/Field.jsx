function Field({ label, value, onChange, type = 'text', placeholder = '', options, rows, className = '', error }) {
  const base = {
    border: `1.5px solid ${error ? '#f87171' : '#e2e8f0'}`,
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '13.5px',
    width: '100%',
    outline: 'none',
    fontFamily: "'Outfit', sans-serif",
    color: 'var(--app-text)',
    background: 'var(--app-surface)',
    transition: 'border-color .18s, box-shadow .18s',
    lineHeight: '1.45',
  }
  const focus = (e) => {
    e.target.style.borderColor = error ? '#f87171' : '#0d9488'
    e.target.style.boxShadow = error
      ? '0 0 0 3.5px rgba(248,113,113,0.16)'
      : '0 0 0 3.5px rgba(13,148,136,0.14)'
  }
  const blur = (e) => {
    e.target.style.borderColor = error ? '#f87171' : '#e2e8f0'
    e.target.style.boxShadow = 'none'
  }
  return (
    <div className={className}>
      <label style={{
        fontSize: '11px', fontWeight: 700,
        color: error ? '#dc2626' : '#64748b',
        letterSpacing: '.06em', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: '5px',
        marginBottom: '6px', userSelect: 'none',
      }}>
        {error && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', display: 'inline-block', flexShrink: 0 }} />}
        {label}
      </label>
      {options ? (
        <select style={{ ...base, cursor: 'pointer' }} value={value} onChange={onChange} onFocus={focus} onBlur={blur}>
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : rows ? (
        <textarea rows={rows} style={{ ...base, resize: 'vertical', lineHeight: '1.6' }} placeholder={placeholder} value={value} onChange={onChange} onFocus={focus} onBlur={blur} />
      ) : (
        <input type={type} style={base} placeholder={placeholder} value={value} onChange={onChange} onFocus={focus} onBlur={blur} />
      )}
      {error && (
        <p style={{ fontSize: '11px', color: '#dc2626', marginTop: '5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '14px', lineHeight: 1 }}>⚠</span>{error}
        </p>
      )}
    </div>
  )
}

export default Field
