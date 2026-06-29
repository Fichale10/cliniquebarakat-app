import { useState, useMemo } from 'react'
import { Btn, Badge, Field, AutoSuggest, FilterBar, FilterSelect, FilterBtns, usePagination, Pagination, EmptyState } from '../../components/ui'
import { newId } from '../../lib/db'
import { fmtF } from '../../lib/utils'

const today = () => new Date().toISOString().split('T')[0]

const TYPES = ['Ovariohystérectomie','Castration','Ablation corps étranger','Suture plaie','Amputation','Césarienne','Biopsie','Laparotomie','Autre']
const STATUTS = ['Planifié','En cours','Terminé','Annulé']
const SC = { Planifié:'yellow', Terminé:'green', Annulé:'red', 'En cours':'blue' }

const EMPTY_FORM = { date: today(), patient: '', proprio: '', type: 'Ovariohystérectomie', anesthesie: '', duree: '', chirurgien: '', statut: 'Planifié', suivi: '', montant: '' }

function Chirurgies({ patients, equipe = [], chirurgies = [], setChirurgies, sb, dbInsert, dbUpdate, dbDelete, user, logAction }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [patSugg, setPatSugg] = useState([])
  const [saving, setSaving] = useState(false)
  const [editStatut, setEditStatut] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [search, setSearch] = useState('')
  const [fStatut, setFStatut] = useState('')
  const [fType, setFType] = useState('')

  const nomsEquipe = equipe.length ? equipe.map(m => m.nom) : []
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  // ── Ajout ──────────────────────────────────────────────────
  const addChir = async () => {
    if (!form.patient.trim()) return alert('Patient requis')
    if (!form.type.trim()) return alert('Type d\'acte requis')
    setSaving(true)
    try {
      const row = { ...form, id: newId(), montant: parseFloat(form.montant) || 0 }
      const saved = await dbInsert(sb, 'chirurgies', row)
      setChirurgies([saved, ...chirurgies])
      if (logAction) logAction(sb, user, 'chirurgie_created', `${form.patient} — ${form.type}`)
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (e) {
      alert('Erreur enregistrement : ' + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  // ── Mise à jour statut ──────────────────────────────────────
  const updateStatut = async (id, statut) => {
    try {
      await dbUpdate(sb, 'chirurgies', id, { statut })
      setChirurgies(chirurgies.map(c => c.id === id ? { ...c, statut } : c))
      setEditStatut(null)
    } catch (e) {
      alert('Erreur mise à jour : ' + (e?.message || e))
    }
  }

  // ── Suppression ─────────────────────────────────────────────
  const deleteChir = async (id) => {
    try {
      await dbDelete(sb, 'chirurgies', id)
      setChirurgies(chirurgies.filter(c => c.id !== id))
      setConfirmDel(null)
    } catch (e) {
      alert('Erreur suppression : ' + (e?.message || e))
    }
  }

  // ── Filtres ─────────────────────────────────────────────────
  const filtered = useMemo(() => chirurgies.filter(c => {
    const q = search.toLowerCase()
    if (q && !c.patient.toLowerCase().includes(q) && !c.proprio.toLowerCase().includes(q) && !c.type.toLowerCase().includes(q)) return false
    if (fStatut && c.statut !== fStatut) return false
    if (fType && c.type !== fType) return false
    return true
  }), [chirurgies, search, fStatut, fType])

  const pagination = usePagination(filtered, 10)

  // ── Stats ────────────────────────────────────────────────────
  const totalMontant = chirurgies.reduce((s, c) => s + (c.montant || 0), 0)
  const ce_mois = chirurgies.filter(c => c.date?.startsWith(new Date().toISOString().slice(0, 7))).length

  return (
    <div className="app-page space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Total actes',     v: chirurgies.length,                                                mod: 'stat-tile--blue'   },
          { l: 'Ce mois',         v: ce_mois,                                                           mod: 'stat-tile--green'  },
          { l: 'Planifiés',       v: chirurgies.filter(c => c.statut === 'Planifié').length,           mod: 'stat-tile--yellow' },
          { l: 'Recettes',        v: fmtF(totalMontant),                                               mod: 'stat-tile--purple' },
        ].map((s, i) => (
          <div key={i} className={`stat-tile ${s.mod}`}>
            <div className="stat-tile__label">{s.l}</div>
            <div className="stat-tile__value">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="app-card">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">🔬 Chirurgies & Actes</h2>
            <p className="text-xs text-slate-400 mt-0.5">{chirurgies.length} acte(s) enregistré(s)</p>
          </div>
          <Btn onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ Annuler' : '+ Nouvel acte'}
          </Btn>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="p-5 border-b" style={{ background: 'linear-gradient(135deg,#f0fdfa,#f5fffe)', borderBottomColor: 'rgba(13,148,136,0.15)' }}>
            <h3 className="font-bold mb-4" style={{ color: '#0f766e' }}>Nouvel acte chirurgical</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Field label="Date" value={form.date} onChange={f('date')} type="date" />

              <div className="md:col-span-1">
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Patient *</label>
                <AutoSuggest
                  value={form.patient}
                  onChange={e => {
                    setForm(p => ({ ...p, patient: e.target.value }))
                    setPatSugg(patients.filter(p => p.nom.toLowerCase().includes(e.target.value.toLowerCase())).slice(0, 6))
                  }}
                  list={patSugg}
                  onSelect={p => { setForm(fp => ({ ...fp, patient: p.nom, proprio: p.proprio })); setPatSugg([]) }}
                  placeholder="Nom de l'animal"
                />
              </div>

              <Field label="Propriétaire" value={form.proprio} onChange={f('proprio')} placeholder="Propriétaire" />
              <Field label="Type d'acte *" value={form.type} onChange={f('type')} options={TYPES} />
              <Field label="Anesthésie" value={form.anesthesie} onChange={f('anesthesie')} placeholder="Protocole utilisé" />
              <Field label="Durée" value={form.duree} onChange={f('duree')} placeholder="ex: 45 min" />
              <Field label="Chirurgien" value={form.chirurgien} onChange={f('chirurgien')} options={nomsEquipe.length ? ['', ...nomsEquipe] : ['']} />
              <Field label="Montant (FCFA)" value={form.montant} onChange={f('montant')} type="number" placeholder="0" />
              <Field label="Statut" value={form.statut} onChange={f('statut')} options={STATUTS} />
              <Field label="Suivi post-op" value={form.suivi} onChange={f('suivi')} placeholder="Notes de suivi…" className="md:col-span-4" />
            </div>
            <Btn color="brand" onClick={addChir} disabled={saving}>
              {saving ? '⏳ Enregistrement…' : '✓ Enregistrer l\'acte'}
            </Btn>
          </div>
        )}

        {/* Filtres */}
        <FilterBar
          search={search} onSearch={setSearch} placeholder="Rechercher patient, type…"
          activeCount={[fStatut, fType].filter(Boolean).length}
          onReset={() => { setSearch(''); setFStatut(''); setFType('') }}
        >
          <FilterBtns
            label="Statut"
            value={fStatut}
            onChange={setFStatut}
            options={[
              { v: '', l: 'Tous' },
              { v: 'Planifié',  l: 'Planifiés',  color: 'yellow' },
              { v: 'En cours',  l: 'En cours',   color: 'blue'   },
              { v: 'Terminé',   l: 'Terminés',   color: 'green'  },
              { v: 'Annulé',    l: 'Annulés',    color: 'red'    },
            ]}
          />
          <FilterSelect label="Type" value={fType} onChange={setFType} options={TYPES.map(t => ({ v: t, l: t }))} />
          <span className="text-xs text-slate-400">{filtered.length}/{chirurgies.length}</span>
        </FilterBar>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)' }}>
                {['Date', 'Patient', 'Type d\'acte', 'Anesthésie', 'Durée', 'Chirurgien', 'Montant', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left p-3 text-xs font-bold text-white uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map(c => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm font-mono text-slate-600 whitespace-nowrap">{c.date}</td>
                  <td className="p-3">
                    <span className="font-semibold text-slate-900">{c.patient}</span>
                    {c.proprio && <div className="text-xs text-slate-400">{c.proprio}</div>}
                  </td>
                  <td className="p-3 font-medium text-sm" style={{ color: '#7c3aed' }}>{c.type}</td>
                  <td className="p-3 text-sm text-slate-600 max-w-[140px] truncate">{c.anesthesie || '—'}</td>
                  <td className="p-3 text-sm text-slate-600 whitespace-nowrap">{c.duree || '—'}</td>
                  <td className="p-3 text-sm text-slate-600">{c.chirurgien || '—'}</td>
                  <td className="p-3 font-bold font-mono text-sm whitespace-nowrap" style={{ color: '#0d9488' }}>{fmtF(c.montant || 0)}</td>
                  <td className="p-3">
                    {editStatut === c.id ? (
                      <div className="flex flex-col gap-1">
                        {STATUTS.map(s => (
                          <button key={s} onClick={() => updateStatut(c.id, s)}
                            className="text-xs px-2 py-1 rounded-lg text-left font-semibold transition-all"
                            style={{ background: c.statut === s ? '#f0fdfa' : '#f8fafc', color: c.statut === s ? '#0d9488' : '#475569', border: c.statut === s ? '1px solid #99f6e4' : '1px solid #e2e8f0' }}>
                            {s}
                          </button>
                        ))}
                        <button onClick={() => setEditStatut(null)} className="text-xs text-slate-400 mt-1">✕ Fermer</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditStatut(c.id)} title="Changer le statut">
                        <Badge color={SC[c.statut] || 'slate'}>{c.statut}</Badge>
                      </button>
                    )}
                  </td>
                  <td className="p-3">
                    {confirmDel === c.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => deleteChir(c.id)}
                          style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer' }}>
                          Oui
                        </button>
                        <button onClick={() => setConfirmDel(null)}
                          style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer' }}>
                          Non
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDel(c.id)}
                        style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', cursor: 'pointer' }}>
                        🗑
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filtered.length && <EmptyState icon="🔬" title="Aucun acte chirurgical" subtitle="Enregistrez les actes chirurgicaux réalisés à la clinique." />}

        <Pagination {...pagination} />
      </div>
    </div>
  )
}

export default Chirurgies
