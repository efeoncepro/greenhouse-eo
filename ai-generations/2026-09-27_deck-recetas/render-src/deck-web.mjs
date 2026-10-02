// Maquetas de doctrina fotográfica para deck interior, web y motion — pintadas con axis-graphic-line sobre las piezas
// medidas (deck-cover, deck.content) y fotos nativas generadas con foto:generar. Estructura para decidir, no pieza final.
import { paintGraphicLine, answerHtml } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { resolveGraphicLineIntent } from '/Users/jreye/Documents/axis-design-system/packages/contracts/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync } from 'node:fs'

const R = '/Users/jreye/Documents/greenhouse-eo/'
const OUT = new URL('./out-dwm/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const T = GL.color.teal, DARK = GL.color.dark, SOFT = GL.slogan.leadColor.onDark
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const logoNeg = 'data:image/svg+xml;base64,' + readFileSync(R + 'node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-negative.svg').toString('base64')
const LR = 837.07 / 196.68
const img = async (file, w, h, extract) => {
  let s = sharp(R + file)
  if (extract) s = s.extract(extract)
  return 'data:image/jpeg;base64,' + (await s.resize(w, h, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer()).toString('base64')
}
const P1 = 'ai-generations/2026-09-26_deck-web-motion/plates/P1-deck-lente-edicion.png'
const P2 = 'ai-generations/2026-09-26_deck-web-motion/plates/P2-web-hero-taller.png'
const Q4 = 'ai-generations/2026-09-26_ronda-1x1/plates/Q4-objeto-camara-cine.png'

const ringMark = `<span aria-hidden="true" style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${T};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>`
const q = (x, y, px, text, color = SOFT, extra = '') => `<p style="position:absolute;left:${x}px;top:${y}px;margin:0;font:300 ${px}px Pop;line-height:1.35;color:${color};white-space:nowrap;${extra}">${ringMark}${text}</p>`
const a = (x, y, px, text, color = '#fff', accent = T) => `<p style="position:absolute;left:${x}px;top:${y}px;margin:0;font:760 ${px}px Bric;letter-spacing:-.035em;line-height:1.02;color:${color};white-space:nowrap">${answerHtml(text, accent)}</p>`
const a1 = (x, y, px, text, color = '#fff') => `<p style="position:absolute;left:${x}px;top:${y}px;margin:0;font:760 ${px}px Bric;letter-spacing:-.035em;line-height:1.02;color:${color};white-space:nowrap">${text}</p>`
const eyebrow = (x, y, text, color = '#9FB3C8') => `<p style="position:absolute;left:${x}px;top:${y}px;margin:0;font:300 26px Pop;letter-spacing:.02em;color:${color}">${text}</p>`

// La lente de la portada de deck (pieza medida) con el arco como NAVEGACIÓN real: parte a las 12 y suma current/sections.
function lensDeck(photo, sections, current, zoom = 1.25, sweepOverride) {
  const p = GL.pieces.lens['deck-cover']
  const m = resolveGraphicLineIntent({ canvas: { width: 1920, height: 1080, line: 'growth', surface: 'dark', channel: 'deck' }, elements: [{ kind: 'lens', id: 'lens', photoId: 'ph', alt: 'x', region: 'center-end', accentSphere: 'upper-start' }] })
  const el = m.elements[0]
  el.ring = { ...el.ring, strokePx: p.ring.strokePx, opacity: p.ring.opacity }
  el.arc = { ...el.arc, strokePx: p.arc.strokePx, startDeg: -90, sweepDeg: sweepOverride ?? (current / sections) * 360 }
  el.sphere = { ...el.sphere, radiusPx: p.sphereRadiusPx }
  if (el.inside) el.inside = { ...el.inside, zoom }
  return paintGraphicLine(m, { photos: { ph: photo }, background: true, idPrefix: 'l' + current + String(zoom).replace('.', ''), circles: { lens: { cx: p.ring.cx, cy: p.ring.cy, r: p.ring.r / (1 + GL.orbit.ringAirRatio) } } }).svg
}
// El indicador chico del deck (pieza deck.content, 80 px) sobre superficie oscura: sólo marca «n de N».
function indicator(sections, current, surface = 'dark', id = 'nav') {
  const p = GL.pieces.deck.content
  const m = resolveGraphicLineIntent({ canvas: { width: 1920, height: 1080, line: 'growth', surface, channel: 'deck' }, elements: [{ kind: 'progress', id, sections, current, region: 'upper-end' }] })
  const el = m.elements[0]
  el.ring = { ...el.ring, strokePx: p.ring.strokePx, opacity: surface === 'dark' ? 0.4 : p.ring.opacity }
  el.arc = { ...el.arc, strokePx: p.arc.strokePx }
  el.sphere = { ...el.sphere, radiusPx: p.sphereRadiusPx }
  return '<div style="position:absolute;inset:0;z-index:3">' + paintGraphicLine(m, { background: false, idPrefix: id + current, circles: { [id]: { cx: p.ring.cx, cy: p.ring.cy, r: p.ring.r } } }).svg + '</div>'
}

const shots = []
const shot = (id, W, H, body, bg = DARK) => shots.push({ id, W, H, body, bg })

// ── DECK ─────────────────────────────────────────────────────────────────────────────────────────────
const p1 = await img(P1, 1920, 1080)
shot('D1-seccion-lente', 1920, 1080, `${lensDeck(p1, 5, 2, 1)}
${eyebrow(140, 300, 'Sección 2 de 5 · Producción')}
${q(140, 372, 40, '¿Quién decide el corte?')}
${a(140, 432, 132, 'El dato')}`)

const q4 = await img(Q4, 960, 1080, { left: 32, top: 0, width: 960, height: 1024 })
const stat = (x, n, label) => `<div style="position:absolute;left:${x}px;top:640px;width:210px"><p style="margin:0;font:760 72px Bric;letter-spacing:-.035em;color:${GL.color.navy}">${n}</p><p style="margin:6px 0 0;font:300 22px/1.35 Pop;color:#5F5A69">${label}</p></div>`
shot('D2-contenido-foto', 1920, 1080, `<div style="position:absolute;inset:0;background:#fff"></div>
<img src="${q4}" style="position:absolute;left:960px;top:0;width:960px;height:1080px">
${indicator(5, 3, 'dark', 'navc')}
${eyebrow(140, 180, 'Resultados · primer mes', '#5F5A69')}
${q(140, 240, 40, '¿Qué cambió en el primer mes?', '#00284D')}
${a(140, 300, 120, 'El foco', GL.color.navy, GL.lines.find(l => l.key === 'growth').accentOnLight)}
${stat(140, '4,2×', 'alcance orgánico')}${stat(390, '−38 %', 'costo por lead')}${stat(640, '12 días', 'de idea a pieza')}
<p style="position:absolute;left:140px;top:930px;margin:0;font:300 18px Pop;color:#8A8594">Datos de muestra</p>`, '#fff')

const p2 = await img(P2, 1920, 1080)
shot('D3-respiro', 1920, 1080, `<img src="${p2}" style="position:absolute;inset:0;width:1920px;height:1080px">
${indicator(5, 4, 'dark', 'navr')}
${q(140, 380, 40, '¿Y el cliente?')}
${a(140, 440, 132, 'Aprobó')}`)

// ── WEB ──────────────────────────────────────────────────────────────────────────────────────────────
const nav = (W, dark = true) => `<div style="position:absolute;left:0;top:0;width:${W}px;height:76px;display:flex;align-items:center;justify-content:space-between;padding:0 56px;box-sizing:border-box;z-index:2">
<img src="${logoNeg}" style="width:150px;height:${150 / LR}px">
<div style="display:flex;gap:34px;align-items:center;font:300 16px Pop;color:#E2E2E2"><span>Servicios</span><span>Casos</span><span>Nosotros</span><span>Insights</span>
<span style="padding:11px 22px;border-radius:999px;background:${T};color:${DARK};font-weight:500">Conversemos</span></div></div>`
const w1 = await img(P2, 1440, 810)
shot('W1-hero-sobre-foto', 1440, 900, `<img src="${w1}" style="position:absolute;left:0;top:0;width:1440px;height:810px">
<div style="position:absolute;left:0;top:810px;width:1440px;height:90px;background:${DARK}"></div>
${nav(1440)}
${q(96, 262, 26, '¿Qué hace Efeonce?')}
${a(96, 302, 96, 'Te hace crecer')}
<p style="position:absolute;left:96px;top:420px;width:470px;margin:0;font:300 19px/1.5 Pop;color:#C9D4DF">Estrategia, contenido y datos en un mismo equipo, medido desde el primer mes.</p>
<span style="position:absolute;left:96px;top:512px;padding:15px 30px;border-radius:999px;background:${T};color:${DARK};font:500 17px Pop">Conversemos</span>`)
const w1b = await img(P2, 900, 720, { left: 700, top: 0, width: 1092, height: 874 })
shot('W1b-hero-al-lado', 1440, 900, `<div style="position:absolute;inset:0;background:${DARK}"></div>${nav(1440)}
<img src="${w1b}" style="position:absolute;left:540px;top:120px;width:900px;height:720px">
${q(96, 300, 26, '¿Qué hace Efeonce?')}
${a1(96, 340, 84, 'Te hace')}${a(96, 426, 84, 'crecer')}
<p style="position:absolute;left:96px;top:540px;width:400px;margin:0;font:300 19px/1.5 Pop;color:#C9D4DF">Estrategia, contenido y datos en un mismo equipo, medido desde el primer mes.</p>
<span style="position:absolute;left:96px;top:660px;padding:15px 30px;border-radius:999px;background:${T};color:${DARK};font:500 17px Pop">Conversemos</span>`)
const w2 = await img(P2, 390, 219)
shot('W2-movil', 390, 844, `<div style="position:absolute;inset:0;background:${DARK}"></div>
<div style="position:absolute;left:0;top:0;width:390px;height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;box-sizing:border-box">
<img src="${logoNeg}" style="width:112px;height:${112 / LR}px"><span style="font:300 26px Pop;color:#E2E2E2">≡</span></div>
${q(20, 120, 17, '¿Qué hace Efeonce?')}
${a1(20, 150, 52, 'Te hace')}${a(20, 204, 52, 'crecer')}
<p style="position:absolute;left:20px;top:282px;width:340px;margin:0;font:300 16px/1.5 Pop;color:#C9D4DF">Estrategia, contenido y datos en un mismo equipo, medido desde el primer mes.</p>
<span style="position:absolute;left:20px;top:372px;padding:13px 26px;border-radius:999px;background:${T};color:${DARK};font:500 15px Pop">Conversemos</span>
<img src="${w2}" style="position:absolute;left:0;top:452px;width:390px;height:219px">
<p style="position:absolute;left:20px;top:690px;width:340px;margin:0;font:300 13px/1.5 Pop;color:#8FA3B8">La foto entra completa, en su 16:9, debajo del texto: el teléfono no la recorta.</p>`)

// ── MOTION (16:9, cuadros del plano) ────────────────────────────────────────────────────────────────
const zoomed = async z => img(P2, 1920, 1080, (() => { const w = Math.round(1792 / z), h = Math.round(1024 / z); return { left: Math.round((1792 - w) * 0.62), top: Math.round((1024 - h) * 0.5), width: w, height: h } })())
{ const z = 1.1, w = 1920 / z, h = 1080 / z, x = (1920 - w) * 0.62, y = (1080 - h) * 0.5
shot('M1-primer-cuadro', 1920, 1080, `<img src="${await zoomed(1)}" style="position:absolute;inset:0;width:1920px;height:1080px">
<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border:3px dashed rgba(255,255,255,.55)"></div>
<p style="position:absolute;left:${x + 18}px;top:${y + 12}px;margin:0;font:300 26px Pop;color:rgba(255,255,255,.75)">aquí termina el empuje (10 %)</p>`) }
shot('M2-empuje', 1920, 1080, `<img src="${await zoomed(1.1)}" style="position:absolute;inset:0;width:1920px;height:1080px">`)
shot('M3-voz', 1920, 1080, `<img src="${await zoomed(1.1)}" style="position:absolute;inset:0;width:1920px;height:1080px">
${q(140, 380, 40, '¿Y el cliente?')}${a(140, 440, 132, 'Aprobó')}`)
const close = 'data:image/png;base64,' + readFileSync('/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/5. Contenidos/13- Branding/Motion Órbita Efeonce/v1.1/reveal/16x9/navy/efeonce-orbita-reveal_16x9_navy_cuadro-final.png').toString('base64')
shot('M4-cierre-reveal', 1920, 1080, `<img src="${close}" style="position:absolute;inset:0;width:1920px;height:1080px">`)

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
for (const s of shots) {
  await page.setViewportSize({ width: s.W, height: s.H })
  await page.setContent(`<html><head><style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}*{box-sizing:border-box}body{margin:0;background:${s.bg}}</style></head><body><div style="position:relative;width:${s.W}px;height:${s.H}px;overflow:hidden">${s.body}</div></body></html>`, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: OUT + s.id + '.png' })
  await sharp(OUT + s.id + '.png').resize(Math.min(s.W, 960)).jpeg({ quality: 86 }).toFile(OUT + s.id + '.jpg')
}
await browser.close()
console.log(shots.map(s => s.id).join(' '))
