import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1277 Slice 3 — chokepoint gobernado de runs AEO.
 * Cubre las puertas cliente (disabled / not_entitled / trial_disabled / quota / cost_blocked /
 * profile_required / accepted con claim atómico) y la puerta operador (disabled / profile / accepted
 * ilimitado). Deps mockeadas; el claim atómico se ejercita vía el fake client de la tx.
 */

vi.mock('server-only', () => ({}))

const state = {
  portalEnabled: true,
  trialEnabled: true,
  graderEnabled: true,
  entitlement: null as Record<string, unknown> | null,
  profile: null as Record<string, unknown> | null,
  usedInTx: 0,
  enqueueResult: {
    run: { runId: 'grun-1', publicId: 'EO-GRUN-1', pollToken: 'tok-1' },
    idempotentHit: false
  }
}

const spies = { enqueue: vi.fn(), outbox: vi.fn() }

vi.mock('../flags', () => ({
  isPortalRunEnabled: () => state.portalEnabled,
  isTrialTierEnabled: () => state.trialEnabled,
  isGraderEnabled: () => state.graderEnabled,
  // TASK-1288 — guard de categoría OFF en estos tests (default productivo); su cobertura
  // específica vive en category-guard.test.ts.
  isCategoryGuardEnabled: () => false
}))

vi.mock('../entitlement', () => ({
  resolveAeoEntitlement: async () => state.entitlement
}))

vi.mock('../store', () => ({
  getGraderProfileForOrganization: async () => state.profile
}))

vi.mock('../commands', () => ({
  enqueueGraderDiagnostic: async (input: unknown) => {
    spies.enqueue(input)

    return state.enqueueResult
  }
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: async (event: unknown) => {
    spies.outbox(event)

    return 'outbox-1'
  }
}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: async (cb: (client: unknown) => Promise<unknown>) => {
    const client = {
      query: async (sql: string) => {
        if (sql.includes('used')) {
          return { rows: [{ used: state.usedInTx }] }
        }

        return { rows: [] }
      }
    }

    return cb(client)
  },
  runGreenhousePostgresQuery: async () => []
}))

import { requestGraderRunAsOperator, requestGraderRunForOrganization } from '../request-run'

const PROFILE = {
  brandName: 'Acme',
  websiteUrl: 'https://acme.cl',
  market: 'CL',
  locale: 'es-CL',
  category: 'retail',
  competitorsDeclared: []
}

const entitlement = (over: Record<string, unknown> = {}) => ({
  organizationId: 'org-1',
  hasModule: true,
  tier: 'contracted',
  assignmentId: 'cpma-1',
  status: 'active',
  allowanceCap: 20,
  allowanceUsed: 0,
  allowanceRemaining: 20,
  periodResetAt: '2026-07-01T00:00:00.000Z',
  blockedReason: null,
  ...over
})

beforeEach(() => {
  vi.clearAllMocks()
  state.portalEnabled = true
  state.trialEnabled = true
  state.graderEnabled = true
  state.entitlement = entitlement()
  state.profile = PROFILE
  state.usedInTx = 0
  state.enqueueResult = {
    run: { runId: 'grun-1', publicId: 'EO-GRUN-1', pollToken: 'tok-1' },
    idempotentHit: false
  }
})

