import 'server-only'

/**
 * TASK-1242 — Clasificador de dominio de email (corporate vs personal/free).
 *
 * Lo usa el HubSpot lead handoff para decidir el dedup de Company: un lead con email
 * corporativo (`juan@acme.com`) matchea/crea la company "acme.com"; un email personal
 * (`juan@gmail.com`) entra SOLO como contact, sin company (evita companies basura tipo
 * "Gmail" en el CRM productivo).
 *
 * Default conservador: ante cualquier duda (dominio vacío, malformado, o en la lista de
 * free providers) → `personal`. Preferimos no crear una company antes que crear una mala.
 *
 * Heurística, no verdad absoluta: la lista de free providers es acotada y mantenible; un
 * dominio corporativo raro mal clasificado como personal solo pierde la asociación de
 * company (el contact igual se crea). Es promovible a `src/lib/**` compartido si otro
 * dominio lo necesita (commercial, account-360); hoy vive acá porque lo posee TASK-1242.
 */

/**
 * Proveedores de email personal/gratuito + dominios desechables comunes. Acotado a propósito:
 * cubre el grueso de los leads B2C que NO representan una empresa. Mantener ordenado.
 */
const PERSONAL_EMAIL_DOMAINS = new Set<string>([
  // Globales mainstream
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'ymail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'tutanota.com',
  // Locales LATAM frecuentes
  'hotmail.es',
  'hotmail.cl',
  'outlook.es',
  'outlook.cl',
  'yahoo.es',
  'yahoo.com.mx',
  'yahoo.com.ar',
  'live.cl',
  'terra.cl',
  'vtr.net',
  // Desechables / temporales
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
  'trashmail.com',
  'yopmail.com',
])

export type EmailDomainClass = 'corporate' | 'personal'

export interface EmailDomainClassification {
  /** Dominio normalizado (lowercase, sin espacios). `null` si el email es inválido. */
  domain: string | null
  classification: EmailDomainClass
  /** Conveniencia: `true` solo cuando `classification === 'corporate'`. */
  isCorporate: boolean
}

/** Extrae el dominio normalizado de un email. `null` si no parsea como `local@domain`. */
export const extractEmailDomain = (email: string | null | undefined): string | null => {
  if (!email) return null

  const trimmed = email.trim().toLowerCase()
  const atIndex = trimmed.lastIndexOf('@')

  // Necesita exactamente un local-part no vacío + un domain no vacío con al menos un punto.
  if (atIndex <= 0 || atIndex === trimmed.length - 1) return null

  const domain = trimmed.slice(atIndex + 1)

  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return null
  if (/\s/.test(domain)) return null

  return domain
}

/**
 * Clasifica el email como `corporate` o `personal`. Conservador: dominio inválido o en la
 * lista de free providers ⇒ `personal` (el handoff NO crea company en ese caso).
 */
export const classifyEmailDomain = (email: string | null | undefined): EmailDomainClassification => {
  const domain = extractEmailDomain(email)

  if (!domain || PERSONAL_EMAIL_DOMAINS.has(domain)) {
    return { domain, classification: 'personal', isCorporate: false }
  }

  return { domain, classification: 'corporate', isCorporate: true }
}

/** Helper directo: ¿este email justifica matchear/crear una Company por su dominio? */
export const isCorporateEmail = (email: string | null | undefined): boolean =>
  classifyEmailDomain(email).isCorporate
