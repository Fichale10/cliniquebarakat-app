function Badge({ children, color = 'slate' }) {
  const c = {
    slate:  'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
    blue:   'bg-blue-50   text-blue-700   ring-1 ring-blue-200/80',
    green:  'bg-green-50  text-green-700  ring-1 ring-green-200/80',
    yellow: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200/80',
    red:    'bg-red-50    text-red-700    ring-1 ring-red-200/80',
    purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200/80',
    orange: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200/80',
    cyan:   'bg-cyan-50   text-cyan-700   ring-1 ring-cyan-200/80',
  }
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${c[color] || c.slate}`}>
      {children}
    </span>
  )
}

export default Badge
