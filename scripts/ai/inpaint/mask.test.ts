import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import {
  assertMaskUsable,
  createMask,
  cropMask,
  dilate,
  encodeMaskPng,
  erode,
  feather,
  intersect,
  invert,
  loadMask,
  maskFromAlpha,
  maskFromLuminance,
  maskFromPolygon,
  maskFromRect,
  maskStats,
  parsePolygon,
  parseRect,
  resizeMask,
  toProviderMaskPng,
  union,
  MaskError
} from './mask'
import { applyMaskOperations, buildMaskFromSources, parseMaskArgs } from './mask-cli'
import { readRaw, RawChannelError, singleChannel } from './raw'

const at = (mask: { width: number; data: Uint8Array }, x: number, y: number) => mask.data[y * mask.width + x]

describe('fuentes de máscara', () => {
  it('el rectángulo abre exactamente los píxeles cuyo centro cae dentro', () => {
    const mask = maskFromRect(10, 10, { x0: 0.2, y0: 0.2, x1: 0.5, y1: 0.5 })
    const stats = maskStats(mask)

    expect(stats.editable).toBe(9)
    expect(stats.bbox).toEqual({ left: 2, top: 2, width: 3, height: 3 })
    expect(at(mask, 1, 1)).toBe(0)
  })

  it('el polígono rellena par-impar y deja fuera lo exterior', () => {
    const mask = maskFromPolygon(20, 20, [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]])

    expect(at(mask, 10, 10)).toBe(255)
    expect(at(mask, 0, 0)).toBe(0)
    expect(maskStats(mask).editable).toBe(16 * 16)
  })

  it('parsea rectángulos y polígonos y rechaza basura', () => {
    expect(parseRect('0.1,0.2,0.3,0.4')).toEqual({ x0: 0.1, y0: 0.2, x1: 0.3, y1: 0.4 })
    expect(parsePolygon('0,0;1,0;1,1')).toHaveLength(3)
    expect(() => parseRect('0.1,0.2')).toThrow(MaskError)
    expect(() => maskFromRect(10, 10, { x0: 0.5, y0: 0, x1: 0.2, y1: 1 })).toThrow(MaskError)
    expect(() => maskFromRect(10, 10, { x0: -1, y0: 0, x1: 0.2, y1: 1 })).toThrow(MaskError)
  })

  it('lee el alfa: transparente = editable por defecto, opaco con --alpha-editable opaque', async () => {
    const rgba = Buffer.alloc(4 * 4 * 4, 255)

    rgba[3] = 0 // píxel (0,0) transparente
    const png = await sharp(rgba, { raw: { width: 4, height: 4, channels: 4 } }).png().toBuffer()
    const transparent = await maskFromAlpha(png)
    const opaque = await maskFromAlpha(png, { editable: 'opaque' })

    expect(at(transparent, 0, 0)).toBe(255)
    expect(maskStats(transparent).editable).toBe(1)
    expect(maskStats(opaque).editable).toBe(15)
  })

  it('lee la luminancia con umbral', async () => {
    const gray = Buffer.from([0, 200, 100, 255])
    const png = await sharp(gray, { raw: { width: 2, height: 2, channels: 1 } }).png().toBuffer()

    expect(Array.from((await maskFromLuminance(png)).data)).toEqual([0, 255, 0, 255])
    expect(Array.from((await maskFromLuminance(png, { editable: 'dark' })).data)).toEqual([255, 0, 255, 0])
  })
})

