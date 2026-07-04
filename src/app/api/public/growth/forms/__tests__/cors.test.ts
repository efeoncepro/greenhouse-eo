import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// El resolver CORS es la ÚNICA autoridad de transporte del motor público Growth Forms.
// SoT = la unión de `origin_allowlist_json` de las surfaces `active` (mockeamos el reader
// del store). Cubrimos: origin permitido (Think), no-regresión de `/aeo-2` (efeoncepro.com),
// origin desconocido (fail-closed), stale-on-error (DB caída no baja el last-known-good),
// cold + DB error (fail-closed) y el filtro `.local` en producción.

vi.mock('@/lib/growth/forms/store', () => ({
  listActivePublicFormOrigins: vi.fn(),
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn(),
}))

import { listActivePublicFormOrigins } from '@/lib/growth/forms/store'
import { captureWithDomain } from '@/lib/observability/capture'

import { publicFormsCorsHeaders, publicFormsOptionsResponse, resetPublicFormsCorsCacheForTests } from '../cors'

const mockedOrigins = vi.mocked(listActivePublicFormOrigins)
const mockedCapture = vi.mocked(captureWithDomain)

// Unión gobernada real (post-migración TASK-1335): Think + los origins de `/aeo-2` (aeo +
// lead-gen surfaces) + staging + shadow.local.
const GOVERNED_UNION = [
  'https://think.efeoncepro.com',
  'https://efeoncepro.com',
  'https://www.efeoncepro.com',
  'https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app',
  'https://shadow.local',
]

const requestFrom = (origin: string | null): Request =>
  new Request('https://greenhouse.efeoncepro.com/api/public/growth/forms/x', {
    headers: origin ? { origin } : {},
  })

const headersFor = async (origin: string | null): Promise<Record<string, string>> => {
  const raw = await publicFormsCorsHeaders(requestFrom(origin), 'POST, OPTIONS')

  return raw as Record<string, string>
}

beforeEach(() => {
  resetPublicFormsCorsCacheForTests()
  mockedOrigins.mockReset()
  mockedCapture.mockReset()
  mockedOrigins.mockResolvedValue([...GOVERNED_UNION])
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('publicFormsCorsHeaders — governed transport resolver', () => {
  it('emite ACAO para el origin de Think (grader habilitado)', async () => {
    const headers = await headersFor('https://think.efeoncepro.com')

    expect(headers['Access-Control-Allow-Origin']).toBe('https://think.efeoncepro.com')
    expect(headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS')
    expect(headers.Vary).toBe('Origin')
  })

  it('NO regresa /aeo-2: efeoncepro.com sigue recibiendo ACAO', async () => {
    const headers = await headersFor('https://efeoncepro.com')

    expect(headers['Access-Control-Allow-Origin']).toBe('https://efeoncepro.com')

    const www = await headersFor('https://www.efeoncepro.com')

    expect(www['Access-Control-Allow-Origin']).toBe('https://www.efeoncepro.com')
  })

  it('fail-closed: un origin desconocido no recibe ACAO', async () => {
    const headers = await headersFor('https://evil.example')

    expect(headers['Access-Control-Allow-Origin']).toBeUndefined()
    expect(headers.Vary).toBe('Origin')
  })

  it('sin header Origin: no emite ACAO pero conserva Vary', async () => {
    const headers = await headersFor(null)

    expect(headers['Access-Control-Allow-Origin']).toBeUndefined()
    expect(headers.Vary).toBe('Origin')
  })

  it('cachea: no relee la DB por-request dentro del TTL', async () => {
    await headersFor('https://think.efeoncepro.com')
    await headersFor('https://efeoncepro.com')
    await headersFor('https://evil.example')

    expect(mockedOrigins).toHaveBeenCalledTimes(1)
  })

  it('stale-on-error: con la DB caída sirve el last-known-good (Think y /aeo-2 no caen)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-04T00:00:00Z'))

    // Warm: cache poblado con la unión gobernada.
    expect((await headersFor('https://think.efeoncepro.com'))['Access-Control-Allow-Origin']).toBe(
      'https://think.efeoncepro.com',
    )

    // TTL vencido + DB ahora falla.
    vi.setSystemTime(new Date('2026-07-04T00:02:00Z'))
    mockedOrigins.mockRejectedValue(new Error('db down'))

    // stale-while-revalidate: sirve el stale inmediatamente; el refresh de fondo falla
    // pero preserva el last-known-good.
    const think = await headersFor('https://think.efeoncepro.com')
    const aeo = await headersFor('https://efeoncepro.com')

    expect(think['Access-Control-Allow-Origin']).toBe('https://think.efeoncepro.com')
    expect(aeo['Access-Control-Allow-Origin']).toBe('https://efeoncepro.com')

    await vi.waitFor(() => expect(mockedCapture).toHaveBeenCalled())
  })

  it('cold + DB error: unión vacía → fail-closed (el form ya está roto de todos modos)', async () => {
    mockedOrigins.mockRejectedValue(new Error('db down'))

    const headers = await headersFor('https://think.efeoncepro.com')

    expect(headers['Access-Control-Allow-Origin']).toBeUndefined()
    expect(mockedCapture).toHaveBeenCalledWith(expect.any(Error), 'growth', expect.anything())
  })

  it('filtra pseudo-origins `.local` en producción', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const shadow = await headersFor('https://shadow.local')
    const think = await headersFor('https://think.efeoncepro.com')

    expect(shadow['Access-Control-Allow-Origin']).toBeUndefined()
    expect(think['Access-Control-Allow-Origin']).toBe('https://think.efeoncepro.com')
  })
})

describe('publicFormsOptionsResponse — preflight', () => {
  it('204 con ACAO para un origin gobernado (preflight surface-agnóstico, sin surfaceId)', async () => {
    const res = await publicFormsOptionsResponse(requestFrom('https://think.efeoncepro.com'), 'POST, OPTIONS')

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://think.efeoncepro.com')
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
  })

  it('204 sin ACAO para un origin desconocido', async () => {
    const res = await publicFormsOptionsResponse(requestFrom('https://evil.example'), 'POST, OPTIONS')

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})
