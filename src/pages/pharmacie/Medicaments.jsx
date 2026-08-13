import { Pill, AlertTriangle, Clock, Coins, Package, Factory, Pencil, Trash2 } from 'lucide-react'
import { useState, useMemo } from 'react'
import {
  Btn, Field, DupWarning, ValidationBanner,
  FormSection, FilterBtns, Pagination, usePagination,
} from '../../components/ui'
import { dbInsert, dbUpdate, dbDelete, newId } from '../../lib/db'
import {
  validateMedicamentForm,
  medicamentFormToRow,
  medicamentFormToUpdates,
} from '../../lib/validation'

const FOURNISSEUR_PLACEHOLDER = '— Choisir un fournisseur —'
const FOURNISSEURS_FALLBACK   = ['MediVet SARL', 'Afrique Pharma', 'AgroVet Togo']
const CATEGORIES = ['Antibiotique','Antiparasitaire','Vaccin','Anti-inflammatoire','Vitamines','Anesthésique','Autre']
const CAT_COLORS = {
  'Antibiotique':       { bg:'#eff6ff', border:'#bfdbfe', text:'#2563eb' },
  'Antiparasitaire':    { bg:'#f0fdf4', border:'#bbf7d0', text:'#16a34a' },
  'Vaccin':             { bg:'#faf5ff', border:'#e9d5ff', text:'#9333ea' },
  'Anti-inflammatoire': { bg:'#fff7ed', border:'#fed7aa', text:'#ea580c' },
  'Vitamines':          { bg:'#fefce8', border:'#fef08a', text:'#ca8a04' },
  'Anesthésique':       { bg:'#fdf2f8', border:'#f0abfc', text:'#c026d3' },
  'Autre':              { bg:'#f8fafc', border:'#e2e8f0', text:'#64748b' },
}
const catColor = (c) => CAT_COLORS[c] || CAT_COLORS['Autre']

