import { useState, useMemo } from 'react'
import {
  Btn,
  Badge,
  Field,
  DupWarning,
  FilterBar,
  FilterSelect,
  FilterBtns,
} from '../../components/ui'

function Medicaments({ meds, setMeds, user, sb, logAction }) {
  const getDefaultForm = () => ({
    nom: '',
    categorie: 'Antibiotique',
    stock: '',
    seuil: '',
    unite: 'comprimés',
    prixAchat: '',
    prixVente: '',
    fournisseur: '',
    doseMgKg: '',
    lot: '',
    peremption: new Date().toISOString().split('T')[0],
  })

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState('add') // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(getDefaultForm())
  const [dups, setDups] = useState([])
  const [pending, setPending] = useState(false)

  const findDups = (nom, excludeId) => {
    const q = String(nom || '').toLowerCase().trim()
    return meds.filter((m) => m.id !== excludeId && String(m.nom || '').toLowerCase().trim() === q)
  }

  const fmtF = (n) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' F'

  const now = new Date()
  const jPerem = (m) => (m.peremption ? Math.round((new Date(m.peremption) - now) / 86400000) : null)
  const peremStatus = (m) => {
    const j = jPerem(m)
    if (j === null) return null
    if (j < 0) return 'expired'
    if (j <= 7) return 'critical'
    if (j <= 30) return 'warning'
    return 'ok'
  }

  const commitSave = () => {
    if (formMode === 'add') {
      const ref = `VET-${Date.now()}`
      const newMed = {
        ...form,
        id: Date.now(),
        ref,
        stock: parseInt(form.stock, 10) || 0,
        seuil: parseInt(form.seuil, 10) || 0,
        prixAchat: parseInt(form.prixAchat, 10) || 0,
        prixVente: parseInt(form.prixVente, 10) || 0,
        doseMgKg: form.doseMgKg === '' ? null : parseFloat(form.doseMgKg) || null,
      }
      setMeds([...meds, newMed])
      if (logAction && sb) logAction(sb, user, 'medicament_added', `${newMed.nom} (${newMed.ref})`)
      setForm(getDefaultForm())
      setShowForm(false)
      setDups([])
      setPending(false)
      return
    }

    // edit
    const before = meds.find((m) => m.id === editingId)
    if (!before) return

    const updated = {
      ...before,
      nom: form.nom.trim(),
      categorie: form.categorie,
      unite: form.unite,
      stock: parseInt(form.stock, 10) || 0,
      seuil: parseInt(form.seuil, 10) || 0,
      prixAchat: parseInt(form.prixAchat, 10) || 0,
      prixVente: parseInt(form.prixVente, 10) || 0,
      fournisseur: form.fournisseur,
      doseMgKg: form.doseMgKg === '' ? null : parseFloat(form.doseMgKg) || null,
      lot: form.lot,
      peremption: form.peremption,
    }

    setMeds(meds.map((m) => (m.id === editingId ? updated : m)))
    if (logAction && sb) {
      const details = `${before.nom} (${before.ref}) : stock ${before.stock}→${updated.stock}, seuil ${before.seuil}→${updated.seuil}, prixVente ${before.prixVente}→${updated.prixVente}`
      logAction(sb, user, 'medicament_modified', details)
    }

    setForm(getDefaultForm())
    setShowForm(false)
    setEditingId(null)
    setFormMode('add')
    setDups([])
    setPending(false)
  }

  const handlePrimarySave = () => {
    const nom = String(form.nom || '').trim()
    if (!nom) return alert('Nom requis')

    const excludeId = formMode === 'edit' ? editingId : null
    const d = findDups(form.nom, excludeId)
    if (d.length) {
      setDups(d)
      setPending(true)
      return
    }
    commitSave()
  }

  const startAdd = () => {
    setFormMode('add')
    setEditingId(null)
    setForm(getDefaultForm())
    setDups([])
    setPending(false)
    setShowForm(true)
  }

  const startEdit = (m) => {
    setFormMode('edit')
    setEditingId(m.id)
    setDups([])
    setPending(false)
    setForm({
      nom: m.nom || '',
      categorie: m.categorie || 'Antibiotique',
      stock: String(m.stock ?? ''),
      seuil: String(m.seuil ?? ''),
      unite: m.unite || 'comprimés',
      prixAchat: String(m.prixAchat ?? ''),
      prixVente: String(m.prixVente ?? ''),
      fournisseur: m.fournisseur || '',
      doseMgKg: m.doseMgKg === null || m.doseMgKg === undefined ? '' : String(m.doseMgKg),
      lot: m.lot || '',
      peremption: m.peremption || getDefaultForm().peremption,
    })
    setShowForm(true)
  }

  const [fCat, setFCat] = useState('')
  const [fStock, setFStock] = useState('')
  const [fPerem, setFPerem] = useState('')

  const categories = useMemo(() => [...new Set(meds.map((m) => m.categorie))].filter(Boolean), [meds])

  const filtered = meds.filter((m) => {
    const q = search.toLowerCase()
    if (
      q &&
      !String(m.nom || '').toLowerCase().includes(q) &&
      !String(m.categorie || '').toLowerCase().includes(q) &&
      !String(m.ref || '').toLowerCase().includes(q)
    )
      return false
    if (fCat && m.categorie !== fCat) return false
    if (fStock === 'critique' && m.stock > m.seuil) return false
    if (fStock === 'ok' && m.stock <= m.seuil) return false
    if (fPerem === 'expire') {
      const j = jPerem(m)
      if (j === null || j >= 0) return false
    }
    if (fPerem === 'proche') {
      const j = jPerem(m)
      if (j === null || j < 0 || j > 30) return false
    }
    return true
  })

  const activeFilters = [fCat, fStock, fPerem].filter(Boolean).length
  const resetFilters = () => {
    setSearch('')
    setFCat('')
    setFStock('')
    setFPerem('')
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setPending(false)
    setDups([])
    setEditingId(null)
    setFormMode('add')
    setForm(getDefaultForm())
  }

  return (
    <div className="app-page space-y-5">
    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">💊 Médicaments</h2>
            <p className="text-sm text-slate-500">
              {filtered.length}/{meds.length} produit(s) · {meds.filter((m) => m.stock <= m.seuil).length} critique(s) ·{' '}
              {
                meds.filter((m) => {
                  const j = jPerem(m)
                  return j !== null && j < 0
                }).length
              }{' '}
              expiré(s)
            </p>
      </div>
          <Btn onClick={showForm ? handleCloseForm : startAdd}>{showForm ? '✕ Annuler' : '+ Nouveau médicament'}</Btn>
        </div>

        {showForm && (
          <div className="p-5 bg-blue-50 border-b border-blue-200">
            {pending && <DupWarning dups={dups} entity="médicament" onOk={commitSave} onCancel={handleCloseForm} />}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Field label="Nom *" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom du médicament" className="md:col-span-2" />
              <Field
                label="Catégorie"
                value={form.categorie}
                onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                options={['Antibiotique', 'Antiparasitaire', 'Vaccin', 'Anti-inflammatoire', 'Vitamines', 'Anesthésique', 'Autre']}
              />
              <Field label="Dose mg/kg" value={form.doseMgKg} onChange={(e) => setForm({ ...form, doseMgKg: e.target.value })} type="number" placeholder="ex: 10" />
              <Field label="Unité" value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })} options={['comprimés', 'flacons', 'doses', 'ampoules', 'sachets', 'litres', 'kg']} />
              <Field label="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} type="number" placeholder="0" />
              <Field label="Seuil alerte" value={form.seuil} onChange={(e) => setForm({ ...form, seuil: e.target.value })} type="number" placeholder="0" />
              <Field label="Prix achat (F)" value={form.prixAchat} onChange={(e) => setForm({ ...form, prixAchat: e.target.value })} type="number" placeholder="0" />
              <Field label="Prix vente (F)" value={form.prixVente} onChange={(e) => setForm({ ...form, prixVente: e.target.value })} type="number" placeholder="0" />
              <Field label="Fournisseur" value={form.fournisseur} onChange={(e) => setForm({ ...form, fournisseur: e.target.value })} placeholder="Fournisseur" />
              <Field label="N° de lot" value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} placeholder="ex: LOT-2024-01" />
              <Field label="Date péremption" value={form.peremption} onChange={(e) => setForm({ ...form, peremption: e.target.value })} type="date" />
            </div>
            <div className="mt-3">
              <Btn onClick={handlePrimarySave}>{formMode === 'edit' ? '✓ Enregistrer' : '✓ Enregistrer'}</Btn>
            </div>
          </div>
        )}

      <FilterBar search={search} onSearch={setSearch} placeholder="🔍 Nom, catégorie, référence…" activeCount={activeFilters} onReset={resetFilters}>
          <FilterSelect label="📂 Catégorie" value={fCat} onChange={setFCat} options={categories.map((c) => ({ v: c, l: c }))} />
          <FilterBtns label="Stock" options={[{ v: 'critique', l: '🚨 Critique' }, { v: 'ok', l: '✓ OK' }]} value={fStock} onChange={setFStock} colorFn={(v) => (v === 'critique' ? 'red' : 'green')} />
          <FilterBtns label="Péremption" options={[{ v: 'expire', l: '☠️ Expiré' }, { v: 'proche', l: '⏰ < 30j' }]} value={fPerem} onChange={setFPerem} colorFn={() => 'amber'} />
      </FilterBar>

      <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {['Réf.', 'Nom', 'Catégorie', 'Lot', 'Péremption', 'Stock', 'Prix vente', 'Fournisseur', 'Statut', 'Actions'].map((h) => (
                  <th key={h} className="text-left p-3 text-xs font-bold text-slate-600 uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const crit = m.stock <= m.seuil
                const ps = peremStatus(m)
                const j = jPerem(m)
                return (
                  <tr key={m.id} className={`border-t hover:bg-slate-50 ${crit || ps === 'expired' || ps === 'critical' ? 'bg-red-50/40' : ps === 'warning' ? 'bg-amber-50/40' : ''}`}>
              <td className="p-3 font-mono text-xs text-slate-400">{m.ref}</td>
              <td className="p-3 font-semibold">{m.nom}</td>
                    <td className="p-3">
                      <Badge color="purple">{m.categorie}</Badge>
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-500">{m.lot || '–'}</td>
              <td className="p-3">
                      {m.peremption ? (
                        <div>
                          <div className={`text-xs font-bold ${ps === 'expired' ? 'text-red-600' : ps === 'critical' ? 'text-red-500' : ps === 'warning' ? 'text-amber-500' : 'text-slate-500'}`}>{m.peremption}</div>
                          {ps === 'expired' && <Badge color="red">☠️ Expiré</Badge>}
                          {ps === 'critical' && <Badge color="red">⏰ {j}j</Badge>}
                          {ps === 'warning' && <Badge color="amber">⚠️ {j}j</Badge>}
                          {ps === 'ok' && <Badge color="green">✓ {j}j</Badge>}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">–</span>
                      )}
                    </td>
                    <td className="p-3 font-bold font-mono">
                      {m.stock} <span className="text-xs font-normal text-slate-400">{m.unite}</span>
              </td>
              <td className="p-3 font-bold font-mono text-blue-600">{fmtF(m.prixVente)}</td>
              <td className="p-3 text-sm">{m.fournisseur}</td>
                    <td className="p-3">
                      {ps === 'expired' ? (
                        <Badge color="red">☠️ Expiré</Badge>
                      ) : crit ? (
                        <Badge color="red">🚨 Critique</Badge>
                      ) : (
                        <Badge color="green">✓ OK</Badge>
                      )}
                    </td>
                    <td className="p-3 no-print">
                      <button
                        type="button"
                        onClick={() => startEdit(m)}
                        className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-semibold transition-all"
                      >
                        ✏️ Modifier
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
