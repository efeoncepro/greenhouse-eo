import fs from 'node:fs'; import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json'); const sharp = require('sharp')
const M = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-22_dots-fuente/motor'
const T = 200, COLS = 9, PAD = 24, LAB = 34, HEAD = 46
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;')
const ls = (d, re) => fs.readdirSync(path.join(M, d)).filter(f => f.endsWith('.png') && (!re || re.test(f))).sort().map(f => path.join(d, f))
const sections = [
  ['Héroes en 4096 px (captureNeutral, calidad Balanced = la más alta del motor)', ls('heroes-hd'), f => path.basename(f).replace('dots-heroe-','').replace('-4096.png','')],
  ['Jojo: la única firma que da la vuelta completa (espalda y perfil oficiales)', ['giros/jojo/dots-jojo-00-frente.png', ...ls('giros/jojo', /dots-jojo-(08|09|10|11|12)-/)], f => path.basename(f).replace(/dots-jojo-\d\d-/,'').replace('.png','')],
  ['Felipe: giro por arrastre del motor (tope ≈ 30–45°)', ls('giros/felipe', /dots-felipe-0[0-6]-.*(?<!-b)\.png$/), f => path.basename(f).replace(/dots-felipe-\d\d-/,'').replace('.png','')],
  ['Ojos (9) — round_inset no se aplica sobre la cápsula', ls('piezas', /^ojos-/), f => path.basename(f).replace(/ojos-\d\d-/,'').replace('.png','')],
  ['Lentes (5) y accesorios (8) + accesorio retirado «Antenna»', [...ls('piezas', /^lentes-/), ...ls('piezas', /^accesorio-0[1-8]/), 'ocultos/dots-accesorio-retirado-antenas-antennae.png'], f => path.basename(f).replace(/^(lentes|accesorio)-\d\d-/,'').replace('dots-accesorio-retirado-antenas-antennae','RETIRADO: antennae').replace('.png','')],
  ['Colores de utilería (11) sobre el beanie', ls('piezas', /^color-utileria-/), f => path.basename(f).replace('color-utileria-beanie-','').replace('.png','')],
  ['Las 11 formas (en azul)', ls('formas', /-blue\.png$/), f => path.basename(f).replace(/forma-\d\d-/,'').replace('-blue.png','')],
  ['Dots nuevos del generador curado del motor (fuera de los 108)', ls('curados').slice(0, 18), f => 'semilla ' + path.basename(f).replace('curado-semilla-','').replace('.png','')],
  ['Actividades de agente (Felipe): utilería y estados del motor', ls('actividades/felipe'), f => path.basename(f).replace('dots-felipe-actividad-','').replace('.png','')],
]
let y = PAD + 60; const comps = []; const svg = []
svg.push(`<text x="${PAD}" y="${PAD + 34}" font-family="Helvetica" font-size="30" font-weight="700" fill="#141413">Dots (OpenAI) — motor orbit-character de ChatGPT.app 26.1016 · catálogo completo · 2026-10-22</text>`)
for (const [title, files, lab] of sections) {
  svg.push(`<text x="${PAD}" y="${y + 30}" font-family="Helvetica" font-size="22" font-weight="700" fill="#141413">${esc(title)}</text>`); y += HEAD
  for (const [i, f] of files.entries()) {
    if (i && i % COLS === 0) y += T + LAB
    const x = PAD + (i % COLS) * T
    comps.push({ input: await sharp(path.join(M, f)).resize(T - 12, T - 12, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: x + 6, top: y + 6 })
    svg.push(`<text x="${x + T/2}" y="${y + T + 22}" text-anchor="middle" font-family="Helvetica" font-size="15" fill="#3d4a57">${esc(lab(f))}</text>`)
  }
  y += T + LAB + 18
}
const W = PAD * 2 + COLS * T, H = y + PAD
const base = sharp({ create: { width: W, height: H, channels: 4, background: '#f3f2ef' } })
await base.composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg.join('')}</svg>`), left: 0, top: 0 }]).png().toFile(path.join(M, 'hoja-de-contacto.png'))
console.log(W, H)
