/**
 * Fotos sintéticas del manifiesto de ejemplo de Glitch (TASK-1923).
 *
 * El ejemplo `edition-17.example.json` no usa ninguna foto de terceros: este script dibuja ocho imágenes propias,
 * deterministas (SVG → PNG con sharp, sin azar ni reloj), más la del host del video,, con una silueta de persona donde el manifiesto declara una
 * región de rostro, para que las pruebas de la falla en bytes tengan algo que evitar.
 *
 *   pnpm tsx scripts/glitch/make-example-photos.ts [--check]
 *
 * `--check` falla si alguna foto falta o cambió (las fotos se versionan junto al ejemplo).
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

const EXAMPLE_DIR = path.resolve(process.cwd(), 'src/lib/glitch-composition/examples')
const MANIFEST = path.join(EXAMPLE_DIR, 'edition-17.example.json')

type Region = { x: number; y: number; w: number; h: number }

// Tonos de las escenas: sólo grises y azules apagados (la plantilla aplica el duotono navy encima).
const SCENES = ['#3d4f63', '#56606b', '#2f4258', '#4a5a6a', '#39495b', '#5b6673', '#44566a', '#34465a']

const svgFor = (index: number, faces: readonly Region[], WIDTH = 1200, HEIGHT = 750) => {
  const base = SCENES[index % SCENES.length]

  const blocks = Array.from({ length: 5 }, (_, k) => {
    const x = ((index * 97 + k * 211) % (WIDTH - 260)) + 20
    const y = ((index * 53 + k * 149) % (HEIGHT - 220)) + 20
    const w = 160 + ((index + k) % 3) * 60
    const h = 120 + ((index * 2 + k) % 4) * 40

    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#ffffff" fill-opacity="${0.08 + k * 0.03}"/>`
  }).join('')

  const people = faces
    .map((f) => {
      const cx = (f.x + f.w / 2) * WIDTH
      const cy = (f.y + f.h / 2) * HEIGHT
      const rx = (f.w * WIDTH) / 2
      const ry = (f.h * HEIGHT) / 2

      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#d9dde2"/><rect x="${cx - rx * 1.6}" y="${cy + ry}" width="${rx * 3.2}" height="${HEIGHT}" rx="${rx}" fill="#c3c9d0"/>`
    })
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect width="${WIDTH}" height="${HEIGHT}" fill="${base}"/><rect y="${HEIGHT * 0.62}" width="${WIDTH}" height="${HEIGHT * 0.38}" fill="#000000" fill-opacity="0.18"/>${blocks}${people}</svg>`
}

const main = async () => {
  const check = process.argv.includes('--check')

  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
    news: { photo: { file: string; faceRegions: Region[] } }[]
    video: { hostPhoto: { file: string; faceRegions: Region[] } | null } | null
  }

  // Las ocho noticias (1200 × 750) y, si el ejemplo la declara, la foto del host del video (1000 × 1000).
  const jobs = manifest.news.map((news, index) => ({ file: news.photo.file, svg: svgFor(index, news.photo.faceRegions) }))
  const host = manifest.video?.hostPhoto

  if (host) jobs.push({ file: host.file, svg: svgFor(8, host.faceRegions, 1000, 1000) })

  let drift = 0

  for (const job of jobs) {
    const target = path.join(EXAMPLE_DIR, job.file)
    const png = await sharp(Buffer.from(job.svg)).png({ compressionLevel: 9, palette: true }).toBuffer()

    if (check) {
      const same = existsSync(target) && createHash('sha256').update(readFileSync(target)).digest('hex') === createHash('sha256').update(png).digest('hex')

      if (!same) {
        drift++
        console.error(`✗ ${job.file} falta o cambió; corre pnpm tsx scripts/glitch/make-example-photos.ts`)
      }

      continue
    }

    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, png)
    console.log(`✓ ${job.file} (${png.length} bytes)`)
  }

  if (drift > 0) process.exit(1)
}

void main()
