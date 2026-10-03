import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { LayersDocument } from './layers'
import { loadRgba } from './raw'

vi.mock('server-only', () => ({}))

const { runMove } = await import('./move')
const { runPlace } = await import('./place')

const W = 400
const H = 300

let dir: string
let image: string
let layersJson: string

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'move-'))
  image = join(dir, 'foto.png')

  const data = Buffer.alloc(W * H * 3, 150)

  for (let y = 100; y < 160; y += 1) for (let x = 250; x < 330; x += 1) data.set([40, 90, 200], (y * W + x) * 3)
  await writeFile(image, await sharp(data, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer())

  await mkdir(join(dir, 'layers'), { recursive: true })
  layersJson = join(dir, 'layers', 'layers.json')
  await writeFile(join(dir, 'layers', '00-base.png'), await sharp({ create: { width: W, height: H, channels: 3, background: '#969696' } }).png().toBuffer())
  // Capa REGENERADA con otro color: si el comando usara sus píxeles, el elemento movido saldría rojo.
  await writeFile(join(dir, 'layers', '01-box.png'), await sharp({ create: { width: 80, height: 60, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }).png().toBuffer())

  const doc: LayersDocument = {
    kind: 'ai-layers',
    version: 1,
    source: { image, sha256: 'x', width: W, height: H },
    base: { file: '00-base.png', width: W, height: H },
    layers: [
      { index: 0, zIndex: 0, name: null, description: null, file: '00-base.png', width: W, height: H, box: null, alphaCoverage: null },
      { index: 1, zIndex: 1, name: 'Blue box', description: 'box', file: '01-box.png', width: 80, height: 60, box: { left: 250, top: 100, right: 330, bottom: 160 }, alphaCoverage: 1 }
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

describe('pnpm ai:inpaint move', () => {
  it('mueve el elemento con píxeles de la ORIGINAL, rellena el hueco con el plate y deja el resto idéntico', async () => {
    const result = await runMove({ imagePath: image, layersJson, layerSelectors: ['box'], dx: -180, dy: 60, harmonize: 'off', runRoot: join(dir, 'run'), log: () => undefined })
    const final = await loadRgba(result.final)
    const px = (x: number, y: number) => Array.from(final.data.slice((y * W + x) * 4, (y * W + x) * 4 + 3))

    expect(result.verdict).toBe('PASS')
    expect(result.untouched.maxDelta).toBe(0)
    expect(px(110, 190)).toEqual([40, 90, 200]) // el elemento en su nueva posición, con su color ORIGINAL (no el rojo de la capa)
    expect(px(290, 130)[2]).toBeLessThan(170) // el hueco ya no es azul
  })

  it('rechaza no moverse y una escala absurda', async () => {
    await expect(runMove({ imagePath: image, layersJson, layerSelectors: ['box'], harmonize: 'off', runRoot: join(dir, 'x'), log: () => undefined })).rejects.toThrow(/no se mueve/)
    await expect(runMove({ imagePath: image, layersJson, layerSelectors: ['box'], scale: 9, harmonize: 'off', runRoot: join(dir, 'x'), log: () => undefined })).rejects.toThrow(/--scale/)
  })
})

describe('pnpm ai:inpaint place', () => {
  it('incorpora el elemento en OTRA imagen con píxeles del origen y deja el destino idéntico fuera de lo pegado', async () => {
    const target = join(dir, 'destino.png')

    await writeFile(target, await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 20, g: 120, b: 40 } } }).png().toBuffer())

    const result = await runPlace({
      imagePath: target,
      sourceImagePath: image,
      layersJson,
      layerSelectors: ['box'],
      at: { x: 0.5, y: 0.5 },
      width: 0.2,
      finish: 'off',
      runRoot: join(dir, 'run-place'),
      log: () => undefined
    })

    const final = await loadRgba(result.final)
    const px = (x: number, y: number) => Array.from(final.data.slice((y * 600 + x) * 4, (y * 600 + x) * 4 + 3))

    expect(result.verdict).toBe('PASS')
    expect(px(300, 200)).toEqual([40, 90, 200]) // el color del ORIGEN, no el rojo de la capa
    expect(px(20, 20)).toEqual([20, 120, 40]) // el destino intacto
    // 0.2 × 600 = 120 px de ancho; el alto conserva la proporción 80:60
    expect(px(300 - 58, 200)).toEqual([40, 90, 200])
    expect(px(300 - 63, 200)).toEqual([20, 120, 40])
  })

  it('valida --at y --width', async () => {
    const base = { imagePath: image, sourceImagePath: image, layersJson, layerSelectors: ['box'], finish: 'off' as const, runRoot: join(dir, 'x'), log: () => undefined }

    await expect(runPlace({ ...base, at: { x: 1.4, y: 0.5 } })).rejects.toThrow(/--at/)
    await expect(runPlace({ ...base, at: { x: 0.5, y: 0.5 }, width: 2 })).rejects.toThrow(/--width/)
  })
})
