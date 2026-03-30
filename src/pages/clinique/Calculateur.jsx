import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Btn,
  Badge,
  PrintBtn,
  AutoSuggest,
  Field,
  FilterBar,
  FilterSelect,
  FilterBtns
} from "../../components/ui"
function Calculateur({meds,patients}){
  const [poids,setPoids]=useState('');
  const [selMed,setSelMed]=useState(null); // store full med object, not just id
  const [espece,setEspece]=useState('Chien');
  const [patName,setPatName]=useState('');
  const [patSugg,setPatSugg]=useState([]);
  const [resultats,setResultats]=useState(null);
  const [concentration,setConcentration]=useState(''); // mg/ml pour injectables

  const DOSAGES_SPECIAUX={
    'VET-003':{'Chien':'1 dose IM/SC (flacon)','Chat':'1 dose IM/SC (flacon)','Bovin':'1 dose IM (flacon)','Caprin':'1 dose IM (flacon)'},
  };

  const calculer=()=>{
    if(!poids)return alert('Veuillez saisir le poids de l\'animal');
    if(!selMed)return alert('Veuillez sélectionner un médicament');
    const poidsNum=parseFloat(String(poids).replace(',','.'));
    if(isNaN(poidsNum)||poidsNum<=0)return alert('Poids invalide — ex: 12.5');
    const med=selMed;
    // Dose fixe (vaccins, etc.)
    const special=DOSAGES_SPECIAUX[med.ref];
    if(special){
      setResultats({med,poidsNum,dose:special[espece]||'Voir notice fabricant',special:true});
      return;
    }
    if(!med.doseMgKg){
      setResultats({med,poidsNum,dose:'Posologie non renseignée — contacter le fabricant',special:true});
      return;
    }
    const mgTotal=parseFloat((med.doseMgKg*poidsNum).toFixed(2));
    // Volume si concentration renseignée ou injectable
    let volume=null;
    const conc=parseFloat(concentration)||null;
    if(conc&&conc>0) volume=(mgTotal/conc).toFixed(2);
    else if(med.unite==='flacons'||med.categorie==='Anti-inflammatoire') volume=(mgTotal/10).toFixed(2);
    setResultats({med,poidsNum,mgTotal,dosage:med.doseMgKg,volume,special:false,conc});
  };

  const reset=()=>{setResultats(null);setSelMed(null);setPoids('');setPatName('');setConcentration('');};

  return <div className="app-page max-w-3xl space-y-5">
    <div className="app-card">
      <div className="p-5 border-b">
        <h2 className="text-xl font-bold flex items-center gap-2">⚖️ Calculateur de doses</h2>
        <p className="text-sm text-slate-500 mt-0.5">Calcul automatique poids × posologie</p>
      </div>
      <div className="p-6 space-y-5">
        {/* Ligne 1 : Patient + Espèce + Poids */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Patient (optionnel)</label>
            <AutoSuggest value={patName}
              onChange={e=>{setPatName(e.target.value);setPatSugg(patients.filter(p=>p.nom.toLowerCase().includes(e.target.value.toLowerCase())));}}
              list={patSugg}
              onSelect={p=>{setPatName(p.nom);setPoids(p.poids?String(p.poids).replace(/[^0-9.,]/g,''):'');setEspece(p.espece||espece);setPatSugg([]);}}
              placeholder="Nom de l'animal…"/>
          </div>
          <Field label="Espèce" value={espece} onChange={e=>setEspece(e.target.value)} options={['Chien','Chat','Bovin','Caprin','Ovin','Volaille']}/>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Poids (kg) *</label>
            <input className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 outline-none"
              placeholder="ex: 25.5" value={poids} onChange={e=>setPoids(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')calculer();}}/>
          </div>
        </div>

        {/* Sélection médicament */}
        <div>
          <label className="text-xs font-bold text-slate-600 mb-2 block">Médicament *</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {meds.map(m=><button key={m.id||m.ref} onClick={()=>setSelMed(m)}
              className={`p-3 rounded-xl border-2 text-left transition-all hover:shadow-sm ${selMed?.nom===m.nom?'border-green-500 bg-green-50 shadow-sm':'border-slate-200 hover:border-slate-300'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {selMed?.nom===m.nom&&<span className="text-green-500 font-black">✓</span>}
                <span className="font-semibold text-sm leading-tight">{m.nom}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge color="purple">{m.categorie}</Badge>
                {m.doseMgKg?<Badge color="blue">{m.doseMgKg} mg/kg</Badge>:<Badge color="slate">Dose fixe</Badge>}
              </div>
              {m.stock<=m.seuil&&<div className="mt-1 stock-alert inline-block rounded-full"><Badge color="red">🚨 Stock critique</Badge></div>}
            </button>)}
          </div>
        </div>

        {/* Concentration (injectable) */}
        {selMed&&(selMed.unite==='flacons'||selMed.categorie==='Anti-inflammatoire')&&<div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
          <label className="text-xs font-bold text-blue-700 mb-1 block">💉 Concentration du produit (mg/ml) — optionnel</label>
          <div className="flex gap-2 items-center">
            <input type="number" className="w-36 border-2 border-blue-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none" placeholder="ex: 10" value={concentration} onChange={e=>setConcentration(e.target.value)}/>
            <span className="text-xs text-blue-600">Laissez vide → hypothèse 10 mg/ml</span>
          </div>
        </div>}

        <div className="flex gap-3">
          <button onClick={calculer}
            className="flex-1 py-3.5 rounded-xl font-black text-white text-base transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
            style={{background:'linear-gradient(135deg,#166534,#1d4ed8)'}}>
            ⚖️ Calculer la dose
          </button>
          {resultats&&<button onClick={reset} className="px-4 py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-all">
            ↺ Réinitialiser
          </button>}
        </div>
      </div>
    </div>

    {resultats&&<div id="calc-print" className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{border:'2px solid #166534'}}>
      <div className="p-5 border-b flex items-center justify-between" style={{background:'linear-gradient(135deg,#f0fdf4,#dbeafe)'}}>
        <h3 className="font-bold text-xl flex items-center gap-2" style={{color:'#14532d'}}>✅ Résultat du calcul</h3>
        <PrintBtn zoneId="calc-print" label="🖨 Imprimer"/>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-slate-50 rounded-xl p-3 text-center"><div className="text-xs font-bold text-slate-400 uppercase mb-1">Patient</div><div className="font-bold">{patName||'–'}</div></div>
          <div className="bg-slate-50 rounded-xl p-3 text-center"><div className="text-xs font-bold text-slate-400 uppercase mb-1">Espèce</div><div className="font-bold">{espece}</div></div>
          <div className="rounded-xl p-3 text-center border" style={{background:'#eff6ff',borderColor:'#bfdbfe'}}>
            <div className="text-xs font-bold uppercase mb-1" style={{color:'#3b82f6'}}>Poids</div>
            <div className="text-xl font-black" style={{color:'#1d4ed8'}}>{resultats.poidsNum} kg</div>
          </div>
          <div className="rounded-xl p-3 text-center border" style={{background:'#faf5ff',borderColor:'#e9d5ff'}}>
            <div className="text-xs font-bold uppercase mb-1" style={{color:'#9333ea'}}>Médicament</div>
            <div className="font-bold text-sm leading-tight">{resultats.med.nom}</div>
          </div>
        </div>

        {resultats.special
          ?<div className="rounded-2xl p-6 text-center border-2" style={{background:'#fffbeb',borderColor:'#fcd34d'}}>
            <div className="text-4xl mb-3">💊</div>
            <div className="text-xl font-black" style={{color:'#92400e'}}>{resultats.dose}</div>
            <p className="text-sm mt-2" style={{color:'#b45309'}}>Dose fixe — indépendante du poids de l'animal</p>
          </div>
          :<div className="grid gap-4" style={{gridTemplateColumns:resultats.volume?'1fr 1fr 1fr':'1fr 1fr'}}>
            <div className="rounded-2xl p-5 text-center border-2" style={{background:'#f0fdf4',borderColor:'#86efac'}}>
              <div className="text-xs font-bold uppercase mb-2" style={{color:'#16a34a'}}>Posologie</div>
              <div className="text-3xl font-black" style={{color:'#15803d'}}>{resultats.dosage} mg/kg</div>
            </div>
            <div className="rounded-2xl p-5 text-center border-2" style={{background:'#eff6ff',borderColor:'#93c5fd'}}>
              <div className="text-xs font-bold uppercase mb-2" style={{color:'#2563eb'}}>Dose totale</div>
              <div className="text-3xl font-black" style={{color:'#1d4ed8'}}>{resultats.mgTotal} mg</div>
            </div>
            {resultats.volume&&<div className="rounded-2xl p-5 text-center border-2" style={{background:'#faf5ff',borderColor:'#c4b5fd'}}>
              <div className="text-xs font-bold uppercase mb-2" style={{color:'#7c3aed'}}>Volume à injecter</div>
              <div className="text-3xl font-black" style={{color:'#6d28d9'}}>{resultats.volume} ml</div>
              <div className="text-xs mt-1" style={{color:'#8b5cf6'}}>{resultats.conc?`base : ${resultats.conc} mg/ml`:'base estimée : 10 mg/ml'}</div>
            </div>}
          </div>
        }
        <div className="mt-5 rounded-xl p-3 flex items-start gap-2 text-xs" style={{background:'#f8fafc',color:'#64748b'}}>
          <span className="text-base shrink-0">⚠️</span>
          <span>Calcul indicatif uniquement. Vérifiez la posologie sur la notice du fabricant et adaptez selon l'état clinique de l'animal. — La Barakat, le {new Date().toLocaleDateString('fr-FR')}</span>
        </div>
      </div>
    </div>}
  </div>;
}




// ── CONSENTEMENTS ÉCLAIRÉS ───────────────────────────────────

export default Calculateur
