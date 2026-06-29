import { useState, useMemo } from 'react';
import { today, fmtF, findDups } from '../../lib/utils';
import { newId } from '../../lib/db';
import { Btn, Badge, Field, DupWarning, FilterBar, FilterSelect, FilterBtns, EmptyState } from '../../components/ui';

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

const toDbRow = (form) => ({
  nom:                 form.nom,
  contact:             form.contact,
  tel:                 form.tel,
  email:               form.email,
  adresse:             form.adresse,
  ville:               form.ville,
  pays:                form.pays,
  specialite:          form.specialite,
  delai_livraison:     parseInt(form.delaiLivraison) || 5,
  conditions_paiement: form.conditionsPaiement,
  remise:              parseFloat(form.remise) || 0,
  note_qualite:        parseInt(form.noteQualite) || 3,
  actif:               form.actif,
  notes:               form.notes,
  date_debut:          form.dateDebut || null,
  rib:                 form.rib,
  site_web:            form.siteWeb,
});

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

function FormulaireF({ initial, onSave, onCancel, saving }) {
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
        <Field label="Pays" value={form.pays} onChange={e => set('pays', e.target.value)} options={['Togo', 'Bénin', 'Ghana', "Côte d'Ivoire", 'Nigeria', 'Sénégal', 'France', 'Autre']} />
      </div>

      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Conditions commerciales</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Field label="Délai livraison (jours)" value={form.delaiLivraison} onChange={e => set('delaiLivraison', parseInt(e.target.value) || 0)} type="number" placeholder="5" />
        <Field label="Conditions de paiement" value={form.conditionsPaiement} onChange={e => set('conditionsPaiement', e.target.value)}
          options={CONDITIONS_PAIEMENT.map(c => c.v)} />
        <Field label="Remise habituelle (%)" value={form.remise} onChange={e => set('remise', parseFloat(e.target.value) || 0)} type="number" placeholder="0" />
        <Field label="Date 1ère collaboration" value={form.dateDebut} onChange={e => set('dateDebut', e.target.value)} type="date" />
      </div>

      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Évaluation & Notes</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Note qualité</label>
          <Stars note={form.noteQualite} onChange={v => set('noteQualite', v)} />
        </div>
        <Field label="RIB / Coordonnées bancaires" value={form.rib} onChange={e => set('rib', e.target.value)} placeholder="TG53 TG009 001 00123..." />
      </div>
      <Field label="Notes internes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Observations, conditions particulières…" />

      <div className="flex gap-2 mt-4">
        <Btn onClick={() => onSave(form)} disabled={saving}>
          {saving ? '⏳ Enregistrement…' : `✓ ${initial ? 'Enregistrer les modifications' : 'Créer le fournisseur'}`}
        </Btn>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">Annuler</button>
      </div>
    </div>
  );
}

function FicheFournisseur({ f, meds, onEdit, onClose }) {
  const style   = specStyle(f.specialite);
  const medsF   = (meds || []).filter(m => m.fournisseur === f.nom);
  const condLabel = CONDITIONS_PAIEMENT.find(c => c.v === f.conditionsPaiement)?.l || f.conditionsPaiement;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: 'Note qualité',  v: `${f.noteQualite}/5`,          icon: '⭐', c: 'amber'  },
              { l: 'Produits',      v: medsF.length,                   icon: '💊', c: 'purple' },
              { l: 'Délai livr.',   v: `${f.delaiLivraison}j`,         icon: '🚚', c: 'blue'   },
              { l: 'Remise',        v: `${f.remise}%`,                 icon: '🏷️', c: 'green'  },
            ].map((s, i) => (
              <div key={i} className={`bg-${s.c}-50 border border-${s.c}-200 rounded-2xl p-3 text-center`}>
                <div className="text-xl mb-1">{s.icon}</div>
                <div className={`text-lg font-black text-${s.c}-700 font-mono`}>{s.v}</div>
                <div className={`text-xs text-${s.c}-600 font-semibold`}>{s.l}</div>
              </div>
            ))}
          </div>

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

          {f.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-2">📝 Notes internes</p>
              <p className="text-sm text-amber-900">{f.notes}</p>
            </div>
          )}

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

