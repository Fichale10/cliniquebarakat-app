// src/lib/db.js
export const getCache = (t) => { try { return JSON.parse(localStorage.getItem('lb_' + t) || 'null') } catch { return null } }
export const setCache = (t, d) => { try { localStorage.setItem('lb_' + t, JSON.stringify(d)) } catch {} }

const Q_KEY = 'lb_offlineQueue'
/** Tables legacy — plus synchronisées (auth via profiles + Supabase Auth) */
const DEPRECATED_TABLES = new Set(['comptes'])

export const getQ = () => { try { return JSON.parse(localStorage.getItem(Q_KEY) || '[]') } catch { return [] } }
export const saveQ = (q) => localStorage.setItem(Q_KEY, JSON.stringify(q))
export const enqueue = (op) => { const q = getQ(); q.push({ ...op, ts: Date.now() }); saveQ(q) }

/** Retire les opérations obsolètes (ex. ancienne table comptes) de la file offline */
export const purgeDeprecatedQueueOps = () => {
  const q = getQ()
  const kept = q.filter((op) => !DEPRECATED_TABLES.has(op.table))
  if (kept.length !== q.length) {
    saveQ(kept)
    console.info('[sync] Opérations legacy supprimées de la file offline (table comptes).')
  }
  return q.length - kept.length
}

export const syncQueue = async (sb, onProgress) => {
  purgeDeprecatedQueueOps()
  const q = getQ(); if (!q.length) return 0
  const failed = []
  for (const op of q) {
    if (DEPRECATED_TABLES.has(op.table)) continue
    try {
      let error
      if (op.type === 'insert') {
        ;({ error } = await sb.from(op.table).insert(op.row))
      } else if (op.type === 'update') {
        ;({ error } = await sb.from(op.table).update(op.updates).eq('id', op.id))
      } else if (op.type === 'delete') {
        ;({ error } = await sb.from(op.table).delete().eq('id', op.id))
      }
      if (error) failed.push(op)
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
    const needsOrder = table !== 'clinique_settings'
    let { data, error } = needsOrder
      ? await sb.from(table).select('*').order('created_at', { ascending: false })
      : await sb.from(table).select('*')
    if (error?.status === 400) {
      ;({ data, error } = await sb.from(table).select('*'))
    }
    if (!error && data) { setCache(table, data); return data }
  } catch (e) { console.warn('dbFetch error', table, e) }
  return getCache(table) || []
}

export const dbInsert = async (sb, table, row) => {
  if (DEPRECATED_TABLES.has(table)) {
    console.warn('[dbInsert] Table legacy ignorée:', table)
    return row
  }
  const r = { ...row, id: row.id || newId(), created_at: new Date().toISOString() }
  console.log('[dbInsert]', table, JSON.stringify(r))
  if (navigator.onLine && sb) {
    try {
      const { data, error } = await sb.from(table).insert(r).select().single()
      console.log('[dbInsert] result:', data, 'error:', error)
      if (!error && data) return data
    } catch (e) { console.warn('dbInsert error', table, e) }
  }
  enqueue({ type: 'insert', table, row: r })
  return r
}

export const dbUpdate = async (sb, table, id, updates) => {
  if (DEPRECATED_TABLES.has(table)) {
    console.warn('[dbUpdate] Table legacy ignorée:', table)
    return
  }
  if (navigator.onLine && sb) {
    try { await sb.from(table).update(updates).eq('id', id); return } catch (e) { console.warn('dbUpdate', e) }
  }
  enqueue({ type: 'update', table, id, updates })
}

export const dbDelete = async (sb, table, id) => {
  if (DEPRECATED_TABLES.has(table)) {
    console.warn('[dbDelete] Table legacy ignorée:', table)
    return
  }
  if (navigator.onLine && sb) {
    try { await sb.from(table).delete().eq('id', id); return } catch (e) { console.warn('dbDelete', e) }
  }
  enqueue({ type: 'delete', table, id })
}