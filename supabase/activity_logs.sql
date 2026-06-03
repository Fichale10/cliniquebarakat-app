-- Migration activity_logs — aligner la table existante sur l'app (src/lib/roles.js)
-- Erreur typique : Could not find the 'user_email' column in the schema cache
--
-- 1) Exécuter tout ce fichier dans Supabase → SQL Editor
-- 2) Table Editor → activity_logs → colonnes visibles : user_email, user_name, user_role, action, details, created_at
-- 3) Settings → API → Reload schema (ou attendre ~1 min)

-- Colonnes utilisées par l'app (ajout si manquantes)
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS user_email text NOT NULL DEFAULT '';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS user_name text NOT NULL DEFAULT '';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS user_role text NOT NULL DEFAULT '';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS action text;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS details text NOT NULL DEFAULT '';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Si d'anciennes colonnes existent sans préfixe user_, décommenter et adapter :
-- UPDATE public.activity_logs SET user_email = COALESCE(user_email, email, '') WHERE email IS NOT NULL;
-- UPDATE public.activity_logs SET user_name  = COALESCE(user_name, nom, name, '') WHERE nom IS NOT NULL OR name IS NOT NULL;
-- UPDATE public.activity_logs SET user_role  = COALESCE(user_role, role, '') WHERE role IS NOT NULL;

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx
  ON public.activity_logs (created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select_auth" ON public.activity_logs;
CREATE POLICY "activity_logs_select_auth"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "activity_logs_insert_auth" ON public.activity_logs;
CREATE POLICY "activity_logs_insert_auth"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Recharger le cache schéma PostgREST
NOTIFY pgrst, 'reload schema';
