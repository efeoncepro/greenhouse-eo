// Firma de correo Efeonce v3 · propuesta: firma completa (A clara, B tarjeta navy) + firma de respuesta, con
// iconografía Tabler (la familia del ecosistema) y franja «Partner oficial de» horneada.
// node mono.mjs && node build3.mjs → out/v3/*.png + *.html
// Sin «Quedo atento.»: el cierre es parte del cuerpo del correo, no de la firma.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs'

const DIR = new URL('./', import.meta.url).pathname
const OUT = DIR + 'out/v3/'
mkdirSync(OUT, { recursive: true })
const FIRMA = DIR + '../2026-09-25_efeonce-studio-props/exploracion-v5/firma/assets/'
const AXIS = '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/'
const uri = (buf, mime = 'image/png') => `data:${mime};base64,${buf.toString('base64')}`
const file = (p, mime) => uri(readFileSync(p), mime)

// Paletas: B sobre la tarjeta navy, A sobre papel. Acento = la esfera (teal sobre oscuro, teal oscuro sobre claro).
const T = {
  b: { bg: '#001A33', name: '#FFFFFF', sub: '#9FB3C8', text: '#E6EDF3', accent: '#36C8BF', line: '#1D3A57', slogan: '#C9D3DC', word: '#FFFFFF', tone: 'navy', photo: 'foto-orbita-oscura-julio-reyes', logo: 'logo-efeonce-negativo', bubble: 'url-bubble-baked-dark.svg', pad: 24 },
  a: { bg: '#FFFFFF', name: '#023C70', sub: '#3D4F63', text: '#023C70', accent: '#0E8C82', line: '#DCE2E8', slogan: '#848484', word: '#023C70', tone: 'white', photo: 'foto-orbita-julio-reyes', logo: 'logo-efeonce', bubble: 'url-bubble-baked-light.svg', pad: 0 }
}
const P = { nombre: 'Julio Reyes', cargo: 'Managing & GTM Director · Efeonce', telefono: '+56 9 3732 3064', correo: 'jreyes@efeoncepro.com', linkedin: 'https://linkedin.com/in/cesargrowth', web: 'https://efeoncepro.com' }
const SANS = "'Poppins', Arial, Helvetica, sans-serif", TITULAR = "'Bricolage Grotesque', 'Poppins', Arial, Helvetica, sans-serif", ESLOGAN = "'Poppins', Arial, Helvetica, sans-serif"

// Iconos Tabler (outline, trazo 1,75) horneados a PNG 3× en el acento: el correo no pinta SVG.
const icon = async (name, color, px) => {
  const svg = readFileSync(DIR + `icons/${name}.svg`, 'utf8').replace(/currentColor/g, color).replace(/stroke-width="2"/, 'stroke-width="1.75"')
  return uri(await sharp(Buffer.from(svg), { density: 600 }).resize(px * 3, px * 3).png().toBuffer())
}
const ico = (src, px, alt = '') => `<img src="${src}" width="${px}" height="${px}" alt="${alt}" style="display:block;border:0;width:${px}px;height:${px}px">`

// Franja de partners: dos filas (5 + 4) justificadas al ancho, horneada como UNA imagen.
const man = JSON.parse(readFileSync(DIR + 'logos/mono/manifest.json', 'utf8'))
const ROWS = [['hubspot', 'salesforce', 'adobe', 'microsoft', 'aws'], ['googlecloud', 'claude', 'openai', 'byteplus']]
const ALT = 'Partner oficial de HubSpot, Salesforce, Adobe, Microsoft, AWS, Google Cloud, Claude, OpenAI y BytePlus'
const stripHtml = (t, w) => `<div style="width:${w}px;background:${t.bg};font-family:${SANS}">
  <div style="font-family:'Poppins',Arial,sans-serif;font-size:11px;line-height:14px;font-weight:500;color:${t.sub};margin:0 0 10px">Partner oficial de</div>
  ${ROWS.map((r, i) => `<div style="display:flex;justify-content:space-between;align-items:center;height:26px;margin-top:${i ? 8 : 0}px">${r.map((id) => `<img src="${file(DIR + `logos/mono/${id}-${t.tone}.png`)}" style="width:${man[id].w}px;height:${man[id].h}px;display:block">`).join('')}</div>`).join('')}
</div>`

