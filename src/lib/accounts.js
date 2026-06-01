import { sb } from './supabase'

/** Liste tous les profils (source de vérité pour GestionComptes) */
export async function fetchAllProfiles() {
  const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/**
 * Crée un utilisateur Auth + profil (admin).
 * Restaure la session admin après signUp pour éviter la déconnexion.
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
  if (!userId) return { ok: false, msg: 'Compte créé mais identifiant introuvable.' }

  const { error: profileError } = await sb
    .from('profiles')
    .update({ nom, role, actif, pending, email })
    .eq('id', userId)

  if (profileError) {
    console.warn('[accounts] Mise à jour profil:', profileError)
    return { ok: false, msg: profileError.message || 'Erreur lors de la mise à jour du profil.' }
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

  return { ok: true, userId }
}

export async function updateProfile(id, updates) {
  const { error } = await sb.from('profiles').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteProfile(id) {
  const { error } = await sb.from('profiles').delete().eq('id', id)
  if (error) throw error
}
