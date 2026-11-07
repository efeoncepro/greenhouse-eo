/**
 * Lámina 09 «En el móvil» de Fiordo Austral (06/11/2026, Julio: «falta… una UI en glassmorfismo mostrando la UI de
 * HubSpot»). Sobre la lámina `breather` ya compuesta (foto FA10), pone una tarjeta de vidrio con lo que la vendedora
 * acaba de registrar en la app móvil de HubSpot: el contacto creado desde la tarjeta de visita, la ficha técnica y el
 * próximo paso. Datos de muestra, rotulados. Acento de la línea leído de @efeoncepro/axis-tokens; fuentes del font pack
 * del catálogo; ícono oficial de HubSpot del catálogo. Se retira cuando exista una receta de respiro con pantalla.
 * Uso (desde la raíz): node ai-generations/2026-11-05_propuesta-fiordo-austral/render-movil-ui.mjs <breather.png> <salida.png>
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { chromium } from 'playwright'

const require = createRequire(import.meta.url)
const [inPng, outPng] = process.argv.slice(2)
const g = require('@efeoncepro/axis-tokens').efeonceGraphicLine
const line = g.lines.find(l => l.key === 'revenue-hubspot')
const CAT = path.resolve('src/lib/artifact-composer/catalogs/graphic-line-deck')
// Chromium no carga file:// desde setContent: las fuentes van embebidas.
const font = f => `url(data:font/ttf;base64,${fs.readFileSync(path.join(CAT, 'fonts', f)).toString('base64')}) format('truetype')`
const sprocket = fs.readFileSync(path.join(CAT, 'assets/partners/hubspot-icon-sales.svg'), 'utf8')
const bg = `data:image/png;base64,${fs.readFileSync(inPng).toString('base64')}`

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Pop;font-weight:300;src:${font('poppins-300.ttf')}}
@font-face{font-family:Pop;font-weight:400;src:${font('poppins-400.ttf')}}
@font-face{font-family:Pop;font-weight:500;src:${font('poppins-500.ttf')}}
@font-face{font-family:Pop;font-weight:600;src:${font('poppins-600.ttf')}}
@font-face{font-family:Bric;font-weight:200 800;src:${font('bricolage-grotesque-variable.ttf')}}
:root{--accent:${line.accentOnDark};--ink:${g.color.dark};--deep:${line.darkBg}}
html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:var(--ink)}
.bg{position:absolute;inset:0;width:1920px;height:1080px}
svg.link{position:absolute;inset:0;pointer-events:none}
.card{position:absolute;left:140px;top:618px;width:600px;box-sizing:border-box;padding:26px 30px 24px;border-radius:28px;
  background:linear-gradient(150deg,rgba(255,255,255,.16),rgba(255,255,255,.05));
  border:1px solid rgba(255,255,255,.28);box-shadow:0 30px 80px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.35);
  backdrop-filter:blur(22px) saturate(140%);-webkit-backdrop-filter:blur(22px) saturate(140%);color:#fff;font-family:Pop}
.head{display:flex;align-items:center;gap:12px}
.head .ic{width:34px;height:34px;border-radius:10px;background:#fff;display:grid;place-items:center}
.head .ic svg{width:24px;height:24px}
.kick{font:600 12px/1 Pop;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.78)}
.when{margin-left:auto;font:500 13px/1 Pop;color:rgba(255,255,255,.7)}
.title{margin:18px 0 4px;font:700 32px/1.05 Bric;letter-spacing:-.01em}
.sub{font:400 15px/1.35 Pop;color:rgba(255,255,255,.82)}
.sub b{font-weight:600;color:#fff}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}
.f{padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14)}
.f .l{font:500 11px/1 Pop;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.66)}
.f .v{margin-top:7px;font:600 18px/1.15 Pop}
.f .v .ok{color:var(--accent)}
.next{display:flex;align-items:center;gap:12px;margin-top:12px;padding:13px 14px;border-radius:14px;background:#fff;color:var(--deep)}
.next .dot{width:10px;height:10px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 5px rgba(232,107,208,.18)}
.next .t{font:600 15px/1.2 Pop}
.next .d{margin-left:auto;font:500 13px/1 Pop;opacity:.7}
.note{margin-top:12px;font:400 12px/1 Pop;color:rgba(255,255,255,.6)}
</style></head><body>
<img class="bg" src="${bg}">
<svg class="link" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs><filter id="glow"><feGaussianBlur stdDeviation="4"/></filter></defs>
  <path d="M740 700 C 880 690, 960 640, 1100 612" fill="none" stroke="var(--accent)" stroke-width="6" opacity=".35" filter="url(#glow)"/>
  <path d="M740 700 C 880 690, 960 640, 1100 612" fill="none" stroke="var(--accent)" stroke-width="2"/>
  <circle cx="1100" cy="612" r="6" fill="var(--accent)"/>
</svg>
<section class="card">
  <div class="head"><span class="ic">${sprocket}</span><span class="kick">HubSpot · App móvil</span><span class="when">Hace 1 min</span></div>
  <div class="title">Visita registrada</div>
  <div class="sub">Contacto creado desde la <b>tarjeta de visita</b> · Distribuidor, Alemania</div>
  <div class="grid">
    <div class="f"><div class="l">Proteína mínima</div><div class="v">68 %</div></div>
    <div class="f"><div class="l">FFA máximo</div><div class="v">10 %</div></div>
    <div class="f"><div class="l">Producto</div><div class="v">Harina de salmón</div></div>
    <div class="f"><div class="l">Muestra</div><div class="v">Solicitada <span class="ok">✓</span></div></div>
  </div>
  <div class="next"><span class="dot"></span><span class="t">Enviar la ficha técnica</span><span class="d">Mañana · 9:00</span></div>
  <div class="note">Datos de muestra · se ve en el escritorio y en Outlook al instante</div>
</section>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.route('**/*', r => (r.request().url().startsWith('http') ? r.abort() : r.continue()))
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
const over = await page.evaluate(() => {
  const c = document.querySelector('.card').getBoundingClientRect()
  const bad = [...document.querySelectorAll('.card *')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible')
  return { bottom: c.bottom, right: c.right, clipped: bad.length }
})
if (over.bottom > 1040 || over.clipped) throw new Error(`la tarjeta no cabe: ${JSON.stringify(over)}`)
await page.screenshot({ path: outPng })
await browser.close()
console.log('ok', outPng, JSON.stringify(over))
