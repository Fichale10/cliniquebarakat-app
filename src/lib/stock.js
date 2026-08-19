// ============================================================
//  src/lib/stock.js — Mouvements de stock centralisés
//  Utilise la RPC atomique adjust_stock (supabase/stock_ajustement.sql)
//  → plus d'écrasements concurrents ni de blocages RLS silencieux.
// ============================================================
import { dbAdjustStock } from './db'

/** Unités cumulées par médicament sur TOUTES les lignes
 *  (gère plusieurs lignes du même produit : boîte + comprimés…) */
export const cumulUnitesParMed = (lignes) => {
  const map = {}
  for (const l of lignes || []) {
    const med = l?.med
    const u = (parseFloat(l?.qte) || 0) * (parseInt(l?.mult) || 1)
    if (!med || u <= 0) continue
    map[med] = (map[med] || 0) + u
  }
  return map
}

/**
 * Applique un mouvement de stock lié à une vente / consultation / chirurgie.
 * delta : -1 = sortie, +1 = restitution.
 * type  : 'detail' | 'gros'  → stock pharmacie
 *         'clinique'         → stock clinique
 *         'cession'          → transfert pharmacie → clinique
 * Retourne la liste meds mise à jour (à passer à setMeds).
 */
export const applyVenteStock = async (sb, meds, lignes, delta, type = 'detail') => {
  const unites = cumulUnitesParMed(lignes)
  const jobs = []
  const updated = (meds || []).map(m => {
    const u = unites[m.nom]
    if (!u) return m
    let dStock = 0, dClin = 0
    if (type === 'clinique') dClin = delta * u
    else if (type === 'cession') { dStock = delta * u; dClin = -delta * u }
    else dStock = delta * u
    if (sb && m.id) jobs.push(dbAdjustStock(sb, m.id, dStock, dClin))
    const patch = {}
    if (dStock) patch.stock = Math.max(0, (parseFloat(m.stock) || 0) + dStock)
    if (dClin) patch.stock_clinique = Math.max(0, (parseFloat(m.stock_clinique) || 0) + dClin)
    return { ...m, ...patch }
  })
  const results = await Promise.allSettled(jobs)
  const failures = results.filter(r => r.status === 'rejected')
  failures.forEach(r => console.warn('[stock]', r.reason?.message || r.reason))
  if (failures.length) {
    throw new Error('Stock non synchronisé avec le serveur : ' + (failures[0].reason?.message || failures[0].reason))
  }
  return updated
}
