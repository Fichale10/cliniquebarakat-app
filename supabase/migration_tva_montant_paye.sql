-- ════════════════════════════════════════════════════════════════
-- MIGRATION UNIQUE — À exécuter UNE SEULE FOIS dans Supabase,
-- AVANT de déployer la nouvelle version de l'application.
--
-- Contexte : les anciennes ventes créées via la Caisse stockaient
-- `total` TTC (TVA incluse) alors que celles créées via Ventes
-- stockaient `total` HT. Nouvelle convention unifiée :
--   total = HT · tva_amt = TVA · TTC = total + tva_amt
-- ════════════════════════════════════════════════════════════════

-- 1) Colonnes de suivi des paiements
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS montant_paye numeric NOT NULL DEFAULT 0;
ALTER TABLE public.ventes ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'detail';

-- 2) Anciennes ventes Caisse : total était TTC → repasser en HT
--    (seules les lignes avec tva_amt > 0 sont concernées)
UPDATE public.ventes
SET total = total - tva_amt
WHERE tva_amt > 0
  AND montant_paye = 0
  AND total >= tva_amt;

-- 3) Initialiser montant_paye pour les ventes déjà payées
UPDATE public.ventes
SET montant_paye = total + tva_amt
WHERE statut = 'Payé' AND montant_paye = 0;

NOTIFY pgrst, 'reload schema';
