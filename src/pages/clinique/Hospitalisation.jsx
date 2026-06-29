import { useState, useMemo } from 'react'
import { Btn, Badge, Field, AutoSuggest, EmptyState } from '../../components/ui'
import { newId } from '../../lib/db'

const today = () => new Date().toISOString().split('T')[0]
const nowTime = () => new Date().toTimeString().slice(0, 5)

const CAGES = ['A1','A2','A3','B1','B2','B3','C1','C2']
const SOIN_TYPES = ['Médicament','Perfusion','Repas','Vitaux','Pansement','Autre']
const SOIN_COLORS = { Médicament:'blue', Perfusion:'cyan', Repas:'green', Vitaux:'purple', Pansement:'orange', Autre:'slate' }
const EMPTY_FORM = { cage:'', patient:'', espece:'Chien', proprio:'', date_entree: today(), motif:'' }
const EMPTY_VITAL = { heure: nowTime(), temp:'', fc:'', fr:'', note:'' }
const EMPTY_SOIN  = { heure:'08:00', type:'Médicament', detail:'', fait:false }

function Hospitalisation({ patients, hospitalisations = [], setHospitalisations, sb, dbInsert, dbUpdate, dbDelete, user, logAction }) {
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [patSugg, setPatSugg]       = useState([])
  const [saving, setSaving]         = useState(false)
  const [selId, setSelId]           = useState(null)
  const [newVital, setNewVital]     = useState(EMPTY_VITAL)
  const [newSoin, setNewSoin]       = useState(EMPTY_SOIN)
  const [showAddSoin, setShowAddSoin] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const sel = selId ? hospitalisations.find(h => h.id === selId) : null
  const occupees = hospitalisations.filter(h => h.statut === 'Hospitalisé').map(h => h.cage)

  // ── Hospitaliser ────────────────────────────────────────────
  const addHospi = async () => {
    if (!form.cage) return alert('Choisissez une cage')
    if (!form.patient.trim()) return alert('Patient requis')
    setSaving(true)
    try {
      const row = { ...form, id: newId(), statut: 'Hospitalisé', date_sortie: null, soins: [], vitaux: [] }
      const saved = await dbInsert(sb, 'hospitalisations', row)
      setHospitalisations([saved, ...hospitalisations])
      if (logAction) logAction(sb, user, 'hospi_created', `${form.patient} — cage ${form.cage}`)
      setForm(EMPTY_FORM)
      setShowForm(false)
      setSelId(saved.id)
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  // ── Mise à jour générique ────────────────────────────────────
  const updateHospi = async (id, updates) => {
    try {
      const saved = await dbUpdate(sb, 'hospitalisations', id, updates)
      setHospitalisations(hospitalisations.map(h => h.id === id ? { ...h, ...updates, ...saved } : h))
    } catch (e) {
      alert('Erreur mise à jour : ' + (e?.message || e))
    }
  }

  // ── Sortie patient ───────────────────────────────────────────
  const sortir = (id) => updateHospi(id, { statut: 'Sorti', date_sortie: today() }).then(() => setSelId(null))

  // ── Soin : toggle fait/pas fait ──────────────────────────────
  const toggleSoin = (hospi, idx) => {
    const soins = hospi.soins.map((s, i) => i === idx ? { ...s, fait: !s.fait } : s)
    updateHospi(hospi.id, { soins })
  }

  // ── Ajouter un soin ──────────────────────────────────────────
  const addSoin = () => {
    if (!newSoin.detail.trim()) return alert('Détail du soin requis')
    const soins = [...(sel.soins || []), { ...newSoin, fait: false }]
    updateHospi(sel.id, { soins })
    setNewSoin(EMPTY_SOIN)
    setShowAddSoin(false)
  }

  // ── Ajouter vitaux ───────────────────────────────────────────
  const addVital = () => {
    if (!newVital.temp) return alert('Température requise')
    const vitaux = [...(sel.vitaux || []), { ...newVital }]
    updateHospi(sel.id, { vitaux })
    setNewVital({ ...EMPTY_VITAL, heure: nowTime() })
  }

  // ── Supprimer ────────────────────────────────────────────────
  const deleteHospi = async (id) => {
    try {
      await dbDelete(sb, 'hospitalisations', id)
      setHospitalisations(hospitalisations.filter(h => h.id !== id))
      if (selId === id) setSelId(null)
      setConfirmDel(null)
    } catch (e) {
      alert('Erreur suppression : ' + (e?.message || e))
    }
  }

  const actifs = hospitalisations.filter(h => h.statut === 'Hospitalisé')
  const sortis = hospitalisations.filter(h => h.statut === 'Sorti')

  return (
    <div className="app-page space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Cages totales',  v: CAGES.length,                                                                   mod: 'stat-tile--blue'   },
          { l: 'Occupées',       v: occupees.length,                                                                mod: 'stat-tile--orange' },
          { l: 'Disponibles',    v: CAGES.length - occupees.length,                                                 mod: 'stat-tile--green'  },
          { l: 'Sorties totales',v: sortis.length,                                                                  mod: 'stat-tile--slate'  },
        ].map((s, i) => (
          <div key={i} className={`stat-tile ${s.mod}`}>
            <div className="stat-tile__label">{s.l}</div>
            <div className="stat-tile__value">{s.v}</div>
          </div>
        ))}
      </div>

      {/* Plan des cages */}
      <div className="app-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">🏥 Plan des cages</h3>
          <Btn onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ Annuler' : '+ Hospitaliser un patient'}
          </Btn>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="rounded-2xl p-4 mb-4 border" style={{ background: 'linear-gradient(135deg,#f0fdfa,#f5fffe)', borderColor: 'rgba(13,148,136,0.2)' }}>
            <h4 className="font-bold mb-3" style={{ color: '#0f766e' }}>Nouvelle hospitalisation</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              {/* Cage */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>Cage *</label>
                <select style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, width: '100%', outline: 'none', fontFamily: 'Outfit,sans-serif' }}
                  value={form.cage} onChange={f('cage')}>
                  <option value="">— Choisir —</option>
                  {CAGES.filter(c => !occupees.includes(c)).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Patient */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>Patient *</label>
                <AutoSuggest
                  value={form.patient}
                  onChange={e => { setForm(p => ({ ...p, patient: e.target.value })); setPatSugg(patients.filter(p => p.nom.toLowerCase().includes(e.target.value.toLowerCase())).slice(0, 6)) }}
                  list={patSugg}
                  onSelect={p => { setForm(fp => ({ ...fp, patient: p.nom, proprio: p.proprio || '', espece: p.espece || 'Chien' })); setPatSugg([]) }}
                  placeholder="Nom de l'animal"
                />
              </div>

              <Field label="Espèce" value={form.espece} onChange={f('espece')} options={['Chien','Chat','Bovin','Caprin','Ovin','Autre']} />
              <Field label="Propriétaire" value={form.proprio} onChange={f('proprio')} placeholder="Propriétaire" />
              <Field label="Date entrée" value={form.date_entree} onChange={f('date_entree')} type="date" />
              <Field label="Motif" value={form.motif} onChange={f('motif')} placeholder="Motif d'hospitalisation" />
            </div>
            <Btn color="brand" onClick={addHospi} disabled={saving}>
              {saving ? '⏳ Enregistrement…' : '✓ Hospitaliser'}
            </Btn>
          </div>
        )}

        {/* Grille cages */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {CAGES.map(cage => {
            const occ = hospitalisations.find(h => h.cage === cage && h.statut === 'Hospitalisé')
            const isSelected = occ && selId === occ.id
            return (
              <div key={cage}
                onClick={() => occ && setSelId(isSelected ? null : occ.id)}
                className="rounded-xl p-3 border-2 text-center transition-all"
                style={{
                  borderColor: occ ? (isSelected ? '#0d9488' : '#f97316') : '#e2e8f0',
                  background: occ ? (isSelected ? '#f0fdfa' : '#fff7ed') : '#f8fafc',
                  cursor: occ ? 'pointer' : 'default',
                  boxShadow: isSelected ? '0 0 0 3px rgba(13,148,136,0.2)' : undefined,
                }}>
                <div className="text-2xl mb-1">{occ ? '🐾' : '🟩'}</div>
                <div className="font-bold text-sm">{cage}</div>
                {occ
                  ? <div className="text-xs font-semibold truncate mt-0.5" style={{ color: '#c2410c' }}>{occ.patient}</div>
                  : <div className="text-xs text-slate-400 mt-0.5">Libre</div>
                }
              </div>
            )
          })}
        </div>
      </div>

      {/* Fiche patient sélectionné */}
      {sel && (
        <div className="app-card overflow-hidden">
          {/* En-tête fiche */}
          <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            style={{ background: 'linear-gradient(135deg,#fff7ed,#fffbf5)' }}>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                🐾 {sel.patient}
                <Badge color="orange">Cage {sel.cage}</Badge>
                <Badge color={sel.statut === 'Hospitalisé' ? 'blue' : 'green'}>{sel.statut}</Badge>
              </h3>
              <p className="text-sm text-slate-600 mt-1">{sel.espece} · {sel.proprio} · Entrée le {sel.date_entree}</p>
              <p className="text-sm text-slate-500">Motif : {sel.motif || '—'}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {sel.statut === 'Hospitalisé' && (
                <Btn onClick={() => sortir(sel.id)} color="green">✓ Sortie du patient</Btn>
              )}
              <button onClick={() => setConfirmDel(sel.id)}
                style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', cursor: 'pointer' }}>
                🗑
              </button>
            </div>
          </div>

          {confirmDel === sel.id && (
            <div className="px-5 py-3 flex items-center justify-between gap-3" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
              <p className="text-sm font-semibold text-red-700">⚠️ Supprimer le dossier de {sel.patient} ?</p>
              <div className="flex gap-2">
                <button onClick={() => deleteHospi(sel.id)}
                  style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Confirmer
                </button>
                <button onClick={() => setConfirmDel(null)}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Feuille de soins */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold flex items-center gap-2">📋 Feuille de soins</h4>
                {sel.statut === 'Hospitalisé' && (
                  <button onClick={() => setShowAddSoin(v => !v)}
                    style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: '#f0fdfa', border: '1px solid #99f6e4', color: '#0d9488', cursor: 'pointer' }}>
                    {showAddSoin ? '✕' : '+ Soin'}
                  </button>
                )}
              </div>

              {/* Formulaire ajout soin */}
              {showAddSoin && (
                <div className="mb-3 p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Heure</label>
                      <input type="time" style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px', fontSize: 12, width: '100%', outline: 'none' }}
                        value={newSoin.heure} onChange={e => setNewSoin(p => ({ ...p, heure: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Type</label>
                      <select style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px', fontSize: 12, width: '100%', outline: 'none' }}
                        value={newSoin.type} onChange={e => setNewSoin(p => ({ ...p, type: e.target.value }))}>
                        {SOIN_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <input style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12, width: '100%', outline: 'none' }}
                    placeholder="Détail du soin…" value={newSoin.detail}
                    onChange={e => setNewSoin(p => ({ ...p, detail: e.target.value }))} />
                  <button onClick={addSoin}
                    style={{ background: '#0d9488', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✓ Ajouter
                  </button>
                </div>
              )}

              {/* Liste soins */}
              <div className="space-y-2">
                {(sel.soins || []).length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">Aucun soin planifié</p>
                )}
                {(sel.soins || []).map((s, i) => (
                  <div key={i}
                    onClick={() => sel.statut === 'Hospitalisé' && toggleSoin(sel, i)}
                    className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: s.fait ? '#86efac' : '#e2e8f0',
                      background: s.fait ? '#f0fdf4' : 'white',
                      cursor: sel.statut === 'Hospitalisé' ? 'pointer' : 'default',
                    }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', border: '2px solid',
                      borderColor: s.fait ? '#16a34a' : '#cbd5e1',
                      background: s.fait ? '#16a34a' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {s.fait && <span style={{ color: 'white', fontSize: 10, fontWeight: 900 }}>✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-slate-400">{s.heure}</span>
                        <Badge color={SOIN_COLORS[s.type] || 'slate'}>{s.type}</Badge>
                      </div>
                      <p className="text-sm mt-0.5 truncate" style={{ color: s.fait ? '#94a3b8' : '#374151', textDecoration: s.fait ? 'line-through' : 'none' }}>
                        {s.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {(sel.soins || []).length > 0 && (
                <p className="text-xs text-center mt-3 text-slate-400">
                  {(sel.soins || []).filter(s => s.fait).length}/{(sel.soins || []).length} soins effectués
                </p>
              )}
            </div>

            {/* Paramètres vitaux */}
            <div className="p-5">
              <h4 className="font-bold mb-3 flex items-center gap-2">📊 Paramètres vitaux</h4>

              {sel.statut === 'Hospitalisé' && (
                <div className="mb-4 p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[['Heure', 'heure', 'time'], ['T° (°C)', 'temp', 'text'], ['FC (bpm)', 'fc', 'text'], ['FR (/min)', 'fr', 'text']].map(([l, k, t]) => (
                      <div key={k}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{l}</label>
                        <input type={t}
                          style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px', fontSize: 12, width: '100%', outline: 'none' }}
                          value={newVital[k]} onChange={e => setNewVital(p => ({ ...p, [k]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12, flex: 1, outline: 'none' }}
                      placeholder="Note clinique…" value={newVital.note}
                      onChange={e => setNewVital(p => ({ ...p, note: e.target.value }))} />
                    <button onClick={addVital}
                      style={{ background: '#0d9488', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      + Mesure
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {(sel.vitaux || []).length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">Aucune mesure enregistrée</p>
                )}
                {[...(sel.vitaux || [])].reverse().map((v, i) => (
                  <div key={i} className="flex flex-wrap gap-3 rounded-xl px-3 py-2 text-sm" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <span className="font-mono text-slate-400 text-xs">{v.heure}</span>
                    <span>T° <strong style={{ color: '#0d9488' }}>{v.temp}°C</strong></span>
                    <span>FC <strong>{v.fc}</strong></span>
                    <span>FR <strong>{v.fr}</strong></span>
                    {v.note && <span className="text-slate-500 italic text-xs">— {v.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste patients hospitalisés */}
      {actifs.length > 0 && !sel && (
        <div className="app-card">
          <div className="p-4 border-b">
            <h3 className="font-bold flex items-center gap-2">🏥 Patients actuellement hospitalisés</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {actifs.map(h => (
              <div key={h.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelId(h.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)' }}>
                    {h.cage}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{h.patient}</p>
                    <p className="text-xs text-slate-400">{h.espece} · {h.proprio} · Depuis le {h.date_entree}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{h.motif}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-400">
                    {(h.soins || []).filter(s => s.fait).length}/{(h.soins || []).length} soins
                  </div>
                  <Badge color="orange" className="mt-1">Hospitalisé</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hospitalisations.length === 0 && <div className="app-card"><EmptyState icon="🏥" title="Aucune hospitalisation" subtitle="Hospitalisez un patient pour suivre ses soins et ses constantes." /></div>}
    </div>
  )
}

export default Hospitalisation
