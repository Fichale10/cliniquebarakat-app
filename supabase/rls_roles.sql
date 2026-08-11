-- ════════════════════════════════════════════════════════════════
-- SÉCURISATION RLS PAR RÔLE — à exécuter dans Supabase → SQL Editor
-- Remplace les policies permissives USING (true) par des policies
-- alignées sur ROLE_ACCESS de src/lib/roles.js
-- Idempotent : ré-exécutable sans erreur.
-- ════════════════════════════════════════════════════════════════

-- ─── Helpers (SECURITY DEFINER pour éviter la récursion RLS) ─────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_role(VARIADIC roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.get_my_role() = ANY(roles);
$$;
GRANT EXECUTE ON FUNCTION public.has_role(VARIADIC text[]) TO authenticated;

-- ─── PATIENTS : tous sauf caissier ───────────────────────────────
DROP POLICY IF EXISTS "patients_select" ON public.patients;
DROP POLICY IF EXISTS "patients_insert" ON public.patients;
DROP POLICY IF EXISTS "patients_update" ON public.patients;
DROP POLICY IF EXISTS "patients_delete" ON public.patients;
DROP POLICY IF EXISTS "patients_roles" ON public.patients;
CREATE POLICY "patients_roles" ON public.patients
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','pharmacien','technicien')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','pharmacien','technicien')));

-- ─── CLIENTS : tous sauf technicien ──────────────────────────────
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;
DROP POLICY IF EXISTS "clients_roles" ON public.clients;
CREATE POLICY "clients_roles" ON public.clients
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','pharmacien','caissier')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','pharmacien','caissier')));

-- ─── CONSULTATIONS : soins ────────────────────────────────────────
DROP POLICY IF EXISTS "consultations_select" ON public.consultations;
DROP POLICY IF EXISTS "consultations_insert" ON public.consultations;
DROP POLICY IF EXISTS "consultations_update" ON public.consultations;
DROP POLICY IF EXISTS "consultations_delete" ON public.consultations;
DROP POLICY IF EXISTS "consultations_roles" ON public.consultations;
CREATE POLICY "consultations_roles" ON public.consultations
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','technicien')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','technicien')));

-- ─── CHIRURGIES : vétérinaires ────────────────────────────────────
DROP POLICY IF EXISTS "chir_select" ON public.chirurgies;
DROP POLICY IF EXISTS "chir_insert" ON public.chirurgies;
DROP POLICY IF EXISTS "chir_update" ON public.chirurgies;
DROP POLICY IF EXISTS "chir_delete" ON public.chirurgies;
DROP POLICY IF EXISTS "chirurgies_roles" ON public.chirurgies;
CREATE POLICY "chirurgies_roles" ON public.chirurgies
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur')));

-- ─── HOSPITALISATIONS : vétérinaires ─────────────────────────────
DROP POLICY IF EXISTS "hospi_select" ON public.hospitalisations;
DROP POLICY IF EXISTS "hospi_insert" ON public.hospitalisations;
DROP POLICY IF EXISTS "hospi_update" ON public.hospitalisations;
DROP POLICY IF EXISTS "hospi_delete" ON public.hospitalisations;
DROP POLICY IF EXISTS "hospitalisations_roles" ON public.hospitalisations;
CREATE POLICY "hospitalisations_roles" ON public.hospitalisations
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur')));

-- ─── ORDONNANCES : soins + pharmacie ─────────────────────────────
DROP POLICY IF EXISTS "ord_select" ON public.ordonnances;
DROP POLICY IF EXISTS "ord_insert" ON public.ordonnances;
DROP POLICY IF EXISTS "ord_update" ON public.ordonnances;
DROP POLICY IF EXISTS "ord_delete" ON public.ordonnances;
DROP POLICY IF EXISTS "ordonnances_roles" ON public.ordonnances;
CREATE POLICY "ordonnances_roles" ON public.ordonnances
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','pharmacien','technicien')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','pharmacien','technicien')));

-- ─── RDVS (agenda) ───────────────────────────────────────────────
DROP POLICY IF EXISTS "rdvs_select" ON public.rdvs;
DROP POLICY IF EXISTS "rdvs_insert" ON public.rdvs;
DROP POLICY IF EXISTS "rdvs_update" ON public.rdvs;
DROP POLICY IF EXISTS "rdvs_delete" ON public.rdvs;
DROP POLICY IF EXISTS "rdvs_roles" ON public.rdvs;
CREATE POLICY "rdvs_roles" ON public.rdvs
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','technicien')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','technicien')));

-- ─── TACHES ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "taches_select" ON public.taches;
DROP POLICY IF EXISTS "taches_insert" ON public.taches;
DROP POLICY IF EXISTS "taches_update" ON public.taches;
DROP POLICY IF EXISTS "taches_delete" ON public.taches;
DROP POLICY IF EXISTS "taches_roles" ON public.taches;
CREATE POLICY "taches_roles" ON public.taches
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','technicien')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','technicien')));

-- ─── MEDICAMENTS : pharmacie ─────────────────────────────────────
DROP POLICY IF EXISTS "medicaments_select_auth" ON public.medicaments;
DROP POLICY IF EXISTS "medicaments_insert_auth" ON public.medicaments;
DROP POLICY IF EXISTS "medicaments_update_auth" ON public.medicaments;
DROP POLICY IF EXISTS "medicaments_delete_auth" ON public.medicaments;
DROP POLICY IF EXISTS "medicaments_roles" ON public.medicaments;
-- Lecture élargie (les ventes/caisse ont besoin du catalogue)
DROP POLICY IF EXISTS "medicaments_read_roles" ON public.medicaments;
CREATE POLICY "medicaments_read_roles" ON public.medicaments
  FOR SELECT TO authenticated
  USING ((SELECT public.has_role('admin','admin2','veterinaire','utilisateur','pharmacien','technicien','caissier')));
