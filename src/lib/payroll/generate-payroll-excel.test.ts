/**
 * TASK-782 — Excel structural regression tests.
 *
 * Verifies generate-payroll-excel.ts produces the canonical workbook shape:
 * - Resumen sheet with mutually exclusive subtotals (NO mixed
 *   "Total descuentos Chile" anymore).
 * - Chile sheet with 2 internal sections (Chile dependiente + Honorarios)
 *   when both regimes are present.
 * - Internacional sheet with 2 internal sections (Deel + interno).
 * - Sheets are omitted when their regimes are empty.
 *
 * Tests work directly against `buildResumenSheet` / `buildChileSheet` /
 * `buildInternationalSheet` would be ideal, but those are private. So we
 * mock `getPayrollEntries` + `getActiveAdjustmentsForPeriod` + `getPayrollPeriod`
 * and assert on the resulting workbook.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'

import type { PayrollEntry, PayrollPeriod } from '@/types/payroll'

// ──────────────────────────────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/payroll/get-payroll-entries', () => ({
  getPayrollEntries: vi.fn()
}))

vi.mock('@/lib/payroll/get-payroll-periods', () => ({
  getPayrollPeriod: vi.fn()
}))

vi.mock('@/lib/payroll/adjustments/apply-adjustment', () => ({
  getActiveAdjustmentsForPeriod: vi.fn().mockResolvedValue([])
}))

import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { generatePayrollExcel } from './generate-payroll-excel'

// ──────────────────────────────────────────────────────────────────────
// Fixtures
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
  calculatedAt: '2026-04-30T00:00:00Z',
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-05-02T00:00:00Z',
  reopenedAt: null,
  approvedBy: null
} as unknown as PayrollPeriod

const baseChileDep = (): PayrollEntry => ({
  entryId: 'entry-cl-dep-1',
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
})

const baseHonorarios = (): PayrollEntry => ({
  ...baseChileDep(),
  entryId: 'entry-hon-1',
  memberName: 'Humberly Henríquez',
  memberEmail: 'humberly@efeonce.org',
  contractTypeSnapshot: 'honorarios',
  baseSalary: 1_500_000,
  remoteAllowance: 0,
  colacionAmount: 0,
  movilizacionAmount: 0,
  bonusOtdAmount: 0,
  bonusRpaAmount: 0,
  fixedBonusAmount: 200_000,
  fixedBonusLabel: 'Liderazgo Q1',
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
  chileTaxAmount: null,
  chileApvAmount: null,
  workingDaysInPeriod: null,
  daysPresent: null,
  daysAbsent: null,
  daysOnLeave: null,
  daysOnUnpaidLeave: null,
  siiRetentionRate: 0.1525,
  siiRetentionAmount: 259_250,
  chileTotalDeductions: 259_250,
  netTotalCalculated: 1_440_750,
  netTotal: 1_440_750
})

const baseDeel = (): PayrollEntry => ({
  ...baseChileDep(),
  entryId: 'entry-deel-1',
  memberName: 'Daniela Ferreira',
  memberEmail: 'daniela@efeonce.org',
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
  chileHealthSystem: null,
  chileHealthAmount: null,
  chileUnemploymentRate: null,
  chileUnemploymentAmount: null,
  chileTaxAmount: null,
  chileTotalDeductions: 0,
  chileGratificacionLegalAmount: null,
  workingDaysInPeriod: null
})

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

const loadWorkbook = async (entries: PayrollEntry[]): Promise<ExcelJS.Workbook> => {
  vi.mocked(getPayrollPeriod).mockResolvedValue(period)
  vi.mocked(getPayrollEntries).mockResolvedValue(entries)

  const buffer = await generatePayrollExcel(period.periodId)
  const wb = new ExcelJS.Workbook()

  // ExcelJS xlsx.load expects a Buffer; tsc complains about Buffer subtypes
  // on some Node versions. Cast preserves runtime correctness.
  await wb.xlsx.load(buffer as unknown as ArrayBuffer)

  return wb
}

const collectColumnA = (sheet: ExcelJS.Worksheet): string[] => {
  const out: string[] = []

  sheet.eachRow((row) => {
    out.push(String(row.getCell(1).value ?? ''))
  })

  return out
}

const collectColumnB = (sheet: ExcelJS.Worksheet): string[] => {
  const out: string[] = []

  sheet.eachRow((row) => {
    out.push(String(row.getCell(2).value ?? ''))
  })

  return out
}

// ──────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Excel — Resumen sheet (TASK-782 disaggregation)', () => {
  it('uses 4-regime per-counter rows + mutually exclusive subtotals', async () => {
    const wb = await loadWorkbook([baseChileDep(), baseHonorarios(), baseDeel()])
    const resumen = wb.getWorksheet('Resumen')

    expect(resumen).toBeDefined()
    const colA = collectColumnA(resumen!)

    // 4-regime counters
    expect(colA).toContain('# Chile dependiente (CL-DEP)')
    expect(colA).toContain('# Honorarios (HON)')
    expect(colA).toContain('# Internacional Deel (DEEL)')
    expect(colA).toContain('# Internacional interno (INT)')

    // Mutually exclusive subtotals
    expect(colA).toContain('Total descuentos previsionales CLP')
    expect(colA).toContain('Total retención SII honorarios CLP')

    // ANTI-REGRESSION: mixed legacy subtotal MUST NOT exist
    expect(colA).not.toContain('Total descuentos CLP')
  })
})

describe('Excel — Chile sheet (TASK-782)', () => {
  it('renders 2 internal sections with mutually exclusive subtotals when both regimes present', async () => {
    const wb = await loadWorkbook([baseChileDep(), baseHonorarios()])
    const chile = wb.getWorksheet('Chile')

    expect(chile).toBeDefined()
    const colA = collectColumnA(chile!)
    const colB = collectColumnB(chile!)

    // Headers row
    expect(colA[0]).toBe('#')

    // 2 section dividers
    const sectionRows = colA.filter(v => v.startsWith('▼ Sección'))

    expect(sectionRows).toHaveLength(2)
    expect(sectionRows[0]).toContain('Sección 1 · Chile dependiente (1 colaboradores)')
    expect(sectionRows[1]).toContain('Sección 2 · Honorarios (1 colaboradores)')

    // 2 mutually exclusive subtotal rows
    expect(colB).toContain('Total descuentos previsionales')
    expect(colB).toContain('Total retención SII honorarios')
  })

  it('omits the Chile sheet entirely when no chile_dependent + no honorarios entries', async () => {
    const wb = await loadWorkbook([baseDeel()])
    const chile = wb.getWorksheet('Chile')

    expect(chile).toBeUndefined()
  })

  it('renders only Section 1 when only chile_dependent entries present', async () => {
    const wb = await loadWorkbook([baseChileDep()])
    const chile = wb.getWorksheet('Chile')

    expect(chile).toBeDefined()
    const colA = collectColumnA(chile!)
    const sectionRows = colA.filter(v => v.startsWith('▼ Sección'))

    expect(sectionRows).toHaveLength(1)
    expect(sectionRows[0]).toContain('Chile dependiente')
  })

  it('renders only Section 2 when only honorarios entries present', async () => {
    const wb = await loadWorkbook([baseHonorarios()])
    const chile = wb.getWorksheet('Chile')

    expect(chile).toBeDefined()
    const colA = collectColumnA(chile!)
    const sectionRows = colA.filter(v => v.startsWith('▼ Sección'))

    expect(sectionRows).toHaveLength(1)
    expect(sectionRows[0]).toContain('Honorarios')
  })
})

describe('Excel — Internacional sheet (TASK-782)', () => {
  it('renders Deel section with deelContractId column populated', async () => {
    const wb = await loadWorkbook([baseDeel()])
    const intl = wb.getWorksheet('Internacional')

    expect(intl).toBeDefined()
    const colA = collectColumnA(intl!)
    const sectionRows = colA.filter(v => v.startsWith('▼ Sección'))

    expect(sectionRows).toHaveLength(1)
    expect(sectionRows[0]).toContain('Internacional Deel')

    // deelContractId visible in any cell
    let foundContractId = false

    intl!.eachRow(row => {
      row.eachCell(cell => {
        if (String(cell.value ?? '') === 'deel-cnt-7c4a-9f12') foundContractId = true
      })
    })

    expect(foundContractId).toBe(true)
  })

  it('omits the Internacional sheet entirely when only chile entries present', async () => {
    const wb = await loadWorkbook([baseChileDep(), baseHonorarios()])
    const intl = wb.getWorksheet('Internacional')

    expect(intl).toBeUndefined()
  })
})
