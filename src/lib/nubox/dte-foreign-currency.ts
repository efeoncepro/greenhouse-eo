// TASK-990 Slice 5 — DTE foreign-currency parser.
//
// Chilean export DTEs (110/111/112) issued in a foreign currency carry the
// NATIVE amount in the `<Totales>` block (e.g. PESO MEX 89960) and the CLP legal
// equivalent in the `<OtraMoneda>` block (PESO CL 4617647 at a declared
// `<TpoCambio>`). Neither the Nubox `/sales` list nor `/sales/{id}/details`
// endpoints expose this — only the SII XML (`getNuboxSaleXml`) does. This pure
// parser extracts both planes so the conformed sync can populate the native +
// functional fields (TASK-990 Slice 3 columns) from the authoritative legal doc.
//
// Pure module (no IO) so it is testable against fixture XML.

// SII "Tabla de Monedas" uses descriptive Spanish names, not ISO 4217 codes.
// Map the ones relevant to Greenhouse's finance_core corridor (CLP/USD/MXN) plus
// a few common neighbours; unknown names return null (fail-closed, never guess).
const SII_CURRENCY_NAME_TO_ISO: Record<string, string> = {
  'PESO CL': 'CLP',
  'PESO CHILENO': 'CLP',
  'PESO MEX': 'MXN',
  'PESO MEXICANO': 'MXN',
  'DOLAR USA': 'USD',
  DOLAR: 'USD',
  EURO: 'EUR',
  'PESO ARG': 'ARS',
  'PESO COL': 'COP',
  'SOL PERUANO': 'PEN',
  REAL: 'BRL'
}

export const siiCurrencyNameToIso = (name: string | null | undefined): string | null => {
  if (!name) return null

  return SII_CURRENCY_NAME_TO_ISO[name.trim().toUpperCase()] ?? null
}

export type DteForeignCurrency = {
  /** Native (principal) currency ISO code from `<Totales><TpoMoneda>`. */
  nativeCurrencyCode: string | null
  /** Raw SII currency name (e.g. 'PESO MEX') for audit. */
  nativeCurrencyName: string | null
  /** Native total from `<Totales><MntTotal>` (e.g. 89960 MXN). */
  nativeTotal: number | null
  /** Native exempt from `<Totales><MntExe>`. */
  nativeExempt: number | null
  /** CLP legal total from `<OtraMoneda><MntTotOtrMnda>` (e.g. 4617647). */
  clpTotal: number | null
  /** Declared SII exchange rate `<OtraMoneda><TpoCambio>` (rounded). */
  declaredExchangeRate: number | null
  /**
   * Implicit rate derived from the two authoritative amounts
   * (clpTotal / nativeTotal). More precise than the rounded declared rate; this
   * is the canonical FX evidence rate (ADR §8.4 — CLP is never recomputed, so
   * the rate is *derived from* the legal amounts, not applied to compute them).
   */
  impliedRateClpPerNative: number | null
}

const readTag = (block: string, tag: string): string | null => {
  const m = block.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'))

  return m ? m[1]!.trim() : null
}

const readNumberTag = (block: string, tag: string): number | null => {
  const raw = readTag(block, tag)

  if (raw === null || raw === '') return null
  const n = Number(raw)

  return Number.isFinite(n) ? n : null
}

/**
 * Parse the foreign-currency planes from a DTE XML. Returns null when the XML
 * carries no `<OtraMoneda>` block (a plain CLP-denominated document — no foreign
 * plane). Never throws on malformed XML; missing tags degrade to null fields.
 */
export const parseDteForeignCurrencyXml = (xml: string | null | undefined): DteForeignCurrency | null => {
  if (!xml) return null

  const totales = xml.match(/<Totales>[\s\S]*?<\/Totales>/i)?.[0] ?? null
  const otra = xml.match(/<OtraMoneda>[\s\S]*?<\/OtraMoneda>/i)?.[0] ?? null

  // No secondary-currency block → the document is single-currency (CLP). The
  // foreign plane is absent; callers keep the existing CLP-only behaviour.
  if (!otra || !totales) return null

  const nativeCurrencyName = readTag(totales, 'TpoMoneda')
  const nativeCurrencyCode = siiCurrencyNameToIso(nativeCurrencyName)
  const nativeTotal = readNumberTag(totales, 'MntTotal')
  const nativeExempt = readNumberTag(totales, 'MntExe')

  const clpTotal = readNumberTag(otra, 'MntTotOtrMnda')
  const declaredExchangeRate = readNumberTag(otra, 'TpoCambio')

  const impliedRateClpPerNative =
    clpTotal !== null && nativeTotal !== null && nativeTotal !== 0 ? clpTotal / nativeTotal : null

  return {
    nativeCurrencyCode,
    nativeCurrencyName,
    nativeTotal,
    nativeExempt,
    clpTotal,
    declaredExchangeRate,
    impliedRateClpPerNative
  }
}
