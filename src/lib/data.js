// src/lib/data.js
// Étape 2 — Les données initiales viennent de Supabase
// INIT_* sont conservés UNIQUEMENT comme fallback offline
// Ils ne sont JAMAIS écrits dans Supabase depuis le front
// Le seed SQL (02_seed_data.sql) est la source de vérité

export const TABLE = {
  patients:        'patients',
  clients:         'clients',
  meds:            'medicaments',
  consultations:   'consultations',
  ordonnances:     'ordonnances',
  chirurgies:      'chirurgies',
  hospitalisations:'hospitalisations',
  rdvs:            'rdvs',
  taches:          'taches',
  factures:        'factures',
  depenses:        'depenses',
  commandes:       'commandes',
  fournisseurs:    'fournisseurs',
  equipe:          'equipe',
  // 'comptes' retiré — remplacé par profiles (Supabase Auth)
}

// ── Fallback offline uniquement ───────────────────────────────
// Ces données s'affichent SEULEMENT si Supabase est inaccessible
// ET que le cache localStorage est vide (premier lancement offline)
// Dès que Supabase répond, ces données sont remplacées

export const INIT_PATIENTS = [
  { id:'pat-001', nom:'Rex',   espece:'Chien', race:'Berger Allemand', age:'3 ans', sexe:'M', proprio:'Dupont Jean',   tel:'+228 90 12 34 56', poids:'32 kg',  couleur:'Fauve/Noir', allergies:'Pénicilline', antecedents:'Otite ext. 2023, Gastrite 2022' },
  { id:'pat-002', nom:'Mimi',  espece:'Chat',  race:'Siamois',         age:'2 ans', sexe:'F', proprio:'Martin Sophie', tel:'+228 91 23 45 67', poids:'4 kg',   couleur:'Crème/Brun', allergies:'',            antecedents:'Stérilisée 09/2024' },
  { id:'pat-003', nom:'Bella', espece:'Bovin', race:'Holstein',        age:'5 ans', sexe:'F', proprio:'Ferme Kokou',   tel:'+228 92 34 56 78', poids:'450 kg', couleur:'Noir/Blanc', allergies:'',            antecedents:'Gestation en cours – 6 mois' },
  { id:'pat-004', nom:'Simba', espece:'Chien', race:'Labrador',        age:'1 an',  sexe:'M', proprio:'Akouavi Afi',   tel:'+228 93 45 67 89', poids:'28 kg',  couleur:'Jaune',      allergies:'',            antecedents:'Primo-vaccination 01/2025' },
]

export const INIT_CLIENTS = [
  { id:'cli-001', nom:'Dupont Jean',   tel:'+228 90 12 34 56', email:'dupont@email.com', adresse:'Lomé, Quartier Bè', animaux:2 },
  { id:'cli-002', nom:'Martin Sophie', tel:'+228 91 23 45 67', email:'martin@email.com', adresse:'Lomé, Tokoin',      animaux:1 },
  { id:'cli-003', nom:'Ferme Kokou',   tel:'+228 92 34 56 78', email:'kokou@ferme.com',  adresse:'Agou',              animaux:12 },
  { id:'cli-004', nom:'Akouavi Afi',   tel:'+228 93 45 67 89', email:'',                 adresse:'Kpalimé',           animaux:1 },
]

export const INIT_MEDS = [
  { id:'med-001', ref:'VET-001', nom:'Amoxicilline 500mg',    categorie:'Antibiotique',       stock:200, seuil:50, unite:'comprimés', prixAchat:150,  prixVente:250,  fournisseur:'MediVet SARL',   doseMgKg:10,  lot:'LOT-2024-01', peremption:'2026-06-30', tarifs:[{conditionnement:'Comprimé',prix:250},{conditionnement:'Plaquette (10 cp)',prix:2200},{conditionnement:'Boîte (30 cp)',prix:6000}] },
  { id:'med-002', ref:'VET-002', nom:'Ivermectine 1%',         categorie:'Antiparasitaire',    stock:8,   seuil:20, unite:'flacons',   prixAchat:3500, prixVente:5000, fournisseur:'Afrique Pharma', doseMgKg:0.2, lot:'LOT-2024-03', peremption:'2025-12-31', tarifs:[{conditionnement:'Flacon 50ml',prix:5000},{conditionnement:'Flacon 100ml',prix:9000}] },
  { id:'med-003', ref:'VET-003', nom:'Vaccin Rage',            categorie:'Vaccin',             stock:45,  seuil:15, unite:'doses',     prixAchat:2000, prixVente:3500, fournisseur:'Afrique Pharma', doseMgKg:null,lot:'LOT-2024-07', peremption:'2026-03-31', tarifs:[{conditionnement:'Dose unitaire',prix:3500},{conditionnement:'Pack 5 doses',prix:16000}] },
  { id:'med-004', ref:'VET-004', nom:'Métronidazole 250mg',    categorie:'Antibiotique',       stock:120, seuil:30, unite:'comprimés', prixAchat:100,  prixVente:180,  fournisseur:'MediVet SARL',   doseMgKg:15,  lot:'LOT-2024-02', peremption:'2026-09-30', tarifs:[{conditionnement:'Comprimé',prix:180},{conditionnement:'Plaquette (10 cp)',prix:1600},{conditionnement:'Boîte (30 cp)',prix:4500}] },
  { id:'med-005', ref:'VET-005', nom:'Kétoprofène injectable', categorie:'Anti-inflammatoire', stock:30,  seuil:10, unite:'flacons',   prixAchat:1800, prixVente:2800, fournisseur:'MediVet SARL',   doseMgKg:2,   lot:'LOT-2024-05', peremption:'2026-01-31', tarifs:[{conditionnement:'Flacon',prix:2800}] },
  { id:'med-006', ref:'VET-006', nom:'Enrofloxacine 5%',       categorie:'Antibiotique',       stock:25,  seuil:10, unite:'flacons',   prixAchat:4000, prixVente:6000, fournisseur:'Afrique Pharma', doseMgKg:5,   lot:'LOT-2024-06', peremption:'2026-12-31', tarifs:[{conditionnement:'Flacon 50ml',prix:6000},{conditionnement:'Flacon 100ml',prix:11000}] },
]

