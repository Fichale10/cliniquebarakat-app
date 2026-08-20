import { Lock } from 'lucide-react'

function Interdit() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] rounded-2xl border-2 border-dashed border-[var(--app-border)] bg-[var(--app-surface)] p-8">
      <div className="mb-4" style={{ width:76, height:76, borderRadius:'50%', background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Lock size={32} color="#dc2626" strokeWidth={2} />
      </div>
      <h3 className="font-bold text-xl text-[var(--app-text)] mb-1">Accès réservé</h3>
      <p className="text-[var(--app-muted)] text-sm text-center max-w-sm">Cette section est accessible aux administrateurs uniquement.</p>
    </div>
  )
}

export default Interdit
