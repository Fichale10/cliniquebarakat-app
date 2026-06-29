import { useState } from 'react'
import { Btn, Badge, Field, DupWarning, ValidationBanner, FormPanel, FormSection, FilterBar, FilterSelect, FilterBtns, Pagination, usePagination, EmptyState } from '../../components/ui'
import { dbInsert, dbDelete, newId } from '../../lib/db'
import { validatePatientForm, patientFormToRow } from '../../lib/validation'

function Patients({ patients, setPatients, clients, user, sb, logAction }) {
  const emptyForm = () => ({
    nom:'', espece:'Chien', race:'', age:'', sexe:'M',
    proprio:'', tel:'', poids:'', couleur:'',
    allergies:'', antecedents:'', photo:'',
  })

  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(emptyForm())
  const [dups, setDups]         = useState([])
  const [pending, setPending]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [fEspece, setFEspece]   = useState('')
  const [fAllergies, setFAllergies] = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [validationMessages, setValidationMessages] = useState([])

  const patchForm = (patch) => {
    setForm(prev => ({ ...prev, ...patch }))
    const keys = Object.keys(patch)
    setFormErrors(prev => {
      const next = { ...prev }
      keys.forEach(k => delete next[k])
      return next
    })
    if (validationMessages.length) setValidationMessages([])
  }

  const f = v => e => patchForm({ [v]: e.target.value })
  const emoji = { Chien:'🐕', Chat:'🐈', Bovin:'🐄', Caprin:'🐐', Ovin:'🐑', Volaille:'🐓' }

  const findDups = (nom) => {
    const q = String(nom || '').toLowerCase().trim()
    return patients.filter(p => String(p.nom || '').toLowerCase().trim() === q)
  }

  // ── Ajout avec Supabase ───────────────────────────────────
  const doAdd = async () => {
    const checked = validatePatientForm(form)
    if (!checked.ok) {
      setFormErrors(checked.fieldErrors)
      setValidationMessages(checked.messages)
      return
    }

    setSaving(true)
    try {
      const row = patientFormToRow(checked.data, newId())
      const saved = await dbInsert(sb, 'patients', row)
      setPatients([...patients, saved])
      if (logAction && sb) logAction(sb, user, 'patient_added', `${row.nom} (${row.espece})`)
      setForm(emptyForm())
      setShowForm(false)
      setDups([])
      setPending(false)
      setFormErrors({})
      setValidationMessages([])
    } catch (e) {
      console.error('[Patients] Erreur ajout:', e)
      alert('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = () => {
    const checked = validatePatientForm(form)
    if (!checked.ok) {
      setFormErrors(checked.fieldErrors)
      setValidationMessages(checked.messages)
      return
    }
    const d = findDups(form.nom)
    if (d.length) { setDups(d); setPending(true) } else doAdd()
  }

  // ── Suppression avec Supabase ─────────────────────────────
  const handleDelete = async (p) => {
    if (!confirm(`Supprimer ${p.nom} ?`)) return
    try {
      await dbDelete(sb, 'patients', p.id)
      setPatients(patients.filter((x) => x.id !== p.id))
      if (logAction && sb) logAction(sb, user, 'patient_deleted', p.nom)
    } catch (e) {
      alert(e?.message || 'Suppression impossible.')
    }
  }

  const especes = [...new Set(patients.map(p => p.espece))].filter(Boolean)
  const filtered = patients.filter(p => {
    const q = search.toLowerCase()
    if (q && !p.nom.toLowerCase().includes(q) &&
             !p.proprio.toLowerCase().includes(q) &&
             !p.espece.toLowerCase().includes(q)) return false
    if (fEspece && p.espece !== fEspece) return false
    if (fAllergies === 'oui' && !p.allergies) return false
    if (fAllergies === 'non' && p.allergies)  return false
    return true
  })

  const activeFilters = [fEspece, fAllergies].filter(Boolean).length
  const resetFilters  = () => { setSearch(''); setFEspece(''); setFAllergies('') }
  const pagination    = usePagination(filtered)
  const clientSugg    = form.proprio.length > 1
    ? clients.filter(c => c.nom.toLowerCase().includes(form.proprio.toLowerCase()))
    : []

  return (
    <div className="app-page space-y-5">
      <div className="app-card">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">🐾 Patients</h2>
            <p className="text-sm text-slate-500">{patients.length} patient(s)</p>
          </div>
          <Btn onClick={() => setShowForm(!showForm)}>{showForm ? '✕ Annuler' : '+ Nouveau patient'}</Btn>
        </div>

        {showForm && (
          <FormPanel icon="🐾" title="Nouveau patient" subtitle="Enregistrez les informations de l'animal" color="teal" onClose={() => setShowForm(false)}>
            {pending && <DupWarning dups={dups} entity="patient" onOk={doAdd} onCancel={() => { setDups([]); setPending(false) }} />}
            <ValidationBanner messages={validationMessages} onDismiss={() => setValidationMessages([])} />
            <FormSection label="Animal" icon="🐾" color="teal" noTopMargin>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
              <Field label="Nom *"     value={form.nom}     onChange={f('nom')}     error={formErrors.nom}     placeholder="Nom de l'animal" />
              <Field label="Espèce"    value={form.espece}  onChange={f('espece')}  error={formErrors.espece}  options={['Chien','Chat','Bovin','Caprin','Ovin','Volaille']} />
              <Field label="Race"      value={form.race}    onChange={f('race')}    error={formErrors.race}    placeholder="Race" />
              <Field label="Âge"       value={form.age}     onChange={f('age')}     error={formErrors.age}     placeholder="ex: 3 ans" />
              <Field label="Sexe"      value={form.sexe}    onChange={f('sexe')}    error={formErrors.sexe}    options={['M – Mâle','F – Femelle']} />
              <Field label="Poids"     value={form.poids}   onChange={f('poids')}   error={formErrors.poids}   placeholder="ex: 12 kg" />
              <Field label="Couleur"   value={form.couleur} onChange={f('couleur')} error={formErrors.couleur} placeholder="Couleur" />

              {/* Autocomplete propriétaire */}
              <div className="relative">
                <label style={{ fontSize: 11, fontWeight: 700, color: formErrors.proprio ? '#dc2626' : '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, userSelect: 'none' }}>
                  {formErrors.proprio && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', display: 'inline-block', flexShrink: 0 }} />}
                  Propriétaire *
                </label>
                <input
                  style={{ border: `1.5px solid ${formErrors.proprio ? '#f87171' : '#e2e8f0'}`, borderRadius: 12, padding: '10px 14px', fontSize: '13.5px', width: '100%', outline: 'none', background: 'var(--app-surface)', fontFamily: "'Outfit',sans-serif", transition: 'border-color .18s, box-shadow .18s', lineHeight: '1.45', color: 'var(--app-text)' }}
                  onFocus={e => { e.target.style.borderColor='#0d9488'; e.target.style.boxShadow='0 0 0 3.5px rgba(13,148,136,0.14)' }}
                  onBlur={e  => { e.target.style.borderColor= formErrors.proprio ? '#f87171' : '#e2e8f0'; e.target.style.boxShadow='none' }}
                  placeholder="Nom du propriétaire"
                  value={form.proprio}
                  onChange={f('proprio')}
                />
                {formErrors.proprio && (
                  <p style={{ fontSize: '11px', color: '#dc2626', marginTop: '5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>⚠</span>{formErrors.proprio}
                  </p>
                )}
                {clientSugg.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg mt-1">
                    {clientSugg.map((c, i) => (
                      <div key={i} onClick={() => patchForm({ proprio: c.nom, tel: c.tel })}
                        className="px-3 py-2.5 hover:bg-teal-50 cursor-pointer text-sm flex justify-between">
                        <span className="font-semibold">{c.nom}</span>
                        <span className="text-slate-400">{c.tel}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Field label="Téléphone" value={form.tel} onChange={f('tel')} error={formErrors.tel} placeholder="+228 XX XX XX XX" />
            </div>
            </FormSection>

            <FormSection label="Informations médicales" icon="🩺" color="teal">
              <div className="grid grid-cols-2 gap-3">
                <Field label="⚠️ Allergies connues"    value={form.allergies}   onChange={f('allergies')}   error={formErrors.allergies}   placeholder="ex: Pénicilline…" />
                <Field label="📋 Antécédents médicaux" value={form.antecedents} onChange={f('antecedents')} error={formErrors.antecedents} placeholder="ex: Stérilisation 2024…" />
                <Field label="📷 Photo URL (optionnel)" value={form.photo}      onChange={f('photo')}       error={formErrors.photo}       placeholder="https://…" className="md:col-span-2" />
              </div>
            </FormSection>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <Btn onClick={handleAdd} disabled={saving}>
                {saving ? '⏳ Enregistrement…' : '✓ Enregistrer le patient'}
              </Btn>
            </div>
          </FormPanel>
        )}

        <FilterBar search={search} onSearch={setSearch} placeholder="🔍 Patient, propriétaire, espèce…" activeCount={activeFilters} onReset={resetFilters}>
          <FilterSelect label="🐾 Espèce" value={fEspece} onChange={setFEspece} options={especes.map(e => ({ v:e, l:e }))} />
          <FilterBtns options={[{v:'oui',l:'🚨 Avec allergies'},{v:'non',l:'✓ Sans allergies'}]} value={fAllergies} onChange={setFAllergies} colorFn={v => v==='oui'?'red':'green'} />
          <span className="text-xs text-slate-400">{filtered.length}/{patients.length} patient(s)</span>
        </FilterBar>

        <div className="p-4">
          <div className="space-y-3">
            {pagination.pageItems.map(p => {
              const vaccins = p.vaccins || []
              const prochainVaccin = vaccins.find(v => v.prochain && new Date(v.prochain) >= new Date())
              return (
                <div key={p.id} className="app-card p-4 hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'1px solid #bbf7d0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', flexShrink:0 }}>
                      {emoji[p.espece] || '🐾'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-lg text-slate-900">{p.nom}</h3>
                        <Badge color="slate">{p.sexe === 'M' ? 'Mâle' : 'Femelle'}</Badge>
                        {p.allergies && <Badge color="red">⚠️ Allergie</Badge>}
                        {prochainVaccin && <Badge color="green">💉 Vaccin J-{Math.round((new Date(prochainVaccin.prochain) - new Date()) / 86400000)}</Badge>}
                      </div>
                      <p className="text-sm text-slate-600">{p.espece} · {p.race} {p.age ? `· ${p.age}` : ''} {p.poids ? <span className="font-semibold text-slate-700"> · ⚖️ {p.poids}</span> : ''}</p>
                      <p className="text-sm text-slate-500">👤 {p.proprio} · 📞 {p.tel}</p>
                      {p.allergies   && <p className="text-xs text-red-500 mt-1 font-semibold">⚠️ Allergie : {p.allergies}</p>}
                      {p.antecedents && <p className="text-xs text-slate-400 mt-1">📋 {p.antecedents}</p>}
                      {vaccins.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {vaccins.map((v, vi) => (
                            <span key={vi} style={{ fontSize:'11px', padding:'2px 7px', borderRadius:'999px', background:'#f0fdf4', color:'#166534', border:'1px solid #bbf7d0', fontWeight:600 }}>
                              💉 {v.nom} · {v.date}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleDelete(p)}
                      className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 shrink-0">
                      🗑
                    </button>
                  </div>
                </div>
              )
            })}
            {!filtered.length && <EmptyState icon="🐾" title="Aucun patient" subtitle="Enregistrez le premier patient pour commencer à gérer vos consultations." />}
          </div>
        </div>
        <Pagination {...pagination} />
      </div>
    </div>
  )
}

export default Patients