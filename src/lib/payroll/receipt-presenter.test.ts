/**
 * TASK-758 — Tests for the canonical receipt presenter.
 *
 * Matrix: 4 regimes × {idle, factor, manual_override, excluded} = 16 base scenarios
 * + edge cases (legacy fallback detectors, contractTypeSnapshot=null).
 */

import { describe, expect, it } from 'vitest'

import type { EntryAdjustmentBreakdown } from './adjustments/breakdown'

import {
  buildReceiptPresentation,
  groupEntriesByRegime,
  RECEIPT_REGIME_BADGES,
  RECEIPT_REGIME_DISPLAY_ORDER,
  resolveReceiptRegime,
  type ReceiptPresenterEntry
} from './receipt-presenter'

// ──────────────────────────────────────────────────────────────────────
// Fixture builders
// ──────────────────────────────────────────────────────────────────────

const baseEntry = (overrides: Partial<ReceiptPresenterEntry> = {}): ReceiptPresenterEntry => ({
  payRegime: 'chile',
  contractTypeSnapshot: 'indefinido',
  payrollVia: 'internal',
  currency: 'CLP',
  memberName: 'Test Member',
  memberEmail: 'test@efeonce.org',
  baseSalary: 1_800_000,
  remoteAllowance: 80_000,
  fixedBonusAmount: 0,
  bonusOtdAmount: 120_000,
  bonusRpaAmount: 80_000,
  grossTotal: 2_080_000,
  netTotal: 1_700_000,
  kpiOtdPercent: 95,
  kpiRpaAvg: 4.2,
  bonusOtdProrationFactor: 1,
  bonusRpaProrationFactor: 1,
  workingDaysInPeriod: 22,
  daysPresent: 22,
  daysAbsent: 0,
  daysOnLeave: 0,
  daysOnUnpaidLeave: 0,
  chileAfpName: 'Habitat',
  chileAfpRate: 0.1127,
  chileAfpAmount: 234_416,
  chileAfpCotizacionAmount: 208_000,
  chileAfpComisionAmount: 26_416,
  chileHealthSystem: 'Fonasa',
  chileHealthAmount: 145_600,
  chileHealthObligatoriaAmount: 145_600,
  chileHealthVoluntariaAmount: 0,
  chileUnemploymentRate: 0.006,
  chileUnemploymentAmount: 12_480,
  chileTaxAmount: 35_000,
  chileApvAmount: 0,
  chileTotalDeductions: 427_496,
  chileGratificacionLegalAmount: 209_396,
  periodDate: '2026-04-01',
  ...overrides
})

const honorariosEntry = (overrides: Partial<ReceiptPresenterEntry> = {}): ReceiptPresenterEntry =>
  baseEntry({
    contractTypeSnapshot: 'honorarios',
    remoteAllowance: 0,
    bonusOtdAmount: 0,
    bonusRpaAmount: 0,
    chileAfpName: null,
    chileAfpRate: null,
    chileAfpAmount: null,
    chileAfpCotizacionAmount: null,
    chileAfpComisionAmount: null,
    chileHealthSystem: null,
    chileHealthAmount: null,
    chileHealthObligatoriaAmount: null,
    chileHealthVoluntariaAmount: null,
    chileUnemploymentRate: null,
    chileUnemploymentAmount: null,
    chileTaxAmount: null,
    chileApvAmount: null,
    chileGratificacionLegalAmount: null,
    workingDaysInPeriod: null,
    daysPresent: null,
    daysAbsent: null,
    daysOnLeave: null,
    daysOnUnpaidLeave: null,
    grossTotal: 1_700_000,
    netTotal: 1_440_750,
    siiRetentionRate: 0.1525,
    siiRetentionAmount: 259_250,
    chileTotalDeductions: 259_250,
    fixedBonusAmount: 200_000,
    fixedBonusLabel: 'Liderazgo Q1',
    baseSalary: 1_500_000,
    ...overrides
  })

