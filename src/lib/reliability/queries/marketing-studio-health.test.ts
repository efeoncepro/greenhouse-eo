import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({ captureWithDomain: vi.fn() }))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mocks.captureWithDomain(...args)
}))

vi.mock('@/lib/secrets/secret-manager', () => ({ resolveSecret: vi.fn(async () => ({ value: null })) }))

const TOKEN = `mst_${'C'.repeat(43)}`

const health = (patch: Record<string, unknown> = {}) => ({
  status: 'ok',
  version: '1.1.0',
  accessMode: 'open',
  observedAt: '2026-09-26T12:00:00.000Z',
  components: [
    { name: 'database', state: 'ok', latencyMs: 12 },
    { name: 'database_connections', state: 'ok', used: 3, limit: 20 },
    { name: 'media_bucket', state: 'ok' },
    { name: 'greenhouse_metrics', state: 'not_configured' },
    { name: 'media_worker', state: 'not_configured' }
  ],
  freshness: [
    { name: 'catalog_import', state: 'ok', ageSeconds: 1000, thresholdSeconds: 604800 },
    { name: 'restore_rehearsal', state: 'ok', ageSeconds: 86400, thresholdSeconds: 3888000 },
    { name: 'rights_expiring', state: 'not_configured' }
  ],
  ...patch
})

const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const load = async () => (await import('./marketing-studio-health')).getMarketingStudioHealthSignal

const signalFor = async (res: Response | Error, token: string | null = TOKEN) => {
  const get = await load()

  const fetchImpl = vi.fn(async () => {
    if (res instanceof Error) throw res

    return res
  })

  const signal = await get({ fetchImpl: fetchImpl as unknown as typeof fetch, resolveToken: async () => token, url: 'https://studio.test/api/v1/health?deep=1' })

  return { signal, fetchImpl }
}

describe('getMarketingStudioHealthSignal', () => {
  it('ok cuando todo está ok o not_configured, en el módulo platform', async () => {
    const { signal, fetchImpl } = await signalFor(response(200, health()))

    expect(signal.signalId).toBe('platform.marketing_studio.health')
    expect(signal.moduleKey).toBe('platform')
    expect(signal.kind).toBe('runtime')
    expect(signal.severity).toBe('ok')
    expect(signal.evidence.find(e => e.label === 'not_configured')?.value).toContain('greenhouse_metrics')
    expect(fetchImpl).toHaveBeenCalledWith('https://studio.test/api/v1/health?deep=1', expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }) }))
  })

  it('warning con cualquier degradación', async () => {
    const { signal } = await signalFor(response(200, health({ status: 'degraded', freshness: [{ name: 'overdue_unverified_posts', state: 'degraded', count: 2, code: 'posts_pending_verification' }] })))

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('overdue_unverified_posts=degraded(posts_pending_verification) count=2')
  })

  it('error si el último ensayo de restauración falló o tiene más de 45 días', async () => {
    for (const code of ['last_rehearsal_failed', 'rehearsal_stale']) {
      const { signal } = await signalFor(response(200, health({ status: 'degraded', freshness: [{ name: 'restore_rehearsal', state: 'down', code }] })))

      expect(signal.severity).toBe('error')
      expect(signal.summary).toContain(code)
    }
  })

  it('error si un componente está down (conexiones saturadas)', async () => {
    const { signal } = await signalFor(response(200, health({ status: 'degraded', components: [{ name: 'database_connections', state: 'down', used: 19, limit: 20, code: 'connections_saturated' }] })))

    expect(signal.severity).toBe('error')
  })

  it('error si la base de Studio no responde (503 con el contrato de errores o health down)', async () => {
    expect((await signalFor(response(503, { error: 'x', code: 'database_unavailable', actionable: true }))).signal.severity).toBe('error')
    expect((await signalFor(response(503, health({ status: 'down', components: [{ name: 'database', state: 'down', code: 'unreachable' }] })))).signal.severity).toBe('error')
  })

  it('unknown sin credencial, con credencial rechazada, payload inválido o sin respuesta', async () => {
    expect((await signalFor(response(200, health()), null)).signal.evidence[0]?.value).toBe('credential_not_configured')
    expect((await signalFor(response(401, { code: 'unauthorized' }))).signal.severity).toBe('unknown')
    expect((await signalFor(response(403, { code: 'forbidden' }))).signal.evidence[0]?.value).toBe('credential_rejected')
    expect((await signalFor(response(200, { status: 'ok', database: 'reachable' }))).signal.evidence[0]?.value).toBe('invalid_payload')
    expect((await signalFor(Object.assign(new Error('aborted'), { name: 'AbortError' }))).signal.evidence[0]?.value).toBe('timeout')
    expect((await signalFor(new Error('ECONNREFUSED'))).signal.severity).toBe('unknown')
  })

  it('nunca pone el token en la señal', async () => {
    for (const res of [response(200, health()), response(401, {}), new Error(`fallo con ${TOKEN}`)]) {
      const { signal } = await signalFor(res)

      expect(JSON.stringify(signal)).not.toContain(TOKEN)
    }
  })
})
