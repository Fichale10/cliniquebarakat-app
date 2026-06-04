import { useState } from 'react'
import { ValidationBanner } from '../../components/ui'
import { dbInsert, dbUpdate, newId } from '../../lib/db'
import { venteToDbRow } from '../../lib/validation'
import { validateCaisseForm } from '../../lib/validation'

const today = () => new Date().toISOString().split('T')[0]
const fmtF = v => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'

const getTarifs = (medObj) => {
  if (!medObj) return []
  if (medObj.tarifs?.length) return medObj.tarifs
  const pv = medObj.prixVente || medObj.prix_vente || 0
  const u = medObj.unite || ''
  if (u === 'comprimés' || u === 'cp') {
    return [
      { conditionnement: 'Comprimé', prix: pv },
      { conditionnement: 'Plaquette (10 cp)', prix: pv * 10 },
      { conditionnement: 'Boîte (30 cp)', prix: pv * 30 },
      { conditionnement: 'Boîte (50 cp)', prix: pv * 50 },
      { conditionnement: 'Boîte (100 cp)', prix: pv * 100 },
    ]
  }
  if (u === 'flacons') return [{ conditionnement: 'Flacon', prix: pv }]
  if (u === 'doses') {
    return [
      { conditionnement: 'Dose', prix: pv },
      { conditionnement: 'Pack 5 doses', prix: pv * 5 },
    ]
  }
  return [{ conditionnement: 'Unité', prix: pv }]
}

