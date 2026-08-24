-- ════════════════════════════════════════════════════════════════
-- TRAITEMENTS MULTI-MÉDICAMENTS — 24/08/2026
-- À exécuter dans Supabase → SQL Editor (idempotent).
-- Un traitement peut nécessiter plusieurs médicaments : la colonne
-- lignes stocke [{med, qte, pu, pa, unite}, …]. Les colonnes
-- medicament/qte/pu/pa restent remplies avec la 1ère ligne
-- (compatibilité avec les anciens traitements et les vieux écrans).
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.traitements ADD COLUMN IF NOT EXISTS lignes jsonb NOT NULL DEFAULT '[]';

NOTIFY pgrst, 'reload schema';
