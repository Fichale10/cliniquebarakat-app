-- ════════════════════════════════════════════════════════════════
-- VACCINATIONS v2 — 21/08/2026
-- À exécuter dans Supabase → SQL Editor (idempotent).
-- Facturation liée : prix de l'acte + lien vers la vente créée.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS prix     numeric NOT NULL DEFAULT 0;
ALTER TABLE public.vaccinations ADD COLUMN IF NOT EXISTS vente_id uuid;

NOTIFY pgrst, 'reload schema';
