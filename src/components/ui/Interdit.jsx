function Interdit() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] rounded-2xl border-2 border-dashed border-[var(--app-border)] bg-[var(--app-surface)] p-8">
      <div className="text-6xl mb-4">🔒</div>
      <h3 className="font-bold text-xl text-[var(--app-text)] mb-1">Accès réservé</h3>
      <p className="text-[var(--app-muted)] text-sm text-center max-w-sm">Cette section est accessible aux administrateurs uniquement.</p>
    </div>
  )
}

export default Interdit
