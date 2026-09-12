// TASK-1367 — Validación PURA del payload de postulación pública (single source of truth,
// estilo grader public-intake, NO Zod). Sin IO. Normaliza email + valida URLs browser-safe.

import { resolveHiringAvailability } from '@/lib/hiring/candidate-intake/availability'
import { validateE164PhoneValue } from '@/lib/growth/forms/validators/phone'
import { isValidCountryCode } from '@/lib/locale/countries'

export interface PublicHiringApplicationInput {
  openingPublicId: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  /** TASK-1688 — ISO 3166-1 alpha-2 autodeclarado. La UI lo exige; el parser lo valida si viene
   * (expand/contract: se vuelve requerido a nivel parser tras verificar ambas superficies en prod). */
  residenceCountryCode?: string | null
  portfolioUrl?: string | null
  linkedinUrl?: string | null
  availability?: string | null
  message?: string | null
  consent: boolean
  consentPolicyVersion?: string | null
  futureOpportunitiesConsent?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NAME = 200
const MAX_MESSAGE = 4000
const MAX_URL = 2000

export const normalizeEmail = (value: string): string => value.trim().toLowerCase()

const asTrimmed = (value: unknown, max: number): string => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/** URL https browser-safe: `new URL()` válido, protocolo https, sin javascript:/data:/vbscript:. */
export const isSafeHttpUrl = (value: string): boolean => {
  if (!value) return false

  try {
    const url = new URL(value)

    return url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * ISSUE-172 — normaliza un enlace opcional del candidato a https o lo descarta. Devuelve la URL
 * https canónica, o `null` cuando no hay valor o cuando el enlace no puede volverse seguro
 * (scheme peligroso, sin host con dominio). NUNCA devuelve un scheme distinto de https, y NUNCA
 * es motivo para rechazar la postulación: el caller conserva la application y deja el campo vacío.
 */
export const normalizeOptionalHttpsUrl = (raw: string): string | null => {
  const value = raw.trim()

  if (!value) return null

  // «linkedin.com/in/ada» → https://linkedin.com/in/ada · «http://ada.dev» → https://ada.dev
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`
  const candidate = withScheme.replace(/^http:\/\//i, 'https://')

  if (!isSafeHttpUrl(candidate)) return null

  try {
    const url = new URL(candidate)

    // Un host sin punto («https://no-url») parsea pero no es un enlace de una persona.
    if (!url.hostname.includes('.')) return null

    // Se persiste el href CANÓNICO (percent-encoding, slashes colapsados, sin tab/NL embebidos), no el
    // texto crudo: «https:////evil.com» o un salto de línea dentro del path no deben llegar a la base.
    // Un origen pelado conserva su forma sin barra final («https://ada.dev»), que es lo que muestra la UI.
    return url.pathname === '/' && !url.search && !url.hash ? url.href.replace(/\/$/, '') : url.href
  } catch {
    return null
  }
}

export interface NormalizedApplicationInput {
  openingPublicId: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string | null
  residenceCountryCode: string | null
  portfolioUrl: string | null
  linkedinUrl: string | null
  availability: string | null
  message: string | null
  consentPolicyVersion: string | null
  futureOpportunitiesConsent: boolean
}

/**
 * Valida + normaliza el payload crudo (todo `unknown`). Devuelve la entrada normalizada o `null` si
 * es inválida (missing/consent-false/email-mal/URL-insegura). Es la frontera de enforcement: el
 * caller trata `null` como `invalid` genérico (nunca revela cuál campo falló al público).
 */
export const parsePublicHiringApplication = (raw: unknown): NormalizedApplicationInput | null => {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Record<string, unknown>

  if (body.consent !== true) return null

  const openingPublicId = asTrimmed(body.openingPublicId, 200)

  // TASK-1736 (ADR D1) — el nombre se conserva RAW EXACTO como evidencia del postulante (sólo trim
  // exterior + cap, igual que siempre). El parser NO normaliza NFC/whitespace/casing: la
  // normalización estructural ocurre en el primitive canónico `@/lib/hiring/candidate-intake`
  // dentro del command, sin mutar jamás lo que la persona escribió.
  const firstName = asTrimmed(body.firstName, MAX_NAME)
  const lastName = asTrimmed(body.lastName, MAX_NAME)
  const email = normalizeEmail(asTrimmed(body.email, MAX_NAME))

  if (!openingPublicId || !firstName || !lastName) return null
  if (!EMAIL_RE.test(email)) return null

  // ISSUE-172 — las URLs son OPCIONALES y nunca tumban la postulación. Un enlace sin scheme
  // («linkedin.com/in/x», que el formulario aceptaba) o con `http://` se normaliza a https; uno
  // peligroso o ilegible (`javascript:`, `data:`, sin host) se DESCARTA y la postulación sigue —
  // el mismo criterio que `availability` fuera de catálogo. Dos personas reales perdieron su
  // postulación por un enlace sin `https://` el 2026-09-11; nunca se persiste un scheme inseguro.
  const portfolioUrl = normalizeOptionalHttpsUrl(asTrimmed(body.portfolioUrl, MAX_URL))
  const linkedinUrl = normalizeOptionalHttpsUrl(asTrimmed(body.linkedinUrl, MAX_URL))
  const phoneRaw = asTrimmed(body.phone, MAX_NAME)

  // TASK-1688 — país de residencia autodeclarado, REQUERIDO (flip contract 2026-08-12: ambas
  // superficies verificadas en producción con release 393144e9f; ver ADR delta en la
  // arquitectura Hiring). Un valor ausente o inválido = payload inválido (nunca persistir un
  // país inventado ni aceptar postulación sin residencia declarada).
  // OJO: NO truncar — 'Chile'.slice(0,2)='CH' sería Suiza. Exactamente 2 chars ISO o rechazo.
  const residenceRaw = asTrimmed(body.residenceCountryCode, 10).toUpperCase()

  if (residenceRaw.length !== 2 || !isValidCountryCode(residenceRaw)) return null

  // El país de residencia SÓLO sirve como hint de formato local del teléfono cuando el
  // candidato no escribe el prefijo internacional — nunca al revés (residencia no se infiere).
  const phoneResult = phoneRaw ? validateE164PhoneValue(phoneRaw, { country: residenceRaw || 'CL' }) : null

  if (phoneResult && !phoneResult.valid) return null

  return {
    openingPublicId,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    email,
    phone: phoneResult ? String(phoneResult.normalized) : null,
    residenceCountryCode: residenceRaw || null,
    portfolioUrl,
    linkedinUrl,
    // TASK-1736 — availability se contrasta server-side contra el catálogo estable de options del
    // Growth Form (mismo SSOT de copy): match mecánico-seguro devuelve el valor CANÓNICO; un valor
    // fuera de catálogo se conserva como texto acotado (fallback tolerante — el intake público
    // jamás pierde una application por esto).
    availability: resolveHiringAvailability(asTrimmed(body.availability, MAX_NAME)).value,
    message: asTrimmed(body.message, MAX_MESSAGE) || null,
    consentPolicyVersion: asTrimmed(body.consentPolicyVersion, MAX_NAME) || null,
    futureOpportunitiesConsent: body.futureOpportunitiesConsent === true
  }
}
