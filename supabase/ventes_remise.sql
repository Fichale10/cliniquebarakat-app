-- ════════════════════════════════════════════════════════════════
-- REMISE SUR LES VENTES — 20/08/2026
-- À exécuter dans Supabase → SQL Editor (idempotent).
-- Colonne remise (montant en F) : trace de la remise accordée.
-- Convention : ventes.total = montant NET après remise (les calculs
-- de CA existants restent donc inchangés) ; remise = information.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS remise numeric NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
