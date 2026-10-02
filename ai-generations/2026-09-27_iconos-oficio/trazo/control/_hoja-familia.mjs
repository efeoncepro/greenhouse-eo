import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
const req = createRequire('/Users/jreye/Documents/axis-design-system/scripts/icons.mjs')
const sharp = req('sharp')
const { STROKE_GLYPHS } = await import('/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/icons.js')
const D = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-27_iconos-oficio/trazo'
const which = process.argv[2] ?? 'all'
const outFile = process.argv[3]
const newKeys = readdirSync(D).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${D}/${f}`)))
const approved = Object.entries(STROKE_GLYPHS).map(([key, g]) => ({ key, ...g }))
let list = which === 'all' ? [...approved, ...newKeys] : which === 'new' ? newKeys : [...approved.slice(0, 6), ...newKeys.filter((g) => which.split(',').includes(g.key))]
const sizes = [[64, 1.5], [24, 1.5], [20, 1.75]]
const ink = '#ffffff', acc = '#36c8bf', bg = '#001a33'
const glyphSvg = (g, state, size, w, x, y) => `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${(state === 'r' ? g.response : g.rest).map((d) => `<path d="${d}"/>`).join('')}${state === 'r' ? `<circle cx="${g.dot[0]}" cy="${g.dot[1]}" r="1.75" fill="${acc}" stroke="none"/>` : ''}</svg>`
const cellW = 64 * 2 + 24 * 2 + 20 * 2 + 7 * 14 + 30
const cols = 3, rowH = 64 + 40
let body = ''
list.forEach((g, i) => {
  const cx = (i % cols) * cellW + 10, cy = Math.floor(i / cols) * rowH + 10
  body += `<rect x="${cx}" y="${cy}" width="${cellW - 10}" height="${rowH - 10}" rx="6" fill="${bg}"/><text x="${cx + 8}" y="${cy + rowH - 16}" fill="#9fb" font-family="Helvetica" font-size="11">${g.key}</text>`
  let x = cx + 12
  for (const st of ['a', 'r']) for (const [s, w] of sizes) { body += glyphSvg(g, st, s, w, x, cy + 8); x += s + 14 }
})
const W = cols * cellW + 10, H = Math.ceil(list.length / cols) * rowH + 10
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#7a808a"/>${body}</svg>`)).png().toFile(outFile)
console.log(outFile)
