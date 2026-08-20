import { History, Banknote, Smartphone, CreditCard, Landmark, PenLine, User } from 'lucide-react'
import { useState, useMemo } from 'react'
import { fmtF } from '../../lib/utils'
import { Badge, FilterPeriode, FilterSelect, FilterBar, EmptyState } from '../../components/ui'

// ── Helpers ──────────────────────────────────────────────────────
const now4 = new Date()
const hDebutMap = {
  jour:    new Date().toISOString().split('T')[0],
  semaine: new Date(now4.getTime() - now4.getDay() * 86400000).toISOString().split('T')[0],
  mois:    new Date(now4.getFullYear(), now4.getMonth(), 1).toISOString().split('T')[0],
  annee:   new Date(now4.getFullYear(), 0, 1).toISOString().split('T')[0],
}

const STATUT_VENTE = {
  'Payé':               { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', dot: '#22c55e' },
  'À crédit':           { bg: '#fffbeb', border: '#fde68a', color: '#d97706', dot: '#f59e0b' },
  'Partiellement payé': { bg: '#fff7ed', border: '#fed7aa', color: '#ea580c', dot: '#f97316' },
  'En attente':         { bg: '#f0f9ff', border: '#bae6fd', color: '#0284c7', dot: '#38bdf8' },
  'Annulé':             { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', dot: '#ef4444' },
}

const STATUT_ACHAT = {
  'Reçu':       { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', dot: '#22c55e' },
  'En attente': { bg: '#fffbeb', border: '#fde68a', color: '#d97706', dot: '#f59e0b' },
  'Commandé':   { bg: '#f0f9ff', border: '#bae6fd', color: '#0284c7', dot: '#38bdf8' },
  'Annulé':     { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', dot: '#ef4444' },
}

const MODE_ICON = { Espèces: Banknote, 'Mobile Money': Smartphone, Carte: CreditCard, Virement: Landmark, Chèque: PenLine }

const PAGE_SIZE = 25

function StatutPill({ statut, map }) {
  const s = (map || {})[statut] || { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b', dot: '#94a3b8' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {statut}
    </span>
  )
}

function KpiCard({ icon, label, value, sub, color = '#0d9488' }) {
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: '16px 18px',
      border: '1px solid #f1f5f9',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function VenteCard({ e, expanded, onToggle }) {
  const s = STATUT_VENTE[e.statut] || {}
  const montant = e.total || e.montant || 0
  const lignes  = e.lignes || []
  return (
    <div style={{
      borderRadius: 14, border: `1px solid ${expanded ? '#99f6e4' : '#f1f5f9'}`,
      background: expanded ? '#fafffe' : 'white',
      overflow: 'hidden', transition: 'all .15s',
      boxShadow: expanded ? '0 4px 16px rgba(13,148,136,0.08)' : 'none',
    }}>
      <button type="button" onClick={onToggle}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Date */}
        <div style={{ flexShrink: 0, textAlign: 'center', width: 44 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
            {e.date ? e.date.split('-')[2] : '—'}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
            {e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' }) : ''}
          </div>
        </div>

        {/* Séparateur */}
        <div style={{ width: 1, height: 36, background: '#f1f5f9', flexShrink: 0 }} />

        {/* Infos */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', display:'inline-flex', alignItems:'center', gap:5 }}>
              <User size={13} color="#64748b" strokeWidth={2.4} />{e.client || '—'}
            </span>
            <StatutPill statut={e.statut} map={STATUT_VENTE} />
            {e.mode && (
              <span style={{ fontSize: 11, color: '#94a3b8', display:'inline-flex', alignItems:'center', gap:4 }}>
                {(() => { const MIc = MODE_ICON[e.mode] || CreditCard; return <MIc size={11} strokeWidth={2.4} /> })()} {e.mode}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {lignes.length} article{lignes.length > 1 ? 's' : ''}
            {lignes.length > 0 && ' · ' + lignes.slice(0, 2).map(l => l.med || l.nom || '?').join(', ') + (lignes.length > 2 ? '…' : '')}
          </div>
        </div>

        {/* Montant */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#0d9488', fontVariantNumeric: 'tabular-nums' }}>
            {fmtF(montant)}
          </div>
          {e.tva_amt > 0 && <div style={{ fontSize: 10, color: '#94a3b8' }}>TVA {fmtF(e.tva_amt)}</div>}
        </div>

        <span style={{ color: '#cbd5e1', fontSize: 13, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Détail déplié */}
      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f0fdfa' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, paddingTop: 12 }}>
            {lignes.map((l, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 18 }}>💊</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b' }}>{l.med || l.nom || '?'}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {l.cond || l.unite || ''}{l.cond && l.qte ? ' · ' : ''}{l.qte ? `×${l.qte}` : ''}
                    {l.pu ? ` · ${fmtF(l.pu)}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {e.note && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', fontSize: 12, color: '#92400e' }}>
              📌 {e.note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AchatCard({ e, expanded, onToggle }) {
  const montant = e.total || e.montant || 0
  const lignes  = e.lignes || []
  return (
    <div style={{
      borderRadius: 14, border: `1px solid ${expanded ? '#a5f3fc' : '#f1f5f9'}`,
      background: expanded ? '#f0fbff' : 'white',
      overflow: 'hidden', transition: 'all .15s',
      boxShadow: expanded ? '0 4px 16px rgba(14,165,233,0.08)' : 'none',
    }}>
      <button type="button" onClick={onToggle}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Date */}
        <div style={{ flexShrink: 0, textAlign: 'center', width: 44 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
            {e.date ? e.date.split('-')[2] : '—'}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
            {e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' }) : ''}
          </div>
        </div>

        <div style={{ width: 1, height: 36, background: '#f1f5f9', flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
              🏭 {e.fournisseur || '—'}
            </span>
            <StatutPill statut={e.statut} map={STATUT_ACHAT} />
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {lignes.length} référence{lignes.length > 1 ? 's' : ''}
            {lignes.length > 0 && ' · ' + lignes.slice(0, 2).map(l => l.produit || l.nom || '?').join(', ') + (lignes.length > 2 ? '…' : '')}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#0369a1', fontVariantNumeric: 'tabular-nums' }}>
            {fmtF(montant)}
          </div>
        </div>

        <span style={{ color: '#cbd5e1', fontSize: 13, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid #e0f2fe' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, paddingTop: 12 }}>
            {lignes.map((l, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <span style={{ fontSize: 18 }}>📦</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b' }}>{l.produit || l.nom || '?'}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {l.qte ? `×${l.qte}` : ''}
                    {l.pu ? ` · ${fmtF(l.pu)}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {e.note && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: 12, color: '#0369a1' }}>
              📌 {e.note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────────
function Historique({ ventesHist = [], achatsHist = [], meds = [] }) {
  const [tab,         setTab]         = useState('ventes')
  const [search,      setSearch]      = useState('')
  const [fStatut,     setFStatut]     = useState('')
  const [fPeriode,    setFPeriode]    = useState('')
  const [fProduit,    setFProduit]    = useState('')
  const [page,        setPage]        = useState(1)
  const [expandedId,  setExpandedId]  = useState(null)

  const resetFilters = () => { setSearch(''); setFStatut(''); setFPeriode(''); setFProduit(''); setPage(1) }
  const switchTab = (t) => { setTab(t); resetFilters() }

  const allProds = useMemo(() =>
    [...new Set((ventesHist || []).flatMap(v => (v.lignes || []).map(l => l.med)).filter(Boolean))],
  [ventesHist])

  const base = tab === 'ventes' ? ventesHist : achatsHist

  const filtered = useMemo(() => {
    return (base || []).filter(e => {
      if (fStatut  && e.statut !== fStatut) return false
      if (fPeriode && hDebutMap[fPeriode] && e.date < hDebutMap[fPeriode]) return false
      if (fProduit && !JSON.stringify(e.lignes || []).includes(fProduit)) return false
      if (search) {
        const q = search.toLowerCase()
        if (!JSON.stringify(e).toLowerCase().includes(q)) return false
      }
      return true
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [base, fStatut, fPeriode, fProduit, search])

  const totalPages   = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const activeCount  = [fStatut, fPeriode, fProduit, search].filter(Boolean).length

  // KPIs
  const totalMontant = useMemo(() => filtered.reduce((s, e) => s + (e.total || e.montant || 0), 0), [filtered])
  const avgMontant   = filtered.length ? totalMontant / filtered.length : 0

  const kpisVentes = useMemo(() => {
    const credit = filtered.filter(e => e.statut === 'À crédit' || e.statut === 'Partiellement payé')
    return [
      { icon: '🛒', label: 'Ventes',        value: filtered.length,   sub: `sur ${ventesHist.length} total`, color: '#0d9488' },
      { icon: '💰', label: 'CA filtré',      value: fmtF(totalMontant), sub: `moy. ${fmtF(avgMontant)} / vente`, color: '#7c3aed' },
      { icon: '✅', label: 'Payées',          value: filtered.filter(e => e.statut === 'Payé').length, sub: 'statut Payé', color: '#16a34a' },
      { icon: '⏳', label: 'En crédit',      value: credit.length,     sub: fmtF(credit.reduce((s, e) => s + (e.total || 0), 0)) + ' à recouvrer', color: '#d97706' },
    ]
  }, [filtered, totalMontant, avgMontant, ventesHist.length])

  const kpisAchats = useMemo(() => [
    { icon: '📦', label: 'Commandes',     value: filtered.length,   sub: `sur ${achatsHist.length} total`, color: '#0369a1' },
    { icon: '💸', label: 'Total filtré',  value: fmtF(totalMontant), sub: `moy. ${fmtF(avgMontant)} / cmd`, color: '#7c3aed' },
    { icon: '✅', label: 'Reçues',         value: filtered.filter(e => e.statut === 'Reçu').length,         sub: 'livrées', color: '#16a34a' },
    { icon: '🕐', label: 'En attente',     value: filtered.filter(e => e.statut === 'En attente' || e.statut === 'Commandé').length, sub: 'à recevoir', color: '#d97706' },
  ], [filtered, totalMontant, avgMontant, achatsHist.length])

  const kpis = tab === 'ventes' ? kpisVentes : kpisAchats

  const toggle = (id) => setExpandedId(p => p === id ? null : id)

  return (
    <div className="app-page space-y-5">

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
      </div>

      {/* Contenu principal */}
      <div className="app-card">
        {/* Header + tabs */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-black flex items-center gap-2"><History size={20} color="#7c3aed" strokeWidth={2.3} /> Historique des produits</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {filtered.length} enregistrement{filtered.length > 1 ? 's' : ''} · {fmtF(totalMontant)}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1 w-fit">
              {[
                { k: 'ventes', l: '🛒 Ventes',     c: ventesHist.length },
                { k: 'achats', l: '📦 Commandes',   c: achatsHist.length },
              ].map(t => (
                <button key={t.k} onClick={() => switchTab(t.k)}
                  style={{
                    padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    border: 'none', cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
                    background: tab === t.k ? 'white' : 'transparent',
                    color: tab === t.k ? '#0d9488' : '#64748b',
                    boxShadow: tab === t.k ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}>
                  {t.l}
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: tab === t.k ? '#f0fdfa' : '#e2e8f0', color: tab === t.k ? '#0d9488' : '#94a3b8', padding: '1px 6px', borderRadius: 99 }}>
                    {t.c}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtres */}
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="🔍 Client, produit, référence…"
              style={{ flex: '1 1 180px', minWidth: 160, padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none' }}
            />
            {tab === 'ventes' && (
              <select value={fStatut} onChange={e => { setFStatut(e.target.value); setPage(1) }}
                style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: 'white', color: fStatut ? '#0f172a' : '#94a3b8', outline: 'none' }}>
                <option value="">Tous statuts</option>
                {['Payé', 'À crédit', 'Partiellement payé', 'En attente', 'Annulé'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {tab === 'achats' && (
              <select value={fStatut} onChange={e => { setFStatut(e.target.value); setPage(1) }}
                style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: 'white', color: fStatut ? '#0f172a' : '#94a3b8', outline: 'none' }}>
                <option value="">Tous statuts</option>
                {['Reçu', 'Commandé', 'En attente', 'Annulé'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <select value={fPeriode} onChange={e => { setFPeriode(e.target.value); setPage(1) }}
              style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: 'white', color: fPeriode ? '#0f172a' : '#94a3b8', outline: 'none' }}>
              <option value="">Toutes périodes</option>
              <option value="jour">Aujourd'hui</option>
              <option value="semaine">Cette semaine</option>
              <option value="mois">Ce mois</option>
              <option value="annee">Cette année</option>
            </select>
            {tab === 'ventes' && allProds.length > 0 && (
              <select value={fProduit} onChange={e => { setFProduit(e.target.value); setPage(1) }}
                style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: 'white', color: fProduit ? '#0f172a' : '#94a3b8', outline: 'none', maxWidth: 180 }}>
                <option value="">Tous produits</option>
                {allProds.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {activeCount > 0 && (
              <button onClick={resetFilters}
                style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 12, fontWeight: 700, background: 'white', color: '#64748b', cursor: 'pointer' }}>
                ✕ Effacer ({activeCount})
              </button>
            )}
          </div>
        </div>

        {/* Liste */}
        <div className="p-4 space-y-2">
          {!paginated.length ? (
            <EmptyState
              icon={tab === 'ventes' ? '🛒' : '📦'}
              title="Aucun résultat"
              subtitle={activeCount ? 'Essayez d\'autres filtres.' : `Les ${tab === 'ventes' ? 'ventes' : 'commandes'} apparaîtront ici.`}
            />
          ) : paginated.map((e, i) => {
            const key = e.id || i
            const isExp = expandedId === key
            return tab === 'ventes'
              ? <VenteCard key={key} e={e} expanded={isExp} onToggle={() => toggle(key)} />
              : <AchatCard key={key} e={e} expanded={isExp} onToggle={() => toggle(key)} />
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', borderTop: '1px solid #f1f5f9' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '7px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 700, background: 'white', color: page === 1 ? '#cbd5e1' : '#475569', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
              ‹ Préc.
            </button>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let p
                if (totalPages <= 7) p = i + 1
                else if (page <= 4) p = i + 1
                else if (page >= totalPages - 3) p = totalPages - 6 + i
                else p = page - 3 + i
                return (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ width: 34, height: 34, borderRadius: 9, border: '1.5px solid', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .12s',
                      borderColor: page === p ? '#0d9488' : '#e2e8f0',
                      background: page === p ? '#0d9488' : 'white',
                      color: page === p ? 'white' : '#475569',
                    }}>
                    {p}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '7px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 700, background: 'white', color: page === totalPages ? '#cbd5e1' : '#475569', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
              Suiv. ›
            </button>
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>
              Page {page}/{totalPages} · {filtered.length} résultats
            </span>
          </div>
        )}

        {/* Footer total */}
        {filtered.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc', borderRadius: '0 0 16px 16px' }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {filtered.length} transaction{filtered.length > 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Total filtré :</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: tab === 'ventes' ? '#0d9488' : '#0369a1' }}>{fmtF(totalMontant)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Historique
