import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const issueMock = vi.fn()
const listMock = vi.fn()
const configMock = vi.fn(() => ({ delegatedAuthorityEnabled: true }))

vi.mock('@/lib/identity/external-access', () => ({
  issueDelegatedExternalInvitation: (...args: unknown[]) => issueMock(...args),
  listDelegatedExternalInvitations: (...args: unknown[]) => listMock(...args),
  readExternalInvitationConfig: () => configMock()
}))

const { ExternalAccessError } = await import('@/lib/identity/external-access/errors')

const { createEcosystemDelegatedInvitation, listEcosystemDelegatedInvitations } = await import(
  './ecosystem-identity-invitations'
)

const internalContext = { binding: { greenhouseScopeType: 'internal' } } as never
const clientContext = { binding: { greenhouseScopeType: 'organization' } } as never

describe('TASK-1837 — ecosystem delegated invitations lane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configMock.mockReturnValue({ delegatedAuthorityEnabled: true })
  })

  it('is a 404 (anti-oracle) when the flag is OFF or the consumer is not the internal gateway', async () => {
    configMock.mockReturnValue({ delegatedAuthorityEnabled: false })
    await expect(createEcosystemDelegatedInvitation({ context: internalContext, body: {} })).rejects.toMatchObject({
      statusCode: 404
    })

    configMock.mockReturnValue({ delegatedAuthorityEnabled: true })
    await expect(
      listEcosystemDelegatedInvitations({ context: clientContext, request: new Request('https://x/?environment=e&subject=s&bindingId=b') })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('maps domain errors to the lane contract: forbidden 403, self-elevation 422, seat cap 422, rate 429', async () => {
    const cases: Array<[ConstructorParameters<typeof ExternalAccessError>[0], number]> = [
      ['forbidden', 403],
      ['invalid_request', 422],
      ['limit_reached', 422],
      ['rate_limited', 429]
    ]

    for (const [code, status] of cases) {
      issueMock.mockRejectedValueOnce(new ExternalAccessError(code, 'x'))

      await expect(
        createEcosystemDelegatedInvitation({
          context: internalContext,
          body: { environment: 'e', subject: 's', bindingId: 'b', email: 'a@c.cl' }
        })
      ).rejects.toMatchObject({ statusCode: status, details: expect.objectContaining({ domainCode: code }) })
    }
  })

  it('never returns the token, only delivery', async () => {
    issueMock.mockResolvedValueOnce({
      invitation: { invitationId: 'xmi-1' },
      token: 'secret',
      created: true,
      delivery: { mode: 'system', status: 'sent', attempts: 1, recipientMasked: 'a***@c.cl', errorCode: null }
    })

    const payload = await createEcosystemDelegatedInvitation({
      context: internalContext,
      body: { environment: 'e', subject: 's', bindingId: 'b', email: 'a@c.cl', designatedAdmin: true }
    })

    expect(JSON.stringify(payload)).not.toContain('secret')
    expect(issueMock).toHaveBeenCalledWith(expect.objectContaining({ designatedAdmin: true, bindingId: 'b' }))
  })
})
