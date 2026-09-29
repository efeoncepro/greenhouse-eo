// Firma de correo Efeonce v3.1 (APROBADA por Julio, 2026-09-26): la franja de partners abre su propia zona con una regla fina SIN esfera.
// iconografía Tabler (la familia del ecosistema) y franja «Partner oficial de» horneada.
// node mono.mjs && node build3.mjs → out/v3/*.png + *.html
// Sin «Quedo atento.»: el cierre es parte del cuerpo del correo, no de la firma.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs'

// Firmas del equipo (2026-09-29): el constructor v3.1 APROBADO sin cambios de diseño; sólo la persona y la foto salen
// de la tabla EQUIPO. Los insumos (íconos, logos de partners) siguen en la carpeta de la v3.1.
const DIR = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-26_firma-partners/'
const AQUI = new URL('./', import.meta.url).pathname
const SEP = process.env.SEP || 'linea'
const OUT = AQUI + `out/${process.env.PERSON}/`
mkdirSync(OUT, { recursive: true })
// HOST_BASE=https://storage.googleapis.com/<bucket>/email-signature/v3.1 → escribe hosted/ y outlook-{a,b}.html
const HOST = process.env.HOST_BASE?.replace(/\/$/, '')
const HOSTED = OUT + 'hosted/'
const PERSON = process.env.PERSON || 'julio-reyes'
const FIRMA = DIR + '../2026-09-25_efeonce-studio-props/exploracion-v5/firma/assets/'
const AXIS = '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/'
const uri = (buf, mime = 'image/png') => `data:${mime};base64,${buf.toString('base64')}`
const file = (p, mime) => uri(readFileSync(p), mime)

