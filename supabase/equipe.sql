-- Table equipe (membres de l'équipe — Paramètres → Mon équipe)
-- NOTE : id en text (ids générés côté front : 'equ-001', Date.now()…)
CREATE TABLE IF NOT EXISTS public.equipe (
  id         text PRIMARY KEY,
  nom        text NOT NULL DEFAULT '',
  role       text NOT NULL DEFAULT 'ASV',
  tel        text NOT NULL DEFAULT '',
  actif      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.equipe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe_select" ON public.equipe FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipe_insert" ON public.equipe FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "equipe_update" ON public.equipe FOR UPDATE TO authenticated USING (true);
CREATE POLICY "equipe_delete" ON public.equipe FOR DELETE TO authenticated USING (true);
