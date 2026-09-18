import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const secrets: Record<string, string | null> = {}

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret: async ({ envVarName }: { envVarName: string }) => ({ value: secrets[envVarName] ?? null, source: 'env' })
}))

import {
  awaitHiggsfieldRequest,
  cancelHiggsfieldRequest,
  estimateHiggsfieldCost,
  isHiggsfieldConcurrencyLimit,
  isHiggsfieldInsufficientCredits,
  isHiggsfieldTerminalState,
  runHiggsfieldModel,
  uploadHiggsfieldFile
} from '@/lib/ai/higgsfield'

const KEY = 'key-id:key-secret'
const REQUEST_ID = 'd7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff'
const STATUS_URL = `https://api.higgsfield.ai/requests/${REQUEST_ID}/status`

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers })

interface Call {
  url: string
  method: string
  authorization: string | null
  body: string | null
}

const installFetch = (route: (call: Call) => Response | Promise<Response> | undefined) => {
  const calls: Call[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>

      const call: Call = {
        url,
        method: init?.method ?? 'GET',
        authorization: headers.Authorization ?? null,
        body: typeof init?.body === 'string' ? init.body : null
      }

      calls.push(call)

      return (await route(call)) ?? json(404, { detail: 'not mocked' })
    })
  )

  return calls
}

const queued = () => json(200, {
  status: 'queued',
  request_id: REQUEST_ID,
  status_url: STATUS_URL,
  cancel_url: `https://api.higgsfield.ai/requests/${REQUEST_ID}/cancel`
})

