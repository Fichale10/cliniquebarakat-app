import { useMemo } from 'react'

function Dashboard({ patients, meds, setView, ventesHist, rdvs, user, clinique }) {
  const today = () => new Date().toISOString().split('T')[0]
  const fmtF = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'

  const alertesStock = meds.filter((m) => m.stock <= m.seuil)
  const rdvsLocaux =
    rdvs ||
    (() => {
      try { return JSON.parse(localStorage.getItem('lb_rdvs') || '[]') }
      catch { return [] }
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
          val: v,
        }
      }),
    [ventesHist]
  )
  const maxVente = Math.max(...ventes7.map((v) => v.val), 1)

  const now = Date.now()
  const peremProches = meds
    .filter((m) => {
      if (!m.peremption) return false
      const j = Math.round((new Date(m.peremption) - now) / 86400000)
      return j >= 0 && j <= 30
    })
    .sort((a, b) => new Date(a.peremption) - new Date(b.peremption))

  const KPIS = [
    {
      label: 'Patients enregistrés', val: patients.length, icon: '🐾',
      grad: 'linear-gradient(135deg,#0d9488,#14b8a6)',
      shadow: 'rgba(13,148,136,0.4)', vw: 'patients', sub: 'animaux suivis',
    },
    {
      label: "RDV aujourd'hui", val: rdvsAujourdhui.length, icon: '📅',
      grad: 'linear-gradient(135deg,#7c3aed,#a855f7)',
      shadow: 'rgba(124,58,237,0.4)', vw: 'agenda', sub: 'rendez-vous',
    },
    {
      label: 'Stocks critiques', val: alertesStock.length, icon: '🚨',
      grad: 'linear-gradient(135deg,#dc2626,#f87171)',
      shadow: 'rgba(220,38,38,0.4)', vw: 'medicaments', sub: 'médicaments en alerte',
    },
    {
      label: 'Revenus ce mois', val: fmtF(totalMois), icon: '💰',
      grad: 'linear-gradient(135deg,#b45309,#f59e0b)',
      shadow: 'rgba(180,83,9,0.4)', vw: 'rapports', sub: 'FCFA encaissés',
    },
  ]

  const quickActions = [
    { i: '🐾', t: 'Nouveau patient',  d: 'Enregistrer un animal',    v: 'patients',      c: '#f0fdfa', b: '#99f6e4', tc: '#0d9488' },
    { i: '🩺', t: 'Consultation',     d: 'Ouvrir un dossier',        v: 'consultations', c: '#f0fdfa', b: '#5eead4', tc: '#0f766e' },
    { i: '📝', t: 'Ordonnance',       d: 'Rédiger une ordonnance',   v: 'ordonnances',   c: '#faf5ff', b: '#d8b4fe', tc: '#7c3aed' },
    { i: '🛒', t: 'Nouvelle vente',   d: 'Caisse & facturation',     v: 'caisse',        c: '#fff7ed', b: '#fed7aa', tc: '#c2410c' },
    { i: '💊', t: 'Médicaments',      d: 'Gérer le stock',           v: 'medicaments',   c: '#fefce8', b: '#fde68a', tc: '#ca8a04' },
    { i: '📅', t: 'Nouveau RDV',      d: 'Planifier un rendez-vous', v: 'agenda',        c: '#eff6ff', b: '#bfdbfe', tc: '#1d4ed8' },
  ]

  const speciesColors = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626']

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dash-welcome">
        <div>
          <h1 className="dash-page-title">Tableau de bord</h1>
          <p className="dash-page-lead">
            Bienvenue, <strong>{user?.name || '—'}</strong> · {clinique?.nom || 'La Barakat'}
          </p>
        </div>
        <div className="dash-welcome-pill">
          📅{' '}
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dash-kpi-grid">
        {KPIS.map((k, i) => (
          <button
            key={i}
            type="button"
            className="dash-kpi text-left"
            style={{ background: k.grad, boxShadow: `0 8px 32px ${k.shadow}` }}
            onClick={() => setView(k.vw)}
          >
            <div className="dash-kpi-deco"  aria-hidden />
            <div className="dash-kpi-deco2" aria-hidden />
            <div className="dash-kpi-inner">
              <div>
                <div className="dash-kpi-val">{k.val}</div>
                <div className="dash-kpi-label">{k.label}</div>
              </div>
              <div className="dash-kpi-icon" style={{ fontSize: 22 }}>{k.icon}</div>
            </div>
            <div className="dash-kpi-foot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{k.sub}</span>
              <span>Voir →</span>
            </div>
          </button>
        ))}
      </div>

      {/* Alerts */}
      {(alertesStock.length > 0 || peremProches.length > 0) && (
        <div className="dash-alert-panel">
          <div className="dash-alert-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#ef4444', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 900 }}>!</span>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#991b1b' }}>Alertes</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#ef4444', color: 'white' }}>
                {alertesStock.length + peremProches.length} urgent{alertesStock.length + peremProches.length > 1 ? 's' : ''}
              </span>
            </div>
            <button type="button" className="dash-link" style={{ color: '#ef4444' }} onClick={() => setView('medicaments')}>
              Gérer le stock →
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
              <span style={{ textAlign: 'center', fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
                {m.stock} / {m.seuil}
              </span>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
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
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>
                    ⏰ {j}j restants
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="dash-grid-2">
        {/* Sales chart */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <span className="dash-icon-wrap" style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>📈</span>
              Ventes — 7 derniers jours
            </div>
            <button type="button" className="dash-link" onClick={() => setView('rapports')}>Rapport →</button>
          </div>
          <div className="dash-chart" style={{ height: 120, alignItems: 'flex-end', gap: 5 }}>
            {ventes7.map((v, i) => {
              const pct = Math.max(Math.round((v.val / maxVente) * 100), v.val > 0 ? 8 : 4)
              const isLast = i === ventes7.length - 1
              const hasVal = v.val > 0
              return (
                <div key={i} className="dash-chart-col" title={`${v.jour}: ${new Intl.NumberFormat('fr-FR').format(v.val)} F`}>
                  {hasVal && (
                    <span style={{ fontSize: 9, color: isLast ? '#0d9488' : '#94a3b8', fontWeight: 700, marginBottom: 2 }}>
                      {v.val >= 1000 ? `${Math.round(v.val / 1000)}k` : v.val}
                    </span>
                  )}
                  <div
                    className="dash-bar"
                    style={{
                      background: isLast
                        ? 'linear-gradient(to top,#0d9488,#5eead4)'
                        : hasVal
                          ? 'linear-gradient(to top,#ccfbf1,#14b8a6)'
                          : '#f1f5f9',
                      height: `${pct}%`,
                      borderRadius: '6px 6px 4px 4px',
                      width: '100%',
                      transition: 'height 0.6s cubic-bezier(.22,1,.36,1)',
                    }}
                  />
                  <span style={{ fontSize: 9, color: isLast ? '#0d9488' : '#94a3b8', fontWeight: isLast ? 800 : 500, marginTop: 3 }}>
                    {v.jour}
                  </span>
                </div>
              )
            })}
          </div>
          {ventes7.every((v) => v.val === 0) && (
            <p style={{ fontSize: 12, textAlign: 'center', color: 'var(--app-muted)', marginTop: 8 }}>
              Aucune vente enregistrée cette semaine
            </p>
          )}
        </div>

        {/* RDV du jour */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <span className="dash-icon-wrap" style={{ background: 'linear-gradient(135deg,#f97316,#dc2626)' }}>📅</span>
              RDV du jour
              {rdvsAujourdhui.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
                  {rdvsAujourdhui.length}
                </span>
              )}
            </div>
            <button type="button" className="dash-link" style={{ color: '#f97316' }} onClick={() => setView('agenda')}>Agenda →</button>
          </div>
          {rdvsAujourdhui.length === 0 ? (
            <div className="dash-empty">
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--app-text)' }}>Journée libre !</div>
              <div style={{ fontSize: 11, color: 'var(--app-muted)', marginTop: 2 }}>Aucun rendez-vous aujourd'hui</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rdvsAujourdhui.slice(0, 4).map((r, i) => (
                <div key={i} className="dash-rdv-slot" style={{ gap: 10 }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 800, color: '#f97316', minWidth: 44, flexShrink: 0 }}>
                    {r.heure}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--app-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.patient}</div>
                    <div style={{ fontSize: 11, color: 'var(--app-muted)' }}>{r.type}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, flexShrink: 0,
                    background: r.statut === 'Confirmé' ? '#dcfce7' : '#f1f5f9',
                    color:      r.statut === 'Confirmé' ? '#166534' : '#64748b',
                    border:     r.statut === 'Confirmé' ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  }}>
                    {r.statut}
                  </span>
                </div>
              ))}
              {rdvsAujourdhui.length > 4 && (
                <button onClick={() => setView('agenda')} style={{ fontSize: 11, color: '#f97316', fontWeight: 700, textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}>
                  +{rdvsAujourdhui.length - 4} autres →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="dash-grid-2">
        {/* Species chart */}
        <div className="dash-card">
          <div className="dash-card-title" style={{ marginBottom: 16 }}>
            <span className="dash-icon-wrap" style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>🐾</span>
            Patients par espèce
          </div>
          {especeTop.length === 0 ? (
            <p style={{ color: 'var(--app-muted)', fontSize: 13, textAlign: 'center' }}>Aucun patient enregistré</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {especeTop.slice(0, 5).map(([esp, nb], i) => {
                const pct = Math.round((nb / patients.length) * 100)
                return (
                  <div key={esp}>
                    <div className="dash-species-row" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--app-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: speciesColors[i] || '#64748b', display: 'inline-block', flexShrink: 0 }} />
                        {esp}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--app-muted)', fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>
                        {nb} <span style={{ fontWeight: 500, opacity: 0.7 }}>({pct}%)</span>
                      </span>
                    </div>
                    <div className="dash-species-bar" style={{ height: 8 }}>
                      <div style={{
                        background: speciesColors[i] || '#64748b',
                        height: '100%', borderRadius: 999,
                        width: `${pct}%`, transition: 'width 0.8s cubic-bezier(.22,1,.36,1)',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="dash-card">
          <div className="dash-card-title" style={{ marginBottom: 14 }}>
            <span className="dash-icon-wrap" style={{ background: 'linear-gradient(135deg,#166534,#1d4ed8)' }}>⚡</span>
            Actions rapides
          </div>
          <div className="dash-actions-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {quickActions.map((a, i) => (
              <button
                key={i}
                type="button"
                className="dash-action-tile"
                style={{ background: a.c, borderColor: a.b, flexDirection: 'column', alignItems: 'flex-start', padding: '10px 12px', gap: 4 }}
                onClick={() => setView(a.v)}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{a.i}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: a.tc, lineHeight: 1.2 }}>{a.t}</span>
                <span style={{ fontSize: 10, color: a.tc, opacity: 0.65, lineHeight: 1.2 }}>{a.d}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
