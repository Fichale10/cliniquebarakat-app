import { useState } from 'react'
import AgendaCalendrier from './AgendaCalendrier'
import { Btn, Badge, Field, AutoSuggest } from '../../components/ui'

function Agenda({ patients }) {
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

  const today = () => new Date().toISOString().split('T')[0]

  const [rdvs, setRdvs] = useState([
    { id: 1, date: today(), heure: '09:00', patient: 'Rex', proprio: 'Dupont Jean', type: 'Vaccination', statut: 'Confirmé', note: '' },
    { id: 2, date: today(), heure: '10:30', patient: 'Mimi', proprio: 'Martin Sophie', type: 'Contrôle post-op', statut: 'Confirmé', note: 'Suivi op 05/09' },
    { id: 3, date: today(), heure: '14:00', patient: 'Bella', proprio: 'Ferme Kokou', type: 'Echographie', statut: 'En attente', note: 'Contrôle gestation' },
    {
      id: 4,
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      heure: '09:30',
      patient: 'Simba',
      proprio: 'Akouavi Afi',
      type: 'Consultation',
      statut: 'Confirmé',
      note: '',
    },
    {
      id: 5,
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      heure: '11:00',
      patient: 'Rex',
      proprio: 'Dupont Jean',
      type: 'Urgence',
      statut: 'En attente',
      note: 'Boiterie aggravée',
    },
  ])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    date: today(),
    heure: '09:00',
    patient: '',
    proprio: '',
    type: 'Consultation',
    statut: 'En attente',
    note: '',
  })
  const f = (v) => (e) => setForm({ ...form, [v]: e.target.value })
  const [patSugg, setPatSugg] = useState([])

  const todayRdvs = rdvs.filter((r) => r.date === today()).sort((a, b) => a.heure.localeCompare(b.heure))
  const futureRdvs = rdvs.filter((r) => r.date > today()).sort((a, b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure))

  const STATUT_BADGE = {
    Confirmé: 'bg-orange-50 text-orange-800 border-orange-200',
    'En attente': 'bg-amber-50 text-amber-900 border-amber-200',
    Terminé: 'bg-purple-50 text-purple-800 border-purple-200',
    Annulé: 'bg-red-50 text-red-800 border-red-200',
  }

  const RDVCard = ({ r }) => (
    <div className="rdv-card p-4 md:p-5">
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-0.5">{r.type}</p>
          <h4 className="text-lg font-black text-slate-900 tracking-tight">{r.patient}</h4>
        </div>
        <span
          className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUT_BADGE[r.statut] || 'bg-slate-100 text-slate-700 border-slate-200'}`}
        >
          {r.statut}
        </span>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: 'linear-gradient(145deg, #f8fafc, #e2e8f0)' }}
        >
          {TYPE_DOT[r.type] || '🐾'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-700 truncate">{r.proprio}</p>
          <p className="text-base font-black text-orange-600 tabular-nums">{r.heure}</p>
        </div>
      </div>
      {r.note && <p className="text-xs text-slate-500 mb-3 pl-0.5">📌 {r.note}</p>}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
        {r.statut !== 'Terminé' && r.statut !== 'Annulé' && (
          <>
            <button
              type="button"
              onClick={() => setRdvs(rdvs.map((x) => (x.id === r.id ? { ...x, statut: 'Terminé' } : x)))}
              className="flex-1 min-w-[100px] text-[11px] font-bold tracking-wide py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              Terminer
            </button>
            <button
              type="button"
              onClick={() => {
                const msg = encodeURIComponent(
                  `Bonjour ${r.proprio}, nous vous rappelons votre RDV vétérinaire pour ${r.patient} le ${r.date} à ${r.heure} à La Barakat Pharmacie & Clinique Vétérinaire. Merci de confirmer votre présence. 🐾`
                )
                window.open('https://wa.me/?text=' + msg, '_blank')
              }}
              className="flex-1 min-w-[100px] text-[11px] font-bold tracking-wide py-2.5 rounded-xl border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              Rappel
            </button>
            <button
              type="button"
              onClick={() => setRdvs(rdvs.map((x) => (x.id === r.id ? { ...x, statut: 'Annulé' } : x)))}
              className="text-[11px] font-bold px-3 py-2.5 rounded-xl border-2 border-red-100 text-red-600 hover:bg-red-50 transition-colors"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  )

  const stats = [
    { label: "RDV aujourd'hui", value: todayRdvs.length, mod: 'stat-tile--orange' },
    { label: 'Confirmés', value: todayRdvs.filter((r) => r.statut === 'Confirmé').length, mod: 'stat-tile--green' },
    { label: 'En attente', value: todayRdvs.filter((r) => r.statut === 'En attente').length, mod: 'stat-tile--yellow' },
    { label: 'Total agenda', value: rdvs.length, mod: 'stat-tile--blue' },
  ]

  return (
    <div className="app-page space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className={`stat-tile ${s.mod}`}>
            <div className="stat-tile__label">{s.label}</div>
            <div className="stat-tile__value">{s.value}</div>
          </div>
        ))}
      </div>

      <AgendaCalendrier rdvs={rdvs} />

      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <h3 className="font-bold text-sm text-slate-600 mb-3">Types de rendez-vous</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_DOT).map(([type, dot]) => (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700"
            >
              <span>{dot}</span>
              {type}
            </span>
          ))}
        </div>
      </div>

      <div className="app-card">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">📅 Agenda & Rendez-vous</h2>
            <p className="text-xs text-slate-500 mt-0.5">Planifiez et suivez les consultations comme sur un tableau de bord clinique.</p>
          </div>
          <Btn onClick={() => setShowForm(!showForm)} color="accent">
            {showForm ? '✕ Annuler' : '+ Nouveau RDV'}
          </Btn>
        </div>
        {showForm && (
          <div className="p-5 bg-blue-50 border-b border-blue-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Date" value={form.date} onChange={f('date')} type="date" />
              <Field label="Heure" value={form.heure} onChange={f('heure')} type="time" />
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-600 mb-1 block">Patient</label>
                <AutoSuggest
                  value={form.patient}
                  onChange={(e) => {
                    setForm({ ...form, patient: e.target.value })
                    setPatSugg(patients.filter((p) => p.nom.toLowerCase().includes(e.target.value.toLowerCase())))
                  }}
                  list={patSugg}
                  onSelect={(p) => setForm({ ...form, patient: p.nom, proprio: p.proprio })}
                  placeholder="Nom"
                />
              </div>
              <Field label="Propriétaire" value={form.proprio} onChange={f('proprio')} placeholder="Propriétaire" />
              <Field
                label="Type de RDV"
                value={form.type}
                onChange={f('type')}
                options={Object.keys(TYPE_DOT)}
              />
              <Field label="Statut" value={form.statut} onChange={f('statut')} options={['En attente', 'Confirmé']} />
              <Field label="Note" value={form.note} onChange={f('note')} placeholder="Information…" className="md:col-span-2" />
            </div>
            <div className="mt-3">
              <Btn
                color="accent"
                onClick={() => {
                  if (!form.patient) return alert('Patient requis')
                  setRdvs(
                    [...rdvs, { ...form, id: Date.now() }].sort((a, b) => a.date.localeCompare(b.date))
                  )
                  setForm({
                    date: today(),
                    heure: '09:00',
                    patient: '',
                    proprio: '',
                    type: 'Consultation',
                    statut: 'En attente',
                    note: '',
                  })
                  setShowForm(false)
                }}
              >
                ✓ Enregistrer
              </Btn>
            </div>
          </div>
        )}
        <div className="p-5 space-y-8">
          <div>
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-base">
              📍 Aujourd'hui <span className="text-sm font-medium text-slate-400">{today()}</span>
            </h3>
            {todayRdvs.length ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {todayRdvs.map((r) => (
                  <RDVCard key={r.id} r={r} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-10 text-center text-slate-500 text-sm">Journée libre 🎉</div>
            )}
          </div>
          {futureRdvs.length > 0 && (
            <div>
              <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-base">📆 À venir</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {futureRdvs.map((r) => (
                  <div key={r.id}>
                    <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide pl-1">{r.date}</div>
                    <RDVCard r={r} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Agenda
