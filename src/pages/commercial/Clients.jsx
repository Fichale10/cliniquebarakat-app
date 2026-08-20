import { Users, Pencil, Trash2, PawPrint, Calendar, Phone, PhoneOff, Mail, MapPin } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Btn, Field, DupWarning, PrintBtn, ValidationBanner, FormPanel, Pagination, usePagination, EmptyState } from '../../components/ui'
import { dbInsert, dbUpdate, dbDelete, newId } from '../../lib/db'
import { validateClientForm, clientFormToRow } from '../../lib/validation'

const AVATAR_GRADIENTS = [
  ['#1d4ed8','#7c3aed'], ['#0d9488','#1d4ed8'], ['#16a34a','#0d9488'],
  ['#d97706','#dc2626'], ['#7c3aed','#db2777'], ['#0891b2','#1d4ed8'],
  ['#dc2626','#9333ea'], ['#ea580c','#d97706'], ['#166534','#0891b2'],
]
const avatarGradient = (nom) => {
  const idx = ((nom||'').charCodeAt(0) || 0) % AVATAR_GRADIENTS.length
  const [a, b] = AVATAR_GRADIENTS[idx]
  return `linear-gradient(135deg,${a},${b})`
}

function Clients({ clients, setClients, user, sb, logAction }) {
  const [search,   setSearch]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ nom:'', tel:'', email:'', adresse:'' })
  const [dups,     setDups]     = useState([])
  const [pending,  setPending]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [formErrors,         setFormErrors]         = useState({})
  const [validationMessages, setValidationMessages] = useState([])

  const [expandedId,   setExpandedId]   = useState(null)
  const [editId,       setEditId]       = useState(null)
  const [editForm,     setEditForm]     = useState({})
  const [savingEdit,   setSavingEdit]   = useState(false)
  const [confirmDel,   setConfirmDel]   = useState(null)

  const [sortBy,   setSortBy]   = useState('nom')
  const [filterLetter, setFilterLetter] = useState('')
  const [filterAnimal, setFilterAnimal] = useState(false)

  const patchForm = (patch) => {
    setForm(prev => ({...prev,...patch}))
    Object.keys(patch).forEach(k => setFormErrors(prev => { const n={...prev}; delete n[k]; return n }))
    if (validationMessages.length) setValidationMessages([])
  }
  const patchEdit = (patch) => setEditForm(prev => ({...prev,...patch}))

  const findDups = (nom) => {
    const q = String(nom||'').toLowerCase().trim()
    return clients.filter(c => String(c.nom||'').toLowerCase().trim()===q)
  }

  // ── Ajout ─────────────────────────────────────────────────────
  const doAdd = async () => {
    const checked = validateClientForm(form)
    if (!checked.ok) { setFormErrors(checked.fieldErrors); setValidationMessages(checked.messages); return }
    setSaving(true)
    try {
      const row = clientFormToRow(checked.data, newId())
      const saved = await dbInsert(sb, 'clients', row)
      setClients([...clients, saved])
      if (logAction&&sb) logAction(sb, user, 'client_added', row.nom)
      setForm({nom:'',tel:'',email:'',adresse:''}); setShowForm(false); setDups([]); setPending(false); setFormErrors({}); setValidationMessages([])
    } catch(e) { alert('Erreur lors de la sauvegarde.') }
    finally { setSaving(false) }
  }
  const handleAdd = () => {
    const checked = validateClientForm(form)
    if (!checked.ok) { setFormErrors(checked.fieldErrors); setValidationMessages(checked.messages); return }
    const d = findDups(form.nom)
    if (d.length) { setDups(d); setPending(true) } else doAdd()
  }

  // ── Édition inline ────────────────────────────────────────────
  const startEdit = (c) => {
    setEditId(c.id)
    setEditForm({ nom:c.nom||'', tel:c.tel||'', email:c.email||'', adresse:c.adresse||'' })
  }
  const saveEdit = async () => {
    if (!editForm.nom?.trim()) return
    setSavingEdit(true)
    try {
      await dbUpdate(sb, 'clients', editId, editForm)
      setClients(clients.map(c => c.id===editId ? {...c,...editForm} : c))
      if (logAction&&sb) logAction(sb, user, 'client_updated', editForm.nom)
      setEditId(null)
    } catch(e) { alert('Erreur lors de la modification.') }
    finally { setSavingEdit(false) }
  }
  const cancelEdit = () => setEditId(null)

  // ── Suppression ───────────────────────────────────────────────
  const doDelete = async (id) => {
    const c = clients.find(x => x.id===id)
    setClients(clients.filter(x => x.id!==id)); setConfirmDel(null); setExpandedId(null)
    try {
      await dbDelete(sb, 'clients', id)
      if (logAction&&sb) logAction(sb, user, 'client_deleted', c?.nom||id)
    } catch(e) {
      setClients(prev => c&&!prev.some(x=>x.id===c.id)?[...prev,c]:prev)
      alert(e?.message||'Suppression impossible — client restauré.')
    }
  }

  // ── KPIs ─────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const now = new Date()
    const ceMois = clients.filter(c => {
      if (!c.created_at) return false
      const d = new Date(c.created_at)
      return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear()
    }).length
    const avecAnimaux = clients.filter(c => (c.animaux||0) > 0).length
    const sansTel     = clients.filter(c => !c.tel).length
    return { total:clients.length, ceMois, avecAnimaux, sansTel }
  }, [clients])

  // ── Lettres disponibles ───────────────────────────────────────
  const letters = useMemo(() => {
    const s = new Set(clients.map(c => (c.nom||'').charAt(0).toUpperCase()).filter(Boolean))
    return [...s].sort()
  }, [clients])

  // ── Filtrage + tri ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = clients.filter(c => {
      const q = search.toLowerCase()
      if (q && !String(c.nom||'').toLowerCase().includes(q) && !(c.tel||'').includes(q) && !String(c.adresse||'').toLowerCase().includes(q) && !String(c.email||'').toLowerCase().includes(q)) return false
      if (filterLetter && (c.nom||'').charAt(0).toUpperCase()!==filterLetter) return false
      if (filterAnimal && !(c.animaux > 0)) return false
      return true
    })
    return [...r].sort((a,b) => {
      if (sortBy==='recent') return new Date(b.created_at||0)-new Date(a.created_at||0)
      if (sortBy==='animaux') return (b.animaux||0)-(a.animaux||0)
      return String(a.nom||'').localeCompare(String(b.nom||''),'fr',{sensitivity:'base'})
    })
  }, [clients, search, filterLetter, filterAnimal, sortBy])

  const activeFilters = [filterLetter, filterAnimal].filter(Boolean).length
  const resetFilters  = () => { setSearch(''); setFilterLetter(''); setFilterAnimal(false) }

  const pagination = usePagination(filtered)

  return (
    <div id="clients-print" className="app-page space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon:Users, label:'Total clients',    value:kpis.total,       sub:'enregistrés',                  color:'#0d9488' },
          { icon:PawPrint, label:'Avec animaux',     value:kpis.avecAnimaux, sub:`${Math.round(kpis.avecAnimaux/Math.max(1,kpis.total)*100)}% de la clientèle`, color:'#16a34a' },
          { icon:Calendar, label:'Nouveaux ce mois', value:kpis.ceMois,      sub:'ce mois-ci',                   color:'#7c3aed' },
          { icon:PhoneOff, label:'Sans téléphone',   value:kpis.sansTel,     sub:'à compléter',                  color:'#d97706' },
        ].map((k,i) => (
          <div key={i} style={{ background:'white',borderRadius:16,padding:'14px 16px',border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,0.04),0 6px 20px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
              <div style={{ width:34,height:34,borderRadius:10,background:k.color+'18',display:'flex',alignItems:'center',justifyContent:'center' }}><k.icon size={16} color={k.color} strokeWidth={2.3} /></div>
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
            <h2 style={{ fontSize:20,fontWeight:900,display:'flex',alignItems:'center',gap:8 }}><Users size={20} color="#ea580c" strokeWidth={2.3} /> Clients</h2>
            <p style={{ fontSize:12,color:'#94a3b8',marginTop:2 }}>
              {filtered.length}/{clients.length} client(s)
            </p>
          </div>
          <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
              style={{ border:'1.5px solid #e2e8f0',borderRadius:10,padding:'7px 10px',fontSize:12,fontWeight:700,color:'#64748b',outline:'none',background:'white' }}>
                <option value="nom">Nom A→Z</option>
                <option value="recent">Plus récents</option>
                <option value="animaux">Plus d'animaux</option>
            </select>
            <PrintBtn zoneId="clients-print" label="Imprimer" />
            <Btn onClick={() => setShowForm(!showForm)}>{showForm ? '✕ Annuler' : '+ Nouveau client'}</Btn>
          </div>
        </div>

        {/* Formulaire ajout */}
        {showForm && (
          <FormPanel icon="👥" title="Nouveau client" subtitle="Remplissez les coordonnées du client" color="green" onClose={() => setShowForm(false)}>
            {pending && <DupWarning dups={dups} entity="client" onOk={doAdd} onCancel={() => { setDups([]); setPending(false) }} />}
            <ValidationBanner messages={validationMessages} onDismiss={() => setValidationMessages([])} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l:'Nom complet *',   k:'nom',     ph:'Nom et prénom',       type:'text' },
                { l:'Téléphone',       k:'tel',     ph:'+228 XX XX XX XX',    type:'tel' },
                { l:'Email',           k:'email',   ph:'email@domaine.com',   type:'email' },
                { l:'Adresse / Ville', k:'adresse', ph:'Ex: Lomé, Bè',        type:'text' },
              ].map(fi => (
                <Field key={fi.k} label={fi.l} value={form[fi.k]} onChange={e => patchForm({[fi.k]:e.target.value})} error={formErrors[fi.k]} placeholder={fi.ph} type={fi.type} />
              ))}
            </div>
            <div style={{ marginTop:14 }}>
              <Btn onClick={handleAdd} disabled={saving}>{saving ? 'Enregistrement…' : '✓ Enregistrer le client'}</Btn>
            </div>
          </FormPanel>
        )}

        {/* Chips alphabet */}
        {letters.length > 0 && (
          <div style={{ padding:'10px 20px',borderBottom:'1px solid #f8fafc',display:'flex',alignItems:'center',gap:5,flexWrap:'wrap' }}>
            <span style={{ fontSize:10,fontWeight:700,color:'#94a3b8',marginRight:2 }}>A–Z</span>
            {letters.map(l => (
              <button key={l} onClick={() => setFilterLetter(filterLetter===l?'':l)}
                style={{ width:26,height:26,borderRadius:8,fontSize:11,fontWeight:800,border:`1.5px solid ${filterLetter===l?'#0d9488':'#e2e8f0'}`,
                  background:filterLetter===l?'#f0fdfa':'white',color:filterLetter===l?'#0d9488':'#64748b',cursor:'pointer',transition:'all .1s' }}>
                {l}
              </button>
            ))}
            {filterLetter && (
              <button onClick={() => setFilterLetter('')}
                style={{ fontSize:11,color:'#94a3b8',background:'none',border:'none',cursor:'pointer',fontWeight:700 }}>✕</button>
            )}
          </div>
        )}

        {/* Barre recherche + filtres */}
        <div style={{ padding:'12px 20px',borderBottom:'1px solid #f8fafc',display:'flex',flexWrap:'wrap',gap:8,alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nom, téléphone, adresse, email…"
            style={{ flex:'1 1 200px',padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none' }} />
          <button onClick={() => setFilterAnimal(v=>!v)}
            style={{ padding:'8px 14px',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .12s',
              border:`1.5px solid ${filterAnimal?'#16a34a':'#e2e8f0'}`,
              background:filterAnimal?'#f0fdf4':'white',
              color:filterAnimal?'#16a34a':'#64748b' }}>
            Avec animaux {filterAnimal && `(${kpis.avecAnimaux})`}
          </button>
          {(activeFilters > 0 || search) && (
            <button onClick={resetFilters}
              style={{ padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,fontWeight:700,background:'white',color:'#64748b',cursor:'pointer' }}>
              ✕ Effacer
            </button>
          )}
          <span style={{ fontSize:11,color:'#94a3b8',marginLeft:'auto' }}>{filtered.length} résultat(s)</span>
        </div>

        {/* Grille clients */}
        <div style={{ padding:16,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12 }}>
          {pagination.pageItems.map(c => {
            const isExpanded = expandedId===c.id
            const isEditing  = editId===c.id
            const initials   = (c.nom||'?').substring(0,2).toUpperCase()
            const gradient   = avatarGradient(c.nom)
            return (
              <div key={c.id}
                style={{ borderRadius:16,border:`1.5px solid ${isExpanded?'#a7f3d0':'#f1f5f9'}`,background:'white',overflow:'hidden',
                  boxShadow:isExpanded?'0 4px 20px rgba(13,148,136,0.1)':'0 1px 3px rgba(0,0,0,0.04)',
                  transition:'all .15s' }}>

                {/* Bande supérieure colorée */}
                <div style={{ height:5,background:gradient }} />

                <div style={{ padding:'14px 16px' }}>
                  {/* En-tête carte */}
                  <div style={{ display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer' }}
                    onClick={() => { setExpandedId(isExpanded?null:c.id); if(isEditing) setEditId(null) }}>
                    {/* Avatar */}
                    <div style={{ width:44,height:44,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',
                      fontWeight:900,color:'white',fontSize:15,flexShrink:0,background:gradient }}>
                      {initials}
                    </div>
                    {/* Infos */}
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ fontWeight:800,fontSize:14,color:'#0f172a',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.nom}</p>
                      {c.tel && (
                        <a href={`tel:${c.tel}`} onClick={e=>e.stopPropagation()}
                          style={{ fontSize:12,color:'#0d9488',fontWeight:600,display:'flex',alignItems:'center',gap:4,textDecoration:'none',marginBottom:2 }}>
                          <Phone size={11} strokeWidth={2.4} /> {c.tel}
                        </a>
                      )}
                      {!c.tel && <p style={{ fontSize:12,color:'#e2e8f0',fontStyle:'italic' }}>Pas de téléphone</p>}
                      {c.adresse && <p style={{ fontSize:11,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.adresse}</p>}
                    </div>
                    {/* Badges droite */}
                    <div style={{ flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5 }}>
                      {(c.animaux > 0) ? (
                        <span style={{ fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:99,background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#16a34a',display:'inline-flex',alignItems:'center',gap:4 }}>
                          <PawPrint size={10} strokeWidth={2.5} /> {c.animaux}
                        </span>
                      ) : (
                        <span style={{ fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:99,background:'#f8fafc',border:'1px solid #e2e8f0',color:'#cbd5e1' }}>
                          0 animal
                        </span>
                      )}
                      <span style={{ fontSize:10,color:'#cbd5e1' }}>{isExpanded?'▲':'▼'}</span>
                    </div>
                  </div>

                  {/* Détail expandé */}
                  {isExpanded && !isEditing && (
                    <div style={{ marginTop:14,paddingTop:14,borderTop:'1px solid #f1f5f9' }}>
                      {/* Infos complètes */}
                      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14 }}>
                        {[
                          { icon:Mail, label:'Email',        value:c.email   || '—' },
                          { icon:MapPin, label:'Adresse',      value:c.adresse || '—' },
                          { icon:PawPrint, label:'Animaux',      value:c.animaux > 0 ? `${c.animaux} animal(ux)` : 'Aucun' },
                          { icon:Calendar, label:'Inscrit(e) le', value:c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '—' },
                        ].map((info,i) => (
                          <div key={i} style={{ background:'#f8fafc',borderRadius:10,padding:'8px 10px' }}>
                            <p style={{ fontSize:9,fontWeight:700,color:'#94a3b8',marginBottom:3,textTransform:'uppercase' }}>{info.label}</p>
                            <p style={{ fontSize:12,color:'#475569',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:5 }}><info.icon size={11} color="#94a3b8" strokeWidth={2.3} /> {info.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                        {c.tel && (
                          <a href={`tel:${c.tel}`}
                            style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:10,fontSize:12,fontWeight:700,
                              background:'#f0fdfa',border:'1px solid #99f6e4',color:'#0d9488',textDecoration:'none' }}>
                            <Phone size={12} strokeWidth={2.4} /> Appeler
                          </a>
                        )}
                        {c.email && (
                          <a href={`mailto:${c.email}`}
                            style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:10,fontSize:12,fontWeight:700,
                              background:'#eff6ff',border:'1px solid #bfdbfe',color:'#2563eb',textDecoration:'none' }}>
                            <Mail size={12} strokeWidth={2.4} /> Email
                          </a>
                        )}
                        <button onClick={()=>startEdit(c)}
                          style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',
                            background:'#fffbeb',border:'1px solid #fde68a',color:'#d97706' }}>
                          <Pencil size={12} strokeWidth={2.4} /> Modifier
                        </button>
                        <button onClick={()=>setConfirmDel(confirmDel===c.id?null:c.id)}
                          style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',
                            background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',marginLeft:'auto' }}>
                          <Trash2 size={12} strokeWidth={2.4} /> Supprimer
                        </button>
                      </div>

                      {/* Confirmation suppression */}
                      {confirmDel===c.id && (
                        <div style={{ marginTop:10,padding:'10px 14px',borderRadius:12,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10 }}>
                          <p style={{ fontSize:13,color:'#dc2626',fontWeight:700 }}>Supprimer <strong>{c.nom}</strong> ?</p>
                          <div style={{ display:'flex',gap:6,flexShrink:0 }}>
                            <button onClick={()=>doDelete(c.id)}
                              style={{ padding:'6px 12px',background:'#dc2626',color:'white',border:'none',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer' }}>Confirmer</button>
                            <button onClick={()=>setConfirmDel(null)}
                              style={{ padding:'6px 10px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer' }}>Annuler</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Formulaire d'édition inline */}
                  {isExpanded && isEditing && (
                    <div style={{ marginTop:14,paddingTop:14,borderTop:'1px solid #f1f5f9' }}>
                      <p style={{ fontSize:12,fontWeight:800,color:'#d97706',marginBottom:12,display:'flex',alignItems:'center',gap:6 }}><Pencil size={12} strokeWidth={2.4} /> Modifier les informations</p>
                      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
                        {[
                          { l:'Nom complet *', k:'nom',     ph:'Nom et prénom',    type:'text' },
                          { l:'Téléphone',     k:'tel',     ph:'+228 XX XX XX XX', type:'tel' },
                          { l:'Email',         k:'email',   ph:'email@ex.com',     type:'email' },
                          { l:'Adresse',       k:'adresse', ph:'Lomé, Bè…',        type:'text' },
                        ].map(fi => (
                          <div key={fi.k}>
                            <label style={{ fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:5 }}>{fi.l}</label>
                            <input type={fi.type} value={editForm[fi.k]||''} onChange={e=>patchEdit({[fi.k]:e.target.value})} placeholder={fi.ph}
                              style={{ width:'100%',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'8px 10px',fontSize:13,outline:'none',background:'white',boxSizing:'border-box' }}
                              onFocus={e=>{e.target.style.borderColor='#d97706';e.target.style.boxShadow='0 0 0 3px rgba(217,119,6,0.1)'}}
                              onBlur={e=>{e.target.style.borderColor='#e2e8f0';e.target.style.boxShadow='none'}} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display:'flex',gap:8 }}>
                        <button onClick={saveEdit} disabled={savingEdit||!editForm.nom?.trim()}
                          style={{ padding:'8px 16px',background:'#d97706',color:'white',border:'none',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',opacity:savingEdit?0.6:1 }}>
                          {savingEdit?'Enregistrement…':'✓ Enregistrer'}
                        </button>
                        <button onClick={cancelEdit}
                          style={{ padding:'8px 12px',background:'none',border:'none',color:'#94a3b8',fontSize:12,fontWeight:700,cursor:'pointer' }}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {!filtered.length && (
            <div style={{ gridColumn:'1/-1' }}>
              <EmptyState icon="👥" title="Aucun client trouvé" subtitle="Ajoutez votre premier client ou affinez votre recherche." />
            </div>
          )}
        </div>

        <Pagination {...pagination} />
      </div>
    </div>
  )
}

export default Clients
