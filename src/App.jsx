import { useState, useEffect, useMemo, Component } from 'react'
import { sb, getCache, setCache, syncQueue, getQ, dbFetch, dbInsert, dbUpdate, dbDelete, newId, canAccess, ROLES, logAction, INIT_PATIENTS, INIT_CLIENTS, INIT_MEDS, DEFAULT_TEAM, COMPTES_DEFAULT, NAV_ALL, TABLE } from './lib/globals'

// UI Components
import { Btn, Badge, Field, DupWarning, AutoSuggest, FilterBtns, FilterBar, FilterSelect, FilterPeriode, Interdit } from './components/ui'

// Pages - Clinique
import { Patients, Consultations, Dossiers, Hospitalisation, Chirurgies, Ordonnances, Calculateur, Consentements } from './pages/clinique'

// Pages - Agenda
import { Agenda, AgendaCalendrier, Taches } from './pages/agenda'

// Pages - Pharmacie
import { Medicaments, Commandes, Inventaire } from './pages/pharmacie'

// Pages - Commercial
import { Clients, Fournisseurs, Factures, Ventes, Devis, Creances, Caisse, Historique } from './pages/commercial'

// Pages - Finance
import { Depenses, Finances, RapportsPDF, Rapports } from './pages/finance'

// Pages - Admin
import { Parametres, MonProfil, GestionComptes, JournalActivite } from './pages/admin'

// Pages - Outils
import { AssistantIA, GestionNotifications, CarteClients, SuiviTraitements, GestionLots } from './pages/outils'

// Dashboard
import Dashboard from './pages/Dashboard'

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
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error || 'Erreur inconnue')
      return (
        <div className="screen-error-boundary p-6 rounded-[14px] border">
          <div className="font-black mb-1.5">Erreur d'affichage</div>
          <div className="text-[13px] leading-snug whitespace-pre-wrap screen-error-boundary__msg">{msg}</div>
        </div>
      )
    }
    return this.props.children
  }
}

