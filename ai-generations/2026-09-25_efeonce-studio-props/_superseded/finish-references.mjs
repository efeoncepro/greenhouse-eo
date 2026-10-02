import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const dir = dirname(fileURLToPath(import.meta.url))
const source = join(dir, 'references-transparent')
const dest = join(dir, 'references')
const items = (await readdir(source, { withFileTypes: true })).filter(x => x.isDirectory()).map(x => x.name).sort()
let manifest = []

for (const item of items) {
  await mkdir(join(dest, item), { recursive: true })
  const views = (await readdir(join(source, item))).filter(x => x.endsWith('.png')).sort()
  for (const view of views) {
    const input = await readFile(join(source, item, view))
    const output = join(dest, item, view)
    await sharp({ create: { width: 900, height: 900, channels: 4, background: '#FFFFFF' } })
      .composite([{ input, blend: 'over' }]).png().toFile(output)
    manifest.push({ object: item, view: view.replace('.png', ''), white: `references/${item}/${view}`, alpha: `references-transparent/${item}/${view}` })
  }
}

const cell = 270, cols = 5, rows = items.length, label = 46
const sheet = sharp({ create: { width: cols * cell, height: rows * (cell + label), channels: 4, background: '#F2F3F2' } })
const layers = []
for (let row = 0; row < items.length; row++) {
  const item = items[row]
  const views = manifest.filter(x => x.object === item)
  for (let col = 0; col < views.length; col++) {
    const thumb = await sharp(join(dir, views[col].white)).resize(cell - 16, cell - 16).png().toBuffer()
    layers.push({ input: thumb, left: col * cell + 8, top: row * (cell + label) + 8 })
  }
  const caption = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${label}"><rect width="100%" height="100%" fill="#E1E8EC"/><text x="16" y="29" font-family="Arial" font-weight="bold" font-size="19" fill="#023C70">${item}</text></svg>`
  layers.push({ input: Buffer.from(caption), left: 0, top: row * (cell + label) + cell })
}
await sheet.composite(layers).png().toFile(join(dir, '03-indice-referencias.png'))
await writeFile(join(dir, 'references-manifest.json'), JSON.stringify({ status: 'design-reference-prototype', views: manifest }, null, 2) + '\n')
console.log(`${items.length} objetos/variantes, ${manifest.length} vistas blancas y transparentes`)
