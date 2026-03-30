import { useState, useEffect, useRef, useMemo } from 'react'
const today = () => new Date().toISOString().split('T')[0];
import {
  Btn,
  Badge,
  PrintBtn,
  FilterPeriode,
  AutoSuggest,
  Field,
  FilterSelect,
  FilterBtns
} from "../../components/ui"
function Consentements({patients,equipe=[]}){
  const vets=(equipe.filter(m=>m.role==='Vétérinaire'||m.role==='Chirurgien').map(m=>m.nom)).filter(Boolean);
  const vetOptions=vets.length?vets:['Docteur'];
  const [type,setType]=useState('chirurgie');
  const [form,setForm]=useState({patient:'',proprio:'',espece:'',poids:'',operation:'',date:today(),vet:'Vétérinaire',risques:'',note:''});
  const f=v=>e=>setForm({...form,[v]:e.target.value});
  const [patSugg,setPatSugg]=useState([]);
  const [generated,setGenerated]=useState(false);

  const TEMPLATES={
    chirurgie:{titre:'CONSENTEMENT CHIRURGICAL',risques:'anesthésie générale, hémorragie, infection post-opératoire, réactions médicamenteuses, complications liées à l\'état général de l\'animal'},
    euthanasie:{titre:'CONSENTEMENT D\'EUTHANASIE',risques:'procédure irréversible entraînant le décès de l\'animal'},
    anesthesie:{titre:'CONSENTEMENT ANESTHÉSIQUE',risques:'réactions allergiques, complications cardio-respiratoires, réveil difficile'},
    hospitalisation:{titre:'CONSENTEMENT D\'HOSPITALISATION',risques:'stress lié à la séparation, infections nosocomiales, complications liées à l\'état de l\'animal'},
  };

  const tpl=TEMPLATES[type];
  const risquesFinal=form.risques||tpl.risques;

  return <div className="app-page max-w-4xl space-y-5">
    <div className="app-card">
      <div className="p-5 border-b"><h2 className="text-xl font-bold flex items-center gap-2">✍️ Consentements éclairés</h2></div>
      <div className="p-5">
        <div className="flex gap-2 mb-5 flex-wrap">
          {Object.entries(TEMPLATES).map(([k,v])=><button key={k} onClick={()=>{setType(k);setGenerated(false);}} className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${type===k?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-600 hover:border-slate-300'}`}>{k==='chirurgie'?'🔬 Chirurgie':k==='euthanasie'?'🕊️ Euthanasie':k==='anesthesie'?'💉 Anesthésie':'🏥 Hospitalisation'}</button>)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div><label className="text-xs font-bold text-slate-600 mb-1 block">Patient</label>
            <AutoSuggest value={form.patient} onChange={e=>{setForm({...form,patient:e.target.value});setPatSugg(patients.filter(p=>p.nom.toLowerCase().includes(e.target.value.toLowerCase())));}} list={patSugg} onSelect={p=>{setForm({...form,patient:p.nom,proprio:p.proprio,espece:p.espece,poids:p.poids||''});setPatSugg([]);}} placeholder="Nom de l'animal"/>
          </div>
          <Field label="Propriétaire *" value={form.proprio} onChange={f('proprio')} placeholder="Nom et prénom"/>
          <Field label="Espèce" value={form.espece} onChange={f('espece')} placeholder="Chien, Chat…"/>
          <Field label="Poids" value={form.poids} onChange={f('poids')} placeholder="ex: 12 kg"/>
          <Field label={type==='chirurgie'?'Type d\'opération':type==='euthanasie'?'Motif':type==='anesthesie'?'Protocole':'Motif'} value={form.operation} onChange={f('operation')} placeholder="Décrire l'acte…"/>
          <Field label="Date" value={form.date} onChange={f('date')} type="date"/>
          <Field label="Vétérinaire" value={form.vet} onChange={f('vet')} options={vetOptions}/>
          <Field label="Risques spécifiques (optionnel)" value={form.risques} onChange={f('risques')} placeholder="Laisser vide pour utiliser le modèle standard" className="md:col-span-2"/>
        </div>
        <Field label="Note complémentaire" value={form.note} onChange={f('note')} rows={2} placeholder="Informations supplémentaires…"/>
        <div className="mt-4"><Btn onClick={()=>{if(!form.proprio)return alert('Propriétaire requis');setGenerated(true);}}>📄 Générer le formulaire</Btn></div>
      </div>
    </div>

    {generated&&<div id="consent-print" className="bg-white rounded-2xl shadow-sm border-2 border-slate-300 overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between bg-slate-50 no-print">
        <h3 className="font-bold text-slate-700">Aperçu du formulaire</h3>
        <PrintBtn zoneId="consent-print" label="🖨 Imprimer le formulaire"/>
      </div>
      {/* Document imprimable */}
      <div className="p-10">
        <div style={{fontFamily:'Georgia, serif',maxWidth:'680px',margin:'0 auto'}}>
          <div style={{textAlign:'center',borderBottom:'2px solid #334155',paddingBottom:'20px',marginBottom:'24px'}}>
            <div style={{fontSize:'20px',fontWeight:'900',color:'#14532d',marginBottom:'6px'}}>🐾 La Barakat – Clinique Vétérinaire</div>
            <div style={{fontSize:'14px',color:'#64748b'}}>Lomé, Togo · Tél : +228 XX XX XX XX</div>
            <div style={{fontSize:'18px',fontWeight:'900',marginTop:'16px',letterSpacing:'2px',color:'#334155'}}>{tpl.titre}</div>
          </div>
          <div style={{marginBottom:'20px',lineHeight:'1.8',fontSize:'14px'}}>
            <p>Je soussigné(e), <strong>{form.proprio||'____________________________'}</strong>, propriétaire de l'animal :</p>
            <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'12px 16px',margin:'12px 0',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',fontSize:'14px'}}>
              <div>Nom de l'animal : <strong>{form.patient||'–'}</strong></div>
              <div>Espèce : <strong>{form.espece||'–'}</strong></div>
              <div>Poids : <strong>{form.poids||'–'}</strong></div>
              <div>Date : <strong>{form.date}</strong></div>
            </div>
          </div>
          <div style={{marginBottom:'20px',fontSize:'14px',lineHeight:'1.8'}}>
            {type==='euthanasie'
              ? <><p>Déclare avoir été <strong>pleinement informé(e)</strong> par {form.vet} de l'état de santé de mon animal et des motifs conduisant à la décision d'euthanasie.</p>
                  <p style={{marginTop:'12px'}}>Motif : <strong>{form.operation||'–'}</strong></p>
                  <p style={{marginTop:'12px'}}>Je comprends que cette procédure est <strong>irréversible</strong> et entraîne le décès de l'animal. J'autorise le vétérinaire à procéder à l'euthanasie dans des conditions de confort maximal pour l'animal.</p></>
              : <><p>Autorise <strong>{form.vet}</strong> à pratiquer l'acte suivant sur mon animal :</p>
                  <p style={{margin:'12px 0',background:'#f0fdf4',padding:'10px 14px',borderRadius:'6px',fontWeight:'700',fontSize:'15px'}}>{form.operation||'–'}</p>
                  <p>J'ai été informé(e) des <strong>risques inhérents</strong> à cet acte médical, notamment : {risquesFinal}.</p>
                  {form.note&&<p style={{marginTop:'12px'}}>Note : {form.note}</p>}</>
            }
          </div>
          <div style={{marginBottom:'24px',fontSize:'14px',lineHeight:'1.8',background:'#fefce8',border:'1px solid #fef08a',borderRadius:'8px',padding:'12px 16px'}}>
            <p>Je confirme avoir reçu toutes les informations nécessaires, avoir pu poser mes questions et avoir obtenu des réponses satisfaisantes. Je donne mon consentement libre et éclairé.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'40px',marginTop:'40px'}}>
            <div style={{textAlign:'center'}}>
              <div style={{borderBottom:'1px solid #334155',paddingBottom:'4px',marginBottom:'6px',height:'50px'}}></div>
              <div style={{fontSize:'12px',color:'#64748b'}}>Signature du propriétaire<br/>Date : {form.date}</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{borderBottom:'1px solid #334155',paddingBottom:'4px',marginBottom:'6px',height:'50px'}}></div>
              <div style={{fontSize:'12px',color:'#64748b'}}>Signature du vétérinaire<br/>{form.vet} – Cachet</div>
            </div>
          </div>
          <div style={{marginTop:'24px',paddingTop:'16px',borderTop:'1px solid #e2e8f0',fontSize:'11px',color:'#94a3b8',textAlign:'center'}}>Document confidentiel – La Barakat · Ce formulaire est conservé dans le dossier médical de l'animal</div>
        </div>
      </div>
    </div>}
  </div>;
}

// ── ORDONNANCES ──────────────────────────────────────────────

export default Consentements
