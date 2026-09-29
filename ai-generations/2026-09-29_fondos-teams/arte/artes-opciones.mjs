// Artes de las dos opciones para el tercer fondo de escala creativa (2026-09-29): «Jornada de captura» (hoja de
// contactos con renders REALES del kit 3D del logo + voz «¿Cuántas tomas? Una.») y «Memoria de marca» (archivo con
// colores de línea, tipografías, órbitas, íconos e isotipo del kit + voz «¿Y la marca? Intacta.»). Todo desde AXIS.
// node artes-opciones.mjs
import { createRequire } from 'node:module'
import { readFileSync, readdirSync } from 'node:fs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { efeonceGraphicLine: GL } = require('@efeoncepro/axis-tokens')
const { answerHtml, resolveIcon } = require('@efeoncepro/axis-graphic-line')

const R = '/Users/jreye/Documents/greenhouse-eo/'
const F = R + 'src/lib/artifact-composer/brand-packs/axis/fonts/'
const A = R + 'node_modules/@efeoncepro/axis-brand-assets/assets/'
const K = R + 'ai-generations/2026-09-17_efeonce-logo-3d/render/mediana-blanco/'
const DIR = new URL('./', import.meta.url).pathname
const b64 = (f, mime) => `data:${mime};base64,${readFileSync(f).toString('base64')}`
const brand = GL.lines.find(l => l.key === 'brand')
const DARK = GL.color.dark
const NAVY = GL.color.navy

const fuentes = `
@font-face { font-family: 'Bricolage Grotesque'; font-weight: 760; src: url('${b64(F + 'bricolage-grotesque-variable.ttf', 'font/ttf')}') format('truetype'); }
@font-face { font-family: 'Poppins'; font-weight: 500; src: url('${b64(F + 'poppins-500.ttf', 'font/ttf')}') format('truetype'); }
html, body { margin: 0; } .b { font-family: 'Bricolage Grotesque'; font-weight: 760; letter-spacing: -0.02em; line-height: 1; } .p { font-family: 'Poppins'; font-weight: 500; }`

const voz = (pregunta, respuesta) => ({
  w: 900, h: 460, bg: DARK,
  html: `<div style="position:absolute;left:60px;top:66px;display:flex;align-items:center;gap:18px"><svg width="34" height="34"><circle cx="17" cy="17" r="14" fill="none" stroke="${brand.accentOnDark}" stroke-width="4"/></svg><span class="p" style="font-size:52px;color:#fff">${pregunta}</span></div>
  <div class="b" style="position:absolute;left:54px;top:170px;font-size:220px;color:#fff">${answerHtml(respuesta, brand.accentOnDark)}</div>`
})

const renders = readdirSync(K).filter(f => f.endsWith('transparente.png')).sort().slice(0, 12)
const glyphs = ['contenido', 'multimedia', 'assets', 'presentacion', 'social', 'composer', 'web', 'correo', 'informe', 'objetivo', 'buscador', 'ia']
const celdas = []
GL.lines.forEach(l => celdas.push(`<div style="background:${l.accentOnDark}"></div>`))
celdas.push(`<div style="background:${NAVY}"></div>`, `<div style="background:${DARK};outline:1px solid #26384d"></div>`, `<div style="background:#f3f1ec"></div>`)
celdas.push(`<div style="background:#f3f1ec;display:flex;align-items:center;justify-content:center"><span class="b" style="font-size:64px;color:${NAVY}">Aa</span></div>`)
celdas.push(`<div style="background:${DARK};display:flex;align-items:center;justify-content:center"><span class="p" style="font-size:54px;color:#fff">Aa</span></div>`)
glyphs.forEach((g, i) => celdas.push(`<div style="background:${i % 2 ? DARK : '#f3f1ec'};display:flex;align-items:center;justify-content:center">${resolveIcon({ glyph: g, line: GL.lines[i % GL.lines.length].key, surface: i % 2 ? 'dark' : 'light', size: 72 }).svg}</div>`))
;['orbit-brand-dark-screen.png', 'orbit-growth-dark-screen.png', 'orbit-engine-dark-screen.png', 'orbit-voice-dark-screen.png'].forEach(o => celdas.push(`<div style="background:${DARK};background-image:url('${b64(A + 'orbit/' + o, 'image/png')}');background-size:cover;background-position:center"></div>`))
celdas.push(`<div style="background:#f3f1ec;display:flex;align-items:center;justify-content:center"><img src="${b64(A + 'efeonce-isotype-positive.svg', 'image/svg+xml')}" style="width:70%"></div>`)
celdas.push(`<div style="background:${DARK};display:flex;align-items:center;justify-content:center"><img src="${b64(A + 'efeonce-isotype-negative.svg', 'image/svg+xml')}" style="width:70%"></div>`)
celdas.push(`<div style="background:${DARK};display:flex;align-items:center;justify-content:center"><span class="b" style="font-size:44px;color:#fff">${answerHtml('Hacer', brand.accentOnDark)}</span></div>`)
celdas.push(`<div style="background:#f3f1ec;display:flex;align-items:center;justify-content:center"><span class="b" style="font-size:44px;color:${NAVY}">${answerHtml('Crear', brand.accentOnLight)}</span></div>`)

const ARTES = {
  'voz-tomas': voz('¿Cuántas tomas?', 'Una'),
  'voz-marca': voz('¿Y la marca?', 'Intacta'),
  'hoja-contactos': {
    w: 1400, h: 800, bg: '#0b1018',
    html: `<div style="position:absolute;left:0;top:0;right:0;height:64px;background:#070b11;border-bottom:1px solid #1c2633"></div>
    <div class="p" style="position:absolute;left:30px;top:18px;font-size:22px;color:#9fb3c8">Captura · 24 cámaras</div>
    <div style="position:absolute;left:30px;top:90px;display:grid;grid-template-columns:repeat(4,320px);gap:14px">${renders.map(r => `<img src="${b64(K + r, 'image/png')}" style="width:320px;height:213px;object-fit:contain;background:radial-gradient(circle at 50% 45%, #2a313b, #0f1318 75%);display:block">`).join('')}</div>`
  },
  'archivo-marca': {
    w: 1600, h: 800, bg: '#0a0f16',
    html: `<div style="display:grid;grid-template-columns:repeat(8,1fr);grid-auto-rows:1fr;gap:14px;padding:14px;height:772px;box-sizing:border-box">${celdas.slice(0, 32).map(c => c.replace('<div style="', '<div style="border-radius:4px;')).join('')}</div>`
  }
}

const b = await chromium.launch()
for (const [id, a] of Object.entries(ARTES)) {
  const p = await b.newPage({ viewport: { width: a.w, height: a.h } })
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${fuentes}</style></head><body><div id="a" style="position:relative;width:${a.w}px;height:${a.h}px;background:${a.bg};overflow:hidden">${a.html}</div></body></html>`, { waitUntil: 'networkidle' })
  await p.evaluate(async () => { await document.fonts.load('760 60px "Bricolage Grotesque"'); await document.fonts.load('500 40px "Poppins"'); await document.fonts.ready })
  await p.locator('#a').screenshot({ path: DIR + id + '.png' })
  await p.close()
}
await b.close()
console.log('ok', celdas.length)