const firma = (t, s) => {
  const link = (href, txt, color) => `<a href="${href}" style="color:${color};text-decoration:none">${txt}</a>`
  const fila = (src, contenido) => `<tr><td valign="middle" width="22" style="width:22px;padding:3px 0">${ico(src, 14)}</td><td valign="middle" style="padding:3px 0;font-family:${SANS};font-size:13px;line-height:18px;font-weight:400;color:${t.text}">${contenido}</td></tr>`
  const contacto = `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;margin-top:10px">
${fila(s.phone, link(`tel:${P.telefono.replace(/[^+\d]/g, '')}`, P.telefono, t.text))}
${fila(s.mail, link(`mailto:${P.correo}`, P.correo, t.text))}
<tr><td colspan="2" style="padding:8px 0 0"><table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse"><tr>
<td valign="middle">${link(P.web, `<img src="${s.bubble}" width="92" height="18" alt="efeoncepro.com" style="display:block;border:0;width:92px;height:18px">`, t.text)}</td>
<td valign="middle" style="padding-left:10px">${link(P.linkedin, ico(s.linkedin, 18, 'LinkedIn'), t.text)}</td>
</tr></table></td></tr></table>`
  // Divisor: la línea que termina EN la esfera (misma altura, sin separación), en las dos tarjetas.
  const divisor = `<tr><td colspan="2" style="padding:18px 0 0"><table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse"><tr><td valign="middle" style="height:9px"><div style="height:4px;border-bottom:1px solid ${t.line};font-size:0;line-height:0">&nbsp;</div></td><td valign="middle" width="9" style="width:9px;height:9px"><!--[if mso]><span style="font-size:11px;line-height:9px;color:${t.accent}">&#9679;</span><![endif]--><!--[if !mso]><!--><div style="width:9px;height:9px;border-radius:9px;background:${t.accent};font-size:0;line-height:0">&nbsp;</div><!--<![endif]--></td></tr></table></td></tr>`
  const marca = `<tr><td colspan="2" style="padding:14px 0 0"><table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse"><tr>
<td valign="middle"><img src="${s.logo}" width="108" alt="Efeonce" style="display:block;border:0;width:108px;height:auto"></td>
<td valign="middle" align="right" style="font-family:${ESLOGAN};font-size:12px;line-height:16px;font-style:italic;font-weight:800;color:${t.slogan};white-space:nowrap">Empower <span style="font-style:normal">your</span> <span style="font-weight:900;color:${t.word}">Growth</span></td>
</tr></table></td></tr>`
  const partners = `<tr><td colspan="2" style="padding:16px 0 0"><img src="${s.strip}" width="${s.stripW}" alt="${ALT}" style="display:block;border:0;width:100%;max-width:${s.stripW}px;height:auto"></td></tr>`
  const cuerpo = `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse">
<tr><td valign="middle" width="96" style="width:96px;padding:0 16px 0 0"><img src="${s.photo}" width="96" height="96" alt="${P.nombre}" style="display:block;border:0;width:96px;height:96px"></td>
<td valign="middle"><div style="font-family:${TITULAR};font-size:22px;line-height:26px;font-weight:800;letter-spacing:-0.3px;color:${t.name}">${P.nombre}<span style="color:${t.accent}">.</span></div>
<div style="font-family:${SANS};font-size:13px;line-height:18px;font-weight:400;color:${t.sub};padding-top:2px">${P.cargo}</div>${contacto}</td></tr>
${divisor}${marca}${partners}</table>`
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse;width:100%;max-width:460px;background:${t.bg}" bgcolor="${t.bg}"><tr><td style="padding:${t.pad ? '22px 24px 22px' : '0'};background:${t.bg}">${cuerpo}</td></tr></table>`
}

// Firma de respuesta: una línea de texto vivo, sin imágenes (Outlook: «Respuestas/reenvíos»).
const respuesta = (t) => `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse"><tr><td style="font-family:${SANS};font-size:13px;line-height:18px;color:${t === T.b ? '#3D4F63' : '#3D4F63'}"><span style="font-family:${TITULAR};font-weight:800;font-size:15px;color:#023C70">${P.nombre}<span style="color:#0E8C82">.</span></span>&nbsp; ${P.cargo} &nbsp;·&nbsp; <a href="tel:${P.telefono.replace(/[^+\d]/g, '')}" style="color:#023C70;text-decoration:none">${P.telefono}</a></td></tr></table>`

const fonts = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Poppins:ital,wght@0,400;0,500;0,800;0,900;1,800;1,900&display=swap" rel="stylesheet">'
const browser = await chromium.launch()
const shot = async (html, name, w, fontsOn = true) => {
  const pg = await browser.newPage({ viewport: { width: w, height: 300 }, deviceScaleFactor: 2 })
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8">${fontsOn ? fonts : ''}</head><body style="margin:0;padding:24px 20px;background:#fff">${fontsOn ? '' : '<style>*{font-family:Arial,Helvetica,sans-serif!important}</style>'}${html}</body></html>`, { waitUntil: 'networkidle' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.screenshot({ path: OUT + name + '.png', fullPage: true })
  await pg.close()
}
for (const id of ['b', 'a']) {
  const t = T[id]
  const stripW = 460 - t.pad * 2
  const sp = await browser.newPage({ viewport: { width: stripW, height: 120 }, deviceScaleFactor: 3 })
  await sp.setContent(`<!doctype html><html><head>${fonts}</head><body style="margin:0">${stripHtml(t, stripW)}</body></html>`, { waitUntil: 'networkidle' })
  await sp.evaluate(() => document.fonts.ready)
  const strip = await (await sp.$('div')).screenshot()
  await sp.close()
  writeFileSync(OUT + `partners-${t.tone}.png`, strip)
  const s = {
    phone: await icon('phone', t.accent, 14), mail: await icon('mail', t.accent, 14), linkedin: await icon('brand-linkedin', t.accent, 18),
    photo: file(FIRMA + t.photo + '.png'), logo: file(FIRMA + t.logo + '.png'), bubble: file(AXIS + t.bubble, 'image/svg+xml'),
    strip: uri(strip), stripW
  }
  const html = firma(t, s)
  writeFileSync(OUT + `firma-${id}.html`, html)
  await shot(html, `firma-${id}-escritorio`, 520)
  await shot(html, `firma-${id}-movil`, 380)
  await shot(html, `firma-${id}-sin-fuentes`, 520, false)
}
await shot(respuesta(T.a), 'firma-respuesta', 560)
await browser.close()
console.log('ok')