describe('cliente Higgsfield', () => {
  beforeEach(() => {
    secrets.HIGGSFIELD_API_KEY = KEY
    vi.unstubAllGlobals()
  })

  it('encola con Authorization Key id:secret y espera hasta completed', async () => {
    let polls = 0

    const calls = installFetch(call => {
      if (call.method === 'POST' && call.url === 'https://api.higgsfield.ai/higgsfield-ai/soul/v2/standard') return queued()

      if (call.url === STATUS_URL) {
        polls += 1

        return polls < 2
          ? json(200, { status: 'in_progress', request_id: REQUEST_ID })
          : json(200, { status: 'completed', request_id: REQUEST_ID, images: [{ url: 'https://cdn.higgsfield.ai/x.jpg' }] }, { 'x-correlation-id': 'corr-1' })
      }

      return undefined
    })

    const result = await runHiggsfieldModel({ model: 'higgsfield-ai/soul/v2/standard', input: { prompt: 'retrato' }, pollIntervalMs: 1 })

    expect(result.ok).toBe(true)
    expect(result.status).toBe('completed')
    expect(result.requestId).toBe(REQUEST_ID)
    expect(result.correlationId).toBe('corr-1')
    expect(result.output).toMatchObject({ images: [{ url: 'https://cdn.higgsfield.ai/x.jpg' }] })
    expect(calls.every(call => call.authorization === `Key ${KEY}`)).toBe(true)
    expect(JSON.parse(calls[0].body ?? '{}')).toEqual({ prompt: 'retrato' })
  })

  it('un estado nsfw o failed termina en ok:false sin reintentar el POST', async () => {
    for (const terminal of [{ status: 'nsfw' }, { status: 'failed', error: 'Generation failed' }]) {
      const calls = installFetch(call => {
        if (call.method === 'POST') return queued()
        if (call.url === STATUS_URL) return json(200, { request_id: REQUEST_ID, ...terminal })

        return undefined
      })

      const result = await runHiggsfieldModel({ model: 'm/x', input: {}, pollIntervalMs: 1 })

      expect(result.ok).toBe(false)
      expect(result.status).toBe(terminal.status)
      expect(result.errorDetail).toBeTruthy()
      expect(calls.filter(call => call.method === 'POST')).toHaveLength(1)
    }
  })

  it('reconoce el tope de concurrencia (400, no 429) y no encola', async () => {
    installFetch(call =>
      call.method === 'POST' ? json(400, { detail: 'Maximum number of concurrent requests (4) has been reached' }) : undefined
    )

    const result = await runHiggsfieldModel({ model: 'm/x', input: {} })

    expect(result.ok).toBe(false)
    expect(result.requestId).toBeNull()
    expect(isHiggsfieldConcurrencyLimit(result.httpStatus, result.errorDetail)).toBe(true)
    expect(isHiggsfieldConcurrencyLimit(400, 'prompt is required')).toBe(false)
  })

  it('reconoce la falta de créditos de API (403 not_enough_credits) sin confundirla con otro 403', async () => {
    installFetch(call => (call.method === 'POST' ? json(403, { detail: 'not_enough_credits' }) : undefined))

    const result = await runHiggsfieldModel({ model: 'm/x', input: {} })

    expect(result).toMatchObject({ ok: false, httpStatus: 403, requestId: null })
    expect(isHiggsfieldInsufficientCredits(result.httpStatus, result.errorDetail)).toBe(true)
    expect(isHiggsfieldInsufficientCredits(403, 'Model access denied')).toBe(false)
  })

  it('reintenta el GET de estado ante 5xx y termina bien', async () => {
    let polls = 0

    installFetch(call => {
      if (call.url !== STATUS_URL) return undefined
      polls += 1

      return polls === 1 ? json(502, {}) : json(200, { status: 'completed', request_id: REQUEST_ID, video: { url: 'https://cdn/x.mp4' } })
    })

    const result = await awaitHiggsfieldRequest({ requestId: REQUEST_ID, pollIntervalMs: 1 })

    expect(result.ok).toBe(true)
    expect(polls).toBe(2)
  })

  it('un timeout local devuelve 408 con request_id para retomar', async () => {
    installFetch(call => (call.url === STATUS_URL ? json(200, { status: 'queued', request_id: REQUEST_ID }) : undefined))

    const result = await awaitHiggsfieldRequest({ requestId: REQUEST_ID, pollIntervalMs: 1, pollTimeoutMs: 5 })

    expect(result.ok).toBe(false)
    expect(result.httpStatus).toBe(408)
    expect(result.requestId).toBe(REQUEST_ID)
  })

  it('detach devuelve 202 apenas encola', async () => {
    installFetch(call => (call.method === 'POST' ? queued() : undefined))

    const result = await runHiggsfieldModel({ model: 'm/x', input: {}, detach: true })

    expect(result).toMatchObject({ ok: true, httpStatus: 202, status: 'queued', requestId: REQUEST_ID, output: null })
  })

  it('estimación: monto con descuento, fórmula y rechazo de validación', async () => {
    installFetch(call => {
      if (call.url.endsWith('/estimate/a')) {
        return json(200, { type: 'estimate', credits: '5.965', usd: '0.373', discount: { percentage: '15.00', credits: '1.053', usd: '0.066' } })
      }

      if (call.url.endsWith('/estimate/b')) return json(200, { type: 'description', pricing_description: 'Priced per second' })
      if (call.url.endsWith('/estimate/c')) return json(422, { detail: [{ loc: ['body', 'prompt'], msg: 'field required' }] })

      return undefined
    })

    expect(await estimateHiggsfieldCost({ model: 'a', input: {} })).toMatchObject({
      ok: true,
      usd: 0.373,
      credits: 5.965,
      discountUsd: 0.066,
      discountPercentage: 15
    })

    expect(await estimateHiggsfieldCost({ model: 'b', input: {} })).toMatchObject({ ok: true, usd: null, pricingDescription: 'Priced per second' })
    expect(await estimateHiggsfieldCost({ model: 'c', input: {} })).toMatchObject({ ok: false, httpStatus: 422, errorDetail: 'body.prompt: field required' })
  })

  it('cancelar: 202 ok; 400 si ya empezó', async () => {
    installFetch(call => (call.url.endsWith('/cancel') ? new Response(null, { status: 202 }) : undefined))
    expect(await cancelHiggsfieldRequest({ requestId: REQUEST_ID })).toMatchObject({ ok: true, httpStatus: 202 })

    installFetch(call => (call.url.endsWith('/cancel') ? json(400, { detail: 'Request is already processing' }) : undefined))
    expect(await cancelHiggsfieldRequest({ requestId: REQUEST_ID })).toMatchObject({ ok: false, errorDetail: 'Request is already processing' })
  })

  it('subida prefirmada: manda los upload_headers al PUT y nunca la credencial', async () => {
    const calls = installFetch(call => {
      if (call.url.endsWith('/files/generate-upload-url')) {
        return json(200, {
          public_url: 'https://cdn.higgsfield.ai/input/a.png',
          upload_url: 'https://storage.example.com/presigned',
          upload_headers: { 'Content-Type': 'image/png', 'x-amz-tagging': 'retention=temporary' }
        })
      }

      if (call.url === 'https://storage.example.com/presigned') return new Response(null, { status: 200 })

      return undefined
    })

    const uploaded = await uploadHiggsfieldFile({ bytes: new Uint8Array([1, 2, 3]), contentType: 'image/png' })

    expect(uploaded.url).toBe('https://cdn.higgsfield.ai/input/a.png')
    expect(calls[1].authorization).toBeNull()
    await expect(uploadHiggsfieldFile({ bytes: new Uint8Array([1]), contentType: 'audio/mpeg' })).rejects.toThrow(/no acepta subir audio\/mpeg/)
  })

  it('sin clave configurada falla con un mensaje accionable', async () => {
    secrets.HIGGSFIELD_API_KEY = null
    await expect(runHiggsfieldModel({ model: 'm/x', input: {} })).rejects.toThrow(/HIGGSFIELD_API_KEY_SECRET_REF/)
  })

  it('estados terminales', () => {
    expect(['completed', 'failed', 'nsfw', 'canceled'].every(isHiggsfieldTerminalState)).toBe(true)
    expect(isHiggsfieldTerminalState('in_progress')).toBe(false)
  })
})
