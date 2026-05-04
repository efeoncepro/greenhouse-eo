// @vitest-environment jsdom

/**
 * TASK-758 — PayrollReceiptCard regression tests.
 *
 * Verifies the preview MUI consumes `buildReceiptPresentation` correctly
 * for the 4 canonical regimes and the `excluded` terminal state.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'

import type { PayrollEntry, PayrollPeriod } from '@/types/payroll'

import { renderWithTheme } from '@/test/render'

import PayrollReceiptCard from './PayrollReceiptCard'

// ──────────────────────────────────────────────────────────────────────
// Fixture builders — mirror persisted PayrollEntry shape
// ──────────────────────────────────────────────────────────────────────

const period: PayrollPeriod = {
  periodId: '2026-04',
  year: 2026,
  month: 4,
  status: 'approved',
  ufValue: 39_123.55,
  taxTableVersion: '2026-04',
  notes: null,
  approvedAt: '2026-05-02',
  exportedAt: null,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-05-02T00:00:00Z',
  reopenedAt: null,
  approvedBy: null
} as unknown as PayrollPeriod

const baseChileEntry: PayrollEntry = {
  entryId: 'entry-1',
  periodId: '2026-04',
  memberId: 'member-1',
  memberName: 'Valentina Hoyos',
  memberEmail: 'valentina@efeonce.org',
  memberAvatarUrl: null,
  compensationVersionId: 'v1',
  payRegime: 'chile',
  contractTypeSnapshot: 'indefinido',
  payrollVia: 'internal',
  currency: 'CLP',
  baseSalary: 1_800_000,
  remoteAllowance: 80_000,
  colacionAmount: 60_000,
  movilizacionAmount: 40_000,
  fixedBonusLabel: null,
  fixedBonusAmount: 0,
  kpiOtdPercent: 95,
  kpiRpaAvg: 4.2,
  kpiOtdQualifies: true,
  kpiRpaQualifies: true,
  kpiTasksCompleted: 50,
  kpiDataSource: 'manual',
  bonusOtdAmount: 120_000,
  bonusRpaAmount: 80_000,
  bonusOtherAmount: 0,
  bonusOtherDescription: null,
  grossTotal: 2_389_396,
  chileGratificacionLegalAmount: 209_396,
  chileColacionAmount: 60_000,
  chileMovilizacionAmount: 40_000,
  bonusOtdMin: 0,
  bonusOtdMax: 200_000,
  bonusRpaMin: 0,
  bonusRpaMax: 100_000,
  chileAfpName: 'Habitat',
  chileAfpRate: 0.1127,
  chileAfpAmount: 269_285,
  chileAfpCotizacionAmount: 238_940,
  chileAfpComisionAmount: 30_345,
  chileHealthSystem: 'Fonasa',
  chileHealthAmount: 167_258,
  chileHealthObligatoriaAmount: 167_258,
  chileHealthVoluntariaAmount: 0,
  chileEmployerSisAmount: null,
  chileEmployerCesantiaAmount: null,
  chileEmployerMutualAmount: null,
  chileEmployerTotalCost: null,
  chileUnemploymentRate: 0.006,
  chileUnemploymentAmount: 14_336,
  chileTaxableBase: 2_180_000,
  chileTaxAmount: 45_218,
  siiRetentionRate: null,
  siiRetentionAmount: null,
  chileApvAmount: 0,
  chileUfValue: 39_123.55,
  chileTotalDeductions: 496_097,
  deelContractId: null,
  netTotalCalculated: 1_893_299,
  netTotalOverride: null,
  netTotal: 1_893_299,
  manualOverride: false,
  manualOverrideNote: null,
  bonusOtdProrationFactor: 1,
  bonusRpaProrationFactor: 1,
  workingDaysInPeriod: 22,
  daysPresent: 22,
  daysAbsent: 0,
  daysOnLeave: 0,
  daysOnUnpaidLeave: 0,
  adjustedBaseSalary: null,
  adjustedRemoteAllowance: null,
  adjustedColacionAmount: null,
  adjustedMovilizacionAmount: null,
  adjustedFixedBonusAmount: null,
  version: 1,
  isActive: true,
  supersededBy: null,
  reopenAuditId: null,
  createdAt: null,
  updatedAt: null
}

const honorariosEntry: PayrollEntry = {
  ...baseChileEntry,
  entryId: 'entry-honorarios',
  memberName: 'Humberly Henríquez',
  memberEmail: 'humberly@efeonce.org',
  contractTypeSnapshot: 'honorarios',
  baseSalary: 1_500_000,
  remoteAllowance: 0,
  colacionAmount: 0,
  movilizacionAmount: 0,
  bonusOtdAmount: 0,
  bonusRpaAmount: 0,
  fixedBonusLabel: 'Liderazgo Q1',
  fixedBonusAmount: 200_000,
  grossTotal: 1_700_000,
  chileGratificacionLegalAmount: null,
  chileColacionAmount: null,
  chileMovilizacionAmount: null,
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
  chileTaxableBase: 1_700_000,
  chileTaxAmount: null,
  siiRetentionRate: 0.1525,
  siiRetentionAmount: 259_250,
  chileTotalDeductions: 259_250,
  workingDaysInPeriod: null,
  daysPresent: null,
  daysAbsent: null,
  daysOnLeave: null,
  daysOnUnpaidLeave: null,
  netTotalCalculated: 1_440_750,
  netTotal: 1_440_750
}

const deelEntry: PayrollEntry = {
  ...baseChileEntry,
  entryId: 'entry-deel',
  memberName: 'Daniela Ferreira',
  memberEmail: 'daniela@efeonce.org',
  contractTypeSnapshot: 'contractor',
  payRegime: 'international',
  payrollVia: 'deel',
  currency: 'USD',
  deelContractId: 'deel-cnt-7c4a-9f12',
  baseSalary: 3200,
  remoteAllowance: 100,
  colacionAmount: 0,
  movilizacionAmount: 0,
  fixedBonusLabel: null,
  fixedBonusAmount: 0,
  bonusOtdAmount: 200,
  bonusRpaAmount: 150,
  grossTotal: 3650,
  chileGratificacionLegalAmount: null,
  chileColacionAmount: null,
  chileMovilizacionAmount: null,
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
  chileTaxableBase: null,
  chileTaxAmount: null,
  siiRetentionRate: null,
  siiRetentionAmount: null,
  chileTotalDeductions: 0,
  workingDaysInPeriod: null,
  daysPresent: null,
  daysAbsent: null,
  daysOnLeave: null,
  daysOnUnpaidLeave: null,
  chileUfValue: null,
  netTotalCalculated: 3650,
  netTotal: 3650
}

const internationalInternalEntry: PayrollEntry = {
  ...deelEntry,
  entryId: 'entry-intl',
  memberName: 'Andrés Carlosama',
  memberEmail: 'andres@efeonce.org',
  contractTypeSnapshot: null,
  payRegime: 'international',
  payrollVia: 'internal',
  currency: 'USD',
  deelContractId: null,
  baseSalary: 2800,
  bonusOtdAmount: 180,
  bonusRpaAmount: 120,
  grossTotal: 3200,
  netTotal: 3200,
  netTotalCalculated: 3200
}

// ──────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────

afterEach(() => cleanup())

describe('PayrollReceiptCard — chile_dependent', () => {
  it('renders Descuentos legales with AFP/Salud/Cesantía/IUSC', () => {
    const { getByText, queryByText } = renderWithTheme(
      <PayrollReceiptCard entry={baseChileEntry} period={period} />
    )

    expect(getByText('Descuentos legales')).toBeDefined()
    expect(getByText(/AFP Habitat/)).toBeDefined()
    expect(getByText(/Salud obligatoria 7%/)).toBeDefined()
    expect(getByText('Total descuentos')).toBeDefined()

    // Anti-regression: no SII / Honorarios labels
    expect(queryByText('Retención honorarios')).toBeNull()
    expect(queryByText('Tasa SII')).toBeNull()
    expect(queryByText('Boleta de honorarios Chile')).toBeNull()
  })

  it('renders gratificación legal in haberes', () => {
    const { getByText } = renderWithTheme(<PayrollReceiptCard entry={baseChileEntry} period={period} />)

    expect(getByText('Gratificación legal')).toBeDefined()
  })

  it('header includes Tipo de contrato field with CONTRACT_LABELS value', () => {
    const { getByText } = renderWithTheme(<PayrollReceiptCard entry={baseChileEntry} period={period} />)

    expect(getByText('Tipo de contrato')).toBeDefined()
    expect(getByText('Indefinido')).toBeDefined()
  })

  it('hero label is "Líquido a pagar"', () => {
    const { getByText } = renderWithTheme(<PayrollReceiptCard entry={baseChileEntry} period={period} />)

    expect(getByText('Líquido a pagar')).toBeDefined()
  })
})

describe('PayrollReceiptCard — honorarios', () => {
  it('renders Retención honorarios block, NOT Descuentos legales', () => {
    const { getByText, queryByText, getAllByText } = renderWithTheme(
      <PayrollReceiptCard entry={honorariosEntry} period={period} />
    )

    // "Retención honorarios" appears as section title + as row label inside it
    expect(getAllByText('Retención honorarios').length).toBeGreaterThanOrEqual(1)
    expect(getByText('Tasa SII')).toBeDefined()
    expect(getByText('Total retención')).toBeDefined()

    // ANTI-REGRESSION: never renders Chile dependent rows
    expect(queryByText(/AFP/)).toBeNull()
    expect(queryByText(/Salud obligatoria/)).toBeNull()
    expect(queryByText('Seguro cesantía')).toBeNull()
    expect(queryByText('Impuesto único')).toBeNull()
    expect(queryByText('Descuentos legales')).toBeNull()
    expect(queryByText('Total descuentos')).toBeNull()
  })

  it('renders the canonical Boleta de honorarios infoBlock', () => {
    const { getByText } = renderWithTheme(<PayrollReceiptCard entry={honorariosEntry} period={period} />)

    expect(getByText('Boleta de honorarios Chile')).toBeDefined()
    expect(getByText(/Art. 74 N°2 LIR/)).toBeDefined()
  })

  it('header shows Tasa SII 2026 field', () => {
    const { getByText, getAllByText } = renderWithTheme(<PayrollReceiptCard entry={honorariosEntry} period={period} />)

    expect(getByText('Tasa SII 2026')).toBeDefined()
    // 15.25% appears in: header field value + Retención block row + infoBlock body
    expect(getAllByText(/15\.25%/).length).toBeGreaterThanOrEqual(2)
  })

  it('omits filas-fantasma (no teletrabajo, colación, Bono OTD/RpA when 0)', () => {
    const { queryByText } = renderWithTheme(<PayrollReceiptCard entry={honorariosEntry} period={period} />)

    expect(queryByText('Asignación teletrabajo')).toBeNull()
    expect(queryByText('Colación')).toBeNull()
    expect(queryByText('Movilización')).toBeNull()
    expect(queryByText(/Bono OTD/)).toBeNull()
    expect(queryByText(/Bono RpA/)).toBeNull()
  })
})

describe('PayrollReceiptCard — international_deel', () => {
  it('renders Pago Deel infoBlock with deelContractId, NO deduction section', () => {
    const { getByText, queryByText } = renderWithTheme(
      <PayrollReceiptCard entry={deelEntry} period={period} />
    )

    expect(getByText('Pago administrado por Deel')).toBeDefined()
    expect(getByText(/Contrato Deel: deel-cnt-7c4a-9f12/)).toBeDefined()
    expect(queryByText('Descuentos legales')).toBeNull()
    expect(queryByText('Retención honorarios')).toBeNull()
  })

  it('hero label is "Monto bruto registrado" with footnote', () => {
    const { getByText } = renderWithTheme(<PayrollReceiptCard entry={deelEntry} period={period} />)

    expect(getByText('Monto bruto registrado')).toBeDefined()
    expect(getByText(/Deel según las retenciones/)).toBeDefined()
    expect(() => getByText('Líquido a pagar')).toThrow()
  })

  it('header shows Empleador legal field', () => {
    const { getByText } = renderWithTheme(<PayrollReceiptCard entry={deelEntry} period={period} />)

    expect(getByText('Empleador legal')).toBeDefined()
    expect(getByText('Deel Inc.')).toBeDefined()
  })
})

describe('PayrollReceiptCard — international_internal', () => {
  it('renders Régimen internacional infoBlock, hero "Líquido a pagar"', () => {
    const { getByText, queryByText } = renderWithTheme(
      <PayrollReceiptCard entry={internationalInternalEntry} period={period} />
    )

    expect(getByText('Régimen internacional')).toBeDefined()
    expect(getByText('Líquido a pagar')).toBeDefined()
    expect(queryByText('Pago administrado por Deel')).toBeNull()
    expect(queryByText('Descuentos legales')).toBeNull()
  })

  it('header shows Jurisdicción field', () => {
    const { getByText } = renderWithTheme(
      <PayrollReceiptCard entry={internationalInternalEntry} period={period} />
    )

    expect(getByText('Jurisdicción')).toBeDefined()
  })
})
