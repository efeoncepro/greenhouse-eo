import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PayrollEntry } from '@/types/payroll'

vi.mock('@/lib/db', () => ({
  withTransaction: vi.fn()
}))

vi.mock('@/lib/payroll/reopen-period', () => ({
  getActiveReopenAuditForPeriod: vi.fn()
}))

vi.mock('@/lib/payroll/postgres-store', () => ({
  pgUpsertPayrollEntry: vi.fn()
}))

import { withTransaction } from '@/lib/db'
import { getActiveReopenAuditForPeriod } from '@/lib/payroll/reopen-period'
import { pgUpsertPayrollEntry } from '@/lib/payroll/postgres-store'
import { supersedePayrollEntryOnRecalculate } from './supersede-entry'

const mockedWithTransaction = withTransaction as unknown as ReturnType<typeof vi.fn>
const mockedGetActiveReopenAudit = getActiveReopenAuditForPeriod as unknown as ReturnType<typeof vi.fn>
const mockedPgUpsert = pgUpsertPayrollEntry as unknown as ReturnType<typeof vi.fn>

// ────────────────────────────────────────────────────────────────────────────
// Minimal PayrollEntry factory for the tests. Only the fields that the
// supersede helper actually touches need to be populated — everything else
// is filled with defaults to satisfy the type.
// ────────────────────────────────────────────────────────────────────────────
const buildEntry = (overrides: Partial<PayrollEntry> = {}): PayrollEntry => ({
  entryId: 'entry-test-1',
  periodId: '2026-03',
  memberId: 'member-test',
  memberName: 'Test Member',
  memberEmail: 'test@example.com',
  memberAvatarUrl: null,
  compensationVersionId: 'comp-v1',
  payRegime: 'international',
  currency: 'USD',
  baseSalary: 1000,
  remoteAllowance: 0,
  colacionAmount: 0,
  movilizacionAmount: 0,
  fixedBonusLabel: null,
  fixedBonusAmount: 0,
  kpiOtdPercent: 80,
  kpiRpaAvg: 1.5,
  kpiOtdQualifies: true,
  kpiRpaQualifies: true,
  kpiTasksCompleted: 20,
  kpiDataSource: 'ico',
  bonusOtdAmount: 100,
  bonusRpaAmount: 75,
  bonusOtherAmount: 0,
  bonusOtherDescription: null,
  grossTotal: 1175,
  chileGratificacionLegalAmount: null,
  chileColacionAmount: null,
  chileMovilizacionAmount: null,
  bonusOtdMin: 0,
  bonusOtdMax: 175,
  bonusRpaMin: 0,
  bonusRpaMax: 75,
  chileAfpName: null,
  chileAfpRate: null,
  chileAfpAmount: null,
  chileAfpCotizacionAmount: null,
  chileAfpComisionAmount: null,
  chileHealthSystem: null,
  chileHealthAmount: null,
  chileHealthObligatoriaAmount: null,
  chileHealthVoluntariaAmount: null,
  chileEmployerSisAmount: null,
  chileEmployerCesantiaAmount: null,
  chileEmployerMutualAmount: null,
  chileEmployerTotalCost: null,
  chileUnemploymentRate: null,
  chileUnemploymentAmount: null,
  chileTaxableBase: null,
  chileTaxAmount: null,
  chileApvAmount: null,
  chileUfValue: null,
  chileTotalDeductions: null,
  netTotalCalculated: 1175,
  netTotalOverride: null,
  netTotal: 1175,
  manualOverride: false,
  manualOverrideNote: null,
  bonusOtdProrationFactor: null,
  bonusRpaProrationFactor: null,
  workingDaysInPeriod: 22,
  daysPresent: null,
  daysAbsent: null,
  daysOnLeave: null,
  daysOnUnpaidLeave: null,
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
  updatedAt: null,
  ...overrides
})

interface MockQueryCall {
  sql: string
  params: unknown[]
}

const buildMockClient = (
  onSelectActive: () => { entry_id: string; version: number; gross_total: number; net_total: number }
) => {
  const calls: MockQueryCall[] = []
  const upsertCalls: Array<{ entry: PayrollEntry; options?: Record<string, unknown> }> = []

  const client = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params })
      const trimmed = sql.replace(/\s+/g, ' ').trim()

      if (trimmed.startsWith('SELECT entry_id, version, gross_total, net_total')) {
        const row = onSelectActive()

        return { rows: [row] }
      }

      // UPDATE statements return an empty rowset — no rows are surfaced
      // back to the supersede helper.
      return { rows: [] }
    })
  }

  return { client, calls, upsertCalls }
}

