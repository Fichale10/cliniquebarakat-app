-- ════════════════════════════════════════════════════════════════
-- AJUSTEMENT ATOMIQUE DU STOCK — à exécuter dans Supabase → SQL Editor
-- Corrige la désynchronisation ventes ↔ stock :
--   1. UPDATE atomique côté serveur (stock = stock + delta) → plus
--      d'écrasement quand deux postes vendent en même temps.
--   2. SECURITY DEFINER → fonctionne pour TOUS les rôles connectés.
--      (La policy medicaments_update_roles excluait vétérinaire et
--      utilisateur : leurs ventes/consultations ne décrémentaient
--      PAS le stock, sans aucune erreur visible.)
-- Idempotent : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_id             uuid,
  p_delta_stock    numeric DEFAULT 0,
  p_delta_clinique numeric DEFAULT 0
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.medicaments
     SET stock          = GREATEST(0, COALESCE(stock, 0)          + COALESCE(p_delta_stock, 0)),
         stock_clinique = GREATEST(0, COALESCE(stock_clinique, 0) + COALESCE(p_delta_clinique, 0))
   WHERE id = p_id;
$$;

REVOKE ALL ON FUNCTION public.adjust_stock(uuid, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_stock(uuid, numeric, numeric) TO authenticated;

NOTIFY pgrst, 'reload schema';
