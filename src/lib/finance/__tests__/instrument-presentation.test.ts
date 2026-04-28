/**
 * TASK-714 — Instrument detail presentation resolver tests.
 *
 * Asserts:
 *   1. transactional_account profile preserves the historical drawer copy.
 *   2. credit_card profile inverts ledger gramatica → cardholder semantics
 *      (Disponible / Deuda / Cupo, Cargos vs Pagos/Abonos).
 *   3. computeCreditCardSemantics math (consumed clamp, available, utilization).
 *   4. shareholder_account profile uses accionista vocabulary.
 *   5. unknown category falls back to transactional.
 */
import { describe, expect, it } from 'vitest'

import {
  computeCreditCardSemantics,
  resolveInstrumentDetailPresentation,
  resolveInstrumentIcon
} from '@/lib/finance/instrument-presentation'

import type { TreasuryBankAccountOverview } from '@/lib/finance/account-balances'

const baseAccount: TreasuryBankAccountOverview = {
  accountId: 'test-account',
  accountName: 'Test',
  bankName: null,
  currency: 'CLP',
  instrumentCategory: 'bank_account',
  providerSlug: null,
  accountType: 'checking',
  openingBalance: 0,
  periodInflows: 0,
  periodOutflows: 0,
  closingBalance: 0,
  closingBalanceClp: null,
  fxRateUsed: null,
  fxGainLossClp: 0,
  fxGainLossRealizedClp: 0,
  fxGainLossTranslationClp: 0,
  transactionCount: 0,
  lastTransactionAt: null,
  isPeriodClosed: false,
  discrepancy: 0,
  reconciliationStatus: null,
  reconciliationPeriodId: null,
  creditLimit: null,
  metadata: null,
  drift: null,
  accountKind: 'asset',
  cardLastFour: null,
  cardNetwork: null
}

