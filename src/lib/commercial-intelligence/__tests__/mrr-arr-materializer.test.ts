import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-462 — Tests for contract MRR/ARR materializer.
 *
 * Covers classifier edge cases (new, expansion, contraction, churn,
 * reactivation, unchanged), filter enforcement (only active retainers),
 * and chronological backfill.
 */

// ─────────────────────────────────────────────────────────────
// Hoisted mocks — must be declared before the unit under test.
// ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) =>
    mocks.runGreenhousePostgresQuery(...args)
}))

import {
  __testing,
  buildMrrArrSnapshotsForPeriod
} from '@/lib/commercial-intelligence/mrr-arr-materializer'

// ─────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────

interface ContractRowFixture {
  contract_id: string
  client_id: string | null
  organization_id: string | null
  space_id: string | null
  business_line_code: string | null
  commercial_model: string
  staffing_model: string
  status: string
  start_date: string
  end_date: string | null
  mrr_clp: number | null
}

interface PrevSnapshotFixture {
  contract_id: string
  mrr_clp: number
  movement_type:
    | 'new'
    | 'expansion'
    | 'contraction'
    | 'churn'
    | 'reactivation'
    | 'unchanged'
}

const makeContract = (overrides: Partial<ContractRowFixture> = {}): ContractRowFixture => ({
  contract_id: 'ctr-1',
  client_id: 'client-1',
  organization_id: null,
  space_id: 'space-1',
  business_line_code: 'globe',
  commercial_model: 'retainer',
  staffing_model: 'outcome_based',
  status: 'active',
  start_date: '2025-01-01',
  end_date: null,
  mrr_clp: 1_000_000,
  ...overrides
})

interface Scenario {
  contracts: ContractRowFixture[]
  previousSnapshots: PrevSnapshotFixture[]
  churnContracts?: ContractRowFixture[]
  upsertCapture: Array<{ sql: string; params: unknown[] }>
}

