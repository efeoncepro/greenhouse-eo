import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { maskStats } from './mask'
import { loadRgba } from './raw'
import { buildRolePrompt, loadSketch, maskFromSketch } from './sketch'

let dir: string
let basePath: string

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'sketch-'))
  basePath = join(dir, 'base.png')
  await sharp({ create: { width: 200, height: 100, channels: 3, background: '#807060' } }).png().toFile(basePath)
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

const stroke = (x: number, y: number, w: number, h: number, color = '#ff00ff') =>
  Buffer.from(`<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="3"/></svg>`)

describe('boceto', () => {
  it('overlay transparente: detecta el trazo y lo compone sobre la base como guía', async () => {
    const path = join(dir, 'overlay.png')

    await sharp(stroke(40, 20, 50, 40)).png().toFile(path)

    const base = await loadRgba(basePath)
    const sketch = await loadSketch(path, base)
    const box = maskStats(sketch.strokes).bbox!

    expect(sketch.form).toBe('overlay')
    expect(box.left).toBeGreaterThanOrEqual(37)
    expect(box.left + box.width).toBeLessThanOrEqual(93)
    expect(sketch.guide.data[(20 * 200 + 40) * 4]).toBeGreaterThan(200) // magenta en la guía
    expect(sketch.guide.data[(80 * 200 + 150) * 4]).toBe(base.data[(80 * 200 + 150) * 4]) // fuera del trazo, la base
  })

  it('foto anotada (sin alfa): detecta el trazo por diferencia con la base', async () => {
    const path = join(dir, 'annotated.png')

    await sharp(basePath).composite([{ input: stroke(120, 30, 40, 30) }]).png().toFile(path)

    const sketch = await loadSketch(path, await loadRgba(basePath))
    const box = maskStats(sketch.strokes).bbox!

    expect(sketch.form).toBe('annotated')
    expect(box.left).toBeGreaterThanOrEqual(117)
    expect(box.top).toBeGreaterThanOrEqual(27)
  })

  it('la máscara derivada es la caja del trazo con holgura y borde suave, sin salir de la imagen', async () => {
    const path = join(dir, 'overlay2.png')

    await sharp(stroke(150, 10, 40, 30)).png().toFile(path)

    const mask = await maskFromSketch((await loadSketch(path, await loadRgba(basePath))).strokes, 20, 4)
    const stats = maskStats(mask)

    expect(stats.bbox!.left).toBeLessThanOrEqual(130)
    expect(stats.bbox!.left + stats.bbox!.width).toBe(200)
    expect(stats.soft).toBeGreaterThan(0)
  })

  it('rechaza un boceto sin trazos y de otro tamaño', async () => {
    const empty = join(dir, 'empty.png')
    const other = join(dir, 'other.png')

    await sharp({ create: { width: 200, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toFile(empty)
    await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).png().toFile(other)

    await expect(loadSketch(empty, await loadRgba(basePath))).rejects.toThrow(/no tiene trazos/)
    await expect(loadSketch(other, await loadRgba(basePath))).rejects.toThrow(/deben medir lo mismo/)
  })
})

describe('prompt con roles', () => {
  it('sin boceto ni referencias deja el prompt intacto', () => {
    expect(buildRolePrompt({ prompt: 'a plant', hasSketch: false, referenceCount: 0 })).toBe('a plant')
  })

  it('numera boceto y referencias y cierra con lo que se preserva', () => {
    const text = buildRolePrompt({ prompt: 'Add the lamp.', hasSketch: true, referenceCount: 2 })

    expect(text).toMatch(/Image 1 is the photo to edit/)
    expect(text).toMatch(/Image 2 is the same photo with a hand-drawn sketch/)
    expect(text).toMatch(/Image 3 is a reference/)
    expect(text).toMatch(/Image 4 is a reference/)
    expect(text).toMatch(/Add the lamp\.\nChange only that area/)
  })
})
