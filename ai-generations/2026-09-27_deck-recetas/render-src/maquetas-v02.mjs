// Maquetas OOH v02 — canon completo: línea gráfica «La órbita» (voz pregunta-respuesta, esfera, teal, firma centrada),
// lenguaje fotográfico (foto propia, sin velo) y AXIS advertising (contraste medido). Estructura, no pieza final.
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-tokens/dist/index.js'

const R = '/Users/jreye/Documents/greenhouse-eo/'
const OUT = new URL('./out-v02/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const ACCENT = GL.color.teal            // acento Efeonce sobre oscuro
const DARK = GL.color.dark              // fondo Oscuro Efeonce
const INK = '#ffffff'
const SOFT = GL.slogan.leadColor.onDark // tinta de la pregunta sobre oscuro (la receta de AXIS la usa así)
const T = GL.type, S = GL.sphere
const logoNeg = readFileSync(R + 'node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-negative.svg', 'utf8')
const LOGO_RATIO = 837.07 / 196.68
const f64 = (n) => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const fonts = `@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800;font-stretch:75% 100%}
@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}
@font-face{font-family:Pop;src:url(${f64('Poppins-Bold.ttf')});font-weight:700}
*{margin:0;padding:0;box-sizing:border-box}body{background:${DARK}}`

// Voz de la línea, igual que recipeHtml/answerHtml del paquete axis-graphic-line.
const ring = `<span aria-hidden="true" style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${ACCENT};border-radius:50%;margin-right:.35em;vertical-align:.08em"></span>`
const answer = (text) => { const gap = S.opticalGapEm[text.trim().slice(-1)] ?? S.defaultGapEm; return `${text}<span data-part="sphere" style="display:inline-block;width:${S.diameterEm}em;height:${S.diameterEm}em;border-radius:50%;background:${ACCENT};margin-left:${gap}em"></span>` }
const voice = ({ left, top, q, a, qPx }) => `
<p data-m="pregunta" style="position:absolute;left:${left}px;top:${top}px;font-family:Pop;font-weight:${T.question.weight};font-size:${qPx}px;line-height:1.35;color:${SOFT};white-space:nowrap">${ring}${q}</p>
<p data-m="respuesta" style="position:absolute;left:${left}px;top:${top + qPx * 1.45}px;font-family:Bric;font-weight:${T.answer.weight};letter-spacing:${T.answer.tracking};font-size:${qPx * T.answer.minRatioOverQuestion}px;line-height:1.02;color:${INK};white-space:nowrap">${answer(a)}</p>`
const logo = (w) => `<div style="width:${w}px;height:${w / LOGO_RATIO}px">${logoNeg.replace('<svg', `<svg width="${w}" height="${w / LOGO_RATIO}"`)}</div>`

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
async function shot(name, W, H, body) {
  await page.setViewportSize({ width: W, height: H })
  await page.setContent(`<html><head><style>${fonts}</style></head><body style="width:${W}px;height:${H}px;position:relative;overflow:hidden">${body}</body></html>`, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  const m = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-m]')].map(e => { const r = e.getBoundingClientRect(); return [e.dataset.m, { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }] })))
  await page.screenshot({ path: OUT + name + '.png' })
  return m
}

// Contraste: tinta blanca contra el 2 % más claro del fondo bajo la caja (conservador, sobre los píxeles del plate).
const lum = (r, g, b) => { const c = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b) }
async function contrastWhite(bgBuf, W, box) {
  const x = Math.max(0, Math.round(box.x0)), y = Math.max(0, Math.round(box.y0))
  const w = Math.min(W - x, Math.round(box.x1 - box.x0)), h = Math.round(box.y1 - box.y0)
  const { data } = await sharp(bgBuf).extract({ left: x, top: y, width: w, height: h }).raw().toBuffer({ resolveWithObject: true })
  const L = []; for (let i = 0; i < data.length; i += 3) L.push(lum(data[i], data[i + 1], data[i + 2]))
  L.sort((a, b) => a - b); const p98 = L[Math.floor(L.length * 0.98)]
  return +(1.05 / (p98 + 0.05)).toFixed(2)
}

const qa = {}

