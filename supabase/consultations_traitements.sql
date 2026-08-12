-- ════════════════════════════════════════════════════════════════
-- TRAITEMENTS EN CONSULTATION + VENTE LIÉE
-- À exécuter dans Supabase → SQL Editor (idempotent).
--
-- Ajoute :
--  - consultations.traitements (lignes de produits administrés)
--  - ventes.consultation_id (lien consultation → vente)
--  - droits RLS : les vétérinaires peuvent créer la vente liée
--    et décrémenter le stock des traitements administrés
-- ════════════════════════════════════════════════════════════════

-- 1) Lignes de traitements sur la consultation
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS traitements jsonb NOT NULL DEFAULT '[]';
-- montant peut contenir actes + traitements (décimaux possibles)
ALTER TABLE public.consultations ALTER COLUMN montant TYPE numeric USING montant::numeric;

-- 2) Lien vente ↔ consultation
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS consultation_id uuid;
CREATE INDEX IF NOT EXISTS ventes_consultation_idx ON public.ventes (consultation_id);

-- 3) RLS : les rôles soins peuvent écrire les ventes (facturation consultation)
DROP POLICY IF EXISTS "ventes_roles" ON public.ventes;
CREATE POLICY "ventes_roles" ON public.ventes
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','pharmacien','caissier','veterinaire','utilisateur')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','pharmacien','caissier','veterinaire','utilisateur')));

-- 4) RLS : les rôles soins peuvent mettre à jour le stock (traitements administrés)
DROP POLICY IF EXISTS "medicaments_update_roles" ON public.medicaments;
CREATE POLICY "medicaments_update_roles" ON public.medicaments
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_role('admin','admin2','pharmacien','technicien','caissier','veterinaire','utilisateur')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','pharmacien','technicien','caissier','veterinaire','utilisateur')));

NOTIFY pgrst, 'reload schema';
