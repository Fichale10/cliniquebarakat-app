-- Table commandes fournisseurs
CREATE TABLE IF NOT EXISTS public.commandes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  num         text NOT NULL DEFAULT '',
  date        date NOT NULL DEFAULT CURRENT_DATE,
  fournisseur text NOT NULL DEFAULT '',
  lignes      jsonb NOT NULL DEFAULT '[]',
  total       integer NOT NULL DEFAULT 0,
  statut      text NOT NULL DEFAULT 'En attente',
  date_reception date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commandes_date_idx       ON public.commandes (date DESC);
CREATE INDEX IF NOT EXISTS commandes_fournisseur_idx ON public.commandes (fournisseur);
CREATE INDEX IF NOT EXISTS commandes_statut_idx      ON public.commandes (statut);

ALTER TABLE public.commandes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commandes_select" ON public.commandes FOR SELECT TO authenticated USING (true);
CREATE POLICY "commandes_insert" ON public.commandes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "commandes_update" ON public.commandes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "commandes_delete" ON public.commandes FOR DELETE TO authenticated USING (true);
