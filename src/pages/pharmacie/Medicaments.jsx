import { useState, useMemo, useEffect } from 'react'
import {
  Btn, Badge, Field, DupWarning, ValidationBanner,
  FilterBar, FilterSelect, FilterBtns,
} from '../../components/ui'
import { dbInsert, dbUpdate, dbDelete, dbFetch, getCache, setCache, isCacheFresh, markSynced, newId } from '../../lib/db'
import {
  validateMedicamentForm,
  medicamentFormToRow,
  medicamentFormToUpdates,
} from '../../lib/validation'

const FOURNISSEUR_PLACEHOLDER = '— Choisir un fournisseur —'

const FOURNISSEURS_FALLBACK = ['MediVet SARL', 'Afrique Pharma', 'AgroVet Togo']

function Medicaments({ meds, setMeds, user, sb, logAction }) {
  const getDefaultForm = () => ({
    nom: '', categorie: 'Antibiotique', stock: '', seuil: '',
    unite: 'comprimés', prixAchat: '', prixVente: '',
    fournisseur: '', doseMgKg: '', lot: '',
    peremption: new Date().toISOString().split('T')[0],
  })

  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState('add')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]         = useState(getDefaultForm())
  const [dups, setDups]         = useState([])
  const [pending, setPending]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [validationMessages, setValidationMessages] = useState([])
  const [fournisseurOptions, setFournisseurOptions] = useState(FOURNISSEURS_FALLBACK)

  useEffect(() => {
    let cancelled = false
    const CACHE_KEY = 'fournisseurs_options'
    const STALE_MS = 5 * 60 * 1000

    const mergeLists = (fromDb, fromMeds) =>
      [...new Set([...fromDb, ...fromMeds, ...FOURNISSEURS_FALLBACK])].sort((a, b) =>
        a.localeCompare(b, 'fr', { sensitivity: 'base' }),
      )

    const loadFournisseurs = async () => {
      const fromMeds = meds.map((m) => m.fournisseur).filter(Boolean)
      const cached = getCache(CACHE_KEY)
      if (cached?.length && isCacheFresh(CACHE_KEY, STALE_MS)) {
        setFournisseurOptions(mergeLists(cached, fromMeds))
        return
      }

      let fromDb = []
      try {
        const rows = await dbFetch(sb, 'fournisseurs', { staleMs: STALE_MS })
        fromDb = (rows || [])
          .filter((f) => f.actif !== false)
          .map((f) => f.nom)
          .filter(Boolean)
      } catch (e) {
        console.warn('[Medicaments] chargement fournisseurs:', e)
      }
      const merged = mergeLists(fromDb, fromMeds)
      setCache(CACHE_KEY, fromDb)
      markSynced(CACHE_KEY)
      if (!cancelled) setFournisseurOptions(merged)
    }
    loadFournisseurs()
    return () => { cancelled = true }
  }, [meds, sb])

  const fournisseurSelectOptions = useMemo(
    () => [FOURNISSEUR_PLACEHOLDER, ...fournisseurOptions],
    [fournisseurOptions],
  )

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

  const findDups = (nom, excludeId) => {
    const q = String(nom || '').toLowerCase().trim()
    return meds.filter(m => m.id !== excludeId && String(m.nom || '').toLowerCase().trim() === q)
  }

  const fmtF = n => new Intl.NumberFormat('fr-FR').format(n || 0) + ' F'
  const now  = new Date()
  const jPerem = m => m.peremption ? Math.round((new Date(m.peremption) - now) / 86400000) : null
  const peremStatus = m => {
    const j = jPerem(m)
    if (j === null) return null
    if (j < 0)   return 'expired'
    if (j <= 7)  return 'critical'
    if (j <= 30) return 'warning'
    return 'ok'
  }

  // ── Sauvegarde avec Supabase ──────────────────────────────
  const commitSave = async () => {
    const checked = validateMedicamentForm(form)
    if (!checked.ok) {
      setFormErrors(checked.fieldErrors)
      setValidationMessages(checked.messages)
      return
    }
    const validated = checked.data

    setSaving(true)
    try {
      if (formMode === 'add') {
        const row = medicamentFormToRow(validated, {
          id: newId(),
          ref: `VET-${Date.now()}`,
        })

        // Insérer dans Supabase
        const saved = await dbInsert(sb, 'medicaments', row)

        // Normaliser pour le state React (camelCase)
        const forState = {
          ...saved,
          prixAchat: saved.prix_achat ?? row.prix_achat,
          prixVente: saved.prix_vente ?? row.prix_vente,
          doseMgKg:  saved.dose_mg_kg ?? row.dose_mg_kg,
        }

        setMeds([...meds, forState])
        if (logAction && sb) logAction(sb, user, 'medicament_added', `${row.nom} (${row.ref})`)

      } else {
        // ── Modification ────────────────────────────────────
        const before = meds.find(m => m.id === editingId)
        if (!before) return

        const updates = medicamentFormToUpdates(validated)

        await dbUpdate(sb, 'medicaments', editingId, updates)

        // Mettre à jour le state en camelCase
        const updated = {
          ...before,
          ...updates,
          prixAchat: updates.prix_achat,
          prixVente: updates.prix_vente,
          doseMgKg:  updates.dose_mg_kg,
        }

        setMeds(meds.map(m => m.id === editingId ? updated : m))

        if (logAction && sb) {
          logAction(sb, user, 'medicament_modified',
            `${before.nom} (${before.ref}) : stock ${before.stock}→${updates.stock}, prix ${before.prixVente}→${updates.prix_vente}`)
        }
      }

      // Reset formulaire
      setForm(getDefaultForm())
      setShowForm(false)
      setEditingId(null)
      setFormMode('add')
      setDups([])
      setPending(false)
      setFormErrors({})
      setValidationMessages([])

    } catch (e) {
      console.error('[Medicaments] Erreur sauvegarde:', e)
      alert('Erreur lors de la sauvegarde. Vérifiez la console.')
    } finally {
      setSaving(false)
    }
  }

  const handlePrimarySave = () => {
    const checked = validateMedicamentForm(form)
    if (!checked.ok) {
      setFormErrors(checked.fieldErrors)
      setValidationMessages(checked.messages)
      return
    }
    const excludeId = formMode === 'edit' ? editingId : null
    const d = findDups(form.nom, excludeId)
    if (d.length) { setDups(d); setPending(true); return }
    commitSave()
  }

  const startAdd = () => {
    setFormMode('add'); setEditingId(null)
    setForm(getDefaultForm()); setDups([])
    setPending(false); setShowForm(true)
  }

  const startEdit = m => {
    setFormMode('edit'); setEditingId(m.id)
    setDups([]); setPending(false)
    setForm({
      nom:         m.nom         || '',
      categorie:   m.categorie   || 'Antibiotique',
      stock:       String(m.stock  ?? ''),
      seuil:       String(m.seuil  ?? ''),
      unite:       m.unite       || 'comprimés',
      prixAchat:   String(m.prixAchat ?? m.prix_achat ?? ''),
      prixVente:   String(m.prixVente ?? m.prix_vente ?? ''),
      fournisseur: m.fournisseur || '',
      doseMgKg:    m.doseMgKg === null || m.doseMgKg === undefined ? '' : String(m.doseMgKg),
      lot:         m.lot         || '',
      peremption:  m.peremption  || getDefaultForm().peremption,
    })
    setShowForm(true)
  }

  const handleDelete = async (m) => {
    if (!confirm(`Supprimer ${m.nom} ?`)) return
    try {
      await dbDelete(sb, 'medicaments', m.id)
      setMeds(meds.filter((x) => x.id !== m.id))
      if (logAction && sb) logAction(sb, user, 'medicament_deleted', `${m.nom} (${m.ref})`)
    } catch (e) {
      console.error('[Medicaments] suppression:', e)
      alert(
        e?.message
          || 'Suppression impossible. Exécutez supabase/medicaments_policies.sql dans Supabase (droits DELETE).',
      )
    }
  }

  const handleCloseForm = () => {
    setShowForm(false); setPending(false); setDups([])
    setEditingId(null); setFormMode('add'); setForm(getDefaultForm())
    setFormErrors({}); setValidationMessages([])
  }

  const [fCat, setFCat]     = useState('')
  const [fStock, setFStock] = useState('')
  const [fPerem, setFPerem] = useState('')

  const categories = useMemo(() => [...new Set(meds.map(m => m.categorie))].filter(Boolean), [meds])

  const filtered = meds.filter(m => {
    const q = search.toLowerCase()
    if (q && !String(m.nom||'').toLowerCase().includes(q) &&
             !String(m.categorie||'').toLowerCase().includes(q) &&
             !String(m.ref||'').toLowerCase().includes(q)) return false
    if (fCat && m.categorie !== fCat) return false
    if (fStock === 'critique' && m.stock > m.seuil)  return false
    if (fStock === 'ok'       && m.stock <= m.seuil) return false
    if (fPerem === 'expire') { const j = jPerem(m); if (j === null || j >= 0) return false }
    if (fPerem === 'proche') { const j = jPerem(m); if (j === null || j < 0 || j > 30) return false }
    return true
  })

  const activeFilters = [fCat, fStock, fPerem].filter(Boolean).length
  const resetFilters  = () => { setSearch(''); setFCat(''); setFStock(''); setFPerem('') }

  return (
    <div className="app-page space-y-5">
      <div className="app-card">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">💊 Médicaments</h2>
            <p className="text-sm text-slate-500">
              {filtered.length}/{meds.length} produit(s) ·{' '}
              {meds.filter(m => m.stock <= m.seuil).length} critique(s) ·{' '}
              {meds.filter(m => { const j = jPerem(m); return j !== null && j < 0 }).length} expiré(s)
            </p>
          </div>
          <Btn onClick={showForm ? handleCloseForm : startAdd}>
            {showForm ? '✕ Annuler' : '+ Nouveau médicament'}
          </Btn>
        </div>

        {showForm && (
          <div className="p-5 bg-blue-50 border-b border-blue-200">
            {pending && <DupWarning dups={dups} entity="médicament" onOk={commitSave} onCancel={handleCloseForm} />}
            <ValidationBanner messages={validationMessages} onDismiss={() => setValidationMessages([])} />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Field label="Nom *" value={form.nom} onChange={e => patchForm({ nom: e.target.value })} error={formErrors.nom} placeholder="Nom du médicament" className="md:col-span-2" />
              <Field label="Catégorie" value={form.categorie} onChange={e => patchForm({ categorie: e.target.value })} error={formErrors.categorie}
                options={['Antibiotique','Antiparasitaire','Vaccin','Anti-inflammatoire','Vitamines','Anesthésique','Autre']} />
              <Field label="Dose mg/kg" value={form.doseMgKg} onChange={e => patchForm({ doseMgKg: e.target.value })} error={formErrors.doseMgKg} type="number" placeholder="ex: 10" />
              <Field label="Unité" value={form.unite} onChange={e => patchForm({ unite: e.target.value })} error={formErrors.unite}
                options={['comprimés','flacons','doses','ampoules','sachets','litres','kg']} />
              <Field label="Stock" value={form.stock} onChange={e => patchForm({ stock: e.target.value })} error={formErrors.stock} type="number" placeholder="0" />
              <Field label="Seuil alerte" value={form.seuil} onChange={e => patchForm({ seuil: e.target.value })} error={formErrors.seuil} type="number" placeholder="0" />
              <Field label="Prix achat (F)" value={form.prixAchat} onChange={e => patchForm({ prixAchat: e.target.value })} error={formErrors.prixAchat} type="number" placeholder="0" />
              <Field label="Prix vente (F)" value={form.prixVente} onChange={e => patchForm({ prixVente: e.target.value })} error={formErrors.prixVente} type="number" placeholder="0" />
              <Field
                label="Fournisseur"
                value={form.fournisseur || FOURNISSEUR_PLACEHOLDER}
                onChange={(e) => {
                  const v = e.target.value
                  patchForm({ fournisseur: v === FOURNISSEUR_PLACEHOLDER ? '' : v })
                }}
                error={formErrors.fournisseur}
                options={fournisseurSelectOptions}
              />
              <Field label="N° de lot" value={form.lot} onChange={e => patchForm({ lot: e.target.value })} error={formErrors.lot} placeholder="ex: LOT-2024-01" />
              <Field label="Date péremption" value={form.peremption} onChange={e => patchForm({ peremption: e.target.value })} error={formErrors.peremption} type="date" />
            </div>
            <div className="mt-3 flex gap-2">
              <Btn onClick={handlePrimarySave} disabled={saving}>
                {saving ? '⏳ Enregistrement…' : formMode === 'edit' ? '✓ Enregistrer' : '✓ Ajouter'}
              </Btn>
            </div>
          </div>
        )}

        <FilterBar search={search} onSearch={setSearch} placeholder="🔍 Nom, catégorie, référence…" activeCount={activeFilters} onReset={resetFilters}>
          <FilterSelect label="📂 Catégorie" value={fCat} onChange={setFCat} options={categories.map(c => ({v:c,l:c}))} />
          <FilterBtns label="Stock" options={[{v:'critique',l:'🚨 Critique'},{v:'ok',l:'✓ OK'}]} value={fStock} onChange={setFStock} colorFn={v => v==='critique'?'red':'green'} />
          <FilterBtns label="Péremption" options={[{v:'expire',l:'☠️ Expiré'},{v:'proche',l:'⏰ < 30j'}]} value={fPerem} onChange={setFPerem} colorFn={()=>'amber'} />
        </FilterBar>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {['Réf.','Nom','Catégorie','Lot','Péremption','Stock','Prix vente','Fournisseur','Statut','Actions'].map(h => (
                  <th key={h} className="text-left p-3 text-xs font-bold text-slate-600 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const crit = m.stock <= m.seuil
                const ps   = peremStatus(m)
                const j    = jPerem(m)
                return (
                  <tr key={m.id} className={`border-t hover:bg-slate-50 ${crit||ps==='expired'||ps==='critical'?'bg-red-50/40':ps==='warning'?'bg-amber-50/40':''}`}>
                    <td className="p-3 font-mono text-xs text-slate-400">{m.ref}</td>
                    <td className="p-3 font-semibold">{m.nom}</td>
                    <td className="p-3"><Badge color="purple">{m.categorie}</Badge></td>
                    <td className="p-3 font-mono text-xs text-slate-500">{m.lot || '–'}</td>
                    <td className="p-3">
                      {m.peremption ? (
                        <div>
                          <div className={`text-xs font-bold ${ps==='expired'?'text-red-600':ps==='critical'?'text-red-500':ps==='warning'?'text-amber-500':'text-slate-500'}`}>{m.peremption}</div>
                          {ps==='expired'  && <Badge color="red">☠️ Expiré</Badge>}
                          {ps==='critical' && <Badge color="red">⏰ {j}j</Badge>}
                          {ps==='warning'  && <Badge color="amber">⚠️ {j}j</Badge>}
                          {ps==='ok'       && <Badge color="green">✓ {j}j</Badge>}
                        </div>
                      ) : <span className="text-slate-300 text-xs">–</span>}
                    </td>
                    <td className="p-3 font-bold font-mono">{m.stock} <span className="text-xs font-normal text-slate-400">{m.unite}</span></td>
                    <td className="p-3 font-bold font-mono text-blue-600">{fmtF(m.prixVente ?? m.prix_vente)}</td>
                    <td className="p-3 text-sm">{m.fournisseur}</td>
                    <td className="p-3">
                      {ps==='expired' ? <Badge color="red">☠️ Expiré</Badge>
                        : crit ? <Badge color="red">🚨 Critique</Badge>
                        : <Badge color="green">✓ OK</Badge>}
                    </td>
                    <td className="p-3 no-print flex gap-1">
                      <button type="button" onClick={() => startEdit(m)}
                        className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-semibold transition-all">
                        ✏️
                      </button>
                      <button type="button" onClick={() => handleDelete(m)}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg font-semibold transition-all">
                        🗑️
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Medicaments