CREATE POLICY "medicaments_roles" ON public.medicaments
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_role('admin','admin2','pharmacien','technicien')));
DROP POLICY IF EXISTS "medicaments_update_roles" ON public.medicaments;
CREATE POLICY "medicaments_update_roles" ON public.medicaments
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_role('admin','admin2','pharmacien','technicien','caissier')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','pharmacien','technicien','caissier')));
DROP POLICY IF EXISTS "medicaments_delete_roles" ON public.medicaments;
CREATE POLICY "medicaments_delete_roles" ON public.medicaments
  FOR DELETE TO authenticated
  USING ((SELECT public.has_role('admin','admin2','pharmacien')));

-- ─── COMMANDES : pharmacie ───────────────────────────────────────
DROP POLICY IF EXISTS "commandes_select" ON public.commandes;
DROP POLICY IF EXISTS "commandes_insert" ON public.commandes;
DROP POLICY IF EXISTS "commandes_update" ON public.commandes;
DROP POLICY IF EXISTS "commandes_delete" ON public.commandes;
DROP POLICY IF EXISTS "commandes_roles" ON public.commandes;
CREATE POLICY "commandes_roles" ON public.commandes
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','pharmacien')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','pharmacien')));

-- ─── VENTES : commercial ─────────────────────────────────────────
DROP POLICY IF EXISTS "ventes_select_auth" ON public.ventes;
DROP POLICY IF EXISTS "ventes_insert_auth" ON public.ventes;
DROP POLICY IF EXISTS "ventes_update_auth" ON public.ventes;
DROP POLICY IF EXISTS "ventes_delete_auth" ON public.ventes;
DROP POLICY IF EXISTS "ventes_roles" ON public.ventes;
CREATE POLICY "ventes_roles" ON public.ventes
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','pharmacien','caissier')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','pharmacien','caissier')));

-- ─── DEVIS : commercial ──────────────────────────────────────────
DROP POLICY IF EXISTS "devis_select" ON public.devis;
DROP POLICY IF EXISTS "devis_insert" ON public.devis;
DROP POLICY IF EXISTS "devis_update" ON public.devis;
DROP POLICY IF EXISTS "devis_delete" ON public.devis;
DROP POLICY IF EXISTS "devis_roles" ON public.devis;
CREATE POLICY "devis_roles" ON public.devis
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','pharmacien','caissier')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','pharmacien','caissier')));

-- ─── FACTURES : commercial ───────────────────────────────────────
DROP POLICY IF EXISTS "factures_select" ON public.factures;
DROP POLICY IF EXISTS "factures_insert" ON public.factures;
DROP POLICY IF EXISTS "factures_update" ON public.factures;
DROP POLICY IF EXISTS "factures_delete" ON public.factures;
DROP POLICY IF EXISTS "factures_roles" ON public.factures;
CREATE POLICY "factures_roles" ON public.factures
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2','pharmacien','caissier')))
  WITH CHECK ((SELECT public.has_role('admin','admin2','pharmacien','caissier')));

-- ─── FOURNISSEURS : admin uniquement ─────────────────────────────
DROP POLICY IF EXISTS "fournisseurs_select" ON public.fournisseurs;
DROP POLICY IF EXISTS "fournisseurs_insert" ON public.fournisseurs;
DROP POLICY IF EXISTS "fournisseurs_update" ON public.fournisseurs;
DROP POLICY IF EXISTS "fournisseurs_delete" ON public.fournisseurs;
DROP POLICY IF EXISTS "fournisseurs_roles" ON public.fournisseurs;
CREATE POLICY "fournisseurs_roles" ON public.fournisseurs
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2')))
  WITH CHECK ((SELECT public.has_role('admin','admin2')));

-- ─── VERSEMENTS FOURNISSEURS : mêmes droits que fournisseurs ─────
DROP POLICY IF EXISTS "versements_four_select" ON public.versements_fournisseurs;
DROP POLICY IF EXISTS "versements_four_insert" ON public.versements_fournisseurs;
DROP POLICY IF EXISTS "versements_four_update" ON public.versements_fournisseurs;
DROP POLICY IF EXISTS "versements_four_delete" ON public.versements_fournisseurs;
DROP POLICY IF EXISTS "versements_fournisseurs_roles" ON public.versements_fournisseurs;
CREATE POLICY "versements_fournisseurs_roles" ON public.versements_fournisseurs
  FOR ALL TO authenticated
  USING ((SELECT public.has_role('admin','admin2')))
  WITH CHECK ((SELECT public.has_role('admin','admin2')));

-- ─── ACTIVITY_LOGS : insert par tous, lecture admin ──────────────
DROP POLICY IF EXISTS "activity_logs_select_auth" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_admin" ON public.activity_logs;
CREATE POLICY "activity_logs_select_admin" ON public.activity_logs
  FOR SELECT TO authenticated
  USING ((SELECT public.has_role('admin','admin2')));
-- L'insert reste ouvert à tout utilisateur authentifié (journalisation)
