import { sb } from './supabase'
import { getCache, setCache } from './db'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

/** Fusionne plusieurs listes de profils (priorité aux entrées les plus récentes) */
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

  if (upsertError) {
    throw upsertError
  }
  return upserted
}

/** Liste tous les profils — fusionne serveur + cache local */
export async function fetchAllProfiles() {
  const cached = getCache('comptes') || []

  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[accounts] fetchAllProfiles:', error.message)
    const merged = mergeProfiles(cached)
    setCache('comptes', merged)
    return merged
  }

  const server = data || []
  const merged = mergeProfiles(server, cached)
  setCache('comptes', merged)

  if (server.length < cached.length) {
    console.warn(
      '[accounts] Le serveur renvoie moins de profils que le cache local.',
      'Exécutez supabase/profiles_policies.sql dans Supabase si la liste est incomplète.',
    )
  }

  return merged
}

/**
 * Crée un utilisateur Auth + profil (admin).
 * Restaure la session admin après signUp.
 */
export async function createUserAccount({ nom, email, pw, role, actif = true, pending = false }) {
  const { data: { session: adminSession } } = await sb.auth.getSession()

  const { data, error } = await sb.auth.signUp({
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
    return { ok: false, msg: 'Compte créé mais identifiant introuvable (vérifiez la confirmation email Supabase).' }
  }

  const fields = { nom, role, actif, pending, email }

  let profile
  try {
    await waitForProfile(userId, 2)
    profile = await saveProfileRow(userId, fields)
  } catch (e) {
    console.warn('[accounts] saveProfileRow:', e)
    profile = profileFromForm({ userId, ...fields })
  }

  if (adminSession?.access_token && adminSession?.refresh_token) {
    try {
      await sb.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      })
    } catch (e) {
      console.warn('[accounts] Restauration session admin:', e)
    }
  }

  const cached = getCache('comptes') || []
  const merged = mergeProfiles(cached, [profile])
  setCache('comptes', merged)

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
  const cached = (getCache('comptes') || []).filter((p) => p.id !== id)
  setCache('comptes', cached)
}
