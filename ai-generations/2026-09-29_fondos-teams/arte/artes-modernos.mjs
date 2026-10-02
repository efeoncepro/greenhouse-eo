// Artes nuevos para la versión «piso moderno» (2026-09-29): paneles de sala con el estado de la órbita, pantalla con
// el logo AEO (señal sutil de AEO), lienzo de diseño con la selección colaborativa (señal sutil de creatividad digital)
// y las tazas de Efeonce aprobadas (recortadas del arte de la cocina, §10.9). Valores y marcas desde AXIS.
// node artes-modernos.mjs
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')
const { efeonceGraphicLine: GL } = require('@efeoncepro/axis-tokens')
const { answerHtml, stateMarkerSvg } = require('@efeoncepro/axis-graphic-line')

const R = '/Users/jreye/Documents/greenhouse-eo/'
const F = R + 'src/lib/artifact-composer/brand-packs/axis/fonts/'
const A = R + 'node_modules/@efeoncepro/axis-brand-assets/assets/'
const DIR = new URL('./', import.meta.url).pathname
const b64 = (f, mime) => `data:${mime};base64,${readFileSync(f).toString('base64')}`
const linea = k => GL.lines.find(l => l.key === k)
const DARK = GL.color.dark

const fuentes = `
@font-face { font-family: 'Bricolage Grotesque'; font-weight: 760; src: url('${b64(F + 'bricolage-grotesque-variable.ttf', 'font/ttf')}') format('truetype'); }
@font-face { font-family: 'Poppins'; font-weight: 500; src: url('${b64(F + 'poppins-500.ttf', 'font/ttf')}') format('truetype'); }
@font-face { font-family: 'Poppins'; font-weight: 400; src: url('${b64(F + 'poppins-400.ttf', 'font/ttf')}') format('truetype'); }
html, body { margin: 0; } .b { font-family: 'Bricolage Grotesque'; font-weight: 760; letter-spacing: -0.02em; line-height: 1; } .p { font-family: 'Poppins'; }`

const panel = (sala, lineKey) => ({
  w: 800, h: 500, bg: '#0b1420',
  html: `<div class="b" style="position:absolute;left:60px;top:70px;font-size:96px;color:#fff">${answerHtml(sala, linea(lineKey).accentOnDark)}</div>
  <div style="position:absolute;left:62px;top:250px;display:flex;align-items:center;gap:22px">${stateMarkerSvg({ value: 'busy', line: lineKey, surface: 'dark', sizePx: 44 })}<span class="p" style="font-weight:500;font-size:52px;color:#fff">En sesión</span></div>
  <div class="p" style="position:absolute;left:62px;top:350px;font-weight:400;font-size:34px;color:#9fb3c8">hasta las 11:30</div>`
})

const tarjeta = (x, y, w, h) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:14px;background:#0f2a47"></div>`

const ARTES = {
  'panel-responder': panel('Responder', 'engine'),
  'panel-cerrar': panel('Cerrar', 'revenue-hubspot'),
  'aeo-pantalla': {
    w: 1200, h: 750, bg: DARK,
    html: `<div style="position:absolute;left:0;top:0;right:0;height:110px;background:#03213f"></div>
    <img src="${b64(A + 'aeo-lockup-white.svg', 'image/svg+xml')}" style="position:absolute;left:50px;top:28px;height:56px">
    ${tarjeta(50, 150, 520, 260)}${tarjeta(600, 150, 550, 260)}${tarjeta(50, 440, 1100, 260)}
    <svg width="1100" height="200" style="position:absolute;left:50px;top:470px" fill="none" stroke="${linea('engine').accentOnDark}" stroke-width="6"><path d="M40 170 C 220 150 300 120 420 110 S 700 60 800 70 S 1000 30 1060 20"/></svg>`
  },
  'canvas-seleccion': {
    w: 1200, h: 750, bg: '#e9ecef',
    html: `<div style="position:absolute;left:0;top:0;bottom:0;width:70px;background:#1d2733"></div>
    <div style="position:absolute;right:0;top:0;bottom:0;width:230px;background:#f7f8fa;border-left:1px solid #d5dbe1"></div>
    <div style="position:absolute;left:330px;top:90px;width:420px;height:560px;background:${DARK};overflow:hidden">
      <div style="position:absolute;left:-90px;top:280px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle at 60% 40%, #1d4f86, ${DARK} 70%)"></div>
      <div class="b" style="position:absolute;left:34px;top:34px;font-size:64px;color:#fff">${answerHtml('Idea', linea('brand').accentOnDark)}</div>
    </div>
    <div style="position:absolute;left:326px;top:86px;width:424px;height:564px;border:3px solid ${linea('engine').accentOnLight}"></div>
    ${[[326, 86], [538, 86], [750, 86], [326, 368], [750, 368], [326, 650], [538, 650], [750, 650]].map(([x, y]) => `<div style="position:absolute;left:${x - 8}px;top:${y - 8}px;width:16px;height:16px;background:#fff;border:3px solid ${linea('engine').accentOnLight}"></div>`).join('')}
    <svg width="40" height="48" style="position:absolute;left:770px;top:600px"><path d="M4 4 L4 40 L14 30 L22 46 L28 43 L20 27 L34 27 Z" fill="${linea('brand').accentOnLight}" stroke="#fff" stroke-width="2"/></svg>
    <div class="p" style="position:absolute;left:800px;top:640px;padding:6px 16px;border-radius:14px;background:${linea('brand').accentOnLight};color:#fff;font-weight:500;font-size:26px">Nexa</div>`
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
// Tazas de Efeonce: la fila del arte aprobado de la cocina (oficina en foto, §10.9)
await sharp(R + 'ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/oficina-ia/arte/of_cocina.png').extract({ left: 230, top: 590, width: 1480, height: 180 }).toFile(DIR + 'tazas.png')
console.log('ok')
