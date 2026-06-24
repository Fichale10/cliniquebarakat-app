-- Table consultations (format SOAP)
CREATE TABLE IF NOT EXISTS public.consultations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  patient     text NOT NULL DEFAULT '',
  proprio     text NOT NULL DEFAULT '',
  poids       text NOT NULL DEFAULT '',
  temperature text NOT NULL DEFAULT '',
  fc          text NOT NULL DEFAULT '',
  soap_s      text NOT NULL DEFAULT '',
  soap_o      text NOT NULL DEFAULT '',
  soap_a      text NOT NULL DEFAULT '',
  soap_p      text NOT NULL DEFAULT '',
  montant     integer NOT NULL DEFAULT 0,
  statut      text NOT NULL DEFAULT 'En attente',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultations_date_idx    ON public.consultations (date DESC);
CREATE INDEX IF NOT EXISTS consultations_patient_idx ON public.consultations (patient);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultations_select" ON public.consultations FOR SELECT TO authenticated USING (true);
CREATE POLICY "consultations_insert" ON public.consultations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "consultations_update" ON public.consultations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "consultations_delete" ON public.consultations FOR DELETE TO authenticated USING (true);
