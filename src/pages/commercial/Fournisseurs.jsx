// src/pages/commercial/Fournisseurs.jsx
// Centre de pilotage fournisseurs — relations commerciales & approvisionnement

import { useState, useMemo } from 'react';
import { today, fmtF, findDups, newId } from '../../lib/utils';
import { Btn, Badge, Field, DupWarning, FilterBar, FilterSelect, FilterBtns } from '../../components/ui';

// ── Données initiales ─────────────────────────────────────────
const INIT_FOURNISSEURS = [
  {
    id: 1,
    nom: 'MediVet SARL',
    contact: 'Kofi Mensah',
    tel: '+228 22 00 00 00',
    email: 'contact@medivet.tg',
    adresse: 'Zone industrielle, Lomé',
    ville: 'Lomé',
    pays: 'Togo',
    specialite: 'Médicaments vétérinaires',
    delaiLivraison: 3,           // jours
    conditionsPaiement: '30j',   // '30j' | '60j' | 'immédiat' | 'avance'
    remise: 5,                   // %
    noteQualite: 4,              // /5
    actif: true,
    notes: 'Fournisseur principal. Livraison rapide et fiable.',
    dateDebut: '2023-01-15',
    rib: 'TG53 TG009 001 00123456789 01',
    siteWeb: 'www.medivet.tg',
    created_at: '2023-01-15T08:00:00Z',
  },
  {
    id: 2,
    nom: 'Afrique Pharma',
    contact: 'Amara Diallo',
    tel: '+228 90 11 22 33',
    email: 'info@afriquepharma.com',
    adresse: 'Blvd 13 Janvier',
    ville: 'Lomé',
    pays: 'Togo',
    specialite: 'Vaccins et antiparasitaires',
    delaiLivraison: 5,
    conditionsPaiement: '60j',
    remise: 3,
    noteQualite: 5,
    actif: true,
    notes: 'Spécialiste vaccins. Chaîne du froid garantie.',
    dateDebut: '2023-03-01',
    rib: '',
    siteWeb: 'www.afriquepharma.com',
    created_at: '2023-03-01T09:00:00Z',
  },
  {
    id: 3,
    nom: 'AgroVet Togo',
    contact: 'Yves Agbeko',
    tel: '+228 93 44 55 66',
    email: 'agrovet@togo.net',
    adresse: 'Quartier central',
    ville: 'Kara',
    pays: 'Togo',
    specialite: 'Matériel et consommables',
    delaiLivraison: 7,
    conditionsPaiement: 'immédiat',
    remise: 0,
    noteQualite: 3,
    actif: true,
    notes: 'Matériel médical et consommables. Délai plus long.',
    dateDebut: '2024-01-10',
    rib: '',
    siteWeb: '',
    created_at: '2024-01-10T10:00:00Z',
  },
];

const SPECIALITES = [
  'Médicaments vétérinaires',
  'Vaccins et antiparasitaires',
  'Matériel et consommables',
  'Alimentation animale',
  'Équipements médicaux',
  'Produits désinfectants',
  'Autre',
];

const CONDITIONS_PAIEMENT = [
  { v: 'immédiat', l: 'Paiement immédiat' },
  { v: 'avance',   l: 'Avance à la commande' },
  { v: '30j',      l: '30 jours' },
  { v: '60j',      l: '60 jours' },
  { v: '90j',      l: '90 jours' },
];

const SPEC_STYLE = {
  'Médicaments vétérinaires':    { color: 'green',  icon: '💊' },
  'Vaccins et antiparasitaires': { color: 'blue',   icon: '💉' },
  'Matériel et consommables':    { color: 'purple', icon: '🔧' },
  'Alimentation animale':        { color: 'amber',  icon: '🌾' },
  'Équipements médicaux':        { color: 'cyan',   icon: '🏥' },
  'Produits désinfectants':      { color: 'orange', icon: '🧴' },
  'Autre':                       { color: 'slate',  icon: '📦' },
};

function specStyle(s) {
  return SPEC_STYLE[s] || { color: 'slate', icon: '📦' };
}

