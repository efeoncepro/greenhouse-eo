import 'server-only'

/**
 * TASK-1321 — Adapter: submission de `/aeo-2/` (`fdef-efeonce-aeo-diagnostic`) → intake del grader.
 *
 * El form `/aeo-2/` vive en un namespace de campos DISTINTO al form del grader
 * (`fdef-ai-visibility-grader`): captura `fullName`/`brandWebsite`/`country`/`companySize`/
 * `mainCompetitor` (+ `brandName` desde la versión nueva TASK-1321) en vez de
 * `brandName`/`websiteUrl`/`market`/`locale`/`category`/`competitorsDeclared`. Este módulo hace
 * el **remap determinista** de esos campos al shape que consume `enqueueGraderDiagnostic`
 * (`brandName`/`websiteUrl`/`market`/`locale`/`competitorsDeclared` + PII para el lead).
 *
 * `category` NO se resuelve acá: es un read asíncrono con LLM (`brand-intelligence` grounded)
 * que corre en el reactive consumer (projection), no en esta función pura. Este adapter deja
 * listo TODO lo determinista para que la projection solo agregue la categoría y encole.
 *
 * PII (email/firstName/lastName) sale mapeada para el lead; NUNCA la usa el enqueue del run.
 */

/**
 * Form-definition id del form público de `/aeo-2/` (governed forms engine).
 *
 * ⚠️ NO confundir con el **formKey** público `b120566a-dd1a-43c8-956a-4e0121e805b8`
 * (el handle opaco que el WordPress `<greenhouse-form form-key="…">` embebe y que resuelve
 * el activation script vía `getFormDefinitionByKey`). Son dos identificadores del MISMO form:
 *   - formKey `b120566a-…`  → handle público (renderer + publish de versión nueva).
 *   - `fdef-efeonce-aeo-diagnostic` → id de definición: es lo que viaja en el outbox event
 *     (`FormSubmissionAcceptedEventPayload.formId`) y lo que persiste `form_submission.form_id`.
 * La projection matchea por ESTE id (no por el formKey), porque es lo que trae el evento.
 * Live verificado 2026-07-02: `/aeo-2/` renderiza `form-key="b120566a-…"` surface
 * `fhsf-efeonce-aeo-diagnostic` → slug `efeonce-aeo-diagnostic` → este id.
 */
export const AEO_DIAGNOSTIC_FORM_ID = 'fdef-efeonce-aeo-diagnostic'

/** formKey público del form `/aeo-2/` (handle del renderer + target del activation script). */
export const AEO_DIAGNOSTIC_FORM_KEY = 'b120566a-dd1a-43c8-956a-4e0121e805b8'

/**
 * country (ISO-2) → market + locale del grader. Cubre las opciones vigentes del select de
 * `/aeo-2/` (CL/CO/MX/PE) + US. Conservador; ampliar cuando el form ofrezca otro país.
 * Fuente única de la derivación en el path público (el `MARKET_BY_COUNTRY` de
 * `provision-profile.ts` es portal-only y solo cubre CL/MX/US).
 */
const AEO_MARKET_BY_COUNTRY: Record<string, { market: string; locale: string }> = {
  CL: { market: 'CL', locale: 'es-CL' },
  CO: { market: 'CO', locale: 'es-CO' },
  MX: { market: 'MX', locale: 'es-MX' },
  PE: { market: 'PE', locale: 'es-PE' },
  US: { market: 'US', locale: 'en-US' },
}

/**
 * Deriva `market`/`locale` desde el `country` del form. Fallback conservador a CL/es-CL
 * (mercado base) cuando el país es desconocido o vacío — nunca deja `market`/`locale` vacío
 * (romperían `isValidPublicGraderInput`).
 */
export const resolveAeoMarketLocale = (
  country: string | null | undefined,
): { market: string; locale: string } => {
  const code = (country ?? '').trim().toUpperCase()

  return AEO_MARKET_BY_COUNTRY[code] ?? { market: 'CL', locale: 'es-CL' }
}

/**
 * Shape determinista listo para el enqueue del grader + la materialización del lead. La
 * `category` la agrega la projection tras el brand-intelligence read (no vive acá).
 */
export interface AeoDiagnosticDeterministicIntake {
  /** Marca — campo `brandName` de la versión nueva del form (único input no derivable). */
  readonly brandName: string
  /** Dominio/URL desde `brandWebsite` (requerido: brand-intelligence lo necesita). */
  readonly websiteUrl: string
  /** Mercado derivado de `country`. */
  readonly market: string
  /** Locale derivado de `country`. */
  readonly locale: string
  /** Competidores declarados desde `mainCompetitor` (single → array). */
  readonly competitorsDeclared: string[]
  /** Email — PII para el lead, NUNCA para el run. */
  readonly email: string
  readonly firstName: string | null
  readonly lastName: string | null
  readonly companySize: string | null
}

export type AeoDiagnosticSkipReason =
  | 'missing_brand_name'
  | 'missing_website'
  | 'missing_email'

export type AeoDiagnosticMapResult =
  | { readonly ok: true; readonly intake: AeoDiagnosticDeterministicIntake }
  | { readonly ok: false; readonly reason: AeoDiagnosticSkipReason }

const asTrimmed = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

const splitFullName = (fullName: string | null): { firstName: string | null; lastName: string | null } => {
  if (!fullName) return { firstName: null, lastName: null }

  const parts = fullName.split(/\s+/).filter(Boolean)

  if (parts.length === 0) return { firstName: null, lastName: null }
  if (parts.length === 1) return { firstName: parts[0], lastName: null }

  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

/**
 * Mapea `normalized_fields_json` de un submission de `/aeo-2/` al intake determinista del
 * grader. Retorna `{ ok: false, reason }` (skip → degradar al lead comercial, sin run) cuando
 * falta un campo estructuralmente requerido: `brandName` (submissions de la versión vieja),
 * `brandWebsite` (brand-intelligence no puede correr sin sitio) o `email`.
 *
 * Función PURA: sin I/O, sin LLM. La categoría la agrega la projection.
 */
export const mapAeoDiagnosticToGraderIntake = (
  fields: Record<string, unknown>,
): AeoDiagnosticMapResult => {
  const brandName = asTrimmed(fields.brandName)

  if (!brandName) return { ok: false, reason: 'missing_brand_name' }

  const websiteUrl = asTrimmed(fields.brandWebsite) ?? asTrimmed(fields.websiteUrl)

  if (!websiteUrl) return { ok: false, reason: 'missing_website' }

  const email = asTrimmed(fields.email)

  if (!email) return { ok: false, reason: 'missing_email' }

  const { market, locale } = resolveAeoMarketLocale(asTrimmed(fields.country))

  // firstName/lastName: los produce el namePolicy split en submit; fallback defensivo al
  // split de fullName por si un submission viejo no los trae normalizados.
  const explicitFirst = asTrimmed(fields.firstName)
  const explicitLast = asTrimmed(fields.lastName)
  const split = splitFullName(asTrimmed(fields.fullName))
  const firstName = explicitFirst ?? split.firstName
  const lastName = explicitLast ?? split.lastName

  const competitor = asTrimmed(fields.mainCompetitor)
  const competitorsDeclared = competitor ? [competitor] : []

  return {
    ok: true,
    intake: {
      brandName,
      websiteUrl,
      market,
      locale,
      competitorsDeclared,
      email,
      firstName,
      lastName,
      companySize: asTrimmed(fields.companySize),
    },
  }
}
