/**
 * `render.background: "transparent"` (TASK-1919): una plantilla puede salir como CAPA con canal alfa para que
 * otra herramienta la monte sobre un video o una foto. El motor lo honra sin tocar a los demás catálogos, y el
 * gate de tinta pondera por alfa: una capa vacía no pasa por "lámina con contenido" aunque su RGB diga negro.
 */

import fs from 'node:fs'
import path from 'node:path'

import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'

import { composeArtifact, type ArtifactCatalog, type DeckPlan } from '../index'
import { assertSlideHasInk } from '../quality-gates'

const TOY_DIR = path.resolve(__dirname, 'fixtures/toy-transparent')

const layerCatalog: ArtifactCatalog = {
  name: 'toy-transparent',
  ownerOrgId: 'global',
  templatesDir: TOY_DIR,
  outputTarget: 'png-set',
  resolvers: {}
}

const plan: DeckPlan = {
  tenderId: 'TOY-LAYER',
  slides: [{ slideId: 'capa', contentType: 'layer', template: 'LayerCard', slots: { caption: 'Producción' } }]
}

const alphaAt = (png: PNG, x: number, y: number): number => png.data[(y * png.width + x) * 4 + 3]!

describe('plantilla con fondo transparente', () => {
  it('sale como PNG con canal alfa: esquinas transparentes y el contenido opaco', async () => {
    const outDir = path.resolve(process.cwd(), '.captures/composer-toy-transparent')

    fs.rmSync(outDir, { recursive: true, force: true })

    const result = await composeArtifact(layerCatalog, plan, outDir)
    const png = PNG.sync.read(fs.readFileSync(result.slidePaths[0]!))

    expect(png.width).toBe(800)
    expect(png.height).toBe(450)

    for (const [x, y] of [
      [0, 0],
      [799, 0],
      [0, 449],
      [799, 449]
    ]) {
      expect(alphaAt(png, x, y), `esquina ${x},${y}`).toBe(0)
    }

    // El centro del rótulo es tinta opaca.
    expect(alphaAt(png, 360, 220)).toBe(255)
  })
})

describe('gate de tinta ponderado por alfa', () => {
  const pngOf = (fill: (png: PNG) => void): Buffer => {
    const png = new PNG({ width: 320, height: 180 })

    png.data.fill(0)
    fill(png)

    return PNG.sync.write(png)
  }

  it('una capa transparente vacía se rechaza como lámina en blanco', () => {
    expect(() => assertSlideHasInk(pngOf(() => undefined), 'capa-vacia')).toThrow(/vacía/)
  })

  it('una capa transparente con contenido pasa', () => {
    const conTinta = pngOf(png => {
      for (let y = 40; y < 140; y++) {
        for (let x = 20; x < 300; x += 2) {
          const i = (y * png.width + x) * 4

          png.data[i] = 255
          png.data[i + 1] = 255
          png.data[i + 2] = 255
          png.data[i + 3] = 255
        }
      }
    })

    expect(() => assertSlideHasInk(conTinta, 'capa-con-tinta')).not.toThrow()
  })
})
