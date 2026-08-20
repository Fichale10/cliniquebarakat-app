import { Calendar, Pencil, Trash2 } from 'lucide-react'
import { useState, useMemo } from 'react'
import AgendaCalendrier from './AgendaCalendrier'
import RappelsPanel from './RappelsPanel'
import { Btn, Field, AutoSuggest, EmptyState } from '../../components/ui'
import { newId } from '../../lib/db'

const TYPE_DOT = {
  Consultation:       '#2563eb',
  Vaccination:        '#16a34a',
  Chirurgie:          '#9333ea',
  Urgence:            '#dc2626',
  'Contrôle post-op': '#ea580c',
  Echographie:        '#06b6d4',
  Détartrage:         '#eab308',
  Autre:              '#94a3b8',
}
/** Pastille de couleur d'un type de RDV */
const TypeDot = ({ type, size = 12 }) => (
  <span style={{ width:size, height:size, borderRadius:'50%', background:TYPE_DOT[type] || '#94a3b8', display:'inline-block', flexShrink:0 }} />
)

const STATUT_STYLE = {
  Confirmé:     'bg-teal-50 text-teal-800 border-teal-200',
  'En attente': 'bg-amber-50 text-amber-900 border-amber-200',
  Terminé:      'bg-slate-100 text-slate-600 border-slate-200',
  Annulé:       'bg-red-50 text-red-700 border-red-200',
}

const DUREES = ['15 min', '30 min', '45 min', '1h', '1h30', '2h']

const today = () => new Date().toISOString().split('T')[0]

const EMPTY_FORM = {
  date: today(), heure: '09:00', duree: '30 min',
  patient: '', proprio: '', tel: '',
  type: 'Consultation', statut: 'En attente',
  veterinaire: '', note: '',
}

