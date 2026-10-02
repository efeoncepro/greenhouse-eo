import { beforeEach, describe, expect, it, vi } from 'vitest'

import { hashResolvedManifest } from '@/lib/artifact-composer/pure'
import { BrandRenderFenceLostError } from '@/lib/brand-surfaces/production/errors'

const store = vi.hoisted(() => ({
  claimNextBrandRenderJob: vi.fn(),
  claimBrandRenderJobById: vi.fn(),
  getBrandRenderJobPayload: vi.fn(),
  markBrandRenderJobCompleted: vi.fn(),
  markBrandRenderJobFailed: vi.fn()
}))

const sources = vi.hoisted(() => ({ readBrandSourceBytes: vi.fn() }))
const assets = vi.hoisted(() => ({ storeSystemGeneratedPrivateAsset: vi.fn() }))
const surface = vi.hoisted(() => ({ materializeSurfaceAssets: vi.fn() }))
const glitch = vi.hoisted(() => ({ materializeGlitchAssets: vi.fn() }))

vi.mock('@/lib/brand-surfaces/production/store', () => store)
vi.mock('@/lib/brand-surfaces/production/sources', () => sources)
vi.mock('@/lib/storage/greenhouse-assets', () => assets)
vi.mock('@/lib/brand-surfaces/production/materialize', () => surface)
vi.mock('@/lib/glitch-composition/materialize', () => glitch)
vi.mock('@/lib/brand-surfaces/production/commands', () => ({ brandRenderAxisVersions: () => ({ '@efeoncepro/axis-tokens': '0.3.8' }) }))
vi.mock('../brand/painters', () => ({ BRAND_RENDER_CATALOG_FACTORIES: {}, isBrandRenderCatalogName: () => false }))
vi.mock('node:fs/promises', () => ({ default: { readFile: vi.fn(async () => Buffer.from('bytes')) } }))

import { createBrandRenderConsumer, stripDerivedSlots } from './brand-render'

const sealedInput = {
  artifactId: 'brand-abc',
  slides: [
    { slideId: 's1', contentType: 'glitch-cover', slots: { title: 'Uno' } },
    { slideId: 's2', contentType: 'glitch-news', slots: { title: 'Dos' } }
  ]
}

const job = (over: Record<string, unknown> = {}) => ({
  jobId: 'brj-1',
  requestId: 'brq-1',
  organizationId: 'org-eo',
  catalogName: 'glitch-carousel',
  outputTarget: 'png-set',
  artifactId: 'brand-abc',
  manifestHash: hashResolvedManifest({ input: sealedInput }),
  constraints: {},
  fenceToken: 7,
  ...over
})

