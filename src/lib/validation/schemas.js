import { z } from 'zod'
import {
  MED_CATEGORIES,
  MED_UNITES,
  ACCOUNT_ROLES_ADMIN,
  ACCOUNT_ROLES_REGISTER,
  PATIENT_ESPECES,
  VENTE_MODES,
  VENTE_STATUTS,
} from './constants'

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (AAAA-MM-JJ attendu)')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Date invalide')

const nonNegativeInt = (label, { max = 999_999 } = {}) =>
  z.coerce
    .number({ invalid_type_error: `${label} doit être un nombre` })
    .int(`${label} doit être un entier`)
    .min(0, `${label} ne peut pas être négatif`)
    .max(max, `${label} trop élevé`)

const optionalPositiveFloat = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return null
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
    return Number.isFinite(n) ? n : undefined
  },
  z
    .number({ invalid_type_error: 'Dose mg/kg : nombre invalide' })
    .positive('Dose mg/kg : doit être positive')
    .max(10_000, 'Dose mg/kg trop élevée')
    .nullable(),
)

/** Formulaire médicament (champs texte du UI) */
export const medicamentFormSchema = z
  .object({
    nom: z
      .string()
      .trim()
      .min(2, 'Le nom doit contenir au moins 2 caractères')
      .max(120, 'Le nom est trop long (120 caractères max)'),
    categorie: z.enum(MED_CATEGORIES, { message: 'Catégorie invalide' }),
    unite: z.enum(MED_UNITES, { message: 'Unité invalide' }),
    stock: nonNegativeInt('Le stock'),
    seuil: nonNegativeInt('Le seuil'),
    prixAchat: nonNegativeInt('Le prix d\'achat'),
    prixVente: nonNegativeInt('Le prix de vente').refine((n) => n > 0, {
      message: 'Le prix de vente doit être supérieur à 0',
    }),
    fournisseur: z
      .string()
      .trim()
      .max(100, 'Fournisseur : 100 caractères max')
      .optional()
      .transform((s) => s || ''),
    doseMgKg: optionalPositiveFloat,
    lot: z
      .string()
      .trim()
      .max(50, 'N° de lot : 50 caractères max')
      .optional()
      .transform((s) => s || ''),
    peremption: isoDate,
  })
  .refine((d) => d.prixVente >= d.prixAchat, {
    message: 'Le prix de vente doit être ≥ au prix d\'achat',
    path: ['prixVente'],
  })
  .refine((d) => d.seuil <= d.stock || d.stock === 0, {
    message: 'Le seuil d\'alerte ne peut pas dépasser le stock actuel',
    path: ['seuil'],
  })

/** Étape 1 du wizard compte (nom seul) */
export const userAccountStep1Schema = z.object({
  nom: z
    .string()
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(80, 'Le nom est trop long'),
})

/** Compte créé par l'administrateur */
export const userAccountFormSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(80, 'Le nom est trop long'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Adresse email invalide')
    .max(120, 'Email trop long'),
  pw: z
    .string()
    .min(6, 'Mot de passe : 6 caractères minimum')
    .max(128, 'Mot de passe trop long'),
  role: z.enum(ACCOUNT_ROLES_ADMIN, { message: 'Rôle invalide' }),
})

/** Inscription publique (Register) */
export const userRegisterSchema = z
  .object({
    nom: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères').max(80),
    email: z.string().trim().toLowerCase().email('Adresse email invalide').max(120),
    pw: z.string().min(6, 'Mot de passe : 6 caractères minimum').max(128),
    pw2: z.string().min(1, 'Confirmez le mot de passe'),
    role: z.enum(ACCOUNT_ROLES_REGISTER, { message: 'Rôle invalide' }),
  })
  .refine((d) => d.pw === d.pw2, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['pw2'],
  })

/** Changement de mot de passe (liste comptes) */
export const userPasswordSchema = z
  .string()
  .min(6, 'Mot de passe : 6 caractères minimum')
  .max(128, 'Mot de passe trop long')