function Caisse({ meds, setMeds, clients, ventesHist, setVentesHist, otrMode, tva, user, sb, logAction }) {
  const [lignes, setLignes] = useState([{ med: '', cond: 'Unité', qte: 1, pu: 0 }])
  const [client, setClient] = useState('')
  const [mode, setMode] = useState('Espèces')
  const [note, setNote] = useState('')
  const [recu, setRecu] = useState(null)
  const [montantDonne, setMontantDonne] = useState('')
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [validationMessages, setValidationMessages] = useState([])

  const ligneError = (i, field) => formErrors[`lignes.${i}.${field}`]

  const updL = (i, updates) => {
    setLignes(prev => {
      const l = [...prev]
      l[i] = { ...l[i], ...updates }
      return l
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

  const patchCaisse = (patch) => {
    if ('client' in patch) setClient(patch.client)
    if ('mode' in patch) setMode(patch.mode)
    if ('note' in patch) setNote(patch.note)
    Object.keys(patch).forEach(k => {
      setFormErrors(prev => {
        const next = { ...prev }
        delete next[k]
        return next
      })
    })
    if (validationMessages.length) setValidationMessages([])
  }

  const lignesOk = lignes.filter(l => l.med && (l.qte || 0) > 0)
  const total = lignesOk.reduce((s, l) => s + (l.pu || 0) * (l.qte || 0), 0)
  const tvaAmt = tva?.active ? Math.round(total * (tva.taux / 100)) : 0
  const totalTTC = total + tvaAmt
  const monnaie = montantDonne ? Math.max(0, (parseFloat(montantDonne) || 0) - totalTTC) : 0
  const mask = v => (otrMode ? '••••• F' : fmtF(v))

  const persistHist = (updated) => {
    setVentesHist(updated)
    try { localStorage.setItem('lb_ventes_hist', JSON.stringify(updated)) } catch (e) {}
  }

  const enregistrer = async () => {
    const checked = validateCaisseForm({ client, mode, note, lignes }, meds)
    if (!checked.ok) {
      setFormErrors(checked.fieldErrors)
      setValidationMessages(checked.messages)
      return
    }
    const validated = checked.data
    const lignesValides = validated.lignes

    const statut = validated.mode === 'À crédit' ? 'À crédit' : 'Payé'
    const row = venteToDbRow({
      id: newId(),
      date: today(),
      client: validated.client,
      lignes: lignesValides,
      total: totalTTC,
      statut,
      mode: validated.mode,
      note: validated.note,
      tvaAmt,
      caissier: user?.name || '—',
    })

    setSaving(true)
    try {
      let vente = row
      if (sb) {
        vente = await dbInsert(sb, 'ventes', row)
      }

      const updated = [vente, ...(ventesHist || [])].slice(0, 500)
      persistHist(updated)

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

      if (logAction && sb) logAction(sb, user, 'vente_caisse', `${vente.id} — ${fmtF(totalTTC)} — ${row.client}`)
      setRecu(vente)
      setLignes([{ med: '', cond: 'Unité', qte: 1, pu: 0 }])
      setClient('')
      setNote('')
      setMontantDonne('')
      setFormErrors({})
      setValidationMessages([])
    } catch (e) {
      console.error('[Caisse]', e)
      alert(e?.message || 'Erreur lors de l\'encaissement. Vérifiez la table ventes dans Supabase (fichier supabase/ventes.sql).')
    } finally {
      setSaving(false)
    }
  }

  const imprimerRecu = (v) => {
    const w = window.open('', '_blank', 'width=420,height=700')
    if (!w) return
    const now = new Date()
    const dateHeure = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
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
      <div style="font-size:10px;color:#555">www.labarakat.fr</div>
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
    ${v.tvaAmt > 0 ? `<div class="row"><span>Sous-total HT</span><span>${new Intl.NumberFormat('fr-FR').format(v.total - v.tvaAmt)} F</span></div>
    <div class="row"><span>TVA (${tva?.taux || 18}%)</span><span>${new Intl.NumberFormat('fr-FR').format(v.tvaAmt)} F</span></div>` : ''}
    <div class="row total-row"><span>TOTAL TTC</span><span>${new Intl.NumberFormat('fr-FR').format(v.total)} F</span></div>
    ${v.note ? `<div style="margin-top:8px;font-size:10px;color:#555">Note: ${v.note}</div>` : ''}
    <div class="sep"></div>
    <div class="center" style="font-size:10px;color:#555;margin-top:8px">
      <div>Merci de votre visite 🐾</div>
      <div style="margin-top:4px">Ce reçu est votre justificatif d'achat</div>
      <div style="margin-top:8px;font-size:9px">La Barakat — Lomé, Togo</div>
    </div>
    <script>window.onload=()=>{window.print();}<\/script>
    </body></html>`)
    w.document.close()
  }

  const nomsClients = (clients || []).map(c => c.nom).filter(Boolean)

  return (
    <div className="app-page space-y-5">
      {recu && (
        <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>✅</span>
            <div>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: '15px' }}>Vente enregistrée — {recu.id}</div>
              <div style={{ fontSize: '13px', color: '#16a34a' }}>Total : {fmtF(recu.total)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => imprimerRecu(recu)}
              style={{ padding: '8px 16px', borderRadius: '9px', background: '#166534', color: 'white', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
              🖨️ Imprimer reçu
            </button>
            <button type="button" onClick={() => setRecu(null)}
              style={{ padding: '8px 16px', borderRadius: '9px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="app-card p-5 md:col-span-2">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">🧾 Nouvelle vente</h2>
          <ValidationBanner messages={validationMessages} onDismiss={() => setValidationMessages([])} />

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '5px' }}>Client</label>
              <input value={client} onChange={e => patchCaisse({ client: e.target.value })} placeholder="Nom du client…" list="caisse-clients"
                style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '9px', padding: '8px 11px', fontSize: '13px', outline: 'none' }} />
              <datalist id="caisse-clients">
                {nomsClients.map(n => <option key={n} value={n} />)}
              </datalist>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '5px' }}>Mode de paiement</label>
              <select value={mode} onChange={e => patchCaisse({ mode: e.target.value })}
                style={{ width: '100%', border: formErrors.mode ? '1.5px solid #f87171' : '1.5px solid #e2e8f0', borderRadius: '9px', padding: '8px 11px', fontSize: '13px', outline: 'none' }}>
                {['Espèces', 'Mobile Money', 'Carte bancaire', 'Virement', 'À crédit'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '4px' }}>
            <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '2fr 1.5fr 0.6fr 1fr 28px' }}>
              {['Médicament', 'Conditionnement', 'Qté', 'Prix unit.', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</div>
              ))}
            </div>
            {lignes.map((l, i) => {
              const medObj = meds.find(m => m.nom === l.med)
              const tarifs = getTarifs(medObj)
              const rowErr = ligneError(i, 'med') || ligneError(i, 'qte') || ligneError(i, 'pu')
              return (
                <div key={i}>
                <div className="grid gap-2 mb-1 items-center" style={{ gridTemplateColumns: '2fr 1.5fr 0.6fr 1fr 28px' }}>
                  <select value={l.med} onChange={e => {
                    const nom = e.target.value
                    const m2 = meds.find(m => m.nom === nom)
                    const t2 = getTarifs(m2)
                    updL(i, {
                      med: nom,
                      pu: t2[0]?.prix ?? m2?.prixVente ?? 0,
                      cond: t2[0]?.conditionnement || 'Unité',
                    })
                  }} style={{ border: ligneError(i, 'med') ? '1.5px solid #f87171' : '1.5px solid #e2e8f0', borderRadius: '9px', padding: '8px', fontSize: '13px', outline: 'none' }}>
                    <option value="">— Choisir —</option>
                    {meds.filter(m => (m.stock || 0) > 0).map(m => (
                      <option key={m.id || m.nom} value={m.nom}>{m.nom} (stk:{m.stock})</option>
                    ))}
                  </select>
                  <select value={l.cond} onChange={e => {
                    const t = tarifs.find(x => x.conditionnement === e.target.value)
                    updL(i, { cond: e.target.value, ...(t ? { pu: t.prix } : {}) })
                  }} style={{ border: '1.5px solid #e2e8f0', borderRadius: '9px', padding: '8px', fontSize: '13px', outline: 'none' }} disabled={!l.med}>
                    {tarifs.map(t => <option key={t.conditionnement} value={t.conditionnement}>{t.conditionnement}</option>)}
                  </select>
                  <input type="number" min="1" value={l.qte} onChange={e => updL(i, { qte: parseInt(e.target.value, 10) || 1 })}
                    style={{ border: ligneError(i, 'qte') ? '1.5px solid #f87171' : '1.5px solid #e2e8f0', borderRadius: '9px', padding: '8px', fontSize: '13px', outline: 'none', textAlign: 'center' }} />
                  <input type="number" value={l.pu} onChange={e => updL(i, { pu: parseFloat(e.target.value) || 0 })}
                    style={{ border: ligneError(i, 'pu') ? '1.5px solid #f87171' : '1.5px solid #e2e8f0', borderRadius: '9px', padding: '8px', fontSize: '13px', outline: 'none' }} />
                  <button type="button" onClick={() => setLignes(prev => prev.filter((_, j) => j !== i))} disabled={lignes.length === 1}
                    style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
                {rowErr && <p style={{ fontSize: '11px', color: '#dc2626', marginBottom: '8px', fontWeight: 600 }}>{rowErr}</p>}
                </div>
              )
            })}
            <button type="button" onClick={() => setLignes(prev => [...prev, { med: '', cond: 'Unité', qte: 1, pu: 0 }])}
              style={{ fontSize: '13px', color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
              + Ajouter une ligne
            </button>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '5px' }}>Note</label>
            <input value={note} onChange={e => patchCaisse({ note: e.target.value })} placeholder="Note optionnelle…"
              style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '9px', padding: '8px 11px', fontSize: '13px', outline: 'none' }} />
          </div>
        </div>

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
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: saving ? '#94a3b8' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'white', fontWeight: 900, fontSize: '16px', cursor: saving ? 'wait' : 'pointer', boxShadow: '0 4px 20px rgba(34,197,94,0.4)', letterSpacing: '.02em' }}>
            {saving ? 'Enregistrement…' : '✓ Encaisser'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Caisse
