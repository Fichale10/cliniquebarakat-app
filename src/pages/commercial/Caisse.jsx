import { useState } from 'react'
import { ValidationBanner } from '../../components/ui'
import { dbInsert, dbUpdate, dbDelete, newId } from '../../lib/db'
import { venteToDbRow, validateCaisseForm } from '../../lib/validation'

const today = () => new Date().toISOString().split('T')[0]
const fmtF  = v => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'
const EMPTY_LIGNE = { med: '', medSearch: '', cond: 'Unité', qte: 1, pu: 0, showSugg: false }

const getTarifs = (medObj) => {
  if (!medObj) return []
  if (medObj.tarifs?.length) return medObj.tarifs
  const pv = medObj.prixVente || medObj.prix_vente || 0
  const u  = medObj.unite || ''
  if (u === 'comprimés' || u === 'cp') return [
    { conditionnement: 'Comprimé',          prix: pv },
    { conditionnement: 'Plaquette (10 cp)', prix: pv * 10 },
    { conditionnement: 'Boîte (30 cp)',     prix: pv * 30 },
    { conditionnement: 'Boîte (50 cp)',     prix: pv * 50 },
    { conditionnement: 'Boîte (100 cp)',    prix: pv * 100 },
  ]
  if (u === 'flacons') return [{ conditionnement: 'Flacon',      prix: pv }]
  if (u === 'doses')   return [
    { conditionnement: 'Dose',         prix: pv },
    { conditionnement: 'Pack 5 doses', prix: pv * 5 },
  ]
  return [{ conditionnement: 'Unité', prix: pv }]
}

