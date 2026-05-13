/**
 * TASK-826 Slice 4 — Unit tests for expireClientPortalModule + churnClientPortalModule.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  publishOutboxEvent: vi.fn(),
  recordAssignmentEvent: vi.fn(),
  clearCache: vi.fn(),
  updatedRows: [] as Array<{ table: string; values: Record<string, unknown> }>,
  currentAssignment: undefined as unknown
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: mocks.publishOutboxEvent
}))

vi.mock('../audit', () => ({
  recordAssignmentEvent: mocks.recordAssignmentEvent
}))

vi.mock('@/lib/client-portal/readers/native/module-resolver', () => ({
  __clearClientPortalResolverCache: mocks.clearCache
}))

const buildTx = () => ({
  selectFrom: vi.fn(() => {
    const builder = {
      select: vi.fn(() => builder),
      where: vi.fn(() => builder),
      executeTakeFirst: vi.fn(async () => mocks.currentAssignment)
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

import { churnClientPortalModule, expireClientPortalModule } from '../expire-churn'

const BASE_INPUT = {
  assignmentId: 'cpma-1',
  actorUserId: 'user-admin-1',
  reason: 'test reason'
}

const ACTIVE_ASSIGNMENT = {
  assignment_id: 'cpma-1',
  organization_id: 'org-1',
  module_key: 'creative_hub_globe_v1',
  status: 'active',
  effective_to: null
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.updatedRows = []
  mocks.currentAssignment = undefined
  mocks.recordAssignmentEvent.mockResolvedValue('cpmae-1')
  mocks.publishOutboxEvent.mockResolvedValue('outbox-1')
})

describe('expireClientPortalModule', () => {
  it('happy path: active → expired sets effective_to + emits event + clears cache', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT }

    const result = await expireClientPortalModule({ ...BASE_INPUT, effectiveTo: '2026-05-12' })

    expect(result).toEqual({
      assignmentId: 'cpma-1',
      fromStatus: 'active',
      toStatus: 'expired',
      effectiveTo: '2026-05-12',
      idempotent: false
    })

    expect(mocks.updatedRows[0]?.values).toMatchObject({
      status: 'expired',
      effective_to: '2026-05-12'
    })

    expect(mocks.recordAssignmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKind: 'expired',
        fromStatus: 'active',
        toStatus: 'expired'
      }),
      expect.anything()
    )

    expect(mocks.publishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'client.portal.module.assignment.expired',
        payload: expect.objectContaining({
          version: 1,
          fromStatus: 'active',
          toStatus: 'expired',
          effectiveTo: '2026-05-12'
        })
      }),
      expect.anything()
    )

    expect(mocks.clearCache).toHaveBeenCalledWith('org-1')
  })

  it('expire from pilot also allowed', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'pilot' }

    const result = await expireClientPortalModule(BASE_INPUT)

    expect(result.fromStatus).toBe('pilot')
    expect(result.toStatus).toBe('expired')
  })

  it('expire from paused also allowed', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'paused' }

    const result = await expireClientPortalModule(BASE_INPUT)

    expect(result.fromStatus).toBe('paused')
    expect(result.toStatus).toBe('expired')
  })

  it('defaults effectiveTo to today (YYYY-MM-DD)', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT }

    const result = await expireClientPortalModule(BASE_INPUT)

    expect(result.effectiveTo).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('idempotent: already expired with effective_to set → no-op', async () => {
    mocks.currentAssignment = {
      ...ACTIVE_ASSIGNMENT,
      status: 'expired',
      effective_to: '2026-04-01'
    }

    const result = await expireClientPortalModule(BASE_INPUT)

    expect(result.idempotent).toBe(true)
    expect(result.effectiveTo).toBe('2026-04-01')
    expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
    expect(mocks.clearCache).not.toHaveBeenCalled()
  })

  it('409 when assignment is already churned (different terminal)', async () => {
    mocks.currentAssignment = {
      ...ACTIVE_ASSIGNMENT,
      status: 'churned',
      effective_to: '2026-03-01'
    }

    await expect(expireClientPortalModule(BASE_INPUT)).rejects.toMatchObject({
      statusCode: 409
    })
  })

  it('404 when assignment not found', async () => {
    mocks.currentAssignment = undefined

    await expect(expireClientPortalModule(BASE_INPUT)).rejects.toMatchObject({
      statusCode: 404
    })
  })
})

describe('churnClientPortalModule', () => {
  it('happy path: active → churned sets effective_to + emits churned event', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT }

    const result = await churnClientPortalModule({ ...BASE_INPUT, effectiveTo: '2026-05-12' })

    expect(result).toEqual({
      assignmentId: 'cpma-1',
      fromStatus: 'active',
      toStatus: 'churned',
      effectiveTo: '2026-05-12',
      idempotent: false
    })

    expect(mocks.recordAssignmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKind: 'churned',
        fromStatus: 'active',
        toStatus: 'churned'
      }),
      expect.anything()
    )

    expect(mocks.publishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'client.portal.module.assignment.churned',
        payload: expect.objectContaining({
          version: 1,
          toStatus: 'churned'
        })
      }),
      expect.anything()
    )

    expect(mocks.clearCache).toHaveBeenCalledWith('org-1')
  })

  it('churn from any non-terminal status is allowed', async () => {
    for (const status of ['pending', 'active', 'pilot', 'paused']) {
      mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status }
      mocks.updatedRows = []
      mocks.publishOutboxEvent.mockClear()

      const result = await churnClientPortalModule(BASE_INPUT)

      expect(result.fromStatus).toBe(status)
      expect(result.toStatus).toBe('churned')
    }
  })

  it('idempotent: already churned → no-op', async () => {
    mocks.currentAssignment = {
      ...ACTIVE_ASSIGNMENT,
      status: 'churned',
      effective_to: '2026-04-01'
    }

    const result = await churnClientPortalModule(BASE_INPUT)

    expect(result.idempotent).toBe(true)
    expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('409 when assignment is already expired (different terminal)', async () => {
    mocks.currentAssignment = {
      ...ACTIVE_ASSIGNMENT,
      status: 'expired',
      effective_to: '2026-03-01'
    }

    await expect(churnClientPortalModule(BASE_INPUT)).rejects.toMatchObject({
      statusCode: 409
    })
  })

  it('404 when assignment not found', async () => {
    mocks.currentAssignment = undefined

    await expect(churnClientPortalModule(BASE_INPUT)).rejects.toMatchObject({
      statusCode: 404
    })
  })
})
