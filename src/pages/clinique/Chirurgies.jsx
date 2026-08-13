import { useState, useMemo } from 'react'
import { Btn, Badge, Field, AutoSuggest, FilterBar, FilterSelect, FilterBtns, usePagination, Pagination, EmptyState } from '../../components/ui'
import { newId } from '../../lib/db'
import { fmtF } from '../../lib/utils'
import { venteToDbRow, validateChirurgieForm } from '../../lib/validation'
import { Scissors } from 'lucide-react'

const today = () => new Date().toISOString().split('T')[0]

const TYPES = ['Ovariohystérectomie','Castration','Ablation corps étranger','Suture plaie','Amputation','Césarienne','Biopsie','Laparotomie','Autre']
const STATUTS = ['Planifié','En cours','Terminé','Annulé']
const SC = { Planifié:'yellow', Terminé:'green', Annulé:'red', 'En cours':'blue' }

const EMPTY_PRODUIT = { med:'', medSearch:'', qte:1, pu:'', pa:0, showSugg:false }
const EMPTY_FORM = { date: today(), patient: '', proprio: '', type: 'Ovariohystérectomie', anesthesie: '', duree: '', chirurgien: '', statut: 'Planifié', suivi: '', montant: '', produits: [] }

function Chirurgies({ patients, equipe = [], chirurgies = [], setChirurgies, sb, dbInsert, dbUpdate, dbDelete, user, logAction, meds = [], setMeds, ventesHist, setVentesHist }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [patSugg, setPatSugg] = useState([])
  const [saving, setSaving] = useState(false)
  const [editStatut, setEditStatut] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [search, setSearch] = useState('')
  const [fStatut, setFStatut] = useState('')
  const [fType, setFType] = useState('')

  const nomsEquipe = equipe.length ? equipe.map(m => m.nom) : []
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  // ── Produits utilisés au bloc ───────────────────────────────
  const updP = (i, patch) => setForm(prev => { const p=[...prev.produits]; p[i]={...p[i],...patch}; return {...prev, produits:p} })
  const addP = () => setForm(prev => ({...prev, produits:[...prev.produits, {...EMPTY_PRODUIT}]}))
  const removeP = i => setForm(prev => ({...prev, produits:prev.produits.filter((_,j)=>j!==i)}))

  const produitsValides = form.produits.filter(p => p.med && (parseFloat(p.qte)||0) > 0)
  const totalProduits   = produitsValides.reduce((s,p) => s + (parseFloat(p.qte)||0)*(parseFloat(p.pu)||0), 0)
  const montantActe     = parseFloat(form.montant) || 0
  const totalGeneral    = montantActe + totalProduits

  /** Décrémente/restitue le stock des produits du bloc */
  const applyStockProduits = async (produits, delta) => {
    if (!setMeds || !produits?.length) return
    const updated = meds.map(m => {
      const p = produits.find(x => x.med === m.nom)
      if (!p) return m
      const newStock = Math.max(0, (m.stock||0) + delta*(parseFloat(p.qte)||0))
      if (sb && m.id) dbUpdate(sb,'medicaments',m.id,{stock:newStock}).catch(e=>console.warn('[stock chir]',e))
      return { ...m, stock:newStock }
    })
    setMeds(updated)
    try { localStorage.setItem('lb_medicaments', JSON.stringify(updated)) } catch(e) {}
  }

  /** Vente liée créée quand l'acte est Terminé (CA visible en Finances/Créances) */
  const createVenteLiee = async (chir) => {
    if (!setVentesHist) return
    const total = (parseFloat(chir.montant)||0)
    if (total <= 0) return
    const dejaLa = (ventesHist||[]).some(v => v.chirurgie_id === chir.id)
    if (dejaLa) return
    const acte = total - (chir.produits||[]).reduce((s,p)=>s+(parseFloat(p.qte)||0)*(parseFloat(p.pu)||0),0)
    const lignes = [
      ...(acte > 0 ? [{ med:`🔬 ${chir.type||'Acte chirurgical'}`, cond:'Chirurgie', qte:1, pu:acte, mult:1, pa:0 }] : []),
      ...(chir.produits||[]).map(p => ({ med:p.med, cond:'Bloc opératoire', qte:parseFloat(p.qte)||0, pu:parseFloat(p.pu)||0, pa:parseFloat(p.pa)||0, mult:1 })),
    ]
    const venteRow = {
      ...venteToDbRow({
        id:newId(), date:chir.date, client:chir.proprio || chir.patient,
        lignes, total, statut:'En attente', mode:'–',
        note:`Chirurgie ${chir.patient} — ${chir.type}`.slice(0,200),
        montant_paye:0, caissier:user?.name || '', type:'clinique',
      }),
      chirurgie_id: chir.id,
    }
    try {
      const saved = await dbInsert(sb,'ventes',venteRow)
      setVentesHist([saved, ...(ventesHist||[])].slice(0,500))
    } catch(e) { console.warn('[chirurgie→vente]', e?.message||e) }
  }

  // ── Ajout ──────────────────────────────────────────────────
  const addChir = async () => {
    const check = validateChirurgieForm(form)
    if (!check.ok) return alert(check.messages.join('\n'))
    const stockErr = produitsValides.map(p => { const m=meds.find(x=>x.nom===p.med); return (m && (parseFloat(p.qte)||0) > (m.stock||0)) ? `${p.med} : stock insuffisant (${m.stock||0} dispo)` : null }).filter(Boolean)
    if (stockErr.length) return alert(stockErr.join('\n'))
    setSaving(true)
    try {
      const produits = produitsValides.map(p => ({ med:p.med, qte:parseFloat(p.qte)||0, pu:parseFloat(p.pu)||0, pa:parseFloat(p.pa)||0 }))
      const row = { ...form, id: newId(), montant: totalGeneral, produits }
      const saved = await dbInsert(sb, 'chirurgies', row)
      setChirurgies([saved, ...chirurgies])
      if (form.statut === 'Terminé') {
        await createVenteLiee(saved)
        await applyStockProduits(produits, -1)
      }
      if (logAction) logAction(sb, user, 'chirurgie_created', `${form.patient} — ${form.type} — ${fmtF(totalGeneral)}`)
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (e) {
      alert('Erreur enregistrement : ' + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  // ── Mise à jour statut ──────────────────────────────────────
  const updateStatut = async (id, statut) => {
    const chir = chirurgies.find(c => c.id === id)
    try {
      await dbUpdate(sb, 'chirurgies', id, { statut })
      setChirurgies(chirurgies.map(c => c.id === id ? { ...c, statut } : c))
      setEditStatut(null)
      // Acte terminé → facturation + stock (une seule fois)
      if (statut === 'Terminé' && chir && chir.statut !== 'Terminé') {
        await createVenteLiee(chir)
        await applyStockProduits(chir.produits, -1)
      }
      // Annulation d'un acte terminé → restituer le stock
      if (statut === 'Annulé' && chir?.statut === 'Terminé') {
        await applyStockProduits(chir.produits, +1)
      }
    } catch (e) {
      alert('Erreur mise à jour : ' + (e?.message || e))
    }
  }

  // ── Suppression ─────────────────────────────────────────────
  const deleteChir = async (id) => {
    try {
      await dbDelete(sb, 'chirurgies', id)
      setChirurgies(chirurgies.filter(c => c.id !== id))
      setConfirmDel(null)
    } catch (e) {
      alert('Erreur suppression : ' + (e?.message || e))
    }
  }

  // ── Filtres ─────────────────────────────────────────────────
  const filtered = useMemo(() => chirurgies.filter(c => {
    const q = search.toLowerCase()
    if (q && !c.patient.toLowerCase().includes(q) && !c.proprio.toLowerCase().includes(q) && !c.type.toLowerCase().includes(q)) return false
    if (fStatut && c.statut !== fStatut) return false
    if (fType && c.type !== fType) return false
    return true
  }), [chirurgies, search, fStatut, fType])

  const pagination = usePagination(filtered, 10)

  // ── Stats ────────────────────────────────────────────────────
  // Recettes = actes terminés uniquement (cohérent avec Finances)
  const totalMontant = chirurgies.filter(c => c.statut === 'Terminé').reduce((s, c) => s + (c.montant || 0), 0)
  const ce_mois = chirurgies.filter(c => c.date?.startsWith(new Date().toISOString().slice(0, 7))).length

  return (
    <div className="app-page space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Total actes',     v: chirurgies.length,                                                mod: 'stat-tile--blue'   },
          { l: 'Ce mois',         v: ce_mois,                                                           mod: 'stat-tile--green'  },
          { l: 'Planifiés',       v: chirurgies.filter(c => c.statut === 'Planifié').length,           mod: 'stat-tile--yellow' },
          { l: 'Recettes (terminés)', v: fmtF(totalMontant),                                           mod: 'stat-tile--purple' },
        ].map((s, i) => (
          <div key={i} className={`stat-tile ${s.mod}`}>
            <div className="stat-tile__label">{s.l}</div>
            <div className="stat-tile__value">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="app-card">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Scissors size={20} color="#2563eb" strokeWidth={2.3} /> Chirurgies & Actes</h2>
            <p className="text-xs text-slate-400 mt-0.5">{chirurgies.length} acte(s) enregistré(s)</p>
          </div>
          <Btn onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ Annuler' : '+ Nouvel acte'}
          </Btn>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="p-5 border-b" style={{ background: 'linear-gradient(135deg,#f0fdfa,#f5fffe)', borderBottomColor: 'rgba(13,148,136,0.15)' }}>
            <h3 className="font-bold mb-4" style={{ color: '#0f766e' }}>Nouvel acte chirurgical</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Field label="Date" value={form.date} onChange={f('date')} type="date" />

              <div className="md:col-span-1">
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Patient *</label>
                <AutoSuggest
                  value={form.patient}
                  onChange={e => {
                    setForm(p => ({ ...p, patient: e.target.value }))
                    setPatSugg(patients.filter(p => p.nom.toLowerCase().includes(e.target.value.toLowerCase())).slice(0, 6))
                  }}
                  list={patSugg}
                  onSelect={p => { setForm(fp => ({ ...fp, patient: p.nom, proprio: p.proprio })); setPatSugg([]) }}
                  placeholder="Nom de l'animal"
                />
              </div>

              <Field label="Propriétaire" value={form.proprio} onChange={f('proprio')} placeholder="Propriétaire" />
              <Field label="Type d'acte *" value={form.type} onChange={f('type')} options={TYPES} />
              <Field label="Anesthésie" value={form.anesthesie} onChange={f('anesthesie')} placeholder="Protocole utilisé" />
              <Field label="Durée" value={form.duree} onChange={f('duree')} placeholder="ex: 45 min" />
              <Field label="Chirurgien" value={form.chirurgien} onChange={f('chirurgien')} options={nomsEquipe.length ? ['', ...nomsEquipe] : ['']} />
              <Field label="Montant (FCFA)" value={form.montant} onChange={f('montant')} type="number" placeholder="0" />
              <Field label="Statut" value={form.statut} onChange={f('statut')} options={STATUTS} />
              <Field label="Suivi post-op" value={form.suivi} onChange={f('suivi')} placeholder="Notes de suivi…" className="md:col-span-4" />
            </div>

            {/* Produits utilisés au bloc */}
            <div style={{ background:'white',borderRadius:14,padding:'14px 16px',marginBottom:14,border:'1px solid #e2e8f0' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
                <p style={{ fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em' }}>💉 Produits utilisés au bloc <span style={{ textTransform:'none',fontWeight:400 }}>(facturés + stock décompté quand l'acte est Terminé)</span></p>
                <button type="button" onClick={addP}
                  style={{ fontSize:12,fontWeight:700,padding:'5px 12px',borderRadius:9,background:'#f0fdfa',border:'1px solid #99f6e4',color:'#0d9488',cursor:'pointer' }}>+ Ajouter</button>
              </div>
              {form.produits.map((p,i) => {
                const sous = (parseFloat(p.qte)||0)*(parseFloat(p.pu)||0)
                const suggestions = meds.filter(m => m.stock>0 && m.nom.toLowerCase().includes((p.medSearch||'').toLowerCase()))
                return (
                  <div key={i} style={{ display:'grid',gridTemplateColumns:'2fr 0.7fr 1fr 1fr 28px',gap:8,alignItems:'center',marginBottom:6 }}>
                    <div style={{ position:'relative' }}>
                      <input type="text" placeholder="Rechercher un produit…"
                        value={p.medSearch !== undefined ? p.medSearch : p.med}
                        onChange={e=>updP(i,{medSearch:e.target.value,med:'',showSugg:true})}
                        onFocus={()=>updP(i,{showSugg:true})}
                        onBlur={()=>setTimeout(()=>updP(i,{showSugg:false}),160)}
                        style={{ border:'1.5px solid #e2e8f0',borderRadius:10,padding:'8px 12px',fontSize:13,width:'100%',outline:'none',boxSizing:'border-box' }} />
                      {p.showSugg && (
                        <div style={{ position:'absolute',zIndex:30,top:'100%',left:0,right:0,marginTop:4,background:'white',border:'1px solid #e2e8f0',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.08)',maxHeight:180,overflowY:'auto' }}>
                          {suggestions.map(m => (
                            <button key={m.id||m.nom} type="button"
                              style={{ display:'flex',justifyContent:'space-between',width:'100%',textAlign:'left',padding:'7px 12px',fontSize:13,background:'none',border:'none',cursor:'pointer' }}
                              onMouseDown={()=>updP(i,{med:m.nom,medSearch:m.nom,pu:m.prixVente||m.prix_vente||'',pa:parseFloat(m.prixAchat??m.prix_achat)||0,showSugg:false})}
                              onMouseEnter={e=>e.currentTarget.style.background='#f0fdf4'}
                              onMouseLeave={e=>e.currentTarget.style.background='none'}>
                              <span style={{ fontWeight:600 }}>{m.nom}</span>
                              <span style={{ fontSize:11,color:'#94a3b8' }}>stk: {m.stock}</span>
                            </button>
                          ))}
                          {!suggestions.length && <div style={{ padding:'7px 12px',fontSize:13,color:'#94a3b8' }}>Aucun résultat</div>}
                        </div>
                      )}
                    </div>
                    <input type="number" min="0" step="0.1" value={p.qte} onChange={e=>updP(i,{qte:e.target.value})}
                      style={{ border:'1.5px solid #e2e8f0',borderRadius:10,padding:'8px 6px',fontSize:13,width:'100%',textAlign:'center',outline:'none',boxSizing:'border-box' }} />
                    <input type="number" min="0" value={p.pu} onChange={e=>updP(i,{pu:e.target.value})} placeholder="Prix unit."
                      style={{ border:'1.5px solid #e2e8f0',borderRadius:10,padding:'8px 12px',fontSize:13,width:'100%',outline:'none',boxSizing:'border-box' }} />
                    <span style={{ fontSize:13,fontWeight:800,fontFamily:'monospace',color:'#0d9488' }}>{fmtF(sous)}</span>
                    <button type="button" onClick={()=>removeP(i)}
                      style={{ width:26,height:26,borderRadius:8,background:'#fef2f2',border:'1px solid #fecaca',color:'#ef4444',fontSize:12,cursor:'pointer' }}>✕</button>
                  </div>
                )
              })}
              {!form.produits.length && <p style={{ fontSize:12,color:'#94a3b8',fontStyle:'italic' }}>Aucun produit — anesthésiques, sutures, consommables… (ex : 5 ml × 100 F = 500 F).</p>}
            </div>

            <div style={{ display:'flex',alignItems:'center',gap:16,flexWrap:'wrap' }}>
              <Btn color="brand" onClick={addChir} disabled={saving}>
                {saving ? '⏳ Enregistrement…' : '✓ Enregistrer l\'acte'}
              </Btn>
              <div style={{ marginLeft:'auto',textAlign:'right' }}>
                <p style={{ fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:2 }}>Total à facturer</p>
                <span style={{ fontSize:22,fontWeight:900,fontFamily:'monospace',color:'#0d9488' }}>{fmtF(totalGeneral)}</span>
                {totalProduits>0 && <p style={{ fontSize:10,color:'#94a3b8' }}>acte {fmtF(montantActe)} + produits {fmtF(totalProduits)}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Filtres */}
        <FilterBar
          search={search} onSearch={setSearch} placeholder="Rechercher patient, type…"
          activeCount={[fStatut, fType].filter(Boolean).length}
          onReset={() => { setSearch(''); setFStatut(''); setFType('') }}
        >
          <FilterBtns
            label="Statut"
            value={fStatut}
            onChange={setFStatut}
            options={[
              { v: '', l: 'Tous' },
              { v: 'Planifié',  l: 'Planifiés',  color: 'yellow' },
              { v: 'En cours',  l: 'En cours',   color: 'blue'   },
              { v: 'Terminé',   l: 'Terminés',   color: 'green'  },
              { v: 'Annulé',    l: 'Annulés',    color: 'red'    },
            ]}
          />
          <FilterSelect label="Type" value={fType} onChange={setFType} options={TYPES.map(t => ({ v: t, l: t }))} />
          <span className="text-xs text-slate-400">{filtered.length}/{chirurgies.length}</span>
        </FilterBar>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)' }}>
                {['Date', 'Patient', 'Type d\'acte', 'Anesthésie', 'Durée', 'Chirurgien', 'Montant', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left p-3 text-xs font-bold text-white uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map(c => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm font-mono text-slate-600 whitespace-nowrap">{c.date}</td>
                  <td className="p-3">
                    <span className="font-semibold text-slate-900">{c.patient}</span>
                    {c.proprio && <div className="text-xs text-slate-400">{c.proprio}</div>}
                  </td>
                  <td className="p-3 font-medium text-sm" style={{ color: '#7c3aed' }}>{c.type}</td>
                  <td className="p-3 text-sm text-slate-600 max-w-[140px] truncate">{c.anesthesie || '—'}</td>
                  <td className="p-3 text-sm text-slate-600 whitespace-nowrap">{c.duree || '—'}</td>
                  <td className="p-3 text-sm text-slate-600">{c.chirurgien || '—'}</td>
                  <td className="p-3 font-bold font-mono text-sm whitespace-nowrap" style={{ color: '#0d9488' }}>{fmtF(c.montant || 0)}</td>
                  <td className="p-3">
                    {editStatut === c.id ? (
                      <div className="flex flex-col gap-1">
                        {STATUTS.map(s => (
                          <button key={s} onClick={() => updateStatut(c.id, s)}
                            className="text-xs px-2 py-1 rounded-lg text-left font-semibold transition-all"
                            style={{ background: c.statut === s ? '#f0fdfa' : '#f8fafc', color: c.statut === s ? '#0d9488' : '#475569', border: c.statut === s ? '1px solid #99f6e4' : '1px solid #e2e8f0' }}>
                            {s}
                          </button>
                        ))}
                        <button onClick={() => setEditStatut(null)} className="text-xs text-slate-400 mt-1">✕ Fermer</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditStatut(c.id)} title="Changer le statut">
                        <Badge color={SC[c.statut] || 'slate'}>{c.statut}</Badge>
                      </button>
                    )}
                  </td>
                  <td className="p-3">
                    {confirmDel === c.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => deleteChir(c.id)}
                          style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer' }}>
                          Oui
                        </button>
                        <button onClick={() => setConfirmDel(null)}
                          style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer' }}>
                          Non
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDel(c.id)}
                        style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', cursor: 'pointer' }}>
                        🗑
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filtered.length && <EmptyState icon="🔬" title="Aucun acte chirurgical" subtitle="Enregistrez les actes chirurgicaux réalisés à la clinique." />}

        <Pagination {...pagination} />
      </div>
    </div>
  )
}

export default Chirurgies