function Caisse({ meds, setMeds, clients, ventesHist, setVentesHist, otrMode, tva, user, sb, logAction }) {
  const [lignes, setLignes]           = useState([{ ...EMPTY_LIGNE }])
  const [client, setClient]           = useState('')
  const [mode, setMode]               = useState('Espèces')
  const [note, setNote]               = useState('')
  const [recu, setRecu]               = useState(null)
  const [montantDonne, setMontantDonne] = useState('')
  const [saving, setSaving]           = useState(false)
  const [cancelling, setCancelling]   = useState(false)
  const [formErrors, setFormErrors]   = useState({})
  const [validationMessages, setValidationMessages] = useState([])

  const ligneError = (i, field) => formErrors[`lignes.${i}.${field}`]

  const updL = (i, updates) => {
    setLignes(prev => {
      const l = [...prev]; l[i] = { ...l[i], ...updates }; return l
    })
    setFormErrors(prev => {
      const next = { ...prev }
      Object.keys(prev).forEach(k => { if (k.startsWith(`lignes.${i}.`)) delete next[k] })
      return next
    })
    if (validationMessages.length) setValidationMessages([])
  }

  const patchCaisse = (patch) => {
    if ('client' in patch) setClient(patch.client)
    if ('mode'   in patch) setMode(patch.mode)
    if ('note'   in patch) setNote(patch.note)
    Object.keys(patch).forEach(k => setFormErrors(prev => { const n = { ...prev }; delete n[k]; return n }))
    if (validationMessages.length) setValidationMessages([])
  }

  // ── Médicament sélectionné dans le dropdown ──────────────
  const selectMed = (i, nom) => {
    const m2 = meds.find(m => m.nom === nom)
    const t2 = getTarifs(m2)
    updL(i, {
      med:       nom,
      medSearch: nom,
      showSugg:  false,
      pu:        t2[0]?.prix ?? m2?.prixVente ?? m2?.prix_vente ?? 0,
      cond:      t2[0]?.conditionnement || 'Unité',
    })
  }

  // ── Supprimer / vider une ligne ──────────────────────────
  const removeLigne = (i) => {
    if (lignes.length === 1) {
      setLignes([{ ...EMPTY_LIGNE }])
    } else {
      setLignes(prev => prev.filter((_, j) => j !== i))
    }
  }

  // ── Ajuster quantité ────────────────────────────────────
  const adjQte = (i, delta) => {
    const cur = parseInt(lignes[i].qte) || 0
    updL(i, { qte: Math.max(1, cur + delta) })
  }

  const lignesOk  = lignes.filter(l => l.med && (l.qte || 0) > 0)
  const total     = lignesOk.reduce((s, l) => s + (l.pu || 0) * (l.qte || 0), 0)
  const tvaAmt    = tva?.active ? Math.round(total * (tva.taux / 100)) : 0
  const totalTTC  = total + tvaAmt
  const monnaie   = montantDonne ? Math.max(0, (parseFloat(montantDonne) || 0) - totalTTC) : 0
  const mask      = v => otrMode ? '••••• F' : fmtF(v)

  // ── Enregistrer la vente ────────────────────────────────
  const enregistrer = async () => {
    const checked = validateCaisseForm({ client, mode, note, lignes }, meds)
    if (!checked.ok) {
      setFormErrors(checked.fieldErrors)
      setValidationMessages(checked.messages)
      return
    }
    const { data: validated } = checked
    const lignesValides = validated.lignes
    const statut = validated.mode === 'À crédit' ? 'À crédit' : 'Payé'

    const row = venteToDbRow({
      id: newId(), date: today(),
      client: validated.client, lignes: lignesValides,
      total: totalTTC, statut, mode: validated.mode,
      note: validated.note, tvaAmt, caissier: user?.name || '—',
    })

    setSaving(true)
    try {
      const vente = sb ? await dbInsert(sb, 'ventes', row) : row
      setVentesHist([vente, ...(ventesHist || [])].slice(0, 500))

      if (statut === 'Payé') {
        const updatedMeds = meds.map(m => {
          const l = lignesValides.find(x => x.med === m.nom)
          if (!l) return m
          const newStock = Math.max(0, (m.stock || 0) - l.qte)
          if (sb && m.id) dbUpdate(sb, 'medicaments', m.id, { stock: newStock })
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

  const resetForm = () => {
    setLignes([{ ...EMPTY_LIGNE }])
    setClient(''); setNote(''); setMontantDonne('')
    setFormErrors({}); setValidationMessages([])
  }

  // ── Annuler une vente enregistrée ────────────────────────
  const annulerVente = async () => {
    if (!recu) return
    if (!confirm('Annuler et supprimer cette vente ?')) return
    setCancelling(true)
    try {
      if (sb) await dbDelete(sb, 'ventes', recu.id)
      setVentesHist((ventesHist || []).filter(v => v.id !== recu.id))

      // Remettre le stock si la vente était payée
      if (recu.statut === 'Payé') {
        const updatedMeds = meds.map(m => {
          const l = (recu.lignes || []).find(x => x.med === m.nom)
          if (!l) return m
          const newStock = (m.stock || 0) + (l.qte || 0)
          if (sb && m.id) dbUpdate(sb, 'medicaments', m.id, { stock: newStock })
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

  // ── Modifier une vente enregistrée ───────────────────────
  const modifierVente = async () => {
    if (!recu) return
    setCancelling(true)
    try {
      if (sb) await dbDelete(sb, 'ventes', recu.id)
      setVentesHist((ventesHist || []).filter(v => v.id !== recu.id))

      // Remettre le stock
      if (recu.statut === 'Payé') {
        const updatedMeds = meds.map(m => {
          const l = (recu.lignes || []).find(x => x.med === m.nom)
          if (!l) return m
          const newStock = (m.stock || 0) + (l.qte || 0)
          if (sb && m.id) dbUpdate(sb, 'medicaments', m.id, { stock: newStock })
          return { ...m, stock: newStock }
        })
        setMeds(updatedMeds)
      }

      // Pré-remplir le formulaire avec les données de la vente
      setLignes((recu.lignes || []).map(l => ({
        med: l.med || '', medSearch: l.med || '',
        cond: l.cond || 'Unité',
        qte: l.qte || 1,
        pu: l.pu || 0,
        showSugg: false,
      })))
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

  // ── Imprimer le reçu ────────────────────────────────────
  const imprimerRecu = (v) => {
    const w = window.open('', '_blank', 'width=420,height=700')
    if (!w) return
    const now = new Date()
    const dateHeure = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const tvaVal = v.tva_amt || v.tvaAmt || 0
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reçu ${v.id}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Courier New',monospace;font-size:12px;color:#111;padding:16px;max-width:380px;margin:auto;}
      .center{text-align:center;} .bold{font-weight:bold;} .sep{border-top:1px dashed #999;margin:10px 0;}
      .row{display:flex;justify-content:space-between;padding:2px 0;}
      .logo{font-size:18px;font-weight:900;letter-spacing:2px;color:#166534;}
      .total-row{font-size:14px;font-weight:900;border-top:2px solid #111;padding-top:6px;margin-top:4px;}
      @media print{body{padding:0;}}
    </style></head><body>
    <div class="center" style="margin-bottom:12px">
      <div style="font-size:28px">🐄</div>
      <div class="logo">LA BARAKAT</div>
      <div style="font-size:10px;color:#555">Pharmacie & Clinique Vétérinaire · Lomé, Togo</div>
    </div>
    <div class="sep"></div>
    <div class="row"><span class="bold">REÇU N°</span><span>${v.id}</span></div>
    <div class="row"><span>Date</span><span>${dateHeure}</span></div>
    <div class="row"><span>Client</span><span>${v.client || 'Comptoir'}</span></div>
    <div class="row"><span>Caissier</span><span>${v.caissier || '—'}</span></div>
    <div class="row"><span>Mode paiement</span><span>${v.mode}</span></div>
    <div class="sep"></div>
    <div class="bold" style="margin-bottom:6px">ARTICLES</div>
    ${(v.lignes || []).map(l => `
      <div class="row"><span>${l.med} (${l.cond})</span></div>
      <div class="row" style="padding-left:12px"><span>${l.qte} × ${new Intl.NumberFormat('fr-FR').format(l.pu)} F</span><span>${new Intl.NumberFormat('fr-FR').format(l.qte * l.pu)} F</span></div>
    `).join('')}
    <div class="sep"></div>
    ${tvaVal > 0 ? `<div class="row"><span>Sous-total HT</span><span>${new Intl.NumberFormat('fr-FR').format(v.total - tvaVal)} F</span></div>
    <div class="row"><span>TVA (${tva?.taux || 18}%)</span><span>${new Intl.NumberFormat('fr-FR').format(tvaVal)} F</span></div>` : ''}
    <div class="row total-row"><span>TOTAL TTC</span><span>${new Intl.NumberFormat('fr-FR').format(v.total)} F</span></div>
    ${v.note ? `<div style="margin-top:8px;font-size:10px;color:#555">Note: ${v.note}</div>` : ''}
    <div class="sep"></div>
    <div class="center" style="font-size:10px;color:#555;margin-top:8px">
      <div>Merci de votre visite 🐾</div>
      <div style="margin-top:8px;font-size:9px">La Barakat — Lomé, Togo</div>
    </div>
    <script>window.onload=()=>{window.print();}<\/script>
    </body></html>`)
    w.document.close()
  }

  const nomsClients = (clients || []).map(c => c.nom).filter(Boolean)

  // ─────────────────────────────────────────────────────────
  return (
    <div className="app-page space-y-5">

      {/* Bannière reçu */}
      {recu && (
        <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '16px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '28px' }}>✅</span>
              <div>
                <div style={{ fontWeight: 800, color: '#166534', fontSize: '15px' }}>Vente enregistrée</div>
                <div style={{ fontSize: '13px', color: '#16a34a' }}>
                  {recu.client || 'Comptoir'} — {fmtF(recu.total)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => imprimerRecu(recu)}
                style={{ padding: '8px 14px', borderRadius: '9px', background: '#166534', color: 'white', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                🖨️ Imprimer
              </button>
              <button type="button" onClick={modifierVente} disabled={cancelling}
                style={{ padding: '8px 14px', borderRadius: '9px', background: '#1d4ed8', color: 'white', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                ✏️ Modifier
              </button>
              <button type="button" onClick={annulerVente} disabled={cancelling}
                style={{ padding: '8px 14px', borderRadius: '9px', background: '#dc2626', color: 'white', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                🗑 Annuler
              </button>
              <button type="button" onClick={() => setRecu(null)}
                style={{ padding: '8px 14px', borderRadius: '9px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          </div>

          {/* Détail articles avec quantités visibles */}
          <div style={{ marginTop: '12px', background: 'white', borderRadius: '10px', border: '1px solid #bbf7d0', padding: '10px 14px' }}>
            {(recu.lignes || []).map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '3px 0', borderBottom: i < recu.lignes.length - 1 ? '1px solid #f0fdf4' : 'none' }}>
                <span style={{ fontWeight: 600 }}>{l.med} <span style={{ color: '#94a3b8', fontWeight: 400 }}>× {l.qte}</span></span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#166534' }}>{fmtF((l.qte || 0) * (l.pu || 0))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* ── Formulaire ──────────────────────────────────── */}
        <div className="app-card p-5 md:col-span-2">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">🧾 Nouvelle vente</h2>
          <ValidationBanner messages={validationMessages} onDismiss={() => setValidationMessages([])} />

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label style={LBL}>Client</label>
              <input value={client} onChange={e => patchCaisse({ client: e.target.value })}
                placeholder="Nom du client…" list="caisse-clients"
                style={INPUT} />
              <datalist id="caisse-clients">
                {nomsClients.map(n => <option key={n} value={n} />)}
              </datalist>
            </div>
            <div>
              <label style={LBL}>Mode de paiement</label>
              <select value={mode} onChange={e => patchCaisse({ mode: e.target.value })}
                style={{ ...INPUT, border: formErrors.mode ? '1.5px solid #f87171' : '1.5px solid #e2e8f0' }}>
                {['Espèces', 'Mobile Money', 'Carte bancaire', 'Virement', 'À crédit'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* En-têtes colonnes */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr auto 1fr auto', gap: '6px', marginBottom: '6px' }}>
            {['Médicament', 'Conditionnement', 'Qté', 'Prix unit.', ''].map((h, i) => (
              <div key={i} style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</div>
            ))}
          </div>

          {/* Lignes produits */}
          {lignes.map((l, i) => {
            const medObj  = meds.find(m => m.nom === l.med)
            const tarifs  = getTarifs(medObj)
            const rowErr  = ligneError(i, 'med') || ligneError(i, 'qte') || ligneError(i, 'pu')
            const filtered = (l.medSearch || '').length >= 1
              ? meds.filter(m => (m.stock || 0) > 0 && m.nom.toLowerCase().includes((l.medSearch || '').toLowerCase()))
              : meds.filter(m => (m.stock || 0) > 0)

            return (
              <div key={i} style={{ marginBottom: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr auto 1fr auto', gap: '6px', alignItems: 'center' }}>

                  {/* Médicament — champ saisissable + dropdown */}
                  <div style={{ position: 'relative' }}>
                    <input
                      value={l.medSearch !== undefined ? l.medSearch : l.med}
                      onChange={e => updL(i, { medSearch: e.target.value, med: '', showSugg: true })}
                      onFocus={() => updL(i, { showSugg: true })}
                      onBlur={() => setTimeout(() => updL(i, { showSugg: false }), 160)}
                      placeholder="Chercher médicament…"
                      style={{ ...INPUT, border: ligneError(i, 'med') ? '1.5px solid #f87171' : '1.5px solid #e2e8f0', width: '100%' }}
                    />
                    {l.showSugg && filtered.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '9px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '200px', overflowY: 'auto' }}>
                        {filtered.slice(0, 15).map(m => (
                          <button key={m.id || m.nom} type="button"
                            onMouseDown={() => selectMed(i, m.nom)}
                            style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px 12px', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            <span style={{ fontWeight: 600 }}>{m.nom}</span>
                            <span style={{ color: '#64748b', fontSize: '11px' }}>stk:{m.stock} · {fmtF(m.prixVente || m.prix_vente || 0)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Conditionnement */}
                  <select value={l.cond} disabled={!l.med}
                    onChange={e => {
                      const t = tarifs.find(x => x.conditionnement === e.target.value)
                      updL(i, { cond: e.target.value, ...(t ? { pu: t.prix } : {}) })
                    }}
                    style={{ ...INPUT, border: '1.5px solid #e2e8f0', opacity: l.med ? 1 : 0.4 }}>
                    {tarifs.map(t => <option key={t.conditionnement} value={t.conditionnement}>{t.conditionnement}</option>)}
                  </select>

                  {/* Quantité avec +/- */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button type="button" onClick={() => adjQte(i, -1)}
                      style={{ width: '26px', height: '34px', borderRadius: '7px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontWeight: 900, fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>−</button>
                    <input type="number" min="1" value={l.qte}
                      onChange={e => updL(i, { qte: parseInt(e.target.value, 10) || 1 })}
                      style={{ ...INPUT, width: '50px', textAlign: 'center', border: ligneError(i, 'qte') ? '1.5px solid #f87171' : '1.5px solid #e2e8f0', padding: '8px 4px' }} />
                    <button type="button" onClick={() => adjQte(i, 1)}
                      style={{ width: '26px', height: '34px', borderRadius: '7px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontWeight: 900, fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>+</button>
                  </div>

                  {/* Prix unitaire */}
                  <input type="number" value={l.pu}
                    onChange={e => updL(i, { pu: parseFloat(e.target.value) || 0 })}
                    style={{ ...INPUT, border: ligneError(i, 'pu') ? '1.5px solid #f87171' : '1.5px solid #e2e8f0' }} />

                  {/* Supprimer la ligne */}
                  <button type="button" onClick={() => removeLigne(i)}
                    style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
                {rowErr && <p style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px', fontWeight: 600 }}>{rowErr}</p>}
              </div>
            )
          })}

          <button type="button" onClick={() => setLignes(prev => [...prev, { ...EMPTY_LIGNE }])}
            style={{ fontSize: '13px', color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginTop: '4px' }}>
            + Ajouter une ligne
          </button>

          <div style={{ marginTop: '12px' }}>
            <label style={LBL}>Note</label>
            <input value={note} onChange={e => patchCaisse({ note: e.target.value })} placeholder="Note optionnelle…"
              style={{ ...INPUT, width: '100%' }} />
          </div>
        </div>

        {/* ── Résumé caisse ───────────────────────────────── */}
        <div className="app-card p-5" style={{ background: 'linear-gradient(135deg,#0f2535,#166534)', color: 'white' }}>
          <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '20px', color: 'white' }}>💰 Résumé caisse</h3>

          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
            {lignesOk.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: 'rgba(255,255,255,0.85)' }}>
                <span>{l.med} ×{l.qte}</span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{mask((l.pu || 0) * (l.qte || 0))}</span>
              </div>
            ))}
            {!lignesOk.length && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center' }}>Aucun article</p>}
          </div>

          {tva?.active && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'rgba(255,255,255,0.7)' }}>
              <span>TVA ({tva.taux}%)</span>
              <span style={{ fontFamily: "'Space Mono',monospace" }}>{mask(tvaAmt)}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', fontWeight: 900, marginBottom: '20px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '12px' }}>
            <span>TOTAL</span>
            <span style={{ fontFamily: "'Space Mono',monospace", color: '#4ade80' }}>{mask(totalTTC)}</span>
          </div>

          {mode !== 'À crédit' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '.08em', display: 'block', marginBottom: '5px' }}>MONTANT DONNÉ</label>
              <input type="number" value={montantDonne} onChange={e => setMontantDonne(e.target.value)} placeholder="0"
                style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '9px', padding: '10px 12px', fontSize: '16px', fontWeight: 700, color: 'white', outline: 'none', fontFamily: "'Space Mono',monospace" }} />
            </div>
          )}

          {montantDonne && mode !== 'À crédit' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, marginBottom: '16px', padding: '10px 12px', background: 'rgba(74,222,128,0.15)', borderRadius: '9px', border: '1px solid rgba(74,222,128,0.3)' }}>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>Monnaie</span>
              <span style={{ color: '#4ade80', fontFamily: "'Space Mono',monospace" }}>{mask(monnaie)}</span>
            </div>
          )}

          <button type="button" onClick={enregistrer} disabled={saving || !lignesOk.length}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: saving ? '#94a3b8' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'white', fontWeight: 900, fontSize: '16px', cursor: saving ? 'wait' : 'pointer', boxShadow: '0 4px 20px rgba(34,197,94,0.4)' }}>
            {saving ? 'Enregistrement…' : '✓ Encaisser'}
          </button>

          {lignesOk.length > 0 && (
            <button type="button" onClick={resetForm}
              style={{ width: '100%', marginTop: '8px', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
              🗑 Vider le panier
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const LBL   = { fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '5px' }
const INPUT = { border: '1.5px solid #e2e8f0', borderRadius: '9px', padding: '8px 11px', fontSize: '13px', outline: 'none', background: 'white' }

export default Caisse