// ---------- Paleta 1 × 2 m → 1000 × 2000 px (1 m = 1000 px). Foto propia: panadería 9:16 nativa, recorte a 1:2 sólo para maqueta ----------
const palBg = await sharp(R + 'ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/S1v2-916-plate.png').extract({ left: 64, top: 0, width: 1024, height: 2048 }).resize(1000, 2000).png().toBuffer()
const palImg = 'data:image/png;base64,' + palBg.toString('base64')
const M = 0.09 * 1000 // margen de redes: 9 % del lado corto (token signature.marginOfShortSide)
for (const [id, lw] of [['p1-paleta-logo-20', 0.2], ['p2-paleta-logo-35', 0.35]]) {
  const w = lw * 1000
  const body = `<img src="${palImg}" style="position:absolute;inset:0;width:1000px;height:2000px">
  ${voice({ left: M, top: 130, q: '¿Lo medimos?', a: 'Siempre', qPx: 72 })}
  <div data-m="logo" style="position:absolute;left:${500 - w / 2}px;top:${2000 - M - w / LOGO_RATIO}px">${logo(w)}</div>`
  const m = await shot(id, 1000, 2000, body)
  qa[id] = { cajas: m, contraste: { pregunta: await contrastWhite(palBg, 1000, m.pregunta), respuesta: await contrastWhite(palBg, 1000, m.respuesta), logo: await contrastWhite(palBg, 1000, m.logo) } }
}

// ---------- Caminero 12 × 4 m → 3000 × 1000 px (1 m = 250 px). Vector de estructura: no hay foto nativa 3:1 ----------
const zone = (x, y, w, h, fill, label, border = 'none') => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${fill};border:${border}"><span style="position:absolute;right:24px;bottom:18px;font:300 30px Pop;color:#9fb3c8">${label}</span></div>`
const camLogoW = 500 // 2 m: la altura de x del logo (55 % del alto del archivo) ≈ 26 cm = la mitad de la letra mínima a 150 m
const cam = `
${zone(1650, 60, 1250, 700, '#12314f', 'Sujeto y oficio · foto nativa 3:1 pendiente')}
${zone(0, 790, 3000, 210, '#000f1f', 'Lecho de la firma · primer plano desenfocado, por medir')}
${voice({ left: 150, top: 150, q: '¿Lo medimos?', a: 'Siempre', qPx: 120 })}
<div data-m="logo" style="position:absolute;left:${1500 - camLogoW / 2}px;top:${1000 - 0.09 * 1000 - camLogoW / LOGO_RATIO}px">${logo(camLogoW)}</div>`
qa['c1-caminero-estructura'] = { cajas: await shot('c1-caminero-estructura', 3000, 1000, cam) }

await browser.close()

// ---------- Hoja de prueba a distancia: ángulo equivalente a 60 cm de la pantalla (1 cm = 37,8 px al 100 %) ----------
const CM = 37.8, tiles = []
const add = async (file, anchoReal, dist, label) => {
  const w = Math.round(anchoReal * (0.6 / dist) * 100 * CM)
  const img = await sharp(OUT + file + '.png').resize(w).png().toBuffer()
  tiles.push({ img, w, h: (await sharp(img).metadata()).height, label })
}
for (const d of [5, 15]) await add('p1-paleta-logo-20', 1, d, `Paleta · logo 20 % · ${d} m`)
for (const d of [5, 15]) await add('p2-paleta-logo-35', 1, d, `Paleta · logo 35 % · ${d} m`)
for (const d of [80, 150]) await add('c1-caminero-estructura', 12, d, `Caminero · ${d} m`)
const SW = 2000, pad = 40; let x = pad, y = 150, rowH = 0; const comps = [], labels = []
for (const t of tiles) {
  if (x + t.w > SW - pad) { x = pad; y += rowH + 100; rowH = 0 }
  comps.push({ input: t.img, left: x, top: y })
  labels.push(`<text x="${x}" y="${y + t.h + 44}" font-family="Poppins" font-weight="700" font-size="26" fill="#00284d">${t.label}</text>`)
  x += Math.max(t.w, 340) + 60; rowH = Math.max(rowH, t.h)
}
const SH = y + rowH + 120
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}"><rect width="100%" height="100%" fill="#e9ecef"/>
<text x="${pad}" y="70" font-family="Poppins" font-weight="700" font-size="40" fill="#00284d">Prueba a distancia · mirar a 60 cm con zoom al 100 %</text>
<text x="${pad}" y="115" font-family="Poppins" font-size="28" fill="#6d6777">Cada pieza ocupa el mismo ángulo que ocuparía en la calle a esa distancia</text>${labels.join('')}</svg>`)).composite(comps).png().toFile(OUT + 'd1-prueba-a-distancia.png')

writeFileSync(OUT + 'qa.json', JSON.stringify(qa, null, 2))
console.log(JSON.stringify(Object.fromEntries(Object.entries(qa).map(([k, v]) => [k, v.contraste ?? 'vector'])), null, 1))
console.log(JSON.stringify(qa['p2-paleta-logo-35'].cajas))
