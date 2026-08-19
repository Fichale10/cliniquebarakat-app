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
  } else if (op.type === 'adjust_stock') {
    ;({ error } = await sb.rpc('adjust_stock', {
      p_id: op.id,
      p_delta_stock: op.deltaStock || 0,
      p_delta_clinique: op.deltaClinique || 0,
    }))
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
      montant_paye: r.montant_paye ?? r.montantPaye ?? 0,
      caissier: r.caissier ?? '',
      type: r.type ?? 'detail',
      created_at: r.created_at,
    }
    // Liens optionnels (colonnes présentes si les scripts SQL dédiés ont été exécutés)
    if (r.consultation_id) payload.consultation_id = r.consultation_id
    if (r.chirurgie_id) payload.chirurgie_id = r.chirurgie_id
    return payload
  }
  return r
}

const formatDbError = (error) =>
  [error.message, error.details, error.hint].filter(Boolean).join(' — ')

/** Garantit qu'une promesse se termine en max `ms` ms — évite les spinners infinis */
const withTimeout = (promise, ms = 12000) => {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Délai dépassé (${ms / 1000}s) — vérifiez votre connexion`)),
      ms,
    )
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export const dbInsert = async (sb, table, row) => {
  if (DEPRECATED_TABLES.has(table)) {
    console.warn('[dbInsert] Table legacy ignorée:', table)
    return row
  }
  const r = prepareInsertRow(table, row)
  if (navigator.onLine && sb) {
    const { data, error } = await withTimeout(sb.from(table).insert(r).select().single())
    if (error) {
      const msg = formatDbError(error)
      console.warn('[dbInsert]', table, msg)
      throw new Error(msg || 'Erreur lors de l\'enregistrement')
    }
    markSynced(table)
    return data ?? r
  }
  enqueue({ type: 'insert', table, row: r })
  return r
}

const patchCacheAfterDelete = (table, id) => {
  const cached = getCache(table)
  if (!Array.isArray(cached)) return
  setCache(
    table,
    cached.filter((row) => String(row.id) !== String(id)),
  )
}

export const dbUpdate = async (sb, table, id, updates) => {
  if (DEPRECATED_TABLES.has(table)) {
    console.warn('[dbUpdate] Table legacy ignorée:', table)
    return
  }
  if (navigator.onLine && sb) {
    const { error } = await withTimeout(sb.from(table).update(updates).eq('id', id))
    if (error) throw new Error(formatDbError(error) || 'Mise à jour refusée')
    markSynced(table)
    return
  }
  enqueue({ type: 'update', table, id, updates })
}

/** Ajustement ATOMIQUE du stock via la RPC adjust_stock (deltas signés).
 *  Évite les écrasements concurrents (stock = stock + delta côté serveur)
 *  et les blocages RLS silencieux (SECURITY DEFINER).
 *  Nécessite supabase/stock_ajustement.sql. */
export const dbAdjustStock = async (sb, id, deltaStock = 0, deltaClinique = 0) => {
  if (!deltaStock && !deltaClinique) return
  if (navigator.onLine && sb) {
    const { error } = await withTimeout(
      sb.rpc('adjust_stock', { p_id: id, p_delta_stock: deltaStock, p_delta_clinique: deltaClinique }),
    )
    if (error) throw new Error(formatDbError(error) || 'Ajustement de stock refusé')
    markSynced('medicaments')
    return
  }
  enqueue({ type: 'adjust_stock', id, deltaStock, deltaClinique })
}

/** @returns {Promise<'ok'|'queued'>} */
export const dbDelete = async (sb, table, id) => {
  if (DEPRECATED_TABLES.has(table)) {
    console.warn('[dbDelete] Table legacy ignorée:', table)
    return 'ok'
  }
  if (navigator.onLine && sb) {
    const { error } = await withTimeout(sb.from(table).delete().eq('id', id))
    if (error) throw new Error(formatDbError(error) || 'Suppression refusée')
    patchCacheAfterDelete(table, id)
    markSynced(table)
    return 'ok'
  }
  patchCacheAfterDelete(table, id)
  enqueue({ type: 'delete', table, id })
  return 'queued'
}