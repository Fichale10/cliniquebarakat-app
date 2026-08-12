-- ════════════════════════════════════════════════════════════════
-- ÉCHÉANCES DE PAIEMENT FOURNISSEURS
-- À exécuter dans Supabase → SQL Editor (idempotent).
-- Ajoute une date d'échéance optionnelle sur les commandes,
-- pour alerter sur le Dashboard avant les retards de paiement.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS echeance date;
CREATE INDEX IF NOT EXISTS commandes_echeance_idx ON public.commandes (echeance);

NOTIFY pgrst, 'reload schema';
