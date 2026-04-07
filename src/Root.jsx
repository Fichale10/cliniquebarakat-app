import { useState, useEffect } from 'react'
import { sb } from './lib/supabase'
import { getCache, setCache, newId } from './lib/db'
import { logAction } from './lib/roles'
import App from './App'

const COMPTES_DEFAULT = [
  { id: '1', email: 'admin@labarakat.tg',   pw: 'admin123', nom: 'Administrateur',  role: 'admin',       actif: true },
  { id: '2', email: 'dr1@labarakat.tg',     pw: 'user123',  nom: 'Dr. Vétérinaire', role: 'veterinaire', actif: true },
  { id: '3', email: 'pharmacien@labarakat.tg', pw: 'user123', nom: 'Pharmacien',    role: 'pharmacien',  actif: true },
];

// ── LOGIN ────────────────────────────────────────────────────
function Login({ loading: appLoading, onLogin, onRegister, onForgot }) {
  const [email, setEmail]   = useState('');
  const [pw, setPw]         = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr]       = useState('');
  const [checking, setChecking] = useState(false);
  const [now, setNow]       = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { document.body.classList.add('login-bg'); return () => document.body.classList.remove('login-bg'); }, []);

  const doLogin = async () => {
    if (!email || !pw) { setErr('Veuillez remplir tous les champs.'); return; }
    setChecking(true); setErr('');
    const ok = await onLogin(email, pw);
    if (!ok) setErr('Email ou mot de passe incorrect.');
    setChecking(false);
  };
  const handleKey = e => { if (e.key === 'Enter') doLogin(); };

  const pad = n => String(n).padStart(2, '0');
  const JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const MOIS  = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
  const hStr = pad(now.getHours()) + ':' + pad(now.getMinutes());
  const sStr = pad(now.getSeconds());
  const dStr = JOURS[now.getDay()] + ' ' + now.getDate() + ' ' + MOIS[now.getMonth()] + ' ' + now.getFullYear();
  const fi = e => { e.target.style.borderColor='rgba(52,211,153,0.65)'; e.target.style.boxShadow='0 0 0 3px rgba(52,211,153,0.12)'; };
  const bi = e => { e.target.style.borderColor='rgba(255,255,255,0.15)'; e.target.style.boxShadow='none'; };

  return (
    <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:1,overflowY:'auto',padding:'20px 0',fontFamily:"'Outfit',sans-serif"}}>
      <div style={{width:'100%',maxWidth:'400px',padding:'0 20px'}}>
        {/* Horloge */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'5px',marginBottom:'18px',background:'rgba(0,0,0,0.4)',borderRadius:'999px',padding:'8px 18px',border:'1px solid rgba(255,255,255,0.1)',width:'fit-content',margin:'0 auto 18px'}}>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:'22px',fontWeight:700,color:'#4ade80',letterSpacing:'2px'}}>{hStr}</span>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:'22px',fontWeight:700,color:'#4ade80'}}>:</span>
          <span style={{fontFamily:"'Space Mono',monospace",fontSize:'18px',color:'rgba(74,222,128,0.5)'}}>{sStr}</span>
          <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)',marginLeft:'8px',fontWeight:500}}>{dStr}</span>
        </div>
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:'18px'}}>
          <div style={{position:'relative',display:'inline-block',marginBottom:'10px'}}>
            <div style={{background:'conic-gradient(#fbbf24 0deg,#fde68a 90deg,#d97706 180deg,#fbbf24 360deg)',padding:'3px',borderRadius:'50%',display:'inline-flex'}}>
              <div style={{width:'82px',height:'82px',borderRadius:'50%',background:'linear-gradient(135deg,#0d4f28,#1e3a8a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'38px'}}>🐄</div>
            </div>
            {[[-5,-5],[-5,85],[85,-5],[85,85]].map(([t,l],i)=>(
              <span key={i} style={{position:'absolute',top:t,left:l,color:'#fbbf24',fontSize:'12px',fontWeight:900}}>★</span>
            ))}
          </div>
          <h1 className="login-shine" style={{fontSize:'28px',fontWeight:900,letterSpacing:'.12em',marginBottom:'3px',display:'block'}}>LA BARAKAT</h1>
          <p style={{color:'rgba(134,239,172,0.9)',fontSize:'13px',fontWeight:500,margin:0}}>Pharmacie & Clinique Vétérinaire</p>
        </div>
        {/* Card */}
        <div style={{background:'rgba(10,20,35,0.82)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'22px',boxShadow:'0 8px 40px rgba(0,0,0,0.5)'}}>
          <div style={{padding:'22px 22px 6px'}}>
            <h2 style={{textAlign:'center',color:'rgba(255,255,255,0.9)',fontWeight:700,fontSize:'15px',margin:'0 0 16px'}}>Connexion à votre espace</h2>
            {err&&<div style={{background:'rgba(239,68,68,0.14)',border:'1px solid rgba(239,68,68,0.28)',borderRadius:'10px',padding:'10px 13px',marginBottom:'13px',color:'#fca5a5',fontSize:'13px',fontWeight:600,display:'flex',alignItems:'center',gap:'7px'}}>⚠️ {err}</div>}
            {appLoading&&<div style={{background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.22)',borderRadius:'10px',padding:'10px 13px',marginBottom:'13px',color:'#93c5fd',fontSize:'13px',display:'flex',alignItems:'center',gap:'7px'}}>🔄 Chargement…</div>}
            <div style={{marginBottom:'13px'}}>
              <label style={{display:'block',fontSize:'10px',fontWeight:800,color:'rgba(255,255,255,0.42)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'6px'}}>Adresse email</label>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:'13px',top:'50%',transform:'translateY(-50%)',fontSize:'14px',pointerEvents:'none'}}>✉️</span>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={handleKey} className="login-dark-input" placeholder="votre@email.com" onFocus={fi} onBlur={bi}/>
              </div>
            </div>
            <div style={{marginBottom:'10px'}}>
              <label style={{display:'block',fontSize:'10px',fontWeight:800,color:'rgba(255,255,255,0.42)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'6px'}}>Mot de passe</label>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:'13px',top:'50%',transform:'translateY(-50%)',fontSize:'14px',pointerEvents:'none'}}>🔑</span>
                <input type={showPw?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={handleKey} className="login-dark-input" style={{paddingRight:'44px'}} placeholder="••••••••" onFocus={fi} onBlur={bi}/>
                <button type="button" onClick={()=>setShowPw(p=>!p)} style={{position:'absolute',right:'13px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'15px',color:'rgba(255,255,255,0.4)',padding:0}}>{showPw?'🙈':'👁️'}</button>
              </div>
            </div>
            <div style={{textAlign:'right',marginBottom:'16px'}}>
              <button onClick={onForgot} style={{background:'none',border:'none',color:'rgba(134,239,172,0.7)',fontSize:'12px',cursor:'pointer',fontWeight:600,padding:0}}>Mot de passe oublié ?</button>
            </div>
            <button onClick={doLogin} disabled={checking||appLoading}
              style={{width:'100%',padding:'13px',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#166534 0%,#1d4ed8 100%)',color:'white',fontWeight:800,fontSize:'15px',cursor:'pointer',fontFamily:"'Outfit',sans-serif",boxShadow:'0 4px 24px rgba(22,101,52,0.4)',transition:'all .2s',opacity:checking||appLoading?0.6:1,marginBottom:'4px'}}>
              {checking?'⏳ Vérification…':'🔓 Se connecter'}
            </button>
          </div>
          <div style={{padding:'14px 22px 18px',borderTop:'1px solid rgba(255,255,255,0.07)',marginTop:'8px',textAlign:'center'}}>
            <p style={{color:'rgba(255,255,255,0.35)',fontSize:'12px',margin:'0 0 10px'}}>Pas encore de compte ?</p>
            <button onClick={onRegister} style={{width:'100%',padding:'11px',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.8)',fontWeight:700,fontSize:'14px',cursor:'pointer',fontFamily:"'Outfit',sans-serif",transition:'all .2s'}}>✍️ Demander un accès</button>
            <p style={{color:'rgba(255,255,255,0.16)',fontSize:'11px',margin:'14px 0 0'}}>© La Barakat — Lomé, Togo</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── REGISTER ─────────────────────────────────────────────────
function Register({ onBack, onRegister }) {
  const [nom,setNom]=useState(''); const [email,setEmail]=useState('');
  const [pw,setPw]=useState(''); const [pw2,setPw2]=useState('');
  const [role,setRole]=useState('pharmacien');
  const [err,setErr]=useState(''); const [ok,setOk]=useState(false); const [loading,setLoading]=useState(false);
  useEffect(()=>{ document.body.classList.add('login-bg'); return ()=>document.body.classList.remove('login-bg'); },[]);
  const doRegister=async()=>{
    if(!nom||!email||!pw){setErr('Tous les champs sont requis.');return;}
    if(pw!==pw2){setErr('Les mots de passe ne correspondent pas.');return;}
    if(pw.length<6){setErr('Mot de passe trop court (6 caractères min).');return;}
    setLoading(true);setErr('');
    await onRegister(nom,email,pw,role);
    setLoading(false);setOk(true);
  };
  const fi=e=>{e.target.style.borderColor='rgba(52,211,153,0.65)';e.target.style.boxShadow='0 0 0 3px rgba(52,211,153,0.12)';};
  const bi=e=>{e.target.style.borderColor='rgba(255,255,255,0.15)';e.target.style.boxShadow='none';};
  return (
    <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:1,overflowY:'auto',padding:'20px',fontFamily:"'Outfit',sans-serif"}}>
      <div style={{width:'100%',maxWidth:'420px'}}>
        <div style={{textAlign:'center',marginBottom:'16px'}}>
          <div style={{background:'conic-gradient(#fbbf24 0deg,#d97706 180deg,#fbbf24 360deg)',padding:'3px',borderRadius:'50%',display:'inline-flex',marginBottom:'8px'}}>
            <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'linear-gradient(135deg,#0d4f28,#1e3a8a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'30px'}}>🐄</div>
          </div>
          <h1 className="login-shine" style={{fontSize:'22px',fontWeight:900,letterSpacing:'.1em',display:'block',marginBottom:'2px'}}>LA BARAKAT</h1>
        </div>
        <div style={{background:'rgba(10,20,35,0.85)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'22px',boxShadow:'0 8px 40px rgba(0,0,0,0.5)',padding:'22px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'18px'}}>
            <button onClick={onBack} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'8px',color:'white',padding:'6px 10px',cursor:'pointer',fontSize:'14px'}}>←</button>
            <h2 style={{color:'white',fontWeight:700,fontSize:'16px',margin:0}}>Demande d'accès</h2>
          </div>
          {ok?(
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{fontSize:'48px',marginBottom:'12px'}}>✅</div>
              <h3 style={{color:'#4ade80',fontWeight:700,margin:'0 0 8px'}}>Demande envoyée !</h3>
              <p style={{color:'rgba(255,255,255,0.55)',fontSize:'13px',margin:'0 0 16px'}}>Votre demande est en attente d'approbation par l'administrateur.</p>
              <button onClick={onBack} style={{background:'linear-gradient(135deg,#166534,#1d4ed8)',border:'none',borderRadius:'10px',color:'white',padding:'10px 20px',cursor:'pointer',fontWeight:700,fontSize:'14px'}}>Retour à la connexion</button>
            </div>
          ):(
            <>
              {err&&<div style={{background:'rgba(239,68,68,0.14)',border:'1px solid rgba(239,68,68,0.28)',borderRadius:'10px',padding:'10px 13px',marginBottom:'13px',color:'#fca5a5',fontSize:'13px',fontWeight:600}}>⚠️ {err}</div>}
              {[{label:'Nom complet',val:nom,set:setNom,type:'text',ph:'Prénom Nom'},{label:'Email',val:email,set:setEmail,type:'email',ph:'votre@email.com'}].map(({label,val,set,type,ph})=>(
                <div key={label} style={{marginBottom:'12px'}}>
                  <label style={{display:'block',fontSize:'10px',fontWeight:800,color:'rgba(255,255,255,0.42)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'5px'}}>{label}</label>
                  <input type={type} value={val} onChange={e=>set(e.target.value)} className="login-dark-input" placeholder={ph} style={{paddingLeft:'14px'}} onFocus={fi} onBlur={bi}/>
                </div>
              ))}
              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',fontSize:'10px',fontWeight:800,color:'rgba(255,255,255,0.42)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'5px'}}>Rôle souhaité</label>
                <select value={role} onChange={e=>setRole(e.target.value)} className="login-dark-input" style={{paddingLeft:'14px',cursor:'pointer'}}>
                  <option value="veterinaire">🩺 Vétérinaire</option>
                  <option value="pharmacien">💊 Pharmacien</option>
                  <option value="caissier">🛒 Caissier</option>
                </select>
              </div>
              {[{label:'Mot de passe',val:pw,set:setPw,ph:'Minimum 6 caractères'},{label:'Confirmer',val:pw2,set:setPw2,ph:'Répéter le mot de passe'}].map(({label,val,set,ph})=>(
                <div key={label} style={{marginBottom:'12px'}}>
                  <label style={{display:'block',fontSize:'10px',fontWeight:800,color:'rgba(255,255,255,0.42)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'5px'}}>{label}</label>
                  <input type="password" value={val} onChange={e=>set(e.target.value)} className="login-dark-input" placeholder={ph} style={{paddingLeft:'14px'}} onFocus={fi} onBlur={bi}/>
                </div>
              ))}
              <div style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:'10px',padding:'10px 13px',marginBottom:'16px',color:'rgba(147,197,253,0.8)',fontSize:'12px'}}>
                ℹ️ Votre compte sera activé après validation par l'administrateur.
              </div>
              <button onClick={doRegister} disabled={loading} style={{width:'100%',padding:'13px',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#166534,#1d4ed8)',color:'white',fontWeight:800,fontSize:'15px',cursor:'pointer',opacity:loading?0.6:1}}>
                {loading?'⏳ Envoi…':'✍️ Envoyer ma demande'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── FORGOT PASSWORD ───────────────────────────────────────────
function ForgotPassword({ onBack, onForgot }) {
  const [email,setEmail]=useState(''); const [sent,setSent]=useState(false);
  const [err,setErr]=useState(''); const [loading,setLoading]=useState(false);
  useEffect(()=>{ document.body.classList.add('login-bg'); return ()=>document.body.classList.remove('login-bg'); },[]);
  const doForgot=async()=>{
    if(!email){setErr('Veuillez entrer votre email.');return;}
    setLoading(true);setErr('');
    const ok=await onForgot(email);
    setLoading(false);
    if(ok) setSent(true);
    else setErr("Impossible d'envoyer l'email.");
  };
  const fi=e=>{e.target.style.borderColor='rgba(52,211,153,0.65)';e.target.style.boxShadow='0 0 0 3px rgba(52,211,153,0.12)';};
  const bi=e=>{e.target.style.borderColor='rgba(255,255,255,0.15)';e.target.style.boxShadow='none';};
  return (
    <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:1,padding:'20px',fontFamily:"'Outfit',sans-serif"}}>
      <div style={{width:'100%',maxWidth:'400px'}}>
        <div style={{textAlign:'center',marginBottom:'16px'}}>
          <div style={{background:'conic-gradient(#fbbf24 0deg,#d97706 180deg,#fbbf24 360deg)',padding:'3px',borderRadius:'50%',display:'inline-flex',marginBottom:'8px'}}>
            <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'linear-gradient(135deg,#0d4f28,#1e3a8a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'30px'}}>🐄</div>
          </div>
          <h1 className="login-shine" style={{fontSize:'22px',fontWeight:900,letterSpacing:'.1em',display:'block'}}>LA BARAKAT</h1>
        </div>
        <div style={{background:'rgba(10,20,35,0.85)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'22px',padding:'22px',boxShadow:'0 8px 40px rgba(0,0,0,0.5)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'18px'}}>
            <button onClick={onBack} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'8px',color:'white',padding:'6px 10px',cursor:'pointer',fontSize:'14px'}}>←</button>
            <h2 style={{color:'white',fontWeight:700,fontSize:'16px',margin:0}}>Mot de passe oublié</h2>
          </div>
          {sent?(
            <div style={{textAlign:'center',padding:'16px 0'}}>
              <div style={{fontSize:'48px',marginBottom:'12px'}}>📧</div>
              <h3 style={{color:'#4ade80',fontWeight:700,margin:'0 0 8px'}}>Email envoyé !</h3>
              <p style={{color:'rgba(255,255,255,0.55)',fontSize:'13px',margin:'0 0 16px'}}>Vérifiez votre boîte mail.</p>
              <button onClick={onBack} style={{background:'linear-gradient(135deg,#166534,#1d4ed8)',border:'none',borderRadius:'10px',color:'white',padding:'10px 20px',cursor:'pointer',fontWeight:700,fontSize:'14px'}}>Retour à la connexion</button>
            </div>
          ):(
            <>
              {err&&<div style={{background:'rgba(239,68,68,0.14)',border:'1px solid rgba(239,68,68,0.28)',borderRadius:'10px',padding:'10px 13px',marginBottom:'13px',color:'#fca5a5',fontSize:'13px',fontWeight:600}}>⚠️ {err}</div>}
              <p style={{color:'rgba(255,255,255,0.5)',fontSize:'13px',marginBottom:'16px'}}>Entrez votre email pour recevoir un lien de réinitialisation.</p>
              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',fontSize:'10px',fontWeight:800,color:'rgba(255,255,255,0.42)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'6px'}}>Adresse email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doForgot()} className="login-dark-input" placeholder="votre@email.com" onFocus={fi} onBlur={bi}/>
              </div>
              <button onClick={doForgot} disabled={loading} style={{width:'100%',padding:'13px',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#166534,#1d4ed8)',color:'white',fontWeight:800,fontSize:'15px',cursor:'pointer',opacity:loading?0.6:1}}>
                {loading?'⏳ Envoi…':'📧 Envoyer le lien'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────
function Root() {
  const [screen, setScreen]         = useState('login');
  const [logged, setLogged]         = useState(false);
  const [user, setUser]             = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [comptes, setComptes]       = useState(() => getCache('comptes') || COMPTES_DEFAULT);

  // Charger depuis Supabase au démarrage (SANS écraser le cache local)
  useEffect(() => {
    const load = async () => {
      try {
        if (navigator.onLine && sb) {
          const { data } = await sb.from('comptes').select('*');
          if (data && data.length) {
            // Fusionner : priorité au cache local pour les mots de passe
            const cached = getCache('comptes') || [];
            const merged = data.map(remote => {
              const local = cached.find(c => c.id === remote.id || c.email === remote.email);
              // Si le local a un mdp différent → garder le local (changement récent)
              if (local && local.pw !== remote.pw) return { ...remote, pw: local.pw };
              return remote;
            });
            // Ajouter les comptes locaux non encore sync (ex: créés hors ligne)
            const localOnly = cached.filter(c => !data.find(r => r.id === c.id || r.email === c.email));
            const final = [...merged, ...localOnly];
            setComptes(final);
            setCache('comptes', final);
          }
        } else {
          const c = getCache('comptes');
          if (c && c.length) setComptes(c);
        }
      } catch (e) {
        const c = getCache('comptes');
        if (c && c.length) setComptes(c);
      }
      setAppLoading(false);
    };
    load();
  }, []);

  // ── LOGIN : cherche par email seulement dans Supabase ──────
  // puis vérifie pw côté client → évite le 406 de .single()
  const doLogin = async (email, pw) => {
    const emailClean = email.trim().toLowerCase();
    let compte = null;

    // 1. Chercher en LOCAL d'abord (toujours à jour)
    const local = getCache('comptes') || comptes;
    compte = local.find(c =>
      (c.email || '').toLowerCase() === emailClean &&
      c.pw === pw &&
      c.actif === true &&
      !c.pending
    );

    // 2. Si pas trouvé → chercher dans Supabase par email uniquement
    //    (PAS de filtre pw/actif dans l'URL → pas de 406)
    if (!compte && navigator.onLine && sb) {
      try {
        const { data, error } = await sb
          .from('comptes')
          .select('*')
          .eq('email', emailClean);    // ← email seulement, pas pw

        if (!error && data && data.length > 0) {
          // Vérifier pw et actif côté client
          compte = data.find(c => c.pw === pw && c.actif === true && !c.pending);
          if (compte) {
            // Mettre à jour le cache avec les données fraîches
            const updated = [...local.filter(c => c.email !== emailClean), ...data];
            setComptes(updated);
            setCache('comptes', updated);
          }
        }
      } catch (e) {
        console.warn('Supabase login error:', e);
      }
    }

    if (compte) {
      const u = {
        name:     compte.nom,
        email:    compte.email,
        initials: compte.nom.substring(0, 2).toUpperCase(),
        role:     compte.role,
        id:       compte.id,
      };
      setUser(u);
      setLogged(true);
      logAction(u, 'connexion', 'Connexion réussie');
      return true;
    }
    return false;
  };

  // ── REGISTER ──────────────────────────────────────────────
  const doRegister = async (nom, email, pw, role) => {
    const entry = {
      id: newId(),
      nom,
      email: email.trim().toLowerCase(),
      pw,
      role: role || 'pharmacien',
      actif: false,
      pending: true,
      created_at: new Date().toISOString(),
    };
    if (navigator.onLine && sb) {
      try { await sb.from('comptes').insert(entry); } catch (e) { console.warn(e); }
    }
    const updated = [...(getCache('comptes') || comptes), entry];
    setComptes(updated);
    setCache('comptes', updated);
    return true;
  };

  // ── FORGOT ────────────────────────────────────────────────
  const doForgot = async (email) => {
    if (navigator.onLine && sb) {
      try {
        await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.href });
        return true;
      } catch (e) { return false; }
    }
    return false;
  };

  if (!logged) {
    if (screen === 'register') return <Register onBack={() => setScreen('login')} onRegister={doRegister} />;
    if (screen === 'forgot')   return <ForgotPassword onBack={() => setScreen('login')} onForgot={doForgot} />;
    return <Login loading={appLoading} onLogin={doLogin} onRegister={() => setScreen('register')} onForgot={() => setScreen('forgot')} />;
  }

  return (
    <App
      logged={logged}
      setLogged={(v) => { if (!v) logAction(user, 'deconnexion', ''); setLogged(v); }}
      user={user}
      setUser={setUser}
      comptesRoot={comptes}
      setComptesRoot={setComptes}
    />
  );
}

export default Root;