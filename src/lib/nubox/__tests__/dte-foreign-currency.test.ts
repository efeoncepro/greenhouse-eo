// TASK-990 Slice 5 — DTE foreign-currency XML parser (Berel DTE 110 fixture).

import { describe, expect, it } from 'vitest'

import { parseDteForeignCurrencyXml, siiCurrencyNameToIso } from '../dte-foreign-currency'

// Verbatim shape of Berel's DTE 110 Encabezado (sale 28800562, verified live).
const BEREL_XML = `<DTE><Documento><Encabezado><IdDoc><TipoDTE>110</TipoDTE></IdDoc>` +
  `<Totales><TpoMoneda>PESO MEX</TpoMoneda><MntExe>89960</MntExe><MntTotal>89960</MntTotal></Totales>` +
  `<OtraMoneda><TpoMoneda>PESO CL</TpoMoneda><TpoCambio>51</TpoCambio>` +
  `<MntExeOtrMnda>4617647</MntExeOtrMnda><MntTotOtrMnda>4617647</MntTotOtrMnda></OtraMoneda>` +
  `</Encabezado></Documento></DTE>`

const CLP_ONLY_XML = `<DTE><Documento><Encabezado><IdDoc><TipoDTE>33</TipoDTE></IdDoc>` +
  `<Totales><MntNeto>1000000</MntNeto><IVA>190000</IVA><MntTotal>1190000</MntTotal></Totales>` +
  `</Encabezado></Documento></DTE>`

describe('siiCurrencyNameToIso', () => {
  it('maps SII descriptive names to ISO codes', () => {
    expect(siiCurrencyNameToIso('PESO MEX')).toBe('MXN')
    expect(siiCurrencyNameToIso('peso cl')).toBe('CLP')
    expect(siiCurrencyNameToIso('DOLAR USA')).toBe('USD')
    expect(siiCurrencyNameToIso('EURO')).toBe('EUR')
  })

  it('returns null for unknown names (fail-closed, never guess)', () => {
    expect(siiCurrencyNameToIso('YEN JAPONES')).toBeNull()
    expect(siiCurrencyNameToIso(null)).toBeNull()
    expect(siiCurrencyNameToIso('')).toBeNull()
  })
})

describe('parseDteForeignCurrencyXml — Berel DTE 110', () => {
  it('extracts native MXN + functional CLP planes', () => {
    const parsed = parseDteForeignCurrencyXml(BEREL_XML)

    expect(parsed).not.toBeNull()
    expect(parsed!.nativeCurrencyCode).toBe('MXN')
    expect(parsed!.nativeCurrencyName).toBe('PESO MEX')
    expect(parsed!.nativeTotal).toBe(89960)
    expect(parsed!.nativeExempt).toBe(89960)
    expect(parsed!.clpTotal).toBe(4617647)
    expect(parsed!.declaredExchangeRate).toBe(51)
  })

  it('derives the implicit CLP-per-native rate from the authoritative amounts', () => {
    const parsed = parseDteForeignCurrencyXml(BEREL_XML)

    // 4617647 / 89960 = 51.3300… (more precise than the rounded declared 51)
    expect(parsed!.impliedRateClpPerNative).toBeCloseTo(51.3300, 3)
  })

  it('returns null for a single-currency CLP document (no <OtraMoneda>)', () => {
    expect(parseDteForeignCurrencyXml(CLP_ONLY_XML)).toBeNull()
  })

  it('never throws on malformed / empty XML', () => {
    expect(parseDteForeignCurrencyXml('')).toBeNull()
    expect(parseDteForeignCurrencyXml(null)).toBeNull()
    expect(parseDteForeignCurrencyXml('<garbage>')).toBeNull()
  })
})
