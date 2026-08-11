// ============================================================
//  src/lib/ventes.js — Logique métier partagée des ventes
//  Source unique pour : formatage montants, statuts, tarifs,
//  prix de gros, TVA et suivi des paiements.
//  Utilisé par : Ventes.jsx, Caisse.jsx, Creances.jsx, Finances.jsx…
// ============================================================
import { VENTE_STATUTS } from './validation/constants'

// ── Formatage (version canonique : arrondi entier) ───────────
export const fmtF = v => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'
export const fmtK = n => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M F` : n >= 1000 ? `${Math.round(n / 1000)}k F` : fmtF(n)

// ── Statuts ──────────────────────────────────────────────────
export const STATUTS = VENTE_STATUTS
export const STATUT_STYLE = {
  'Payé':               { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  'À crédit':           { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c' },
  'Partiellement payé': { bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
  'En attente':         { bg: '#fefce8', border: '#fef08a', text: '#ca8a04' },
  'Annulé':             { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
}

// ── Tarifs / conditionnements (avec multiplicateur d'unités) ─
export const getTarifs = (medObj) => {
  if (!medObj) return []
  if (medObj.tarifs?.length) return medObj.tarifs.map(t => ({ ...t, mult: t.mult || 1 }))
  const pv = medObj.prixVente || medObj.prix_vente || 0
  const u  = medObj.unite || ''
  if (u === 'comprimés' || u === 'cp') return [
    { conditionnement: 'Comprimé',          prix: pv,       mult: 1   },
    { conditionnement: 'Plaquette (10 cp)', prix: pv * 10,  mult: 10  },
    { conditionnement: 'Boîte (30 cp)',     prix: pv * 30,  mult: 30  },
    { conditionnement: 'Boîte (50 cp)',     prix: pv * 50,  mult: 50  },
    { conditionnement: 'Boîte (100 cp)',    prix: pv * 100, mult: 100 },
  ]
  if (u === 'flacons') return [{ conditionnement: 'Flacon', prix: pv, mult: 1 }]
  if (u === 'doses')   return [
    { conditionnement: 'Dose',         prix: pv,     mult: 1 },
    { conditionnement: 'Pack 5 doses', prix: pv * 5, mult: 5 },
  ]
  return [{ conditionnement: 'Unité', prix: pv, mult: 1 }]
}

// ── Prix de gros / paliers de remise ─────────────────────────
export const getPrixGros = (medObj, qte) => {
  if (!medObj) return 0
  const base = parseInt(medObj.prixGros ?? medObj.prix_gros ?? 0) || parseInt(medObj.prixVente ?? medObj.prix_vente ?? 0) || 0
  const paliers = medObj.paliersGros ?? medObj.paliers_gros ?? []
  if (!paliers.length) return base
  const q = parseInt(qte) || 1
  const best = [...paliers]
    .filter(p => q >= (parseInt(p.qte) || 0))
    .sort((a, b) => parseInt(b.qte) - parseInt(a.qte))[0]
  return best ? Math.round(base * (1 - (parseFloat(best.remise) || 0) / 100)) : base
}

export const getRemiseApplied = (medObj, qte) => {
  const paliers = medObj?.paliersGros ?? medObj?.paliers_gros ?? []
  if (!paliers.length) return 0
  const q = parseInt(qte) || 1
  const best = [...paliers]
    .filter(p => q >= (parseInt(p.qte) || 0))
    .sort((a, b) => parseInt(b.qte) - parseInt(a.qte))[0]
  return best ? parseFloat(best.remise) || 0 : 0
}

// ── TVA / paiements ──────────────────────────────────────────
// Convention : v.total = montant HT · v.tva_amt = TVA persistée à la vente
// TTC = total + tva_amt · v.montant_paye = somme encaissée
export const computeTvaAmt = (totalHT, tva) =>
  tva?.active ? Math.round((totalHT || 0) * (tva.taux || 0) / 100) : 0

/** TVA d'une vente : valeur persistée, sinon recalcul (anciennes ventes) */
export const venteTvaAmt = (v, tva) =>
  v?.tva_amt != null && v.tva_amt !== 0 ? v.tva_amt : computeTvaAmt(v?.total, tva)

export const venteTTC = (v, tva) => (v?.total || 0) + venteTvaAmt(v, tva)

/** Montant restant dû (TTC - déjà payé) */
export const venteRestant = (v, tva) =>
  Math.max(0, venteTTC(v, tva) - (v?.montant_paye || 0))

/** Montant encaissé d'une vente (TTC si payée, sinon versements) */
export const venteEncaisse = (v, tva) =>
  v?.statut === 'Payé' ? venteTTC(v, tva) : Math.min(v?.montant_paye || 0, venteTTC(v, tva))

// ── Stock ────────────────────────────────────────────────────
/** Unités réelles décrémentées par une ligne (qte × conditionnement) */
export const ligneUnites = l => (parseInt(l?.qte) || 0) * (parseInt(l?.mult) || 1)
