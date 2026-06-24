-- Table devis & estimations
CREATE TABLE IF NOT EXISTS public.devis (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  num      text NOT NULL DEFAULT '',
  date     date NOT NULL DEFAULT CURRENT_DATE,
  client   text NOT NULL DEFAULT '',
  objet    text NOT NULL DEFAULT '',
  lignes   jsonb NOT NULL DEFAULT '[]',
  validite date,
  notes    text NOT NULL DEFAULT '',
  total    numeric NOT NULL DEFAULT 0,
  statut   text NOT NULL DEFAULT 'Brouillon',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS devis_date_idx ON public.devis (date DESC);

ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devis_select" ON public.devis FOR SELECT TO authenticated USING (true);
CREATE POLICY "devis_insert" ON public.devis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "devis_update" ON public.devis FOR UPDATE TO authenticated USING (true);
CREATE POLICY "devis_delete" ON public.devis FOR DELETE TO authenticated USING (true);
