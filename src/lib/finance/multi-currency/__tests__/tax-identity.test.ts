// TASK-990 Slice 4 — tax identity (RUT + RFC) classification.

import { describe, expect, it } from 'vitest'

import {
  classifyTaxId,
  isValidRfc,
  isValidRfcPersonaFisica,
  isValidRfcPersonaMoral,
  isValidRutShape,
  normalizeTaxId
} from '../tax-identity'

describe('normalizeTaxId', () => {
  it('trims, uppercases, collapses whitespace, preserves dash', () => {
    expect(normalizeTaxId('  pbe970101718 ')).toBe('PBE970101718')
    expect(normalizeTaxId('88417000-1')).toBe('88417000-1')
    expect(normalizeTaxId('p b e 970101718')).toBe('PBE970101718')
    expect(normalizeTaxId(null)).toBe('')
    expect(normalizeTaxId(undefined)).toBe('')
    expect(normalizeTaxId('   ')).toBe('')
  })
})

describe('Mexican RFC validation', () => {
  it('Berel persona moral RFC is valid (3 letters + 6 date + 3 homoclave)', () => {
    expect(isValidRfcPersonaMoral('PBE970101718')).toBe(true)
    expect(isValidRfc('PBE970101718')).toBe(true)
    expect(isValidRfcPersonaFisica('PBE970101718')).toBe(false)
  })

  it('persona física RFC is valid (4 letters)', () => {
    expect(isValidRfcPersonaFisica('GODE561231GR8')).toBe(true)
    expect(isValidRfc('GODE561231GR8')).toBe(true)
    expect(isValidRfcPersonaMoral('GODE561231GR8')).toBe(false)
  })

  it('accepts case + whitespace variance', () => {
    expect(isValidRfc('pbe970101718')).toBe(true)
    expect(isValidRfc(' PBE 970101718 ')).toBe(true)
  })

  it('rejects malformed RFC', () => {
    expect(isValidRfc('PB970101718')).toBe(false) // 2 letters
    expect(isValidRfc('PBE97010171')).toBe(false) // short homoclave
    expect(isValidRfc('88417000-1')).toBe(false) // RUT, not RFC
    expect(isValidRfc('')).toBe(false)
  })
})

describe('Chilean RUT shape', () => {
  it('accepts canonical RUT with/without dots', () => {
    expect(isValidRutShape('88417000-1')).toBe(true)
    expect(isValidRutShape('12.345.678-9')).toBe(true)
    expect(isValidRutShape('76543210-K')).toBe(true)
  })

  it('rejects RFC + garbage', () => {
    expect(isValidRutShape('PBE970101718')).toBe(false)
    expect(isValidRutShape('884170001')).toBe(false) // no dash
  })
})

describe('classifyTaxId', () => {
  it('classifies Berel as rfc', () => {
    expect(classifyTaxId('PBE970101718')).toEqual({ normalized: 'PBE970101718', kind: 'rfc' })
    expect(classifyTaxId(' pbe970101718 ')).toEqual({ normalized: 'PBE970101718', kind: 'rfc' })
  })

  it('classifies RUT and strips dots in the canonical key', () => {
    expect(classifyTaxId('88417000-1')).toEqual({ normalized: '88417000-1', kind: 'rut' })
    expect(classifyTaxId('12.345.678-9')).toEqual({ normalized: '12345678-9', kind: 'rut' })
  })

  it('classifies unknown for non-tax-id strings', () => {
    expect(classifyTaxId('not-a-tax-id')).toEqual({ normalized: 'NOT-A-TAX-ID', kind: 'unknown' })
    expect(classifyTaxId(null)).toEqual({ normalized: '', kind: 'unknown' })
  })
})