function Agenda({ patients, rdvs = [], setRdvs, equipe = [], sb, dbInsert, dbUpdate, dbDelete, logAction, user }) {
  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [patSugg,  setPatSugg]  = useState([])
  const [saving,   setSaving]   = useState(false)
  const [filters,  setFilters]  = useState({ search: '', type: '', statut: '', vet: '' })
  const [expandedId, setExpandedId] = useState(null)

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const flt = (k) => (e) => setFilters(prev => ({ ...prev, [k]: e.target.value }))

  const openNew = (datePreset) => {
    setEditId(null)
    setForm(datePreset ? { ...EMPTY_FORM, date: datePreset } : EMPTY_FORM)
    setShowForm(true)
    setPatSugg([])
    setTimeout(() => document.getElementById('rdv-form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  const openEdit = (r) => {
    setEditId(r.id)
    setForm({
      date:        r.date        || today(),
      heure:       r.heure       || '09:00',
      duree:       r.duree       || '30 min',
      patient:     r.patient     || '',
      proprio:     r.proprio     || '',
      tel:         r.tel         || '',
      type:        r.type        || 'Consultation',
      statut:      r.statut      || 'En attente',
      veterinaire: r.veterinaire || '',
      note:        r.note        || '',
    })
    setShowForm(true)
    setPatSugg([])
    setTimeout(() => document.getElementById('rdv-form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM) }

  // ── Enregistrer (création ou modification) ──────────────────
  const saveRDV = async () => {
    if (!form.patient.trim()) return alert('Le nom du patient est requis.')
    setSaving(true)
    try {
      if (editId) {
        await dbUpdate(sb, 'rdvs', editId, form)
        setRdvs(rdvs.map(r => r.id === editId ? { ...r, ...form } : r).sort(sortRdv))
        if (logAction) logAction(sb, user, 'rdv_updated', `${form.patient} — ${form.date} ${form.heure}`)
      } else {
        const row = { ...form, id: newId() }
        const saved = await dbInsert(sb, 'rdvs', row)
        setRdvs([...rdvs, saved].sort(sortRdv))
        if (logAction) logAction(sb, user, 'rdv_added', `${form.patient} — ${form.date} ${form.heure}`)
      }
      closeForm()
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  const sortRdv = (a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure)

  // ── Changement de statut rapide ─────────────────────────────
  const updateStatut = async (id, statut) => {
    try {
      await dbUpdate(sb, 'rdvs', id, { statut })
      setRdvs(rdvs.map(r => r.id === id ? { ...r, statut } : r))
    } catch (e) {
      alert('Erreur mise à jour : ' + (e?.message || e))
    }
  }

  // ── Suppression ─────────────────────────────────────────────
  const deleteRDV = async (id, patient) => {
    if (!confirm(`Supprimer le RDV de ${patient} ?`)) return
    try {
      await dbDelete(sb, 'rdvs', id)
      setRdvs(rdvs.filter(r => r.id !== id))
    } catch (e) {
      alert('Erreur suppression : ' + (e?.message || e))
    }
  }

  // ── WhatsApp ─────────────────────────────────────────────────
  const sendWhatsApp = (r) => {
    const tel = (r.tel || '').replace(/\D/g, '')
    const dest = tel ? `https://wa.me/${tel}` : 'https://wa.me/'
    const msg = encodeURIComponent(
      `Bonjour ${r.proprio || r.patient}, nous vous rappelons votre RDV vétérinaire ` +
      `pour ${r.patient} le ${new Date(r.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} ` +
      `à ${r.heure}${r.duree ? ' (' + r.duree + ')' : ''} à La Barakat. ` +
      `Merci de confirmer votre présence. 🐾`
    )
    window.open(dest + '?text=' + msg, '_blank')
  }

  // ── Filtres ──────────────────────────────────────────────────
  const filteredRdvs = useMemo(() => {
    const q = filters.search.toLowerCase().trim()
    return rdvs.filter(r => {
      if (filters.type   && r.type        !== filters.type)   return false
      if (filters.statut && r.statut      !== filters.statut) return false
      if (filters.vet    && r.veterinaire !== filters.vet)    return false
      if (q && !(
        (r.patient || '').toLowerCase().includes(q) ||
        (r.proprio || '').toLowerCase().includes(q) ||
        (r.note    || '').toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [rdvs, filters])

  const todayRdvs  = filteredRdvs.filter(r => r.date === today()).sort(sortRdv)
  const futureRdvs = filteredRdvs.filter(r => r.date  > today()).sort(sortRdv)
  const pastRdvs   = rdvs.filter(r => r.date < today() && r.statut !== 'Terminé' && r.statut !== 'Annulé')

  const stats = [
    { label: "Aujourd'hui",  value: rdvs.filter(r => r.date === today()).length,                  mod: 'stat-tile--orange' },
    { label: 'Confirmés',    value: rdvs.filter(r => r.date === today() && r.statut === 'Confirmé').length, mod: 'stat-tile--green'  },
    { label: 'En attente',   value: rdvs.filter(r => r.statut === 'En attente').length,            mod: 'stat-tile--yellow' },
    { label: 'Total agenda', value: rdvs.length,                                                  mod: 'stat-tile--blue'   },
  ]

  const hasFilters = filters.search || filters.type || filters.statut || filters.vet
  const vets = equipe.filter(m => m.actif !== false && m.nom?.trim())

  // ── Carte RDV ────────────────────────────────────────────────
  const RDVCard = ({ r }) => {
    const isExpanded = expandedId === r.id
    return (
      <div className="rdv-card" style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: 'white', overflow: 'hidden', transition: 'box-shadow .18s' }}>
        {/* En-tête cliquable */}
        <button
          type="button"
          onClick={() => setExpandedId(isExpanded ? null : r.id)}
          className="w-full text-left p-4"
          style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)',
            border: '1px solid #99f6e4',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            <TypeDot type={r.type} size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-black text-slate-900 text-[15px] truncate">{r.patient}</span>
              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUT_STYLE[r.statut] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {r.statut}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-slate-500">
              <span className="font-black tabular-nums" style={{ color: '#0d9488' }}>{r.heure}</span>
              {r.duree && <span>{r.duree}</span>}
              {r.proprio && <span className="truncate">· {r.proprio}</span>}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex gap-2">
              <span className="font-semibold uppercase tracking-wide">{r.type}</span>
              {r.veterinaire && <span>· Dr. {r.veterinaire}</span>}
            </div>
          </div>
          <span style={{ color: '#94a3b8', fontSize: 14, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
        </button>

        {/* Corps dépliable */}
        {isExpanded && (
          <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 16px', background: '#fafbfc' }}>
            {r.note && (
              <p className="text-xs text-slate-600 mb-3 bg-white rounded-lg px-3 py-2 border border-slate-100">
                Note — {r.note}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {r.statut !== 'Terminé' && r.statut !== 'Annulé' && (
                <>
                  <button type="button" onClick={() => updateStatut(r.id, 'Terminé')}
                    className="rdv-action-btn" style={{ flex: '1 1 90px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                    ✓ Terminer
                  </button>
                  <button type="button" onClick={() => updateStatut(r.id, 'Confirmé')}
                    disabled={r.statut === 'Confirmé'}
                    className="rdv-action-btn" style={{ flex: '1 1 90px', border: '1px solid #99f6e4', background: r.statut === 'Confirmé' ? '#f0fdfa' : 'white', color: '#0d9488' }}>
                    ✓ Confirmer
                  </button>
                  <button type="button" onClick={() => sendWhatsApp(r)}
                    className="rdv-action-btn" style={{ flex: '1 1 90px', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a' }}>
                    Rappel WhatsApp
                  </button>
                  <button type="button" onClick={() => openEdit(r)}
                    className="rdv-action-btn" style={{ flex: '1 1 90px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb' }}>
                    Modifier
                  </button>
                  <button type="button" onClick={() => updateStatut(r.id, 'Annulé')}
                    className="rdv-action-btn" style={{ border: '1px solid #fecaca', background: '#fff5f5', color: '#ef4444' }}>
                    ✕
                  </button>
                </>
              )}
              {(r.statut === 'Terminé' || r.statut === 'Annulé') && (
                <>
                  <button type="button" onClick={() => openEdit(r)}
                    className="rdv-action-btn" style={{ flex: '1 1 90px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb' }}>
                    <Pencil size={12} strokeWidth={2.4} style={{ verticalAlign: '-2px', marginRight: 4 }} />Modifier
                  </button>
                  <button type="button" onClick={() => deleteRDV(r.id, r.patient)}
                    className="rdv-action-btn" style={{ border: '1px solid #fecaca', background: '#fff5f5', color: '#ef4444' }}>
                    <Trash2 size={12} strokeWidth={2.4} style={{ verticalAlign: '-2px', marginRight: 4 }} />Supprimer
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="app-page space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className={`stat-tile ${s.mod}`}>
            <div className="stat-tile__label">{s.label}</div>
            <div className="stat-tile__value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Alerte RDV en retard */}
      {pastRdvs.length > 0 && (
        <div className="app-card p-4 flex items-center gap-3" style={{ borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
          <span style={{ fontSize: 22 }}>⚠</span>
          <div>
            <p className="font-bold text-amber-800 text-sm">{pastRdvs.length} RDV passé(s) non clôturé(s)</p>
            <p className="text-xs text-amber-600">Ces rendez-vous sont dépassés sans statut Terminé ou Annulé.</p>
          </div>
        </div>
      )}

      {/* Calendrier interactif */}
      <AgendaCalendrier rdvs={rdvs} onDayClick={openNew} />

      {/* Panneau de rappels */}
      <RappelsPanel rdvs={rdvs} />

      {/* Légende types */}
      <div className="app-card p-4">
        <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wide mb-3">Types de rendez-vous</h3>
        <div className="flex flex-wrap gap-2">
          {Object.keys(TYPE_DOT).map((type) => (
            <span key={type}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
              <TypeDot type={type} size={9} /> {type}
            </span>
          ))}
        </div>
      </div>

      {/* ── Liste principale ── */}
      <div className="app-card">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2"><Calendar size={20} color="#2563eb" strokeWidth={2.3} /> Agenda & Rendez-vous</h2>
            <p className="text-xs text-slate-400 mt-0.5">{rdvs.length} RDV enregistré(s)</p>
          </div>
          <Btn onClick={() => showForm ? closeForm() : openNew()} color="brand">
            {showForm ? '✕ Annuler' : '+ Nouveau RDV'}
          </Btn>
        </div>

        {/* Formulaire création / modification */}
        {showForm && (
          <div id="rdv-form-anchor" className="p-5 border-b"
            style={{ background: 'linear-gradient(135deg,#f0fdfa,#f5fffe)', borderBottomColor: 'rgba(13,148,136,0.15)' }}>
            <h3 className="font-bold mb-4" style={{ color: '#0f766e' }}>
              {editId ? 'Modifier le rendez-vous' : '+ Nouveau rendez-vous'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Date *"  value={form.date}  onChange={f('date')}  type="date" />
              <Field label="Heure *" value={form.heure} onChange={f('heure')} type="time" />
              <Field label="Durée"   value={form.duree} onChange={f('duree')} options={DUREES} />
              <Field label="Type"    value={form.type}  onChange={f('type')}  options={Object.keys(TYPE_DOT)} />

              <div className="md:col-span-2">
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Patient *
                </label>
                <AutoSuggest
                  value={form.patient}
                  onChange={(e) => {
                    setForm(p => ({ ...p, patient: e.target.value }))
                    setPatSugg(patients.filter(p => p.nom.toLowerCase().includes(e.target.value.toLowerCase())).slice(0, 6))
                  }}
                  list={patSugg}
                  onSelect={(p) => {
                    setForm(prev => ({ ...prev, patient: p.nom, proprio: p.proprio || prev.proprio }))
                    setPatSugg([])
                  }}
                  placeholder="Nom de l'animal"
                />
              </div>

              <Field label="Propriétaire" value={form.proprio}     onChange={f('proprio')}     placeholder="Nom du propriétaire" />
              <Field label="Tél. proprio" value={form.tel}         onChange={f('tel')}         placeholder="+228 xx xx xx xx" type="tel" />

              <Field label="Vétérinaire"  value={form.veterinaire} onChange={f('veterinaire')}
                options={['', ...vets.map(m => m.nom)]} />
              <Field label="Statut"       value={form.statut}      onChange={f('statut')}
                options={['En attente', 'Confirmé', 'Terminé', 'Annulé']} />

              <Field label="Note" value={form.note} onChange={f('note')}
                placeholder="Informations complémentaires…" className="md:col-span-4" />
            </div>
            <div className="mt-4 flex gap-2">
              <Btn color="brand" onClick={saveRDV} disabled={saving}>
                {saving ? 'Enregistrement…' : (editId ? '✓ Mettre à jour' : '✓ Enregistrer le RDV')}
              </Btn>
              <Btn color="default" onClick={closeForm}>Annuler</Btn>
            </div>
          </div>
        )}

        {/* Barre de filtres */}
        <div className="px-5 pt-4 pb-2 flex flex-wrap gap-2 items-center border-b border-slate-50">
          <input
            value={filters.search}
            onChange={flt('search')}
            placeholder="Rechercher patient, proprio…"
            className="flex-1 min-w-[180px] text-sm px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-teal-400 bg-white"
          />
          <select value={filters.type} onChange={flt('type')}
            className="text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none focus:border-teal-400">
            <option value="">Tous types</option>
            {Object.keys(TYPE_DOT).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filters.statut} onChange={flt('statut')}
            className="text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none focus:border-teal-400">
            <option value="">Tous statuts</option>
            {['Confirmé', 'En attente', 'Terminé', 'Annulé'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {vets.length > 0 && (
            <select value={filters.vet} onChange={flt('vet')}
              className="text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none focus:border-teal-400">
              <option value="">Tous vétérinaires</option>
              {vets.map(m => <option key={m.id || m.nom} value={m.nom}>{m.nom}</option>)}
            </select>
          )}
          {hasFilters && (
            <button onClick={() => setFilters({ search: '', type: '', statut: '', vet: '' })}
              className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
              ✕ Effacer
            </button>
          )}
        </div>

        <div className="p-5 space-y-8">

          {/* Aujourd'hui */}
          <div>
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-base">
              Aujourd'hui
              <span className="text-sm font-medium text-slate-400">{today()}</span>
              {todayRdvs.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4' }}>
                  {todayRdvs.length}
                </span>
              )}
            </h3>
            {todayRdvs.length ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {todayRdvs.map(r => <RDVCard key={r.id} r={r} />)}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-slate-400 text-sm">
                <div className="text-3xl mb-2">🎉</div>
                {hasFilters ? 'Aucun RDV aujourd\'hui pour ces filtres' : 'Journée libre — aucun rendez-vous aujourd\'hui'}
              </div>
            )}
          </div>

          {/* À venir */}
          {futureRdvs.length > 0 && (
            <div>
              <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-base">
                À venir
                <span className="text-xs font-medium text-slate-400">{futureRdvs.length} RDV</span>
              </h3>
              <div className="space-y-5">
                {Object.entries(
                  futureRdvs.reduce((acc, r) => { acc[r.date] = [...(acc[r.date] || []), r]; return acc }, {})
                ).map(([date, items]) => (
                  <div key={date}>
                    <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide pl-1 flex items-center gap-2">
                      {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      <span className="px-1.5 py-0.5 rounded-full text-[10px]"
                        style={{ background: '#f0fdfa', color: '#0d9488', border: '1px solid #ccfbf1' }}>
                        {items.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {items.map(r => <RDVCard key={r.id} r={r} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredRdvs.length === 0 && (
            <EmptyState icon="📅" title="Aucun rendez-vous" subtitle={hasFilters ? 'Essayez d\'autres filtres.' : 'Planifiez votre premier rendez-vous.'} />
          )}
        </div>
      </div>
    </div>
  )
}

export default Agenda
