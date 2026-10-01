// Prueba: firma B (tarjeta navy, aprobada como recomendada) + franja de partners.
// node build.mjs → out/*.html + out/*.png (560 px escritorio y 360 px móvil, 2×).
// Insignias oficiales: HubSpot (repo), Salesforce, Microsoft, Adobe (OneDrive «04. Logos & Partnership» y «Partnership»).
// Marcadores (hasta tener la insignia del portal de cada programa): Claude, OpenAI, Google Cloud, AWS, BytePlus.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { firmaV2 } from '../2026-09-25_efeonce-studio-props/exploracion-v5/firma/firma.mjs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs'

const DIR = new URL('./', import.meta.url).pathname
const FIRMA = DIR + '../2026-09-25_efeonce-studio-props/exploracion-v5/firma/'
mkdirSync(DIR + 'out', { recursive: true })
const b64 = (f, mime) => `data:${mime};base64,${readFileSync(DIR + 'badges/' + f).toString('base64')}`
const AXIS = '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/'
// La burbuja URL sale del paquete oficial de marca (horneada: el correo no aplica la fusión).
const bubbles = { 'url-bubble': 'url-bubble-baked-light.svg', 'url-bubble-dark': 'url-bubble-baked-dark.svg' }
const firmaImg = (n) => bubbles[n] ? 'data:image/svg+xml;base64,' + readFileSync(AXIS + bubbles[n]).toString('base64') : 'data:image/png;base64,' + readFileSync(FIRMA + 'assets/' + n + '.png').toString('base64')
const persona = JSON.parse(readFileSync(FIRMA + 'personas.json', 'utf8')).find((p) => p.id === 'julio-reyes')

const svgPath = (f) => readFileSync(DIR + 'badges/' + f, 'utf8').match(/<path d="([^"]+)"/)[1]
// Marcador: el símbolo público de la marca + nombre + «Partner». Se reemplaza por la insignia del portal.
const placeholder = (icon, name, color) =>
  `<span style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap"><svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="${color}" d="${svgPath(icon)}"/></svg><span style="display:inline-flex;flex-direction:column;line-height:1"><b style="font:700 11.5px Poppins,Arial,sans-serif;color:${color === '#FFFFFF' ? '#fff' : '#1f2937'}">${name}</b><span style="font:600 7px Poppins,Arial,sans-serif;letter-spacing:.14em;color:${color === '#FFFFFF' ? '#c8d3df' : '#6b7280'};margin-top:2px">PARTNER</span></span></span>`

const official = {
  // HubSpot: la insignia vigente del repo (public/branding/partners/hubspot/solution-partner), sin recolorear.
  hubspot: { src: b64('badge-dark-spp-hubspot.svg', 'image/svg+xml'), h: 34, alt: 'HubSpot Solutions Partner' },
  hubspotLight: { src: b64('badge-light-spp-hubspot.svg', 'image/svg+xml'), h: 34, alt: 'HubSpot Solutions Partner' },
  salesforce: { src: b64('t-salesforce-partner.png', 'image/png'), h: 26, alt: 'Salesforce Partner' },
  microsoft: { src: b64('t-microsoft-solutions-partner.png', 'image/png'), h: 24, alt: 'Microsoft Solutions Partner' },
  adobe: { src: b64('t-adobe-registered-reseller.png', 'image/png'), h: 24, alt: 'Adobe Registered Reseller' },
  adobeWhite: { src: b64('t-adobe-registered-reseller-white.png', 'image/png'), h: 24, alt: 'Adobe Registered Reseller' },
  byteplus: { src: b64('t-byteplus.png', 'image/png'), h: 16, alt: 'BytePlus' }
}
const img = (k, extra = '') => `<img src="${official[k].src}" alt="${official[k].alt}" height="${official[k].h}" style="height:${official[k].h}px;width:auto;display:block;${extra}">`

