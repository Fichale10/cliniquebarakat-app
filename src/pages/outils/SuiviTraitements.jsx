import { Syringe, Trash2, Coins, Pill } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { EmptyState } from '../../components/ui'
import { dbFetch, dbInsert, dbUpdate, dbDelete, dbAdjustStock, newId } from '../../lib/db'
import { fmtF, computeTvaAmt } from '../../lib/ventes'
import { venteToDbRow } from '../../lib/validation'

function SuiviTraitements({patients, meds, setMeds, user, sb, tva, ventesHist, setVentesHist}){
  const today=()=>new Date().toISOString().split('T')[0];
  const [traitements,setTraitements]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [showForm,setShowForm]=useState(false);
  const EMPTY={patient:'',medicament:'',posologie:'',frequence:'1x/jour',debut:today(),fin:'',notes:'',qte:1,pu:'',actif:true,maladie:'',certitude:'Suspicion',uniteAdmin:'',stockQte:1,jours:1};
  const [form,setForm]=useState(EMPTY);
  const [filter,setFilter]=useState('actifs');
  const f=k=>e=>setForm({...form,[k]:e.target.value});

  // ── Chargement Supabase + migration unique du localStorage ──
  useEffect(()=>{(async()=>{
    try{
      let rows=(await dbFetch(sb,'traitements',{force:true}))||[];
      if(!localStorage.getItem('lb_traitements_migrated')&&sb){
        let legacy=[];
        try{legacy=JSON.parse(localStorage.getItem('lb_traitements')||'[]');}catch(e){}
        for(const t of legacy){
          try{
            const saved=await dbInsert(sb,'traitements',{
              id:newId(),patient:t.patient||'',medicament:t.medicament||'',
              posologie:t.posologie||'',frequence:t.frequence||'1x/jour',
              debut:t.debut||null,fin:t.fin||null,notes:t.notes||'',
              actif:t.actif!==false,qte:1,pu:0,pa:0,
            });
            rows=[saved,...rows];
          }catch(e){console.warn('[migration traitement]',e?.message||e);}
        }
        localStorage.setItem('lb_traitements_migrated','1');
      }
      setTraitements(rows);
    }catch(e){console.warn('[traitements]',e?.message||e);}
    finally{setLoading(false);}
  })()},[]);

  // Lignes de médicaments d'un traitement : t.lignes (jsonb) si présent, sinon champs hérités
  const tLignes=t=>{
    try{const l=typeof t.lignes==='string'?JSON.parse(t.lignes):t.lignes;if(Array.isArray(l)&&l.length)return l;}catch(e){}
    return t.medicament?[{med:t.medicament,qte:parseFloat(t.qte)||1,pu:parseFloat(t.pu)||0,pa:parseFloat(t.pa)||0}]:[];
  };
  const totalForm=(parseFloat(form.qte)||0)*(parseFloat(form.pu)||0);
  const tTotal=t=>tLignes(t).reduce((s,l)=>s+(parseFloat(l.qte)||0)*(parseFloat(l.pu)||0),0)*(parseInt(t.jours)||1);
  const totalAFacturer=traitements.filter(t=>t.actif&&!t.vente_id).reduce((s,t)=>s+tTotal(t),0);

  const selectMedicament=(e)=>{
    const nom=e.target.value;
    const m=meds.find(x=>x.nom===nom);
    setForm(prev=>({...prev,medicament:nom,pu:m?String(m.prixVente??m.prix_vente??''):prev.pu,uniteAdmin:m?.unite||'',stockQte:1}));
  };
  // Médicament actuellement sélectionné (pour l'unité : ml, flacon, comprimé…)
  const selMed=meds.find(x=>x.nom===form.medicament);
  // Unité d'administration (facturation) ≠ unité de stock possible (ex: facturé au ml, stocké en flacons)
  const uniteFiche=selMed?.unite||'';
  const uniteAdmin=form.uniteAdmin||uniteFiche;
  const uniteDiff=!!(uniteFiche&&uniteAdmin&&uniteAdmin!==uniteFiche);
  const UNITES_ADMIN=[...new Set([uniteFiche,'ml','comprimé','dose','sachet','unité'].filter(Boolean))];

  // ── Plusieurs médicaments par traitement ──
  const [medLignes,setMedLignes]=useState([]);   // [{med,qte,pu,pa,unite}]
  const ajouterLigne=()=>{
    if(!form.medicament)return;
    const m=meds.find(x=>x.nom===form.medicament);
    const uF=m?.unite||'';
    const uA=form.uniteAdmin||uF;
    const diff=!!(uF&&uA&&uA!==uF);
    const ligne={med:form.medicament,qte:parseFloat(form.qte)||1,pu:parseFloat(form.pu)||0,
      pa:parseFloat(m?.prixAchat??m?.prix_achat)||0,unite:uA,
      stockQte:diff?(parseFloat(form.stockQte)||1):(parseFloat(form.qte)||1)};
    setMedLignes([...medLignes,ligne]);
    setForm(prev=>({...prev,medicament:'',qte:1,pu:'',uniteAdmin:'',stockQte:1}));
  };
  const retirerLigne=i=>setMedLignes(medLignes.filter((_,j)=>j!==i));
  // Durée du traitement en jours (début → fin inclus), recalculée quand les dates changent
  const calcJours=(debut,fin)=>{
    if(!debut||!fin)return 1;
    const j=Math.round((new Date(fin)-new Date(debut))/86400000)+1;
    return Math.max(1,j);
  };
  const setDebut=e=>{const debut=e.target.value;setForm(prev=>({...prev,debut,jours:calcJours(debut,prev.fin)}));};
  const setFin=e=>{const fin=e.target.value;setForm(prev=>({...prev,fin,jours:calcJours(prev.debut,fin)}));};
  const joursNum=Math.max(1,parseInt(form.jours)||1);
  const totalLignes=(medLignes.reduce((s,l)=>s+l.qte*l.pu,0)+totalForm)*joursNum;

  // Insertion tolérante : si la migration traitements_lignes.sql n'est pas encore
  // exécutée côté Supabase, on réessaie sans la colonne lignes.
  const insertTrait=async(row)=>{
    try{return await dbInsert(sb,'traitements',row);}
    catch(e){
      const msg=String(e?.message||e);
      if(/lignes|maladie|certitude|jours/i.test(msg)&&/schema|column/i.test(msg)){const{lignes,maladie,certitude,jours,...sans}=row;return await dbInsert(sb,'traitements',sans);}
      throw e;
    }
  };

  const addTraitement=async()=>{
    // La saisie en cours compte comme une ligne (pas besoin de cliquer +)
    const lignes=[...medLignes];
    if(form.medicament){
      const m=meds.find(x=>x.nom===form.medicament);
      const uF=m?.unite||'';
      const uA=form.uniteAdmin||uF;
      const diff=!!(uF&&uA&&uA!==uF);
      lignes.push({med:form.medicament,qte:parseFloat(form.qte)||1,pu:parseFloat(form.pu)||0,
        pa:parseFloat(m?.prixAchat??m?.prix_achat)||0,unite:uA,
        stockQte:diff?(parseFloat(form.stockQte)||1):(parseFloat(form.qte)||1)});
    }
    if(!form.patient||!lignes.length){alert('Patient et au moins un médicament requis.');return;}
    setSaving(true);
    try{
      const row={
        id:newId(),patient:form.patient,
        medicament:lignes.map(l=>l.med).join(' + '),
        posologie:form.posologie,frequence:form.frequence,
        debut:form.debut||null,fin:form.fin||null,notes:form.notes,
        actif:true,
        qte:lignes[0].qte,pu:lignes[0].pu,pa:lignes[0].pa, // compat anciens écrans
        lignes,
        maladie:form.maladie.trim(),certitude:form.certitude,
        jours:joursNum,
      };
      const saved=await insertTrait(row);
      setTraitements(prev=>[saved,...prev]);
      setMedLignes([]);setForm(EMPTY);setShowForm(false);
      // Proposition d'encaissement immédiat pour ne pas oublier la recette
      const total=lignes.reduce((s,l)=>s+l.qte*l.pu,0);
      if(total>0&&confirm(`Traitement enregistré (${fmtF(total)}).\nEncaisser maintenant ? La vente apparaîtra en Caisse et dans les recettes Clinique.\n\n(Annuler = facturer plus tard via le bouton Encaisser)`)){
        await creerVente(saved,true,true);
      }
    }catch(e){alert('Erreur : '+(e?.message||e));}
    finally{setSaving(false);}
  };

  const toggleActif=async(id)=>{
    const t=traitements.find(x=>x.id===id);if(!t)return;
    try{
      await dbUpdate(sb,'traitements',id,{actif:!t.actif});
      setTraitements(traitements.map(x=>x.id===id?{...x,actif:!x.actif}:x));
    }catch(e){alert('Erreur : '+(e?.message||e));}
  };
  const supprimer=async(id)=>{
    try{
      await dbDelete(sb,'traitements',id);
      setTraitements(traitements.filter(x=>x.id!==id));
    }catch(e){alert('Erreur suppression : '+(e?.message||e));}
  };

  // ── Facturation liée (anti double-facturation via vente_id) ──
  const creerVente=async(t,paye,skipConfirm=false)=>{
    if(t.vente_id)return;
    const lignesT=tLignes(t);
    const totalHT=tTotal(t);
    if(totalHT<=0)return alert('Renseignez quantité et prix avant de facturer.');
    const p=patients.find(x=>x.nom===t.patient);
    const tvaAmt=computeTvaAmt(totalHT,tva);
    const ttc=totalHT+tvaAmt;
    if(!skipConfirm&&!confirm(paye
      ?`Encaisser ${fmtF(ttc)} (Espèces) pour ${t.patient} ?\nLa vente apparaîtra en Caisse et Finances, le stock sera décompté.`
      :`Facturer ${fmtF(ttc)} à crédit pour ${t.patient} ?\nLa vente apparaîtra dans les Créances.`))return;
    try{
      const jours=parseInt(t.jours)||1;
      const row=venteToDbRow({
        id:newId(),date:today(),client:p?.proprio||t.patient,
        lignes:lignesT.map(l=>({med:l.med,cond:`Traitement ${jours}j`,qte:(parseFloat(l.qte)||1)*jours,pu:parseFloat(l.pu)||0,pa:parseFloat(l.pa)||0,mult:1})),
        total:totalHT,statut:paye?'Payé':'En attente',mode:paye?'Espèces':'–',
        note:`Traitement ${t.patient} — ${lignesT.map(l=>l.med).join(', ')}`.slice(0,200),
        tva_amt:tvaAmt,montant_paye:paye?ttc:0,
        caissier:user?.name||'',type:'clinique',
      });
      const saved=await dbInsert(sb,'ventes',row);
      if(setVentesHist)setVentesHist([saved,...(ventesHist||[])].slice(0,500));
      await dbUpdate(sb,'traitements',t.id,{vente_id:saved.id});
      setTraitements(prev=>prev.map(x=>x.id===t.id?{...x,vente_id:saved.id}:x));
      if(paye&&setMeds){
        // Décompte du stock pour CHAQUE médicament : clinique d'abord, pharmacie en complément
        let nextMeds=[...meds];
        for(const l of lignesT){
          const m=nextMeds.find(x=>x.nom===l.med);
          if(!m?.id)continue;
          // Décompte en unité de STOCK : stockQte (saisi pour toute la durée) si l'unité
          // d'administration diffère de celle de la fiche ; sinon dose/jour × jours.
          const uniteDiffLigne=!!(m.unite&&l.unite&&l.unite!==m.unite);
          const q=uniteDiffLigne?(parseFloat(l.stockQte)||0):(parseFloat(l.qte)||0)*jours;
          const clin=Math.min(q,m.stock_clinique||0);
          const pharm=Math.max(0,q-clin);
          if(sb)await dbAdjustStock(sb,m.id,-pharm,-clin).catch(e=>console.warn('[stock]',e));
          nextMeds=nextMeds.map(x=>x.id===m.id?{...x,
            stock:Math.max(0,(x.stock||0)-pharm),
            stock_clinique:Math.max(0,(x.stock_clinique||0)-clin)}:x);
        }
        setMeds(nextMeds);
      }
    }catch(e){alert('Erreur facturation : '+(e?.message||e));}
  };

  const filtered=traitements.filter(t=>{
    if(filter==='actifs') return t.actif;
    if(filter==='termines') return !t.actif;
    return true;
  });

  // Traitements se terminant bientôt
  const bientotFin=traitements.filter(t=>{
    if(!t.actif||!t.fin) return false;
    const j=Math.round((new Date(t.fin)-new Date())/86400000);
    return j>=0&&j<=3;
  });

  const envoyerRappelWA=(t)=>{
    const p=patients.find(pa=>pa.nom===t.patient);
    const msg=encodeURIComponent(`Bonjour ${p?.proprio||''},\n\nRappel traitement pour ${t.patient} :\n💊 ${t.medicament}\n📋 Posologie : ${t.posologie}\n🔁 Fréquence : ${t.frequence}\n${t.fin?`📅 Fin du traitement : ${t.fin}`:''}.\n\nMerci de votre confiance — La Barakat 🐄`);
    window.open('https://wa.me/?text='+msg,'_blank');
  };

  const FREQ=['1x/jour','2x/jour','3x/jour','1x/semaine','Tous les 2 jours','Au besoin','Autre'];

  return <div className="app-page space-y-5">
    {/* Alertes fin de traitement */}
    {bientotFin.length>0&&<div style={{background:'#fffbeb',border:'2px solid #fde68a',borderRadius:'14px',padding:'14px 18px'}}>
      <div style={{fontWeight:800,color:'#d97706',marginBottom:'8px',display:'flex',alignItems:'center',gap:'6px'}}>⏰ {bientotFin.length} traitement(s) se terminent dans moins de 3 jours</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
        {bientotFin.map(t=>{
          const j=Math.round((new Date(t.fin)-new Date())/86400000);
          return <div key={t.id} style={{background:'white',borderRadius:'9px',padding:'8px 12px',border:'1px solid #fde68a',fontSize:'13px'}}>
            <span style={{fontWeight:700}}>{t.patient}</span> · {t.medicament}
            <span style={{color:'#d97706',fontWeight:700,marginLeft:'6px'}}>{j===0?'Aujourd\'hui !':j===1?'Demain':j+'j restants'}</span>
          </div>;
        })}
      </div>
    </div>}

    {/* À facturer */}
    {totalAFacturer>0&&<div style={{background:'#f0fdf4',border:'2px solid #bbf7d0',borderRadius:'14px',padding:'12px 18px',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
      <Coins size={18} color="#16a34a" strokeWidth={2.3} />
      <span style={{fontWeight:800,color:'#166534'}}>À facturer : {fmtF(totalAFacturer)}</span>
      <span style={{fontSize:12,color:'#16a34a'}}>({traitements.filter(t=>t.actif&&!t.vente_id&&tTotal(t)>0).length} traitement(s) actif(s) non facturé(s))</span>
    </div>}

    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Syringe size={20} color="#0d9488" strokeWidth={2.3} /> Suivi des traitements</h2>
          <p className="text-sm text-slate-500">{traitements.filter(t=>t.actif).length} actif(s) · {traitements.filter(t=>!t.actif).length} terminé(s)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['actifs','termines','tous'].map(f=><button key={f} onClick={()=>setFilter(f)}
            style={{padding:'7px 14px',borderRadius:'9px',fontSize:'13px',fontWeight:700,cursor:'pointer',
              background:filter===f?'linear-gradient(135deg,#166534,#1d4ed8)':'white',
              color:filter===f?'white':'#64748b',border:`1px solid ${filter===f?'transparent':'#e2e8f0'}`}}>
            {f==='actifs'?'Actifs':f==='termines'?'Terminés':'Tous'}
          </button>)}
          <button onClick={()=>setShowForm(!showForm)}
            style={{padding:'7px 14px',borderRadius:'9px',fontSize:'13px',fontWeight:700,cursor:'pointer',background:showForm?'#ef4444':'linear-gradient(135deg,#166534,#1d4ed8)',color:'white',border:'none'}}>
            {showForm?'✕ Annuler':'+ Nouveau traitement'}
          </button>
        </div>
      </div>

      {showForm&&<div style={{padding:'20px',background:'#eff6ff',borderBottom:'1px solid #bfdbfe'}}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Patient *</label>
            <input value={form.patient} onChange={f('patient')} list="trait-patients" placeholder="Nom de l'animal ou du troupeau…"
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}/>
            <datalist id="trait-patients">
              {patients.map(p=><option key={p.id} value={p.nom}>{p.espece}{p.proprio?` · ${p.proprio}`:''}</option>)}
            </datalist>
          </div>
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Maladie / Affection</label>
            <div style={{display:'flex',gap:'6px'}}>
              <input value={form.maladie} onChange={f('maladie')} list="trait-maladies" placeholder="ex: PPCB, Parvovirose…"
                style={{flex:1,minWidth:0,border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}/>
              <select value={form.certitude} onChange={f('certitude')}
                style={{border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white',flexShrink:0}}>
                <option>Suspicion</option><option>Confirmée</option><option>Suivi</option>
              </select>
            </div>
            <datalist id="trait-maladies">
              {['PPCB','PPR','Pasteurellose','Charbon symptomatique','Charbon bactéridien','Fièvre aphteuse','Dermatose nodulaire','Parvovirose','Maladie de Carré','Coccidiose','Newcastle','Gumboro','Trypanosomiase','Babésiose','Gale','Verminose / Parasitose interne','Mammite','Brucellose','Plaie / Abcès','Diététique / Carence'].map(m=><option key={m} value={m}/>)}
            </datalist>
          </div>
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Médicament *</label>
            <input value={form.medicament} onChange={selectMedicament} list="trait-meds" placeholder="Tapez pour rechercher…"
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}/>
            <datalist id="trait-meds">
              {meds.filter(m=>((m.stock_clinique||0)+(m.stock||0))>0).map(m=><option key={m.id} value={m.nom}>{`clinique: ${m.stock_clinique||0} · pharmacie: ${m.stock||0}${m.unite?` · ${m.unite}`:''}`}</option>)}
            </datalist>
            {selMed&&<p style={{fontSize:'11px',color:'#16a34a',marginTop:'4px'}}>Stock — clinique : {selMed.stock_clinique||0} · pharmacie : {selMed.stock||0}{selMed.unite?` (${selMed.unite})`:''}</p>}
            {!meds.some(m=>((m.stock_clinique||0)+(m.stock||0))>0)&&<p style={{fontSize:'11px',color:'#d97706',marginTop:'4px'}}>Aucun produit en stock — ajoutez des médicaments depuis la page Médicaments.</p>}
            {medLignes.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'8px'}}>
              {medLignes.map((l,i)=><span key={i} style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'4px 10px',borderRadius:'999px',background:'#ccfbf1',border:'1px solid #99f6e4',fontSize:'12px',fontWeight:700,color:'#0f766e'}}>
                {l.med} <span style={{fontWeight:400}}>· {l.qte}{l.unite?` ${l.unite}`:''} × {fmtF(l.pu)} = {fmtF(l.qte*l.pu)}</span>
                <button type="button" onClick={()=>retirerLigne(i)} style={{background:'none',border:'none',color:'#0f766e',cursor:'pointer',fontWeight:900,fontSize:'13px',lineHeight:1,padding:0}}>×</button>
              </span>)}
            </div>}
          </div>
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Posologie</label>
            <input value={form.posologie} onChange={f('posologie')} placeholder="ex: 1 cp matin et soir"
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}/>
          </div>
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Fréquence</label>
            <select value={form.frequence} onChange={f('frequence')}
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}>
              {FREQ.map(fr=><option key={fr}>{fr}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Date début</label>
            <input type="date" value={form.debut} onChange={setDebut}
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}/>
          </div>
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Date fin</label>
            <input type="date" value={form.fin} onChange={setFin}
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}/>
          </div>
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Durée (jours)</label>
            <input type="number" min="1" value={form.jours} onChange={f('jours')}
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}/>
            <p style={{fontSize:'10px',color:'#94a3b8',marginTop:'3px'}}>Calculée des dates (début → fin inclus), modifiable</p>
          </div>
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Quantité administrée <span style={{textTransform:'none',fontWeight:600,color:'#0d9488'}}>par jour</span></label>
            <div style={{display:'flex',alignItems:'center',border:'1.5px solid #e2e8f0',borderRadius:'9px',background:'white',overflow:'hidden'}}>
              <input type="number" min="0" step="any" value={form.qte} onChange={f('qte')}
                style={{flex:1,minWidth:0,border:'none',padding:'8px',fontSize:'13px',outline:'none',background:'transparent'}}/>
              <select value={uniteAdmin} onChange={e=>setForm(prev=>({...prev,uniteAdmin:e.target.value}))}
                style={{padding:'0 8px',fontSize:'12px',fontWeight:700,color:'#0d9488',background:'#f0fdfa',alignSelf:'stretch',border:'none',borderLeft:'1.5px solid #e2e8f0',outline:'none',cursor:'pointer'}}>
                {UNITES_ADMIN.map(u=><option key={u} value={u}>{u}</option>)}
                {!UNITES_ADMIN.length&&<option value="">unité(s)</option>}
              </select>
            </div>
            <p style={{fontSize:'10px',color:'#94a3b8',marginTop:'3px'}}>Décimales acceptées (ex : 2.5 ml) — l'unité est modifiable</p>
            {uniteDiff&&<div style={{marginTop:'6px'}}>
              <label style={{fontSize:'10px',fontWeight:700,color:'#d97706',display:'block',marginBottom:'3px'}}>Stock à décompter ({uniteFiche}) — pour toute la durée</label>
              <input type="number" min="0" step="any" value={form.stockQte} onChange={f('stockQte')}
                style={{width:'100%',border:'1.5px solid #fde68a',borderRadius:'8px',padding:'6px 8px',fontSize:'13px',outline:'none',background:'#fffbeb'}}/>
              <p style={{fontSize:'10px',color:'#d97706',marginTop:'2px'}}>Ex : 5 ml prélevés sur 1 flacon → saisir 1</p>
            </div>}
          </div>
          <div>
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Prix unitaire (F{uniteAdmin?` / ${uniteAdmin}`:''})</label>
            <input type="number" min="0" value={form.pu} onChange={f('pu')} placeholder="0 = non facturable"
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}/>
            {uniteDiff&&<p style={{fontSize:'10px',color:'#d97706',marginTop:'3px'}}>Prix du {uniteAdmin}, pas du {uniteFiche} — ajustez si besoin</p>}
          </div>
          <div style={{display:'flex',alignItems:'flex-end',gap:'8px'}}>
            <button onClick={ajouterLigne} disabled={!form.medicament}
              title="Ajouter ce médicament au traitement et en saisir un autre"
              style={{padding:'9px 14px',borderRadius:'9px',background:form.medicament?'#0d9488':'#e2e8f0',color:form.medicament?'white':'#94a3b8',border:'none',fontWeight:700,fontSize:'13px',cursor:form.medicament?'pointer':'default',whiteSpace:'nowrap'}}>
              + Ajouter un autre
            </button>
            <div style={{flex:1,background:'white',border:'1.5px solid #bbf7d0',borderRadius:'9px',padding:'8px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'13px',flexWrap:'wrap',gap:'4px'}}>
              <span style={{fontWeight:700,color:'#64748b'}}>Total{joursNum>1?` (× ${joursNum} j)`:''}</span>
              <span style={{fontWeight:900,color:'#16a34a',fontFamily:'monospace'}}>{joursNum>1?`${fmtF(totalLignes/joursNum)}/j → `:''}{fmtF(totalLignes)}</span>
            </div>
          </div>
          <div className="md:col-span-3">
            <label style={{fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'5px'}}>Notes</label>
            <input value={form.notes} onChange={f('notes')} placeholder="Instructions particulières, effets à surveiller…"
              style={{width:'100%',border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'8px',fontSize:'13px',outline:'none',background:'white'}}/>
          </div>
        </div>
        <p style={{fontSize:12,color:'#64748b',marginBottom:10}}>Si le traitement vient d'une consultation déjà payée, laissez le prix à 0 pour éviter la double facturation.</p>
        <button onClick={addTraitement} disabled={saving}
          style={{padding:'9px 20px',borderRadius:'10px',background:saving?'#94a3b8':'linear-gradient(135deg,#166534,#1d4ed8)',color:'white',border:'none',fontWeight:700,fontSize:'14px',cursor:saving?'wait':'pointer'}}>
          {saving?'Enregistrement…':'✓ Enregistrer le traitement'}
        </button>
      </div>}

      <div className="divide-y">
        {loading&&<div style={{padding:'24px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Chargement…</div>}
        {!loading&&!filtered.length&&<EmptyState icon={Pill} title={filter==='actifs'?'Aucun traitement actif':filter==='termines'?'Aucun traitement terminé':'Aucun traitement enregistré'} subtitle="Les traitements en cours de suivi apparaîtront ici." />}
        {filtered.map(t=>{
          const pat=patients.find(p=>p.nom===t.patient);
          const jRestants=t.fin?Math.round((new Date(t.fin)-new Date())/86400000):null;
          const bientot=jRestants!==null&&jRestants>=0&&jRestants<=3;
          return <div key={t.id} style={{padding:'14px 18px',background:bientot?'#fffbeb':'white',transition:'background .2s'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:'12px',flexWrap:'wrap'}}>
              {/* Avatar patient */}
              <div style={{width:'42px',height:'42px',borderRadius:'12px',background:t.actif?'#f0fdf4':'#f1f5f9',border:`1px solid ${t.actif?'#bbf7d0':'#e2e8f0'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',flexShrink:0}}>
                {{'Chien':'🐕','Chat':'🐈','Bovin':'🐄','Caprin':'🐐','Ovin':'🐑','Volaille':'🐓'}[pat?.espece]||'🐾'}
              </div>
              <div style={{flex:1,minWidth:'200px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',marginBottom:'4px'}}>
                  <span style={{fontWeight:800,fontSize:'15px',color:'#1e293b'}}>{t.patient}</span>
                  <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'999px',
                    background:t.actif?'#dcfce7':'#f1f5f9',color:t.actif?'#166534':'#64748b'}}>
                    {t.actif?'Actif':'Terminé'}
                  </span>
                  {t.vente_id&&<span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'999px',background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#16a34a'}}>✓ Facturé</span>}
                  {t.maladie&&<span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'999px',
                    background:t.certitude==='Confirmée'?'#fef2f2':t.certitude==='Suivi'?'#eff6ff':'#fffbeb',
                    border:`1px solid ${t.certitude==='Confirmée'?'#fecaca':t.certitude==='Suivi'?'#bfdbfe':'#fde68a'}`,
                    color:t.certitude==='Confirmée'?'#dc2626':t.certitude==='Suivi'?'#2563eb':'#d97706'}}>
                    {t.certitude||'Suspicion'} · {t.maladie}
                  </span>}
                  {bientot&&<span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'999px',background:'#fef3c7',color:'#d97706'}}>
                    ⏰ {jRestants===0?'Termine aujourd\'hui':jRestants+'j restants'}
                  </span>}
                </div>
                <div style={{fontSize:'13px',fontWeight:600,color:'#374151',marginBottom:'3px'}}>{t.medicament}</div>
                <div style={{fontSize:'12px',color:'#64748b',display:'flex',gap:'14px',flexWrap:'wrap'}}>
                  {t.posologie&&<span>📋 {t.posologie}</span>}
                  <span>🔁 {t.frequence}</span>
                  <span>📅 {t.debut}{t.fin?` → ${t.fin}`:''}</span>
                  {tTotal(t)>0&&<span style={{fontWeight:700,color:'#16a34a'}}>{tLignes(t).map(l=>{const m=meds.find(x=>x.nom===l.med);return `${l.qte}${(l.unite||m?.unite)?` ${l.unite||m?.unite}`:''}/j × ${fmtF(l.pu)}`}).join(' + ')}{(parseInt(t.jours)||1)>1?` × ${t.jours} j`:''} = {fmtF(tTotal(t))}</span>}
                </div>
                {t.notes&&<div style={{fontSize:'12px',color:'#94a3b8',marginTop:'4px',fontStyle:'italic'}}>Note — {t.notes}</div>}
              </div>
              <div style={{display:'flex',gap:'6px',flexShrink:0,flexWrap:'wrap'}}>
                {!t.vente_id&&tTotal(t)>0&&<>
                  <button onClick={()=>creerVente(t,true)} title="Encaisser maintenant (Espèces)"
                    style={{padding:'7px 12px',borderRadius:'8px',background:'#16a34a',color:'white',border:'none',fontWeight:700,fontSize:'12px',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4}}>
                    <Coins size={12} strokeWidth={2.4} /> Encaisser
                  </button>
                  <button onClick={()=>creerVente(t,false)} title="Facturer à crédit (Créances)"
                    style={{padding:'7px 12px',borderRadius:'8px',background:'#fff7ed',color:'#ea580c',border:'1px solid #fed7aa',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                    À crédit
                  </button>
                </>}
                <button onClick={()=>envoyerRappelWA(t)} title="Rappel WhatsApp"
                  style={{padding:'7px 12px',borderRadius:'8px',background:'#22c55e',color:'white',border:'none',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                  💬
                </button>
                <button onClick={()=>toggleActif(t.id)}
                  style={{padding:'7px 12px',borderRadius:'8px',background:t.actif?'#f1f5f9':'#dcfce7',color:t.actif?'#64748b':'#166534',border:`1px solid ${t.actif?'#e2e8f0':'#bbf7d0'}`,fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                  {t.actif?'Terminer':'Réactiver'}
                </button>
                <button onClick={()=>{if(confirm(t.vente_id?'Supprimer ce traitement ? (la vente liée sera conservée)':'Supprimer ce traitement ?'))supprimer(t.id);}}
                  style={{padding:'7px 10px',borderRadius:'8px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',fontWeight:700,fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center'}}>
                  <Trash2 size={13} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          </div>;
        })}
      </div>
    </div>
  </div>;
}


// ── RENDER ───────────────────────────────────────────────────

export default SuiviTraitements
