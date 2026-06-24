-- Table tâches équipe
CREATE TABLE IF NOT EXISTS taches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre       text NOT NULL,
  membres     jsonb NOT NULL DEFAULT '[]',
  priorite    text DEFAULT 'Normale',
  statut      text DEFAULT 'À faire',
  echeance    date NOT NULL DEFAULT CURRENT_DATE,
  categorie   text DEFAULT 'Autre',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE taches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taches_select" ON taches FOR SELECT TO authenticated USING (true);
CREATE POLICY "taches_insert" ON taches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "taches_update" ON taches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "taches_delete" ON taches FOR DELETE TO authenticated USING (true);