const deelEntry = (overrides: Partial<ReceiptPresenterEntry> = {}): ReceiptPresenterEntry =>
  baseEntry({
    contractTypeSnapshot: 'contractor',
    payRegime: 'international',
    payrollVia: 'deel',
    currency: 'USD',
    deelContractId: 'deel-cnt-7c4a-9f12',
    baseSalary: 3200,
    remoteAllowance: 100,
    bonusOtdAmount: 200,
    bonusRpaAmount: 150,
    grossTotal: 3650,
    netTotal: 3650,
    chileAfpName: null,
    chileAfpRate: null,
    chileAfpAmount: null,
    chileAfpCotizacionAmount: null,
    chileAfpComisionAmount: null,
    chileHealthSystem: null,
    chileHealthAmount: null,
    chileHealthObligatoriaAmount: null,
    chileHealthVoluntariaAmount: null,
    chileUnemploymentRate: null,
    chileUnemploymentAmount: null,
    chileTaxAmount: null,
    chileApvAmount: null,
    chileTotalDeductions: 0,
    chileGratificacionLegalAmount: null,
    workingDaysInPeriod: null,
    ...overrides
  })

const internationalInternalEntry = (
  overrides: Partial<ReceiptPresenterEntry> = {}
): ReceiptPresenterEntry =>
  baseEntry({
    contractTypeSnapshot: null,
    payRegime: 'international',
    payrollVia: 'internal',
    currency: 'USD',
    baseSalary: 2800,
    remoteAllowance: 100,
    bonusOtdAmount: 180,
    bonusRpaAmount: 120,
    grossTotal: 3200,
    netTotal: 3200,
    chileAfpName: null,
    chileAfpRate: null,
    chileAfpAmount: null,
    chileHealthSystem: null,
    chileHealthAmount: null,
    chileUnemploymentRate: null,
    chileUnemploymentAmount: null,
    chileTaxAmount: null,
    chileTotalDeductions: 0,
    chileGratificacionLegalAmount: null,
    workingDaysInPeriod: null,
    ...overrides
  })

const factorBreakdown = (factor: number): EntryAdjustmentBreakdown => ({
  hasActiveAdjustments: true,
  excluded: null,
  factorApplied: factor,
  fixedDeductions: [],
  manualOverride: null,
  totalFixedDeductionAmount: 0,
  totalActiveAdjustments: 1
})

const overrideBreakdown = (note = 'Ajuste retroactivo Q1'): EntryAdjustmentBreakdown => ({
  hasActiveAdjustments: true,
  excluded: null,
  factorApplied: 1,
  fixedDeductions: [],
  manualOverride: {
    adjustmentId: 'adj-override-1',
    netAmount: 1_500_000,
    currency: 'CLP',
    reasonCode: 'manual_correction' as never,
    reasonLabel: 'Corrección manual',
    reasonNote: note,
    requestedBy: 'payroll@efeonce.org',
    requestedAt: '2026-04-30T12:00:00Z'
  },
  totalFixedDeductionAmount: 0,
  totalActiveAdjustments: 1
})

const excludedBreakdown = (): EntryAdjustmentBreakdown => ({
  hasActiveAdjustments: true,
  excluded: {
    adjustmentId: 'adj-excluded-1',
    reasonCode: 'medical_leave' as never,
    reasonLabel: 'Licencia médica completa del período',
    reasonNote:
      'El colaborador no acumuló días imponibles en el período. Cobertura previsional via subsidio.',
    requestedBy: 'hr@efeonce.org',
    requestedAt: '2026-04-15T09:00:00Z'
  },
  factorApplied: 1,
  fixedDeductions: [],
  manualOverride: null,
  totalFixedDeductionAmount: 0,
  totalActiveAdjustments: 1
})

// ──────────────────────────────────────────────────────────────────────
// Regime detection
// ──────────────────────────────────────────────────────────────────────