describe('resolveInstrumentDetailPresentation', () => {
  it('returns transactional_account profile for bank_account', () => {
    const profile = resolveInstrumentDetailPresentation({
      ...baseAccount,
      bankName: 'Santander',
      currency: 'CLP'
    })

    expect(profile.profileKey).toBe('transactional_account')
    expect(profile.drawerTitle).toContain('cuenta')
    expect(profile.kpis.map(k => k.title)).toEqual([
      'Saldo actual',
      'Ingresos del período',
      'Salidas del período'
    ])
    expect(profile.movements.directionLabels).toEqual({ incoming: 'Entrada', outgoing: 'Salida' })
    expect(profile.chart.inflowLabel).toBe('Ingresos')
    expect(profile.chart.outflowLabel).toBe('Salidas')
    expect(profile.contextBanner).toBeNull()
  })

  it('uses fintech-specific identity for fintech', () => {
    const profile = resolveInstrumentDetailPresentation({
      ...baseAccount,
      instrumentCategory: 'fintech',
      bankName: 'Mercado Pago'
    })

    expect(profile.profileKey).toBe('transactional_account')
    expect(profile.drawerTitle.toLowerCase()).toContain('fintech')
  })

  it('returns credit_card profile with inverted gramatica', () => {
    const profile = resolveInstrumentDetailPresentation({
      ...baseAccount,
      instrumentCategory: 'credit_card',
      accountKind: 'liability',
      cardLastFour: '2505',
      cardNetwork: 'mastercard',
      currency: 'CLP',
      creditLimit: 1700000,
      closingBalance: 850000
    })

    expect(profile.profileKey).toBe('credit_card')
    expect(profile.drawerTitle).toBe('Detalle de tarjeta')

    const kpiTitles = profile.kpis.map(k => k.title)

    expect(kpiTitles).toEqual(['Disponible', 'Deuda actual', 'Cupo total'])

    expect(profile.kpis[0].value).toBe(850000) // available = 1.7M - 850k
    expect(profile.kpis[1].value).toBe(850000) // consumed
    expect(profile.kpis[2].value).toBe(1700000) // creditLimit

    // Cardholder vocabulary, NOT ledger vocabulary
    expect(profile.movements.directionLabels.incoming).toBe('Pago / abono')
    expect(profile.movements.directionLabels.outgoing).toBe('Cargo')
    expect(profile.chart.inflowLabel).toBe('Pagos / abonos')
    expect(profile.chart.outflowLabel).toBe('Cargos')

    // Identity row exposes card details
    const labels = profile.identityFields.map(f => f.label)

    expect(labels).toContain('Tarjeta')
    expect(labels).toContain('Red')

    const tarjetaField = profile.identityFields.find(f => f.label === 'Tarjeta')

    expect(tarjetaField?.value).toBe('•••• 2505')

    const redField = profile.identityFields.find(f => f.label === 'Red')

    expect(redField?.value).toBe('Mastercard')
  })

  it('flags credit_card without limit with info banner', () => {
    const profile = resolveInstrumentDetailPresentation({
      ...baseAccount,
      instrumentCategory: 'credit_card',
      creditLimit: null,
      closingBalance: 100000
    })

    expect(profile.contextBanner?.tone).toBe('info')
    expect(profile.contextBanner?.text.toLowerCase()).toContain('cupo')

    // Disponible KPI = null when no limit declared
    const availableKpi = profile.kpis.find(k => k.key === 'available')

    expect(availableKpi?.value).toBeNull()
  })

  it('escalates utilizacion >= 80% to error color on Deuda actual KPI', () => {
    const profile = resolveInstrumentDetailPresentation({
      ...baseAccount,
      instrumentCategory: 'credit_card',
      creditLimit: 1000000,
      closingBalance: 850000
    })

    const consumedKpi = profile.kpis.find(k => k.key === 'consumed')

    expect(consumedKpi?.avatarColor).toBe('error')
    expect(consumedKpi?.subtitle).toContain('85%')
  })

  it('keeps utilizacion < 80% in warning tone', () => {
    const profile = resolveInstrumentDetailPresentation({
      ...baseAccount,
      instrumentCategory: 'credit_card',
      creditLimit: 1000000,
      closingBalance: 200000
    })

    const consumedKpi = profile.kpis.find(k => k.key === 'consumed')

    expect(consumedKpi?.avatarColor).toBe('warning')
  })

  it('returns processor_transit profile when category=payroll_processor and digest is null', () => {
    const profile = resolveInstrumentDetailPresentation({
      ...baseAccount,
      instrumentCategory: 'payroll_processor',
      accountName: 'Previred'
    }, null)

    expect(profile.profileKey).toBe('processor_transit')
    expect(profile.drawerTitle).toBe('Procesador Previred')
    expect(profile.drawerSubtitle.toLowerCase()).toContain('previsional')

    const titles = profile.kpis.map(k => k.title)

    expect(titles).toEqual(['Pagos del período', 'Monto procesado', 'Estado del desglose'])

    // No payments yet → all KPIs in their "no data" state
    expect(profile.kpis[0].value).toBe(0)
    expect(profile.kpis[1].value).toBe(0)
    expect(profile.kpis[2].value).toBeNull()

    // Banner says it's a processor, not an empty account
    expect(profile.contextBanner?.tone).toBe('info')
    expect(profile.contextBanner?.text.toLowerCase()).toContain('procesador')
    expect(profile.contextBanner?.text.toLowerCase()).toContain('cash')
  })

  it('processor_transit pending_componentization renders warning banner', () => {
    const profile = resolveInstrumentDetailPresentation({
      ...baseAccount,
      instrumentCategory: 'payroll_processor',
      accountName: 'Previred'
    }, {
      accountId: 'previred-clp',
      accountName: 'Previred',
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      paymentCount: 1,
      processedAmount: 276223,
      processedAmountClp: 276223,
      payerAccounts: [{ accountId: 'santander-clp', accountName: 'Santander', amount: 276223 }],
      componentizationStatus: 'pending_componentization',
      payments: []
    })

    expect(profile.contextBanner?.tone).toBe('warning')
    expect(profile.contextBanner?.text.toLowerCase()).toContain('santander')

    const componentizationKpi = profile.kpis.find(k => k.key === 'componentizationStatus')

    expect(componentizationKpi?.subtitle).toBe('Desglose pendiente')
    expect(componentizationKpi?.avatarColor).toBe('warning')
  })

  it('processor_transit componentized renders confirmation banner', () => {
    const profile = resolveInstrumentDetailPresentation({
      ...baseAccount,
      instrumentCategory: 'payroll_processor',
      accountName: 'Previred'
    }, {
      accountId: 'previred-clp',
      accountName: 'Previred',
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
      paymentCount: 1,
      processedAmount: 276223,
      processedAmountClp: 276223,
      payerAccounts: [{ accountId: 'santander-clp', accountName: 'Santander', amount: 276223 }],
      componentizationStatus: 'componentized',
      payments: []
    })

    expect(profile.contextBanner?.tone).toBe('info')
    const componentizationKpi = profile.kpis.find(k => k.key === 'componentizationStatus')

    expect(componentizationKpi?.subtitle).toBe('Desglose completo')
    expect(componentizationKpi?.avatarColor).toBe('success')
  })

  it('returns shareholder_account profile with accionista vocabulary', () => {
    const profile = resolveInstrumentDetailPresentation({
      ...baseAccount,
      instrumentCategory: 'shareholder_account',
      accountKind: 'liability',
      accountName: 'CCA Julio Reyes'
    })

    expect(profile.profileKey).toBe('shareholder_account')
    expect(profile.drawerTitle).toContain('accionista')
    expect(profile.movements.directionLabels.incoming).toBe('Aporte')
    expect(profile.movements.directionLabels.outgoing).toBe('Reembolso')
  })

  it('falls back to transactional for unknown category', () => {
    const profile = resolveInstrumentDetailPresentation({
      ...baseAccount,
      instrumentCategory: 'mystery_kind' as unknown as null
    })

    expect(profile.profileKey).toBe('transactional_account')
  })
})

