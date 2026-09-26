// Prueba de espacio para texto: titular Bricolage (receta ideaImpact de AXIS) a trazos + firma, por formato.
// Uso: node titular.mjs <plate> <out> '<json>'
//  json: { "text": "Línea 1|Línea 2", "zone": [x0,y0,x1,y1] (fracciones), "align": "left|center",
//          "logoCy": 0.935, "logoW": 0.15 (fracción del lado corto) }
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
const REPO = '/Users/jreye/Documents/greenhouse-eo'
const require = createRequire(REPO + '/package.json')
const sharp = require('sharp'); const fontkit = require('fontkit')
const { axisAdvertising } = await import(pathToFileURL(require.resolve('@efeoncepro/axis-tokens')).href)
const [PLATE, OUT, J] = process.argv.slice(2); const o = JSON.parse(J)
const { width: W, height: H } = await sharp(PLATE).metadata()
const R = axisAdvertising.recipes.ideaImpact, C = axisAdvertising.color
const font = fontkit.openSync(REPO + '/src/assets/fonts/BricolageGrotesque-Variable.ttf').getVariation({ wght: R.weight, wdth: R.width, opsz: R.opticalSize })
const track = Number.parseFloat(R.tracking)
const shape = (t, size) => { const run = font.layout(t), sc = size / font.unitsPerEm; let x = 0, p = ''
  run.glyphs.forEach((g, i) => { const d = g.path.toSVG(); if (d) p += `<path d="${d}" transform="translate(${x.toFixed(1)} 0) scale(${sc} ${-sc})"/>`; x += run.positions[i].xAdvance * sc + track * size }); return { p, w: x - track * size } }
const rel0 = (r, g, b) => { const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const zoneContrast = async (zx0, zy0, zx1, zy1) => { const { data } = await sharp(PLATE).extract({ left: zx0, top: zy0, width: zx1 - zx0, height: zy1 - zy0 }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const L = []; for (let i = 0; i < data.length; i += 3) L.push(rel0(data[i], data[i + 1], data[i + 2])); L.sort((a, b) => a - b)
  const qq = p => L[Math.floor(p * (L.length - 1))]; return Math.max(1.05 / (qq(0.98) + 0.05), (qq(0.02) + 0.05) / (rel0(0, 40, 77) + 0.05)) }
let [x0, y0, x1, y1] = o.zone.map((v, i) => Math.round(v * (i % 2 ? H : W)))
// autofit: recorta la zona desde el lado más cargado hasta que el titular tenga ≥4,5:1 (nunca menos del 55% del área)
if (o.autofit !== false) { const W0 = x1 - x0, H0 = y1 - y0; let best = null
  for (let sx = 0; sx <= 0.45 && !best; sx += 0.05) for (let sy = 0; sy <= 0.45 && !best; sy += 0.05) for (const side of ['r', 'l']) {
    const cx0 = side === 'l' ? x0 + Math.round(W0 * sx) : x0, cx1 = side === 'r' ? x1 - Math.round(W0 * sx) : x1, cy1 = y1 - Math.round(H0 * sy)
    if ((cx1 - cx0) * (cy1 - y0) < 0.55 * W0 * H0) continue
    if (await zoneContrast(cx0, y0, cx1, cy1) >= 4.5) { best = [cx0, y0, cx1, cy1]; break } }
  if (best) [x0, y0, x1, y1] = best; else console.log('autofit: ninguna subzona pasa 4,5:1 — regenerar el plate') }
const zw = x1 - x0, zh = y1 - y0
const lines = o.text.split('|')
let size = 400; for (;;) { const ws = lines.map(l => shape(l, size).w); const th = size * (1 + (lines.length - 1) * R.lineHeight); if (Math.max(...ws) <= zw * 0.96 && th <= zh * 0.9) break; size -= 4 }
// color por contraste medido en la zona real del titular
const rel = (r, g, b) => { const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const { data } = await sharp(PLATE).extract({ left: x0, top: y0, width: zw, height: zh }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const Ls = []; for (let i = 0; i < data.length; i += 3) Ls.push(rel(data[i], data[i + 1], data[i + 2])); Ls.sort((a, b) => a - b)
const q = p => Ls[Math.floor(p * (Ls.length - 1))]
const white = 1.05 / (q(0.98) + 0.05), dark = (q(0.02) + 0.05) / (rel(0, 40, 77) + 0.05)
const useWhite = white >= dark, fill = useWhite ? C.inkOnDark : C.inkOnLight
let g = '', y = y0 + (zh - size * (1 + (lines.length - 1) * R.lineHeight)) / 2 + size * 0.8
for (const l of lines) { const s = shape(l, size); const x = o.align === 'center' ? x0 + (zw - s.w) / 2 : x0; g += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${s.p}</g>`; y += size * R.lineHeight }
const layers = [{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><g fill="${fill}">${g}</g></svg>`), left: 0, top: 0 }]
// firma
const lw = Math.round(Math.min(W, H) * (o.logoW ?? 0.15)), lh = Math.round(lw * 196.68 / 837.07), ll = Math.round((W - lw) / 2), lt = Math.round((o.logoCy ?? 0.935) * H - lh / 2)
const { data: bd } = await sharp(PLATE).extract({ left: ll, top: lt, width: lw, height: lh }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const Lb = []; for (let i = 0; i < bd.length; i += 3) Lb.push(rel(bd[i], bd[i + 1], bd[i + 2])); Lb.sort((a, b) => a - b)
const lwhite = 1.05 / (Lb.at(-1) + 0.05), lnavy = (Lb[0] + 0.05) / (rel(2, 60, 112) + 0.05), lUse = lwhite >= lnavy
layers.push({ input: await sharp(`${REPO}/public/branding/${lUse ? 'logo-negative.svg' : 'logo-full.svg'}`, { density: 600 }).resize(lw, lh).png().toBuffer(), left: ll, top: lt })
await sharp(PLATE).composite(layers).png().toFile(OUT)
console.log(OUT.split('/').pop(), `titular ${Math.round(size)}px ${useWhite ? 'blanco' : 'tinta'} ${(useWhite ? white : dark).toFixed(2)}:1 (p98)`, `· firma ${lUse ? 'blanco' : 'navy'} ${(lUse ? lwhite : lnavy).toFixed(2)}:1`)
