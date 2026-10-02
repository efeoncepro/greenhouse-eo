import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { maskFromRect } from '../mask'

vi.mock('server-only', () => ({}))

const uploadFalFile = vi.fn()
const runFalModel = vi.fn()

vi.mock('@/lib/ai/fal', () => ({
  uploadFalFile: (...args: unknown[]) => uploadFalFile(...args),
  runFalModel: (...args: unknown[]) => runFalModel(...args)
}))

const { buildFalInpaintInput, createFalInpaintAdapter } = await import('./fal')
const { findFalCapability } = await import('@/lib/ai/fal-capabilities')
const { resolveImageAdapter } = await import('./index')

beforeEach(() => {
  uploadFalFile.mockReset()
  runFalModel.mockReset()
})

describe('adaptadores fal de ai:inpaint', () => {
  it('Flux Pro Fill: la máscara viaja en mask_url y la semilla se respeta', () => {
    const input = buildFalInpaintInput(findFalCapability('flux-pro-fill')!, { prompt: 'p', imageUrl: 'u1', maskUrl: 'u2', size: { width: 1024, height: 1024 }, seed: 7 })

    expect(input).toEqual({ prompt: 'p', num_images: 1, image_url: 'u1', mask_url: 'u2', output_format: 'png', seed: 7 })
  })

  it('Seedream edit: sin máscara, con image_urls e image_size', () => {
    const input = buildFalInpaintInput(findFalCapability('seedream5-pro-edit')!, { prompt: 'p', imageUrl: 'u1', maskUrl: null, size: { width: 1024, height: 1280 } })

    expect(input).toEqual({ prompt: 'p', num_images: 1, image_urls: ['u1'], image_size: { width: 1024, height: 1280 }, output_format: 'png' })
    expect(createFalInpaintAdapter('seedream5-pro-edit').sendsMask).toBe(false)
  })

  it('valida antes de gastar', () => {
    const fill = createFalInpaintAdapter('flux-pro-fill')
    const lite = createFalInpaintAdapter('seedream5-lite-edit')

    expect(() => fill.validate({ model: fill.defaultModel, quality: 'high' })).toThrow(/quality/)
    expect(() => fill.validate({ model: 'otro/slug' })).toThrow(/quita --model/)
    expect(() => lite.validate({ model: lite.defaultModel, seed: 1 })).toThrow(/semilla/)
    expect(() => fill.validate({ model: fill.defaultModel, seed: 1 })).not.toThrow()
    expect(() => createFalInpaintAdapter('seedance25-r2v')).toThrow(/no es un adaptador/)
  })

  it('estima Fill por megapíxel redondeado hacia arriba', async () => {
    const fill = createFalInpaintAdapter('flux-pro-fill')

    expect((await fill.estimate({ model: fill.defaultModel, size: { width: 1000, height: 1000 }, count: 1 })).usd).toBe(0.05)
    expect((await fill.estimate({ model: fill.defaultModel, size: { width: 1200, height: 1000 }, count: 2 })).usd).toBe(0.2)
  })

  it('run: sube imagen y máscara blanca = editable, descarga la salida y no guarda URLs', async () => {
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#808080' } }).png().toBuffer()

    uploadFalFile.mockImplementation(async ({ fileName }: { fileName: string }) => ({ url: `https://fal.media/${fileName}`, account: 'FAL_API_KEY' }))
    runFalModel.mockResolvedValue({ ok: true, httpStatus: 200, requestId: 'req-1', account: 'FAL_API_KEY', errorDetail: null, output: { images: [{ url: 'https://fal.media/out.png' }], seed: 42 } })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(png))))

    const fill = createFalInpaintAdapter('flux-pro-fill')
    const output = await fill.run({ prompt: 'p', image: png, mask: maskFromRect(64, 64, { x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.75 }), size: { width: 64, height: 64 }, model: fill.defaultModel })
    const maskBytes = uploadFalFile.mock.calls[1][0].bytes

    // El PNG es de 1 canal; al leerlo, sharp convierte a sRGB salvo que se pida b-w (la misma trampa de canales).
    expect((await sharp(maskBytes).metadata()).channels).toBe(1)

    const raw = await sharp(maskBytes).toColourspace('b-w').raw().toBuffer({ resolveWithObject: true })

    expect(raw.data[32 * 64 + 32]).toBe(255)
    expect(raw.data[0]).toBe(0)
    expect(runFalModel.mock.calls[0][0].input.mask_url).toBe('https://fal.media/mask.png')
    expect(output.meta).toEqual({ requestId: 'req-1', account: 'FAL_API_KEY', seed: 42 })
    expect(JSON.stringify(output.meta)).not.toMatch(/https?:/)
    vi.unstubAllGlobals()
  })

  it('un fallo de fal se propaga con el detalle', async () => {
    uploadFalFile.mockResolvedValue({ url: 'https://fal.media/x.png' })
    runFalModel.mockResolvedValue({ ok: false, httpStatus: 422, requestId: null, account: null, errorDetail: 'mask size mismatch', output: null })

    const fill = createFalInpaintAdapter('flux-pro-fill')

    await expect(fill.run({ prompt: 'p', image: Buffer.alloc(1), mask: maskFromRect(4, 4, { x0: 0, y0: 0, x1: 0.5, y1: 0.5 }), size: { width: 4, height: 4 }, model: fill.defaultModel })).rejects.toThrow(/422.*mask size mismatch/)
  })

  it('el registro resuelve openai y fal:*, y rechaza lo desconocido', () => {
    expect(resolveImageAdapter(undefined).id).toBe('openai')
    expect(resolveImageAdapter('fal:flux-pro-fill').sendsMask).toBe(true)
    expect(() => resolveImageAdapter('magnific')).toThrow(/Disponibles/)
  })
})
