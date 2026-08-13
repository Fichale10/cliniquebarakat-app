-- Table clinique_settings (paramètres de la structure, format clé/valeur)
-- Clés utilisées : nom, sousTitre, tel, adresse, ville, email
CREATE TABLE IF NOT EXISTS public.clinique_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinique_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinique_settings_select" ON public.clinique_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "clinique_settings_insert" ON public.clinique_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clinique_settings_update" ON public.clinique_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "clinique_settings_delete" ON public.clinique_settings FOR DELETE TO authenticated USING (true);
