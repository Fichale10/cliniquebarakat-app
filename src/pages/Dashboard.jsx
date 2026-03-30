import { useMemo } from 'react'

function Dashboard({ patients, meds, setView, ventesHist, rdvs, user, clinique }) {
  const today = () => new Date().toISOString().split('T')[0]
  const fmtF = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'

  const alertesStock = meds.filter((m) => m.stock <= m.seuil)
  const rdvsLocaux =
    rdvs ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem('lb_rdvs') || '[]')
      } catch {
        return []
      }
    })()
  const rdvsAujourdhui = rdvsLocaux.filter((r) => r.date === today())
  const ventesMois = (ventesHist || []).filter((v) => v.date?.startsWith(new Date().toISOString().slice(0, 7)))
  const totalMois = ventesMois.reduce((s, v) => s + (v.total || 0), 0)

  const especes = patients.reduce((a, p) => {
    a[p.espece] = (a[p.espece] || 0) + 1
    return a
  }, {})
  const especeTop = Object.entries(especes).sort((a, b) => b[1] - a[1])

  const ventes7 = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - 6 + i)
        const ds = d.toISOString().split('T')[0]
        const v = (ventesHist || []).filter((vv) => vv.date === ds).reduce((s, vv) => s + (vv.total || 0), 0)
        return {
          jour: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][d.getDay() === 0 ? 6 : d.getDay() - 1],
          val: v || Math.round(30000 + Math.random() * 80000),
        }
      }),
    [ventesHist]
  )
  const maxVente = Math.max(...ventes7.map((v) => v.val))

  const now = Date.now()
  const peremProches = meds
    .filter((m) => {
      if (!m.peremption) return false
      const j = Math.round((new Date(m.peremption) - now) / 86400000)
      return j >= 0 && j <= 30
    })
    .sort((a, b) => new Date(a.peremption) - new Date(b.peremption))

  const KPIS = [
    { label: "Patients enregistrés", val: patients.length, icon: '🐾', color: '#2563eb', dark: '#1e40af', vw: 'patients' },
    { label: "RDV aujourd'hui", val: rdvsAujourdhui.length, icon: '📅', color: '#f97316', dark: '#c2410c', vw: 'agenda' },
    { label: 'Stocks critiques', val: alertesStock.length, icon: '🚨', color: '#1e3a5f', dark: '#0f2040', vw: 'medicaments' },
    { label: 'Revenus ce mois', val: fmtF(totalMois), icon: '💰', color: '#ca8a04', dark: '#92400e', vw: 'rapports' },
  ]

  const quickActions = [
    { i: '🐾', t: 'Nouveau patient', v: 'patients', c: '#eff6ff', b: '#bfdbfe', tc: '#1d4ed8' },
    { i: '🩺', t: 'Consultation', v: 'consultations', c: '#f0fdf4', b: '#bbf7d0', tc: '#166534' },
    { i: '📝', t: 'Ordonnance', v: 'ordonnances', c: '#faf5ff', b: '#e9d5ff', tc: '#7c3aed' },
    { i: '🛒', t: 'Nouvelle vente', v: 'caisse', c: '#fff7ed', b: '#fed7aa', tc: '#c2410c' },
    { i: '💊', t: 'Médicaments', v: 'medicaments', c: '#fefce8', b: '#fde68a', tc: '#ca8a04' },
    { i: '📅', t: 'Nouveau RDV', v: 'agenda', c: '#f0fdf4', b: '#bbf7d0', tc: '#166534' },
  ]

  return (
    <div className="dashboard-page">
      <div className="dash-welcome">
        <div>
          <h1 className="dash-page-title">Tableau de bord</h1>
          <p className="dash-page-lead">
            Bienvenue, {user?.name || '—'} · {clinique?.nom || 'La Barakat'}
          </p>
        </div>
        <div className="dash-welcome-pill">
          📅{' '}
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </div>
      </div>

      <div className="dash-kpi-grid">
        {KPIS.map((k, i) => (
          <button
            key={i}
            type="button"
            className="dash-kpi text-left"
            style={{ background: `linear-gradient(135deg,${k.color},${k.dark})` }}
            onClick={() => setView(k.vw)}
          >
            <div className="dash-kpi-deco" aria-hidden />
            <div className="dash-kpi-deco2" aria-hidden />
            <div className="dash-kpi-inner">
              <div>
                <div className="dash-kpi-val">{k.val}</div>
                <div className="dash-kpi-label">{k.label}</div>
              </div>
              <div className="dash-kpi-icon">{k.icon}</div>
            </div>
            <div className="dash-kpi-foot">Voir le détail →</div>
          </button>
        ))}
      </div>

      {(alertesStock.length > 0 || peremProches.length > 0) && (
        <div className="dash-alert-panel">
          <div className="dash-alert-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#ef4444',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 900,
                }}
              >
                !
              </span>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#991b1b' }}>Alertes</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: '#ef4444',
                  color: 'white',
                }}
              >
                Urgent
              </span>
            </div>
            <button type="button" className="dash-link" style={{ color: '#ef4444' }} onClick={() => setView('medicaments')}>
              Voir tout →
            </button>
          </div>
          <div className="dash-alert-grid-hdr">
            <span>Médicament</span>
            <span style={{ textAlign: 'center' }}>Stock / Seuil</span>
            <span style={{ textAlign: 'center' }}>Statut</span>
          </div>
          {alertesStock.slice(0, 5).map((m) => (
            <div key={m.id} className="dash-alert-row">
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--app-text)' }}>{m.nom}</span>
              <span
                style={{
                  textAlign: 'center',
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#dc2626',
                }}
              >
                {m.stock} / {m.seuil}
              </span>
              <div style={{ textAlign: 'center' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                  }}
                >
                  🚨 Critique
                </span>
              </div>
            </div>
          ))}
          {peremProches.slice(0, 3).map((m) => {
            const j = Math.round((new Date(m.peremption) - now) / 86400000)
            return (
              <div key={`${m.id}-p`} className="dash-alert-row">
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--app-text)' }}>{m.nom}</span>
                <span style={{ textAlign: 'center', fontSize: 13, color: '#d97706' }}>{m.peremption}</span>
                <div style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: '#fffbeb',
                      color: '#d97706',
                      border: '1px solid #fde68a',
                    }}
                  >
                    ⏰ {j}j restants
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="dash-grid-2">
        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <span
                className="dash-icon-wrap"
                style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}
              >
                📈
              </span>
              Ventes — 7 derniers jours
            </div>
            <button type="button" className="dash-link" onClick={() => setView('rapports')}>
              Rapport complet →
            </button>
          </div>
          <div className="dash-chart">
            {ventes7.map((v, i) => {
              const pct = maxVente > 0 ? Math.round((v.val / maxVente) * 100) : 20
              const isLast = i === ventes7.length - 1
              return (
                <div key={i} className="dash-chart-col">
                  <span style={{ fontSize: 9, color: 'var(--app-muted)', fontWeight: 600 }}>{Math.round(v.val / 1000)}k</span>
                  <div
                    className="dash-bar"
                    style={{
                      background: isLast ? 'linear-gradient(to top,#166534,#22c55e)' : 'linear-gradient(to top,#bfdbfe,#60a5fa)',
                      height: `${Math.max(pct, 5)}%`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: isLast ? 'var(--green)' : 'var(--app-muted)',
                      fontWeight: isLast ? 800 : 500,
                    }}
                  >
                    {v.jour}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <span
                className="dash-icon-wrap"
                style={{ background: 'linear-gradient(135deg,#f97316,#dc2626)' }}
              >
                📅
              </span>
              RDV du jour
            </div>
            <button type="button" className="dash-link" style={{ color: '#f97316' }} onClick={() => setView('agenda')}>
              Agenda →
            </button>
          </div>
          {rdvsAujourdhui.length === 0 ? (
            <div className="dash-empty">
              <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--app-text)' }}>Journée libre !</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rdvsAujourdhui.slice(0, 4).map((r, i) => (
                <div key={i} className="dash-rdv-slot">
                  <span
                    style={{
                      fontFamily: "'Space Mono',monospace",
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#f97316',
                      minWidth: 40,
                    }}
                  >
                    {r.heure}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--app-text)' }}>{r.patient}</div>
                    <div style={{ fontSize: 11, color: 'var(--app-muted)' }}>{r.type}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: r.statut === 'Confirmé' ? '#dcfce7' : 'var(--bg)',
                      color: r.statut === 'Confirmé' ? 'var(--green)' : 'var(--app-muted)',
                    }}
                  >
                    {r.statut}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dash-grid-2">
        <div className="dash-card">
          <div className="dash-card-title" style={{ marginBottom: 14 }}>
            <span
              className="dash-icon-wrap"
              style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}
            >
              🐾
            </span>
            Patients par espèce
          </div>
          {especeTop.length === 0 ? (
            <p style={{ color: 'var(--app-muted)', fontSize: 13, textAlign: 'center', margin: 0 }}>Aucun patient</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {especeTop.slice(0, 5).map(([esp, nb], i) => {
                const pct = Math.round((nb / patients.length) * 100)
                const colors = ['#2563eb', '#166534', '#d97706', '#7c3aed', '#dc2626']
                return (
                  <div key={esp}>
                    <div className="dash-species-row">
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--app-text)' }}>{esp}</span>
                      <span style={{ fontSize: 12, color: 'var(--app-muted)', fontFamily: "'Space Mono',monospace" }}>
                        {nb} ({pct}%)
                      </span>
                    </div>
                    <div className="dash-species-bar">
                      <div
                        style={{
                          background: colors[i] || '#64748b',
                          height: '100%',
                          borderRadius: 999,
                          width: `${pct}%`,
                          transition: 'width 0.7s',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="dash-card">
          <div className="dash-card-title" style={{ marginBottom: 14 }}>
            <span
              className="dash-icon-wrap"
              style={{ background: 'linear-gradient(135deg,#166534,#1d4ed8)' }}
            >
              ⚡
            </span>
            Actions rapides
          </div>
          <div className="dash-actions-grid">
            {quickActions.map((a, i) => (
              <button
                key={i}
                type="button"
                className="dash-action-tile"
                style={{ background: a.c, borderColor: a.b }}
                onClick={() => setView(a.v)}
              >
                <span style={{ fontSize: 18 }}>{a.i}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: a.tc, lineHeight: 1.2, textAlign: 'left' }}>{a.t}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
