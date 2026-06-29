import { useState } from 'react'
import { Btn, Badge, Field, AutoSuggest, ValidationBanner, FormPanel, FormSection, FilterBar, FilterSelect, FilterBtns, FilterPeriode, Pagination, usePagination, EmptyState } from '../../components/ui'
import { dbInsert, dbUpdate, dbDelete, newId } from '../../lib/db'
import { validateVenteForm, venteFormToRow } from '../../lib/validation'

const today = () => new Date().toISOString().split('T')[0]
const fmtF  = v => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'

const STATUTS = ['Payé', 'À crédit', 'Partiellement payé', 'En attente', 'Annulé']
const STATUT_COLOR = { Payé:'green', 'À crédit':'orange', 'Partiellement payé':'amber', 'En attente':'yellow', Annulé:'red' }

function Ventes({ meds, setMeds, clients, ventesHist, setVentesHist, otrMode, tva, user, sb, logAction }) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({
    date: today(), client: '', lignes: [{ med:'', medSearch:'', cond:'', qte:1, pu:'', showSugg:false }],
    mode: 'Espèces', statut: 'Payé', type: 'detail',
  })
  const [cliSugg, setCliSugg]   = useState([])
  const [fVStatut, setFVStatut] = useState('')
  const [fVMode, setFVMode]     = useState('')
  const [fVPeriode, setFVPeriode] = useState('')
  const [fVType, setFVType]     = useState('')
  const [searchV, setSearchV]   = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [validationMessages, setValidationMessages] = useState([])

  const ventes = ventesHist || []

  const getPrixGros = (medObj, qte) => {
    if (!medObj) return 0
    const base = parseInt(medObj.prixGros ?? medObj.prix_gros ?? 0) || parseInt(medObj.prixVente ?? medObj.prix_vente ?? 0) || 0
    const paliers = medObj.paliersGros ?? medObj.paliers_gros ?? []
    if (!paliers.length) return base
    const q = parseInt(qte) || 1
    const best = [...paliers]
      .filter(p => q >= (parseInt(p.qte) || 0))
      .sort((a, b) => parseInt(b.qte) - parseInt(a.qte))[0]
    return best ? Math.round(base * (1 - (parseFloat(best.remise) || 0) / 100)) : base
  }

  const getRemiseApplied = (medObj, qte) => {
    const paliers = medObj?.paliersGros ?? medObj?.paliers_gros ?? []
    if (!paliers.length) return 0
    const q = parseInt(qte) || 1
    const best = [...paliers]
      .filter(p => q >= (parseInt(p.qte) || 0))
      .sort((a, b) => parseInt(b.qte) - parseInt(a.qte))[0]
    return best ? parseFloat(best.remise) || 0 : 0
  }

  const patchForm = (patch) => {
    setForm(prev => ({ ...prev, ...patch }))
    Object.keys(patch).forEach(k => {
      setFormErrors(prev => {
        const next = { ...prev }
        delete next[k]
        return next
      })
    })
    if (validationMessages.length) setValidationMessages([])
  }

  // Mise à jour atomique d'une ligne
  const updL = (i, updates) => {
    setForm(prev => {
      const newLignes = [...prev.lignes]
      const merged = { ...newLignes[i], ...updates }
      if (prev.type === 'gros' && ('qte' in updates || 'med' in updates) && merged.med) {
        const medObj = meds.find(m => m.nom === merged.med)
        if (medObj) merged.pu = getPrixGros(medObj, parseInt(merged.qte) || 1)
      }
      newLignes[i] = merged
      return { ...prev, lignes: newLignes }
    })
    setFormErrors(prev => {
      const next = { ...prev }
      Object.keys(prev).forEach(k => {
        if (k.startsWith(`lignes.${i}.`)) delete next[k]
      })
      return next
    })
    if (validationMessages.length) setValidationMessages([])
  }

  const ligneError = (i, field) => formErrors[`lignes.${i}.${field}`]

  const total = form.lignes.reduce((s, l) => s + (parseInt(l.qte) || 0) * (parseInt(l.pu) || 0), 0)
  const totalPaye      = ventes.filter(v => v.statut === 'Payé').reduce((s, v) => s + (v.total || 0), 0)
  const totalCredit    = ventes.filter(v => ['À crédit','Partiellement payé','En attente'].includes(v.statut)).reduce((s, v) => s + (v.total || 0), 0)
  const totalCreditGros = ventes.filter(v => v.type === 'gros' && ['À crédit','Partiellement payé','En attente'].includes(v.statut)).reduce((s, v) => s + (v.total || 0), 0)

  const getTarifs = (medObj) => {
    if (!medObj) return []
    if (medObj.tarifs?.length) return medObj.tarifs
    const pv = medObj.prixVente || medObj.prix_vente || 0
    const u  = medObj.unite || ''
    if (u === 'comprimés') return [
      { conditionnement:'Comprimé',         prix: pv },
      { conditionnement:'Plaquette (10 cp)', prix: pv * 10 },
      { conditionnement:'Boîte (30 cp)',     prix: pv * 30 },
    ]
    if (u === 'flacons') return [{ conditionnement:'Flacon', prix: pv }]
    if (u === 'doses')   return [
      { conditionnement:'Dose unitaire', prix: pv },
      { conditionnement:'Pack 5 doses',  prix: pv * 5 },
    ]
    return [{ conditionnement:'Unité', prix: pv }]
  }

  const applyStockDelta = async (lignes, delta) => {
    const updates = meds
      .map(m => {
        const l = lignes.find(x => x.med === m.nom)
        if (!l) return null
        return { medId: m.id, newStock: Math.max(0, (m.stock || 0) + delta * (parseInt(l.qte) || 0)) }
      })
      .filter(Boolean)
    if (!updates.length) return
    await Promise.all(updates.map(({ medId, newStock }) =>
      dbUpdate(sb, 'medicaments', medId, { stock: newStock })
    ))
    const updatedMeds = meds.map(m => {
      const u = updates.find(x => x.medId === m.id)
      return u ? { ...m, stock: u.newStock } : m
    })
    setMeds(updatedMeds)
    try { localStorage.setItem('lb_medicaments', JSON.stringify(updatedMeds)) } catch(e) {}
  }

  // ── Ajouter une vente avec Supabase ───────────────────────
  const addVente = async () => {
    const checked = validateVenteForm(form, meds)
    if (!checked.ok) {
      setFormErrors(checked.fieldErrors)
      setValidationMessages(checked.messages)
      return
    }
    const validated = checked.data

    if (validated.statut === 'Payé') {
      const stockErrors = validated.lignes
        .map(l => {
          const med = meds.find(m => m.nom === l.med)
          if (med && l.qte > (med.stock || 0))
            return `${l.med} : stock insuffisant (${med.stock || 0} disponible, ${l.qte} demandé)`
          return null
        })
        .filter(Boolean)
      if (stockErrors.length) {
        setValidationMessages(stockErrors)
        return
      }
    }

    setSaving(true)
    try {
      const row = venteFormToRow(validated, newId(), { type: form.type || 'detail' })
      const saved = await dbInsert(sb, 'ventes', row)

      const newHist = [saved, ...ventes].slice(0, 500)
      setVentesHist(newHist)

      if (validated.statut === 'Payé') {
        await applyStockDelta(validated.lignes, -1)
      }

      if (logAction && sb) logAction(sb, user, 'vente_added', `${validated.client} — ${fmtF(validated.total)}`)
      setForm({ date:today(), client:'', lignes:[{med:'',medSearch:'',cond:'',qte:1,pu:'',showSugg:false}], mode:'Espèces', statut:'Payé', type:'detail' })
      setFormErrors({})
      setValidationMessages([])
      setShowForm(false)
    } catch (e) {
      console.error('[Ventes] Erreur:', e)
      alert(e?.message || 'Erreur lors de la sauvegarde. Vérifiez la table ventes dans Supabase (fichier supabase/ventes.sql).')
    } finally {
      setSaving(false)
    }
  }

  // ── Changer statut d'une vente ────────────────────────────
  const handleStatut = async (venteId, newStatut) => {
    await dbUpdate(sb, 'ventes', venteId, { statut: newStatut })
    const newHist = ventes.map(v => v.id === venteId ? { ...v, statut: newStatut } : v)
    setVentesHist(newHist)

    const vente = ventes.find(v => v.id === venteId)
    if (vente?.lignes) {
      if (newStatut === 'Payé') {
        await applyStockDelta(vente.lignes, -1)
      } else if (newStatut === 'Annulé' && vente.statut === 'Payé') {
        await applyStockDelta(vente.lignes, +1)
      }
    }
  }

  const deleteVente = async (id) => {
    if (!confirm('Supprimer cette vente définitivement ?')) return
    const vente = ventes.find(v => v.id === id)
    try {
      await dbDelete(sb, 'ventes', id)
      setVentesHist(ventes.filter(v => v.id !== id))
      if (vente?.statut === 'Payé' && vente.lignes) {
        await applyStockDelta(vente.lignes, +1)
      }
    } catch (e) {
      alert(e?.message || 'Erreur lors de la suppression')
    }
  }

  const tvaAmt = v => tva?.active ? Math.round((v.total || 0) * (tva.taux || 0) / 100) : 0
  const totalTTC = v => (v.total || 0) + tvaAmt(v)
  const mask = v => otrMode ? '••••• F' : fmtF(v)

  const printRecu = (v) => {
    const ta = tvaAmt(v); const ttc = totalTTC(v)
    const w = window.open('', '_blank', 'width=400,height=650')
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reçu</title>
      <style>body{font-family:sans-serif;padding:20px;max-width:360px;margin:0 auto;font-size:13px}
      h1{font-size:16px;margin:0}hr{border:1px dashed #ccc;margin:10px 0}
      .row{display:flex;justify-content:space-between;margin:3px 0}
      .total{font-size:18px;font-weight:900;color:#166534}
      .footer{text-align:center;color:#999;font-size:11px;margin-top:16px}
      @media print{button{display:none}}</style></head><body>
      <div style="text-align:center"><img src="/logo.png" alt="La Barakat" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin-bottom:6px"><h1 style="margin:2px 0">LA BARAKAT</h1><p style="margin:2px 0;color:#666">Pharmacie & Clinique Vétérinaire</p></div><hr>
      <div class="row"><span>Date</span><span>${v.date}</span></div>
      <div class="row"><span>Client</span><span><b>${v.client}</b></span></div>
      <div class="row"><span>Mode</span><span>${v.mode}</span></div>
      <div class="row"><span>Statut</span><span>${v.statut}</span></div>
      ${v.type === 'gros' ? '<div class="row" style="background:#fff3e0;padding:3px 6px;border-radius:4px"><span>Type</span><span><b>📦 Vente en gros</b></span></div>' : ''}
      <hr>
      <b>Produits :</b><br>
      ${(v.lignes || []).map(l => `<div class="row"><span>${l.med}<br><small>${l.cond || ''} x ${l.qte}</small></span><span>${fmtF((parseInt(l.qte)||0)*(parseInt(l.pu)||0))}</span></div>`).join('')}
      <hr><div class="row"><span>Sous-total HT</span><span>${fmtF(v.total)}</span></div>
      ${ta > 0 ? `<div class="row"><span>TVA ${tva?.taux||0}%</span><span>+ ${fmtF(ta)}</span></div>` : ''}
      <div class="row total"><span>TOTAL${ta > 0 ? ' TTC' : ''}</span><span>${fmtF(ta > 0 ? ttc : v.total)}</span></div>
      <hr><div class="footer">Merci de votre confiance - La Barakat</div>
      <br><button onclick="window.print()" style="width:100%;padding:10px;background:#166534;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">Imprimer</button>
      </body></html>`)
    w.document.close()
  }

  // Filtrage
  const now2 = new Date()
  const periodeDebut = { semaine: new Date(now2.getTime()-now2.getDay()*86400000).toISOString().split('T')[0], mois: new Date(now2.getFullYear(),now2.getMonth(),1).toISOString().split('T')[0], annee: new Date(now2.getFullYear(),0,1).toISOString().split('T')[0], jour: today() }
  const filtered = ventes.filter(v => {
    if (fVStatut && v.statut !== fVStatut) return false
    if (fVMode   && v.mode   !== fVMode)   return false
    if (fVType   && (v.type||'detail') !== fVType) return false
    if (fVPeriode && periodeDebut[fVPeriode] && v.date < periodeDebut[fVPeriode]) return false
    if (searchV) { const q = searchV.toLowerCase(); if (!v.client.toLowerCase().includes(q) && !JSON.stringify(v.lignes||[]).toLowerCase().includes(q)) return false }
    return true
  })
  const pagination = usePagination(filtered)

  return (
    <div className="app-page space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l:'Ventes totales',  v: ventes.length,                                        mod:'stat-tile--blue' },
          { l:'Encaissé',        v: mask(totalPaye),                                      mod:'stat-tile--green' },
          { l:'À recouvrer',     v: mask(totalCredit),                                    mod:'stat-tile--orange' },
          { l:'Créances gros',   v: mask(totalCreditGros),                                mod:'stat-tile--purple' },
        ].map((s, i) => (
          <div key={i} className={`stat-tile ${s.mod}`}>
            <div className="stat-tile__label">{s.l}</div>
            <div className="stat-tile__value text-xl">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="app-card">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">🛒 Ventes au comptoir</h2>
            <p className="text-xs text-slate-400 mt-0.5">{ventes.length} vente(s)</p>
          </div>
          <Btn onClick={() => setShowForm(!showForm)}>{showForm ? '✕ Annuler' : '+ Nouvelle vente'}</Btn>
        </div>

        {showForm && (
          <FormPanel
            icon={form.type === 'gros' ? '📦' : '🛒'}
            title={form.type === 'gros' ? 'Vente en gros' : 'Vente au détail'}
            subtitle="Remplissez les informations de la vente"
            color={form.type === 'gros' ? 'orange' : 'teal'}
            onClose={() => setShowForm(false)}
          >
            {/* Type de vente */}
            <div className="flex gap-2 mb-4">
              {[{v:'detail',l:'🏪 Vente au détail'},{v:'gros',l:'📦 Vente en gros'}].map(t => (
                <button key={t.v} type="button"
                  onClick={() => patchForm({ type:t.v, lignes:[{med:'',medSearch:'',cond:'',qte:1,pu:'',showSugg:false}] })}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${form.type===t.v
                    ? t.v==='gros' ? 'border-orange-500 bg-orange-100 text-orange-700' : 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                  {t.l}
                </button>
              ))}
            </div>
            <ValidationBanner messages={validationMessages} onDismiss={() => setValidationMessages([])} />
            <FormSection label="Informations générales" icon="📋" color={form.type === 'gros' ? 'orange' : 'teal'} noTopMargin>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Date" value={form.date} onChange={e => patchForm({ date:e.target.value })} error={formErrors.date} type="date" />
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Client *</label>
                <AutoSuggest value={form.client}
                  onChange={e => { patchForm({ client:e.target.value }); setCliSugg(clients.filter(c => c.nom.toLowerCase().includes(e.target.value.toLowerCase()))) }}
                  list={cliSugg} onSelect={c => { patchForm({ client:c.nom }); setCliSugg([]) }}
                  placeholder="Nom du client" />
                {formErrors.client && (
                  <p style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', fontWeight: 600 }}>{formErrors.client}</p>
                )}
              </div>
              <Field label="Mode de paiement" value={form.mode} onChange={e => patchForm({ mode:e.target.value })} error={formErrors.mode} options={['Espèces','Mobile Money','Virement','Chèque','–']} />
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: formErrors.statut ? '#dc2626' : '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, userSelect: 'none' }}>
                  {formErrors.statut && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', display: 'inline-block', flexShrink: 0 }} />}
                  Statut paiement
                </label>
                <select
                  style={{ border: `1.5px solid ${formErrors.statut ? '#f87171' : '#e2e8f0'}`, borderRadius: 12, padding: '10px 14px', fontSize: '13.5px', width: '100%', outline: 'none', background: 'var(--app-surface)', fontFamily: "'Outfit',sans-serif", transition: 'border-color .18s, box-shadow .18s', lineHeight: '1.45', cursor: 'pointer', color: 'var(--app-text)' }}
                  onFocus={e => { e.target.style.borderColor='#0d9488'; e.target.style.boxShadow='0 0 0 3.5px rgba(13,148,136,0.14)' }}
                  onBlur={e  => { e.target.style.borderColor= formErrors.statut ? '#f87171' : '#e2e8f0'; e.target.style.boxShadow='none' }}
                  value={form.statut} onChange={e => patchForm({ statut:e.target.value })}>
                  {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {formErrors.statut && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 14, lineHeight: 1 }}>⚠</span>{formErrors.statut}</p>}
                {form.statut !== 'Payé' && <p className="text-xs text-orange-600 mt-1">⚠️ Stock non décrémenté tant que non payé</p>}
              </div>
            </div>
            </FormSection>

            <FormSection
              label="Produits vendus" icon="💊"
              color={form.type === 'gros' ? 'orange' : 'teal'}
              action={
                <button onClick={() => setForm(p => ({...p, lignes:[...p.lignes,{med:'',medSearch:'',cond:'',qte:1,pu:'',showSugg:false}]}))}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold transition-all">
                  + Ajouter
                </button>
              }>
            <div className="mb-0">
              <div className="grid gap-2 mb-1.5 px-1" style={{gridTemplateColumns:'2fr 1.5fr 0.6fr 1fr 28px'}}>
                {['Médicament', form.type==='gros' ? 'Type' : 'Conditionnement','Qté','Prix unit. (F)',''].map((h,i) => <div key={i} className="text-xs font-bold text-slate-400">{h}</div>)}
              </div>
              {form.lignes.map((l, i) => {
                const medObj = meds.find(m => m.nom === l.med)
                const tarifs = getTarifs(medObj)
                const rowErr = ligneError(i, 'med') || ligneError(i, 'qte') || ligneError(i, 'pu')
                return (
                  <div key={i}>
                  <div className="grid gap-2 mb-1 items-center" style={{gridTemplateColumns:'2fr 1.5fr 0.6fr 1fr 28px'}}>
                    <div className="relative">
                      <input type="text" placeholder="Rechercher médicament…"
                        value={l.medSearch !== undefined ? l.medSearch : l.med}
                        onChange={e => updL(i, { medSearch: e.target.value, med: '', showSugg: true })}
                        onFocus={e => { updL(i, { showSugg: true }); e.target.style.borderColor='#0d9488'; e.target.style.boxShadow='0 0 0 3.5px rgba(13,148,136,0.14)' }}
                        onBlur={e  => { setTimeout(() => updL(i, { showSugg: false }), 160); e.target.style.borderColor= ligneError(i,'med') ? '#f87171' : '#e2e8f0'; e.target.style.boxShadow='none' }}
                        style={{ border: `1.5px solid ${ligneError(i,'med') ? '#f87171' : '#e2e8f0'}`, borderRadius: 12, padding: '10px 14px', fontSize: '13.5px', width: '100%', outline: 'none', background: 'var(--app-surface)', fontFamily: "'Outfit',sans-serif", transition: 'border-color .18s, box-shadow .18s', lineHeight: '1.45', color: 'var(--app-text)' }}
                      />
                      {l.showSugg && (
                        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {meds
                            .filter(m => m.stock > 0 && m.nom.toLowerCase().includes((l.medSearch||'').toLowerCase()))
                            .map(m => (
                              <button key={m.id||m.nom} type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex justify-between items-center"
                                onMouseDown={() => {
                                  if (form.type === 'gros') {
                                    updL(i, { med: m.nom, medSearch: m.nom, cond: 'Gros', pu: getPrixGros(m, parseInt(l.qte)||1), showSugg: false })
                                  } else {
                                    const t2 = getTarifs(m)
                                    const first = t2?.[0]
                                    updL(i, { med: m.nom, medSearch: m.nom, cond: first?.conditionnement||'Unité', pu: first?.prix||m.prixVente||m.prix_vente||'', showSugg: false })
                                  }
                                }}>
                                <span className="font-medium">{m.nom}</span>
                                <span className="text-xs text-slate-400">stk: {m.stock}</span>
                              </button>
                            ))
                          }
                          {!meds.filter(m => m.stock > 0 && m.nom.toLowerCase().includes((l.medSearch||'').toLowerCase())).length && (
                            <div className="px-3 py-2 text-sm text-slate-400">Aucun résultat</div>
                          )}
                        </div>
                      )}
                    </div>
                    {form.type === 'gros' ? (
                      <div className="flex items-center h-full">
                        <span className={`text-xs font-bold px-3 py-2.5 rounded-xl border ${l.med ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>📦 Gros</span>
                      </div>
                    ) : (
                      <select className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm outline-none bg-white ${!l.med?'border-slate-100 text-slate-300':'border-slate-200 focus:border-green-400'}`}
                        value={l.cond} disabled={!l.med}
                        onChange={e => { const t = tarifs.find(t => t.conditionnement === e.target.value); updL(i, {cond:e.target.value, pu:t?t.prix:l.pu}) }}>
                        <option value="">{l.med ? '— Sélectionner —' : '(choisir médicament)'}</option>
                        {tarifs.map(t => <option key={t.conditionnement} value={t.conditionnement}>{t.conditionnement}{t.prix?' — '+fmtF(t.prix):''}</option>)}
                        <option value="__libre__">✏️ Prix libre…</option>
                      </select>
                    )}
                    <input type="number" min="1" value={l.qte} onChange={e => updL(i, {qte:e.target.value})}
                      style={{ border: `1.5px solid ${ligneError(i,'qte') ? '#f87171' : '#e2e8f0'}`, borderRadius: 12, padding: '10px 6px', fontSize: '13.5px', width: '100%', outline: 'none', background: 'var(--app-surface)', fontFamily: "'Outfit',sans-serif", transition: 'border-color .18s, box-shadow .18s', textAlign: 'center', color: 'var(--app-text)' }}
                      onFocus={e => { e.target.style.borderColor='#0d9488'; e.target.style.boxShadow='0 0 0 3.5px rgba(13,148,136,0.14)' }}
                      onBlur={e  => { e.target.style.borderColor= ligneError(i,'qte') ? '#f87171' : '#e2e8f0'; e.target.style.boxShadow='none' }} />
                    <input type="number" value={l.pu} onChange={e => updL(i, {pu:e.target.value})} placeholder="0"
                      style={{ border: `1.5px solid ${ligneError(i,'pu') ? '#f87171' : '#e2e8f0'}`, borderRadius: 12, padding: '10px 14px', fontSize: '13.5px', width: '100%', outline: 'none', background: 'var(--app-surface)', fontFamily: "'Outfit',sans-serif", transition: 'border-color .18s, box-shadow .18s', color: 'var(--app-text)' }}
                      onFocus={e => { e.target.style.borderColor='#0d9488'; e.target.style.boxShadow='0 0 0 3.5px rgba(13,148,136,0.14)' }}
                      onBlur={e  => { e.target.style.borderColor= ligneError(i,'pu') ? '#f87171' : '#e2e8f0'; e.target.style.boxShadow='none' }} />
                    {form.lignes.length > 1
                      ? <button onClick={() => setForm(p => ({...p, lignes:p.lignes.filter((_,j) => j!==i)}))} className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg text-xs">✕</button>
                      : <div />}
                  </div>
                  {form.type === 'gros' && l.med && (() => {
                    const medObj = meds.find(m => m.nom === l.med)
                    const remise = getRemiseApplied(medObj, l.qte)
                    const hasPrixGros = medObj && (medObj.prixGros || medObj.prix_gros)
                    return (
                      <div className="flex gap-3 mb-1 pl-1">
                        {remise > 0 && <p className="text-xs text-orange-600">🏷️ Palier -{remise}% appliqué</p>}
                        {!hasPrixGros && <p className="text-xs text-amber-600">⚠️ Prix gros non défini, utilise prix vente</p>}
                      </div>
                    )
                  })()}
                  {rowErr && <p className="text-xs text-red-600 mb-2 pl-1">{rowErr}</p>}
                  </div>
                )
              })}
            </div>
            </FormSection>

            <div className="flex items-center justify-between mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Total à encaisser</p>
                <span className={`text-2xl font-black font-mono ${form.type === 'gros' ? 'text-orange-600' : 'text-teal-600'}`}>{fmtF(total)}</span>
              </div>
              <Btn color={form.type === 'gros' ? 'accent' : 'brand'} onClick={addVente} disabled={saving}>
                {saving ? '⏳ Enregistrement…' : '✓ Enregistrer la vente'}
              </Btn>
            </div>
          </FormPanel>
        )}

        <FilterBar search={searchV} onSearch={setSearchV} placeholder="🔍 Client, produit…"
          activeCount={[fVStatut,fVMode,fVPeriode,fVType,searchV].filter(Boolean).length}
          onReset={() => { setSearchV(''); setFVStatut(''); setFVMode(''); setFVPeriode(''); setFVType('') }}>
          <FilterSelect label="📋 Statut"    value={fVStatut} onChange={setFVStatut} options={STATUTS.map(s => ({v:s,l:s}))} />
          <FilterSelect label="💳 Paiement"  value={fVMode}   onChange={setFVMode}   options={['Espèces','Mobile Money','Virement','Chèque'].map(m => ({v:m,l:m}))} />
          <FilterBtns label="Type" options={[{v:'detail',l:'🏪 Détail'},{v:'gros',l:'📦 Gros'}]} value={fVType} onChange={setFVType} colorFn={v => v==='gros' ? 'orange' : 'green'} />
          <FilterPeriode value={fVPeriode} onChange={setFVPeriode} />
        </FilterBar>

        <div className="divide-y divide-slate-100">
          {pagination.pageItems.map(v => (
            <div key={v.id} className="p-5 hover:bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold">👤 {v.client}</span>
                    <Badge color={STATUT_COLOR[v.statut]||'slate'}>{v.statut}</Badge>
                    <Badge color="slate">{v.mode}</Badge>
                    {v.type === 'gros' && <Badge color="orange">📦 Gros</Badge>}
                    <span className="text-xs text-slate-400">{v.date}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(v.lignes || []).map((l, i) => (
                      <span key={i} className="text-xs bg-slate-100 rounded-lg px-2.5 py-1">
                        💊 {l.med} · {l.cond} × {l.qte}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-xl font-black font-mono ${otrMode?'text-slate-300':'text-green-600'}`}>{mask(v.total)}</div>
                  {tva?.active && !otrMode && <div className="text-xs text-slate-400 mt-0.5">TTC: {fmtF(totalTTC(v))} (TVA {fmtF(tvaAmt(v))})</div>}
                  <div className="flex gap-1 mt-1 justify-end flex-wrap">
                    <button onClick={() => printRecu(v)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1.5 rounded-lg font-bold no-print">🖨️</button>
                    {v.statut !== 'Payé' && v.statut !== 'Annulé' && <>
                      <button onClick={() => handleStatut(v.id, 'Payé')} className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold">✓ Payé</button>
                      <button onClick={() => handleStatut(v.id, 'Annulé')} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1.5 rounded-lg font-bold">✕</button>
                    </>}
                    <button onClick={() => deleteVente(v.id)} className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg font-bold no-print" title="Supprimer définitivement">🗑</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!filtered.length && <EmptyState icon="🛒" title="Aucune vente" subtitle="Enregistrez votre première vente depuis la caisse." />}
        </div>
        <Pagination {...pagination} />
      </div>
    </div>
  )
}

export default Ventes