import { describe, expect, it } from 'vitest'

import { FINANCE_NATIVE_UNITS, INDEXED_UNITS, VALID_CURRENCIES } from '@/lib/finance/contracts'
import {
  assertCashCurrency,
  isCashCurrency,
  isIndexedUnit,
  toFinanceCurrency,
  toFinanceNativeUnit,
  toIndexedUnit
} from '@/lib/finance/currency-domain'

/**
 * TASK-995 Slice 1 — indexed-unit (UF/CLF) vs cash-currency type split.
 * ADR GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1: CLF is accepted only on the
 * native/indexed-unit plane and rejected on every cash plane (accounts,
 * payment orders, settlement legs). These tests lock that boundary.
 */
describe('indexed unit vs cash currency split (TASK-995)', () => {
  it('declares CLF as an indexed unit, never a cash currency', () => {
    expect(INDEXED_UNITS).toContain('CLF')
    expect(VALID_CURRENCIES).not.toContain('CLF' as never)
    expect(FINANCE_NATIVE_UNITS).toEqual(expect.arrayContaining(['CLP', 'USD', 'MXN', 'CLF']))
  })

  it('isIndexedUnit recognizes CLF (case-insensitive) and rejects cash currencies', () => {
    expect(isIndexedUnit('CLF')).toBe(true)
    expect(isIndexedUnit('clf')).toBe(true)
    expect(isIndexedUnit('CLP')).toBe(false)
    expect(isIndexedUnit('USD')).toBe(false)
    expect(isIndexedUnit('MXN')).toBe(false)
  })

  it('isCashCurrency recognizes cash currencies and rejects CLF', () => {
    expect(isCashCurrency('CLP')).toBe(true)
    expect(isCashCurrency('USD')).toBe(true)
    expect(isCashCurrency('MXN')).toBe(true)
    expect(isCashCurrency('CLF')).toBe(false)
  })

  it('toFinanceNativeUnit accepts CLF as a native indexed unit', () => {
    expect(toFinanceNativeUnit('CLF')).toBe('CLF')
    expect(toFinanceNativeUnit('clf')).toBe('CLF')
    expect(toFinanceNativeUnit('CLP')).toBe('CLP')
    expect(toFinanceNativeUnit('MXN')).toBe('MXN')
  })

  it('toFinanceNativeUnit rejects an unknown unit', () => {
    expect(() => toFinanceNativeUnit('BTC')).toThrow()
  })

  it('toIndexedUnit accepts CLF and rejects cash currencies', () => {
    expect(toIndexedUnit('CLF')).toBe('CLF')
    expect(() => toIndexedUnit('CLP')).toThrow()
  })

  it('toFinanceCurrency keeps rejecting CLF (cash path stays CLF-free)', () => {
    expect(() => toFinanceCurrency('CLF')).toThrow()
    expect(toFinanceCurrency('CLP')).toBe('CLP')
  })

  it('assertCashCurrency rejects CLF on cash planes with a distinct error', () => {
    expect(() => assertCashCurrency('CLF', 'payment order')).toThrow(/Indexed unit/)
    expect(() => assertCashCurrency('CLF', 'account')).toThrow(/settle in CLP cash/i)
    // accepts real cash currencies
    expect(assertCashCurrency('CLP', 'account')).toBe('CLP')
    expect(assertCashCurrency('MXN', 'settlement leg')).toBe('MXN')
  })

  it('assertCashCurrency rejects an unknown currency too', () => {
    expect(() => assertCashCurrency('BTC')).toThrow()
  })
})
