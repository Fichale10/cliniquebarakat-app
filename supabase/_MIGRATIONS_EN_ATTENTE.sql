-- ════════════════════════════════════════════════════════════════
-- SCRIPT UNIQUE — TOUTES LES MIGRATIONS EN ATTENTE (13/08/2026)
-- À exécuter UNE FOIS dans Supabase → SQL Editor.
-- Idempotent : ré-exécutable sans risque, ne touche pas aux données.
-- Regroupe : fournisseurs (fix colonnes), échéances commandes,
-- produits chirurgies, clôtures de caisse, traitements, stock clinique.
-- ════════════════════════════════════════════════════════════════

-- ── 1. FOURNISSEURS : colonnes manquantes (fix "actif column not found")
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS contact             text NOT NULL DEFAULT '';
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS tel                 text NOT NULL DEFAULT '';
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS email               text NOT NULL DEFAULT '';
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS adresse             text NOT NULL DEFAULT '';
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS ville               text NOT NULL DEFAULT 'Lomé';
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS pays                text NOT NULL DEFAULT 'Togo';
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS specialite          text NOT NULL DEFAULT 'Médicaments vétérinaires';
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS delai_livraison     integer NOT NULL DEFAULT 5;
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS conditions_paiement text NOT NULL DEFAULT '30j';
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS remise              numeric NOT NULL DEFAULT 0;
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS note_qualite        integer NOT NULL DEFAULT 3;
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS actif               boolean NOT NULL DEFAULT true;
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS notes               text NOT NULL DEFAULT '';
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS date_debut          date;
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS rib                 text NOT NULL DEFAULT '';
ALTER TABLE public.fournisseurs ADD COLUMN IF NOT EXISTS site_web            text NOT NULL DEFAULT '';

-- ── 2. COMMANDES : échéance de paiement fournisseur (alertes Dashboard)
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS echeance date;
CREATE INDEX IF NOT EXISTS commandes_echeance_idx ON public.commandes (echeance);

-- ── 3. CHIRURGIES : produits du bloc + vente liée
ALTER TABLE public.chirurgies ADD COLUMN IF NOT EXISTS produits jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS chirurgie_id uuid;
CREATE INDEX IF NOT EXISTS ventes_chirurgie_idx ON public.ventes (chirurgie_id);

-- ── 4. CLÔTURES DE CAISSE
CREATE TABLE IF NOT EXISTS public.clotures_caisse (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  caissier    text NOT NULL DEFAULT '',
  attendu     jsonb NOT NULL DEFAULT '{}',   -- { "Espèces": 45000, "Mobile Money": 12000, ... }
  compte      jsonb NOT NULL DEFAULT '{}',   -- montants réellement comptés
  ecart       numeric NOT NULL DEFAULT 0,    -- compté - attendu (total)
  nb_ventes   integer NOT NULL DEFAULT 0,
  note        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clotures_caisse_date_idx ON public.clotures_caisse (date DESC);
ALTER TABLE public.clotures_caisse ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clotures_caisse_roles" ON public.clotures_caisse;
CREATE POLICY "clotures_caisse_roles" ON public.clotures_caisse
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','pharmacien','caissier')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','pharmacien','caissier')));

-- ── 5. SUIVI DES TRAITEMENTS (montants + facturation liée)
CREATE TABLE IF NOT EXISTS public.traitements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient    text NOT NULL DEFAULT '',
  medicament text NOT NULL DEFAULT '',
  posologie  text NOT NULL DEFAULT '',
  frequence  text NOT NULL DEFAULT '1x/jour',
  debut      date,
  fin        date,
  notes      text NOT NULL DEFAULT '',
  actif      boolean NOT NULL DEFAULT true,
  qte        numeric NOT NULL DEFAULT 1,
  pu         numeric NOT NULL DEFAULT 0,
  pa         numeric NOT NULL DEFAULT 0,
  vente_id   uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS traitements_patient_idx ON public.traitements (patient);
CREATE INDEX IF NOT EXISTS traitements_fin_idx     ON public.traitements (fin);
ALTER TABLE public.traitements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "traitements_select" ON public.traitements;
CREATE POLICY "traitements_select" ON public.traitements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "traitements_insert" ON public.traitements;
CREATE POLICY "traitements_insert" ON public.traitements FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "traitements_update" ON public.traitements;
CREATE POLICY "traitements_update" ON public.traitements FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "traitements_delete" ON public.traitements;
CREATE POLICY "traitements_delete" ON public.traitements FOR DELETE TO authenticated USING (true);

-- ── 6. DEUX CAISSES : stock clinique (achats internes à la pharmacie)
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS stock_clinique numeric NOT NULL DEFAULT 0;

-- ── Recharger le cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';
