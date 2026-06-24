-- Table hospitalisations
CREATE TABLE IF NOT EXISTS hospitalisations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cage        text NOT NULL,
  patient     text NOT NULL,
  espece      text DEFAULT 'Chien',
  proprio     text DEFAULT '',
  date_entree date NOT NULL DEFAULT CURRENT_DATE,
  date_sortie date,
  motif       text DEFAULT '',
  statut      text DEFAULT 'Hospitalisé',
  soins       jsonb NOT NULL DEFAULT '[]',
  vitaux      jsonb NOT NULL DEFAULT '[]',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE hospitalisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospi_select" ON hospitalisations FOR SELECT TO authenticated USING (true);
CREATE POLICY "hospi_insert" ON hospitalisations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "hospi_update" ON hospitalisations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "hospi_delete" ON hospitalisations FOR DELETE TO authenticated USING (true);