describe('resolveReceiptRegime', () => {
  it('detects chile_dependent from contractTypeSnapshot=indefinido', () => {
    expect(resolveReceiptRegime(baseEntry())).toBe('chile_dependent')
  })

  it('detects chile_dependent from contractTypeSnapshot=plazo_fijo', () => {
    expect(resolveReceiptRegime(baseEntry({ contractTypeSnapshot: 'plazo_fijo' }))).toBe(
      'chile_dependent'
    )
  })

  it('detects honorarios from contractTypeSnapshot=honorarios', () => {
    expect(resolveReceiptRegime(honorariosEntry())).toBe('honorarios')
  })

  it('detects international_deel from contractTypeSnapshot=contractor', () => {
    expect(resolveReceiptRegime(deelEntry())).toBe('international_deel')
  })

  it('detects international_deel from contractTypeSnapshot=eor', () => {
    expect(resolveReceiptRegime(deelEntry({ contractTypeSnapshot: 'eor' }))).toBe(
      'international_deel'
    )
  })

  it('detects international_internal when payRegime=international and no Deel marker', () => {
    expect(resolveReceiptRegime(internationalInternalEntry())).toBe('international_internal')
  })

  // Legacy fallbacks
  it('LEGACY: detects honorarios from siiRetentionAmount > 0 when contractTypeSnapshot is null', () => {
    expect(
      resolveReceiptRegime({
        contractTypeSnapshot: null,
        payRegime: 'chile',
        payrollVia: 'internal',
        siiRetentionAmount: 100_000
      })
    ).toBe('honorarios')
  })

  it('LEGACY: detects international_deel from payrollVia=deel when contractTypeSnapshot is null', () => {
    expect(
      resolveReceiptRegime({
        contractTypeSnapshot: null,
        payRegime: 'international',
        payrollVia: 'deel',
        siiRetentionAmount: 0
      })
    ).toBe('international_deel')
  })

  it('LEGACY: defaults to chile_dependent when nothing else matches', () => {
    expect(
      resolveReceiptRegime({
        contractTypeSnapshot: null,
        payRegime: 'chile',
        payrollVia: 'internal',
        siiRetentionAmount: 0
      })
    ).toBe('chile_dependent')
  })
})

describe('groupEntriesByRegime', () => {
  it('groups entries preserving canonical display order', () => {
    const entries = [
      deelEntry({ memberName: 'Daniela' }),
      baseEntry({ memberName: 'Valentina' }),
      honorariosEntry({ memberName: 'Humberly' }),
      internationalInternalEntry({ memberName: 'Andrés' }),
      baseEntry({ memberName: 'César' })
    ]

    const groups = groupEntriesByRegime(entries)

    expect(groups.chile_dependent).toHaveLength(2)
    expect(groups.honorarios).toHaveLength(1)
    expect(groups.international_deel).toHaveLength(1)
    expect(groups.international_internal).toHaveLength(1)
    expect(Object.keys(groups)).toEqual(['chile_dependent', 'honorarios', 'international_deel', 'international_internal'])
  })

  it('returns empty arrays for missing regimes', () => {
    const groups = groupEntriesByRegime([baseEntry(), baseEntry()])

    expect(groups.chile_dependent).toHaveLength(2)
    expect(groups.honorarios).toEqual([])
    expect(groups.international_deel).toEqual([])
    expect(groups.international_internal).toEqual([])
  })

  it('canonical order const matches the keys', () => {
    const groups = groupEntriesByRegime([])

    expect(Object.keys(groups)).toEqual([...RECEIPT_REGIME_DISPLAY_ORDER])
  })
})

// ──────────────────────────────────────────────────────────────────────
// Regime × adjustment matrix
// ──────────────────────────────────────────────────────────────────────

