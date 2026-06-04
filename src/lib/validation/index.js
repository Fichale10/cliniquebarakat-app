import { FIELD_LABELS } from './constants'
import {
  medicamentFormSchema,
  userAccountStep1Schema,
  userAccountFormSchema,
  userRegisterSchema,
  userPasswordSchema,
  patientFormSchema,
  clientFormSchema,
  venteFormSchema,
  caisseFormSchema,
} from './schemas'
import { ACCOUNT_ROLES_ADMIN } from './constants'
import { z } from 'zod'

export {
  medicamentFormSchema,
  userAccountFormSchema,
  userRegisterSchema,
  userPasswordSchema,
  patientFormSchema,
  clientFormSchema,
  venteFormSchema,
  caisseFormSchema,
} from './schemas'
export * from './constants'

function pathKey(path) {
  if (!path?.length) return '_form'
  return path.map(String).join('.')
}

function pathLabel(path) {
  if (!path?.length) return 'Formulaire'
  if (path[0] === 'lignes' && path.length >= 3) {
    const line = Number(path[1]) + 1
    const field = FIELD_LABELS[path[2]] || path[2]
    return `Ligne ${line} — ${field}`
  }
  return FIELD_LABELS[path[0]] || String(path[0])
}

function issuesToResult(error) {
  const fieldErrors = {}
  const messages = []
  for (const issue of error.issues) {
    const key = pathKey(issue.path)
    const label = pathLabel(issue.path)
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
    messages.push(key === '_form' ? issue.message : `${label} : ${issue.message}`)
  }
  return { ok: false, fieldErrors, messages }
}

function stripEmptyLignes(lignes) {
  return (lignes || []).filter((l) => String(l.med || '').trim())
}

function checkStock(lignes, meds) {
  const messages = []
  const fieldErrors = {}
  lignes.forEach((l, i) => {
    const m = meds.find((x) => x.nom === l.med)
    if (!m) {
      messages.push(`Ligne ${i + 1} — Médicament inconnu : ${l.med}`)
      fieldErrors[`lignes.${i}.med`] = 'Médicament introuvable'
    } else if ((m.stock || 0) < l.qte) {
      messages.push(`Ligne ${i + 1} — Stock insuffisant pour ${l.med} (disponible : ${m.stock ?? 0})`)
      fieldErrors[`lignes.${i}.qte`] = `Stock max : ${m.stock ?? 0}`
    }
  })
  if (!messages.length) return null
  return { ok: false, fieldErrors, messages }
}

export function validateMedicamentForm(form) {
  const result = medicamentFormSchema.safeParse(form)
  if (!result.success) return issuesToResult(result.error)
  return { ok: true, data: result.data }
}

export function normalizeAccountRole(role) {
  if (role === 'admin_secondaire') return 'admin2'
  return role
}

export function validateUserAccountStep1(form) {
  const result = userAccountStep1Schema.safeParse(form)
  if (!result.success) return issuesToResult(result.error)
  return { ok: true, data: result.data }
}

export function validateUserAccount(form) {
  const payload = { ...form, role: normalizeAccountRole(form.role) }
  const result = userAccountFormSchema.safeParse(payload)
  if (!result.success) return issuesToResult(result.error)
  return { ok: true, data: result.data }
}

export function validateAccountRole(role) {
  const normalized = normalizeAccountRole(role)
  const result = z.enum(ACCOUNT_ROLES_ADMIN).safeParse(normalized)
  if (!result.success) return issuesToResult(result.error)
  return { ok: true, data: result.data }
}

export function validateUserRegister(payload) {
  const result = userRegisterSchema.safeParse(payload)
  if (!result.success) return issuesToResult(result.error)
  return { ok: true, data: result.data }
}

export function validateUserPassword(pw) {
  const result = userPasswordSchema.safeParse(pw)
  if (!result.success) return issuesToResult(result.error)
  return { ok: true, data: result.data }
}

/** Construit la ligne Supabase à partir des données validées */
export function medicamentFormToRow(validated, { id, ref }) {
  return {
    id,
    ref,
    nom: validated.nom,
    categorie: validated.categorie,
    stock: validated.stock,
    seuil: validated.seuil,
    unite: validated.unite,
    prix_achat: validated.prixAchat,
    prix_vente: validated.prixVente,
    fournisseur: validated.fournisseur,
    dose_mg_kg: validated.doseMgKg,
    lot: validated.lot,
    peremption: validated.peremption,
    tarifs: [],
  }
}

export function medicamentFormToUpdates(validated) {
  return {
    nom: validated.nom,
    categorie: validated.categorie,
    unite: validated.unite,
    stock: validated.stock,
    seuil: validated.seuil,
    prix_achat: validated.prixAchat,
    prix_vente: validated.prixVente,
    fournisseur: validated.fournisseur,
    dose_mg_kg: validated.doseMgKg,
    lot: validated.lot,
    peremption: validated.peremption,
  }
}

export function validatePatientForm(form) {
  const result = patientFormSchema.safeParse(form)
  if (!result.success) return issuesToResult(result.error)
  return { ok: true, data: result.data }
}

export function patientFormToRow(validated, id) {
  return {
    id,
    nom: validated.nom,
    espece: validated.espece,
    race: validated.race,
    age: validated.age,
    sexe: validated.sexe,
    proprio: validated.proprio,
    tel: validated.tel,
    poids: validated.poids,
    couleur: validated.couleur,
    allergies: validated.allergies,
    antecedents: validated.antecedents,
    photo: validated.photo,
  }
}

export function validateClientForm(form) {
  const result = clientFormSchema.safeParse(form)
  if (!result.success) return issuesToResult(result.error)
  return { ok: true, data: result.data }
}

export function clientFormToRow(validated, id) {
  return {
    id,
    nom: validated.nom,
    tel: validated.tel,
    email: validated.email,
    adresse: validated.adresse,
    animaux: 0,
  }
}

export function computeVenteTotal(lignes) {
  return lignes.reduce((s, l) => s + l.qte * l.pu, 0)
}

export function validateVenteForm(form, meds = []) {
  const result = venteFormSchema.safeParse({
    ...form,
    lignes: stripEmptyLignes(form.lignes),
  })
  if (!result.success) return issuesToResult(result.error)
  const stockErr = checkStock(result.data.lignes, meds)
  if (stockErr) return stockErr
  const total = computeVenteTotal(result.data.lignes)
  return { ok: true, data: { ...result.data, total } }
}

/** Ligne envoyée à Supabase (snake_case, colonnes connues) */
export function venteToDbRow(row) {
  return {
    id: row.id,
    date: row.date,
    client: row.client ?? '',
    lignes: row.lignes ?? [],
    total: row.total ?? 0,
    statut: row.statut ?? 'Payé',
    mode: row.mode ?? 'Espèces',
    note: row.note ?? '',
    tva_amt: row.tva_amt ?? row.tvaAmt ?? 0,
    caissier: row.caissier ?? '',
  }
}

export function venteFormToRow(validated, id) {
  return venteToDbRow({
    id,
    date: validated.date,
    client: validated.client,
    lignes: validated.lignes,
    total: validated.total,
    statut: validated.statut,
    mode: validated.mode,
  })
}

export function validateCaisseForm(payload, meds = []) {
  const result = caisseFormSchema.safeParse({
    ...payload,
    lignes: stripEmptyLignes(payload.lignes),
  })
  if (!result.success) return issuesToResult(result.error)
  const stockErr = checkStock(result.data.lignes, meds)
  if (stockErr) return stockErr
  return { ok: true, data: result.data }
}
