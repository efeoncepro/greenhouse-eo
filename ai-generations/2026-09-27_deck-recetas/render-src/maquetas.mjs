// Maquetas OOH v01 — prueba de estructura (no pieza final). Foto provisoria de CMP-002, recortada sólo para maqueta.
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync } from 'node:fs'
import { axisAdvertising as ad } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-tokens/dist/index.js'

const R = '/Users/jreye/Documents/greenhouse-eo/'
const OUT = new URL('./out/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const C = ad.color
const logoNeg = readFileSync(R + 'node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-negative.svg', 'utf8')
const LOGO_RATIO = 837.07 / 196.68
const f64 = (n) => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const fonts = `
@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800;font-stretch:75% 100%}
@font-face{font-family:Pop;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}
@font-face{font-family:Pop;src:url(${f64('Poppins-Bold.ttf')});font-weight:700}
*{margin:0;padding:0;box-sizing:border-box}body{background:#000}`

async function crop(file, w, h, left, top, outW) {
  const buf = await sharp(R + file).extract({ left, top, width: w, height: h }).resize(outW).jpeg({ quality: 90 }).toBuffer()
  return 'data:image/jpeg;base64,' + buf.toString('base64')
}
const logo = (w) => `<div style="width:${w}px;height:${w / LOGO_RATIO}px">${logoNeg.replace('<svg', `<svg width="${w}" height="${w / LOGO_RATIO}"`)}</div>`

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
async function shot(name, W, H, body, measure = true) {
  await page.setViewportSize({ width: W, height: H })
  await page.setContent(`<html><head><style>${fonts}</style></head><body style="width:${W}px;height:${H}px;position:relative;overflow:hidden">${body}</body></html>`, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => { for (const e of document.querySelectorAll('[data-fit]')) { const max = +e.dataset.fit, min = +e.dataset.min; let fs = parseFloat(getComputedStyle(e).fontSize); while (e.getBoundingClientRect().right > max && fs > min) { fs -= 2; e.style.fontSize = fs + 'px' } e.dataset.fs = fs } })
  let m = null
  if (measure) m = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-m]')].map(e => { const r = e.getBoundingClientRect(); return [e.dataset.m, [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom), e.dataset.fs || '']] })))
  await page.screenshot({ path: OUT + name + '.png' })
  console.log(name, JSON.stringify(m))
  return m
}

// ---------- Letrero caminero 12 x 4 m -> 3000 x 1000 px (1 m = 250 px) ----------
const camPhoto = await crop('ai-generations/2026-09-22_cmp002-hubspot/out-formatos/KV-07-169-plate.png', 2048, 683, 0, 150, 3000)
const titularCam = (fs) => `<div data-m="titular" data-fit="1080" data-min="180" style="position:absolute;left:150px;top:150px;font-family:Bric;font-weight:760;font-stretch:78%;font-size:${fs}px;line-height:.92;letter-spacing:-.02em;color:${C.inkOnDark}">Tu CRM,<br><span style="color:${C.accentSurface}">trabajando.</span></div>`
const camBase = (logoHtml) => `<img src="${camPhoto}" style="position:absolute;inset:0;width:3000px;height:1000px">${titularCam(230)}${logoHtml}`
const LOGO_A = 0.2 * 1000 // 20 % del lado corto = 0,8 m
const LOGO_B = 625 // por distancia: letras ~25 cm = la mitad de la letra mínima
const camA = camBase(`<div data-m="logo" style="position:absolute;left:${1500 - LOGO_A / 2}px;top:${910 - LOGO_A / LOGO_RATIO}px">${logo(LOGO_A)}</div>`)
const camB = camBase(`<div data-m="logo" style="position:absolute;left:158px;top:${880 - LOGO_B / LOGO_RATIO}px">${logo(LOGO_B)}</div>`)
await shot('01-caminero-A-firma-20pct', 3000, 1000, camA)
await shot('02-caminero-B-firma-por-distancia', 3000, 1000, camB)
const box = (l, t, w, h, label, col) => `<div style="position:absolute;left:${l}px;top:${t}px;width:${w}px;height:${h}px;border:6px dashed ${col}"><span style="position:absolute;left:12px;top:10px;font:700 34px Pop;color:${col};background:rgba(0,0,0,.55);padding:4px 10px">${label}</span></div>`
await shot('03-caminero-B-anotado', 3000, 1000, camB +
  box(120, 120, 1020, 760, 'Reserva de titular · 38 % del ancho', C.growthOnDark) +
  box(1120, 60, 520, 900, 'Sujeto', '#ffffff') +
  box(1700, 120, 1250, 640, 'La idea en masas: sombras', C.softOnDark) +
  `<div style="position:absolute;left:60px;top:190px;width:40px;height:125px;border-left:8px solid ${C.accentSurface};border-top:8px solid ${C.accentSurface};border-bottom:8px solid ${C.accentSurface}"></div><span style="position:absolute;left:60px;top:330px;font:700 30px Pop;color:${C.accentSurface};background:rgba(0,0,0,.6);padding:4px 8px;writing-mode:vertical-rl;transform:rotate(180deg)">mín. 50 cm</span>`)

