-- ════════════════════════════════════════════════════════════════
-- SYNCHRO TEMPS RÉEL ENTRE POSTES — 19/08/2026
-- À exécuter dans Supabase → SQL Editor (idempotent).
--
-- Active la diffusion Realtime des tables ventes et medicaments :
-- une vente ou un mouvement de stock effectué sur un poste est
-- reflété sur tous les autres en ~1 seconde (plus d'attente du
-- polling de 2 min). Les policies RLS SELECT restent respectées.
-- ════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ventes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ventes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'medicaments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.medicaments;
  END IF;
END $$;

-- Vérification : les deux tables doivent apparaître
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
