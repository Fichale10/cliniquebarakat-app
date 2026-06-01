-- À exécuter dans Supabase → SQL Editor
-- Permet aux admins de gérer tous les profils (liste persistante après F5)

-- Rôle courant sans récursion RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.get_my_role() IN ('admin', 'admin2');
$$;

GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT : soi-même ou admin/admin2
DROP POLICY IF EXISTS "Admin lit tout" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;

CREATE POLICY "Admin lit tout"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.get_my_role() IN ('admin', 'admin2')
  );

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_active_admin())
  WITH CHECK (id = auth.uid() OR public.is_active_admin());

DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin() OR id = auth.uid());

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_active_admin());
