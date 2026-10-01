// Hoja de contacto con grilla 48 para ubicar la esfera. Uso: node contact.mjs out.png a.json b.json ...
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire('/Users/jreye/Documents/axis-design-system/package.json')
const sharp = require('sharp')
const [out, ...files] = process.argv.slice(2)
const S = 240, cols = 5, rows = Math.ceil(files.length / cols)
let body = ''
files.forEach((f, i) => {
  const g = JSON.parse(readFileSync(f, 'utf8'))
  const x = (i % cols) * S, y = Math.floor(i / cols) * S
  let grid = ''
  for (let k = 0; k <= 48; k += 4) grid += `<line x1="${k}" y1="0" x2="${k}" y2="48" stroke="#2a4a7a" stroke-width="${k % 8 ? 0.05 : 0.12}"/><line x1="0" y1="${k}" x2="48" y2="${k}" stroke="#2a4a7a" stroke-width="${k % 8 ? 0.05 : 0.12}"/>`
  const dot = g.dot ? `<circle cx="${g.dot[0]}" cy="${g.dot[1]}" r="4.5" fill="#001a33"/><circle cx="${g.dot[0]}" cy="${g.dot[1]}" r="3.4" fill="#ff6500"/>` : ''
  const ges = (g.gesture || []).map((d) => `<path d="${d}" stroke="#fff" stroke-width="2.8" stroke-linecap="round" fill="none"/>`).join('')
  body += `<g transform="translate(${x} ${y}) scale(${S / 48})"><rect width="48" height="48" fill="#001a33"/>${grid}<path d="${g.d}" transform="${g.t}" fill="#fff" opacity="0.92"/>${dot}${ges}<text x="1" y="3" font-size="2.4" fill="#9ab" font-family="Helvetica">${g.key} · ${g.area ?? ''}</text></g>`
})
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * S}" height="${rows * S}">${body}</svg>`
await sharp(Buffer.from(svg)).png().toFile(out)
console.log(out)
