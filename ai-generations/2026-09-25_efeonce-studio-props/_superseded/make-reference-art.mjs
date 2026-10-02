import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const dir = dirname(fileURLToPath(import.meta.url))
const root = join(dir, '../..')
const art = join(dir, 'reference-art')
await mkdir(art, { recursive: true })

const officialMark = await readFile(join(root, 'public/branding/SVG/isotipo-full-efeonce.svg'), 'utf8')
const officialLogo = await readFile(join(root, 'public/branding/logo-full.svg'), 'utf8')
const paths = [...officialMark.matchAll(/<path class="cls-1" d="([^"]+)"\/>/g)].map(m => m[1])
if (paths.length < 2) throw new Error('No se encontraron los dos trazos de la órbita oficial')

// Derived graphic exploration: the two exact upper orbit paths and the exact dot
// from the official Efeonce isotype. The ship shape is intentionally absent.
const orbitSvg = color => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 727.4 375" width="727" height="375"><g fill="${color}"><path d="${paths[0]}"/><path d="${paths[1]}"/><circle cx="363.7" cy="61.83" r="61.83"/></g></svg>`
const recolorLogo = color => officialLogo.replaceAll('#023c70', color)
await writeFile(join(art, 'orbita-derivada-azul.svg'), orbitSvg('#023C70'))
await writeFile(join(art, 'orbita-derivada-blanca.svg'), orbitSvg('#FFFFFF'))
await writeFile(join(art, 'orbita-derivada-azul.png'), await sharp(Buffer.from(orbitSvg('#023C70'))).resize(1454, 750).png().toBuffer())

const variants = [
  { id: 'blanco', base: '#F7F6F2', ink: '#023C70' },
  { id: 'azul-efeonce', base: '#0375DB', ink: '#FFFFFF' },
  { id: 'naranja-globe', base: '#FF6500', ink: '#FFFFFF' },
  { id: 'magenta-globe', base: '#BB1954', ink: '#FFFFFF' }
]

for (const v of variants) {
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1024"><rect width="2048" height="1024" fill="${v.base}"/></svg>`)
  const orbit = await sharp(Buffer.from(orbitSvg(v.ink))).resize(780, 403).png().toBuffer()
  await sharp(bg).composite([
    { input: orbit, left: 634, top: 255 }
  ]).png().toFile(join(art, `mug-${v.id}.png`))
}

const agendaBg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600"><rect width="1200" height="1600" fill="#023C70"/></svg>')
const agendaOrbit = await sharp(Buffer.from(orbitSvg('#D5E8F5'))).resize(1080, 557).png().toBuffer()
await sharp(agendaBg).composite([
  { input: agendaOrbit, left: 60, top: 425 }
]).png().toFile(join(art, 'agenda-frente.png'))

const markData = Buffer.from(officialMark).toString('base64')
const stickerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 620" width="1100" height="620"><g transform="translate(120 80)">${orbitSvg('#023C70').replace(/<svg[^>]*>|<\/svg>/g, '')}</g><image href="data:image/svg+xml;base64,${markData}" x="830" y="205" width="182" height="129"/></svg>`
await writeFile(join(art, 'stickers-orbita.svg'), stickerSvg)
await sharp(Buffer.from(stickerSvg)).png().toFile(join(art, 'stickers-orbita.png'))

const laptopBg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100"><rect width="1600" height="1100" fill="#C8D0D3"/></svg>')
const laptopOrbit = await sharp(Buffer.from(orbitSvg('#023C70'))).resize(690, 356).png().toBuffer()
await sharp(laptopBg).composite([
  { input: laptopOrbit, left: 455, top: 310 }
]).png().toFile(join(art, 'laptop-tapa.png'))

const boardBg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="120"><rect width="1500" height="120" fill="#EAF6FA"/></svg>')
const boardLogo = await sharp(Buffer.from(recolorLogo('#023C70'))).resize(320, 75).png().toBuffer()
const boardOrbit = await sharp(Buffer.from(orbitSvg('#7AA9C2'))).resize(180, 93).png().toBuffer()
await sharp(boardBg).composite([
  { input: boardOrbit, left: 45, top: 13 },
  { input: boardLogo, left: 1120, top: 22 }
]).png().toFile(join(art, 'pizarra-cabecera.png'))
console.log(`Arte derivada y ${variants.length} texturas creadas en ${art}`)
