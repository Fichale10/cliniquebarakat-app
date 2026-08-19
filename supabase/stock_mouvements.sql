-- ════════════════════════════════════════════════════════════════
-- JOURNAL DES MOUVEMENTS DE STOCK — 19/08/2026
-- À exécuter dans Supabase → SQL Editor (idempotent).
--
-- Trigger sur medicaments : CHAQUE changement de stock (vente,
-- réception, inventaire, annulation, édition de fiche, RPC…) est
-- historisé automatiquement côté serveur avec l'email de l'auteur.
-- Répond à « pourquoi le stock de X est à N ? » et détecte les écarts.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.stock_mouvements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  med_id         uuid,
  med_nom        text NOT NULL DEFAULT '',
  stock_avant    numeric,
  stock_apres    numeric,
  clinique_avant numeric,
  clinique_apres numeric,
  par_email      text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_stock_mouv_date ON public.stock_mouvements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_mouv_med  ON public.stock_mouvements (med_id);

ALTER TABLE public.stock_mouvements ENABLE ROW LEVEL SECURITY;

-- Lecture : rôles pharmacie + admins (page Inventaire → Mouvements)
DROP POLICY IF EXISTS "stock_mouvements_select" ON public.stock_mouvements;
CREATE POLICY "stock_mouvements_select" ON public.stock_mouvements
  FOR SELECT TO authenticated
  USING ((SELECT public.has_role('admin','admin2','pharmacien','technicien')));
-- Aucune policy INSERT/UPDATE/DELETE : seule la fonction trigger
-- (SECURITY DEFINER) écrit dans cette table → journal inviolable.

CREATE OR REPLACE FUNCTION public.log_stock_mouvement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stock IS DISTINCT FROM OLD.stock
     OR NEW.stock_clinique IS DISTINCT FROM OLD.stock_clinique THEN
    INSERT INTO public.stock_mouvements
      (med_id, med_nom, stock_avant, stock_apres, clinique_avant, clinique_apres, par_email)
    VALUES
      (NEW.id, COALESCE(NEW.nom,''), OLD.stock, NEW.stock,
       OLD.stock_clinique, NEW.stock_clinique,
       COALESCE(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_stock_mouvement ON public.medicaments;
CREATE TRIGGER trg_log_stock_mouvement
  AFTER UPDATE ON public.medicaments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_stock_mouvement();

NOTIFY pgrst, 'reload schema';