// Commandes simulées (en vrai, viendraient des props)
const HISTORIQUE_COMMANDES = [
  { id: 1, num: 'CMD-2025-001', date: '2025-02-10', fournisseurId: 1, montant: 195000, statut: 'Reçu' },
  { id: 2, num: 'CMD-2025-002', date: '2025-02-14', fournisseurId: 2, montant: 237500, statut: 'En transit' },
  { id: 3, num: 'CMD-2025-003', date: '2025-02-15', fournisseurId: 3, montant: 45000,  statut: 'En attente' },
  { id: 4, num: 'CMD-2025-004', date: '2025-01-20', fournisseurId: 1, montant: 312000, statut: 'Reçu' },
  { id: 5, num: 'CMD-2024-041', date: '2024-12-05', fournisseurId: 2, montant: 185000, statut: 'Reçu' },
];

// ── Étoiles de notation ───────────────────────────────────────
function Stars({ note, onChange, readonly = false }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n}
          onClick={readonly ? undefined : () => onChange(n)}
          className={`text-lg transition-transform ${readonly ? '' : 'hover:scale-125 cursor-pointer'}`}
          style={{ cursor: readonly ? 'default' : 'pointer', background: 'none', border: 'none', padding: 0 }}>
          <span style={{ color: n <= note ? '#f59e0b' : '#e2e8f0' }}>★</span>
        </button>
      ))}
    </div>
  );
}

// ── Formulaire fournisseur ────────────────────────────────────
function FormulaireF({ initial, onSave, onCancel }) {
  const empty = {
    nom: '', contact: '', tel: '', email: '', adresse: '', ville: 'Lomé', pays: 'Togo',
    specialite: 'Médicaments vétérinaires', delaiLivraison: 5,
    conditionsPaiement: '30j', remise: 0, noteQualite: 3,
    actif: true, notes: '', dateDebut: today(), rib: '', siteWeb: '',
  };
  const [form, setForm] = useState(initial || empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 bg-emerald-50 border-b border-emerald-200">
      <h3 className="font-bold text-emerald-800 text-base mb-4 flex items-center gap-2">
        {initial ? '✏️ Modifier le fournisseur' : '+ Nouveau fournisseur'}
      </h3>

      {/* Identité */}
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Identité</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="Raison sociale *" value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex: MediVet SARL" className="md:col-span-2" />
        <Field label="Spécialité" value={form.specialite} onChange={e => set('specialite', e.target.value)} options={SPECIALITES} />
        <Field label="Responsable commercial" value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="Nom du contact" />
        <Field label="Téléphone" value={form.tel} onChange={e => set('tel', e.target.value)} placeholder="+228 XX XX XX XX" />
        <Field label="Email" value={form.email} onChange={e => set('email', e.target.value)} type="email" placeholder="contact@fournisseur.com" />
        <Field label="Site web" value={form.siteWeb} onChange={e => set('siteWeb', e.target.value)} placeholder="www.fournisseur.com" />
        <Field label="Adresse" value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="Rue, quartier" />
        <Field label="Ville" value={form.ville} onChange={e => set('ville', e.target.value)} placeholder="Lomé" />
        <Field label="Pays" value={form.pays} onChange={e => set('pays', e.target.value)} options={['Togo', 'Bénin', 'Ghana', 'Côte d\'Ivoire', 'Nigeria', 'Sénégal', 'France', 'Autre']} />
      </div>

      {/* Conditions commerciales */}
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Conditions commerciales</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Field label="Délai livraison (jours)" value={form.delaiLivraison} onChange={e => set('delaiLivraison', parseInt(e.target.value) || 0)} type="number" placeholder="5" />
        <Field label="Conditions de paiement" value={form.conditionsPaiement} onChange={e => set('conditionsPaiement', e.target.value)}
          options={CONDITIONS_PAIEMENT.map(c => c.v)} />
        <Field label="Remise habituelle (%)" value={form.remise} onChange={e => set('remise', parseFloat(e.target.value) || 0)} type="number" placeholder="0" />
        <Field label="Date 1ère collaboration" value={form.dateDebut} onChange={e => set('dateDebut', e.target.value)} type="date" />
      </div>

      {/* Qualité & Notes */}
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Évaluation & Notes</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Note qualité</label>
          <Stars note={form.noteQualite} onChange={v => set('noteQualite', v)} />
        </div>
        <Field label="RIB / Coordonnées bancaires" value={form.rib} onChange={e => set('rib', e.target.value)} placeholder="TG53 TG009 001 00123..." />
      </div>
      <Field label="Notes internes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Observations, conditions particulières…" />

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <Btn onClick={() => onSave(form)}>✓ {initial ? 'Enregistrer les modifications' : 'Créer le fournisseur'}</Btn>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">Annuler</button>
      </div>
    </div>
  );
}

