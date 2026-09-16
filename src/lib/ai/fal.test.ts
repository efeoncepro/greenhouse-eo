import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const secrets: Record<string, string | null> = {}

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret: async ({ envVarName }: { envVarName: string }) => ({ value: secrets[envVarName] ?? null, source: 'env' })
}))

import { awaitFalRequest, getFalAccountBalances, isFalBalanceLock, resetFalAccountsForTests, runFalModel } from '@/lib/ai/fal'

const KEY_A = 'a:aaaa'
const KEY_B = 'b:bbbb'
const LOCK = { detail: 'User is locked. Reason: Exhausted balance. Top up your balance at fal.ai/dashboard/billing.' }

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

type Route = (url: string, key: string, init?: RequestInit) => Response | undefined

const installFetch = (route: Route) => {
  const calls: { url: string; key: string }[] = []

  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const key = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '').replace('Key ', '')

    calls.push({ url, key })

    return route(url, key, init) ?? json(404, { detail: 'not mocked' })
  }))

  return calls
}

const balances = (a: string, b: string): Route => (url, key) =>
  url.endsWith('/billing/user_balance') ? new Response(key === KEY_A ? a : b, { status: 200 }) : undefined

const completedJob: Route = url => {
  if (url.endsWith('/status')) return json(200, { status: 'COMPLETED' })
  if (url.includes('/requests/')) return json(200, { video: { url: 'https://v3b.fal.media/x.mp4' } })

  return undefined
}

describe('cliente fal con varias cuentas', () => {
  beforeEach(() => {
    resetFalAccountsForTests()
    secrets.FAL_API_KEY = KEY_A
    secrets.FAL_API_KEY_B = KEY_B
    vi.unstubAllGlobals()
  })

  it('reconoce el 403 de bloqueo por saldo y no otros 403', () => {
    expect(isFalBalanceLock(403, LOCK.detail)).toBe(true)
    expect(isFalBalanceLock(403, 'User is locked. Reason: TOP_UP.')).toBe(true)
    expect(isFalBalanceLock(403, 'This API key is not permitted to perform this action.')).toBe(false)
    expect(isFalBalanceLock(422, LOCK.detail)).toBe(false)
  })

  it('lista el saldo de cada cuenta configurada sin exponer claves', async () => {
    installFetch(balances('-3.86', '50.0'))

    expect(await getFalAccountBalances()).toEqual([
      { account: 'FAL_API_KEY', balance: -3.86 },
      { account: 'FAL_API_KEY_B', balance: 50 }
    ])
  })

  // Caso fuente 2026-09-16: la cuenta declarada primero estaba en −3,86 y la recargada era la otra.
  it('encola con la cuenta que tiene saldo aunque esté declarada segunda', async () => {
    const calls = installFetch((url, key, init) =>
      balances('-3.86', '50.0')(url, key) ??
      (init?.method === 'POST' ? json(200, { request_id: 'r1' }) : completedJob(url, key))
    )

    const result = await runFalModel({ model: 'alibaba/wan-3.0/text-to-video', input: { prompt: 'x' }, pollIntervalMs: 1 })

    expect(result.ok).toBe(true)
    expect(result.account).toBe('FAL_API_KEY_B')
    expect(calls.filter(call => call.url.startsWith('https://queue.fal.run')).every(call => call.key === KEY_B)).toBe(true)
  })

  it('pasa a la otra cuenta si fal bloquea por saldo al encolar', async () => {
    // Saldos ilegibles: se respeta el orden declarado y el failover ocurre en caliente.
    const calls = installFetch((url, key, init) => {
      if (url.endsWith('/billing/user_balance')) return json(500, {})
      if (init?.method === 'POST') return key === KEY_A ? json(403, LOCK) : json(200, { request_id: 'r2' })

      return completedJob(url, key)
    })

    const result = await runFalModel({ model: 'alibaba/wan-3.0/text-to-video', input: { prompt: 'x' }, pollIntervalMs: 1 })

    expect(result.ok).toBe(true)
    expect(result.account).toBe('FAL_API_KEY_B')
    expect(calls.filter(call => call.url === 'https://queue.fal.run/alibaba/wan-3.0/text-to-video').map(c => c.key)).toEqual([KEY_A, KEY_B])
  })

  it('no hace failover ante un error que no es de saldo', async () => {
    const calls = installFetch((url, key, init) => {
      if (url.endsWith('/billing/user_balance')) return json(500, {})
      if (init?.method === 'POST') return json(422, { detail: [{ msg: 'Field required' }] })

      return undefined
    })

    const result = await runFalModel({ model: 'alibaba/wan-3.0/text-to-video', input: {}, pollIntervalMs: 1 })

    expect(result.ok).toBe(false)
    expect(result.httpStatus).toBe(422)
    expect(calls.filter(call => call.url.startsWith('https://queue.fal.run'))).toHaveLength(1)
  })

  it('con --fal-account no cambia de cuenta aunque esté bloqueada', async () => {
    installFetch((url, key, init) => {
      if (url.endsWith('/billing/user_balance')) return json(500, {})
      if (init?.method === 'POST') return key === KEY_A ? json(403, LOCK) : json(200, { request_id: 'r3' })

      return undefined
    })

    const result = await runFalModel({ model: 'm/x/y', input: {}, account: 'FAL_API_KEY', pollIntervalMs: 1 })

    expect(result.ok).toBe(false)
    expect(result.account).toBe('FAL_API_KEY')
  })

  it('retoma un request buscándolo en la cuenta que lo creó', async () => {
    const calls = installFetch((url, key) => {
      if (url.endsWith('/billing/user_balance')) return new Response(key === KEY_A ? '10' : '5', { status: 200 })
      if (url.includes('/requests/r4')) return key === KEY_B ? completedJob(url, key) : json(404, { detail: 'Request not found' })

      return undefined
    })

    const result = await awaitFalRequest({ model: 'alibaba/wan-3.0/text-to-video', requestId: 'r4', pollIntervalMs: 1 })

    expect(result.ok).toBe(true)
    expect(result.account).toBe('FAL_API_KEY_B')
    expect(calls.some(call => call.url.includes('/requests/r4') && call.key === KEY_A)).toBe(true)
  })

  it('funciona con una sola cuenta configurada', async () => {
    secrets.FAL_API_KEY_B = null
    installFetch((url, key, init) => (init?.method === 'POST' ? json(200, { request_id: 'r5' }) : completedJob(url, key)))

    const result = await runFalModel({ model: 'alibaba/wan-3.0/text-to-video', input: { prompt: 'x' }, pollIntervalMs: 1 })

    expect(result.ok).toBe(true)
    expect(result.account).toBe('FAL_API_KEY')
  })
})
