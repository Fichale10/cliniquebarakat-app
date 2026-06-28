import { useState } from 'react'
import { fmtF } from '../../lib/utils'
import { dbInsert, dbUpdate, dbDelete, newId } from '../../lib/db'
import { Btn, Badge, Field, FilterBar, FilterSelect, FilterBtns, FilterPeriode } from '../../components/ui'

const today = () => new Date().toISOString().split('T')[0]
const SC = { Reçu: 'green', 'En transit': 'blue', 'En attente': 'yellow', Annulé: 'red' }

const EMPTY_FORM = { date: today(), fournisseur: '', lignes: [{ produit: '', qte: '', pu: '' }] }

function Commandes({ meds = [], fournisseurs = [], achatsHist = [], setAchatsHist, sb }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [exp, setExp]           = useState(null)
  const [fCmdStatut, setFCmdStatut] = useState('')
  const [fCmdFourn, setFCmdFourn]   = useState('')
  const [fCmdPeriode, setFCmdPeriode] = useState('')
  const [searchCmd, setSearchCmd]   = useState('')

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
    const lignesValides = form.lignes.filter(l => l.produit && parseInt(l.qte) > 0)
    if (!form.fournisseur) return alert('Fournisseur requis')
    if (!lignesValides.length) return alert('Ajoutez au moins un produit avec une quantité')
    setSaving(true)
    try {
      const row = {
        id: newId(), num: genNum(), date: form.date,
        fournisseur: form.fournisseur,
        lignes: lignesValides,
        total: montantTotal,
        statut: 'En attente',
        date_reception: null,
      }
      const saved = await dbInsert(sb, 'commandes', row)
      setAchatsHist([saved, ...(achatsHist || [])])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  const changeStatut = async (id, statut) => {
    const updates = { statut }
    if (statut === 'Reçu') updates.date_reception = today()
    try {
      await dbUpdate(sb, 'commandes', id, updates)
      setAchatsHist((achatsHist || []).map(c => c.id === id ? { ...c, ...updates } : c))
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
            <h2 className="text-xl font-bold flex items-center gap-2">📦 Commandes fournisseurs</h2>
            <p className="text-xs text-slate-400 mt-0.5">{(achatsHist || []).length} commande(s)</p>
          </div>
          <Btn onClick={() => setShowForm(!showForm)}>{showForm ? '✕ Annuler' : '+ Nouvelle commande'}</Btn>
        </div>

        {showForm && (
          <div className="p-5 bg-blue-50 border-b border-blue-200">
            <h3 className="font-bold text-blue-800 mb-3">Nouvelle commande fournisseur</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} type="date" />
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block uppercase">Fournisseur *</label>
                <input list="cmd-fournisseurs" value={form.fournisseur}
                  onChange={e => setForm({ ...form, fournisseur: e.target.value })}
                  placeholder="Nom du fournisseur…"
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 outline-none bg-white" />
                <datalist id="cmd-fournisseurs">
                  {fournisseurOptions.map(f => <option key={f} value={f} />)}
                </datalist>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Produits commandés</label>
                <button onClick={() => setForm({ ...form, lignes: [...form.lignes, { produit: '', qte: '', pu: '' }] })}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg font-bold">+ Ajouter</button>
              </div>
              <div className="grid gap-2 mb-1" style={{ gridTemplateColumns: '2fr 1fr 1fr 28px' }}>
                {['Produit', 'Qté', 'Prix unit. (F)', ''].map((h, i) => (
                  <div key={i} className="text-xs font-bold text-slate-400">{h}</div>
                ))}
              </div>
              {form.lignes.map((l, i) => (
                <div key={i} className="grid gap-2 mb-1.5 items-center" style={{ gridTemplateColumns: '2fr 1fr 1fr 28px' }}>
                  <select className="border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 outline-none bg-white"
                    value={l.produit} onChange={e => {
                      const med = meds.find(m => m.nom === e.target.value)
                      updLigne(i, { produit: e.target.value, pu: med ? med.prixAchat || '' : l.pu })
                    }}>
                    <option value="">— Choisir —</option>
                    {(meds || []).map(m => <option key={m.id} value={m.nom}>{m.nom} ({m.unite})</option>)}
                    <option value="__autre__">Autre produit…</option>
                  </select>
                  {l.produit === '__autre__'
                    ? <input placeholder="Nom du produit" value={l.nomLibre || ''} onChange={e => updLigne(i, { nomLibre: e.target.value })}
                        className="border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 outline-none" />
                    : null}
                  <input type="number" placeholder="0" value={l.qte} onChange={e => updLigne(i, { qte: e.target.value })}
                    className="border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 outline-none" />
                  <input type="number" placeholder="0" value={l.pu} onChange={e => updLigne(i, { pu: e.target.value })}
                    className="border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 outline-none" />
                  {form.lignes.length > 1
                    ? <button onClick={() => setForm({ ...form, lignes: form.lignes.filter((_, j) => j !== i) })}
                        className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg text-xs">✕</button>
                    : <div />}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-blue-200 mb-4">
              <span className="font-bold text-slate-700">Total commande :</span>
              <span className="text-xl font-black text-blue-600 font-mono">{fmtF(montantTotal)}</span>
            </div>
            <Btn onClick={addCommande} disabled={saving}>{saving ? '⏳ Enregistrement…' : '✓ Passer la commande'}</Btn>
          </div>
        )}

        <FilterBar search={searchCmd} onSearch={setSearchCmd} placeholder="🔍 N° commande, fournisseur…"
          activeCount={[fCmdStatut, fCmdFourn, fCmdPeriode, searchCmd].filter(Boolean).length}
          onReset={() => { setSearchCmd(''); setFCmdStatut(''); setFCmdFourn(''); setFCmdPeriode('') }}>
          <FilterBtns options={[{ v:'En attente', l:'🟡 En attente' }, { v:'En transit', l:'🔵 Transit' }, { v:'Reçu', l:'🟢 Reçu' }, { v:'Annulé', l:'🔴 Annulé' }]}
            value={fCmdStatut} onChange={setFCmdStatut} colorFn={v => SC[v] || 'slate'} />
          <FilterSelect label="🏭 Fournisseur" value={fCmdFourn} onChange={setFCmdFourn} options={fournisseurOptions.map(f => ({ v: f, l: f }))} />
          <FilterPeriode value={fCmdPeriode} onChange={setFCmdPeriode} />
          <span className="text-xs text-slate-400">{cmdFiltered.length}/{(achatsHist || []).length}</span>
        </FilterBar>

        <div className="divide-y">
          {!cmdFiltered.length && (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">📦</div>
              <p className="font-semibold">Aucune commande enregistrée</p>
            </div>
          )}
          {cmdFiltered.map(c => (
            <div key={c.id}>
              <div className="p-5 hover:bg-slate-50 cursor-pointer" onClick={() => setExp(exp === c.id ? null : c.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-400">{c.num}</span>
                      <Badge color={SC[c.statut] || 'slate'}>{c.statut}</Badge>
                    </div>
                    <h3 className="font-bold">🏭 {c.fournisseur}</h3>
                    <p className="text-sm text-slate-500 mt-0.5 truncate">
                      {(c.lignes || []).map(l => `${l.produit === '__autre__' ? l.nomLibre : l.produit} ×${l.qte}`).join(', ')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      📅 {c.date}{c.date_reception ? ` · Reçu le ${c.date_reception}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-black text-blue-600 font-mono mb-2">{fmtF(c.total || c.montant || 0)}</div>
                    {c.statut !== 'Reçu' && c.statut !== 'Annulé' && (
                      <div className="flex gap-1 justify-end flex-wrap">
                        {c.statut === 'En attente' && (
                          <Btn onClick={e => { e.stopPropagation(); changeStatut(c.id, 'En transit') }} color="blue" sm>🚚 Transit</Btn>
                        )}
                        <Btn onClick={e => { e.stopPropagation(); changeStatut(c.id, 'Reçu') }} color="green" sm>✓ Reçu</Btn>
                        <Btn onClick={e => { e.stopPropagation(); changeStatut(c.id, 'Annulé') }} color="red" sm>✕</Btn>
                      </div>
                    )}
                    <button onClick={e => { e.stopPropagation(); deleteCommande(c.id) }}
                      className="text-xs text-red-400 hover:text-red-600 mt-1 no-print">🗑</button>
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
