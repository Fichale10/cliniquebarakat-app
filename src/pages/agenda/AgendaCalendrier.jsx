import { useState } from 'react'

function AgendaCalendrier({ rdvs, onDayClick }) {
  const [moisOffset, setMoisOffset] = useState(0)

  const now      = new Date()
  const moisRef  = new Date(now.getFullYear(), now.getMonth() + moisOffset, 1)
  const moisNom  = moisRef.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const premierJour = moisRef.getDay() || 7
  const nbJours  = new Date(moisRef.getFullYear(), moisRef.getMonth() + 1, 0).getDate()
  const jours    = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  const COLORS = {
    Consultation: '#3b82f6', Vaccination: '#22c55e', Chirurgie: '#a855f7',
    Urgence: '#ef4444', 'Contrôle post-op': '#f97316', Autre: '#64748b',
  }

  const rdvParJour = {}
  rdvs.forEach(r => {
    if (!rdvParJour[r.date]) rdvParJour[r.date] = []
    rdvParJour[r.date].push(r)
  })

  const cells = []
  for (let i = 1; i < premierJour; i++) cells.push(null)
  for (let d = 1; d <= nbJours; d++) cells.push(d)

  const todayStr = new Date().toISOString().split('T')[0]

  const mkDate = (d) => {
    const mm = String(moisRef.getMonth() + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${moisRef.getFullYear()}-${mm}-${dd}`
  }

  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => setMoisOffset(m => m - 1)}
          style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 16 }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', textTransform: 'capitalize' }}>{moisNom}</span>
        <button onClick={() => setMoisOffset(m => m + 1)}
          style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 16 }}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, background: '#f1f5f9' }}>
        {jours.map(j => (
          <div key={j} style={{ background: '#f8fafc', padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            {j}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} style={{ background: 'white', minHeight: 72 }} />
          const dateStr  = mkDate(d)
          const rdvsJour = rdvParJour[dateStr] || []
          const isToday  = dateStr === todayStr
          const isPast   = dateStr < todayStr
          return (
            <div
              key={d}
              onClick={() => onDayClick?.(dateStr)}
              title={onDayClick ? `Créer un RDV le ${dateStr}` : undefined}
              style={{
                background: 'white',
                minHeight: 72,
                padding: 4,
                position: 'relative',
                borderTop: isToday ? '2px solid #0d9488' : '2px solid transparent',
                cursor: onDayClick ? 'pointer' : 'default',
                transition: 'background .12s',
              }}
              onMouseEnter={e => { if (onDayClick) e.currentTarget.style.background = '#f8fffe' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
            >
              <div style={{
                fontSize: 12,
                fontWeight: isToday ? 900 : 500,
                color: isToday ? '#0f766e' : isPast ? '#cbd5e1' : '#1e293b',
                width: 22, height: 22, borderRadius: '50%',
                background: isToday ? '#f0fdfa' : 'transparent',
                border: isToday ? '1.5px solid #99f6e4' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2,
              }}>
                {d}
              </div>
              {rdvsJour.slice(0, 3).map((r, ri) => (
                <div key={ri} style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 4px', borderRadius: 3, marginBottom: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  background: (COLORS[r.type] || '#64748b') + '20',
                  color: COLORS[r.type] || '#64748b',
                }}>
                  {r.heure} {r.patient}
                </div>
              ))}
              {rdvsJour.length > 3 && (
                <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>+{rdvsJour.length - 3}</div>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
        Cliquer sur un jour pour créer un rendez-vous
      </div>
    </div>
  )
}

export default AgendaCalendrier
