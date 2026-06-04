-- Table ventes — alignée sur src/lib/validation (venteFormToRow / Caisse)
-- Erreur typique : POST /ventes 400 — colonne manquante ou mauvais type (ex. lignes jsonb)
--
-- Exécuter dans Supabase → SQL Editor, puis recharger le schéma API.

CREATE TABLE IF NOT EXISTS public.ventes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  client text NOT NULL DEFAULT '',
  lignes jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'Payé',
  mode text NOT NULL DEFAULT 'Espèces',
  note text NOT NULL DEFAULT '',
  tva_amt numeric NOT NULL DEFAULT 0,
  caissier text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Colonnes si la table existait déjà avec un autre schéma
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS date date NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS client text NOT NULL DEFAULT '';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS lignes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS total numeric NOT NULL DEFAULT 0;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'Payé';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'Espèces';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS tva_amt numeric NOT NULL DEFAULT 0;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS caissier text NOT NULL DEFAULT '';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS ventes_date_idx ON public.ventes (date DESC);
CREATE INDEX IF NOT EXISTS ventes_created_at_idx ON public.ventes (created_at DESC);

ALTER TABLE public.ventes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ventes_select_auth" ON public.ventes;
CREATE POLICY "ventes_select_auth"
  ON public.ventes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "ventes_insert_auth" ON public.ventes;
CREATE POLICY "ventes_insert_auth"
  ON public.ventes FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "ventes_update_auth" ON public.ventes;
CREATE POLICY "ventes_update_auth"
  ON public.ventes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
