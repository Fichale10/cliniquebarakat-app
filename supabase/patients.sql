-- Table patients
CREATE TABLE IF NOT EXISTS public.patients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         text NOT NULL DEFAULT '',
  espece      text NOT NULL DEFAULT 'Chien',
  race        text NOT NULL DEFAULT '',
  age         text NOT NULL DEFAULT '',
  sexe        text NOT NULL DEFAULT 'M',
  proprio     text NOT NULL DEFAULT '',
  tel         text NOT NULL DEFAULT '',
  poids       text NOT NULL DEFAULT '',
  couleur     text NOT NULL DEFAULT '',
  allergies   text NOT NULL DEFAULT '',
  antecedents text NOT NULL DEFAULT '',
  photo       text NOT NULL DEFAULT '',
  vaccins     jsonb NOT NULL DEFAULT '[]',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patients_nom_idx    ON public.patients (nom);
CREATE INDEX IF NOT EXISTS patients_proprio_idx ON public.patients (proprio);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_select" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "patients_insert" ON public.patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "patients_update" ON public.patients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "patients_delete" ON public.patients FOR DELETE TO authenticated USING (true);
