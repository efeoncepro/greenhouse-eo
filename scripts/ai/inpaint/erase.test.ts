import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { InpaintImageAdapter } from './adapters/types'
import { pickGridSize } from './crop'
import { encodeMaskPng, maskFromRect } from './mask'
import type { LayersDocument } from './layers'
import { loadRgba } from './raw'
import { verifyRecomposition } from './recompose'

vi.mock('server-only', () => ({}))

const { runErase } = await import('./erase')

const W = 600
const H = 400

let dir: string
let image: string
let layersJson: string

/** Escena con ruido suave (para que el clean plate se distinga) y un cuadrado rojo: el objeto a borrar. */
const scene = async (withObject: boolean) => {
  const data = Buffer.alloc(W * H * 3)
  let state = 7

  for (let i = 0; i < data.length; i += 1) {
    state = (state * 1103515245 + 12345) % 2147483648
    data[i] = 110 + (state % 30)
  }

  if (withObject) {
    for (let y = 150; y < 250; y += 1) for (let x = 300; x < 400; x += 1) data.set([220, 30, 30], (y * W + x) * 3)
  }

  return sharp(data, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer()
}

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'erase-'))
  image = join(dir, 'foto.png')
  layersJson = join(dir, 'layers', 'layers.json')
  await writeFile(image, await scene(true))

  const layersDir = join(dir, 'layers')

  await mkdir(layersDir, { recursive: true })
  await writeFile(join(layersDir, '00-base.png'), await scene(false))
  await writeFile(join(layersDir, '01-red-box.png'), await sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 220, g: 30, b: 30, alpha: 1 } } }).png().toBuffer())
  await writeFile(join(layersDir, '02-efeonce-logo.png'), await sharp({ create: { width: 40, height: 40, channels: 4, background: { r: 0, g: 0, b: 80, alpha: 1 } } }).png().toBuffer())

  const doc: LayersDocument = {
    kind: 'ai-layers',
    version: 1,
    source: { image, sha256: 'x', width: W, height: H },
    base: { file: '00-base.png', width: W, height: H },
    layers: [
      { index: 0, zIndex: 0, name: null, description: null, file: '00-base.png', width: W, height: H, box: null, alphaCoverage: null },
      { index: 1, zIndex: 1, name: 'Red box', description: 'A red square object', file: '01-red-box.png', width: 100, height: 100, box: { left: 300, top: 150, right: 400, bottom: 250 }, alphaCoverage: 1 },
      { index: 2, zIndex: 2, name: 'Efeonce logo', description: 'brand mark', file: '02-efeonce-logo.png', width: 40, height: 40, box: { left: 20, top: 20, right: 60, bottom: 60 }, alphaCoverage: 1 }
    ],
    request: { prompt: null, imageSize: 'auto' },
    cost: { layerCount: 2, perLayerUsd: 0.03375, estimatedUsd: 0.0675, note: '' },
    providerMeta: {}
  }

  await writeFile(layersJson, JSON.stringify(doc))
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('pnpm ai:inpaint erase', () => {
  it('con clean plate borra el objeto sin proveedor y deja el resto en delta 0', async () => {
    const result = await runErase({ imagePath: image, layersJson, layerSelectors: ['red box'], runRoot: join(dir, 'run'), log: () => undefined })

    expect(result.exitCode).toBe(0)
    expect(result.manifest.estimate.usd).toBe(0)
    expect(result.erasure[0].residueSuspected).toBe(false)

    const final = await loadRgba(join(result.runDir, result.manifest.candidates[0].final))
    const red = Array.from(final.data.slice((200 * W + 350) * 4, (200 * W + 350) * 4 + 3))

    expect(red[0]).toBeLessThan(160) // el rojo ya no está en el centro del objeto

    const manifest = JSON.parse(await readFile(join(result.runDir, 'manifest.json'), 'utf8'))

    expect(manifest.erase).toMatchObject({ fill: 'plate', layers: ['red box'] })
    expect(manifest.candidates[0].verdict).toBe('PASS')
  })

  it('si el modelo no borró nada, avisa residuo y sale con código 3', async () => {
    const mask = join(dir, 'mask.png')

    await writeFile(mask, await encodeMaskPng(maskFromRect(W, H, { x0: 0.48, y0: 0.35, x1: 0.69, y1: 0.65 })))

    const lazy: InpaintImageAdapter = {
      id: 'lazy',
      provider: 'openai',
      label: 'lazy',
      defaultModel: 'lazy-1',
      sendsMask: true,
      maskConvention: 'white-editable',
      verifiedAt: '2026-10-03',
      revision: 1,
      validate: () => undefined,
      pickSize: () => (aspect, area) => pickGridSize(aspect, area, { step: 16, minArea: 65_536, maxArea: 1_048_576, maxEdge: 2048, maxRatio: 3 }),
      estimate: async () => ({ usd: 0.01, basis: 'lazy' }),
      // Devuelve la misma imagen que recibe: no borró nada.
      run: async ({ image: input }) => ({ image: input, providerModel: 'lazy-1', outputUsd: null, usage: null, meta: {} })
    }

    const result = await runErase({ imagePath: image, maskPath: mask, modelAdapter: lazy, runRoot: join(dir, 'run-lazy'), log: () => undefined })
    const original = await loadRgba(image)
    const final = await loadRgba(join(result.runDir, result.manifest.candidates[0].final))

    expect(result.erasure[0].residueSuspected).toBe(true)
    expect(result.exitCode).toBe(3)
    expect(verifyRecomposition(original, final, maskFromRect(W, H, { x0: 0.48, y0: 0.35, x1: 0.69, y1: 0.65 })).verdict).toBe('PASS')
  })

  it('no borra un logo o una marca con IA (guarda sobre el nombre de la capa)', async () => {
    await expect(runErase({ imagePath: image, layersJson, layerSelectors: ['#2'], runRoot: join(dir, 'run-logo'), log: () => undefined })).rejects.toThrow(/allow-brand/)
  })

  it('pide la zona y no acepta --fill plate sin capas', async () => {
    await expect(runErase({ imagePath: image, runRoot: join(dir, 'x'), log: () => undefined })).rejects.toThrow(/Indica la zona/)
    await expect(runErase({ imagePath: image, maskPath: join(dir, 'mask.png'), fill: 'plate', runRoot: join(dir, 'x'), log: () => undefined })).rejects.toThrow(/clean plate/)
  })
})
