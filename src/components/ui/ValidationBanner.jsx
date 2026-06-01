function ValidationBanner({ messages, onDismiss }) {
  if (!messages?.length) return null
  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold mb-1">Données invalides</p>
          <ul className="text-sm list-disc pl-4 space-y-0.5">
            {messages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0"
            aria-label="Fermer"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

export default ValidationBanner
