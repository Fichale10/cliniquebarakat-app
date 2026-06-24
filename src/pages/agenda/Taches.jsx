import { useState, useMemo } from 'react'
import { Btn, Badge, Field } from '../../components/ui'
import { newId } from '../../lib/db'

const today = () => new Date().toISOString().split('T')[0]

const PRIORITES  = ['Haute', 'Normale', 'Basse']
const CATEGORIES = ['Préparation','Stock','Rappels','Entretien','Administratif','Soins','Autre']
const COLS       = ['À faire', 'En cours', 'Terminé']
const PRIO_COLOR = { Haute: 'red', Normale: 'blue', Basse: 'slate' }
const COL_ICON   = { 'À faire': '📋', 'En cours': '⚡', 'Terminé': '✅' }
const CAT_ICON   = { Préparation:'🔧', Stock:'📦', Rappels:'📞', Entretien:'🧹', Administratif:'📝', Soins:'💉', Autre:'📌' }

const EMPTY_FORM = { titre:'', membres:[], priorite:'Normale', statut:'À faire', echeance: today(), categorie:'Autre' }

function Taches({ equipe = [], taches = [], setTaches, sb, dbInsert, dbUpdate, dbDelete, user, logAction }) {
  const MEMBRES = equipe.length ? equipe.map(m => m.nom) : []

  const [showForm, setShowForm]             = useState(false)
  const [form, setForm]                     = useState(EMPTY_FORM)
  const [showDropdown, setShowDropdown]     = useState(false)
  const [search, setSearch]                 = useState('')
  const [fPrio, setFPrio]                   = useState('')
  const [fMembre, setFMembre]               = useState('')

  const pf = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const toggleMembre = nom => setForm(p => ({
    ...p,
    membres: p.membres.includes(nom) ? p.membres.filter(m => m !== nom) : [...p.membres, nom]
  }))

  // ── Créer ────────────────────────────────────────────────────
  const addTache = async () => {
    if (!form.titre.trim()) return alert('Titre requis')
    try {
      const row = { ...form, id: newId() }
      const saved = await dbInsert(sb, 'taches', row)
      setTaches([saved, ...taches])
      if (logAction) logAction(sb, user, 'tache_created', form.titre)
      setForm(EMPTY_FORM)
      setShowForm(false)
      setShowDropdown(false)
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    }
  }

  // ── Changer statut ───────────────────────────────────────────
  const setStatut = async (id, statut) => {
    try {
      await dbUpdate(sb, 'taches', id, { statut })
      setTaches(taches.map(t => t.id === id ? { ...t, statut } : t))
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    }
  }

  // ── Supprimer ────────────────────────────────────────────────
  const deleteTache = async (id) => {
    try {
      await dbDelete(sb, 'taches', id)
      setTaches(taches.filter(t => t.id !== id))
    } catch (e) {
      alert('Erreur suppression : ' + (e?.message || e))
    }
  }

  // ── Filtres ──────────────────────────────────────────────────
  const filtered = useMemo(() => taches.filter(t => {
    if (search && !t.titre.toLowerCase().includes(search.toLowerCase()) && !(t.categorie||'').toLowerCase().includes(search.toLowerCase())) return false
    if (fPrio && t.priorite !== fPrio) return false
    if (fMembre && !(t.membres || []).includes(fMembre)) return false
    return true
  }), [taches, search, fPrio, fMembre])

  const hasFilter = search || fPrio || fMembre
  const resetFilters = () => { setSearch(''); setFPrio(''); setFMembre('') }

  return (
    <div className="app-page space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Total tâches',  v: taches.length,                                          mod: 'stat-tile--blue'   },
          { l: 'À faire',       v: taches.filter(t => t.statut === 'À faire').length,      mod: 'stat-tile--slate'  },
          { l: 'En cours',      v: taches.filter(t => t.statut === 'En cours').length,     mod: 'stat-tile--yellow' },
          { l: 'Terminées',     v: taches.filter(t => t.statut === 'Terminé').length,      mod: 'stat-tile--green'  },
        ].map((s, i) => (
          <div key={i} className={`stat-tile ${s.mod}`}>
            <div className="stat-tile__label">{s.l}</div>
            <div className="stat-tile__value">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="app-card">
        {/* Header + filtres */}
        <div className="p-5 border-b flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">✅ Tâches de l'équipe</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {taches.filter(t => t.statut !== 'Terminé').length} en cours · {filtered.length} affichée(s)
              </p>
            </div>
            <Btn onClick={() => { setShowForm(v => !v); setShowDropdown(false) }}>
              {showForm ? '✕ Annuler' : '+ Nouvelle tâche'}
            </Btn>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-2">
            <input
              className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none w-44"
              style={{ fontFamily: 'Outfit,sans-serif' }}
              placeholder="🔍 Rechercher…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
            <select className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" style={{ fontFamily: 'Outfit,sans-serif' }}
              value={fPrio} onChange={e => setFPrio(e.target.value)}>
              <option value="">Toutes priorités</option>
              {PRIORITES.map(p => <option key={p}>{p}</option>)}
            </select>
            {MEMBRES.length > 0 && (
              <select className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" style={{ fontFamily: 'Outfit,sans-serif' }}
                value={fMembre} onChange={e => setFMembre(e.target.value)}>
                <option value="">Tous les membres</option>
                {MEMBRES.map(m => <option key={m}>{m}</option>)}
              </select>
            )}
            {hasFilter && (
              <button onClick={resetFilters}
                className="text-xs font-bold px-3 py-2 rounded-xl border"
                style={{ background: '#fef2f2', color: '#ef4444', borderColor: '#fecaca' }}>
                ✕ Reset
              </button>
            )}
          </div>
        </div>

        {/* Formulaire nouvelle tâche */}
        {showForm && (
          <div className="p-5 border-b" style={{ background: 'linear-gradient(135deg,#f0fdfa,#f5fffe)', borderBottomColor: 'rgba(13,148,136,0.15)' }}>
            <h3 className="font-bold mb-4" style={{ color: '#0f766e' }}>Nouvelle tâche</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <Field label="Titre *" value={form.titre} onChange={pf('titre')} placeholder="Description de la tâche…" className="md:col-span-3" />

              {/* Multi-membre */}
              <div className="md:col-span-2">
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>
                  Assigner à
                </label>
                <div className="relative">
                  <button type="button" onClick={() => setShowDropdown(p => !p)}
                    style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, textAlign: 'left', background: 'white', fontFamily: 'Outfit,sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: form.membres.length ? '#1e293b' : '#94a3b8' }}>
                      {form.membres.length ? form.membres.join(', ') : MEMBRES.length ? '— Choisir des membres —' : 'Aucun membre dans l\'équipe'}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: 10 }}>{showDropdown ? '▲' : '▼'}</span>
                  </button>
                  {showDropdown && MEMBRES.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                      {MEMBRES.map(m => (
                        <label key={m} onClick={() => toggleMembre(m)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, border: '2px solid', borderColor: form.membres.includes(m) ? '#0d9488' : '#cbd5e1', background: form.membres.includes(m) ? '#0d9488' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {form.membres.includes(m) && <span style={{ color: 'white', fontSize: 10, fontWeight: 900 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>👤 {m}</span>
                        </label>
                      ))}
                      <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9' }}>
                        <button onClick={() => setShowDropdown(false)} style={{ width: '100%', fontSize: 12, color: '#0d9488', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                          ✓ Confirmer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {form.membres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.membres.map(m => (
                      <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>
                        {m}
                        <button onClick={() => toggleMembre(m)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Field label="Priorité" value={form.priorite} onChange={pf('priorite')} options={PRIORITES} />
              <Field label="Catégorie" value={form.categorie} onChange={pf('categorie')} options={CATEGORIES} />
              <Field label="Échéance" value={form.echeance} onChange={pf('echeance')} type="date" />
            </div>
            <Btn color="brand" onClick={addTache}>✓ Créer la tâche</Btn>
          </div>
        )}

        {/* Kanban */}
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLS.map(col => {
              const colTaches = filtered.filter(t => t.statut === col)
              return (
                <div key={col} className="rounded-2xl p-4" style={{ background: col === 'Terminé' ? '#f0fdf4' : col === 'En cours' ? '#fefce8' : '#f8fafc', border: '1px solid', borderColor: col === 'Terminé' ? '#bbf7d0' : col === 'En cours' ? '#fde68a' : '#e2e8f0' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm" style={{ color: col === 'Terminé' ? '#15803d' : col === 'En cours' ? '#b45309' : '#475569' }}>
                      {COL_ICON[col]} {col}
                    </h3>
                    <Badge color={col === 'À faire' ? 'slate' : col === 'En cours' ? 'yellow' : 'green'}>{colTaches.length}</Badge>
                  </div>

                  <div className="space-y-2">
                    {colTaches.map(t => (
                      <div key={t.id} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-semibold leading-snug">
                            {CAT_ICON[t.categorie] || '📌'} {t.titre}
                          </p>
                          <Badge color={PRIO_COLOR[t.priorite]}>{t.priorite}</Badge>
                        </div>

                        {/* Membres */}
                        {(t.membres || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {(t.membres || []).map((m, i) => (
                              <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4' }}>
                                👤 {m}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-300 mb-2">Non assignée</p>
                        )}

                        <div className="text-xs text-slate-400 mb-2">📅 {t.echeance}</div>

                        {/* Actions */}
                        <div className="flex gap-1">
                          {col === 'À faire' && (
                            <button onClick={() => setStatut(t.id, 'En cours')}
                              className="flex-1 text-xs font-bold py-1.5 rounded-lg transition-all"
                              style={{ background: '#fefce8', color: '#b45309', border: '1px solid #fde68a' }}>
                              ▶ Démarrer
                            </button>
                          )}
                          {col === 'En cours' && (
                            <>
                              <button onClick={() => setStatut(t.id, 'Terminé')}
                                className="flex-1 text-xs font-bold py-1.5 rounded-lg transition-all"
                                style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                                ✓ Terminer
                              </button>
                              <button onClick={() => setStatut(t.id, 'À faire')}
                                className="text-xs px-2 py-1 rounded-lg"
                                style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
                                ↩
                              </button>
                            </>
                          )}
                          {col === 'Terminé' && (
                            <button onClick={() => setStatut(t.id, 'En cours')}
                              className="flex-1 text-xs font-bold py-1.5 rounded-lg transition-all"
                              style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
                              ↩ Rouvrir
                            </button>
                          )}
                          <button onClick={() => deleteTache(t.id)}
                            className="text-xs px-2 py-1 rounded-lg transition-all"
                            style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}

                    {!colTaches.length && (
                      <div className="text-center text-slate-300 text-sm py-6">Aucune tâche</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {taches.length === 0 && (
          <div className="p-12 text-center text-slate-400 border-t">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold">Aucune tâche créée</p>
            <p className="text-sm mt-1">Cliquez sur « + Nouvelle tâche » pour commencer</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Taches
