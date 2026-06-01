/** Listes fermées alignées sur les formulaires de l'app */

export const MED_CATEGORIES = [
  'Antibiotique',
  'Antiparasitaire',
  'Vaccin',
  'Anti-inflammatoire',
  'Vitamines',
  'Anesthésique',
  'Autre',
]

export const MED_UNITES = [
  'comprimés',
  'flacons',
  'doses',
  'ampoules',
  'sachets',
  'litres',
  'kg',
]

/** Rôles créables par un administrateur (GestionComptes) */
export const ACCOUNT_ROLES_ADMIN = [
  'admin',
  'admin2',
  'utilisateur',
  'veterinaire',
  'pharmacien',
  'caissier',
]

/** Rôles proposés à l'inscription publique */
export const ACCOUNT_ROLES_REGISTER = ['veterinaire', 'pharmacien', 'caissier']

export const PATIENT_ESPECES = ['Chien', 'Chat', 'Bovin', 'Caprin', 'Ovin', 'Volaille']

export const PATIENT_SEXES = ['M', 'F']

export const VENTE_MODES = [
  'Espèces',
  'Mobile Money',
  'Virement',
  'Chèque',
  'Carte bancaire',
  'À crédit',
  '–',
]

export const VENTE_STATUTS = [
  'Payé',
  'À crédit',
  'Partiellement payé',
  'En attente',
  'Annulé',
]

export const FIELD_LABELS = {
  nom: 'Nom',
  email: 'Email',
  pw: 'Mot de passe',
  pw2: 'Confirmation',
  role: 'Rôle',
  categorie: 'Catégorie',
  unite: 'Unité',
  stock: 'Stock',
  seuil: 'Seuil alerte',
  prixAchat: 'Prix achat',
  prixVente: 'Prix vente',
  fournisseur: 'Fournisseur',
  doseMgKg: 'Dose mg/kg',
  lot: 'N° de lot',
  peremption: 'Date de péremption',
  espece: 'Espèce',
  race: 'Race',
  age: 'Âge',
  sexe: 'Sexe',
  proprio: 'Propriétaire',
  tel: 'Téléphone',
  poids: 'Poids',
  couleur: 'Couleur',
  allergies: 'Allergies',
  antecedents: 'Antécédents',
  photo: 'Photo',
  adresse: 'Adresse',
  client: 'Client',
  date: 'Date',
  mode: 'Mode de paiement',
  statut: 'Statut',
  lignes: 'Produits',
  med: 'Médicament',
  cond: 'Conditionnement',
  qte: 'Quantité',
  pu: 'Prix unitaire',
  note: 'Note',
}
