-- Table chirurgies & actes chirurgicaux
CREATE TABLE IF NOT EXISTS chirurgies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  patient     text NOT NULL,
  proprio     text DEFAULT '',
  type        text DEFAULT '',
  anesthesie  text DEFAULT '',
  duree       text DEFAULT '',
  chirurgien  text DEFAULT '',
  statut      text DEFAULT 'Planifié',
  suivi       text DEFAULT '',
  montant     numeric DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE chirurgies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chir_select" ON chirurgies FOR SELECT TO authenticated USING (true);
CREATE POLICY "chir_insert" ON chirurgies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "chir_update" ON chirurgies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "chir_delete" ON chirurgies FOR DELETE TO authenticated USING (true);
