import { readFile, writeFile } from 'node:fs/promises'

import sharp from 'sharp'

import { fillEnclosedAlphaHoles } from './fill-alpha-holes'

/**
 * Paso de relleno de huecos internos sobre un recorte ya hecho (`pnpm ai:image:rmbg` lo invoca en un proceso
 * aparte: `@imgly/background-removal-node` trae su propio sharp/libvips anidado y cargar dos libvips en el
 * mismo proceso advierte fallas espurias).
 *
 * Uso: tsx scripts/ai/fill-alpha-holes-cli.ts <recorte.png> <original.png>
 * Imprime una línea JSON { filledPixels, components }.
 */
const main = async (): Promise<void> => {
  const [cutPath, originalPath] = process.argv.slice(2)

  if (!cutPath || !originalPath) throw new Error('Usage: fill-alpha-holes-cli <cut.png> <original.png>')

  const cut = await sharp(await readFile(cutPath)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  const original = await sharp(await readFile(originalPath))
    .resize(cut.info.width, cut.info.height)
    .removeAlpha()
    .raw()
    .toBuffer()

  const fixed = fillEnclosedAlphaHoles(new Uint8Array(cut.data), new Uint8Array(original), cut.info.width, cut.info.height)

  if (fixed.filledPixels > 0) {
    const png = await sharp(Buffer.from(fixed.rgba), { raw: { width: cut.info.width, height: cut.info.height, channels: 4 } }).png().toBuffer()

    await writeFile(cutPath, png)
  }

  process.stdout.write(`${JSON.stringify({ filledPixels: fixed.filledPixels, components: fixed.components })}\n`)
}

main().catch(err => {
  console.error('FATAL:', (err as Error)?.message ?? err)
  process.exit(1)
})
