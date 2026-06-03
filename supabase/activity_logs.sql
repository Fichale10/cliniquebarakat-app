-- Journal d'activité (aligné sur src/lib/roles.js → logAction)
-- Exécuter dans Supabase → SQL Editor si POST /activity_logs renvoie 400

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL DEFAULT '',
  user_name text NOT NULL DEFAULT '',
  user_role text NOT NULL DEFAULT '',
  action text NOT NULL,
  details text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

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

-- Si la table existait déjà avec id bigint, migrer ou recréer selon votre cas.
-- L'app n'envoie plus id côté client : la base génère uuid.
