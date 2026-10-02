// Firma de correo Efeonce · línea gráfica «la esfera» (exploración v5, 2026-09-25).
// HTML de correo: tablas, estilos en línea, texto vivo. Dos imágenes como máximo: foto (opcional) y logo.
// La esfera es el punto final del nombre: texto, funciona en todo cliente. La foto va sin punto al lado:
// en un avatar, un punto de color se lee como estado «disponible» de Teams/Slack, no como la esfera.
// Datos institucionales: src/config/efeonce-brand.ts (EFEONCE_CONTACT, EFEONCE_URL, EFEONCE_SOCIAL_LINKS).

export const MARCAS = {
  efeonce: { acento: '#0E8C82', palabra: 'Growth', logo: 'logo-efeonce', logoW: 116, logoH: 31 },
  globe: { acento: '#BB1954', palabra: 'Brand', logo: 'logo-globe', logoW: 68, logoH: 36 },
  wave: { acento: '#0375DB', palabra: 'Engine', logo: 'logo-wave', logoW: 80, logoH: 36 },
  reach: { acento: '#F83902', palabra: 'Voice', logo: 'logo-reach', logoW: 88, logoH: 31 }
}

const NAVY = '#023C70', TEXTO = '#3D4F63', GRIS = '#848484', LINEA = '#DCE2E8'
const SANS = "Arial, Helvetica, sans-serif"
const TITULAR = "'Bricolage Grotesque', 'Poppins', Arial, Helvetica, sans-serif"
const ESLOGAN = "'Poppins', Arial, Helvetica, sans-serif"
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const a = (href, txt) => `<a href="${esc(href)}" style="color:${NAVY};text-decoration:none">${esc(txt)}</a>`

