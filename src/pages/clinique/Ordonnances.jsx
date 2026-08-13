import { FileText, Printer, Trash2 } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Btn, FilterBar, FilterSelect, usePagination, Pagination, EmptyState, AutoSuggest } from '../../components/ui'
import { newId } from '../../lib/db'
import { printZone } from '../../lib/utils'

const today = () => new Date().toISOString().split('T')[0]
const EMPTY_LIGNE = { med:'', dose:'', duree:'', qte:'' }
const EMPTY_FORM  = { patient:'', proprio:'', espece:'', lignes:[{ ...EMPTY_LIGNE }], note:'', veterinaire:'' }

const ESPECE_COLORS = {
  'Chien':    { bg:'#f0fdf4', border:'#bbf7d0', text:'#16a34a', dot:'#16a34a' },
  'Chat':     { bg:'#eff6ff', border:'#bfdbfe', text:'#2563eb', dot:'#2563eb' },
  'Bovin':    { bg:'#fffbeb', border:'#fde68a', text:'#d97706', dot:'#d97706' },
  'Caprin':   { bg:'#fff7ed', border:'#fed7aa', text:'#ea580c', dot:'#ea580c' },
  'Ovin':     { bg:'#faf5ff', border:'#e9d5ff', text:'#9333ea', dot:'#9333ea' },
  'Volaille': { bg:'#fefce8', border:'#fef08a', text:'#ca8a04', dot:'#ca8a04' },
}
const especeColor = (e) => ESPECE_COLORS[e] || { bg:'#f8fafc', border:'#e2e8f0', text:'#64748b', dot:'#94a3b8' }

