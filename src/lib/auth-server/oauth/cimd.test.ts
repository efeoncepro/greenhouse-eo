import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import type { RequestOptions } from 'node:https'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkCimdClientId, CIMD_FETCH_TIMEOUT_MS, CIMD_MAX_BYTES, isDisallowedAddress, resolveCimdClient } from './cimd'
import { InMemoryOAuthStore } from './store/memory-store'

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }))

// Every production transport invocation is mocked: this suite cannot open a network socket.
vi.mock('node:https', () => ({ request: requestMock }))

const clientId = 'https://client.example.test/metadata.json'
const document = JSON.stringify({ client_id: clientId, redirect_uris: ['https://client.example.test/callback'] })
const result = (body = document, status = 200) => ({ status, body, etag: null, contentType: 'application/json' })
const setup = () => ({ store: new InMemoryOAuthStore(), cacheTtlSeconds: 3600, resolveAddresses: vi.fn(async () => ['8.8.8.8']) })

function mockResponse(chunks: Buffer[], status = 200) {
  const response = Object.assign(new PassThrough(), { statusCode: status, headers: { 'content-type': 'application/json' } })
  const request = Object.assign(new EventEmitter(), { end: vi.fn(), destroy: vi.fn() })

  requestMock.mockImplementation((_url: string, _options: RequestOptions, callback: (response: unknown) => void) => {
    request.end.mockImplementation(() => queueMicrotask(() => {
      callback(response)

      if (!response.destroyed) {
        for (const chunk of chunks) response.write(chunk)
        response.end()
      }
    }))

    return request
  })

  return { request, response }
}

beforeEach(() => requestMock.mockReset())
afterEach(() => vi.useRealTimers())

describe('CIMD address policy (binary parser, no network)', () => {
  it.each(['127.0.0.1', '10.1.1.1', '169.254.169.254', '100.64.0.1', '172.31.0.1', '192.168.0.1',
    '::', '::1', '0:0:0:0:0:0:0:1', 'fe80::1', 'fe90::1', 'febf::1', 'fc00::1', 'fd00::1', 'ff02::1',
    '::ffff:127.0.0.1', '0:0:0:0:0:ffff:7f00:1', '2001:db8::1', '2002:a00:1::', 'fe80::1%en0', 'not-an-ip'])
  ('rejects non-public address %s', address => expect(isDisallowedAddress(address)).toBe(true))

  it.each(['8.8.8.8', '2606:4700:4700::1111', '2606:4700:4700:0:0:0:0:1111'])
  ('accepts public address %s', address => expect(isDisallowedAddress(address)).toBe(false))

  it.each(['http://client.example.test/doc', 'https://localhost/doc', 'https://service.local/doc',
    'https://127.0.0.1/doc', 'https://[::1]/doc', 'https://user:password@client.example.test/doc',
    'https://client.example.test/doc#fragment'])
  ('rejects invalid client URL %s', id => expect(checkCimdClientId(id).ok).toBe(false))

  it('rejects a mixed DNS set before requesting any document', async () => {
    const deps = setup()

    deps.resolveAddresses.mockResolvedValue(['8.8.8.8', '::1'])
    expect(await resolveCimdClient(clientId, deps)).toMatchObject({ ok: false, reason: 'ssrf_blocked_address' })
    expect(requestMock).not.toHaveBeenCalled()
  })
})

