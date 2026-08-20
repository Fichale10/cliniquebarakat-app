import { PawPrint, Sparkles, AlertTriangle, BarChart3, Stethoscope, Pencil, Trash2, Phone } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Btn, Badge, Field, DupWarning, ValidationBanner, FormSection, FilterBtns, Pagination, usePagination, EmptyState } from '../../components/ui'
import { dbInsert, dbDelete, dbUpdate, newId } from '../../lib/db'
import { validatePatientForm, patientFormToRow } from '../../lib/validation'

const SPECIES = {
  Chien:    { emoji:'🐕', bg:'#f0fdf4', border:'#bbf7d0', text:'#16a34a', pill:'#dcfce7', dot:'#16a34a' },
  Chat:     { emoji:'🐈', bg:'#eff6ff', border:'#bfdbfe', text:'#2563eb', pill:'#dbeafe', dot:'#2563eb' },
  Bovin:    { emoji:'🐄', bg:'#fffbeb', border:'#fde68a', text:'#d97706', pill:'#fef3c7', dot:'#d97706' },
  Caprin:   { emoji:'🐐', bg:'#fff7ed', border:'#fed7aa', text:'#ea580c', pill:'#ffedd5', dot:'#ea580c' },
  Ovin:     { emoji:'🐑', bg:'#faf5ff', border:'#e9d5ff', text:'#9333ea', pill:'#f3e8ff', dot:'#9333ea' },
  Volaille: { emoji:'🐓', bg:'#fefce8', border:'#fef08a', text:'#ca8a04', pill:'#fef9c3', dot:'#ca8a04' },
}
const sp = (s) => SPECIES[s] || { emoji:'🐾', bg:'#f8fafc', border:'#e2e8f0', text:'#64748b', pill:'#f1f5f9', dot:'#64748b' }
const ESPECES_LIST = ['Chien','Chat','Bovin','Caprin','Ovin','Volaille']