export default function Fournisseurs({ fournisseurs = [], setFournisseurs, meds = [], sb, dbInsert, dbUpdate, dbDelete, versements = [], setVersements, achatsHist = [] }) {
  const [view, setView]             = useState('liste');
  const [selected, setSelected]     = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [dups, setDups]             = useState([]);
  const [pending, setPending]       = useState(null);
  const [saving, setSaving]         = useState(false);
  const [activeTab, setActiveTab]   = useState('liste');
  const [showVForm, setShowVForm]   = useState(false);
  const [savingV, setSavingV]       = useState(false);
  const [expV, setExpV]             = useState(null);
  const [vForm, setVForm]           = useState({ fournisseur: '', montant: '', date: today(), mode: 'Espèces', note: '' });

  const [search, setSearch] = useState('');
  const [fSpec, setFSpec]   = useState('');
  const [fActif, setFActif] = useState('');
  const [fNote, setFNote]   = useState('');
  const [sortBy, setSortBy] = useState('nom');

  const handleSave = async (form, confirmDup = false) => {
    if (!form.nom.trim()) return alert('La raison sociale est requise.');

    if (!confirmDup && !editTarget) {
      const d = findDups(form.nom, fournisseurs);
      if (d.length) { setDups(d); setPending(form); return; }
    }

    setSaving(true);
    try {
      if (editTarget) {
        await dbUpdate(sb, 'fournisseurs', editTarget.id, toDbRow(form));
        const entry = { ...form, id: editTarget.id, created_at: editTarget.created_at };
        setFournisseurs(fournisseurs.map(f => f.id === editTarget.id ? entry : f));
        if (selected?.id === editTarget.id) setSelected(entry);
      } else {
        const row = { id: newId(), ...toDbRow(form) };
        const saved = await dbInsert(sb, 'fournisseurs', row);
        const entry = { ...form, id: saved.id || row.id, created_at: saved.created_at || new Date().toISOString() };
        setFournisseurs([entry, ...fournisseurs]);
      }
      setView('liste');
      setEditTarget(null);
      setDups([]);
      setPending(null);
    } catch (e) {
      alert('Erreur : ' + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const f = fournisseurs.find(x => x.id === id);
    if (!confirm(`Supprimer "${f?.nom}" ? Cette action est irréversible.`)) return;
    try {
      await dbDelete(sb, 'fournisseurs', id);
      setFournisseurs(fournisseurs.filter(x => x.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      alert('Erreur suppression : ' + (e?.message || e));
    }
  };

  const toggleActif = async (id) => {
    const f = fournisseurs.find(x => x.id === id);
    if (!f) return;
    const actif = !f.actif;
    try {
      await dbUpdate(sb, 'fournisseurs', id, { actif });
      setFournisseurs(fournisseurs.map(x => x.id === id ? { ...x, actif } : x));
    } catch (e) {
      alert('Erreur : ' + (e?.message || e));
    }
  };

  const filtered = useMemo(() => {
    let r = [...fournisseurs];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(f =>
        f.nom.toLowerCase().includes(q) ||
        (f.contact || '').toLowerCase().includes(q) ||
        (f.ville || '').toLowerCase().includes(q) ||
        (f.specialite || '').toLowerCase().includes(q)
      );
    }
    if (fSpec)            r = r.filter(f => f.specialite === fSpec);
    if (fActif === 'actif')   r = r.filter(f => f.actif);
    if (fActif === 'inactif') r = r.filter(f => !f.actif);
    if (fNote)            r = r.filter(f => f.noteQualite >= parseInt(fNote));

    r.sort((a, b) => {
      if (sortBy === 'note')  return (b.noteQualite || 0) - (a.noteQualite || 0);
      if (sortBy === 'delai') return (a.delaiLivraison || 99) - (b.delaiLivraison || 99);
      return a.nom.localeCompare(b.nom);
    });
    return r;
  }, [fournisseurs, search, fSpec, fActif, fNote, sortBy]);

  const stats = useMemo(() => {
    const actifs  = fournisseurs.filter(f => f.actif).length;
    const noteAvg = fournisseurs.length
      ? (fournisseurs.reduce((s, f) => s + (f.noteQualite || 0), 0) / fournisseurs.length).toFixed(1)
      : '—';
    const delaiMoy = fournisseurs.length
      ? Math.round(fournisseurs.reduce((s, f) => s + (f.delaiLivraison || 0), 0) / fournisseurs.length)
      : 0;
    return { actifs, noteAvg, delaiMoy };
  }, [fournisseurs]);

  const activeFilters = [fSpec, fActif, fNote].filter(Boolean).length;
  const resetFilters  = () => { setSearch(''); setFSpec(''); setFActif(''); setFNote(''); };

  const debtData = useMemo(() => {
    return fournisseurs
      .map(f => {
        const recu       = (achatsHist || []).filter(c => c.fournisseur === f.nom && c.statut === 'Reçu')
        const totalCmd   = recu.reduce((s, c) => s + (c.total || 0), 0)
        const totalVerse = (versements || []).filter(v => v.fournisseur === f.nom).reduce((s, v) => s + (v.montant || 0), 0)
        const solde      = totalCmd - totalVerse
        return { ...f, totalCmd, totalVerse, solde, nbCommandes: recu.length }
      })
      .filter(d => d.totalCmd > 0 || d.totalVerse > 0)
      .sort((a, b) => b.solde - a.solde)
  }, [fournisseurs, achatsHist, versements])

  const totalDette = debtData.reduce((s, d) => s + Math.max(0, d.solde), 0)

  const addVersement = async () => {
    if (!vForm.fournisseur) return alert('Sélectionnez un fournisseur')
    const m = parseInt(vForm.montant)
    if (isNaN(m) || m <= 0) return alert('Montant invalide (doit être > 0)')
    setSavingV(true)
    try {
      const row = { id: newId(), fournisseur: vForm.fournisseur, montant: m, date: vForm.date, mode: vForm.mode, note: vForm.note || '' }
      const saved = await dbInsert(sb, 'versements_fournisseurs', row)
      setVersements([saved, ...(versements || [])])
      setVForm({ fournisseur: '', montant: '', date: today(), mode: 'Espèces', note: '' })
      setShowVForm(false)
    } catch(e) {
      alert('Erreur : ' + (e?.message || e))
    } finally {
      setSavingV(false)
    }
  }

  const delVersement = async (id) => {
    if (!confirm('Supprimer ce versement ?')) return
    try {
      await dbDelete(sb, 'versements_fournisseurs', id)
      setVersements((versements || []).filter(v => v.id !== id))
    } catch(e) {
      alert('Erreur : ' + (e?.message || e))
    }
  }

  return (
    <div className="space-y-5">

      {selected && !editTarget && (
        <FicheFournisseur
          f={selected}
          meds={meds}
          onEdit={() => { setEditTarget(selected); setView('form-edit'); }}
          onClose={() => setSelected(null)}
        />
      )}

      <div className="flex gap-2">
        {[
          { k: 'liste',  l: '🏭 Fournisseurs',       c: fournisseurs.length                      },
          { k: 'dettes', l: '💰 Dettes & Paiements', c: debtData.filter(d => d.solde > 0).length },
        ].map(t => (
          <button key={t.k} onClick={() => setActiveTab(t.k)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${activeTab===t.k?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {t.l} <span className="ml-1 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{t.c}</span>
          </button>
        ))}
      </div>

      {activeTab === 'liste' && <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Fournisseurs actifs', v: stats.actifs,           icon: '🏭', bg: 'bg-green-50 border-green-200',  t: 'text-green-700'  },
          { l: 'Total fournisseurs',  v: fournisseurs.length,    icon: '📋', bg: 'bg-blue-50 border-blue-200',    t: 'text-blue-700'   },
          { l: 'Note qualité moy.',   v: `${stats.noteAvg} / 5`, icon: '⭐', bg: 'bg-purple-50 border-purple-200', t: 'text-purple-700' },
          { l: 'Délai livr. moy.',    v: `${stats.delaiMoy} j`,  icon: '🚚', bg: 'bg-amber-50 border-amber-200',  t: 'text-amber-700'  },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} border rounded-2xl p-5`}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className={`text-xs font-bold uppercase tracking-wide ${s.t} opacity-70 mb-1`}>{s.l}</p>
            <p className={`text-xl font-black font-mono ${s.t}`}>{s.v}</p>
          </div>
        ))}
      </div>

      {(view === 'form-new' || view === 'form-edit') && (
        <div className="app-card overflow-hidden">
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
            saving={saving}
          />
        </div>
      )}

      <div className="app-card">
        <div className="p-5 border-b flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">🏭 Fournisseurs</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {filtered.length} / {fournisseurs.length} fournisseur(s) · {stats.actifs} actif(s)
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="border-2 border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 outline-none bg-white">
              <option value="nom">🔤 Trier par nom</option>
              <option value="note">⭐ Meilleure note</option>
              <option value="delai">🚚 Délai livraison</option>
            </select>
            {view === 'liste'
              ? <Btn onClick={() => { setView('form-new'); setEditTarget(null); }}>+ Nouveau fournisseur</Btn>
              : <button onClick={() => { setView('liste'); setEditTarget(null); }} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all">✕ Annuler</button>
            }
          </div>
        </div>

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

        {filtered.length === 0 ? (
          <EmptyState icon="🏭" title="Aucun fournisseur trouvé" subtitle="Ajoutez vos fournisseurs pour gérer vos approvisionnements." />
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(f => {
              const style     = specStyle(f.specialite);
              const medsCount = (meds || []).filter(m => m.fournisseur === f.nom).length;

              return (
                <div key={f.id}
                  className={`group relative bg-white rounded-2xl border-2 transition-all cursor-pointer overflow-hidden
                    ${f.actif ? `border-slate-200 hover:border-${style.color}-400 hover:shadow-lg` : 'border-slate-100 opacity-60'}`}
                  onClick={() => setSelected(f)}>

                  <div className={`h-1.5 bg-${style.color}-500`} />

                  <div className="p-4">
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

                    <div className="flex items-center gap-1.5 mb-3">
                      <Stars note={f.noteQualite} readonly />
                      <span className="text-xs text-slate-400">{f.noteQualite}/5</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-xs text-slate-400 font-semibold">Produits</p>
                        <p className="text-base font-black text-slate-700">{medsCount}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-xs text-slate-400 font-semibold">Remise</p>
                        <p className="text-base font-black text-slate-700">{f.remise}%</p>
                      </div>
                      <div className={`rounded-xl p-2 text-center ${f.delaiLivraison <= 3 ? 'bg-green-50' : f.delaiLivraison <= 7 ? 'bg-amber-50' : 'bg-red-50'}`}>
                        <p className="text-xs text-slate-400 font-semibold">Délai</p>
                        <p className={`text-base font-black ${f.delaiLivraison <= 3 ? 'text-green-700' : f.delaiLivraison <= 7 ? 'text-amber-700' : 'text-red-700'}`}>
                          {f.delaiLivraison}j
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400">Paiement</p>
                        <p className="font-semibold text-slate-700 text-sm">
                          {CONDITIONS_PAIEMENT.find(c => c.v === f.conditionsPaiement)?.l || f.conditionsPaiement}
                        </p>
                      </div>
                      <p className="text-xs text-slate-300">{f.ville}</p>
                    </div>
                  </div>

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
      </>}

      {activeTab === 'dettes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { l: 'Total dettes',          v: fmtF(totalDette),                                                          icon: '💸', bg: 'bg-red-50 border-red-200',    t: 'text-red-700'    },
              { l: 'Fournisseurs à régler', v: debtData.filter(d => d.solde > 0).length,                                  icon: '🏭', bg: 'bg-amber-50 border-amber-200', t: 'text-amber-700'  },
              { l: 'Total versé',           v: fmtF((versements||[]).reduce((s,v)=>s+(v.montant||0),0)),                  icon: '✅', bg: 'bg-green-50 border-green-200', t: 'text-green-700'  },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} border rounded-2xl p-5`}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <p className={`text-xs font-bold uppercase tracking-wide ${s.t} opacity-70 mb-1`}>{s.l}</p>
                <p className={`text-xl font-black font-mono ${s.t}`}>{s.v}</p>
              </div>
            ))}
          </div>

          <div className="app-card">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">📋 Dettes par fournisseur</h2>
                <p className="text-xs text-slate-400 mt-0.5">{debtData.length} fournisseur(s) avec transactions</p>
              </div>
              <Btn onClick={() => setShowVForm(!showVForm)}>{showVForm ? '✕ Annuler' : '+ Enregistrer un paiement'}</Btn>
            </div>

            {showVForm && (
              <div className="p-5 bg-emerald-50 border-b border-emerald-200">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Fournisseur *</label>
                    <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-emerald-400 outline-none bg-white"
                      value={vForm.fournisseur} onChange={e => setVForm(f => ({...f, fournisseur: e.target.value}))}>
                      <option value="">— Choisir —</option>
                      {debtData.map(d => <option key={d.id} value={d.nom}>{d.nom}{d.solde > 0 ? ` (solde: ${fmtF(d.solde)})` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Montant (F) *</label>
                    <input type="number" min="1" placeholder="0"
                      value={vForm.montant} onChange={e => setVForm(f => ({...f, montant: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-emerald-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Date</label>
                    <input type="date" value={vForm.date} onChange={e => setVForm(f => ({...f, date: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-emerald-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Mode de paiement</label>
                    <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white"
                      value={vForm.mode} onChange={e => setVForm(f => ({...f, mode: e.target.value}))}>
                      {['Espèces','Mobile Money','Virement','Chèque'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Note</label>
                    <input type="text" placeholder="Référence, objet du paiement…"
                      value={vForm.note} onChange={e => setVForm(f => ({...f, note: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-emerald-400 outline-none" />
                  </div>
                </div>
                <Btn onClick={addVersement} disabled={savingV}>{savingV ? '⏳ Enregistrement…' : '✓ Enregistrer le paiement'}</Btn>
              </div>
            )}

            {!debtData.length ? (
              <div className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-semibold">Aucune transaction avec les fournisseurs</p>
                <p className="text-sm mt-1">Les commandes reçues (statut Reçu) et les paiements apparaîtront ici</p>
              </div>
            ) : (
              <div className="divide-y">
                {debtData.map(d => {
                  const versFourn = (versements||[]).filter(v => v.fournisseur === d.nom).sort((a,b) => b.date.localeCompare(a.date))
                  const isExp     = expV === d.id
                  return (
                    <div key={d.id}>
                      <div className="p-5 hover:bg-slate-50 cursor-pointer" onClick={() => setExpV(isExp ? null : d.id)}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-bold text-slate-900">{d.nom}</span>
                              {d.solde > 0
                                ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">🔴 Dette</span>
                                : d.solde < 0
                                  ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">🔵 Crédit</span>
                                  : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✅ Soldé</span>}
                            </div>
                            <p className="text-xs text-slate-400">{d.nbCommandes} commande(s) reçue(s) · {versFourn.length} versement(s)</p>
                          </div>
                          <div className="shrink-0">
                            <div className="flex gap-6 text-center">
                              <div>
                                <p className="text-xs text-slate-400">Commandé</p>
                                <p className="font-black text-sm font-mono text-slate-700">{fmtF(d.totalCmd)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">Versé</p>
                                <p className="font-black text-sm font-mono text-green-600">{fmtF(d.totalVerse)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">Solde</p>
                                <p className={`font-black text-sm font-mono ${d.solde > 0 ? 'text-red-600' : d.solde < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                                  {d.solde !== 0 ? fmtF(Math.abs(d.solde)) : '0 F'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {isExp && (
                        <div className="bg-slate-50 border-t px-5 pb-4">
                          <div className="flex items-center justify-between pt-3 mb-3">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Historique des versements</p>
                            <button onClick={e => { e.stopPropagation(); setVForm(f => ({...f, fournisseur: d.nom})); setShowVForm(true); setExpV(null) }}
                              className="text-xs text-emerald-600 font-bold hover:underline">+ Ajouter un versement</button>
                          </div>
                          {!versFourn.length ? (
                            <p className="text-sm text-slate-400 py-2">Aucun versement enregistré pour ce fournisseur</p>
                          ) : versFourn.map(v => (
                            <div key={v.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-slate-200 mb-2">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs text-slate-400">{v.date}</span>
                                <span className="text-sm font-semibold text-slate-700">{v.mode}</span>
                                {v.note && <span className="text-xs text-slate-400">· {v.note}</span>}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-black text-green-600 font-mono">{fmtF(v.montant)}</span>
                                <button onClick={() => delVersement(v.id)} className="text-red-400 hover:text-red-600 text-xs no-print">🗑</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
