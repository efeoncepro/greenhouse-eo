/**
 * TASK-826 Slice 8 — End-to-end lifecycle integration tests.
 *
 * Cubre los 5 path canónicos del state machine:
 *   1. enable (pending|active|pilot) → outbox event 'created'
 *   2. enable + pause → 'created' + 'paused'
 *   3. enable + pause + resume → 'created' + 'paused' + 'resumed'
 *   4. enable + expire → 'created' + 'expired' (effective_to set)
 *   5. enable + churn → 'created' + 'churned' (effective_to set, terminal)
 *
 * Verificaciones cross-command:
 *   - Cada transition emite 1 outbox event v1 versionado en la misma tx
 *   - Cada transition agrega 1 audit row en module_assignment_events
 *   - Cache scoped al org se invalida post-tx (skip si idempotent)
 *   - Idempotent re-call NO emite outbox/audit duplicado
 *   - Terminal status (expired/churned) NO permite re-pause/resume
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  publishOutboxEvent: vi.fn(),
  recordAssignmentEvent: vi.fn(),
  resolveOrgBLs: vi.fn(),
  clearCache: vi.fn(),
  insertedRows: [] as Array<{ table: string; values: Record<string, unknown> }>,
  updatedRows: [] as Array<{ table: string; values: Record<string, unknown> }>,
  currentExisting: undefined as unknown,
  currentModule: undefined as unknown,
  currentAssignment: undefined as unknown
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: mocks.publishOutboxEvent
}))

vi.mock('../audit', () => ({
  recordAssignmentEvent: mocks.recordAssignmentEvent
}))

vi.mock('../resolve-org-business-line', () => ({
  resolveOrganizationCanonicalBusinessLines: mocks.resolveOrgBLs
}))

vi.mock('@/lib/client-portal/readers/native/module-resolver', () => ({
  __clearClientPortalResolverCache: mocks.clearCache
}))

const buildTx = () => ({
  selectFrom: vi.fn((table: string) => {
    const builder = {
      select: vi.fn(() => builder),
      selectAll: vi.fn(() => builder),
      where: vi.fn(() => builder),
      innerJoin: vi.fn(() => builder),
      distinct: vi.fn(() => builder),
      executeTakeFirst: vi.fn(async () => {
        if (table.includes('module_assignments')) {
          // enable-module uses currentExisting; pause/resume/expire/churn uses currentAssignment
          return mocks.currentAssignment ?? mocks.currentExisting
        }

        if (table.includes('modules')) return mocks.currentModule

        return undefined
      })
    }

    return builder
  }),
  insertInto: vi.fn((table: string) => {
    const builder = {
      values: vi.fn((vals: Record<string, unknown>) => {
        mocks.insertedRows.push({ table, values: vals })

        return builder
      }),
      execute: vi.fn(async () => [])
    }

    return builder
  }),
  updateTable: vi.fn((table: string) => {
    const builder = {
      set: vi.fn((vals: Record<string, unknown>) => {
        mocks.updatedRows.push({ table, values: vals })

        return builder
      }),
      where: vi.fn(() => builder),
      execute: vi.fn(async () => [])
    }

    return builder
  })
})

vi.mock('@/lib/db', () => ({
  getDb: async () => ({
    transaction: () => ({
      execute: async (cb: (tx: unknown) => Promise<unknown>) => cb(buildTx())
    })
  })
}))

import { enableClientPortalModule } from '../enable-module'
import { churnClientPortalModule, expireClientPortalModule } from '../expire-churn'
import { pauseClientPortalModule, resumeClientPortalModule } from '../pause-resume'

const ENABLE_INPUT = {
  organizationId: 'org-globe-1',
  moduleKey: 'creative_hub_globe_v1',
  source: 'manual_admin' as const,
  effectiveFrom: '2026-05-12',
  approvedByUserId: 'user-admin-1'
}

const ACTIVE_ASSIGNMENT = {
  assignment_id: 'cpma-test-1',
  organization_id: 'org-globe-1',
  module_key: 'creative_hub_globe_v1',
  status: 'active',
  effective_to: null
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.insertedRows = []
  mocks.updatedRows = []
  mocks.currentExisting = undefined
  mocks.currentAssignment = undefined
  mocks.currentModule = {
    module_key: 'creative_hub_globe_v1',
    applicability_scope: 'globe',
    tier: 'standard'
  }
  mocks.resolveOrgBLs.mockResolvedValue(['globe'])
  mocks.recordAssignmentEvent.mockResolvedValue('cpmae-1')
  mocks.publishOutboxEvent.mockResolvedValue('outbox-1')
})

describe('TASK-826 lifecycle — enable → pause → resume → expire', () => {
  it('full lifecycle emits 4 distinct outbox events v1 (created, paused, resumed, expired)', async () => {
    // 1. ENABLE
    mocks.currentExisting = undefined
    const enableResult = await enableClientPortalModule(ENABLE_INPUT)

    expect(enableResult.idempotent).toBe(false)
    expect(mocks.publishOutboxEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        eventType: 'client.portal.module.assignment.created',
        payload: expect.objectContaining({ version: 1 })
      }),
      expect.anything()
    )
    expect(mocks.clearCache).toHaveBeenCalledWith('org-globe-1')

    // 2. PAUSE (active → paused)
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'active' }

    const pauseResult = await pauseClientPortalModule({
      assignmentId: 'cpma-test-1',
      actorUserId: 'user-admin-1'
    })

    expect(pauseResult.toStatus).toBe('paused')
    expect(mocks.publishOutboxEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        eventType: 'client.portal.module.assignment.paused',
        payload: expect.objectContaining({
          version: 1,
          fromStatus: 'active',
          toStatus: 'paused'
        })
      }),
      expect.anything()
    )

    // 3. RESUME (paused → active)
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'paused' }

    const resumeResult = await resumeClientPortalModule({
      assignmentId: 'cpma-test-1',
      actorUserId: 'user-admin-1'
    })

    expect(resumeResult.toStatus).toBe('active')
    expect(mocks.publishOutboxEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        eventType: 'client.portal.module.assignment.resumed',
        payload: expect.objectContaining({ version: 1, fromStatus: 'paused', toStatus: 'active' })
      }),
      expect.anything()
    )

    // 4. EXPIRE (active → expired, terminal)
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'active' }

    const expireResult = await expireClientPortalModule({
      assignmentId: 'cpma-test-1',
      actorUserId: 'user-admin-1',
      effectiveTo: '2026-05-12'
    })

    expect(expireResult.toStatus).toBe('expired')
    expect(mocks.publishOutboxEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        eventType: 'client.portal.module.assignment.expired',
        payload: expect.objectContaining({ version: 1, effectiveTo: '2026-05-12' })
      }),
      expect.anything()
    )

    // 4 outbox events emitidos
    expect(mocks.publishOutboxEvent).toHaveBeenCalledTimes(4)

    // 4 audit events recordeados
    expect(mocks.recordAssignmentEvent).toHaveBeenCalledTimes(4)

    // 4 cache invalidations (no idempotents)
    expect(mocks.clearCache).toHaveBeenCalledTimes(4)
    expect(mocks.clearCache).toHaveBeenCalledWith('org-globe-1')
  })

  it('idempotent enable returns existing without re-emitting outbox', async () => {
    // Existing active assignment matches target status
    mocks.currentExisting = { assignment_id: 'cpma-existing-1', status: 'active' }
    mocks.currentAssignment = { assignment_id: 'cpma-existing-1', status: 'active' }

    const result = await enableClientPortalModule(ENABLE_INPUT)

    expect(result).toMatchObject({
      assignmentId: 'cpma-existing-1',
      idempotent: true
    })
    expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
    expect(mocks.recordAssignmentEvent).not.toHaveBeenCalled()
    expect(mocks.clearCache).not.toHaveBeenCalled()
  })
})

describe('TASK-826 lifecycle — enable → churn (terminal)', () => {
  it('churn emits churned event with effective_to + actorUserId', async () => {
    // 1. ENABLE
    mocks.currentExisting = undefined
    await enableClientPortalModule(ENABLE_INPUT)

    // 2. CHURN
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'active' }

    const churnResult = await churnClientPortalModule({
      assignmentId: 'cpma-test-1',
      actorUserId: 'user-admin-1',
      effectiveTo: '2026-05-12',
      reason: 'cliente offboarded post Q1 2026'
    })

    expect(churnResult).toMatchObject({
      toStatus: 'churned',
      effectiveTo: '2026-05-12'
    })

    expect(mocks.publishOutboxEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        aggregateType: 'client_portal_module_assignment',
        eventType: 'client.portal.module.assignment.churned',
        payload: expect.objectContaining({
          version: 1,
          fromStatus: 'active',
          toStatus: 'churned',
          effectiveTo: '2026-05-12',
          actorUserId: 'user-admin-1'
        })
      }),
      expect.anything()
    )

    // Audit event with reason
    expect(mocks.recordAssignmentEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        eventKind: 'churned',
        fromStatus: 'active',
        toStatus: 'churned',
        actorUserId: 'user-admin-1',
        payload: expect.objectContaining({
          reason: 'cliente offboarded post Q1 2026',
          effectiveTo: '2026-05-12'
        })
      }),
      expect.anything()
    )
  })

  it('cannot re-pause a terminal-expired assignment (state machine enforced)', async () => {
    mocks.currentAssignment = {
      ...ACTIVE_ASSIGNMENT,
      status: 'expired',
      effective_to: '2026-04-01'
    }

    await expect(
      pauseClientPortalModule({ assignmentId: 'cpma-test-1', actorUserId: 'user-admin-1' })
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('cannot transition from churned to expired (cross-terminal block)', async () => {
    mocks.currentAssignment = {
      ...ACTIVE_ASSIGNMENT,
      status: 'churned',
      effective_to: '2026-04-01'
    }

    await expect(
      expireClientPortalModule({ assignmentId: 'cpma-test-1', actorUserId: 'user-admin-1' })
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('TASK-826 — outbox event payload contract v1', () => {
  it('all 5 event types share consistent v1 envelope (version, assignmentId, organizationId, moduleKey)', async () => {
    // Enable
    await enableClientPortalModule(ENABLE_INPUT)

    // Pause
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'active' }
    await pauseClientPortalModule({ assignmentId: 'cpma-test-1', actorUserId: 'user-admin-1' })

    // Resume
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'paused' }
    await resumeClientPortalModule({ assignmentId: 'cpma-test-1', actorUserId: 'user-admin-1' })

    // Expire
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'active' }
    await expireClientPortalModule({ assignmentId: 'cpma-test-1', actorUserId: 'user-admin-1' })

    // Churn
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'active' }
    await churnClientPortalModule({ assignmentId: 'cpma-test-1', actorUserId: 'user-admin-1' })

    const calls = mocks.publishOutboxEvent.mock.calls
    const eventTypes = calls.map(call => (call[0] as { eventType: string }).eventType)

    expect(eventTypes).toEqual([
      'client.portal.module.assignment.created',
      'client.portal.module.assignment.paused',
      'client.portal.module.assignment.resumed',
      'client.portal.module.assignment.expired',
      'client.portal.module.assignment.churned'
    ])

    // All payloads have v1 envelope keys
    for (const call of calls) {
      const event = call[0] as { aggregateType: string; payload: Record<string, unknown> }

      expect(event.aggregateType).toBe('client_portal_module_assignment')
      expect(event.payload.version).toBe(1)
      expect(event.payload.assignmentId).toBeDefined()
      expect(event.payload.organizationId).toBe('org-globe-1')
      expect(event.payload.moduleKey).toBe('creative_hub_globe_v1')
    }
  })
})