function App({logged,setLogged,user,setUser}){
  const [view,setView]=useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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
  const [patients,setPatients]=useState(()=>getCache('patients')||INIT_PATIENTS);
  const [clients,setClients]=useState(()=>getCache('clients')||INIT_CLIENTS);
  const [meds,setMeds]=useState(()=>getCache('medicaments')||INIT_MEDS);
  const [equipe,setEquipe]=useState(()=>getCache('equipe')||DEFAULT_TEAM);
  const [clinique,setClinique]=useState(()=>getCache('clinique_settings')||{nom:'La Barakat',sousTitre:'Pharmacie & Clinique Vétérinaire',tel:'',adresse:'',ville:'',email:''});
  const [comptes,setComptes]=useState(()=>getCache('comptes')||COMPTES_DEFAULT);
  const [showNotifs,setShowNotifs]=useState(false);
  const [luNotifs,setLuNotifs]=useState([]);
  const [activityNotifs,setActivityNotifs]=useState([]);
  const [online,setOnline]=useState(navigator.onLine);
  // appLoading now from Root props
  const [syncPending,setSyncPending]=useState(()=>getQ().length);
  const [otrMode,setOtrMode]=useState(()=>localStorage.getItem('lb_otr')==='1');
  const [tva,setTva]=useState(()=>{ try{return JSON.parse(localStorage.getItem('lb_tva')||'{"active":false,"taux":18}');}catch{return {active:false,taux:18};} });
  const [ventesHist,setVentesHist]=useState(()=>{ try{return JSON.parse(localStorage.getItem('lb_ventes_hist')||'[]');}catch{return [];} });
  const [achatsHist,setAchatsHist]=useState(()=>{ try{return JSON.parse(localStorage.getItem('lb_achats_hist')||'[]');}catch{return [];} });
  const [depsHist,setDepsHist]=useState(()=>{ try{return JSON.parse(localStorage.getItem('lb_deps_hist')||'[]');}catch{return [];} });
  const [devis,setDevis]=useState([]);
  const toggleOTR=()=>setOtrMode(p=>{localStorage.setItem('lb_otr',p?'0':'1');return !p;});
  const saveTva=t=>{setTva(t);localStorage.setItem('lb_tva',JSON.stringify(t));}
  const [sbError,setSbError]=useState(false);

  // ── Load all data from Supabase ────────────────────────
  const loadAll = async () => {
    try {
      const tables = [
        ['patients',setPatients],['clients',setClients],['medicaments',setMeds],
        ['equipe',setEquipe],['comptes',setComptes],
      ];
      await Promise.all(tables.map(async ([t,setter])=>{
        const d = await dbFetch(sb, t);
        if(d&&d.length>0) setter(d);
      }));
      // Load clinique settings
      const cliniqueData = await dbFetch(sb, 'clinique_settings');
      if(cliniqueData&&cliniqueData.length>0){
        const obj={};
        cliniqueData.forEach(r=>{ obj[r.key]=r.value; });
        if(obj.nom) setClinique({nom:obj.nom||'La Barakat',sousTitre:obj.sousTitre||'Pharmacie & Clinique Vétérinaire',tel:obj.tel||'',adresse:obj.adresse||'',ville:obj.ville||'',email:obj.email||''});
      }
      setSbError(false);
    } catch(e){ setSbError(true); }
  };

  useEffect(()=>{
    loadAll();
    const onOnline  = ()=>{ setOnline(true);  syncQueue(sb, n=>setSyncPending(n)).then(()=>{ loadAll(); setSyncPending(getQ().length); }); };
    const onOffline = ()=>{ setOnline(false); setSyncPending(getQ().length); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return ()=>{ window.removeEventListener('online',onOnline); window.removeEventListener('offline',onOffline); };
  },[]);

  // ── Enhanced setters that sync cache ──────────────────
  const syncedSet = (setter, table) => (data) => {
    setter(data);
    setCache(table, data);
  };
  const setSyncedPatients = syncedSet(setPatients,'patients');
  const setSyncedClients  = syncedSet(setClients,'clients');
  const setSyncedMeds     = syncedSet(setMeds,'medicaments');
  const setSyncedEquipe   = syncedSet(setEquipe,'equipe');
  const setSyncedComptes  = syncedSet(setComptes,'comptes');

  // Auth handled by Root component


  // ── Notifications auto-générées ──
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
    {id:'caisse',          label:'Caisse & Recus',        icon:'🧾', cat:'Commercial'},
    {id:'ia',              label:'Assistant IA',          icon:'🤖', cat:'General'},
    {id:'notifications',   label:'Notifications Push',    icon:'🔔', cat:'General',  admin:true},
    {id:'rapports',        label:'Rapports & Analyses',   icon:'📈', cat:'General',  admin:true},
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
    {id:'clients',         label:'Clients',               icon:'👥', cat:'Commercial'},
    {id:'fournisseurs',    label:'Fournisseurs',          icon:'🏭', cat:'Commercial',admin:true},
    {id:'factures',        label:'Factures',              icon:'📄', cat:'Commercial',admin:true},
    {id:'devis',           label:'Devis & Estimations',   icon:'📋', cat:'Commercial'},
    {id:'creances',         label:'Suivi créances',         icon:'💰', cat:'Commercial'},
    {id:'ventes',          label:'Ventes comptoir',       icon:'🛒', cat:'Commercial'},
    {id:'medicaments',     label:'Médicaments',           icon:'💊', cat:'Pharmacie'},
    {id:'commandes',       label:'Commandes',             icon:'📦', cat:'Pharmacie'},
    {id:'inventaire',      label:'Inventaire',            icon:'📊', cat:'Pharmacie'},
    {id:'depenses',        label:'Dépenses',              icon:'💸', cat:'Financier', admin:true},
    {id:'finances',        label:'État financier',        icon:'📈', cat:'Financier', admin:true},
    {id:'rapports',        label:'Rapports & Analyse',    icon:'📊', cat:'Financier', admin:true},
    {id:'historique',      label:'Historique produits',   icon:'🗂️', cat:'Pharmacie'},
  ];
  const isAdmin = user?.role==='admin';

  // ── Notifs admin : à chaque modification de médicament ──
  useEffect(()=>{
    if(!isAdmin) return;
    const maskOTR = (text) => {
      if(!otrMode) return text;
      // Masque tous les chiffres (stock/prix) en mode OTR
      return String(text || '').replace(/\d/g, '•')
    };

    const pushNotif = (entry) => {
      if(!entry || (entry.action !== 'medicament_modified' && entry.action !== 'medicament_added')) return;
      const isAdded = entry.action === 'medicament_added';
      const id = `activity-${entry.id}`;
      const notif = {
        id,
        type: isAdded ? 'info' : 'warning',
        icon: '💊',
        titre: isAdded ? 'Nouveau médicament ajouté' : 'Médicament modifié',
        msg: maskOTR(`${entry.user_name}: ${entry.details || 'Modification'}`),
        cat: 'Pharmacie',
      };

      setActivityNotifs((prev)=> prev.some(n=>n.id===id) ? prev : [notif, ...prev].slice(0, 20));

      // Notification navigateur (si autorisée)
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
  },[isAdmin, user?.email, otrMode]);

  // ── Fallback inter-machines : polling Supabase activité ──
  useEffect(()=>{
    if(!isAdmin) return;
    if(!sb || !navigator.onLine) return;

    const KEY='lb_activity_last_seen_medicaments';
    const maskOTR = (text) => {
      if(!otrMode) return text;
      return String(text || '').replace(/\d/g, '•')
    };

    const tick = async () => {
      try{
        const lastSeen = localStorage.getItem(KEY) || '';
        const { data } = await sb.from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(40);

        const rows = (data || [])
          .filter(e=>e && (e.action==='medicament_modified' || e.action==='medicament_added'))
          .filter(e=>!lastSeen || String(e.created_at||'') > String(lastSeen));

        if(!rows.length) return;

        // Appliquer du plus ancien vers le plus récent
        rows.slice().reverse().forEach((entry)=>{
          const isAdded = entry.action === 'medicament_added';
          const id = `activity-${entry.id}`;
          const notif = {
            id,
            type: isAdded ? 'info' : 'warning',
            icon: '💊',
            titre: isAdded ? 'Nouveau médicament ajouté' : 'Médicament modifié',
            msg: maskOTR(`${entry.user_name}: ${entry.details || 'Modification'}`),
            cat: 'Pharmacie',
          };

          setActivityNotifs((prev)=> prev.some(n=>n.id===id) ? prev : [notif, ...prev].slice(0, 20));

          try{
            if(typeof Notification !== 'undefined' && Notification.permission === 'granted'){
              new Notification('La Barakat 🐄', { body: notif.msg });
            }
          }catch(e){}
        });

        const maxCreatedAt = rows.reduce((acc, r)=> (String(r.created_at||'') > String(acc) ? String(r.created_at||'') : acc), lastSeen);
        localStorage.setItem(KEY, maxCreatedAt);
      }catch(e){}
    };

    tick();
    const t = setInterval(tick, 30000);
    return ()=> clearInterval(t);
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
    meds, setMeds:setSyncedMeds, setView, equipe:membresActifs,
    setEquipe:setSyncedEquipe, clinique, isAdmin,
    comptes, setComptes:setSyncedComptes,
    otrMode, toggleOTR,
    ventesHist, setVentesHist,
    achatsHist, setAchatsHist,
    depsHist, setDepsHist,
    tva, saveTva,
    devis, setDevis,
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

  return <div className="app-layout flex min-h-screen flex-col md:flex-row">

    {/* ══ SIDEBAR ══ */}
    {sidebarOpen&&<div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={()=>setSidebarOpen(false)}/>}
    <aside className={`sidebar-bg text-white flex flex-col shrink-0 relative overflow-hidden transition-all duration-300
  ${sidebarOpen?'fixed top-0 left-0 z-50 h-screen':'hidden'} md:block
  ${sidebarCollapsed?'md:w-16':'md:w-64'}`}>
      {/* Lueur déco */}
      <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse at 80% 10%,rgba(34,197,94,0.08),transparent 55%),radial-gradient(ellipse at 20% 90%,rgba(59,130,246,0.08),transparent 55%)'}}/>

      <div className="relative z-10 flex flex-col h-full">
        {/* ── Logo zone ── */}
        <div className="px-4 pt-5 pb-4" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="flex items-center gap-3">
            {/* Avatar anneau doré */}
            <div className="sidebar-logo-ring shrink-0" style={{padding:'2.5px'}}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{background:'linear-gradient(135deg,#0d4f28,#1e3a8a)'}}>
                <span style={{fontSize:'22px'}}>🐄</span>
              </div>
            </div>
           {!sidebarCollapsed&&<div className="min-w-0 flex-1">
  <div className="flex items-center gap-1 mb-0.5">
    <span style={{color:'#fbbf24',fontSize:'9px'}}>★</span>
    <span className="font-black text-white truncate" style={{fontSize:'13px',letterSpacing:'.02em'}}>{clinique.nom}</span>
    <span style={{color:'#fbbf24',fontSize:'9px'}}>★</span>
  </div>
  <p style={{fontSize:'10px',color:'rgba(255,255,255,0.35)',letterSpacing:'.03em'}}>{clinique.sousTitre}</p>
</div>}
          </div>

        
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto" style={{scrollbarWidth:'thin',scrollbarColor:'rgba(255,255,255,0.15) transparent'}}>
          {Object.entries(grouped).map(([cat,items])=>(
            <details
              key={cat}
              className="sidebar-group"
              open={cat==='Général'||cat==='Clinique'||cat==='Commercial'}
            >
              {!sidebarCollapsed&&<summary className="sidebar-cat-btn">
  <span className="sidebar-cat">{cat}</span>
  <span className="sidebar-cat-caret">›</span>
</summary>}
              <div className="sidebar-items">
                {items.map(item=>{
                  const active=view===item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={()=>{setView(item.id);setShowNotifs(false);setSidebarOpen(false);}}
                      className={`sidebar-item w-full flex items-center gap-3 transition-all text-left ${active?'sidebar-active':''}`}
                      style={{padding:'9px 12px',color:active?'#fff':'rgba(255,255,255,0.5)'}}
                    >
                      <span className="nav-icon shrink-0" style={{fontSize:'15px',width:'18px',textAlign:'center'}}>{item.icon}</span>
                      {!sidebarCollapsed&&<span className="nav-label truncate" style={{fontSize:'13px',fontWeight:active?700:500}}>{item.label}</span>}
                      {active&&<span style={{marginLeft:'auto',width:'6px',height:'6px',borderRadius:'50%',background:'#fb923c',flexShrink:0,boxShadow:'0 0 8px rgba(251,146,60,0.55)'}}/>}
                      {!active&&item.admin&&<span style={{marginLeft:'auto',fontSize:'10px',opacity:.2}}>🔒</span>}
                    </button>
                  );
                })}
              </div>
            </details>
          ))}
        </nav>

        {/* ── Pied sidebar ── */}
        <div className="px-3 pb-4" style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:'12px',display:'flex',flexDirection:'column',gap:'6px'}}>
          {isAdmin&&<button onClick={toggleOTR}
            style={{width:'100%',padding:'8px 12px',borderRadius:'10px',fontSize:'11px',fontWeight:700,transition:'all .18s',
              background:otrMode?'rgba(251,146,60,0.15)':'rgba(255,255,255,0.04)',
              border:`1px solid ${otrMode?'rgba(251,146,60,0.3)':'rgba(255,255,255,0.07)'}`,
              color:otrMode?'#fdba74':'rgba(255,255,255,0.35)'}}>
            {otrMode?'🙈 Mode OTR actif':'👁️ Mode OTR'}
          </button>}
          <button onClick={()=>{if(confirm('Se déconnecter ?')){setLogged(false);setUser(null);}}}
            style={{width:'100%',padding:'9px 12px',borderRadius:'10px',fontSize:'12px',fontWeight:700,
              background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.18)',
              color:'rgba(252,165,165,0.85)',transition:'all .18s',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
            🔒 Déconnexion
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
        <div className="flex items-center gap-2"><span>🙈</span><span>MODE OTR ACTIVÉ — Données financières sensibles masquées</span></div>
        <button onClick={toggleOTR} className="underline hover:no-underline">Désactiver</button>
      </div>}
      {/* Status bar (offline / sync pending) */}
      {(!online||syncPending>0||sbError)&&<div className={`flex items-center justify-between px-5 py-1.5 text-xs font-semibold no-print ${!online?'bg-amber-500 text-white':sbError?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}`}>
        <div className="flex items-center gap-2">
          {!online&&<><span>📡</span><span>Hors ligne — vos modifications seront synchronisées à la reconnexion</span></>}
          {online&&syncPending>0&&<><span className="inline-block animate-spin">🔄</span><span>{syncPending} opération(s) en attente de sync…</span></>}
          {online&&!syncPending&&sbError&&<><span>⚠️</span><span>Connexion Supabase impossible — données locales utilisées</span></>}
        </div>
        {online&&syncPending>0&&<button onClick={()=>syncQueue(sb, n=>setSyncPending(n))} className="underline">Synchroniser</button>}
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
            ☰
          </button>
          <div style={{width:'36px',height:'36px',borderRadius:'12px',background:'linear-gradient(135deg,#f97316,#ea580c)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'17px',flexShrink:0,boxShadow:'0 2px 10px rgba(234,88,12,0.3)'}}>
            {NAV_ALL.find(n=>n.id===view)?.icon||'📋'}
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
            title="Recherche"
            style={{fontSize:'16px'}}
          >
            🔎
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
              style={{width:'100%',padding:'10px 12px',borderRadius:12,border:'1px solid var(--app-border)',background:'transparent',cursor:'pointer',fontWeight:800,color:'var(--app-text)',textAlign:'left'}}
            >
              👤 Mon profil
            </button>
            <button
              onClick={()=>{
                setUserMenuOpen(false);
                if(confirm('Se déconnecter ?')){setLogged(false);setUser(null);}
              }}
              style={{width:'100%',padding:'10px 12px',borderRadius:12,border:'1px solid rgba(239,68,68,0.35)',background:'rgba(239,68,68,0.08)',cursor:'pointer',fontWeight:900,color:'rgba(239,68,68,0.95)',textAlign:'left',marginTop:8}}
            >
              🔒 Déconnexion
            </button>
          </div>}
          {/* Notifs */}
          <button onClick={()=>setShowNotifs(p=>!p)} className="no-print header-btn" style={{position:'relative'}}>
            🔔
            {notifsNonLues.length>0&&<span style={{position:'absolute',top:'3px',right:'3px',width:'16px',height:'16px',
              background:'#ef4444',borderRadius:'50%',color:'white',fontWeight:800,
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',
              border:'2px solid white'}}>{notifsNonLues.length}</span>}
          </button>
          {online&&<button onClick={loadAll} className="no-print header-btn" title="Rafraîchir" style={{fontSize:'18px',fontWeight:300}}>↻</button>}
          <button onClick={()=>{document.body.classList.toggle('dark-mode');localStorage.setItem('lb_dark',document.body.classList.contains('dark-mode')?'1':'0');}}
            className="no-print header-btn" title="Mode sombre"
            style={{fontSize:'16px'}}>
            {document.body.classList.contains('dark-mode')?'☀️':'🌙'}
          </button>
          {isAdmin&&<button onClick={()=>setView('parametres')} className="no-print header-btn" title="Paramètres">⚙️</button>}
        </div>
      </header>

      {/* Content */}
      <ScreenErrorBoundary key={view}>
        <div className="app-main-scroll section-anim flex-1 overflow-y-auto p-4 sm:p-6">
          {view==='dashboard'&&<Dashboard {...sp}/>}
          {view==='monprofil'&&<MonProfil user={user} comptes={comptes} setComptes={setSyncedComptes}/>}
          {view==='parametres'&&(isAdmin?<Parametres equipe={equipe} setEquipe={setSyncedEquipe} clinique={clinique} setClinique={setClinique} tva={tva} saveTva={saveTva}/>:<Interdit/>)}
          {view==='comptes'&&(isAdmin?<GestionComptes comptes={comptes} setComptes={setSyncedComptes} currentUser={user}/>:<Interdit/>)}
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
          {view==='clients'&&<Clients {...sp}/>}
          {view==='fournisseurs'&&(isAdmin?<Fournisseurs/>:<Interdit/>)}
          {view==='factures'&&(isAdmin?<Factures {...sp}/>:<Interdit/>)}
          {view==='devis'&&<Devis clients={clients} meds={meds} otrMode={otrMode} tva={tva} devis={devis} setDevis={setDevis}/>}
          {view==='creances'&&<Creances ventesHist={ventesHist} setVentesHist={setVentesHist} otrMode={otrMode}/>}
          {view==='medicaments'&&<Medicaments {...sp}/>}
          {view==='commandes'&&<Commandes meds={meds} setMeds={setSyncedMeds}/>}
          {view==='inventaire'&&<Inventaire {...sp}/>}
          {view==='ventes'&&<Ventes meds={meds} setMeds={setSyncedMeds} clients={clients} ventesHist={ventesHist} setVentesHist={setVentesHist} otrMode={otrMode} tva={tva}/>}
          {view==='finances'&&(isAdmin?<Finances clinique={clinique} otrMode={otrMode}/>:<Interdit/>)}
          {view==='depenses'&&(isAdmin?<Depenses otrMode={otrMode} depsHist={depsHist} setDepsHist={setDepsHist}/>:<Interdit/>)}
          {view==='historique'&&<Historique ventesHist={ventesHist} achatsHist={achatsHist} meds={meds}/>}
          {view==='journal'&&<JournalActivite user={user}/>}
          {view==='lots'&&<GestionLots meds={meds} ventesHist={ventesHist} user={user}/>}
          {view==='caisse'&&<Caisse meds={meds} setMeds={setSyncedMeds} clients={clients} ventesHist={ventesHist} setVentesHist={setVentesHist} otrMode={otrMode} tva={tva} user={user}/>}
          {view==='ia'&&<AssistantIA patients={patients} meds={meds} user={user}/>}
          {view==='notifications'&&<GestionNotifications meds={meds} user={user}/>}
          {view==='rapports'&&<RapportsPDF ventesHist={ventesHist} depsHist={depsHist} meds={meds} patients={patients} clinique={clinique} otrMode={otrMode}/>}
          {view==='carteclients'&&<CarteClients clients={clients} patients={patients}/>}
          {view==='traitements'&&<SuiviTraitements patients={patients} meds={meds} user={user}/>}
        </div>
      </ScreenErrorBoundary>
    </main>

    {/* ══ PANNEAU NOTIFICATIONS ══ */}
    {showNotifs&&<>
      <div className="fixed inset-0 z-40" onClick={()=>setShowNotifs(false)}/>
      <div className="notif-panel z-50">
        <div className="flex items-center justify-between p-4 border-b" style={{background:'linear-gradient(135deg,#166534,#1e3a8a)'}}>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔔</span>
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
  </div>;


}

export default App