// Paletas: B sobre la tarjeta navy, A sobre papel. Acento = la esfera (teal sobre oscuro, teal oscuro sobre claro).
const T = {
  b: { bg: '#001A33', name: '#FFFFFF', sub: '#9FB3C8', text: '#E6EDF3', accent: '#36C8BF', line: '#1D3A57', slogan: '#E2E2E2', word: '#FFFFFF', tone: 'navy', photo: 'foto-orbita-oscura-julio-reyes', logo: 'logo-efeonce-negativo', bubble: 'url-bubble-baked-dark.svg', pad: 24 },
  a: { bg: '#FFFFFF', name: '#023C70', sub: '#3D4F63', text: '#023C70', accent: '#0E8C82', line: '#DCE2E8', slogan: '#6B6B6B', word: '#023C70', tone: 'white', photo: 'foto-orbita-julio-reyes', logo: 'logo-efeonce', bubble: 'url-bubble-baked-light.svg', pad: 0 }
}
const BAND = { b: '#00142A', a: '#F4F6F8' }
// Nombres y correos: Entra (2026-09-29). Cargos y teléfonos: el operador (2026-09-29): todos llevan el WhatsApp de la
// agencia; Julio, el suyo. LinkedIn queda para después (sólo Julio lo tiene hoy).
const AGENCIA = '+56 9 3732 3064'
const EQUIPO = {
  'julio-reyes': { nombre: 'Julio Reyes', cargo: 'Managing & GTM Director · Efeonce', telefono: '+56 9 3480 2860', correo: 'jreyes@efeoncepro.com', linkedin: 'https://linkedin.com/in/cesargrowth' },
  'daniela-ferreira': { nombre: 'Daniela Ferreira', cargo: 'Creative Operations Lead · Efeonce', telefono: AGENCIA, correo: 'dferreira@efeoncepro.com', linkedin: null },
  'andres-carlosama': { nombre: 'Andrés Carlosama', cargo: 'Senior Visual Designer · Efeonce', telefono: AGENCIA, correo: 'acarlosama@efeoncepro.com', linkedin: null },
  'melkin-hernandez': { nombre: 'Melkin Hernandez', cargo: 'Senior Visual Designer · Efeonce', telefono: AGENCIA, correo: 'mhernandez@efeoncepro.com', linkedin: null },
  'humberly-henriquez': { nombre: 'Humberly Henriquez', cargo: 'Head of Finance · Efeonce', telefono: AGENCIA, correo: 'hhumberly@efeoncepro.com', linkedin: null },
  'valentina-hoyos': { nombre: 'Valentina Hoyos', cargo: 'Content Lead · Efeonce', telefono: AGENCIA, correo: 'valentina.hoyos@efeonce.org', linkedin: null }
}
const PERSONA = { ...EQUIPO[PERSON], web: 'https://efeoncepro.com' }
const FOTOS = AQUI + 'fotos/'
// Firma de EQUIPO (buzón compartido de un área): sin foto; la órbita rodea el ícono del área y el nombre es el área.
const AREAS = {
  talent: { nombre: 'Talent', cargo: 'Personas y talento · Efeonce', correo: 'talent@efeoncepro.com', icono: 'users-group' },
  finance: { nombre: 'Finance', cargo: 'Finanzas y facturación · Efeonce', correo: 'finance@efeoncepro.com', icono: 'coins' },
  commercial: { nombre: 'Commercial', cargo: 'Comercial y alianzas · Efeonce', correo: 'sales@efeoncepro.com', icono: 'briefcase' }
}
const AREA = process.env.AREA && AREAS[process.env.AREA]
const P = AREA ? { nombre: AREA.nombre, cargo: AREA.cargo, telefono: AGENCIA, correo: AREA.correo, linkedin: null, web: PERSONA.web } : PERSONA
// La órbita del retrato (token portrait: caja 208, anillo r96, disco r78, arco 200°→250° trazo 4, esfera r7) con el ícono
// del área al centro, en el color del nombre; la esfera lleva el acento.
const areaOrbit = async (t) => {
  const k = 208, cx = 104, rad = (d) => d * Math.PI / 180, pt = (r, d) => [cx + r * Math.cos(rad(d)), cx + r * Math.sin(rad(d))]
  const [x0, y0] = pt(96, 200), [x1, y1] = pt(96, 250)
  const dark = t.tone === 'navy'
  const ring = dark ? 'rgba(111,137,162,0.4)' : 'rgba(2,60,112,0.22)'
  const disc = dark ? '#0b2b4a' : '#eef3f7'
  const icon = readFileSync(DIR + `icons/${AREA.icono}.svg`, 'utf8').match(/<path[\s\S]*<\/svg>/)[0].replace('</svg>', '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${k}" height="${k}" viewBox="0 0 ${k} ${k}"><circle cx="${cx}" cy="${cx}" r="96" fill="none" stroke="${ring}" stroke-width="2"/><circle cx="${cx}" cy="${cx}" r="78" fill="${disc}"/><path d="M${x0} ${y0} A96 96 0 0 1 ${x1} ${y1}" fill="none" stroke="${t.accent}" stroke-width="4" stroke-linecap="round"/><circle cx="${x1}" cy="${y1}" r="7" fill="${t.accent}"/><g transform="translate(${cx - 36} ${cx - 36}) scale(3)" fill="none" stroke="${t.name}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icon}</g></svg>`
  return sharp(Buffer.from(svg), { density: 300 }).resize(k, k).png().toBuffer()
}
// La esfera de la línea que termina en ella: PNG 3× en el acento, fondo transparente (Outlook pierde el border-radius).
const esfera = accent => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="27" height="27"><circle cx="13.5" cy="13.5" r="13.5" fill="${accent}"/></svg>`)).png().toBuffer()
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
const stripHtml = (t, w, bg = t.bg) => `<div style="width:${w}px;background:${bg};font-family:${SANS}">
  <div style="font-family:'Poppins',Arial,sans-serif;font-size:11px;line-height:14px;font-weight:500;color:${t.sub};margin:0 0 10px">Partner oficial de</div>
  ${ROWS.map((r, i) => `<div style="display:flex;justify-content:space-between;align-items:center;height:26px;margin-top:${i ? 8 : 0}px">${r.map((id) => `<img src="${file(DIR + `logos/mono/${id}-${t.tone}.png`)}" style="width:${man[id].w}px;height:${man[id].h}px;display:block">`).join('')}</div>`).join('')}
</div>`

const firma = (t, s) => {
  const link = (href, txt, color) => `<a href="${href}" style="color:${color};text-decoration:none">${txt}</a>`
  const fila = (src, contenido) => `<tr><td valign="middle" width="22" style="width:22px;padding:3px 0">${ico(src, 14)}</td><td valign="middle" style="padding:3px 0;font-family:${SANS};font-size:13px;line-height:18px;font-weight:400;color:${t.text}">${contenido}</td></tr>`
  const contacto = `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;margin-top:10px">
${P.telefono ? fila(s.phone, link(`tel:${P.telefono.replace(/[^+\d]/g, '')}`, P.telefono, t.text)) : ''}
${fila(s.mail, link(`mailto:${P.correo}`, P.correo, t.text))}
<tr><td colspan="2" style="padding:8px 0 0"><table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse"><tr>
<td valign="middle">${link(P.web, `<img src="${s.bubble}" width="92" height="18" alt="efeoncepro.com" style="display:block;border:0;width:92px;height:18px">`, t.text)}</td>
${P.linkedin ? `<td valign="middle" style="padding-left:10px">${link(P.linkedin, ico(s.linkedin, 18, 'LinkedIn'), t.text)}</td>` : ''}
</tr></table></td></tr></table>`
  // Divisor: la línea que termina EN la esfera (misma altura, sin separación), en las dos tarjetas.
  const divisor = `<tr><td colspan="3" style="padding:18px 0 0"><table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse"><tr><td valign="middle" style="height:9px"><div style="height:4px;border-bottom:1px solid ${t.line};font-size:0;line-height:0">&nbsp;</div></td><td valign="middle" width="9" style="width:9px;height:9px"><img src="${s.sphere}" width="9" height="9" alt="" style="display:block;border:0;width:9px;height:9px"></td></tr></table></td></tr>`
  const marca = `<tr><td colspan="3" style="padding:14px 0 0"><table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse"><tr>
<td valign="middle"><img src="${s.logo}" width="108" alt="Efeonce" style="display:block;border:0;width:108px;height:auto"></td>
<td valign="middle" align="right" style="font-family:${ESLOGAN};font-size:12px;line-height:16px;font-style:italic;font-weight:800;color:${t.slogan};white-space:nowrap">Empower <span style="font-style:normal">your</span> <span style="font-weight:900;color:${t.word}">Growth</span></td>
</tr></table></td></tr>`
  const stripImg = `<img src="${s.strip}" width="${s.stripW}" alt="${ALT}" style="display:block;border:0;width:100%;max-width:${s.stripW}px;height:auto">`
  // Regla de sección: borde superior de una celda (Outlook no respeta la altura de un div de 1 px).
  const hair = `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse"><tr><td style="border-top:1px solid ${t.line};font-size:0;line-height:0;height:1px">&nbsp;</td></tr></table>`
  const partners = SEP === 'espacio' ? `<tr><td colspan="3" style="padding:30px 0 0">${stripImg}</td></tr>`
    : SEP === 'linea' ? `<tr><td colspan="3" style="padding:20px 0 0">${hair}</td></tr><tr><td colspan="3" style="padding:16px 0 0">${stripImg}</td></tr>`
    : SEP === 'banda' ? ''
    : `<tr><td colspan="3" style="padding:16px 0 0">${stripImg}</td></tr>`
  const cuerpo = `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse">
<tr><td valign="middle" width="96" style="width:96px;min-width:96px;padding:0"><img src="${s.photo}" width="96" height="96" alt="${P.nombre}" style="display:block;border:0;width:96px;min-width:96px;max-width:96px;height:96px"></td><td width="16" style="width:16px;min-width:16px;font-size:0;line-height:0">&nbsp;</td>
<td valign="middle"><div style="font-family:${TITULAR};font-size:22px;line-height:26px;font-weight:800;letter-spacing:-0.3px;color:${t.name}">${P.nombre}<span style="color:${t.accent}">.</span></div>
<div style="font-family:${SANS};font-size:13px;line-height:18px;font-weight:400;color:${t.sub};padding-top:2px">${P.cargo}</div>${contacto}</td></tr>
${divisor}${marca}${partners}</table>`
  const banda = SEP === 'banda' ? `<tr><td bgcolor="${BAND[t === T.b ? 'b' : 'a']}" style="padding:${t.pad ? '16px 24px 18px' : '14px 16px 16px'};background:${BAND[t === T.b ? 'b' : 'a']}${t.pad ? '' : ';border-radius:0'}">${stripImg}</td></tr>` : ''
  const top = SEP === 'banda' && !t.pad ? `<tr><td style="padding:0 0 22px">` : `<tr><td style="padding:${t.pad ? (SEP === 'banda' ? '22px 24px 22px' : '22px 24px 22px') : '0'};background:${t.bg}">`
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse;width:100%;max-width:460px;background:${t.bg}" bgcolor="${t.bg}">${top}${cuerpo}</td></tr>${banda}</table>`
}

