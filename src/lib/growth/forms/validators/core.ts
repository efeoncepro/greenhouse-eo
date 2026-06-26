/**
 * TASK-1253 — Validator registry canónico (CORE PURO / ISOMÓRFICO).
 *
 * Consumido por el servidor (`submitForm`, autoridad) **y** por el renderer
 * portable (`src/growth-forms-renderer`, bundle esbuild). Por eso este módulo:
 *  - NUNCA importa `server-only`, `node:*`, Zod, ni `contracts.ts` (Zod pesa y
 *    el renderer es Zod-free). Toma inputs **estructurales**, no `FieldDefinition`.
 *  - Solo importa el core puro `@/lib/identity-documents`.
 * El guard de pureza (eslint override) lo enforce mecánicamente.
 *
 * Contrato: catálogo CERRADO de validadores nombrados (anti-ReDoS — el admin
 * elige de `NAMED_VALIDATORS`, NUNCA inyecta regex). Cada validador es
 * no-throwing y retorna `{ valid, normalized, formatted, reasonCode }`.
 *
 * El validador valida/normaliza el valor CRUDO (no el display enmascarado).
 * El manejo de "vacío vs requerido" (que es condicional vía requiredWhen) lo
 * resuelve el CALLER; estos validadores asumen un valor presente y devuelven
 * `field_required` solo como señal cuando reciben vacío.
 */
import { validateNationalIdByCountry, type NationalIdReasonCode } from '@/lib/identity-documents'

import { classifyEmailTier1 } from '../email-verification/tier1'

export const NAMED_VALIDATORS = [
  'text',
  'email_syntax',
  'corporate_email',
  'e164_phone',
  'url',
  'national_id',
  'number',
  'date',
  'consent',
] as const
export type NamedValidator = (typeof NAMED_VALIDATORS)[number]

export type FormValidatorReasonCode =
  | 'field_required'
  | 'email_format'
  | 'email_not_corporate'
  | 'email_disposable'
  | 'phone_format'
  | 'url_format'
  | 'number_format'
  | 'date_format'
  | 'consent_required'
  | NationalIdReasonCode

export interface FormFieldValidationResult {
  valid: boolean
  /** Valor normalizado canónico a persistir/enviar (email lowercased, E.164, RUT, número). */
  normalized: string | number | boolean
  /** Display formateado (igual a `normalized` si no aplica formato distinto). */
  formatted: string
  /** `null` si `valid`; snake_case estable si no. */
  reasonCode: FormValidatorReasonCode | null
}

export interface ValidatorParams {
  /** ISO 3166-1 alpha-2 para national_id / e164_phone (default `CL`). */
  country?: string
}

/**
 * Shape estructural mínima de un campo (NO `FieldDefinition` — evita acoplar Zod).
 * `validator` es `string` (no el enum) para aceptar el wire format desacoplado del
 * renderer; un nombre desconocido cae al default por `type` (degradación segura).
 */
export interface ValidatorFieldShape {
  type: string
  validator?: string | null
  validatorParams?: ValidatorParams | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Calling codes E.164 para prefijar cuando el input no trae `+` (LATAM + US).
 * SSOT de los países con normalización/máscara de teléfono soportada — el renderer
 * (`mask.ts`) lo importa para derivar la máscara por país sin duplicar la lista.
 */
export const CALLING_CODES: Record<string, string> = {
  CL: '56',
  AR: '54',
  BO: '591',
  BR: '55',
  CA: '1',
  CO: '57',
  CR: '506',
  EC: '593',
  ES: '34',
  GB: '44',
  GT: '502',
  MX: '52',
  PA: '507',
  PE: '51',
  PY: '595',
  US: '1',
  UY: '598',
  VE: '58',
}

const asString = (value: unknown): string => {
  if (Array.isArray(value)) return value.join(',')
  if (typeof value === 'boolean') return value ? 'true' : ''

  return value == null ? '' : String(value)
}

const required = (): FormFieldValidationResult => ({
  valid: false,
  normalized: '',
  formatted: '',
  reasonCode: 'field_required',
})

const ok = (normalized: FormFieldValidationResult['normalized'], formatted?: string): FormFieldValidationResult => ({
  valid: true,
  normalized,
  formatted: formatted ?? String(normalized),
  reasonCode: null,
})

const validateEmail = (raw: unknown): FormFieldValidationResult => {
  const v = asString(raw).trim().toLowerCase()

  if (v.length === 0) return required()
  if (!EMAIL_RE.test(v)) return { valid: false, normalized: v, formatted: v, reasonCode: 'email_format' }

  return ok(v)
}

/**
 * Email corporativo (Tier 1, gratis, síncrono): sintaxis OK + dominio NO free/personal
 * NI desechable. Es el gate duro "que no cotice cualquiera con gmail" a nivel de campo.
 * El veredicto profundo de deliverability (Tier 2, provider pago) es server-only async
 * (orquestador `email-verification/`), NUNCA acá: este core es isomórfico y sin red.
 * `email_disposable` se distingue de `email_not_corporate` para que el caller pueda dar
 * un mensaje y una señal de calidad distintos (un desechable es peor que un gmail).
 */
const validateCorporateEmail = (raw: unknown): FormFieldValidationResult => {
  const v = asString(raw).trim().toLowerCase()

  if (v.length === 0) return required()

  const t1 = classifyEmailTier1(v)

  if (!t1.syntaxValid) return { valid: false, normalized: v, formatted: v, reasonCode: 'email_format' }

  if (t1.isDisposable) {
    return { valid: false, normalized: t1.normalizedEmail, formatted: t1.normalizedEmail, reasonCode: 'email_disposable' }
  }

  if (!t1.isCorporate) {
    return { valid: false, normalized: t1.normalizedEmail, formatted: t1.normalizedEmail, reasonCode: 'email_not_corporate' }
  }

  return ok(t1.normalizedEmail)
}

/**
 * E.164 estructural ligero (sin libphonenumber, para no inflar el bundle portable).
 * Normaliza a `+<digits>`. Si el input no trae `+`, prefija el calling code del país
 * (default CL). Heurística documentada: si los dígitos ya empiezan con el calling
 * code, no se duplica. Validación per-país rica (libphonenumber) = follow-up.
 */
const validateE164Phone = (raw: unknown, params?: ValidatorParams): FormFieldValidationResult => {
  const input = asString(raw).trim()

  if (input.length === 0) return required()

  const hasPlus = input.startsWith('+')
  let digits = input.replace(/\D/g, '')

  if (!hasPlus) {
    const cc = CALLING_CODES[(params?.country ?? 'CL').toUpperCase()] ?? ''

    if (cc && !digits.startsWith(cc)) digits = `${cc}${digits}`
  }

  const e164 = `+${digits}`

  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    return { valid: false, normalized: e164, formatted: e164, reasonCode: 'phone_format' }
  }