const wireScenario = (scenario: Scenario) => {
  let callIndex = 0

  mocks.runGreenhousePostgresQuery.mockImplementation(
    async (sql: string, params: unknown[]) => {
      callIndex++
      const trimmed = sql.trim()

      // 1st call: SELECT … FROM greenhouse_commercial.contracts WHERE … retainer active
      if (/SELECT contract_id[\s\S]+FROM greenhouse_commercial\.contracts[\s\S]+retainer/i.test(trimmed)
          && /status = 'active'/i.test(trimmed)) {
        return scenario.contracts
      }

      // 2nd call: SELECT … FROM greenhouse_serving.contract_mrr_arr_snapshots
      if (/FROM greenhouse_serving\.contract_mrr_arr_snapshots/i.test(trimmed)) {
        return scenario.previousSnapshots
      }

      // 3rd call (optional): SELECT … WHERE contract_id = ANY(...)
      if (/contract_id = ANY\(/i.test(trimmed)) {
        return scenario.churnContracts ?? []
      }

      // INSERT … ON CONFLICT — capture for assertion
      if (/^INSERT INTO greenhouse_serving\.contract_mrr_arr_snapshots/i.test(trimmed)) {
        scenario.upsertCapture.push({ sql: trimmed, params })
        
return []
      }

      // Backfill helper: earliest date
      if (/SELECT MIN\(start_date\)/i.test(trimmed)) {
        return [{ earliest: '2025-01-01' }]
      }

      throw new Error(`Unmocked query (call #${callIndex}): ${trimmed.slice(0, 120)}`)
    }
  )
}

const extractMovement = (upsert: { params: unknown[] }): string => {
  // params order: year, month, contract_id, client_id, organization_id,
  // space_id, business_line_code, commercial_model, staffing_model,
  // mrr_clp, previous_mrr_clp, movement_type
  return String(upsert.params[11])
}

const extractMrr = (upsert: { params: unknown[] }): number => Number(upsert.params[9])

const extractPrevMrr = (upsert: { params: unknown[] }): number | null => {
  const raw = upsert.params[10]

  
return raw === null || raw === undefined ? null : Number(raw)
}

beforeEach(() => {
  mocks.runGreenhousePostgresQuery.mockReset()
})

// ─────────────────────────────────────────────────────────────
// Classifier unit cases
// ─────────────────────────────────────────────────────────────

describe('classifyMovement (pure)', () => {
  const { classifyMovement } = __testing

  it('contract new — no previous snapshot, current MRR > 0 → new', () => {
    expect(classifyMovement({
      currentMrr: 1_000_000,
      previousMrr: null,
      previousMovement: null
    })).toBe('new')
  })

  it('contract growing — current > previous → expansion', () => {
    expect(classifyMovement({
      currentMrr: 1_500_000,
      previousMrr: 1_000_000,
      previousMovement: 'unchanged'
    })).toBe('expansion')
  })

  it('contract shrinking — current < previous & current > 0 → contraction', () => {
    expect(classifyMovement({
      currentMrr: 800_000,
      previousMrr: 1_000_000,
      previousMovement: 'unchanged'
    })).toBe('contraction')
  })

  it('contract dropped to zero with previous > 0 → churn', () => {
    expect(classifyMovement({
      currentMrr: 0,
      previousMrr: 1_000_000,
      previousMovement: 'unchanged'
    })).toBe('churn')
  })

  it('contract returned after churn → reactivation', () => {
    expect(classifyMovement({
      currentMrr: 1_200_000,
      previousMrr: 0,
      previousMovement: 'churn'
    })).toBe('reactivation')
  })

  it('MRR equal month-over-month → unchanged', () => {
    expect(classifyMovement({
      currentMrr: 1_000_000,
      previousMrr: 1_000_000,
      previousMovement: 'unchanged'
    })).toBe('unchanged')
  })
})

// ─────────────────────────────────────────────────────────────
// End-to-end materialization scenarios
// ─────────────────────────────────────────────────────────────

describe('buildMrrArrSnapshotsForPeriod', () => {
  it('classifies a new contract without previous snapshot', async () => {
    const scenario: Scenario = {
      contracts: [makeContract({ contract_id: 'ctr-new', mrr_clp: 1_000_000 })],
      previousSnapshots: [],
      upsertCapture: []
    }

    wireScenario(scenario)

    const result = await buildMrrArrSnapshotsForPeriod({ year: 2026, month: 4 })

    expect(result.inserted).toBe(1)
    expect(scenario.upsertCapture).toHaveLength(1)
    expect(extractMovement(scenario.upsertCapture[0])).toBe('new')
    expect(extractPrevMrr(scenario.upsertCapture[0])).toBeNull()
    expect(extractMrr(scenario.upsertCapture[0])).toBe(1_000_000)
  })

  it('classifies MRR increase as expansion', async () => {
    const scenario: Scenario = {
      contracts: [makeContract({ contract_id: 'ctr-exp', mrr_clp: 1_500_000 })],
      previousSnapshots: [{
        contract_id: 'ctr-exp',
        mrr_clp: 1_000_000,
        movement_type: 'unchanged'
      }],
      upsertCapture: []
    }

    wireScenario(scenario)

    await buildMrrArrSnapshotsForPeriod({ year: 2026, month: 4 })

    expect(extractMovement(scenario.upsertCapture[0])).toBe('expansion')
    expect(extractPrevMrr(scenario.upsertCapture[0])).toBe(1_000_000)
  })

  it('classifies MRR decrease (still > 0) as contraction', async () => {
    const scenario: Scenario = {
      contracts: [makeContract({ contract_id: 'ctr-con', mrr_clp: 700_000 })],
      previousSnapshots: [{
        contract_id: 'ctr-con',
        mrr_clp: 1_000_000,
        movement_type: 'unchanged'
      }],
      upsertCapture: []
    }

    wireScenario(scenario)

    await buildMrrArrSnapshotsForPeriod({ year: 2026, month: 4 })

    expect(extractMovement(scenario.upsertCapture[0])).toBe('contraction')
    expect(extractMrr(scenario.upsertCapture[0])).toBe(700_000)
  })

  it('classifies contract no longer active with prior snapshot as churn', async () => {
    // Contract ctr-churn had MRR 1M last month but is not in the active list this month.
    const scenario: Scenario = {
      contracts: [],
      previousSnapshots: [{
        contract_id: 'ctr-churn',
        mrr_clp: 1_000_000,
        movement_type: 'unchanged'
      }],
      churnContracts: [makeContract({
        contract_id: 'ctr-churn',
        status: 'terminated',
        mrr_clp: 0
      })],
      upsertCapture: []
    }

    wireScenario(scenario)

    const result = await buildMrrArrSnapshotsForPeriod({ year: 2026, month: 4 })

    expect(result.inserted).toBe(1)
    expect(extractMovement(scenario.upsertCapture[0])).toBe('churn')
    expect(extractMrr(scenario.upsertCapture[0])).toBe(0)
    expect(extractPrevMrr(scenario.upsertCapture[0])).toBe(1_000_000)
  })

  it('classifies MRR returning after churn as reactivation', async () => {
    const scenario: Scenario = {
      contracts: [makeContract({ contract_id: 'ctr-react', mrr_clp: 1_200_000 })],
      previousSnapshots: [{
        contract_id: 'ctr-react',
        mrr_clp: 0,
        movement_type: 'churn'
      }],
      upsertCapture: []
    }

    wireScenario(scenario)

    await buildMrrArrSnapshotsForPeriod({ year: 2026, month: 4 })

    expect(extractMovement(scenario.upsertCapture[0])).toBe('reactivation')
    expect(extractMrr(scenario.upsertCapture[0])).toBe(1_200_000)
  })

  it('classifies equal MRR month-over-month as unchanged', async () => {
    const scenario: Scenario = {
      contracts: [makeContract({ contract_id: 'ctr-stable', mrr_clp: 1_000_000 })],
      previousSnapshots: [{
        contract_id: 'ctr-stable',
        mrr_clp: 1_000_000,
        movement_type: 'unchanged'
      }],
      upsertCapture: []
    }

    wireScenario(scenario)

    await buildMrrArrSnapshotsForPeriod({ year: 2026, month: 4 })

    expect(extractMovement(scenario.upsertCapture[0])).toBe('unchanged')
  })

  it('rejects invalid period parameters', async () => {
    await expect(buildMrrArrSnapshotsForPeriod({ year: 2026, month: 13 }))
      .rejects.toThrow(/Invalid period/)
    await expect(buildMrrArrSnapshotsForPeriod({ year: 2026.5, month: 4 }))
      .rejects.toThrow(/Invalid period/)
  })

  it('filters contracts by commercial_model=retainer and status=active via SQL', async () => {
    // We assert the filter appears in the SQL sent to the DB.
    let capturedSelectSql: string | null = null

    mocks.runGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      const trimmed = sql.trim()

      if (/FROM greenhouse_commercial\.contracts/i.test(trimmed) && /retainer/i.test(trimmed)) {
        capturedSelectSql = trimmed
        
return []
      }

      if (/FROM greenhouse_serving\.contract_mrr_arr_snapshots/i.test(trimmed)) return []
      
return []
    })

    await buildMrrArrSnapshotsForPeriod({ year: 2026, month: 4 })

    expect(capturedSelectSql).toMatch(/commercial_model = 'retainer'/i)
    expect(capturedSelectSql).toMatch(/status = 'active'/i)
  })
})

