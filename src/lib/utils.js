// ============================================================
//  src/lib/utils.js — Fonctions utilitaires pures (pas de JSX)
//  Importer dans n'importe quel fichier :
//  import { today, fmtF, getCache, setCache, ... } from '../lib/utils'
//  import { today, fmtF, getCache, setCache, ... } from '../../lib/utils'
// ============================================================

// ── Formatage ───────────────────────────────────────────────
export const fmtF   = n  => Number(n || 0).toLocaleString('fr-FR') + ' F';
export const today  = () => new Date().toISOString().split('T')[0];
export const newId  = () => {
  try { return crypto.randomUUID(); }
  catch { return 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2); }
};

// ── Print ────────────────────────────────────────────────────
export function printZone(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('print-zone');
  window.print();
  setTimeout(() => el.classList.remove('print-zone'), 500);
}

// ── Recherche floue ──────────────────────────────────────────
export function sim(a, b) {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  let m = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) m++;
  return m / Math.max(a.length, b.length);
}
export function findDups(name, list, key = 'nom') {
  return list.filter(x => sim(name, x[key]) >= 0.7);
}

// ── LocalStorage cache ───────────────────────────────────────
export const getCache = t => {
  try { return JSON.parse(localStorage.getItem('lb_' + t) || 'null'); }
  catch { return null; }
};
export const setCache = (t, d) => {
  try { localStorage.setItem('lb_' + t, JSON.stringify(d)); }
  catch {}
};

// ── Offline queue ────────────────────────────────────────────
const Q_KEY = 'lb_offlineQueue';
export const getQ  = () => { try { return JSON.parse(localStorage.getItem(Q_KEY) || '[]'); } catch { return []; } };
const saveQ = q => localStorage.setItem(Q_KEY, JSON.stringify(q));
const enqueue = op => { const q = getQ(); q.push({ ...op, ts: Date.now() }); saveQ(q); };

// ── Données par défaut ───────────────────────────────────────
export const DEFAULT_TEAM = [
  { id: 1, nom: '', role: 'Vétérinaire', tel: '', actif: true },
  { id: 2, nom: '', role: 'Vétérinaire', tel: '', actif: true },
  { id: 3, nom: '', role: 'ASV',         tel: '', actif: true },
  { id: 4, nom: '', role: 'ASV',         tel: '', actif: true },
];

export const COMPTES_DEFAULT = [
  { id: 1, email: 'admin@labarakat.tg', pw: 'admin123', nom: 'Administrateur',  role: 'admin',       actif: true },
  { id: 2, email: 'dr1@labarakat.tg',   pw: 'user123',  nom: 'Dr. Vétérinaire', role: 'utilisateur', actif: true },
  { id: 3, email: 'asv@labarakat.tg',   pw: 'user123',  nom: 'ASV Accueil',     role: 'utilisateur', actif: true },
];

export const INIT_PATIENTS = [
  { id: 1, nom: 'Rex',   espece: 'Chien', race: 'Berger Allemand', age: '3 ans', sexe: 'M', proprio: 'Dupont Jean',  tel: '+228 90 12 34 56', poids: '32 kg',  couleur: 'Fauve/Noir', allergies: 'Pénicilline', antecedents: 'Otite ext. 2023, Gastrite 2022' },
  { id: 2, nom: 'Mimi',  espece: 'Chat',  race: 'Siamois',         age: '2 ans', sexe: 'F', proprio: 'Martin Sophie', tel: '+228 91 23 45 67', poids: '4 kg',   couleur: 'Crème/Brun',  allergies: '',            antecedents: 'Stérilisée 09/2024' },
  { id: 3, nom: 'Bella', espece: 'Bovin', race: 'Holstein',        age: '5 ans', sexe: 'F', proprio: 'Ferme Kokou',  tel: '+228 92 34 56 78', poids: '450 kg', couleur: 'Noir/Blanc',  allergies: '',            antecedents: 'Gestation en cours – 6 mois' },
  { id: 4, nom: 'Simba', espece: 'Chien', race: 'Labrador',        age: '1 an',  sexe: 'M', proprio: 'Akouavi Afi',  tel: '+228 93 45 67 89', poids: '28 kg',  couleur: 'Jaune',       allergies: '',            antecedents: 'Primo-vaccination 01/2025' },
];

export const INIT_CLIENTS = [
  { id: 1, nom: 'Dupont Jean',  tel: '+228 90 12 34 56', email: 'dupont@email.com', adresse: 'Lomé, Quartier Bè', animaux: 2  },
  { id: 2, nom: 'Martin Sophie',tel: '+228 91 23 45 67', email: 'martin@email.com', adresse: 'Lomé, Tokoin',      animaux: 1  },
  { id: 3, nom: 'Ferme Kokou',  tel: '+228 92 34 56 78', email: 'kokou@ferme.com',  adresse: 'Agou',              animaux: 12 },
  { id: 4, nom: 'Akouavi Afi',  tel: '+228 93 45 67 89', email: '',                 adresse: 'Kpalimé',           animaux: 1  },
];

