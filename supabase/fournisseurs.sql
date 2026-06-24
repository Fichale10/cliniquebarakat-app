-- Table fournisseurs
CREATE TABLE IF NOT EXISTS public.fournisseurs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom                  text NOT NULL DEFAULT '',
  contact              text NOT NULL DEFAULT '',
  tel                  text NOT NULL DEFAULT '',
  email                text NOT NULL DEFAULT '',
  adresse              text NOT NULL DEFAULT '',
  ville                text NOT NULL DEFAULT 'Lomé',
  pays                 text NOT NULL DEFAULT 'Togo',
  specialite           text NOT NULL DEFAULT 'Médicaments vétérinaires',
  delai_livraison      integer NOT NULL DEFAULT 5,
  conditions_paiement  text NOT NULL DEFAULT '30j',
  remise               numeric NOT NULL DEFAULT 0,
  note_qualite         integer NOT NULL DEFAULT 3,
  actif                boolean NOT NULL DEFAULT true,
  notes                text NOT NULL DEFAULT '',
  date_debut           date,
  rib                  text NOT NULL DEFAULT '',
  site_web             text NOT NULL DEFAULT '',
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS contact             text NOT NULL DEFAULT '';
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS delai_livraison     integer NOT NULL DEFAULT 5;
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS conditions_paiement text NOT NULL DEFAULT '30j';
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS note_qualite        integer NOT NULL DEFAULT 3;
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS date_debut          date;
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS site_web            text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS fournisseurs_nom_idx ON public.fournisseurs (nom);

ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fournisseurs_select" ON public.fournisseurs FOR SELECT TO authenticated USING (true);
CREATE POLICY "fournisseurs_insert" ON public.fournisseurs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "fournisseurs_update" ON public.fournisseurs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "fournisseurs_delete" ON public.fournisseurs FOR DELETE TO authenticated USING (true);
