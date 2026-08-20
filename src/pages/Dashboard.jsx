import { useMemo, useState } from 'react'
import { PawPrint, Calendar, AlertTriangle, Coins, Stethoscope, FileText, ShoppingCart, Pill, TrendingUp, Receipt, Scale, Zap, Syringe, Factory, TrendingDown, Banknote, Smartphone, Landmark, PenLine, Clock, Phone, CalendarCheck, CheckCircle2 } from 'lucide-react'
import { joursAvantRupture, venteEncaisse, venteMarge } from '../lib/ventes'
import { exportCSV } from '../lib/utils'

function Dashboard({ patients, meds, setView, ventesHist, achatsHist = [], versements = [], depsHist = [], rdvs, user, clinique, tva, otrMode }) {
  const fmtF  = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'
  const fmtK  = (v) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M F` : v >= 1000 ? `${Math.round(v/1000)}k F` : fmtF(v)
  const mask  = (v) => otrMode ? '••••• F' : fmtF(v)
  const todayStr = new Date().toISOString().split('T')[0]

  // ── Salutation dynamique ────────────────────────────────────
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  // ── Périodes ────────────────────────────────────────────────
  const thisMonthStr  = new Date().toISOString().slice(0, 7)
  const lastMonthDate = new Date(); lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
  const lastMonthStr  = lastMonthDate.toISOString().slice(0, 7)

  // ── Ventes (hors achats internes clinique → pas de double comptage) ──
  const ventesReelles     = (ventesHist || []).filter(v => v.type !== 'cession')
  const ventesMois        = ventesReelles.filter(v => v.date?.startsWith(thisMonthStr))
  const ventesLastMois    = ventesReelles.filter(v => v.date?.startsWith(lastMonthStr))
  const totalMois         = ventesMois.reduce((s,v) => s+(v.total||0), 0)
  const totalLastMois     = ventesLastMois.reduce((s,v) => s+(v.total||0), 0)
  const totalMoisPaye     = ventesMois.filter(v => v.statut==='Payé').reduce((s,v) => s+(v.total||0), 0)
  const revenuTrend       = totalLastMois > 0 ? Math.round(((totalMois - totalLastMois) / totalLastMois) * 100) : null
  const nbVentesMois      = ventesMois.length
  const totalCreances     = ventesReelles.filter(v=>['À crédit','Partiellement payé','En attente'].includes(v.statut)).reduce((s,v)=>s+(v.total||0),0)

  // ── Ventes aujourd'hui ──────────────────────────────────────
  const ventesJour        = ventesReelles.filter(v => v.date === todayStr && v.statut !== 'Annulé')
  const caJour            = ventesJour.reduce((s,v) => s+(v.total||0), 0)

  // ── Recettes par période (filtre jour/semaine/mois/année/perso) ──
  const [recPeriode, setRecPeriode] = useState('jour')
  const [recDu, setRecDu]           = useState(todayStr)
  const [recAu, setRecAu]           = useState(todayStr)
  // Brouillon des dates personnalisées — appliquées au clic sur « Appliquer »
  const [recDuTmp, setRecDuTmp]     = useState(todayStr)
  const [recAuTmp, setRecAuTmp]     = useState(todayStr)
  const recPersoModifie = recDuTmp !== recDu || recAuTmp !== recAu
  const appliquerPerso  = () => { setRecDu(recDuTmp); setRecAu(recAuTmp) }
  const [showDeps, setShowDeps]     = useState(false)

  const recRange = useMemo(() => {
    const iso = (x) => x.toISOString().split('T')[0]
    const d = new Date()
    if (recPeriode === 'jour')    return { du: todayStr, au: todayStr }
    if (recPeriode === 'semaine') { const s = new Date(d); s.setDate(d.getDate() - ((d.getDay()+6)%7)); return { du: iso(s), au: todayStr } }
    if (recPeriode === 'mois')    return { du: todayStr.slice(0,8)+'01', au: todayStr }
    if (recPeriode === 'annee')   return { du: todayStr.slice(0,4)+'-01-01', au: todayStr }
    const du = recDu || todayStr, au = recAu || todayStr
    return du <= au ? { du, au } : { du: au, au: du }
  }, [recPeriode, recDu, recAu, todayStr])

  const recStats = useMemo(() => {
    const { du, au } = recRange
    const vs = ventesReelles.filter(v => v.statut !== 'Annulé' && v.date && v.date >= du && v.date <= au)
    const encaisse    = vs.reduce((s,v) => s + venteEncaisse(v, tva), 0)
    const facture     = vs.reduce((s,v) => s + (v.total||0), 0)
    const nb          = vs.length
    const encClinique = vs.filter(v => v.type === 'clinique').reduce((s,v) => s + venteEncaisse(v, tva), 0)
    // Période précédente équivalente (même durée, juste avant)
    const iso = (x) => x.toISOString().split('T')[0]
    const len  = Math.round((new Date(au) - new Date(du)) / 86400000) + 1
    const pAu  = new Date(new Date(du).getTime() - 86400000)
    const pDu  = new Date(pAu.getTime() - (len-1) * 86400000)
    const prevEnc = ventesReelles
      .filter(v => v.statut !== 'Annulé' && v.date && v.date >= iso(pDu) && v.date <= iso(pAu))
      .reduce((s,v) => s + venteEncaisse(v, tva), 0)
    const trend = prevEnc > 0 ? Math.round(((encaisse - prevEnc) / prevEnc) * 100) : null
    const deps  = (depsHist||[]).filter(x => x.date && x.date >= du && x.date <= au).reduce((s,x) => s + (x.montant||0), 0)
    const marge = vs.filter(v => v.statut === 'Payé').reduce((s,v) => s + venteMarge(v, meds), 0)
    return { encaisse, facture, nb, panier: nb ? Math.round(facture/nb) : 0,
             encClinique, encPharma: encaisse - encClinique, trend, deps, net: encaisse - deps, marge }
  }, [ventesHist, depsHist, recRange, tva, meds])

  // ── RDV ─────────────────────────────────────────────────────
  const rdvsAll           = rdvs || []
  const rdvsAujourdhui    = rdvsAll.filter(r => r.date === todayStr && r.statut !== 'Annulé')
  const d1 = new Date(); d1.setDate(d1.getDate()+1); const d1s = d1.toISOString().split('T')[0]
  const d2 = new Date(); d2.setDate(d2.getDate()+2); const d2s = d2.toISOString().split('T')[0]
  const d3 = new Date(); d3.setDate(d3.getDate()+3); const d3s = d3.toISOString().split('T')[0]
  const rdvsProchains     = rdvsAll.filter(r => [d1s,d2s,d3s].includes(r.date) && r.statut !== 'Annulé')
    .sort((a,b) => a.date.localeCompare(b.date) || a.heure.localeCompare(b.heure))

  // ── Stock ────────────────────────────────────────────────────
  const alertesStock      = meds.filter(m => (m.seuil||0) > 0 && m.stock <= m.seuil)

  // ── Prévision de rupture : produits encore au-dessus du seuil mais
  //    qui seront épuisés sous 7 jours au rythme de vente actuel ──
  const rupturesProchaines = useMemo(() => meds
    .filter(m => (m.stock||0) > 0 && !((m.seuil||0) > 0 && m.stock <= m.seuil))
    .map(m => ({ m, j: joursAvantRupture(m, ventesHist || []) }))
    .filter(x => x.j != null && x.j <= 7)
    .sort((a, b) => a.j - b.j)
    .slice(0, 4), [meds, ventesHist])
  const now               = Date.now()
  const peremProches      = meds.filter(m => {
    if (!m.peremption) return false
    const j = Math.round((new Date(m.peremption) - now) / 86400000)
    return j >= 0 && j <= 30
  }).sort((a,b) => new Date(a.peremption) - new Date(b.peremption))

  // ── Échéances fournisseurs (J+7 ou dépassées, solde restant dû) ──
  const echeancesFournisseurs = useMemo(() => {
    const limite = new Date(Date.now() + 7*86400000).toISOString().split('T')[0]
    // Solde par fournisseur (commandes reçues − versements)
    const soldes = {}
    for (const c of (achatsHist||[])) { if (c.statut !== 'Reçu') continue; soldes[c.fournisseur] = (soldes[c.fournisseur]||0) + (c.total||0) }
    for (const v of (versements||[])) { const k = v.fournisseur || v.nom; if (!k) continue; soldes[k] = (soldes[k]||0) - (v.montant||0) }
    return (achatsHist||[])
      .filter(c => c.statut === 'Reçu' && c.echeance && c.echeance <= limite && (soldes[c.fournisseur]||0) > 0)
      .map(c => ({
        fournisseur: c.fournisseur, num: c.num, echeance: c.echeance,
        total: c.total || 0, solde: soldes[c.fournisseur] || 0,
        jours: Math.round((new Date(c.echeance) - now) / 86400000),
      }))
      .sort((a,b) => a.echeance.localeCompare(b.echeance))
      .slice(0, 6)
  }, [achatsHist, versements])

  // ── Numéro WhatsApp : normalise au format international (+228 par défaut) ──
  const waNumber = (tel) => {
    const digits = String(tel||'').replace(/[^\d]/g,'')
    if (!digits) return null
    return digits.length === 8 ? `228${digits}` : digits
  }

  // ── Rappels vaccinaux (à J+14 ou en retard) ──────────────────
  const rappelsVaccins = useMemo(() => {
    const limite = new Date(Date.now() + 14*86400000).toISOString().split('T')[0]
    // Ne garder que la DERNIÈRE injection de chaque vaccin par patient
    const dernieres = {}
    for (const p of (patients||[])) {
      for (const v of (p.vaccins||[])) {
        if (!v?.nom) continue
        const key = `${p.id}|${v.nom}`
        if (!dernieres[key] || (v.date||'') > (dernieres[key].v.date||'')) dernieres[key] = { p, v }
      }
    }
    return Object.values(dernieres)
      .filter(({ v }) => v.prochain && v.prochain <= limite)
      .map(({ p, v }) => ({
        patient: p.nom, proprio: p.proprio, tel: p.tel,
        vaccin: v.nom, prochain: v.prochain,
        jours: Math.round((new Date(v.prochain) - now) / 86400000),
      }))
      .sort((a,b) => a.prochain.localeCompare(b.prochain))
      .slice(0, 8)
  }, [patients])

  // ── Dettes fournisseurs ──────────────────────────────────────
  const totalVerse        = useMemo(() => (versements||[]).reduce((s,v)=>s+(v.montant||0),0), [versements])
  const totalCmdsRecues   = useMemo(() => (achatsHist||[]).filter(c=>c.statut==='Reçu').reduce((s,c)=>s+(c.total||0),0), [achatsHist])
  const totalDettes       = Math.max(0, totalCmdsRecues - totalVerse)
  const positionNette     = totalCreances - totalDettes
  const topFournisseursDus = useMemo(() => {
    const map = {}
    for (const c of (achatsHist||[])) { if (c.statut!=='Reçu') continue; map[c.fournisseur]=(map[c.fournisseur]||0)+(c.total||0) }
    for (const v of (versements||[])) { const k=v.fournisseur||v.nom; if(!k) continue; map[k]=(map[k]||0)-(v.montant||0) }
    return Object.entries(map).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,5)
  }, [achatsHist, versements])

  // ── Charts ───────────────────────────────────────────────────
  const [chartRange, setChartRange] = useState(14)
  const chartData = useMemo(() => Array.from({ length: chartRange }, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (chartRange-1) + i)
    const ds = d.toISOString().split('T')[0]
    const val = (ventesHist||[]).filter(v=>v.date===ds).reduce((s,v)=>s+(v.total||0),0)
    return { ds, val, label: d.getDate().toString(), isToday: ds===todayStr, dayOfWeek: d.getDay() }
  }), [ventesHist, chartRange])
  const maxChart = Math.max(...chartData.map(v=>v.val), 1)
  const totalChart = chartData.reduce((s,v)=>s+v.val, 0)

  // ── Top médicaments ──────────────────────────────────────────
  const topMeds = useMemo(() => {
    const counts = {}
    for (const v of (ventesHist||[])) for (const l of (v.lignes||[])) if (l.med) counts[l.med]=(counts[l.med]||0)+(Number(l.qte)||1)
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5)
  }, [ventesHist])
  const maxTopMed = topMeds.length ? topMeds[0][1] : 1

  // ── Patients ─────────────────────────────────────────────────
  const patientsRecents = useMemo(() =>
    [...patients].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,5), [patients])
  const especes = patients.reduce((a,p)=>{ a[p.espece]=(a[p.espece]||0)+1; return a }, {})
  const especeTop = Object.entries(especes).sort((a,b)=>b[1]-a[1])

  // ── Ventes récentes ──────────────────────────────────────────
  const ventesRecentes = useMemo(() =>
    [...(ventesHist||[])].sort((a,b)=>(b.date||'')>(a.date||'')?1:-1).slice(0,6), [ventesHist])
  const creanciers = useMemo(() => {
    const map = {}
    for (const v of (ventesHist||[])) {
      if (!['À crédit','Partiellement payé','En attente'].includes(v.statut)) continue
      map[v.client]=(map[v.client]||0)+(v.total||0)
    }
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5)
  }, [ventesHist])
  const repartitionMode = useMemo(() => {
    const map = {}
    for (const v of (ventesHist||[])) { if (v.statut!=='Payé') continue; map[v.mode]=(map[v.mode]||0)+(v.total||0) }
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,4)
  }, [ventesHist])
  const totalRepartition = repartitionMode.reduce((s,[,v])=>s+v, 0)

  // ── Constants ────────────────────────────────────────────────
  const SPECIES_EMOJI  = { Chien:'🐕', Chat:'🐈', Bovin:'🐄', Caprin:'🐐', Ovin:'🐑', Volaille:'🐓' }
  const MED_COLORS     = ['#7c3aed','#2563eb','#0d9488','#d97706','#dc2626']
  const STATUT_COLOR   = { Payé:'#16a34a','À crédit':'#d97706','Partiellement payé':'#2563eb','En attente':'#64748b',Annulé:'#dc2626' }
  const STATUT_BG      = { Payé:'#f0fdf4','À crédit':'#fffbeb','Partiellement payé':'#eff6ff','En attente':'#f8fafc',Annulé:'#fef2f2' }
  const MODE_ICON      = { 'Espèces':Banknote, 'Mobile Money':Smartphone, Virement:Landmark, Chèque:PenLine }
  const speciesColors  = ['#2563eb','#16a34a','#d97706','#7c3aed','#dc2626']

  const KPIS = [
    { label:'Patients enregistrés', val:patients.length,           icon:PawPrint,      accent:'#0d9488', vw:'patients', sub: especeTop[0] ? `${especeTop[0][0]} majoritaire` : 'aucun patient enregistré' },
    { label:"RDV aujourd'hui",      val:rdvsAujourdhui.length,     icon:Calendar,      accent:'#7c3aed', vw:'agenda',   sub:`${rdvsProchains.length} dans les 3 prochains jours` },
    { label:'Stocks critiques',     val:alertesStock.length,       icon:AlertTriangle, accent:'#dc2626', vw:'medicaments', sub: peremProches.length ? `+ ${peremProches.length} expirent bientôt` : 'médicaments en alerte' },
    { label:'Encaissé ce mois',     val:fmtK(totalMoisPaye),       icon:Coins,         accent:'#d97706', vw:'caisse',
      sub: totalDettes > 0 ? `${fmtK(totalDettes)} à payer fourn.` : totalCreances > 0 ? `${fmtK(totalCreances)} de créances` : `${nbVentesMois} vente(s)`,
      subColor: totalDettes > 0 ? '#dc2626' : totalCreances > 0 ? '#d97706' : undefined,
      trend: revenuTrend },
  ]

  const quickActions = [
    { i:PawPrint,    t:'Nouveau patient',  d:'Enregistrer un animal',    v:'patients',      c:'#f0fdfa', b:'#99f6e4', tc:'#0d9488' },
    { i:Stethoscope, t:'Consultation',     d:'Ouvrir un dossier',        v:'consultations', c:'#f0fdfa', b:'#5eead4', tc:'#0f766e' },
    { i:FileText,    t:'Ordonnance',       d:'Rédiger une ordonnance',   v:'ordonnances',   c:'#faf5ff', b:'#d8b4fe', tc:'#7c3aed' },
    { i:ShoppingCart,t:'Nouvelle vente',   d:'Caisse & facturation',     v:'caisse',        c:'#fff7ed', b:'#fed7aa', tc:'#c2410c' },
    { i:Pill,        t:'Médicaments',      d:'Gérer le stock',           v:'medicaments',   c:'#fefce8', b:'#fde68a', tc:'#ca8a04' },
    { i:Calendar,    t:'Nouveau RDV',      d:'Planifier un rendez-vous', v:'agenda',        c:'#eff6ff', b:'#bfdbfe', tc:'#1d4ed8' },
  ]

  // Mois courant vs dernier mois ratio (pour barre de progression)
  const moisPct = totalLastMois > 0 ? Math.min(100, Math.round((totalMois/totalLastMois)*100)) : null

  const dayLabels = ['D','L','M','M','J','V','S']

  return (
    <div className="dashboard-page">

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <div className="dash-hero" style={{ background:'linear-gradient(135deg,#f0fdfa 0%,#e0f2fe 50%,#faf5ff 100%)', borderRadius:20, padding:'24px 28px', marginBottom:20, border:'1px solid rgba(13,148,136,0.12)', position:'relative', overflow:'hidden' }}>
        {/* Décoration */}
        <div style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%', background:'rgba(13,148,136,0.06)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-30, right:80, width:120, height:120, borderRadius:'50%', background:'rgba(124,58,237,0.05)', pointerEvents:'none' }} />

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap', position:'relative' }}>
          <div>
            <p style={{ fontSize:12, fontWeight:700, color:'#0d9488', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>
              {new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </p>
            <h1 style={{ fontSize:26, fontWeight:900, color:'#0f172a', lineHeight:1.1, margin:0 }}>
              {greeting}, <span style={{ color:'#0d9488' }}>{user?.name || '–'}</span> 👋
            </h1>
            <p style={{ fontSize:13, color:'#64748b', marginTop:6 }}>{clinique?.nom || 'La Barakat'} — Pharmacie &amp; Clinique Vétérinaire</p>
          </div>
          {/* Today at a glance pills */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-start' }}>
            {[
              { icon:ShoppingCart,  label:`${ventesJour.length} vente(s) aujourd'hui`, color:'#0d9488', bg:'#f0fdfa', border:'#99f6e4' },
              { icon:Coins,         label:fmtK(caJour), color:'#d97706', bg:'#fffbeb', border:'#fde68a' },
              { icon:Calendar,      label:`${rdvsAujourdhui.length} RDV`, color:'#7c3aed', bg:'#faf5ff', border:'#e9d5ff' },
              alertesStock.length > 0 && { icon:AlertTriangle, label:`${alertesStock.length} alerte(s)`, color:'#dc2626', bg:'#fef2f2', border:'#fecaca' },
            ].filter(Boolean).map((p,i) => (
              <span key={i} className="dash-hero-pill" style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:99, fontSize:12, fontWeight:700, background:p.bg, border:`1px solid ${p.border}`, color:p.color, whiteSpace:'nowrap' }}>
                <p.icon size={13} strokeWidth={2.4} />{p.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ══ RECETTES PAR PÉRIODE ═══════════════════════════════ */}
      <div style={{ background:'var(--app-surface, white)', border:'1px solid var(--app-border, #e2e8f0)', borderRadius:16, padding:'16px 20px', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:30, height:30, borderRadius:9, background:'#f0fdf4', border:'1px solid #bbf7d0', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
              <Coins size={15} color="#16a34a" strokeWidth={2.4} />
            </span>
            <span style={{ fontWeight:800, fontSize:15, color:'var(--app-text, #0f172a)' }}>Recettes</span>
            {recStats.trend != null && (
              <span style={{ fontSize:11, fontWeight:800, padding:'2px 8px', borderRadius:99,
                background:recStats.trend>=0?'#f0fdf4':'#fef2f2', color:recStats.trend>=0?'#16a34a':'#dc2626',
                border:`1px solid ${recStats.trend>=0?'#bbf7d0':'#fecaca'}` }}>
                {recStats.trend>=0?'↑':'↓'} {Math.abs(recStats.trend)}% vs période préc.
              </span>
            )}
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
            {[['jour',"Aujourd'hui"],['semaine','Semaine'],['mois','Mois'],['annee','Année'],['perso','Personnalisé']].map(([k,label]) => (
              <button key={k} type="button" onClick={() => setRecPeriode(k)}
                style={{ fontSize:12, fontWeight:700, padding:'5px 12px', borderRadius:99, cursor:'pointer', transition:'all .15s',
                  background:recPeriode===k?'#0d9488':'transparent', color:recPeriode===k?'white':'var(--app-muted, #64748b)',
                  border:`1px solid ${recPeriode===k?'#0d9488':'var(--app-border, #e2e8f0)'}` }}>
                {label}
              </button>
            ))}
            <button type="button" onClick={() => setShowDeps(p => !p)}
              style={{ fontSize:12, fontWeight:700, padding:'5px 12px', borderRadius:99, cursor:'pointer', transition:'all .15s',
                background:showDeps?'#fef2f2':'transparent', color:showDeps?'#dc2626':'var(--app-muted, #64748b)',
                border:`1px solid ${showDeps?'#fecaca':'var(--app-border, #e2e8f0)'}` }}>
              {showDeps ? '− Dépenses' : '+ Dépenses'}
            </button>
            <button type="button" title="Exporter les ventes de la période (CSV Excel)"
              onClick={() => {
                const { du, au } = recRange
                const vs = ventesReelles.filter(v => v.statut !== 'Annulé' && v.date && v.date >= du && v.date <= au)
                if (!vs.length) return alert('Aucune vente sur cette période.')
                exportCSV(`recettes_${du}_${au}`,
                  ['Date','Client','Type','Statut','Mode','Total HT','TVA','TTC','Encaissé'],
                  vs.map(v => [v.date, v.client || 'Comptoir', v.type || 'detail', v.statut, v.mode || '', v.total || 0, v.tva_amt || 0, (v.total||0)+(v.tva_amt||0), venteEncaisse(v, tva)]))
              }}
              style={{ fontSize:12, fontWeight:700, padding:'5px 12px', borderRadius:99, cursor:'pointer', transition:'all .15s',
                background:'transparent', color:'var(--app-muted, #64748b)', border:'1px solid var(--app-border, #e2e8f0)' }}>
              ⬇ CSV
            </button>
          </div>
        </div>

        {recPeriode === 'perso' && (
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--app-muted, #64748b)', display:'flex', alignItems:'center', gap:6 }}>
              Du <input type="date" value={recDuTmp} max={todayStr} onChange={e => setRecDuTmp(e.target.value)}
                style={{ fontSize:12, padding:'5px 8px', borderRadius:8, border:'1px solid var(--app-border, #e2e8f0)', background:'var(--app-surface, white)', color:'var(--app-text, #0f172a)' }} />
            </label>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--app-muted, #64748b)', display:'flex', alignItems:'center', gap:6 }}>
              Au <input type="date" value={recAuTmp} max={todayStr} onChange={e => setRecAuTmp(e.target.value)}
                style={{ fontSize:12, padding:'5px 8px', borderRadius:8, border:'1px solid var(--app-border, #e2e8f0)', background:'var(--app-surface, white)', color:'var(--app-text, #0f172a)' }} />
            </label>
            <button type="button" onClick={appliquerPerso} disabled={!recPersoModifie}
              style={{ fontSize:12, fontWeight:800, padding:'6px 16px', borderRadius:99, border:'none', transition:'all .15s',
                cursor:recPersoModifie?'pointer':'default',
                background:recPersoModifie?'#0d9488':'var(--app-border, #e2e8f0)',
                color:recPersoModifie?'white':'var(--app-muted, #94a3b8)',
                boxShadow:recPersoModifie?'0 2px 8px rgba(13,148,136,0.35)':'none' }}>
              Appliquer →
            </button>
            {recPersoModifie && <span style={{ fontSize:11, color:'#d97706', fontWeight:600 }}>Période modifiée — cliquez sur Appliquer</span>}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:12 }}>
          <button type="button" className="rec-card rec-card--green" onClick={() => { try { localStorage.setItem('lb_caisse_tab','historique'); localStorage.setItem('lb_caisse_range', JSON.stringify(recRange)) } catch(e) {}; setView('caisse') }} title="Voir les ventes de la période"
            style={{ padding:'12px 14px', borderRadius:12, background:'#f0fdf4', border:'1px solid #bbf7d0', textAlign:'left', cursor:'pointer', transition:'transform .12s, box-shadow .12s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(22,163,74,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#15803d', textTransform:'uppercase', letterSpacing:'.05em', margin:0, display:'flex', justifyContent:'space-between' }}>Encaissé (TTC)<span>→</span></p>
            <p style={{ fontSize:22, fontWeight:900, color:'#16a34a', margin:'4px 0 0', fontVariantNumeric:'tabular-nums' }}>{mask(recStats.encaisse)}</p>
            <p style={{ fontSize:10, color:'#15803d', margin:'2px 0 0', opacity:.8 }}>entré en caisse sur la période</p>
          </button>
          <button type="button" className="rec-card rec-card--blue" onClick={() => { try { localStorage.setItem('lb_caisse_tab','historique'); localStorage.setItem('lb_caisse_range', JSON.stringify(recRange)) } catch(e) {}; setView('caisse') }} title="Voir les ventes de la période"
            style={{ padding:'12px 14px', borderRadius:12, background:'#eff6ff', border:'1px solid #bfdbfe', textAlign:'left', cursor:'pointer', transition:'transform .12s, box-shadow .12s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', textTransform:'uppercase', letterSpacing:'.05em', margin:0, display:'flex', justifyContent:'space-between' }}>CA facturé (HT)<span>→</span></p>
            <p style={{ fontSize:22, fontWeight:900, color:'#2563eb', margin:'4px 0 0', fontVariantNumeric:'tabular-nums' }}>{mask(recStats.facture)}</p>
            <p style={{ fontSize:10, color:'#1d4ed8', margin:'2px 0 0', opacity:.8 }}>{recStats.nb} vente(s) · panier moyen {otrMode ? '•••' : fmtK(recStats.panier)}</p>
          </button>
          <button type="button" className="rec-card rec-card--amber" onClick={() => setView('rapports')} title="Voir les rapports détaillés"
            style={{ padding:'12px 14px', borderRadius:12, background:'#fffbeb', border:'1px solid #fde68a', textAlign:'left', cursor:'pointer', transition:'transform .12s, box-shadow .12s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(217,119,6,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#b45309', textTransform:'uppercase', letterSpacing:'.05em', margin:0, display:'flex', justifyContent:'space-between' }}>Marge brute<span>→</span></p>
            <p style={{ fontSize:22, fontWeight:900, color:'#d97706', margin:'4px 0 0', fontVariantNumeric:'tabular-nums' }}>{mask(recStats.marge)}</p>
            <p style={{ fontSize:10, color:'#b45309', margin:'2px 0 0', opacity:.8 }}>{otrMode || !recStats.facture ? 'ventes payées' : `${Math.round((recStats.marge / recStats.facture) * 100)}% du CA · ventes payées`}</p>
          </button>
          <button type="button" className="rec-card rec-card--purple" onClick={() => setView('rapports')} title="Voir les rapports détaillés"
            style={{ padding:'12px 14px', borderRadius:12, background:'#faf5ff', border:'1px solid #e9d5ff', textAlign:'left', cursor:'pointer', transition:'transform .12s, box-shadow .12s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(124,58,237,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'.05em', margin:0, display:'flex', justifyContent:'space-between' }}>Répartition<span>→</span></p>
            <p style={{ fontSize:13, fontWeight:800, color:'#7c3aed', margin:'6px 0 0', display:'flex', alignItems:'center', gap:5 }}><Pill size={13} strokeWidth={2.5} /> Pharmacie · {mask(recStats.encPharma)}</p>
            <p style={{ fontSize:13, fontWeight:800, color:'#2563eb', margin:'2px 0 0', display:'flex', alignItems:'center', gap:5 }}><Stethoscope size={13} strokeWidth={2.5} /> Clinique · {mask(recStats.encClinique)}</p>
          </button>
          {showDeps && (
            <>
              <button type="button" className="rec-card rec-card--red" onClick={() => setView('depenses')} title="Voir le détail des dépenses"
                style={{ padding:'12px 14px', borderRadius:12, background:'#fef2f2', border:'1px solid #fecaca', textAlign:'left', cursor:'pointer', transition:'transform .12s, box-shadow .12s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(220,38,38,0.18)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'#b91c1c', textTransform:'uppercase', letterSpacing:'.05em', margin:0, display:'flex', justifyContent:'space-between' }}>Dépenses<span>→</span></p>
                <p style={{ fontSize:22, fontWeight:900, color:'#dc2626', margin:'4px 0 0', fontVariantNumeric:'tabular-nums' }}>{mask(recStats.deps)}</p>
                <p style={{ fontSize:10, color:'#b91c1c', margin:'2px 0 0', opacity:.8 }}>sorties sur la période</p>
              </button>
              <button type="button" className={`rec-card ${recStats.net>=0?'rec-card--teal':'rec-card--orange'}`} onClick={() => setView('finances')} title="Voir l'état financier"
                style={{ padding:'12px 14px', borderRadius:12, background:recStats.net>=0?'#f0fdfa':'#fff7ed', border:`1px solid ${recStats.net>=0?'#99f6e4':'#fed7aa'}`, textAlign:'left', cursor:'pointer', transition:'transform .12s, box-shadow .12s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(13,148,136,0.18)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
                <p style={{ fontSize:11, fontWeight:700, color:recStats.net>=0?'#0f766e':'#c2410c', textTransform:'uppercase', letterSpacing:'.05em', margin:0, display:'flex', justifyContent:'space-between' }}>Solde net<span>→</span></p>
                <p style={{ fontSize:22, fontWeight:900, color:recStats.net>=0?'#0d9488':'#ea580c', margin:'4px 0 0', fontVariantNumeric:'tabular-nums' }}>{otrMode ? '••••• F' : (recStats.net>=0?'+':'−') + fmtF(Math.abs(recStats.net))}</p>
                <p style={{ fontSize:10, color:recStats.net>=0?'#0f766e':'#c2410c', margin:'2px 0 0', opacity:.8 }}>encaissé − dépenses</p>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ══ ALERTES ══════════════════════════════════════════════ */}
      {(alertesStock.length > 0 || peremProches.length > 0 || rupturesProchaines.length > 0) && (
        <div className="dash-alert-panel">
          <div className="dash-alert-head">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:28,height:28,borderRadius:'50%',background:'#ef4444',display:'inline-flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:14,fontWeight:900 }}>!</span>
              <span style={{ fontWeight:800,fontSize:15,color:'#991b1b' }}>Alertes</span>
              <span style={{ fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:999,background:'#ef4444',color:'white' }}>
                {alertesStock.length+peremProches.length+rupturesProchaines.length} urgent{alertesStock.length+peremProches.length+rupturesProchaines.length>1?'s':''}
              </span>
            </div>
            <button type="button" className="dash-link" style={{ color:'#ef4444' }} onClick={() => setView('medicaments')}>Gérer le stock →</button>
          </div>
          <div className="dash-alert-grid-hdr"><span>Médicament</span><span style={{ textAlign:'center' }}>Stock / Seuil</span><span style={{ textAlign:'center' }}>Statut</span></div>
          {alertesStock.slice(0,5).map(m => (
            <div key={m.id} className="dash-alert-row">
              <span style={{ fontWeight:600,fontSize:13 }}>{m.nom}</span>
              <span style={{ textAlign:'center',fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:'#dc2626' }}>{m.stock} / {m.seuil}</span>
              <div style={{ display:'flex',gap:6,justifyContent:'center',alignItems:'center',flexWrap:'wrap' }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:999,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca' }}><AlertTriangle size={11} strokeWidth={2.6} /> Critique</span>
                <button type="button" title={`Commander ${m.nom}${m.fournisseur?` chez ${m.fournisseur}`:''}`}
                  onClick={() => {
                    try { localStorage.setItem('lb_cmd_prefill', JSON.stringify({ produit:m.nom, qte:Math.max((m.seuil||0)*2 - (m.stock||0), 1), pu:m.prixAchat ?? m.prix_achat ?? '', fournisseur:m.fournisseur||'' })) } catch(e) {}
                    setView('commandes')
                  }}
                  style={{ fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:999,background:'#0d9488',color:'white',border:'none',cursor:'pointer' }}>
                  Commander →
                </button>
              </div>
            </div>
          ))}
          {peremProches.slice(0,3).map(m => {
            const j = Math.round((new Date(m.peremption)-now)/86400000)
            return (
              <div key={`${m.id}-p`} className="dash-alert-row">
                <span style={{ fontWeight:600,fontSize:13 }}>{m.nom}</span>
                <span style={{ textAlign:'center',fontSize:13,color:'#d97706' }}>{m.peremption}</span>
                <div style={{ textAlign:'center' }}><span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:999,background:'#fffbeb',color:'#d97706',border:'1px solid #fde68a' }}><Clock size={11} strokeWidth={2.6}/>{j}j restants</span></div>
              </div>
            )
          })}
          {rupturesProchaines.map(({ m, j }) => (
            <div key={`${m.id}-r`} className="dash-alert-row">
              <span style={{ fontWeight:600,fontSize:13 }}>{m.nom}</span>
              <span style={{ textAlign:'center',fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:'#ea580c' }}>{m.stock} en stock</span>
              <div style={{ display:'flex',gap:6,justifyContent:'center',alignItems:'center',flexWrap:'wrap' }}>
                <span title="Estimation basée sur vos ventes des 30 derniers jours"
                  style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:999,background:'#fff7ed',color:'#ea580c',border:'1px solid #fed7aa' }}>
                  <TrendingDown size={11} strokeWidth={2.6} /> Rupture ~{j === 0 ? "aujourd'hui" : j + 'j'}
                </span>
                <button type="button" title={`Commander ${m.nom}${m.fournisseur?` chez ${m.fournisseur}`:''}`}
                  onClick={() => {
                    try { localStorage.setItem('lb_cmd_prefill', JSON.stringify({ produit:m.nom, qte:Math.max((m.seuil||0)*2, 10), pu:m.prixAchat ?? m.prix_achat ?? '', fournisseur:m.fournisseur||'' })) } catch(e) {}
                    setView('commandes')
                  }}
                  style={{ fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:999,background:'#0d9488',color:'white',border:'none',cursor:'pointer' }}>
                  Commander →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* ══ KPI CARDS ══════════════════════════════════ */}
      <div className="dash-kpi-grid">
        {KPIS.map((k, i) => (
          <button key={i} type="button" className="dash-kpi dash-kpi--soft text-left"
            style={{ '--kpi-accent': k.accent, '--kpi-icon-bg': `${k.accent}1f` }}
            onClick={() => setView(k.vw)}>
            <div className="dash-kpi-deco"  aria-hidden />
            <div className="dash-kpi-deco2" aria-hidden />
            <div className="dash-kpi-inner">
              <div>
                <div className="dash-kpi-val" style={{ color:k.accent }}>{k.val}</div>
                <div className="dash-kpi-label" style={{ color:'var(--app-muted)' }}>{k.label}</div>
              </div>
              <div className="dash-kpi-icon" style={{ fontSize:22 }}><k.icon size={24} color={k.accent} strokeWidth={2.2} /></div>
            </div>
            <div className="dash-kpi-foot" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:10, opacity:.9 }}>
                {k.trend != null ? (
                  <>
                    <span style={{ color:k.trend>=0?'#16a34a':'#dc2626', fontWeight:800 }}>
                      {k.trend>=0?'↑':'↓'} {Math.abs(k.trend)}% vs mois préc.
                    </span>
                    {k.subColor && <span style={{ color:k.subColor, fontWeight:700, marginLeft:6 }}>· {k.sub}</span>}
                  </>
                ) : (
                  <span style={{ opacity:.85, color:k.subColor }}>{k.sub}</span>
                )}
              </span>
              <span style={{ color:k.accent, fontWeight:700 }}>Voir →</span>
            </div>
          </button>
        ))}
      </div>
      {/* ══ ÉCHÉANCES FOURNISSEURS ══════════════════════════════ */}
      {echeancesFournisseurs.length > 0 && (
        <div className="dash-alert-panel" style={{ borderColor:'#fde68a', background:'linear-gradient(135deg,#fffbeb,#fefce8)' }}>
          <div className="dash-alert-head">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:28,height:28,borderRadius:'50%',background:'#d97706',display:'inline-flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:14 }}><Factory size={15} color="white" /></span>
              <span style={{ fontWeight:800,fontSize:15,color:'#92400e' }}>Échéances fournisseurs</span>
              <span style={{ fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:999,background:'#d97706',color:'white' }}>
                {echeancesFournisseurs.length} à payer
              </span>
            </div>
            <button type="button" className="dash-link" style={{ color:'#d97706' }} onClick={() => setView('fournisseurs')}>Gérer les dettes →</button>
          </div>
          {echeancesFournisseurs.map((e, i) => (
            <div key={i} className="dash-alert-row" style={{ gridTemplateColumns:'1.4fr 1fr 1fr' }}>
              <span style={{ fontWeight:600,fontSize:13,display:'inline-flex',alignItems:'center',gap:6 }}><Factory size={13} color="#d97706" strokeWidth={2.3}/>{e.fournisseur} <span style={{ color:'#94a3b8',fontWeight:400 }}>· {e.num||''}</span></span>
              <span style={{ textAlign:'center',fontSize:12,color:'#64748b' }}>solde dû : <strong style={{ color:'#d97706' }}>{fmtF(e.solde)}</strong></span>
              <div style={{ textAlign:'center' }}>
                {e.jours < 0
                  ? <span style={{ fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:999,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca' }}>Retard {Math.abs(e.jours)}j</span>
                  : <span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:999,background:'#fffbeb',color:'#d97706',border:'1px solid #fde68a' }}><Clock size={11} strokeWidth={2.6}/>J-{e.jours}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ RAPPELS VACCINAUX ═══════════════════════════════════ */}
      {rappelsVaccins.length > 0 && (
        <div className="dash-alert-panel" style={{ borderColor:'#e9d5ff', background:'linear-gradient(135deg,#faf5ff,#fdf4ff)' }}>
          <div className="dash-alert-head">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:28,height:28,borderRadius:'50%',background:'#9333ea',display:'inline-flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:14 }}><Syringe size={15} color="white" /></span>
              <span style={{ fontWeight:800,fontSize:15,color:'#6b21a8' }}>Rappels vaccinaux</span>
              <span style={{ fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:999,background:'#9333ea',color:'white' }}>
                {rappelsVaccins.length} à relancer
              </span>
            </div>
            <button type="button" className="dash-link" style={{ color:'#9333ea' }} onClick={() => setView('patients')}>Voir les patients →</button>
          </div>
          {rappelsVaccins.map((r, i) => (
            <div key={i} className="dash-alert-row" style={{ gridTemplateColumns:'1.4fr 1fr 1fr' }}>
              <span style={{ fontWeight:600,fontSize:13,display:'inline-flex',alignItems:'center',gap:6 }}><PawPrint size={13} color="#9333ea" strokeWidth={2.3}/>{r.patient} <span style={{ color:'#94a3b8',fontWeight:400 }}>· {r.vaccin}</span></span>
              <span style={{ textAlign:'center',fontSize:12,color:'#64748b' }}>{r.proprio}{r.tel ? ` · ${r.tel}` : ''}</span>
              <div style={{ textAlign:'center',display:'flex',gap:6,justifyContent:'center',alignItems:'center' }}>
                {r.jours < 0
                  ? <span style={{ fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:999,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca' }}>⚠️ Retard {Math.abs(r.jours)}j</span>
                  : <span style={{ fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:999,background:'#faf5ff',color:'#9333ea',border:'1px solid #e9d5ff' }}>💉 J-{r.jours}</span>}
                {waNumber(r.tel) && (
                  <a
                    href={`https://wa.me/${waNumber(r.tel)}?text=${encodeURIComponent(
                      `Bonjour${r.proprio?` ${r.proprio}`:''}, le rappel de vaccination (${r.vaccin}) de ${r.patient} est prévu le ${new Date(r.prochain+'T00:00:00').toLocaleDateString('fr-FR')}. Merci de prendre rendez-vous à la clinique La Barakat. 🐾`
                    )}`}
                    target="_blank" rel="noopener noreferrer"
                    title="Relancer sur WhatsApp"
                    style={{ fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:999,background:'#dcfce7',color:'#16a34a',border:'1px solid #bbf7d0',textDecoration:'none',whiteSpace:'nowrap' }}>
                    📱 Relancer
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ GRAPHIQUE + RDV ══════════════════════════════════════ */}
      <div className="dash-grid-2">

        {/* Graphique ventes */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <span className="dash-icon-wrap" style={{ background:'linear-gradient(135deg,#2563eb,#7c3aed)' }}><TrendingUp size={16} color="white" /></span>
              Ventes — activité récente
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {/* Sélecteur de plage */}
              {[7,14,30].map(r => (
                <button key={r} onClick={() => setChartRange(r)}
                  style={{ padding:'3px 9px', borderRadius:8, fontSize:11, fontWeight:700, border:'none', cursor:'pointer', transition:'all .12s',
                    background: chartRange===r ? '#0d9488' : '#f1f5f9',
                    color:      chartRange===r ? 'white'   : '#64748b' }}>
                  {r}j
                </button>
              ))}
              <button type="button" className="dash-link" onClick={() => setView('rapports')}>Rapport →</button>
            </div>
          </div>

          {/* Barre CA mensuel vs mois dernier */}
          {moisPct !== null && (
            <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:12, background:'#f8fafc', border:'1px solid #f1f5f9' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#64748b' }}>CA mois en cours</span>
                <span style={{ fontSize:13, fontWeight:900, color:'#0d9488', fontFamily:"'Space Mono',monospace" }}>{fmtK(totalMois)}</span>
              </div>
              <div style={{ height:6, borderRadius:99, background:'#e2e8f0', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${moisPct}%`, borderRadius:99,
                  background: moisPct>=100 ? 'linear-gradient(90deg,#16a34a,#22c55e)' : moisPct>=70 ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,#0d9488,#14b8a6)',
                  transition:'width 0.8s cubic-bezier(.22,1,.36,1)' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                <span style={{ fontSize:10, color:'#94a3b8' }}>vs {lastMonthDate.toLocaleDateString('fr-FR',{month:'long'})}: {fmtK(totalLastMois)}</span>
                <span style={{ fontSize:10, fontWeight:700, color: moisPct>=100?'#16a34a':moisPct>=70?'#d97706':'#0d9488' }}>{moisPct}%</span>
              </div>
            </div>
          )}

          {/* Barres */}
          <div style={{ display:'flex', alignItems:'flex-end', gap:chartRange<=14?6:3, height:130 }}>
            {chartData.map((v,i) => {
              const pct = Math.max(Math.round((v.val/maxChart)*100), v.val>0?8:3)
              const isWeekend = v.dayOfWeek===0||v.dayOfWeek===6
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, height:'100%', justifyContent:'flex-end' }}
                  title={`${v.ds}: ${new Intl.NumberFormat('fr-FR').format(v.val)} F`}>
                  {v.val>0 && chartRange<=14 && (
                    <span style={{ fontSize:8, color:v.isToday?'#0d9488':'#94a3b8', fontWeight:700 }}>
                      {v.val>=1000?`${Math.round(v.val/1000)}k`:v.val}
                    </span>
                  )}
                  <div style={{
                    width:'100%', borderRadius:'4px 4px 2px 2px',
                    height:`${pct}%`,
                    background: v.isToday ? 'linear-gradient(to top,#0d9488,#5eead4)'
                      : v.val>0 ? isWeekend ? 'linear-gradient(to top,#c4b5fd,#7c3aed44)' : 'linear-gradient(to top,#ccfbf1,#14b8a6)'
                      : '#f1f5f9',
                    transition:'height 0.5s cubic-bezier(.22,1,.36,1)',
                    border: v.isToday ? '2px solid #0d9488' : 'none',
                  }} />
                  {chartRange <= 14 && (
                    <span style={{ fontSize:8, color:v.isToday?'#0d9488':'#94a3b8', fontWeight:v.isToday?800:500 }}>{v.label}</span>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, paddingTop:8, borderTop:'1px solid #f1f5f9' }}>
            <span style={{ fontSize:11, color:'#94a3b8' }}>Total {chartRange}j : <strong style={{ color:'#0d9488' }}>{fmtK(totalChart)}</strong></span>
            {totalLastMois > 0 && revenuTrend != null && (
              <span style={{ fontSize:11, fontWeight:700, color:revenuTrend>=0?'#16a34a':'#dc2626' }}>
                {revenuTrend>=0?'↑':'↓'} {Math.abs(revenuTrend)}% vs mois préc.
              </span>
            )}
          </div>
        </div>

        {/* RDV aujourd'hui + prochains */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <span className="dash-icon-wrap" style={{ background:'linear-gradient(135deg,#f97316,#dc2626)' }}><Calendar size={16} color="white" /></span>
              Planning
              {rdvsAujourdhui.length > 0 && (
                <span style={{ fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:999,background:'#fff7ed',color:'#c2410c',border:'1px solid #fed7aa' }}>{rdvsAujourdhui.length}</span>
              )}
            </div>
            <button type="button" className="dash-link" style={{ color:'#f97316' }} onClick={() => setView('agenda')}>Agenda →</button>
          </div>

          {/* Aujourd'hui */}
          <p style={{ fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8 }}>Aujourd'hui</p>
          {rdvsAujourdhui.length === 0 ? (
            <div style={{ textAlign:'center', padding:'14px 0', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:2 }}><CalendarCheck size={26} color="#5eead4" strokeWidth={1.9} /></div>
              <p style={{ fontSize:12,fontWeight:700,color:'#64748b',marginTop:4 }}>Journée libre — aucun RDV</p>
            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:6,marginBottom:14 }}>
              {rdvsAujourdhui.slice(0,3).map((r,i) => (
                <div key={i} className="dash-rdv-slot" style={{ gap:10 }}>
                  <span style={{ fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:800,color:'#f97316',minWidth:44,flexShrink:0 }}>{r.heure}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:700,color:'var(--app-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{r.patient}</div>
                    <div style={{ fontSize:11,color:'var(--app-muted)' }}>{r.type}{r.veterinaire?` · Dr ${r.veterinaire}`:''}</div>
                  </div>
                  <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:999,flexShrink:0,
                    background:r.statut==='Confirmé'?'#dcfce7':'#f1f5f9',
                    color:     r.statut==='Confirmé'?'#166534':'#64748b',
                    border:    r.statut==='Confirmé'?'1px solid #bbf7d0':'1px solid #e2e8f0' }}>
                    {r.statut}
                  </span>
                </div>
              ))}
              {rdvsAujourdhui.length > 3 && (
                <button onClick={() => setView('agenda')} style={{ fontSize:11,color:'#f97316',fontWeight:700,textAlign:'center',background:'none',border:'none',cursor:'pointer' }}>
                  +{rdvsAujourdhui.length-3} autres →
                </button>
              )}
            </div>
          )}

          {/* Prochains RDV */}
          {rdvsProchains.length > 0 && (
            <>
              <div style={{ height:1, background:'#f1f5f9', margin:'4px 0 12px' }} />
              <p style={{ fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8 }}>Prochains 3 jours</p>
              <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                {rdvsProchains.slice(0,4).map((r,i) => {
                  const d = new Date(r.date)
                  const dayLabel = d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})
                  return (
                    <div key={i} style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:10,background:'#f8fafc',border:'1px solid #f1f5f9' }}>
                      <div style={{ width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#fef3c7,#fde68a)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                        <span style={{ fontSize:13,fontWeight:900,color:'#92400e',lineHeight:1 }}>{d.getDate()}</span>
                        <span style={{ fontSize:8,fontWeight:700,color:'#b45309',textTransform:'uppercase' }}>{d.toLocaleDateString('fr-FR',{month:'short'})}</span>
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:12,fontWeight:700,color:'#1e293b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{r.patient}</div>
                        <div style={{ fontSize:10,color:'#94a3b8' }}>{r.heure} · {r.type}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══ VENTES RÉCENTES + BILAN ═══════════════════════════════ */}
      <div className="dash-grid-2">
        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <span className="dash-icon-wrap" style={{ background:'linear-gradient(135deg,#0d9488,#16a34a)' }}><Receipt size={16} color="white" /></span>
              Ventes récentes
            </div>
            <button type="button" className="dash-link" onClick={() => setView('caisse')}>Voir tout →</button>
          </div>
          {ventesRecentes.length === 0 ? (
            <div style={{ textAlign:'center',padding:'20px 0' }}><div style={{ fontSize:28,marginBottom:6 }}>🛒</div><p style={{ fontSize:12,color:'var(--app-muted)' }}>Aucune vente</p></div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
              {ventesRecentes.map((v,i) => (
                <div key={v.id||i} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,background:'var(--app-bg)',border:'1px solid var(--app-border)' }}>
                  <div style={{ width:36,height:36,borderRadius:9,background:STATUT_BG[v.statut]||'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>
                    {v.statut==='Payé'?'✅':v.statut==='Annulé'?'❌':'⏳'}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:700,color:'var(--app-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{v.client||'Comptoir'}</div>
                    <div style={{ fontSize:11,color:'var(--app-muted)' }}>{(v.lignes||[]).length} article(s){v.caissier?` · ${v.caissier}`:''}</div>
                  </div>
                  <div style={{ textAlign:'right',flexShrink:0 }}>
                    <div style={{ fontSize:13,fontWeight:800,fontFamily:"'Space Mono',monospace",color:STATUT_COLOR[v.statut]||'#64748b' }}>{fmtF(v.total)}</div>
                    <div style={{ fontSize:10,color:'#94a3b8' }}>{v.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <span className="dash-icon-wrap" style={{ background:'linear-gradient(135deg,#d97706,#dc2626)' }}><Scale size={16} color="white" /></span>
              Bilan créances &amp; dettes
            </div>
            <button type="button" className="dash-link" style={{ color:'#d97706' }} onClick={() => setView('creances')}>Créances →</button>
          </div>

          <div style={{ display:'flex',gap:6,marginBottom:14 }}>
            {[
              { l:'À encaisser', v:fmtK(totalCreances), bg:'#fffbeb', border:'#fde68a', tc:'#92400e', vc: totalCreances>0?'#d97706':'#94a3b8' },
              { l:'À rembourser', v:fmtK(totalDettes),  bg:'#fef2f2', border:'#fecaca', tc:'#991b1b', vc: totalDettes>0?'#dc2626':'#94a3b8' },
              { l:'Position nette', v:`${positionNette>=0?'+':''}${fmtK(positionNette)}`, bg:positionNette>=0?'#f0fdf4':'#fef2f2', border:positionNette>=0?'#86efac':'#fecaca', tc:positionNette>=0?'#166534':'#991b1b', vc:positionNette>=0?'#16a34a':'#dc2626' },
            ].map((col,i) => (
              <div key={i} style={{ flex:1,textAlign:'center',background:col.bg,borderRadius:10,padding:'10px 6px',border:`1px solid ${col.border}` }}>
                <div style={{ fontSize:10,fontWeight:700,color:col.tc,marginBottom:3,textTransform:'uppercase',letterSpacing:'.04em' }}>{col.l}</div>
                <div style={{ fontSize:13,fontWeight:900,fontFamily:"'Space Mono',monospace",color:col.vc }}>{col.v}</div>
              </div>
            ))}
          </div>

          {creanciers.length > 0 && <>
            <p style={{ fontSize:10,fontWeight:700,color:'var(--app-muted)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6 }}>💳 Clients débiteurs</p>
            <div style={{ display:'flex',flexDirection:'column',gap:5,marginBottom:12 }}>
              {creanciers.slice(0,3).map(([nom,montant]) => {
                const pct = totalCreances>0?Math.round((montant/totalCreances)*100):0
                return (
                  <div key={nom}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2 }}>
                      <span style={{ fontSize:11,fontWeight:600,color:'var(--app-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>👤 {nom}</span>
                      <span style={{ fontSize:11,fontWeight:800,color:'#d97706',fontFamily:"'Space Mono',monospace",flexShrink:0,marginLeft:6 }}>{fmtF(montant)}</span>
                    </div>
                    <div style={{ height:4,background:'#fef3c7',borderRadius:999,overflow:'hidden' }}>
                      <div style={{ height:'100%',background:'#f59e0b',borderRadius:999,width:`${pct}%`,transition:'width 0.8s cubic-bezier(.22,1,.36,1)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>}

          {topFournisseursDus.length > 0 && <>
            <p style={{ fontSize:10,fontWeight:700,color:'var(--app-muted)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6 }}>🏭 Fournisseurs à payer</p>
            <div style={{ display:'flex',flexDirection:'column',gap:5,marginBottom:12 }}>
              {topFournisseursDus.map(([nom,montant]) => {
                const pct = totalDettes>0?Math.round((montant/totalDettes)*100):0
                return (
                  <div key={nom}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2 }}>
                      <span style={{ fontSize:11,fontWeight:600,color:'var(--app-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>🏭 {nom}</span>
                      <span style={{ fontSize:11,fontWeight:800,color:'#dc2626',fontFamily:"'Space Mono',monospace",flexShrink:0,marginLeft:6 }}>{fmtF(montant)}</span>
                    </div>
                    <div style={{ height:4,background:'#fecaca',borderRadius:999,overflow:'hidden' }}>
                      <div style={{ height:'100%',background:'#ef4444',borderRadius:999,width:`${pct}%`,transition:'width 0.8s cubic-bezier(.22,1,.36,1)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>}

          {totalCreances===0&&totalDettes===0&&(
            <div style={{ textAlign:'center',padding:'12px 0' }}><div style={{ display:'flex',justifyContent:'center',marginBottom:4 }}><CheckCircle2 size={22} color="#86efac" strokeWidth={2} /></div><p style={{ fontSize:12,color:'var(--app-muted)' }}>Aucune créance ni dette</p></div>
          )}

          {repartitionMode.length > 0 && <>
            <p style={{ fontSize:10,fontWeight:700,color:'var(--app-muted)',textTransform:'uppercase',letterSpacing:'.06em',marginTop:12,marginBottom:8 }}>Encaissements par mode</p>
            <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
              {repartitionMode.map(([mode,montant]) => {
                const pct = totalRepartition>0?Math.round((montant/totalRepartition)*100):0
                const MIcon = MODE_ICON[mode] || Coins
                return (
                  <div key={mode} style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <MIcon size={14} strokeWidth={2.4} color="#0d9488" style={{ flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',fontSize:11,fontWeight:600,color:'var(--app-text)',marginBottom:2 }}>
                        <span>{mode}</span><span style={{ color:'#0d9488' }}>{pct}%</span>
                      </div>
                      <div style={{ height:4,background:'#f1f5f9',borderRadius:999,overflow:'hidden' }}>
                        <div style={{ height:'100%',background:'linear-gradient(to right,#0d9488,#14b8a6)',borderRadius:999,width:`${pct}%` }} />
                      </div>
                    </div>
                    <span style={{ fontSize:11,fontFamily:"'Space Mono',monospace",color:'var(--app-muted)',flexShrink:0,minWidth:58,textAlign:'right' }}>{fmtK(montant)}</span>
                  </div>
                )
              })}
            </div>
          </>}
        </div>
      </div>

      {/* ══ TOP MÉDICAMENTS + PATIENTS RÉCENTS ═══════════════════ */}
      <div className="dash-grid-2">
        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <span className="dash-icon-wrap" style={{ background:'linear-gradient(135deg,#7c3aed,#ec4899)' }}><Pill size={16} color="white" /></span>
              Top médicaments vendus
            </div>
            <button type="button" className="dash-link" onClick={() => setView('medicaments')}>Stock →</button>
          </div>
          {topMeds.length === 0 ? (
            <div style={{ textAlign:'center',padding:'20px 0' }}><div style={{ fontSize:28 }}>📊</div><p style={{ fontSize:12,color:'var(--app-muted)',marginTop:6 }}>Aucune vente enregistrée</p></div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {topMeds.map(([nom,qte],i) => {
                const pct = Math.round((qte/maxTopMed)*100)
                return (
                  <div key={nom}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5 }}>
                      <span style={{ fontSize:12,fontWeight:700,color:'var(--app-text)',display:'flex',alignItems:'center',gap:7,overflow:'hidden' }}>
                        <span style={{ width:8,height:8,borderRadius:'50%',background:MED_COLORS[i]||'#64748b',display:'inline-block',flexShrink:0 }} />
                        <span style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{nom}</span>
                      </span>
                      <span style={{ fontSize:11,color:MED_COLORS[i]||'#64748b',fontFamily:"'Space Mono',monospace",fontWeight:800,flexShrink:0,marginLeft:8 }}>×{qte}</span>
                    </div>
                    <div style={{ height:6,background:'#f1f5f9',borderRadius:999,overflow:'hidden' }}>
                      <div style={{ height:'100%',background:MED_COLORS[i]||'#64748b',borderRadius:999,width:`${pct}%`,transition:'width 0.8s cubic-bezier(.22,1,.36,1)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <span className="dash-icon-wrap" style={{ background:'linear-gradient(135deg,#0d9488,#2563eb)' }}><PawPrint size={16} color="white" /></span>
              Patients récents
            </div>
            <button type="button" className="dash-link" onClick={() => setView('patients')}>Voir tous →</button>
          </div>
          {patientsRecents.length === 0 ? (
            <div style={{ textAlign:'center',padding:'20px 0' }}><div style={{ fontSize:28 }}>🐾</div><p style={{ fontSize:12,color:'var(--app-muted)',marginTop:6 }}>Aucun patient</p></div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
              {patientsRecents.map(p => (
                <div key={p.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,background:'var(--app-bg)',border:'1px solid var(--app-border)' }}>
                  <div style={{ width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#f0fdfa,#dbeafe)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>
                    {SPECIES_EMOJI[p.espece]||'🐾'}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:700,color:'var(--app-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{p.nom}</div>
                    <div style={{ fontSize:11,color:'var(--app-muted)' }}>{p.espece}{p.proprio?` · ${p.proprio}`:''}</div>
                  </div>
                  {p.created_at && (
                    <span style={{ fontSize:10,color:'#94a3b8',fontFamily:"'Space Mono',monospace",flexShrink:0 }}>
                      {new Date(p.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ ESPÈCES + ACTIONS RAPIDES ════════════════════════════ */}
      <div className="dash-grid-2">
        <div className="dash-card">
          <div className="dash-card-title" style={{ marginBottom:16 }}>
            <span className="dash-icon-wrap" style={{ background:'linear-gradient(135deg,#d97706,#f59e0b)' }}><PawPrint size={16} color="white" /></span>
            Patients par espèce
          </div>
          {especeTop.length === 0 ? (
            <p style={{ color:'var(--app-muted)',fontSize:13,textAlign:'center' }}>Aucun patient</p>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {especeTop.slice(0,6).map(([esp,nb],i) => {
                const pct = Math.round((nb/patients.length)*100)
                return (
                  <div key={esp}>
                    <div className="dash-species-row" style={{ marginBottom:4 }}>
                      <span style={{ fontSize:12,fontWeight:700,color:'var(--app-text)',display:'flex',alignItems:'center',gap:6 }}>
                        <span style={{ width:8,height:8,borderRadius:'50%',background:speciesColors[i]||'#64748b',display:'inline-block',flexShrink:0 }} />
                        {SPECIES_EMOJI[esp]||'🐾'} {esp}
                      </span>
                      <span style={{ fontSize:12,color:'var(--app-muted)',fontFamily:"'Space Mono',monospace",fontWeight:700 }}>
                        {nb} <span style={{ fontWeight:500,opacity:.7 }}>({pct}%)</span>
                      </span>
                    </div>
                    <div className="dash-species-bar" style={{ height:8 }}>
                      <div style={{ background:speciesColors[i]||'#64748b',height:'100%',borderRadius:999,width:`${pct}%`,transition:'width 0.8s cubic-bezier(.22,1,.36,1)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="dash-card">
          <div className="dash-card-title" style={{ marginBottom:14 }}>
            <span className="dash-icon-wrap" style={{ background:'linear-gradient(135deg,#166534,#1d4ed8)' }}><Zap size={16} color="white" /></span>
            Actions rapides
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
            {quickActions.map((a,i) => (
              <button key={i} type="button" className="dash-action-tile"
                style={{ background:a.c,borderColor:a.b,flexDirection:'column',alignItems:'flex-start',padding:'12px',gap:6 }}
                onClick={() => setView(a.v)}>
                <span style={{ width:36,height:36,borderRadius:10,background:`${a.b}88`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}><a.i size={18} color={a.tc} strokeWidth={2.2} /></span>
                <div>
                  <div style={{ fontSize:11,fontWeight:800,color:a.tc,lineHeight:1.2 }}>{a.t}</div>
                  <div style={{ fontSize:10,color:a.tc,opacity:.65,lineHeight:1.3,marginTop:2 }}>{a.d}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

export default Dashboard
