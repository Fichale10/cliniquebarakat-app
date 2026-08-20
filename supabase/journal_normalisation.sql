-- ════════════════════════════════════════════════════════════════
-- NORMALISATION DU JOURNAL D'ACTIVITÉ À LA SOURCE — 20/08/2026
-- À exécuter dans Supabase → SQL Editor (idempotent).
--
-- Des appareils encore sur une ANCIENNE version de l'app écrivent
-- toujours l'UUID de la vente dans les détails. Ce trigger réécrit
-- « Client — montant F » au moment de l'insertion, quelle que soit
-- la version de l'app qui envoie l'entrée.
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.normalize_activity_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uuid uuid;
  v_details text;
BEGIN
  IF NEW.action IN ('vente_caisse', 'vente_added')
     AND NEW.details ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN
    BEGIN
      v_uuid := (substring(NEW.details from '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'))::uuid;
      SELECT COALESCE(NULLIF(v.client, ''), 'Comptoir')
             || ' — '
             || (COALESCE(v.total, 0) + COALESCE(v.tva_amt, 0))::bigint
             || ' F'
             || CASE WHEN v.type = 'cession' THEN ' (achat interne clinique)' ELSE '' END
        INTO v_details
      FROM public.ventes v
      WHERE v.id = v_uuid;
      IF v_details IS NOT NULL THEN
        NEW.details := v_details;
      ELSE
        NEW.details := regexp_replace(NEW.details,
          '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
          'Vente comptoir');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- en cas d'imprévu, on garde le détail original
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_activity_log ON public.activity_logs;
CREATE TRIGGER trg_normalize_activity_log
  BEFORE INSERT ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_activity_log();

-- ── Re-nettoyage des entrées UUID arrivées depuis le dernier passage ──
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

UPDATE public.activity_logs
SET details = regexp_replace(details,
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
  'Vente comptoir')
WHERE action IN ('vente_caisse', 'vente_added')
  AND details ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

-- Vérification : doit renvoyer 0 ligne
SELECT action, COUNT(*) AS restants_avec_uuid
FROM public.activity_logs
WHERE details ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
GROUP BY action;
