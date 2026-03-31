// ─── Système de rôles ──────────────────────────────────────────
export const ROLES = {
  admin:       { label: 'Administrateur', color: '#d97706', bg: 'rgba(217,119,6,0.15)',   icon: '👑' },
  admin2: {  label: 'Admin secondaire', color: '#0ea5e9',  bg: 'rgba(14,165,233,0.15)', icon: '🛡️' },
  veterinaire: { label: 'Vétérinaire',    color: '#2563eb', bg: 'rgba(37,99,235,0.15)',   icon: '🩺' },
  // Alias (historique) : certains comptes ont été créés avec le rôle "utilisateur"
  // et attendaient les mêmes droits que "veterinaire".
  utilisateur: { label: 'Utilisateur',    color: '#2563eb', bg: 'rgba(37,99,235,0.15)',   icon: '👤' },
  pharmacien:  { label: 'Pharmacien',     color: '#16a34a', bg: 'rgba(22,163,74,0.15)',   icon: '💊' },
  caissier:    { label: 'Caissier',       color: '#7c3aed', bg: 'rgba(124,58,237,0.15)',  icon: '🛒' },
}

export const ROLE_ACCESS = {
  admin: 'all',
  admin2: [
  'dashboard','monprofil','parametres','journal','lots','caisse','ia','notifications','rapports','carteclients','traitements',
  'patients','consultations','dossiers','ordonnances','chirurgies','hospitalisation','agenda','taches','calculateur','consentements',
  'clients','fournisseurs','factures','devis','creances','ventes',
  'medicaments','commandes','inventaire','historique',
  'depenses','finances'
],
  veterinaire: ['dashboard','monprofil','patients','consultations','dossiers','ordonnances','chirurgies','hospitalisation','agenda','taches','calculateur','consentements','clients','ia','traitements','carteclients'],
  // Alias de droits pour compatibilité avec d'anciens comptes
  utilisateur: ['dashboard','monprofil','patients','consultations','dossiers','ordonnances','chirurgies','hospitalisation','agenda','taches','calculateur','consentements','clients','ia','traitements','carteclients'],
  pharmacien:  ['dashboard','monprofil','patients','clients','medicaments','commandes','inventaire','ventes','devis','creances','ordonnances','factures','caisse','lots','ia','carteclients','traitements'],
  caissier:    ['dashboard','monprofil','ventes','clients','devis','creances','factures','caisse','carteclients'],
}

export const canAccess = (role, id) => {
  if (!role) return false

  // Admin total
  if (role === 'admin') return true

  // Admin secondaire (bloquer comptes)
  if (role === 'admin2') {
    if (id === 'comptes') return false
    return true
  }

  return (ROLE_ACCESS[role] || []).includes(id)
}

export const logAction = async (sb, user, action, details = '') => {
  const entry = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'log-' + Date.now(),
    user_email: user?.email || '?',
    user_name:  user?.name  || '?',
    user_role:  user?.role  || '?',
    action, details,
    created_at: new Date().toISOString(),
  }
  try {
    const logs = JSON.parse(localStorage.getItem('lb_logs') || '[]')
    logs.unshift(entry)
    localStorage.setItem('lb_logs', JSON.stringify(logs.slice(0, 500)))
  } catch (e) {}

  // Even si la persistance Supabase échoue, on notifie le front (même onglet).
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('lb_activity_log', { detail: entry }))
    }
  } catch (e) {}

  if (navigator.onLine && sb) {
    try { await sb.from('activity_logs').insert(entry) } catch (e) {}
  }
}
