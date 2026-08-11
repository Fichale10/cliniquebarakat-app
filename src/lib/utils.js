// ============================================================
//  src/lib/utils.js — Fonctions utilitaires pures (pas de JSX)
//  Importer dans n'importe quel fichier :
//  import { today, fmtF, getCache, setCache, ... } from '../lib/utils'
//  import { today, fmtF, getCache, setCache, ... } from '../../lib/utils'
// ============================================================

// ── Formatage ───────────────────────────────────────────────
// Version canonique (arrondi entier) — alignée sur lib/ventes.js
export const fmtF   = n  => Math.round(Number(n || 0)).toLocaleString('fr-FR') + ' F';
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

// NOTE : les helpers DB (dbFetch, dbInsert…) vivent dans lib/db.js,
// les données fallback (INIT_*) dans lib/data.js — ne pas dupliquer ici.