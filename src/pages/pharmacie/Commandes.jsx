import { Package, Trash2, Printer, MessageCircle, Pencil } from 'lucide-react'
import { useState, useEffect } from 'react'
import { fmtF } from '../../lib/utils'
import { dbInsert, dbUpdate, dbDelete, dbAdjustStock, newId } from '../../lib/db'
import { validateCommandeForm } from '../../lib/validation'
import { Btn, Badge, Field, FormPanel, FormSection, FilterBar, FilterSelect, FilterBtns, FilterPeriode, EmptyState } from '../../components/ui'

const today = () => new Date().toISOString().split('T')[0]
const SC = { Reçu: 'green', 'En transit': 'blue', 'En attente': 'yellow', Annulé: 'red' }

const EMPTY_FORM = { date: today(), fournisseur: '', echeance: '', lignes: [{ produit: '', qte: '', pu: '' }] }

function Commandes({ meds = [], setMeds, fournisseurs = [], achatsHist = [], setAchatsHist, sb }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [exp, setExp]           = useState(null)
  const [fCmdStatut, setFCmdStatut] = useState('')
  const [fCmdFourn, setFCmdFourn]   = useState('')
  const [fCmdPeriode, setFCmdPeriode] = useState('')
  const [searchCmd, setSearchCmd]   = useState('')

  // ── Pré-remplissage depuis les alertes stock du Dashboard ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lb_cmd_prefill')
      if (!raw) return
      localStorage.removeItem('lb_cmd_prefill')
      const p = JSON.parse(raw)
      if (!p?.produit) return
      setForm({
        date: today(), fournisseur: p.fournisseur || '', echeance: '',
        lignes: [{ produit: p.produit, qte: String(p.qte || 1), pu: String(p.pu ?? '') }],
      })
      setShowForm(true)
    } catch (e) {}
  }, [])

  const fournisseurOptions = [
    ...new Set([
      ...(fournisseurs || []).filter(f => f.actif !== false).map(f => f.nom).filter(Boolean),
      ...(achatsHist || []).map(c => c.fournisseur).filter(Boolean),
    ]),
  ].sort()

  const updLigne = (i, updates) => setForm(prev => {
    const nl = [...prev.lignes]; nl[i] = { ...nl[i], ...updates }; return { ...prev, lignes: nl }
  })

  const montantTotal = form.lignes.reduce((s, l) => s + (parseInt(l.qte) || 0) * (parseInt(l.pu) || 0), 0)

  const genNum = () => {
    const yr = new Date().getFullYear()
    const n  = (achatsHist || []).filter(c => (c.num || '').includes(String(yr))).length + 1
    return `CMD-${yr}-${String(n).padStart(3, '0')}`
  }

  const addCommande = async () => {
    const check = validateCommandeForm(form)
    if (!check.ok) return alert(check.messages.join('\n'))
    const d = check.data
    setSaving(true)
    try {
      if (editingId) {
        // ── Modification d'une commande existante (non reçue) ──
        const updates = {
          date: d.date, fournisseur: d.fournisseur, lignes: d.lignes,
          total: d.lignes.reduce((s, l) => s + l.qte * l.pu, 0),
          echeance: d.echeance,
        }
        await dbUpdate(sb, 'commandes', editingId, updates)
        setAchatsHist((achatsHist || []).map(c => c.id === editingId ? { ...c, ...updates } : c))
      } else {
        const row = {
          id: newId(), num: genNum(), date: d.date,
          fournisseur: d.fournisseur,
          lignes: d.lignes,
          total: d.lignes.reduce((s, l) => s + l.qte * l.pu, 0),
          statut: 'En attente',
          date_reception: null,
          echeance: d.echeance,
        }
        const saved = await dbInsert(sb, 'commandes', row)
        setAchatsHist([saved, ...(achatsHist || [])])
      }
      setForm(EMPTY_FORM)
      setEditingId(null)
      setShowForm(false)
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  const changeStatut = async (id, statut) => {
    const cmd = (achatsHist || []).find(c => c.id === id)
    const updates = { statut }
    if (statut === 'Reçu') updates.date_reception = today()
    try {
      await dbUpdate(sb, 'commandes', id, updates)
      setAchatsHist((achatsHist || []).map(c => c.id === id ? { ...c, ...updates } : c))

      // ── Réception : entrée en stock + création des nouveaux produits ──
      if (statut === 'Reçu' && cmd && cmd.statut !== 'Reçu' && setMeds) {
        let updatedMeds = [...meds]
        const nouveaux = []
        for (const l of (cmd.lignes || [])) {
          const nom = String((l.produit === '__autre__' ? l.nomLibre : l.produit) || '').trim()
          const qte = parseFloat(l.qte) || 0
          const pu  = parseFloat(l.pu) || 0
          if (!nom || qte <= 0) continue
          const m = updatedMeds.find(x => String(x.nom || '').toLowerCase() === nom.toLowerCase())
          if (m) {
            try {
              await dbAdjustStock(sb, m.id, qte, 0)
              if (pu > 0) await dbUpdate(sb, 'medicaments', m.id, { prix_achat: pu })
              const patch = { stock: (m.stock || 0) + qte, ...(pu > 0 ? { prix_achat: pu } : {}) }
              updatedMeds = updatedMeds.map(x => x.id === m.id ? { ...x, ...patch, ...(pu > 0 ? { prixAchat: pu } : {}) } : x)
            } catch (e) { console.warn('[reception stock]', e?.message || e) }
          } else {
            nouveaux.push({ nom, qte, pu })
          }
        }
        for (const n of nouveaux) {
          if (!confirm(`« ${n.nom} » n'existe pas au catalogue.\n\nCréer sa fiche dans Médicaments ?\n• Stock initial : ${n.qte}\n• Prix d'achat : ${fmtF(n.pu)}\n(complétez ensuite prix de vente, catégorie, péremption…)`)) continue
          const row = {
            id: newId(), ref: `VET-${Date.now()}`, nom: n.nom, categorie: 'Autre', unite: 'flacons',
            stock: n.qte, seuil: 0, prix_achat: n.pu, prix_vente: 0,
            fournisseur: cmd.fournisseur || '', dose_mg_kg: null, lot: '', peremption: null,
            tarifs: [], prix_gros: 0, paliers_gros: [],
          }
          try {
            const saved = await dbInsert(sb, 'medicaments', row)
            updatedMeds = [...updatedMeds, { ...saved, prixAchat: n.pu, prixVente: 0, prixGros: 0, paliersGros: [] }]
          } catch (e) {
            alert(`Création de « ${n.nom} » impossible : ${e?.message || e}\nCréez sa fiche manuellement dans Médicaments.`)
          }
        }
        setMeds(updatedMeds)
        try { localStorage.setItem('lb_medicaments', JSON.stringify(updatedMeds)) } catch (e) {}
        if (nouveaux.length) alert('Réception enregistrée ✓ Pensez à compléter les nouvelles fiches (prix de vente, catégorie, unité, péremption) dans Médicaments.')
      }
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    }
  }

  const deleteCommande = async (id) => {
    if (!confirm('Supprimer cette commande ?')) return
    try {
      await dbDelete(sb, 'commandes', id)
      setAchatsHist((achatsHist || []).filter(c => c.id !== id))
    } catch (e) {
      alert('Erreur suppression : ' + (e?.message || e))
    }
  }

  // ── Impression du bon de commande ──
  const nomLigne = l => l.produit === '__autre__' ? (l.nomLibre || '') : (l.produit || '')
  const imprimerBon = (c) => {
    const w = window.open('', '_blank', 'width=700,height=800')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bon de commande ${c.num}</title>
<style>body{font-family:sans-serif;padding:30px;max-width:640px;margin:0 auto;color:#1e293b}
table{width:100%;border-collapse:collapse;margin:16px 0}
th{background:#eff6ff;padding:8px;text-align:left;font-size:12px;color:#1d4ed8;border-bottom:2px solid #bfdbfe}
td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:13px}
@media print{button{display:none}}</style></head><body>
<div style="display:flex;justify-content:space-between;border-bottom:3px solid #1d4ed8;padding-bottom:16px;margin-bottom:20px">
  <div style="display:flex;align-items:center;gap:10px"><img src="/logo.png" alt="La Barakat" style="width:56px;height:56px;border-radius:50%;object-fit:cover"><div><h1 style="margin:0;color:#14532d">LA BARAKAT</h1><p style="margin:4px 0;color:#666;font-size:12px">Pharmacie & Clinique Vétérinaire · Lomé, Togo</p></div></div>
  <div style="text-align:right"><div style="font-size:20px;font-weight:900;color:#1d4ed8">BON DE COMMANDE</div><div style="color:#666;font-size:12px">${c.num} · ${c.date}</div></div>
</div>
<div style="margin-bottom:16px"><b>Fournisseur :</b> ${c.fournisseur}${c.echeance ? `<br><b>Échéance de paiement :</b> ${c.echeance}` : ''}</div>
<table><thead><tr><th>Produit</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr></thead><tbody>
${(c.lignes || []).map(l => `<tr><td>${nomLigne(l)}</td><td>${l.qte}</td><td>${fmtF(l.pu)}</td><td>${fmtF((parseFloat(l.qte)||0)*(parseFloat(l.pu)||0))}</td></tr>`).join('')}
</tbody></table>
<div style="display:flex;justify-content:flex-end"><div style="min-width:220px;display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #1d4ed8;font-weight:900;font-size:16px;color:#1d4ed8"><span>TOTAL</span><span>${fmtF(c.total || 0)}</span></div></div>
<div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
  <div style="text-align:center"><div style="border-bottom:1px solid #334155;height:40px;margin-bottom:4px"></div><div style="font-size:12px;color:#666">Signature La Barakat</div></div>
  <div style="text-align:center"><div style="border-bottom:1px solid #334155;height:40px;margin-bottom:4px"></div><div style="font-size:12px;color:#666">Signature fournisseur</div></div>
</div>
<br><button onclick="window.print()" style="width:100%;padding:10px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">Imprimer le bon de commande</button>
</body></html>`)
    w.document.close()
  }

  // ── Envoi WhatsApp au fournisseur ──
  const waNumber = (tel) => {
    const digits = String(tel || '').replace(/[^\d]/g, '')
    if (!digits) return null
    return digits.length === 8 ? `228${digits}` : digits
  }
  const telFournisseur = (nom) => (fournisseurs || []).find(f => f.nom === nom)?.tel || ''
  const envoyerWA = (c) => {
    const num = waNumber(telFournisseur(c.fournisseur))
    const lignesTxt = (c.lignes || []).map(l => `• ${nomLigne(l)} × ${l.qte}`).join('\n')
    const msg = encodeURIComponent(`Bonjour,\n\nCommande ${c.num} — La Barakat (Pharmacie & Clinique Vétérinaire, Lomé) :\n\n${lignesTxt}\n\nTotal estimé : ${fmtF(c.total || 0)}\nDate souhaitée de livraison : dès que possible.\n\nMerci de confirmer la disponibilité et le délai. 🙏`)
    window.open(num ? `https://wa.me/${num}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank')
  }

  const now2 = new Date()
  const periodeDebut = {
    jour: today(),
    semaine: new Date(now2.getTime() - now2.getDay() * 86400000).toISOString().split('T')[0],
    mois: new Date(now2.getFullYear(), now2.getMonth(), 1).toISOString().split('T')[0],
    annee: new Date(now2.getFullYear(), 0, 1).toISOString().split('T')[0],
  }

  const cmdFiltered = (achatsHist || []).filter(c => {
    if (fCmdStatut && c.statut !== fCmdStatut) return false
    if (fCmdFourn  && c.fournisseur !== fCmdFourn) return false
    if (fCmdPeriode && periodeDebut[fCmdPeriode] && c.date < periodeDebut[fCmdPeriode]) return false
    if (searchCmd) {
      const q = searchCmd.toLowerCase()
      if (!c.fournisseur?.toLowerCase().includes(q) && !(c.num || '').toLowerCase().includes(q) && !JSON.stringify(c.lignes || []).toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className="app-page space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { l: 'En attente', f: 'En attente', mod: 'stat-tile--yellow' },
          { l: 'En transit',  f: 'En transit',  mod: 'stat-tile--blue'   },
          { l: 'Reçues',      f: 'Reçu',        mod: 'stat-tile--green'  },
        ].map((s, i) => (
          <div key={i} className={`stat-tile ${s.mod}`}>
            <div className="stat-tile__label">{s.l}</div>
            <div className="stat-tile__value">{(achatsHist || []).filter(c => c.statut === s.f).length}</div>
          </div>
        ))}
      </div>

      <div className="app-card">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Package size={20} color="#7c3aed" strokeWidth={2.3} /> Commandes fournisseurs</h2>
            <p className="text-xs text-slate-400 mt-0.5">{(achatsHist || []).length} commande(s)</p>
          </div>
          <Btn onClick={() => { if (showForm) { setEditingId(null); setForm(EMPTY_FORM) } setShowForm(!showForm) }}>{showForm ? '✕ Annuler' : '+ Nouvelle commande'}</Btn>
        </div>

        {showForm && (
          <FormPanel icon="📦" title={editingId ? `Modifier la commande ${(achatsHist||[]).find(c=>c.id===editingId)?.num || ''}` : 'Nouvelle commande fournisseur'} subtitle={editingId ? 'Corrigez les produits, quantités ou prix avant réception' : 'Passez une commande auprès d\'un fournisseur'} color="blue" onClose={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM) }}>
            <FormSection label="Informations" icon="📋" color="blue" noTopMargin>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="Date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} type="date" />
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6, userSelect: 'none' }}>Fournisseur *</label>
                  <input list="cmd-fournisseurs" value={form.fournisseur}
                    onChange={e => setForm({ ...form, fournisseur: e.target.value })}
                    placeholder="Nom du fournisseur…"
                    style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: '13.5px', width: '100%', outline: 'none', background: 'var(--app-surface)', fontFamily: "'Outfit',sans-serif", transition: 'border-color .18s, box-shadow .18s', lineHeight: '1.45', color: 'var(--app-text)' }}
                    onFocus={e => { e.target.style.borderColor='#0d9488'; e.target.style.boxShadow='0 0 0 3.5px rgba(13,148,136,0.14)' }}
                    onBlur={e  => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none' }} />
                  <datalist id="cmd-fournisseurs">
                    {fournisseurOptions.map(f => <option key={f} value={f} />)}
                  </datalist>
                </div>
                <div>
                  <Field label="Échéance paiement" value={form.echeance} onChange={e => setForm({ ...form, echeance: e.target.value })} type="date" />
                  <p style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>Optionnel — alerte Dashboard avant le retard</p>
                </div>
              </div>
            </FormSection>

            <FormSection label="Produits commandés" icon="💊" color="blue"
              action={
                <button onClick={() => setForm({ ...form, lignes: [...form.lignes, { produit: '', qte: '', pu: '' }] })}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold transition-all">
                  + Ajouter
                </button>
              }>
              <div className="grid gap-1.5 mb-1.5" style={{ gridTemplateColumns: '2fr 1fr 1fr 28px' }}>
                {['Produit', 'Qté', 'Prix unit. (F)', ''].map((h, i) => (
                  <div key={i} className="text-xs font-bold text-slate-400 px-1">{h}</div>
                ))}
              </div>
              {form.lignes.map((l, i) => {
                const q = String(l.produit || '').toLowerCase()
                const suggestions = (meds || []).filter(m => m.nom.toLowerCase().includes(q))
                return (
                <div key={i} className="grid gap-2 mb-1.5 items-center" style={{ gridTemplateColumns: '2fr 1fr 1fr 28px' }}>
                  <div style={{ position: 'relative' }}>
                    <input value={l.produit} placeholder="Choisir ou saisir un produit…"
                      onChange={e => {
                        const med = meds.find(m => m.nom === e.target.value)
                        updLigne(i, { produit: e.target.value, showSugg: true, ...(med ? { pu: med.prixAchat ?? med.prix_achat ?? '' } : {}) })
                      }}
                      onFocus={() => updLigne(i, { showSugg: true })}
                      onBlur={() => setTimeout(() => updLigne(i, { showSugg: false }), 160)}
                      style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: '13.5px', outline: 'none', background: 'var(--app-surface)', fontFamily: "'Outfit',sans-serif", transition: 'border-color .18s, box-shadow .18s', color: 'var(--app-text)', width: '100%' }} />
                    {l.showSugg && suggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto' }}>
                        {suggestions.slice(0, 20).map(m => (
                          <button key={m.id || m.nom} type="button"
                            onMouseDown={() => updLigne(i, { produit: m.nom, pu: m.prixAchat ?? m.prix_achat ?? '', showSugg: false })}
                            style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '8px 12px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            <span style={{ fontWeight: 600 }}>{m.nom}</span>
                            <span style={{ color: '#64748b', fontSize: 11 }}>{m.unite} · stk:{m.stock}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="number" placeholder="0" value={l.qte} onChange={e => updLigne(i, { qte: e.target.value })}
                    style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: '13.5px', outline: 'none', background: 'var(--app-surface)', fontFamily: "'Outfit',sans-serif", transition: 'border-color .18s, box-shadow .18s', color: 'var(--app-text)', width: '100%', textAlign: 'center' }}
                    onFocus={e => { e.target.style.borderColor='#0d9488'; e.target.style.boxShadow='0 0 0 3.5px rgba(13,148,136,0.14)' }}
                    onBlur={e  => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none' }} />
                  <input type="number" placeholder="0" value={l.pu} onChange={e => updLigne(i, { pu: e.target.value })}
                    style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: '13.5px', outline: 'none', background: 'var(--app-surface)', fontFamily: "'Outfit',sans-serif", transition: 'border-color .18s, box-shadow .18s', color: 'var(--app-text)', width: '100%' }}
                    onFocus={e => { e.target.style.borderColor='#0d9488'; e.target.style.boxShadow='0 0 0 3.5px rgba(13,148,136,0.14)' }}
                    onBlur={e  => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none' }} />
                  {form.lignes.length > 1
                    ? <button onClick={() => setForm({ ...form, lignes: form.lignes.filter((_, j) => j !== i) })}
                        className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg text-xs transition-all">✕</button>
                    : <div />}
                </div>
                )
              })}
              <p style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>Cliquez pour choisir dans le catalogue, ou tapez librement le nom d'un <b>nouveau produit</b> — pensez à créer sa fiche dans Médicaments à la réception pour gérer son stock.</p>
            </FormSection>

            <div className="flex items-center justify-between mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Total commande</p>
                <span className="text-2xl font-black text-blue-600 font-mono">{fmtF(montantTotal)}</span>
              </div>
              <Btn color="blue" onClick={addCommande} disabled={saving}>{saving ? 'Enregistrement…' : editingId ? '✓ Enregistrer les modifications' : '✓ Passer la commande'}</Btn>
            </div>
          </FormPanel>
        )}

        <FilterBar search={searchCmd} onSearch={setSearchCmd} placeholder="N° commande, fournisseur…"
          activeCount={[fCmdStatut, fCmdFourn, fCmdPeriode, searchCmd].filter(Boolean).length}
          onReset={() => { setSearchCmd(''); setFCmdStatut(''); setFCmdFourn(''); setFCmdPeriode('') }}>
          <FilterBtns options={[{ v:'En attente', l:'En attente' }, { v:'En transit', l:'Transit' }, { v:'Reçu', l:'🟢 Reçu' }, { v:'Annulé', l:'🔴 Annulé' }]}
            value={fCmdStatut} onChange={setFCmdStatut} colorFn={v => SC[v] || 'slate'} />
          <FilterSelect label="Fournisseur" value={fCmdFourn} onChange={setFCmdFourn} options={fournisseurOptions.map(f => ({ v: f, l: f }))} />
          <FilterPeriode value={fCmdPeriode} onChange={setFCmdPeriode} />
          <span className="text-xs text-slate-400">{cmdFiltered.length}/{(achatsHist || []).length}</span>
        </FilterBar>

        <div className="divide-y">
          {!cmdFiltered.length && <EmptyState icon="📦" title="Aucune commande enregistrée" subtitle="Créez une commande fournisseur pour réapprovisionner votre stock." />}
          {cmdFiltered.map(c => (
            <div key={c.id}>
              <div className="p-5 hover:bg-slate-50 cursor-pointer" onClick={() => setExp(exp === c.id ? null : c.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-400">{c.num}</span>
                      <Badge color={SC[c.statut] || 'slate'}>{c.statut}</Badge>
                    </div>
                    <h3 className="font-bold">{c.fournisseur}</h3>
                    <p className="text-sm text-slate-500 mt-0.5 truncate">
                      {(c.lignes || []).map(l => `${l.produit === '__autre__' ? l.nomLibre : l.produit} ×${l.qte}`).join(', ')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {c.date}{c.date_reception ? ` · Reçu le ${c.date_reception}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-black text-blue-600 font-mono mb-2">{fmtF(c.total || c.montant || 0)}</div>
                    {c.statut !== 'Reçu' && c.statut !== 'Annulé' && (
                      <div className="flex gap-1 justify-end flex-wrap">
                        {c.statut === 'En attente' && (
                          <Btn onClick={e => { e.stopPropagation(); changeStatut(c.id, 'En transit') }} color="blue" sm>Transit</Btn>
                        )}
                        <Btn onClick={e => { e.stopPropagation(); changeStatut(c.id, 'Reçu') }} color="green" sm>✓ Reçu</Btn>
                        <Btn onClick={e => { e.stopPropagation(); changeStatut(c.id, 'Annulé') }} color="red" sm>✕</Btn>
                      </div>
                    )}
                    {c.statut !== 'Reçu' && c.statut !== 'Annulé' && (
                      <button onClick={e => { e.stopPropagation();
                          setForm({
                            date: c.date || today(), fournisseur: c.fournisseur || '', echeance: c.echeance || '',
                            lignes: (c.lignes || []).map(l => ({ produit: l.produit === '__autre__' ? (l.nomLibre || '') : (l.produit || ''), qte: String(l.qte ?? ''), pu: String(l.pu ?? '') })),
                          })
                          setEditingId(c.id); setShowForm(true)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        title="Modifier la commande"
                        className="text-xs text-amber-500 hover:text-amber-700 mt-1 no-print mr-2"><Pencil size={13} strokeWidth={2.4} /></button>
                    )}
                    <button onClick={e => { e.stopPropagation(); imprimerBon(c) }} title="Imprimer le bon de commande"
                      className="text-xs text-slate-500 hover:text-slate-700 mt-1 no-print mr-2"><Printer size={13} strokeWidth={2.4} /></button>
                    <button onClick={e => { e.stopPropagation(); envoyerWA(c) }} title="Envoyer au fournisseur par WhatsApp"
                      className="text-xs text-green-500 hover:text-green-700 mt-1 no-print mr-2"><MessageCircle size={13} strokeWidth={2.4} /></button>
                    <button onClick={e => { e.stopPropagation(); deleteCommande(c.id) }}
                      className="text-xs text-red-400 hover:text-red-600 mt-1 no-print"><Trash2 size={13} strokeWidth={2.4} /></button>
                  </div>
                </div>
              </div>

              {exp === c.id && (
                <div className="px-5 pb-4 bg-slate-50 border-t">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2 mt-3">Détail des produits commandés</p>
                  <div className="space-y-1.5">
                    {(c.lignes || []).map((l, i) => (
                      <div key={i} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-slate-200">
                        <span className="font-medium text-sm">{l.produit === '__autre__' ? l.nomLibre : l.produit}</span>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span>Qté : <strong>{l.qte}</strong></span>
                          <span>PU : <strong>{fmtF(l.pu)}</strong></span>
                          <span className="font-black text-blue-600">{fmtF((parseInt(l.qte) || 0) * (parseInt(l.pu) || 0))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Commandes
