// Firma A (clara) y B (tarjeta navy) + franja de partners con logotipos oficiales monocromos.
// node mono.mjs && node build2.mjs → out/firma-{a,b}-partners-{escritorio,movil}.png + .html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { firmaV2 } from '../2026-09-25_efeonce-studio-props/exploracion-v5/firma/firma.mjs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs'

const DIR = new URL('./', import.meta.url).pathname
const FIRMA = DIR + '../2026-09-25_efeonce-studio-props/exploracion-v5/firma/'
const AXIS = '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/'
mkdirSync(DIR + 'out', { recursive: true })
const bubbles = { 'url-bubble': 'url-bubble-baked-light.svg', 'url-bubble-dark': 'url-bubble-baked-dark.svg' }
const firmaImg = (n) => bubbles[n] ? 'data:image/svg+xml;base64,' + readFileSync(AXIS + bubbles[n]).toString('base64') : 'data:image/png;base64,' + readFileSync(FIRMA + 'assets/' + n + '.png').toString('base64')
const persona = JSON.parse(readFileSync(FIRMA + 'personas.json', 'utf8')).find((p) => p.id === 'julio-reyes')
const man = JSON.parse(readFileSync(DIR + 'logos/mono/manifest.json', 'utf8'))
const logo = (id, tone) => `<img src="data:image/png;base64,${readFileSync(DIR + `logos/mono/${id}-${tone}.png`).toString('base64')}" width="${man[id].w}" height="${man[id].h}" alt="${man[id].name}" style="display:inline-block;border:0;width:${man[id].w}px;height:${man[id].h}px;vertical-align:middle">`

// 3 × 3: plataformas · cloud · IA. Celdas iguales y centradas: la grilla ordena, el peso óptico ya viene igualado.
const GRID = [['hubspot', 'salesforce', 'adobe'], ['microsoft', 'googlecloud', 'aws'], ['claude', 'openai', 'byteplus']]
// Columnas alineadas a los bordes del texto: izquierda · centro · derecha.
const ALIGN = ['left', 'center', 'right']
const strip = (tone, { bg, label, rule, pad }) => {
  const rows = GRID.map((r, i) => `<tr>${r.map((id, c) => `<td align="${ALIGN[c]}" valign="middle" width="33%" style="width:33%;height:32px;padding:${i ? 6 : 0}px 0 0;text-align:${ALIGN[c]}">${logo(id, tone)}</td>`).join('')}</tr>`).join('')
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse;width:100%;max-width:460px;background:${bg}" bgcolor="${bg}"><tr><td style="padding:0 ${pad}px 20px;background:${bg}">
  <table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse;border-top:1px solid ${rule}"><tr><td style="padding:14px 0 10px;font:600 9px Arial,Helvetica,sans-serif;letter-spacing:.16em;color:${label}">PARTNERS OFICIALES</td></tr></table>
  <table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse">${rows}</table>
</td></tr></table>`
}
const B = { tone: 'navy', bg: '#001A33', label: '#9FB3C8', rule: '#1D3A57', pad: 24 }
const A = { tone: 'white', bg: '#FFFFFF', label: '#7A8796', rule: '#DCE2E8', pad: 0 }

const fonts = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Poppins:ital,wght@0,800;0,900;1,800;1,900&display=swap" rel="stylesheet">'
const page = (estilo, s) => `<!doctype html><html><head><meta charset="utf-8">${fonts}</head><body style="margin:0;padding:24px 20px;background:#fff"><p style="font:14px Arial;color:#222;margin:0 0 22px">Quedo atento.</p><div style="max-width:460px">${firmaV2(persona, firmaImg, estilo)}${strip(s.tone, s)}</div></body></html>`

// En correo la franja va HORNEADA: una sola imagen (2×) con texto alternativo, que se reduce proporcionalmente
// en el teléfono en vez de reacomodar nueve logos. Ancho de diseño: el del contenido de cada tarjeta.
const ALT = 'Partners oficiales: HubSpot, Salesforce, Adobe, Microsoft, Google Cloud, AWS, Claude, OpenAI y BytePlus'
const browser = await chromium.launch()
const baked = {}
for (const s of [B, A]) {
  const w = 460 - s.pad * 2
  const pg = await browser.newPage({ viewport: { width: w, height: 200 }, deviceScaleFactor: 2 })
  await pg.setContent(`<!doctype html><html><body style="margin:0;background:${s.bg}"><div id="s" style="width:${w}px">${strip(s.tone, { ...s, pad: 0 })}</div></body></html>`)
  const file = `out/partners-${s.tone}.png`
  await (await pg.$('#s')).screenshot({ path: DIR + file })
  await pg.close()
  baked[s.tone] = { file, w, src: 'data:image/png;base64,' + readFileSync(DIR + file).toString('base64') }
}
const stripBaked = (s) => `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse;width:100%;max-width:460px;background:${s.bg}" bgcolor="${s.bg}"><tr><td style="padding:0 ${s.pad}px 20px;background:${s.bg}"><img src="${baked[s.tone].src}" width="${baked[s.tone].w}" alt="${ALT}" style="display:block;border:0;width:100%;max-width:${baked[s.tone].w}px;height:auto"></td></tr></table>`
for (const [id, estilo, s] of [['b', 'tarjeta', B], ['a', 'clara', A]]) {
  const html = page(estilo, s).replace(strip(s.tone, s), stripBaked(s))
  writeFileSync(DIR + `out/firma-${id}-partners.html`, html)
  for (const [mode, w] of [['escritorio', 560], ['movil', 360]]) {
    const pg = await browser.newPage({ viewport: { width: w, height: 400 }, deviceScaleFactor: 2 })
    await pg.setContent(html, { waitUntil: 'networkidle' })
    await pg.evaluate(() => document.fonts.ready)
    const h = await pg.evaluate(() => document.body.scrollHeight)
    await pg.screenshot({ path: DIR + `out/firma-${id}-partners-${mode}.png`, fullPage: true })
    await pg.close()
  }
}
await browser.close()
console.log('ok')
