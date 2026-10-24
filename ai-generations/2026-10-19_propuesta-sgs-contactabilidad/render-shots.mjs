// Render local de las láminas del canvas para QA: cambia cada /_blob/<id> por su archivo local.
// Uso: node render-shots.mjs <project> <out> [archivos…]
import { chromium } from 'playwright'; import fs from 'fs'; import path from 'path'
const HERE = path.dirname(new URL(import.meta.url).pathname)
const [dir, out, ...names] = process.argv.slice(2)
const blobs = JSON.parse(fs.readFileSync(`${HERE}/blobs.json`, 'utf8'))
const ASSETS = '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets'
const local = { P01: `${HERE}/png/P01-portada.png`, P04: `${HERE}/png/P04-solucion.png`, P05: `${HERE}/png/P05-panel.png`, P06: `${HERE}/png/P06-alternativas.png`,
  P11: `${HERE}/png/P11-plan.png`, P14: `${HERE}/png/P14-contraportada.png`, 'url-bubble-dark': `${ASSETS}/url-bubble-baked-dark.svg`, 'logo-negative': `${ASSETS}/efeonce-logo-negative.svg`, 'sf-partner': '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-29_deck-salesforce/logos/salesforce-partner-badge-horizontal.svg', 'aircall-logo': `${HERE}/logos-cliente/aircall-logo-blanco.svg`, 'insights-lockup': `${ASSETS}/insights-lockup-negative.svg`, 'sf-logo': '/Users/jreye/Documents/greenhouse-eo/public/images/logos/partners/salesforce.com_logo.svg', 'sf-sales': '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-29_deck-salesforce/logos/icon-sales.svg', 'sgs-logo': `${HERE}/logos-cliente/sgs-logo-sobre-oscuro.svg` }
const map = Object.fromEntries(Object.entries(blobs).map(([k, v]) => [v, `file://${local[k]}`]))
fs.mkdirSync(out, { recursive: true })
const files = names.length ? names : fs.readdirSync(dir).filter(f => f.endsWith('.dc.html'))
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
for (const f of files) {
  let h = fs.readFileSync(`${dir}/${f}`, 'utf8').replace('<script src="./support.js"></script>', '').replace(/<\/?helmet>/g, '').replace(/<\/?x-dc>/g, '')
  h = h.replace(/\/_blob\/[0-9a-f]{32}/g, m => map[m] || m)
  fs.writeFileSync(`${out}/_t.html`, h); await p.goto(`file://${out}/_t.html`, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: `${out}/${f.replace('.dc.html', '.jpg')}`, type: 'jpeg', quality: 72 })
}
await b.close()