export const DEFAULT_TEAM = [
  { id:'equ-001', nom:'', role:'Vétérinaire', tel:'', actif:true },
  { id:'equ-002', nom:'', role:'Vétérinaire', tel:'', actif:true },
  { id:'equ-003', nom:'', role:'ASV',         tel:'', actif:true },
  { id:'equ-004', nom:'', role:'ASV',         tel:'', actif:true },
]

export const NAV_ALL = [
  { id:'dashboard',       label:'Tableau de bord',     icon:'🏠', cat:'Général' },
  { id:'monprofil',       label:'Mon profil',           icon:'👤', cat:'Général' },
  { id:'parametres',      label:'Paramètres clinique',  icon:'⚙️', cat:'Général',  admin:true },
  { id:'comptes',         label:'Comptes utilisateurs', icon:'🔐', cat:'Général',  admin:true },
  { id:'journal',         label:'Journal activite',     icon:'📜', cat:'Général',  admin:true },
  { id:'lots',            label:'Lots & Tracabilite',   icon:'🔬', cat:'Général',  admin:true },
  { id:'caisse',          label:'Caisse & Recus',       icon:'🧾', cat:'Commercial' },
  { id:'ia',              label:'Assistant IA',         icon:'🤖', cat:'Général' },
  { id:'notifications',   label:'Notifications Push',   icon:'🔔', cat:'Général',  admin:true },
  { id:'rapports',        label:'Rapports & Analyses',  icon:'📈', cat:'Général',  admin:true },
  { id:'carteclients',    label:'Carte clients',        icon:'🗺️', cat:'Commercial' },
  { id:'traitements',     label:'Suivi traitements',    icon:'💊', cat:'Clinique' },
  { id:'patients',        label:'Patients',             icon:'🐾', cat:'Clinique' },
  { id:'consultations',   label:'Consultations',        icon:'🩺', cat:'Clinique' },
  { id:'dossiers',        label:'Dossiers médicaux',    icon:'📋', cat:'Clinique' },
  { id:'ordonnances',     label:'Ordonnances',          icon:'📝', cat:'Clinique' },
  { id:'chirurgies',      label:'Chirurgies & Actes',   icon:'🔬', cat:'Clinique' },
  { id:'hospitalisation', label:'Hospitalisation',      icon:'🏥', cat:'Clinique' },
  { id:'agenda',          label:'Agenda & RDV',         icon:'📅', cat:'Clinique' },
  { id:'taches',          label:'Tâches équipe',        icon:'✅', cat:'Clinique' },
  { id:'calculateur',     label:'Calculateur doses',    icon:'⚖️', cat:'Clinique' },
  { id:'consentements',   label:'Consentements',        icon:'✍️', cat:'Clinique' },
  { id:'clients',         label:'Clients',              icon:'👥', cat:'Commercial' },
  { id:'fournisseurs',    label:'Fournisseurs',         icon:'🏭', cat:'Commercial', admin:true },
  { id:'factures',        label:'Factures',             icon:'📄', cat:'Commercial', admin:true },
  { id:'devis',           label:'Devis & Estimations',  icon:'📋', cat:'Commercial' },
  { id:'creances',        label:'Suivi créances',       icon:'💰', cat:'Commercial' },
  { id:'ventes',          label:'Ventes comptoir',      icon:'🛒', cat:'Commercial' },
  { id:'medicaments',     label:'Médicaments',          icon:'💊', cat:'Pharmacie' },
  { id:'commandes',       label:'Commandes',            icon:'📦', cat:'Pharmacie' },
  { id:'inventaire',      label:'Inventaire',           icon:'📊', cat:'Pharmacie' },
  { id:'depenses',        label:'Dépenses',             icon:'💸', cat:'Financier', admin:true },
  { id:'finances',        label:'État financier',       icon:'📈', cat:'Financier', admin:true },
  { id:'historique',      label:'Historique produits',  icon:'🗂️', cat:'Pharmacie' },
]