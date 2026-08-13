-- Table medicaments (référentiel pharmacie)
-- NOTE : les politiques RLS sont dans medicaments_policies.sql
CREATE TABLE IF NOT EXISTS public.medicaments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref          text NOT NULL DEFAULT '',
  nom          text NOT NULL DEFAULT '',
  categorie    text NOT NULL DEFAULT '',
  unite        text NOT NULL DEFAULT '',
  stock        numeric NOT NULL DEFAULT 0,
  seuil        numeric NOT NULL DEFAULT 0,
  prix_achat   numeric NOT NULL DEFAULT 0,
  prix_vente   numeric NOT NULL DEFAULT 0,
  fournisseur  text NOT NULL DEFAULT '',
  dose_mg_kg   numeric,
  lot          text NOT NULL DEFAULT '',
  peremption   date,
  tarifs       jsonb NOT NULL DEFAULT '[]',
  prix_gros    numeric NOT NULL DEFAULT 0,
  paliers_gros jsonb NOT NULL DEFAULT '[]',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medicaments_nom_idx        ON public.medicaments (nom);
CREATE INDEX IF NOT EXISTS medicaments_categorie_idx  ON public.medicaments (categorie);
CREATE INDEX IF NOT EXISTS medicaments_peremption_idx ON public.medicaments (peremption);
