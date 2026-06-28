-- Migration : ventes en gros
-- Ajoute le type de vente (détail / gros) à la table ventes
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'detail';

-- Ajoute prix de gros et paliers de remise aux médicaments
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS prix_gros integer NOT NULL DEFAULT 0;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS paliers_gros jsonb NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS ventes_type_idx ON public.ventes (type);
