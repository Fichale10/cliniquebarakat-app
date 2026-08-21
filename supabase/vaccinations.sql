-- ════════════════════════════════════════════════════════════════
-- VACCINATIONS — 21/08/2026
-- À exécuter dans Supabase → SQL Editor (idempotent).
-- Registre des vaccinations par espèce + rappels périodiques.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.vaccinations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date           date NOT NULL DEFAULT CURRENT_DATE,
  espece         text NOT NULL DEFAULT 'Chien',
  patient        text NOT NULL DEFAULT '',
  nombre         integer NOT NULL DEFAULT 1,          -- nb d'animaux (troupeaux, volailles)
  proprio        text NOT NULL DEFAULT '',
  tel            text NOT NULL DEFAULT '',
  vaccin         text NOT NULL DEFAULT '',
  lot            text NOT NULL DEFAULT '',
  dose           text NOT NULL DEFAULT '',
  voie           text NOT NULL DEFAULT '',
  veterinaire    text NOT NULL DEFAULT '',
  validite_mois  integer NOT NULL DEFAULT 12,
  rappel         date,                                 -- prochain rappel calculé
  notes          text NOT NULL DEFAULT '',
  created_by     text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vaccinations_rappel_idx  ON public.vaccinations (rappel);
CREATE INDEX IF NOT EXISTS vaccinations_patient_idx ON public.vaccinations (patient);
CREATE INDEX IF NOT EXISTS vaccinations_date_idx    ON public.vaccinations (date DESC);

ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vaccinations_select" ON public.vaccinations;
DROP POLICY IF EXISTS "vaccinations_insert" ON public.vaccinations;
DROP POLICY IF EXISTS "vaccinations_update" ON public.vaccinations;
DROP POLICY IF EXISTS "vaccinations_delete" ON public.vaccinations;

CREATE POLICY "vaccinations_select" ON public.vaccinations FOR SELECT TO authenticated USING (true);
CREATE POLICY "vaccinations_insert" ON public.vaccinations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vaccinations_update" ON public.vaccinations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "vaccinations_delete" ON public.vaccinations FOR DELETE TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';
