// Hoja de contacto: grilla de PNG con rótulo. Uso: node hoja.mjs <salida.png> <columnas> <celda> <png...>
import { createRequire } from 'node:module'
import path from 'node:path'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')
const [out, colsS, cellS, ...files] = process.argv.slice(2)
const cols = Number(colsS), cell = Number(cellS), lab = 34
const rows = Math.ceil(files.length / cols)
const W = cols * cell, H = rows * (cell + lab)
const comps = []
for (const [i, f] of files.entries()) {
  const x = (i % cols) * cell, y = Math.floor(i / cols) * (cell + lab)
  const img = await sharp(f).resize(cell - 24, cell - 24, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  comps.push({ input: img, left: x + 12, top: y + 12 })
  const name = path.basename(f).replace(/^dots-/, '').replace(/\.(png|jpg|webp)$/, '').replace(/-1024$/, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="${lab}"><text x="${cell / 2}" y="22" font-family="Helvetica" font-size="16" fill="#333" text-anchor="middle">${name}</text></svg>`
  comps.push({ input: Buffer.from(svg), left: x, top: y + cell })
}
await sharp({ create: { width: W, height: H, channels: 4, background: '#F2F1EE' } }).composite(comps).png().toFile(out)
console.log(out, W, H)
