// ─── Point d'entrée unique pour toutes les variables globales ───
// Ce fichier simplifie les imports dans les composants

export { sb } from './supabase'
export { 
  getCache, setCache, 
  dbFetch, dbInsert, dbUpdate, dbDelete,
  newId, syncQueue, getQ, saveQ, enqueue, purgeDeprecatedQueueOps,
  isCacheFresh, markSynced, DEFAULT_FETCH_STALE_MS,
} from './db'
export { logAction, canAccess, ROLES, ROLE_ACCESS } from './roles'
export { 
  TABLE, INIT_PATIENTS, INIT_CLIENTS, INIT_MEDS, 
  DEFAULT_TEAM, NAV_ALL 
} from './data'