describe('computeCreditCardSemantics', () => {
  it('clamps negative closing to consumed=0 (overpayment scenario)', () => {
    const semantics = computeCreditCardSemantics({
      closingBalance: -50000,
      creditLimit: 1000000,
      metadata: null
    })

    expect(semantics.consumed).toBe(0)
    expect(semantics.available).toBe(1000000)
    expect(semantics.utilizationPct).toBe(0)
  })

  it('falls back to metadata.creditLimit when account.creditLimit is null', () => {
    const semantics = computeCreditCardSemantics({
      closingBalance: 100000,
      creditLimit: null,
      metadata: { creditLimit: 500000 }
    })

    expect(semantics.creditLimit).toBe(500000)
    expect(semantics.available).toBe(400000)
  })

  it('returns null available + utilization when no limit declared anywhere', () => {
    const semantics = computeCreditCardSemantics({
      closingBalance: 100000,
      creditLimit: null,
      metadata: null
    })

    expect(semantics.creditLimit).toBeNull()
    expect(semantics.available).toBeNull()
    expect(semantics.utilizationPct).toBeNull()
    expect(semantics.consumed).toBe(100000)
  })

  it('rounds utilization to 1 decimal', () => {
    const semantics = computeCreditCardSemantics({
      closingBalance: 333333,
      creditLimit: 1000000,
      metadata: null
    })

    expect(semantics.utilizationPct).toBe(33.3)
  })
})

describe('resolveInstrumentIcon', () => {
  it('falls through to default when category missing', () => {
    expect(resolveInstrumentIcon({ instrumentCategory: null })).toBe('tabler-building-bank')
  })

  it('returns category-specific icon when known', () => {
    const icon = resolveInstrumentIcon({ instrumentCategory: 'credit_card' })

    expect(icon).toBe('tabler-credit-card')
  })
})
