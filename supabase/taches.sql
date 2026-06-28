-- Table tâches équipe
CREATE TABLE IF NOT EXISTS public.taches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre       text NOT NULL DEFAULT '',
  membres     jsonb NOT NULL DEFAULT '[]',
  priorite    text NOT NULL DEFAULT 'Normale',
  statut      text NOT NULL DEFAULT 'À faire',
  echeance    date NOT NULL DEFAULT CURRENT_DATE,
  categorie   text NOT NULL DEFAULT 'Autre',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS taches_statut_idx   ON public.taches (statut);
CREATE INDEX IF NOT EXISTS taches_echeance_idx ON public.taches (echeance DESC);

ALTER TABLE public.taches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taches_select" ON public.taches FOR SELECT TO authenticated USING (true);
CREATE POLICY "taches_insert" ON public.taches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "taches_update" ON public.taches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "taches_delete" ON public.taches FOR DELETE TO authenticated USING (true);
