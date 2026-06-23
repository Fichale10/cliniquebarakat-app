function FilterBtns({ label, options, value, onChange, colorFn }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {label && (
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1">{label}</span>
      )}
      {options.map(o => {
        const active = value === o.v
        const color = colorFn ? colorFn(o.v) : 'teal'
        const activeStyles = {
          teal:   { bg: '#f0fdfa', border: '#0d9488', text: '#0f766e', badge: '#99f6e4' },
          green:  { bg: '#f0fdf4', border: '#22c55e', text: '#166534', badge: '#bbf7d0' },
          red:    { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', badge: '#fecaca' },
          blue:   { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', badge: '#bfdbfe' },
          orange: { bg: '#fff7ed', border: '#f97316', text: '#c2410c', badge: '#fed7aa' },
          purple: { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8', badge: '#e9d5ff' },
          yellow: { bg: '#fefce8', border: '#eab308', text: '#854d0e', badge: '#fde68a' },
        }[color] || { bg: '#f0fdfa', border: '#0d9488', text: '#0f766e', badge: '#99f6e4' }

        return (
          <button
            key={o.v}
            onClick={() => onChange(active ? '' : o.v)}
            style={active ? {
              background: activeStyles.bg,
              border: `1.5px solid ${activeStyles.border}`,
              color: activeStyles.text,
              borderRadius: '12px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              transition: 'all .15s',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            } : {
              background: 'white',
              border: '1.5px solid #e2e8f0',
              color: '#64748b',
              borderRadius: '12px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all .15s',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {o.l}
            {o.n !== undefined && (
              <span style={{
                marginLeft: '5px',
                padding: '1px 6px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                background: active ? activeStyles.badge : '#f1f5f9',
                color: active ? activeStyles.text : '#64748b',
              }}>
                {o.n}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default FilterBtns