const optionalTrimmed = (max, label) =>
  z
    .string()
    .trim()
    .max(max, `${label} : ${max} caractères max`)
    .optional()
    .transform((s) => s || '')

const optionalTel = z
  .string()
  .trim()
  .optional()
  .transform((s) => s || '')
  .refine((s) => !s || s.replace(/\D/g, '').length >= 8, {
    message: 'Téléphone : au moins 8 chiffres',
  })

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((s) => s || '')
  .refine((s) => !s || z.string().email().safeParse(s).success, {
    message: 'Adresse email invalide',
  })

const normalizeSexe = z.preprocess(
  (v) => {
    const s = String(v || '').trim()
    if (s.startsWith('M')) return 'M'
    if (s.startsWith('F')) return 'F'
    return s
  },
  z.enum(['M', 'F'], { message: 'Sexe invalide' }),
)

/** Patient (animal) */
export const patientFormSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(2, 'Le nom de l\'animal doit contenir au moins 2 caractères')
    .max(80, 'Nom trop long'),
  espece: z.enum(PATIENT_ESPECES, { message: 'Espèce invalide' }),
  race: optionalTrimmed(60, 'Race'),
  age: optionalTrimmed(30, 'Âge'),
  sexe: normalizeSexe,
  proprio: z
    .string()
    .trim()
    .min(2, 'Le propriétaire est requis (2 caractères min)')
    .max(80, 'Nom du propriétaire trop long'),
  tel: optionalTel,
  poids: optionalTrimmed(30, 'Poids'),
  couleur: optionalTrimmed(40, 'Couleur'),
  allergies: optionalTrimmed(500, 'Allergies'),
  antecedents: optionalTrimmed(1000, 'Antécédents'),
  photo: z
    .string()
    .trim()
    .optional()
    .transform((s) => s || '')
    .refine((s) => !s || /^https?:\/\/.+/i.test(s), {
      message: 'URL photo invalide (doit commencer par http:// ou https://)',
    }),
})

/** Client commercial */
export const clientFormSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(80, 'Nom trop long'),
  tel: optionalTel,
  email: optionalEmail,
  adresse: optionalTrimmed(200, 'Adresse'),
})

/** Ligne de vente */
export const venteLigneSchema = z.object({
  med: z.string().trim().min(1, 'Médicament requis'),
  cond: z
    .string()
    .trim()
    .optional()
    .transform((s) => s || 'Unité'),
  qte: z.coerce
    .number({ invalid_type_error: 'Quantité invalide' })
    .int('Quantité : entier requis')
    .positive('Quantité doit être ≥ 1')
    .max(99_999, 'Quantité trop élevée'),
  pu: z.coerce
    .number({ invalid_type_error: 'Prix unitaire invalide' })
    .min(0, 'Prix unitaire invalide')
    .refine((n) => n > 0, { message: 'Prix unitaire doit être > 0' }),
})

/** Vente (module Ventes) */
export const venteFormSchema = z.object({
  date: isoDate,
  client: z
    .string()
    .trim()
    .min(2, 'Client requis (2 caractères min)')
    .max(120, 'Nom client trop long'),
  mode: z.enum(VENTE_MODES, { message: 'Mode de paiement invalide' }),
  statut: z.enum(VENTE_STATUTS, { message: 'Statut invalide' }),
  lignes: z.array(venteLigneSchema).min(1, 'Au moins un produit est requis'),
})

/** Caisse (client optionnel → Comptoir) */
export const caisseFormSchema = z.object({
  client: z
    .string()
    .trim()
    .max(120, 'Nom client trop long')
    .optional()
    .transform((s) => s || 'Comptoir'),
  mode: z.enum(VENTE_MODES, { message: 'Mode de paiement invalide' }),
  note: optionalTrimmed(500, 'Note'),
  lignes: z.array(venteLigneSchema).min(1, 'Au moins un médicament est requis'),
})
