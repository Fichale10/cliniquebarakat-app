-- Table factures
CREATE TABLE IF NOT EXISTS public.factures (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  num         text NOT NULL DEFAULT '',
  date        date NOT NULL DEFAULT CURRENT_DATE,
  client      text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  montant     numeric NOT NULL DEFAULT 0,
  statut      text NOT NULL DEFAULT 'En attente',
  mode        text NOT NULL DEFAULT 'Espèces',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS factures_date_idx ON public.factures (date DESC);

ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "factures_select" ON public.factures FOR SELECT TO authenticated USING (true);
CREATE POLICY "factures_insert" ON public.factures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "factures_update" ON public.factures FOR UPDATE TO authenticated USING (true);
CREATE POLICY "factures_delete" ON public.factures FOR DELETE TO authenticated USING (true);
