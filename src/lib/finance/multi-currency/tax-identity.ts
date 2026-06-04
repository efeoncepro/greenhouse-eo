// TASK-990 Slice 4 — Cross-country fiscal identity matching.
//
// Greenhouse's Nubox identity resolver historically keyed organizations by
// Chilean RUT (`buildNuboxOrgByRutMap`). With MXN export invoices (DTE 110),
// the counterparty tax id is a Mexican RFC, NOT a RUT — e.g. Pinturas Berel
// `PBE970101718` (country MX, no RUT). These helpers normalize + classify a raw
// tax-id value so the resolver matches RUT and RFC alike, without creating a
// parallel identity (overlay arch #1 — extend `greenhouse_core.organizations`).
//
// Pure module (no IO, no server-only) so it is testable and reusable from both
// the conformed sync (server) and the dry-run report.

export type TaxIdKind = 'rut' | 'rfc' | 'unknown'

export type ClassifiedTaxId = {
  /** Canonical key for matching: uppercased, internal whitespace collapsed.
   *  Dashes preserved (Chilean RUT canonical is `88417000-1`). */
  normalized: string
  kind: TaxIdKind
}

// Mexican RFC: 3 letters (persona moral) or 4 letters (persona física), then 6
// date digits (YYMMDD), then 3 homoclave chars (alnum). `Ñ`/`&` are legal in
// the name block. SAT canonical form is uppercase, no separators.
const RFC_PERSONA_MORAL = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/
const RFC_PERSONA_FISICA = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/

// Chilean RUT canonical as stored in `organizations.tax_id` / Nubox payloads:
// body digits + dash + check digit (`0-9` or `K`). Dots optional in the wild;
// we normalize them out for the shape test but keep the canonical dash form.
const RUT_SHAPE = /^\d{1,9}-[\dkK]$/

/**
 * Normalize a raw tax-id for matching: trim, uppercase, collapse internal
 * whitespace. Dashes are PRESERVED (RUT canonical keeps the body-dash-dv form).
 * Returns '' for nullish/blank input.
 */
export const normalizeTaxId = (raw: string | null | undefined): string => {
  if (!raw) return ''

  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

/** True when the normalized value matches the Mexican RFC persona-moral shape
 *  (12 chars: 3 letters + 6 date + 3 homoclave). */
export const isValidRfcPersonaMoral = (raw: string | null | undefined): boolean =>
  RFC_PERSONA_MORAL.test(normalizeTaxId(raw))

/** True when the normalized value matches the Mexican RFC persona-física shape
 *  (13 chars: 4 letters + 6 date + 3 homoclave). */
export const isValidRfcPersonaFisica = (raw: string | null | undefined): boolean =>
  RFC_PERSONA_FISICA.test(normalizeTaxId(raw))

/** True when the value is a structurally valid Mexican RFC (moral or física). */
export const isValidRfc = (raw: string | null | undefined): boolean =>
  isValidRfcPersonaMoral(raw) || isValidRfcPersonaFisica(raw)

/** True when the value matches the Chilean RUT canonical shape. Dots are
 *  stripped before the shape test (`12.345.678-9` → `12345678-9`). */
export const isValidRutShape = (raw: string | null | undefined): boolean =>
  RUT_SHAPE.test(normalizeTaxId(raw).replace(/\./g, ''))

/**
 * Classify a raw tax-id value as RUT, RFC, or unknown, and return its canonical
 * matching key. RFC takes precedence over RUT only when the value matches the
 * RFC shape (the two shapes are disjoint — RUT requires a dash, RFC forbids one).
 */
export const classifyTaxId = (raw: string | null | undefined): ClassifiedTaxId => {
  const normalized = normalizeTaxId(raw)

  if (!normalized) return { normalized: '', kind: 'unknown' }
  if (isValidRfc(normalized)) return { normalized, kind: 'rfc' }
  if (isValidRutShape(normalized)) return { normalized: normalized.replace(/\./g, ''), kind: 'rut' }

  return { normalized, kind: 'unknown' }
}
