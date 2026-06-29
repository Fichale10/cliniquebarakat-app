import { useState } from 'react'
import AgendaCalendrier from './AgendaCalendrier'
import { Btn, Badge, Field, AutoSuggest, EmptyState } from '../../components/ui'
import { newId } from '../../lib/db'

const TYPE_DOT = {
  Consultation: '🔵',
  Vaccination: '🟢',
  Chirurgie: '🟣',
  Urgence: '🔴',
  'Contrôle post-op': '🟠',
  Echographie: '🩵',
  Détartrage: '🟡',
  Autre: '⚪',
}

const STATUT_STYLE = {
  Confirmé:    'bg-teal-50 text-teal-800 border-teal-200',
  'En attente':'bg-amber-50 text-amber-900 border-amber-200',
  Terminé:     'bg-slate-100 text-slate-600 border-slate-200',
  Annulé:      'bg-red-50 text-red-700 border-red-200',
}

const today = () => new Date().toISOString().split('T')[0]
const EMPTY_FORM = { date: today(), heure: '09:00', patient: '', proprio: '', type: 'Consultation', statut: 'En attente', note: '' }

function Agenda({ patients, rdvs = [], setRdvs, sb, dbInsert, dbUpdate, dbDelete, logAction, user }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [patSugg, setPatSugg] = useState([])
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  // ── Ajout ──────────────────────────────────────────────────
  const addRDV = async () => {
    if (!form.patient.trim()) return alert('Le nom du patient est requis.')
    setSaving(true)
    try {
      const row = { ...form, id: newId() }
      const saved = await dbInsert(sb, 'rdvs', row)
      const updated = [...rdvs, saved].sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure))
      setRdvs(updated)
      if (logAction) logAction(sb, user, 'rdv_added', `${form.patient} — ${form.date} ${form.heure}`)
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (e) {
      alert('Erreur lors de l\'enregistrement : ' + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  // ── Changement de statut ───────────────────────────────────
  const updateStatut = async (id, statut) => {
    try {
      await dbUpdate(sb, 'rdvs', id, { statut })
      setRdvs(rdvs.map(r => r.id === id ? { ...r, statut } : r))
    } catch (e) {
      alert('Erreur mise à jour : ' + (e?.message || e))
    }
  }

  // ── Suppression ────────────────────────────────────────────
  const deleteRDV = async (id, patient) => {
    if (!confirm(`Supprimer le RDV de ${patient} ?`)) return
    try {
      await dbDelete(sb, 'rdvs', id)
      setRdvs(rdvs.filter(r => r.id !== id))
    } catch (e) {
      alert('Erreur suppression : ' + (e?.message || e))
    }
  }

  // ── Rappel WhatsApp ────────────────────────────────────────
  const sendWhatsApp = (r) => {
    const msg = encodeURIComponent(
      `Bonjour ${r.proprio}, nous vous rappelons votre RDV vétérinaire pour ${r.patient} le ${r.date} à ${r.heure} à La Barakat. Merci de confirmer votre présence. 🐾`
    )
    window.open('https://wa.me/?text=' + msg, '_blank')
  }

  const todayRdvs  = rdvs.filter(r => r.date === today()).sort((a, b) => a.heure.localeCompare(b.heure))
  const futureRdvs = rdvs.filter(r => r.date > today()).sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure))
  const pastRdvs   = rdvs.filter(r => r.date < today() && r.statut !== 'Terminé' && r.statut !== 'Annulé')

  const stats = [
    { label: "RDV aujourd'hui", value: todayRdvs.length,                                  mod: 'stat-tile--orange' },
    { label: 'Confirmés',       value: todayRdvs.filter(r => r.statut === 'Confirmé').length, mod: 'stat-tile--green'  },
    { label: 'En attente',      value: rdvs.filter(r => r.statut === 'En attente').length, mod: 'stat-tile--yellow' },
    { label: 'Total agenda',    value: rdvs.length,                                        mod: 'stat-tile--blue'   },
  ]

  const RDVCard = ({ r }) => (
    <div className="rdv-card p-4 md:p-5">
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-0.5">{r.type}</p>
          <h4 className="text-base font-black text-slate-900 truncate">{r.patient}</h4>
        </div>
        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUT_STYLE[r.statut] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
          {r.statut}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', border: '1px solid #99f6e4' }}>
          {TYPE_DOT[r.type] || '🐾'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-700 truncate">{r.proprio || '—'}</p>
          <p className="text-base font-black tabular-nums" style={{ color: '#0d9488' }}>{r.heure}</p>
        </div>
      </div>

      {r.note && <p className="text-xs text-slate-500 mb-3 bg-slate-50 rounded-lg px-3 py-2">📌 {r.note}</p>}

      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
        {r.statut !== 'Terminé' && r.statut !== 'Annulé' && (
          <>
            <button type="button"
              onClick={() => updateStatut(r.id, 'Terminé')}
              className="flex-1 min-w-[90px] text-[11px] font-bold py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              ✓ Terminer
            </button>
            <button type="button"
              onClick={() => updateStatut(r.id, 'Confirmé')}
              disabled={r.statut === 'Confirmé'}
              className="flex-1 min-w-[90px] text-[11px] font-bold py-2 rounded-xl transition-colors"
              style={{ border: '1px solid #99f6e4', background: r.statut === 'Confirmé' ? '#f0fdfa' : 'white', color: '#0d9488' }}>
              ✓ Confirmer
            </button>
            <button type="button" onClick={() => sendWhatsApp(r)}
              className="flex-1 min-w-[90px] text-[11px] font-bold py-2 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors">
              📲 Rappel
            </button>
            <button type="button" onClick={() => updateStatut(r.id, 'Annulé')}
              className="text-[11px] font-bold px-3 py-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors">
              ✕
            </button>
          </>
        )}
        {(r.statut === 'Terminé' || r.statut === 'Annulé') && (
          <button type="button" onClick={() => deleteRDV(r.id, r.patient)}
            className="text-[11px] font-bold px-3 py-2 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 transition-colors">
            🗑 Supprimer
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="app-page space-y-5">
      {/* KPI */}
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
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div>
            <p className="font-bold text-amber-800 text-sm">{pastRdvs.length} RDV passé(s) non clôturé(s)</p>
            <p className="text-xs text-amber-600">Ces rendez-vous sont dépassés sans statut Terminé ou Annulé.</p>
          </div>
        </div>
      )}

      <AgendaCalendrier rdvs={rdvs} />

      {/* Légende types */}
      <div className="app-card p-4">
        <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wide mb-3">Types de rendez-vous</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_DOT).map(([type, dot]) => (
            <span key={type}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
              {dot} {type}
            </span>
          ))}
        </div>
      </div>

      {/* Liste principale */}
      <div className="app-card">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">📅 Agenda & Rendez-vous</h2>
            <p className="text-xs text-slate-400 mt-0.5">{rdvs.length} RDV enregistré(s)</p>
          </div>
          <Btn onClick={() => setShowForm(v => !v)} color="brand">
            {showForm ? '✕ Annuler' : '+ Nouveau RDV'}
          </Btn>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="p-5 border-b" style={{ background: 'linear-gradient(135deg,#f0fdfa,#f5fffe)', borderBottomColor: 'rgba(13,148,136,0.15)' }}>
            <h3 className="font-bold mb-4" style={{ color: '#0f766e' }}>Nouveau rendez-vous</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Date *"  value={form.date}   onChange={f('date')}   type="date" />
              <Field label="Heure *" value={form.heure}  onChange={f('heure')}  type="time" />
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
                  onSelect={(p) => { setForm(f => ({ ...f, patient: p.nom, proprio: p.proprio })); setPatSugg([]) }}
                  placeholder="Nom de l'animal"
                />
              </div>
              <Field label="Propriétaire" value={form.proprio} onChange={f('proprio')} placeholder="Propriétaire" />
              <Field label="Type de RDV"  value={form.type}    onChange={f('type')}    options={Object.keys(TYPE_DOT)} />
              <Field label="Statut"       value={form.statut}  onChange={f('statut')}  options={['En attente', 'Confirmé']} />
              <Field label="Note"         value={form.note}    onChange={f('note')}    placeholder="Informations complémentaires…" className="md:col-span-2" />
            </div>
            <div className="mt-4">
              <Btn color="brand" onClick={addRDV} disabled={saving}>
                {saving ? '⏳ Enregistrement…' : '✓ Enregistrer le RDV'}
              </Btn>
            </div>
          </div>
        )}

        <div className="p-5 space-y-8">
          {/* Aujourd'hui */}
          <div>
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-base">
              📍 Aujourd'hui
              <span className="text-sm font-medium text-slate-400">{today()}</span>
              {todayRdvs.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4' }}>
                  {todayRdvs.length}
                </span>
              )}
            </h3>
            {todayRdvs.length ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {todayRdvs.map(r => <RDVCard key={r.id} r={r} />)}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center text-slate-400 text-sm">
                <div className="text-3xl mb-2">🎉</div>
                Journée libre — aucun rendez-vous aujourd'hui
              </div>
            )}
          </div>

          {/* À venir */}
          {futureRdvs.length > 0 && (
            <div>
              <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-base">
                📆 À venir
                <span className="text-xs font-medium text-slate-400">{futureRdvs.length} RDV</span>
              </h3>
              <div className="space-y-4">
                {Object.entries(
                  futureRdvs.reduce((acc, r) => { acc[r.date] = [...(acc[r.date] || []), r]; return acc }, {})
                ).map(([date, items]) => (
                  <div key={date}>
                    <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide pl-1">
                      {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {items.map(r => <RDVCard key={r.id} r={r} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rdvs.length === 0 && <EmptyState icon="📅" title="Aucun rendez-vous enregistré" subtitle="Planifiez votre premier rendez-vous pour commencer." />}
        </div>
      </div>
    </div>
  )
}

export default Agenda
