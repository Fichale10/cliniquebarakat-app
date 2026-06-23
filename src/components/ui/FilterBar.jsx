function FilterBar({ search, onSearch, placeholder = '🔍 Rechercher…', children, activeCount = 0, onReset }) {
  return (
    <div className="filter-bar px-4 py-3 border-b border-slate-100 space-y-2.5 bg-slate-50/50">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🔍</span>
          <input
            style={{ borderRadius: '12px', border: '1.5px solid #e2e8f0', transition: 'border-color .15s, box-shadow .15s' }}
            className="w-full pl-9 pr-8 py-2.5 text-sm outline-none bg-white focus:border-teal-400"
            placeholder={placeholder}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={e => { e.target.style.borderColor = '#0d9488'; e.target.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)' }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold"
            >
              ✕
            </button>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 text-red-600 rounded-xl text-xs font-bold border border-red-200 transition-all whitespace-nowrap"
            style={{ background: '#fef2f2' }}
          >
            ✕ Reset <span className="bg-red-200 text-red-700 px-1.5 py-0.5 rounded-full text-xs font-black">{activeCount}</span>
          </button>
        )}
      </div>
      {children && <div className="flex flex-wrap gap-2 items-center">{children}</div>}
    </div>
  )
}

export default FilterBar