// ── Template impression ───────────────────────────────────────
function OrdPrint({ o }) {
  if (!o) return null
  return (
    <div id="ord-print" className="hidden">
      <div style={{ fontFamily:'Georgia,serif',padding:'32px 40px',maxWidth:'680px',margin:'0 auto',background:'white',color:'#111' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,paddingBottom:16,borderBottom:'3px solid #0d9488' }}>
          <div style={{ display:'flex',alignItems:'center',gap:14 }}>
            <div style={{ width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#0d9488,#14b8a6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28 }}>🐾</div>
            <div>
              <div style={{ fontFamily:'Outfit,sans-serif',fontWeight:900,fontSize:18,color:'#0d9488',letterSpacing:1 }}>LA BARAKAT</div>
              <div style={{ fontSize:11,color:'#64748b',marginTop:2 }}>Pharmacie & Clinique Vétérinaire</div>
              <div style={{ fontSize:11,color:'#64748b' }}>Lomé, Togo</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'Outfit,sans-serif',fontWeight:900,fontSize:16,color:'#0f766e',letterSpacing:2,textTransform:'uppercase' }}>Ordonnance</div>
            <div style={{ fontSize:12,color:'#64748b',marginTop:4 }}>N° {String(o.id).slice(0,8).toUpperCase()}</div>
            <div style={{ fontSize:12,color:'#64748b' }}>{o.date}</div>
            <div style={{ marginTop:8,padding:'4px 8px',background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:6,fontSize:11,fontWeight:600,color:'#0d9488',textAlign:'center' }}>ORIGINAL</div>
          </div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20,padding:14,background:'#f8fafc',borderRadius:10,border:'1px solid #e2e8f0' }}>
          <div><span style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em' }}>Patient</span><div style={{ fontWeight:700,fontSize:14,marginTop:2 }}>{o.patient}</div></div>
          <div><span style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em' }}>Espèce</span><div style={{ fontWeight:700,fontSize:14,marginTop:2 }}>{o.espece||'—'}</div></div>
          <div><span style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em' }}>Propriétaire</span><div style={{ fontSize:13,marginTop:2 }}>{o.proprio}</div></div>
          <div><span style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em' }}>Date</span><div style={{ fontSize:13,marginTop:2 }}>{o.date}</div></div>
        </div>
        <table style={{ width:'100%',borderCollapse:'collapse',marginBottom:20 }}>
          <thead>
            <tr style={{ background:'#f0fdfa',borderTop:'2px solid #0d9488',borderBottom:'2px solid #0d9488' }}>
              {['Médicament','Posologie','Durée','Qté'].map(h=>(
                <th key={h} style={{ padding:'8px 10px',textAlign:'left',fontSize:11,fontWeight:700,color:'#0d9488',textTransform:'uppercase',letterSpacing:'.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(o.lignes||[]).map((l,i)=>(
              <tr key={i} style={{ borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafbfc' }}>
                <td style={{ padding:'10px',fontSize:13,fontWeight:600 }}>💊 {l.med}</td>
                <td style={{ padding:'10px',fontSize:12,color:'#374151' }}>{l.dose}</td>
                <td style={{ padding:'10px',fontSize:12,color:'#374151' }}>{l.duree}</td>
                <td style={{ padding:'10px',fontSize:12,fontWeight:600,color:'#0d9488',fontFamily:'monospace' }}>{l.qte}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {o.note && (
          <div style={{ padding:'12px 14px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,marginBottom:20 }}>
            <div style={{ fontSize:11,fontWeight:700,color:'#92400e',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em' }}>Observations</div>
            <div style={{ fontSize:13,color:'#374151' }}>{o.note}</div>
          </div>
        )}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginTop:32,paddingTop:16,borderTop:'2px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize:11,color:'#64748b',marginBottom:4 }}>Prescrit par</div>
            <div style={{ fontWeight:700,fontSize:13,color:'#0d9488' }}>{o.veterinaire||'Dr. Vétérinaire'}</div>
            <div style={{ marginTop:40,borderTop:'1px solid #cbd5e1',paddingTop:4,width:180,fontSize:10,color:'#94a3b8',textAlign:'center' }}>Signature & Cachet</div>
          </div>
          <div style={{ textAlign:'right',fontSize:10,color:'#94a3b8',lineHeight:1.6 }}>
            <div>Valable 3 mois à compter de la date de délivrance</div>
            <div>Non remboursable · Usage vétérinaire uniquement</div>
            <div style={{ marginTop:4,fontStyle:'italic' }}>La Barakat · Lomé, Togo</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────
function Ordonnances({ patients, meds, ordonnances = [], setOrdonnances, sb, dbInsert, dbDelete, user, logAction }) {
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [patSugg,    setPatSugg]    = useState([])
  const [saving,     setSaving]     = useState(false)
  const [printOrd,   setPrintOrd]   = useState(null)
  const [search,     setSearch]     = useState('')
  const [fEspece,    setFEspece]    = useState('')
  const [sortBy,     setSortBy]     = useState('date_desc')
  const [confirmDel, setConfirmDel] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const pf = (k) => (e) => setForm(p => ({...p,[k]:e.target.value}))
  const updLigne = (i,k,v) => setForm(p => { const l=[...p.lignes]; l[i]={...l[i],[k]:v}; return {...p,lignes:l} })
  const addLigne = () => setForm(p => ({...p,lignes:[...p.lignes,{...EMPTY_LIGNE}]}))
  const remLigne = (i) => setForm(p => ({...p,lignes:p.lignes.filter((_,j)=>j!==i)}))

  // ── KPIs ─────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const moisStr = new Date().toISOString().slice(0,7)
    const ceMois  = ordonnances.filter(o=>o.date?.startsWith(moisStr)).length
    const totalLignes = ordonnances.reduce((s,o)=>(s+(o.lignes||[]).filter(l=>l.med).length),0)
    const especes = new Set(ordonnances.map(o=>o.espece).filter(Boolean)).size
    return { total:ordonnances.length, ceMois, totalLignes, especes }
  }, [ordonnances])

  // ── Top médicaments prescrits ─────────────────────────────────
  const topMeds = useMemo(() => {
    const freq = {}
    ordonnances.forEach(o=>(o.lignes||[]).forEach(l=>{ if(l.med) freq[l.med]=(freq[l.med]||0)+1 }))
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5)
  }, [ordonnances])

  // ── Filtrage + tri ────────────────────────────────────────────
  const especes = useMemo(() => [...new Set(ordonnances.map(o=>o.espece).filter(Boolean))], [ordonnances])

  const filtered = useMemo(() => {
    let r = ordonnances.filter(o => {
      const q = search.toLowerCase()
      if (q && !o.patient.toLowerCase().includes(q) && !o.proprio.toLowerCase().includes(q) && !JSON.stringify(o.lignes||[]).toLowerCase().includes(q)) return false
      if (fEspece && o.espece!==fEspece) return false
      return true
    })
    return [...r].sort((a,b)=>{
      if (sortBy==='date_asc')  return (a.date||'').localeCompare(b.date||'')
      if (sortBy==='patient')   return String(a.patient||'').localeCompare(String(b.patient||''))
      if (sortBy==='nb_meds')   return (b.lignes||[]).length-(a.lignes||[]).length
      return (b.date||'').localeCompare(a.date||'')
    })
  }, [ordonnances, search, fEspece, sortBy])

  const pagination = usePagination(filtered, 10)

  // ── Création ─────────────────────────────────────────────────
  const addOrd = async () => {
    if (!form.patient.trim()) return alert('Patient requis')
    if (form.lignes.every(l=>!l.med.trim())) return alert('Ajoutez au moins un médicament')
    setSaving(true)
    try {
      const row = {...form, id:newId(), date:today(), lignes:form.lignes.filter(l=>l.med.trim())}
      const saved = await dbInsert(sb,'ordonnances',row)
      setOrdonnances([saved,...ordonnances])
      if (logAction) logAction(sb,user,'ordonnance_created',`${form.patient} — ${row.lignes.length} médicament(s)`)
      setForm(EMPTY_FORM); setShowForm(false)
    } catch(e) { alert('Erreur : '+(e?.message||e)) }
    finally { setSaving(false) }
  }

  const deleteOrd = async (id) => {
    try {
      await dbDelete(sb,'ordonnances',id)
      setOrdonnances(ordonnances.filter(o=>o.id!==id))
      setConfirmDel(null); setExpandedId(null)
    } catch(e) { alert('Erreur suppression : '+(e?.message||e)) }
  }

  const handlePrint = (o) => {
    setPrintOrd(o)
    setTimeout(() => {
      const el = document.getElementById('ord-print')
      if (!el) return
      el.classList.remove('hidden')
      setTimeout(() => { printZone('ord-print'); el.classList.add('hidden') }, 100)
    }, 50)
  }

  // ── Rendu ─────────────────────────────────────────────────────
  return (
    <div className="app-page space-y-5">
      {printOrd && <OrdPrint o={printOrd} />}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon:'📝', label:'Total ordonnances',    value:kpis.total,       sub:`${kpis.ceMois} ce mois-ci`,              color:'#0d9488' },
          { icon:'💊', label:'Médicaments prescrits', value:kpis.totalLignes, sub:`moyenne ${(kpis.totalLignes/Math.max(1,kpis.total)).toFixed(1)} / ordonnance`, color:'#2563eb' },
          { icon:'🐾', label:'Espèces traitées',     value:kpis.especes,     sub:'espèces différentes',                    color:'#9333ea' },
          { icon:'📅', label:'Ce mois',              value:kpis.ceMois,      sub:new Date().toLocaleString('fr-FR',{month:'long',year:'numeric'}), color:'#16a34a' },
        ].map((k,i) => (
          <div key={i} style={{ background:'white',borderRadius:16,padding:'14px 16px',border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,0.04),0 6px 20px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
              <div style={{ width:34,height:34,borderRadius:10,background:k.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>{k.icon}</div>
              <span style={{ fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em' }}>{k.label}</span>
            </div>
            <div style={{ fontSize:22,fontWeight:900,color:'#0f172a',lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:11,color:'#94a3b8',marginTop:4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Top médicaments prescrits */}
      {topMeds.length > 0 && (
        <div style={{ background:'white',borderRadius:16,padding:'16px 20px',border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize:12,fontWeight:800,color:'#64748b',marginBottom:12 }}>💊 Médicaments les plus prescrits</p>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
            {topMeds.map(([med,count],i) => (
              <div key={i} style={{ display:'flex',alignItems:'center',gap:7,padding:'7px 12px',borderRadius:12,background:'#f0fdfa',border:'1px solid #99f6e4' }}>
                <span style={{ fontSize:10,fontWeight:900,color:'#94a3b8' }}>#{i+1}</span>
                <span style={{ fontSize:13,fontWeight:700,color:'#0d9488' }}>💊 {med}</span>
                <span style={{ fontSize:11,fontWeight:900,padding:'1px 7px',borderRadius:99,background:'#0d9488',color:'white' }}>{count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="app-card">
        {/* Header */}
        <div style={{ padding:'18px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
          <div>
            <h2 style={{ fontSize:20,fontWeight:900,display:'flex',alignItems:'center',gap:8 }}><FileText size={20} color="#2563eb" strokeWidth={2.3} /> Ordonnances</h2>
            <p style={{ fontSize:12,color:'#94a3b8',marginTop:2 }}>{filtered.length}/{ordonnances.length} ordonnance(s)</p>
          </div>
          <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
              style={{ border:'1.5px solid #e2e8f0',borderRadius:10,padding:'7px 10px',fontSize:12,fontWeight:700,color:'#64748b',outline:'none',background:'white' }}>
              <option value="date_desc">📅 Plus récentes</option>
              <option value="date_asc">📅 Plus anciennes</option>
              <option value="patient">🐾 Patient A→Z</option>
              <option value="nb_meds">💊 + de médicaments</option>
            </select>
            <Btn onClick={() => setShowForm(v=>!v)}>{showForm ? '✕ Annuler' : '+ Nouvelle ordonnance'}</Btn>
          </div>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div style={{ background:'linear-gradient(135deg,#f0fdfa,#f5fffe)',borderBottom:'1px solid rgba(13,148,136,0.15)',padding:'20px 24px' }}>
            <h3 style={{ fontWeight:800,color:'#0f766e',fontSize:15,marginBottom:16,display:'flex',alignItems:'center',gap:8 }}>📝 Nouvelle ordonnance</h3>

            {/* Identification */}
            <div style={{ background:'white',borderRadius:14,padding:'16px',marginBottom:14,border:'1px solid #e2e8f0' }}>
              <p style={{ fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:10 }}>Patient & Identification</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:'#64748b',letterSpacing:'.05em',textTransform:'uppercase',display:'block',marginBottom:6 }}>Patient *</label>
                  <AutoSuggest value={form.patient}
                    onChange={e => { setForm(p=>({...p,patient:e.target.value})); setPatSugg(patients.filter(p=>p.nom.toLowerCase().includes(e.target.value.toLowerCase())).slice(0,6)) }}
                    list={patSugg}
                    onSelect={p => { setForm(f=>({...f,patient:p.nom,proprio:p.proprio,espece:p.espece})); setPatSugg([]) }}
                    placeholder="Nom de l'animal" />
                </div>
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:'#64748b',letterSpacing:'.05em',textTransform:'uppercase',display:'block',marginBottom:6 }}>Propriétaire</label>
                  <input style={{ border:'1.5px solid #e2e8f0',borderRadius:10,padding:'9px 12px',fontSize:13.5,width:'100%',outline:'none',fontFamily:'Outfit,sans-serif',boxSizing:'border-box' }}
                    value={form.proprio} onChange={pf('proprio')} placeholder="Propriétaire"
                    onFocus={e=>{e.target.style.borderColor='#0d9488';e.target.style.boxShadow='0 0 0 3px rgba(13,148,136,0.1)'}}
                    onBlur={e=>{e.target.style.borderColor='#e2e8f0';e.target.style.boxShadow='none'}} />
                </div>
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:'#64748b',letterSpacing:'.05em',textTransform:'uppercase',display:'block',marginBottom:6 }}>Espèce</label>
                  <input style={{ border:'1.5px solid #e2e8f0',borderRadius:10,padding:'9px 12px',fontSize:13.5,width:'100%',outline:'none',fontFamily:'Outfit,sans-serif',boxSizing:'border-box' }}
                    value={form.espece} onChange={pf('espece')} placeholder="ex: Chien, Chat…"
                    onFocus={e=>{e.target.style.borderColor='#0d9488';e.target.style.boxShadow='0 0 0 3px rgba(13,148,136,0.1)'}}
                    onBlur={e=>{e.target.style.borderColor='#e2e8f0';e.target.style.boxShadow='none'}} />
                </div>
              </div>
            </div>

            {/* Lignes médicaments */}
            <div style={{ background:'white',borderRadius:14,padding:'16px',marginBottom:14,border:'1px solid #e2e8f0' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
                <p style={{ fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em' }}>Médicaments prescrits *</p>
                <button onClick={addLigne}
                  style={{ fontSize:12,fontWeight:700,padding:'5px 12px',borderRadius:9,background:'#f0fdfa',border:'1px solid #99f6e4',color:'#0d9488',cursor:'pointer' }}>
                  + Ligne
                </button>
              </div>
              {/* En-têtes colonnes */}
              <div style={{ display:'grid',gap:8,marginBottom:6,padding:'0 2px',gridTemplateColumns:'2.5fr 2fr 1fr 70px 28px' }}>
                {['Médicament','Posologie','Durée','Qté',''].map((h,i) => (
                  <span key={i} style={{ fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em' }}>{h}</span>
                ))}
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                {form.lignes.map((l,i) => (
                  <div key={i} style={{ display:'grid',gap:8,alignItems:'center',gridTemplateColumns:'2.5fr 2fr 1fr 70px 28px',padding:'10px 10px',borderRadius:12,background:'#f8fffe',border:'1px solid #e0f7f5' }}>
                    <select style={{ border:'1.5px solid #e2e8f0',borderRadius:9,padding:'8px 10px',fontSize:13,outline:'none',fontFamily:'Outfit,sans-serif',background:'white' }}
                      value={l.med} onChange={e=>updLigne(i,'med',e.target.value)}>
                      <option value="">— Médicament —</option>
                      {meds.map(m => <option key={m.id} value={m.nom}>{m.nom}{m.stock<=m.seuil?' ⚠️':''}</option>)}
                      <option value="Autre">✏️ Autre</option>
                    </select>
                    <input style={{ border:'1.5px solid #e2e8f0',borderRadius:9,padding:'8px 10px',fontSize:13,outline:'none',fontFamily:'Outfit,sans-serif',background:'white' }}
                      placeholder="ex: 1 cp 2x/jour" value={l.dose} onChange={e=>updLigne(i,'dose',e.target.value)} />
                    <input style={{ border:'1.5px solid #e2e8f0',borderRadius:9,padding:'8px 10px',fontSize:13,outline:'none',fontFamily:'Outfit,sans-serif',background:'white' }}
                      placeholder="7j" value={l.duree} onChange={e=>updLigne(i,'duree',e.target.value)} />
                    <input type="number" min="1"
                      style={{ border:'1.5px solid #e2e8f0',borderRadius:9,padding:'8px 6px',fontSize:13,outline:'none',fontFamily:'Outfit,sans-serif',textAlign:'center',background:'white' }}
                      placeholder="1" value={l.qte} onChange={e=>updLigne(i,'qte',e.target.value)} />
                    {form.lignes.length > 1
                      ? <button onClick={()=>remLigne(i)} style={{ border:'none',background:'none',color:'#f87171',cursor:'pointer',fontSize:16,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
                      : <span />}
                  </div>
                ))}
              </div>
            </div>

            {/* Note + Vétérinaire */}
            <div style={{ background:'white',borderRadius:14,padding:'16px',marginBottom:16,border:'1px solid #e2e8f0' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:'#64748b',letterSpacing:'.05em',textTransform:'uppercase',display:'block',marginBottom:6 }}>Note / Conseils</label>
                  <textarea rows={3} style={{ border:'1.5px solid #e2e8f0',borderRadius:10,padding:'9px 12px',fontSize:13,width:'100%',outline:'none',resize:'vertical',fontFamily:'Outfit,sans-serif',boxSizing:'border-box' }}
                    placeholder="Conseils au propriétaire…" value={form.note} onChange={pf('note')}
                    onFocus={e=>{e.target.style.borderColor='#0d9488'}} onBlur={e=>{e.target.style.borderColor='#e2e8f0'}} />
                </div>
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:'#64748b',letterSpacing:'.05em',textTransform:'uppercase',display:'block',marginBottom:6 }}>Vétérinaire prescripteur</label>
                  <input style={{ border:'1.5px solid #e2e8f0',borderRadius:10,padding:'9px 12px',fontSize:13.5,width:'100%',outline:'none',fontFamily:'Outfit,sans-serif',boxSizing:'border-box' }}
                    placeholder="Dr. Nom Prénom" value={form.veterinaire} onChange={pf('veterinaire')}
                    onFocus={e=>{e.target.style.borderColor='#0d9488'}} onBlur={e=>{e.target.style.borderColor='#e2e8f0'}} />
                  <p style={{ fontSize:11,color:'#94a3b8',marginTop:8 }}>Apparaîtra sur l'ordonnance imprimée</p>
                </div>
              </div>
            </div>

            <Btn color="brand" onClick={addOrd} disabled={saving}>
              {saving ? '⏳ Enregistrement…' : "✓ Créer l'ordonnance"}
            </Btn>
          </div>
        )}

        {/* Chips espèces */}
        {especes.length > 0 && (
          <div style={{ padding:'10px 20px',borderBottom:'1px solid #f8fafc',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
            <span style={{ fontSize:10,fontWeight:700,color:'#94a3b8',marginRight:2 }}>ESPÈCE</span>
            {especes.map(esp => {
              const ec = especeColor(esp)
              const count = ordonnances.filter(o=>o.espece===esp).length
              return (
                <button key={esp} onClick={()=>setFEspece(fEspece===esp?'':esp)}
                  style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:99,fontSize:11,fontWeight:700,cursor:'pointer',transition:'all .12s',
                    background:fEspece===esp?ec.bg:'transparent',
                    border:`1.5px solid ${fEspece===esp?ec.border:'#e2e8f0'}`,
                    color:fEspece===esp?ec.text:'#64748b' }}>
                  {esp} <span style={{ fontWeight:900 }}>{count}</span>
                </button>
              )
            })}
            {fEspece && <button onClick={()=>setFEspece('')} style={{ fontSize:11,color:'#94a3b8',background:'none',border:'none',cursor:'pointer',fontWeight:700 }}>✕</button>}
          </div>
        )}

        {/* Filtres */}
        <FilterBar search={search} onSearch={setSearch} placeholder="🔍 Patient, propriétaire, médicament…"
          activeCount={[fEspece,search].filter(Boolean).length}
          onReset={()=>{ setSearch(''); setFEspece('') }}>
          <FilterSelect label="🐾 Espèce" value={fEspece} onChange={setFEspece} options={especes.map(e=>({v:e,l:e}))} />
          <span style={{ fontSize:11,color:'#94a3b8',marginLeft:'auto' }}>{filtered.length}/{ordonnances.length}</span>
        </FilterBar>

        {/* Liste ordonnances */}
        <div style={{ padding:'12px 16px',display:'flex',flexDirection:'column',gap:10 }}>
          {pagination.pageItems.map(o => {
            const ec = especeColor(o.espece)
            const isExp = expandedId===o.id
            const nbMeds = (o.lignes||[]).filter(l=>l.med).length
            return (
              <div key={o.id}
                style={{ borderRadius:16,border:'1.5px solid #f1f5f9',background:'white',overflow:'hidden',
                  boxShadow:isExp?'0 4px 20px rgba(13,148,136,0.08)':'0 1px 3px rgba(0,0,0,0.04)',
                  borderLeft:`4px solid ${ec.dot}`,transition:'all .15s' }}>

                {/* En-tête cliquable */}
                <div style={{ padding:'14px 16px',display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer' }}
                  onClick={()=>setExpandedId(isExp?null:o.id)}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>

                  {/* Date */}
                  <div style={{ flexShrink:0,width:46,height:46,borderRadius:12,background:ec.bg,border:`1px solid ${ec.border}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
                    <span style={{ fontSize:14,fontWeight:900,color:ec.dot,lineHeight:1.1 }}>{o.date?.split('-')[2]}</span>
                    <span style={{ fontSize:8,color:ec.text,fontWeight:700,lineHeight:1.2 }}>{['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][parseInt(o.date?.split('-')[1]||1)-1]}</span>
                    <span style={{ fontSize:8,color:'#94a3b8',lineHeight:1.1 }}>{o.date?.split('-')[0]}</span>
                  </div>

                  {/* Infos */}
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:5 }}>
                      <span style={{ fontSize:14,fontWeight:800,color:'#0f172a' }}>🐾 {o.patient}</span>
                      <span style={{ fontSize:12,color:'#64748b' }}>· {o.proprio}</span>
                      {o.espece && (
                        <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:ec.bg,border:`1px solid ${ec.border}`,color:ec.text }}>{o.espece}</span>
                      )}
                      <span style={{ fontSize:10,fontFamily:'monospace',color:'#94a3b8' }}>ORD-{String(o.id).slice(0,8).toUpperCase()}</span>
                    </div>
                    {/* Preview médicaments */}
                    <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
                      {(o.lignes||[]).filter(l=>l.med).slice(0,3).map((l,i) => (
                        <span key={i} style={{ fontSize:11,padding:'3px 8px',borderRadius:8,background:'#f0fdfa',border:'1px solid #99f6e4',color:'#0d9488',fontWeight:600 }}>
                          💊 {l.med}
                        </span>
                      ))}
                      {nbMeds > 3 && <span style={{ fontSize:11,padding:'3px 8px',borderRadius:8,background:'#f1f5f9',color:'#64748b' }}>+{nbMeds-3}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6 }}>
                    <div style={{ display:'flex',gap:5 }} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>handlePrint(o)}
                        style={{ padding:'6px 12px',borderRadius:9,background:'#1e293b',color:'white',border:'none',fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4 }}>
                        <Printer size={12} strokeWidth={2.4} /> Imprimer
                      </button>
                      <button onClick={()=>setConfirmDel(confirmDel===o.id?null:o.id)}
                        style={{ width:30,height:30,borderRadius:9,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#ef4444' }}>
                        <Trash2 size={14} strokeWidth={2.4} />
                      </button>
                    </div>
                    <span style={{ fontSize:11,color:'#94a3b8',padding:'2px 8px',borderRadius:99,background:'#f1f5f9' }}>
                      {nbMeds} méd.
                    </span>
                    <span style={{ fontSize:10,color:'#cbd5e1' }}>{isExp?'▲':'▼'}</span>
                  </div>
                </div>

                {/* Détail expandé */}
                {isExp && (
                  <div style={{ padding:'0 16px 16px 76px',background:'#f8fffe',borderTop:'1px solid #e0f7f5' }}>
                    {/* Table médicaments */}
                    <div style={{ marginTop:12,borderRadius:12,overflow:'hidden',border:'1px solid #e0f7f5' }}>
                      <table style={{ width:'100%',borderCollapse:'collapse' }}>
                        <thead>
                          <tr style={{ background:'#f0fdfa' }}>
                            {['Médicament','Posologie','Durée','Qté'].map(h=>(
                              <th key={h} style={{ padding:'8px 12px',textAlign:'left',fontSize:10,fontWeight:800,color:'#0d9488',textTransform:'uppercase',letterSpacing:'.05em',borderBottom:'1px solid #e0f7f5' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(o.lignes||[]).filter(l=>l.med).map((l,i)=>(
                            <tr key={i} style={{ borderBottom:'1px solid #f0fdfa',background:i%2===0?'white':'#f8fffe' }}>
                              <td style={{ padding:'9px 12px',fontSize:13,fontWeight:700,color:'#0d9488' }}>💊 {l.med}</td>
                              <td style={{ padding:'9px 12px',fontSize:12,color:'#374151' }}>{l.dose||'—'}</td>
                              <td style={{ padding:'9px 12px',fontSize:12,color:'#374151' }}>{l.duree||'—'}</td>
                              <td style={{ padding:'9px 12px',fontSize:13,fontWeight:700,fontFamily:'monospace',color:'#0f172a' }}>{l.qte||'—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Note */}
                    {o.note && (
                      <div style={{ marginTop:10,padding:'10px 14px',borderRadius:12,background:'#fffbeb',border:'1px solid #fde68a' }}>
                        <p style={{ fontSize:11,fontWeight:700,color:'#92400e',marginBottom:4 }}>📌 Observations</p>
                        <p style={{ fontSize:13,color:'#374151' }}>{o.note}</p>
                      </div>
                    )}

                    {/* Vétérinaire */}
                    {o.veterinaire && (
                      <div style={{ marginTop:8,display:'flex',alignItems:'center',gap:8 }}>
                        <span style={{ fontSize:11,color:'#94a3b8',fontWeight:700 }}>Prescrit par :</span>
                        <span style={{ fontSize:12,fontWeight:700,color:'#0d9488' }}>🩺 {o.veterinaire}</span>
                      </div>
                    )}

                    {/* Confirmation suppression */}
                    {confirmDel===o.id && (
                      <div style={{ marginTop:12,padding:'10px 14px',borderRadius:12,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10 }}>
                        <p style={{ fontSize:13,color:'#dc2626',fontWeight:700 }}>⚠️ Supprimer cette ordonnance ?</p>
                        <div style={{ display:'flex',gap:6,flexShrink:0 }}>
                          <button onClick={()=>deleteOrd(o.id)}
                            style={{ padding:'6px 12px',background:'#dc2626',color:'white',border:'none',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer' }}>Confirmer</button>
                          <button onClick={()=>setConfirmDel(null)}
                            style={{ padding:'6px 10px',background:'#f1f5f9',color:'#64748b',border:'none',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer' }}>Annuler</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {!filtered.length && <EmptyState icon="📝" title="Aucune ordonnance" subtitle="Rédigez une ordonnance lors de vos consultations." />}
        </div>

        <Pagination {...pagination} />
      </div>
    </div>
  )
}

export default Ordonnances
