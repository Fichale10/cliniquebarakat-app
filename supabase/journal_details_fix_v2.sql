-- ════════════════════════════════════════════════════════════════
-- NETTOYAGE JOURNAL D'ACTIVITÉ (v2) — 19/08/2026
-- À exécuter dans Supabase → SQL Editor.
-- v2 : matche les détails qui COMMENCENT par un UUID (espaces,
-- texte additionnel tolérés), au lieu d'exiger un UUID exact.
-- ════════════════════════════════════════════════════════════════

-- 0) Diagnostic : à quoi ressemblent les anciens détails ?
SELECT action, details, length(details) AS len
FROM public.activity_logs
WHERE action IN ('vente_caisse', 'vente_added')
  AND details ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
ORDER BY created_at DESC
LIMIT 5;

-- 1) Ventes encore présentes : détails reconstruits « Client — montant TTC »
UPDATE public.activity_logs al
SET details = COALESCE(NULLIF(v.client, ''), 'Comptoir')
              || ' — '
              || (COALESCE(v.total, 0) + COALESCE(v.tva_amt, 0))::bigint
              || ' F'
              || CASE WHEN v.type = 'cession' THEN ' (achat interne clinique)' ELSE '' END
FROM public.ventes v
WHERE al.action IN ('vente_caisse', 'vente_added')
  AND al.details ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  AND v.id = (substring(al.details from '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'))::uuid;

-- 2) Ventes supprimées entre-temps : on remplace juste l'UUID par un
--    libellé, en CONSERVANT le montant déjà présent (« UUID — 5 000 F »
--    devient « Vente comptoir — 5 000 F »)
UPDATE public.activity_logs
SET details = regexp_replace(
                details,
                '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
                'Vente comptoir'
              )
WHERE action IN ('vente_caisse', 'vente_added')
  AND details ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

-- 3) Vérification : doit renvoyer 0 ligne
SELECT action, COUNT(*) AS restants_avec_uuid
FROM public.activity_logs
WHERE details ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
GROUP BY action;
