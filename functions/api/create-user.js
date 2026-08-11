// ════════════════════════════════════════════════════════════════
// POST /api/create-user — Création de compte via l'API admin Supabase
// Contourne le rate limit de signUp (la clé service_role n'est pas limitée).
//
// Variables d'environnement à définir dans Cloudflare Pages
// (Settings → Environment variables) :
//   SUPABASE_URL               → https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  → clé service_role (Supabase → Settings → API)
//
// Sécurité : seul un utilisateur authentifié avec le rôle "admin"
// dans public.profiles peut appeler cet endpoint.
// ════════════════════════════════════════════════════════════════

const ROLES_VALIDES = ['admin', 'admin2', 'veterinaire', 'utilisateur', 'pharmacien', 'technicien', 'caissier']

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export async function onRequestPost(context) {
  const { request, env } = context
  const URL_SB = env.SUPABASE_URL
  const SR_KEY = env.SUPABASE_SERVICE_ROLE_KEY

  if (!URL_SB || !SR_KEY) {
    return json({ error: 'Configuration serveur manquante (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' }, 500)
  }

  // ── 1. Authentifier l'appelant (token Supabase de sa session) ──
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Non authentifié' }, 401)

  const uRes = await fetch(`${URL_SB}/auth/v1/user`, {
    headers: { apikey: SR_KEY, Authorization: `Bearer ${token}` },
  })
  if (!uRes.ok) return json({ error: 'Session invalide ou expirée' }, 401)
  const caller = await uRes.json()

  // ── 2. Vérifier que l'appelant est admin ────────────────────────
  const pRes = await fetch(
    `${URL_SB}/rest/v1/profiles?id=eq.${encodeURIComponent(caller.id)}&select=role`,
    { headers: { apikey: SR_KEY, Authorization: `Bearer ${SR_KEY}` } },
  )
  const profiles = pRes.ok ? await pRes.json() : []
  if (profiles?.[0]?.role !== 'admin') {
    return json({ error: 'Accès refusé : réservé à l\'administrateur' }, 403)
  }

  // ── 3. Valider la requête ────────────────────────────────────────
  let body
  try { body = await request.json() } catch { return json({ error: 'Corps JSON invalide' }, 400) }
  const { nom, email, pw, role, actif = true, pending = false } = body || {}

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Email invalide' }, 400)
  if (!pw || pw.length < 6) return json({ error: 'Mot de passe trop court (6 caractères min.)' }, 400)
  if (!ROLES_VALIDES.includes(role)) return json({ error: 'Rôle invalide' }, 400)

  // ── 4. Créer l'utilisateur via l'API admin (pas de rate limit) ──
  const cRes = await fetch(`${URL_SB}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SR_KEY, Authorization: `Bearer ${SR_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: pw,
      email_confirm: true, // pas d'email de confirmation à envoyer
      user_metadata: { nom, role },
    }),
  })
  const created = await cRes.json()

  if (!cRes.ok) {
    const msg = created?.msg || created?.message || created?.error_description || 'Erreur création utilisateur'
    if (/already|exists|registered/i.test(msg)) return json({ error: 'Cet email est déjà utilisé.' }, 409)
    return json({ error: msg }, cRes.status)
  }

  const userId = created.id
  const fields = { id: userId, nom, email, role, actif, pending }

  // ── 5. Upsert du profil (écrase la ligne créée par le trigger) ──
  const upRes = await fetch(`${URL_SB}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      apikey: SR_KEY,
      Authorization: `Bearer ${SR_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(fields),
  })
  const profile = upRes.ok ? (await upRes.json())?.[0] : fields

  return json({ ok: true, userId, profile: profile || fields })
}
