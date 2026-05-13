/**
 * TASK-826 Slice 3 — Unit tests for pauseClientPortalModule + resumeClientPortalModule.
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

import { pauseClientPortalModule, resumeClientPortalModule } from '../pause-resume'
import { ClientPortalValidationError } from '../errors'

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

describe('pauseClientPortalModule', () => {
  it('happy path: active → paused emits audit + outbox + clears cache', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT }

    const result = await pauseClientPortalModule(BASE_INPUT)

    expect(result).toEqual({
      assignmentId: 'cpma-1',
      fromStatus: 'active',
      toStatus: 'paused',
      idempotent: false
    })

    expect(mocks.updatedRows[0]?.values.status).toBe('paused')

    expect(mocks.recordAssignmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKind: 'status_changed',
        fromStatus: 'active',
        toStatus: 'paused'
      }),
      expect.anything()
    )

    expect(mocks.publishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'client.portal.module.assignment.paused',
        payload: expect.objectContaining({
          version: 1,
          organizationId: 'org-1',
          fromStatus: 'active',
          toStatus: 'paused'
        })
      }),
      expect.anything()
    )

    expect(mocks.clearCache).toHaveBeenCalledWith('org-1')
  })

  it('pilot → paused also allowed', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'pilot' }

    const result = await pauseClientPortalModule(BASE_INPUT)

    expect(result.fromStatus).toBe('pilot')
    expect(result.toStatus).toBe('paused')
  })

  it('idempotent: already paused → no-op, no outbox', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'paused' }

    const result = await pauseClientPortalModule(BASE_INPUT)

    expect(result.idempotent).toBe(true)
    expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
    expect(mocks.recordAssignmentEvent).not.toHaveBeenCalled()
    expect(mocks.clearCache).not.toHaveBeenCalled()
  })

  it('404 when assignment not found', async () => {
    mocks.currentAssignment = undefined

    await expect(pauseClientPortalModule(BASE_INPUT)).rejects.toMatchObject({
      name: 'ClientPortalValidationError',
      statusCode: 404
    })
  })

  it('409 when assignment is closed (effective_to set)', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, effective_to: '2026-05-01' }

    await expect(pauseClientPortalModule(BASE_INPUT)).rejects.toMatchObject({
      name: 'ClientPortalValidationError',
      statusCode: 409
    })
  })

  it('409 when assignment is in terminal status (expired)', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'expired' }

    await expect(pauseClientPortalModule(BASE_INPUT)).rejects.toMatchObject({
      name: 'ClientPortalValidationError',
      statusCode: 409
    })
  })

  it('409 when assignment is in terminal status (churned)', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'churned' }

    await expect(pauseClientPortalModule(BASE_INPUT)).rejects.toBeInstanceOf(
      ClientPortalValidationError
    )
  })
})

describe('resumeClientPortalModule', () => {
  it('happy path: paused → active emits audit + outbox + clears cache', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'paused' }

    const result = await resumeClientPortalModule(BASE_INPUT)

    expect(result).toEqual({
      assignmentId: 'cpma-1',
      fromStatus: 'paused',
      toStatus: 'active',
      idempotent: false
    })

    expect(mocks.publishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'client.portal.module.assignment.resumed',
        payload: expect.objectContaining({
          version: 1,
          fromStatus: 'paused',
          toStatus: 'active'
        })
      }),
      expect.anything()
    )

    expect(mocks.clearCache).toHaveBeenCalledWith('org-1')
  })

  it('idempotent: already active → no-op', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'active' }

    const result = await resumeClientPortalModule(BASE_INPUT)

    expect(result.idempotent).toBe(true)
    expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
    expect(mocks.clearCache).not.toHaveBeenCalled()
  })

  it('409 when resuming from pilot (not paused)', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'pilot' }

    await expect(resumeClientPortalModule(BASE_INPUT)).rejects.toMatchObject({
      statusCode: 409
    })
  })

  it('409 when resuming from terminal status', async () => {
    mocks.currentAssignment = { ...ACTIVE_ASSIGNMENT, status: 'expired' }

    await expect(resumeClientPortalModule(BASE_INPUT)).rejects.toMatchObject({
      statusCode: 409
    })
  })

  it('404 when assignment not found', async () => {
    mocks.currentAssignment = undefined

    await expect(resumeClientPortalModule(BASE_INPUT)).rejects.toMatchObject({
      statusCode: 404
    })
  })
})
