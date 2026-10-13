import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { efeonceGraphicLine as gl } from '../../../../axis-design-system/packages/tokens/dist/index.js'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const list = JSON.parse(await fs.readFile(path.join(root, 'flat/selection.json'), 'utf8'))
const width = 2048, height = 640, background = gl.color.dark
const labels = list.map((g, i) => `<text x="${i * 512 + 256}" y="594" text-anchor="middle" fill="white" font-size="29">${g.label}</text>`).join('')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${background}"/><g font-family="${gl.type.question.family}"><text x="28" y="44" font-size="29" fill="white">Efeonce · cuatro siluetas nuevas candidatas · reposo / respuesta</text>${labels}</g></svg>`
const layers = [{ input: Buffer.from(svg), left: 0, top: 0 }]
for (const [i, glyph] of list.entries()) {
  for (const [j, state] of ['reposo', 'respuesta'].entries()) {
    const input = await sharp(path.join(root, `flat/control/${glyph.key}-${state}-oscuro.svg`), { density: 288 }).resize(225, 225).png().toBuffer()
    layers.push({ input, left: i * 512 + 30 + j * 230, top: 185 })
  }
}
await sharp({ create: { width, height, channels: 3, background } }).composite(layers).png().toFile(path.join(root, 'flat/proposal.png'))
