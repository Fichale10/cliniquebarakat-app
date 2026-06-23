-- Table ordonnances (lignes stockées en JSONB)
CREATE TABLE IF NOT EXISTS ordonnances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  patient     text NOT NULL,
  proprio     text DEFAULT '',
  espece      text DEFAULT '',
  lignes      jsonb NOT NULL DEFAULT '[]',
  note        text DEFAULT '',
  veterinaire text DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE ordonnances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ord_select" ON ordonnances FOR SELECT TO authenticated USING (true);
CREATE POLICY "ord_insert" ON ordonnances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ord_update" ON ordonnances FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ord_delete" ON ordonnances FOR DELETE TO authenticated USING (true);
