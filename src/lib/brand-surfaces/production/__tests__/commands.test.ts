import { readFileSync } from 'node:fs'
import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({
  findBrandRenderRequestByIdempotency: vi.fn(),
  insertBrandRenderRequest: vi.fn(),
  listBrandRenderJobs: vi.fn(async () => [])
}))

const sources = vi.hoisted(() => ({
  resolveBrandSources: vi.fn(),
  attachBrandSources: vi.fn(async () => undefined),
  readBrandSourceImageSizes: vi.fn()
}))

vi.mock('server-only', () => ({}))
vi.mock('../store', () => store)
vi.mock('../sources', () => sources)
vi.mock('../authz', () => ({
  assertBrandRenderAccess: vi.fn(async () => ({ organizationId: 'org-efeonce', actor: { kind: 'member', userId: 'user-1' } }))
}))
vi.mock('@/lib/postgres/client', () => ({ withGreenhousePostgresTransaction: async (fn: (c: unknown) => unknown) => fn({ query: vi.fn() }) }))

import { requestBrandRender } from '../commands'

const intent = JSON.parse(readFileSync(path.resolve(__dirname, '../../examples/deck-breather-intent.json'), 'utf8')) as Record<string, unknown>
const plate = (intent.photo as { plateRef: string }).plateRef
const subject = { userId: 'user-1', tenantType: 'efeonce_internal' } as never
const ON = { BRAND_RENDER_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv
const body = { family: 'graphic_line_piece', intent, sources: { [plate]: 'ast-plate-1' } }

const codeOf = async (fn: () => Promise<unknown>) => {
  try {
    await fn()
  } catch (error) {
    return (error as { code?: string }).code
  }

  return null
}

beforeEach(() => {
  vi.clearAllMocks()
  sources.resolveBrandSources.mockResolvedValue([{ name: plate, assetId: 'ast-plate-1', mimeType: 'image/png', sha256: null, status: 'pending' }])
  store.findBrandRenderRequestByIdempotency.mockResolvedValue(null)
  store.insertBrandRenderRequest.mockImplementation(async (_c: unknown, input: { jobs: unknown[] }) => ({
    request: { requestId: 'brq-1', state: 'pending' },
    jobs: input.jobs.map((_, i) => ({ jobId: `brj-${i}` })),
    created: true
  }))
})

describe('requestBrandRender', () => {
  it('con el flag apagado responde render_disabled y no toca nada', async () => {
    expect(await codeOf(() => requestBrandRender({ subject, body, env: {} as unknown as NodeJS.ProcessEnv }))).toBe('render_disabled')
    expect(store.insertBrandRenderRequest).not.toHaveBeenCalled()
  })

  it('un pedido sin la forma del contrato es invalid_request', async () => {
    expect(await codeOf(() => requestBrandRender({ subject, body: { family: 'graphic_line_piece' }, env: ON }))).toBe('invalid_request')
  })

  it('una receta no aprobada es render_rejected y no crea job', async () => {
    const rejected = { ...body, intent: { ...intent, surface: 'dooh', format: 'paleta-1x2', role: 'billboard', recipe: 'paleta' } }

    expect(await codeOf(() => requestBrandRender({ subject, body: rejected, env: ON }))).toBe('render_rejected')
    expect(store.insertBrandRenderRequest).not.toHaveBeenCalled()
  })

  it('encola un job sellado con su hash, las fuentes por assetId y las adjunta al pedido', async () => {
    const result = await requestBrandRender({ subject, body, env: ON })
    const input = store.insertBrandRenderRequest.mock.calls[0]![1] as { jobs: { manifest: unknown; manifestHash: string; assetRequests: { sources: Record<string, string> } }[]; idempotencyKey: string }

    expect(result.idempotent).toBe(false)
    expect(input.jobs).toHaveLength(1)
    expect(input.jobs[0]!.manifestHash).toMatch(/^[0-9a-f]{64}$/)
    expect(input.jobs[0]!.assetRequests.sources).toEqual({ [plate]: 'ast-plate-1' })
    expect(input.idempotencyKey).toMatch(/^[0-9a-f]{64}$/)
    expect(sources.attachBrandSources).toHaveBeenCalledOnce()
  })

  it('dos pedidos idénticos dan la misma clave; si ya existe, se devuelve sin crear nada', async () => {
    await requestBrandRender({ subject, body, env: ON })
    await requestBrandRender({ subject, body, env: ON })

    const [a, b] = store.insertBrandRenderRequest.mock.calls.map((call) => (call[1] as { idempotencyKey: string }).idempotencyKey)

    expect(a).toBe(b)

    store.findBrandRenderRequestByIdempotency.mockResolvedValueOnce({ requestId: 'brq-existente' })

    const again = await requestBrandRender({ subject, body, env: ON })

    expect(again).toMatchObject({ idempotent: true, request: { requestId: 'brq-existente' } })
    expect(store.insertBrandRenderRequest).toHaveBeenCalledTimes(2)
  })

  it('una fuente que falta se rechaza antes de encolar', async () => {
    const { BrandRenderMissingSourceError } = await import('../errors')

    sources.resolveBrandSources.mockRejectedValueOnce(new BrandRenderMissingSourceError('falta', { missing: [plate] }))

    expect(await codeOf(() => requestBrandRender({ subject, body: { ...body, sources: {} }, env: ON }))).toBe('missing_source')
    expect(store.insertBrandRenderRequest).not.toHaveBeenCalled()
  })
})
