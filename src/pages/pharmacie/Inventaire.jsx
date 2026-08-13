import { ClipboardList, Trash2 } from 'lucide-react'
import { useState, useMemo } from 'react'
import { fmtF } from '../../lib/utils'
import { Btn, Badge, PrintBtn, EmptyState } from '../../components/ui'

const todayStr = () => new Date().toISOString().split('T')[0]
const fmtDate = (d) => {
  if (!d) return '–'
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Onglet 1 : État actuel ──────────────────────────────────────
function TabEtat({ meds, setMeds, sb, dbUpdate }) {
  const [adjId,     setAdjId]     = useState(null)
  const [adjMode,   setAdjMode]   = useState('ajouter')
  const [adjQty,    setAdjQty]    = useState('')
  const [adjSaving, setAdjSaving] = useState(false)

  const stockNum  = m => parseInt(m.stock)  || 0
  const prixAchat = m => parseFloat(m.prixAchat  || m.prix_achat)  || 0
  const prixVente = m => parseFloat(m.prixVente  || m.prix_vente)  || 0

  const valTotal   = meds.reduce((s, m) => s + stockNum(m) * prixAchat(m), 0)
  const caTotal    = meds.reduce((s, m) => s + stockNum(m) * prixVente(m), 0)
  const margeTotal = caTotal - valTotal
  const pctMarge   = caTotal > 0 ? Math.round((margeTotal / caTotal) * 100) : 0
  const crits      = meds.filter(m => stockNum(m) <= (parseInt(m.seuil) || 0))

  const previewStock = (med) => {
    const q = parseInt(adjQty) || 0
    const cur = stockNum(med)
    if (adjMode === 'ajouter') return cur + q
    if (adjMode === 'retirer') return Math.max(0, cur - q)
    if (adjMode === 'definir') return Math.max(0, q)
    return cur
  }

  const openAdj = (id) => {
    if (adjId === id) { setAdjId(null); setAdjQty('') }
    else { setAdjId(id); setAdjQty(''); setAdjMode('ajouter') }
  }

  const doAdj = async (med) => {
    const q = parseInt(adjQty)
    if (isNaN(q) || q < 0) return alert('Entrez une quantité valide (≥ 0)')
    const newStock = previewStock(med)
    setAdjSaving(true)
    try {
      await dbUpdate(sb, 'medicaments', med.id, { stock: newStock })
      setMeds(meds.map(m => m.id === med.id ? { ...m, stock: newStock } : m))
      setAdjId(null); setAdjQty('')
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    } finally {
      setAdjSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-tile stat-tile--blue"><div className="stat-tile__label">Références</div><div className="stat-tile__value">{meds.length}</div></div>
        <div className="stat-tile stat-tile--red"><div className="stat-tile__label">🚨 Critiques</div><div className="stat-tile__value">{crits.length}</div></div>
        <div className="stat-tile stat-tile--green"><div className="stat-tile__label">💰 Valeur coût</div><div className="stat-tile__value">{fmtF(valTotal)}</div></div>
        <div className="stat-tile stat-tile--blue"><div className="stat-tile__label">📈 CA potentiel</div><div className="stat-tile__value">{fmtF(caTotal)}</div></div>
      </div>

      {crits.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
          <h3 className="font-bold text-red-700 mb-2">🚨 Stocks critiques à réapprovisionner</h3>
          <div className="flex flex-wrap gap-2">
            {crits.map(m => (
              <span key={m.id} className="text-xs bg-white border border-red-300 text-red-700 font-bold px-3 py-1.5 rounded-full">
                {m.nom} — {stockNum(m)} {m.unite} (seuil : {m.seuil})
              </span>
            ))}
          </div>
        </div>
      )}

      <div id="inventaire-print" className="app-card">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList size={20} color="#7c3aed" strokeWidth={2.3} /> État du stock</h2>
            <p className="text-xs text-slate-400 mt-0.5">Marge brute potentielle : <strong style={{ color: margeTotal >= 0 ? '#16a34a' : '#dc2626' }}>{fmtF(margeTotal)} ({pctMarge}%)</strong></p>
          </div>
          <PrintBtn zoneId="inventaire-print" label="🖨 Imprimer" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {['Produit','Catégorie','Stock','Unité','Seuil','Valeur coût','CA potentiel','Statut','Action'].map(h => (
                  <th key={h} className="text-left p-3 text-xs font-bold text-slate-600 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meds.map(m => {
                const stk  = stockNum(m)
                const pa   = prixAchat(m)
                const pv   = prixVente(m)
                const crit = stk <= (parseInt(m.seuil) || 0)
                const pct  = Math.min(100, Math.round((stk / (Math.max(parseInt(m.seuil) || 1, 1) * 3)) * 100))
                const isOpen = adjId === m.id

                return (
                  <>
                    <tr key={m.id} className={`border-t hover:bg-slate-50 ${crit ? 'bg-red-50/40' : ''}`}>
                      <td className="p-3 font-semibold">{m.nom}</td>
                      <td className="p-3"><Badge color="purple">{m.categorie}</Badge></td>
                      <td className="p-3">
                        <div className="font-bold font-mono text-base">{stk}</div>
                        <div className="w-20 bg-slate-200 rounded-full h-1.5 mt-1">
                          <div className={`h-1.5 rounded-full ${crit ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="p-3 text-sm text-slate-500">{m.unite}</td>
                      <td className="p-3 text-sm font-mono">{m.seuil}</td>
                      <td className="p-3 font-mono text-sm font-bold">{pa > 0 ? fmtF(stk * pa) : <span className="text-slate-300">—</span>}</td>
                      <td className="p-3 font-mono text-sm font-bold text-blue-700">{pv > 0 ? fmtF(stk * pv) : <span className="text-slate-300">—</span>}</td>
                      <td className="p-3">{crit ? <Badge color="red">🚨 Critique</Badge> : <Badge color="green">✓ OK</Badge>}</td>
                      <td className="p-3 no-print">
                        <button onClick={() => openAdj(m.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${isOpen ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}>
                          {isOpen ? '✕' : '📝 Corriger'}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${m.id}-adj`} className="no-print">
                        <td colSpan="9" style={{ padding: 0 }}>
                          <div style={{ background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', border: '2px solid #bfdbfe', borderTop: 'none', padding: '16px 20px' }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                              {[
                                { k: 'ajouter', l: '+ Entrée stock',     bg: adjMode==='ajouter'?'#166534':'#f0fdf4', txt: adjMode==='ajouter'?'white':'#166534', bd: '#86efac' },
                                { k: 'retirer', l: '− Sortie / perte',   bg: adjMode==='retirer'?'#dc2626':'#fef2f2', txt: adjMode==='retirer'?'white':'#dc2626', bd: '#fecaca' },
                                { k: 'definir', l: '= Définir le stock', bg: adjMode==='definir'?'#1d4ed8':'#eff6ff', txt: adjMode==='definir'?'white':'#1d4ed8', bd: '#bfdbfe' },
                              ].map(opt => (
                                <button key={opt.k} type="button" onClick={() => { setAdjMode(opt.k); setAdjQty('') }}
                                  style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${opt.bd}`, background: opt.bg, color: opt.txt, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                                  {opt.l}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                              <input type="number" min="0" value={adjQty} onChange={e => setAdjQty(e.target.value)} placeholder="Quantité"
                                style={{ border: '2px solid #bfdbfe', borderRadius: 9, padding: '8px 14px', fontSize: 16, fontWeight: 700, width: 120, outline: 'none', background: 'white' }} />
                              {adjQty !== '' && (
                                <span style={{ fontSize: 18, fontWeight: 900, color: previewStock(m) <= (parseInt(m.seuil)||0) ? '#dc2626' : '#166534' }}>
                                  → {previewStock(m)} {m.unite}
                                </span>
                              )}
                              <Btn onClick={() => doAdj(m)} sm disabled={adjSaving || adjQty === ''}>{adjSaving ? '⏳' : '✓ Confirmer'}</Btn>
                              <button onClick={() => { setAdjId(null); setAdjQty('') }}
                                style={{ fontSize: 13, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Annuler</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {meds.length > 0 && (
                <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                  <td colSpan="5" className="p-3 text-right text-xs font-bold text-slate-500 uppercase">Totaux</td>
                  <td className="p-3 font-mono font-black text-green-700">{fmtF(valTotal)}</td>
                  <td className="p-3 font-mono font-black text-blue-700">{fmtF(caTotal)}</td>
                  <td colSpan="2" className="p-3">
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: margeTotal>=0?'#dcfce7':'#fef2f2', color: margeTotal>=0?'#166534':'#dc2626' }}>
                      Marge {margeTotal>=0?'+':''}{fmtF(margeTotal)} ({pctMarge}%)
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {!meds.length && <EmptyState icon="💊" title="Aucun médicament" subtitle="Ajoutez des médicaments depuis la page Médicaments." />}
        </div>
      </div>
    </div>
  )
}

// ─── Onglet 2 : Inventaire journalier ───────────────────────────
function TabJournalier({ meds, setMeds, ventesHist, inventaires = [], setInventaires, sb, dbInsert, dbUpdate, user }) {
  const [lignes,  setLignes]  = useState({}) // { med_id: { stock_reel: string, motif: string } }
  const [saving,  setSaving]  = useState(false)
  const [search,  setSearch]  = useState('')

  const today = todayStr()

  // Quantités vendues aujourd'hui par médicament (depuis ventes)
  const ventesJour = useMemo(() => {
    const byMed = {}
    ;(ventesHist || [])
      .filter(v => (v.date || '').startsWith(today))
      .forEach(v => {
        ;(v.lignes || []).forEach(l => {
          const key  = l.id || l.med_id
          const mult = parseInt(l.mult) || 1
          const qte  = parseInt(l.qte)  || 0
          if (key) byMed[key] = (byMed[key] || 0) + qte * mult
        })
      })
    return byMed
  }, [ventesHist, today])

  const setLigne = (medId, field, val) =>
    setLignes(prev => ({ ...prev, [medId]: { ...prev[medId], [field]: val } }))

  const medsFiltres = useMemo(() => {
    const q = search.toLowerCase().trim()
    return q ? meds.filter(m => m.nom.toLowerCase().includes(q) || (m.categorie||'').toLowerCase().includes(q)) : meds
  }, [meds, search])

  const nbSaisis = Object.keys(lignes).filter(id => lignes[id]?.stock_reel !== '' && lignes[id]?.stock_reel !== undefined).length
  const nbEcarts = meds.filter(m => {
    const sr = lignes[m.id]?.stock_reel
    return sr !== undefined && sr !== '' && parseInt(sr) !== (parseInt(m.stock) || 0)
  }).length

  const cloturer = async () => {
    if (nbSaisis === 0) return alert('Saisissez au moins un stock réel avant de clôturer.')
    if (!confirm(`Clôturer l'inventaire du ${today} ?\n\n${nbEcarts} écart(s) détecté(s) — les stocks seront automatiquement corrigés.`)) return

    const lignesData = meds.map(m => {
      const stockTheo = parseInt(m.stock) || 0
      const sr        = lignes[m.id]?.stock_reel
      const stockReel = sr !== undefined && sr !== '' ? Math.max(0, parseInt(sr)) : null
      const ecart     = stockReel !== null ? stockReel - stockTheo : 0
      return {
        med_id:           m.id,
        nom:              m.nom,
        unite:            m.unite || '',
        stock_theorique:  stockTheo,
        stock_reel:       stockReel !== null ? stockReel : stockTheo,
        saisi:            stockReel !== null,
        ecart,
        motif:            lignes[m.id]?.motif || '',
        ventes_jour:      ventesJour[m.id] || 0,
      }
    })

    const nbEcartsTotal = lignesData.filter(l => l.ecart !== 0 && l.saisi).length
    const row = {
      date:         today,
      statut:       'cloture',
      lignes:       lignesData,
      nb_ecarts:    nbEcartsTotal,
      cloture_par:  user?.name || user?.email || '',
    }

    setSaving(true)
    try {
      const saved = await dbInsert(sb, 'inventaires', row)
      setInventaires([saved, ...(inventaires || [])])

      // Corriger les stocks dans medicaments
      const corrections = lignesData.filter(l => l.ecart !== 0 && l.saisi)
      for (const l of corrections) {
        await dbUpdate(sb, 'medicaments', l.med_id, { stock: l.stock_reel }).catch(e => console.warn('[inv]', e))
      }
      if (corrections.length > 0) {
        setMeds(meds.map(m => {
          const c = corrections.find(l => l.med_id === m.id)
          return c ? { ...m, stock: c.stock_reel } : m
        }))
      }

      setLignes({})
      alert(`✓ Inventaire clôturé !\n${nbEcartsTotal} écart(s) corrigé(s) dans le système.`)
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* En-tête */}
      <div className="app-card p-5">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 18, color: '#1e293b', display:'flex', alignItems:'center', gap:8 }}><ClipboardList size={18} color="#7c3aed" /> {fmtDate(today)}</h2>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Saisissez le stock physiquement compté. Les écarts seront calculés et les corrections appliquées à la clôture.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '8px 16px', minWidth: 60 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#166534' }}>{nbSaisis}</div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>saisi(s)</div>
            </div>
            <div style={{ textAlign: 'center', background: nbEcarts > 0 ? '#fff7ed' : '#f0fdf4', border: `1.5px solid ${nbEcarts > 0 ? '#fb923c' : '#86efac'}`, borderRadius: 10, padding: '8px 16px', minWidth: 60 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: nbEcarts > 0 ? '#ea580c' : '#166534' }}>{nbEcarts}</div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>écart(s)</div>
            </div>
            <Btn onClick={cloturer} disabled={saving || nbSaisis === 0}>
              {saving ? '⏳ Clôture en cours…' : '🔒 Clôturer et corriger'}
            </Btn>
          </div>
        </div>
      </div>

      {/* Filtre */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Filtrer par nom ou catégorie…"
        style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 16px', fontSize: 13, outline: 'none', background: 'var(--app-surface)', color: 'var(--app-text)' }} />

      {/* Légende */}
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b', flexWrap: 'wrap' }}>
        <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '3px 8px', fontWeight: 700 }}>— Vendus auj.</span>
        <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 6, padding: '3px 8px', fontWeight: 700 }}>Écart négatif = manquant</span>
        <span style={{ background: '#eff6ff', color: '#2563eb', borderRadius: 6, padding: '3px 8px', fontWeight: 700 }}>Écart positif = surplus</span>
        <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 6, padding: '3px 8px', fontWeight: 700 }}>✓ = conforme</span>
      </div>

      {/* Table principale */}
      <div className="app-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#f0fdf4,#eff6ff)' }}>
                {['Produit','Catégorie','Stock système','Vendus auj.','Stock réel (comptage)','Écart','Motif / Note'].map(h => (
                  <th key={h} className="text-left p-3 text-xs font-bold text-slate-600 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medsFiltres.map(m => {
                const stk    = parseInt(m.stock) || 0
                const vendus = ventesJour[m.id] || 0
                const srRaw  = lignes[m.id]?.stock_reel
                const srVal  = srRaw !== undefined && srRaw !== '' ? parseInt(srRaw) : null
                const ecart  = srVal !== null ? srVal - stk : null

                const ecartColor = ecart === null ? '#94a3b8' : ecart === 0 ? '#16a34a' : ecart < 0 ? '#dc2626' : '#2563eb'
                const ecartBg    = ecart === null ? '#f1f5f9' : ecart === 0 ? '#f0fdf4' : ecart < 0 ? '#fef2f2' : '#eff6ff'
                const rowBg      = ecart !== null && ecart !== 0 ? 'rgba(254,242,242,0.35)' : ''

                return (
                  <tr key={m.id} className="border-t hover:bg-slate-50/50" style={{ background: rowBg }}>
                    <td className="p-3 font-semibold">{m.nom}</td>
                    <td className="p-3"><Badge color="purple">{m.categorie}</Badge></td>
                    <td className="p-3">
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15 }}>{stk}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>{m.unite}</span>
                    </td>
                    <td className="p-3">
                      {vendus > 0
                        ? <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>−{vendus}</span>
                        : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                    </td>
                    <td className="p-3">
                      <input type="number" min="0"
                        value={srRaw || ''}
                        onChange={e => setLigne(m.id, 'stock_reel', e.target.value)}
                        placeholder={String(stk)}
                        style={{
                          width: 84, border: `2px solid ${srVal !== null ? (ecart === 0 ? '#86efac' : '#fca5a5') : '#e2e8f0'}`,
                          borderRadius: 8, padding: '5px 10px', fontSize: 14, fontWeight: 700,
                          fontFamily: 'monospace', outline: 'none',
                          background: srVal !== null ? (ecart === 0 ? '#f0fdf4' : '#fef2f2') : 'var(--app-surface)',
                        }}
                      />
                    </td>
                    <td className="p-3">
                      <span style={{ display: 'inline-block', minWidth: 56, textAlign: 'center', background: ecartBg, color: ecartColor, borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 900, fontFamily: 'monospace' }}>
                        {ecart === null ? '—' : ecart === 0 ? '✓ 0' : `${ecart > 0 ? '+' : ''}${ecart}`}
                      </span>
                    </td>
                    <td className="p-3">
                      <input type="text"
                        value={lignes[m.id]?.motif || ''}
                        onChange={e => setLigne(m.id, 'motif', e.target.value)}
                        placeholder={ecart !== null && ecart !== 0 ? 'Perte / vol / erreur…' : 'Optionnel'}
                        style={{
                          width: '100%', minWidth: 130, border: '1.5px solid', borderRadius: 8,
                          padding: '5px 10px', fontSize: 12, outline: 'none',
                          borderColor: ecart !== null && ecart !== 0 && !lignes[m.id]?.motif ? '#fca5a5' : '#e2e8f0',
                          background: 'var(--app-surface)',
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!meds.length && <EmptyState icon="💊" title="Aucun médicament" subtitle="Ajoutez des médicaments depuis la page Médicaments." />}
        </div>
      </div>
    </div>
  )
}

// ─── Onglet 3 : Historique ───────────────────────────────────────
function TabHistorique({ inventaires = [], setInventaires, sb, dbDelete }) {
  const [selected, setSelected] = useState(null)

  const sorted = useMemo(() =>
    [...inventaires].sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1),
    [inventaires]
  )

  const supprimer = async (id) => {
    if (!confirm('Supprimer cet inventaire de l\'historique ?')) return
    try {
      await dbDelete(sb, 'inventaires', id)
      setInventaires(inventaires.filter(i => i.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    }
  }

  // ── Vue détail ──
  if (selected) {
    const lignes      = selected.lignes || []
    const avecEcart   = lignes.filter(l => l.ecart !== 0 && l.saisi)
    const conformes   = lignes.filter(l => l.saisi && l.ecart === 0)
    const nonSaisis   = lignes.filter(l => !l.saisi)

    return (
      <div className="space-y-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSelected(null)}
            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            ← Retour à la liste
          </button>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{fmtDate(selected.date)}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Clôturé par {selected.cloture_par || '—'} · {lignes.length} produit(s) · {avecEcart.length} écart(s)
            </div>
          </div>
        </div>

        {avecEcart.length > 0 && (
          <div className="app-card">
            <div className="p-4 border-b" style={{ background: '#fef2f2' }}>
              <h3 style={{ fontWeight: 800, color: '#dc2626' }}>🔴 Produits avec écart ({avecEcart.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-red-50">
                  <tr>
                    {['Produit','Stock système','Stock réel','Écart','Vendus ce jour','Motif'].map(h => (
                      <th key={h} className="text-left p-3 text-xs font-bold text-red-700 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {avecEcart.map((l, i) => (
                    <tr key={i} className="border-t hover:bg-red-50/30">
                      <td className="p-3 font-semibold">{l.nom}</td>
                      <td className="p-3 font-mono">{l.stock_theorique} <span className="text-slate-400 text-xs">{l.unite}</span></td>
                      <td className="p-3 font-mono font-bold">{l.stock_reel} <span className="text-slate-400 text-xs">{l.unite}</span></td>
                      <td className="p-3">
                        <span style={{ fontFamily: 'monospace', fontWeight: 900, color: l.ecart < 0 ? '#dc2626' : '#2563eb', background: l.ecart < 0 ? '#fef2f2' : '#eff6ff', borderRadius: 6, padding: '2px 8px' }}>
                          {l.ecart > 0 ? '+' : ''}{l.ecart} {l.unite}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {l.ventes_jour > 0
                          ? <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{l.ventes_jour}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="p-3 text-sm text-slate-600">{l.motif || <span className="text-slate-300">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="app-card">
          <div className="p-4 border-b" style={{ background: '#f0fdf4' }}>
            <h3 style={{ fontWeight: 800, color: '#16a34a' }}>
              ✓ Conformes : {conformes.length} · Non saisis : {nonSaisis.length}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-green-50">
                <tr>
                  {['Produit','Stock système','Stock réel','Statut'].map(h => (
                    <th key={h} className="text-left p-3 text-xs font-bold text-green-700 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...conformes, ...nonSaisis].map((l, i) => (
                  <tr key={i} className="border-t hover:bg-slate-50">
                    <td className="p-3">{l.nom}</td>
                    <td className="p-3 font-mono text-sm">{l.stock_theorique}</td>
                    <td className="p-3 font-mono text-sm">{l.saisi ? l.stock_reel : <span className="text-slate-300">—</span>}</td>
                    <td className="p-3">
                      {l.saisi ? <Badge color="green">✓ Conforme</Badge> : <Badge color="slate">Non saisi</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ── Liste des inventaires ──
  return (
    <div className="space-y-3">
      {!sorted.length && (
        <EmptyState icon="📅" title="Aucun inventaire clôturé"
          subtitle="Les inventaires journaliers apparaîtront ici après la première clôture." />
      )}
      {sorted.map(inv => (
        <div key={inv.id} className="app-card p-4 hover:shadow-md transition-shadow">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: inv.nb_ecarts > 0 ? 'linear-gradient(135deg,#dc2626,#ea580c)' : 'linear-gradient(135deg,#0d9488,#166534)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {inv.nb_ecarts > 0 ? '⚠️' : '✓'}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{fmtDate(inv.date)}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {inv.cloture_par ? `Clôturé par ${inv.cloture_par}` : 'Clôturé'} · {(inv.lignes || []).filter(l => l.saisi).length} produit(s) saisi(s) sur {(inv.lignes || []).length}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {inv.nb_ecarts > 0
                ? <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 800 }}>
                    🔴 {inv.nb_ecarts} écart(s)
                  </span>
                : <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 800 }}>
                    ✓ Conforme
                  </span>}
              <button onClick={() => setSelected(inv)}
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                Voir détail →
              </button>
              <button onClick={() => supprimer(inv.id)}
                style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '7px 10px', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Trash2 size={13} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────
function Inventaire(props) {
  const [tab, setTab] = useState('etat')

  const TABS = [
    { id: 'etat',        label: '📊 État du stock' },
    { id: 'journalier',  label: '📋 Inventaire du jour' },
    { id: 'historique',  label: '🗂️ Historique' },
  ]

  return (
    <div className="app-page space-y-5">
      <div style={{ display: 'flex', gap: 5, background: '#f1f5f9', borderRadius: 14, padding: 5 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '9px 12px', borderRadius: 10, fontSize: 13,
              fontWeight: tab === t.id ? 800 : 600,
              background: tab === t.id ? 'white' : 'transparent',
              color: tab === t.id ? '#0f766e' : '#64748b',
              border: `1.5px solid ${tab === t.id ? '#e2e8f0' : 'transparent'}`,
              cursor: 'pointer', transition: 'all .15s',
              boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'etat'       && <TabEtat       {...props} />}
      {tab === 'journalier' && <TabJournalier {...props} />}
      {tab === 'historique' && <TabHistorique {...props} />}
    </div>
  )
}

export default Inventaire
