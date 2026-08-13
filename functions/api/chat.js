// Proxy sécurisé vers l'API Anthropic pour l'Assistant IA.
// - Réservé aux utilisateurs connectés (token Supabase vérifié)
// - Modèle et max_tokens verrouillés côté serveur (maîtrise des coûts)
const MODEL      = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 1024

export async function onRequestPost(context) {
  const { request, env } = context

  if (!env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'Clé API manquante côté serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Authentification : utilisateur Supabase connecté requis ──
  if (env.SUPABASE_URL) {
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Non authentifié — reconnectez-vous.' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }
    const uRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY || token,
        Authorization: `Bearer ${token}`,
      },
    })
    if (!uRes.ok) {
      return new Response(JSON.stringify({ error: 'Session invalide — reconnectez-vous.' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const body = await request.json()

  // ── Verrouillage : seuls system/messages viennent du client ──
  const safeBody = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: typeof body.system === 'string' ? body.system.slice(0, 8000) : undefined,
    messages: Array.isArray(body.messages) ? body.messages.slice(-20) : [],
  }

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(safeBody),
  })

  const data = await upstream.json()

  if (!upstream.ok) {
    return new Response(JSON.stringify({
      error: data?.error?.message || 'Erreur API Anthropic',
      type: data?.error?.type,
    }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