describe('buildReceiptPresentation — chile_dependent', () => {
  it('idle: renders Descuentos legales with all 4 statutory rows', () => {
    const p = buildReceiptPresentation(baseEntry())

    expect(p.regime).toBe('chile_dependent')
    expect(p.isExcluded).toBe(false)
    expect(p.deductionSection?.title).toBe('Descuentos legales')
    expect(p.deductionSection?.totalLabel).toBe('Total descuentos')

    const rowKeys = p.deductionSection?.rows.map(r => r.key) ?? []

    expect(rowKeys).toContain('afp-total')
    expect(rowKeys).toContain('afp-cotizacion')
    expect(rowKeys).toContain('afp-comision')
    expect(rowKeys).toContain('salud-obligatoria')
    expect(rowKeys).toContain('cesantia')
    expect(rowKeys).toContain('iusc')
    expect(p.infoBlock).toBeNull()
  })

  it('renders gratificación legal in haberes when chileGratificacionLegalAmount > 0', () => {
    const p = buildReceiptPresentation(baseEntry())

    expect(p.haberesRows.find(r => r.key === 'gratification')).toBeDefined()
  })

  it('omits gratificación legal when amount is 0', () => {
    const p = buildReceiptPresentation(baseEntry({ chileGratificacionLegalAmount: 0 }))

    expect(p.haberesRows.find(r => r.key === 'gratification')).toBeUndefined()
  })

  it('renders salud split obligatoria + voluntaria when both are populated and voluntaria > 0', () => {
    const p = buildReceiptPresentation(
      baseEntry({
        chileHealthObligatoriaAmount: 145_600,
        chileHealthVoluntariaAmount: 45_000,
        chileHealthAmount: 190_600
      })
    )

    const keys = p.deductionSection?.rows.map(r => r.key) ?? []

    expect(keys).toContain('salud-obligatoria')
    expect(keys).toContain('salud-voluntaria')
    expect(keys).not.toContain('salud')
  })

  it('renders APV row when chileApvAmount > 0', () => {
    const p = buildReceiptPresentation(baseEntry({ chileApvAmount: 50_000 }))

    expect(p.deductionSection?.rows.find(r => r.key === 'apv')).toBeDefined()
  })

  it('factor: renders adjustments banner with bruto efectivo warning', () => {
    const p = buildReceiptPresentation(baseEntry(), factorBreakdown(0.75))

    expect(p.adjustmentsBanner?.variant).toBe('warning')
    expect(p.adjustmentsBanner?.title).toBe('Bruto efectivo aplicado')
    expect(p.adjustmentsBanner?.body).toContain('75%')
    // Chile dep specific copy
    expect(p.adjustmentsBanner?.body).toContain('cotizaciones')
  })

  it('manual override: renders override block + footnote in hero', () => {
    const p = buildReceiptPresentation(
      baseEntry({ manualOverride: true, manualOverrideNote: 'Ajuste retroactivo' }),
      overrideBreakdown('Ajuste retroactivo')
    )

    expect(p.manualOverrideBlock?.variant).toBe('warning')
    expect(p.manualOverrideBlock?.title).toContain('Override manual de neto')
    expect(p.hero.footnote).toContain('Ajuste retroactivo')
  })

  it('attendance section visible when workingDaysInPeriod is set', () => {
    const p = buildReceiptPresentation(baseEntry())

    expect(p.attendanceRows).toHaveLength(5)
  })
})

describe('buildReceiptPresentation — honorarios', () => {
  it('idle: renders Retención honorarios block, NOT Descuentos legales', () => {
    const p = buildReceiptPresentation(honorariosEntry())

    expect(p.regime).toBe('honorarios')
    expect(p.deductionSection?.title).toBe('Retención honorarios')
    expect(p.deductionSection?.totalLabel).toBe('Total retención')

    const keys = p.deductionSection?.rows.map(r => r.key) ?? []

    expect(keys).toContain('sii-rate')
    expect(keys).toContain('sii-retention')

    // ANTI-REGRESSION: NEVER renders Chile dependent rows
    expect(keys).not.toContain('afp-total')
    expect(keys).not.toContain('salud')
    expect(keys).not.toContain('salud-obligatoria')
    expect(keys).not.toContain('cesantia')
    expect(keys).not.toContain('iusc')
    expect(keys).not.toContain('apv')
  })

  it('renders the canonical Boleta de honorarios infoBlock', () => {
    const p = buildReceiptPresentation(honorariosEntry())

    expect(p.infoBlock?.variant).toBe('info')
    expect(p.infoBlock?.title).toBe('Boleta de honorarios Chile')
    expect(p.infoBlock?.body).toContain('Art. 74 N°2 LIR')
    expect(p.infoBlock?.body).toContain('15.25%')
  })

  it('omits filas-fantasma: no teletrabajo, colación, movilización rows', () => {
    const p = buildReceiptPresentation(honorariosEntry())
    const keys = p.haberesRows.map(r => r.key)

    expect(keys).not.toContain('remote')
    expect(keys).not.toContain('colacion')
    expect(keys).not.toContain('movilizacion')
  })

  it('omits filas-fantasma: no Bono OTD/RpA rows when both are 0', () => {
    const p = buildReceiptPresentation(honorariosEntry())
    const keys = p.haberesRows.map(r => r.key)

    expect(keys).not.toContain('bono-otd')
    expect(keys).not.toContain('bono-rpa')
  })

  it('renders Bono OTD when amount > 0 (honorarios with KPI bonus)', () => {
    const p = buildReceiptPresentation(honorariosEntry({ bonusOtdAmount: 50_000 }))
    const keys = p.haberesRows.map(r => r.key)

    expect(keys).toContain('bono-otd')
    expect(keys).not.toContain('bono-rpa')
  })

  it('renders Bono fijo when amount > 0', () => {
    const p = buildReceiptPresentation(honorariosEntry())
    const keys = p.haberesRows.map(r => r.key)

    expect(keys).toContain('fixed-bonus')
  })

  it('factor 0.5: adjustments banner with honorarios-specific copy', () => {
    const p = buildReceiptPresentation(honorariosEntry(), factorBreakdown(0.5))

    expect(p.adjustmentsBanner?.body).toContain('50%')
    // Honorarios specific
    expect(p.adjustmentsBanner?.body).toContain('retención SII')
    expect(p.adjustmentsBanner?.body).toContain('bruto efectivo')
  })

  it('attendance section is empty (honorarios skips attendance)', () => {
    const p = buildReceiptPresentation(honorariosEntry())

    expect(p.attendanceRows).toEqual([])
  })

  it('header: contract label "Honorarios" + Tasa SII field', () => {
    const p = buildReceiptPresentation(honorariosEntry())

    expect(p.contractTypeLabel).toBe('Honorarios')
    expect(p.employeeFields[3].label).toBe('Tasa SII 2026')
    expect(p.employeeFields[3].value).toBe('15.25%')
  })
})

