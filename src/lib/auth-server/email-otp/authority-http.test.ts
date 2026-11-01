import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

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
  it('does not forward its credential across a real HTTP redirect on loopback', async () => {
    let redirectedRequests = 0

    const destination = createServer((_request, response) => {
      redirectedRequests += 1
      response.end('unexpected redirect')
    })

    const sourceRequests: Array<{ path: string | undefined; authorization: string | undefined }> = []

    const source = createServer((request, response) => {
      sourceRequests.push({ path: request.url, authorization: request.headers.authorization })
      response.writeHead(302, { Location: `http://127.0.0.1:${(destination.address() as AddressInfo).port}/capture` })
      response.end()
    })

    try {
      await new Promise<void>(resolve => destination.listen(0, '127.0.0.1', resolve))
      await new Promise<void>(resolve => source.listen(0, '127.0.0.1', resolve))
      const roomsOrigin = `http://127.0.0.1:${(source.address() as AddressInfo).port}`
      const authority = createHttpInvitationAuthority({ roomsOrigin, serviceToken: token, allowLocalDevelopment: true })

      expect(await authority.resolve(binding)).toBeNull()
      expect(sourceRequests).toEqual([{ path: INVITATION_AUTHORITY_PATH, authorization: `Bearer ${token}` }])
      expect(redirectedRequests).toBe(0)
    } finally {
      await Promise.all([source, destination].map(server => new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve())
      })))
    }
  })
  it('rejects a real chunked response over 8192 bytes while accepting the bounded control', async () => {
    let requests = 0
    let roomsOrigin = ''

    const server = createServer((_request, response) => {
      requests += 1
      const payload = JSON.stringify({ ...valid, invitationUrl: `${roomsOrigin}/invite#token=${'a'.repeat(43)}` })

      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.write(payload)
      response.end(requests === 1 ? ' '.repeat(9000) : '')
    })

    try {
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
      roomsOrigin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
      const authority = createHttpInvitationAuthority({ roomsOrigin, serviceToken: token, allowLocalDevelopment: true })

      expect(await authority.resolve(binding)).toBeNull()
      expect(await authority.resolve(binding)).toEqual(expect.objectContaining(binding))
      expect(requests).toBe(2)
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  }, 10_000)
  it('fails closed without exposing upstream exceptions', async () => {
    const authority = createHttpInvitationAuthority({ roomsOrigin: origin, serviceToken: token,
      fetch: async () => { throw new Error('sensitive upstream failure') } })

    expect(await authority.resolve(binding)).toBeNull()
  })
  it.each(['http://rooms.example.test', origin + '/path', 'https://user:secret@rooms.example.test'])('rejects unsafe origins %s', roomsOrigin => {
    expect(() => createHttpInvitationAuthority({ roomsOrigin, serviceToken: token })).toThrow()
  })
})
