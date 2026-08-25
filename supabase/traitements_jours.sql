-- ════════════════════════════════════════════════════════════════
-- TRAITEMENTS — DURÉE EN JOURS — 25/08/2026
-- À exécuter dans Supabase → SQL Editor (idempotent).
-- La dose saisie est PAR JOUR ; le total facturé = dose/j × prix × jours.
-- jours est calculé des dates début→fin (inclus) et reste modifiable.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.traitements ADD COLUMN IF NOT EXISTS jours integer NOT NULL DEFAULT 1;

NOTIFY pgrst, 'reload schema';
