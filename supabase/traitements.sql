-- ════════════════════════════════════════════════════════════════
-- SUIVI DES TRAITEMENTS (migration localStorage → Supabase)
-- À exécuter dans Supabase → SQL Editor (idempotent).
-- Ajoute les montants facturables + lien vers la vente créée
-- (même modèle que consultations/chirurgies : anti double-facturation).
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.traitements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient    text NOT NULL DEFAULT '',
  medicament text NOT NULL DEFAULT '',
  posologie  text NOT NULL DEFAULT '',
  frequence  text NOT NULL DEFAULT '1x/jour',
  debut      date,
  fin        date,
  notes      text NOT NULL DEFAULT '',
  actif      boolean NOT NULL DEFAULT true,
  qte        numeric NOT NULL DEFAULT 1,
  pu         numeric NOT NULL DEFAULT 0,
  pa         numeric NOT NULL DEFAULT 0,
  vente_id   uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS traitements_patient_idx ON public.traitements (patient);
CREATE INDEX IF NOT EXISTS traitements_fin_idx     ON public.traitements (fin);

ALTER TABLE public.traitements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "traitements_select" ON public.traitements;
CREATE POLICY "traitements_select" ON public.traitements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "traitements_insert" ON public.traitements;
CREATE POLICY "traitements_insert" ON public.traitements FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "traitements_update" ON public.traitements;
CREATE POLICY "traitements_update" ON public.traitements FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "traitements_delete" ON public.traitements;
CREATE POLICY "traitements_delete" ON public.traitements FOR DELETE TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';
