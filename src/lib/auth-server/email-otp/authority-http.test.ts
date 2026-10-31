import { describe, expect, it, vi } from 'vitest'

import { createHttpInvitationAuthority, INVITATION_AUTHORITY_PATH } from './authority-http'

const binding = { clientId: 'efeonce-rp-rooms', invitationId: 'invitation', invitationVersion: '1', recipientReference: 'opaque' }
const origin = 'https://rooms.example.test'
const token = 'x'.repeat(48)
const valid = { ...binding, active: true, email: 'fixture@example.test', invitationUrl: `${origin}/invite#token=${'a'.repeat(43)}`, roomLabel: 'Room', expiresAt: Date.now() + 60000 }
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })

describe('canonical invitation HTTP authority', () => {
  it('uses only the configured endpoint, dedicated credentials and exact opaque bindings', async () => {
    const fetcher = vi.fn(async () => json(valid))
    const authority = createHttpInvitationAuthority({ roomsOrigin: origin, serviceToken: token, fetch: fetcher })

    expect(await authority.resolve(binding)).toEqual(expect.objectContaining(binding))
    const [url, request] = fetcher.mock.calls[0] as unknown as [URL, RequestInit]

    expect(url.href).toBe(origin + INVITATION_AUTHORITY_PATH)
    expect(request).toMatchObject({ redirect: 'error', cache: 'no-store', method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Efeonce-Audience': origin } })
    expect(JSON.parse(request.body as string)).toEqual(binding)
    await authority.resolve(binding)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it.each([
    { ...valid, clientId: 'efeonce-rp-another' }, { ...valid, invitationVersion: 'old' },
    { ...valid, invitationUrl: 'https://evil.test/i/token' }, { ...valid, expiresAt: 0 },
    { ...valid, active: false }, { ...valid, invitationUrl: `${origin}/i/token#secret` },
    { ...valid, unexpected: 'field' },
    { ...valid, invitationUrl: `${origin}/invite?token=${'a'.repeat(43)}` },
    { ...valid, invitationUrl: `${origin}/invite?source=email#token=${'a'.repeat(43)}` },
    { ...valid, invitationUrl: `${origin}/elsewhere#token=${'a'.repeat(43)}` },
    { ...valid, invitationUrl: `${origin}/invite#token=${'a'.repeat(42)}` },
    { ...valid, invitationUrl: `${origin}/invite#token=${'a'.repeat(44)}` },
    { ...valid, invitationUrl: `${origin}/invite#token=${'a'.repeat(43)}&extra=1` },
    { ...valid, invitationUrl: `https://user:pass@rooms.example.test/invite#token=${'a'.repeat(43)}` }
  ])('denies invalid canonical results', async value => {
    const authority = createHttpInvitationAuthority({ roomsOrigin: origin, serviceToken: token, fetch: async () => json(value) })

    expect(await authority.resolve(binding)).toBeNull()
  })
  it('bounds a chunked body without trusting content-length', async () => {
    const authority = createHttpInvitationAuthority({ roomsOrigin: origin, serviceToken: token,
      fetch: async () => new Response(' '.repeat(9000), { headers: { 'Content-Type': 'application/json' } }) })

    expect(await authority.resolve(binding)).toBeNull()
  })
  it('fails closed without exposing upstream exceptions', async () => {
    const authority = createHttpInvitationAuthority({ roomsOrigin: origin, serviceToken: token,
      fetch: async () => { throw new Error('sensitive upstream failure') } })

    expect(await authority.resolve(binding)).toBeNull()
  })
  it.each(['http://rooms.example.test', origin + '/path', 'https://user:secret@rooms.example.test'])('rejects unsafe origins %s', roomsOrigin => {
    expect(() => createHttpInvitationAuthority({ roomsOrigin, serviceToken: token })).toThrow()
  })
})