beforeEach(() => {
  vi.clearAllMocks()

  // Default audit stub — used by most tests. Individual tests can override.
  mockedGetActiveReopenAudit.mockResolvedValue({
    audit_id: 'reopen-audit-test',
    period_id: '2026-03',
    reopened_by_user_id: 'user-test',
    reopened_at: new Date('2026-04-15T20:22:31.700Z'),
    reason: 'error_calculo',
    reason_detail: null,
    previred_declared_check: false,
    operational_month: '2026-03-01',
    previous_status: 'exported'
  })

  // Default withTransaction stub — throws so tests that forget to set up a
  // concrete mock fail loudly instead of silently returning undefined.
  // Each test replaces this via `mockedWithTransaction.mockImplementationOnce`.
  mockedWithTransaction.mockImplementation(async () => {
    throw new Error(
      'Test did not replace withTransaction mock with a concrete client — call mockedWithTransaction.mockImplementationOnce(...)'
    )
  })

  mockedPgUpsert.mockResolvedValue(undefined)
})

describe('supersedePayrollEntryOnRecalculate — TASK-409 / hotfix 2026-04-15', () => {
  it('throws 409 when no reopen audit exists for the period', async () => {
    mockedGetActiveReopenAudit.mockResolvedValueOnce(null)

    await expect(
      supersedePayrollEntryOnRecalculate({
        updatedEntry: buildEntry(),
        actorUserId: 'user-test'
      })
    ).rejects.toThrow(/no active reopen audit/)

    expect(mockedWithTransaction).not.toHaveBeenCalled()
  })

  it('first supersession (v1 → v2): deactivates v1, inserts v2, and back-links v1 → v2 in the correct order', async () => {
    const { client, calls } = buildMockClient(() => ({
      entry_id: 'entry-v1',
      version: 1,
      gross_total: 1000,
      net_total: 900
    }))

    mockedWithTransaction.mockImplementationOnce(async callback => callback(client))

    const result = await supersedePayrollEntryOnRecalculate({
      updatedEntry: buildEntry({
        entryId: 'entry-v1',
        grossTotal: 1175,
        netTotal: 1050
      }),
      actorUserId: 'user-test'
    })

    // Verify the ORDER of statements — this is the invariant the hotfix
    // protects. The critical rules:
    //   (1) the active-row lookup must come first
    //   (2) v1 must be deactivated BEFORE v2 is inserted (partial unique
    //       index), and the deactivation must NOT set superseded_by yet
    //       so a non-deferred FK would not trip
    //   (3) pgUpsertPayrollEntry creates v2
    //   (4) v1.superseded_by is populated AFTER v2 exists

    // Step 1 — the active row lookup
    expect(calls[0]?.sql).toContain('SELECT entry_id, version, gross_total, net_total')

    // Step 2 — deactivation without superseded_by
    const deactivateCall = calls[1]

    expect(deactivateCall?.sql).toContain('UPDATE greenhouse_payroll.payroll_entries')
    expect(deactivateCall?.sql).toContain('is_active = FALSE')
    expect(deactivateCall?.sql).not.toContain('superseded_by')
    expect(deactivateCall?.params).toEqual(['entry-v1'])

    // Step 3 — v2 insertion via pgUpsertPayrollEntry (happens between calls
    // 1 and the last UPDATE — the order matters relative to the client
    // statements). Verify the supersede options carry the delta relative
    // to v1's persisted values (not the payload passed in).
    expect(mockedPgUpsert).toHaveBeenCalledTimes(1)
    const upsertArgs = mockedPgUpsert.mock.calls[0]
    const entryForInsert = upsertArgs?.[0] as PayrollEntry
    const options = upsertArgs?.[1] as Record<string, unknown>

    expect(entryForInsert.entryId).not.toBe('entry-v1')
    expect(entryForInsert.entryId).toMatch(/^payroll-entry-/)
    expect(options.client).toBe(client)

    const supersede = options.supersede as Record<string, unknown>

    expect(supersede.version).toBe(2)
    expect(supersede.isActive).toBe(true)
    expect(supersede.reopenAuditId).toBe('reopen-audit-test')
    expect(supersede.previousEntryId).toBe('entry-v1')
    expect(supersede.previousGrossTotal).toBe(1000)
    expect(supersede.previousNetTotal).toBe(900)
    expect(supersede.deltaGross).toBe(175)
    expect(supersede.deltaNet).toBe(150)
    expect(supersede.auditReason).toBe('error_calculo')
    expect(supersede.operationalYear).toBe(2026)
    expect(supersede.operationalMonth).toBe(3)

    // Step 4 — the back-link UPDATE must be the LAST client.query call
    const backlinkCall = calls[calls.length - 1]

    expect(backlinkCall?.sql).toContain('UPDATE greenhouse_payroll.payroll_entries')
    expect(backlinkCall?.sql).toContain('superseded_by = $2')
    expect(backlinkCall?.params).toEqual(['entry-v1', entryForInsert.entryId])

    // Return value reflects the new v2 state
    expect(result.entryId).toBe(entryForInsert.entryId)
    expect(result.version).toBe(2)
    expect(result.deltaGross).toBe(175)
    expect(result.deltaNet).toBe(150)
  })

  it('second supersession (v2 already exists): updates v2 in place without touching v1', async () => {
    const { client, calls } = buildMockClient(() => ({
      entry_id: 'entry-v2',
      version: 2,
      gross_total: 1100,
      net_total: 990
    }))

    mockedWithTransaction.mockImplementationOnce(async callback => callback(client))

    const result = await supersedePayrollEntryOnRecalculate({
      updatedEntry: buildEntry({
        entryId: 'entry-v1',
        grossTotal: 1175,
        netTotal: 1050
      }),
      actorUserId: 'user-test'
    })

    // Case B: only the active-row SELECT should hit the client directly.
    // The actual update is delegated entirely to pgUpsertPayrollEntry in
    // supersede mode. No back-link UPDATE, no extra deactivation.
    expect(calls).toHaveLength(1)
    expect(calls[0]?.sql).toContain('SELECT entry_id, version, gross_total, net_total')

    expect(mockedPgUpsert).toHaveBeenCalledTimes(1)
    const upsertArgs = mockedPgUpsert.mock.calls[0]
    const entryForUpdate = upsertArgs?.[0] as PayrollEntry
    const options = upsertArgs?.[1] as Record<string, unknown>

    // The entry_id must be v2's (not v1's), so ON CONFLICT in the upsert
    // updates the existing v2 row in place rather than creating a v3.
    expect(entryForUpdate.entryId).toBe('entry-v2')

    const supersede = options.supersede as Record<string, unknown>

    // Delta is computed vs. v2's current values (1100 / 990), not v1's
    // (which was already captured by the previous supersession).
    expect(supersede.version).toBe(2)
    expect(supersede.previousEntryId).toBe('entry-v2')
    expect(supersede.previousGrossTotal).toBe(1100)
    expect(supersede.previousNetTotal).toBe(990)
    expect(supersede.deltaGross).toBeCloseTo(75, 5)
    expect(supersede.deltaNet).toBeCloseTo(60, 5)

    expect(result.entryId).toBe('entry-v2')
    expect(result.version).toBe(2)
  })

  it('coerces numeric snapshot values returned as strings by pg', async () => {
    // Postgres returns `numeric` columns as strings via node-postgres. The
    // toNumber helper must coerce them before the delta arithmetic, or the
    // deltaGross computation would produce NaN / string concatenation.
    // Intentionally strings — matches how pg surfaces numeric columns.
    const { client } = buildMockClient(() => ({
      entry_id: 'entry-v1',
      version: 1,
      gross_total: '1000.00' as unknown as number,
      net_total: '900.00' as unknown as number
    }))

    mockedWithTransaction.mockImplementationOnce(async callback => callback(client))

    const result = await supersedePayrollEntryOnRecalculate({
      updatedEntry: buildEntry({
        entryId: 'entry-v1',
        grossTotal: 1200,
        netTotal: 1080
      }),
      actorUserId: 'user-test'
    })

    expect(result.deltaGross).toBe(200)
    expect(result.deltaNet).toBe(180)

    const upsertArgs = mockedPgUpsert.mock.calls[0]
    const supersede = (upsertArgs?.[1] as Record<string, unknown>).supersede as Record<string, unknown>

    expect(supersede.previousGrossTotal).toBe(1000)
    expect(supersede.previousNetTotal).toBe(900)
  })

  it('rejects a call with an empty actorUserId', async () => {
    await expect(
      supersedePayrollEntryOnRecalculate({
        updatedEntry: buildEntry(),
        actorUserId: '   '
      })
    ).rejects.toThrow(/authenticated actor/i)

    expect(mockedWithTransaction).not.toHaveBeenCalled()
  })

  it('rejects a periodId that does not match YYYY-MM', async () => {
    mockedGetActiveReopenAudit.mockResolvedValueOnce({
      audit_id: 'reopen-audit-test',
      period_id: 'garbled',
      reopened_by_user_id: 'user-test',
      reopened_at: new Date(),
      reason: 'error_calculo',
      reason_detail: null,
      previred_declared_check: false,
      operational_month: '2026-03-01',
      previous_status: 'exported'
    })

    await expect(
      supersedePayrollEntryOnRecalculate({
        updatedEntry: buildEntry({ periodId: 'garbled' }),
        actorUserId: 'user-test'
      })
    ).rejects.toThrow(/Invalid periodId/)
  })
})