function Patients({ patients, setPatients, clients, user, sb, logAction }) {
  const emptyForm = () => ({
    nom:'', espece:'Chien', race:'', age:'', sexe:'M',
    proprio:'', tel:'', poids:'', couleur:'',
    allergies:'', antecedents:'', photo:'',
  })

  const [search,       setSearch]       = useState('')
  const [showForm,     setShowForm]     = useState(false)
  const [form,         setForm]         = useState(emptyForm())
  const [dups,         setDups]         = useState([])
  const [pending,      setPending]      = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [fEspece,      setFEspece]      = useState('')
  const [fAllergies,   setFAllergies]   = useState('')
  const [formErrors,   setFormErrors]   = useState({})
  const [valMsgs,      setValMsgs]      = useState([])
  const [expandedId,   setExpandedId]   = useState(null)
  const [editId,       setEditId]       = useState(null)
  const [editForm,     setEditForm]     = useState(null)
  const [savingEdit,   setSavingEdit]   = useState(false)
  const [sortBy,       setSortBy]       = useState('recent')

  const patchForm = (patch) => {
    setForm(prev => ({ ...prev, ...patch }))
    setFormErrors(prev => { const n={...prev}; Object.keys(patch).forEach(k=>delete n[k]); return n })
    if (valMsgs.length) setValMsgs([])
  }
  const f  = v => e => patchForm({ [v]: e.target.value })
  const ef = v => e => setEditForm(p => ({ ...p, [v]: e.target.value }))

  const findDups = (nom) => {
    const q = String(nom||'').toLowerCase().trim()
    return patients.filter(p => String(p.nom||'').toLowerCase().trim() === q)
  }

  // ── KPIs ─────────────────────────────────────────────────────
  const thisMonth = new Date().toISOString().slice(0,7)
  const kpis = useMemo(() => {
    const nouveaux = patients.filter(p => p.created_at?.startsWith(thisMonth)).length
    const allergies = patients.filter(p => p.allergies).length
    const especesCount = new Set(patients.map(p=>p.espece).filter(Boolean)).size
    const top = Object.entries(patients.reduce((a,p)=>{ a[p.espece]=(a[p.espece]||0)+1; return a },{}))
      .sort((a,b)=>b[1]-a[1])[0]
    return { nouveaux, allergies, especesCount, top: top?.[0] || '—' }
  }, [patients, thisMonth])

  const especeDist = useMemo(() => {
    const map = patients.reduce((a,p) => { a[p.espece]=(a[p.espece]||0)+1; return a }, {})
    return Object.entries(map).sort((a,b)=>b[1]-a[1])
  }, [patients])

  // ── Filtres ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = patients.filter(p => {
      const q = search.toLowerCase()
      if (q && !p.nom?.toLowerCase().includes(q) && !p.proprio?.toLowerCase().includes(q) && !p.espece?.toLowerCase().includes(q) && !p.race?.toLowerCase().includes(q)) return false
      if (fEspece && p.espece !== fEspece) return false
      if (fAllergies === 'oui' && !p.allergies) return false
      if (fAllergies === 'non' && p.allergies)  return false
      return true
    })
    if (sortBy === 'recent') r = [...r].sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0))
    else if (sortBy === 'nom') r = [...r].sort((a,b) => a.nom.localeCompare(b.nom))
    else if (sortBy === 'espece') r = [...r].sort((a,b) => a.espece.localeCompare(b.espece))
    return r
  }, [patients, search, fEspece, fAllergies, sortBy])

  const activeFilters = [fEspece, fAllergies].filter(Boolean).length
  const resetFilters  = () => { setSearch(''); setFEspece(''); setFAllergies('') }
  const pagination    = usePagination(filtered)

  const clientSugg = form.proprio.length > 1
    ? clients.filter(c => c.nom.toLowerCase().includes(form.proprio.toLowerCase()))
    : []

  // ── Ajout ─────────────────────────────────────────────────────
  const doAdd = async () => {
    const checked = validatePatientForm(form)
    if (!checked.ok) { setFormErrors(checked.fieldErrors); setValMsgs(checked.messages); return }
    setSaving(true)
    try {
      const row = patientFormToRow(checked.data, newId())
      const saved = await dbInsert(sb, 'patients', row)
      setPatients([...patients, saved])
      if (logAction && sb) logAction(sb, user, 'patient_added', `${row.nom} (${row.espece})`)
      setForm(emptyForm()); setShowForm(false); setDups([]); setPending(false); setFormErrors({}); setValMsgs([])
    } catch (e) { alert('Erreur lors de la sauvegarde.') }
    finally { setSaving(false) }
  }

  const handleAdd = () => {
    const checked = validatePatientForm(form)
    if (!checked.ok) { setFormErrors(checked.fieldErrors); setValMsgs(checked.messages); return }
    const d = findDups(form.nom)
    if (d.length) { setDups(d); setPending(true) } else doAdd()
  }

  // ── Suppression ───────────────────────────────────────────────
  const handleDelete = async (p) => {
    if (!confirm(`Supprimer ${p.nom} ?`)) return
    try {
      await dbDelete(sb, 'patients', p.id)
      setPatients(patients.filter(x => x.id !== p.id))
      if (logAction && sb) logAction(sb, user, 'patient_deleted', p.nom)
      if (expandedId === p.id) setExpandedId(null)
    } catch (e) { alert(e?.message || 'Suppression impossible.') }
  }

  // ── Édition ───────────────────────────────────────────────────
  const startEdit = (p) => {
    setEditId(p.id)
    setEditForm({ nom:p.nom||'', espece:p.espece||'Chien', race:p.race||'', age:p.age||'', sexe:p.sexe||'M', proprio:p.proprio||'', tel:p.tel||'', poids:p.poids||'', couleur:p.couleur||'', allergies:p.allergies||'', antecedents:p.antecedents||'', photo:p.photo||'' })
    setExpandedId(p.id)
  }

  const saveEdit = async () => {
    if (!editForm.nom.trim()) return alert('Le nom est requis.')
    setSavingEdit(true)
    try {
      const updates = { nom:editForm.nom, espece:editForm.espece, race:editForm.race, age:editForm.age, sexe:editForm.sexe, proprio:editForm.proprio, tel:editForm.tel, poids:editForm.poids, couleur:editForm.couleur, allergies:editForm.allergies, antecedents:editForm.antecedents, photo:editForm.photo }
      await dbUpdate(sb, 'patients', editId, updates)
      setPatients(patients.map(p => p.id === editId ? { ...p, ...updates } : p))
      setEditId(null); setEditForm(null)
    } catch (e) { alert('Erreur : ' + (e?.message||e)) }
    finally { setSavingEdit(false) }
  }

  return (
    <div className="app-page space-y-5">

      {/* ── KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon:PawPrint,      label:'Total patients',      value: patients.length,    sub:`${kpis.especesCount} espèce(s)`,            color:'#0d9488' },
          { icon:Sparkles,      label:'Nouveaux ce mois',    value: kpis.nouveaux,      sub:`espèce principale: ${kpis.top}`,            color:'#2563eb' },
          { icon:AlertTriangle, label:'Avec allergies',      value: kpis.allergies,     sub:`${Math.round(kpis.allergies/Math.max(1,patients.length)*100)}% des patients`, color:'#dc2626' },
          { icon:BarChart3,     label:'Espèces distinctes',  value: kpis.especesCount,  sub:'espèces référencées',                       color:'#9333ea' },
        ].map((k,i) => (
          <div key={i} style={{ background:'white', borderRadius:16, padding:'14px 16px', border:'1px solid #f1f5f9', boxShadow:'0 1px 3px rgba(0,0,0,0.04),0 6px 20px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:34,height:34,borderRadius:10, background:k.color+'18', display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}><k.icon size={17} color={k.color} strokeWidth={2.2} /></div>
              <span style={{ fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em' }}>{k.label}</span>
            </div>
            <div style={{ fontSize:22,fontWeight:900,color:'#0f172a',lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:11,color:'#94a3b8',marginTop:4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Carte principale ─────────────────────────────────── */}
      <div className="app-card">

        {/* Header */}
        <div style={{ padding:'18px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div>
            <h2 style={{ fontSize:20,fontWeight:900,display:'flex',alignItems:'center',gap:8 }}><PawPrint size={20} color="#2563eb" strokeWidth={2.3} /> Patients</h2>
            <p style={{ fontSize:12,color:'#94a3b8',marginTop:2 }}>{filtered.length}/{patients.length} patient(s) affiché(s)</p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ border:'1.5px solid #e2e8f0',borderRadius:10,padding:'7px 10px',fontSize:12,fontWeight:700,color:'#64748b',outline:'none',background:'white' }}>
                <option value="recent">Plus récents</option>
                <option value="nom">Par nom</option>
                <option value="espece">Par espèce</option>
            </select>
            <Btn onClick={() => { setShowForm(!showForm); if(showForm){setForm(emptyForm());setFormErrors({});setValMsgs([])} }}>
              {showForm ? '✕ Annuler' : '+ Nouveau patient'}
            </Btn>
          </div>
        </div>

        {/* Distribution espèces (mini-bar) */}
        {especeDist.length > 0 && (
          <div style={{ padding:'10px 20px', borderBottom:'1px solid #f8fafc', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            {especeDist.map(([esp,nb]) => {
              const s = sp(esp)
              return (
                <button key={esp} onClick={() => setFEspece(fEspece===esp?'':esp)}
                  style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:99,fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .12s',
                    background: fEspece===esp ? s.bg : 'transparent',
                    border: `1.5px solid ${fEspece===esp ? s.border : '#e2e8f0'}`,
                    color: fEspece===esp ? s.text : '#64748b' }}>
                  {s.emoji} {esp} <span style={{ fontWeight:900, fontSize:12, marginLeft:2 }}>{nb}</span>
                </button>
              )
            })}
            {fEspece && (
              <button onClick={() => setFEspece('')}
                style={{ fontSize:11,fontWeight:700,color:'#94a3b8',background:'none',border:'none',cursor:'pointer',padding:'4px 6px' }}>✕ Tout</button>
            )}
          </div>
        )}

        {/* Formulaire nouveau patient */}
        {showForm && (
          <div style={{ background:'linear-gradient(135deg,#f0fdfa,#f5fffe)', borderBottom:'1px solid rgba(13,148,136,0.15)', padding:'20px 24px' }}>
            <h3 style={{ fontWeight:800,color:'#0f766e',fontSize:15,marginBottom:16,display:'flex',alignItems:'center',gap:8 }}>
              {sp(form.espece).emoji} Nouveau patient
            </h3>

            {pending && <DupWarning dups={dups} entity="patient" onOk={doAdd} onCancel={() => { setDups([]); setPending(false) }} />}
            <ValidationBanner messages={valMsgs} onDismiss={() => setValMsgs([])} />

            <FormSection label="Informations de l'animal" icon={<PawPrint size={14} />} color="teal" noTopMargin>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                <Field label="Nom *"   value={form.nom}    onChange={f('nom')}    error={formErrors.nom}    placeholder="Nom de l'animal" />
                <Field label="Espèce"  value={form.espece} onChange={f('espece')} error={formErrors.espece} options={ESPECES_LIST} />
                <Field label="Race"    value={form.race}   onChange={f('race')}   error={formErrors.race}   placeholder="Race" />
                <Field label="Âge"     value={form.age}    onChange={f('age')}    error={formErrors.age}    placeholder="ex: 3 ans" />
                <Field label="Sexe"    value={form.sexe}   onChange={f('sexe')}   error={formErrors.sexe}   options={['M – Mâle','F – Femelle']} />
                <Field label="Poids"   value={form.poids}  onChange={f('poids')}  error={formErrors.poids}  placeholder="ex: 12 kg" />
                <Field label="Couleur" value={form.couleur} onChange={f('couleur')} error={formErrors.couleur} placeholder="Couleur" />

                {/* Autocomplete propriétaire */}
                <div className="relative md:col-span-2">
                  <label style={{ fontSize:11,fontWeight:700,color:formErrors.proprio?'#dc2626':'#64748b',letterSpacing:'.06em',textTransform:'uppercase',display:'block',marginBottom:6 }}>
                    Propriétaire *
                  </label>
                  <input
                    style={{ border:`1.5px solid ${formErrors.proprio?'#f87171':'#e2e8f0'}`,borderRadius:12,padding:'10px 14px',fontSize:'13.5px',width:'100%',outline:'none',background:'white',transition:'border-color .18s,box-shadow .18s',color:'var(--app-text)' }}
                    onFocus={e=>{e.target.style.borderColor='#0d9488';e.target.style.boxShadow='0 0 0 3.5px rgba(13,148,136,0.14)'}}
                    onBlur={e=>{e.target.style.borderColor=formErrors.proprio?'#f87171':'#e2e8f0';e.target.style.boxShadow='none'}}
                    placeholder="Nom du propriétaire"
                    value={form.proprio}
                    onChange={f('proprio')}
                  />
                  {formErrors.proprio && <p style={{ fontSize:11,color:'#dc2626',marginTop:5,fontWeight:600 }}>⚠ {formErrors.proprio}</p>}
                  {clientSugg.length > 0 && (
                    <div style={{ position:'absolute',top:'100%',left:0,right:0,zIndex:20,background:'white',border:'1px solid #e2e8f0',borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,0.1)',marginTop:4 }}>
                      {clientSugg.map((c,i) => (
                        <div key={i} onClick={() => patchForm({ proprio:c.nom, tel:c.tel })}
                          style={{ padding:'10px 14px',cursor:'pointer',display:'flex',justifyContent:'space-between',fontSize:13,borderBottom:i<clientSugg.length-1?'1px solid #f1f5f9':'none' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#f0fdfa'}
                          onMouseLeave={e=>e.currentTarget.style.background='white'}>
                          <span style={{ fontWeight:600 }}>{c.nom}</span>
                          <span style={{ color:'#94a3b8' }}>{c.tel}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Field label="Téléphone" value={form.tel} onChange={f('tel')} error={formErrors.tel} placeholder="+228 XX XX XX XX" />
              </div>
            </FormSection>

            <FormSection label="Informations médicales" icon={<Stethoscope size={14} />} color="teal">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="⚠️ Allergies connues"    value={form.allergies}   onChange={f('allergies')}   error={formErrors.allergies}   placeholder="ex: Pénicilline…" />
                <Field label="Antécédents médicaux" value={form.antecedents} onChange={f('antecedents')} error={formErrors.antecedents} placeholder="ex: Stérilisation 2024…" />
                <Field label="Photo URL (optionnel)" value={form.photo}      onChange={f('photo')}       error={formErrors.photo}       placeholder="https://…" className="md:col-span-2" />
              </div>
            </FormSection>

            <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid rgba(13,148,136,0.12)' }}>
              <Btn onClick={handleAdd} disabled={saving}>{saving?'⏳ Enregistrement…':'✓ Enregistrer le patient'}</Btn>
            </div>
          </div>
        )}

        {/* Barre de recherche & filtres */}
        <div style={{ padding:'12px 20px', borderBottom:'1px solid #f8fafc', display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, propriétaire, espèce, race…"
            style={{ flex:'1 1 200px',minWidth:160,padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none' }} />
          <FilterBtns options={[{v:'oui',l:'⚠️ Avec allergies'},{v:'non',l:'✓ Sans allergies'}]} value={fAllergies} onChange={setFAllergies} colorFn={v=>v==='oui'?'red':'green'} />
          {activeFilters > 0 && (
            <button onClick={resetFilters} style={{ padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,fontWeight:700,background:'white',color:'#64748b',cursor:'pointer' }}>
              ✕ Effacer ({activeFilters})
            </button>
          )}
          <span style={{ fontSize:11,color:'#94a3b8',marginLeft:'auto' }}>{filtered.length}/{patients.length}</span>
        </div>

        {/* Liste des patients */}
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {pagination.pageItems.map(p => {
            const s = sp(p.espece)
            const vaccins = p.vaccins || []
            const prochainVaccin = vaccins.find(v => v.prochain && new Date(v.prochain) >= new Date())
            const isExp = expandedId === p.id
            const isEdit = editId === p.id

            return (
              <div key={p.id} style={{ borderRadius:14, border:`1.5px solid ${isExp?s.border:'#f1f5f9'}`, background: isExp?s.bg:'white', overflow:'hidden', transition:'all .18s' }}>

                {/* Ligne principale cliquable */}
                <button type="button" onClick={() => { setExpandedId(isExp?null:p.id); if(editId===p.id&&!isExp){setEditId(null);setEditForm(null)} }}
                  style={{ width:'100%',background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:'14px 16px',display:'flex',alignItems:'center',gap:12 }}>

                  {/* Avatar espèce */}
                  <div style={{ width:50,height:50,borderRadius:14,background:s.bg,border:`2px solid ${s.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0,transition:'all .15s' }}>
                    {p.photo
                      ? <img src={p.photo} alt={p.nom} style={{ width:'100%',height:'100%',borderRadius:12,objectFit:'cover' }} onError={e=>{e.target.style.display='none'}} />
                      : s.emoji}
                  </div>

                  {/* Infos principales */}
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:4 }}>
                      <span style={{ fontSize:15,fontWeight:800,color:'#0f172a' }}>{p.nom}</span>
                      <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:s.pill,color:s.text,border:`1px solid ${s.border}` }}>{p.espece}</span>
                      <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:'#f8fafc',color:'#64748b',border:'1px solid #e2e8f0' }}>{p.sexe==='M'?'♂ Mâle':'♀ Femelle'}</span>
                      {p.allergies && <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca' }}>Allergie</span>}
                      {prochainVaccin && <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0' }}>Vaccin J-{Math.round((new Date(prochainVaccin.prochain)-new Date())/86400000)}</span>}
                    </div>
                    <div style={{ fontSize:12,color:'#64748b',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
                      {p.race && <span style={{ fontWeight:600 }}>{p.race}</span>}
                      {p.age && <span>· {p.age}</span>}
                      {p.poids && <span>· {p.poids}</span>}
                      {p.couleur && <span>· {p.couleur}</span>}
                    </div>
                    <div style={{ fontSize:12,color:'#94a3b8',marginTop:2 }}>
                      {p.proprio || '—'}{p.tel ? ` · ${p.tel}` : ''}
                    </div>
                  </div>

                  {/* Actions rapides + chevron */}
                  <div style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }} onClick={e => e.stopPropagation()}>
                    {p.tel && (
                      <a href={`tel:${p.tel}`}
                        style={{ width:30,height:30,borderRadius:8,background:'#f0fdf4',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,textDecoration:'none',transition:'all .12s' }}
                        onMouseEnter={e=>{e.currentTarget.style.background='#dcfce7'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='#f0fdf4'}}>
                        <Phone size={13} color="#16a34a" strokeWidth={2.4} />
                      </a>
                    )}
                    <button onClick={() => startEdit(p)}
                      style={{ width:30,height:30,borderRadius:8,background:'#eff6ff',border:'1px solid #bfdbfe',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all .12s',color:'#2563eb' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#dbeafe'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#eff6ff'}}>
                      <Pencil size={14} strokeWidth={2.4} />
                    </button>
                    <button onClick={() => handleDelete(p)}
                      style={{ width:30,height:30,borderRadius:8,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all .12s',color:'#ef4444' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='#fee2e2'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='#fef2f2'}}>
                      <Trash2 size={14} strokeWidth={2.4} />
                    </button>
                    <span style={{ color:'#cbd5e1',fontSize:12,marginLeft:2 }}>{isExp?'▲':'▼'}</span>
                  </div>
                </button>

                {/* Section expandée */}
                {isExp && !isEdit && (
                  <div style={{ padding:'0 16px 16px', borderTop:`1px solid ${s.border}` }}>
                    <div style={{ paddingTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      {p.allergies && (
                        <div style={{ background:'#fef2f2',borderRadius:12,padding:'10px 14px',border:'1px solid #fecaca',gridColumn:'1/-1' }}>
                          <p style={{ fontSize:10,fontWeight:800,color:'#dc2626',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4 }}>⚠️ Allergies connues</p>
                          <p style={{ fontSize:13,color:'#991b1b',fontWeight:600 }}>{p.allergies}</p>
                        </div>
                      )}
                      {p.antecedents && (
                        <div style={{ background:'#f8fafc',borderRadius:12,padding:'10px 14px',border:'1px solid #f1f5f9',gridColumn:'1/-1' }}>
                          <p style={{ fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4 }}>Antécédents médicaux</p>
                          <p style={{ fontSize:13,color:'#475569' }}>{p.antecedents}</p>
                        </div>
                      )}
                      {p.created_at && (
                        <div style={{ background:'#f8fafc',borderRadius:12,padding:'10px 14px',border:'1px solid #f1f5f9' }}>
                          <p style={{ fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4 }}>Enregistré le</p>
                          <p style={{ fontSize:13,color:'#475569' }}>{new Date(p.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</p>
                        </div>
                      )}
                      {(p.poids||p.couleur) && (
                        <div style={{ background:'#f8fafc',borderRadius:12,padding:'10px 14px',border:'1px solid #f1f5f9' }}>
                          <p style={{ fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4 }}>Caractéristiques</p>
                          {p.poids   && <p style={{ fontSize:13,color:'#475569' }}>⚖️ Poids : <strong>{p.poids}</strong></p>}
                          {p.couleur && <p style={{ fontSize:13,color:'#475569' }}>Couleur : <strong>{p.couleur}</strong></p>}
                        </div>
                      )}
                    </div>
                    {vaccins.length > 0 && (
                      <div style={{ marginTop:10 }}>
                        <p style={{ fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8 }}>Vaccinations</p>
                        <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                          {vaccins.map((v,vi) => (
                            <span key={vi} style={{ fontSize:11,padding:'4px 10px',borderRadius:99,background:'#f0fdf4',color:'#166534',border:'1px solid #bbf7d0',fontWeight:600 }}>
                              {v.nom} · {v.date}{v.prochain?` (rappel: ${v.prochain})`:''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop:12 }}>
                      <button onClick={() => startEdit(p)}
                        style={{ padding:'7px 14px',borderRadius:10,background:s.bg,border:`1px solid ${s.border}`,color:s.text,fontSize:12,fontWeight:700,cursor:'pointer' }}>
                        ✏️ Modifier les informations
                      </button>
                    </div>
                  </div>
                )}

                {/* Formulaire d'édition inline */}
                {isEdit && (
                  <div style={{ padding:'14px 16px', borderTop:`1px solid ${s.border}`, background:'white' }}>
                    <h4 style={{ fontWeight:800,fontSize:13,color:s.text,marginBottom:12 }}>✏️ Modifier — {p.nom}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <Field label="Nom *"   value={editForm.nom}    onChange={ef('nom')}    placeholder="Nom" />
                      <Field label="Espèce"  value={editForm.espece} onChange={ef('espece')} options={ESPECES_LIST} />
                      <Field label="Race"    value={editForm.race}   onChange={ef('race')}   placeholder="Race" />
                      <Field label="Âge"     value={editForm.age}    onChange={ef('age')}    placeholder="ex: 3 ans" />
                      <Field label="Sexe"    value={editForm.sexe}   onChange={ef('sexe')}   options={['M – Mâle','F – Femelle']} />
                      <Field label="Poids"   value={editForm.poids}  onChange={ef('poids')}  placeholder="ex: 12 kg" />
                      <Field label="Couleur" value={editForm.couleur} onChange={ef('couleur')} placeholder="Couleur" />
                      <Field label="Propriétaire" value={editForm.proprio} onChange={ef('proprio')} placeholder="Propriétaire" />
                      <Field label="Téléphone"    value={editForm.tel}    onChange={ef('tel')}     placeholder="+228…" />
                      <Field label="⚠️ Allergies"  value={editForm.allergies}   onChange={ef('allergies')}   placeholder="Allergies…" className="md:col-span-2" />
                      <Field label="Antécédents" value={editForm.antecedents} onChange={ef('antecedents')} placeholder="Antécédents…" className="md:col-span-2" />
                    </div>
                    <div style={{ display:'flex',gap:8 }}>
                      <Btn color="brand" onClick={saveEdit} disabled={savingEdit}>{savingEdit?'⏳ Enregistrement…':'✓ Enregistrer'}</Btn>
                      <button onClick={() => { setEditId(null); setEditForm(null) }}
                        style={{ padding:'8px 14px',borderRadius:10,fontSize:12,fontWeight:700,background:'none',border:'none',color:'#64748b',cursor:'pointer' }}>Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {!filtered.length && (
            <EmptyState icon="🐾" title="Aucun patient trouvé" subtitle="Ajoutez le premier patient ou modifiez les filtres." />
          )}
        </div>

        <Pagination {...pagination} />
      </div>
    </div>
  )
}

export default Patients