// ---------- Paleta 1 x 2 m -> 1000 x 2000 px (1 m = 1000 px) ----------
const palPhoto = await crop('ai-generations/2026-09-22_cmp002-hubspot/out-formatos/KV-07-916-plate.png', 1024, 2048, 0, 0, 1000)
const palBase = (lw) => `<img src="${palPhoto}" style="position:absolute;inset:0;width:1000px;height:2000px">
<div data-m="titular" data-fit="920" data-min="72" style="position:absolute;left:80px;top:120px;font-family:Bric;font-weight:760;font-stretch:80%;font-size:170px;line-height:.92;letter-spacing:-.02em;color:${C.inkOnDark}">Tu CRM,<br><span style="color:${C.accentSurface}">trabajando.</span></div>
<div data-m="apoyo" style="position:absolute;left:84px;top:480px;width:800px;font-family:Pop;font-weight:500;font-size:64px;line-height:1.15;color:${C.softOnDark}">Implementamos HubSpot para que tu equipo venda.</div>
<div data-m="logo" style="position:absolute;left:${500 - lw / 2}px;top:${1880 - lw / LOGO_RATIO}px">${logo(lw)}</div>`
await shot('04-paleta-A-firma-20pct', 1000, 2000, palBase(200))
await shot('05-paleta-B-firma-35pct', 1000, 2000, palBase(350))

// ---------- Hoja de prueba a distancia (1 cm = 37,8 px a 100 % de zoom) ----------
await browser.close()
const CM = 37.8
const tiles = []
const add = async (file, anchoReal, dist, label) => {
  const w = Math.round(anchoReal * (0.6 / dist) * 100 * CM)
  const img = await sharp(OUT + file + '.png').resize(w).png().toBuffer()
  tiles.push({ img, w, h: (await sharp(img).metadata()).height, label })
}
for (const d of [30, 80, 150]) await add('01-caminero-A-firma-20pct', 12, d, `A · ${d} m`)
for (const d of [30, 80, 150]) await add('02-caminero-B-firma-por-distancia', 12, d, `B · ${d} m`)
for (const d of [5, 15]) await add('04-paleta-A-firma-20pct', 1, d, `Paleta A · ${d} m`)
for (const d of [5, 15]) await add('05-paleta-B-firma-35pct', 1, d, `Paleta B · ${d} m`)
const SW = 2000, pad = 40
let x = pad, y = 150, rowH = 0; const comps = []; const labels = []
for (const t of tiles) {
  if (x + t.w > SW - pad) { x = pad; y += rowH + 90; rowH = 0 }
  comps.push({ input: t.img, left: x, top: y })
  labels.push(`<text x="${x}" y="${y + t.h + 44}" font-family="Poppins" font-weight="700" font-size="30" fill="#00284d">${t.label}</text>`)
  x += t.w + 60; rowH = Math.max(rowH, t.h)
}
const SH = y + rowH + 120
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}"><rect width="100%" height="100%" fill="#e9ecef"/>
<text x="${pad}" y="70" font-family="Poppins" font-weight="700" font-size="40" fill="#00284d">Prueba a distancia · mirar a 60 cm con zoom al 100 %</text>
<text x="${pad}" y="115" font-family="Poppins" font-size="28" fill="#6d6777">Cada pieza ocupa el mismo ángulo que ocuparía en la calle a esa distancia</text>${labels.join('')}</svg>`
await sharp(Buffer.from(svg)).composite(comps).png().toFile(OUT + '06-prueba-a-distancia.png')
console.log('hoja', SW, SH)
