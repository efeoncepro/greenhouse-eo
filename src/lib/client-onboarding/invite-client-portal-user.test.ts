/**
 * TASK-1001 — helper SSOT inviteClientPortalUser (idempotente, onExisting modes).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const txMock = vi.fn()
const generateTokenMock = vi.fn()
const storeTokenMock = vi.fn()
const sendEmailMock = vi.fn()
const publishOutboxMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: (...a: unknown[]) => txMock(...a)
}))
vi.mock('@/lib/auth-tokens', () => ({
  generateToken: (...a: unknown[]) => generateTokenMock(...a),
  storeToken: (...a: unknown[]) => storeTokenMock(...a)
}))
vi.mock('@/lib/email/delivery', () => ({
  sendEmail: (...a: unknown[]) => sendEmailMock(...a)
}))
vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...a: unknown[]) => publishOutboxMock(...a)
}))
vi.mock('@/lib/sync/event-catalog', () => ({
  AGGREGATE_TYPES: { roleAssignment: 'role_assignment' },
  EVENT_TYPES: { roleAssigned: 'role.assigned' }
}))

import { ClientPortalInviteError, inviteClientPortalUser } from './invite-client-portal-user'

type ClientOpts = { existing?: boolean; roleInserted?: boolean }

const makeClient = (opts: ClientOpts) => ({
  query: vi.fn(async (text: string) => {
    if (text.includes('SELECT user_id FROM greenhouse_core.client_users')) {
      return { rows: opts.existing ? [{ user_id: 'existing-user' }] : [] }
    }

    if (text.includes('INSERT INTO greenhouse_core.client_users')) {
      return { rows: [{ user_id: 'new-user' }] }
    }

    if (text.includes('INSERT INTO greenhouse_core.user_role_assignments')) {
      return { rows: opts.roleInserted === false ? [] : [{ assignment_id: 'ura-x' }] }
    }

    
return { rows: [] }
  })
})

const wireTx = (opts: ClientOpts) => {
  const client = makeClient(opts)

  txMock.mockImplementation(async (cb: (c: unknown) => Promise<unknown>) => cb(client))
  
return client
}

const baseInput = {
  email: ' Ana@Sky.com ',
  fullName: 'Ana Pérez',
  clientId: 'client-sky',
  roleCodes: ['client_executive'],
  actorUserId: 'actor-1',
  actorName: 'Admin',
  actorEmail: 'admin@efeonce.org',
  onExisting: 'error' as const
}

beforeEach(() => {
  generateTokenMock.mockResolvedValue('tok-123')
  storeTokenMock.mockResolvedValue(undefined)
  sendEmailMock.mockResolvedValue({ status: 'sent' })
  publishOutboxMock.mockResolvedValue('outbox-1')
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('inviteClientPortalUser', () => {
  it('crea usuario nuevo, normaliza email, asigna rol, emite role.assigned y envía email', async () => {
    wireTx({ existing: false, roleInserted: true })

    const result = await inviteClientPortalUser(baseInput)

    expect(result).toMatchObject({ userId: 'new-user', email: 'ana@sky.com', created: true, emailSent: true })
    expect(result.rolesAssigned).toEqual(['client_executive'])
    expect(publishOutboxMock).toHaveBeenCalledTimes(1)
    expect(publishOutboxMock.mock.calls[0][0]).toMatchObject({ eventType: 'role.assigned' })
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })

  it('onExisting=error: email existente lanza 409 sin crear ni emailear', async () => {
    wireTx({ existing: true })

    await expect(inviteClientPortalUser(baseInput)).rejects.toMatchObject({
      code: 'email_already_registered',
      statusCode: 409
    })
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('onExisting=ensure: email existente reusa user, asegura rol additive, NO re-emaila (idempotente)', async () => {
    wireTx({ existing: true, roleInserted: true })

    const result = await inviteClientPortalUser({ ...baseInput, onExisting: 'ensure' })

    expect(result).toMatchObject({ userId: 'existing-user', created: false, emailSent: false })
    expect(result.rolesAssigned).toEqual(['client_executive'])
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('ensure: rol ya existente (ON CONFLICT) no se cuenta ni emite evento', async () => {
    wireTx({ existing: true, roleInserted: false })

    const result = await inviteClientPortalUser({ ...baseInput, onExisting: 'ensure' })

    expect(result.rolesAssigned).toEqual([])
    expect(publishOutboxMock).not.toHaveBeenCalled()
  })

  it('rechaza rol fuera de ROLE_CODES con 422 antes de tocar la DB', async () => {
    wireTx({ existing: false })

    await expect(
      inviteClientPortalUser({ ...baseInput, roleCodes: ['devops_operator'] })
    ).rejects.toMatchObject({ code: 'invalid_role', statusCode: 422 })
    expect(txMock).not.toHaveBeenCalled()
  })

  it('rechaza campos faltantes con 400', async () => {
    await expect(
      inviteClientPortalUser({ ...baseInput, email: '   ' })
    ).rejects.toBeInstanceOf(ClientPortalInviteError)
    expect(txMock).not.toHaveBeenCalled()
  })

  it('email delivery failed → created true pero emailSent false (no rompe)', async () => {
    wireTx({ existing: false, roleInserted: true })
    sendEmailMock.mockResolvedValue({ status: 'failed', error: 'resend down' })

    const result = await inviteClientPortalUser(baseInput)

    expect(result.created).toBe(true)
    expect(result.emailSent).toBe(false)
  })
})
