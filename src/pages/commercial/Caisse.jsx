import { useState, useEffect } from 'react'
import {
  ValidationBanner, Btn, Badge, Field, AutoSuggest,
  FilterBar, FilterSelect, FilterBtns, FilterPeriode,
  Pagination, usePagination, EmptyState,
  FormPanel, FormSection,
} from '../../components/ui'
import { dbInsert, dbUpdate, dbDelete, newId } from '../../lib/db'
import { venteToDbRow, validateCaisseForm, validateVenteForm, venteFormToRow } from '../../lib/validation'
import { fmtF, STATUTS, getTarifs, getPrixGros, getRemiseApplied, computeTvaAmt, venteTvaAmt, venteTTC, ligneUnites } from '../../lib/ventes'

const today      = () => new Date().toISOString().split('T')[0]
const EMPTY_LIGNE = { med: '', medSearch: '', cond: 'Unité', qte: 1, pu: 0, mult: 1, showSugg: false }
const STATUT_COLOR = { Payé:'green', 'À crédit':'orange', 'Partiellement payé':'amber', 'En attente':'yellow', Annulé:'red' }

function Caisse({ meds, setMeds, clients, ventesHist, setVentesHist, otrMode, tva, user, sb, logAction, consultations, setConsultations }) {
  const [tab, setTab] = useState('caisse')

  // ── Horloge en temps réel ─────────────────────────────────
  const [nowClock, setNowClock] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNowClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Caisse POS ────────────────────────────────────────────
  const [lignes, setLignes]             = useState([{ ...EMPTY_LIGNE }])
  const [posDate, setPosDate]           = useState(today())
  const [client, setClient]             = useState('')
  const [mode, setMode]                 = useState('Espèces')
  const [note, setNote]                 = useState('')
  const [recu, setRecu]                 = useState(null)
  const [montantDonne, setMontantDonne] = useState('')
  const [saving, setSaving]             = useState(false)
  const [cancelling, setCancelling]     = useState(false)
  const [formErrors, setFormErrors]     = useState({})
  const [validationMessages, setValidationMessages] = useState([])

  // ── Historique / Ventes ───────────────────────────────────
  const [showVenteForm, setShowVenteForm] = useState(false)
  const [venteForm, setVenteForm] = useState({
    date: today(), client: '', lignes: [{ med:'', medSearch:'', cond:'', qte:1, pu:'', showSugg:false }],
    mode: 'Espèces', statut: 'Payé', type: 'detail',
  })
  const [savingVente, setSavingVente]   = useState(false)
  const [cliSugg, setCliSugg]           = useState([])
  const [fVStatut, setFVStatut]         = useState('')
  const [fVMode, setFVMode]             = useState('')
  const [fVPeriode, setFVPeriode]       = useState('')
  const [fVType, setFVType]             = useState('')
  const [searchV, setSearchV]           = useState('')
  const [venteFormErrors, setVenteFormErrors] = useState({})
  const [venteValidMsgs, setVenteValidMsgs]   = useState([])
  const [expandedVId, setExpandedVId]   = useState(null)

  // ── Shared helpers ────────────────────────────────────────
  const ventes   = ventesHist || []
  const mask     = v => otrMode ? '••••• F' : fmtF(v)
  const tvaAmtV  = v => venteTvaAmt(v, tva)
  const totalTTCV = v => venteTTC(v, tva)
  const nomsClients = (clients || []).map(c => c.nom).filter(Boolean)

  // ── Caisse POS helpers ────────────────────────────────────
  const ligneError = (i, field) => formErrors[`lignes.${i}.${field}`]

  const updL = (i, updates) => {
    setLignes(prev => { const l = [...prev]; l[i] = { ...l[i], ...updates }; return l })
    setFormErrors(prev => { const n = { ...prev }; Object.keys(prev).forEach(k => { if (k.startsWith(`lignes.${i}.`)) delete n[k] }); return n })
    if (validationMessages.length) setValidationMessages([])
  }

  const patchCaisse = (patch) => {
    if ('client' in patch) setClient(patch.client)
    if ('mode'   in patch) setMode(patch.mode)
    if ('note'   in patch) setNote(patch.note)
    Object.keys(patch).forEach(k => setFormErrors(prev => { const n = { ...prev }; delete n[k]; return n }))
    if (validationMessages.length) setValidationMessages([])
  }

  const selectMed = (i, nom) => {
    const m2 = meds.find(m => m.nom === nom)
    const t2 = getTarifs(m2)
    updL(i, {
      med: nom, medSearch: nom, showSugg: false,
      pu:   t2[0]?.prix  ?? m2?.prixVente ?? m2?.prix_vente ?? 0,
      mult: t2[0]?.mult  ?? 1,
      cond: t2[0]?.conditionnement || 'Unité',
    })
  }

  const removeLigne = (i) => {
    if (lignes.length === 1) setLignes([{ ...EMPTY_LIGNE }])
    else setLignes(prev => prev.filter((_, j) => j !== i))
  }

  const adjQte = (i, delta) => updL(i, { qte: Math.max(1, (parseInt(lignes[i].qte) || 0) + delta) })

  const resetForm = () => {
    setLignes([{ ...EMPTY_LIGNE }])
    setPosDate(today())
    setClient(''); setNote(''); setMontantDonne('')
    setFormErrors({}); setValidationMessages([])
  }

  const lignesOk = lignes.filter(l => l.med && (l.qte || 0) > 0)
  const total    = lignesOk.reduce((s, l) => s + (l.pu || 0) * (l.qte || 0), 0)
  const tvaAmt   = tva?.active ? Math.round(total * (tva.taux / 100)) : 0
  const totalTTC = total + tvaAmt
  const monnaie  = montantDonne ? Math.max(0, (parseFloat(montantDonne) || 0) - totalTTC) : 0

  const enregistrer = async () => {
    const checked = validateCaisseForm({ client, mode, note, lignes }, meds)
    if (!checked.ok) { setFormErrors(checked.fieldErrors); setValidationMessages(checked.messages); return }
    const { data: validated } = checked
    const lignesValides = validated.lignes
    const statut = validated.mode === 'À crédit' ? 'À crédit' : 'Payé'

    const row = venteToDbRow({
      id: newId(), date: posDate || today(),
      client: validated.client, lignes: lignesValides,
      total, statut, mode: validated.mode,
      note: validated.note, tvaAmt,
      montant_paye: statut === 'Payé' ? totalTTC : 0,
      caissier: user?.name || '—',
    })

    setSaving(true)
    try {
      const vente = sb ? await dbInsert(sb, 'ventes', row) : row
      setVentesHist([vente, ...(ventesHist || [])].slice(0, 500))

      if (statut === 'Payé') {
        const updatedMeds = meds.map(m => {
          const l = lignesValides.find(x => x.med === m.nom)
          if (!l) return m
          const newStock = Math.max(0, (m.stock || 0) - l.qte * (l.mult || 1))
          if (sb && m.id) dbUpdate(sb, 'medicaments', m.id, { stock: newStock }).catch(e => console.warn('[stock]', e))
          return { ...m, stock: newStock }
        })
        setMeds(updatedMeds)
      }

      if (logAction && sb) logAction(sb, user, 'vente_caisse', `${vente.id} — ${fmtF(totalTTC)}`)
      setRecu(vente)
      resetForm()
    } catch (e) {
      console.error('[Caisse]', e)
      alert(e?.message || 'Erreur lors de l\'encaissement.')
    } finally {
      setSaving(false)
    }
  }

  const annulerVente = async () => {
    if (!recu || !confirm('Annuler et supprimer cette vente ?')) return
    setCancelling(true)
    try {
      if (sb) await dbDelete(sb, 'ventes', recu.id)
      setVentesHist((ventesHist || []).filter(v => v.id !== recu.id))
      if (recu.statut === 'Payé') {
        const updatedMeds = meds.map(m => {
          const l = (recu.lignes || []).find(x => x.med === m.nom)
          if (!l) return m
          const newStock = (m.stock || 0) + (l.qte || 0) * (l.mult || 1)
          if (sb && m.id) dbUpdate(sb, 'medicaments', m.id, { stock: newStock }).catch(e => console.warn('[stock]', e))
          return { ...m, stock: newStock }
        })
        setMeds(updatedMeds)
      }
      setRecu(null)
    } catch (e) {
      alert('Erreur annulation : ' + (e?.message || e))
    } finally {
      setCancelling(false)
    }
  }

  const modifierVente = async () => {
    if (!recu) return
    setCancelling(true)
    try {
      if (sb) await dbDelete(sb, 'ventes', recu.id)
      setVentesHist((ventesHist || []).filter(v => v.id !== recu.id))
      if (recu.statut === 'Payé') {
        const updatedMeds = meds.map(m => {
          const l = (recu.lignes || []).find(x => x.med === m.nom)
          if (!l) return m
          const newStock = (m.stock || 0) + (l.qte || 0) * (l.mult || 1)
          if (sb && m.id) dbUpdate(sb, 'medicaments', m.id, { stock: newStock }).catch(e => console.warn('[stock]', e))
          return { ...m, stock: newStock }
        })
        setMeds(updatedMeds)
      }
      setLignes((recu.lignes || []).map(l => ({ ...EMPTY_LIGNE, ...l, medSearch: l.med || '', showSugg: false })))
      setClient(recu.client || '')
      setMode(recu.mode || 'Espèces')
      setNote(recu.note || '')
      setRecu(null)
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    } finally {
      setCancelling(false)
    }
  }

  // ── Historique / Ventes helpers ───────────────────────────
  const applyStockDelta = async (lignesV, delta) => {
    const updates = meds.map(m => {
      const l = lignesV.find(x => x.med === m.nom)
      if (!l) return null
      const mult = l.mult || 1
      return { medId: m.id, newStock: Math.max(0, (m.stock || 0) + delta * (parseInt(l.qte) || 0) * mult) }
    }).filter(Boolean)
    if (!updates.length) return
    await Promise.all(updates.map(({ medId, newStock }) => dbUpdate(sb, 'medicaments', medId, { stock: newStock })))
    const updatedMeds = meds.map(m => { const u = updates.find(x => x.medId === m.id); return u ? { ...m, stock: u.newStock } : m })
    setMeds(updatedMeds)
    try { localStorage.setItem('lb_medicaments', JSON.stringify(updatedMeds)) } catch (e) {}
  }

  const patchVenteForm = (patch) => {
    setVenteForm(prev => ({ ...prev, ...patch }))
    Object.keys(patch).forEach(k => setVenteFormErrors(prev => { const n = { ...prev }; delete n[k]; return n }))
    if (venteValidMsgs.length) setVenteValidMsgs([])
  }

  const updVL = (i, updates) => {
    setVenteForm(prev => {
      const newLignes = [...prev.lignes]
      const merged = { ...newLignes[i], ...updates }
      if (prev.type === 'gros' && ('qte' in updates || 'med' in updates) && merged.med) {
        const medObj = meds.find(m => m.nom === merged.med)
        if (medObj) merged.pu = getPrixGros(medObj, parseInt(merged.qte) || 1)
      }
      newLignes[i] = merged
      return { ...prev, lignes: newLignes }
    })
    setVenteFormErrors(prev => {
      const n = { ...prev }
      Object.keys(prev).forEach(k => { if (k.startsWith(`lignes.${i}.`)) delete n[k] })
      return n
    })
    if (venteValidMsgs.length) setVenteValidMsgs([])
  }

  const venteFormTotal  = venteForm.lignes.reduce((s, l) => s + (parseInt(l.qte)||0) * (parseInt(l.pu)||0), 0)
  const vLigneError     = (i, field) => venteFormErrors[`lignes.${i}.${field}`]

  const getTarifsV = getTarifs

  const addVente = async () => {
    const checked = validateVenteForm(venteForm, meds)
    if (!checked.ok) { setVenteFormErrors(checked.fieldErrors); setVenteValidMsgs(checked.messages); return }
    const validated = checked.data

    if (validated.statut === 'Payé') {
      const stockErrors = validated.lignes.map(l => {
        const med = meds.find(m => m.nom === l.med)
        if (med && l.qte > (med.stock || 0))
          return `${l.med} : stock insuffisant (${med.stock || 0} disponible, ${l.qte} demandé)`
        return null
      }).filter(Boolean)
      if (stockErrors.length) { setVenteValidMsgs(stockErrors); return }
    }

    setSavingVente(true)
    try {
      const tvaAmtNew = computeTvaAmt(validated.total, tva)
      const row = venteFormToRow(validated, newId(), {
        type: venteForm.type || 'detail',
        tva_amt: tvaAmtNew,
        montant_paye: validated.statut === 'Payé' ? (validated.total + tvaAmtNew) : 0,
        caissier: user?.name || '',
      })
      const saved = await dbInsert(sb, 'ventes', row)
      setVentesHist([saved, ...ventes].slice(0, 500))
      if (validated.statut === 'Payé') await applyStockDelta(validated.lignes, -1)
      if (logAction && sb) logAction(sb, user, 'vente_added', `${validated.client} — ${fmtF(validated.total)}`)
      setVenteForm({ date:today(), client:'', lignes:[{med:'',medSearch:'',cond:'',qte:1,pu:'',showSugg:false}], mode:'Espèces', statut:'Payé', type:'detail' })
      setVenteFormErrors({}); setVenteValidMsgs([]); setShowVenteForm(false)
    } catch (e) {
      console.error('[Ventes]', e)
      alert(e?.message || 'Erreur lors de la sauvegarde.')
    } finally {
      setSavingVente(false)
    }
  }

  const handleStatut = async (venteId, newStatut) => {
    const vente = ventes.find(v => v.id === venteId)
    const patch = { statut: newStatut }
    if (newStatut === 'Payé' && vente) patch.montant_paye = venteTTC(vente, tva)
    await dbUpdate(sb, 'ventes', venteId, patch)
    const newHist = ventes.map(v => v.id === venteId ? { ...v, ...patch } : v)
    setVentesHist(newHist)
    // ── Vente liée à une consultation : synchroniser son statut ──
    if (vente?.consultation_id && setConsultations) {
      const cStatut = newStatut === 'Payé' ? 'Payé' : 'En attente'
      try { await dbUpdate(sb, 'consultations', vente.consultation_id, { statut: cStatut }) } catch(e) { console.warn('[sync consult]', e) }
      setConsultations((consultations||[]).map(c => c.id === vente.consultation_id ? { ...c, statut: cStatut } : c))
    }
    if (vente?.lignes) {
      if (newStatut === 'Payé') await applyStockDelta(vente.lignes, -1)
      else if (newStatut === 'Annulé' && vente.statut === 'Payé') await applyStockDelta(vente.lignes, +1)
    }
  }

  const deleteVente = async (id) => {
    const vente = ventes.find(v => v.id === id)
    if (vente?.consultation_id) {
      return alert('Cette vente est liée à une consultation clinique.\nGérez-la depuis la page Consultations pour éviter une désynchronisation.')
    }
    if (!confirm('Supprimer cette vente définitivement ?')) return
    try {
      await dbDelete(sb, 'ventes', id)
      setVentesHist(ventes.filter(v => v.id !== id))
      if (vente?.statut === 'Payé' && vente.lignes) await applyStockDelta(vente.lignes, +1)
    } catch (e) {
      alert(e?.message || 'Erreur suppression')
    }
  }

  // ── Reçu (commun aux deux onglets) ───────────────────────
  const imprimerRecu = (v) => {
    const w = window.open('', '_blank', 'width=440,height=760')
    if (!w) return
    const now      = new Date()
    const dateHeure = now.toLocaleDateString('fr-FR') + ' à ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const tvaVal   = v.tva_amt || v.tvaAmt || 0
    const fmt      = n => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))
    const dateStr  = (v.date || now.toISOString().split('T')[0]).replace(/-/g, '').slice(2)
    const numRecu  = 'REC-' + dateStr + '-' + v.id.slice(-4).toUpperCase()
    const lignesHtml = (v.lignes || []).map(l => `
      <div class="item">
        <div class="item-top">
          <span class="item-name">${l.med}</span>
          <span class="item-subtotal">${fmt(l.qte * l.pu)} F</span>
        </div>
        <div class="item-detail">${l.cond} &nbsp;·&nbsp; ${l.qte} × ${fmt(l.pu)} F</div>
      </div>`).join('')
    const tvaHtml = tvaVal > 0 ? `
      <div class="sub-row"><span>Sous-total HT</span><span>${fmt(v.total)} F</span></div>
      <div class="sub-row"><span>TVA (${tva?.taux || 18}%)</span><span>${fmt(tvaVal)} F</span></div>` : ''
    const noteHtml = v.note ? `<div class="note">📝 ${v.note}</div>` : ''
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reçu ${numRecu}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1e293b;background:#fff;}
  .wrap{max-width:390px;margin:0 auto;padding:22px 18px;}
  .header{text-align:center;padding-bottom:16px;border-bottom:2.5px solid #16a34a;margin-bottom:16px;}
  .clinic-emoji{font-size:34px;line-height:1;margin-bottom:6px;}
  .clinic-name{font-size:22px;font-weight:900;color:#15803d;letter-spacing:1.5px;}
  .clinic-sub{font-size:10px;color:#64748b;margin-top:3px;}
  .badge-wrap{text-align:center;margin-bottom:4px;}
  .badge{display:inline-block;background:#15803d;color:#fff;font-size:11px;font-weight:800;letter-spacing:1px;padding:4px 18px;border-radius:20px;}
  .rec-num{text-align:center;font-size:11px;color:#94a3b8;font-family:'Courier New',monospace;margin-bottom:14px;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f8fafc;border-radius:10px;padding:10px 12px;margin-bottom:16px;}
  .info-item{display:flex;flex-direction:column;gap:2px;}
  .info-label{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;}
  .info-value{font-size:12px;font-weight:600;color:#1e293b;}
  .section-title{font-size:10px;font-weight:800;color:#16a34a;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;}
  .item{padding:8px 0;border-bottom:1px solid #f1f5f9;}
  .item-top{display:flex;justify-content:space-between;align-items:baseline;gap:6px;}
  .item-name{font-size:12px;font-weight:700;color:#1e293b;flex:1;}
  .item-subtotal{font-size:13px;font-weight:800;color:#15803d;white-space:nowrap;}
  .item-detail{font-size:11px;color:#64748b;margin-top:2px;}
  .sub-row{display:flex;justify-content:space-between;padding:4px 0;font-size:11px;color:#64748b;border-top:1px solid #f1f5f9;}
  .total-box{display:flex;justify-content:space-between;align-items:center;background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:12px 16px;margin:14px 0;}
  .total-label{font-size:13px;font-weight:700;color:#15803d;}
  .total-amount{font-size:20px;font-weight:900;color:#15803d;}
  .note{background:#fefce8;border-radius:7px;padding:8px 10px;font-size:11px;color:#854d0e;margin-bottom:12px;}
  .footer{text-align:center;padding-top:14px;border-top:1px dashed #cbd5e1;}
  .footer-emoji{font-size:22px;margin-bottom:6px;}
  .footer-text{font-size:10px;color:#94a3b8;line-height:1.7;}
  .watermark{font-size:9px;color:#e2e8f0;margin-top:10px;font-family:'Courier New',monospace;letter-spacing:2px;}
  @media print{.wrap{padding:10px 8px;}}
</style></head><body>
<div class="wrap">
  <div class="header">
    <div class="clinic-emoji">🐄</div>
    <div class="clinic-name">LA BARAKAT</div>
    <div class="clinic-sub">Pharmacie &amp; Clinique Vétérinaire · Lomé, Togo</div>
  </div>
  <div class="badge-wrap"><span class="badge">REÇU</span></div>
  <div class="rec-num">${numRecu}</div>
  <div class="info-grid">
    <div class="info-item"><span class="info-label">Date &amp; Heure</span><span class="info-value">${dateHeure}</span></div>
    <div class="info-item"><span class="info-label">Client</span><span class="info-value">${v.client || 'Comptoir'}</span></div>
    <div class="info-item"><span class="info-label">Caissier</span><span class="info-value">${v.caissier || '—'}</span></div>
    <div class="info-item"><span class="info-label">Paiement</span><span class="info-value">${v.mode}</span></div>
  </div>
  <div class="section-title">Articles</div>
  ${lignesHtml}
  ${tvaHtml}
  <div class="total-box">
    <span class="total-label">TOTAL TTC</span>
    <span class="total-amount">${fmt((v.total || 0) + tvaVal)} F</span>
  </div>
  ${noteHtml}
  <div class="footer">
    <div class="footer-emoji">🐾</div>
    <div class="footer-text">Merci de votre confiance !<br>La Barakat · Lomé, Togo<br><span style="color:#16a34a;font-weight:600">Bonne santé à votre compagnon 🌿</span></div>
    <div class="watermark">— ORIGINAL —</div>
  </div>
</div>
<script>window.onload=()=>{window.print();}<\/script>
</body></html>`)
    w.document.close()
  }

  // ── Filtres & pagination (onglet historique) ──────────────
  const now2 = new Date()
  const periodeDebut = {
    jour:    today(),
    semaine: new Date(now2.getTime() - now2.getDay() * 86400000).toISOString().split('T')[0],
    mois:    new Date(now2.getFullYear(), now2.getMonth(), 1).toISOString().split('T')[0],
    annee:   new Date(now2.getFullYear(), 0, 1).toISOString().split('T')[0],
  }
  const filtered = ventes.filter(v => {
    if (fVStatut  && v.statut !== fVStatut) return false
    if (fVMode    && v.mode   !== fVMode)   return false
    if (fVType    && (v.type||'detail') !== fVType) return false
    if (fVPeriode && periodeDebut[fVPeriode] && v.date < periodeDebut[fVPeriode]) return false
    if (searchV) {
      const q = searchV.toLowerCase()
      if (!v.client.toLowerCase().includes(q) && !JSON.stringify(v.lignes||[]).toLowerCase().includes(q)) return false
    }
    return true
  })
  const pagination = usePagination(filtered)

  const totalPaye       = ventes.filter(v => v.statut === 'Payé').reduce((s, v) => s + totalTTCV(v), 0)
  const totalCredit     = ventes.filter(v => ['À crédit','Partiellement payé','En attente'].includes(v.statut)).reduce((s, v) => s + Math.max(0, totalTTCV(v) - (v.montant_paye||0)), 0)
  const totalCreditGros = ventes.filter(v => v.type === 'gros' && ['À crédit','Partiellement payé','En attente'].includes(v.statut)).reduce((s, v) => s + Math.max(0, totalTTCV(v) - (v.montant_paye||0)), 0)

  // ── KPI du jour (caisse tab) ──────────────────────────
  const ventesJour   = ventes.filter(v => v.date === today() && v.statut !== 'Annulé')
  const caJour       = ventesJour.reduce((s, v) => s + totalTTCV(v), 0)
  const avgJour      = ventesJour.length ? Math.round(caJour / ventesJour.length) : 0
  const creditJour   = ventesJour.filter(v => v.statut !== 'Payé').reduce((s, v) => s + Math.max(0, totalTTCV(v) - (v.montant_paye||0)), 0)

  // ─────────────────────────────────────────────────────────
  return (
    <div className="app-page space-y-5">

      {/* Onglets */}
      <div style={{ display:'flex', gap:'4px', background:'#f1f5f9', borderRadius:'16px', padding:'5px', alignSelf:'flex-start', width:'fit-content' }}>
        {[
          { id:'caisse',     label:'💰 Caisse',            desc:'Saisie rapide' },
          { id:'historique', label:'📋 Ventes & Historique', desc:'Gestion complète' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 700,
            fontSize: '13px', transition: 'all .18s',
            background: tab === t.id ? 'white' : 'transparent',
            color:      tab === t.id ? '#0d9488' : '#64748b',
            boxShadow:  tab === t.id ? '0 1px 8px rgba(0,0,0,0.08)' : 'none',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════ ONGLET CAISSE ══════════════ */}
      {tab === 'caisse' && (
        <>
          {/* KPI du jour */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon:'🛒', label:'Ventes aujourd\'hui', value: ventesJour.length,   color:'#0d9488', sub: ventesJour.length === 1 ? '1 transaction' : `${ventesJour.length} transactions` },
              { icon:'💰', label:'CA du jour',          value: mask(caJour),        color:'#16a34a', sub: `moy. ${mask(avgJour)}` },
              { icon:'⏳', label:'Crédit du jour',      value: mask(creditJour),    color:'#d97706', sub: creditJour > 0 ? 'à recouvrer' : 'Tout payé ✅' },
              { icon:'📋', label:'Total ventes',        value: ventes.length,       color:'#7c3aed', sub: `${mask(totalPaye)} encaissé` },
            ].map((k, i) => (
              <div key={i} style={{ background:'white', borderRadius:16, padding:'14px 16px', border:'1px solid #f1f5f9', boxShadow:'0 1px 3px rgba(0,0,0,0.04),0 6px 20px rgba(0,0,0,0.04)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:k.color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{k.icon}</div>
                  <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em' }}>{k.label}</span>
                </div>
                <div style={{ fontSize:20, fontWeight:900, color:'#0f172a', lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Bannière reçu */}
          {recu && (
            <div style={{ background:'#f0fdf4', border:'2px solid #86efac', borderRadius:'16px', padding:'16px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'28px' }}>✅</span>
                  <div>
                    <div style={{ fontWeight:800, color:'#166534', fontSize:'15px' }}>Vente enregistrée</div>
                    <div style={{ fontSize:'13px', color:'#16a34a' }}>{recu.client || 'Comptoir'} — {fmtF(totalTTCV(recu))}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  <button type="button" onClick={() => imprimerRecu(recu)}
                    style={{ padding:'8px 14px', borderRadius:'9px', background:'#166534', color:'white', border:'none', fontWeight:700, fontSize:'13px', cursor:'pointer' }}>
                    🖨️ Imprimer
                  </button>
                  <button type="button" onClick={modifierVente} disabled={cancelling}
                    style={{ padding:'8px 14px', borderRadius:'9px', background:'#1d4ed8', color:'white', border:'none', fontWeight:700, fontSize:'13px', cursor:'pointer' }}>
                    ✏️ Modifier
                  </button>
                  <button type="button" onClick={annulerVente} disabled={cancelling}
                    style={{ padding:'8px 14px', borderRadius:'9px', background:'#dc2626', color:'white', border:'none', fontWeight:700, fontSize:'13px', cursor:'pointer' }}>
                    🗑 Annuler
                  </button>
                  <button type="button" onClick={() => setRecu(null)}
                    style={{ padding:'8px 14px', borderRadius:'9px', background:'white', color:'#64748b', border:'1px solid #e2e8f0', fontWeight:700, fontSize:'13px', cursor:'pointer' }}>
                    ✕
                  </button>
                </div>
              </div>
              <div style={{ marginTop:'12px', background:'white', borderRadius:'10px', border:'1px solid #bbf7d0', padding:'10px 14px' }}>
                {(recu.lignes || []).map((l, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', padding:'3px 0', borderBottom: i < recu.lignes.length-1 ? '1px solid #f0fdf4' : 'none' }}>
                    <span style={{ fontWeight:600 }}>{l.med} <span style={{ color:'#94a3b8', fontWeight:400 }}>× {l.qte}</span></span>
                    <span style={{ fontFamily:'monospace', fontWeight:700, color:'#166534' }}>{fmtF((l.qte||0)*(l.pu||0))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Formulaire */}
            <div className="app-card p-5 md:col-span-2">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">🧾 Nouvelle vente</h2>
              <ValidationBanner messages={validationMessages} onDismiss={() => setValidationMessages([])} />

              <div className="grid grid-cols-2 gap-3 mb-4" style={{ gridTemplateColumns:'1fr 1fr 1fr' }}>
                <div>
                  <label style={LBL}>Date</label>
                  <input type="date" value={posDate} onChange={e => setPosDate(e.target.value)}
                    style={INPUT} />
                </div>
                <div>
                  <label style={LBL}>Client</label>
                  <input value={client} onChange={e => patchCaisse({ client: e.target.value })}
                    placeholder="Nom du client…" list="caisse-clients" style={INPUT} />
                  <datalist id="caisse-clients">
                    {nomsClients.map(n => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div>
                  <label style={LBL}>Mode de paiement</label>
                  <select value={mode} onChange={e => patchCaisse({ mode: e.target.value })}
                    style={{ ...INPUT, border: formErrors.mode ? '1.5px solid #f87171' : '1.5px solid #e2e8f0' }}>
                    {['Espèces','Mobile Money','Carte bancaire','Virement','À crédit'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* En-têtes colonnes */}
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr auto 1fr auto', gap:'6px', marginBottom:'6px' }}>
                {['Médicament','Conditionnement','Qté','Prix unit.',''].map((h, i) => (
                  <div key={i} style={{ fontSize:'10px', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</div>
                ))}
              </div>

              {/* Lignes */}
              {lignes.map((l, i) => {
                const medObj  = meds.find(m => m.nom === l.med)
                const tarifs  = getTarifs(medObj)
                const rowErr  = ligneError(i,'med') || ligneError(i,'qte') || ligneError(i,'pu')
                const filteredMeds = (l.medSearch||'').length >= 1
                  ? meds.filter(m => (m.stock||0) > 0 && m.nom.toLowerCase().includes((l.medSearch||'').toLowerCase()))
                  : meds.filter(m => (m.stock||0) > 0)
                return (
                  <div key={i} style={{ marginBottom:'6px' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr auto 1fr auto', gap:'6px', alignItems:'center' }}>
                      <div style={{ position:'relative' }}>
                        <input
                          value={l.medSearch !== undefined ? l.medSearch : l.med}
                          onChange={e => updL(i, { medSearch:e.target.value, med:'', showSugg:true })}
                          onFocus={() => updL(i, { showSugg:true })}
                          onBlur={() => setTimeout(() => updL(i, { showSugg:false }), 160)}
                          placeholder="Chercher médicament…"
                          style={{ ...INPUT, border: ligneError(i,'med') ? '1.5px solid #f87171' : '1.5px solid #e2e8f0', width:'100%' }}
                        />
                        {l.showSugg && filteredMeds.length > 0 && (
                          <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50, background:'white', border:'1.5px solid #e2e8f0', borderRadius:'9px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', maxHeight:'200px', overflowY:'auto' }}>
                            {filteredMeds.slice(0, 15).map(m => (
                              <button key={m.id||m.nom} type="button"
                                onMouseDown={() => selectMed(i, m.nom)}
                                style={{ display:'flex', justifyContent:'space-between', width:'100%', padding:'8px 12px', fontSize:'13px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}
                                onMouseEnter={e => e.currentTarget.style.background='#f0fdf4'}
                                onMouseLeave={e => e.currentTarget.style.background='none'}>
                                <span style={{ fontWeight:600 }}>{m.nom}</span>
                                <span style={{ color:'#64748b', fontSize:'11px' }}>stk:{m.stock} · {fmtF(m.prixVente||m.prix_vente||0)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <select value={l.cond} disabled={!l.med}
                        onChange={e => {
                          const t = tarifs.find(x => x.conditionnement === e.target.value)
                          updL(i, { cond:e.target.value, ...(t ? { pu:t.prix, mult:t.mult||1 } : {}) })
                        }}
                        style={{ ...INPUT, border:'1.5px solid #e2e8f0', opacity: l.med ? 1 : 0.4 }}>
                        {tarifs.map(t => <option key={t.conditionnement} value={t.conditionnement}>{t.conditionnement}</option>)}
                      </select>
                      <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                        <button type="button" onClick={() => adjQte(i,-1)}
                          style={{ width:'26px', height:'34px', borderRadius:'7px', border:'1.5px solid #e2e8f0', background:'#f8fafc', fontWeight:900, fontSize:'16px', cursor:'pointer', lineHeight:1 }}>−</button>
                        <input type="number" min="1" value={l.qte}
                          onChange={e => updL(i, { qte: parseInt(e.target.value,10) || 1 })}
                          style={{ ...INPUT, width:'50px', textAlign:'center', border: ligneError(i,'qte') ? '1.5px solid #f87171' : '1.5px solid #e2e8f0', padding:'8px 4px' }} />
                        <button type="button" onClick={() => adjQte(i,1)}
                          style={{ width:'26px', height:'34px', borderRadius:'7px', border:'1.5px solid #e2e8f0', background:'#f8fafc', fontWeight:900, fontSize:'16px', cursor:'pointer', lineHeight:1 }}>+</button>
                      </div>
                      <input type="number" value={l.pu}
                        onChange={e => updL(i, { pu: parseFloat(e.target.value) || 0 })}
                        style={{ ...INPUT, border: ligneError(i,'pu') ? '1.5px solid #f87171' : '1.5px solid #e2e8f0' }} />
                      <button type="button" onClick={() => removeLigne(i)}
                        style={{ width:'28px', height:'28px', borderRadius:'7px', border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                    </div>
                    {rowErr && <p style={{ fontSize:'11px', color:'#dc2626', marginTop:'2px', fontWeight:600 }}>{rowErr}</p>}
                  </div>
                )
              })}

              <button type="button" onClick={() => setLignes(prev => [...prev, { ...EMPTY_LIGNE }])}
                style={{ fontSize:'13px', color:'#2563eb', fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:'4px 0', marginTop:'4px' }}>
                + Ajouter une ligne
              </button>

              <div style={{ marginTop:'12px' }}>
                <label style={LBL}>Note</label>
                <input value={note} onChange={e => patchCaisse({ note: e.target.value })} placeholder="Note optionnelle…"
                  style={{ ...INPUT, width:'100%' }} />
              </div>
            </div>

            {/* Résumé caisse */}
            <div className="app-card p-5" style={{ background:'linear-gradient(135deg,#0f2535,#166534)', color:'white' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
                <h3 style={{ fontWeight:800, fontSize:'16px', color:'white', margin:0 }}>💰 Résumé caisse</h3>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'18px', fontWeight:900, fontFamily:"'Space Mono',monospace", color:'#4ade80', lineHeight:1 }}>
                    {nowClock.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                  </div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginTop:'3px', letterSpacing:'.03em' }}>
                    {nowClock.toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' })}
                  </div>
                </div>
              </div>
              <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:'12px', padding:'14px', marginBottom:'16px' }}>
                {lignesOk.map((l, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'6px', color:'rgba(255,255,255,0.85)' }}>
                    <span>{l.med} ×{l.qte}</span>
                    <span style={{ fontFamily:"'Space Mono',monospace", fontWeight:700 }}>{mask((l.pu||0)*(l.qte||0))}</span>
                  </div>
                ))}
                {!lignesOk.length && <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'13px', textAlign:'center' }}>Aucun article</p>}
              </div>
              {tva?.active && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'8px', color:'rgba(255,255,255,0.7)' }}>
                  <span>TVA ({tva.taux}%)</span>
                  <span style={{ fontFamily:"'Space Mono',monospace" }}>{mask(tvaAmt)}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'22px', fontWeight:900, marginBottom:'20px', borderTop:'1px solid rgba(255,255,255,0.2)', paddingTop:'12px' }}>
                <span>TOTAL</span>
                <span style={{ fontFamily:"'Space Mono',monospace", color:'#4ade80' }}>{mask(totalTTC)}</span>
              </div>
              {mode !== 'À crédit' && (
                <div style={{ marginBottom:'12px' }}>
                  <label style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:'.08em', display:'block', marginBottom:'5px' }}>MONTANT DONNÉ</label>
                  <input type="number" value={montantDonne} onChange={e => setMontantDonne(e.target.value)} placeholder="0"
                    style={{ width:'100%', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'9px', padding:'10px 12px', fontSize:'16px', fontWeight:700, color:'white', outline:'none', fontFamily:"'Space Mono',monospace" }} />
                </div>
              )}
              {montantDonne && mode !== 'À crédit' && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'16px', fontWeight:800, marginBottom:'16px', padding:'10px 12px', background:'rgba(74,222,128,0.15)', borderRadius:'9px', border:'1px solid rgba(74,222,128,0.3)' }}>
                  <span style={{ color:'rgba(255,255,255,0.8)' }}>Monnaie</span>
                  <span style={{ color:'#4ade80', fontFamily:"'Space Mono',monospace" }}>{mask(monnaie)}</span>
                </div>
              )}
              <button type="button" onClick={enregistrer} disabled={saving || !lignesOk.length}
                style={{ width:'100%', padding:'14px', borderRadius:'12px', border:'none', background: saving ? '#94a3b8' : 'linear-gradient(135deg,#22c55e,#16a34a)', color:'white', fontWeight:900, fontSize:'16px', cursor: saving ? 'wait' : 'pointer', boxShadow:'0 4px 20px rgba(34,197,94,0.4)' }}>
                {saving ? 'Enregistrement…' : '✓ Encaisser'}
              </button>
              {lignesOk.length > 0 && (
                <button type="button" onClick={resetForm}
                  style={{ width:'100%', marginTop:'8px', padding:'10px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.6)', fontWeight:600, fontSize:'13px', cursor:'pointer' }}>
                  🗑 Vider le panier
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════ ONGLET HISTORIQUE ══════════════ */}
      {tab === 'historique' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { l:'Ventes totales', v: ventes.length,           mod:'stat-tile--blue' },
              { l:'Encaissé',       v: mask(totalPaye),         mod:'stat-tile--green' },
              { l:'À recouvrer',    v: mask(totalCredit),       mod:'stat-tile--orange' },
              { l:'Créances gros',  v: mask(totalCreditGros),   mod:'stat-tile--purple' },
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
                <h2 className="text-xl font-bold">🛒 Ventes & Historique</h2>
                <p className="text-xs text-slate-400 mt-0.5">{ventes.length} vente(s) au total</p>
              </div>
              <Btn onClick={() => setShowVenteForm(!showVenteForm)}>{showVenteForm ? '✕ Annuler' : '+ Nouvelle vente'}</Btn>
            </div>

            {showVenteForm && (
              <FormPanel
                icon={venteForm.type === 'gros' ? '📦' : '🛒'}
                title={venteForm.type === 'gros' ? 'Vente en gros' : 'Vente au détail'}
                subtitle="Remplissez les informations de la vente"
                color={venteForm.type === 'gros' ? 'orange' : 'teal'}
                onClose={() => setShowVenteForm(false)}
              >
                <div className="flex gap-2 mb-4">
                  {[{v:'detail',l:'🏪 Vente au détail'},{v:'gros',l:'📦 Vente en gros'}].map(t => (
                    <button key={t.v} type="button"
                      onClick={() => patchVenteForm({ type:t.v, lignes:[{med:'',medSearch:'',cond:'',qte:1,pu:'',showSugg:false}] })}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${venteForm.type===t.v
                        ? t.v==='gros' ? 'border-orange-500 bg-orange-100 text-orange-700' : 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                      {t.l}
                    </button>
                  ))}
                </div>
                <ValidationBanner messages={venteValidMsgs} onDismiss={() => setVenteValidMsgs([])} />
                <FormSection label="Informations" icon="📋" color={venteForm.type === 'gros' ? 'orange' : 'teal'} noTopMargin>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Field label="Date" value={venteForm.date} onChange={e => patchVenteForm({ date:e.target.value })} error={venteFormErrors.date} type="date" />
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">Client *</label>
                      <AutoSuggest value={venteForm.client}
                        onChange={e => { patchVenteForm({ client:e.target.value }); setCliSugg(clients.filter(c => c.nom.toLowerCase().includes(e.target.value.toLowerCase()))) }}
                        list={cliSugg} onSelect={c => { patchVenteForm({ client:c.nom }); setCliSugg([]) }}
                        placeholder="Nom du client" />
                      {venteFormErrors.client && <p style={{ fontSize:'11px', color:'#dc2626', marginTop:'4px', fontWeight:600 }}>{venteFormErrors.client}</p>}
                    </div>
                    <Field label="Mode paiement" value={venteForm.mode} onChange={e => patchVenteForm({ mode:e.target.value })} error={venteFormErrors.mode} options={['Espèces','Mobile Money','Virement','Chèque','–']} />
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">Statut</label>
                      <select
                        style={{ border:`1.5px solid ${venteFormErrors.statut?'#f87171':'#e2e8f0'}`, borderRadius:12, padding:'10px 14px', fontSize:'13.5px', width:'100%', outline:'none', background:'var(--app-surface)', fontFamily:"'Outfit',sans-serif", color:'var(--app-text)', cursor:'pointer' }}
                        value={venteForm.statut} onChange={e => patchVenteForm({ statut:e.target.value })}>
                        {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {venteForm.statut !== 'Payé' && <p className="text-xs text-orange-600 mt-1">⚠️ Stock non décrémenté tant que non payé</p>}
                    </div>
                  </div>
                </FormSection>

                <FormSection label="Produits" icon="💊" color={venteForm.type === 'gros' ? 'orange' : 'teal'}
                  action={
                    <button onClick={() => setVenteForm(p => ({...p, lignes:[...p.lignes,{med:'',medSearch:'',cond:'',qte:1,pu:'',showSugg:false}]}))}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold">
                      + Ajouter
                    </button>
                  }>
                  <div className="grid gap-2 mb-1.5 px-1" style={{gridTemplateColumns:'2fr 1.5fr 0.6fr 1fr 28px'}}>
                    {['Médicament', venteForm.type==='gros' ? 'Type' : 'Conditionnement','Qté','Prix unit. (F)',''].map((h,i) => (
                      <div key={i} className="text-xs font-bold text-slate-400">{h}</div>
                    ))}
                  </div>
                  {venteForm.lignes.map((l, i) => {
                    const medObj = meds.find(m => m.nom === l.med)
                    const tarifs = getTarifsV(medObj)
                    const rowErr = vLigneError(i,'med') || vLigneError(i,'qte') || vLigneError(i,'pu')
                    return (
                      <div key={i}>
                        <div className="grid gap-2 mb-1 items-center" style={{gridTemplateColumns:'2fr 1.5fr 0.6fr 1fr 28px'}}>
                          <div className="relative">
                            <input type="text" placeholder="Rechercher médicament…"
                              value={l.medSearch !== undefined ? l.medSearch : l.med}
                              onChange={e => updVL(i, { medSearch:e.target.value, med:'', showSugg:true })}
                              onFocus={e => { updVL(i, { showSugg:true }); e.target.style.borderColor='#0d9488' }}
                              onBlur={e  => { setTimeout(() => updVL(i, { showSugg:false }), 160); e.target.style.borderColor= vLigneError(i,'med') ? '#f87171' : '#e2e8f0' }}
                              style={{ border:`1.5px solid ${vLigneError(i,'med')?'#f87171':'#e2e8f0'}`, borderRadius:12, padding:'10px 14px', fontSize:'13.5px', width:'100%', outline:'none', background:'var(--app-surface)', fontFamily:"'Outfit',sans-serif", color:'var(--app-text)' }}
                            />
                            {l.showSugg && (
                              <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                {meds.filter(m => m.stock > 0 && m.nom.toLowerCase().includes((l.medSearch||'').toLowerCase()))
                                  .map(m => (
                                    <button key={m.id||m.nom} type="button"
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex justify-between items-center"
                                      onMouseDown={() => {
                                        if (venteForm.type === 'gros') {
                                          updVL(i, { med:m.nom, medSearch:m.nom, cond:'Gros', pu:getPrixGros(m,parseInt(l.qte)||1), mult:1, showSugg:false })
                                        } else {
                                          const t2 = getTarifsV(m)
                                          updVL(i, { med:m.nom, medSearch:m.nom, cond:t2?.[0]?.conditionnement||'Unité', pu:t2?.[0]?.prix||m.prixVente||m.prix_vente||'', mult:t2?.[0]?.mult||1, showSugg:false })
                                        }
                                      }}>
                                      <span className="font-medium">{m.nom}</span>
                                      <span className="text-xs text-slate-400">stk: {m.stock}</span>
                                    </button>
                                  ))}
                                {!meds.filter(m => m.stock > 0 && m.nom.toLowerCase().includes((l.medSearch||'').toLowerCase())).length && (
                                  <div className="px-3 py-2 text-sm text-slate-400">Aucun résultat</div>
                                )}
                              </div>
                            )}
                          </div>
                          {venteForm.type === 'gros' ? (
                            <div className="flex items-center h-full">
                              <span className={`text-xs font-bold px-3 py-2.5 rounded-xl border ${l.med ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>📦 Gros</span>
                            </div>
                          ) : (
                            <select className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm outline-none bg-white ${!l.med?'border-slate-100 text-slate-300':'border-slate-200 focus:border-green-400'}`}
                              value={l.cond} disabled={!l.med}
                              onChange={e => { const t = tarifs.find(t => t.conditionnement===e.target.value); updVL(i, {cond:e.target.value, pu:t?t.prix:l.pu, mult:t?(t.mult||1):(l.mult||1)}) }}>
                              <option value="">{l.med ? '— Sélectionner —' : '(choisir médicament)'}</option>
                              {tarifs.map(t => <option key={t.conditionnement} value={t.conditionnement}>{t.conditionnement}{t.prix?' — '+fmtF(t.prix):''}</option>)}
                              <option value="__libre__">✏️ Prix libre…</option>
                            </select>
                          )}
                          <input type="number" min="1" value={l.qte} onChange={e => updVL(i, {qte:e.target.value})}
                            style={{ border:`1.5px solid ${vLigneError(i,'qte')?'#f87171':'#e2e8f0'}`, borderRadius:12, padding:'10px 6px', fontSize:'13.5px', width:'100%', outline:'none', background:'var(--app-surface)', fontFamily:"'Outfit',sans-serif", textAlign:'center', color:'var(--app-text)' }} />
                          <input type="number" value={l.pu} onChange={e => updVL(i, {pu:e.target.value})} placeholder="0"
                            style={{ border:`1.5px solid ${vLigneError(i,'pu')?'#f87171':'#e2e8f0'}`, borderRadius:12, padding:'10px 14px', fontSize:'13.5px', width:'100%', outline:'none', background:'var(--app-surface)', fontFamily:"'Outfit',sans-serif", color:'var(--app-text)' }} />
                          {venteForm.lignes.length > 1
                            ? <button onClick={() => setVenteForm(p => ({...p, lignes:p.lignes.filter((_,j)=>j!==i)}))} className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg text-xs">✕</button>
                            : <div />}
                        </div>
                        {venteForm.type === 'gros' && l.med && (() => {
                          const mo = meds.find(m => m.nom === l.med)
                          const remise = getRemiseApplied(mo, l.qte)
                          const hasPrixGros = mo && (mo.prixGros || mo.prix_gros)
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
                </FormSection>

                <div className="flex items-center justify-between mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Total</p>
                    <span className={`text-2xl font-black font-mono ${venteForm.type==='gros' ? 'text-orange-600' : 'text-teal-600'}`}>{fmtF(venteFormTotal)}</span>
                  </div>
                  <Btn color={venteForm.type==='gros' ? 'accent' : 'brand'} onClick={addVente} disabled={savingVente}>
                    {savingVente ? '⏳ Enregistrement…' : '✓ Enregistrer la vente'}
                  </Btn>
                </div>
              </FormPanel>
            )}

            <FilterBar search={searchV} onSearch={setSearchV} placeholder="🔍 Client, produit…"
              activeCount={[fVStatut,fVMode,fVPeriode,fVType,searchV].filter(Boolean).length}
              onReset={() => { setSearchV(''); setFVStatut(''); setFVMode(''); setFVPeriode(''); setFVType('') }}>
              <FilterSelect label="📋 Statut"   value={fVStatut}  onChange={setFVStatut}  options={STATUTS.map(s => ({v:s,l:s}))} />
              <FilterSelect label="💳 Paiement" value={fVMode}    onChange={setFVMode}    options={['Espèces','Mobile Money','Virement','Chèque'].map(m => ({v:m,l:m}))} />
              <FilterBtns label="Type" options={[{v:'detail',l:'🏪 Détail'},{v:'gros',l:'📦 Gros'}]} value={fVType} onChange={setFVType} colorFn={v => v==='gros' ? 'orange' : 'green'} />
              <FilterPeriode value={fVPeriode} onChange={setFVPeriode} />
            </FilterBar>

            <div className="p-4 space-y-2">
              {!pagination.pageItems.length && (
                <EmptyState icon="🛒" title="Aucune vente" subtitle="Enregistrez votre première vente depuis la caisse." />
              )}
              {pagination.pageItems.map(v => {
                const isExp = expandedVId === v.id
                const SC = STATUT_COLOR[v.statut] || 'slate'
                const SC_MAP = { green:'#16a34a', orange:'#d97706', amber:'#f59e0b', yellow:'#ca8a04', red:'#dc2626', blue:'#2563eb', slate:'#64748b' }
                const statColor = SC_MAP[SC] || '#64748b'
                const statBg    = { green:'#f0fdf4', orange:'#fffbeb', amber:'#fff7ed', yellow:'#fefce8', red:'#fef2f2', blue:'#eff6ff', slate:'#f8fafc' }[SC] || '#f8fafc'
                const statBorder= { green:'#bbf7d0', orange:'#fde68a', amber:'#fed7aa', yellow:'#fef08a', red:'#fecaca', blue:'#bfdbfe', slate:'#e2e8f0' }[SC] || '#e2e8f0'
                return (
                  <div key={v.id} style={{ borderRadius:14, border:`1px solid ${isExp ? '#99f6e4' : '#f1f5f9'}`, background: isExp ? '#fafffe' : 'white', overflow:'hidden', transition:'all .15s', boxShadow: isExp ? '0 4px 16px rgba(13,148,136,0.07)' : 'none' }}>
                    {/* Header cliquable */}
                    <button type="button" onClick={() => setExpandedVId(isExp ? null : v.id)}
                      style={{ width:'100%', background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:'13px 16px', display:'flex', alignItems:'center', gap:12 }}>
                      {/* Date */}
                      <div style={{ flexShrink:0, textAlign:'center', width:42 }}>
                        <div style={{ fontSize:17, fontWeight:900, color:'#0f172a', lineHeight:1 }}>{(v.date||'').split('-')[2]||'—'}</div>
                        <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase' }}>
                          {v.date ? new Date(v.date+'T00:00:00').toLocaleDateString('fr-FR',{month:'short'}) : ''}
                        </div>
                      </div>
                      <div style={{ width:1, height:34, background:'#f1f5f9', flexShrink:0 }} />
                      {/* Infos */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:3 }}>
                          <span style={{ fontWeight:800, fontSize:14, color:'#0f172a' }}>👤 {v.client||'Comptoir'}</span>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:statBg, border:`1px solid ${statBorder}`, color:statColor }}>
                            <span style={{ width:5, height:5, borderRadius:'50%', background:statColor, flexShrink:0 }} />{v.statut}
                          </span>
                          {v.type === 'gros' && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#fff7ed', border:'1px solid #fed7aa', color:'#ea580c' }}>📦 Gros</span>}
                          {(v.type === 'clinique' || v.consultation_id) && <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb' }}>🩺 Consultation</span>}
                          {v.caissier && <span style={{ fontSize:10, color:'#94a3b8' }}>🧾 {v.caissier}</span>}
                        </div>
                        <div style={{ fontSize:11, color:'#64748b' }}>
                          {(v.lignes||[]).length} article{(v.lignes||[]).length>1?'s':''}
                          {(v.lignes||[]).length>0 && ' · '+(v.lignes||[]).slice(0,2).map(l=>l.med||'?').join(', ')+((v.lignes||[]).length>2?'…':'')}
                          {v.mode && <span style={{ marginLeft:6, color:'#94a3b8' }}>· {v.mode}</span>}
                        </div>
                      </div>
                      {/* Montant */}
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:16, fontWeight:900, color: otrMode ? '#cbd5e1' : '#0d9488', fontVariantNumeric:'tabular-nums' }}>{mask(v.total)}</div>
                        {tva?.active && !otrMode && <div style={{ fontSize:10, color:'#94a3b8' }}>+TVA {fmtF(tvaAmtV(v))}</div>}
                      </div>
                      <span style={{ color:'#cbd5e1', fontSize:12, flexShrink:0 }}>{isExp?'▲':'▼'}</span>
                    </button>

                    {/* Détail déplié */}
                    {isExp && (
                      <div style={{ padding:'0 16px 14px', borderTop:'1px solid #f0fdfa' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:8, paddingTop:12 }}>
                          {(v.lignes||[]).map((l, i) => (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:10, background:'#f8fafc', border:'1px solid #f1f5f9' }}>
                              <span style={{ fontSize:18 }}>💊</span>
                              <div style={{ minWidth:0 }}>
                                <div style={{ fontWeight:700, fontSize:12, color:'#1e293b' }}>{l.med||'?'}</div>
                                <div style={{ fontSize:11, color:'#94a3b8' }}>{l.cond||''}{l.cond&&l.qte?' · ':''}{l.qte?`×${l.qte}`:''}{l.pu?` · ${fmtF((l.pu||0)*(l.qte||0))}`:''}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {v.note && <div style={{ marginTop:10, padding:'8px 12px', borderRadius:10, background:'#fffbeb', border:'1px solid #fde68a', fontSize:12, color:'#92400e' }}>📌 {v.note}</div>}
                        {/* Actions */}
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:12 }}>
                          <button onClick={() => imprimerRecu(v)} style={{ padding:'6px 12px', borderRadius:9, fontSize:12, fontWeight:700, border:'1px solid #e2e8f0', background:'white', color:'#475569', cursor:'pointer' }}>🖨️ Imprimer</button>
                          {v.statut !== 'Payé' && v.statut !== 'Annulé' && <>
                            <button onClick={() => handleStatut(v.id,'Payé')} style={{ padding:'6px 12px', borderRadius:9, fontSize:12, fontWeight:700, border:'1px solid #bbf7d0', background:'#f0fdf4', color:'#16a34a', cursor:'pointer' }}>✓ Marquer Payé</button>
                            <button onClick={() => handleStatut(v.id,'Annulé')} style={{ padding:'6px 12px', borderRadius:9, fontSize:12, fontWeight:700, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', cursor:'pointer' }}>✕ Annuler</button>
                          </>}
                          <button onClick={() => deleteVente(v.id)} style={{ padding:'6px 12px', borderRadius:9, fontSize:12, fontWeight:700, border:'1px solid #fecaca', background:'#fef2f2', color:'#ef4444', cursor:'pointer' }}>🗑 Supprimer</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <Pagination {...pagination} />
          </div>
        </>
      )}
    </div>
  )
}

const LBL   = { fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em', display:'block', marginBottom:'5px' }
const INPUT = { border:'1.5px solid #e2e8f0', borderRadius:'9px', padding:'8px 11px', fontSize:'13px', outline:'none', background:'white' }

export default Caisse