// ─────────────────────────────────────────────────────────────
// Chronological backfill
// ─────────────────────────────────────────────────────────────

describe('backfill semantics', () => {
  it('walks months in chronological order using previousMrr from prior materialization', async () => {
    // Simulate 3 consecutive monthly materializations:
    //   2026-01: new contract, MRR=1,000,000
    //   2026-02: same contract, MRR=1,500,000 → expansion
    //   2026-03: same contract, MRR=1,200,000 → contraction
    const runs: Array<{ year: number; month: number; movement: string }> = []

    // Simulates the cumulative state of the snapshot table across runs.
    let storedPrev: PrevSnapshotFixture | null = null

    const contract = makeContract({ contract_id: 'ctr-bf' })

    const runMonth = async (year: number, month: number, mrr: number) => {
      const upserts: Array<{ sql: string; params: unknown[] }> = []

      mocks.runGreenhousePostgresQuery.mockReset()
      wireScenario({
        contracts: [{ ...contract, mrr_clp: mrr }],
        previousSnapshots: storedPrev ? [storedPrev] : [],
        upsertCapture: upserts
      })

      await buildMrrArrSnapshotsForPeriod({ year, month })
      expect(upserts).toHaveLength(1)

      const movement = extractMovement(upserts[0])

      runs.push({ year, month, movement })

      // Persist for next iteration — movement carries forward.
      storedPrev = {
        contract_id: 'ctr-bf',
        mrr_clp: mrr,
        movement_type: movement as PrevSnapshotFixture['movement_type']
      }
    }

    await runMonth(2026, 1, 1_000_000)
    await runMonth(2026, 2, 1_500_000)
    await runMonth(2026, 3, 1_200_000)

    expect(runs.map(r => r.movement)).toEqual(['new', 'expansion', 'contraction'])
  })
})