describe('buildReceiptPresentation — international_deel', () => {
  it('idle: NO deduction section, info block "Pago administrado por Deel"', () => {
    const p = buildReceiptPresentation(deelEntry())

    expect(p.regime).toBe('international_deel')
    expect(p.deductionSection).toBeNull()
    expect(p.infoBlock?.title).toBe('Pago administrado por Deel')
    expect(p.infoBlock?.body).toContain('Deel emite el recibo legal')
    expect(p.infoBlock?.meta).toBe('Contrato Deel: deel-cnt-7c4a-9f12')
  })

  it('infoBlock omits meta line when deelContractId is null', () => {
    const p = buildReceiptPresentation(deelEntry({ deelContractId: null }))

    expect(p.infoBlock?.meta).toBeUndefined()
  })

  it('hero: label "Monto bruto registrado" with footnote', () => {
    const p = buildReceiptPresentation(deelEntry())

    expect(p.hero.variant).toBe('primary')
    expect(p.hero.label).toBe('Monto bruto registrado')
    expect(p.hero.footnote).toContain('Deel')
  })

  it('header: contract label "Contractor (Deel)" + Empleador legal field', () => {
    const p = buildReceiptPresentation(deelEntry())

    expect(p.contractTypeLabel).toBe('Contractor (Deel)')
    expect(p.employeeFields[3].label).toBe('Empleador legal')
    expect(p.employeeFields[3].value).toBe('Deel Inc.')
  })

  it('omits Chile-only haberes (colación, movilización)', () => {
    const p = buildReceiptPresentation(deelEntry())
    const keys = p.haberesRows.map(r => r.key)

    expect(keys).not.toContain('colacion')
    expect(keys).not.toContain('movilizacion')
    expect(keys).not.toContain('gratification')
  })

  it('attendance section is empty', () => {
    const p = buildReceiptPresentation(deelEntry())

    expect(p.attendanceRows).toEqual([])
  })
})

describe('buildReceiptPresentation — international_internal', () => {
  it('idle: NO deduction section, info block "Régimen internacional"', () => {
    const p = buildReceiptPresentation(internationalInternalEntry())

    expect(p.regime).toBe('international_internal')
    expect(p.deductionSection).toBeNull()
    expect(p.infoBlock?.title).toBe('Régimen internacional')
    expect(p.infoBlock?.body).toContain('Sin descuentos previsionales Chile')
  })

  it('hero: label "Líquido a pagar" (NOT Monto bruto registrado)', () => {
    const p = buildReceiptPresentation(internationalInternalEntry())

    expect(p.hero.label).toBe('Líquido a pagar')
    expect(p.hero.footnote).toBeUndefined()
  })

  it('header: Jurisdicción field', () => {
    const p = buildReceiptPresentation(internationalInternalEntry())

    expect(p.employeeFields[3].label).toBe('Jurisdicción')
  })
})

