import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const dir = dirname(fileURLToPath(import.meta.url))
const src = join(dir, 'mug-concepts-transparent')
const out = join(dir, 'mug-concepts')
const concepts = (await readdir(src, { withFileTypes: true })).filter(x => x.isDirectory()).map(x => x.name).sort()
const order = ['blanco', 'azul-efeonce', 'naranja-globe', 'magenta-globe']
let manifest = []
for (const concept of concepts) {
  const cells = []
  for (const variant of order) {
    await mkdir(join(out, concept, variant), { recursive: true })
    const views = (await readdir(join(src, concept, variant))).filter(x => x.endsWith('.png')).sort()
    for (let col = 0; col < views.length; col++) {
      const view = views[col]
      const input = await readFile(join(src, concept, variant, view))
      const white = join(out, concept, variant, view)
      await sharp({ create: { width: 900, height: 900, channels: 4, background: '#FFFFFF' } })
        .composite([{ input, blend: 'over' }]).png().toFile(white)
      const thumb = await sharp(white).resize(310, 310).png().toBuffer()
      cells.push({ input: thumb, left: col * 320 + 5, top: order.indexOf(variant) * 360 + 45 })
      manifest.push({ concept, variant, view: view.replace('.png', ''), white: `mug-concepts/${concept}/${variant}/${view}`, alpha: `mug-concepts-transparent/${concept}/${variant}/${view}` })
    }
    const title = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="40"><text x="12" y="28" font-family="Arial" font-size="22" font-weight="bold" fill="#023C70">${variant}</text></svg>`
    cells.push({ input: Buffer.from(title), left: 0, top: order.indexOf(variant) * 360 })
  }
  await sharp({ create: { width: 1280, height: 1440, channels: 4, background: '#EFF2F3' } })
    .composite(cells).png().toFile(join(dir, `04-${concept}.png`))
}
await writeFile(join(dir, 'mug-concepts-manifest.json'), JSON.stringify({ status: 'concept-exploration', views: manifest }, null, 2) + '\n')
console.log(`${concepts.length} conceptos y ${manifest.length} vistas`)