// ── Fiche détail fournisseur ──────────────────────────────────
function FicheFournisseur({ f, meds, onEdit, onClose }) {
  const style = specStyle(f.specialite);
  const medsF = (meds || []).filter(m => m.fournisseur === f.nom);
  const cmdsF = HISTORIQUE_COMMANDES.filter(c => c.fournisseurId === f.id);
  const totalAchats = cmdsF.filter(c => c.statut === 'Reçu').reduce((s, c) => s + c.montant, 0);
  const dernierCmd  = cmdsF[0];

  const condLabel = CONDITIONS_PAIEMENT.find(c => c.v === f.conditionsPaiement)?.l || f.conditionsPaiement;

  const statutBadge = { Reçu: 'green', 'En transit': 'blue', 'En attente': 'yellow', Annulé: 'red' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className={`bg-${style.color}-50 border-b border-${style.color}-200 p-6 rounded-t-3xl`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl bg-${style.color}-100 border-2 border-${style.color}-300 flex items-center justify-center text-3xl`}>
                {style.icon}
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900">{f.nom}</h2>
                <p className={`text-sm font-semibold text-${style.color}-700 mt-0.5`}>{f.specialite}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Stars note={f.noteQualite} readonly />
                  <span className="text-xs text-slate-400">{f.noteQualite}/5</span>
                  <Badge color={f.actif ? 'green' : 'red'}>{f.actif ? '✓ Actif' : '✕ Inactif'}</Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Btn onClick={onEdit} color="slate" sm>✏️ Modifier</Btn>
              <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">✕</button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: 'Total achats', v: fmtF(totalAchats), icon: '💰', c: 'green' },
              { l: 'Commandes',    v: cmdsF.length,      icon: '📦', c: 'blue'  },
              { l: 'Produits',     v: medsF.length,      icon: '💊', c: 'purple'},
              { l: 'Délai livr.', v: `${f.delaiLivraison}j`, icon: '🚚', c: 'amber' },
            ].map((s, i) => (
              <div key={i} className={`bg-${s.c}-50 border border-${s.c}-200 rounded-2xl p-3 text-center`}>
                <div className="text-xl mb-1">{s.icon}</div>
                <div className={`text-lg font-black text-${s.c}-700 font-mono`}>{s.v}</div>
                <div className={`text-xs text-${s.c}-600 font-semibold`}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Infos contact */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Contact</p>
              <div className="space-y-2">
                {f.contact && <Row icon="👤" val={f.contact} />}
                {f.tel     && <Row icon="📞" val={f.tel}     link={`tel:${f.tel}`} />}
                {f.email   && <Row icon="✉️" val={f.email}   link={`mailto:${f.email}`} />}
                {f.siteWeb && <Row icon="🌐" val={f.siteWeb} link={`https://${f.siteWeb}`} />}
                <Row icon="📍" val={[f.adresse, f.ville, f.pays].filter(Boolean).join(', ') || '—'} />
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Conditions commerciales</p>
              <div className="space-y-2">
                <Row icon="💳" val={condLabel} label="Paiement" />
                <Row icon="🏷️" val={`${f.remise}%`} label="Remise habituelle" />
                <Row icon="📅" val={`${f.delaiLivraison} jours ouvrés`} label="Délai livraison" />
                <Row icon="🤝" val={f.dateDebut || '—'} label="Depuis" />
                {f.rib && <Row icon="🏦" val={f.rib} label="RIB" mono />}
              </div>
            </div>
          </div>

          {/* Notes */}
          {f.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-2">📝 Notes internes</p>
              <p className="text-sm text-amber-900">{f.notes}</p>
            </div>
          )}

          {/* Médicaments fournis */}
          {medsF.length > 0 && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">💊 Médicaments approvisionnés ({medsF.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {medsF.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-3 py-2.5">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{m.nom}</p>
                      <p className="text-xs text-slate-400">{m.ref} · {m.categorie}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-blue-600">{fmtF(m.prixAchat)}<span className="font-normal text-slate-400">/unité</span></p>
                      <p className="text-xs text-slate-400">Stock: {m.stock} {m.unite}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historique commandes */}
          {cmdsF.length > 0 && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">📦 Historique des commandes ({cmdsF.length})</p>
              <div className="space-y-2">
                {cmdsF.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-400">{c.num}</span>
                      <Badge color={statutBadge[c.statut] || 'slate'}>{c.statut}</Badge>
                      <span className="text-xs text-slate-400">{c.date}</span>
                    </div>
                    <span className="font-black text-blue-600 font-mono text-sm">{fmtF(c.montant)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-sm font-bold text-slate-600">Total réceptionné</span>
                  <span className="font-black text-green-700 font-mono">{fmtF(totalAchats)}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Row({ icon, val, label, link, mono }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        {label && <p className="text-xs text-slate-400 font-semibold">{label}</p>}
        {link
          ? <a href={link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate block">{val}</a>
          : <p className={`text-sm text-slate-700 break-words ${mono ? 'font-mono text-xs' : ''}`}>{val}</p>
        }
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function Fournisseurs({ meds = [] }) {
  const [fours, setFours]       = useState(INIT_FOURNISSEURS);
  const [view, setView]         = useState('liste');   // 'liste' | 'form-new' | 'form-edit'
  const [selected, setSelected] = useState(null);      // fournisseur en vue détail
  const [editTarget, setEditTarget] = useState(null);  // fournisseur à éditer
  const [dups, setDups]         = useState([]);
  const [pending, setPending]   = useState(null);      // form en attente de confirmation

  // Filtres
  const [search, setSearch]     = useState('');
  const [fSpec, setFSpec]       = useState('');
  const [fActif, setFActif]     = useState('');
  const [fNote, setFNote]       = useState('');
  const [sortBy, setSortBy]     = useState('nom');     // 'nom' | 'note' | 'commandes'

  // ── CRUD ───────────────────────────────────────────────────
  const handleSave = (form, confirmDup = false) => {
    if (!form.nom.trim()) return alert('La raison sociale est requise.');

    if (!confirmDup && !editTarget) {
      const d = findDups(form.nom, fours);
      if (d.length) { setDups(d); setPending(form); return; }
    }

    const entry = {
      ...form,
      id: editTarget ? editTarget.id : newId(),
      created_at: editTarget ? editTarget.created_at : new Date().toISOString(),
    };

    if (editTarget) {
      setFours(prev => prev.map(f => f.id === editTarget.id ? entry : f));
      if (selected?.id === editTarget.id) setSelected(entry);
    } else {
      setFours(prev => [entry, ...prev]);
    }

    setView('liste');
    setEditTarget(null);
    setDups([]);
    setPending(null);
  };

  const handleDelete = (id) => {
    const f = fours.find(x => x.id === id);
    if (!confirm(`Supprimer "${f?.nom}" ? Cette action est irréversible.`)) return;
    setFours(prev => prev.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const toggleActif = (id) => {
    setFours(prev => prev.map(f => f.id === id ? { ...f, actif: !f.actif } : f));
  };

  // ── Filtrage + tri ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = [...fours];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(f =>
        f.nom.toLowerCase().includes(q) ||
        (f.contact || '').toLowerCase().includes(q) ||
        (f.ville || '').toLowerCase().includes(q) ||
        (f.specialite || '').toLowerCase().includes(q)
      );
    }
    if (fSpec)  r = r.filter(f => f.specialite === fSpec);
    if (fActif === 'actif')   r = r.filter(f => f.actif);
    if (fActif === 'inactif') r = r.filter(f => !f.actif);
    if (fNote)  r = r.filter(f => f.noteQualite >= parseInt(fNote));

    r.sort((a, b) => {
      if (sortBy === 'note')      return (b.noteQualite || 0) - (a.noteQualite || 0);
      if (sortBy === 'commandes') {
        const ca = HISTORIQUE_COMMANDES.filter(c => c.fournisseurId === a.id).length;
        const cb = HISTORIQUE_COMMANDES.filter(c => c.fournisseurId === b.id).length;
        return cb - ca;
      }
      if (sortBy === 'delai') return (a.delaiLivraison || 99) - (b.delaiLivraison || 99);
      return a.nom.localeCompare(b.nom);
    });
    return r;
  }, [fours, search, fSpec, fActif, fNote, sortBy]);

  // ── Stats globales ─────────────────────────────────────────
  const stats = useMemo(() => {
    const totalAchats = HISTORIQUE_COMMANDES
      .filter(c => c.statut === 'Reçu')
      .reduce((s, c) => s + c.montant, 0);
    const enCours = HISTORIQUE_COMMANDES.filter(c => c.statut !== 'Reçu' && c.statut !== 'Annulé').length;
    const noteAvg  = fours.length
      ? (fours.reduce((s, f) => s + (f.noteQualite || 0), 0) / fours.length).toFixed(1)
      : '—';
    return { totalAchats, enCours, noteAvg };
  }, [fours]);

  const activeFilters = [fSpec, fActif, fNote].filter(Boolean).length;
  const resetFilters  = () => { setSearch(''); setFSpec(''); setFActif(''); setFNote(''); };

  // ── Rendu ──────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Modal fiche détail */}
      {selected && !editTarget && (
        <FicheFournisseur
          f={selected}
          meds={meds}
          onEdit={() => { setEditTarget(selected); setView('form-edit'); }}
          onClose={() => setSelected(null)}
        />
      )}

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Fournisseurs actifs', v: fours.filter(f => f.actif).length, icon: '🏭', bg: 'bg-green-50 border-green-200', t: 'text-green-700' },
          { l: 'Total achats (reçus)', v: fmtF(stats.totalAchats), icon: '💰', bg: 'bg-blue-50 border-blue-200', t: 'text-blue-700' },
          { l: 'Commandes en cours', v: stats.enCours, icon: '📦', bg: 'bg-amber-50 border-amber-200', t: 'text-amber-700' },
          { l: 'Note qualité moy.', v: `${stats.noteAvg} / 5`, icon: '⭐', bg: 'bg-purple-50 border-purple-200', t: 'text-purple-700' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} border rounded-2xl p-5`}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className={`text-xs font-bold uppercase tracking-wide ${s.t} opacity-70 mb-1`}>{s.l}</p>
            <p className={`text-xl font-black font-mono ${s.t}`}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Formulaire nouveau / édition */}
      {(view === 'form-new' || view === 'form-edit') && (
        <div className="app-card overflow-hidden">
          {/* Confirmation doublon */}
          {dups.length > 0 && pending && (
            <div className="p-5 pb-0">
              <DupWarning
                dups={dups}
                onOk={() => handleSave(pending, true)}
                onCancel={() => { setDups([]); setPending(null); }}
              />
            </div>
          )}
          <FormulaireF
            initial={editTarget}
            onSave={handleSave}
            onCancel={() => { setView('liste'); setEditTarget(null); setDups([]); setPending(null); }}
          />
        </div>
      )}

      {/* Liste */}
      <div className="app-card">
        <div className="p-5 border-b flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">🏭 Fournisseurs</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {filtered.length} / {fours.length} fournisseur(s) · {fours.filter(f => f.actif).length} actif(s)
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Tri */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 outline-none bg-white">
              <option value="nom">🔤 Trier par nom</option>
              <option value="note">⭐ Meilleure note</option>
              <option value="commandes">📦 Plus commandé</option>
              <option value="delai">🚚 Délai livraison</option>
            </select>
            {view === 'liste'
              ? <Btn onClick={() => { setView('form-new'); setEditTarget(null); }}>+ Nouveau fournisseur</Btn>
              : <button onClick={() => { setView('liste'); setEditTarget(null); }} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all">✕ Annuler</button>
            }
          </div>
        </div>

        {/* Filtres */}
        <FilterBar search={search} onSearch={setSearch}
          placeholder="🔍 Nom, contact, ville, spécialité…"
          activeCount={activeFilters} onReset={resetFilters}>
          <FilterSelect
            label="📂 Spécialité" value={fSpec} onChange={setFSpec}
            options={SPECIALITES.map(s => ({ v: s, l: specStyle(s).icon + ' ' + s }))}
          />
          <FilterBtns
            options={[{ v: 'actif', l: '✓ Actif' }, { v: 'inactif', l: '✕ Inactif' }]}
            value={fActif} onChange={setFActif}
            colorFn={v => v === 'actif' ? 'green' : 'red'}
          />
          <FilterSelect
            label="⭐ Note min." value={fNote} onChange={setFNote}
            options={[{ v: '3', l: '⭐⭐⭐ et +' }, { v: '4', l: '⭐⭐⭐⭐ et +' }, { v: '5', l: '⭐⭐⭐⭐⭐' }]}
          />
        </FilterBar>

        {/* Grille des fiches */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3">🏭</div>
            <p className="font-semibold">Aucun fournisseur trouvé</p>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(f => {
              const style    = specStyle(f.specialite);
              const cmdsF    = HISTORIQUE_COMMANDES.filter(c => c.fournisseurId === f.id);
              const totalF   = cmdsF.filter(c => c.statut === 'Reçu').reduce((s, c) => s + c.montant, 0);
              const medsCount = (meds || []).filter(m => m.fournisseur === f.nom).length;
              const enCours  = cmdsF.filter(c => c.statut !== 'Reçu' && c.statut !== 'Annulé').length;

              return (
                <div key={f.id}
                  className={`group relative bg-white rounded-2xl border-2 transition-all cursor-pointer overflow-hidden
                    ${f.actif ? `border-slate-200 hover:border-${style.color}-400 hover:shadow-lg` : 'border-slate-100 opacity-60'}`}
                  onClick={() => setSelected(f)}>

                  {/* Barre colorée du haut */}
                  <div className={`h-1.5 bg-${style.color}-500`} />

                  <div className="p-4">
                    {/* Header carte */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl bg-${style.color}-50 border border-${style.color}-200 flex items-center justify-center text-xl shrink-0`}>
                          {style.icon}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">{f.nom}</h3>
                          {f.contact && <p className="text-xs text-slate-400 truncate">👤 {f.contact}</p>}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <Badge color={f.actif ? style.color : 'slate'}>
                          {f.specialite.split(' ')[0]}
                        </Badge>
                      </div>
                    </div>

                    {/* Note qualité */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <Stars note={f.noteQualite} readonly />
                      <span className="text-xs text-slate-400">{f.noteQualite}/5</span>
                    </div>

                    {/* Métriques */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-xs text-slate-400 font-semibold">Produits</p>
                        <p className="text-base font-black text-slate-700">{medsCount}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-xs text-slate-400 font-semibold">Commandes</p>
                        <p className="text-base font-black text-slate-700">{cmdsF.length}</p>
                      </div>
                      <div className={`rounded-xl p-2 text-center ${f.delaiLivraison <= 3 ? 'bg-green-50' : f.delaiLivraison <= 7 ? 'bg-amber-50' : 'bg-red-50'}`}>
                        <p className="text-xs text-slate-400 font-semibold">Délai</p>
                        <p className={`text-base font-black ${f.delaiLivraison <= 3 ? 'text-green-700' : f.delaiLivraison <= 7 ? 'text-amber-700' : 'text-red-700'}`}>
                          {f.delaiLivraison}j
                        </p>
                      </div>
                    </div>

                    {/* Total & infos */}
                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400">Total réceptionné</p>
                        <p className="font-black text-green-700 font-mono text-sm">{fmtF(totalF)}</p>
                      </div>
                      <div className="text-right">
                        {enCours > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                            {enCours} en cours
                          </span>
                        )}
                        <p className="text-xs text-slate-300 mt-1">{f.ville}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions au survol */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all no-print"
                    onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditTarget(f); setView('form-edit'); }}
                      className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all text-xs">
                      ✏️
                    </button>
                    <button
                      onClick={() => toggleActif(f.id)}
                      className={`w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-xs transition-all ${f.actif ? 'text-amber-400 hover:text-amber-600' : 'text-green-400 hover:text-green-600'}`}>
                      {f.actif ? '⏸' : '▶'}
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-300 transition-all text-xs">
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}