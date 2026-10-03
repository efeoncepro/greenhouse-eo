import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { bboxTag, describeLayers, layerFileName, maskFromLayers, plateWithoutLayers, readLayersDocument, selectLayers, type LayersDocument } from './layers'
import { maskStats } from './mask'
import { loadRgba } from './raw'

vi.mock('server-only', () => ({}))

const uploadFalFile = vi.fn()
const runFalModel = vi.fn()

vi.mock('@/lib/ai/fal', () => ({
  uploadFalFile: (...args: unknown[]) => uploadFalFile(...args),
  runFalModel: (...args: unknown[]) => runFalModel(...args)
}))

const { estimateLayerizeUsd, runLayerize } = await import('./adapters/layerize-fal')

let dir: string
let layersJson: string

/** Capa recortada a su caja: un óvalo opaco sobre fondo transparente. */
const ovalLayer = (width: number, height: number) =>
  sharp(Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" fill="#fff"/></svg>`))
    .png()
    .toBuffer()

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'layers-'))
  layersJson = join(dir, 'layers.json')
  await writeFile(join(dir, '00-base.png'), await sharp({ create: { width: 400, height: 200, channels: 3, background: '#888' } }).png().toBuffer())
  await writeFile(join(dir, '01-white-mug.png'), await ovalLayer(80, 60))
  await writeFile(join(dir, '02-grey-notebook.png'), await ovalLayer(100, 40))

  const doc: LayersDocument = {
    kind: 'ai-layers',
    version: 1,
    source: { image: 'foto.png', sha256: 'x', width: 800, height: 400 },
    base: { file: '00-base.png', width: 400, height: 200 },
    layers: [
      { index: 0, zIndex: 0, name: null, description: null, file: '00-base.png', width: 400, height: 200, box: null, alphaCoverage: null },
      { index: 1, zIndex: 1, name: 'White mug', description: 'A white ceramic mug', file: '01-white-mug.png', width: 80, height: 60, box: { left: 250, top: 40, right: 330, bottom: 100 }, alphaCoverage: 0.78 },
      { index: 2, zIndex: 2, name: 'Grey notebook', description: 'A closed grey notebook', file: '02-grey-notebook.png', width: 100, height: 40, box: { left: 260, top: 120, right: 360, bottom: 160 }, alphaCoverage: 0.78 }
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

describe('selección de capas', () => {
  it('elige por índice, por nombre exacto y por fragmento sin ambigüedad', async () => {
    const doc = await readLayersDocument(layersJson)

    expect(selectLayers(doc, ['#2'])[0].name).toBe('Grey notebook')
    expect(selectLayers(doc, ['white mug'])[0].index).toBe(1)
    expect(selectLayers(doc, ['notebook'])[0].index).toBe(2)
    expect(selectLayers(doc, ['ceramic'])[0].index).toBe(1) // también busca en la descripción
  })

  it('el nombre gana sobre la descripción (Layerize describe cada capa citando a las demás)', () => {
    const doc: LayersDocument = {
      kind: 'ai-layers',
      version: 1,
      source: { image: 'x', sha256: 'x', width: 10, height: 10 },
      base: { file: 'b.png', width: 10, height: 10 },
      layers: [
        { index: 1, zIndex: 1, name: 'Oak table', description: 'A table holding a mug and a notebook', file: '1.png', width: 1, height: 1, box: { left: 0, top: 0, right: 1, bottom: 1 }, alphaCoverage: 1 },
        { index: 2, zIndex: 2, name: 'White mug', description: 'A mug on the table', file: '2.png', width: 1, height: 1, box: { left: 0, top: 0, right: 1, bottom: 1 }, alphaCoverage: 1 }
      ],
      request: { prompt: null, imageSize: 'auto' },
      cost: { layerCount: 2, perLayerUsd: null, estimatedUsd: null, note: '' },
      providerMeta: {}
    }

    expect(selectLayers(doc, ['mug'])[0].index).toBe(2)
    expect(selectLayers(doc, ['holding'])[0].index).toBe(1)
  })

  it('rechaza lo ambiguo, lo inexistente y la base', async () => {
    const doc = await readLayersDocument(layersJson)

    expect(() => selectLayers(doc, ['grey'])).not.toThrow() // sólo el cuaderno es grey
    expect(() => selectLayers(doc, ['a'])).toThrow(/varias capas/)
    expect(() => selectLayers(doc, ['lamp'])).toThrow(/Ninguna capa/)
    expect(() => selectLayers(doc, ['#0'])).toThrow(/No hay capa #0/)
    expect(describeLayers(doc)).toBe('#1 White mug, #2 Grey notebook')
  })
})

describe('máscara desde capa', () => {
  it('ubica el alfa con su caja en la base y lo reescala al tamaño de la ORIGINAL (la base mide la mitad)', async () => {
    const mask = await maskFromLayers(layersJson, ['white mug'], { width: 800, height: 400 })
    const box = maskStats(mask).bbox!

    expect([mask.width, mask.height]).toEqual([800, 400])
    // caja de la base 250–330 × 40–100 → en la original 500–660 × 80–200
    expect(box.left).toBeGreaterThanOrEqual(496)
    expect(box.left + box.width).toBeLessThanOrEqual(664)
    expect(box.top).toBeGreaterThanOrEqual(76)
    expect(mask.data[140 * 800 + 580]).toBe(255) // centro del óvalo
    expect(mask.data[82 * 800 + 502]).toBe(0) // esquina de la caja, fuera del óvalo
  })

  it('une varias capas', async () => {
    const both = await maskFromLayers(layersJson, ['#1', '#2'], { width: 800, height: 400 })
    const mug = await maskFromLayers(layersJson, ['#1'], { width: 800, height: 400 })

    expect(maskStats(both).editable).toBeGreaterThan(maskStats(mug).editable)
  })
})

describe('clean plate sin las capas elegidas', () => {
  it('recompone las demás capas sobre la base: borrar la taza no se lleva el cuaderno (ni la mesa)', async () => {
    const doc = await readLayersDocument(layersJson)
    const plate = await loadRgba(await plateWithoutLayers(layersJson, doc, selectLayers(doc, ['white mug']), { width: 800, height: 400 }))
    const at = (x: number, y: number) => plate.data[(y * 800 + x) * 4]

    expect([plate.width, plate.height]).toEqual([800, 400])
    expect(at(580, 140)).toBeLessThan(150) // donde estaba la taza: la base gris
    expect(at(620, 280)).toBeGreaterThan(240) // el cuaderno sigue ahí, recompuesto desde su capa
  })
})

describe('utilidades', () => {
  it('bboxTag convierte fracciones a enteros 0–1000 y acota', () => {
    expect(bboxTag({ x0: 0.1, y0: 0.25, x1: 0.5, y1: 1.2 })).toBe('<bbox>100 250 500 1000</bbox>')
  })

  it('layerFileName produce un slug estable', () => {
    expect(layerFileName(3, 'Taza Café Ñ!')).toBe('03-taza-cafe-n.png')
    expect(layerFileName(1, null)).toBe('01-capa.png')
  })
})

describe('corrida de Layerize (fal simulado)', () => {
  beforeEach(() => {
    uploadFalFile.mockReset()
    runFalModel.mockReset()
  })

  it('la cota usa 16 capas + base y el escalón por área', () => {
    expect(estimateLayerizeUsd(1024, 1024).usd).toBeCloseTo(0.03375 * 17, 4)
    expect(estimateLayerizeUsd(2048, 2048).perLayer).toBe(0.0675)
  })

  it('descarga base y capas, escribe layers.json con cajas y costo, y no vuelve a pagar la misma imagen', async () => {
    const source = join(dir, 'source.png')

    await sharp({ create: { width: 800, height: 600, channels: 3, background: '#777' } }).png().toFile(source)

    const base = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#666' } }).png().toBuffer()
    const layer = await ovalLayer(120, 90)

    uploadFalFile.mockResolvedValue({ url: 'https://fal.media/source.png' })
    runFalModel.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      requestId: 'req-9',
      account: 'FAL_API_KEY',
      errorDetail: null,
      output: {
        layers: [
          { z_index: 0, image: { url: 'https://fal.media/base.png' } },
          { z_index: 1, name: 'White mug', description: 'mug', bounding_box: { absolute: [500, 100, 620, 190], normalized: [625, 167, 775, 317] }, image: { url: 'https://fal.media/l1.png' } }
        ]
      }
    })
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(new Uint8Array(url.endsWith('base.png') ? base : layer))))

    const runRoot = join(dir, 'run')
    const first = await runLayerize({ imagePath: source, runRoot, maxUsd: 5, log: () => undefined })
    const written = JSON.parse(await readFile(first.layersJson, 'utf8')) as LayersDocument

    expect(written.base).toMatchObject({ file: '00-base.png', width: 800, height: 600 })
    expect(written.layers[1]).toMatchObject({ name: 'White mug', file: '01-white-mug.png', box: { left: 500, top: 100, right: 620, bottom: 190 } })
    expect(written.cost.layerCount).toBe(1)
    expect(JSON.stringify(written)).not.toMatch(/https?:/)

    const again = await runLayerize({ imagePath: source, runRoot, maxUsd: 5, log: () => undefined })

    expect(again.reused).toBe(true)
    expect(runFalModel).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })

  it('sobre el tope no llama al proveedor sin --yes, y valida el tamaño de entrada', async () => {
    const source = join(dir, 'source2.png')
    const tiny = join(dir, 'tiny.png')

    await sharp({ create: { width: 900, height: 900, channels: 3, background: '#555' } }).png().toFile(source)
    await sharp({ create: { width: 100, height: 100, channels: 3, background: '#555' } }).png().toFile(tiny)

    await expect(runLayerize({ imagePath: source, runRoot: join(dir, 'run2'), maxUsd: 0.1, log: () => undefined })).rejects.toThrow(/supera el tope/)
    await expect(runLayerize({ imagePath: tiny, runRoot: join(dir, 'run2'), log: () => undefined })).rejects.toThrow(/512²/)
    expect(runFalModel).not.toHaveBeenCalled()
  })
})
