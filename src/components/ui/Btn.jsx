function Btn({ onClick, children, color = 'brand', sm, disabled, className = '' }) {
  const styles = {
    brand:  { background: 'linear-gradient(135deg,#166534,#1d4ed8)', boxShadow: '0 2px 12px rgba(22,101,52,0.28)' },
    accent: { background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 2px 12px rgba(234,88,12,0.35)' },
    blue:   { background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', boxShadow: '0 2px 10px rgba(37,99,235,0.3)' },
    slate:  { background: 'linear-gradient(135deg,#64748b,#475569)', boxShadow: '0 2px 8px rgba(71,85,105,0.2)' },
    green:  { background: 'linear-gradient(135deg,#22c55e,#15803d)', boxShadow: '0 2px 10px rgba(21,128,61,0.28)' },
    red:    { background: 'linear-gradient(135deg,#f87171,#dc2626)', boxShadow: '0 2px 10px rgba(220,38,38,0.28)' },
    amber:  { background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 2px 10px rgba(217,119,6,0.28)' },
  }
  const s = styles[color] || styles.brand
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s,
        border: 'none',
        borderRadius: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'all 0.18s cubic-bezier(.22,1,.36,1)',
      }}
      className={`text-white font-semibold hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-400 ${sm ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2'} ${className}`}
    >
      {children}
    </button>
  )
}

export default Btn