describe('requestGraderRunForOrganization', () => {
  it('blocked disabled cuando el flag de portal está OFF', async () => {
    state.portalEnabled = false
    const r = await requestGraderRunForOrganization({ organizationId: 'org-1', requestedBy: 'u1' })

    expect(r).toEqual({ status: 'blocked', reason: 'disabled' })
    expect(spies.enqueue).not.toHaveBeenCalled()
  })

  it('blocked not_entitled si la org no tiene módulo', async () => {
    state.entitlement = entitlement({ hasModule: false, tier: null, assignmentId: null, blockedReason: 'no_entitlement' })
    const r = await requestGraderRunForOrganization({ organizationId: 'org-1', requestedBy: 'u1' })

    expect(r).toEqual({ status: 'blocked', reason: 'not_entitled' })
  })

  it('blocked disabled si tier=trial y trial flag OFF', async () => {
    state.entitlement = entitlement({ tier: 'trial', allowanceCap: 1 })
    state.trialEnabled = false
    const r = await requestGraderRunForOrganization({ organizationId: 'org-1', requestedBy: 'u1' })

    expect(r).toEqual({ status: 'blocked', reason: 'disabled' })
  })

  it('blocked quota_exhausted desde el entitlement', async () => {
    state.entitlement = entitlement({ blockedReason: 'quota_exhausted', allowanceRemaining: 0 })
    const r = await requestGraderRunForOrganization({ organizationId: 'org-1', requestedBy: 'u1' })

    expect(r).toEqual({ status: 'blocked', reason: 'quota_exhausted' })
  })

  it('blocked cost_blocked cuando el budget global de trials se agotó', async () => {
    state.entitlement = entitlement({ tier: 'trial', allowanceCap: 1, blockedReason: 'trial_budget_exhausted' })
    const r = await requestGraderRunForOrganization({ organizationId: 'org-1', requestedBy: 'u1' })

    expect(r).toEqual({ status: 'blocked', reason: 'cost_blocked' })
  })

  it('blocked profile_required si la org no tiene perfil enlazado', async () => {
    state.profile = null
    const r = await requestGraderRunForOrganization({ organizationId: 'org-1', requestedBy: 'u1' })

    expect(r).toEqual({ status: 'blocked', reason: 'profile_required' })
  })

  it('accepted: claim atómico encola con atribución portal_contracted + client', async () => {
    state.usedInTx = 5
    const r = await requestGraderRunForOrganization({ organizationId: 'org-1', requestedBy: 'u1' })

    expect(r.status).toBe('accepted')

    if (r.status === 'accepted') {
      expect(r.tier).toBe('contracted')
      expect(r.allowanceRemaining).toBe(14) // 20 - (5 + 1)
    }

    expect(spies.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        attribution: expect.objectContaining({
          organizationId: 'org-1',
          assignmentId: 'cpma-1',
          runSource: 'portal_contracted',
          costAttribution: 'client'
        })
      })
    )
    expect(spies.outbox).toHaveBeenCalled()
  })

  it('blocked quota_exhausted si el recuento atómico ya alcanzó el cap (carrera)', async () => {
    state.usedInTx = 20 // cap=20 ya alcanzado dentro del lock
    const r = await requestGraderRunForOrganization({ organizationId: 'org-1', requestedBy: 'u1' })

    expect(r).toEqual({ status: 'blocked', reason: 'quota_exhausted' })
    expect(spies.enqueue).not.toHaveBeenCalled()
  })
})

describe('requestGraderRunAsOperator', () => {
  it('blocked disabled si el grader global está OFF', async () => {
    state.graderEnabled = false
    const r = await requestGraderRunAsOperator({ subjectOrganizationId: 'org-prospect', requestedBy: 'am1' })

    expect(r).toEqual({ status: 'blocked', reason: 'disabled' })
  })

  it('blocked profile_required si el subject no tiene perfil', async () => {
    state.profile = null
    const r = await requestGraderRunAsOperator({ subjectOrganizationId: 'org-prospect', requestedBy: 'am1' })

    expect(r).toEqual({ status: 'blocked', reason: 'profile_required' })
  })

  it('accepted: ilimitado, atribución operator_sales + sales, allowanceRemaining null', async () => {
    const r = await requestGraderRunAsOperator({ subjectOrganizationId: 'org-prospect', requestedBy: 'am1' })

    expect(r.status).toBe('accepted')

    if (r.status === 'accepted') {
      expect(r.tier).toBe('operator')
      expect(r.allowanceRemaining).toBeNull()
    }

    expect(spies.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        attribution: expect.objectContaining({
          organizationId: 'org-prospect',
          runSource: 'operator_sales',
          costAttribution: 'sales'
        })
      })
    )
  })
})
