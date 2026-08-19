-- ════════════════════════════════════════════════════════════════
-- VENTES : accès pour vétérinaire / utilisateur — 19/08/2026
-- À exécuter dans Supabase → SQL Editor (idempotent).
--
-- Pourquoi : Consultations, Chirurgies et Suivi traitements créent
-- des ventes liées (type 'clinique') et synchronisent leur statut.
-- L'ancienne policy ventes_roles excluait veterinaire/utilisateur :
-- la facturation depuis ces écrans était refusée.
--
-- Droits accordés :
--   • SELECT / INSERT / UPDATE → admin, admin2, pharmacien, caissier,
--     veterinaire, utilisateur
--   • DELETE → admin, admin2, pharmacien, caissier uniquement
--     (l'app n'autorise pas la suppression de ventes côté soins)
-- ════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "ventes_roles"        ON public.ventes;
DROP POLICY IF EXISTS "ventes_rw_roles"     ON public.ventes;
DROP POLICY IF EXISTS "ventes_insert_roles" ON public.ventes;
DROP POLICY IF EXISTS "ventes_update_roles" ON public.ventes;
DROP POLICY IF EXISTS "ventes_delete_roles" ON public.ventes;

CREATE POLICY "ventes_rw_roles" ON public.ventes
  FOR SELECT TO authenticated
  USING ((SELECT public.has_role('admin','admin2','pharmacien','caissier','veterinaire','utilisateur')));

CREATE POLICY "ventes_insert_roles" ON public.ventes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_role('admin','admin2','pharmacien','caissier','veterinaire','utilisateur')));

CREATE POLICY "ventes_update_roles" ON public.ventes
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_role('admin','admin2','pharmacien','caissier','veterinaire','utilisateur')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','pharmacien','caissier','veterinaire','utilisateur')));

CREATE POLICY "ventes_delete_roles" ON public.ventes
  FOR DELETE TO authenticated
  USING ((SELECT public.has_role('admin','admin2','pharmacien','caissier')));

NOTIFY pgrst, 'reload schema';
