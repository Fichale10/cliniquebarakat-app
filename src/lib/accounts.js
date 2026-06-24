import { createClient } from '@supabase/supabase-js'
import { sb } from './supabase'
import { getCache, setCache } from './db'

const CACHE_KEY = 'comptes'
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// Client isolé pour signUp — n'écrase PAS la session admin principale
function makeTempClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return createClient(url, key, {
    auth: {
      storageKey: 'sb_signup_tmp',
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function mergeProfiles(...lists) {
  const map = new Map()
  for (const list of lists) {
    for (const p of list || []) {
      if (!p?.id) continue
      map.set(p.id, { ...map.get(p.id), ...p })
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  )
}

export function profileFromForm({ userId, nom, email, role, actif, pending }) {
  return {
    id: userId,
    nom,
    email,
    role,
    actif,
    pending,
    created_at: new Date().toISOString(),
  }
}

async function waitForProfile(userId, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (data && !error) return data
    await delay(350)
  }
  return null
}

async function saveProfileRow(userId, fields) {
  const { data: updated, error: updateError } = await sb
    .from('profiles')
    .update(fields)
    .eq('id', userId)
    .select()
    .single()

  if (!updateError && updated) return updated

  const { data: upserted, error: upsertError } = await sb
    .from('profiles')
    .upsert({ id: userId, ...fields }, { onConflict: 'id' })
    .select()
    .single()

  if (upsertError) throw upsertError
  return upserted
}

export async function fetchAllProfiles() {
  const cached = getCache(CACHE_KEY) || []

  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[accounts] fetchAllProfiles:', error.message)
    const merged = mergeProfiles(cached)
    setCache(CACHE_KEY, merged)
    return merged
  }

  const server = data || []
  const merged = mergeProfiles(server, cached)
  setCache(CACHE_KEY, merged)

  if (server.length < cached.length) {
    console.warn('[accounts] Le serveur renvoie moins de profils que le cache local.')
  }

  return merged
}

export async function createUserAccount({ nom, email, pw, role, actif = true, pending = false }) {
  // Utiliser un client temporaire pour que signUp ne vole pas la session admin
  const tempSb = makeTempClient()

  const { data, error } = await tempSb.auth.signUp({
    email,
    password: pw,
    options: {
      data: { nom, role },
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  })

  if (error) {
    if (error.message?.includes('already registered')) {
      return { ok: false, msg: 'Cet email est déjà utilisé.' }
    }
    return { ok: false, msg: error.message }
  }

  const userId = data.user?.id
  if (!userId) {
    return { ok: false, msg: 'Compte créé mais identifiant introuvable.' }
  }

  const fields = { nom, role, actif, pending, email }

  // La session admin (sb) est intacte — elle peut écrire dans profiles
  let profile
  try {
    // Attendre le trigger DB s'il existe, puis forcer l'upsert
    await waitForProfile(userId, 3)
    profile = await saveProfileRow(userId, fields)
  } catch (e) {
    console.warn('[accounts] saveProfileRow:', e?.message || e)
    // Fallback local si Supabase échoue
    profile = profileFromForm({ userId, ...fields })
  }

  const cached = getCache(CACHE_KEY) || []
  const merged = mergeProfiles(cached, [profile])
  setCache(CACHE_KEY, merged)

  return { ok: true, userId, profile }
}

export async function updateProfile(id, updates) {
  const { data, error } = await sb.from('profiles').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteProfile(id) {
  const { error } = await sb.from('profiles').delete().eq('id', id)
  if (error) throw error
  const cached = (getCache(CACHE_KEY) || []).filter((p) => p.id !== id)
  setCache(CACHE_KEY, cached)
}