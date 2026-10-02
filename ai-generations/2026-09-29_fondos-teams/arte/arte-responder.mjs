// Arte plano de la pared del fondo de Teams «Responder.» (piloto, 2026-09-29): referencia exacta que el modelo
// fotografía (método de la oficina en foto, línea gráfica §10.9). Colores y esfera desde AXIS; fuentes del brand pack.
// node arte-responder.mjs → responder.png
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { efeonceGraphicLine: GL } = require('@efeoncepro/axis-tokens')
const { answerHtml } = require('@efeoncepro/axis-graphic-line')

const F = '/Users/jreye/Documents/greenhouse-eo/src/lib/artifact-composer/brand-packs/axis/fonts/'
const DIR = new URL('./', import.meta.url).pathname
const b64 = f => `data:font/ttf;base64,${readFileSync(F + f).toString('base64')}`
const engine = GL.lines.find(l => l.key === 'engine')
const tinta = GL.color.navy

// Conteo de rayitas: grupos de cinco (cuatro verticales y una diagonal), trazo de plumón.
const rayitas = (n, x0, y0) => {
  let s = ''
  let x = x0

  for (let g = 0; g < Math.floor(n / 5); g++) {
    for (let i = 0; i < 4; i++) s += `<line x1="${x + i * 16}" y1="${y0 + (i % 2) * 3}" x2="${x + i * 16 + 2}" y2="${y0 + 52 - (i % 2) * 2}"/>`
    s += `<line x1="${x - 8}" y1="${y0 + 44}" x2="${x + 58}" y2="${y0 + 8}"/>`
    x += 92
  }
  for (let i = 0; i < n % 5; i++) s += `<line x1="${x + i * 16}" y1="${y0 + (i % 2) * 3}" x2="${x + i * 16 + 2}" y2="${y0 + 52}"/>`

  return s
}

const filas = [['ChatGPT', 17], ['Gemini', 13], ['Perplexity', 9]]

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Bricolage Grotesque'; font-style: normal; font-weight: 760; font-display: block; src: url('${b64('bricolage-grotesque-variable.ttf')}') format('truetype'); }
@font-face { font-family: 'Guttery'; src: url('${b64('guttery-400.ttf')}') format('truetype'); }
html, body { margin: 0; }
.muro { position: relative; width: 900px; height: 1150px; background: ${GL.color.dark}; overflow: hidden; }
.nombre { position: absolute; left: 60px; top: 50px; font-family: 'Bricolage Grotesque'; font-weight: 760; font-size: 150px; line-height: 1; letter-spacing: -3px; color: #fff; }
.pizarra { position: absolute; left: 60px; top: 300px; width: 780px; height: 790px; background: #f6f7f8; border: 12px solid #c7ccd2; border-radius: 6px; box-sizing: border-box; }
.pregunta { position: absolute; left: 48px; top: 36px; font-family: 'Guttery'; font-size: 76px; line-height: 1.05; color: ${tinta}; }
.fila { position: absolute; left: 60px; font-family: 'Guttery'; font-size: 54px; color: ${tinta}; }
svg { position: absolute; left: 0; top: 0; }
</style></head><body><div class="muro">
<div class="nombre">${answerHtml('Responder', engine.accentOnDark)}</div>
<div class="pizarra">
  <div class="pregunta">¿Qué agencia<br>me recomiendas?</div>
  <div class="fila" style="top:250px;left:300px;font-size:40px;opacity:.85">preguntas de hoy</div>
  ${filas.map(([n], i) => `<div class="fila" style="top:${330 + i * 120}px">${n}</div>`).join('')}
  <svg width="756" height="766" stroke="${tinta}" stroke-width="6" stroke-linecap="round" fill="none">
    ${filas.map(([, c], i) => rayitas(c, 300, 340 + i * 120)).join('')}
  </svg>
</div>
</div></body></html>`

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 900, height: 1150 } })
await p.setContent(html, { waitUntil: 'networkidle' })
await p.evaluate(async () => { await document.fonts.load('760 210px "Bricolage Grotesque"'); await document.fonts.load('74px "Guttery"'); await document.fonts.ready })
const ok = await p.evaluate(() => document.fonts.check('760 210px "Bricolage Grotesque"') && document.fonts.check('74px "Guttery"'))
if (!ok) throw new Error('las fuentes no cargaron')
await p.locator('.muro').screenshot({ path: DIR + 'responder-tercio.png' })
await b.close()
console.log('ok', DIR + 'responder-tercio.png')
