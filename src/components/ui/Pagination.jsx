function Pagination({ page, totalPages, total, start, end, prev, next, setPage, hasPrev, hasNext }) {
  if (totalPages <= 1) return null

  const navBtn = (active, onClick, children, title) => (
    <button
      onClick={onClick}
      disabled={!active}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all
        ${active
          ? 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/80 hover:bg-green-50 hover:text-green-700 hover:ring-green-200 cursor-pointer'
          : 'text-slate-300 cursor-not-allowed'}`}
    >
      {children}
    </button>
  )

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60 rounded-b-xl">
      <span className="text-xs text-slate-400 font-medium">
        {start}–{end} <span className="text-slate-300">sur</span> {total}
      </span>
      <div className="flex items-center gap-1">
        {navBtn(hasPrev, () => setPage(1), '«', 'Première page')}
        {navBtn(hasPrev, prev, '‹', 'Page précédente')}
        <span className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs font-bold shadow-sm min-w-[56px] text-center">
          {page} / {totalPages}
        </span>
        {navBtn(hasNext, next, '›', 'Page suivante')}
        {navBtn(hasNext, () => setPage(totalPages), '»', 'Dernière page')}
      </div>
    </div>
  )
}

export default Pagination
