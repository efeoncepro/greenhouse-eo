// Boceto v3: glifos Bricolage 800 reales a escala heroica, acción marcada, banderines en dos planos, luz dramática.
import { createRequire } from 'node:module'
import sharp from 'sharp'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const W = 1600, H = 2000
const bric = fontkit.openSync('src/assets/fonts/BricolageGrotesque-Variable.ttf').getVariation({ wght: 800, wdth: 96, opsz: 96 })
const glyph = (ch, size) => { const g = bric.layout(ch).glyphs[0]; const s = size / bric.unitsPerEm; const b = g.bbox; return { d: g.path.toSVG(), s, cx: ((b.minX + b.maxX) / 2) * s, cy: (-(b.minY + b.maxY) / 2) * s, w: (b.maxX - b.minX) * s, h: (b.maxY - b.minY) * s } }
const place = (gl, x, y, rot, fill) => `<g transform="translate(${x} ${y}) rotate(${rot}) translate(${-gl.cx} ${-gl.cy})"><path d="${gl.d}" transform="scale(${gl.s} ${-gl.s})" fill="${fill}"/></g>`

const SIZE = 1560
const one = glyph('1', SIZE), eight = glyph('8', SIZE), seven = glyph('7', SIZE * 0.8)
const flagRow = (y, sag, n, w, h, x0, x1, colors, extra = '') => {
  let s = `<path d="M ${x0} ${y} Q ${(x0 + x1) / 2} ${y + sag * 2} ${x1} ${y}" stroke="#ffffff" stroke-width="${w / 18}" fill="none"/>`
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const x = x0 + (x1 - x0) * t; const yy = y + sag * (1 - (2 * t - 1) ** 2); s += `<path d="M ${x - w / 2} ${yy} L ${x + w / 2} ${yy} L ${x} ${yy + h} Z" fill="${colors[i % colors.length]}"/>` }
  return `<g ${extra}>${s}</g>`
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>
  <radialGradient id="bg" cx="0.48" cy="0.36" r="0.75"><stop offset="0" stop-color="#0375db"/><stop offset="0.45" stop-color="#034f96"/><stop offset="1" stop-color="#011a33"/></radialGradient>
  <filter id="blur"><feGaussianBlur stdDeviation="14"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${flagRow(70, 70, 14, 86, 120, -80, 1680, ['#ffffff', '#023c70', '#cfe4fa'])}
${place(one, 360, 900, 0, '#ffffff')}
${place(eight, 950, 880, -7, '#ffffff')}
<path d="M 1300 520 L 1540 470" stroke="#ffffff" stroke-opacity="0.35" stroke-width="10"/><path d="M 1320 640 L 1580 600" stroke="#ffffff" stroke-opacity="0.25" stroke-width="10"/>
${place(seven, 1395, 1245, 26, '#cfe4fa')}
<g transform="translate(1235 355) rotate(-6) scale(10)"><path d="M0 0 L0 33 L8 25 L15 40 L22 36 L15 22 L28 22 Z" fill="#0b1220" stroke="#12afa2" stroke-width="1.6" stroke-linejoin="round"/></g>
<g filter="url(#blur)">${flagRow(-60, 40, 3, 260, 330, -260, 520, ['#023c70', '#ffffff', '#cfe4fa'])}${flagRow(-90, 30, 2, 220, 280, 1380, 1880, ['#cfe4fa', '#023c70'])}</g>
</svg>`
await sharp(Buffer.from(svg)).png().toFile('ai-generations/2026-09-17_previa-18/v3/sketch.png')
console.log('ok', { one: [one.w, one.h].map(Math.round), eight: [eight.w, eight.h].map(Math.round) })
