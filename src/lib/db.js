// src/lib/db.js
export const getCache = (t) => { try { return JSON.parse(localStorage.getItem('lb_' + t) || 'null') } catch { return null } }
export const setCache = (t, d) => { try { localStorage.setItem('lb_' + t, JSON.stringify(d)) } catch {} }

const SYNC_TS_PREFIX = 'lb_sync_ts_'
/** Durée pendant laquelle dbFetch réutilise le cache sans requête réseau */
export const DEFAULT_FETCH_STALE_MS = 90_000

export const getSyncAge = (table) => {
  const ts = localStorage.getItem(SYNC_TS_PREFIX + table)
  return ts ? Date.now() - Number(ts) : Infinity
}

export const markSynced = (table) => {
  try { localStorage.setItem(SYNC_TS_PREFIX + table, String(Date.now())) } catch {}
}

export const isCacheFresh = (table, staleMs = DEFAULT_FETCH_STALE_MS) =>
  getSyncAge(table) < staleMs

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

const runQueueOp = async (sb, op) => {
  let error
  if (op.type === 'insert') {
    ;({ error } = await sb.from(op.table).insert(op.row))
  } else if (op.type === 'update') {
    ;({ error } = await sb.from(op.table).update(op.updates).eq('id', op.id))
  } else if (op.type === 'delete') {
    ;({ error } = await sb.from(op.table).delete().eq('id', op.id))
  }
  if (error) throw error
}

/** Exécute la file offline en parallèle (par lots) pour accélérer la sync */
export const syncQueue = async (sb, onProgress) => {
  purgeDeprecatedQueueOps()
  const q = getQ().filter((op) => !DEPRECATED_TABLES.has(op.table))
  if (!q.length) return 0

  const BATCH = 5
  const failed = []
  for (let i = 0; i < q.length; i += BATCH) {
    const batch = q.slice(i, i + BATCH)
    const results = await Promise.allSettled(batch.map((op) => runQueueOp(sb, op)))
    results.forEach((res, idx) => {
      if (res.status === 'rejected') failed.push(batch[idx])
    })
    if (onProgress) onProgress(failed.length)
  }

  saveQ(failed)
  if (onProgress) onProgress(failed.length)
  return q.length - failed.length
}

export const newId = () => {
  try { return crypto.randomUUID() } catch { return 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2) }
}

/**
 * @param {object} [options]
 * @param {boolean} [options.force] — ignore le cache et refetch
 * @param {number} [options.staleMs] — âge max du cache avant refetch
 */
export const dbFetch = async (sb, table, options = {}) => {
  const { force = false, staleMs = DEFAULT_FETCH_STALE_MS } = options
  const cached = getCache(table) || []

  if (!force && cached.length && isCacheFresh(table, staleMs)) {
    return cached
  }

  try {
    if (!navigator.onLine || !sb) return cached
    const needsOrder = table !== 'clinique_settings'
    let { data, error } = needsOrder
      ? await sb.from(table).select('*').order('created_at', { ascending: false })
      : await sb.from(table).select('*')
    if (error?.status === 400) {
      ;({ data, error } = await sb.from(table).select('*'))
    }
    if (!error && data) {
      setCache(table, data)
      markSynced(table)
      return data
    }
  } catch (e) { console.warn('dbFetch error', table, e) }
  return cached
}

const prepareInsertRow = (table, row) => {
  const r = { ...row, id: row.id || newId(), created_at: row.created_at || new Date().toISOString() }
  if (table === 'ventes') {
    // Import dynamique évité — mapper inline pour ne pas casser le bundle
    const payload = {
      id: r.id,
      date: r.date,
      client: r.client ?? '',
      lignes: r.lignes ?? [],
      total: r.total ?? 0,
      statut: r.statut ?? 'Payé',
      mode: r.mode ?? 'Espèces',
      note: r.note ?? '',
      tva_amt: r.tva_amt ?? r.tvaAmt ?? 0,
      caissier: r.caissier ?? '',
      created_at: r.created_at,
    }
    return payload
  }
  return r
}

const formatDbError = (error) =>
  [error.message, error.details, error.hint].filter(Boolean).join(' — ')

export const dbInsert = async (sb, table, row) => {
  if (DEPRECATED_TABLES.has(table)) {
    console.warn('[dbInsert] Table legacy ignorée:', table)
    return row
  }
  const r = prepareInsertRow(table, row)
  if (navigator.onLine && sb) {
    try {
      const { data, error } = await sb.from(table).insert(r).select().single()
      if (error) {
        console.warn('[dbInsert]', table, formatDbError(error))
        // 400 = schéma incompatible — ne pas mettre en file offline (boucle infinie)
        if (error.status === 400 || error.code === 'PGRST204') {
          throw new Error(formatDbError(error) || 'Données refusées par Supabase')
        }
      } else if (data) {
        markSynced(table)
        return data
      }
    } catch (e) {
      if (e?.message && (e.message.includes('PGRST') || e.message.includes('column'))) throw e
      console.warn('dbInsert error', table, e)
    }
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
    try {
      await sb.from(table).update(updates).eq('id', id)
      markSynced(table)
      return
    } catch (e) { console.warn('dbUpdate', e) }
  }
  enqueue({ type: 'update', table, id, updates })
}

export const dbDelete = async (sb, table, id) => {
  if (DEPRECATED_TABLES.has(table)) {
    console.warn('[dbDelete] Table legacy ignorée:', table)
    return
  }
  if (navigator.onLine && sb) {
    try {
      await sb.from(table).delete().eq('id', id)
      markSynced(table)
      return
    } catch (e) { console.warn('dbDelete', e) }
  }
  enqueue({ type: 'delete', table, id })
}