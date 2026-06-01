import { useState } from 'react'
import { Btn, Badge, Field, AutoSuggest, FilterBar, FilterBtns, FilterPeriode } from '../../components/ui'
import { dbInsert, dbUpdate, newId } from '../../lib/db'

function Consultations({ patients, consultations, setConsultations, user, sb, logAction }) {
  const today = () => new Date().toISOString().split('T')[0]
  const fmtF  = v => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'

  const emptyForm = () => ({
    date: today(), patient: '', proprio: '', poids: '',
    temperature: '', fc: '', soap_s: '', soap_o: '',
    soap_a: '', soap_p: '', montant: '', statut: 'En attente',
  })

  const [showForm, setShowForm] = useState(false)
  const [exp, setExp]           = useState(null)
  const [form, setForm]         = useState(emptyForm())
  const [patSugg, setPatSugg]   = useState([])
  const [saving, setSaving]     = useState(false)

  const [searchC, setSearchC]   = useState('')
  const [fCStatut, setFCStatut] = useState('')
  const [fCPeriode, setFCPeriode] = useState('')

  const f = v => e => setForm({ ...form, [v]: e.target.value })

  const now3 = new Date()
  const cDebutMap = {
    jour:    today(),
    semaine: new Date(now3.getTime() - now3.getDay() * 86400000).toISOString().split('T')[0],
    mois:    new Date(now3.getFullYear(), now3.getMonth(), 1).toISOString().split('T')[0],
    annee:   new Date(now3.getFullYear(), 0, 1).toISOString().split('T')[0],
  }

  const cFiltered = (consultations || []).filter(c => {
    if (fCStatut && c.statut !== fCStatut) return false
    if (fCPeriode && cDebutMap[fCPeriode] && c.date < cDebutMap[fCPeriode]) return false
    if (searchC) {
      const q = searchC.toLowerCase()
      if (!c.patient.toLowerCase().includes(q) &&
          !c.proprio.toLowerCase().includes(q) &&
          !(c.soap_a || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  // ── Ajout avec Supabase ───────────────────────────────────
  const handleAdd = async () => {
    if (!form.patient || !form.soap_a) return alert('Patient et diagnostic (SOAP-A) requis')
    setSaving(true)
    try {
      const row = {
        id:          newId(),
        date:        form.date,
        patient:     form.patient,
        proprio:     form.proprio,
        poids:       form.poids,
        temperature: form.temperature,
        fc:          form.fc,
        soap_s:      form.soap_s,
        soap_o:      form.soap_o,
        soap_a:      form.soap_a,
        soap_p:      form.soap_p,
        montant:     parseInt(form.montant) || 0,
        statut:      form.statut,
      }
      const saved = await dbInsert(sb, 'consultations', row)
      setConsultations([saved, ...(consultations || [])])
      if (logAction && sb) logAction(sb, user, 'consultation_added', `${row.patient} — ${row.soap_a}`)
      setForm(emptyForm())
      setShowForm(false)
    } catch (e) {
      console.error('[Consultations] Erreur:', e)
      alert('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  // ── Changer statut ────────────────────────────────────────
  const handleStatut = async (id, newStatut) => {
    await dbUpdate(sb, 'consultations', id, { statut: newStatut })
    setConsultations((consultations || []).map(c => c.id === id ? { ...c, statut: newStatut } : c))
  }

  const printZone = (zoneId) => {
    const el = document.getElementById(zoneId)
    if (!el) return
    const w = window.open('', '_blank', 'width=900,height=700')
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' + el.innerHTML + '</body></html>')
    w.document.close(); w.focus(); w.print()
  }

  const PrintConsult = ({ c }) => (
    <div id={`cp-${c.id}`} className="hidden">
      <div style={{ fontFamily:'sans-serif', padding:'30px', maxWidth:'620px', margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', borderBottom:'3px solid #16a34a', paddingBottom:'15px', marginBottom:'20px' }}>
          <div>
            <h1 style={{ margin:0, fontSize:'22px', color:'#14532d', fontWeight:'900' }}>🐾 La Barakat</h1>
            <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:'12px' }}>Pharmacie & Clinique Vétérinaire · Lomé, Togo</p>
          </div>
          <div style={{ textAlign:'right', fontSize:'12px', color:'#64748b' }}>
            <div style={{ fontWeight:'900', fontSize:'16px', color:'#16a34a' }}>FICHE CONSULTATION</div>
            <div>N° {c.id} · {c.date}</div>
          </div>
        </div>
        <div style={{ background:'#f8fafc', borderRadius:'8px', padding:'12px', marginBottom:'16px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', fontSize:'13px' }}>
          <div><strong>Patient :</strong> {c.patient}</div>
          <div><strong>Propriétaire :</strong> {c.proprio}</div>
          <div><strong>Poids :</strong> {c.poids || '–'}</div>
          <div><strong>Température :</strong> {c.temperature || '–'}</div>
          <div><strong>FC :</strong> {c.fc || '–'}</div>
        </div>
        {[['S – Subjectif',c.soap_s],['O – Objectif',c.soap_o],['A – Diagnostic',c.soap_a],['P – Plan',c.soap_p]].map(([l,v],i) => v && (
          <div key={i} style={{ marginBottom:'12px' }}>
            <div style={{ fontWeight:'700', color:'#16a34a', fontSize:'12px', marginBottom:'4px' }}>{l}</div>
            <div style={{ background:'#f1f5f9', borderRadius:'6px', padding:'8px 10px', fontSize:'13px' }}>{v}</div>
          </div>
        ))}
        <div style={{ borderTop:'2px solid #e2e8f0', paddingTop:'12px', display:'flex', justifyContent:'space-between', marginTop:'16px' }}>
          <div style={{ fontSize:'12px', color:'#64748b' }}>La Barakat</div>
          <div style={{ fontSize:'20px', fontWeight:'900', color:'#16a34a' }}>{fmtF(c.montant)}</div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-page space-y-5">
      {(consultations || []).map(c => <PrintConsult key={c.id} c={c} />)}
      <div className="app-card">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">🩺 Consultations <span className="text-sm font-normal text-slate-400">(format SOAP)</span></h2>
          <Btn onClick={() => setShowForm(!showForm)}>{showForm ? '✕ Annuler' : '+ Nouvelle consultation'}</Btn>
        </div>

        {showForm && (
          <div className="p-5 bg-blue-50 border-b border-blue-200">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
              <Field label="Date" value={form.date} onChange={f('date')} type="date" />
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-600 mb-1 block">Patient</label>
                <AutoSuggest
                  value={form.patient}
                  onChange={e => { setForm({ ...form, patient: e.target.value }); setPatSugg(patients.filter(p => p.nom.toLowerCase().includes(e.target.value.toLowerCase()))) }}
                  list={patSugg}
                  onSelect={p => setForm({ ...form, patient: p.nom, proprio: p.proprio, poids: p.poids || '' })}
                  placeholder="Nom de l'animal"
                />
              </div>
              <Field label="Propriétaire"   value={form.proprio}     onChange={f('proprio')}     placeholder="Propriétaire" />
              <Field label="Poids"          value={form.poids}       onChange={f('poids')}       placeholder="ex: 12 kg" />
              <Field label="Température"    value={form.temperature} onChange={f('temperature')} placeholder="38.5°C" />
              <Field label="Fréq. cardiaque" value={form.fc}         onChange={f('fc')}          placeholder="80 bpm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {[
                { label:'S — Subjectif',          key:'soap_s', color:'blue',   hint:'Motif de consultation, plainte du propriétaire' },
                { label:'O — Objectif',            key:'soap_o', color:'green',  hint:"Résultats de l'examen clinique" },
                { label:'A — Analyse / Diagnostic *', key:'soap_a', color:'orange', hint:'Hypothèse(s) diagnostique(s)' },
                { label:'P — Plan thérapeutique',  key:'soap_p', color:'purple', hint:'Traitements, examens complémentaires, suivi' },
              ].map(({ label, key, color, hint }) => (
                <div key={key} className={`bg-white rounded-xl p-3 border-2 border-${color}-100`}>
                  <div className={`text-xs font-black text-${color}-600 uppercase mb-2`}>{label}</div>
                  <p className="text-xs text-slate-400 mb-2">{hint}</p>
                  <textarea rows="3"
                    className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-${color}-400 outline-none`}
                    value={form[key]} onChange={f(key)} />
                </div>
              ))}
            </div>

            <div className="flex gap-3 items-end">
              <Field label="Montant (F)" value={form.montant} onChange={f('montant')} type="number" placeholder="0" className="w-36" />
              <Field label="Statut" value={form.statut} onChange={f('statut')} options={['En attente','Payé']} className="w-36" />
              <Btn onClick={handleAdd} disabled={saving}>
                {saving ? '⏳ Enregistrement…' : '✓ Enregistrer'}
              </Btn>
            </div>
          </div>
        )}

        <FilterBar search={searchC} onSearch={setSearchC} placeholder="🔍 Patient, propriétaire, diagnostic…"
          activeCount={[fCStatut, fCPeriode, searchC].filter(Boolean).length}
          onReset={() => { setSearchC(''); setFCStatut(''); setFCPeriode('') }}>
          <FilterBtns options={[{v:'Payé',l:'✓ Payé'},{v:'En attente',l:'⏳ En attente'}]} value={fCStatut} onChange={setFCStatut} colorFn={v => v==='Payé'?'green':'amber'} />
          <FilterPeriode value={fCPeriode} onChange={setFCPeriode} />
          <span className="text-xs text-slate-400">{cFiltered.length}/{(consultations||[]).length}</span>
        </FilterBar>

        <div className="divide-y">
          {cFiltered.map(c => (
            <div key={c.id}>
              <div className="p-4 hover:bg-slate-50 transition-all cursor-pointer" onClick={() => setExp(exp === c.id ? null : c.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm text-slate-400">{c.date}</span>
                      <span className="font-bold">{c.patient}</span>
                      <span className="text-sm text-slate-500">· {c.proprio}</span>
                      {c.temperature && <Badge color="slate">T° {c.temperature}</Badge>}
                      {c.fc          && <Badge color="slate">FC {c.fc}</Badge>}
                    </div>
                    <p className="text-sm font-semibold text-orange-600">🔎 {c.soap_a}</p>
                    {exp !== c.id && c.soap_p && <p className="text-xs text-slate-500 mt-1">💊 {c.soap_p.substring(0, 80)}{c.soap_p.length > 80 ? '…' : ''}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold font-mono text-blue-600">{fmtF(c.montant)}</span>
                    <Badge color={c.statut === 'Payé' ? 'green' : 'yellow'}>{c.statut}</Badge>
                    {c.statut !== 'Payé' && (
                      <button onClick={e => { e.stopPropagation(); handleStatut(c.id, 'Payé') }}
                        className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded-lg font-bold no-print">
                        ✓ Payé
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); const el = document.getElementById(`cp-${c.id}`); el.classList.remove('hidden'); setTimeout(() => { printZone(`cp-${c.id}`); el.classList.add('hidden') }, 100) }}
                      className="no-print bg-slate-700 hover:bg-slate-800 text-white text-xs px-2 py-1 rounded-lg">🖨</button>
                  </div>
                </div>
              </div>
              {exp === c.id && (
                <div className="px-4 pb-4 bg-slate-50 border-t grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[['S – Subjectif',c.soap_s,'soap-box--blue'],['O – Objectif',c.soap_o,'soap-box--green'],['A – Diagnostic',c.soap_a,'soap-box--orange'],['P – Plan',c.soap_p,'soap-box--purple']].map(([l,v,cls],i) => v && (
                    <div key={i} className={`soap-box ${cls}`}>
                      <div className="soap-box__title">{l}</div>
                      <p className="text-sm text-[var(--app-text)]">{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!cFiltered.length && <p className="text-center text-slate-400 py-8">Aucune consultation</p>}
        </div>
      </div>
    </div>
  )
}

export default Consultations