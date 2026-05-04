/**
 * TASK-782 — PDF PeriodReportDocument structural regression tests.
 *
 * Verifies the canonical 4-regime PDF structure by parsing the rendered
 * PDF buffer and asserting key textual landmarks. Cannot snapshot the JSX
 * tree directly (renderToStream returns a binary stream), so we parse
 * with `pdf-parse` and assert on extracted text.
 *
 * NOTE: pdf-parse pulls heavy native deps. We assert only on landmarks
 * that the canonical contract guarantees (group dividers, subtotals,
 * column headers).
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PayrollEntry, PayrollPeriod } from '@/types/payroll'

vi.mock('@/lib/payroll/get-payroll-entries', () => ({
  getPayrollEntries: vi.fn(),
  getPayrollEntryById: vi.fn()
}))

vi.mock('@/lib/payroll/get-payroll-periods', () => ({
  getPayrollPeriod: vi.fn()
}))

vi.mock('@/lib/account-360/organization-identity', () => ({
  getOperatingEntityIdentity: vi.fn().mockResolvedValue({
    legalName: 'Efeonce Group SpA',
    taxId: '76.123.456-7',
    legalAddress: 'Av. Apoquindo 4500, Las Condes'
  })
}))

vi.mock('@/lib/payroll/adjustments/apply-adjustment', () => ({
  getAdjustmentsByEntry: vi.fn().mockResolvedValue([])
}))

import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { generatePayrollPeriodPdf } from './generate-payroll-pdf'

// Period fixture
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
  calculatedAt: '2026-04-30T00:00:00Z',
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-05-02T00:00:00Z',
  reopenedAt: null,
  approvedBy: null
} as unknown as PayrollPeriod

// Entry fixtures
const baseChileDep = (): PayrollEntry => ({
  entryId: 'cl-1',
  periodId: '2026-04',
  memberId: 'm1',
  memberName: 'Valentina Hoyos',
  memberEmail: 'val@efeonce.org',
  memberAvatarUrl: null,
  compensationVersionId: 'v1',
  payRegime: 'chile',
  contractTypeSnapshot: 'indefinido',
  payrollVia: 'internal',
  currency: 'CLP',
  baseSalary: 1_800_000,
  remoteAllowance: 80_000,
  colacionAmount: 0,
  movilizacionAmount: 0,
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
  chileColacionAmount: null,
  chileMovilizacionAmount: null,
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
})

const baseHonorarios = (): PayrollEntry => ({
  ...baseChileDep(),
  entryId: 'hon-1',
  memberName: 'Humberly Henríquez',
  contractTypeSnapshot: 'honorarios',
  baseSalary: 1_500_000,
  remoteAllowance: 0,
  bonusOtdAmount: 0,
  bonusRpaAmount: 0,
  fixedBonusAmount: 200_000,
  grossTotal: 1_700_000,
  chileGratificacionLegalAmount: null,
  chileAfpName: null,
  chileAfpAmount: null,
  chileHealthSystem: null,
  chileHealthAmount: null,
  chileUnemploymentAmount: null,
  chileTaxAmount: null,
  workingDaysInPeriod: null,
  siiRetentionRate: 0.1525,
  siiRetentionAmount: 259_250,
  chileTotalDeductions: 259_250,
  netTotal: 1_440_750
})

const baseDeel = (): PayrollEntry => ({
  ...baseChileDep(),
  entryId: 'deel-1',
  memberName: 'Daniela Ferreira',
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
  chileAfpAmount: null,
  chileHealthSystem: null,
  chileHealthAmount: null,
  chileUnemploymentAmount: null,
  chileTaxAmount: null,
  chileTotalDeductions: 0,
  chileGratificacionLegalAmount: null,
  workingDaysInPeriod: null
})

// pdf-parse extractor — load lib/pdf-parse.js directly to avoid the
// upstream bug where index.js opens a non-existent test fixture on first require.
const extractText = async (buffer: Buffer): Promise<string> => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
    buf: Buffer
  ) => Promise<{ text: string }>

  const result = await pdfParse(buffer)

  return result.text
}

describe('PDF PeriodReportDocument — TASK-782 disaggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPayrollPeriod).mockResolvedValue(period)
  })

  it('renders per-regime subtotals (mutually exclusive)', async () => {
    vi.mocked(getPayrollEntries).mockResolvedValue([
      baseChileDep(),
      baseHonorarios(),
      baseDeel()
    ])

    const buffer = await generatePayrollPeriodPdf(period.periodId)
    const text = await extractText(buffer)

    // Subtotal labels render literal (without letter-spacing styling).
    expect(text).toContain('Total Chile dependiente')
    expect(text).toContain('Total Honorarios')
    expect(text).toContain('Total Internacional Deel')

    // ANTI-REGRESSION: legacy "Total Chile" mixed subtotal must NOT exist
    // outside the canonical "Total Chile dependiente" prefix. The PDF
    // extractor preserves "Total Chile dependiente" — we just assert the
    // legacy short form does not appear with a CLP/$ amount immediately
    // after as a standalone token.
    expect(text).not.toMatch(/Total Chile\s+CLP/)
  })

  it('renders new column headers (10 columns canonical)', async () => {
    vi.mocked(getPayrollEntries).mockResolvedValue([baseChileDep()])
    const buffer = await generatePayrollPeriodPdf(period.periodId)
    const text = await extractText(buffer)

    // Headers render literal (no uppercase letter-spacing on this style).
    expect(text).toContain('Desc. previs.')
    expect(text).toContain('Retención SII')
  })

  it('renders 4-value Régimen badges in entry rows (CL-DEP / HON / DEEL)', async () => {
    vi.mocked(getPayrollEntries).mockResolvedValue([
      baseChileDep(),
      baseHonorarios(),
      baseDeel()
    ])
    const buffer = await generatePayrollPeriodPdf(period.periodId)
    const text = await extractText(buffer)

    // Badge tokens appear inline in entry rows (no letter-spacing applied
    // on the data row Régimen cell).
    expect(text).toMatch(/Valentina HoyosCL-DEP/)
    expect(text).toMatch(/Humberly Henr.*HON/)
    expect(text).toMatch(/Daniela FerreiraDEEL/)
  })

  it('omits a regime subtotal entirely when N=0', async () => {
    vi.mocked(getPayrollEntries).mockResolvedValue([baseChileDep()])
    const buffer = await generatePayrollPeriodPdf(period.periodId)
    const text = await extractText(buffer)

    expect(text).toContain('Total Chile dependiente')
    expect(text).not.toContain('Total Honorarios')
    expect(text).not.toContain('Total Internacional Deel')
    expect(text).not.toContain('Total Internacional interno')
  })

  it('renders summary strip BRUTO/NETO CLP separated from BRUTO USD when mixed', async () => {
    vi.mocked(getPayrollEntries).mockResolvedValue([
      baseChileDep(),
      baseDeel()
    ])
    const buffer = await generatePayrollPeriodPdf(period.periodId)
    const text = await extractText(buffer)

    // KPI labels are uppercase + letter-spaced in summary strip; assert
    // by stripping spaces and looking for the canonical token.
    const compact = text.replace(/\s+/g, '')

    expect(compact).toContain('BRUTOCLP')
    expect(compact).toContain('BRUTOUSD')
    // ANTI-REGRESSION: legacy mixed "Total Chile" not present in summary
    expect(compact).not.toContain('TotalChileCLP')
  })
})
