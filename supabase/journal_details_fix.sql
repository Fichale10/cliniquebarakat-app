-- ════════════════════════════════════════════════════════════════
-- NETTOYAGE JOURNAL D'ACTIVITÉ — 19/08/2026
-- À exécuter dans Supabase → SQL Editor (une seule fois suffit,
-- ré-exécutable sans risque).
--
-- Les anciennes entrées vente_caisse/vente_added stockaient l'UUID
-- de la vente au lieu de « Client — montant » (corrigé depuis dans
-- l'app, commit 71406e0). Ce script réécrit les anciens détails en
-- retrouvant la vente correspondante.
-- ════════════════════════════════════════════════════════════════

-- 1) Ventes encore présentes : détails reconstruits « Client — montant TTC »
UPDATE public.activity_logs al
SET details = COALESCE(NULLIF(v.client, ''), 'Comptoir')
              || ' — '
              || (COALESCE(v.total, 0) + COALESCE(v.tva_amt, 0))::bigint
              || ' F'
              || CASE WHEN v.type = 'cession' THEN ' (achat interne clinique)' ELSE '' END
FROM public.ventes v
WHERE al.action IN ('vente_caisse', 'vente_added')
  AND al.details ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND v.id = al.details::uuid;

-- 2) Ventes supprimées entre-temps : marquer explicitement
UPDATE public.activity_logs
SET details = 'Vente (supprimée depuis)'
WHERE action IN ('vente_caisse', 'vente_added')
  AND details ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Vérification : il ne doit plus rester d'UUID dans les détails
SELECT action, COUNT(*) AS restants_avec_uuid
FROM public.activity_logs
WHERE details ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
GROUP BY action;
