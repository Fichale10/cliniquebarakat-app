import { Factory, Coins, Pencil, Trash2, Star, Pill, Syringe, Wrench, Wheat, Building2, SprayCan, Package, Truck, Tag, User, Phone, Mail, Globe, MapPin, CreditCard, Handshake, Landmark, CheckCircle2, ClipboardList, Receipt } from 'lucide-react'
import { useState, useMemo } from 'react';
import { today, fmtF, findDups } from '../../lib/utils';
import { newId } from '../../lib/db';
import { Btn, Field, DupWarning, EmptyState } from '../../components/ui';

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
  'Médicaments vétérinaires':    { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', icon: Pill },
  'Vaccins et antiparasitaires': { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', icon: Syringe },
  'Matériel et consommables':    { bg: '#faf5ff', border: '#e9d5ff', text: '#9333ea', icon: Wrench },
  'Alimentation animale':        { bg: '#fffbeb', border: '#fde68a', text: '#d97706', icon: Wheat },
  'Équipements médicaux':        { bg: '#ecfeff', border: '#a5f3fc', text: '#0891b2', icon: Building2 },
  'Produits désinfectants':      { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', icon: SprayCan },
  'Autre':                       { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', icon: Package },
};
const specStyle = (s) => SPEC_STYLE[s] || SPEC_STYLE['Autre'];

const toDbRow = (form) => ({
  nom: form.nom, contact: form.contact, tel: form.tel, email: form.email,
  adresse: form.adresse, ville: form.ville, pays: form.pays,
  specialite: form.specialite,
  delai_livraison:     parseInt(form.delaiLivraison) || 5,
  conditions_paiement: form.conditionsPaiement,
  remise:              parseFloat(form.remise) || 0,
  note_qualite:        parseInt(form.noteQualite) || 3,
  actif: form.actif, notes: form.notes,
  date_debut: form.dateDebut || null,
  rib: form.rib, site_web: form.siteWeb,
});

// ── Stars ────────────────────────────────────────────────────────
function Stars({ note, onChange, readonly = false }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={readonly ? undefined : () => onChange(n)}
          style={{ cursor: readonly ? 'default' : 'pointer', background: 'none', border: 'none', padding: 0, fontSize: 16, transition: 'transform .12s' }}
          onMouseEnter={e => { if (!readonly) e.currentTarget.style.transform = 'scale(1.25)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
          <span style={{ color: n <= note ? '#f59e0b' : '#e2e8f0' }}>★</span>
        </button>
      ))}
    </div>
  );
}

// ── Formulaire ───────────────────────────────────────────────────
function FormulaireF({ initial, onSave, onCancel, saving }) {
  const empty = {
    nom: '', contact: '', tel: '', email: '', adresse: '', ville: 'Anié', pays: 'Togo',
    specialite: 'Médicaments vétérinaires', delaiLivraison: 5,
    conditionsPaiement: '30j', remise: 0, noteQualite: 3,
    actif: true, notes: '', dateDebut: today(), rib: '', siteWeb: '',
  };
  const [form, setForm] = useState(initial || empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const Section = ({ title }) => (
    <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10, marginTop: 4 }}>{title}</p>
  );

  return (
    <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg,#f0fdfa,#f5fffe)', borderBottom: '1px solid rgba(13,148,136,0.15)' }}>
      <h3 style={{ fontWeight: 800, color: '#0f766e', fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        {initial ? 'Modifier le fournisseur' : '+ Nouveau fournisseur'}
      </h3>

      <Section title="Identité" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label="Raison sociale *" value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex: MediVet SARL" className="md:col-span-2" />
        <Field label="Spécialité" value={form.specialite} onChange={e => set('specialite', e.target.value)} options={SPECIALITES} />
        <Field label="Responsable commercial" value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="Nom du contact" />
        <Field label="Téléphone" value={form.tel} onChange={e => set('tel', e.target.value)} placeholder="+228 XX XX XX XX" />
        <Field label="Email" value={form.email} onChange={e => set('email', e.target.value)} type="email" placeholder="contact@fournisseur.com" />
        <Field label="Site web" value={form.siteWeb} onChange={e => set('siteWeb', e.target.value)} placeholder="www.fournisseur.com" />
        <Field label="Adresse" value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="Rue, quartier" />
        <Field label="Ville" value={form.ville} onChange={e => set('ville', e.target.value)} placeholder="Anié" />
        <Field label="Pays" value={form.pays} onChange={e => set('pays', e.target.value)} options={['Togo','Bénin','Ghana',"Côte d'Ivoire",'Nigeria','Sénégal','France','Autre']} />
      </div>

      <Section title="Conditions commerciales" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Field label="Délai livraison (jours)" value={form.delaiLivraison} onChange={e => set('delaiLivraison', parseInt(e.target.value)||0)} type="number" placeholder="5" />
        <Field label="Conditions de paiement" value={form.conditionsPaiement} onChange={e => set('conditionsPaiement', e.target.value)} options={CONDITIONS_PAIEMENT.map(c => c.v)} />
        <Field label="Remise habituelle (%)" value={form.remise} onChange={e => set('remise', parseFloat(e.target.value)||0)} type="number" placeholder="0" />
        <Field label="Date 1ère collaboration" value={form.dateDebut} onChange={e => set('dateDebut', e.target.value)} type="date" />
      </div>

      <Section title="Évaluation & Notes" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 8 }}>Note qualité</label>
          <Stars note={form.noteQualite} onChange={v => set('noteQualite', v)} />
        </div>
        <Field label="RIB / Coordonnées bancaires" value={form.rib} onChange={e => set('rib', e.target.value)} placeholder="TG53 TG009 001 00123..." />
      </div>
      <Field label="Notes internes" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Observations, conditions particulières…" />

      <div className="flex gap-2 mt-5">
        <Btn color="brand" onClick={() => onSave(form)} disabled={saving}>
          {saving ? 'Enregistrement…' : `✓ ${initial ? 'Enregistrer les modifications' : 'Créer le fournisseur'}`}
        </Btn>
        <button onClick={onCancel} style={{ padding: '8px 16px', fontSize: 13, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Annuler</button>
      </div>
    </div>
  );
}

// ── Fiche modale ─────────────────────────────────────────────────
function FicheFournisseur({ f, meds, onEdit, onClose }) {
  const s       = specStyle(f.specialite);
  const medsF   = (meds || []).filter(m => m.fournisseur === f.nom);
  const condLabel = CONDITIONS_PAIEMENT.find(c => c.v === f.conditionsPaiement)?.l || f.conditionsPaiement;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: 'white', borderRadius: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.22)', width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ background: s.bg, borderBottom: `1px solid ${s.border}`, padding: '20px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: s.bg, border: `2px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <s.icon size={26} color={s.text} strokeWidth={2} />
              </div>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>{f.nom}</h2>
                <p style={{ fontSize: 13, fontWeight: 600, color: s.text, marginTop: 2 }}>{f.specialite}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <Stars note={f.noteQualite} readonly />
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{f.noteQualite}/5</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: f.actif ? '#f0fdf4' : '#fef2f2', color: f.actif ? '#16a34a' : '#dc2626', border: `1px solid ${f.actif ? '#bbf7d0' : '#fecaca'}` }}>
                    {f.actif ? '✓ Actif' : '✕ Inactif'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={onEdit} color="slate" sm><Pencil size={12} strokeWidth={2.4} style={{display:'inline',marginRight:4}} />Modifier</Btn>
              <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        </div>

        {/* Corps scrollable */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { l: 'Note qualité', v: `${f.noteQualite}/5`,    icon: Star, bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
              { l: 'Produits',     v: medsF.length,             icon: Pill, bg: '#faf5ff', border: '#e9d5ff', text: '#9333ea' },
              { l: 'Délai livr.',  v: `${f.delaiLivraison}j`,  icon: Truck, bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
              { l: 'Remise',       v: `${f.remise}%`,           icon: Tag, bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
            ].map((k, i) => (
              <div key={i} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ marginBottom: 4, display:'flex', justifyContent:'center' }}><k.icon size={19} color={k.text} strokeWidth={2.2} /></div>
                <div style={{ fontSize: 17, fontWeight: 900, color: k.text, fontVariantNumeric: 'tabular-nums' }}>{k.v}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: k.text, opacity: .7, textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* Contact + Conditions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <InfoBox title="Contact">
              {f.contact && <InfoRow icon={User} val={f.contact} />}
              {f.tel     && <InfoRow icon={Phone} val={f.tel}   link={`tel:${f.tel}`} />}
              {f.email   && <InfoRow icon={Mail} val={f.email} link={`mailto:${f.email}`} />}
              {f.siteWeb && <InfoRow icon={Globe} val={f.siteWeb} link={`https://${f.siteWeb}`} />}
              <InfoRow icon={MapPin} val={[f.adresse, f.ville, f.pays].filter(Boolean).join(', ') || '—'} />
            </InfoBox>
            <InfoBox title="Conditions commerciales">
              <InfoRow icon={CreditCard} val={condLabel}                         label="Paiement" />
              <InfoRow icon={Tag} val={`${f.remise}%`}                    label="Remise" />
              <InfoRow icon={Truck} val={`${f.delaiLivraison} jours ouvrés`} label="Délai" />
              <InfoRow icon={Handshake} val={f.dateDebut || '—'}                 label="Partenariat depuis" />
              {f.rib && <InfoRow icon={Landmark} val={f.rib} label="RIB" mono />}
            </InfoBox>
          </div>

          {f.notes && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Notes internes</p>
              <p style={{ fontSize: 13, color: '#92400e' }}>{f.notes}</p>
            </div>
          )}

          {medsF.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Médicaments approvisionnés ({medsF.length})</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {medsF.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: 12, border: '1px solid #f1f5f9', padding: '10px 12px' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{m.nom}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8' }}>{m.ref} · {m.categorie}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>{fmtF(m.prixAchat)}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8' }}>Stk: {m.stock}</p>
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

function InfoBox({ title, children }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 14, padding: '14px 16px' }}>
      <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, val, label, link, mono }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <Icon size={14} color="#94a3b8" strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ minWidth: 0 }}>
        {label && <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 1 }}>{label}</p>}
        {link
          ? <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>{val}</a>
          : <p style={{ fontSize: mono ? 11 : 13, color: '#475569', wordBreak: 'break-word', fontFamily: mono ? 'monospace' : 'inherit' }}>{val}</p>
        }
      </div>
    </div>
  );
}

