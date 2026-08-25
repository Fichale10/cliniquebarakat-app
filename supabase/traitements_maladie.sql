-- ════════════════════════════════════════════════════════════════
-- TRAITEMENTS — MALADIE / DIAGNOSTIC — 25/08/2026
-- À exécuter dans Supabase → SQL Editor (idempotent).
-- Quelle affection est traitée ou suivie, et à quel degré de
-- certitude : Suspicion / Confirmée / Suivi.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.traitements ADD COLUMN IF NOT EXISTS maladie   text NOT NULL DEFAULT '';
ALTER TABLE public.traitements ADD COLUMN IF NOT EXISTS certitude text NOT NULL DEFAULT 'Suspicion';

NOTIFY pgrst, 'reload schema';
