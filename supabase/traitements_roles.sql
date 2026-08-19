-- ════════════════════════════════════════════════════════════════
-- TRAITEMENTS : sécurisation RLS par rôle — 19/08/2026
-- À exécuter dans Supabase → SQL Editor (idempotent).
-- Remplace les policies permissives USING (true) de traitements.sql
-- par des policies alignées sur ROLE_ACCESS (roles.js) :
-- la page Suivi traitements est accessible à admin, admin2,
-- veterinaire, utilisateur, pharmacien et technicien.
-- ════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "traitements_select" ON public.traitements;
DROP POLICY IF EXISTS "traitements_insert" ON public.traitements;
DROP POLICY IF EXISTS "traitements_update" ON public.traitements;
DROP POLICY IF EXISTS "traitements_delete" ON public.traitements;
DROP POLICY IF EXISTS "traitements_roles"  ON public.traitements;

CREATE POLICY "traitements_roles" ON public.traitements
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','pharmacien','technicien')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','pharmacien','technicien')));

NOTIFY pgrst, 'reload schema';