// ── Composant principal ──────────────────────────────────────────
export default function Fournisseurs({ fournisseurs = [], setFournisseurs, meds = [], sb, dbInsert, dbUpdate, dbDelete, versements = [], setVersements, achatsHist = [] }) {
  const [view,        setView]        = useState('liste');
  const [selected,    setSelected]    = useState(null);
  const [editTarget,  setEditTarget]  = useState(null);
  const [dups,        setDups]        = useState([]);
  const [pending,     setPending]     = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [activeTab,   setActiveTab]   = useState('liste');
  const [showVForm,   setShowVForm]   = useState(false);
  const [savingV,     setSavingV]     = useState(false);
  const [expV,        setExpV]        = useState(null);
  const [vForm,       setVForm]       = useState({ fournisseur: '', montant: '', date: today(), mode: 'Espèces', note: '' });
  const [search,      setSearch]      = useState('');
  const [fSpec,       setFSpec]       = useState('');
  const [fActif,      setFActif]      = useState('');
  const [fNote,       setFNote]       = useState('');
  const [sortBy,      setSortBy]      = useState('nom');

  // ── Handlers (inchangés) ──────────────────────────────────────
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
      setView('liste'); setEditTarget(null); setDups([]); setPending(null);
    } catch (e) { alert('Erreur : ' + (e?.message || e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const f = fournisseurs.find(x => x.id === id);
    if (!confirm(`Supprimer "${f?.nom}" ? Cette action est irréversible.`)) return;
    try {
      await dbDelete(sb, 'fournisseurs', id);
      setFournisseurs(fournisseurs.filter(x => x.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (e) { alert('Erreur suppression : ' + (e?.message || e)); }
  };

  const toggleActif = async (id) => {
    const f = fournisseurs.find(x => x.id === id);
    if (!f) return;
    const actif = !f.actif;
    try {
      await dbUpdate(sb, 'fournisseurs', id, { actif });
      setFournisseurs(fournisseurs.map(x => x.id === id ? { ...x, actif } : x));
    } catch (e) { alert('Erreur : ' + (e?.message || e)); }
  };

  const filtered = useMemo(() => {
    let r = [...fournisseurs];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(f => f.nom.toLowerCase().includes(q) || (f.contact||'').toLowerCase().includes(q) || (f.ville||'').toLowerCase().includes(q) || (f.specialite||'').toLowerCase().includes(q));
    }
    if (fSpec)              r = r.filter(f => f.specialite === fSpec);
    if (fActif === 'actif')   r = r.filter(f => f.actif);
    if (fActif === 'inactif') r = r.filter(f => !f.actif);
    if (fNote)              r = r.filter(f => f.noteQualite >= parseInt(fNote));
    r.sort((a, b) => {
      if (sortBy === 'note')  return (b.noteQualite||0) - (a.noteQualite||0);
      if (sortBy === 'delai') return (a.delaiLivraison||99) - (b.delaiLivraison||99);
      return a.nom.localeCompare(b.nom);
    });
    return r;
  }, [fournisseurs, search, fSpec, fActif, fNote, sortBy]);

  const stats = useMemo(() => {
    const actifs   = fournisseurs.filter(f => f.actif).length;
    const noteAvg  = fournisseurs.length ? (fournisseurs.reduce((s,f) => s+(f.noteQualite||0),0)/fournisseurs.length).toFixed(1) : '—';
    const delaiMoy = fournisseurs.length ? Math.round(fournisseurs.reduce((s,f) => s+(f.delaiLivraison||0),0)/fournisseurs.length) : 0;
    return { actifs, noteAvg, delaiMoy };
  }, [fournisseurs]);

  const activeFilters = [fSpec, fActif, fNote].filter(Boolean).length;
  const resetFilters  = () => { setSearch(''); setFSpec(''); setFActif(''); setFNote(''); };

  const debtData = useMemo(() => fournisseurs.map(f => {
    const recu     = (achatsHist||[]).filter(c => c.fournisseur === f.nom && c.statut === 'Reçu');
    const totalCmd = recu.reduce((s,c) => s+(c.total||0), 0);
    const totalVerse = (versements||[]).filter(v => v.fournisseur === f.nom).reduce((s,v) => s+(v.montant||0), 0);
    return { ...f, totalCmd, totalVerse, solde: totalCmd - totalVerse, nbCommandes: recu.length };
  }).filter(d => d.totalCmd > 0 || d.totalVerse > 0).sort((a,b) => b.solde - a.solde), [fournisseurs, achatsHist, versements]);

  const totalDette  = debtData.reduce((s,d) => s + Math.max(0, d.solde), 0);
  const totalVerse  = (versements||[]).reduce((s,v) => s+(v.montant||0), 0);

  const addVersement = async () => {
    if (!vForm.fournisseur) return alert('Sélectionnez un fournisseur');
    const m = parseInt(vForm.montant);
    if (isNaN(m) || m <= 0) return alert('Montant invalide');
    setSavingV(true);
    try {
      const row = { id: newId(), fournisseur: vForm.fournisseur, montant: m, date: vForm.date, mode: vForm.mode, note: vForm.note||'' };
      const saved = await dbInsert(sb, 'versements_fournisseurs', row);
      setVersements([saved, ...(versements||[])]);
      setVForm({ fournisseur:'', montant:'', date: today(), mode:'Espèces', note:'' });
      setShowVForm(false);
    } catch(e) { alert('Erreur : ' + (e?.message||e)); }
    finally { setSavingV(false); }
  };

  const delVersement = async (id) => {
    if (!confirm('Supprimer ce versement ?')) return;
    try {
      await dbDelete(sb, 'versements_fournisseurs', id);
      setVersements((versements||[]).filter(v => v.id !== id));
    } catch(e) { alert('Erreur : ' + (e?.message||e)); }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="app-page space-y-5">

      {/* Modale fiche */}
      {selected && !editTarget && (
        <FicheFournisseur f={selected} meds={meds}
          onEdit={() => { setEditTarget(selected); setView('form-edit'); }}
          onClose={() => setSelected(null)} />
      )}

      {/* Tabs pill */}
      <div style={{ display:'flex', gap:4, background:'#f1f5f9', borderRadius:14, padding:4, width:'fit-content' }}>
        {[
            { k:'liste',  l:'Fournisseurs',       c: fournisseurs.length },
            { k:'dettes', l:'Dettes & Paiements', c: debtData.filter(d=>d.solde>0).length },
        ].map(t => (
          <button key={t.k} onClick={() => setActiveTab(t.k)} style={{
            padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
            background: activeTab===t.k ? 'white' : 'transparent',
            color:      activeTab===t.k ? '#0d9488' : '#64748b',
            boxShadow:  activeTab===t.k ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>
            {t.l}
            <span style={{ marginLeft:6, fontSize:10, fontWeight:800, background: activeTab===t.k?'#f0fdfa':'#e2e8f0', color: activeTab===t.k?'#0d9488':'#94a3b8', padding:'1px 6px', borderRadius:99 }}>{t.c}</span>
          </button>
        ))}
      </div>

      {/* ══ ONGLET LISTE ══ */}
      {activeTab === 'liste' && <>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon:Factory, label:'Fournisseurs actifs', value: stats.actifs,           sub: `sur ${fournisseurs.length} total`,   color:'#0d9488' },
            { icon:ClipboardList, label:'Total fournisseurs',  value: fournisseurs.length,    sub: `${fournisseurs.length - stats.actifs} inactif(s)`, color:'#2563eb' },
            { icon:Star, label:'Note qualité moy.',   value: `${stats.noteAvg}/5`,   sub: 'évaluation moyenne',                 color:'#d97706' },
            { icon:Truck, label:'Délai livr. moyen',   value: `${stats.delaiMoy} j`,  sub: 'jours ouvrés',                       color:'#9333ea' },
          ].map((k,i) => (
            <div key={i} style={{ background:'white', borderRadius:16, padding:'14px 16px', border:'1px solid #f1f5f9', boxShadow:'0 1px 3px rgba(0,0,0,0.04),0 6px 20px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:34,height:34,borderRadius:10, background:k.color+'18', display:'flex',alignItems:'center',justifyContent:'center' }}><k.icon size={16} color={k.color} strokeWidth={2.3} /></div>
                <span style={{ fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em' }}>{k.label}</span>
              </div>
              <div style={{ fontSize:20,fontWeight:900,color:'#0f172a',lineHeight:1 }}>{k.value}</div>
              <div style={{ fontSize:11,color:'#94a3b8',marginTop:4 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Formulaire */}
        {(view === 'form-new' || view === 'form-edit') && (
          <div className="app-card overflow-hidden">
            {dups.length > 0 && pending && (
              <div className="p-5 pb-0">
                <DupWarning dups={dups} onOk={() => handleSave(pending, true)} onCancel={() => { setDups([]); setPending(null); }} />
              </div>
            )}
            <FormulaireF initial={editTarget} onSave={handleSave}
              onCancel={() => { setView('liste'); setEditTarget(null); setDups([]); setPending(null); }}
              saving={saving} />
          </div>
        )}

        {/* Carte liste */}
        <div className="app-card">
          <div style={{ padding:'18px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <div>
              <h2 style={{ fontSize:20,fontWeight:900,display:'flex',alignItems:'center',gap:8 }}><Factory size={20} color="#ea580c" strokeWidth={2.3} /> Fournisseurs</h2>
              <p style={{ fontSize:12,color:'#94a3b8',marginTop:2 }}>{filtered.length}/{fournisseurs.length} · {stats.actifs} actif(s)</p>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ border:'1.5px solid #e2e8f0', borderRadius:10, padding:'7px 10px', fontSize:12, fontWeight:700, color:'#64748b', outline:'none', background:'white' }}>
                <option value="nom">Par nom</option>
                <option value="note">Meilleure note</option>
                <option value="delai">Délai livraison</option>
              </select>
              {view === 'liste'
                ? <Btn color="brand" onClick={() => { setView('form-new'); setEditTarget(null); }}>+ Nouveau</Btn>
                : <button onClick={() => { setView('liste'); setEditTarget(null); }} style={{ padding:'8px 14px', borderRadius:10, fontSize:13, fontWeight:700, border:'1px solid #e2e8f0', background:'white', color:'#64748b', cursor:'pointer' }}>✕ Annuler</button>
              }
            </div>
          </div>

          {/* Filtres */}
          <div style={{ padding:'12px 20px', borderBottom:'1px solid #f8fafc', display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, contact, ville…"
              style={{ flex:'1 1 180px', minWidth:150, padding:'8px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none' }} />
            <select value={fSpec} onChange={e => setFSpec(e.target.value)}
              style={{ padding:'8px 10px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, background:'white', color: fSpec?'#0f172a':'#94a3b8', outline:'none' }}>
              <option value="">Toutes spécialités</option>
              {SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={fActif} onChange={e => setFActif(e.target.value)}
              style={{ padding:'8px 10px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, background:'white', color: fActif?'#0f172a':'#94a3b8', outline:'none' }}>
              <option value="">Tous statuts</option>
              <option value="actif">✓ Actifs</option>
              <option value="inactif">✕ Inactifs</option>
            </select>
            <select value={fNote} onChange={e => setFNote(e.target.value)}
              style={{ padding:'8px 10px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, background:'white', color: fNote?'#0f172a':'#94a3b8', outline:'none' }}>
              <option value="">Toutes notes</option>
                <option value="3">★★★ et +</option>
                <option value="4">★★★★ et +</option>
                <option value="5">★★★★★</option>
            </select>
            {activeFilters > 0 && (
              <button onClick={resetFilters} style={{ padding:'8px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:12, fontWeight:700, background:'white', color:'#64748b', cursor:'pointer' }}>
                ✕ Effacer ({activeFilters})
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Factory} title="Aucun fournisseur trouvé" subtitle="Ajoutez vos fournisseurs pour gérer vos approvisionnements." />
          ) : (
            <div style={{ padding:16, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
              {filtered.map(f => {
                const s         = specStyle(f.specialite);
                const medsCount = (meds||[]).filter(m => m.fournisseur === f.nom).length;
                const debt      = debtData.find(d => d.id === f.id);
                const hasDette  = debt && debt.solde > 0;
                return (
                  <div key={f.id} onClick={() => setSelected(f)}
                    style={{ background:'white', borderRadius:16, border:`1.5px solid ${f.actif?'#f1f5f9':'#f1f5f9'}`, cursor:'pointer', overflow:'hidden', transition:'all .18s', position:'relative', opacity: f.actif?1:.65 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = s.border; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}>

                    {/* Bande couleur top */}
                    <div style={{ height:4, background: `linear-gradient(90deg,${s.text},${s.text}88)` }} />

                    <div style={{ padding:'14px 16px' }}>
                      {/* Header */}
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                          <div style={{ width:40,height:40,borderRadius:12,background:s.bg,border:`1.5px solid ${s.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                            <s.icon size={19} color={s.text} strokeWidth={2.1} />
                          </div>
                          <div style={{ minWidth:0 }}>
                            <h3 style={{ fontWeight:800,fontSize:14,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:160 }}>{f.nom}</h3>
                            {f.contact && <p style={{ fontSize:11,color:'#94a3b8',marginTop:1 }}>{f.contact}</p>}
                          </div>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                          <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:f.actif?'#f0fdf4':'#fef2f2',color:f.actif?'#16a34a':'#dc2626',border:`1px solid ${f.actif?'#bbf7d0':'#fecaca'}` }}>
                            {f.actif?'Actif':'Inactif'}
                          </span>
                          {hasDette && <span style={{ fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:99,background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca' }}>Dette</span>}
                        </div>
                      </div>

                      {/* Note étoiles */}
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
                        <Stars note={f.noteQualite} readonly />
                        <span style={{ fontSize:11,color:'#94a3b8' }}>{f.noteQualite}/5</span>
                      </div>

                      {/* Mini stats */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:12 }}>
                        {[
                          { l:'Produits', v: medsCount, bg:'#f8fafc', tc:'#475569' },
                          { l:'Remise',   v: `${f.remise}%`, bg:'#f0fdf4', tc:'#16a34a' },
                          { l:'Délai',    v: `${f.delaiLivraison}j`,
                            bg: f.delaiLivraison<=3?'#f0fdf4':f.delaiLivraison<=7?'#fffbeb':'#fef2f2',
                            tc: f.delaiLivraison<=3?'#16a34a':f.delaiLivraison<=7?'#d97706':'#dc2626' },
                        ].map((st,i) => (
                          <div key={i} style={{ background:st.bg,borderRadius:10,padding:'7px 6px',textAlign:'center' }}>
                            <div style={{ fontSize:14,fontWeight:900,color:st.tc }}>{st.v}</div>
                            <div style={{ fontSize:10,fontWeight:600,color:'#94a3b8' }}>{st.l}</div>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:11,color:'#64748b',fontWeight:600 }}>
                          {CONDITIONS_PAIEMENT.find(c=>c.v===f.conditionsPaiement)?.l||f.conditionsPaiement}
                        </span>
                        <span style={{ fontSize:11,color:'#cbd5e1' }}>{f.ville}</span>
                      </div>
                    </div>

                    {/* Actions hover */}
                    <div className="no-print" onClick={e => e.stopPropagation()}
                      style={{ position:'absolute',top:12,right:12,display:'flex',gap:4,opacity:0,transition:'opacity .15s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity=1}
                      ref={el => { if(el) { const card=el.closest('[data-hover]')||el.parentElement; card.addEventListener('mouseenter',()=>{el.style.opacity=1}); card.addEventListener('mouseleave',()=>{el.style.opacity=0}); } }}>
                      <button onClick={() => { setEditTarget(f); setView('form-edit'); }}
                        style={{ width:28,height:28,borderRadius:8,background:'white',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#d97706' }}><Pencil size={13} strokeWidth={2.4} /></button>
                      <button onClick={() => toggleActif(f.id)}
                        style={{ width:28,height:28,borderRadius:8,background:'white',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,cursor:'pointer' }}>{f.actif?'⏸':'▶'}</button>
                      <button onClick={() => handleDelete(f.id)}
                        style={{ width:28,height:28,borderRadius:8,background:'white',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#ef4444' }}><Trash2 size={13} strokeWidth={2.4} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>}

      {/* ══ ONGLET DETTES ══ */}
      {activeTab === 'dettes' && (
        <div className="space-y-4">
          {/* KPIs dettes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon:Receipt, label:'Total dettes',           value: fmtF(totalDette),                                  color:'#dc2626', sub: `${debtData.filter(d=>d.solde>0).length} fournisseur(s) à régler` },
              { icon:Factory, label:'Fournisseurs à régler',  value: debtData.filter(d=>d.solde>0).length,              color:'#d97706', sub: 'avec solde positif' },
              { icon:CheckCircle2, label:'Total versé',            value: fmtF(totalVerse),                                  color:'#16a34a', sub: `${(versements||[]).length} versement(s)` },
            ].map((k,i) => (
              <div key={i} style={{ background:'white', borderRadius:16, padding:'14px 16px', border:'1px solid #f1f5f9', boxShadow:'0 1px 3px rgba(0,0,0,0.04),0 6px 20px rgba(0,0,0,0.04)' }}>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                  <div style={{ width:34,height:34,borderRadius:10,background:k.color+'18',display:'flex',alignItems:'center',justifyContent:'center' }}><k.icon size={16} color={k.color} strokeWidth={2.3} /></div>
                  <span style={{ fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em' }}>{k.label}</span>
                </div>
                <div style={{ fontSize:20,fontWeight:900,color:'#0f172a',lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:11,color:'#94a3b8',marginTop:4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="app-card">
            <div style={{ padding:'18px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
              <div>
                <h2 style={{ fontSize:18,fontWeight:900,display:'flex',alignItems:'center',gap:8 }}><Coins size={18} color="#ea580c" /> Dettes par fournisseur</h2>
                <p style={{ fontSize:12,color:'#94a3b8',marginTop:2 }}>{debtData.length} fournisseur(s) avec transactions</p>
              </div>
              <Btn color="brand" onClick={() => setShowVForm(!showVForm)}>{showVForm?'✕ Annuler':'+ Enregistrer un paiement'}</Btn>
            </div>

            {/* Formulaire versement */}
            {showVForm && (
              <div style={{ padding:'18px 20px', background:'linear-gradient(135deg,#f0fdfa,#f5fffe)', borderBottom:'1px solid rgba(13,148,136,0.15)' }}>
                <h3 style={{ fontWeight:800,color:'#0f766e',fontSize:14,marginBottom:14 }}>Nouveau paiement fournisseur</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:5 }}>Fournisseur *</label>
                    <select style={{ width:'100%',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'8px 10px',fontSize:13,outline:'none',background:'white' }}
                      value={vForm.fournisseur} onChange={e => setVForm(f=>({...f,fournisseur:e.target.value}))}>
                      <option value="">— Choisir —</option>
                      {debtData.map(d => <option key={d.id} value={d.nom}>{d.nom}{d.solde>0?` (${fmtF(d.solde)})`:''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:5 }}>Montant (F) *</label>
                    <input type="number" min="1" placeholder="0" value={vForm.montant} onChange={e => setVForm(f=>({...f,montant:e.target.value}))}
                      style={{ width:'100%',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'8px 10px',fontSize:13,outline:'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:5 }}>Date</label>
                    <input type="date" value={vForm.date} onChange={e => setVForm(f=>({...f,date:e.target.value}))}
                      style={{ width:'100%',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'8px 10px',fontSize:13,outline:'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:5 }}>Mode</label>
                    <select style={{ width:'100%',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'8px 10px',fontSize:13,outline:'none',background:'white' }}
                      value={vForm.mode} onChange={e => setVForm(f=>({...f,mode:e.target.value}))}>
                      {['Espèces','Mobile Money','Virement','Chèque'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label style={{ fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:5 }}>Note</label>
                    <input type="text" placeholder="Référence, objet du paiement…" value={vForm.note} onChange={e => setVForm(f=>({...f,note:e.target.value}))}
                      style={{ width:'100%',border:'1.5px solid #e2e8f0',borderRadius:10,padding:'8px 10px',fontSize:13,outline:'none' }} />
                  </div>
                </div>
                <Btn color="brand" onClick={addVersement} disabled={savingV}>{savingV?'Enregistrement…':'✓ Enregistrer le paiement'}</Btn>
              </div>
            )}

            {!debtData.length ? (
              <div style={{ textAlign:'center',padding:'48px 24px',color:'#94a3b8' }}>
                <div style={{ marginBottom:8, display:'flex', justifyContent:'center' }}><CheckCircle2 size={36} color="#86efac" strokeWidth={1.8} /></div>
                <p style={{ fontWeight:700,color:'#475569' }}>Aucune transaction avec les fournisseurs</p>
                <p style={{ fontSize:13,marginTop:4 }}>Les commandes reçues et paiements apparaîtront ici</p>
              </div>
            ) : (
              <div style={{ padding:16, display:'flex', flexDirection:'column', gap:8 }}>
                {debtData.map(d => {
                  const versFourn = (versements||[]).filter(v => v.fournisseur === d.nom).sort((a,b)=>b.date.localeCompare(a.date));
                  const isExp     = expV === d.id;
                  const pctPaye   = d.totalCmd > 0 ? Math.min(100, Math.round(d.totalVerse / d.totalCmd * 100)) : 100;
                  const soldeLbl  = d.solde > 0 ? { bg:'#fef2f2',border:'#fecaca',color:'#dc2626',label:'Dette' }
                                  : d.solde < 0 ? { bg:'#eff6ff',border:'#bfdbfe',color:'#2563eb',label:'Crédit' }
                                  :               { bg:'#f0fdf4',border:'#bbf7d0',color:'#16a34a',label:'Soldé' };
                  return (
                    <div key={d.id} style={{ borderRadius:14, border:`1px solid ${isExp?'#99f6e4':'#f1f5f9'}`, background: isExp?'#fafffe':'white', overflow:'hidden', transition:'all .15s' }}>
                      <button type="button" onClick={() => setExpV(isExp?null:d.id)}
                        style={{ width:'100%',background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:'14px 16px',display:'flex',alignItems:'center',gap:14 }}>
                        {/* Logo fournisseur */}
                        <div style={{ width:40,height:40,borderRadius:12,background:specStyle(d.specialite).bg,border:`1.5px solid ${specStyle(d.specialite).border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                          {(() => { const st = specStyle(d.specialite); const SIcon = st.icon; return SIcon ? <SIcon size={19} color={st.text} strokeWidth={2.1} /> : null })()}
                        </div>

                        {/* Infos */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap' }}>
                            <span style={{ fontWeight:800,fontSize:14,color:'#0f172a' }}>{d.nom}</span>
                            <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:soldeLbl.bg,border:`1px solid ${soldeLbl.border}`,color:soldeLbl.color }}>{soldeLbl.label}</span>
                          </div>
                          <p style={{ fontSize:11,color:'#94a3b8',marginBottom:6 }}>{d.nbCommandes} commande(s) · {versFourn.length} versement(s)</p>
                          {/* Barre de progression */}
                          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                            <div style={{ flex:1,height:6,borderRadius:99,background:'#f1f5f9',overflow:'hidden' }}>
                              <div style={{ width:`${pctPaye}%`,height:'100%',background: pctPaye>=100?'#22c55e':pctPaye>=50?'#f59e0b':'#ef4444',borderRadius:99,transition:'width .4s' }} />
                            </div>
                            <span style={{ fontSize:10,fontWeight:700,color:'#94a3b8',flexShrink:0 }}>{pctPaye}% payé</span>
                          </div>
                        </div>

                        {/* Montants */}
                        <div style={{ display:'flex',gap:16,textAlign:'center',flexShrink:0 }}>
                          {[
                            { l:'Commandé', v: fmtF(d.totalCmd),   c:'#475569' },
                            { l:'Versé',    v: fmtF(d.totalVerse), c:'#16a34a' },
                            { l:'Solde',    v: d.solde!==0?fmtF(Math.abs(d.solde)):'0 F', c: d.solde>0?'#dc2626':d.solde<0?'#2563eb':'#16a34a' },
                          ].map((col,i) => (
                            <div key={i}>
                              <div style={{ fontSize:10,color:'#94a3b8',marginBottom:2 }}>{col.l}</div>
                              <div style={{ fontSize:13,fontWeight:900,color:col.c,fontVariantNumeric:'tabular-nums' }}>{col.v}</div>
                            </div>
                          ))}
                        </div>
                        <span style={{ color:'#cbd5e1',fontSize:12,flexShrink:0 }}>{isExp?'▲':'▼'}</span>
                      </button>

                      {/* Versements déplié */}
                      {isExp && (
                        <div style={{ padding:'0 16px 14px',borderTop:'1px solid #f0fdfa' }}>
                          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:12,marginBottom:10 }}>
                            <p style={{ fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.06em' }}>Historique des versements</p>
                            <button onClick={e => { e.stopPropagation(); setVForm(f=>({...f,fournisseur:d.nom})); setShowVForm(true); setExpV(null); }}
                              style={{ fontSize:12,fontWeight:700,color:'#0d9488',background:'none',border:'none',cursor:'pointer' }}>+ Ajouter</button>
                          </div>
                          {!versFourn.length ? (
                            <p style={{ fontSize:13,color:'#94a3b8',padding:'8px 0' }}>Aucun versement enregistré</p>
                          ) : versFourn.map(v => (
                            <div key={v.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'white',borderRadius:10,border:'1px solid #f1f5f9',padding:'10px 12px',marginBottom:6 }}>
                              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                                <span style={{ fontFamily:'monospace',fontSize:11,color:'#94a3b8' }}>{v.date}</span>
                                <span style={{ fontSize:12,fontWeight:700,color:'#475569' }}>{v.mode}</span>
                                {v.note && <span style={{ fontSize:11,color:'#94a3b8' }}>· {v.note}</span>}
                              </div>
                              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                                <span style={{ fontSize:14,fontWeight:900,color:'#16a34a',fontVariantNumeric:'tabular-nums' }}>{fmtF(v.montant)}</span>
                                <button onClick={() => delVersement(v.id)} style={{ color:'#f87171',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center' }}><Trash2 size={13} strokeWidth={2.4} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
