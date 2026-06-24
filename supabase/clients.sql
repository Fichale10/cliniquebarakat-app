-- Table clients
CREATE TABLE IF NOT EXISTS public.clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        text NOT NULL DEFAULT '',
  tel        text NOT NULL DEFAULT '',
  email      text NOT NULL DEFAULT '',
  adresse    text NOT NULL DEFAULT '',
  animaux    integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_nom_idx ON public.clients (nom);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated USING (true);
