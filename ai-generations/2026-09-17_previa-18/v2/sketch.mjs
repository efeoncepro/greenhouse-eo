// Boceto de layout exacto (glifos Bricolage reales) para materializar en 3D con GPT Image 2.5 Sunburst.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import sharp from 'sharp'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const W = 1600, H = 2000
const bric = fontkit.openSync('src/assets/fonts/BricolageGrotesque-Variable.ttf').getVariation({ wght: 800, wdth: 96, opsz: 96 })

const glyph = (ch, size) => {
  const run = bric.layout(ch); const g = run.glyphs[0]; const s = size / bric.unitsPerEm; const b = g.bbox
  return { d: g.path.toSVG(), s, cx: ((b.minX + b.maxX) / 2) * s, cy: (-(b.minY + b.maxY) / 2) * s, w: (b.maxX - b.minX) * s, h: (b.maxY - b.minY) * s }
}
const place = (gl, x, y, rot, fill, extra = '') => `<g transform="translate(${x} ${y}) rotate(${rot}) translate(${-gl.cx} ${-gl.cy})" ${extra}><path d="${gl.d}" transform="scale(${gl.s} ${-gl.s})" fill="${fill}"/></g>`

const SIZE = 1180
const one = glyph('1', SIZE), seven = glyph('7', SIZE), eight = glyph('8', SIZE)
// Zona de números 320–1440 px (de 2000); copy y logo abajo quedan vacíos.
const one_ = place(one, 470, 860, 0, '#ffffff')
const eight_ = place(eight, 930, 820, -4, '#ffffff')
const seven_ = place(seven, 1430, 1180, 24, '#cfe4fa')
// Cursor gigante tomando el «8» por arriba a la derecha.
const cursor = `<g transform="translate(1175 470) rotate(-4) scale(7.2)"><path d="M0 0 L0 33 L8 25 L15 40 L22 36 L15 22 L28 22 Z" fill="#0f172a" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/></g>`
// Banderines: cuerda arriba con triángulos.
let bunting = `<path d="M -80 60 Q 800 330 1680 60" stroke="#ffffff" stroke-width="5" fill="none"/>`
const colors = ['#ffffff', '#023c70', '#cfe4fa']
for (let i = 0; i < 12; i++) { const t = (i + 0.5) / 12; const x = -80 + 1760 * t; const y = 60 + 270 * (1 - (2 * t - 1) ** 2) * 0.5 * 2 * 0.5 + 0; const yy = 60 + 135 * (1 - (2 * t - 1) ** 2) * 2 / 2; bunting += `<path d="M ${x - 55} ${yy} L ${x + 55} ${yy} L ${x} ${yy + 140} Z" fill="${colors[i % 3]}"/>` }
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0375db"/><stop offset="1" stop-color="#023c70"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${bunting}${one_}${eight_}${seven_}${cursor}</svg>`
await sharp(Buffer.from(svg)).png().toFile('ai-generations/2026-09-17_previa-18/v2/sketch.png')
console.log('ok', { one: [one.w, one.h].map(Math.round), eight: [eight.w, eight.h].map(Math.round) })
