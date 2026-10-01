// Vista rápida de iteración: cada candidato en reposo y respuesta a 120, 24 y 20 px sobre #001a33, con grilla guía.
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
const req = createRequire('/Users/jreye/Documents/axis-design-system/scripts/icons.mjs')
const sharp = req('sharp')
const D = process.env.D ?? '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-27_iconos-ia-social/trazo'
const only = process.argv[2] ? process.argv[2].split(',') : null
const list = readdirSync(D).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${D}/${f}`))).filter((g) => !only || only.includes(g.key))
const ink = '#ffffff', acc = '#36c8bf', bg = '#001a33'
const grid = '<g stroke="#ffffff22" stroke-width=".05"><rect x="2" y="2" width="20" height="20" fill="none"/><circle cx="12" cy="12" r="10" fill="none"/></g>'
const g1 = (g, st, size, w, x, y, guides) => `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24">${guides ? grid : ''}<g fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${(st === 'r' ? g.response : g.rest).map((d) => `<path d="${d}"/>`).join('')}</g>${st === 'r' ? `<circle cx="${g.dot[0]}" cy="${g.dot[1]}" r="1.75" fill="${acc}"/>` : ''}</svg>`
const cellW = 120 * 2 + 24 * 2 + 20 * 2 + 7 * 16, rowH = 150
let body = ''
list.forEach((g, i) => {
  const cy = i * rowH + 10
  body += `<rect x="10" y="${cy}" width="${cellW}" height="${rowH - 10}" rx="6" fill="${bg}"/><text x="18" y="${cy + rowH - 16}" fill="#9fb" font-family="Helvetica" font-size="12">${g.key} · ${g.mode}</text>`
  let x = 26
  for (const st of ['a', 'r']) for (const [s, w] of [[120, 1.5], [24, 1.5], [20, 1.75]]) { body += g1(g, st, s, w, x, cy + 6, s === 120); x += s + 16 }
})
const W = cellW + 20, H = list.length * rowH + 10
const out = process.argv[3] ?? `${D}/control/_preview.png`
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#7a808a"/>${body}</svg>`)).png().toFile(out)
console.log(out)