export const INIT_MEDS = [
  { id: 1, ref: 'VET-001', nom: 'Amoxicilline 500mg',    categorie: 'Antibiotique',       stock: 200, seuil: 50, unite: 'comprimés', prixAchat: 150,  prixVente: 250,  fournisseur: 'MediVet SARL',  doseMgKg: 10,  lot: 'LOT-2024-01', peremption: '2026-06-30', tarifs: [{ conditionnement: 'Comprimé', prix: 250 }, { conditionnement: 'Plaquette (10 cp)', prix: 2200 }, { conditionnement: 'Boîte (30 cp)', prix: 6000 }] },
  { id: 2, ref: 'VET-002', nom: 'Ivermectine 1%',        categorie: 'Antiparasitaire',    stock: 8,   seuil: 20, unite: 'flacons',   prixAchat: 3500, prixVente: 5000, fournisseur: 'Afrique Pharma', doseMgKg: 0.2, lot: 'LOT-2024-03', peremption: '2025-12-31', tarifs: [{ conditionnement: 'Flacon 50ml', prix: 5000 }, { conditionnement: 'Flacon 100ml', prix: 9000 }] },
  { id: 3, ref: 'VET-003', nom: 'Vaccin Rage',           categorie: 'Vaccin',             stock: 45,  seuil: 15, unite: 'doses',     prixAchat: 2000, prixVente: 3500, fournisseur: 'Afrique Pharma', doseMgKg: null,lot: 'LOT-2024-07', peremption: '2026-03-31', tarifs: [{ conditionnement: 'Dose unitaire', prix: 3500 }, { conditionnement: 'Pack 5 doses', prix: 16000 }] },
  { id: 4, ref: 'VET-004', nom: 'Métronidazole 250mg',   categorie: 'Antibiotique',       stock: 120, seuil: 30, unite: 'comprimés', prixAchat: 100,  prixVente: 180,  fournisseur: 'MediVet SARL',  doseMgKg: 15,  lot: 'LOT-2024-02', peremption: '2026-09-30', tarifs: [{ conditionnement: 'Comprimé', prix: 180 }, { conditionnement: 'Plaquette (10 cp)', prix: 1600 }, { conditionnement: 'Boîte (30 cp)', prix: 4500 }] },
  { id: 5, ref: 'VET-005', nom: 'Kétoprofène injectable',categorie: 'Anti-inflammatoire', stock: 30,  seuil: 10, unite: 'flacons',   prixAchat: 1800, prixVente: 2800, fournisseur: 'MediVet SARL',  doseMgKg: 2,   lot: 'LOT-2024-05', peremption: '2026-01-31', tarifs: [{ conditionnement: 'Flacon', prix: 2800 }] },
  { id: 6, ref: 'VET-006', nom: 'Enrofloxacine 5%',      categorie: 'Antibiotique',       stock: 25,  seuil: 10, unite: 'flacons',   prixAchat: 4000, prixVente: 6000, fournisseur: 'Afrique Pharma', doseMgKg: 5,   lot: 'LOT-2024-06', peremption: '2026-12-31', tarifs: [{ conditionnement: 'Flacon 50ml', prix: 6000 }, { conditionnement: 'Flacon 100ml', prix: 11000 }] },
];

export const TABLE = {
  patients: 'patients', clients: 'clients', meds: 'medicaments',
  consultations: 'consultations', ordonnances: 'ordonnances',
  chirurgies: 'chirurgies', hospitalisations: 'hospitalisations',
  rdvs: 'rdvs', taches: 'taches', factures: 'factures',
  depenses: 'depenses', commandes: 'commandes',
  fournisseurs: 'fournisseurs', equipe: 'equipe', comptes: 'comptes',
};

// ── Supabase DB helpers (exportés pour usage dans les pages) ─
// NOTE: sb lui-même est dans lib/supabase.js — ces helpers l'importent
import { sb } from './supabase';

export const syncQueue = async (onProgress) => {
  const q = getQ(); if (!q.length) return 0;
  const failed = [];
  for (const op of q) {
    try {
      if      (op.type === 'insert') await sb.from(op.table).insert(op.row);
      else if (op.type === 'update') await sb.from(op.table).update(op.updates).eq('id', op.id);
      else if (op.type === 'delete') await sb.from(op.table).delete().eq('id', op.id);
    } catch { failed.push(op); }
  }
  saveQ(failed);
  if (onProgress) onProgress(failed.length);
  return q.length - failed.length;
};

export const dbFetch = async (table) => {
  try {
    if (!navigator.onLine || !sb) return getCache(table) || [];
    const { data, error } = await sb.from(table).select('*').order('created_at', { ascending: false });
    if (!error && data) { setCache(table, data); return data; }
  } catch (e) { console.warn('dbFetch error', table, e); }
  return getCache(table) || [];
};

export const dbInsert = async (table, row) => {
  const r = { ...row, id: row.id || newId(), created_at: new Date().toISOString() };
  if (navigator.onLine && sb) {
    try {
      const { data, error } = await sb.from(table).insert(r).select().single();
      if (!error && data) return data;
    } catch (e) { console.warn('dbInsert error', table, e); }
  }
  enqueue({ type: 'insert', table, row: r });
  return r;
};

export const dbUpdate = async (table, id, updates) => {
  if (navigator.onLine && sb) {
    try { await sb.from(table).update(updates).eq('id', id); return; }
    catch (e) { console.warn('dbUpdate', e); }
  }
  enqueue({ type: 'update', table, id, updates });
};

export const dbDelete = async (table, id) => {
  if (navigator.onLine && sb) {
    try { await sb.from(table).delete().eq('id', id); return; }
    catch (e) { console.warn('dbDelete', e); }
  }
  enqueue({ type: 'delete', table, id });
};