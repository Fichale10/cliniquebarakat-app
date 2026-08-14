-- ════════════════════════════════════════════════════════════════
-- RATTRAPAGE COMPLET DES COLONNES — 14/08/2026
-- À exécuter dans Supabase → SQL Editor (idempotent, sans risque).
-- Aligne TOUTES les tables sur les colonnes que l'application envoie.
-- Corrige notamment : "could not find the 'lignes' column of 'commandes'".
-- ════════════════════════════════════════════════════════════════

-- ── COMMANDES (fix erreur 'lignes') ─────────────────────────────
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS num            text NOT NULL DEFAULT '';
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS date           date NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS fournisseur    text NOT NULL DEFAULT '';
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS lignes         jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS total          numeric NOT NULL DEFAULT 0;
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS statut         text NOT NULL DEFAULT 'En attente';
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS date_reception date;
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS echeance       date;
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS created_at     timestamptz NOT NULL DEFAULT now();

-- ── VENTES ──────────────────────────────────────────────────────
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS date            date NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS client          text NOT NULL DEFAULT '';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS lignes          jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS total           numeric NOT NULL DEFAULT 0;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS statut          text NOT NULL DEFAULT 'Payé';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS mode            text NOT NULL DEFAULT 'Espèces';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS note            text NOT NULL DEFAULT '';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS tva_amt         numeric NOT NULL DEFAULT 0;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS montant_paye    numeric NOT NULL DEFAULT 0;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS type            text NOT NULL DEFAULT 'detail';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS caissier        text NOT NULL DEFAULT '';
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS consultation_id uuid;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS chirurgie_id    uuid;

-- ── MEDICAMENTS ─────────────────────────────────────────────────
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS ref            text NOT NULL DEFAULT '';
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS categorie      text NOT NULL DEFAULT '';
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS unite          text NOT NULL DEFAULT '';
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS stock          numeric NOT NULL DEFAULT 0;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS seuil          numeric NOT NULL DEFAULT 0;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS prix_achat     numeric NOT NULL DEFAULT 0;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS prix_vente     numeric NOT NULL DEFAULT 0;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS fournisseur    text NOT NULL DEFAULT '';
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS dose_mg_kg     numeric;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS lot            text NOT NULL DEFAULT '';
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS peremption     date;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS tarifs         jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS prix_gros      numeric NOT NULL DEFAULT 0;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS paliers_gros   jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS stock_clinique numeric NOT NULL DEFAULT 0;

-- ── CHIRURGIES ──────────────────────────────────────────────────
ALTER TABLE public.chirurgies ADD COLUMN IF NOT EXISTS produits jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ── CONSULTATIONS (traitements + SOAP) ──────────────────────────
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS traitements jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ── PATIENTS (carnet de vaccination) ────────────────────────────
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS vaccins jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ── FOURNISSEURS (déjà passé mais on s'assure) ──────────────────
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

-- ── Recharger le cache de schéma de l'API ───────────────────────
NOTIFY pgrst, 'reload schema';