const claim = async (record = job()) => {
  store.claimNextBrandRenderJob.mockResolvedValueOnce(record)
  const consumer = createBrandRenderConsumer()
  const view = (await consumer.claimNext())!

  return { consumer, view }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('stripDerivedSlots', () => {
  it('quita `bytes` sólo de las láminas a las que el worker se lo agregó', () => {
    const emitted = {
      ...sealedInput,
      slides: [
        { ...sealedInput.slides[0]!, slots: { title: 'Uno', bytes: '[]' } },
        { ...sealedInput.slides[1]!, slots: { title: 'Dos', bytes: '[1]' } }
      ]
    }

    const stripped = stripDerivedSlots(emitted as never, new Set(['s1']))

    expect(stripped.slides[0]!.slots).toEqual({ title: 'Uno' })
    // s2 no la derivó este worker: su `bytes` sigue contando para el drift.
    expect(stripped.slides[1]!.slots).toEqual({ title: 'Dos', bytes: '[1]' })
  })
})

describe('consumer brand-render', () => {
  it('Glitch: materializa desde el asset store, agrega la falla y el drift check ignora sólo el slot derivado', async () => {
    const { consumer, view } = await claim()

    store.getBrandRenderJobPayload.mockResolvedValueOnce({
      manifest: { input: sealedInput },
      assetRequests: { kind: 'glitch', requests: [{ ref: 'photo-1', path: 'foto.jpg' }], sources: { 'foto.jpg': 'asset-1' } }
    })
    glitch.materializeGlitchAssets.mockImplementationOnce(async (_requests, load) => {
      await load('foto.jpg')

      return { externalAssets: { 'photo-1': 'data:image/jpeg;base64,AA' }, cellsBySlide: { s1: [{ x: 1 }] }, log: [] }
    })
    sources.readBrandSourceBytes.mockResolvedValueOnce({ bytes: Buffer.from('jpeg'), mimeType: 'image/jpeg' })

    const manifest = (await consumer.getManifest(view.jobId))!
    const input = manifest.input as typeof sealedInput

    expect(sources.readBrandSourceBytes).toHaveBeenCalledWith('asset-1')
    expect(input.slides[0]!.slots).toEqual({ title: 'Uno', bytes: JSON.stringify([{ x: 1 }]) })
    expect(await consumer.resolveExternalAssets!(view, input)).toEqual({ 'photo-1': 'data:image/jpeg;base64,AA' })
    expect(consumer.verifyEmittedManifest(view, { input })).toBeNull()

    const tampered = { ...input, slides: [input.slides[0]!, { ...input.slides[1]!, slots: { title: 'Otro' } }] }

    expect(consumer.verifyEmittedManifest(view, { input: tampered })).toMatch(/difiere del sellado/)
  })

  it('una fuente sin asset falla como missing_asset, con el fence del claim', async () => {
    const { consumer, view } = await claim()

    store.getBrandRenderJobPayload.mockResolvedValueOnce({
      manifest: { input: sealedInput },
      assetRequests: { kind: 'surface', requests: [], sources: {} }
    })
    surface.materializeSurfaceAssets.mockImplementationOnce(async (_requests, load) => load('plate.png'))

    await expect(consumer.getManifest(view.jobId)).rejects.toThrow('missing_asset:plate.png')

    await consumer.markFailed(view, { failureCode: 'render_error', failureDetail: 'missing_asset:plate.png' })

    expect(store.markBrandRenderJobFailed).toHaveBeenCalledWith(expect.objectContaining({ jobId: 'brj-1', fenceToken: 7, failureCode: 'missing_asset' }))
  })

  it('un código desconocido del motor cae en render_error', async () => {
    const { consumer, view } = await claim()

    await consumer.markFailed(view, { failureCode: 'algo_nuevo', failureDetail: 'x' })

    expect(store.markBrandRenderJobFailed).toHaveBeenCalledWith(expect.objectContaining({ failureCode: 'render_error' }))
  })

  it('png-set guarda cada PNG como salida de marca; completa con procedencia y fence', async () => {
    const { consumer, view } = await claim()

    assets.storeSystemGeneratedPrivateAsset.mockResolvedValueOnce({ assetId: 'a1' }).mockResolvedValueOnce({ assetId: 'a2' })

    const stored = await consumer.storeOutputs(view, { pdfPath: null, slidePaths: ['/t/s1.png', '/t/s2.png'], pdfBytes: 0, warnings: [], slideCount: 2 })

    expect(stored).toEqual({ primaryAssetId: 'a1', previewAssetIds: ['a2'] })
    expect(assets.storeSystemGeneratedPrivateAsset).toHaveBeenCalledWith(
      expect.objectContaining({ ownerAggregateType: 'brand_render_output', ownerAggregateId: 'brq-1', mimeType: 'image/png', actorUserId: null })
    )

    await consumer.markCompleted(view, { ...stored, report: { slides: 2 } })

    expect(store.markBrandRenderJobCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'brj-1',
        fenceToken: 7,
        outputAssetIds: ['a1', 'a2'],
        provenance: expect.objectContaining({ manifestHash: view.manifestHash, axis: { '@efeoncepro/axis-tokens': '0.3.8' } })
      })
    )
  })

  it('pdf-merged guarda sólo el PDF', async () => {
    const { consumer, view } = await claim(job({ outputTarget: 'pdf-merged', catalogName: 'graphic-line-deck' }))

    assets.storeSystemGeneratedPrivateAsset.mockResolvedValueOnce({ assetId: 'pdf-1' })

    const stored = await consumer.storeOutputs(view, { pdfPath: '/t/doc.pdf', slidePaths: ['/t/s1.png'], pdfBytes: 10, warnings: [], slideCount: 1 })

    expect(stored).toEqual({ primaryAssetId: 'pdf-1', previewAssetIds: [] })
    expect(assets.storeSystemGeneratedPrivateAsset).toHaveBeenCalledTimes(1)
  })

  it('sin archivos no se marca completed: falla render_error', async () => {
    const { consumer, view } = await claim()

    await consumer.markCompleted(view, { primaryAssetId: null, previewAssetIds: [], report: {} })

    expect(store.markBrandRenderJobCompleted).not.toHaveBeenCalled()
    expect(store.markBrandRenderJobFailed).toHaveBeenCalledWith(expect.objectContaining({ failureCode: 'render_error' }))
  })

  it('si otra ejecución tomó el job (fence perdido), no escribe ni revienta', async () => {
    const { consumer, view } = await claim()

    store.markBrandRenderJobCompleted.mockRejectedValueOnce(new BrandRenderFenceLostError('brj-1', 7))

    await expect(consumer.markCompleted(view, { primaryAssetId: 'a1', previewAssetIds: [], report: {} })).resolves.toBeUndefined()
  })
})