function Medicaments({ meds, setMeds, fournisseurs = [], setFournisseurs, user, sb, logAction }) {
  const getDefaultForm = () => ({
    nom: '', categorie: 'Antibiotique', stock: '', seuil: '',
    unite: 'comprimés', prixAchat: '', prixVente: '',
    fournisseur: '', doseMgKg: '', lot: '',
    peremption: new Date().toISOString().split('T')[0],
    prixGros: '', paliersGros: [],
  })

  const [search,    setSearch]    = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [formMode,  setFormMode]  = useState('add')
  const [editingId, setEditingId] = useState(null)
  const [form,      setForm]      = useState(getDefaultForm())
  const [dups,      setDups]      = useState([])
  const [pending,   setPending]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [formErrors,         setFormErrors]         = useState({})
  const [validationMessages, setValidationMessages] = useState([])
  const [fCat,      setFCat]      = useState('')
  const [fStock,    setFStock]    = useState('')
  const [fPerem,    setFPerem]    = useState('')
  const [sortBy,    setSortBy]    = useState('nom')
  const [viewMode,  setViewMode]  = useState('table')
  const [showQuickFour,  setShowQuickFour]  = useState(false)
  const [quickFourNom,   setQuickFourNom]   = useState('')
  const [savingFour,     setSavingFour]     = useState(false)

  const fmtF = n => new Intl.NumberFormat('fr-FR').format(n || 0) + ' F'
  const fmtK = n => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M F` : n >= 1000 ? `${Math.round(n/1000)}k F` : fmtF(n)
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
  const marge = m => {
    const pa = m.prixAchat ?? m.prix_achat ?? 0
    const pv = m.prixVente ?? m.prix_vente ?? 0
    return pa > 0 ? Math.round(((pv - pa) / pa) * 100) : null
  }

  // ── Fournisseurs ──────────────────────────────────────────────
  const fournisseurOptions = useMemo(() => {
    const fromProp = (fournisseurs||[]).filter(f=>f.actif!==false).map(f=>f.nom).filter(Boolean)
    const fromMeds = meds.map(m=>m.fournisseur).filter(Boolean)
    return [...new Set([...fromProp,...fromMeds,...FOURNISSEURS_FALLBACK])].sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}))
  }, [fournisseurs, meds])
  const fournisseurSelectOptions = useMemo(() => [FOURNISSEUR_PLACEHOLDER,...fournisseurOptions], [fournisseurOptions])

  const patchForm = (patch) => {
    setForm(prev => ({...prev,...patch}))
    setFormErrors(prev => { const n={...prev}; Object.keys(patch).forEach(k=>delete n[k]); return n })
    if (validationMessages.length) setValidationMessages([])
  }
  const findDups = (nom, excludeId) => {
    const q = String(nom||'').toLowerCase().trim()
    return meds.filter(m=>m.id!==excludeId && String(m.nom||'').toLowerCase().trim()===q)
  }

  // ── Save ──────────────────────────────────────────────────────
  const commitSave = async () => {
    const checked = validateMedicamentForm(form)
    if (!checked.ok) { setFormErrors(checked.fieldErrors); setValidationMessages(checked.messages); return }
    const validated = checked.data
    setSaving(true)
    try {
      if (formMode === 'add') {
        const row = medicamentFormToRow(validated, { id:newId(), ref:`VET-${Date.now()}` })
        row.prix_gros    = parseInt(form.prixGros)||0
        row.paliers_gros = (form.paliersGros||[]).map(p=>({qte:parseInt(p.qte)||0,remise:parseFloat(p.remise)||0}))
        const saved = await dbInsert(sb,'medicaments',row)
        const forState = { ...saved, prixAchat:saved.prix_achat??row.prix_achat, prixVente:saved.prix_vente??row.prix_vente, doseMgKg:saved.dose_mg_kg??row.dose_mg_kg, prixGros:saved.prix_gros??row.prix_gros, paliersGros:saved.paliers_gros??row.paliers_gros }
        setMeds([...meds,forState])
        if (logAction&&sb) logAction(sb,user,'medicament_added',`${row.nom} (${row.ref})`)
      } else {
        const before = meds.find(m=>m.id===editingId)
        if (!before) return
        const updates = medicamentFormToUpdates(validated)
        updates.prix_gros    = parseInt(form.prixGros)||0
        updates.paliers_gros = (form.paliersGros||[]).map(p=>({qte:parseInt(p.qte)||0,remise:parseFloat(p.remise)||0}))
        await dbUpdate(sb,'medicaments',editingId,updates)
        const updated = { ...before,...updates, prixAchat:updates.prix_achat, prixVente:updates.prix_vente, doseMgKg:updates.dose_mg_kg, prixGros:updates.prix_gros, paliersGros:updates.paliers_gros }
        setMeds(meds.map(m=>m.id===editingId?updated:m))
        if (logAction&&sb) logAction(sb,user,'medicament_modified',`${before.nom}: stock ${before.stock}→${updates.stock}`)
      }
      setForm(getDefaultForm()); setShowForm(false); setEditingId(null); setFormMode('add')
      setDups([]); setPending(false); setFormErrors({}); setValidationMessages([])
    } catch(e) { alert('Erreur lors de la sauvegarde. Vérifiez la console.') }
    finally { setSaving(false) }
  }

  const handlePrimarySave = () => {
    const checked = validateMedicamentForm(form)
    if (!checked.ok) { setFormErrors(checked.fieldErrors); setValidationMessages(checked.messages); return }
    const excludeId = formMode==='edit' ? editingId : null
    const d = findDups(form.nom,excludeId)
    if (d.length) { setDups(d); setPending(true); return }
    commitSave()
  }

  const startAdd = () => { setFormMode('add'); setEditingId(null); setForm(getDefaultForm()); setDups([]); setPending(false); setShowForm(true) }
  const startEdit = m => {
    setFormMode('edit'); setEditingId(m.id); setDups([]); setPending(false)
    setForm({
      nom:m.nom||'', categorie:m.categorie||'Antibiotique',
      stock:String(m.stock??''), seuil:String(m.seuil??''),
      unite:m.unite||'comprimés',
      prixAchat:String(m.prixAchat??m.prix_achat??''),
      prixVente:String(m.prixVente??m.prix_vente??''),
      fournisseur:m.fournisseur||'',
      doseMgKg:m.doseMgKg===null||m.doseMgKg===undefined?'':String(m.doseMgKg),
      lot:m.lot||'', peremption:m.peremption||getDefaultForm().peremption,
      prixGros:String(m.prixGros??m.prix_gros??''),
      paliersGros:m.paliersGros??m.paliers_gros??[],
    })
    setShowForm(true)
  }
  const handleDelete = async (m) => {
    if (!confirm(`Supprimer ${m.nom} ?`)) return
    try {
      await dbDelete(sb,'medicaments',m.id)
      setMeds(meds.filter(x=>x.id!==m.id))
      if (logAction&&sb) logAction(sb,user,'medicament_deleted',`${m.nom} (${m.ref})`)
    } catch(e) { alert(e?.message||'Suppression impossible.') }
  }
  const handleCloseForm = () => { setShowForm(false); setPending(false); setDups([]); setEditingId(null); setFormMode('add'); setForm(getDefaultForm()); setFormErrors({}); setValidationMessages([]) }

  const saveQuickFour = async () => {
    if (!quickFourNom.trim()) return
    setSavingFour(true)
    try {
      const row = { id:newId(), nom:quickFourNom.trim(), contact:'', tel:'', email:'', adresse:'', ville:'Lomé', pays:'Togo', specialite:'Médicaments vétérinaires', delai_livraison:5, conditions_paiement:'30j', remise:0, note_qualite:3, actif:true, notes:'', date_debut:new Date().toISOString().split('T')[0], rib:'', site_web:'' }
      const saved = await dbInsert(sb,'fournisseurs',row)
      const entry = { ...row, id:saved?.id||row.id }
      if (setFournisseurs) setFournisseurs(prev=>[entry,...(Array.isArray(prev)?prev:[])])
      patchForm({ fournisseur:row.nom }); setShowQuickFour(false); setQuickFourNom('')
    } catch(e) { alert('Erreur : '+(e?.message||e)) }
    finally { setSavingFour(false) }
  }

  // ── KPIs ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const critique    = meds.filter(m=>m.stock<=m.seuil).length
    const expires     = meds.filter(m=>{ const j=jPerem(m); return j!==null&&j<0 }).length
    const prochains   = meds.filter(m=>{ const j=jPerem(m); return j!==null&&j>=0&&j<=30 }).length
    const valeurStock = meds.reduce((s,m)=>s+(parseFloat(m.prixVente??m.prix_vente)||0)*(m.stock||0),0)
    return { critique, expires, prochains, valeurStock }
  }, [meds])

  // ── Filtres ───────────────────────────────────────────────────
  const categories = useMemo(() => [...new Set(meds.map(m=>m.categorie))].filter(Boolean), [meds])

  const filtered = useMemo(() => {
    let r = meds.filter(m => {
      const q = search.toLowerCase()
      if (q && !String(m.nom||'').toLowerCase().includes(q) && !String(m.categorie||'').toLowerCase().includes(q) && !String(m.ref||'').toLowerCase().includes(q)) return false
      if (fCat && m.categorie!==fCat) return false
      if (fStock==='critique' && m.stock>m.seuil)  return false
      if (fStock==='ok'       && m.stock<=m.seuil) return false
      if (fPerem==='expire') { const j=jPerem(m); if(j===null||j>=0) return false }
      if (fPerem==='proche') { const j=jPerem(m); if(j===null||j<0||j>30) return false }
      return true
    })
    r = [...r].sort((a,b) => {
      if (sortBy==='stock_asc')  return (a.stock||0)-(b.stock||0)
      if (sortBy==='stock_desc') return (b.stock||0)-(a.stock||0)
      if (sortBy==='perem')      return (a.peremption||'9999').localeCompare(b.peremption||'9999')
      if (sortBy==='prix_desc')  return ((b.prixVente??b.prix_vente)||0)-((a.prixVente??a.prix_vente)||0)
      return String(a.nom||'').localeCompare(String(b.nom||''))
    })
    return r
  }, [meds, search, fCat, fStock, fPerem, sortBy])

  const activeFilters = [fCat,fStock,fPerem].filter(Boolean).length
  const resetFilters  = () => { setSearch(''); setFCat(''); setFStock(''); setFPerem('') }
  const pagination    = usePagination(filtered, 25)

  // ── Rendu ─────────────────────────────────────────────────────
  return (
    <div className="app-page space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon:Pill,          label:'Total médicaments',    value:meds.length,         sub:`${categories.length} catégorie(s)`,                              color:'#0d9488' },
          { icon:AlertTriangle, label:'Stock critique',        value:kpis.critique,       sub:`${Math.round(kpis.critique/Math.max(1,meds.length)*100)}% du stock`, color:'#dc2626' },
          { icon:Clock,         label:'Péremption < 30j',      value:kpis.prochains,      sub:`${kpis.expires} déjà expiré(s)`,                                 color:'#d97706' },
          { icon:Coins,         label:'Valeur stock (vente)',  value:fmtK(kpis.valeurStock), sub:'prix vente × quantité',                                       color:'#2563eb' },
        ].map((k,i) => (
          <div key={i} style={{ background:'white',borderRadius:16,padding:'14px 16px',border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,0.04),0 6px 20px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
              <div style={{ width:34,height:34,borderRadius:10,background:k.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}><k.icon size={17} color={k.color} strokeWidth={2.2} /></div>
              <span style={{ fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em' }}>{k.label}</span>
            </div>
            <div style={{ fontSize:22,fontWeight:900,color:'#0f172a',lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:11,color:'#94a3b8',marginTop:4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="app-card">
        {/* Header */}
        <div style={{ padding:'18px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
          <div>
            <h2 style={{ fontSize:20,fontWeight:900,display:'flex',alignItems:'center',gap:8 }}><Pill size={20} color="#7c3aed" strokeWidth={2.3} /> Médicaments & Stock</h2>
            <p style={{ fontSize:12,color:'#94a3b8',marginTop:2 }}>
              {filtered.length}/{meds.length} produit(s) · {kpis.critique} critique(s) · {kpis.expires} expiré(s)
            </p>
          </div>
          <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
            {/* Vue toggle */}
            <div style={{ display:'flex',gap:2,background:'#f1f5f9',borderRadius:10,padding:3 }}>
              {[{k:'table',l:'☰ Tableau'},{k:'cards',l:'⊞ Cartes'}].map(v => (
                <button key={v.k} onClick={()=>setViewMode(v.k)}
                  style={{ padding:'5px 10px',borderRadius:8,fontSize:11,fontWeight:700,border:'none',cursor:'pointer',transition:'all .12s',
                    background:viewMode===v.k?'white':'transparent',
                    color:viewMode===v.k?'#0d9488':'#94a3b8',
                    boxShadow:viewMode===v.k?'0 1px 4px rgba(0,0,0,0.08)':'none' }}>{v.l}</button>
              ))}
            </div>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
              style={{ border:'1.5px solid #e2e8f0',borderRadius:10,padding:'7px 10px',fontSize:12,fontWeight:700,color:'#64748b',outline:'none',background:'white' }}>
              <option value="nom">🔤 Nom A→Z</option>
              <option value="stock_asc">📉 Stock croissant</option>
              <option value="stock_desc">📈 Stock décroissant</option>
              <option value="perem">⏰ Péremption</option>
              <option value="prix_desc">💰 Prix décroissant</option>
            </select>
            <Btn onClick={showForm ? handleCloseForm : startAdd}>
              {showForm ? '✕ Annuler' : '+ Nouveau médicament'}
            </Btn>
          </div>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div style={{ background:'linear-gradient(135deg,#eff6ff,#f5f3ff)',borderBottom:'1px solid rgba(37,99,235,0.12)',padding:'20px 24px' }}>
            <h3 style={{ fontWeight:800,color:'#1d4ed8',fontSize:15,marginBottom:16,display:'flex',alignItems:'center',gap:8 }}>
              {formMode==='edit'?'✏️ Modifier le médicament':'💊 Nouveau médicament'}
            </h3>
            {pending && <DupWarning dups={dups} entity="médicament" onOk={commitSave} onCancel={handleCloseForm} />}
            <ValidationBanner messages={validationMessages} onDismiss={()=>setValidationMessages([])} />

            <FormSection label="Identification" icon={<Pill size={14} />} color="blue" noTopMargin>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Field label="Nom *"        value={form.nom}       onChange={e=>patchForm({nom:e.target.value})}       error={formErrors.nom}       placeholder="Nom du médicament"  className="md:col-span-2" />
                <Field label="Catégorie"    value={form.categorie} onChange={e=>patchForm({categorie:e.target.value})} error={formErrors.categorie} options={CATEGORIES} />
                <Field label="Dose mg/kg"   value={form.doseMgKg}  onChange={e=>patchForm({doseMgKg:e.target.value})}  error={formErrors.doseMgKg}  type="number" placeholder="ex: 10" />
                <Field label="Unité"        value={form.unite}     onChange={e=>patchForm({unite:e.target.value})}     error={formErrors.unite}     options={['comprimés','flacons','doses','ampoules','sachets','litres','kg']} />
              </div>
            </FormSection>

            <FormSection label="Stock & Tarifs" icon={<Package size={14} />} color="blue">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Stock actuel"  value={form.stock}     onChange={e=>patchForm({stock:e.target.value})}    error={formErrors.stock}    type="number" placeholder="0" />
                <Field label="Seuil alerte"  value={form.seuil}     onChange={e=>patchForm({seuil:e.target.value})}    error={formErrors.seuil}    type="number" placeholder="0" />
                <Field label="Prix achat (F)" value={form.prixAchat} onChange={e=>patchForm({prixAchat:e.target.value})} error={formErrors.prixAchat} type="number" placeholder="0" />
                <Field label="Prix vente (F)" value={form.prixVente} onChange={e=>patchForm({prixVente:e.target.value})} error={formErrors.prixVente} type="number" placeholder="0" />
                {/* Marge preview */}
                {form.prixAchat && form.prixVente && (
                  <div style={{ gridColumn:'span 2',padding:'8px 12px',borderRadius:10,background:'#f0fdf4',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',gap:8 }}>
                    <span style={{ fontSize:12,color:'#16a34a',fontWeight:700 }}>
                      Marge estimée : {Math.round(((parseFloat(form.prixVente)-parseFloat(form.prixAchat))/parseFloat(form.prixAchat))*100)}%
                    </span>
                    <span style={{ fontSize:11,color:'#94a3b8' }}>({fmtF(parseFloat(form.prixVente)-parseFloat(form.prixAchat))} / unité)</span>
                  </div>
                )}
              </div>
            </FormSection>

            <FormSection label="Fournisseur & Traçabilité" icon={<Factory size={14} />} color="blue">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <div style={{ display:'flex',alignItems:'flex-end',gap:6 }}>
                    <div style={{ flex:1 }}>
                      <Field label="Fournisseur"
                        value={form.fournisseur||FOURNISSEUR_PLACEHOLDER}
                        onChange={e=>{const v=e.target.value;patchForm({fournisseur:v===FOURNISSEUR_PLACEHOLDER?'':v})}}
                        error={formErrors.fournisseur}
                        options={fournisseurSelectOptions} />
                    </div>
                    <button type="button" onClick={()=>setShowQuickFour(q=>!q)}
                      style={{ marginBottom:2,padding:'9px 10px',background:'#eff6ff',border:'2px solid #bfdbfe',borderRadius:10,color:'#2563eb',fontSize:14,fontWeight:900,cursor:'pointer' }}>+</button>
                  </div>
                  {showQuickFour && (
                    <div style={{ marginTop:6,background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:12 }}>
                      <p style={{ fontSize:11,fontWeight:700,color:'#1d4ed8',marginBottom:8 }}>Nouveau fournisseur rapide</p>
                      <input type="text" placeholder="Nom du fournisseur *" value={quickFourNom} onChange={e=>setQuickFourNom(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveQuickFour()}
                        style={{ width:'100%',border:'1.5px solid #bfdbfe',borderRadius:9,padding:'7px 10px',fontSize:13,outline:'none',background:'white',marginBottom:8 }} />
                      <div style={{ display:'flex',gap:6 }}>
                        <button type="button" onClick={saveQuickFour} disabled={!quickFourNom.trim()||savingFour}
                          style={{ padding:'6px 12px',background:'#2563eb',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer' }}>{savingFour?'⏳':'✓ Créer'}</button>
                        <button type="button" onClick={()=>{setShowQuickFour(false);setQuickFourNom('')}}
                          style={{ padding:'6px 10px',color:'#64748b',background:'none',border:'none',fontSize:12,cursor:'pointer' }}>Annuler</button>
                      </div>
                    </div>
                  )}
                </div>
                <Field label="N° de lot"        value={form.lot}       onChange={e=>patchForm({lot:e.target.value})}       error={formErrors.lot}       placeholder="ex: LOT-2024-01" />
                <Field label="Date péremption"  value={form.peremption} onChange={e=>patchForm({peremption:e.target.value})} error={formErrors.peremption} type="date" />
              </div>
            </FormSection>

            <FormSection label="Vente en gros (optionnel)" icon={<Package size={14} />} color="orange">
              <div style={{ display:'flex',flexWrap:'wrap',gap:12,alignItems:'flex-start' }}>
                <div style={{ width:160 }}>
                  <label style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:5 }}>Prix gros (F)</label>
                  <input type="number" min="0" placeholder="0 = désactivé" value={form.prixGros} onChange={e=>patchForm({prixGros:e.target.value})}
                    style={{ width:'100%',border:'1.5px solid #fed7aa',borderRadius:10,padding:'9px 10px',fontSize:13,outline:'none',background:'white' }} />
                </div>
                <div style={{ flex:1,minWidth:260 }}>
                  <label style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:5 }}>Paliers de remise</label>
                  <div style={{ display:'flex',gap:6,flexWrap:'wrap',alignItems:'center' }}>
                    {(form.paliersGros||[]).map((p,pi) => (
                      <div key={pi} style={{ display:'flex',alignItems:'center',gap:4,background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:9,padding:'6px 8px' }}>
                        <span style={{ fontSize:11,color:'#ea580c' }}>≥</span>
                        <input type="number" min="1" value={p.qte} onChange={e=>{const pl=[...(form.paliersGros||[])];pl[pi]={...pl[pi],qte:e.target.value};patchForm({paliersGros:pl})}}
                          style={{ width:44,fontSize:12,border:'1px solid #fed7aa',borderRadius:6,padding:'2px 4px',outline:'none',textAlign:'center' }} placeholder="qté" />
                        <span style={{ fontSize:11,color:'#ea580c' }}>→</span>
                        <input type="number" min="0" max="99" value={p.remise} onChange={e=>{const pl=[...(form.paliersGros||[])];pl[pi]={...pl[pi],remise:e.target.value};patchForm({paliersGros:pl})}}
                          style={{ width:36,fontSize:12,border:'1px solid #fed7aa',borderRadius:6,padding:'2px 4px',outline:'none',textAlign:'center' }} placeholder="%" />
                        <span style={{ fontSize:11,color:'#ea580c' }}>%</span>
                        <button type="button" onClick={()=>patchForm({paliersGros:(form.paliersGros||[]).filter((_,j)=>j!==pi)})}
                          style={{ color:'#f87171',background:'none',border:'none',cursor:'pointer',fontSize:13,fontWeight:800 }}>✕</button>
                      </div>
                    ))}
                    {(form.paliersGros||[]).length < 4 && (
                      <button type="button" onClick={()=>patchForm({paliersGros:[...(form.paliersGros||[]),{qte:'10',remise:'5'}]})}
                        style={{ fontSize:12,color:'#ea580c',border:'1px solid #fed7aa',borderRadius:9,padding:'6px 10px',background:'none',cursor:'pointer',fontWeight:600 }}>+ Palier</button>
                    )}
                  </div>
                </div>
              </div>
            </FormSection>

            <div style={{ marginTop:16,paddingTop:16,borderTop:'1px solid rgba(37,99,235,0.1)',display:'flex',gap:8 }}>
              <Btn onClick={handlePrimarySave} disabled={saving}>
                {saving?'⏳ Enregistrement…':formMode==='edit'?'✓ Enregistrer les modifications':'✓ Ajouter le médicament'}
              </Btn>
              <button onClick={handleCloseForm} style={{ padding:'8px 14px',borderRadius:10,fontSize:12,fontWeight:700,background:'none',border:'none',color:'#64748b',cursor:'pointer' }}>Annuler</button>
            </div>
          </div>
        )}

        {/* Chips catégories */}
        {categories.length > 0 && (
          <div style={{ padding:'10px 20px',borderBottom:'1px solid #f8fafc',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
            <span style={{ fontSize:10,fontWeight:700,color:'#94a3b8',marginRight:2 }}>CATÉGORIE</span>
            {categories.map(cat => {
              const cc = catColor(cat)
              const count = meds.filter(m=>m.categorie===cat).length
              return (
                <button key={cat} onClick={()=>setFCat(fCat===cat?'':cat)}
                  style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:99,fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .12s',
                    background:fCat===cat?cc.bg:'transparent',
                    border:`1.5px solid ${fCat===cat?cc.border:'#e2e8f0'}`,
                    color:fCat===cat?cc.text:'#64748b' }}>
                  {cat} <span style={{ fontWeight:900 }}>{count}</span>
                </button>
              )
            })}
            {fCat && <button onClick={()=>setFCat('')} style={{ fontSize:11,fontWeight:700,color:'#94a3b8',background:'none',border:'none',cursor:'pointer' }}>✕ Tout</button>}
          </div>
        )}

        {/* Filtres */}
        <div style={{ padding:'12px 20px',borderBottom:'1px solid #f8fafc',display:'flex',flexWrap:'wrap',gap:8,alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Nom, catégorie, référence…"
            style={{ flex:'1 1 180px',minWidth:150,padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none' }} />
          <FilterBtns label="Stock" options={[{v:'critique',l:'🚨 Critique'},{v:'ok',l:'✓ OK'}]} value={fStock} onChange={setFStock} colorFn={v=>v==='critique'?'red':'green'} />
          <FilterBtns label="Péremption" options={[{v:'expire',l:'☠️ Expiré'},{v:'proche',l:'⏰ < 30j'}]} value={fPerem} onChange={setFPerem} colorFn={()=>'amber'} />
          {activeFilters > 0 && (
            <button onClick={resetFilters} style={{ padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,fontWeight:700,background:'white',color:'#64748b',cursor:'pointer' }}>
              ✕ Effacer ({activeFilters})
            </button>
          )}
          <span style={{ fontSize:11,color:'#94a3b8',marginLeft:'auto' }}>{filtered.length}/{meds.length}</span>
        </div>

        {/* ── VUE TABLEAU ─────────────────────────────────────── */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['Réf.','Médicament','Stock','Péremption','Prix vente','Marge','Fournisseur','Actions'].map(h => (
                    <th key={h} style={{ textAlign:'left',padding:'10px 12px',fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em',whiteSpace:'nowrap',borderBottom:'1px solid #f1f5f9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map(m => {
                  const crit = m.stock <= m.seuil
                  const ps   = peremStatus(m)
                  const j    = jPerem(m)
                  const mg   = marge(m)
                  const pv   = m.prixVente ?? m.prix_vente ?? 0
                  const stockPct = m.seuil > 0 ? Math.min(100, Math.round((m.stock / (m.seuil * 3)) * 100)) : 50
                  const cc = catColor(m.categorie)
                  const rowBg = ps==='expired'||ps==='critical' ? 'rgba(254,242,242,0.6)' : crit ? 'rgba(255,247,237,0.5)' : ps==='warning' ? 'rgba(255,251,235,0.4)' : 'white'
                  return (
                    <tr key={m.id} style={{ borderBottom:'1px solid #f1f5f9',background:rowBg,transition:'background .12s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                      onMouseLeave={e=>e.currentTarget.style.background=rowBg}>
                      <td style={{ padding:'10px 12px',fontFamily:'monospace',fontSize:11,color:'#94a3b8' }}>{m.ref}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ fontWeight:700,fontSize:13,color:'#0f172a',marginBottom:3 }}>{m.nom}</div>
                        <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:99,background:cc.bg,border:`1px solid ${cc.border}`,color:cc.text }}>{m.categorie}</span>
                      </td>
                      <td style={{ padding:'10px 12px',minWidth:110 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:4 }}>
                          <span style={{ fontSize:13,fontWeight:800,fontFamily:'monospace',color:crit?'#dc2626':'#0f172a' }}>{m.stock}</span>
                          <span style={{ fontSize:10,color:'#94a3b8' }}>{m.unite}</span>
                          {crit && <span style={{ fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:99,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca' }}>🚨</span>}
                        </div>
                        <div style={{ height:4,borderRadius:99,background:'#f1f5f9',overflow:'hidden' }}>
                          <div style={{ height:'100%',width:`${stockPct}%`,borderRadius:99,background:crit?'#ef4444':stockPct<50?'#f59e0b':'#22c55e',transition:'width .4s' }} />
                        </div>
                        <div style={{ fontSize:9,color:'#94a3b8',marginTop:2 }}>seuil: {m.seuil}</div>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        {m.peremption ? (
                          <div>
                            <div style={{ fontSize:11,fontWeight:700,color:ps==='expired'?'#dc2626':ps==='critical'?'#ef4444':ps==='warning'?'#d97706':'#64748b' }}>{m.peremption}</div>
                            {ps==='expired'  && <span style={{ fontSize:10,padding:'1px 7px',borderRadius:99,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',fontWeight:700 }}>☠️ Expiré</span>}
                            {ps==='critical' && <span style={{ fontSize:10,padding:'1px 7px',borderRadius:99,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',fontWeight:700 }}>⏰ {j}j</span>}
                            {ps==='warning'  && <span style={{ fontSize:10,padding:'1px 7px',borderRadius:99,background:'#fffbeb',color:'#d97706',border:'1px solid #fde68a',fontWeight:700 }}>⚠️ {j}j</span>}
                            {ps==='ok'       && <span style={{ fontSize:10,padding:'1px 7px',borderRadius:99,background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0',fontWeight:700 }}>✓ {j}j</span>}
                          </div>
                        ) : <span style={{ color:'#cbd5e1',fontSize:11 }}>–</span>}
                      </td>
                      <td style={{ padding:'10px 12px',fontFamily:'monospace',fontSize:13,fontWeight:800,color:'#2563eb',whiteSpace:'nowrap' }}>{fmtF(pv)}</td>
                      <td style={{ padding:'10px 12px' }}>
                        {mg !== null ? (
                          <span style={{ fontSize:12,fontWeight:800,color:mg>=30?'#16a34a':mg>=10?'#d97706':'#dc2626' }}>{mg}%</span>
                        ) : <span style={{ color:'#cbd5e1',fontSize:11 }}>–</span>}
                      </td>
                      <td style={{ padding:'10px 12px',fontSize:12,color:'#475569',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{m.fournisseur||'–'}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ display:'flex',gap:4 }}>
                          <button type="button" onClick={()=>startEdit(m)}
                            style={{ width:30,height:30,borderRadius:8,background:'#fffbeb',border:'1px solid #fde68a',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#d97706' }}><Pencil size={14} strokeWidth={2.4} /></button>
                          <button type="button" onClick={()=>handleDelete(m)}
                            style={{ width:30,height:30,borderRadius:8,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#ef4444' }}><Trash2 size={14} strokeWidth={2.4} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!filtered.length && (
              <div style={{ textAlign:'center',padding:'48px 24px',color:'#94a3b8' }}>
                <div style={{ fontSize:40,marginBottom:8 }}>💊</div>
                <p style={{ fontWeight:700,color:'#475569' }}>Aucun médicament trouvé</p>
                <p style={{ fontSize:13,marginTop:4 }}>Ajustez les filtres ou ajoutez un médicament.</p>
              </div>
            )}
          </div>
        )}

        {/* ── VUE CARTES ──────────────────────────────────────── */}
        {viewMode === 'cards' && (
          <div style={{ padding:16,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12 }}>
            {pagination.pageItems.map(m => {
              const crit = m.stock <= m.seuil
              const ps   = peremStatus(m)
              const j    = jPerem(m)
              const mg   = marge(m)
              const pv   = m.prixVente ?? m.prix_vente ?? 0
              const cc   = catColor(m.categorie)
              const stockPct = m.seuil > 0 ? Math.min(100, Math.round((m.stock/(m.seuil*3))*100)) : 50
              return (
                <div key={m.id} style={{ borderRadius:14,border:`1.5px solid ${crit||ps==='expired'?'#fecaca':ps==='warning'?'#fde68a':'#f1f5f9'}`,background:'white',overflow:'hidden',transition:'all .15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.08)';e.currentTarget.style.transform='translateY(-2px)'}}
                  onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='none'}}>
                  {/* Bande catégorie */}
                  <div style={{ height:4,background:cc.text+'88' }} />
                  <div style={{ padding:'12px 14px' }}>
                    {/* Header */}
                    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:10 }}>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontWeight:800,fontSize:14,color:'#0f172a',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{m.nom}</p>
                        <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:99,background:cc.bg,border:`1px solid ${cc.border}`,color:cc.text }}>{m.categorie}</span>
                      </div>
                      <div style={{ display:'flex',gap:4,flexShrink:0 }}>
                        <button onClick={()=>startEdit(m)} style={{ width:28,height:28,borderRadius:8,background:'#fffbeb',border:'1px solid #fde68a',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#d97706' }}><Pencil size={13} strokeWidth={2.4} /></button>
                        <button onClick={()=>handleDelete(m)} style={{ width:28,height:28,borderRadius:8,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#ef4444' }}><Trash2 size={13} strokeWidth={2.4} /></button>
                      </div>
                    </div>

                    {/* Stock bar */}
                    <div style={{ marginBottom:10 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4 }}>
                        <span style={{ fontSize:10,fontWeight:700,color:'#94a3b8' }}>STOCK</span>
                        <span style={{ fontSize:13,fontWeight:900,fontFamily:'monospace',color:crit?'#dc2626':'#0f172a' }}>{m.stock} <span style={{ fontSize:10,fontWeight:400,color:'#94a3b8' }}>{m.unite}</span></span>
                      </div>
                      <div style={{ height:6,borderRadius:99,background:'#f1f5f9',overflow:'hidden' }}>
                        <div style={{ height:'100%',width:`${stockPct}%`,borderRadius:99,background:crit?'#ef4444':stockPct<40?'#f59e0b':'#22c55e',transition:'width .4s' }} />
                      </div>
                      <div style={{ fontSize:9,color:'#94a3b8',marginTop:3 }}>seuil alerte : {m.seuil} {m.unite}</div>
                    </div>

                    {/* Prix + Marge */}
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10 }}>
                      <div style={{ background:'#eff6ff',borderRadius:10,padding:'7px 8px' }}>
                        <p style={{ fontSize:9,fontWeight:700,color:'#1d4ed8',marginBottom:2 }}>PRIX VENTE</p>
                        <p style={{ fontSize:13,fontWeight:900,fontFamily:'monospace',color:'#2563eb' }}>{fmtF(pv)}</p>
                      </div>
                      {mg !== null && (
                        <div style={{ background:mg>=30?'#f0fdf4':mg>=10?'#fffbeb':'#fef2f2',borderRadius:10,padding:'7px 8px' }}>
                          <p style={{ fontSize:9,fontWeight:700,color:mg>=30?'#16a34a':mg>=10?'#d97706':'#dc2626',marginBottom:2 }}>MARGE</p>
                          <p style={{ fontSize:13,fontWeight:900,color:mg>=30?'#16a34a':mg>=10?'#d97706':'#dc2626' }}>{mg}%</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:8,borderTop:'1px solid #f1f5f9' }}>
                      <span style={{ fontSize:11,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>{m.fournisseur||'–'}</span>
                      {ps==='expired'  && <span style={{ fontSize:10,padding:'2px 8px',borderRadius:99,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',fontWeight:700,flexShrink:0 }}>☠️ Expiré</span>}
                      {ps==='critical' && <span style={{ fontSize:10,padding:'2px 8px',borderRadius:99,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',fontWeight:700,flexShrink:0 }}>⏰ {j}j</span>}
                      {ps==='warning'  && <span style={{ fontSize:10,padding:'2px 8px',borderRadius:99,background:'#fffbeb',color:'#d97706',border:'1px solid #fde68a',fontWeight:700,flexShrink:0 }}>⚠️ {j}j</span>}
                      {crit && ps!=='expired' && ps!=='critical' && <span style={{ fontSize:10,padding:'2px 8px',borderRadius:99,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',fontWeight:700,flexShrink:0 }}>🚨 Critique</span>}
                    </div>
                  </div>
                </div>
              )
            })}
            {!filtered.length && (
              <div style={{ gridColumn:'1/-1',textAlign:'center',padding:'48px 24px',color:'#94a3b8' }}>
                <div style={{ fontSize:40,marginBottom:8 }}>💊</div>
                <p style={{ fontWeight:700,color:'#475569' }}>Aucun médicament trouvé</p>
              </div>
            )}
          </div>
        )}

        <Pagination {...pagination} />
      </div>
    </div>
  )
}

export default Medicaments
