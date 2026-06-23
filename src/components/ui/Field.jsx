function Field({ label, value, onChange, type = 'text', placeholder = '', options, rows, className = '', error }) {
  const base = {
    border: error ? '1.5px solid #f87171' : '1.5px solid #e2e8f0',
    borderRadius: '10px',
    padding: '9px 12px',
    fontSize: '13.5px',
    width: '100%',
    outline: 'none',
    fontFamily: "'Outfit',sans-serif",
    color: 'var(--app-text)',
    background: 'var(--app-surface)',
    transition: 'border-color .15s, box-shadow .15s',
  }
  const focus = (e) => {
    e.target.style.borderColor = '#0d9488'
    e.target.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)'
  }
  const blur = (e) => {
    e.target.style.borderColor = error ? '#f87171' : '#e2e8f0'
    e.target.style.boxShadow = 'none'
  }
  return (
    <div className={className}>
      <label style={{
        fontSize: '11px', fontWeight: 700, color: '#64748b',
        letterSpacing: '.05em', textTransform: 'uppercase',
        display: 'block', marginBottom: '6px',
      }}>
        {label}
      </label>
      {options ? (
        <select style={base} value={value} onChange={onChange} onFocus={focus} onBlur={blur}>
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : rows ? (
        <textarea rows={rows} style={{ ...base, resize: 'vertical' }} placeholder={placeholder} value={value} onChange={onChange} onFocus={focus} onBlur={blur} />
      ) : (
        <input type={type} style={base} placeholder={placeholder} value={value} onChange={onChange} onFocus={focus} onBlur={blur} />
      )}
      {error && (
        <p style={{ fontSize: '11px', color: '#dc2626', marginTop: '5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>⚠</span>{error}
        </p>
      )}
    </div>
  )
}

export default Field
