import { describe, expect, it, vi } from 'vitest'

import { createInvitationEmailOtp } from './core'
import { createMemoryInvitationOtpStore } from './memory-store'
import { createInvitationOtpHandler } from './handler'
import type { AuthorizedInvitation, InvitationDelivery, InvitationProofClaims, InvitationProofSigner } from './types'

function fixture() {
  let clock = 1_800_000_000_000
  const sent: InvitationDelivery[] = []
  const signed: InvitationProofClaims[] = []
  let authorized: AuthorizedInvitation | null = {
    clientId: 'efeonce-rp-rooms', invitationId: 'invite-one', invitationVersion: '1', recipientReference: 'recipient-one',
    email: 'synthetic@example.test', invitationUrl: `https://rooms.example.test/invite#token=${'a'.repeat(43)}`, roomLabel: 'Synthetic', expiresAt: clock + 86_400_000
  }
  const authority = { resolve: vi.fn(async () => authorized) }

  const mailer = { send: vi.fn(async (mail: InvitationDelivery) => { sent.push(mail);

return { status: 'accepted' as const } }) }

  const signer = { sign: vi.fn<InvitationProofSigner['sign']>(async (claims: InvitationProofClaims) => { signed.push(claims);

return 'synthetic-proof' }) }

  const store = createMemoryInvitationOtpStore()

  const config = { store, authority, mailer, signer, audit: { record: vi.fn(async () => {}) }, hmacSecret: 'synthetic-secret-at-least-32-bytes-long',
    issuer: 'https://auth.example.test', roomsOrigin: 'https://rooms.example.test', now: () => clock }

  const core = createInvitationEmailOtp(config)

  const input = { clientId: authorized.clientId, invitationId: authorized.invitationId, invitationVersion: '1',
    recipientReference: 'recipient-one', requestId: 'request-0000000001', requesterKey: 'requester-hash-00001' }

  const request = async () => {
    const result = await core.prepare(input)

    if (!result.ok) throw new Error('fixture prepare failed')

    return { ...input, challengeId: result.challengeId, code: sent.at(-1)!.code, nonce: 'nonce-synthetic-at-least-32-characters' }
  }

  return { core, config, authority, mailer, signer, store, sent, signed, input, request,
    advance: (ms: number) => { clock += ms }, revoke: () => { authorized = null },
    change: (fields: Partial<AuthorizedInvitation>) => { authorized = { ...authorized!, ...fields } } }
}