  return ok(e164)
}

const validateUrl = (raw: unknown): FormFieldValidationResult => {
  let v = asString(raw).trim()

  if (v.length === 0) return required()
  if (!/^https?:\/\//i.test(v)) v = `https://${v}` // normaliza: antepone scheme

  if (!URL_RE.test(v)) return { valid: false, normalized: v, formatted: v, reasonCode: 'url_format' }

  return ok(v)
}

const validateNumber = (raw: unknown): FormFieldValidationResult => {
  const s = asString(raw).trim()

  if (s.length === 0) return required()
  const n = Number(s)

  if (!Number.isFinite(n)) return { valid: false, normalized: s, formatted: s, reasonCode: 'number_format' }

  return ok(n)
}

const validateDate = (raw: unknown): FormFieldValidationResult => {
  const v = asString(raw).trim()

  if (v.length === 0) return required()

  if (!ISO_DATE_RE.test(v) || Number.isNaN(Date.parse(v))) {
    return { valid: false, normalized: v, formatted: v, reasonCode: 'date_format' }
  }

  return ok(v)
}

const validateConsent = (raw: unknown): FormFieldValidationResult => {
  if (raw === true || raw === 'true') return ok(true, 'true')

  return { valid: false, normalized: false, formatted: '', reasonCode: 'consent_required' }
}

const validateNationalId = (raw: unknown, params?: ValidatorParams): FormFieldValidationResult => {
  const r = validateNationalIdByCountry(params?.country ?? 'CL', asString(raw))

  return { valid: r.valid, normalized: r.normalized, formatted: r.formatted, reasonCode: r.reasonCode }
}

const validateText = (raw: unknown): FormFieldValidationResult => {
  const v = asString(raw).trim()

  return ok(v)
}

/** Default validator por `type` cuando el campo no declara `validator` explícito. */
const TYPE_DEFAULT_VALIDATOR: Record<string, NamedValidator> = {
  email: 'email_syntax',
  tel: 'e164_phone',
  url: 'url',
  national_id: 'national_id',
  number: 'number',
  date: 'date',
  consent: 'consent',
}

const isNamedValidator = (value: string | null | undefined): value is NamedValidator =>
  value != null && (NAMED_VALIDATORS as readonly string[]).includes(value)

/**
 * Resuelve el validador nombrado de un campo: override explícito (si es un validador
 * conocido) → default por `type` → `text`. Un `validator` string desconocido NO rompe:
 * cae al default por type (degradación segura, anti-ReDoS por construcción).
 */
export const resolveValidatorName = (field: ValidatorFieldShape): NamedValidator => {
  if (isNamedValidator(field.validator)) return field.validator

  return TYPE_DEFAULT_VALIDATOR[field.type] ?? 'text'
}

/** Ejecuta un validador nombrado sobre un valor crudo. Punto de entrada canónico. */
export const validateFormValue = (
  validator: NamedValidator,
  rawValue: unknown,
  params?: ValidatorParams,
): FormFieldValidationResult => {
  switch (validator) {
    case 'email_syntax':
      return validateEmail(rawValue)
    case 'corporate_email':
      return validateCorporateEmail(rawValue)
    case 'e164_phone':
      return validateE164Phone(rawValue, params)
    case 'url':
      return validateUrl(rawValue)
    case 'national_id':
      return validateNationalId(rawValue, params)
    case 'number':
      return validateNumber(rawValue)
    case 'date':
      return validateDate(rawValue)
    case 'consent':
      return validateConsent(rawValue)
    case 'text':
    default:
      return validateText(rawValue)
  }
}

/**
 * Conveniencia: resuelve el validador del campo + valida el valor. Asume valor
 * presente (el caller maneja required/empty condicional). Cliente y servidor
 * llaman ESTO para garantizar paridad por construcción.
 */
export const validateFieldValue = (
  field: ValidatorFieldShape,
  rawValue: unknown,
): FormFieldValidationResult =>
  validateFormValue(resolveValidatorName(field), rawValue, field.validatorParams ?? undefined)