describe('CIMD production transport contract (mock HTTPS)', () => {
  it('pins the socket lookup to approved DNS and preserves hostname/TLS verification', async () => {
    const deps = setup()

    mockResponse([Buffer.from(document)])
    expect(await resolveCimdClient(clientId, deps)).toMatchObject({ ok: true, fromCache: false })
    expect(deps.resolveAddresses).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledTimes(1)
    const [url, options] = requestMock.mock.calls[0] as [string, RequestOptions]

    expect(url).toBe(clientId)
    expect(options).toMatchObject({ agent: false, servername: 'client.example.test', rejectUnauthorized: true })
    const callback = vi.fn()

    options.lookup!('client.example.test', {}, callback)
    expect(callback).toHaveBeenLastCalledWith(null, '8.8.8.8', 4)
    options.lookup!('client.example.test', { all: true }, callback)
    expect(callback).toHaveBeenLastCalledWith(null, [{ address: '8.8.8.8', family: 4 }])
    options.lookup!('other.example.test', {}, callback)
    expect(callback.mock.calls.at(-1)?.[0]).toBeInstanceOf(Error)
    expect(deps.resolveAddresses).toHaveBeenCalledTimes(1)
  })

  it('never follows a redirect response', async () => {
    const transport = mockResponse([], 302)

    expect(await resolveCimdClient(clientId, setup())).toMatchObject({ ok: false, reason: 'http_302' })
    expect(requestMock).toHaveBeenCalledTimes(1)
    expect(transport.response.destroyed).toBe(true)
  })

  it('stops a streamed response once the byte budget is exceeded', async () => {
    const transport = mockResponse([Buffer.alloc(CIMD_MAX_BYTES), Buffer.from('x')])

    expect(await resolveCimdClient(clientId, setup())).toMatchObject({ ok: false, reason: 'document_too_large' })
    expect(transport.response.destroyed).toBe(true)
    expect(transport.request.destroy).toHaveBeenCalled()
  })

  it('retains the byte limit for an injected transport', async () => {
    expect(await resolveCimdClient(clientId, { ...setup(), fetcher: async () => result('é'.repeat(CIMD_MAX_BYTES)) }))
      .toMatchObject({ ok: false, reason: 'document_too_large' })
  })

  it('accepts a valid document at the byte boundary', async () => {
    mockResponse([Buffer.from(document.padEnd(CIMD_MAX_BYTES, ' '))])
    expect(await resolveCimdClient(clientId, setup())).toMatchObject({ ok: true })
  })
})

describe('CIMD shared deadline and cache', () => {
  it('bounds an unresolved DNS lookup and does not invoke the transport afterward', async () => {
    vi.useFakeTimers()
    let resolveDns!: (addresses: string[]) => void
    const deps = setup()

    deps.resolveAddresses.mockImplementation(() => new Promise(resolve => { resolveDns = resolve }))
    const pending = resolveCimdClient(clientId, deps)

    await vi.advanceTimersByTimeAsync(CIMD_FETCH_TIMEOUT_MS)
    expect(await pending).toMatchObject({ ok: false, reason: 'dns_unresolvable' })
    resolveDns(['8.8.8.8'])
    await Promise.resolve()
    expect(requestMock).not.toHaveBeenCalled()
  })

  it('shares one budget across DNS and transport, and aborts its signal', async () => {
    vi.useFakeTimers()
    const deps = setup()
    let signal: AbortSignal | undefined

    deps.resolveAddresses.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(['8.8.8.8']), 2000)))

    const pending = resolveCimdClient(clientId, { ...deps, fetcher: async (_url, options) => {
      signal = options.signal
      expect(options.addresses).toEqual(['8.8.8.8'])

      return new Promise(() => {})
    } })

    await vi.advanceTimersByTimeAsync(CIMD_FETCH_TIMEOUT_MS)
    expect(await pending).toMatchObject({ ok: false, reason: 'fetch_failed' })
    expect(signal?.aborted).toBe(true)
  })

  it('serves a validated cached document without DNS or a second socket', async () => {
    const deps = setup()

    mockResponse([Buffer.from(document)])
    await resolveCimdClient(clientId, deps)
    expect(await resolveCimdClient(clientId, deps)).toMatchObject({ ok: true, fromCache: true })
    expect(deps.resolveAddresses).toHaveBeenCalledTimes(1)
    expect(requestMock).toHaveBeenCalledTimes(1)
  })
})