describe('invitation email OTP', () => {
  it('sends one email, persists only HMAC and returns no credential', async () => {
    const f = fixture()
    const result = await f.core.prepare(f.input)

    expect(result.ok).toBe(true)
    expect(f.sent).toHaveLength(1)
    expect(f.sent[0].code).toMatch(/^\d{6}$/)
    expect(JSON.stringify(result)).not.toContain(f.sent[0].code)
    expect(JSON.stringify(result)).not.toContain('a'.repeat(43))
    expect(await f.core.prepare(f.input)).toEqual(result)
    expect(f.sent).toHaveLength(1)
  })
  it('only one concurrent verification produces a bounded, RP-bound proof', async () => {
    const f = fixture()
    const input = await f.request()
    const results = await Promise.all([f.core.verify(input), f.core.verify(input)])

    expect(results.filter(result => result.ok)).toHaveLength(1)
    expect(f.signed).toHaveLength(1)
    expect(f.signed[0]).toMatchObject({ aud: f.input.clientId, nonce: input.nonce, invitationVersion: '1', amr: ['email_otp'] })
    expect(f.signed[0].exp - f.signed[0].iat).toBe(120)
    expect(f.signed[0]).not.toHaveProperty('email')
    expect(f.signed[0]).not.toHaveProperty('profileId')
    expect(f.signer.sign.mock.calls[0][1]).toEqual({ alg: 'ES256', typ: 'rooms-invitation-proof+jwt' })
  })
  it('blocks after five attempts even if challenge/version is rotated', async () => {
    const f = fixture()
    const input = await f.request()
    const wrong = input.code === '000000' ? '000001' : '000000'

    for (let i = 0; i < 5; i++) expect(await f.core.verify({ ...input, code: wrong })).toEqual({ ok: false, error: 'invalid_code' })
    f.advance(60_001)
    f.change({ invitationVersion: '2' })
    const next = await f.core.prepare({ ...f.input, invitationVersion: '2', requestId: 'request-0000000002' })

    expect(next.ok).toBe(true)
    if (!next.ok) return
    expect(await f.core.verify({ ...input, invitationVersion: '2', challengeId: next.challengeId, code: f.sent[1].code }))
      .toEqual({ ok: false, error: 'rate_limited' })
  })
  it('fails closed on audit outage for both initial send and idempotent retry without sending twice', async () => {
    const f = fixture()

    f.config.audit.record.mockRejectedValue(new Error('synthetic audit outage'))
    expect(await f.core.prepare(f.input)).toEqual({ ok: false, error: 'unavailable' })
    expect(await f.core.prepare(f.input)).toEqual({ ok: false, error: 'unavailable' })
    expect(f.mailer.send).toHaveBeenCalledTimes(1)
    expect(f.config.audit.record).toHaveBeenCalledTimes(2)
    f.config.audit.record.mockResolvedValue(undefined)
    expect(await f.core.prepare(f.input)).toMatchObject({ ok: true, deliveryStatus: 'accepted' })
    expect(f.mailer.send).toHaveBeenCalledTimes(1)
  })

  it('enforces cooldown, invalidates old code and never replays old requestId delivery', async () => {
    const f = fixture()
    const first = await f.request()

    expect(await f.core.prepare({ ...f.input, requestId: 'request-0000000002' })).toEqual({ ok: false, error: 'rate_limited' })
    f.advance(60_001)
    const next = await f.core.prepare({ ...f.input, requestId: 'request-0000000002' })

    expect(next.ok).toBe(true)
    expect(await f.core.verify(first)).toEqual({ ok: false, error: 'invalid_code' })
    f.advance(60_001)
    expect((await f.core.prepare(f.input)).ok).toBe(false)
    expect(f.sent).toHaveLength(2)
  })
  it('enforces send budgets across request IDs', async () => {
    const f = fixture()

    for (let i = 0; i < 3; i++) {
      expect((await f.core.prepare({ ...f.input, requestId: `request-000000000${i}` })).ok).toBe(true)
      f.advance(60_001)
    }

    expect(await f.core.prepare({ ...f.input, requestId: 'request-0000000009' })).toEqual({ ok: false, error: 'rate_limited' })
  })
  it('rejects expiry and revoked authority', async () => {
    const f = fixture()
    const input = await f.request()

    f.advance(600_001)
    expect(await f.core.verify(input)).toEqual({ ok: false, error: 'invalid_code' })
    f.revoke()
    expect(await f.core.verify(input)).toEqual({ ok: false, error: 'invalid_invitation' })
  })
  it('rejects mismatched RP, version, recipient and malicious destination', async () => {
    const f = fixture()
    const input = await f.request()

    for (const change of [{ clientId: 'other-rp' }, { invitationVersion: '2' }, { recipientReference: 'other' }]) {
      expect(await f.core.verify({ ...input, ...change })).toEqual({ ok: false, error: 'invalid_invitation' })
    }

    f.change({ invitationUrl: 'https://attacker.example.test/link' })
    expect(await f.core.prepare(f.input)).toEqual({ ok: false, error: 'invalid_invitation' })
  })
  it.each([
    `https://rooms.example.test/invite?token=${'a'.repeat(43)}`,
    `https://rooms.example.test/invite?source=email#token=${'a'.repeat(43)}`,
    `https://rooms.example.test/other#token=${'a'.repeat(43)}`,
    `https://rooms.example.test/invite#token=${'a'.repeat(42)}`,
    `https://rooms.example.test/invite#token=${'a'.repeat(43)}&extra=1`,
    `https://another.example.test/invite#token=${'a'.repeat(43)}`
  ])('rejects noncanonical invitation links before both delivery and verification', async invitationUrl => {
    const f = fixture()
    const input = await f.request()

    f.change({ invitationUrl })
    expect(await f.core.prepare({ ...f.input, requestId: 'request-0000000002' })).toEqual({ ok: false, error: 'invalid_invitation' })
    expect(await f.core.verify(input)).toEqual({ ok: false, error: 'invalid_invitation' })
    expect(f.sent).toHaveLength(1)
    expect(f.signer.sign).not.toHaveBeenCalled()
  })

  it('blocks changed recipient address without an authority version change', async () => {
    const f = fixture()
    const input = await f.request()

    f.change({ email: 'changed@example.test' })
    expect(await f.core.verify(input)).toEqual({ ok: false, error: 'invalid_code' })
  })
  it('unknown mailer outcomes fail closed and are not retried', async () => {
    const f = fixture()

    f.mailer.send.mockRejectedValueOnce(new Error('secret provider payload'))
    expect(await f.core.prepare(f.input)).toEqual({ ok: false, error: 'delivery_failed' })
    expect((await f.core.prepare(f.input)).ok).toBe(false)
    expect(f.mailer.send).toHaveBeenCalledTimes(1)
  })
  it('pending delivery cannot authenticate and concurrent prepare does not duplicate mail', async () => {
    const f = fixture()
    let release!: () => void
    const waiting = new Promise<void>(resolve => { release = resolve })

    f.mailer.send.mockImplementationOnce(async mail => { f.sent.push(mail); await waiting;

return { status: 'accepted' } })
    const first = f.core.prepare(f.input)

    await vi.waitFor(() => expect(f.sent).toHaveLength(1))
    const second = await f.core.prepare(f.input)

    expect(second.ok && second.deliveryStatus).toBe('pending')
    if (second.ok) expect((await f.core.verify({ ...f.input, challengeId: second.challengeId, code: f.sent[0].code,
      nonce: 'nonce-synthetic-at-least-32-characters' })).ok).toBe(false)
    release()
    expect((await first).ok).toBe(true)
    expect(f.sent).toHaveLength(1)
  })
  it('signer failure burns the code and cannot emit a proof on retry', async () => {
    const f = fixture()
    const input = await f.request()

    f.signer.sign.mockRejectedValueOnce(new Error('kms unavailable'))
    expect(await f.core.verify(input)).toEqual({ ok: false, error: 'unavailable' })
    expect(await f.core.verify(input)).toEqual({ ok: false, error: 'invalid_code' })
  })
  it('rechecks revocation after consuming and before signing', async () => {
    const f = fixture()
    const input = await f.request()

    f.authority.resolve.mockResolvedValueOnce(await f.authority.resolve()).mockResolvedValueOnce(null)
    expect(await f.core.verify(input)).toEqual({ ok: false, error: 'invalid_invitation' })
    expect(f.signer.sign).not.toHaveBeenCalled()
  })
  it('fails startup on short HMAC secret and insecure origins', () => {
    const f = fixture()

    expect(() => createInvitationEmailOtp({ ...f.config, hmacSecret: 'short' })).toThrow()
    expect(() => createInvitationEmailOtp({ ...f.config, roomsOrigin: 'http://public.example.test' })).toThrow()
  })
  it('HTTP accepts IDs only and derives client identity from authenticated port', async () => {
    const f = fixture()
    const auth = { authenticate: vi.fn(async () => ({ clientId: f.input.clientId })) }
    const handler = createInvitationOtpHandler(f.core, auth)

    const body = { invitationId: f.input.invitationId, invitationVersion: f.input.invitationVersion,
      recipientReference: f.input.recipientReference, requestId: f.input.requestId, requesterKey: f.input.requesterKey }

    const req = { method: 'POST', url: new URL('https://auth.example.test/auth/invitations/email-otp/prepare'),
      headers: new Headers({ 'content-type': 'application/json' }), body: JSON.stringify(body) }

    expect((await handler(req))?.status).toBe(200)
    expect((await handler({ ...req, body: JSON.stringify({ ...body, email: 'intruder@example.test' }) }))?.status).toBe(400)
    expect((await handler({ ...req, method: 'GET' }))?.status).toBe(405)
    auth.authenticate.mockResolvedValueOnce(null as never)
    expect((await handler(req))?.status).toBe(401)
  })
})
