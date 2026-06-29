import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1270 — recurring re-grade scheduler.
 * Cubre flag OFF, budget guard e idempotencia/cadencia del enqueue.
 */

vi.mock('server-only', () => ({}))

const state = {
  monthCost: 0,
  claimed: [] as Record<string, unknown>[],
  enqueueResult: {
    run: { runId: 'grun-regrade-1', publicId: 'EO-GRUN-999' },
    idempotentHit: false
  },
  enqueueError: null as Error | null
}

const spies = {
  enqueue: vi.fn(),
  profileUpdate: vi.fn()
}

vi.mock('../commands', () => ({
  enqueueGraderDiagnostic: async (input: unknown) => {
    spies.enqueue(input)

    if (state.enqueueError) {
      throw state.enqueueError
    }

    return state.enqueueResult
  }
}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params?: unknown[]) => {
    if (sql.includes('SUM(estimated_cost_usd)')) {
      return [{ total: state.monthCost }]
    }

    if (sql.includes('recurring_regrade_last_run_id') || sql.includes("INTERVAL '1 day'")) {
      spies.profileUpdate({ sql, params })

      return []
    }

    return []
  },
  withGreenhousePostgresTransaction: async (cb: (client: unknown) => Promise<unknown>) => {
    const client = {
      query: async () => ({ rows: state.claimed })
    }

    return cb(client)
  }
}))

import {
  buildRecurringRegradeIdempotencyKey,
  handleRecurringRegradeBatch
} from '../regrade'

const ENABLED_ENV = {
  NODE_ENV: 'test',
  GROWTH_AI_VISIBILITY_GRADER_ENABLED: 'true',
  GROWTH_AI_VISIBILITY_REGRADE_ENABLED: 'true',
  GROWTH_AI_VISIBILITY_REGRADE_MONTHLY_BUDGET_USD: '50'
} as NodeJS.ProcessEnv

const CLAIMED_PROFILE = {
  profile_id: 'gprof-1',
  organization_id: 'org-1',
  brand_name: 'Acme',
  website_url: 'https://acme.example',
  market: 'CL',
  locale: 'es-CL',
  category: 'marketing',
  competitors_declared: ['Other'],
  recurring_regrade_cadence: 'monthly',
  assignment_id: 'cpma-1'
}

beforeEach(() => {
  vi.clearAllMocks()
  state.monthCost = 0
  state.claimed = []
  state.enqueueResult = {
    run: { runId: 'grun-regrade-1', publicId: 'EO-GRUN-999' },
    idempotentHit: false
  }
  state.enqueueError = null
})

describe('handleRecurringRegradeBatch', () => {
  it('no toca DB ni encola cuando el flag está OFF', async () => {
    const result = await handleRecurringRegradeBatch({
      env: { NODE_ENV: 'test', GROWTH_AI_VISIBILITY_GRADER_ENABLED: 'true' } as NodeJS.ProcessEnv
    })

    expect(result.skipped).toBe('disabled')
    expect(result.enqueuedRuns).toBe(0)
    expect(spies.enqueue).not.toHaveBeenCalled()
  })

  it('bloquea por budget mensual antes de claim/enqueue', async () => {
    state.monthCost = 50

    const result = await handleRecurringRegradeBatch({ env: ENABLED_ENV })

    expect(result.skipped).toBe('budget_exhausted')
    expect(result.budget.remainingSlots).toBe(0)
    expect(spies.enqueue).not.toHaveBeenCalled()
  })

  it('encola un run full idempotente para el perfil due y marca last_run', async () => {
    state.claimed = [CLAIMED_PROFILE]

    const now = new Date('2026-06-29T12:00:00.000Z')
    const result = await handleRecurringRegradeBatch({ env: ENABLED_ENV, now })

    expect(result.claimedProfiles).toBe(1)
    expect(result.enqueuedRuns).toBe(1)
    expect(spies.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        brandName: 'Acme',
        mode: 'full',
        runKind: 'public_diagnostic',
        idempotencyKey: 'growth-ai-visibility-regrade:gprof-1:monthly:2026-06-01',
        attribution: expect.objectContaining({
          organizationId: 'org-1',
          assignmentId: 'cpma-1',
          runSource: 'portal_contracted',
          costAttribution: 'client'
        })
      })
    )
    expect(spies.profileUpdate).toHaveBeenCalled()
  })

  it('reprograma retry corto cuando el enqueue falla', async () => {
    state.claimed = [CLAIMED_PROFILE]
    state.enqueueError = new Error('db unavailable')

    const result = await handleRecurringRegradeBatch({ env: ENABLED_ENV })

    expect(result.claimedProfiles).toBe(1)
    expect(result.enqueuedRuns).toBe(0)
    expect(result.failedProfiles).toBe(1)
    expect(spies.profileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining("INTERVAL '1 day'"),
        params: ['gprof-1']
      })
    )
  })
})

describe('buildRecurringRegradeIdempotencyKey', () => {
  it('usa lunes UTC como ventana semanal', () => {
    expect(
      buildRecurringRegradeIdempotencyKey({
        profileId: 'gprof-1',
        cadence: 'weekly',
        now: new Date('2026-07-05T12:00:00.000Z')
      })
    ).toBe('growth-ai-visibility-regrade:gprof-1:weekly:2026-06-29')
  })
})