// Firma de respuesta: una línea de texto vivo, sin imágenes (Outlook: «Respuestas/reenvíos»).
const respuesta = (t) => `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse"><tr><td style="font-family:${SANS};font-size:13px;line-height:18px;color:${t === T.b ? '#3D4F63' : '#3D4F63'}"><span style="font-family:${TITULAR};font-weight:800;font-size:15px;color:#023C70">${P.nombre}<span style="color:#0E8C82">.</span></span>&nbsp; ${P.cargo} &nbsp;·&nbsp; ${P.telefono ? `<a href="tel:${P.telefono.replace(/[^+\d]/g, '')}" style="color:#023C70;text-decoration:none">${P.telefono}</a>` : `<a href="mailto:${P.correo}" style="color:#023C70;text-decoration:none">${P.correo}</a>`}</td></tr></table>`

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
  const band = SEP === 'banda', bg = band ? BAND[id] : t.bg
  const stripW = band ? (t.pad ? 412 : 428) : 460 - t.pad * 2
  const sp = await browser.newPage({ viewport: { width: stripW, height: 120 }, deviceScaleFactor: 3 })
  await sp.setContent(`<!doctype html><html><head>${fonts}</head><body style="margin:0">${stripHtml(t, stripW, t.tone === 'white' ? 'transparent' : bg)}</body></html>`, { waitUntil: 'networkidle' })
  await sp.evaluate(() => document.fonts.ready)
  const strip = await (await sp.$('div')).screenshot({ omitBackground: t.tone === 'white' })
  await sp.close()
  if (SEP === 'linea') writeFileSync(OUT + `partners-${t.tone}.png`, strip)
  const s = {
    phone: await icon('phone', t.accent, 14), mail: await icon('mail', t.accent, 14), linkedin: await icon('brand-linkedin', t.accent, 18),
    photo: AREA ? uri(await areaOrbit(t)) : file(FOTOS + (t.tone === 'navy' ? 'foto-orbita-oscura-' : 'foto-orbita-') + PERSON + '.png'), logo: file(FIRMA + t.logo + '.png'), bubble: file(AXIS + t.bubble, 'image/svg+xml'),
    strip: uri(strip), stripW,
    sphere: uri(await esfera(t.accent))
  }
  const html = firma(t, s)
  writeFileSync(OUT + `firma-${id}.html`, html)
  // Para instalar en Outlook: las mismas imágenes como PNG en el bucket público y el HTML apuntando a sus URLs
  // (Outlook y Gmail bloquean los data: URI o los vuelven adjuntos; tampoco pintan SVG).
  if (HOST) {
    const surface = t.tone === 'navy' ? 'dark' : 'light'
    const put = (rel, buf) => { mkdirSync(HOSTED + rel.replace(/[^/]+$/, ''), { recursive: true }); writeFileSync(HOSTED + rel, buf); return `${HOST}/${rel}` }
    const png = (dataUri) => Buffer.from(dataUri.split(',')[1], 'base64')
    const h = {
      phone: put(`shared/${surface}/icon-phone.png`, png(s.phone)),
      mail: put(`shared/${surface}/icon-mail.png`, png(s.mail)),
      linkedin: put(`shared/${surface}/icon-linkedin.png`, png(s.linkedin)),
      logo: put(`shared/${surface}/logo-efeonce.png`, readFileSync(FIRMA + t.logo + '.png')),
      bubble: put(`shared/${surface}/url-bubble.png`, await sharp(readFileSync(AXIS + t.bubble), { density: 600 }).resize(92 * 3, 18 * 3).png().toBuffer()),
      strip: put(`shared/${surface}/partners.png`, strip),
      sphere: put(`shared/${surface}/sphere.png`, await esfera(t.accent)),
      photo: AREA ? put(`areas/${process.env.AREA}-${surface}.png`, await areaOrbit(t)) : put(`people/${PERSON}-${surface}.png`, readFileSync(FOTOS + (t.tone === 'navy' ? 'foto-orbita-oscura-' : 'foto-orbita-') + PERSON + '.png')),
      stripW
    }
    writeFileSync(OUT + `outlook-${id}.html`, firma(t, h))
  }
  await shot(html, `firma-${id}-escritorio`, 520)
  await shot(html, `firma-${id}-movil`, 380)
  await shot(html, `firma-${id}-sin-fuentes`, 520, false)
}
await shot(respuesta(T.a), 'firma-respuesta', 560)
if (HOST) writeFileSync(OUT + 'outlook-respuesta.html', respuesta(T.a))
await browser.close()
console.log('ok')
