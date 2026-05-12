/**
 * TASK-826 Slice 2 — Unit tests for enableClientPortalModule.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  publishOutboxEvent: vi.fn(),
  recordAssignmentEvent: vi.fn(),
  resolveOrgBLs: vi.fn(),
  clearCache: vi.fn(),
  insertedRows: [] as Array<{ table: string; values: Record<string, unknown> }>,
  currentExisting: undefined as unknown,
  currentModule: undefined as unknown
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
        if (table.includes('module_assignments')) return mocks.currentExisting
        if (table.includes('modules')) return mocks.currentModule

        return undefined
      }),
      execute: vi.fn(async () => [])
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
import { BusinessLineMismatchError, ClientPortalValidationError } from '../errors'

const BASE_INPUT = {
  organizationId: 'org-globe-1',
  moduleKey: 'creative_hub_globe_v1',
  source: 'manual_admin' as const,
  effectiveFrom: '2026-05-12',
  approvedByUserId: 'user-admin-1'
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.insertedRows = []
  mocks.currentExisting = undefined
  mocks.currentModule = { module_key: 'creative_hub_globe_v1', applicability_scope: 'globe', tier: 'standard' }
  mocks.resolveOrgBLs.mockResolvedValue(['globe'])
  mocks.recordAssignmentEvent.mockResolvedValue('cpmae-1')
  mocks.publishOutboxEvent.mockResolvedValue('outbox-1')
})

describe('enableClientPortalModule', () => {
  it('happy path: enables a module with status=active, emits audit + outbox + clears cache', async () => {
    const result = await enableClientPortalModule(BASE_INPUT)

    expect(result.status).toBe('active')
    expect(result.idempotent).toBe(false)
    expect(result.assignmentId).toMatch(/^cpma-/)

    // Inserts: module_assignments
    const assignmentInsert = mocks.insertedRows.find(r => r.table.includes('module_assignments'))

    expect(assignmentInsert).toBeDefined()
    expect(assignmentInsert?.values).toMatchObject({
      organization_id: 'org-globe-1',
      module_key: 'creative_hub_globe_v1',
      status: 'active',
      source: 'manual_admin',
      effective_from: '2026-05-12'
    })

    // Audit event
    expect(mocks.recordAssignmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKind: 'enabled',
        toStatus: 'active',
        actorUserId: 'user-admin-1'
      }),
      expect.anything()
    )

    // Outbox event v1
    expect(mocks.publishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'client_portal_module_assignment',
        eventType: 'client.portal.module.assignment.created',
        payload: expect.objectContaining({
          version: 1,
          organizationId: 'org-globe-1',
          moduleKey: 'creative_hub_globe_v1',
          status: 'active'
        })
      }),
      expect.anything()
    )

    // Cache invalidation post-tx
    expect(mocks.clearCache).toHaveBeenCalledWith('org-globe-1')
  })

  it('throws when status=pilot without expiresAt', async () => {
    await expect(
      enableClientPortalModule({ ...BASE_INPUT, status: 'pilot' })
    ).rejects.toThrow(/pilot status requires expiresAt/)

    // Did NOT touch any persistence
    expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
    expect(mocks.clearCache).not.toHaveBeenCalled()
  })

  it('accepts pilot with valid expiresAt', async () => {
    const result = await enableClientPortalModule({
      ...BASE_INPUT,
      status: 'pilot',
      expiresAt: '2026-08-12T00:00:00Z'
    })

    expect(result.status).toBe('pilot')

    const insert = mocks.insertedRows.find(r => r.table.includes('module_assignments'))

    expect(insert?.values).toMatchObject({
      status: 'pilot',
      expires_at: '2026-08-12T00:00:00Z'
    })
  })

  it('idempotent: same status returns existing assignment without emitting outbox', async () => {
    mocks.currentExisting = { assignment_id: 'cpma-existing-1', status: 'active' }

    const result = await enableClientPortalModule(BASE_INPUT)

    expect(result).toEqual({
      assignmentId: 'cpma-existing-1',
      status: 'active',
      idempotent: true
    })
    expect(mocks.publishOutboxEvent).not.toHaveBeenCalled()
    expect(mocks.recordAssignmentEvent).not.toHaveBeenCalled()
    expect(mocks.clearCache).not.toHaveBeenCalled()
  })

  it('conflict: existing assignment with different status throws 409', async () => {
    mocks.currentExisting = { assignment_id: 'cpma-existing-1', status: 'paused' }

    await expect(enableClientPortalModule(BASE_INPUT)).rejects.toThrow(
      /Assignment already active with status='paused'/
    )
  })

  it('throws 404 when module is not found or deprecated', async () => {
    mocks.currentModule = undefined

    await expect(enableClientPortalModule(BASE_INPUT)).rejects.toMatchObject({
      name: 'ClientPortalValidationError',
      statusCode: 404
    })
  })

  it("'cross' applicability skips business_line check", async () => {
    mocks.currentModule = { module_key: 'agency_ops_cross', applicability_scope: 'cross', tier: 'standard' }
    mocks.resolveOrgBLs.mockResolvedValue([]) // even with empty, cross skips

    const result = await enableClientPortalModule({ ...BASE_INPUT, moduleKey: 'agency_ops_cross' })

    expect(result.status).toBe('active')
    expect(mocks.resolveOrgBLs).not.toHaveBeenCalled()
  })

  it('empty org business_lines: skips BL check honestly (data quality common in runtime)', async () => {
    mocks.resolveOrgBLs.mockResolvedValue([])

    const result = await enableClientPortalModule(BASE_INPUT)

    expect(result.status).toBe('active')
  })

  it('multi-BL match: applicability_scope matches one of the resolved BLs → passes', async () => {
    mocks.resolveOrgBLs.mockResolvedValue(['globe', 'wave'])

    const result = await enableClientPortalModule(BASE_INPUT)

    expect(result.status).toBe('active')
  })

  it('mismatch without override throws BusinessLineMismatchError 403', async () => {
    mocks.resolveOrgBLs.mockResolvedValue(['wave'])

    await expect(enableClientPortalModule(BASE_INPUT)).rejects.toBeInstanceOf(
      BusinessLineMismatchError
    )
  })

  it('mismatch with override but short reason throws 403', async () => {
    mocks.resolveOrgBLs.mockResolvedValue(['wave'])

    await expect(
      enableClientPortalModule({
        ...BASE_INPUT,
        overrideBusinessLineMismatch: true,
        overrideReason: 'short'
      })
    ).rejects.toBeInstanceOf(BusinessLineMismatchError)
  })

  it('mismatch with valid override passes and records override flags in audit payload', async () => {
    mocks.resolveOrgBLs.mockResolvedValue(['wave'])

    const overrideReason = 'Cliente Globe operando vertical Wave para piloto pacífico Q3'

    const result = await enableClientPortalModule({
      ...BASE_INPUT,
      overrideBusinessLineMismatch: true,
      overrideReason
    })

    expect(result.status).toBe('active')

    expect(mocks.recordAssignmentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          overrideBusinessLineMismatch: true,
          overrideReason
        })
      }),
      expect.anything()
    )
  })

  it('mismatch with override flag but missing reason throws', async () => {
    mocks.resolveOrgBLs.mockResolvedValue(['wave'])

    await expect(
      enableClientPortalModule({
        ...BASE_INPUT,
        overrideBusinessLineMismatch: true
      })
    ).rejects.toBeInstanceOf(BusinessLineMismatchError)
  })

  it('ClientPortalValidationError shape: statusCode + details preserved', async () => {
    mocks.currentModule = undefined

    try {
      await enableClientPortalModule({ ...BASE_INPUT, moduleKey: 'nope' })
      expect.fail('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ClientPortalValidationError)
      const err = error as ClientPortalValidationError

      expect(err.statusCode).toBe(404)
      expect(err.details).toEqual({ moduleKey: 'nope' })
    }
  })
})
