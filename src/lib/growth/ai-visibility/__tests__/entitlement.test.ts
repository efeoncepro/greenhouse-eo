import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1277 Slice 2 — resolveAeoEntitlement: tier + allowance per-org + tope global de trials.
 * Cubre: sin entitlement, contratado, trial (cupo / exhausted / reset), pilot (override),
 * y el backstop del budget global de trials. PG mockeado (routing por SQL).
 */

vi.mock('server-only', () => ({}))

const state = {
  assignment: null as { assignment_id: string; status: string; metadata_json: Record<string, unknown> | null } | null,
  orgUsed: 0,
  globalTrialUsed: 0
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string) => {
    if (sql.includes('org_used')) {
      return [
        {
          org_used: state.orgUsed,
          global_trial_used: state.globalTrialUsed,
          period_reset_at: '2026-07-01T00:00:00.000Z'
        }
      ]
    }

    if (sql.includes('module_assignments')) {
      return state.assignment ? [state.assignment] : []
    }

    return []
  }
}))

import { resolveAeoEntitlement } from '../entitlement'

const ENV = {} as NodeJS.ProcessEnv // defaults: trial 1, contracted 20, pilot 3, budget $25

beforeEach(() => {
  state.assignment = null
  state.orgUsed = 0
  state.globalTrialUsed = 0
})

describe('resolveAeoEntitlement', () => {
  it('no entitlement → hasModule=false, blockedReason=no_entitlement, remaining=0', async () => {
    const e = await resolveAeoEntitlement('org-x', ENV)

    expect(e.hasModule).toBe(false)
    expect(e.tier).toBeNull()
    expect(e.assignmentId).toBeNull()
    expect(e.allowanceRemaining).toBe(0)
    expect(e.blockedReason).toBe('no_entitlement')
    expect(e.periodResetAt).toBe('2026-07-01T00:00:00.000Z')
  })

  it('contracted (cap 20) con 5 usados → remaining 15, sin bloqueo', async () => {
    state.assignment = { assignment_id: 'cpma-1', status: 'active', metadata_json: { aeo_tier: 'contracted' } }
    state.orgUsed = 5

    const e = await resolveAeoEntitlement('org-berel', ENV)

    expect(e.tier).toBe('contracted')
    expect(e.allowanceCap).toBe(20)
    expect(e.allowanceUsed).toBe(5)
    expect(e.allowanceRemaining).toBe(15)
    expect(e.blockedReason).toBeNull()
    expect(e.assignmentId).toBe('cpma-1')
  })

  it('trial (cap 1) sin usar → remaining 1; con 1 usado → quota_exhausted', async () => {
    state.assignment = { assignment_id: 'cpma-2', status: 'active', metadata_json: { aeo_tier: 'trial' } }

    state.orgUsed = 0
    let e = await resolveAeoEntitlement('org-trial', ENV)

    expect(e.tier).toBe('trial')
    expect(e.allowanceRemaining).toBe(1)
    expect(e.blockedReason).toBeNull()

    state.orgUsed = 1
    e = await resolveAeoEntitlement('org-trial', ENV)
    expect(e.allowanceRemaining).toBe(0)
    expect(e.blockedReason).toBe('quota_exhausted')
  })

  it('pilot honra override metadata.aeo_runs_per_month', async () => {
    state.assignment = {
      assignment_id: 'cpma-3',
      status: 'pilot',
      metadata_json: { aeo_tier: 'pilot', aeo_runs_per_month: 10 }
    }
    state.orgUsed = 2

    const e = await resolveAeoEntitlement('org-pilot', ENV)

    expect(e.tier).toBe('pilot')
    expect(e.allowanceCap).toBe(10)
    expect(e.allowanceRemaining).toBe(8)
  })

  it('tier fallback: status pilot sin metadata → pilot; status active sin metadata → trial', async () => {
    state.assignment = { assignment_id: 'cpma-4', status: 'pilot', metadata_json: null }
    let e = await resolveAeoEntitlement('org-a', ENV)

    expect(e.tier).toBe('pilot')
    expect(e.allowanceCap).toBe(3)

    state.assignment = { assignment_id: 'cpma-5', status: 'active', metadata_json: {} }
    e = await resolveAeoEntitlement('org-b', ENV)
    expect(e.tier).toBe('trial')
    expect(e.allowanceCap).toBe(1)
  })

  it('trial budget global backstop: 50 trial runs × $0.50 ceiling = $25 ≥ budget → trial_budget_exhausted', async () => {
    state.assignment = { assignment_id: 'cpma-6', status: 'active', metadata_json: { aeo_tier: 'trial' } }
    state.orgUsed = 0 // la org TIENE cupo, pero el budget global está agotado
    state.globalTrialUsed = 50 // 50 * 0.5 = 25 >= 25

    const e = await resolveAeoEntitlement('org-trial2', ENV)

    expect(e.allowanceRemaining).toBe(1)
    expect(e.blockedReason).toBe('trial_budget_exhausted')
  })

  it('budget global NO afecta a contratado (solo trial)', async () => {
    state.assignment = { assignment_id: 'cpma-7', status: 'active', metadata_json: { aeo_tier: 'contracted' } }
    state.globalTrialUsed = 1000

    const e = await resolveAeoEntitlement('org-contracted', ENV)

    expect(e.blockedReason).toBeNull()
  })
})
