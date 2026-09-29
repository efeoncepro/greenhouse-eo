// Artes de los fondos de «escalar la producción creativa» (2026-09-29): la voz «¿Cuántos formatos? Todos.», el muro de
// pantallas con la misma pieza en todos los formatos, la app generando variantes con el logo de Efeonce (manda Efeonce,
// no Globe: operador) y el vinilo «Escalamos la idea, no las horas.». Valores y marcas desde AXIS.
// node artes-escala.mjs
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { efeonceGraphicLine: GL } = require('@efeoncepro/axis-tokens')
const { answerHtml } = require('@efeoncepro/axis-graphic-line')

const R = '/Users/jreye/Documents/greenhouse-eo/'
const F = R + 'src/lib/artifact-composer/brand-packs/axis/fonts/'
const A = R + 'node_modules/@efeoncepro/axis-brand-assets/assets/'
const DIR = new URL('./', import.meta.url).pathname
const b64 = (f, mime) => `data:${mime};base64,${readFileSync(f).toString('base64')}`
const brand = GL.lines.find(l => l.key === 'brand')
const DARK = GL.color.dark

const fuentes = `
@font-face { font-family: 'Bricolage Grotesque'; font-weight: 760; src: url('${b64(F + 'bricolage-grotesque-variable.ttf', 'font/ttf')}') format('truetype'); }
@font-face { font-family: 'Poppins'; font-weight: 500; src: url('${b64(F + 'poppins-500.ttf', 'font/ttf')}') format('truetype'); }
html, body { margin: 0; } .b { font-family: 'Bricolage Grotesque'; font-weight: 760; letter-spacing: -0.02em; line-height: 1; } .p { font-family: 'Poppins'; font-weight: 500; }`

// La misma pieza clave en cualquier formato: fondo navy, esfera-luz y «Idea.» con su esfera.
const pieza = (w, h) => `<div style="position:relative;width:${w}px;height:${h}px;background:${DARK};overflow:hidden">
  <div style="position:absolute;left:${-w * 0.25}px;top:${h * 0.45}px;width:${Math.max(w, h) * 0.9}px;height:${Math.max(w, h) * 0.9}px;border-radius:50%;background:radial-gradient(circle at 60% 40%, #1d4f86, ${DARK} 70%)"></div>
  <div class="b" style="position:absolute;left:${Math.min(w, h) * 0.1}px;top:${Math.min(w, h) * 0.1}px;font-size:${Math.min(w, h) * 0.22}px;color:#fff">${answerHtml('Idea', brand.accentOnDark)}</div></div>`

const FORMATOS = [['9:16', 9, 16], ['1:1', 1, 1], ['16:9', 16, 9], ['4:5', 4, 5], ['OOH 3:1', 3, 1], ['Email', 3, 4], ['Banner', 6, 1], ['Story', 9, 16]]
const tile = (i) => {
  const [n, a, b] = FORMATOS[i % FORMATOS.length]
  const TW = 300, TH = 200, m = 26
  const k = Math.min((TW - m * 2) / a, (TH - m * 2 - 22) / b)
  const w = Math.round(a * k), h = Math.round(b * k)
  return `<div style="position:relative;width:${TW}px;height:${TH}px;background:#05090f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">${pieza(w, h)}<div class="p" style="font-size:15px;color:#6f86a0">${n}</div></div>`
}

const ARTES = {
  'voz-formatos': {
    w: 900, h: 460, bg: DARK,
    html: `<div style="position:absolute;left:60px;top:66px;display:flex;align-items:center;gap:18px"><svg width="34" height="34"><circle cx="17" cy="17" r="14" fill="none" stroke="${brand.accentOnDark}" stroke-width="4"/></svg><span class="p" style="font-size:52px;color:#fff">¿Cuántos formatos?</span></div>
    <div class="b" style="position:absolute;left:54px;top:170px;font-size:220px;color:#fff">${answerHtml('Todos', brand.accentOnDark)}</div>`
  },
  'muro-pantallas': {
    w: 1832, h: 628, bg: '#000',
    html: `<div style="display:grid;grid-template-columns:repeat(6,300px);gap:6px;padding:4px">${Array.from({ length: 18 }, (_, i) => tile(i)).join('')}</div>`
  },
  'app-variantes': {
    w: 1400, h: 800, bg: '#0b1018',
    html: `<div style="position:absolute;left:0;top:0;right:0;height:78px;background:#070b11;border-bottom:1px solid #1c2633"></div>
    <img src="${b64(A + 'efeonce-logo-negative.svg', 'image/svg+xml')}" style="position:absolute;left:36px;top:20px;height:38px">
    <div class="p" style="position:absolute;left:260px;top:26px;font-size:22px;color:#9fb3c8">Variantes</div>
    <div style="position:absolute;left:36px;top:110px;display:grid;grid-template-columns:repeat(6,200px);gap:22px">${Array.from({ length: 18 }, (_, i) => i < 14 ? `<div style="width:200px;height:190px;display:flex;align-items:center;justify-content:center;background:#05090f">${pieza(i % 3 === 0 ? 105 : 170, i % 3 === 0 ? 180 : (i % 3 === 1 ? 170 : 96))}</div>` : `<div style="width:200px;height:190px;background:linear-gradient(110deg,#101a26 30%,#1a2a3d 50%,#101a26 70%)"></div>`).join('')}</div>`
  },
  'vinilo-horas': {
    w: 1100, h: 420, bg: DARK,
    html: `<div class="b" style="position:absolute;left:56px;top:64px;font-size:130px;color:#fff;line-height:1.05">Escalamos la idea,<br>${answerHtml('no las horas', brand.accentOnDark)}</div>`
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
console.log('ok')
