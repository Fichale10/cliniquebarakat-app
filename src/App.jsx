import { useState, useEffect, useRef, useMemo, Component, lazy, Suspense } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { sb, getCache, setCache, syncQueue, getQ, purgeDeprecatedQueueOps, dbFetch, dbInsert, dbUpdate, dbDelete, newId, canAccess, ROLES, logAction, DEFAULT_TEAM, NAV_ALL } from './lib/globals'
import { isValidView, DEFAULT_VIEW } from './lib/routes'

// UI Components
import { Btn, Badge, Field, DupWarning, AutoSuggest, FilterBtns, FilterBar, FilterSelect, FilterPeriode, Interdit } from './components/ui'
import { NavIcon } from './components/ui/AppIcons'
import { Search, Bell, RotateCw, Moon, Sun, Settings as SettingsIcon, Menu as MenuIcon, LogOut, ArrowLeft, Eye, EyeOff, User as UserIcon, Lock as LockIcon } from 'lucide-react'
import { ToastContainer } from './components/Toast'
import { SkPage } from './components/Skeleton'

// ── Pages en lazy loading : chaque page = un chunk séparé, chargé
//    à la première visite → bundle initial allégé (~3× plus petit)
// Pages - Clinique
const Patients        = lazy(() => import('./pages/clinique/Patients'))
const Consultations   = lazy(() => import('./pages/clinique/Consultations'))
const Dossiers        = lazy(() => import('./pages/clinique/Dossiers'))
const Hospitalisation = lazy(() => import('./pages/clinique/Hospitalisation'))
const Chirurgies      = lazy(() => import('./pages/clinique/Chirurgies'))
const Ordonnances     = lazy(() => import('./pages/clinique/Ordonnances'))
const Calculateur     = lazy(() => import('./pages/clinique/Calculateur'))
const Consentements   = lazy(() => import('./pages/clinique/Consentements'))
const Vaccinations    = lazy(() => import('./pages/clinique/Vaccinations'))

// Pages - Agenda
const Agenda           = lazy(() => import('./pages/agenda/Agenda'))
const AgendaCalendrier = lazy(() => import('./pages/agenda/AgendaCalendrier'))
const Taches           = lazy(() => import('./pages/agenda/Taches'))

// Pages - Pharmacie
const Medicaments = lazy(() => import('./pages/pharmacie/Medicaments'))
const Commandes   = lazy(() => import('./pages/pharmacie/Commandes'))
const Inventaire  = lazy(() => import('./pages/pharmacie/Inventaire'))

// Pages - Commercial
const Clients      = lazy(() => import('./pages/commercial/Clients'))
const Fournisseurs = lazy(() => import('./pages/commercial/Fournisseurs'))
const Factures     = lazy(() => import('./pages/commercial/Factures'))
const Devis        = lazy(() => import('./pages/commercial/Devis'))
const Creances     = lazy(() => import('./pages/commercial/Creances'))
const Caisse       = lazy(() => import('./pages/commercial/Caisse'))
const Historique   = lazy(() => import('./pages/commercial/Historique'))

// Pages - Finance
const Depenses    = lazy(() => import('./pages/finance/Depenses'))
const Finances    = lazy(() => import('./pages/finance/Finances'))
const Rapports    = lazy(() => import('./pages/finance/Rapports'))
const RapportsPDF = lazy(() => import('./pages/finance/RapportsPDF'))

// Pages - Admin
const Parametres      = lazy(() => import('./pages/admin/Parametres'))
const MonProfil       = lazy(() => import('./pages/admin/MonProfil'))
const GestionComptes  = lazy(() => import('./pages/admin/GestionComptes'))
const JournalActivite = lazy(() => import('./pages/admin/JournalActivite'))

// Pages - Outils
const AssistantIA          = lazy(() => import('./pages/outils/AssistantIA'))
const GestionNotifications = lazy(() => import('./pages/outils/GestionNotifications'))
const CarteClients         = lazy(() => import('./pages/outils/CarteClients'))
const SuiviTraitements     = lazy(() => import('./pages/outils/SuiviTraitements'))
const GestionLots          = lazy(() => import('./pages/outils/GestionLots'))

// Dashboard (vue par défaut : chargé immédiatement)
import Dashboard from './pages/Dashboard'

// ── Transition animée entre les vues ────────────────────────────
function ViewTransition({ viewKey, children }) {
  const [shown, setShown]   = useState(children)
  const [anim, setAnim]     = useState('')
  const nextRef             = useRef(children)
  const timerRef            = useRef(null)
  const prevKey             = useRef(viewKey)

  useEffect(() => {
    // Même vue — mise à jour silencieuse du contenu
    if (viewKey === prevKey.current) {
      if (anim === '') setShown(children)
      else nextRef.current = children
      return
    }
    prevKey.current  = viewKey
    nextRef.current  = children
    clearTimeout(timerRef.current)

    // 1. Animation de sortie (155ms)
    setAnim('vt-exit')
    timerRef.current = setTimeout(() => {
      // 2. Swap + animation d'entrée
      setShown(nextRef.current)
      setAnim('vt-enter')
    }, 155)

    return () => clearTimeout(timerRef.current)
  }, [viewKey, children])

  return (
    <div
      className={anim}
      onAnimationEnd={() => { if (anim === 'vt-enter') setAnim('') }}
      style={{ minHeight: '100%' }}
    >
      {shown}
    </div>
  )
}

class ScreenErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Help debug: log in the console and show a user-friendly message
    console.error('[ScreenErrorBoundary]', error, info)
    // Chunk introuvable après un nouveau déploiement (hash obsolète) :
    // recharger automatiquement une fois pour récupérer la nouvelle version.
    const msg = error?.message || ''
    if (/dynamically imported module|Loading chunk|Failed to fetch dynamically/i.test(msg)) {
      const last = Number(sessionStorage.getItem('lb_chunk_reload') || 0)
      if (Date.now() - last > 30000) {
        sessionStorage.setItem('lb_chunk_reload', String(Date.now()))
        window.location.reload()
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error || 'Erreur inconnue')
      const isChunk = /dynamically imported module|Loading chunk|Failed to fetch dynamically/i.test(msg)
      return (
        <div className="screen-error-boundary p-6 rounded-[14px] border">
          <div className="font-black mb-1.5">{isChunk ? 'Nouvelle version disponible' : "Erreur d'affichage"}</div>
          <div className="text-[13px] leading-snug whitespace-pre-wrap screen-error-boundary__msg">
            {isChunk ? "L'application a été mise à jour. Rechargez la page pour continuer." : msg}
          </div>
          <button onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 rounded-[10px] font-bold text-[13px] text-white border-0 cursor-pointer"
            style={{ background: '#166534' }}>
            Recharger la page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function App({ user, setUser, comptesRoot, setComptesRoot, onLogout, reloadComptes }) {
  const navigate = useNavigate()
  const { viewId } = useParams()
  const view = isValidView(viewId) ? viewId : DEFAULT_VIEW

  useEffect(() => {
    if (viewId && !isValidView(viewId)) {
      navigate(`/${DEFAULT_VIEW}`, { replace: true })
    }
  }, [viewId, navigate])

  const setView = (id) => {
    navigate(`/${isValidView(id) ? id : DEFAULT_VIEW}`)
  }
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // ── Raccourci clavier Ctrl+K / Cmd+K : recherche globale ──
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(true);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [heure, setHeure] = useState(() => new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit', second:'2-digit'}));

useEffect(() => {
  const timer = setInterval(() => {
    setHeure(new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit', second:'2-digit'}));
  }, 1000);
  return () => clearInterval(timer);
}, []);
  const [darkMode,setDarkMode]=useState(()=>{
    const saved=localStorage.getItem('lb_dark');
    if(saved==='1'){document.body.classList.add('dark-mode');
      return true;}
    return false;
  });
  const normalizeFour = (row) => {
    if (!row) return row
    const out = { ...row }
    if ('delai_livraison'     in out) { out.delaiLivraison     = out.delai_livraison;     delete out.delai_livraison }
    if ('conditions_paiement' in out) { out.conditionsPaiement = out.conditions_paiement; delete out.conditions_paiement }
    if ('note_qualite'        in out) { out.noteQualite        = out.note_qualite;        delete out.note_qualite }
    if ('date_debut'          in out) { out.dateDebut          = out.date_debut;          delete out.date_debut }
    if ('site_web'            in out) { out.siteWeb            = out.site_web;            delete out.site_web }
    return out
  }

  const [patients,setPatients]=useState(()=>getCache('patients')||[]);
  const [clients,setClients]=useState(()=>getCache('clients')||[]);
  const [meds,setMeds]=useState(()=>getCache('medicaments')||[]);
  const [equipe,setEquipe]=useState(()=>getCache('equipe')||DEFAULT_TEAM);
  const [clinique,setClinique]=useState(()=>{
    const c = getCache('clinique_settings')
    const def = {nom:'La Barakat',sousTitre:'Pharmacie & Clinique Vétérinaire',tel:'',adresse:'',ville:'',email:''}
    if (Array.isArray(c)) { const o={...def}; c.forEach(r=>{ if(r?.key) o[r.key]=r.value }); return o }
    return c || def
  });
  const [showNotifs,setShowNotifs]=useState(false);
  const [luNotifs,setLuNotifs]=useState([]);
  const [activityNotifs,setActivityNotifs]=useState([]);
  const [online,setOnline]=useState(navigator.onLine);
  const [consultations, setConsultations] = useState(() => getCache('consultations') || [])
  const comptes    = comptesRoot    || [];
  const setComptes = setComptesRoot || (() => {});
  const syncedSet = (setter, table) => (data) => { setter(data); setCache(table, data) }
  const setSyncedPatients  = syncedSet(setPatients,  'patients')
  const setSyncedClients   = syncedSet(setClients,   'clients')
  const setSyncedMeds      = syncedSet(setMeds,      'medicaments')
  const setSyncedEquipe    = syncedSet(setEquipe,    'equipe')
  const setSyncedComptes   = syncedSet(setComptes,   'comptes')
  const setSyncedConsultations = syncedSet(setConsultations, 'consultations')
  // appLoading now from Root props
  const [syncPending,setSyncPending]=useState(()=>getQ().length);
  const [syncing,setSyncing]=useState(false);
  const [syncBlocked,setSyncBlocked]=useState(false);
  // Rappel de sauvegarde hebdomadaire (admin) : bandeau si > 7 jours
  const [backupDue,setBackupDue]=useState(()=>{
    try{const last=Number(localStorage.getItem('lb_last_backup')||0);return Date.now()-last>7*86400000;}catch{return false}
  });
  const faireSauvegarde=()=>{
    try{
      const data={export_date:new Date().toISOString()};
      for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('lb_')&&k!=='lb_offlineQueue'){try{data[k]=JSON.parse(localStorage.getItem(k))}catch{data[k]=localStorage.getItem(k)}}}
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);
      a.download=`sauvegarde_labarakat_${new Date().toISOString().split('T')[0]}.json`;a.click();
      URL.revokeObjectURL(a.href);
      localStorage.setItem('lb_last_backup',String(Date.now()));setBackupDue(false);
    }catch(e){alert('Erreur sauvegarde : '+(e?.message||e))}
  };
  const [otrMode,setOtrMode]=useState(()=>localStorage.getItem('lb_otr')==='1');
  const [tva,setTva]=useState(()=>{ try{return JSON.parse(localStorage.getItem('lb_tva')||'{"active":false,"taux":18}');}catch{return {active:false,taux:18};} });
  const [ventesHist,setVentesHist]=useState(()=>getCache('ventes')||[]);
  const [inventaires,setInventaires]=useState(()=>getCache('inventaires')||[]);
  const [achatsHist,setAchatsHist]=useState(()=>getCache('commandes')||[]);
  const [depsHist,setDepsHist]=useState(()=>getCache('depenses')||[]);
  const [fournisseurs,setFournisseurs]=useState(()=>(getCache('fournisseurs')||[]).map(normalizeFour));
  const [devis,setDevis]=useState(()=>getCache('devis')||[]);
  const [factures,setFactures]=useState(()=>getCache('factures')||[]);
  const [rdvs,setRdvs]=useState(()=>getCache('rdvs')||[]);
  const setSyncedRdvs = syncedSet(setRdvs, 'rdvs')
  const [ordonnances,setOrdonnances]=useState(()=>getCache('ordonnances')||[]);
  const setSyncedOrdonnances = syncedSet(setOrdonnances, 'ordonnances')
  const [chirurgies,setChirurgies]=useState(()=>getCache('chirurgies')||[]);
  const setSyncedChirurgies = syncedSet(setChirurgies, 'chirurgies')
  const [hospitalisations,setHospitalisations]=useState(()=>getCache('hospitalisations')||[]);
  const setSyncedHospitalisations = syncedSet(setHospitalisations, 'hospitalisations')
  const [taches,setTaches]=useState(()=>getCache('taches')||[]);
  const setSyncedTaches     = syncedSet(setTaches,     'taches')
  const setSyncedVentesHist    = syncedSet(setVentesHist,    'ventes')
  const setSyncedInventaires   = syncedSet(setInventaires,   'inventaires')
  const setSyncedDepsHist   = syncedSet(setDepsHist,   'depenses')
  const setSyncedFactures   = syncedSet(setFactures,   'factures')
  const setSyncedFournisseurs = syncedSet(setFournisseurs, 'fournisseurs')
  const setSyncedDevis        = syncedSet(setDevis,        'devis')
  const setSyncedAchatsHist     = syncedSet(setAchatsHist,     'commandes')
  const [versements, setVersements] = useState(() => getCache('versements_fournisseurs') || [])
  const setSyncedVersements         = syncedSet(setVersements, 'versements_fournisseurs')
  const toggleOTR=()=>setOtrMode(p=>{localStorage.setItem('lb_otr',p?'0':'1');return !p;});
  const saveTva=t=>{setTva(t);localStorage.setItem('lb_tva',JSON.stringify(t));}

  // ── Persistance Supabase : Paramètres clinique & équipe ────
  const saveClinique = async (c) => {
    setClinique(c)
    const rows = ['nom','sousTitre','tel','adresse','ville','email'].map(key => ({ key, value: String(c[key] ?? '') }))
    setCache('clinique_settings', rows)
    if (!sb || !navigator.onLine) return
    // onConflict:'key' → la contrainte unique porte sur key (pas la PK id) :
    // sans cela l'upsert tente un INSERT et échoue en duplicate key.
    const { error } = await sb.from('clinique_settings').upsert(rows, { onConflict: 'key' })
    if (error) throw new Error(error.message)
  }

  const saveEquipe = async (list) => {
    setSyncedEquipe(list)
    if (!sb || !navigator.onLine) return
    const rows = list.map(m => ({ id: String(m.id), nom: m.nom || '', role: m.role || 'ASV', tel: m.tel || '', actif: m.actif !== false }))
    const { data: existing, error: e1 } = await sb.from('equipe').select('id')
    if (e1) throw new Error(e1.message)
    const keep = new Set(rows.map(r => r.id))
    const toDelete = (existing || []).map(r => String(r.id)).filter(id => !keep.has(id))
    if (rows.length) {
      const { error: e2 } = await sb.from('equipe').upsert(rows)
      if (e2) throw new Error(e2.message)
    }
    if (toDelete.length) {
      const { error: e3 } = await sb.from('equipe').delete().in('id', toDelete)
      if (e3) throw new Error(e3.message)
    }
  }
  const [sbError,setSbError]=useState(false);

  const normalizeMed = (row) => {
  if (!row) return row
  const out = { ...row }
  if ('prix_achat'    in out) { out.prixAchat    = out.prix_achat;    delete out.prix_achat }
  if ('prix_vente'    in out) { out.prixVente    = out.prix_vente;    delete out.prix_vente }
  if ('dose_mg_kg'    in out) { out.doseMgKg     = out.dose_mg_kg;    delete out.dose_mg_kg }
  if ('prix_gros'     in out) { out.prixGros     = out.prix_gros;     delete out.prix_gros }
  if ('paliers_gros'  in out) { out.paliersGros  = out.paliers_gros;  delete out.paliers_gros }
  return out
}

  // ── Load all data from Supabase ────────────────────────
  const loadAll = async ({ force = false, background = false } = {}) => {
    if (!background) setSyncing(true)
    try {
      const tables = [
        ['patients', setSyncedPatients],
        ['consultations', setSyncedConsultations],
        ['clients', setSyncedClients],
        ['medicaments', setSyncedMeds],
        ['equipe', setSyncedEquipe],
        ['rdvs', setSyncedRdvs],
        ['ordonnances', setSyncedOrdonnances],
        ['chirurgies', setSyncedChirurgies],
        ['hospitalisations', setSyncedHospitalisations],
        ['taches', setSyncedTaches],
        ['ventes', setSyncedVentesHist],
        ['inventaires', setSyncedInventaires],
        ['depenses', setSyncedDepsHist],
        ['factures', setSyncedFactures],
        ['fournisseurs', (d) => setSyncedFournisseurs(d.map(normalizeFour))],
        ['devis', setSyncedDevis],
        ['commandes', setSyncedAchatsHist],
        ['versements_fournisseurs', setSyncedVersements],
      ]
      await Promise.all(tables.map(async ([t, setter]) => {
        const d = await dbFetch(sb, t, { force })
        if (d && d.length > 0) {
          setter(t === 'medicaments' ? d.map(normalizeMed) : d)
        }
      }))
      const cliniqueData = await dbFetch(sb, 'clinique_settings', { force })
      if (cliniqueData?.length > 0) {
        const obj = {}
        cliniqueData.forEach((r) => { obj[r.key] = r.value })
        if (obj.nom) {
          setClinique({
            nom: obj.nom || 'La Barakat',
            sousTitre: obj.sousTitre || 'Pharmacie & Clinique Vétérinaire',
            tel: obj.tel || '',
            adresse: obj.adresse || '',
            ville: obj.ville || '',
            email: obj.email || '',
          })
        }
      }
      setSbError(false)
    } catch (e) {
      setSbError(true)
    } finally {
      if (!background) setSyncing(false)
    }
  }

  useEffect(() => {
    purgeDeprecatedQueueOps()
    setSyncPending(getQ().length)
    // Affichage immédiat depuis le cache, puis rafraîchissement en arrière-plan
    loadAll({ force: false })
    const bgTimer = setTimeout(() => loadAll({ force: true, background: true }), 1500)
    const onOnline = () => {
      setOnline(true)
      syncQueue(sb, (n) => setSyncPending(n)).then((synced) => {
        loadAll({ force: synced > 0 })
        const rest = getQ().length
        setSyncPending(rest)
        setSyncBlocked(rest > 0 && navigator.onLine)
      })
    }
    const onOffline = () => {
      setOnline(false)
      setSyncPending(getQ().length)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      clearTimeout(bgTimer)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // ── Rafraîchissement périodique (synchronisation inter-machines) ──
  useEffect(() => {
    if (!sb) return;
    const id = setInterval(() => loadAll({ force: true, background: true }), 120000);
    return () => clearInterval(id);
  }, [sb]);

  // ── Synchro TEMPS RÉEL entre postes (Supabase Realtime) ────────
  // Une vente ou un mouvement de stock fait sur un poste est reflété
  // ici en ~1 s, sans attendre le polling de 120 s ni un rechargement.
  // Nécessite supabase/realtime_tables.sql (publication supabase_realtime).
  useEffect(() => {
    if (!sb || !user) return
    const applyChange = (setter, table, normalize = (r) => r) => (payload) => {
      setter(prev => {
        const list = prev || []
        let next
        if (payload.eventType === 'DELETE') {
          const oldId = payload.old?.id
          if (!oldId) return list
          next = list.filter(r => String(r.id) !== String(oldId))
        } else {
          const row = normalize(payload.new)
          if (!row?.id) return list
          const i = list.findIndex(r => String(r.id) === String(row.id))
          next = i === -1 ? [row, ...list] : list.map((r, j) => (j === i ? { ...r, ...row } : r))
        }
        setCache(table, next)
        return next
      })
    }
    const ch = sb
      .channel('lb-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventes' }, applyChange(setVentesHist, 'ventes'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicaments' }, applyChange(setMeds, 'medicaments', normalizeMed))
      .subscribe()
    return () => { try { sb.removeChannel(ch) } catch (e) {} }
  }, [user?.email])

  // ── Verrouillage automatique après inactivité (réglable dans Paramètres) ──
  // localStorage lb_autolock_min : 0 = désactivé, sinon minutes d'inactivité.
  useEffect(() => {
    let last = Date.now()
    const bump = () => { last = Date.now() }
    const evs = ['mousedown', 'keydown', 'touchstart', 'scroll']
    evs.forEach(e => window.addEventListener(e, bump, { passive: true }))
    const id = setInterval(() => {
      const min = parseInt(localStorage.getItem('lb_autolock_min') || '0') || 0
      if (min > 0 && Date.now() - last > min * 60000) onLogout?.()
    }, 30000)
    return () => { evs.forEach(e => window.removeEventListener(e, bump)); clearInterval(id) }
  }, [])

  // Auth handled by Root component


  // ── Notifications auto-générées ──
  const fmtF = v => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'
  // ── Alertes péremption ─────────────────────────────────
  const msJ=86400000;
  const now2=Date.now();
  const jPerem=m=>m.peremption?Math.round((new Date(m.peremption)-now2)/msJ):null;

  const notifs = [
    ...meds.filter(m=>m.stock<=m.seuil).map(m=>({id:`stock-${m.id}`,type:'danger',icon:'🚨',titre:'Stock critique',msg:`${m.nom} — ${m.stock} ${m.unite} restant(es)`,cat:'Pharmacie'})),
    ...meds.filter(m=>m.stock>m.seuil&&m.stock<=(m.seuil*2)).map(m=>({id:`warn-${m.id}`,type:'warning',icon:'⚠️',titre:'Stock faible',msg:`${m.nom} — à réapprovisionner bientôt`,cat:'Pharmacie'})),
    ...meds.filter(m=>{const j=jPerem(m);return j!==null&&j<0;}).map(m=>({id:`exp-${m.id}`,type:'danger',icon:'☠️',titre:'Produit EXPIRÉ',msg:`${m.nom} — Lot ${m.lot||'?'} expiré le ${m.peremption}`,cat:'Pharmacie'})),
    ...meds.filter(m=>{const j=jPerem(m);return j!==null&&j>=0&&j<=30;}).map(m=>{const j=jPerem(m);return {id:`perem-${m.id}`,type:j<=7?'danger':j<=15?'warning':'info',icon:'⏰',titre:'Péremption proche',msg:`${m.nom} — expire dans ${j}j (${m.peremption})`,cat:'Pharmacie'};}),
    ...ventesHist.filter(v=>['À crédit','Partiellement payé','En attente'].includes(v.statut)).slice(0,3).map(v=>({id:`creance-${v.id}`,type:'warning',icon:'💰',titre:'Créance en attente',msg:`${v.client} — ${fmtF(v.total||0)} (${v.date})`,cat:'Finance'})),
    ...activityNotifs,
    {id:'rdv-today',type:'info',icon:'📅',titre:'Agenda',msg:"Consultez l'agenda pour les RDV du jour",cat:'Agenda'},
  ];
  const notifsNonLues = notifs.filter(n=>!luNotifs.includes(n.id));
  const marquerLu = id => setLuNotifs(p=>[...p,id]);
  const toutMarquerLu = () => setLuNotifs(notifs.map(n=>n.id));
  const NOTIF_COLORS={danger:'border-l-red-500 bg-red-50',warning:'border-l-amber-500 bg-amber-50',info:'border-l-blue-500 bg-blue-50'};

  const NAV_ALL=[
    {id:'dashboard',       label:'Tableau de bord',      icon:'🏠', cat:'Général'},
    {id:'monprofil',       label:'Mon profil',            icon:'👤', cat:'Général'},
    {id:'parametres',      label:'Paramètres clinique',   icon:'⚙️', cat:'Général',  admin:true},
    {id:'comptes',         label:'Comptes utilisateurs',  icon:'🔐', cat:'Général',  admin:true},
    {id:'journal',         label:'Journal activite',      icon:'📜', cat:'General',  admin:true},
    {id:'lots',            label:'Lots & Tracabilite',    icon:'🔬', cat:'General',  admin:true},
    {id:'caisse',          label:'Caisse & Ventes',       icon:'🧾', cat:'Commercial'},
    {id:'ia',              label:'Assistant IA',          icon:'🤖', cat:'General'},
    {id:'notifications',   label:'Notifications Push',    icon:'🔔', cat:'General',  admin:true},
    {id:'carteclients',    label:'Carte clients',         icon:'🗺️', cat:'Commercial'},
    {id:'traitements',     label:'Suivi traitements',     icon:'💊', cat:'Clinique'},
    {id:'patients',        label:'Patients',              icon:'🐾', cat:'Clinique'},
    {id:'consultations',   label:'Consultations',         icon:'🩺', cat:'Clinique'},
    {id:'dossiers',        label:'Dossiers médicaux',     icon:'📋', cat:'Clinique'},
    {id:'ordonnances',     label:'Ordonnances',           icon:'📝', cat:'Clinique'},
    {id:'chirurgies',      label:'Chirurgies & Actes',    icon:'🔬', cat:'Clinique'},
    {id:'hospitalisation', label:'Hospitalisation',       icon:'🏥', cat:'Clinique'},
    {id:'agenda',          label:'Agenda & RDV',          icon:'📅', cat:'Clinique'},
    {id:'taches',          label:'Tâches équipe',         icon:'✅', cat:'Clinique'},
    {id:'calculateur',     label:'Calculateur doses',     icon:'⚖️', cat:'Clinique'},
    {id:'consentements',   label:'Consentements',         icon:'✍️', cat:'Clinique'},
    {id:'vaccinations',    label:'Vaccinations',          icon:'💉', cat:'Clinique'},
    {id:'clients',         label:'Clients',               icon:'👥', cat:'Commercial'},
    {id:'fournisseurs',    label:'Fournisseurs',          icon:'🏭', cat:'Commercial',admin:true},
    {id:'factures',        label:'Factures',              icon:'📄', cat:'Commercial',admin:true},
    {id:'devis',           label:'Devis & Estimations',   icon:'📋', cat:'Commercial'},
    {id:'creances',         label:'Suivi créances',         icon:'💰', cat:'Commercial'},
    {id:'medicaments',     label:'Médicaments',           icon:'💊', cat:'Pharmacie'},
    {id:'commandes',       label:'Commandes',             icon:'📦', cat:'Pharmacie'},
    {id:'inventaire',      label:'Inventaire',            icon:'📊', cat:'Pharmacie'},
    {id:'depenses',        label:'Dépenses',              icon:'💸', cat:'Financier', admin:true},
    {id:'finances',        label:'État financier',        icon:'📈', cat:'Financier', admin:true},
    {id:'rapports',        label:'Rapports & Analyse',    icon:'📊', cat:'Financier', admin:true},
    {id:'rapportspdf',     label:'Rapport PDF mensuel',   icon:'📄', cat:'Financier', admin:true},
    {id:'historique',      label:'Historique produits',   icon:'🗂️', cat:'Pharmacie'},
  ];
  const isAdmin = user?.role==='admin' || user?.role==='admin2';

  // ── Notifs admin : à chaque modification de médicament ──
  useEffect(()=>{
    if(!isAdmin) return;
    const maskOTR = (text) => {
      if(!otrMode) return text;
      // Masque tous les chiffres (stock/prix) en mode OTR
      return String(text || '').replace(/\d/g, '•')
    };

    const NOTIF_META = {
      medicament_modified: { type:'warning', icon:'💊', titre:'Médicament modifié',  cat:'Pharmacie' },
      medicament_added:    { type:'info',    icon:'💊', titre:'Nouveau médicament',  cat:'Pharmacie' },
      vente_added:         { type:'info',    icon:'🛒', titre:'Nouvelle vente',      cat:'Commercial' },
      client_added:        { type:'info',    icon:'👥', titre:'Nouveau client',      cat:'Commercial' },
      patient_added:       { type:'info',    icon:'🐾', titre:'Nouveau patient',     cat:'Clinique' },
      depense_added:       { type:'warning', icon:'💸', titre:'Nouvelle dépense',    cat:'Finance' },
    };
    const pushNotif = (entry) => {
      if (!entry || !entry.action) return;
      const id = `activity-${entry.id}`;
      const meta = NOTIF_META[entry.action] || { type:'info', icon:'🔔', titre: entry.action.replace(/_/g,' '), cat:'Général' };
      const notif = {
        id,
        type:  meta.type,
        icon:  meta.icon,
        titre: meta.titre,
        msg:   maskOTR(`${entry.user_name}: ${entry.details || ''}`),
        cat:   meta.cat,
      };
      setActivityNotifs((prev)=> prev.some(n=>n.id===id) ? prev : [notif, ...prev].slice(0, 20));
      try{
        if(typeof Notification !== 'undefined' && Notification.permission === 'granted'){
          new Notification('La Barakat 🐄', { body: notif.msg });
        }
      }catch(e){}
    };

    const onActivity = (ev) => {
      pushNotif(ev?.detail);
    };

    // Même onglet / même instance
    window.addEventListener('lb_activity_log', onActivity);
    // Autres onglets du même navigateur (fallback)
    const onStorage = (ev) => {
      if(ev.key !== 'lb_logs') return;
      try{
        const logs = JSON.parse(localStorage.getItem('lb_logs') || '[]');
        // On ne traite que les 30 plus récents pour performance
        logs.slice(0, 30).forEach(pushNotif);
      }catch(e){}
    };
    window.addEventListener('storage', onStorage);

    return ()=>{
      window.removeEventListener('lb_activity_log', onActivity);
      window.removeEventListener('storage', onStorage);
    };
  }, [isAdmin, user?.email, otrMode, view])

  // ── Fallback inter-machines : polling Supabase activité ──
  useEffect(()=>{
    if(!isAdmin) return;
    if(!sb || !navigator.onLine) return;

    const KEY='lb_activity_last_seen';
    const POLL_MS = 120000;
    let cancelled = false;
    let inFlight = false;
    let failStreak = 0;

    const maskOTR = (text) => {
      if(!otrMode) return text;
      return String(text || '').replace(/\d/g, '•')
    };

    const NOTIF_META = {
      medicament_modified: { type:'warning', icon:'💊', titre:'Médicament modifié',  cat:'Pharmacie' },
      medicament_added:    { type:'info',    icon:'💊', titre:'Nouveau médicament',  cat:'Pharmacie' },
      vente_added:         { type:'info',    icon:'🛒', titre:'Nouvelle vente',      cat:'Commercial' },
      client_added:        { type:'info',    icon:'👥', titre:'Nouveau client',      cat:'Commercial' },
      patient_added:       { type:'info',    icon:'🐾', titre:'Nouveau patient',     cat:'Clinique' },
      depense_added:       { type:'warning', icon:'💸', titre:'Nouvelle dépense',    cat:'Finance' },
    };

    const tick = async () => {
      if (cancelled || inFlight) return;
      if (document.visibilityState === 'hidden') return;
      if (!navigator.onLine) return;

      inFlight = true;
      try{
        const lastSeen = localStorage.getItem(KEY) || '';
        let query = sb.from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(40);

        if (lastSeen) {
          query = query.gt('created_at', lastSeen);
        }

        const { data, error } = await query;
        if (error) throw error;
        failStreak = 0;

        const rows = data || [];
        if(!rows.length) return;

        rows.slice().reverse().forEach((entry)=>{
          if (!entry?.action) return;
          const id = `activity-${entry.id}`;
          const meta = NOTIF_META[entry.action] || { type:'info', icon:'🔔', titre: entry.action.replace(/_/g,' '), cat:'Général' };
          const notif = {
            id,
            type:  meta.type,
            icon:  meta.icon,
            titre: meta.titre,
            msg:   maskOTR(`${entry.user_name}: ${entry.details || ''}`),
            cat:   meta.cat,
          };
          setActivityNotifs((prev)=> prev.some(n=>n.id===id) ? prev : [notif, ...prev].slice(0, 20));
          try{
            if(typeof Notification !== 'undefined' && Notification.permission === 'granted'){
              new Notification('La Barakat 🐄', { body: notif.msg });
            }
          }catch(e){}
        });

        const maxCreatedAt = rows.reduce((acc, r)=> (String(r.created_at||'') > String(acc) ? String(r.created_at||'') : acc), lastSeen);
        if (maxCreatedAt) localStorage.setItem(KEY, maxCreatedAt);
      }catch(e){
        failStreak += 1;
        if (failStreak <= 2) {
          console.warn('[activity_logs] polling:', e?.message || e);
        }
      } finally {
        inFlight = false;
      }
    };

    tick();
    const intervalMs = () => Math.min(POLL_MS * Math.pow(2, Math.min(failStreak, 3)), 300000);
    let timer = null;
    const schedule = () => {
      timer = setTimeout(async () => {
        await tick();
        if (!cancelled) schedule();
      }, intervalMs());
    };
    schedule();

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return ()=> {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  },[isAdmin, sb, otrMode]);

  const NAV = NAV_ALL.filter(n=>canAccess(user?.role, n.id));
  const normalizeCat = (cat) => {
    const s = String(cat || '').trim();
    // Harmonisation : éviter le doublon "General" / "Général"
    if (s.toLowerCase() === 'general'.toLowerCase() || s === 'General') return 'Général';
    if (s === 'Clinical') return 'Clinique';
    return s;
  };
  const grouped = NAV.reduce((a, i) => {
    const cat = normalizeCat(i.cat);
    if (!a[cat]) a[cat] = [];
    a[cat].push(i);
    return a;
  }, {});
  const membresActifs = equipe.filter(m=>m.actif&&m.nom.trim().length>1);
  const sp={
    patients, setPatients:setSyncedPatients, clients, setClients:setSyncedClients,
    consultations, setConsultations: setSyncedConsultations,
    meds, setMeds:setSyncedMeds, setView, equipe:membresActifs,
    setEquipe:setSyncedEquipe, clinique, isAdmin,
    comptes, setComptes:setSyncedComptes,
    otrMode, toggleOTR,
    ventesHist, setVentesHist: setSyncedVentesHist,
    inventaires, setInventaires: setSyncedInventaires,
    achatsHist, setAchatsHist: setSyncedAchatsHist,
    versements, setVersements: setSyncedVersements,
    depsHist, setDepsHist: setSyncedDepsHist,
    tva, saveTva,
    fournisseurs, setFournisseurs: setSyncedFournisseurs,
    devis, setDevis: setSyncedDevis,
    factures, setFactures: setSyncedFactures,
    rdvs, setRdvs: setSyncedRdvs,
    ordonnances, setOrdonnances: setSyncedOrdonnances,
    chirurgies, setChirurgies: setSyncedChirurgies,
    hospitalisations, setHospitalisations: setSyncedHospitalisations,
    taches, setTaches: setSyncedTaches,
    dbInsert, dbUpdate, dbDelete,
    user, sb, logAction,
    setSyncPending: ()=>setSyncPending(getQ().length),
    reloadAll: loadAll,
  };

  const globalResults = useMemo(()=>{
    const q = String(globalSearch || '').trim().toLowerCase();
    if(q.length<2) return { patients: [], meds: [], clients: [] };
    const p = (patients || []).filter(x=>String(x.nom||'').toLowerCase().includes(q)).slice(0,6);
    const m = (meds || []).filter(x=>{
      const a = String(x.nom||'').toLowerCase().includes(q);
      const b = String(x.categorie||'').toLowerCase().includes(q);
      const c = String(x.ref||'').toLowerCase().includes(q);
      return a||b||c;
    }).slice(0,6);
    const c = (clients || []).filter(x=>String(x.nom||'').toLowerCase().includes(q)).slice(0,6);
    return { patients: p, meds: m, clients: c };
  },[globalSearch, patients, meds, clients]);

  return <><div className="app-layout flex min-h-screen flex-col md:flex-row">

    {/* ══ SIDEBAR ══ */}
    {sidebarOpen&&<div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={()=>setSidebarOpen(false)}/>}
    <aside className={`sidebar-bg flex flex-col shrink-0 relative overflow-hidden transition-all duration-300
  ${sidebarOpen?'fixed top-0 left-0 z-50 h-screen':'hidden'} md:block
  ${sidebarCollapsed?'md:w-16':'md:w-64'}`}>
      {/* Lueur déco teal subtile */}
      <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse at 70% 5%,rgba(13,148,136,0.05),transparent 50%)'}}/>

      <div className="relative z-10 flex flex-col h-full">
        {/* ── Logo zone ── */}
        <div className="px-4 pt-5 pb-4" style={{borderBottom:'1px solid #e8edf2'}}>
          <div className="flex items-center gap-3">
            <div className="sidebar-logo-ring shrink-0" style={{padding:'2.5px'}}>
              <img src="/logo.png" alt="La Barakat" style={{width:'44px',height:'44px',borderRadius:'50%',objectFit:'cover',display:'block'}} />
            </div>
            {!sidebarCollapsed&&<div className="min-w-0 flex-1">
              <div className="mb-0.5">
                <span className="font-black truncate block" style={{fontSize:'13px',letterSpacing:'.02em',color:'#f1f5f9'}}>{clinique.nom}</span>
              </div>
              <p style={{fontSize:'10px',color:'#94a3b8',letterSpacing:'.03em'}}>{clinique.sousTitre}</p>
            </div>}
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto" style={{scrollbarWidth:'thin',scrollbarColor:'#e2e8f0 transparent'}}>
          {Object.entries(grouped).map(([cat,items])=>{
            // Couleur d'accent par catégorie (repérage visuel des sections)
            const CAT_COLORS={ 'Général':'#0d9488','General':'#0d9488','Clinique':'#2563eb','Commercial':'#ea580c','Pharmacie':'#7c3aed','Financier':'#16a34a' };
            const catColor=CAT_COLORS[cat]||'#64748b';
            return (
            <details
              key={cat}
              className="sidebar-group"
              open={cat==='Général'||cat==='Clinique'||cat==='Commercial'}
            >
              {!sidebarCollapsed&&<summary className="sidebar-cat-btn">
                <span className="sidebar-cat" style={{display:'inline-flex',alignItems:'center',gap:6}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:catColor,display:'inline-block',flexShrink:0}}/>
                  {cat}
                </span>
                <span className="sidebar-cat-caret">›</span>
              </summary>}
              <div className="sidebar-items">
                {items.map(item=>{
                  const active=view===item.id;
                  const todayS=new Date().toISOString().split('T')[0];
                  const badge=
                    item.id==='medicaments' ? meds.filter(m=>(m.seuil||0)>0&&m.stock<=m.seuil).length :
                    item.id==='agenda'      ? rdvs.filter(r=>r.date===todayS).length :
                    0;
                  return (
                    <button
                      key={item.id}
                      onClick={()=>{setView(item.id);setShowNotifs(false);setSidebarOpen(false);}}
                      className={`sidebar-item w-full flex items-center gap-3 transition-all text-left ${active?'sidebar-active':''}`}
                      style={{padding:'9px 12px',color:active?catColor:'#64748b'}}
                    >
                      {/* Icône teintée à la couleur de la catégorie */}
                      <span className="nav-icon shrink-0" style={{
                        fontSize:'15px',
                        width:'22px',height:'22px',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        borderRadius:'7px',flexShrink:0,
                        background:active?`${catColor}22`:`${catColor}0f`,
                        boxShadow:active?`0 0 0 1.5px ${catColor}44`:'none',
                        color:catColor,
                        transition:'all .18s',
                      }}><NavIcon id={item.id} size={14} /></span>
                      {!sidebarCollapsed&&<span className="nav-label truncate" style={{fontSize:'13px',fontWeight:active?700:500}}>{item.label}</span>}
                      {/* Partie droite : badge prioritaire, sinon dot ou lock */}
                      {!sidebarCollapsed&&(
                        badge>0
                          ? <span className={`sidebar-badge${item.id==='medicaments'?' sidebar-badge--warn':''}`}>{badge>9?'9+':badge}</span>
                          : active
                            ? <span className="sidebar-active-dot"/>
                            : item.admin
                              ? <LockIcon size={10} strokeWidth={2.4} style={{marginLeft:'auto',opacity:.3}}/>
                              : null
                      )}
                    </button>
                  );
                })}
              </div>
            </details>
            );
          })}
        </nav>

        {/* ── Pied sidebar ── */}
        <div className="px-3 pb-4" style={{borderTop:'1px solid #e8edf2',paddingTop:'12px',display:'flex',flexDirection:'column',gap:'6px'}}>
          {isAdmin&&<button onClick={toggleOTR}
            title={otrMode?'Mode OTR actif — cliquez pour désactiver':'Activer le mode OTR (masquer les montants)'}
            style={{width:'100%',padding:'8px 12px',borderRadius:'10px',fontSize:'11px',fontWeight:700,transition:'all .18s',
              display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,
              background:otrMode?'rgba(245,158,11,0.08)':'transparent',
              border:`1px solid ${otrMode?'rgba(245,158,11,0.3)':'#e2e8f0'}`,
              color:otrMode?'#d97706':'#94a3b8'}}>
            {otrMode?<EyeOff size={13} strokeWidth={2.4}/>:<Eye size={13} strokeWidth={2.4}/>}
            {!sidebarCollapsed&&(otrMode?'Mode OTR actif':'Mode OTR')}
          </button>}
          <button onClick={()=>setConfirmLogout(true)}
            title="Déconnexion"
            style={{width:'100%',padding:'9px 12px',borderRadius:'10px',fontSize:'12px',fontWeight:700,
              background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.15)',
              color:'#ef4444',transition:'all .18s',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
            <LogOut size={13} strokeWidth={2.4}/>{!sidebarCollapsed&&' Déconnexion'}
          </button>
        </div>
      </div>

      {/* ── Bouton collapse desktop ── */}
<button
  onClick={()=>setSidebarCollapsed(p=>!p)}
  className="hidden md:flex"
  style={{
    position:'absolute',
    top:'50%',
    right:'-13px',
    transform:'translateY(-50%)',
    width:'26px',
    height:'26px',
    borderRadius:'50%',
    background:'var(--app-surface)',
    border:'1.5px solid var(--app-border)',
    boxShadow:'0 2px 8px rgba(0,0,0,0.12)',
    alignItems:'center',
    justifyContent:'center',
    cursor:'pointer',
    zIndex:60,
    fontSize:'12px',
    fontWeight:900,
    color:'var(--app-muted)',
    transition:'all .2s',
  }}
  title={sidebarCollapsed?'Agrandir le menu':'Réduire le menu'}
>
  {sidebarCollapsed?'›':'‹'}
</button>
    </aside>

    {/* ══ MAIN ══ */}
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* OTR Mode banner */}
      {otrMode&&<div className="flex items-center justify-between px-5 py-2 text-xs font-bold no-print" style={{background:'linear-gradient(135deg,#ea580c,#dc2626)',color:'white'}}>
        <div className="flex items-center gap-2"><EyeOff size={14} strokeWidth={2.4}/><span>MODE OTR ACTIVÉ — Données financières sensibles masquées</span></div>
        <button onClick={toggleOTR} className="underline hover:no-underline">Désactiver</button>
      </div>}
      {/* Status bar (offline / sync pending) */}
      {(!online||syncing||syncPending>0||sbError)&&<div className={`flex items-center justify-between px-5 py-1.5 text-xs font-semibold no-print ${!online?'bg-amber-500 text-white':syncBlocked?'bg-red-100 text-red-700':sbError?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}`}>
        <div className="flex items-center gap-2">
          {!online&&<><span>📡</span><span>Hors ligne — vos modifications seront synchronisées à la reconnexion</span></>}
          {online&&syncing&&<><span className="inline-block animate-spin">🔄</span><span>Synchronisation des données…</span></>}
          {online&&!syncing&&syncPending>0&&syncBlocked&&<><span>⚠️</span><span>{syncPending} opération(s) refusée(s) par le serveur — réessayez ou signalez à l'administrateur</span></>}
          {online&&!syncing&&syncPending>0&&!syncBlocked&&<><span className="inline-block animate-spin">🔄</span><span>{syncPending} opération(s) en attente de sync…</span></>}
          {online&&!syncing&&!syncPending&&sbError&&<><span>⚠️</span><span>Connexion Supabase impossible — données locales utilisées</span></>}
        </div>
        {online&&syncPending>0&&!syncing&&<div className="flex items-center gap-3">
          <button onClick={()=>syncQueue(sb, n=>setSyncPending(n)).then((synced)=>{ const rest=getQ().length; setSyncPending(rest); setSyncBlocked(rest>0&&navigator.onLine); if(synced>0)loadAll({ force: true }) })} className="underline">{syncBlocked?'Réessayer':'Synchroniser'}</button>
          {syncBlocked&&<button onClick={()=>{ if(confirm(`Abandonner définitivement ces ${syncPending} opération(s) non synchronisées ?\nElles seront perdues.`)){ localStorage.removeItem('lb_offlineQueue'); setSyncPending(0); setSyncBlocked(false) } }} className="underline">Abandonner</button>}
        </div>}
      </div>}
      {/* Rappel de sauvegarde hebdomadaire (admin) */}
      {backupDue&&isAdmin&&online&&<div className="flex items-center justify-between px-5 py-1.5 text-xs font-semibold no-print bg-teal-50 text-teal-800" style={{borderBottom:'1px solid #99f6e4'}}>
        <span>Sauvegarde hebdomadaire recommandée — dernière copie locale il y a plus de 7 jours</span>
        <div className="flex items-center gap-3">
          <button onClick={faireSauvegarde} className="underline font-bold">Sauvegarder maintenant</button>
          <button onClick={()=>{localStorage.setItem('lb_last_backup',String(Date.now()));setBackupDue(false)}} className="underline" title="Reporter d'une semaine">Plus tard</button>
        </div>
      </div>}
      {/* ── Header premium ── */}
      <header className="app-header no-print shrink-0 z-10 relative" style={{height:'58px',padding:'0 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        {/* Gauche : fil d'ariane */}
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <button
            onClick={()=>setSidebarOpen(true)}
            className="no-print header-btn md:hidden"
            title="Menu"
            style={{fontSize:'15px',width:34,height:34}}
          >
            <MenuIcon size={17} strokeWidth={2.2} />
          </button>
          {view!=='dashboard'&&<button
            onClick={()=>navigate(-1)}
            className="no-print header-btn"
            title="Retour à la page précédente"
            style={{width:34,height:34}}
          >
            <ArrowLeft size={17} strokeWidth={2.4} />
          </button>}
          <div style={{width:'36px',height:'36px',borderRadius:'12px',background:'linear-gradient(135deg,#0d9488,#14b8a6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'17px',flexShrink:0,boxShadow:'0 2px 10px rgba(13,148,136,0.28)'}}>
            <NavIcon id={view} size={18} color="white" />
          </div>
          <div>
            <h2 className="app-header-title">{NAV_ALL.find(n=>n.id===view)?.label||'–'}</h2>
            <p className="app-header-sub">{clinique.nom} · {NAV_ALL.find(n=>n.id===view)?.cat}</p>
          </div>
        </div>

        {/* Droite : actions */}
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        
          {/* Heure temps réel */}
<span className="hidden lg:block" style={{
  fontWeight:800,
  fontSize:'15px',
  letterSpacing:'.05em',
  color:'var(--app-text)',
  fontVariantNumeric:'tabular-nums',
  fontFamily:'monospace'
}}>
  {heure}
</span>
          {/* Recherche globale + Profil (style référence) */}
          <button
            onClick={()=>{setGlobalSearchOpen(true);setUserMenuOpen(false);}}
            className="no-print header-btn"
            title="Recherche (Ctrl+K)"
            style={{fontSize:'16px'}}
          >
            <Search size={17} strokeWidth={2.2} />
          </button>
<button
  onClick={()=>setUserMenuOpen(p=>!p)}
  className="no-print"
  title="Mon profil"
  style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 10px',borderRadius:'12px',
    border:'1px solid var(--app-border)',background:'var(--app-surface)',cursor:'pointer',transition:'all .15s'}}
>
  {/* Avatar avec point vert */}
  <div style={{position:'relative',flexShrink:0}}>
    <div style={{
      width:'32px',height:'32px',borderRadius:'50%',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontWeight:900,fontSize:'12px',color:'white',
      background:isAdmin?'linear-gradient(135deg,#d97706,#f59e0b)':'linear-gradient(135deg,#166534,#1d4ed8)',
      boxShadow:'0 2px 8px rgba(0,0,0,0.15)'
    }}>
      {user?.initials||'?'}
    </div>
    {/* Point vert / orange hors ligne */}
    <span style={{
      position:'absolute',bottom:'-1px',right:'-1px',
      width:'10px',height:'10px',borderRadius:'50%',
      background:online?'#22c55e':'#f59e0b',
      border:'2px solid white',
      display:'block'
    }}/>
  </div>
  {/* Nom + rôle */}
  <div className="hidden lg:block" style={{textAlign:'left'}}>
    <p style={{fontSize:'12px',fontWeight:800,color:'var(--app-text)',lineHeight:1.1}}>{user?.name}</p>
    <p style={{fontSize:'10px',color:'var(--app-muted)',lineHeight:1}}>{ROLES[user?.role]?.label||'Utilisateur'}</p>
  </div>
</button>
          {userMenuOpen&&<div
            style={{
              position:'absolute',
              right:20,
              top:68,
              width:220,
              background:'var(--app-surface)',
              border:'1px solid var(--app-border)',
              borderRadius:14,
              boxShadow:'0 18px 60px rgba(0,0,0,0.18)',
              padding:10,
              zIndex:70,
            }}
            className="no-print"
          >
            <button
              onClick={()=>{setView('monprofil');setUserMenuOpen(false);setSidebarOpen(false);}}
              style={{width:'100%',padding:'10px 12px',borderRadius:12,border:'1px solid var(--app-border)',background:'transparent',cursor:'pointer',fontWeight:800,color:'var(--app-text)',textAlign:'left',display:'flex',alignItems:'center',gap:8}}
            >
              <UserIcon size={14} strokeWidth={2.4}/> Mon profil
            </button>
            <button
              onClick={()=>{
                setUserMenuOpen(false);
                setConfirmLogout(true);
              }}
              style={{width:'100%',padding:'10px 12px',borderRadius:12,border:'1px solid rgba(239,68,68,0.35)',background:'rgba(239,68,68,0.08)',cursor:'pointer',fontWeight:900,color:'rgba(239,68,68,0.95)',textAlign:'left',marginTop:8,display:'flex',alignItems:'center',gap:8}}
            >
              <LogOut size={14} strokeWidth={2.4}/> Déconnexion
            </button>
          </div>}
          {/* Notifs */}
          <button onClick={()=>setShowNotifs(p=>!p)} className="no-print header-btn" style={{position:'relative'}}>
            <Bell size={17} strokeWidth={2.2} />
            {notifsNonLues.length>0&&<span style={{position:'absolute',top:'2px',right:'1px',minWidth:'16px',height:'16px',padding:'0 3px',
              background:'#ef4444',borderRadius:'99px',color:'white',fontWeight:800,
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',
              border:'2px solid white'}}>{notifsNonLues.length>9?'9+':notifsNonLues.length}</span>}
          </button>
          {online&&<button onClick={()=>loadAll({ force: true })} disabled={syncing} className="no-print header-btn" title="Rafraîchir" style={{opacity:syncing?0.5:1}}><RotateCw size={16} strokeWidth={2.2} className={syncing?'animate-spin':''} /></button>}
          <button onClick={()=>{document.body.classList.toggle('dark-mode');localStorage.setItem('lb_dark',document.body.classList.contains('dark-mode')?'1':'0');}}
            className="no-print header-btn" title="Mode sombre"
            style={{fontSize:'16px'}}>
            {document.body.classList.contains('dark-mode')?<Sun size={17} strokeWidth={2.2} />:<Moon size={17} strokeWidth={2.2} />}
          </button>
          {isAdmin&&<button onClick={()=>setView('parametres')} className="no-print header-btn" title="Paramètres"><SettingsIcon size={17} strokeWidth={2.2} /></button>}
        </div>
      </header>

      {/* Content */}
      <ScreenErrorBoundary key={view}>
        <div className="app-main-scroll flex-1 overflow-y-auto">
          <ViewTransition viewKey={view}>
            <div className="p-4 sm:p-6">
              {/* Skeleton au premier chargement (aucune donnée en cache) */}
              {syncing && patients.length === 0 && meds.length === 0 && clients.length === 0
                ? <SkPage stats={4} rows={7} />
                : <Suspense fallback={<SkPage stats={4} rows={7} />}>
              {view==='dashboard'&&<Dashboard {...sp}/>}
              {view==='monprofil'&&<MonProfil user={user}/>}
              {view==='parametres'&&(isAdmin?<Parametres equipe={equipe} setEquipe={setSyncedEquipe} clinique={clinique} setClinique={setClinique} tva={tva} saveTva={saveTva} saveClinique={saveClinique} saveEquipe={saveEquipe}/>:<Interdit/>)}
              {view==='comptes'&&((user?.role==='admin'||user?.role==='admin2')?<GestionComptes comptes={comptes} setComptes={setSyncedComptes} currentUser={user} reloadComptes={reloadComptes}/>:<Interdit/>)}
              {view==='patients'&&<Patients {...sp}/>}
              {view==='consultations'&&<Consultations {...sp}/>}
              {view==='dossiers'&&<Dossiers {...sp}/>}
              {view==='ordonnances'&&<Ordonnances {...sp}/>}
              {view==='chirurgies'&&<Chirurgies {...sp}/>}
              {view==='hospitalisation'&&<Hospitalisation {...sp}/>}
              {view==='agenda'&&<Agenda {...sp}/>}
              {view==='taches'&&<Taches {...sp}/>}
              {view==='calculateur'&&<Calculateur {...sp}/>}
              {view==='consentements'&&<Consentements {...sp}/>}
              {view==='vaccinations'&&<Vaccinations {...sp}/>}
              {view==='clients'&&<Clients {...sp}/>}
              {view==='fournisseurs'&&(isAdmin?<Fournisseurs {...sp}/>:<Interdit/>)}
              {view==='factures'&&(isAdmin?<Factures {...sp}/>:<Interdit/>)}
              {view==='devis'&&<Devis {...sp}/>}
              {view==='creances'&&<Creances ventesHist={ventesHist} setVentesHist={setSyncedVentesHist} otrMode={otrMode} sb={sb} tva={tva} consultations={consultations} setConsultations={setSyncedConsultations} meds={meds} setMeds={setSyncedMeds} clients={clients}/>}
              {view==='medicaments'&&<Medicaments {...sp}/>}
              {view==='commandes'&&<Commandes {...sp}/>}
              {view==='inventaire'&&<Inventaire {...sp}/>}

              {view==='finances'&&(isAdmin?<Finances clinique={clinique} otrMode={otrMode} ventesHist={ventesHist} depsHist={depsHist} tva={tva}/>:<Interdit/>)}
              {view==='depenses'&&(isAdmin?<Depenses otrMode={otrMode} depsHist={depsHist} setDepsHist={setSyncedDepsHist} sb={sb}/>:<Interdit/>)}
              {view==='historique'&&<Historique ventesHist={ventesHist} achatsHist={achatsHist} meds={meds}/>}
              {view==='journal'&&<JournalActivite user={user}/>}
              {view==='lots'&&<GestionLots meds={meds} ventesHist={ventesHist} user={user}/>}
              {view==='caisse'&&<Caisse {...sp}/>}
              {view==='ia'&&<AssistantIA patients={patients} meds={meds} user={user} sb={sb}/>}
              {view==='notifications'&&<GestionNotifications meds={meds} user={user}/>}
              {view==='rapports'&&(isAdmin?<Rapports ventesHist={ventesHist} depsHist={depsHist} otrMode={otrMode} meds={meds} tva={tva}/>:<Interdit/>)}
              {view==='rapportspdf'&&(isAdmin?<RapportsPDF ventesHist={ventesHist} depsHist={depsHist} meds={meds} patients={patients} clinique={clinique} otrMode={otrMode}/>:<Interdit/>)}
              {view==='carteclients'&&<CarteClients clients={clients} patients={patients}/>}
              {view==='traitements'&&<SuiviTraitements patients={patients} meds={meds} setMeds={setSyncedMeds} user={user} sb={sb} tva={tva} ventesHist={ventesHist} setVentesHist={setSyncedVentesHist}/>}
              </Suspense>}
            </div>
          </ViewTransition>
        </div>
      </ScreenErrorBoundary>
    </main>

    {/* ══ PANNEAU NOTIFICATIONS ══ */}
    {showNotifs&&<>
      <div className="fixed inset-0 z-40" onClick={()=>setShowNotifs(false)}/>
      <div className="notif-panel z-50">
        <div className="flex items-center justify-between p-4 border-b" style={{background:'linear-gradient(135deg,#166534,#1e3a8a)'}}>
          <div className="flex items-center gap-2">
            <Bell size={18} color="white" strokeWidth={2.2} />
            <h3 className="font-bold text-white">Notifications</h3>
            {notifsNonLues.length>0&&<span className="bg-red-500 text-white font-black px-2 py-0.5 rounded-full" style={{fontSize:'11px'}}>{notifsNonLues.length} nouvelles</span>}
          </div>
          <div className="flex items-center gap-2">
            {notifsNonLues.length>0&&<button onClick={toutMarquerLu} className="text-green-300 hover:text-white font-semibold" style={{fontSize:'12px'}}>Tout lire</button>}
            <button onClick={()=>setShowNotifs(false)} className="text-white/60 hover:text-white w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-all">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifs.length===0&&<div className="text-center text-slate-400 py-12 text-sm">Aucune notification 🎉</div>}
          {notifs.map(n=>{
            const lu=luNotifs.includes(n.id);
            return <div key={n.id} className={`flex gap-3 p-3 rounded-xl border-l-4 transition-all ${NOTIF_COLORS[n.type]} ${lu?'opacity-40':''}`}>
              <span className="text-xl shrink-0">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-bold text-sm text-slate-800">{n.titre}</p>
                  <Badge color="slate">{n.cat}</Badge>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{n.msg}</p>
              </div>
              {!lu&&<button onClick={()=>marquerLu(n.id)} className="text-slate-300 hover:text-green-600 text-base shrink-0 transition-all" title="Marquer comme lu">✓</button>}
            </div>;
          })}
        </div>
        <div className="p-3 border-t border-slate-100 text-center text-slate-400" style={{fontSize:'12px'}}>
          {luNotifs.filter(id=>notifs.find(n=>n.id===id)).length}/{notifs.length} lue(s)
        </div>
      </div>
    </>}

    {/* ── Recherche globale (style référence) ── */}
    {globalSearchOpen&&<>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={()=>{setGlobalSearchOpen(false);setGlobalSearch('');}}/>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        <div className="w-full max-w-xl" onClick={(e)=>e.stopPropagation()}>
          <div className="app-card p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div style={{fontWeight:900,display:'flex',alignItems:'center',gap:'8px',color:'var(--app-text)'}}>
                <span>🔎</span> Recherche
              </div>
              <button
                type="button"
                onClick={()=>{setGlobalSearchOpen(false);setGlobalSearch('');}}
                className="no-print"
                style={{padding:'6px 10px',borderRadius:12,border:'1px solid var(--app-border)',background:'transparent',cursor:'pointer',fontWeight:800,color:'var(--app-text)'}}
              >
                ✕
              </button>
            </div>

            <input
              value={globalSearch}
              onChange={(e)=>setGlobalSearch(e.target.value)}
              placeholder="Tapez un patient, un médicament, ou un client…"
              className="w-full"
              style={{border:'1.5px solid var(--app-border)',borderRadius:12,padding:'10px 12px',outline:'none',fontSize:13,fontFamily:'Outfit,sans-serif',background:'var(--app-surface)',color:'var(--app-text)'}}
            />

            <div className="mt-3 space-y-3">
              {String(globalSearch||'').trim().length<2&&<div className="text-sm" style={{color:'var(--app-muted)'}}>Tapez au moins 2 caractères.</div>}

              {String(globalSearch||'').trim().length>=2&&(
                <>
                  {!!globalResults.patients.length&&<div>
                    <div style={{fontSize:11,fontWeight:900,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--app-muted)',marginBottom:6}}>Patients</div>
                    <div className="space-y-2">
                      {globalResults.patients.map(p=>(
                        <button
                          key={p.id}
                          type="button"
                          onClick={()=>{setView('patients');setGlobalSearchOpen(false);setGlobalSearch('');setUserMenuOpen(false);}}
                          style={{width:'100%',textAlign:'left',padding:'10px 12px',borderRadius:12,border:'1px solid var(--app-border)',background:'var(--app-surface)',cursor:'pointer',fontWeight:800,color:'var(--app-text)'}}
                        >
                          🐾 {p.nom}
                          <span style={{display:'block',fontWeight:700,color:'var(--app-muted)',fontSize:12,marginTop:2}}>· {p.espece || ''} {p.proprio ? `· ${p.proprio}` : ''}</span>
                        </button>
                      ))}
                    </div>
                  </div>}

                  {!!globalResults.meds.length&&<div>
                    <div style={{fontSize:11,fontWeight:900,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--app-muted)',marginBottom:6}}>Médicaments</div>
                    <div className="space-y-2">
                      {globalResults.meds.map(m=>(
                        <button
                          key={m.id||m.ref}
                          type="button"
                          onClick={()=>{setView('medicaments');setGlobalSearchOpen(false);setGlobalSearch('');setUserMenuOpen(false);}}
                          style={{width:'100%',textAlign:'left',padding:'10px 12px',borderRadius:12,border:'1px solid var(--app-border)',background:'var(--app-surface)',cursor:'pointer',fontWeight:800,color:'var(--app-text)'}}
                        >
                          💊 {m.nom}
                          <span style={{display:'block',fontWeight:700,color:'var(--app-muted)',fontSize:12,marginTop:2}}>· {m.categorie || ''} {m.stock!=null ? `· stk: ${m.stock}` : ''}</span>
                        </button>
                      ))}
                    </div>
                  </div>}

                  {!!globalResults.clients.length&&<div>
                    <div style={{fontSize:11,fontWeight:900,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--app-muted)',marginBottom:6}}>Clients</div>
                    <div className="space-y-2">
                      {globalResults.clients.map(c=>(
                        <button
                          key={c.id}
                          type="button"
                          onClick={()=>{setView('clients');setGlobalSearchOpen(false);setGlobalSearch('');setUserMenuOpen(false);}}
                          style={{width:'100%',textAlign:'left',padding:'10px 12px',borderRadius:12,border:'1px solid var(--app-border)',background:'var(--app-surface)',cursor:'pointer',fontWeight:800,color:'var(--app-text)'}}
                        >
                          👥 {c.nom}
                        </button>
                      ))}
                    </div>
                  </div>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>}
  </div>
  {/* ── Modale de confirmation de déconnexion ── */}
  {confirmLogout && (
    <div onClick={()=>setConfirmLogout(false)}
      style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(5,15,10,0.55)',backdropFilter:'blur(4px)',WebkitBackdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:'var(--app-surface)',borderRadius:20,padding:'28px 26px 22px',maxWidth:360,width:'100%',boxShadow:'0 24px 64px rgba(0,0,0,0.35)',textAlign:'center',animation:'loginFadeIn .25s ease both'}}>
        <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(239,68,68,0.1)',border:'1.5px solid rgba(239,68,68,0.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
          <LogOut size={24} color="#ef4444" strokeWidth={2.2} />
        </div>
        <h3 style={{fontSize:17,fontWeight:900,color:'var(--app-text)',margin:'0 0 6px'}}>Se déconnecter ?</h3>
        <p style={{fontSize:13,color:'var(--app-muted)',margin:'0 0 20px'}}>
          {user?.name ? `À bientôt, ${user.name}. ` : ''}Vos données sont synchronisées, vous ne perdrez rien.
        </p>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>setConfirmLogout(false)}
            style={{flex:1,padding:'11px',borderRadius:12,border:'1.5px solid var(--app-border)',background:'transparent',color:'var(--app-text)',fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:"'Outfit',sans-serif"}}>
            Rester
          </button>
          <button onClick={()=>{setConfirmLogout(false);onLogout?.()}}
            style={{flex:1,padding:'11px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#ef4444,#dc2626)',color:'white',fontWeight:800,fontSize:14,cursor:'pointer',fontFamily:"'Outfit',sans-serif",boxShadow:'0 4px 16px rgba(239,68,68,0.35)',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <LogOut size={15} strokeWidth={2.4} /> Déconnexion
          </button>
        </div>
      </div>
    </div>
  )}
  <ToastContainer />
</>
}

export default App
