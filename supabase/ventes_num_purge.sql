-- ════════════════════════════════════════════════════════════════
-- NUMÉRO DE REÇU + PURGE DU JOURNAL D'ACTIVITÉ — 20/08/2026
-- À exécuter dans Supabase → SQL Editor (idempotent).
-- ════════════════════════════════════════════════════════════════

-- ── 1. Numéro de reçu lisible sur les ventes (V-2026-0001…) ────
-- Généré côté serveur par séquence → unique même avec plusieurs
-- postes qui vendent en même temps.
CREATE SEQUENCE IF NOT EXISTS public.ventes_num_seq;

ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS num text;

ALTER TABLE public.ventes
  ALTER COLUMN num SET DEFAULT
    'V-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.ventes_num_seq')::text, 4, '0');

-- Numéroter les anciennes ventes (ordre chronologique)
UPDATE public.ventes v
SET num = s.n
FROM (
  SELECT id,
         'V-' || to_char(created_at, 'YYYY') || '-' ||
         lpad((row_number() OVER (ORDER BY created_at))::text, 4, '0') AS n
  FROM public.ventes
  WHERE num IS NULL
) s
WHERE v.id = s.id AND v.num IS NULL;

-- Caler la séquence après le dernier numéro attribué
SELECT setval('public.ventes_num_seq', (SELECT COUNT(*) FROM public.ventes) + 1, false);

-- ── 2. Purge du journal d'activité (rétention 12 mois) ─────────
-- Appelée automatiquement par l'app à l'ouverture du Journal.
CREATE OR REPLACE FUNCTION public.purge_activity_logs(p_months int DEFAULT 12)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.has_role('admin', 'admin2') THEN
    RETURN 0;
  END IF;
  DELETE FROM public.activity_logs
  WHERE created_at < now() - make_interval(months => GREATEST(p_months, 3));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_activity_logs(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_activity_logs(int) TO authenticated;

NOTIFY pgrst, 'reload schema';
