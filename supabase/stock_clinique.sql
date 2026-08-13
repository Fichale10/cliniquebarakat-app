-- ════════════════════════════════════════════════════════════════
-- DEUX CAISSES : STOCK CLINIQUE + ACHATS INTERNES
-- À exécuter dans Supabase → SQL Editor (idempotent).
-- La clinique achète à la pharmacie comme un client (prix public) :
--   · vente marquée type='cession' (exclue du CA consolidé)
--   · stock pharmacie ↓ et stock clinique ↑
-- Les consultations/chirurgies/traitements consomment le stock clinique.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.medicaments ADD COLUMN IF NOT EXISTS stock_clinique numeric NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
