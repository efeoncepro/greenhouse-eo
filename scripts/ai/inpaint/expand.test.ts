import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { InpaintImageAdapter } from './adapters/types'
import { pickGridSize } from './crop'
import { buildExpandedCanvas, expansionMask, planExpansion } from './expand'
import { maskStats } from './mask'
import { loadRgba, type RgbaImage } from './raw'

vi.mock('server-only', () => ({}))

const { runExpand } = await import('./expand-run')

const noise = (width: number, height: number, seed: number): RgbaImage => {
  const data = new Uint8Array(width * height * 4)
  let state = seed

  for (let i = 0; i < data.length; i += 1) {
    state = (state * 1103515245 + 12345) % 2147483648
    data[i] = i % 4 === 3 ? 255 : state % 256
  }

  return { width, height, channels: 4, hadAlpha: false, data }
}

describe('plan de expansión', () => {
  it('4:5 → 9:16 crece sólo en alto; 1:1 → 1.91:1 sólo en ancho', () => {
    const vertical = planExpansion({ sourceWidth: 1080, sourceHeight: 1350, to: '9:16' })
    const horizontal = planExpansion({ sourceWidth: 1024, sourceHeight: 1024, to: '1.91:1' })

    expect(vertical.canvas).toEqual({ width: 1080, height: 1920 })
    expect(vertical.scene).toEqual({ left: 0, top: 285, width: 1080, height: 1350 })
    expect(horizontal.canvas).toEqual({ width: 1956, height: 1024 })
    expect(horizontal.scene.left).toBe(466)
  })

  it('--canvas + --scale + --anchor, y rechaza lo que no expande', () => {
    const plan = planExpansion({ sourceWidth: 1000, sourceHeight: 1000, canvas: { width: 2048, height: 1072 }, scale: 0.8, anchor: 'right' })

    expect(plan.scene.height).toBe(858)
    expect(plan.scene.left + plan.scene.width).toBe(2048)
    expect(() => planExpansion({ sourceWidth: 1000, sourceHeight: 1000, to: '1:1' })).toThrow(/no hay nada que expandir/)
    expect(() => planExpansion({ sourceWidth: 1000, sourceHeight: 1000, to: '7:3' })).toThrow(/Formato desconocido/)
  })
})

describe('lienzo y máscara', () => {
  it('la escena queda intacta en su lugar y el área nueva es espejo de sus bordes', async () => {
    const source = noise(40, 30, 1)
    const plan = planExpansion({ sourceWidth: 40, sourceHeight: 30, canvas: { width: 40, height: 50 } })
    const canvas = await buildExpandedCanvas(source, plan)
    const at = (img: RgbaImage, x: number, y: number) => Array.from(img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 4))

    expect(at(canvas, 5, plan.scene.top + 3)).toEqual(at(source, 5, 3))
    // La fila justo arriba de la escena es el espejo de su primera fila.
    expect(at(canvas, 7, plan.scene.top - 1)).toEqual(at(source, 7, 0))
  })

  it('la máscara abre el área nueva, protege el interior y funde sólo los bordes que dan al área nueva', () => {
    const plan = planExpansion({ sourceWidth: 100, sourceHeight: 100, canvas: { width: 100, height: 200 } })
    const mask = expansionMask(plan, 10)
    const at = (x: number, y: number) => mask.data[y * 100 + x]

    expect(at(50, 10)).toBe(255) // área nueva arriba
    expect(at(50, plan.scene.top + 50)).toBe(0) // interior
    expect(at(50, plan.scene.top + 2)).toBeGreaterThan(0) // franja superior
    expect(at(1, plan.scene.top + 50)).toBe(0) // borde izquierdo pegado al lienzo: no se funde
    expect(maskStats(mask).protected).toBeGreaterThan(0)
  })
})

describe('pnpm ai:inpaint expand', () => {
  let dir: string
  let image: string

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'expand-'))
    image = join(dir, 'escena.png')

    const source = noise(320, 400, 3)

    await writeFile(image, await sharp(Buffer.from(source.data), { raw: { width: 320, height: 400, channels: 4 } }).removeAlpha().png().toBuffer())
  })

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('expande a 9:16 y deja la escena idéntica fuera de la franja de fundido', async () => {
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
      pickSize: () => (aspect, area) => pickGridSize(aspect, area, { step: 16, minArea: 65_536, maxArea: 1_048_576, maxEdge: 2048, maxRatio: 3 }),
      estimate: async () => ({ usd: 0.01, basis: 'fake' }),
      run: async ({ size }) => ({
        image: await sharp({ create: { width: size.width, height: size.height, channels: 3, background: '#30a060' } }).png().toBuffer(),
        providerModel: 'fake-1',
        outputUsd: null,
        usage: null,
        meta: {}
      })
    }

    const result = await runExpand({ imagePath: image, to: '9:16', blend: 16, prompt: 'a wooden desk', adapter, runRoot: join(dir, 'run'), log: () => undefined })
    const final = await loadRgba(join(result.runDir, result.manifest.candidates[0].final))
    const source = await loadRgba(image)
    const { scene } = result.plan
    const pixel = (img: RgbaImage, x: number, y: number) => Array.from(img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3))

    expect([final.width, final.height]).toEqual([320, 568])
    expect(result.manifest.candidates[0].verdict).toBe('PASS')
    expect(pixel(final, 100, scene.top + 200)).toEqual(pixel(source, 100, 200)) // interior intacto
    expect(pixel(final, 100, 10)).toEqual([48, 160, 96]) // área nueva = lo que generó el modelo
  }, 30_000) // Procesa imágenes reales: con coverage en el runner de 2 núcleos tarda ~15 s (2026-10-04), al filo del global.
})
