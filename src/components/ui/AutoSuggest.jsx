function AutoSuggest({ value, onChange, list, onSelect, placeholder }) {
  const sugg = value.length > 1 ? list.filter((x) => x.nom.toLowerCase().includes(value.toLowerCase())) : []
  return (
    <div className="relative">
      <input
        className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none bg-white text-slate-800"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      {sugg.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-30 bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-40 overflow-y-auto">
          {sugg.map((s, i) => (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(s)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(s)}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm flex gap-2"
            >
              <span className="font-semibold text-slate-800">{s.nom}</span>
              {s.espece && <span className="text-slate-400">{s.espece}</span>}
              {s.proprio && <span className="text-slate-400">· {s.proprio}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AutoSuggest
