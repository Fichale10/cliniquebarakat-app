import { useState, useMemo } from 'react'
import { Btn, Badge, FilterBar, FilterSelect, usePagination, Pagination, EmptyState, AutoSuggest } from '../../components/ui'
import { newId } from '../../lib/db'
import { printZone } from '../../lib/utils'

const today = () => new Date().toISOString().split('T')[0]
const EMPTY_LIGNE = { med: '', dose: '', duree: '', qte: '' }
const EMPTY_FORM  = { patient: '', proprio: '', espece: '', lignes: [{ ...EMPTY_LIGNE }], note: '', veterinaire: '' }

// ── Template d'impression ─────────────────────────────────────
function OrdPrint({ o }) {
  if (!o) return null
  return (
    <div id="ord-print" className="hidden">
      <div style={{ fontFamily: 'Georgia,serif', padding: '32px 40px', maxWidth: '680px', margin: '0 auto', background: 'white', color: '#111' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '3px solid #0d9488' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#0d9488,#14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🐾</div>
            <div>
              <div style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 900, fontSize: 18, color: '#0d9488', letterSpacing: 1 }}>LA BARAKAT</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Pharmacie & Clinique Vétérinaire</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Lomé, Togo</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 900, fontSize: 16, color: '#0f766e', letterSpacing: 2, textTransform: 'uppercase' }}>Ordonnance</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>N° {String(o.id).slice(0, 8).toUpperCase()}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{o.date}</div>
            <div style={{ marginTop: 8, padding: '4px 8px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#0d9488', textAlign: 'center' }}>ORIGINAL</div>
          </div>
        </div>

        {/* Patient */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div><span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Patient</span><div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{o.patient}</div></div>
          <div><span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Espèce</span><div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{o.espece || '—'}</div></div>
          <div><span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Propriétaire</span><div style={{ fontSize: 13, marginTop: 2 }}>{o.proprio}</div></div>
          <div><span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Date</span><div style={{ fontSize: 13, marginTop: 2 }}>{o.date}</div></div>
        </div>

        {/* Médicaments */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <thead>
            <tr style={{ background: '#f0fdfa', borderTop: '2px solid #0d9488', borderBottom: '2px solid #0d9488' }}>
              {['Médicament', 'Posologie', 'Durée', 'Qté'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(o.lignes || []).map((l, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                <td style={{ padding: '10px', fontSize: 13, fontWeight: 600 }}>💊 {l.med}</td>
                <td style={{ padding: '10px', fontSize: 12, color: '#374151' }}>{l.dose}</td>
                <td style={{ padding: '10px', fontSize: 12, color: '#374151' }}>{l.duree}</td>
                <td style={{ padding: '10px', fontSize: 12, fontWeight: 600, color: '#0d9488', fontFamily: 'monospace' }}>{l.qte}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Observations */}
        {o.note && (
          <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Observations</div>
            <div style={{ fontSize: 13, color: '#374151' }}>{o.note}</div>
          </div>
        )}

        {/* Pied */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 32, paddingTop: 16, borderTop: '2px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Prescrit par</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0d9488' }}>{o.veterinaire || 'Dr. Vétérinaire'}</div>
            <div style={{ marginTop: 40, borderTop: '1px solid #cbd5e1', paddingTop: 4, width: 180, fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>Signature & Cachet</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 10, color: '#94a3b8', lineHeight: 1.6 }}>
            <div>Valable 3 mois à compter de la date de délivrance</div>
            <div>Non remboursable · Usage vétérinaire uniquement</div>
            <div style={{ marginTop: 4, fontStyle: 'italic' }}>La Barakat · Lomé, Togo</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────
function Ordonnances({ patients, meds, ordonnances = [], setOrdonnances, sb, dbInsert, dbDelete, user, logAction }) {
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [patSugg, setPatSugg]     = useState([])
  const [saving, setSaving]       = useState(false)
  const [printOrd, setPrintOrd]   = useState(null)
  const [search, setSearch]       = useState('')
  const [fEspece, setFEspece]     = useState('')
  const [confirmDel, setConfirmDel] = useState(null)

  const pf = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const updLigne = (i, k, v) => setForm(p => { const l = [...p.lignes]; l[i] = { ...l[i], [k]: v }; return { ...p, lignes: l } })
  const addLigne = () => setForm(p => ({ ...p, lignes: [...p.lignes, { ...EMPTY_LIGNE }] }))
  const remLigne = (i) => setForm(p => ({ ...p, lignes: p.lignes.filter((_, j) => j !== i) }))

  // ── Création ────────────────────────────────────────────────
  const addOrd = async () => {
    if (!form.patient.trim()) return alert('Patient requis')
    if (form.lignes.every(l => !l.med.trim())) return alert('Ajoutez au moins un médicament')
    setSaving(true)
    try {
      const row = { ...form, id: newId(), date: today(), lignes: form.lignes.filter(l => l.med.trim()) }
      const saved = await dbInsert(sb, 'ordonnances', row)
      setOrdonnances([saved, ...ordonnances])
      if (logAction) logAction(sb, user, 'ordonnance_created', `${form.patient} — ${row.lignes.length} médicament(s)`)
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  // ── Suppression ─────────────────────────────────────────────
  const deleteOrd = async (id) => {
    try {
      await dbDelete(sb, 'ordonnances', id)
      setOrdonnances(ordonnances.filter(o => o.id !== id))
      setConfirmDel(null)
    } catch (e) {
      alert('Erreur suppression : ' + (e?.message || e))
    }
  }

  // ── Impression ──────────────────────────────────────────────
  const handlePrint = (o) => {
    setPrintOrd(o)
    setTimeout(() => {
      const el = document.getElementById('ord-print')
      if (!el) return
      el.classList.remove('hidden')
      setTimeout(() => { printZone('ord-print'); el.classList.add('hidden') }, 100)
    }, 50)
  }

  const especes = [...new Set(ordonnances.map(o => o.espece).filter(Boolean))]
  const filtered = useMemo(() => ordonnances.filter(o => {
    const q = search.toLowerCase()
    if (q && !o.patient.toLowerCase().includes(q) && !o.proprio.toLowerCase().includes(q)) return false
    if (fEspece && o.espece !== fEspece) return false
    return true
  }), [ordonnances, search, fEspece])

  const pagination = usePagination(filtered, 10)

  return (
    <div className="app-page space-y-5">
      {printOrd && <OrdPrint o={printOrd} />}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Total ordonnances', v: ordonnances.length,       mod: 'stat-tile--blue'   },
          { l: 'Ce mois',          v: ordonnances.filter(o => o.date?.startsWith(new Date().toISOString().slice(0,7))).length, mod: 'stat-tile--green' },
          { l: 'Résultat filtre',  v: filtered.length,            mod: 'stat-tile--slate'  },
          { l: "Espèces traitées", v: especes.length,             mod: 'stat-tile--purple' },
        ].map((s, i) => (
          <div key={i} className={`stat-tile ${s.mod}`}>
            <div className="stat-tile__label">{s.l}</div>
            <div className="stat-tile__value">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="app-card">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">📝 Ordonnances</h2>
            <p className="text-xs text-slate-400 mt-0.5">{ordonnances.length} ordonnance(s) enregistrée(s)</p>
          </div>
          <Btn onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ Annuler' : '+ Nouvelle ordonnance'}
          </Btn>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="p-5 border-b" style={{ background: 'linear-gradient(135deg,#f0fdfa,#f5fffe)', borderBottomColor: 'rgba(13,148,136,0.15)' }}>
            <h3 className="font-bold mb-4" style={{ color: '#0f766e' }}>Nouvelle ordonnance</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {/* Patient autocomplete */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Patient *</label>
                <AutoSuggest
                  value={form.patient}
                  onChange={e => {
                    setForm(p => ({ ...p, patient: e.target.value }))
                    setPatSugg(patients.filter(p => p.nom.toLowerCase().includes(e.target.value.toLowerCase())).slice(0, 6))
                  }}
                  list={patSugg}
                  onSelect={p => { setForm(f => ({ ...f, patient: p.nom, proprio: p.proprio, espece: p.espece })); setPatSugg([]) }}
                  placeholder="Nom de l'animal"
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Propriétaire</label>
                <input style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, width: '100%', outline: 'none', fontFamily: 'Outfit,sans-serif' }}
                  value={form.proprio} onChange={pf('proprio')} placeholder="Propriétaire" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Espèce</label>
                <input style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, width: '100%', outline: 'none', fontFamily: 'Outfit,sans-serif' }}
                  value={form.espece} onChange={pf('espece')} placeholder="ex: Chien, Chat…" />
              </div>
            </div>

            {/* Lignes médicaments */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.05em', textTransform: 'uppercase' }}>Médicaments *</label>
                <button onClick={addLigne}
                  style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 8, background: '#f0fdfa', border: '1px solid #99f6e4', color: '#0d9488', cursor: 'pointer' }}>
                  + Ajouter ligne
                </button>
              </div>
              <div className="space-y-2">
                {form.lignes.map((l, i) => (
                  <div key={i} className="grid gap-2" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 80px auto' }}>
                    <select style={{ border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'Outfit,sans-serif' }}
                      value={l.med} onChange={e => updLigne(i, 'med', e.target.value)}>
                      <option value="">— Médicament —</option>
                      {meds.map(m => <option key={m.id} value={m.nom}>{m.nom}</option>)}
                      <option value="Autre">Autre</option>
                    </select>
                    <input style={{ border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'Outfit,sans-serif' }}
                      placeholder="Posologie" value={l.dose} onChange={e => updLigne(i, 'dose', e.target.value)} />
                    <input style={{ border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'Outfit,sans-serif' }}
                      placeholder="Durée" value={l.duree} onChange={e => updLigne(i, 'duree', e.target.value)} />
                    <input type="number" min="1"
                      style={{ border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'Outfit,sans-serif' }}
                      placeholder="Qté" value={l.qte} onChange={e => updLigne(i, 'qte', e.target.value)} />
                    {form.lignes.length > 1 && (
                      <button onClick={() => remLigne(i)}
                        style={{ border: 'none', background: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Note / Conseils</label>
                <textarea rows={2} style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 13, width: '100%', outline: 'none', resize: 'vertical', fontFamily: 'Outfit,sans-serif' }}
                  placeholder="Conseils au propriétaire…" value={form.note} onChange={pf('note')} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Vétérinaire prescripteur</label>
                <input style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, width: '100%', outline: 'none', fontFamily: 'Outfit,sans-serif' }}
                  placeholder="Dr. Nom Prénom" value={form.veterinaire} onChange={pf('veterinaire')} />
              </div>
            </div>

            <Btn color="brand" onClick={addOrd} disabled={saving}>
              {saving ? '⏳ Enregistrement…' : '✓ Créer l\'ordonnance'}
            </Btn>
          </div>
        )}

        {/* Filtres */}
        <FilterBar search={search} onSearch={setSearch} placeholder="Rechercher par patient, propriétaire…"
          activeCount={[fEspece].filter(Boolean).length}
          onReset={() => { setSearch(''); setFEspece('') }}>
          <FilterSelect label="🐾 Espèce" value={fEspece} onChange={setFEspece} options={especes.map(e => ({ v: e, l: e }))} />
          <span className="text-xs text-slate-400">{filtered.length}/{ordonnances.length}</span>
        </FilterBar>

        {/* Liste */}
        <div className="p-5 space-y-4">
          {pagination.pageItems.map(o => (
            <div key={o.id} className="border border-slate-200 rounded-2xl p-5 hover:border-teal-200 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className="text-xs text-slate-400 font-mono">ORD-{String(o.id).slice(0, 8).toUpperCase()}</span>
                  <span className="text-xs text-slate-400 ml-2">{o.date}</span>
                  <h3 className="font-bold text-lg mt-0.5">
                    {o.patient}
                    <span className="text-slate-400 font-normal text-base"> · {o.proprio}</span>
                    {o.espece && <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4' }}>{o.espece}</span>}
                  </h3>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handlePrint(o)}
                    className="no-print text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: '#1e293b', color: 'white', border: 'none', cursor: 'pointer' }}>
                    🖨 Imprimer
                  </button>
                  <button onClick={() => setConfirmDel(o.id)}
                    className="no-print text-xs font-bold px-2 py-1.5 rounded-lg transition-all"
                    style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', cursor: 'pointer' }}>
                    🗑
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                {(o.lignes || []).map((l, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: '#f8fffe', border: '1px solid #e0f7f5' }}>
                    <span className="font-semibold text-sm min-w-[160px] truncate" style={{ color: '#0d9488' }}>💊 {l.med}</span>
                    <span className="text-sm text-slate-600">{l.dose}</span>
                    {l.duree && <span className="text-sm text-slate-400">· {l.duree}</span>}
                    <Badge color="green" className="ml-auto">Qté : {l.qte}</Badge>
                  </div>
                ))}
              </div>

              {o.note && (
                <p className="text-sm text-amber-700 rounded-xl px-3 py-2 mt-2" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                  📌 {o.note}
                </p>
              )}

              {confirmDel === o.id && (
                <div className="mt-3 rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <p className="text-sm font-semibold text-red-700">⚠️ Supprimer cette ordonnance ?</p>
                  <div className="flex gap-2">
                    <button onClick={() => deleteOrd(o.id)}
                      style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Confirmer
                    </button>
                    <button onClick={() => setConfirmDel(null)}
                      style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {!filtered.length && <EmptyState icon="📝" title="Aucune ordonnance" subtitle="Rédigez une ordonnance lors de vos consultations." />}
        </div>
        <Pagination {...pagination} />
      </div>
    </div>
  )
}

export default Ordonnances
