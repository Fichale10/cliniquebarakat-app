function Field({ label, value, onChange, type = 'text', placeholder = '', options, rows, className = '' }) {
  const inp = {
    border: '1.5px solid var(--app-border)',
    borderRadius: '9px',
    padding: '8px 11px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    fontFamily: "'Outfit',sans-serif",
    color: 'var(--app-text)',
    background: 'var(--app-surface)',
    transition: 'border-color .15s, box-shadow .15s',
  }
  const focus = (e) => {
    e.target.style.borderColor = '#166534'
    e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.08)'
  }
  const blur = (e) => {
    e.target.style.borderColor = 'var(--app-border)'
    e.target.style.boxShadow = 'none'
  }
  return (
    <div className={className}>
      <label
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--app-muted)',
          letterSpacing: '.04em',
          textTransform: 'uppercase',
          display: 'block',
          marginBottom: '5px',
        }}
      >
        {label}
      </label>
      {options ? (
        <select style={inp} value={value} onChange={onChange} onFocus={focus} onBlur={blur}>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : rows ? (
        <textarea rows={rows} style={{ ...inp, resize: 'vertical' }} placeholder={placeholder} value={value} onChange={onChange} onFocus={focus} onBlur={blur} />
      ) : (
        <input type={type} style={inp} placeholder={placeholder} value={value} onChange={onChange} onFocus={focus} onBlur={blur} />
      )}
    </div>
  )
}

export default Field
