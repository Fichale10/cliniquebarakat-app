import { useState, useEffect, useMemo } from 'react'

function RappelsPanel({ rdvs }) {
  const [waSent, setWaSent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lb_rdv_wa_sent') || '{}') } catch { return {} }
  })
  const [pushList, setPushList] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lb_rdv_push') || '[]') } catch { return [] }
  })
  const [pushEnabled, setPushEnabled] = useState(false)

  useEffect(() => {
    setPushEnabled(typeof Notification !== 'undefined' && Notification.permission === 'granted')
  }, [])

  // Vérification chaque minute si un push est dû
  useEffect(() => {
    const fire = () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
      const now = new Date()
      const due = pushList.filter(p => !p.fired && new Date(p.fireAt) <= now)
      if (!due.length) return
      due.forEach(p => {
        try {
          new Notification('📅 La Barakat — Rappel RDV', {
            body: `${p.patient} · ${p.type} à ${p.heure}${p.duree ? ' (' + p.duree + ')' : ''}`,
            icon: '/logo.png',
          })
        } catch (e) { /* ignore */ }
      })
      const dueIds = new Set(due.map(p => p.id))
      const updated = pushList.map(p => dueIds.has(p.id) ? { ...p, fired: true } : p)
      setPushList(updated)
      localStorage.setItem('lb_rdv_push', JSON.stringify(updated))
    }
    const t = setInterval(fire, 60000)
    fire()
    return () => clearInterval(t)
  }, [pushList])

  // Auto-push matinal : notifie les RDV du jour à l'ouverture de l'app
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const today = new Date().toISOString().split('T')[0]
    const KEY = `lb_morning_push_${today}`
    if (localStorage.getItem(KEY)) return
    const todayRdvs = rdvs.filter(r => r.date === today && r.statut !== 'Annulé' && r.statut !== 'Terminé')
    if (!todayRdvs.length) return
    const first = todayRdvs.sort((a, b) => a.heure.localeCompare(b.heure))[0]
    try {
      new Notification(`📅 La Barakat — ${todayRdvs.length} RDV aujourd'hui`, {
        body: `Premier : ${first.heure} · ${first.patient} (${first.type})`,
        icon: '/logo.png',
      })
    } catch (e) { /* ignore */ }
    localStorage.setItem(KEY, '1')
  }, [rdvs])

  const today    = new Date().toISOString().split('T')[0]
  const dayLimit = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]

  const upcoming = useMemo(() => rdvs
    .filter(r => r.date >= today && r.date <= dayLimit && r.statut !== 'Annulé' && r.statut !== 'Terminé')
    .sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure)),
  [rdvs, today, dayLimit])

  if (!upcoming.length) return null

  const markWaSent = (rdvId) => {
    const u = { ...waSent, [rdvId]: new Date().toISOString() }
    setWaSent(u)
    localStorage.setItem('lb_rdv_wa_sent', JSON.stringify(u))
  }

  const buildWAText = (r) => {
    const dateLabel = new Date(r.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    return encodeURIComponent(
      `Bonjour ${r.proprio || r.patient} 👋\n\n` +
      `Rappel de votre RDV vétérinaire à La Barakat :\n` +
      `🐾 Patient : ${r.patient}\n` +
      `📅 ${dateLabel} à ${r.heure}${r.duree ? ' (' + r.duree + ')' : ''}\n` +
      (r.veterinaire ? `👨‍⚕️ Dr. ${r.veterinaire}\n` : '') +
      `\nMerci de confirmer votre présence. À bientôt ! 🐾`
    )
  }

  const sendWA = (r) => {
    const tel  = (r.tel || '').replace(/\D/g, '')
    const base = tel ? `https://wa.me/${tel}` : 'https://wa.me/'
    window.open(base + '?text=' + buildWAText(r), '_blank')
    markWaSent(r.id)
  }

  const sendBatchWA = () => {
    const unsent = upcoming.filter(r => r.tel && !waSent[r.id])
    if (!unsent.length) { alert('Aucun RDV avec numéro de téléphone non encore notifié.'); return }
    if (!confirm(`Envoyer ${unsent.length} rappel(s) WhatsApp ?`)) return
    unsent.forEach((r, i) => setTimeout(() => sendWA(r), i * 900))
  }

  const schedulePush = (r, value) => {
    if (!pushEnabled) {
      alert('Activez d\'abord les notifications Push dans Outils → Notifications Push.')
      return
    }
    let fireAt
    if (value === 'matin') {
      fireAt = new Date(r.date + 'T08:00:00')
    } else {
      fireAt = new Date(r.date + 'T' + r.heure + ':00')
      fireAt.setMinutes(fireAt.getMinutes() - parseInt(value))
    }
    if (fireAt <= new Date()) { alert('Ce rappel est déjà dans le passé.'); return }
    const entry = {
      id: `${r.id}-${value}`,
      rdvId: r.id,
      patient: r.patient,
      type: r.type,
      heure: r.heure,
      duree: r.duree || '',
      fireAt: fireAt.toISOString(),
      fired: false,
    }
    const updated = [...pushList.filter(p => p.rdvId !== r.id), entry]
    setPushList(updated)
    localStorage.setItem('lb_rdv_push', JSON.stringify(updated))
    const mins = Math.round((fireAt - new Date()) / 60000)
    alert(`✅ Rappel push programmé dans ${mins < 60 ? mins + ' min' : Math.round(mins / 60) + 'h'}`)
  }

  const cancelPush = (rdvId) => {
    const updated = pushList.filter(p => p.rdvId !== rdvId)
    setPushList(updated)
    localStorage.setItem('lb_rdv_push', JSON.stringify(updated))
  }

  const getPush = (rdvId) => pushList.find(p => p.rdvId === rdvId && !p.fired)

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const dayLabel = (d) => {
    if (d === today)    return "Aujourd'hui"
    if (d === tomorrow) return 'Demain'
    return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const grouped = upcoming.reduce((acc, r) => {
    acc[r.date] = [...(acc[r.date] || []), r]
    return acc
  }, {})

  const countUnsent = upcoming.filter(r => r.tel && !waSent[r.id]).length

  return (
    <div className="app-card">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-black flex items-center gap-2">📲 Rappels patients</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {upcoming.length} RDV dans les 3 prochains jours
            {countUnsent > 0 && ` · ${countUnsent} rappel(s) WA à envoyer`}
          </p>
        </div>
        {countUnsent > 0 && (
          <button onClick={sendBatchWA}
            style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            📲 Envoyer {countUnsent} rappel{countUnsent > 1 ? 's' : ''} WA
          </button>
        )}
      </div>

      <div className="p-4 space-y-5">
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2 pl-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{dayLabel(date)}</span>
              {date === today && (
                <span style={{ fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', borderRadius: 99, padding: '1px 7px' }}>
                  Aujourd'hui
                </span>
              )}
            </div>
            <div className="space-y-2">
              {items.map(r => {
                const waEnvoye = !!waSent[r.id]
                const hasTel   = !!r.tel
                const push     = getPush(r.id)
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#f8fafc', border: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                    {/* Info RDV */}
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }} className="truncate">{r.patient}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        {r.heure}{r.duree ? ' · ' + r.duree : ''} · {r.type}
                        {r.proprio ? ` · ${r.proprio}` : ''}
                        {r.tel ? ` · 📞 ${r.tel}` : ' · ⚠️ Pas de tél'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
                      {/* Bouton WhatsApp */}
                      {hasTel ? (
                        <button onClick={() => sendWA(r)}
                          style={{ padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', border: '1px solid #bbf7d0', background: waEnvoye ? '#f0fdf4' : 'white', color: '#16a34a', opacity: waEnvoye ? .75 : 1 }}>
                          {waEnvoye ? '✓ WA envoyé' : '📲 WhatsApp'}
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: '#cbd5e1', padding: '5px 8px' }}>Pas de tél</span>
                      )}

                      {/* Push notification */}
                      {pushEnabled ? (
                        push ? (
                          <button onClick={() => cancelPush(r.id)}
                            title="Annuler ce rappel push"
                            style={{ padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            🔔 {new Date(push.fireAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ×
                          </button>
                        ) : (
                          <select
                            defaultValue=""
                            onChange={e => { if (e.target.value) { schedulePush(r, e.target.value); e.target.value = '' } }}
                            style={{ padding: '5px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid #e2e8f0', background: 'white', color: '#475569', cursor: 'pointer' }}>
                            <option value="">🔔 Push…</option>
                            <option value="15">15 min avant</option>
                            <option value="30">30 min avant</option>
                            <option value="60">1h avant</option>
                            <option value="120">2h avant</option>
                            <option value="matin">Matin même (8h)</option>
                          </select>
                        )
                      ) : (
                        <span style={{ fontSize: 11, color: '#cbd5e1', padding: '5px 8px' }}>Push off</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Note SMS */}
        <div style={{ display: 'flex', gap: 10, padding: '11px 14px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a' }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>📡</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>SMS automatiques (Africa's Talking, Orange Togo…)</div>
            <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
              Les SMS nécessitent une clé API côté serveur. En attendant l'intégration, les rappels WhatsApp ci-dessus sont équivalents et largement utilisés au Togo.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RappelsPanel
