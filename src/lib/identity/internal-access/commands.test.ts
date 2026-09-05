import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as Store from './store'

const mock = vi.hoisted(() => ({ query: vi.fn(), tx: vi.fn(), candidate: vi.fn(), event: vi.fn() }))

vi.mock('@/lib/db', () => ({ withTransaction: mock.tx }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: mock.event }))
vi.mock('./store', async original => ({ ...(await original<typeof Store>()), loadEnrollmentCandidate: mock.candidate }))
import { enrollInternalNativeIdentity, revokeInternalNativeIdentity, setInternalCapabilityGrant } from './commands'

const input = {
  environmentId: 'efeonce-auth',
  profileId: 'person',
  tenantId: '11111111-1111-1111-1111-111111111111',
  objectId: '22222222-2222-2222-2222-222222222222',
  issuer: 'https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0',
  actorId: 'operator',
  reason: 'Explicit corporate enrollment'
}

beforeEach(() => {
  vi.clearAllMocks()
  mock.tx.mockImplementation(fn => fn({ query: mock.query }))
  mock.candidate.mockResolvedValue({ profile_id: 'person', upstream_link_id: 'entra-link', organization_id: 'own-org' })
  mock.query.mockResolvedValue({ rows: [] })
})
describe('governed internal enrollment', () => {
  it('denies without the fine capability before any data access', async () => {
    const authorize = vi.fn().mockResolvedValue(false)

    await expect(enrollInternalNativeIdentity(input, { authorize })).rejects.toMatchObject({ code: 'forbidden' })
    expect(authorize).toHaveBeenCalledWith('operator', 'identity.internal_access.enroll')
    expect(mock.tx).not.toHaveBeenCalled()
  })
  it('rejects tenant-confused issuer before transaction', async () => {
    await expect(
      enrollInternalNativeIdentity(
        { ...input, issuer: 'https://login.microsoftonline.com/common/v2.0' },
        { authorize: async () => true }
      )
    ).rejects.toMatchObject({ code: 'invalid_request' })
    expect(mock.tx).not.toHaveBeenCalled()
  })
  it('dry run validates current identity without writes or events', async () => {
    mock.query
      .mockResolvedValueOnce({ rows: [{ environment_id: input.environmentId }] })
      .mockResolvedValueOnce({ rows: [] })
    expect(
      await enrollInternalNativeIdentity({ ...input, dryRun: true }, { authorize: async () => true })
    ).toMatchObject({ applied: false, organizationId: 'own-org' })
    expect(mock.query).toHaveBeenCalledTimes(4)
    expect(mock.event).not.toHaveBeenCalled()
  })
  it('does not enroll a formerly active workforce candidate', async () => {
    mock.query.mockResolvedValueOnce({ rows: [{}] })
    mock.candidate.mockResolvedValue(null)
    await expect(enrollInternalNativeIdentity(input, { authorize: async () => true })).rejects.toMatchObject({
      code: 'ineligible'
    })
    expect(mock.event).not.toHaveBeenCalled()
  })
  it('rejects reassignment of an existing upstream enrollment', async () => {
    mock.query
      .mockResolvedValueOnce({ rows: [{}] })
      .mockResolvedValueOnce({ rows: [{ profile_id: 'someone-else', status: 'active' }] })
    await expect(enrollInternalNativeIdentity(input, { authorize: async () => true })).rejects.toMatchObject({
      code: 'conflict'
    })
    expect(mock.event).not.toHaveBeenCalled()
  })
  it('revocation requires a distinct capability', async () => {
    const authorize = vi.fn().mockResolvedValue(false)

    await expect(
      revokeInternalNativeIdentity(
        { enrollmentId: 'enrollment', actorId: input.actorId, reason: input.reason },
        { authorize }
      )
    ).rejects.toMatchObject({ code: 'forbidden' })
    expect(authorize).toHaveBeenCalledWith('operator', 'identity.internal_access.revoke')
  })
})

it('grant cannot exceed the target existing authority even for an authorized operator', async () => {
  mock.query
    .mockResolvedValueOnce({ rows: [{ environment_id: input.environmentId }] })
    .mockResolvedValueOnce({ rows: [{ environment_id: input.environmentId }] })
    .mockResolvedValueOnce({
      rows: [
        {
          enrollment_id: 'e',
          profile_id: 'person',
          tenant_id: input.tenantId,
          object_id: input.objectId,
          status: 'active',
          upstream_link_id: 'entra-link',
          binding_id: 'b'
        }
      ]
    })
    .mockResolvedValueOnce({ rows: [{ binding_id: 'b' }] })
  await expect(
    setInternalCapabilityGrant(
      {
        enrollmentId: 'e',
        capability: 'identity.internal_access.enroll',
        active: true,
        expiresAt: new Date(Date.now() + 60000),
        actorId: input.actorId,
        reason: input.reason
      },
      { authorize: async () => true }
    )
  ).rejects.toMatchObject({ code: 'forbidden' })
  expect(mock.event).not.toHaveBeenCalled()
})
it('active grants require explicit finite future validity', async () => {
  await expect(
    setInternalCapabilityGrant(
      {
        enrollmentId: 'e',
        capability: 'identity.internal_access.enroll',
        active: true,
        actorId: input.actorId,
        reason: input.reason
      },
      { authorize: async () => true, canDelegate: async () => true }
    )
  ).rejects.toMatchObject({ code: 'invalid_request' })
  expect(mock.tx).not.toHaveBeenCalled()
})

it('publishes revocation on the enrollment aggregate with the catalogued event', async () => {
  mock.query.mockImplementation(async (sql: string) => {
    if (sql.startsWith('SELECT environment_id FROM greenhouse_core.internal_native_enrollments'))
      return { rows: [{ environment_id: 'efeonce-auth' }] }
    if (sql.includes('SELECT e.*,b.organization_id'))
      return {
        rows: [
          {
            enrollment_id: 'e',
            status: 'active',
            native_link_id: 'native',
            binding_id: 'binding',
            environment_id: 'efeonce-auth',
            organization_id: 'own-org',
            profile_id: 'person'
          }
        ]
      }
    if (sql.includes('SELECT status FROM')) return { rows: [{ status: 'active' }] }
    if (sql.includes('SELECT binding_id FROM')) return { rows: [{ binding_id: 'binding' }] }
    if (sql.includes('RETURNING grants_version')) return { rows: [{ grants_version: 2 }] }

return { rows: [], rowCount: 1 }
  })
  await revokeInternalNativeIdentity(
    { enrollmentId: 'e', actorId: input.actorId, reason: input.reason },
    { authorize: async () => true }
  )
  expect(mock.event).toHaveBeenCalledWith(
    {
      aggregateType: 'internal_native_enrollment',
      aggregateId: 'e',
      eventType: 'identity.internal_access.revoked',
      payload: { enrollmentId: 'e', actorId: input.actorId }
    },
    expect.anything()
  )
})
