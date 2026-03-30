// ─── Cache localStorage ───────────────────────────────────────
export const getCache = (t) => { try { return JSON.parse(localStorage.getItem('lb_' + t) || 'null') } catch { return null } }
export const setCache = (t, d) => { try { localStorage.setItem('lb_' + t, JSON.stringify(d)) } catch {} }

// ─── Offline queue ─────────────────────────────────────────────
const Q_KEY = 'lb_offlineQueue'
export const getQ = () => { try { return JSON.parse(localStorage.getItem(Q_KEY) || '[]') } catch { return [] } }
export const saveQ = (q) => localStorage.setItem(Q_KEY, JSON.stringify(q))
export const enqueue = (op) => { const q = getQ(); q.push({ ...op, ts: Date.now() }); saveQ(q) }

export const syncQueue = async (sb, onProgress) => {
  const q = getQ(); if (!q.length) return 0
  const failed = []
  for (const op of q) {
    try {
      if (op.type === 'insert') await sb.from(op.table).insert(op.row)
      else if (op.type === 'update') await sb.from(op.table).update(op.updates).eq('id', op.id)
      else if (op.type === 'delete') await sb.from(op.table).delete().eq('id', op.id)
    } catch { failed.push(op) }
  }
  saveQ(failed)
  if (onProgress) onProgress(failed.length)
  return q.length - failed.length
}

export const newId = () => {
  try { return crypto.randomUUID() } catch { return 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2) }
}

export const dbFetch = async (sb, table) => {
  try {
    if (!navigator.onLine || !sb) return getCache(table) || []
    // Certaines tables (ex: `clinique_settings`) peuvent ne pas avoir `created_at`.
    // Pour éviter une requête 400, on saute le tri pour ces tables.
    const needsCreatedAtOrder = table !== 'clinique_settings'

    // On essaye d'abord avec le tri (si applicable), puis on retente sans `order` si la requête est invalide.
    let { data, error } = needsCreatedAtOrder
      ? await sb.from(table).select('*').order('created_at', { ascending: false })
      : await sb.from(table).select('*')
    if (error) {
      const status = error?.status
      if (status === 400) {
        // Souvent, `created_at` manque ou l'ordre n'est pas supporté pour la table.
        ;({ data, error } = await sb.from(table).select('*'))
      }
    }
    if (!error && data) { setCache(table, data); return data }
  } catch (e) { console.warn('dbFetch error', table, e) }
  return getCache(table) || []
}

export const dbInsert = async (sb, table, row) => {
  const r = { ...row, id: row.id || newId(), created_at: new Date().toISOString() }
  if (navigator.onLine && sb) {
    try {
      const { data, error } = await sb.from(table).insert(r).select().single()
      if (!error && data) return data
    } catch (e) { console.warn('dbInsert error', table, e) }
  }
  enqueue({ type: 'insert', table, row: r })
  return r
}

export const dbUpdate = async (sb, table, id, updates) => {
  if (navigator.onLine && sb) {
    try { await sb.from(table).update(updates).eq('id', id); return } catch (e) { console.warn('dbUpdate', e) }
  }
  enqueue({ type: 'update', table, id, updates })
}

export const dbDelete = async (sb, table, id) => {
  if (navigator.onLine && sb) {
    try { await sb.from(table).delete().eq('id', id); return } catch (e) { console.warn('dbDelete', e) }
  }
  enqueue({ type: 'delete', table, id })
}