// img: (nombre) => URL pública del asset. En producción, https://greenhouse.efeoncepro.com/branding/email/firma/<nombre>.png
export function firma (p, img) {
  const m = MARCAS[p.marca ?? 'efeonce']
  const contacto = [
    p.telefono && a(`tel:${p.telefono.replace(/[^+\d]/g, '')}`, p.telefono),
    p.correo && a(`mailto:${p.correo}`, p.correo)
  ].filter(Boolean).join('<br>')
  const enlaces = [a('https://efeoncepro.com', 'efeoncepro.com'), p.linkedin && a(p.linkedin, 'LinkedIn')].filter(Boolean).join(' &nbsp;·&nbsp; ')
  const foto = p.foto
    ? `<td valign="top" width="92" style="padding:0 18px 0 0;width:92px"><img src="${img(p.foto)}" width="92" height="92" alt="${esc(p.nombre)}" style="display:block;width:92px;height:92px;border:0"></td>`
    : ''
  const campana = p.campana
    ? `<tr><td colspan="2" style="padding:12px 0 0 0;font-family:${SANS};font-size:12px;line-height:18px;color:${TEXTO}"><span style="color:${m.acento}">&#9675;</span>&nbsp;${esc(p.campana.pregunta)} ${a(p.campana.url, p.campana.accion + ' →').replace('text-decoration:none', 'text-decoration:none;font-weight:bold')}</td></tr>`
    : ''
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;max-width:460px;font-family:${SANS};color:${NAVY}">
<tr>${foto}<td valign="top" style="padding:2px 0 0 0">
<div style="font-family:${TITULAR};font-size:20px;line-height:24px;font-weight:800;letter-spacing:-0.3px;color:${NAVY}">${esc(p.nombre)}<span style="color:${m.acento}">.</span></div>
<div style="font-family:${SANS};font-size:13px;line-height:18px;color:${TEXTO};padding:2px 0 0 0">${esc(p.cargo)}</div>
<div style="font-family:${SANS};font-size:12px;line-height:19px;color:${TEXTO};padding:10px 0 0 0">${contacto}<br>${enlaces}</div>
</td></tr>
<tr><td colspan="2" style="padding:14px 0 0 0"><table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse"><tr>
<td valign="middle" style="border-top:1px solid ${LINEA};padding:12px 0 0 0"><img src="${img(m.logo)}" width="${m.logoW}" height="${m.logoH}" alt="${p.marca && p.marca !== 'efeonce' ? p.marca[0].toUpperCase() + p.marca.slice(1) + ' by Efeonce' : 'Efeonce'}" style="display:block;border:0"></td>
<td valign="middle" align="right" style="border-top:1px solid ${LINEA};padding:12px 0 0 12px;font-family:${ESLOGAN};font-size:12px;line-height:16px;font-style:italic;font-weight:800;color:${GRIS};white-space:nowrap">Empower <span style="font-style:normal">your</span> <span style="font-weight:900;color:${NAVY}">${m.palabra}</span></td>
</tr></table></td></tr>${campana}
</table>`
}

// ---- v2 (2026-09-25): el operador la encontró demasiado simple. Dos opciones con la órbita en la foto. ----
// A · clara: foto con órbita + divisor que termina en la esfera. B · tarjeta navy: la portada de Insights en miniatura.
// Imágenes: foto con órbita, logo y la burbuja oficial de la URL (tres como máximo).
// La órbita va pegada a la foto (un solo PNG): con el anillo y el arco alrededor ya no se lee como estado «disponible».
const OSC = { fondo: '#001A33', acento: '#36C8BF', texto: '#F4F6F8', sub: '#9FB3C8', linea: '#1D3A57' }
const aC = (href, txt, color) => `<a href="${esc(href)}" style="color:${color};text-decoration:none">${esc(txt)}</a>`
export function firmaV2 (p, img, estilo = 'clara') {
  const m = MARCAS[p.marca ?? 'efeonce'], osc = estilo === 'tarjeta'
  const ink = osc ? OSC.texto : NAVY, sub = osc ? OSC.sub : TEXTO, acento = osc ? OSC.acento : m.acento, linea = osc ? OSC.linea : LINEA
  const contacto = [p.telefono && aC(`tel:${p.telefono.replace(/[^+\d]/g, '')}`, p.telefono, ink), p.correo && aC(`mailto:${p.correo}`, p.correo, ink)].filter(Boolean).join('<br>')
  // La URL va siempre con su burbuja oficial (asset de marca), nunca como texto.
  const burbuja = `<a href="https://efeoncepro.com" style="text-decoration:none"><img src="${img(osc ? 'url-bubble-dark' : 'url-bubble')}" width="92" height="18" alt="efeoncepro.com" style="display:inline-block;vertical-align:middle;border:0;width:92px;height:18px"></a>`
  const enlaces = [burbuja, p.linkedin && aC(p.linkedin, 'LinkedIn', ink)].filter(Boolean).join(' &nbsp;·&nbsp; ')
  const foto = p.foto ? `<td valign="middle" width="104" style="padding:0 18px 0 0;width:104px"><img src="${img((osc ? 'foto-orbita-oscura-' : 'foto-orbita-') + p.foto.replace('foto-', ''))}" width="104" height="104" alt="${esc(p.nombre)}" style="display:block;width:104px;height:104px;border:0"></td>` : ''
  const logoImg = osc ? `<img src="${img('logo-efeonce-negativo')}" width="116" height="28" alt="Efeonce" style="display:block;border:0">` : `<img src="${img(m.logo)}" width="${m.logoW}" height="${m.logoH}" alt="Efeonce" style="display:block;border:0">`
  const eslogan = `<td valign="middle" align="right" style="padding:14px 0 0 12px;font-family:${ESLOGAN};font-size:12px;line-height:16px;font-style:italic;font-weight:800;color:${osc ? '#C9D3DC' : GRIS};white-space:nowrap">Empower <span style="font-style:normal">your</span> <span style="font-weight:900;color:${osc ? '#FFFFFF' : NAVY}">${m.palabra}</span></td>`
  // Divisor: línea fina que termina en la esfera (sólo en la clara; en la tarjeta la órbita ya está en la foto).
  const divisor = osc
    ? `<tr><td colspan="2" style="padding:16px 0 0 0;border-bottom:1px solid ${linea};font-size:0;line-height:0">&nbsp;</td></tr>`
    // La línea termina EN la esfera: misma altura (centro de la esfera) y sin separación.
    : `<tr><td colspan="2" style="padding:16px 0 0 0"><table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse"><tr>
<td valign="middle" style="padding:0;height:9px"><div style="height:4px;border-bottom:1px solid ${linea};font-size:0;line-height:0">&nbsp;</div></td>
<td valign="middle" width="9" style="width:9px;padding:0;height:9px"><!--[if mso]><span style="font-size:11px;line-height:9px;color:${acento}">&#9679;</span><![endif]--><!--[if !mso]><!--><div style="width:9px;height:9px;border-radius:9px;background:${acento};font-size:0;line-height:0">&nbsp;</div><!--<![endif]--></td>
</tr></table></td></tr>`
  const campana = p.campana ? `<tr><td style="padding:12px 0 0 0;font-family:${SANS};font-size:12px;line-height:18px;color:${TEXTO}"><span style="color:${m.acento}">&#9675;</span>&nbsp;${esc(p.campana.pregunta)} <a href="${esc(p.campana.url)}" style="color:${NAVY};text-decoration:none;font-weight:bold">${esc(p.campana.accion)} →</a></td></tr>` : ''
  const cuerpo = `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse">
<tr>${foto}<td valign="middle">
<div style="font-family:${TITULAR};font-size:22px;line-height:26px;font-weight:800;letter-spacing:-0.3px;color:${osc ? '#FFFFFF' : NAVY}">${esc(p.nombre)}<span style="color:${acento}">.</span></div>
<div style="font-family:${SANS};font-size:13px;line-height:18px;color:${sub};padding:2px 0 0 0">${esc(p.cargo)}</div>
<div style="font-family:${SANS};font-size:12px;line-height:19px;color:${sub};padding:10px 0 0 0">${contacto}<br>${enlaces}</div>
</td></tr>${divisor}
<tr><td colspan="2"><table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse"><tr><td valign="middle" style="padding:14px 0 0 0">${logoImg}</td>${eslogan}</tr></table></td></tr></table>`
  const tarjeta = osc ? `<!--[if mso]><table width="460" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td><![endif]--><table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse;width:100%;max-width:460px;background:${OSC.fondo}" bgcolor="${OSC.fondo}"><tr><td style="padding:22px 24px 20px 24px;background:${OSC.fondo}" bgcolor="${OSC.fondo}">${cuerpo}</td></tr></table><!--[if mso]></td></tr></table><![endif]-->` : `<!--[if mso]><table width="460" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td><![endif]--><table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse;width:100%;max-width:460px"><tr><td>${cuerpo}</td></tr></table><!--[if mso]></td></tr></table><![endif]-->`
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="border-collapse:collapse;width:100%;max-width:460px;font-family:${SANS}"><tr><td>${tarjeta}</td></tr>${campana}</table>`
}
