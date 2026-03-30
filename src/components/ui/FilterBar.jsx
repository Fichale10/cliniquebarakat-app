function FilterBar({
  search,
  onSearch,
  placeholder = '🔍 Rechercher…',
  children,
  activeCount = 0,
  onReset,
}) {
  return (
    <div className="filter-bar p-3 space-y-2">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            className="w-full border-2 border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:border-blue-400 outline-none bg-white"
            placeholder={placeholder}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold border border-red-200 transition-all whitespace-nowrap"
          >
            ✕ Réinitialiser <span className="bg-red-200 px-1.5 rounded-full">{activeCount}</span>
          </button>
        )}
      </div>
      {children && <div className="flex flex-wrap gap-2 items-center">{children}</div>}
    </div>
  )
}

export default FilterBar