describe('operaciones', () => {
  const dot = () => {
    const mask = createMask(21, 21)

    mask.data[10 * 21 + 10] = 255

    return mask
  }

  it('dilata y erosiona con distancia euclidiana', () => {
    const grown = dilate(dot(), 3)

    expect(at(grown, 13, 10)).toBe(255)
    expect(at(grown, 14, 10)).toBe(0)
    expect(at(grown, 12, 12)).toBe(255) // √8 ≤ 3
    expect(at(grown, 13, 13)).toBe(0) // √18 > 3

    const shrunk = erode(grown, 1)

    expect(at(shrunk, 10, 10)).toBe(255)
    expect(at(shrunk, 13, 10)).toBe(0)
  })

  it('invierte, une e intersecta', () => {
    const a = maskFromRect(10, 1, { x0: 0, y0: 0, x1: 0.5, y1: 1 })
    const b = maskFromRect(10, 1, { x0: 0.3, y0: 0, x1: 1, y1: 1 })

    expect(maskStats(invert(a)).editable).toBe(5)
    expect(maskStats(union(a, b)).editable).toBe(10)
    expect(maskStats(intersect(a, b)).editable).toBe(2)
    expect(() => union(a, createMask(3, 3))).toThrow(MaskError)
  })

  it('difumina sin perder el canal único y crea borde suave', async () => {
    const soft = await feather(maskFromRect(40, 40, { x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.75 }), 6)

    expect(soft.data).toHaveLength(40 * 40)
    expect(maskStats(soft).soft).toBeGreaterThan(0)
  })

  it('el difuminado conserva el núcleo en 255 y los restos lejanos en 0 (regresión del canario 2026-10-02)', async () => {
    const soft = await feather(maskFromRect(600, 400, { x0: 0.1, y0: 0.1, x1: 0.4, y1: 0.7 }), 24)
    const stats = maskStats(soft)

    expect(at(soft, 150, 160)).toBe(255)
    // El núcleo erosionado (rect 180×240 menos 24 px por lado = 132×192) queda entero en 255.
    expect(stats.editable).toBeGreaterThanOrEqual(132 * 192)
    expect(at(soft, 590, 390)).toBe(0)
  })

  it('reescala y recorta conservando 1 canal', async () => {
    const mask = maskFromRect(8, 8, { x0: 0, y0: 0, x1: 0.5, y1: 0.5 })
    const big = await resizeMask(mask, 16, 16)

    expect(big.data).toHaveLength(256)
    expect(at(big, 2, 2)).toBe(255)

    const crop = cropMask(mask, { left: 0, top: 0, width: 4, height: 4 })

    expect(maskStats(crop).editable).toBe(16)
  })
})

describe('trampa de canales de sharp (regresión)', () => {
  it('sharp devuelve 3 canales tras blur sobre 1 canal, y readRaw lo rechaza en vez de leer corrido', async () => {
    const plane = new Uint8Array(8 * 8)

    plane[27] = 255

    await expect(readRaw(singleChannel(plane, 8, 8).blur(1), 1, 'prueba')).rejects.toThrow(RawChannelError)
    await expect(readRaw(singleChannel(plane, 8, 8).blur(1).toColourspace('b-w'), 1, 'prueba')).resolves.toMatchObject({ channels: 1 })
  })

  it('rechaza una máscara 100 % editable (el síntoma de la trampa) y una vacía, salvo pedido explícito', () => {
    expect(() => assertMaskUsable(createMask(4, 4, 255))).toThrow(/100 %/)
    expect(() => assertMaskUsable(createMask(4, 4, 0))).toThrow(/ningún píxel/)
    expect(assertMaskUsable(createMask(4, 4, 255), { allowFull: true }).editable).toBe(16)
    expect(assertMaskUsable(createMask(4, 4, 0), { allowEmpty: true }).editable).toBe(0)
  })
})

describe('convenciones de proveedor', () => {
  const mask = () => {
    const m = createMask(3, 1)

    m.data.set([0, 128, 255])

    return m
  }

  it('white-editable ida y vuelta', async () => {
    const back = await loadMask(await toProviderMaskPng(mask(), 'white-editable'), 'white-editable')

    expect(Array.from(back.data)).toEqual([0, 128, 255])
  })

  it('alpha-transparent-editable: alfa 0 donde se edita, ida y vuelta sin pérdida', async () => {
    const png = await toProviderMaskPng(mask(), 'alpha-transparent-editable')
    const raw = await sharp(png).raw().toBuffer({ resolveWithObject: true })

    expect(raw.info.channels).toBe(4)
    expect([raw.data[3], raw.data[7], raw.data[11]]).toEqual([255, 127, 0])
    expect(Array.from((await loadMask(png, 'alpha-transparent-editable')).data)).toEqual([0, 128, 255])
  })

  it('el formato canónico de disco es escala de grises de 1 canal', async () => {
    const meta = await sharp(await encodeMaskPng(mask())).metadata()

    expect(meta.channels).toBe(1)
  })
})

describe('CLI ai:mask', () => {
  it('une fuentes y aplica operaciones en orden fijo', async () => {
    const args = parseMaskArgs(['--rect', '0,0,0.5,1', '--rect', '0.5,0,1,0.5', '--invert', '--dilate', '0', '--out', 'x.png'])
    const built = await buildMaskFromSources(args, 10, 10)

    expect(maskStats(built).editable).toBe(75)
    expect(maskStats(await applyMaskOperations(built, args)).editable).toBe(25)
  })

  it('rechaza flags desconocidas y valores faltantes', () => {
    expect(() => parseMaskArgs(['--rectangulo', '1'])).toThrow(/desconocida/)
    expect(() => parseMaskArgs(['--rect'])).toThrow(/necesita un valor/)
    expect(() => parseMaskArgs(['--feather', '-3'])).toThrow(/≥ 0/)
  })

  it('exige al menos una fuente', async () => {
    await expect(buildMaskFromSources(parseMaskArgs([]), 4, 4)).rejects.toThrow(/al menos una fuente/)
  })
})
