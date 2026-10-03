import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { InpaintImageAdapter } from './adapters/types'
import { pickGridSize } from './crop'
import { encodeMaskPng, maskFromRect, maskStats } from './mask'
import type { LayersDocument } from './layers'
import { loadRgba } from './raw'

vi.mock('server-only', () => ({}))

const { backgroundMask, runBackground } = await import('./background')
const { runImageInpaint } = await import('./pipeline-image')

const W = 500
const H = 400

const fake = (run?: InpaintImageAdapter['run']) => {
  const calls: Array<{ width: number; height: number }> = []

  const adapter: InpaintImageAdapter = {
    id: 'fake',
    provider: 'openai',
    label: 'fake',
    defaultModel: 'fake-1',
    sendsMask: true,
    maskConvention: 'white-editable',
    verifiedAt: '2026-10-03',
    revision: 1,
    validate: () => undefined,
    pickSize: () => (aspect, area) => pickGridSize(aspect, area, { step: 16, minArea: 65_536, maxArea: 4096 * 4096, maxEdge: 4096, maxRatio: 3 }),
    estimate: async () => ({ usd: 0.01, basis: 'fake' }),
    run:
      run ??
      (async ({ size }) => {
        calls.push(size)

        return {
          image: await sharp({ create: { width: size.width, height: size.height, channels: 3, background: '#2050c0' } }).png().toBuffer(),
          providerModel: 'fake-1',
          outputUsd: null,
          usage: null,
          meta: {}
        }
      })
  }

  return { adapter, calls }
}

let dir: string
let image: string
let layersJson: string

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'bg-'))
  image = join(dir, 'foto.png')

  const data = Buffer.alloc(W * H * 3, 140)

  for (let y = 100; y < 300; y += 1) for (let x = 180; x < 320; x += 1) data.set([230, 200, 60], (y * W + x) * 3)
  await writeFile(image, await sharp(data, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer())

  await mkdir(join(dir, 'layers'), { recursive: true })
  layersJson = join(dir, 'layers', 'layers.json')
  await writeFile(join(dir, 'layers', '00-base.png'), await sharp({ create: { width: W, height: H, channels: 3, background: '#8c8c8c' } }).png().toBuffer())
  await writeFile(join(dir, 'layers', '01-subject.png'), await sharp({ create: { width: 140, height: 200, channels: 4, background: { r: 230, g: 200, b: 60, alpha: 1 } } }).png().toBuffer())

  const doc: LayersDocument = {
    kind: 'ai-layers',
    version: 1,
    source: { image, sha256: 'x', width: W, height: H },
    base: { file: '00-base.png', width: W, height: H },
    layers: [
      { index: 0, zIndex: 0, name: null, description: null, file: '00-base.png', width: W, height: H, box: null, alphaCoverage: null },
      { index: 1, zIndex: 1, name: 'Yellow figure', description: 'subject', file: '01-subject.png', width: 140, height: 200, box: { left: 180, top: 100, right: 320, bottom: 300 }, alphaCoverage: 1 }
    ],
    request: { prompt: null, imageSize: 'auto' },
    cost: { layerCount: 1, perLayerUsd: 0.03375, estimatedUsd: 0.03375, note: '' },
    providerMeta: {}
  }

  await writeFile(layersJson, JSON.stringify(doc))
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('cambio de fondo', () => {
  it('la máscara es el inverso del sujeto erosionado, con borde suave', async () => {
    const mask = await backgroundMask(maskFromRect(100, 100, { x0: 0.3, y0: 0.3, x1: 0.7, y1: 0.7 }), 3)

    expect(mask.data[50 * 100 + 50]).toBe(0) // dentro del sujeto: protegido
    expect(mask.data[5 * 100 + 5]).toBe(255) // fondo: editable
    expect(maskStats(mask).soft).toBeGreaterThan(0)
  })

  it('cambia el fondo y deja el sujeto idéntico', async () => {
    const { adapter } = fake()
    const result = await runBackground({ imagePath: image, layersJson, layerSelectors: ['figure'], prompt: 'a blue studio wall', adapter, runRoot: join(dir, 'run-bg'), log: () => undefined })
    const final = await loadRgba(join(result.runDir, result.manifest.candidates[0].final))
    const px = (x: number, y: number) => Array.from(final.data.slice((y * W + x) * 4, (y * W + x) * 4 + 3))

    expect(result.manifest.candidates[0].verdict).toBe('PASS')
    expect(px(250, 200)).toEqual([230, 200, 60]) // sujeto intacto
    expect(px(20, 20)).toEqual([32, 80, 192]) // fondo nuevo
  })
})

describe('pasada de detalle', () => {
  it('genera la zona recortada a la resolución pedida y la devuelve a su lugar', async () => {
    const { adapter, calls } = fake()
    const mask = join(dir, 'detail-mask.png')

    await writeFile(mask, await encodeMaskPng(maskFromRect(W, H, { x0: 0.4, y0: 0.4, x1: 0.5, y1: 0.5 })))

    const result = await runImageInpaint({ imagePath: image, maskPath: mask, prompt: 'sharper texture', adapter, zoneResolution: 2048, runRoot: join(dir, 'run-detail'), log: () => undefined })

    expect(result.manifest.crop.mode).toBe('crop')
    expect(Math.max(calls[0].width, calls[0].height)).toBeGreaterThanOrEqual(2000)
    expect(result.manifest.candidates[0].verdict).toBe('PASS')
    await expect(runImageInpaint({ imagePath: image, maskPath: mask, prompt: 'x', adapter, zoneResolution: 9000, runRoot: join(dir, 'x'), log: () => undefined })).rejects.toThrow(/512 y 4096/)
  })
})
