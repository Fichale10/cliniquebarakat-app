function Badge({ children, color = 'slate' }) {
  const c = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    cyan: 'bg-cyan-100 text-cyan-700',
  }
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c[color]}`}>{children}</span>
}

export default Badge
