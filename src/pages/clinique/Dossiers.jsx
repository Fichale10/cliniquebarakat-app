import { useState, useEffect, useRef, useMemo } from 'react'
import { Badge, PrintBtn } from '../../components/ui'

function Dossiers({patients}){
  const [sel,setSel]=useState(null);
  const hist={
    1:[{date:'2025-02-15',type:'Consultation',detail:'SOAP – Entorse légère membre ant. droit – Kétoprofène 5j',vet:'Vétérinaire'},{date:'2024-11-10',type:'Antiparasitaire',detail:'Frontline – Traitement ext.',vet:'Vétérinaire'},{date:'2024-06-20',type:'Consultation',detail:'Otite externe bilatérale – Aurizon 10j',vet:'Vétérinaire'}],
    2:[{date:'2025-02-14',type:'Consultation',detail:'SOAP – Gastro-entérite aiguë – Métronidazole 5j',vet:'Vétérinaire'},{date:'2024-09-05',type:'Chirurgie',detail:'Ovariohystérectomie – Suivi OK',vet:'Vétérinaire'}],
    3:[{date:'2025-02-13',type:'Contrôle',detail:'Gestation 6 mois – Vitamines A-D-E',vet:'Vétérinaire'}],
    4:[{date:'2025-01-20',type:'Vaccination',detail:'Primo-vaccination CHPPi',vet:'Vétérinaire'}],
  };
  const tc={Consultation:'blue',Vaccination:'green',Chirurgie:'purple',Antiparasitaire:'yellow',Contrôle:'slate'};
  const emoji={Chien:'🐕',Chat:'🐈',Bovin:'🐄',Caprin:'🐐',Ovin:'🐑'};
  const pat=sel?patients.find(p=>p.id===sel):null;
  return <div className="app-page">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
    <div className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-slate-50"><h3 className="font-bold text-slate-700">📋 Sélectionner un patient</h3></div>
      <div className="p-3 space-y-1 overflow-y-auto max-h-[70vh]">
        {patients.map(p=><div key={p.id} onClick={()=>setSel(p.id)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${sel===p.id?'border-blue-400 bg-blue-50':'border-transparent hover:bg-slate-50'}`}>
          <span className="text-2xl">{emoji[p.espece]||'🐾'}</span>
          <div><p className="font-bold text-sm">{p.nom}</p><p className="text-xs text-slate-500">{p.espece} · {p.proprio}</p>
            {p.allergies&&<Badge color="red">⚠️ {p.allergies}</Badge>}
          </div>
        </div>)}
      </div>
    </div>
    <div className="lg:col-span-2">
      {!pat?<div className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] p-12 text-center flex flex-col items-center justify-center" style={{minHeight:'400px'}}><div className="text-6xl mb-4">📋</div><h3 className="text-xl font-bold text-slate-700">Sélectionnez un patient</h3></div>
      :<div id="dossier-print" className="space-y-4">
        <div className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{emoji[pat.espece]||'🐾'}</div>
              <div>
                <h2 className="text-2xl font-black">{pat.nom}</h2>
                <p className="text-slate-600">{pat.espece} · {pat.race} · {pat.sexe==='M'?'Mâle':'Femelle'}</p>
                <p className="text-slate-500 text-sm">👤 {pat.proprio} · 📞 {pat.tel}</p>
              </div>
            </div>
            <PrintBtn zoneId="dossier-print" label="🖨 Dossier"/>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['Âge',pat.age||'–'],['Poids',pat.poids||'–'],['Couleur',pat.couleur||'–']].map(([l,v],i)=><div key={i} className="bg-slate-50 rounded-xl p-3 text-center"><div className="text-xs font-bold text-slate-400 uppercase mb-1">{l}</div><div className="font-bold">{v}</div></div>)}
            {pat.allergies&&<div className="bg-red-50 rounded-xl p-3 text-center border border-red-200"><div className="text-xs font-bold text-red-500 uppercase mb-1">⚠️ Allergies</div><div className="font-bold text-red-700 text-sm">{pat.allergies}</div></div>}
          </div>
          {pat.antecedents&&<div className="mt-3 bg-amber-50 rounded-xl p-3 border border-amber-200"><span className="text-xs font-bold text-amber-600">📋 Antécédents : </span><span className="text-sm">{pat.antecedents}</span></div>}
        </div>
        <div className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] p-5">
          <h3 className="font-bold text-lg mb-4">📅 Historique médical</h3>
          {(hist[sel]||[]).length?<div className="space-y-3">{(hist[sel]||[]).map((h,i)=><div key={i} className="flex gap-4 p-4 border border-slate-200 rounded-xl hover:bg-slate-50">
            <div className="text-center min-w-[60px]"><div className="text-xs text-slate-400">{h.date.substring(0,4)}</div><div className="font-bold text-sm">{h.date.slice(5).replace('-','/')}</div></div>
            <div className="flex-1"><div className="flex items-center gap-2 mb-1"><Badge color={tc[h.type]||'slate'}>{h.type}</Badge><span className="text-xs text-slate-400">{h.vet}</span></div><p className="text-sm">{h.detail}</p></div>
          </div>)}</div>:<p className="text-slate-400 text-center py-8">Aucun historique</p>}
        </div>
      </div>}
    </div>
    </div>
  </div>;
}

// ── HOSPITALISATION ──────────────────────────────────────────

export default Dossiers
