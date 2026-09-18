import { readFile, writeFile } from 'node:fs/promises'

import sharp from 'sharp'

import { fillEnclosedAlphaHoles } from './fill-alpha-holes'
import { keyBackgroundHoles } from './key-background-holes'

/**
 * Post-proceso de huecos sobre un recorte ya hecho (`pnpm ai:image:rmbg` lo invoca en un proceso aparte:
 * `@imgly/background-removal-node` trae su propio sharp/libvips anidado y cargar dos libvips en el mismo proceso
 * advierte fallas espurias). Orden: primero el relleno de huecos internos (`fill-alpha-holes.ts`), después la llave
 * de fondo opcional (`key-background-holes.ts`); al revés, el borde suave de la llave quedaría como hueco a rellenar.
 *
 * Uso: tsx scripts/ai/fill-alpha-holes-cli.ts <recorte.png> <original.png> [--no-fill-holes]
 *        [--key-background <umbral> <minPx>]
 * Imprime una línea JSON { filledPixels, components, keyed?: { clearedPixels, components } }.
 */
const main = async (): Promise<void> => {
  const argv = process.argv.slice(2)
  const [cutPath, originalPath] = argv

  if (!cutPath || !originalPath) throw new Error('Usage: fill-alpha-holes-cli <cut.png> <original.png> [--no-fill-holes] [--key-background <threshold> <minPx>]')

  const fillHoles = !argv.includes('--no-fill-holes')
  const keyAt = argv.indexOf('--key-background')
  const key = keyAt >= 0 ? { threshold: Number(argv[keyAt + 1]), minPixels: Number(argv[keyAt + 2]) } : null

  if (key && (!Number.isFinite(key.threshold) || !Number.isFinite(key.minPixels))) {
    throw new Error('--key-background requiere <threshold> <minPx> numéricos')
  }

  const cut = await sharp(await readFile(cutPath)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  const original = await sharp(await readFile(originalPath))
    .resize(cut.info.width, cut.info.height)
    .removeAlpha()
    .raw()
    .toBuffer()

  const { width, height } = cut.info
  let rgba: Uint8Array = new Uint8Array(cut.data)
  let filledPixels = 0
  let components = 0
  let changed = false

  if (fillHoles) {
    const fixed = fillEnclosedAlphaHoles(rgba, new Uint8Array(original), width, height)

    rgba = fixed.rgba
    filledPixels = fixed.filledPixels
    components = fixed.components
    changed = fixed.filledPixels > 0
  }

  let keyed: { clearedPixels: number; components: number } | undefined

  if (key) {
    const result = keyBackgroundHoles(rgba, new Uint8Array(original), width, height, key)

    rgba = result.rgba
    keyed = { clearedPixels: result.clearedPixels, components: result.components }
    changed = changed || result.components > 0
  }

  if (changed) {
    const png = await sharp(Buffer.from(rgba), { raw: { width, height, channels: 4 } }).png().toBuffer()

    await writeFile(cutPath, png)
  }

  process.stdout.write(`${JSON.stringify({ filledPixels, components, ...(keyed ? { keyed } : {}) })}\n`)
}

main().catch(err => {
  console.error('FATAL:', (err as Error)?.message ?? err)
  process.exit(1)
})
