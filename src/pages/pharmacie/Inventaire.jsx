import { useState } from 'react'
import { fmtF } from '../../lib/utils'
import { dbUpdate } from '../../lib/db'
import { Btn, Badge, PrintBtn } from '../../components/ui'

function Inventaire({ meds, setMeds, sb }) {
  const [adjId,      setAdjId]      = useState(null)
  const [adjMode,    setAdjMode]    = useState('ajouter') // 'ajouter' | 'retirer' | 'definir'
  const [adjQty,     setAdjQty]     = useState('')
  const [adjSaving,  setAdjSaving]  = useState(false)

  const stockNum  = m => parseInt(m.stock)  || 0
  const prixAchat = m => parseFloat(m.prixAchat || m.prix_achat) || 0
  const prixVente = m => parseFloat(m.prixVente || m.prix_vente) || 0

  const valTotal  = meds.reduce((s, m) => s + stockNum(m) * prixAchat(m), 0)
  const crits     = meds.filter(m => stockNum(m) <= (parseInt(m.seuil) || 0))

  // ── Calcul du nouveau stock selon le mode ────────────────
  const previewStock = (med) => {
    const q   = parseInt(adjQty) || 0
    const cur = stockNum(med)
    if (adjMode === 'ajouter')  return cur + q
    if (adjMode === 'retirer')  return Math.max(0, cur - q)
    if (adjMode === 'definir')  return Math.max(0, q)
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
      setAdjId(null)
      setAdjQty('')
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    } finally {
      setAdjSaving(false)
    }
  }

  const adjMed = adjId ? meds.find(m => m.id === adjId) : null

  return (
    <div className="app-page space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Références',   v: meds.length,                          mod: 'stat-tile--blue'   },
          { l: 'Valeur stock', v: fmtF(valTotal),                       mod: 'stat-tile--green'  },
          { l: 'Critique',     v: crits.length,                         mod: 'stat-tile--red'    },
          { l: 'Produits OK',  v: meds.length - crits.length,           mod: 'stat-tile--purple' },
        ].map((s, i) => (
          <div key={i} className={`stat-tile ${s.mod}`}>
            <div className="stat-tile__label">{s.l}</div>
            <div className="stat-tile__value">{s.v}</div>
          </div>
        ))}
      </div>

      {/* Alertes stock critique */}
      {crits.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
          <h3 className="font-bold text-red-700 mb-2">🚨 Stock critique</h3>
          <div className="space-y-1.5">
            {crits.map(m => (
              <div key={m.id} className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 border border-red-200">
                <span className="font-bold text-sm text-red-700">{m.nom}</span>
                <span className="text-xs text-red-600">→ {stockNum(m)} {m.unite} (seuil : {m.seuil})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tableau */}
      <div id="inventaire-print" className="app-card">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">📊 État de l'inventaire</h2>
          <PrintBtn zoneId="inventaire-print" label="🖨 Imprimer" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {['Produit', 'Catégorie', 'Stock actuel', 'Unité', 'Seuil', 'Prix achat', 'Valeur stock', 'Statut', 'Action'].map(h => (
                  <th key={h} className="text-left p-3 text-xs font-bold text-slate-600 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meds.map(m => {
                const stk  = stockNum(m)
                const pa   = prixAchat(m)
                const crit = stk <= (parseInt(m.seuil) || 0)
                const pct  = Math.min(100, Math.round((stk / (Math.max(parseInt(m.seuil) || 1, 1) * 3)) * 100))
                const isOpen = adjId === m.id

                return (
                  <>
                    <tr key={m.id} className={`border-t hover:bg-slate-50 transition-colors ${crit ? 'bg-red-50/40' : ''}`}>
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
                      <td className="p-3 text-sm font-mono">{pa > 0 ? fmtF(pa) : <span className="text-slate-300">—</span>}</td>
                      <td className="p-3 font-mono text-sm font-bold">{pa > 0 ? fmtF(stk * pa) : <span className="text-slate-300">—</span>}</td>
                      <td className="p-3">{crit ? <Badge color="red">🚨 Critique</Badge> : <Badge color="green">✓ OK</Badge>}</td>
                      <td className="p-3 no-print">
                        <button onClick={() => openAdj(m.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${isOpen ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}>
                          {isOpen ? '✕ Fermer' : '📝 Corriger'}
                        </button>
                      </td>
                    </tr>

                    {/* Panneau d'ajustement */}
                    {isOpen && (
                      <tr key={`${m.id}-adj`} className="no-print">
                        <td colSpan="9" style={{ padding: 0 }}>
                          <div style={{ background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', border: '2px solid #bfdbfe', borderTop: 'none', padding: '16px 20px' }}>

                            {/* Titre + stock actuel */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e40af' }}>📦 Corriger le stock — {m.nom}</span>
                              <span style={{ fontSize: '13px', background: '#dbeafe', color: '#1e40af', padding: '3px 10px', borderRadius: '999px', fontWeight: 700 }}>
                                Stock actuel : {stk} {m.unite}
                              </span>
                            </div>

                            {/* Choix du type d'opération */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                              {[
                                { k: 'ajouter', l: '+ Entrée stock',    desc: 'Marchandise reçue',     color: '#166534', bg: adjMode === 'ajouter' ? '#166534' : '#f0fdf4', text: adjMode === 'ajouter' ? 'white' : '#166534', border: '#86efac' },
                                { k: 'retirer', l: '− Sortie stock',    desc: 'Perte / périmé',        color: '#991b1b', bg: adjMode === 'retirer' ? '#dc2626' : '#fef2f2', text: adjMode === 'retirer' ? 'white' : '#dc2626', border: '#fecaca' },
                                { k: 'definir', l: '= Définir le stock', desc: 'Après inventaire physique', color: '#1e40af', bg: adjMode === 'definir' ? '#1d4ed8' : '#eff6ff', text: adjMode === 'definir' ? 'white' : '#1d4ed8', border: '#bfdbfe' },
                              ].map(opt => (
                                <button key={opt.k} type="button" onClick={() => { setAdjMode(opt.k); setAdjQty('') }}
                                  style={{ padding: '8px 14px', borderRadius: '10px', border: `1.5px solid ${opt.border}`, background: opt.bg, color: opt.text, fontWeight: 700, fontSize: '13px', cursor: 'pointer', lineHeight: 1.3 }}>
                                  {opt.l}<br/>
                                  <span style={{ fontSize: '10px', opacity: 0.8 }}>{opt.desc}</span>
                                </button>
                              ))}
                            </div>

                            {/* Champ quantité + preview */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                                  {adjMode === 'ajouter' ? 'Quantité à ajouter' : adjMode === 'retirer' ? 'Quantité à retirer' : 'Nouveau stock total'}
                                </label>
                                <input type="number" min="0"
                                  value={adjQty} onChange={e => setAdjQty(e.target.value)}
                                  placeholder="0"
                                  style={{ border: '2px solid #bfdbfe', borderRadius: '9px', padding: '8px 14px', fontSize: '16px', fontWeight: 700, width: '120px', outline: 'none', background: 'white' }} />
                              </div>

                              {/* Flèche + résultat */}
                              {adjQty !== '' && parseInt(adjQty) >= 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontSize: '20px', color: '#64748b' }}>→</span>
                                  <div style={{ background: 'white', border: '2px solid #86efac', borderRadius: '10px', padding: '8px 16px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Nouveau stock</div>
                                    <div style={{ fontSize: '22px', fontWeight: 900, color: previewStock(m) <= (parseInt(m.seuil) || 0) ? '#dc2626' : '#166534', fontFamily: 'monospace' }}>
                                      {previewStock(m)} {m.unite}
                                    </div>
                                    {previewStock(m) <= (parseInt(m.seuil) || 0) && (
                                      <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 700, marginTop: '2px' }}>⚠️ En dessous du seuil</div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div style={{ display: 'flex', gap: '8px' }}>
                                <Btn onClick={() => doAdj(m)} sm disabled={adjSaving || adjQty === ''}>
                                  {adjSaving ? '⏳' : '✓ Confirmer'}
                                </Btn>
                                <button onClick={() => { setAdjId(null); setAdjQty('') }}
                                  style={{ fontSize: '13px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px' }}>
                                  Annuler
                                </button>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
          {!meds.length && (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">💊</div>
              <p className="font-semibold">Aucun médicament enregistré</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Inventaire
