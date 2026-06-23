function FilterSelect({ label, value, onChange, options }) {
  return (
    <select
      style={{
        border: `1.5px solid ${value ? '#0d9488' : '#e2e8f0'}`,
        borderRadius: '12px',
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: 600,
        outline: 'none',
        transition: 'all .15s',
        background: value ? '#f0fdfa' : 'white',
        color: value ? '#0f766e' : '#64748b',
        cursor: 'pointer',
        fontFamily: "'Outfit',sans-serif",
      }}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">{label}</option>
      {options.map(o => (
        <option key={o.v || o} value={o.v || o}>{o.l || o}</option>
      ))}
    </select>
  )
}

export default FilterSelect
