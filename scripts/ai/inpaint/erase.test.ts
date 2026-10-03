import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { InpaintImageAdapter } from './adapters/types'
import { pickGridSize } from './crop'
import { createMask, encodeMaskPng, maskFromRect } from './mask'
import type { LayersDocument } from './layers'
import { loadRgba } from './raw'
import { verifyRecomposition } from './recompose'

vi.mock('server-only', () => ({}))

const { runErase } = await import('./erase')
const { detectCastShadow } = await import('./techniques')

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

describe('sombra proyectada', () => {
  const W2 = 300
  const H2 = 200
  const flat = (value: number) => ({ width: W2, height: H2, channels: 4 as const, hadAlpha: false, data: new Uint8Array(W2 * H2 * 4).fill(value) })

  const paint = (image: ReturnType<typeof flat>, x0: number, y0: number, x1: number, y1: number, value: number) => {
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) image.data.fill(value, (y * W2 + x) * 4, (y * W2 + x) * 4 + 3)
  }

  it('suma la sombra pegada al objeto y deja una mancha oscura que no lo toca', () => {
    const plate = flat(160)
    const original = flat(163) // el plate viene corrido de color en bloque: se mide relativo a la mediana

    paint(original, 150, 80, 190, 120, 240) // el objeto
    paint(original, 110, 100, 150, 120, 90) // su sombra, pegada a la izquierda
    paint(original, 20, 20, 40, 40, 60) // una mancha oscura lejos: no es su sombra

    const object = createMask(W2, H2)

    for (let y = 80; y < 120; y += 1) for (let x = 150; x < 190; x += 1) object.data[y * W2 + x] = 255

    const shadow = detectCastShadow(original, plate, object, { radius: 80 })

    expect(shadow.mask.data[110 * W2 + 120]).toBe(255)
    expect(shadow.mask.data[30 * W2 + 30]).toBe(0)
    expect(shadow.mask.data[100 * W2 + 170]).toBe(0) // el objeto no se cuenta como sombra
    expect(shadow.pixels).toBe(40 * 20)
    expect(shadow.meanDarkening).toBeGreaterThan(60)
  })

  it('no toma la sombra de un objeto vecino aunque se toque con la propia, ni pisa al vecino', () => {
    const plate = flat(160)
    const original = flat(160)

    paint(original, 150, 80, 190, 120, 240) // objeto elegido
    paint(original, 60, 80, 100, 120, 230) // vecino
    paint(original, 100, 100, 150, 120, 80) // sombra continua entre los dos

    const object = createMask(W2, H2)
    const neighbour = createMask(W2, H2)

    for (let y = 80; y < 120; y += 1) {
      for (let x = 150; x < 190; x += 1) object.data[y * W2 + x] = 255
      for (let x = 60; x < 100; x += 1) neighbour.data[y * W2 + x] = 255
    }

    const shadow = detectCastShadow(original, plate, object, { radius: 120, others: neighbour })

    expect(shadow.mask.data[110 * W2 + 140]).toBe(255) // junto al elegido: suya
    expect(shadow.mask.data[110 * W2 + 105]).toBe(0) // junto al vecino: del vecino
    expect(shadow.mask.data[100 * W2 + 80]).toBe(0) // el vecino nunca
  })

  it('sin sombra no agrega nada', () => {
    const object = createMask(W2, H2)

    for (let y = 80; y < 120; y += 1) for (let x = 150; x < 190; x += 1) object.data[y * W2 + x] = 255

    expect(detectCastShadow(flat(150), flat(150), object).pixels).toBe(0)
  })
})
