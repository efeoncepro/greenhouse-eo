// Comparison layout only. Source PNGs remain intact; no retouching, matting or color changes.
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const icons = ['01-lupa', '02-grafico', '03-carpeta', '04-escudo']
const names = ['Lupa', 'Gráfico de barras', 'Carpeta', 'Escudo']
const tile = 512
const width = tile * 4
const height = 1220
const layers = []
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<rect width="100%" height="100%" fill="#f2f4f7"/>
<g fill="#20252c" font-family="Arial, sans-serif">
<text x="24" y="48" font-size="32" font-weight="bold">Flare · max · PNG nativo 2048 × 2048 por icono</text>
<text x="24" y="630" font-size="32" font-weight="bold">Seedream 5 Pro · standard · PNG nativo 2048 × 2048 por icono</text>
${names.map((n, i) => `<text x="${i * tile + tile / 2}" y="${height - 20}" text-anchor="middle" font-size="27">${n}</text>`).join('')}
</g></svg>`
layers.push({ input: Buffer.from(svg), left: 0, top: 0 })
for (const [row, lane] of ['flare', 'seedream'].entries()) {
  for (const [col, icon] of icons.entries()) {
    const input = await sharp(path.join(root, lane, `${icon}.png`)).resize(tile, tile).png().toBuffer()
    layers.push({ input, left: col * tile, top: row === 0 ? 66 : 650 })
  }
}
await sharp({ create: { width, height, channels: 3, background: '#f2f4f7' } })
  .composite(layers).png().toFile(path.join(root, 'comparison.png'))
console.log(path.join(root, 'comparison.png'))
