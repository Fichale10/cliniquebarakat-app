import { useState, useMemo } from 'react'
import { Btn, Field, AutoSuggest, ValidationBanner, FormPanel, FormSection, FilterBar, FilterSelect, FilterBtns, FilterPeriode, Pagination, usePagination, EmptyState } from '../../components/ui'
import { dbInsert, dbUpdate, dbDelete, newId } from '../../lib/db'
import { validateVenteForm, venteFormToRow } from '../../lib/validation'
import { fmtF, fmtK, STATUTS, STATUT_STYLE, getTarifs, getPrixGros, getRemiseApplied, computeTvaAmt, venteTvaAmt, venteTTC, ligneUnites } from '../../lib/ventes'

const today = () => new Date().toISOString().split('T')[0]

const MODE_ICON = { 'Espèces':'💵', 'Mobile Money':'📱', 'Virement':'🏦', 'Chèque':'🖊️' }

function StatutPill({ statut }) {
  const s = STATUT_STYLE[statut] || { bg:'#f8fafc', border:'#e2e8f0', text:'#64748b' }
  return (
    <span style={{ fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:99,background:s.bg,border:`1px solid ${s.border}`,color:s.text }}>
      {statut}
    </span>
  )
}

function Ventes({ meds, setMeds, clients, ventesHist, setVentesHist, otrMode, tva, user, sb, logAction }) {
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [form, setForm] = useState({
    date: today(), client: '', lignes: [{ med:'', medSearch:'', cond:'', qte:1, pu:'', showSugg:false }],
    mode: 'Espèces', statut: 'Payé', type: 'detail',
  })
  const [cliSugg,  setCliSugg]  = useState([])
  const [fVStatut, setFVStatut] = useState('')
  const [fVMode,   setFVMode]   = useState('')
  const [fVPeriode, setFVPeriode] = useState('')
  const [fVType,   setFVType]   = useState('')
  const [searchV,  setSearchV]  = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [validationMessages, setValidationMessages] = useState([])

  const ventes = ventesHist || []

  const patchForm = (patch) => {
    setForm(prev => ({...prev,...patch}))
    Object.keys(patch).forEach(k => setFormErrors(prev => { const n={...prev}; delete n[k]; return n }))
    if (validationMessages.length) setValidationMessages([])
  }
  const updL = (i, updates) => {
    setForm(prev => {
      const nl = [...prev.lignes]
      const merged = {...nl[i],...updates}
      if (prev.type==='gros' && ('qte' in updates || 'med' in updates) && merged.med) {
        const medObj = meds.find(m => m.nom === merged.med)
        if (medObj) merged.pu = getPrixGros(medObj, parseInt(merged.qte)||1)
      }
      nl[i] = merged
      return {...prev, lignes:nl}
    })
    setFormErrors(prev => { const n={...prev}; Object.keys(prev).forEach(k => { if(k.startsWith(`lignes.${i}.`)) delete n[k] }); return n })
    if (validationMessages.length) setValidationMessages([])
  }
  const ligneError = (i, field) => formErrors[`lignes.${i}.${field}`]
  const total = form.lignes.reduce((s,l) => s + (parseInt(l.qte)||0)*(parseInt(l.pu)||0), 0)

  // ── KPIs (TTC, restant dû réel) ───────────────────────
  const kpis = useMemo(() => {
    const todayStr = today()
    const ttc = v => (v.total||0) + (v.tva_amt||0)
    const caToday  = ventes.filter(v=>v.date===todayStr&&v.statut==='Payé').reduce((s,v)=>s+ttc(v),0)
    const encaisse = ventes.filter(v=>v.statut==='Payé').reduce((s,v)=>s+ttc(v),0)
    const credit   = ventes.filter(v=>['À crédit','Partiellement payé','En attente'].includes(v.statut)).reduce((s,v)=>s+Math.max(0,ttc(v)-(v.montant_paye||0)),0)
    const nbGros   = ventes.filter(v=>v.type==='gros').length
    return { caToday, encaisse, credit, nbGros, total:ventes.length }
  }, [ventes])

  // ── Mini graphe CA 7j ─────────────────────────────────────────
  const chart7 = useMemo(() => {
    const now = new Date()
    return Array.from({length:7}, (_,i) => {
      const d = new Date(now); d.setDate(d.getDate()-(6-i))
      const ds = d.toISOString().split('T')[0]
      const ca = ventes.filter(v=>v.date===ds&&v.statut==='Payé').reduce((s,v)=>s+(v.total||0),0)
      const label = i===6?'Auj.':['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()]
      return { date:ds, ca, label }
    })
  }, [ventes])
  const maxCA7 = Math.max(...chart7.map(d=>d.ca), 1)

  // ── Filtrage ─────────────────────────────────────────────────
  const now2 = new Date()
  const periodeDebut = {
    jour: today(),
    semaine: new Date(now2.getTime()-now2.getDay()*86400000).toISOString().split('T')[0],
    mois: new Date(now2.getFullYear(),now2.getMonth(),1).toISOString().split('T')[0],
    annee: new Date(now2.getFullYear(),0,1).toISOString().split('T')[0],
  }
  const filtered = useMemo(() => ventes.filter(v => {
    if (fVStatut && v.statut!==fVStatut) return false
    if (fVMode   && v.mode!==fVMode) return false
    if (fVType   && (v.type||'detail')!==fVType) return false
    if (fVPeriode && periodeDebut[fVPeriode] && v.date < periodeDebut[fVPeriode]) return false
    if (searchV) { const q=searchV.toLowerCase(); if (!v.client.toLowerCase().includes(q) && !JSON.stringify(v.lignes||[]).toLowerCase().includes(q)) return false }
    return true
  }), [ventes, fVStatut, fVMode, fVType, fVPeriode, searchV])

  const pagination = usePagination(filtered)

  // ── Gestion stock (unifié : qte × mult du conditionnement) ───
  const applyStockDelta = async (lignes, delta) => {
    const updates = meds.map(m => { const l=lignes.find(x=>x.med===m.nom); if(!l) return null; return { medId:m.id, newStock:Math.max(0,(m.stock||0)+delta*ligneUnites(l)) } }).filter(Boolean)
    if (!updates.length) return
    await Promise.all(updates.map(({medId,newStock}) => dbUpdate(sb,'medicaments',medId,{stock:newStock})))
    const updatedMeds = meds.map(m => { const u=updates.find(x=>x.medId===m.id); return u?{...m,stock:u.newStock}:m })
    setMeds(updatedMeds)
    try { localStorage.setItem('lb_medicaments', JSON.stringify(updatedMeds)) } catch(e) {}
  }

  // ── Enregistrer vente ─────────────────────────────────────────
  const addVente = async () => {
    const checked = validateVenteForm(form, meds)
    if (!checked.ok) { setFormErrors(checked.fieldErrors); setValidationMessages(checked.messages); return }
    const validated = checked.data
    if (validated.statut === 'Payé') {
      const stockErrors = validated.lignes.map(l => { const m=meds.find(x=>x.nom===l.med); return (m&&l.qte>(m.stock||0))?`${l.med} : stock insuffisant (${m.stock||0} dispo, ${l.qte} demandé)`:null }).filter(Boolean)
      if (stockErrors.length) { setValidationMessages(stockErrors); return }
    }
    setSaving(true)
    try {
      const tvaAmtNew = computeTvaAmt(validated.total, tva)
      const row = venteFormToRow(validated, newId(), {
        type: form.type||'detail',
        tva_amt: tvaAmtNew,
        montant_paye: validated.statut==='Payé' ? (validated.total + tvaAmtNew) : 0,
        caissier: user?.name || '',
      })
      const saved = await dbInsert(sb,'ventes',row)
      setVentesHist([saved,...ventes].slice(0,500))
      if (validated.statut==='Payé') await applyStockDelta(validated.lignes,-1)
      if (logAction&&sb) logAction(sb,user,'vente_added',`${validated.client} — ${fmtF(validated.total)}`)
      setForm({ date:today(), client:'', lignes:[{med:'',medSearch:'',cond:'',qte:1,pu:'',showSugg:false}], mode:'Espèces', statut:'Payé', type:'detail' })
      setFormErrors({}); setValidationMessages([]); setShowForm(false)
    } catch(e) {
      alert(e?.message || 'Erreur lors de la sauvegarde. Vérifiez la table ventes dans Supabase.')
    } finally { setSaving(false) }
  }

  const handleStatut = async (venteId, newStatut) => {
    const vente = ventes.find(v=>v.id===venteId)
    const patch = { statut: newStatut }
    if (newStatut==='Payé' && vente) patch.montant_paye = venteTTC(vente, tva)
    await dbUpdate(sb,'ventes',venteId,patch)
    const newHist = ventes.map(v => v.id===venteId?{...v,...patch}:v)
    setVentesHist(newHist)
    if (vente?.lignes) {
      if (newStatut==='Payé') await applyStockDelta(vente.lignes,-1)
      else if (newStatut==='Annulé'&&vente.statut==='Payé') await applyStockDelta(vente.lignes,+1)
    }
  }
  const deleteVente = async (id) => {
    if (!confirm('Supprimer cette vente définitivement ?')) return
    const vente = ventes.find(v=>v.id===id)
    try {
      await dbDelete(sb,'ventes',id)
      setVentesHist(ventes.filter(v=>v.id!==id))
      if (vente?.statut==='Payé'&&vente.lignes) await applyStockDelta(vente.lignes,+1)
    } catch(e) { alert(e?.message||'Erreur lors de la suppression') }
  }

  const tvaAmt  = v => venteTvaAmt(v, tva)
  const totalTTC = v => venteTTC(v, tva)
  const mask = v => otrMode ? '••••• F' : fmtF(v)

  const printRecu = (v) => {
    const ta=tvaAmt(v); const ttc=totalTTC(v)
    const w = window.open('','_blank','width=400,height=650')
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reçu</title>
      <style>body{font-family:sans-serif;padding:20px;max-width:360px;margin:0 auto;font-size:13px}
      h1{font-size:16px;margin:0}hr{border:1px dashed #ccc;margin:10px 0}
      .row{display:flex;justify-content:space-between;margin:3px 0}
      .total{font-size:18px;font-weight:900;color:#166534}
      .footer{text-align:center;color:#999;font-size:11px;margin-top:16px}
      @media print{button{display:none}}</style></head><body>
      <div style="text-align:center"><img src="/logo.png" alt="La Barakat" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin-bottom:6px"><h1 style="margin:2px 0">LA BARAKAT</h1><p style="margin:2px 0;color:#666">Pharmacie & Clinique Vétérinaire</p></div><hr>
      <div class="row"><span>Date</span><span>${v.date}</span></div>
      <div class="row"><span>Client</span><span><b>${v.client}</b></span></div>
      <div class="row"><span>Mode</span><span>${v.mode}</span></div>
      <div class="row"><span>Statut</span><span>${v.statut}</span></div>
      ${v.type==='gros'?'<div class="row" style="background:#fff3e0;padding:3px 6px;border-radius:4px"><span>Type</span><span><b>📦 Vente en gros</b></span></div>':''}
      <hr><b>Produits :</b><br>
      ${(v.lignes||[]).map(l=>`<div class="row"><span>${l.med}<br><small>${l.cond||''} x ${l.qte}</small></span><span>${fmtF((parseInt(l.qte)||0)*(parseInt(l.pu)||0))}</span></div>`).join('')}
      <hr><div class="row"><span>Sous-total HT</span><span>${fmtF(v.total)}</span></div>
      ${ta>0?`<div class="row"><span>TVA ${tva?.taux||0}%</span><span>+ ${fmtF(ta)}</span></div>`:''}
      <div class="row total"><span>TOTAL${ta>0?' TTC':''}</span><span>${fmtF(ta>0?ttc:v.total)}</span></div>
      <hr><div class="footer">Merci de votre confiance - La Barakat</div>
      <br><button onclick="window.print()" style="width:100%;padding:10px;background:#166534;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">Imprimer</button>
      </body></html>`)
    w.document.close()
  }

  // ── Rendu ─────────────────────────────────────────────────────
  return (
    <div className="app-page space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon:'🛒', label:"CA aujourd'hui",    value: otrMode?'•••':fmtK(kpis.caToday),   sub:`${ventes.filter(v=>v.date===today()).length} vente(s) aujourd'hui`, color:'#0d9488' },
          { icon:'✅', label:'Total encaissé',     value: otrMode?'•••':fmtK(kpis.encaisse),  sub:`sur ${kpis.total} vente(s)`,                                       color:'#16a34a' },
          { icon:'⏳', label:'À recouvrer',        value: otrMode?'•••':fmtK(kpis.credit),    sub:'À crédit + en attente',                                             color:'#d97706' },
          { icon:'📦', label:'Ventes en gros',     value: kpis.nbGros,                         sub:`${kpis.total - kpis.nbGros} au détail`,                             color:'#7c3aed' },
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

      {/* Mini graphe CA 7 jours */}
      {!otrMode && chart7.some(d=>d.ca>0) && (
        <div style={{ background:'white',borderRadius:16,padding:'16px 20px',border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize:12,fontWeight:800,color:'#64748b',marginBottom:12 }}>📊 CA encaissé — 7 derniers jours</p>
          <div style={{ display:'flex',alignItems:'flex-end',gap:6,height:48 }}>
            {chart7.map((d,i) => {
              const pct = maxCA7>0 ? d.ca/maxCA7 : 0
              const isToday = d.date===today()
              return (
                <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3 }}>
                  <div style={{ width:'100%',borderRadius:6,background:isToday?'#0d9488':d.ca>0?'#5eead4':'#f1f5f9',height:Math.max(4,Math.round(pct*40)),transition:'height .3s',position:'relative' }}
                    title={`${d.date} : ${fmtF(d.ca)}`} />
                  <span style={{ fontSize:9,fontWeight:isToday?900:500,color:isToday?'#0d9488':'#94a3b8' }}>{d.label}</span>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize:10,color:'#94a3b8',marginTop:6,textAlign:'right' }}>
            Total 7j : <strong style={{ color:'#0d9488' }}>{fmtK(chart7.reduce((s,d)=>s+d.ca,0))}</strong>
          </div>
        </div>
      )}

      <div className="app-card">
        {/* Header */}
        <div style={{ padding:'18px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
          <div>
            <h2 style={{ fontSize:20,fontWeight:900,display:'flex',alignItems:'center',gap:8 }}>🛒 Ventes au comptoir</h2>
            <p style={{ fontSize:12,color:'#94a3b8',marginTop:2 }}>
              {filtered.length}/{ventes.length} vente(s)
              {filtered.length>0 && !otrMode && (
                <> · CA filtré : <strong style={{ color:'#0d9488' }}>{fmtK(filtered.filter(v=>v.statut==='Payé').reduce((s,v)=>s+(v.total||0),0))}</strong></>
              )}
            </p>
          </div>
          <Btn onClick={() => setShowForm(!showForm)}>{showForm ? '✕ Annuler' : '+ Nouvelle vente'}</Btn>
        </div>

        {/* Formulaire */}
        {showForm && (
          <FormPanel
            icon={form.type==='gros'?'📦':'🛒'}
            title={form.type==='gros'?'Vente en gros':'Vente au détail'}
            subtitle="Remplissez les informations de la vente"
            color={form.type==='gros'?'orange':'teal'}
            onClose={() => setShowForm(false)}
          >
            {/* Toggle type */}
            <div style={{ display:'flex',gap:8,marginBottom:16 }}>
              {[{v:'detail',l:'🏪 Vente au détail',c:'#0d9488'},{v:'gros',l:'📦 Vente en gros',c:'#ea580c'}].map(t => (
                <button key={t.v} type="button" onClick={() => patchForm({type:t.v,lignes:[{med:'',medSearch:'',cond:'',qte:1,pu:'',showSugg:false}]})}
                  style={{ padding:'8px 16px',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',transition:'all .12s',
                    border:`2px solid ${form.type===t.v?t.c:'#e2e8f0'}`,
                    background:form.type===t.v?t.c+'18':'white',
                    color:form.type===t.v?t.c:'#94a3b8' }}>
                  {t.l}
                </button>
              ))}
            </div>

            <ValidationBanner messages={validationMessages} onDismiss={() => setValidationMessages([])} />

            <FormSection label="Informations générales" icon="📋" color={form.type==='gros'?'orange':'teal'} noTopMargin>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Date" value={form.date} onChange={e=>patchForm({date:e.target.value})} error={formErrors.date} type="date" />
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Client *</label>
                  <AutoSuggest value={form.client}
                    onChange={e => { patchForm({client:e.target.value}); setCliSugg(clients.filter(c=>c.nom.toLowerCase().includes(e.target.value.toLowerCase()))) }}
                    list={cliSugg} onSelect={c => { patchForm({client:c.nom}); setCliSugg([]) }}
                    placeholder="Nom du client" />
                  {formErrors.client && <p style={{ fontSize:11,color:'#dc2626',marginTop:4,fontWeight:600 }}>{formErrors.client}</p>}
                </div>
                <Field label="Mode de paiement" value={form.mode} onChange={e=>patchForm({mode:e.target.value})} error={formErrors.mode}
                  options={['Espèces','Mobile Money','Virement','Chèque','–']} />
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:formErrors.statut?'#dc2626':'#64748b',letterSpacing:'.06em',textTransform:'uppercase',display:'flex',alignItems:'center',gap:5,marginBottom:6,userSelect:'none' }}>
                    {formErrors.statut && <span style={{ width:6,height:6,borderRadius:'50%',background:'#f87171',display:'inline-block',flexShrink:0 }} />}
                    Statut paiement
                  </label>
                  <select
                    style={{ border:`1.5px solid ${formErrors.statut?'#f87171':'#e2e8f0'}`,borderRadius:12,padding:'10px 14px',fontSize:'13.5px',width:'100%',outline:'none',background:'var(--app-surface)',fontFamily:"'Outfit',sans-serif",transition:'border-color .18s, box-shadow .18s',cursor:'pointer',color:'var(--app-text)' }}
                    onFocus={e=>{e.target.style.borderColor='#0d9488';e.target.style.boxShadow='0 0 0 3.5px rgba(13,148,136,0.14)'}}
                    onBlur={e=>{e.target.style.borderColor=formErrors.statut?'#f87171':'#e2e8f0';e.target.style.boxShadow='none'}}
                    value={form.statut} onChange={e=>patchForm({statut:e.target.value})}>
                    {STATUTS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  {formErrors.statut && <p style={{ fontSize:11,color:'#dc2626',marginTop:5,fontWeight:600 }}>{formErrors.statut}</p>}
                  {form.statut!=='Payé' && <p className="text-xs text-orange-600 mt-1">⚠️ Stock non décrémenté tant que non payé</p>}
                </div>
              </div>
            </FormSection>

            <FormSection label="Produits vendus" icon="💊" color={form.type==='gros'?'orange':'teal'}
              action={
                <button onClick={()=>setForm(p=>({...p,lignes:[...p.lignes,{med:'',medSearch:'',cond:'',qte:1,pu:'',showSugg:false}]}))}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold transition-all">
                  + Ajouter
                </button>
              }>
              <div className="grid gap-2 mb-1.5 px-1" style={{ gridTemplateColumns:'2fr 1.5fr 0.6fr 1fr 28px' }}>
                {['Médicament', form.type==='gros'?'Type':'Conditionnement','Qté','Prix unit. (F)',''].map((h,i)=><div key={i} className="text-xs font-bold text-slate-400">{h}</div>)}
              </div>
              {form.lignes.map((l,i) => {
                const medObj = meds.find(m=>m.nom===l.med)
                const tarifs = getTarifs(medObj)
                const rowErr = ligneError(i,'med')||ligneError(i,'qte')||ligneError(i,'pu')
                return (
                  <div key={i}>
                    <div className="grid gap-2 mb-1 items-center" style={{ gridTemplateColumns:'2fr 1.5fr 0.6fr 1fr 28px' }}>
                      <div className="relative">
                        <input type="text" placeholder="Rechercher médicament…"
                          value={l.medSearch!==undefined?l.medSearch:l.med}
                          onChange={e=>updL(i,{medSearch:e.target.value,med:'',showSugg:true})}
                          onFocus={e=>{updL(i,{showSugg:true});e.target.style.borderColor='#0d9488';e.target.style.boxShadow='0 0 0 3.5px rgba(13,148,136,0.14)'}}
                          onBlur={e=>{setTimeout(()=>updL(i,{showSugg:false}),160);e.target.style.borderColor=ligneError(i,'med')?'#f87171':'#e2e8f0';e.target.style.boxShadow='none'}}
                          style={{ border:`1.5px solid ${ligneError(i,'med')?'#f87171':'#e2e8f0'}`,borderRadius:12,padding:'10px 14px',fontSize:'13.5px',width:'100%',outline:'none',background:'var(--app-surface)',fontFamily:"'Outfit',sans-serif",transition:'border-color .18s, box-shadow .18s',color:'var(--app-text)' }} />
                        {l.showSugg && (
                          <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {meds.filter(m=>m.stock>0&&m.nom.toLowerCase().includes((l.medSearch||'').toLowerCase())).map(m => (
                              <button key={m.id||m.nom} type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex justify-between items-center"
                                onMouseDown={() => {
                                  if (form.type==='gros') {
                                    updL(i,{med:m.nom,medSearch:m.nom,cond:'Gros',pu:getPrixGros(m,parseInt(l.qte)||1),mult:1,showSugg:false})
                                  } else {
                                    const t2=getTarifs(m); const first=t2?.[0]
                                    updL(i,{med:m.nom,medSearch:m.nom,cond:first?.conditionnement||'Unité',pu:first?.prix||m.prixVente||m.prix_vente||'',mult:first?.mult||1,showSugg:false})
                                  }
                                }}>
                                <span className="font-medium">{m.nom}</span>
                                <span className="text-xs text-slate-400">stk: {m.stock}</span>
                              </button>
                            ))}
                            {!meds.filter(m=>m.stock>0&&m.nom.toLowerCase().includes((l.medSearch||'').toLowerCase())).length && (
                              <div className="px-3 py-2 text-sm text-slate-400">Aucun résultat</div>
                            )}
                          </div>
                        )}
                      </div>
                      {form.type==='gros' ? (
                        <div className="flex items-center h-full">
                          <span className={`text-xs font-bold px-3 py-2.5 rounded-xl border ${l.med?'bg-orange-50 text-orange-700 border-orange-200':'bg-slate-50 text-slate-300 border-slate-100'}`}>📦 Gros</span>
                        </div>
                      ) : (
                        <select className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm outline-none bg-white ${!l.med?'border-slate-100 text-slate-300':'border-slate-200 focus:border-green-400'}`}
                          value={l.cond} disabled={!l.med}
                          onChange={e=>{const t=tarifs.find(t=>t.conditionnement===e.target.value);updL(i,{cond:e.target.value,pu:t?t.prix:l.pu,mult:t?(t.mult||1):(l.mult||1)})}}>
                          <option value="">{l.med?'— Sélectionner —':'(choisir médicament)'}</option>
                          {tarifs.map(t=><option key={t.conditionnement} value={t.conditionnement}>{t.conditionnement}{t.prix?' — '+fmtF(t.prix):''}</option>)}
                          <option value="__libre__">✏️ Prix libre…</option>
                        </select>
                      )}
                      <input type="number" min="1" value={l.qte} onChange={e=>updL(i,{qte:e.target.value})}
                        style={{ border:`1.5px solid ${ligneError(i,'qte')?'#f87171':'#e2e8f0'}`,borderRadius:12,padding:'10px 6px',fontSize:'13.5px',width:'100%',outline:'none',background:'var(--app-surface)',fontFamily:"'Outfit',sans-serif",transition:'border-color .18s, box-shadow .18s',textAlign:'center',color:'var(--app-text)' }}
                        onFocus={e=>{e.target.style.borderColor='#0d9488';e.target.style.boxShadow='0 0 0 3.5px rgba(13,148,136,0.14)'}}
                        onBlur={e=>{e.target.style.borderColor=ligneError(i,'qte')?'#f87171':'#e2e8f0';e.target.style.boxShadow='none'}} />
                      <input type="number" value={l.pu} onChange={e=>updL(i,{pu:e.target.value})} placeholder="0"
                        style={{ border:`1.5px solid ${ligneError(i,'pu')?'#f87171':'#e2e8f0'}`,borderRadius:12,padding:'10px 14px',fontSize:'13.5px',width:'100%',outline:'none',background:'var(--app-surface)',fontFamily:"'Outfit',sans-serif",transition:'border-color .18s, box-shadow .18s',color:'var(--app-text)' }}
                        onFocus={e=>{e.target.style.borderColor='#0d9488';e.target.style.boxShadow='0 0 0 3.5px rgba(13,148,136,0.14)'}}
                        onBlur={e=>{e.target.style.borderColor=ligneError(i,'pu')?'#f87171':'#e2e8f0';e.target.style.boxShadow='none'}} />
                      {form.lignes.length>1
                        ? <button onClick={()=>setForm(p=>({...p,lignes:p.lignes.filter((_,j)=>j!==i)}))} className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg text-xs">✕</button>
                        : <div />}
                    </div>
                    {form.type==='gros'&&l.med&&(()=>{
                      const m=meds.find(x=>x.nom===l.med); const remise=getRemiseApplied(m,l.qte); const hasPrix=m&&(m.prixGros||m.prix_gros)
                      return (<div className="flex gap-3 mb-1 pl-1">
                        {remise>0&&<p className="text-xs text-orange-600">🏷️ Palier -{remise}% appliqué</p>}
                        {!hasPrix&&<p className="text-xs text-amber-600">⚠️ Prix gros non défini, utilise prix vente</p>}
                      </div>)
                    })()}
                    {rowErr && <p className="text-xs text-red-600 mb-2 pl-1">{rowErr}</p>}
                  </div>
                )
              })}
            </FormSection>

            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:20,padding:'14px 18px',background:form.type==='gros'?'#fff7ed':'#f0fdfa',borderRadius:16,border:`1px solid ${form.type==='gros'?'#fed7aa':'#99f6e4'}` }}>
              <div>
                <p style={{ fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3 }}>Total à encaisser</p>
                <span style={{ fontSize:26,fontWeight:900,fontFamily:'monospace',color:form.type==='gros'?'#ea580c':'#0d9488' }}>{fmtF(total)}</span>
                <span style={{ fontSize:11,color:'#94a3b8',marginLeft:6 }}>{form.lignes.filter(l=>l.med).length} produit(s)</span>
              </div>
              <Btn color={form.type==='gros'?'accent':'brand'} onClick={addVente} disabled={saving}>
                {saving?'⏳ Enregistrement…':'✓ Enregistrer la vente'}
              </Btn>
            </div>
          </FormPanel>
        )}

        {/* Filtres */}
        <FilterBar search={searchV} onSearch={setSearchV} placeholder="🔍 Client, produit…"
          activeCount={[fVStatut,fVMode,fVPeriode,fVType,searchV].filter(Boolean).length}
          onReset={()=>{setSearchV('');setFVStatut('');setFVMode('');setFVPeriode('');setFVType('')}}>
          <FilterSelect label="📋 Statut"   value={fVStatut} onChange={setFVStatut} options={STATUTS.map(s=>({v:s,l:s}))} />
          <FilterSelect label="💳 Paiement" value={fVMode}   onChange={setFVMode}   options={['Espèces','Mobile Money','Virement','Chèque'].map(m=>({v:m,l:m}))} />
          <FilterBtns   label="Type" options={[{v:'detail',l:'🏪 Détail'},{v:'gros',l:'📦 Gros'}]} value={fVType} onChange={setFVType} colorFn={v=>v==='gros'?'orange':'green'} />
          <FilterPeriode value={fVPeriode} onChange={setFVPeriode} />
        </FilterBar>

        {/* Liste ventes */}
        <div style={{ padding:'8px 0' }}>
          {pagination.pageItems.map(v => {
            const isExpanded = expandedId === v.id
            const ss = STATUT_STYLE[v.statut] || { bg:'#f8fafc', border:'#e2e8f0', text:'#64748b' }
            const isGros = v.type === 'gros'
            const ta = tvaAmt(v)
            return (
              <div key={v.id} style={{ borderBottom:'1px solid #f8fafc',transition:'background .12s' }}>
                {/* Ligne principale (cliquable) */}
                <div style={{ padding:'14px 20px',display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : v.id)}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>

                  {/* Icône gauche */}
                  <div style={{ width:40,height:40,borderRadius:12,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,background:isGros?'#fff7ed':'#f0fdfa',border:`1px solid ${isGros?'#fed7aa':'#99f6e4'}` }}>
                    {isGros?'📦':'🛒'}
                  </div>

                  {/* Infos centrales */}
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:6 }}>
                      <span style={{ fontWeight:800,fontSize:14,color:'#0f172a' }}>👤 {v.client}</span>
                      <StatutPill statut={v.statut} />
                      <span style={{ fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:99,background:'#f1f5f9',color:'#64748b',border:'1px solid #e2e8f0' }}>
                        {MODE_ICON[v.mode]||''} {v.mode}
                      </span>
                      {isGros && <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:99,background:'#fff7ed',border:'1px solid #fed7aa',color:'#ea580c' }}>📦 Gros</span>}
                      <span style={{ fontSize:11,color:'#94a3b8' }}>{v.date}</span>
                    </div>
                    {/* Produits preview */}
                    <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
                      {(v.lignes||[]).slice(0,3).map((l,i) => (
                        <span key={i} style={{ fontSize:11,padding:'3px 9px',borderRadius:8,background:'#f1f5f9',color:'#475569' }}>
                          💊 {l.med} × {l.qte}
                        </span>
                      ))}
                      {(v.lignes||[]).length > 3 && (
                        <span style={{ fontSize:11,padding:'3px 9px',borderRadius:8,background:'#e2e8f0',color:'#64748b' }}>+{(v.lignes||[]).length-3} autre(s)</span>
                      )}
                    </div>
                  </div>

                  {/* Montant + actions */}
                  <div style={{ flexShrink:0,textAlign:'right' }}>
                    <div style={{ fontSize:20,fontWeight:900,fontFamily:'monospace',color:otrMode?'#cbd5e1':v.statut==='Annulé'?'#ef4444':isGros?'#ea580c':'#0d9488',marginBottom:4 }}>
                      {mask(v.total)}
                    </div>
                    {ta>0&&!otrMode && <div style={{ fontSize:10,color:'#94a3b8' }}>TTC: {fmtF(totalTTC(v))}</div>}
                    <div style={{ display:'flex',gap:4,justifyContent:'flex-end',marginTop:6 }} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>printRecu(v)} title="Imprimer le reçu"
                        style={{ width:30,height:30,borderRadius:8,background:'#f1f5f9',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,cursor:'pointer' }}>🖨️</button>
                      {v.statut!=='Payé'&&v.statut!=='Annulé' && <>
                        <button onClick={()=>handleStatut(v.id,'Payé')}
                          style={{ padding:'5px 10px',borderRadius:8,background:'#f0fdf4',border:'1px solid #bbf7d0',fontSize:11,fontWeight:700,color:'#16a34a',cursor:'pointer' }}>✓ Payé</button>
                        <button onClick={()=>handleStatut(v.id,'Annulé')}
                          style={{ width:30,height:30,borderRadius:8,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,cursor:'pointer' }}>✕</button>
                      </>}
                      <button onClick={()=>deleteVente(v.id)} title="Supprimer"
                        style={{ width:30,height:30,borderRadius:8,background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,cursor:'pointer' }}>🗑️</button>
                    </div>
                    <span style={{ fontSize:10,color:'#cbd5e1',marginTop:4,display:'block' }}>{isExpanded?'▲':'▼'}</span>
                  </div>
                </div>

                {/* Détail expandé */}
                {isExpanded && (
                  <div style={{ padding:'0 20px 16px 72px',borderTop:'1px solid #f8fafc' }}>
                    <table style={{ width:'100%',borderCollapse:'collapse',marginTop:8 }}>
                      <thead>
                        <tr style={{ background:'#f8fafc' }}>
                          {['Médicament','Conditionnement','Qté','Prix unit.','Sous-total'].map(h => (
                            <th key={h} style={{ textAlign:'left',padding:'7px 10px',fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',borderBottom:'1px solid #f1f5f9' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(v.lignes||[]).map((l,i) => {
                          const sous = (parseInt(l.qte)||0)*(parseInt(l.pu)||0)
                          return (
                            <tr key={i} style={{ borderBottom:'1px solid #f8fafc' }}>
                              <td style={{ padding:'7px 10px',fontWeight:700,fontSize:13 }}>💊 {l.med}</td>
                              <td style={{ padding:'7px 10px',fontSize:12,color:'#64748b' }}>{l.cond||'—'}</td>
                              <td style={{ padding:'7px 10px',fontSize:13,fontFamily:'monospace',fontWeight:700 }}>{l.qte}</td>
                              <td style={{ padding:'7px 10px',fontSize:12,fontFamily:'monospace',color:'#64748b' }}>{fmtF(l.pu)}</td>
                              <td style={{ padding:'7px 10px',fontSize:13,fontFamily:'monospace',fontWeight:800,color:'#0d9488' }}>{fmtF(sous)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} style={{ padding:'10px 10px',textAlign:'right',fontWeight:700,fontSize:12,color:'#64748b' }}>
                            Total HT
                          </td>
                          <td style={{ padding:'10px 10px',fontFamily:'monospace',fontWeight:900,fontSize:16,color:isGros?'#ea580c':'#0d9488' }}>
                            {otrMode?'•••':fmtF(v.total)}
                          </td>
                        </tr>
                        {ta > 0 && (
                          <tr>
                            <td colSpan={4} style={{ padding:'4px 10px',textAlign:'right',fontSize:11,color:'#94a3b8' }}>TVA {tva?.taux||0}%</td>
                            <td style={{ padding:'4px 10px',fontFamily:'monospace',fontSize:12,color:'#94a3b8' }}>{fmtF(ta)}</td>
                          </tr>
                        )}
                      </tfoot>
                    </table>
                    {v.statut==='Annulé' && (
                      <div style={{ marginTop:8,padding:'8px 12px',borderRadius:10,background:'#fef2f2',border:'1px solid #fecaca' }}>
                        <span style={{ fontSize:12,fontWeight:700,color:'#dc2626' }}>✕ Vente annulée — stock restitué</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {!filtered.length && (
            <EmptyState icon="🛒" title="Aucune vente" subtitle="Enregistrez votre première vente depuis la caisse." />
          )}
        </div>

        <Pagination {...pagination} />
      </div>
    </div>
  )
}

export default Ventes
