-- Table versements fournisseurs (paiements des dettes)
CREATE TABLE IF NOT EXISTS public.versements_fournisseurs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fournisseur text NOT NULL DEFAULT '',
  montant     integer NOT NULL DEFAULT 0,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  mode        text NOT NULL DEFAULT 'Espèces',
  note        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS versements_four_date_idx ON public.versements_fournisseurs (date DESC);
CREATE INDEX IF NOT EXISTS versements_four_nom_idx  ON public.versements_fournisseurs (fournisseur);

ALTER TABLE public.versements_fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "versements_four_select" ON public.versements_fournisseurs FOR SELECT TO authenticated USING (true);
CREATE POLICY "versements_four_insert" ON public.versements_fournisseurs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "versements_four_update" ON public.versements_fournisseurs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "versements_four_delete" ON public.versements_fournisseurs FOR DELETE TO authenticated USING (true);
