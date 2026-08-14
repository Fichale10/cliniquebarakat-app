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

// ── Export CSV (compatible Excel français : BOM UTF-8 + point-virgule) ──
export function exportCSV(filename, headers, rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.map(esc).join(';'), ...rows.map(r => r.map(esc).join(';'))];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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