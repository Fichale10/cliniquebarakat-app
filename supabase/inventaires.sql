-- Table inventaires (clôtures d'inventaire pharmacie)
CREATE TABLE IF NOT EXISTS public.inventaires (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  statut      text NOT NULL DEFAULT 'cloture',
  lignes      jsonb NOT NULL DEFAULT '[]',
  nb_ecarts   integer NOT NULL DEFAULT 0,
  cloture_par text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventaires_date_idx ON public.inventaires (date DESC);

ALTER TABLE public.inventaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventaires_select" ON public.inventaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventaires_insert" ON public.inventaires FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inventaires_update" ON public.inventaires FOR UPDATE TO authenticated USING (true);
CREATE POLICY "inventaires_delete" ON public.inventaires FOR DELETE TO authenticated USING (true);
