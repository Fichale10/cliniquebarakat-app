-- ════════════════════════════════════════════════════════════════
-- PRODUITS DU BLOC OPÉRATOIRE + VENTE LIÉE (Chirurgies)
-- À exécuter dans Supabase → SQL Editor (idempotent).
-- Même modèle que les consultations : produits facturés, stock
-- décompté, CA visible en Finances/Créances via une vente liée.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.chirurgies ADD COLUMN IF NOT EXISTS produits jsonb NOT NULL DEFAULT '[]';

ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS chirurgie_id uuid;
CREATE INDEX IF NOT EXISTS ventes_chirurgie_idx ON public.ventes (chirurgie_id);

NOTIFY pgrst, 'reload schema';
