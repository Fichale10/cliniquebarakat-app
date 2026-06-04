-- Politiques RLS table medicaments (sinon DELETE silencieux / refusé)
-- Exécuter dans Supabase → SQL Editor

ALTER TABLE public.medicaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medicaments_select_auth" ON public.medicaments;
CREATE POLICY "medicaments_select_auth"
  ON public.medicaments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "medicaments_insert_auth" ON public.medicaments;
CREATE POLICY "medicaments_insert_auth"
  ON public.medicaments FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "medicaments_update_auth" ON public.medicaments;
CREATE POLICY "medicaments_update_auth"
  ON public.medicaments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "medicaments_delete_auth" ON public.medicaments;
CREATE POLICY "medicaments_delete_auth"
  ON public.medicaments FOR DELETE
  TO authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