// ──────────────────────────────────────────────────────────────────────
// Excluded edge case
// ──────────────────────────────────────────────────────────────────────

describe('buildReceiptPresentation — excluded (terminal state)', () => {
  it('excluded chile_dependent: hero degraded, deduction section null, error infoBlock', () => {
    const p = buildReceiptPresentation(baseEntry(), excludedBreakdown())

    expect(p.isExcluded).toBe(true)
    expect(p.deductionSection).toBeNull()
    expect(p.haberesRows).toEqual([])
    expect(p.attendanceRows).toEqual([])
    expect(p.infoBlock?.variant).toBe('error')
    expect(p.infoBlock?.title).toContain('Excluido de esta nómina')
    expect(p.hero.variant).toBe('degraded')
    expect(p.hero.label).toBe('Sin pago este período')
    expect(p.hero.amount).toContain('0')
  })

  it('excluded honorarios: also short-circuited', () => {
    const p = buildReceiptPresentation(honorariosEntry(), excludedBreakdown())

    expect(p.isExcluded).toBe(true)
    expect(p.deductionSection).toBeNull()
    expect(p.infoBlock?.variant).toBe('error')
  })

  it('excluded deel: also short-circuited (no Deel infoBlock when excluded)', () => {
    const p = buildReceiptPresentation(deelEntry(), excludedBreakdown())

    expect(p.isExcluded).toBe(true)
    expect(p.infoBlock?.title).toContain('Excluido')
    expect(p.hero.variant).toBe('degraded')
  })
})

// ──────────────────────────────────────────────────────────────────────
// Anti-regression: NEVER mix regime concerns
// ──────────────────────────────────────────────────────────────────────

describe('Anti-regression invariants', () => {
  it('HONORARIOS NEVER renders AFP/Salud/Cesantía/IUSC/APV rows', () => {
    const p = buildReceiptPresentation(honorariosEntry())
    const allLabels = (p.deductionSection?.rows ?? []).map(r => r.label.toLowerCase())

    for (const banned of ['afp', 'salud', 'cesant', 'impuesto único', 'apv']) {
      expect(allLabels.every(l => !l.includes(banned))).toBe(true)
    }
  })

  it('CHILE DEPENDENT NEVER renders Tasa SII / Retención honorarios rows', () => {
    const p = buildReceiptPresentation(baseEntry())
    const labels = (p.deductionSection?.rows ?? []).map(r => r.label.toLowerCase())

    expect(labels.every(l => !l.includes('tasa sii'))).toBe(true)
    expect(labels.every(l => !l.includes('retención honorarios'))).toBe(true)
  })

  it('DEEL NEVER renders Chile statutory rows', () => {
    const p = buildReceiptPresentation(deelEntry())

    expect(p.deductionSection).toBeNull()
  })

  it('chile_dependent with chileTotalDeductions === 0 does NOT confuse with international (hard edge case)', () => {
    const p = buildReceiptPresentation(baseEntry({ chileTotalDeductions: 0 }))

    expect(p.regime).toBe('chile_dependent')
    expect(p.deductionSection).not.toBeNull()
  })
})

// ──────────────────────────────────────────────────────────────────────
// Badges canonical contract
// ──────────────────────────────────────────────────────────────────────

describe('Badge tokens contract', () => {
  it('every regime exposes a badge with code/label/colors', () => {
    for (const regime of RECEIPT_REGIME_DISPLAY_ORDER) {
      const badge = RECEIPT_REGIME_BADGES[regime]

      expect(badge.code).toMatch(/^(CL-DEP|HON|DEEL|INT)$/)
      expect(badge.label).toBeTruthy()
      expect(badge.background).toMatch(/^#[0-9a-f]{6}$/i)
      expect(badge.foreground).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
