-- Table rendez-vous
CREATE TABLE IF NOT EXISTS rdvs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL,
  heure       text NOT NULL DEFAULT '09:00',
  patient     text NOT NULL,
  proprio     text DEFAULT '',
  type        text DEFAULT 'Consultation',
  statut      text DEFAULT 'En attente',
  note        text DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE rdvs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rdvs_select" ON rdvs FOR SELECT TO authenticated USING (true);
CREATE POLICY "rdvs_insert" ON rdvs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "rdvs_update" ON rdvs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "rdvs_delete" ON rdvs FOR DELETE TO authenticated USING (true);