// V1 · franja clara bajo la tarjeta, insignias a color tal cual las entrega cada programa (sin recolorear).
const row = (items) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px">${items.join('')}</div>`
const label = (t, dark) => `<p style="margin:0 0 8px;font:600 8px Poppins,Arial,sans-serif;letter-spacing:.16em;color:${dark ? '#9fb3c8' : '#6b7280'}">${t}</p>`
const stripColor = `<div style="max-width:460px;box-sizing:border-box;border:1px solid #e3e7eb;border-top:0;padding:14px 24px 16px;background:#fff">
  ${label('PLATAFORMAS')}${row([img('hubspot'), img('salesforce'), img('adobe'), img('microsoft')])}
  <div style="height:12px"></div>
  ${label('IA Y CLOUD')}${row([placeholder('claude.svg', 'Claude', '#D97757'), placeholder('openai.svg', 'OpenAI', '#111111'), placeholder('googlecloud.svg', 'Google Cloud', '#4285F4'), placeholder('amazonwebservices.svg', 'AWS', '#232F3E'), img('byteplus')])}
</div>`

// V2 · la franja continúa la tarjeta navy, todo en blanco. Sólo válido con la versión monocroma que apruebe cada programa.
const white = 'filter:brightness(0) invert(1);opacity:.92'
const stripMono = `<div style="max-width:460px;box-sizing:border-box;padding:4px 24px 18px;background:#001a33;border-top:1px solid rgba(255,255,255,.12)">
  <div style="height:12px"></div>${label('PARTNERS', true)}
  ${row([img('hubspotLight'), img('salesforce'), img('adobeWhite'), img('microsoft', white), placeholder('claude.svg', 'Claude', '#FFFFFF'), placeholder('openai.svg', 'OpenAI', '#FFFFFF'), placeholder('googlecloud.svg', 'Google Cloud', '#FFFFFF'), placeholder('amazonwebservices.svg', 'AWS', '#FFFFFF'), img('byteplus', white)])}
</div>`

// V3 · compacta: las cuatro de los carriles que se venden + enlace a la página de partners.
const stripCompact = `<div style="max-width:460px;box-sizing:border-box;border:1px solid #e3e7eb;border-top:0;padding:12px 24px 14px;background:#fff">
  ${row([img('hubspot'), img('salesforce'), placeholder('claude.svg', 'Claude', '#D97757'), placeholder('openai.svg', 'OpenAI', '#111111'), `<a href="https://efeoncepro.com/partners" style="font:600 10.5px Poppins,Arial,sans-serif;color:#023c70;text-decoration:none;white-space:nowrap">y 5 partners más →</a>`])}
</div>`

const fonts = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Poppins:ital,wght@0,400;0,600;0,700;0,800;0,900;1,800;1,900&display=swap" rel="stylesheet">'
const page = (strip) => `<!doctype html><html><head><meta charset="utf-8">${fonts}</head><body style="margin:0;padding:24px 20px;background:#fff"><p style="font:14px Arial;color:#222;margin:0 0 22px">Quedo atento.</p>${firmaV2(persona, firmaImg, 'tarjeta')}${strip}</body></html>`

const variants = { 'v1-color-franja-clara': stripColor, 'v2-mono-franja-navy': stripMono, 'v3-compacta': stripCompact }
const browser = await chromium.launch()
for (const [name, strip] of Object.entries(variants)) {
  const html = page(strip)
  writeFileSync(DIR + `out/${name}.html`, html)
  for (const [mode, w] of [['escritorio', 560], ['movil', 360]]) {
    const pg = await browser.newPage({ viewport: { width: w, height: 400 }, deviceScaleFactor: 2 })
    await pg.setContent(html, { waitUntil: 'networkidle' })
    await pg.evaluate(() => document.fonts.ready)
    const h = await pg.evaluate(() => document.body.scrollHeight)
    await pg.screenshot({ path: DIR + `out/${name}-${mode}.png`, clip: { x: 0, y: 0, width: w, height: h } })
    await pg.close()
  }
}
await browser.close()
console.log('ok')
