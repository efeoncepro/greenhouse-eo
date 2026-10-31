import { describe, expect, it, vi } from 'vitest'

import { MemoryFirstPartyStore } from '../first-party/memory-store'
import { registerFirstPartyClient } from '../first-party/registry'
import { InMemoryOAuthStore } from '../oauth/store/memory-store'
import { createMemoryInvitationOtpStore } from './memory-store'
import { createInvitationOtpRuntime } from './runtime'
import { EMAIL_OTP_PREPARE_PATH } from './handler'

async function fixture() {
  const firstPartyStore = new MemoryFirstPartyStore()

  const { clientSecret } = await registerFirstPartyClient({ clientId: 'efeonce-rp-rooms', product: 'rooms', actor: 'fixture',
    redirectUris: ['https://rooms.example.test/auth/callback'] }, { store: firstPartyStore })

  const mailer = { send: vi.fn(async () => ({ status: 'accepted' as const })) }

  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => new Response(JSON.stringify({
    ...JSON.parse(init?.body as string), active: true, email: 'fixture@example.test',
    invitationUrl: `https://rooms.example.test/invite#token=${'a'.repeat(43)}`, roomLabel: 'Room', expiresAt: Date.now() + 600000
  }), { headers: { 'content-type': 'application/json' } }))

  const input = { enabled: true, issuer: 'https://auth.example.test', firstPartyStore,
    store: createMemoryInvitationOtpStore(), mailer, signer: { sign: async () => 'signed-proof' }, auditStore: new InMemoryOAuthStore(),
    env: { AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED: 'true', AUTH_SERVER_INVITATION_EMAIL_OTP_CLIENT_ID: 'efeonce-rp-rooms',
      AUTH_SERVER_INVITATION_EMAIL_OTP_ROOMS_ORIGIN: 'https://rooms.example.test',
      AUTH_SERVER_INVITATION_EMAIL_OTP_HMAC_SECRET: 'h'.repeat(48), ROOMS_INVITATION_AUTHORITY_TOKEN: 's'.repeat(48) }, fetch: fetcher }

  const handler = createInvitationOtpRuntime(input)!

  const request = (extra: Record<string, string> = {}) => ({ method: 'POST', url: new URL(EMAIL_OTP_PREPARE_PATH, input.issuer),
    headers: new Headers({ 'content-type': 'application/json', authorization: `Basic ${Buffer.from(`efeonce-rp-rooms:${clientSecret}`).toString('base64')}`, ...extra }),
    body: JSON.stringify({ invitationId: 'invitation', invitationVersion: '1', recipientReference: 'recipient',
      requestId: 'request-id-fixture-123', requesterKey: 'requester-fixture-123' }) })

  return { input, handler, request, fetcher, mailer, firstPartyStore }
}

describe('invitation OTP runtime boundary', () => {
  it('stays absent with either gate off and needs no secrets', async () => {
    const f = await fixture()

    expect(createInvitationOtpRuntime({ ...f.input, enabled: false, env: {} })).toBeUndefined()
    expect(createInvitationOtpRuntime({ ...f.input, env: {} })).toBeUndefined()
    expect(f.fetcher).not.toHaveBeenCalled()
  })
  it('dispatches one canonical email only for the explicitly eligible confidential Rooms client', async () => {
    const f = await fixture()
    const response = await f.handler(f.request())

    expect(response?.status).toBe(200)
    expect(f.mailer.send).toHaveBeenCalledOnce()
    expect(f.mailer.send.mock.calls[0]).toEqual([expect.objectContaining({ email: 'fixture@example.test', code: expect.stringMatching(/^\d{6}$/) })])
    expect(response?.body).not.toContain('fixture@example.test')
    expect(response?.body).not.toContain('a'.repeat(43))
  })
  it.each<Record<string, string>>([{ cookie: 'session=browser' }, { origin: 'https://rooms.example.test' }, { authorization: 'Bearer wrong-class' }, { authorization: 'Basic malformed' }])('rejects browser/delegated credentials', async extra => {
    const f = await fixture()
    const response = await f.handler(f.request(extra))

    expect(response?.status).toBe(401)
    expect(f.fetcher).not.toHaveBeenCalled()
    expect(f.mailer.send).not.toHaveBeenCalled()
  })
  it.each(['suspended', 'retired'] as const)('honors client %s before canonical lookup', async status => {
    const f = await fixture()

    f.firstPartyStore.clients.get('efeonce-rp-rooms')!.status = status
    expect((await f.handler(f.request()))?.status).toBe(401)
    expect(f.fetcher).not.toHaveBeenCalled()
  })
})
