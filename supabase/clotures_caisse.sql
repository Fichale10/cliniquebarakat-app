-- ════════════════════════════════════════════════════════════════
-- CLÔTURE DE CAISSE JOURNALIÈRE
-- À exécuter dans Supabase → SQL Editor (idempotent).
-- Contrôle de fin de journée : montants attendus vs comptés,
-- écart, caissier. Historique consultable.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.clotures_caisse (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  caissier    text NOT NULL DEFAULT '',
  attendu     jsonb NOT NULL DEFAULT '{}',   -- { "Espèces": 45000, "Mobile Money": 12000, ... }
  compte      jsonb NOT NULL DEFAULT '{}',   -- montants réellement comptés
  ecart       numeric NOT NULL DEFAULT 0,    -- compté - attendu (total)
  nb_ventes   integer NOT NULL DEFAULT 0,
  note        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clotures_caisse_date_idx ON public.clotures_caisse (date DESC);

ALTER TABLE public.clotures_caisse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clotures_caisse_roles" ON public.clotures_caisse;
CREATE POLICY "clotures_caisse_roles" ON public.clotures_caisse
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','pharmacien','caissier')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','pharmacien','caissier')));

NOTIFY pgrst, 'reload schema';
