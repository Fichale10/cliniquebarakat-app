import { useState, useMemo } from 'react'
import { Btn, Field, AutoSuggest, FilterBar, FilterBtns, FilterPeriode, EmptyState, Pagination, usePagination } from '../../components/ui'
import { dbInsert, dbUpdate, newId } from '../../lib/db'

const today = () => new Date().toISOString().split('T')[0]
const fmtF  = v => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'
const fmtK  = n => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M F` : n >= 1000 ? `${Math.round(n/1000)}k F` : fmtF(n)

const SOAP_CONFIG = [
  { key:'soap_s', label:'S – Subjectif',      icon:'💬', bg:'#eff6ff', border:'#bfdbfe', title:'#1d4ed8', focus:'#2563eb', hint:'Motif de consultation, plainte du propriétaire' },
  { key:'soap_o', label:'O – Objectif',        icon:'🔬', bg:'#f0fdf4', border:'#bbf7d0', title:'#16a34a', focus:'#16a34a', hint:"Résultats de l'examen clinique" },
  { key:'soap_a', label:'A – Diagnostic *',    icon:'🩺', bg:'#fff7ed', border:'#fed7aa', title:'#ea580c', focus:'#ea580c', hint:'Hypothèse(s) diagnostique(s)' },
  { key:'soap_p', label:'P – Plan thérapeutique', icon:'💊', bg:'#faf5ff', border:'#e9d5ff', title:'#9333ea', focus:'#9333ea', hint:'Traitements, examens complémentaires, suivi' },
]

const STATUT_STYLE = {
  'Payé':       { bg:'#f0fdf4', border:'#bbf7d0', text:'#16a34a' },
  'En attente': { bg:'#fffbeb', border:'#fde68a', text:'#d97706' },
}

function StatutPill({ statut }) {
  const s = STATUT_STYLE[statut] || { bg:'#f8fafc', border:'#e2e8f0', text:'#64748b' }
  return <span style={{ fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:99,background:s.bg,border:`1px solid ${s.border}`,color:s.text }}>{statut}</span>
}

function Consultations({ patients, consultations, setConsultations, user, sb, logAction }) {
  const emptyForm = () => ({
    date:today(), patient:'', proprio:'', poids:'',
    temperature:'', fc:'', soap_s:'', soap_o:'',
    soap_a:'', soap_p:'', montant:'', statut:'En attente',
  })

  const [showForm,  setShowForm]  = useState(false)
  const [exp,       setExp]       = useState(null)
  const [form,      setForm]      = useState(emptyForm())
  const [patSugg,   setPatSugg]   = useState([])
  const [saving,    setSaving]    = useState(false)
  const [searchC,   setSearchC]   = useState('')
  const [fCStatut,  setFCStatut]  = useState('')
  const [fCPeriode, setFCPeriode] = useState('')
  const [sortBy,    setSortBy]    = useState('date_desc')

  const f = key => e => setForm(prev => ({...prev, [key]:e.target.value}))

  // ── KPIs ─────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const all  = consultations || []
    const todayStr = today()
    const caTotal  = all.filter(c=>c.statut==='Payé').reduce((s,c)=>s+(c.montant||0),0)
    const enAttente = all.filter(c=>c.statut!=='Payé')
    const caAttente = enAttente.reduce((s,c)=>s+(c.montant||0),0)
    const auj   = all.filter(c=>c.date===todayStr).length
    return { total:all.length, caTotal, enAttente:enAttente.length, caAttente, auj }
  }, [consultations])

  // ── Top diagnostics ───────────────────────────────────────────
  const topDiags = useMemo(() => {
    const all = consultations || []
    const freq = {}
    all.forEach(c => {
      const k = (c.soap_a||'').trim().substring(0,40)
      if (k) freq[k] = (freq[k]||0)+1
    })
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5)
  }, [consultations])

  // ── Filtres + tri ─────────────────────────────────────────────
  const now3 = new Date()
  const cDebutMap = {
    jour:    today(),
    semaine: new Date(now3.getTime()-now3.getDay()*86400000).toISOString().split('T')[0],
    mois:    new Date(now3.getFullYear(),now3.getMonth(),1).toISOString().split('T')[0],
    annee:   new Date(now3.getFullYear(),0,1).toISOString().split('T')[0],
  }
  const cFiltered = useMemo(() => {
    let r = (consultations||[]).filter(c => {
      if (fCStatut && c.statut!==fCStatut) return false
      if (fCPeriode && cDebutMap[fCPeriode] && c.date<cDebutMap[fCPeriode]) return false
      if (searchC) { const q=searchC.toLowerCase(); if(!c.patient.toLowerCase().includes(q)&&!c.proprio.toLowerCase().includes(q)&&!(c.soap_a||'').toLowerCase().includes(q)) return false }
      return true
    })
    return [...r].sort((a,b) => {
      if (sortBy==='date_asc')  return a.date.localeCompare(b.date)
      if (sortBy==='montant')   return (b.montant||0)-(a.montant||0)
      if (sortBy==='patient')   return String(a.patient||'').localeCompare(String(b.patient||''))
      return b.date.localeCompare(a.date)
    })
  }, [consultations, fCStatut, fCPeriode, searchC, sortBy])

  const pagination = usePagination(cFiltered, 20)

  // ── Ajout ─────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.patient || !form.soap_a) return alert('Patient et diagnostic (SOAP-A) requis')
    setSaving(true)
    try {
      const row = { id:newId(), date:form.date, patient:form.patient, proprio:form.proprio, poids:form.poids, temperature:form.temperature, fc:form.fc, soap_s:form.soap_s, soap_o:form.soap_o, soap_a:form.soap_a, soap_p:form.soap_p, montant:parseInt(form.montant)||0, statut:form.statut }
      const saved = await dbInsert(sb,'consultations',row)
      setConsultations([saved,...(consultations||[])])
      if (logAction&&sb) logAction(sb,user,'consultation_added',`${row.patient} — ${row.soap_a}`)
      setForm(emptyForm()); setShowForm(false)
    } catch(e) { alert('Erreur lors de la sauvegarde.') }
    finally { setSaving(false) }
  }

  const handleStatut = async (id, newStatut) => {
    await dbUpdate(sb,'consultations',id,{statut:newStatut})
    setConsultations((consultations||[]).map(c => c.id===id?{...c,statut:newStatut}:c))
  }

  const printZone = (zoneId) => {
    const el = document.getElementById(zoneId)
    if (!el) return
    const w = window.open('','_blank','width=900,height=700')
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>'+el.innerHTML+'</body></html>')
    w.document.close(); w.focus(); w.print()
  }

  const PrintConsult = ({ c }) => (
    <div id={`cp-${c.id}`} className="hidden">
      <div style={{ fontFamily:'sans-serif',padding:'30px',maxWidth:'620px',margin:'0 auto' }}>
        <div style={{ display:'flex',justifyContent:'space-between',borderBottom:'3px solid #16a34a',paddingBottom:'15px',marginBottom:'20px' }}>
          <div>
            <h1 style={{ margin:0,fontSize:'22px',color:'#14532d',fontWeight:'900' }}>🐾 La Barakat</h1>
            <p style={{ margin:'4px 0 0',color:'#64748b',fontSize:'12px' }}>Pharmacie & Clinique Vétérinaire · Lomé, Togo</p>
          </div>
          <div style={{ textAlign:'right',fontSize:'12px',color:'#64748b' }}>
            <div style={{ fontWeight:'900',fontSize:'16px',color:'#16a34a' }}>FICHE CONSULTATION</div>
            <div>N° {c.id} · {c.date}</div>
          </div>
        </div>
        <div style={{ background:'#f8fafc',borderRadius:'8px',padding:'12px',marginBottom:'16px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',fontSize:'13px' }}>
          <div><strong>Patient :</strong> {c.patient}</div>
          <div><strong>Propriétaire :</strong> {c.proprio}</div>
          <div><strong>Poids :</strong> {c.poids||'–'}</div>
          <div><strong>Température :</strong> {c.temperature||'–'}</div>
          <div><strong>FC :</strong> {c.fc||'–'}</div>
        </div>
        {SOAP_CONFIG.map(({key,label},i) => c[key] && (
          <div key={i} style={{ marginBottom:'12px' }}>
            <div style={{ fontWeight:'700',color:'#16a34a',fontSize:'12px',marginBottom:'4px' }}>{label}</div>
            <div style={{ background:'#f1f5f9',borderRadius:'6px',padding:'8px 10px',fontSize:'13px' }}>{c[key]}</div>
          </div>
        ))}
        <div style={{ borderTop:'2px solid #e2e8f0',paddingTop:'12px',display:'flex',justifyContent:'space-between',marginTop:'16px' }}>
          <div style={{ fontSize:'12px',color:'#64748b' }}>La Barakat</div>
          <div style={{ fontSize:'20px',fontWeight:'900',color:'#16a34a' }}>{fmtF(c.montant)}</div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-page space-y-5">
      {(consultations||[]).map(c => <PrintConsult key={c.id} c={c} />)}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon:'🩺', label:'Total consultations', value:kpis.total,      sub:`${kpis.auj} aujourd'hui`,             color:'#0d9488' },
          { icon:'✅', label:'CA encaissé',          value:fmtK(kpis.caTotal),  sub:'consultations payées',            color:'#16a34a' },
          { icon:'⏳', label:'En attente',           value:kpis.enAttente,  sub:fmtK(kpis.caAttente)+' à recouvrer',   color:'#d97706' },
          { icon:'📊', label:'Diagnostics uniques',  value:topDiags.length, sub:'types de pathologies',                color:'#7c3aed' },
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

      {/* Top diagnostics */}
      {topDiags.length > 0 && (
        <div style={{ background:'white',borderRadius:16,padding:'16px 20px',border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize:12,fontWeight:800,color:'#64748b',marginBottom:12 }}>🩺 Diagnostics les plus fréquents</p>
          <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
            {topDiags.map(([diag, count], i) => {
              const maxCount = topDiags[0][1]
              const pct = Math.round((count/maxCount)*100)
              return (
                <div key={i} style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ fontSize:10,fontWeight:800,color:'#94a3b8',width:14,textAlign:'right',flexShrink:0 }}>#{i+1}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3 }}>
                      <span style={{ fontSize:12,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{diag}</span>
                      <span style={{ fontSize:11,fontWeight:700,color:'#0d9488',flexShrink:0,marginLeft:8 }}>{count}×</span>
                    </div>
                    <div style={{ height:4,borderRadius:99,background:'#f1f5f9',overflow:'hidden' }}>
                      <div style={{ height:'100%',width:`${pct}%`,borderRadius:99,background:i===0?'#0d9488':'#5eead4',transition:'width .4s' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="app-card">
        {/* Header */}
        <div style={{ padding:'18px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
          <div>
            <h2 style={{ fontSize:20,fontWeight:900,display:'flex',alignItems:'center',gap:8 }}>🩺 Consultations <span style={{ fontSize:13,fontWeight:400,color:'#94a3b8' }}>format SOAP</span></h2>
            <p style={{ fontSize:12,color:'#94a3b8',marginTop:2 }}>{cFiltered.length}/{(consultations||[]).length} consultation(s)</p>
          </div>
          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
              style={{ border:'1.5px solid #e2e8f0',borderRadius:10,padding:'7px 10px',fontSize:12,fontWeight:700,color:'#64748b',outline:'none',background:'white' }}>
              <option value="date_desc">📅 Plus récentes</option>
              <option value="date_asc">📅 Plus anciennes</option>
              <option value="montant">💰 Montant décroissant</option>
              <option value="patient">🐾 Patient A→Z</option>
            </select>
            <Btn onClick={() => setShowForm(!showForm)}>{showForm ? '✕ Annuler' : '+ Nouvelle consultation'}</Btn>
          </div>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div style={{ background:'linear-gradient(135deg,#eff6ff,#f0fdf4)',borderBottom:'1px solid rgba(37,99,235,0.1)',padding:'20px 24px' }}>
            <h3 style={{ fontWeight:800,color:'#1d4ed8',fontSize:15,marginBottom:16,display:'flex',alignItems:'center',gap:8 }}>🩺 Nouvelle consultation SOAP</h3>

            {/* Vitaux */}
            <div style={{ background:'white',borderRadius:14,padding:'16px',marginBottom:16,border:'1px solid #e2e8f0' }}>
              <p style={{ fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:10 }}>Identification & Vitaux</p>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Field label="Date" value={form.date} onChange={f('date')} type="date" />
                <div className="md:col-span-2">
                  <label style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:5 }}>Patient</label>
                  <AutoSuggest value={form.patient}
                    onChange={e => { setForm(p=>({...p,patient:e.target.value})); setPatSugg(patients.filter(p=>p.nom.toLowerCase().includes(e.target.value.toLowerCase()))) }}
                    list={patSugg}
                    onSelect={p => setForm(prev=>({...prev,patient:p.nom,proprio:p.proprio,poids:p.poids||''}))}
                    placeholder="Nom de l'animal" />
                </div>
                <Field label="Propriétaire"    value={form.proprio}     onChange={f('proprio')}     placeholder="Propriétaire" />
                <Field label="Poids (kg)"      value={form.poids}       onChange={f('poids')}       placeholder="ex: 12 kg" />
                <Field label="Température"     value={form.temperature} onChange={f('temperature')} placeholder="38.5°C" />
                <Field label="Fréq. cardiaque" value={form.fc}          onChange={f('fc')}          placeholder="80 bpm" className="md:col-span-1" />
              </div>
            </div>

            {/* SOAP boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {SOAP_CONFIG.map(({ key, label, icon, bg, border, title, focus, hint }) => (
                <div key={key} style={{ borderRadius:14,padding:'14px',background:bg,border:`2px solid ${border}` }}>
                  <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:6 }}>
                    <span style={{ fontSize:16 }}>{icon}</span>
                    <span style={{ fontSize:12,fontWeight:900,color:title,textTransform:'uppercase',letterSpacing:'.05em' }}>{label}</span>
                    {key==='soap_a' && <span style={{ fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:99,background:title+'22',color:title }}>Requis</span>}
                  </div>
                  <p style={{ fontSize:11,color:'#94a3b8',marginBottom:8,fontStyle:'italic' }}>{hint}</p>
                  <textarea rows={3} value={form[key]} onChange={f(key)}
                    style={{ width:'100%',border:`1.5px solid ${border}`,borderRadius:10,padding:'9px 11px',fontSize:13,outline:'none',background:'white',fontFamily:"'Outfit',sans-serif",resize:'vertical',transition:'border-color .15s, box-shadow .15s',boxSizing:'border-box' }}
                    onFocus={e=>{e.target.style.borderColor=focus;e.target.style.boxShadow=`0 0 0 3px ${focus}22`}}
                    onBlur={e=>{e.target.style.borderColor=border;e.target.style.boxShadow='none'}} />
                </div>
              ))}
            </div>

            {/* Montant / statut / submit */}
            <div style={{ display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap',background:'white',borderRadius:14,padding:'14px 16px',border:'1px solid #e2e8f0' }}>
              <Field label="Montant (F)" value={form.montant} onChange={f('montant')} type="number" placeholder="0" className="w-36" />
              <Field label="Statut" value={form.statut} onChange={f('statut')} options={['En attente','Payé']} className="w-40" />
              <div style={{ marginBottom:2 }}>
                <Btn onClick={handleAdd} disabled={saving}>{saving?'⏳ Enregistrement…':'✓ Enregistrer la consultation'}</Btn>
              </div>
            </div>
          </div>
        )}

        {/* Filtres */}
        <FilterBar search={searchC} onSearch={setSearchC} placeholder="🔍 Patient, propriétaire, diagnostic…"
          activeCount={[fCStatut,fCPeriode,searchC].filter(Boolean).length}
          onReset={()=>{setSearchC('');setFCStatut('');setFCPeriode('')}}>
          <FilterBtns options={[{v:'Payé',l:'✅ Payé'},{v:'En attente',l:'⏳ En attente'}]} value={fCStatut} onChange={setFCStatut} colorFn={v=>v==='Payé'?'green':'amber'} />
          <FilterPeriode value={fCPeriode} onChange={setFCPeriode} />
          <span style={{ fontSize:11,color:'#94a3b8',marginLeft:'auto' }}>{cFiltered.length}/{(consultations||[]).length}</span>
        </FilterBar>

        {/* Liste consultations */}
        <div style={{ padding:'8px 0' }}>
          {pagination.pageItems.map(c => {
            const isExp = exp === c.id
            return (
              <div key={c.id} style={{ borderBottom:'1px solid #f8fafc',transition:'background .12s' }}>
                {/* Ligne principale */}
                <div style={{ padding:'14px 20px',display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer' }}
                  onClick={() => setExp(isExp ? null : c.id)}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>

                  {/* Avatar date */}
                  <div style={{ flexShrink:0,width:44,height:44,borderRadius:12,background:'#f0fdfa',border:'1px solid #99f6e4',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
                    <span style={{ fontSize:9,fontWeight:700,color:'#0d9488',lineHeight:1.1 }}>{c.date?.split('-')[2]}</span>
                    <span style={{ fontSize:8,color:'#94a3b8',lineHeight:1.1 }}>{['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][parseInt(c.date?.split('-')[1]||1)-1]}</span>
                    <span style={{ fontSize:8,color:'#94a3b8',lineHeight:1.1 }}>{c.date?.split('-')[0]}</span>
                  </div>

                  {/* Infos */}
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:5 }}>
                      <span style={{ fontWeight:800,fontSize:14,color:'#0f172a' }}>🐾 {c.patient}</span>
                      <span style={{ fontSize:12,color:'#64748b' }}>· {c.proprio}</span>
                      <StatutPill statut={c.statut} />
                    </div>
                    {/* Vitaux chips */}
                    {(c.temperature||c.fc||c.poids) && (
                      <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginBottom:6 }}>
                        {c.poids       && <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:99,background:'#f8fafc',border:'1px solid #e2e8f0',color:'#475569' }}>⚖️ {c.poids}</span>}
                        {c.temperature && <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:99,background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626' }}>🌡️ {c.temperature}</span>}
                        {c.fc          && <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:99,background:'#eff6ff',border:'1px solid #bfdbfe',color:'#2563eb' }}>❤️ {c.fc}</span>}
                      </div>
                    )}
                    {/* Diagnostic preview */}
                    <p style={{ fontSize:13,fontWeight:700,color:'#ea580c',marginBottom:3 }}>🩺 {c.soap_a}</p>
                    {!isExp && c.soap_p && <p style={{ fontSize:11,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>💊 {c.soap_p.substring(0,80)}{c.soap_p.length>80?'…':''}</p>}
                  </div>

                  {/* Montant + actions */}
                  <div style={{ flexShrink:0,textAlign:'right' }}>
                    <div style={{ fontSize:18,fontWeight:900,fontFamily:'monospace',color:'#2563eb',marginBottom:5 }}>{fmtF(c.montant)}</div>
                    <div style={{ display:'flex',gap:4,justifyContent:'flex-end' }} onClick={e=>e.stopPropagation()}>
                      {c.statut!=='Payé' && (
                        <button onClick={()=>handleStatut(c.id,'Payé')}
                          style={{ padding:'5px 10px',borderRadius:8,background:'#f0fdf4',border:'1px solid #bbf7d0',fontSize:11,fontWeight:700,color:'#16a34a',cursor:'pointer' }}>
                          ✓ Payé
                        </button>
                      )}
                      <button onClick={()=>{ const el=document.getElementById(`cp-${c.id}`); el.classList.remove('hidden'); setTimeout(()=>{ printZone(`cp-${c.id}`); el.classList.add('hidden') },100) }}
                        style={{ width:30,height:30,borderRadius:8,background:'#f1f5f9',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,cursor:'pointer' }}>
                        🖨️
                      </button>
                    </div>
                    <span style={{ fontSize:10,color:'#cbd5e1',display:'block',marginTop:4 }}>{isExp?'▲':'▼'}</span>
                  </div>
                </div>

                {/* Section expandée SOAP */}
                {isExp && (
                  <div style={{ padding:'0 20px 18px 76px',background:'#fafcff',borderTop:'1px solid #f1f5f9' }}>
                    <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10,marginTop:14 }}>
                      {SOAP_CONFIG.map(({ key, label, icon, bg, border, title }) => c[key] && (
                        <div key={key} style={{ borderRadius:12,padding:'12px',background:bg,border:`1.5px solid ${border}` }}>
                          <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:8 }}>
                            <span style={{ fontSize:15 }}>{icon}</span>
                            <span style={{ fontSize:10,fontWeight:900,color:title,textTransform:'uppercase',letterSpacing:'.06em' }}>{label}</span>
                          </div>
                          <p style={{ fontSize:13,color:'#1e293b',lineHeight:1.6,whiteSpace:'pre-wrap' }}>{c[key]}</p>
                        </div>
                      ))}
                    </div>
                    {/* Résumé vitaux en expanded */}
                    {(c.temperature||c.fc||c.poids) && (
                      <div style={{ marginTop:12,padding:'10px 14px',borderRadius:12,background:'white',border:'1px solid #f1f5f9',display:'flex',gap:16,flexWrap:'wrap' }}>
                        <span style={{ fontSize:11,fontWeight:700,color:'#64748b' }}>📋 Vitaux :</span>
                        {c.poids       && <span style={{ fontSize:12,color:'#475569' }}>⚖️ Poids : <strong>{c.poids}</strong></span>}
                        {c.temperature && <span style={{ fontSize:12,color:'#dc2626' }}>🌡️ Temp. : <strong>{c.temperature}</strong></span>}
                        {c.fc          && <span style={{ fontSize:12,color:'#2563eb' }}>❤️ FC : <strong>{c.fc}</strong></span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {!cFiltered.length && <EmptyState icon="🩺" title="Aucune consultation" subtitle="Les consultations enregistrées apparaîtront ici." />}
        </div>

        <Pagination {...pagination} />
      </div>
    </div>
  )
}

export default Consultations
