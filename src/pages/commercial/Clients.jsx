import { useState, useEffect, useRef, useMemo } from 'react'
import { Btn, Badge, Field, DupWarning, PrintBtn } from '../../components/ui'

function Clients({clients,setClients}){
  const [search,setSearch]=useState('');
  const [showForm,setShowForm]=useState(false);
  const [confirmDel,setConfirmDel]=useState(null);
  const [form,setForm]=useState({nom:'',tel:'',email:'',adresse:''});
  const [dups,setDups]=useState([]);const [pending,setPending]=useState(false);
  const doAdd=()=>{setClients([...clients,{...form,id:Date.now(),animaux:0}]);setForm({nom:'',tel:'',email:'',adresse:''});setShowForm(false);setDups([]);setPending(false);};
  const handleAdd=()=>{if(!form.nom)return alert('Nom requis');const d=findDups(form.nom,clients);if(d.length){setDups(d);setPending(true);}else doAdd();};
  const doDelete=(id)=>{setClients(clients.filter(c=>c.id!==id));setConfirmDel(null);};
  const filtered=clients.filter(c=>c.nom.toLowerCase().includes(search.toLowerCase())||c.tel?.includes(search)||(c.adresse||'').toLowerCase().includes(search.toLowerCase()));
  return <div id="clients-print" className="app-page space-y-5">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { l: 'Total clients', v: clients.length, mod: 'stat-tile--blue' },
        { l: 'Avec animaux', v: clients.filter((c) => c.animaux > 0).length, mod: 'stat-tile--green' },
        { l: 'Résultat recherche', v: filtered.length, mod: 'stat-tile--slate' },
        { l: 'Ce mois', v: 3, mod: 'stat-tile--purple' },
      ].map((s, i) => (
        <div key={i} className={`stat-tile ${s.mod}`}>
          <div className="stat-tile__label">{s.l}</div>
          <div className="stat-tile__value">{s.v}</div>
        </div>
      ))}
    </div>
    <div className="app-card">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div><h2 className="text-xl font-bold flex items-center gap-2">👥 Clients</h2><p className="text-xs text-slate-400 mt-0.5">{clients.length} client(s) enregistré(s)</p></div>
        <div className="flex gap-2 no-print"><PrintBtn zoneId="clients-print" label="🖨"/><Btn onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Annuler':'+ Nouveau client'}</Btn></div>
      </div>
      {showForm&&<div className="p-5 bg-green-50 border-b border-green-200">
        <h3 className="font-bold text-green-800 mb-3">Nouveau client</h3>
        {pending&&<DupWarning dups={dups} entity="client" onOk={doAdd} onCancel={()=>{setDups([]);setPending(false);}}/>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{l:'Nom complet *',k:'nom',ph:'Nom et prénom'},{l:'Téléphone',k:'tel',ph:'+228 XX XX XX XX'},{l:'Email',k:'email',ph:'email@domaine.com'},{l:'Adresse / Ville',k:'adresse',ph:'Ex: Lomé, Bè'}].map(f=>(
            <Field key={f.k} label={f.l} value={form[f.k]} onChange={e=>setForm({...form,[f.k]:e.target.value})} placeholder={f.ph}/>
          ))}
        </div>
        <div className="mt-3"><Btn onClick={handleAdd}>✓ Enregistrer</Btn></div>
      </div>}
      <div className="p-5">
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input className="w-full border-2 border-slate-200 rounded-xl pl-9 pr-4 py-2.5 focus:border-green-400 outline-none text-sm" placeholder="Rechercher par nom, téléphone, adresse…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(c=><div key={c.id} className="group relative bg-[var(--app-surface)] border-2 border-[var(--app-border)] hover:border-green-500/50 hover:shadow-md rounded-2xl p-4 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0" style={{background:'linear-gradient(135deg,#166534,#1d4ed8)'}}>
                {c.nom.substring(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900">{c.nom}</h3>
                <div className="space-y-0.5 mt-1">
                  <p className="text-sm text-slate-600 flex items-center gap-1.5"><span>📞</span>{c.tel||'–'}</p>
                  {c.email&&<p className="text-sm text-slate-500 flex items-center gap-1.5 truncate"><span>✉️</span>{c.email}</p>}
                  {c.adresse&&<p className="text-sm text-slate-500 flex items-center gap-1.5"><span>📍</span>{c.adresse}</p>}
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                <Badge color="blue">{c.animaux} animal(ux)</Badge>
                {/* Bouton supprimer — visible au survol */}
                <button onClick={()=>setConfirmDel(c.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs flex items-center gap-1 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-all font-semibold no-print">
                  🗑 Retirer
                </button>
              </div>
            </div>
            {/* Confirmation suppression inline */}
            {confirmDel===c.id&&<div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <p className="text-sm text-red-700 font-semibold">⚠️ Supprimer <strong>{c.nom}</strong> ? Action irréversible.</p>
              <div className="flex gap-2 shrink-0">
                <button onClick={()=>doDelete(c.id)} className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-all">Confirmer</button>
                <button onClick={()=>setConfirmDel(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-bold transition-all">Annuler</button>
              </div>
            </div>}
          </div>)}
          {!filtered.length&&<div className="col-span-2 text-center py-12 text-slate-400">
            <div className="text-4xl mb-2">🔍</div>
            <p className="font-semibold">Aucun client trouvé</p>
          </div>}
        </div>
      </div>
    </div>
  </div>;
}

// ── FOURNISSEURS ─────────────────────────────────────────────

export default Clients
