// Deck «La órbita» · láminas de la práctica Salesforce (línea `revenue-salesforce`). Maquetas de dirección para el
// canvas: voz a la izquierda (eyebrow · pregunta con anillo · respuesta con esfera ≥3× · evidencia), escena 3D a la
// derecha con UNA órbita (la plataforma de luz). Acento leído del token de la línea, nunca transcrito.
// Helpers copiados de ai-generations/2026-09-27_deck-recetas/render-src/vive.mjs (no se editan allá: son la fuente
// de las 78 aprobadas); selección y cursores con el contrato AXIS vía sel.mjs de esa carpeta.
// Claims: sin «Salesforce Partner», sin logos ni mascotas de Salesforce; productos nombrados en texto referencial.
import { answerHtml } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-graphic-line/dist/index.js'
import { resolveIcon } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-graphic-line/dist/icons.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-tokens/dist/index.js'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync } from 'node:fs'
import { paintSelection } from '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-27_deck-recetas/render-src/sel.mjs'

const R = '/Users/jreye/Documents/greenhouse-eo/', OUT = new URL('../out/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const BA = R + 'node_modules/@efeoncepro/axis-brand-assets/assets/'
const W = 1920, H = 1080, M = 140
const C = GL.color, SOFT = GL.slogan.leadColor.onDark
const LINE_KEY = 'revenue-salesforce'
const SF = GL.lines.find(l => l.key === LINE_KEY)
if (!SF) throw new Error('falta la línea revenue-salesforce en axis-tokens')
const A = SF.accentOnDark, A_LIGHT = SF.accentOnLight
const rgba = (hex, a) => { const h = hex.replace('#', ''); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})` }
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const svgUri = f => 'data:image/svg+xml;base64,' + readFileSync(f).toString('base64')
const INK = '#0B1F33', MUTED = '#5F6B7A', LINE = '#E3E8EE', CARD = '#FFFFFF', PAPER = '#F5F7FA'
const ring = `<span aria-hidden="true" style="display:inline-block;width:.62em;height:.62em;border-radius:50%;border:.1em solid ${A};box-sizing:border-box;margin-right:.42em;vertical-align:-.04em"></span>`
const URL_LUM = svgUri(R + 'src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg')
const urlSign = () => `<img src="${URL_LUM}" alt="efeoncepro.com" style="position:absolute;left:${M}px;bottom:51px;width:216px;height:auto;opacity:1;mix-blend-mode:luminosity;z-index:3">`
const icon = (glyph, size, label, surface = 'dark', id = glyph) => resolveIcon({ glyph, size, line: LINE_KEY, surface, label, idPrefix: 'i' + id + size }).svg

// Escena: halo del acento, plataforma de luz (la órbita de la lámina), haces y sombras profundas.
const stageBg = (cx, cy) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0"><defs>
<radialGradient id="sb1" cx="${cx}" cy="${cy}" r="920" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${A}" stop-opacity=".22"/><stop offset=".4" stop-color="${A}" stop-opacity=".07"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>
<linearGradient id="sb2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000814" stop-opacity=".55"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#sb1)"/><rect y="${H * 0.72}" width="${W}" height="${H * 0.28}" fill="url(#sb2)"/></svg>`
const platform = (cx, cy, rx, ry, id = 'pf') => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:1"><defs><radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${rx}" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 ${cy * (1 - ry / rx)}) scale(1 ${ry / rx})"><stop offset="0" stop-color="${A}" stop-opacity=".26"/><stop offset=".7" stop-color="${A}" stop-opacity=".05"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient><filter id="${id}g" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter></defs>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${C.halo}" stroke-opacity=".32" stroke-width="3"/>
<path d="M ${cx - rx * 0.92} ${cy + ry * 0.39} A ${rx} ${ry} 0 0 0 ${cx + rx * 0.7} ${cy + ry * 0.71}" fill="none" stroke="${A}" stroke-width="14" opacity=".45" filter="url(#${id}g)"/>
<path d="M ${cx - rx * 0.92} ${cy + ry * 0.39} A ${rx} ${ry} 0 0 0 ${cx + rx * 0.7} ${cy + ry * 0.71}" fill="none" stroke="${A}" stroke-width="6" stroke-linecap="round"/></svg>`
const beam = (x1, y1, x2, y2, id, bend = 40) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:3;pointer-events:none"><defs><linearGradient id="bm${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${A}" stop-opacity=".95"/><stop offset="1" stop-color="${A}" stop-opacity=".05"/></linearGradient><filter id="bmg${id}"><feGaussianBlur stdDeviation="5"/></filter></defs><path d="M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - bend} ${x2} ${y2}" fill="none" stroke="url(#bm${id})" stroke-width="10" opacity=".5" filter="url(#bmg${id})"/><path d="M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - bend} ${x2} ${y2}" fill="none" stroke="url(#bm${id})" stroke-width="2.5"/></svg>`
const REFLECT = '-webkit-box-reflect:below 14px linear-gradient(transparent 72%, rgba(255,255,255,.16))'
const deep = `box-shadow:0 0 0 1px rgba(255,255,255,.16),0 50px 110px rgba(0,6,16,.75),0 0 90px ${rgba(A, .22)}`
const glass = `background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.04));backdrop-filter:blur(6px);box-shadow:0 0 0 1px rgba(255,255,255,.18) inset,0 30px 70px rgba(0,6,16,.6)`
const bigVoice = (eyebrow, q, a, ev, qLines = 1, apx = 176) => `
<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${SOFT};z-index:9">${eyebrow}</p>
<p style="position:absolute;left:${M}px;top:196px;width:500px;margin:0;font:300 40px/1.2 Pop;color:${SOFT};z-index:9">${ring}${q}</p>
<p style="position:absolute;left:${M - 8}px;top:${qLines > 1 ? 330 : 280}px;margin:0;font:760 ${apx}px Bric;line-height:.9;letter-spacing:-.05em;color:#fff;z-index:9;text-shadow:0 10px 60px rgba(0,0,0,.35)">${a}</p>
<p style="position:absolute;left:${M}px;top:${qLines > 1 ? 690 : 640}px;width:420px;margin:0;font:300 26px/1.45 Pop;color:#E6EDF3;z-index:9">${ev}</p>`
const note = t => `<p style="position:absolute;right:${M - 20}px;top:112px;margin:0;font:400 16px Pop;color:${SOFT};z-index:9">${t}</p>`
const PLATE = R + 'ai-generations/2026-09-29_deck-salesforce/plates/NXSF1-nexa-conexion.png'
const PLATE_COVER = R + 'ai-generations/2026-09-29_deck-salesforce/plates/NXSF2-nexa-portal.png'
const ASTRO = R + 'ai-generations/2026-09-29_deck-salesforce/astro/agent-astro-v1-alpha.png'
const ASTRO_WAVE = R + 'ai-generations/2026-09-29_deck-salesforce/astro/agent-astro-v2-saluda-alpha.png'
const SF_LOGO = svgUri(R + 'public/images/logos/partners/salesforce.com_logo.svg')
// SIN_BADGE=1: variante sin claim de partner (fallback si el readback de Partner Community no se confirma). Sale con sufijo -sin-badge.
const SIN_BADGE = process.env.SIN_BADGE === '1'
// Vector oficial: .ai del kit de partner (PDF) → SVG con pdftocairo, viewBox recortado a la caja del badge; sin redibujar.
const SF_BADGE = 'data:image/svg+xml;base64,' + readFileSync(R + 'ai-generations/2026-09-29_deck-salesforce/logos/salesforce-partner-badge-horizontal.svg').toString('base64')
const LOGO = svgUri(BA + 'efeonce-logo-negative.svg')
const pngUri = async (f, w) => 'data:image/png;base64,' + (await sharp(f).resize({ width: w }).png().toBuffer()).toString('base64')
const jpgShift = async (f, dx) => 'data:image/jpeg;base64,' + (await sharp(await sharp(await sharp(f).resize(W, H, { fit: 'cover', position: 'east' }).toBuffer()).extend({ left: dx, extendWith: 'copy' }).toBuffer()).extract({ left: 0, top: 0, width: W, height: H }).jpeg({ quality: 90 }).toBuffer()).toString('base64')
const jpgCover = async (f, w, h, pos = 'centre', crop) => { let img = sharp(f); if (crop) img = img.extract(crop); return 'data:image/jpeg;base64,' + (await img.resize(w, h, { fit: 'cover', position: pos }).jpeg({ quality: 90 }).toBuffer()).toString('base64') }
const shift = (dx, html) => `<div style="position:absolute;inset:0;transform:translateX(${dx}px)">${html}</div>`
// Íconos oficiales de producto de Salesforce (salesforce.com, uso autorizado por el operador 2026-09-29; fuentes en ../logos/FUENTES.txt).
const SFI = n => svgUri(R + 'ai-generations/2026-09-29_deck-salesforce/logos/icon-' + n + '.svg')
const sfIcon = (n, px, alt = '') => `<img src="${SFI(n)}" alt="${alt}" style="width:${px}px;height:${px}px;flex:none;display:block">`
const b = t => `<b style="font-weight:600;color:#fff">${t}</b>`

const slides = [
  // SF1 · UNA SOLA OPERACIÓN (la promesa de la práctica). La cuenta del cliente al centro, sobre la plataforma de luz;
  // cinco nubes de trabajo flotan a distinta profundidad y su luz baja a la cuenta. Servicio mira el mismo registro.
  { id: 'SF1-una-operacion', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'bottom-end', scale: 1.0, padding: 'compact' }, body: async () => {
    const cx = 1330, cy = 540
    const clouds = [
      ['sales', 'Ventas', 'Sales Cloud', 880, 250, -10],
      ['service', 'Servicio', 'Service Cloud', 1550, 220, 10],
      ['marketing', 'Marketing', 'Engagement y Next', 790, 640, -14],
      ['data-cloud', 'Datos', 'Data 360', 1620, 640, 14],
      ['agentforce', 'Agentes', 'Agentforce', 1225, 110, 0]
    ]
    const tiles = clouds.map(([g, t, p, x, y, rot], i) => `<div style="position:absolute;left:${x}px;top:${y}px;width:280px;box-sizing:border-box;padding:18px 20px;border-radius:20px;${glass};transform:perspective(1400px) rotateY(${rot}deg);z-index:5;display:flex;gap:14px;align-items:center">
${sfIcon(g, 56, p)}
<div><p style="margin:0;font:760 26px Bric;letter-spacing:-.015em;color:#fff">${t}</p><p style="margin:2px 0 0;font:400 15px Pop;color:${SOFT}">${p}</p></div></div>`).join('')
    const centers = [[1005, 360], [1695, 330], [925, 700], [1765, 700], [1350, 215]]
    const beams = centers.map(([x, y], i) => beam(x, y, cx, cy + (i === 4 ? -60 : 10), 'c' + i, i === 4 ? 0 : 30)).join('')
    const fact = (k, v) => `<div style="display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-top:1px solid ${LINE}"><span style="font:400 15px Pop;color:${MUTED}">${k}</span><span style="font:600 15px Pop;color:${INK}">${v}</span></div>`
    const account = `<div data-sel style="position:absolute;left:${cx - 200}px;top:${cy - 110}px;width:400px;box-sizing:border-box;padding:22px 24px 16px;border-radius:24px;background:${CARD};${deep};${REFLECT};z-index:6">
<div style="display:flex;align-items:center;gap:14px;margin-bottom:12px"><span style="display:inline-flex;width:52px;height:52px;border-radius:50%;background:${INK};color:#fff;align-items:center;justify-content:center;font:760 20px Bric">TC</span><div><p style="margin:0;font:760 24px Bric;letter-spacing:-.015em;color:${INK}">Tu cliente</p><p style="margin:2px 0 0;font:400 14px Pop;color:${MUTED}">Una sola cuenta, todos los equipos</p></div></div>
${fact('Oportunidad', 'En negociación')}${fact('Caso abierto', 'Dentro del SLA')}${fact('Journey', 'Bienvenida · paso 3')}${fact('Consentimiento', 'Email ✓ · SMS —')}</div>`
    return stageBg(cx - 120, cy) + shift(-120, platform(cx - 10, 935, 520, 78) + beams + tiles + account)
      + bigVoice('Salesforce · RevOps y CRM', '¿Cuántos Salesforce tienes?', answerHtml('Uno', A), `Conectamos CRM, servicio, marketing, datos y agentes para que Salesforce funcione como ${b('una')} sola operación alrededor del cliente.`, 2) + urlSign()
  } },

  // SF2 · AGENTFORCE CON SUPERVISOR (equipo híbrido). La supervisora arriba; tres agentes con su ficha de autonomía
  // (lee · propone · ejecuta · aprueba) a distinta profundidad. La propuesta del agente espera su aprobación.
  { id: 'SF2-agentes-supervisor', sel: { targetKind: 'object', label: 'Supervisora', participantKind: 'role', anchor: 'bottom-end', scale: 1.0, padding: 'compact' }, body: async () => {
    const lvl = (k, v, on) => `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid ${LINE}"><span style="width:18px;height:18px;border-radius:50%;flex:none;${on === 'y' ? `background:${INK}` : on === 'h' ? `box-shadow:0 0 0 2px ${INK} inset;background:linear-gradient(90deg,${INK} 50%,transparent 50%)` : `box-shadow:0 0 0 2px #B8C2CC inset`}"></span><span style="width:78px;font:600 13px Pop;letter-spacing:.06em;text-transform:uppercase;color:${MUTED}">${k}</span><span style="flex:1;font:400 14px/1.35 Pop;color:${INK}">${v}</span></div>`
    const agent = (x, y, rot, title, job, rows, extra = '') => `<div style="position:absolute;left:${x}px;top:${y}px;width:320px;box-sizing:border-box;padding:20px 22px 14px;border-radius:22px;background:${CARD};${deep};transform:perspective(1600px) rotateY(${rot}deg);z-index:3">
<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">${sfIcon('agentforce', 46, 'Agentforce')}<div><p style="margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">Agente</p><p style="margin:1px 0 0;font:760 22px Bric;letter-spacing:-.015em;color:${INK}">${title}</p></div></div>
<p style="margin:0 0 10px;font:400 14px/1.4 Pop;color:${MUTED}">${job}</p>${rows}${extra}</div>`
    const approve = `<div data-sel style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:10px 12px;border-radius:12px;background:${PAPER};box-shadow:0 0 0 1px ${LINE} inset"><span style="font:500 13px/1.3 Pop;color:${INK}">Respuesta propuesta al caso #4821</span><span style="padding:8px 14px;border-radius:10px;background:${INK};color:#fff;font:600 13px Pop">Aprobar</span></div>`
    const a1 = agent(1175, 470, -6, 'Casos', 'Clasifica, enruta y propone la respuesta.', lvl('Lee', 'Historial y knowledge', 'y') + lvl('Propone', 'Respuesta al cliente', 'y') + lvl('Ejecuta', 'Enrutar dentro del SLA', 'y') + lvl('Aprueba', 'La supervisora', 'n'), approve)
    const a2 = agent(825, 545, 12, 'Pipeline', 'Sugiere la siguiente acción comercial.', lvl('Lee', 'Oportunidades y actividad', 'y') + lvl('Propone', 'Siguiente paso', 'y') + lvl('Ejecuta', 'Sólo tareas y recordatorios', 'h') + lvl('Nunca', 'Cambiar montos', 'n'))
    const a3 = agent(1560, 560, -16, 'Campañas', 'Prepara variantes para audiencias con consentimiento.', lvl('Lee', 'Segmentos consentidos', 'y') + lvl('Propone', 'Variantes y audiencia', 'y') + lvl('Ejecuta', 'Nada sin aprobación', 'n'))
    const sup = `<div style="position:absolute;left:1105px;top:170px;width:470px;box-sizing:border-box;padding:22px 26px;border-radius:24px;${glass};z-index:6;display:flex;gap:18px;align-items:center">
<span style="flex:none;display:inline-flex;width:76px;height:76px;border-radius:50%;background:${rgba(A, .18)};box-shadow:0 0 0 2px ${A} inset,0 0 40px ${rgba(A, .5)};align-items:center;justify-content:center;font:760 28px Bric;color:#fff">SV</span>
<div><p style="margin:0;font:600 13px Pop;letter-spacing:.12em;text-transform:uppercase;color:${SOFT}">Persona responsable</p><p style="margin:3px 0 0;font:760 30px Bric;letter-spacing:-.02em;color:#fff">Supervisora de servicio</p><p style="margin:4px 0 0;font:400 16px Pop;color:${SOFT}">Aprueba, corrige y detiene</p></div></div>`
    const beams = [[950, 545], [1335, 470], [1720, 560]].map(([x, y], i) => beam(1340, 330, x, y, 'a' + i, 10)).join('')
    return stageBg(1220, 520) + shift(-100, platform(1320, 930, 540, 95) + beams + sup + a2 + a3 + a1)
      + bigVoice('Agentforce · equipos híbridos', '¿Quién responde por el agente?', answerHtml('Una persona', A).replace('Una persona', 'Una<br>persona'), `Cada agente nace con su ficha: qué lee, qué propone, qué ejecuta y ${b('quién')} lo aprueba.`, 2, 150)
      + note('Ejemplo ilustrativo · cada ficha se define con tu equipo') + urlSign()
  } },

  // SF3 · ENGAGEMENT Y NEXT (coexistencia). Dos plataformas de trabajo a distinta profundidad y, al frente, la
  // decisión capacidad por capacidad. Ningún rip-and-replace por defecto.
  { id: 'SF3-engagement-next', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'bottom-end', scale: 1.0, padding: 'compact' }, body: async () => {
    const plat = (x, y, rot, name, base, items, dim) => `<div style="position:absolute;left:${x}px;top:${y}px;width:360px;box-sizing:border-box;padding:22px 24px;border-radius:22px;${glass};transform:perspective(1500px) rotateY(${rot}deg);opacity:${dim ? .82 : 1};z-index:3">
<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">${sfIcon('marketing', 44, 'Marketing Cloud')}<div><p style="margin:0;font:600 13px Pop;letter-spacing:.12em;text-transform:uppercase;color:${SOFT}">${base}</p><p style="margin:2px 0 0;font:760 34px Bric;letter-spacing:-.02em;color:#fff">${name}</p></div></div>
${items.map(t => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid rgba(255,255,255,.12);font:400 16px Pop;color:#E6EDF3"><span style="width:8px;height:8px;border-radius:50%;background:${SOFT}"></span>${t}</div>`).join('')}</div>`
    const pe = plat(790, 170, 16, 'Engagement', 'Marketing Cloud', ['Journeys y automatizaciones', 'Data Extensions', 'Dominios, IPs y supresiones', 'Content Builder'], true)
    const pn = plat(1500, 150, -16, 'Next', 'Marketing Cloud', ['Salesforce Platform', 'Data 360 y consentimiento', 'Flow y segmentos', 'Agentforce'], true)
    const verdicts = { Mantener: [INK, '#fff'], Integrar: ['#fff', INK], Modernizar: ['#fff', INK], Migrar: ['#fff', INK], Retirar: [PAPER, MUTED] }
    const row = (cap, v, on) => { const [bg, fg] = verdicts[v]; return `<div ${on ? 'data-sel ' : ''}style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:${on ? '12px 14px' : '11px 4px'};margin-top:${on ? 6 : 0}px;border-radius:12px;${on ? `background:${rgba(A, .12)};` : `border-top:1px solid ${LINE};`}"><span style="font:${on ? 600 : 400} 17px Pop;color:${INK}">${cap}</span><span style="flex:none;padding:6px 12px;border-radius:999px;background:${bg};color:${fg};box-shadow:0 0 0 1.5px ${INK} inset;font:600 13px Pop;letter-spacing:.06em;text-transform:uppercase">${v}</span></div>` }
    const table = `<div style="position:absolute;left:1030px;top:470px;width:600px;box-sizing:border-box;padding:24px 26px 20px;border-radius:24px;background:${CARD};${deep};${REFLECT};z-index:3">
<div style="display:flex;align-items:center;gap:12px;padding-bottom:14px">${sfIcon('marketing', 42, 'Marketing Cloud')}<p style="margin:0;font:760 24px Bric;letter-spacing:-.015em;color:${INK}">Decisión por capacidad</p></div>
${row('Journeys de bienvenida', 'Mantener')}${row('Preferencias y consentimiento', 'Integrar')}${row('Segmentación de audiencias', 'Modernizar')}${row('Campaña B2B nueva', 'Migrar', true)}${row('Automatización sin dueño', 'Retirar')}</div>`
    const beams = beam(980, 430, 1180, 500, 'e', 20) + beam(1690, 420, 1480, 500, 'n', 20)
    return stageBg(1250, 560) + shift(-80, platform(1320, 935, 530, 95) + pe + pn + beams + table)
      + bigVoice('Marketing Cloud · Engagement y Next', '¿Hay que migrar a Next?', answerHtml('No por defecto', A).replace('No por defecto', 'No por<br>defecto'), `Engagement sigue vigente y Next no lo reemplaza solo. Decidimos ${b('capacidad')} por capacidad.`, 2, 150)
      + note('Ejemplo ilustrativo · el diagnóstico decide con tu inventario real') + urlSign()
  } },

  // SF4 · EL QUE ENCAJE (provider fit). Cuatro veredictos posibles como monolitos de vidrio sobre la plataforma; el
  // del cliente se enciende. Efeonce vende la decisión, no una plataforma.
  { id: 'SF4-el-que-encaje', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'bottom-end', scale: 1.0, padding: 'compact' }, body: async () => {
    const opts = [
      ['Salesforce', 'Org compleja, gobierno enterprise, servicio a escala, varios países.', 'crm', false],
      ['HubSpot', 'Crecimiento B2B, equipo mid-market, valor en semanas.', 'embudo', false],
      ['Híbrida', 'Cada plataforma donde rinde mejor, conectadas.', 'integracion', true],
      ['No avanzar', 'Mantener lo que funciona y ordenar primero los datos.', 'checklist', false]
    ]
    const x0 = 700, w = 250, g = 26, base = 850
    const cards = opts.map(([t, d, gl, on], i) => { const h = on ? 470 : 360 + (i % 2) * 30; return `<div ${on ? 'data-sel ' : ''}style="position:absolute;left:${x0 + i * (w + g)}px;top:${base - h}px;width:${w}px;height:${h}px;box-sizing:border-box;padding:24px 22px;border-radius:22px;${on ? `background:${CARD};${deep};${REFLECT}` : glass};z-index:${on ? 6 : 4}">
<div style="width:54px;height:54px;border-radius:14px;display:flex;align-items:center;justify-content:center;${on ? `background:${INK}` : `background:${rgba(A, .16)};box-shadow:0 0 0 1px ${rgba(A, .45)} inset`}">${icon(gl, 30, t, 'dark', 'f' + i)}</div>
<p style="margin:22px 0 0;font:600 13px Pop;letter-spacing:.12em;text-transform:uppercase;color:${on ? MUTED : SOFT}">Veredicto</p>
<p style="margin:4px 0 0;font:760 ${on ? 36 : 32}px/1.05 Bric;letter-spacing:-.02em;color:${on ? INK : '#fff'}">${t}</p>
<p style="margin:12px 0 0;font:400 16px/1.45 Pop;color:${on ? MUTED : '#E6EDF3'}">${d}</p>
${on ? `<p style="position:absolute;left:22px;bottom:22px;right:22px;margin:0;padding-top:12px;border-top:1px solid ${LINE};font:600 14px Pop;color:${INK}">Tu caso · con evidencia</p>` : ''}</div>` }).join('')
    const onX = x0 + 2 * (w + g) + w / 2
    const spot = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:2"><defs><linearGradient id="sp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${A}" stop-opacity="0"/><stop offset="1" stop-color="${A}" stop-opacity=".26"/></linearGradient></defs><path d="M ${onX - 40} 0 L ${onX + 40} 0 L ${onX + 190} ${base} L ${onX - 190} ${base} Z" fill="url(#sp)"/></svg>`
    return stageBg(onX, 560) + spot + platform(1210, base, 540, 58) + cards + note('Ejemplo ilustrativo · el veredicto sale del diagnóstico')
      + bigVoice('Diagnóstico de encaje', '¿Salesforce o HubSpot?', answerHtml('El que encaje', A).replace('El que encaje', 'El que<br>encaje'), `No vendemos una plataforma: vendemos la ${b('decisión')}, con evidencia de tu operación.`, 2, 150) + urlSign()
  } },

  // SF5 · LO QUE RECIBES PRIMERO («vívelo»). El diagnóstico abierto: mapa del estado actual, veredicto de encaje,
  // riesgos y roadmap por olas. Datos de muestra.
  { id: 'SF5-diagnostico-decision', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'bottom-end', scale: 1.0, padding: 'compact' }, body: async () => {
    const mod = (n, t, inner, span) => `<div style="box-sizing:border-box;padding:16px 18px;border-radius:16px;background:${PAPER};box-shadow:0 0 0 1px ${LINE} inset;${span ? 'grid-column:span 2;' : ''}"><p style="margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">${n}</p><p style="margin:3px 0 10px;font:760 20px Bric;letter-spacing:-.015em;color:${INK}">${t}</p>${inner}</div>`
    const nodes = [['Ventas', 'ok'], ['Servicio', 'warn'], ['Marketing', 'warn'], ['ERP', 'bad'], ['Web', 'ok'], ['Datos', 'bad']]
    const col = { ok: INK, warn: INK, bad: INK }
    const map = `<div style="display:flex;flex-wrap:wrap;gap:8px">${nodes.map(([n, s]) => `<span style="display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:999px;background:#fff;box-shadow:0 0 0 1px ${LINE} inset;font:500 13px Pop;color:${INK}"><span style="width:9px;height:9px;border-radius:50%;background:${col[s]}"></span>${n}</span>`).join('')}</div><p style="margin:10px 0 0;font:400 12px Pop;color:${MUTED}">14 integraciones · 3 sin dueño</p>`
    const verdict = `<div style="display:flex;gap:8px">${['Fit', 'Fit condicionado', 'No fit'].map((v, i) => `<span style="flex:${i === 1 ? 1.6 : 1};text-align:center;padding:10px 6px;border-radius:12px;font:600 13px Pop;${i === 1 ? `background:${INK};color:#fff` : `background:#fff;color:${MUTED};box-shadow:0 0 0 1px ${LINE} inset`}">${v}</span>`).join('')}</div><p style="margin:10px 0 0;font:400 12px/1.4 Pop;color:${MUTED}">Condición: resolver identidad y consentimiento antes de canales</p>`
    const risks = ['Duplicados en cuentas', 'Flows sin ruta de error', 'Permisos amplios'].map(r => `<div style="display:flex;align-items:center;gap:8px;margin-top:6px;font:400 13px Pop;color:${INK}"><svg viewBox="0 0 16 16" width="15" height="15"><path d="M8 1.8l6.6 11.6H1.4z" fill="none" stroke="#B4261A" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 6.2v3.4M8 11.4v.2" stroke="#B4261A" stroke-width="1.5" stroke-linecap="round"/></svg>${r}</div>`).join('')
    const waves = `<div data-sel style="display:flex;gap:10px">${[['Ola 1', 'Datos y consentimiento', 'Base'], ['Ola 2', 'Servicio con SLA', 'Primer valor'], ['Ola 3', 'Agente de casos supervisado', 'Agentes']].map(([n, t, k]) => `<div style="flex:1;padding:10px 12px;border-radius:12px;background:#fff;box-shadow:0 0 0 1px ${LINE} inset"><p style="margin:0;font:760 18px Bric;color:${INK}">${n}</p><p style="margin:2px 0 0;font:600 13px/1.3 Pop;color:${INK}">${t}</p><p style="margin:4px 0 0;font:500 11px Pop;letter-spacing:.06em;text-transform:uppercase;color:${MUTED}">${k}</p></div>`).join('')}</div>`
    const report = `<div style="position:absolute;left:780px;top:170px;width:880px;box-sizing:border-box;padding:26px 28px 24px;border-radius:26px;background:${CARD};${deep};transform:perspective(2200px) rotateY(-9deg) rotateX(3deg);transform-origin:left center;z-index:3">
<div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;border-bottom:1px solid ${LINE};margin-bottom:16px"><div style="display:flex;align-items:center;gap:12px"><span style="display:inline-flex;width:40px;height:40px;border-radius:12px;background:${INK};align-items:center;justify-content:center">${icon('informe', 24, 'Informe', 'dark', 'rp')}</span><div><p style="margin:0;font:760 22px Bric;letter-spacing:-.015em;color:${INK}">Diagnóstico de valor y arquitectura</p><p style="margin:2px 0 0;font:400 13px Pop;color:${MUTED}">Salesforce · estado actual, encaje y roadmap</p></div></div><span style="padding:6px 12px;border-radius:999px;background:${PAPER};box-shadow:0 0 0 1px ${LINE} inset;font:600 12px Pop;letter-spacing:.08em;text-transform:uppercase;color:${MUTED}">Datos de muestra</span></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">${mod('01 · Estado actual', 'Mapa de tu operación', map)}${mod('02 · Veredicto', 'Encaje de la plataforma', verdict)}${mod('03 · Riesgos', 'Lo que hoy frena', risks)}${mod('04 · Evidencia', 'Registro verificable', `<p style="margin:0;font:400 13px/1.5 Pop;color:${INK}">Cada hallazgo con su fuente: la org, los datos y las entrevistas con tu equipo.</p>`)}${mod('05 · Roadmap', 'Plan por olas', waves, true)}</div></div>`
    return stageBg(1300, 560) + platform(1190, 960, 500, 80) + report
      + bigVoice('Lo que recibes primero', '¿Qué recibes primero?', answerHtml('Una decisión', A).replace('Una decisión', 'Una<br>decisión'), `Una decisión informada, con ${b('evidencia')}, no una recomendación por defecto.`, 2, 150) + urlSign()
  } }
  ,
  // SF6 · NUESTRA PROPUESTA · SALESFORCE (cine, receta proposal-cinematic layout service). La arquitecta trenza cinco
  // haces de luz —ventas, servicio, marketing, datos y agentes— en un solo anillo: la órbita de la lámina es la luz.
  // Foto a sangre sin logo; pie con la burbuja URL. Cuatro fases de la oferta con íconos Trazo.
  { id: 'SF6-propuesta-cine', sel: { targetKind: 'text', label: 'Cliente', participantKind: 'role', anchor: 'bottom-end', scale: 1.1, padding: 'compact' }, body: async () => {
    const photo = await jpgShift(PLATE, 90)
    const steps = [['checklist', 'Diagnóstico', 'Empieza aquí'], ['integracion', 'Implementación', 'Proyecto'], ['crm', 'Activación', 'Primer valor'], ['automatizacion', 'Operación', 'On-Going']]
    const stepHtml = steps.map(([g, t, k], i) => `<div style="position:absolute;left:${M + i * 205}px;top:850px;width:195px">${icon(g, 40, t, 'dark', 's' + i)}<p style="margin:12px 0 0;font:600 13px Pop;letter-spacing:.12em;text-transform:uppercase;color:${SOFT}">${k}</p><p style="margin:3px 0 0;font:760 22px/1.1 Bric;letter-spacing:-.015em;color:#fff">${t}</p></div>`).join('')
    return `<img src="${photo}" alt="Nexa, con la chaqueta navy de Efeonce, mira a cámara y sostiene sobre la palma abierta un anillo de luz celeste en el que se trenzan cinco haces de partículas, con una esfera blanca sobre el anillo" style="position:absolute;inset:0;width:${W}px;height:${H}px">
<p style="position:absolute;left:${M}px;top:120px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${SOFT};z-index:3">Nuestra propuesta · Salesforce</p>
<p style="position:absolute;left:${M}px;top:200px;margin:0;font:300 40px/1.2 Pop;color:#F4F6F8;z-index:3">${ring}¿Qué le falta a tu Salesforce?</p>
<p data-sel style="position:absolute;left:${M - 6}px;top:300px;margin:0;font:760 150px Bric;line-height:.95;letter-spacing:-.045em;color:#fff;white-space:nowrap;z-index:3">${answerHtml('Conexión', A)}</p>
<p style="position:absolute;left:${M}px;top:530px;width:600px;margin:0;font:300 26px/1.45 Pop;color:#E6EDF3;z-index:3">Unimos CRM, servicio, marketing, datos y agentes para que Salesforce funcione como ${b('una')} sola operación alrededor del cliente.</p>
${stepHtml}${urlSign()}`
  } },

  // SF7 · NUESTRA PROPUESTA · SALESFORCE (sobria, receta de propuesta por línea): voz, lente con la foto y la escalera de
  // cuatro fases; la selección marca por dónde se empieza. Variante de SF6: nunca las dos en el mismo deck (misma foto).
  { id: 'SF7-propuesta', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'top-end', scale: 1.1, padding: 'standard' }, body: async () => {
    const cx = 1520, cy = 330, rp = 220
    const src = await jpgCover(PLATE, 1100, 1100, 'east', { left: 1020, top: 20, width: 600, height: 600 })
    const r = rp * (1 + GL.orbit.ringAirRatio), pt = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]
    const [x0, y0] = pt(200), [x1, y1] = pt(250)
    const lens = `<img src="${src}" alt="Retrato de Nexa con la chaqueta de Efeonce y el anillo de luz celeste a su lado" style="position:absolute;left:${cx - rp}px;top:${cy - rp}px;width:${rp * 2}px;height:${rp * 2}px;border-radius:50%;object-fit:cover;z-index:1">
<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:1"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.halo}" stroke-opacity=".28" stroke-width="3"/><path d="M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}" fill="none" stroke="${A}" stroke-width="6" stroke-linecap="round"/><circle cx="${x1}" cy="${y1}" r="12" fill="${A}"/></svg>`
    const steps = [['Diagnóstico y arquitectura', 'Tu base instalada, datos y procesos: una decisión con evidencia.', 'Empieza aquí'], ['Implementación e integración', 'Sales, Service, Marketing Cloud y Data 360, conectados y probados.', 'Proyecto'], ['Activación y adopción', 'El primer valor nombrado antes de construir, y tu equipo usándolo.', 'Primer valor'], ['Operación y evolución', 'Releases, datos, agentes y roadmap operados contigo.', 'On-Going']]
    const n = steps.length, cw = (1640 - (n - 1) * 20) / n
    const html = steps.map(([t, d, k], i) => `<div ${i === 0 ? 'data-sel' : ''} style="position:absolute;left:${M + i * (cw + 20)}px;top:680px;width:${cw}px;height:270px;border-radius:16px;box-sizing:border-box;padding:26px 26px;background:${i === 0 ? C.paper : 'transparent'};box-shadow:${i === 0 ? '0 30px 70px rgba(0,0,0,.4)' : 'inset 0 0 0 1.5px #1D3A57'}">
<p style="margin:0;font:600 15px Pop;letter-spacing:.12em;text-transform:uppercase;color:${i === 0 ? C.navy : SOFT}">${k}</p>
<p style="margin:10px 0 0;font:760 34px/1.05 Bric;letter-spacing:-.025em;color:${i === 0 ? C.navy : '#fff'}">${t}</p>
<p style="margin:12px 0 0;font:300 19px/1.4 Pop;color:${i === 0 ? '#00284D' : '#E6EDF3'}">${d}</p></div>`).join('')
    return `${lens}
<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${SOFT}">Nuestra propuesta · Salesforce</p>
<p style="position:absolute;left:${M}px;top:200px;margin:0;font:300 40px/1.2 Pop;color:${SOFT}">${ring}¿Qué le falta a tu Salesforce?</p>
<p style="position:absolute;left:${M - 6}px;top:270px;margin:0;font:760 140px Bric;line-height:.95;letter-spacing:-.045em;color:#fff;white-space:nowrap">${answerHtml('Conexión', A)}</p>
<p style="position:absolute;left:${M}px;top:440px;width:900px;margin:0;font:300 26px/1.45 Pop;color:#E6EDF3">Unimos CRM, servicio, marketing, datos y agentes en una sola operación: de la decisión informada a la operación gestionada.</p>
${html}
<p style="position:absolute;left:${M + 520}px;top:${H - 80}px;margin:0;font:400 16px Pop;color:${SOFT}">Licencias, consumo y servicios Efeonce se cotizan por separado.</p>
${urlSign()}`
  } }

  ,
  // SF0 · PORTADA · SERVICIOS SALESFORCE (receta cover-brochure-line, variante revenue-salesforce). Nexa a la derecha
  // frente a un portal de luz celeste (la órbita es la luz); voz en la columna izquierda con el logo de Efeonce a 500 px.
  // Logo de Salesforce como referencia de plataforma al pie de la columna (uso autorizado por el operador, 2026-09-29).
  { id: 'SF0-portada', body: async () => {
    const photo = await jpgCover(PLATE_COVER, W, H, 'east')
    const top = 190
    return `<img src="${photo}" alt="Nexa, con la chaqueta navy de Efeonce, mira a cámara; detrás de ella se alza un gran anillo vertical de luz celeste del que salen cientos de hilos de luz que llegan a las yemas de sus dedos" style="position:absolute;inset:0;width:${W}px;height:${H}px">
<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${M}px;top:${top}px;width:500px;height:auto;z-index:3">
<p style="position:absolute;left:${M}px;top:${top + 190}px;margin:0;font:500 22px/1.2 Pop;letter-spacing:.24em;text-transform:uppercase;color:${SOFT};z-index:3">${process.env.DOC === 'propuesta' ? 'Propuesta' : 'Brochure'} · Servicios Salesforce</p>
<p style="position:absolute;left:${M}px;top:${top + 238}px;margin:0;font:300 40px/1.2 Pop;color:#F4F6F8;white-space:nowrap;z-index:3">${ring}¿Tu Salesforce ya actúa?</p>
<p style="position:absolute;left:${M - 4}px;top:${top + 300}px;margin:0;font:760 124px Bric;line-height:.95;letter-spacing:-.035em;color:#fff;white-space:nowrap;z-index:3">${answerHtml('Por ti', A)}</p>
<p style="position:absolute;left:${M}px;top:${top + 452}px;margin:0;font:400 28px/1.3 Pop;color:#F4F6F8;z-index:3">${b('Seis')} servicios:<br>Ventas · Servicio · Marketing Cloud<br>Data 360 · Agentforce · Integración</p>
${SIN_BADGE
  ? `<p style="position:absolute;left:${M}px;top:${H - 168}px;margin:0;font:500 16px/1 Pop;letter-spacing:.2em;text-transform:uppercase;color:${SOFT};z-index:3">Operamos sobre</p><img src="${SF_LOGO}" alt="Salesforce" style="position:absolute;left:${M}px;top:${H - 138}px;height:64px;width:auto;z-index:3">`
  : `<img src="${SF_BADGE}" alt="Salesforce Partner" style="position:absolute;left:${M}px;top:${H - 160}px;height:84px;width:auto;z-index:3">`}`
  } },

  // SF8 · NUESTROS SERVICIOS SALESFORCE: seis carriles de la práctica con sus ofertas y las cuatro fases del ciclo;
  // Agent Astro en la plataforma de luz a la derecha (uso autorizado por el operador).
  { id: 'SF8-servicios', body: async () => {
    const astro = await pngUri(ASTRO_WAVE, 700)
    const lanes = [
      ['sales', 'Ventas y revenue', 'Sales Cloud', 'Pipeline, forecast, territorios y la siguiente acción de cada oportunidad.'],
      ['service', 'Servicio al cliente', 'Agentforce Service', 'Casos, knowledge, routing y SLA con contexto completo del cliente.'],
      ['marketing', 'Marketing y lifecycle', 'Marketing Cloud Engagement · Next', 'Journeys, deliverability y campañas desde identidad y consentimiento.'],
      ['data-cloud', 'Datos y consentimiento', 'Data 360', 'Identidad unificada, preferencias por canal y activación gobernada.'],
      ['agentforce', 'Agentes y automatización', 'Agentforce · Flow', 'Agentes con ficha, supervisión humana y consumo medido.'],
      ['platform', 'Integración y experiencia', 'APIs · Experience Cloud', 'Migraciones con reconciliación, portales e integraciones con dueño.']
    ]
    const cw = 400, ch = 214, gx = 22, gy = 22, x0 = M, y0 = 380
    const cards = lanes.map(([g, t, p, d], i) => { const x = x0 + (i % 3) * (cw + gx), y = y0 + Math.floor(i / 3) * (ch + gy); return `<div style="position:absolute;left:${x}px;top:${y}px;width:${cw}px;height:${ch}px;box-sizing:border-box;padding:22px 24px;border-radius:20px;${glass};z-index:3">
<div style="display:flex;align-items:center;gap:14px">${sfIcon(g, 52, p)}<div><p style="margin:0;font:760 25px/1.05 Bric;letter-spacing:-.015em;color:#fff">${t}</p><p style="margin:4px 0 0;font:500 14px Pop;color:${SOFT}">${p}</p></div></div>
<p style="margin:16px 0 0;font:300 18px/1.45 Pop;color:#E6EDF3">${d}</p></div>` }).join('')
    const phases = ['Diagnóstico y arquitectura', 'Implementación e integración', 'Activación y adopción', 'Operación gestionada']
    const strip = `<div style="position:absolute;left:${M}px;top:${y0 + 2 * (ch + gy) + 18}px;display:flex;align-items:center;gap:14px;z-index:3">${phases.map((t, i) => `<span style="font:600 17px Pop;color:#fff">${String(i + 1).padStart(2, '0')} · ${t}</span>${i < 3 ? `<span style="width:34px;height:2px;background:${rgba(A, .7)}"></span>` : ''}`).join('')}</div>`
    return stageBg(1600, 620) + platform(1600, 930, 180, 38) + cards + strip
      + `<img src="${astro}" alt="Agent Astro, el personaje de Salesforce, con su traje blanco y celeste de Agentforce, saluda de pie sobre la plataforma de luz" style="position:absolute;left:1450px;top:430px;width:320px;height:auto;z-index:4;filter:drop-shadow(0 30px 40px rgba(0,6,16,.6))">`
      + `<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${SOFT};z-index:9">Nuestros servicios Salesforce</p>
<p style="position:absolute;left:${M}px;top:170px;margin:0;font:300 40px/1.2 Pop;color:${SOFT};z-index:9">${ring}¿Qué hacemos en Salesforce?</p>
<p style="position:absolute;left:${M - 6}px;top:228px;margin:0;font:760 124px Bric;line-height:.95;letter-spacing:-.045em;color:#fff;white-space:nowrap;z-index:9">${answerHtml('Todo el ciclo', A)}</p>` + urlSign()
  } },

  // SF9 · LO NUEVO DE DREAMFORCE 2026: Agent Astro al centro sobre la plataforma; alrededor, los lanzamientos con su
  // estado anunciado (ledger salesforce-crm-practice/references/dreamforce-2026.md, corte 2026-09-18).
  { id: 'SF9-dreamforce-2026', body: async () => {
    const astro = await pngUri(ASTRO, 760)
    const chip = (t, d, st, x, y, lg = 'agentforce') => { const solid = st === 'GA' || st === 'Disponible'; return `<div style="position:absolute;left:${x}px;top:${y}px;width:300px;box-sizing:border-box;padding:16px 18px;border-radius:16px;${glass};z-index:5"><div style="position:absolute;right:16px;top:14px">${sfIcon(lg, 36)}</div>
<span style="display:inline-block;padding:4px 10px;border-radius:999px;font:600 12px Pop;letter-spacing:.08em;text-transform:uppercase;${solid ? `background:#fff;color:${C.navy}` : `box-shadow:0 0 0 1.5px rgba(255,255,255,.7) inset;color:#fff`}">${st}</span>
<p style="margin:10px 0 0;font:760 21px/1.1 Bric;letter-spacing:-.01em;color:#fff">${t}</p><p style="margin:5px 0 0;font:400 14px/1.4 Pop;color:${SOFT}">${d}</p></div>` }
    const L = 790, Rr = 1480
    const chips = chip('Agentes con oficio', 'Casey, Paige, Carter, Marshall, Piper y Fin', 'GA', L, 180)
      + chip('Multi-Agent Orchestration', 'Varios agentes coordinados en un flujo', 'GA', L, 360)
      + chip('Agentforce Coworker', 'El agente junto a Lightning', 'Disponible', L, 550)
      + chip('Hunter', 'Agente de ventas outbound', 'Piloto · GA nov.', L, 740)
      + chip('AIforce', 'Salesforce dentro de Claude, Slack y otras interfaces', 'Anunciado', Rr, 180, 'platform')
      + chip('Campaign Agent', 'Campañas, audiencias y journeys con guardrails', 'GA · oct.', Rr, 360, 'marketing')
      + chip('Headless Marketing + MCP', 'Journeys y flows en lenguaje natural', 'GA · oct.', Rr, 550, 'marketing')
      + chip('Koa', 'Modelo de razonamiento CRM', 'Piloto', Rr, 740)
    return stageBg(1300, 560) + platform(1300, 955, 260, 50) + chips
      + `<img src="${astro}" alt="Agent Astro, el personaje de Salesforce, con su traje blanco y celeste de Agentforce, camina al centro sobre la plataforma de luz" style="position:absolute;left:1095px;top:360px;width:385px;height:auto;z-index:4;filter:drop-shadow(0 30px 40px rgba(0,6,16,.6))">`
      + bigVoice('Dreamforce 2026 · al 18-09-2026', '¿Qué trajo Dreamforce?', answerHtml('Agentes', A), `Lo aterrizamos en tu org: verificamos ${b('disponibilidad')}, permisos y consumo antes de comprometerlo.`, 2, 150)
      + note('Estado anunciado por Salesforce al 18-09-2026 · se verifica en cada org') + urlSign()
  } }

  ,
  // SF10 · EQUIPO HÍBRIDO POR OLAS (oferta transversal de transformación humano-agente, carril Salesforce): cuatro
  // escalones de vidrio que suben, de Blueprint a operación híbrida gestionada; la trayectoria de luz los une. La
  // selección marca por dónde se empieza.
  { id: 'SF10-equipo-hibrido', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'bottom-end', scale: 1.0, padding: 'compact' }, body: async () => {
    const steps = [
      ['01', 'Blueprint', 'Proceso actual y futuro, fichas de rol de cada agente y matriz de autonomía.', 'Empieza aquí'],
      ['02', 'Primer equipo híbrido', 'Un workflow real con supervisora nombrada, pruebas y producción acotada.', 'Primer valor'],
      ['03', 'Entre equipos', 'Se extiende a otros equipos con la misma ficha, rituales y evaluación.', 'Escala'],
      ['04', 'Operación híbrida', 'Catálogo de workflows, revisión humana y costo por resultado válido.', 'On-Going']
    ]
    const x0 = 760, w = 238, g = 22, base = 850
    const html = steps.map(([n, t, d, k], i) => { const h = 250 + i * 105, on = i === 0; return `<div ${on ? 'data-sel ' : ''}style="position:absolute;left:${x0 + i * (w + g)}px;top:${base - h}px;width:${w}px;height:${h}px;box-sizing:border-box;padding:22px 20px;border-radius:20px;${on ? `background:${CARD};${deep}` : glass};z-index:3">
<p style="margin:0;font:760 30px Bric;color:${on ? INK : '#fff'}">${n}</p>
<p style="margin:6px 0 0;font:600 12px Pop;letter-spacing:.12em;text-transform:uppercase;color:${on ? MUTED : SOFT}">${k}</p>
<p style="margin:8px 0 0;font:760 25px/1.05 Bric;letter-spacing:-.015em;color:${on ? INK : '#fff'}">${t}</p>
<p style="margin:10px 0 0;font:400 15px/1.45 Pop;color:${on ? MUTED : '#E6EDF3'}">${d}</p></div>` }).join('')
    const pts = [0, 1, 2, 3].map(i => [x0 + i * (w + g) + w / 2, base - (250 + i * 105) - 30])
    const d = 'M ' + pts.map(([px, py]) => `${px} ${py}`).join(' L ')
    const [ex, ey] = pts[3]
    const flow = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:2"><defs><filter id="flg"><feGaussianBlur stdDeviation="7"/></filter></defs>
<path d="${d}" fill="none" stroke="${A}" stroke-width="14" opacity=".4" filter="url(#flg)" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${A}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="${ex}" cy="${ey}" r="16" fill="${A}" filter="url(#flg)"/><circle cx="${ex}" cy="${ey}" r="11" fill="${A}"/></svg>`
    const af = `<div style="position:absolute;left:${ex - 30}px;top:${ey - 92}px;z-index:4">${sfIcon('agentforce', 60, 'Agentforce')}</div>`
    return stageBg(1260, 560) + `<div style="position:absolute;left:${x0 - 20}px;top:${base}px;width:${4 * w + 3 * g + 40}px;border-top:2px solid rgba(255,255,255,.18);z-index:1"></div>` + html + flow + af
      + bigVoice('Agentforce · equipos híbridos', '¿Cómo se suma un agente?', answerHtml('Por olas', A).replace('Por olas', 'Por<br>olas'), `Primero el trabajo, después la tecnología: cada ola se ${b('prueba')} antes de pasar a la siguiente.`, 2, 150) + urlSign()
  } },

  // SF11 · OPERACIÓN GESTIONADA («vívelo»): la consola de operación abierta con releases, soporte en SLA, calidad de
  // datos, permisos, automatizaciones y la revisión trimestral. Datos de muestra.
  { id: 'SF11-operacion', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'bottom-start', scale: 1.0, padding: 'compact' }, body: async () => {
    const kpi = (k, v, sub) => `<div style="padding:16px 18px;border-radius:16px;background:${PAPER};box-shadow:0 0 0 1px ${LINE} inset"><p style="margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">${k}</p><p style="margin:6px 0 0;font:760 34px Bric;letter-spacing:-.02em;color:${INK}">${v}</p><p style="margin:4px 0 0;font:400 13px Pop;color:${MUTED}">${sub}</p></div>`
    const item = (t, s, ok) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid ${LINE}"><span style="font:500 15px Pop;color:${INK}">${t}</span><span style="padding:5px 11px;border-radius:999px;font:600 12px Pop;${ok ? `background:${INK};color:#fff` : `box-shadow:0 0 0 1.5px ${INK} inset;color:${INK}`}">${s}</span></div>`
    const qbr = `<div data-sel style="margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-radius:14px;background:${INK}"><div><p style="margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${SOFT}">Próxima revisión trimestral</p><p style="margin:3px 0 0;font:600 16px Pop;color:#fff">Arquitectura, adopción, deuda y prioridades</p></div><span style="padding:8px 14px;border-radius:10px;background:#fff;color:${INK};font:600 13px Pop">Ver agenda</span></div>`
    const panel = `<div style="position:absolute;left:830px;top:160px;width:840px;box-sizing:border-box;padding:26px 28px 24px;border-radius:26px;background:${CARD};${deep};transform:perspective(2200px) rotateY(-8deg) rotateX(3deg);transform-origin:left center;z-index:3">
<div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;border-bottom:1px solid ${LINE};margin-bottom:16px"><div style="display:flex;align-items:center;gap:12px">${sfIcon('platform', 40, 'Salesforce Platform')}<div><p style="margin:0;font:760 22px Bric;letter-spacing:-.015em;color:${INK}">Operación gestionada · este mes</p><p style="margin:2px 0 0;font:400 13px Pop;color:${MUTED}">Sales · Service · Marketing Cloud · Agentforce</p></div></div><span style="padding:6px 12px;border-radius:999px;background:${PAPER};box-shadow:0 0 0 1px ${LINE} inset;font:600 12px Pop;letter-spacing:.08em;text-transform:uppercase;color:${MUTED}">Datos de muestra</span></div>
<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">${kpi('Soporte en SLA', '96 %', '48 de 50 solicitudes')}${kpi('Releases', '3', 'con pruebas y rollback')}${kpi('Flows con error', '0', 'monitoreo continuo')}</div>
<div style="margin-top:14px">${item('Calidad de datos · duplicados en cuentas', 'Bajo control', true)}${item('Revisión de permisos del trimestre', 'Hecha', true)}${item('Consumo de Agentforce vs. presupuesto', 'En rango', true)}${item('Nuevo journey de reactivación', 'En pruebas', false)}</div>
${qbr}</div>`
    return stageBg(1260, 560) + platform(1210, 960, 500, 80) + panel
      + bigVoice('Operación gestionada', '¿Y después del <span style="white-space:nowrap">go-live</span>?', answerHtml('Lo operamos', A).replace('Lo operamos', 'Lo<br>operamos'), `Releases, soporte, datos, permisos y agentes, con SLA y una revisión ${b('trimestral')} de valor.`, 2, 150) + urlSign()
  } },

  // SF12 · DATA 360 Y CONSENTIMIENTO: cinco fuentes entran a la resolución de identidad; sale un perfil con preferencias
  // por canal y propósito, y sólo se activa donde hay permiso. Datos unificados no son permiso para contactar.
  { id: 'SF12-data-consentimiento', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'bottom-end', scale: 1.0, padding: 'compact' }, body: async () => {
    const srcs = ['CRM', 'Web', 'E-commerce', 'ERP', 'App']
    const sx = 790, sy0 = 250, sg = 110
    const sources = srcs.map((t, i) => `<div style="position:absolute;left:${sx}px;top:${sy0 + i * sg}px;width:170px;box-sizing:border-box;padding:14px 16px;border-radius:14px;${glass};z-index:3"><p style="margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${SOFT}">Fuente</p><p style="margin:2px 0 0;font:760 21px Bric;color:#fff">${t}</p></div>`).join('')
    const beams = srcs.map((_, i) => beam(sx + 170, sy0 + i * sg + 34, 1120, 520, 'd' + i, 0)).join('')
    const ch = (c, p, on) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid ${LINE}"><span style="font:500 15px Pop;color:${INK}">${c}</span><span style="font:400 13px Pop;color:${MUTED}">${p}</span><span style="width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:700 14px Pop;${on ? `background:${INK};color:#fff` : `box-shadow:0 0 0 2px #B8C2CC inset;color:#8A96A3`}">${on ? '✓' : '—'}</span></div>`
    const profile = `<div data-sel style="position:absolute;left:1120px;top:250px;width:380px;box-sizing:border-box;padding:22px 24px 18px;border-radius:24px;background:${CARD};${deep};${REFLECT};z-index:4">
<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">${sfIcon('data-cloud', 46, 'Data 360')}<div><p style="margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">Perfil unificado</p><p style="margin:2px 0 0;font:760 23px Bric;letter-spacing:-.015em;color:${INK}">Una persona, 5 fuentes</p></div></div>
${ch('Email', 'Marketing', true)}${ch('WhatsApp', 'Servicio', true)}${ch('SMS', 'Marketing', false)}${ch('Llamada', 'Ventas', true)}</div>`
    const act = (lg, t, d, y, on) => `<div style="position:absolute;left:1540px;top:${y}px;width:230px;box-sizing:border-box;padding:14px 16px;border-radius:16px;${on ? `background:${CARD};${deep}` : glass};z-index:4;display:flex;gap:12px;align-items:center">${sfIcon(lg, 38)}<div><p style="margin:0;font:760 18px/1.1 Bric;color:${on ? INK : '#fff'}">${t}</p><p style="margin:3px 0 0;font:400 13px Pop;color:${on ? MUTED : SOFT}">${d}</p></div></div>`
    const acts = act('marketing', 'Journey', 'Sólo con email ✓', 250, true) + act('agentforce', 'Agente de servicio', 'Por WhatsApp ✓', 400) + act('sales', 'Siguiente acción', 'Llamada del ejecutivo', 710)
    const out = [260, 410, 720].map((y, i) => beam(1500, 380, 1540, y + 34, 'o' + i, 0)).join('')
    return stageBg(1280, 520) + platform(1300, 950, 480, 70) + beams + sources + profile + out + acts
      + note('Ejemplo ilustrativo · el diseño sale de tu inventario de datos') + bigVoice('Data 360 · identidad y consentimiento', '¿Puedes contactar a ese cliente?', answerHtml('Con permiso', A).replace('Con permiso', 'Con<br>permiso'), `Unificar datos no da permiso para contactar: gobernamos ${b('canal')} y propósito antes de activar.`, 2, 150) + urlSign()
  } },

  // SF13 · MIGRACIÓN CON RECONCILIACIÓN: cinco etapas de la carga como bloques de vidrio con sus contadores; al final
  // origen y destino cuadran y el rollback queda listo. Datos de muestra.
  { id: 'SF13-migracion', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'bottom-start', scale: 1.0, padding: 'compact' }, body: async () => {
    const st = [
      ['01', 'Origen', '48.210', 'registros de cuentas y contactos'],
      ['02', 'Claves y duplicados', '1.842', 'duplicados unificados'],
      ['03', 'Carga de prueba', '500', 'registros · 0 errores'],
      ['04', 'Carga completa', '46.368', 'con resultado por registro']
    ]
    const x0 = 790, w = 232, g = 18, top = 300
    const blocks = st.map(([n, t, v, d], i) => `<div style="position:absolute;left:${x0 + i * (w + g)}px;top:${top + i * 26}px;width:${w}px;height:280px;box-sizing:border-box;padding:20px 20px;border-radius:20px;${glass};z-index:3">
<p style="margin:0;font:600 12px Pop;letter-spacing:.12em;text-transform:uppercase;color:${SOFT}">${n} · ${t}</p><p style="margin:14px 0 0;font:760 44px Bric;letter-spacing:-.02em;color:#fff">${v}</p><p style="margin:6px 0 0;font:400 15px/1.4 Pop;color:#E6EDF3">${d}</p></div>`).join('')
    const arrows = [0, 1, 2].map(i => beam(x0 + i * (w + g) + w - 10, top + i * 26 + 140, x0 + (i + 1) * (w + g) + 10, top + (i + 1) * 26 + 140, 'm' + i, 0)).join('')
    const rec = `<div data-sel style="position:absolute;left:${x0 + 170}px;top:700px;width:660px;box-sizing:border-box;padding:20px 24px;border-radius:20px;background:${CARD};${deep};z-index:4;display:flex;align-items:center;gap:22px">
${sfIcon('platform', 48, 'Salesforce Platform')}<div style="flex:1"><p style="margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">05 · Reconciliación</p><p style="margin:4px 0 0;font:760 26px Bric;letter-spacing:-.015em;color:${INK}">46.368 = 46.368 · cuadra</p></div><span style="padding:8px 14px;border-radius:10px;box-shadow:0 0 0 1.5px ${INK} inset;color:${INK};font:600 13px Pop">Rollback listo</span></div>`
    return stageBg(1280, 560) + platform(1300, 960, 520, 70) + blocks + arrows + rec
      + note('Datos de muestra · cada migración define claves y reglas con tu equipo') + bigVoice('Integración y migración', '¿Cómo sabes que migró todo?', answerHtml('Porque cuadra', A).replace('Porque cuadra', 'Porque<br>cuadra'), `Claves, duplicados, carga de prueba y ${b('reconciliación')} registro por registro, con vuelta atrás lista.`, 2, 150) + urlSign()
  } }

  ,
  // SF14 · TU DÍA A DÍA CON EFEONCE · SALESFORCE (receta content-day-tools con datos de la práctica): el release en
  // revisión al centro —sandbox, pruebas, tu aprobación, producción— con el Loom que explica el cambio; alrededor, las
  // herramientas del día a día: Teams, Notion, Loom y el sandbox de Salesforce. Nada llega a producción sin aprobación.
  { id: 'SF14-dia-a-dia', sel: { targetKind: 'object', label: 'Cliente', participantKind: 'role', anchor: 'bottom-start', scale: 1.0, padding: 'compact' }, body: async () => {
    const TOOLS = R + 'src/lib/artifact-composer/catalogs/deck-axis/assets/tools/'
    const tileImg = (src, alt, x, y, kicker, label, px = 64) => `<div style="position:absolute;left:${x}px;top:${y}px;width:230px;text-align:center;z-index:5">
<div style="width:112px;height:112px;margin:0 auto;border-radius:28px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 20px 50px rgba(0,6,16,.55),0 0 0 1px rgba(255,255,255,.4) inset"><img src="${src}" alt="${alt}" style="width:${px}px;height:${px}px"></div>
<p style="margin:14px 0 0;font:600 13px Pop;letter-spacing:.14em;text-transform:uppercase;color:${SOFT}">${kicker}</p><p style="margin:4px 0 0;font:760 24px/1.1 Bric;letter-spacing:-.015em;color:#fff">${label}</p></div>`
    const LOOM = svgUri(R + 'ai-generations/2026-09-29_deck-salesforce/logos/loom-pinned-tab.svg')
    const step = (t, st) => { const col = st === 'ok' ? `background:${INK};color:#fff` : st === 'now' ? `background:#fff;color:${INK};box-shadow:0 0 0 2px ${INK} inset` : `background:${PAPER};color:${MUTED};box-shadow:0 0 0 1px ${LINE} inset`; return `<div style="flex:1;text-align:center"><span style="display:inline-flex;width:30px;height:30px;border-radius:50%;align-items:center;justify-content:center;font:700 14px Pop;${col}">${st === 'ok' ? '✓' : st === 'now' ? '•' : ''}</span><p style="margin:6px 0 0;font:600 13px Pop;color:${st === 'todo' ? MUTED : INK}">${t}</p></div>` }
    const video = `<div style="position:relative;height:190px;border-radius:14px;overflow:hidden;background:linear-gradient(135deg,#0B1F33,#16395C)">
<div style="position:absolute;left:18px;top:16px;right:18px;height:120px;border-radius:10px;background:rgba(255,255,255,.08);box-shadow:0 0 0 1px rgba(255,255,255,.12) inset"><div style="margin:14px 16px;height:10px;width:55%;border-radius:6px;background:rgba(255,255,255,.35)"></div><div style="margin:10px 16px;height:10px;width:78%;border-radius:6px;background:rgba(255,255,255,.2)"></div><div style="margin:10px 16px;height:10px;width:40%;border-radius:6px;background:rgba(255,255,255,.2)"></div></div>
<div style="position:absolute;right:22px;bottom:18px;width:64px;height:64px;border-radius:50%;background:${INK};box-shadow:0 0 0 3px #fff;display:flex;align-items:center;justify-content:center;font:760 22px Bric;color:#fff">EF</div>
<div style="position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);width:58px;height:58px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.4)"><svg viewBox="0 0 20 20" width="22" height="22"><path d="M6 4l10 6-10 6z" fill="${INK}"/></svg></div>
<span style="position:absolute;left:18px;bottom:16px;padding:4px 9px;border-radius:8px;background:rgba(0,0,0,.55);font:600 12px Pop;color:#fff">3:12</span></div>`
    const panel = `<div style="position:absolute;left:990px;top:250px;width:560px;box-sizing:border-box;padding:22px 24px 20px;border-radius:24px;background:${CARD};${deep};${REFLECT};z-index:3">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><div><p style="margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">Release 14 · Service Cloud</p><p style="margin:3px 0 0;font:760 22px Bric;letter-spacing:-.015em;color:${INK}">Enrutamiento de casos por prioridad</p></div>${sfIcon('service', 40, 'Service Cloud')}</div>
<div style="display:flex;gap:6px;margin-bottom:16px">${step('Sandbox', 'ok')}${step('Pruebas', 'ok')}${step('Tu aprobación', 'now')}${step('Producción', 'todo')}</div>
${video}
<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px"><div style="display:flex;align-items:center;gap:10px"><img src="${LOOM}" alt="Loom" style="width:28px;height:28px"><span style="font:500 14px Pop;color:${INK}">Qué cambia en tu consola, en 3 minutos</span></div><span data-sel style="padding:10px 16px;border-radius:10px;background:${INK};color:#fff;font:600 14px Pop;white-space:nowrap">Aprobar release</span></div></div>`
    const TEAMS = svgUri(TOOLS + 'teams-isotype.svg'), NOTION = svgUri(TOOLS + 'notion-isotype.svg')
    const tiles = tileImg(TEAMS, 'Microsoft Teams', 700, 150, 'Microsoft Teams', 'Nos hablamos') + tileImg(NOTION, 'Notion', 1560, 110, 'Notion', 'Backlog y documentos')
      + tileImg(LOOM, 'Loom', 1560, 620, 'Loom', 'Te lo mostramos', 72) + tileImg(SFI('platform'), 'Salesforce Platform', 700, 600, 'Salesforce', 'Pruebas en sandbox', 68)
    const beams = beam(930, 210, 1040, 300, 't1', 10) + beam(1560, 170, 1450, 270, 't2', 10) + beam(1560, 680, 1500, 640, 't3', 0) + beam(930, 660, 1000, 600, 't4', 0)
    return stageBg(1270, 540) + platform(1270, 950, 480, 72) + beams + panel + tiles
      + bigVoice('Tu día a día con Efeonce', '¿Cómo trabajamos contigo?', answerHtml('Sin sorpresas', A).replace('Sin sorpresas', 'Sin<br>sorpresas'), `Nada llega a producción sin tu ${b('aprobación')}: lo pruebas en sandbox y lo ves explicado en un video corto.`, 2, 150) + urlSign()
  } },

  // SF15 · ADOPCIÓN A TU RITMO (fase Activación y adopción): biblioteca de tutoriales en video por rol, grabados en Loom
  // sobre la org del cliente; responden «¿cómo hago…?» sin agendar reunión. Datos de muestra.
  { id: 'SF15-adopcion-loom', body: async () => {
    const LOOM = svgUri(R + 'ai-generations/2026-09-29_deck-salesforce/logos/loom-pinned-tab.svg')
    const vids = [
      ['sales', 'Ventas', 'Cómo registrar una oportunidad', '2:40', '#16395C'],
      ['service', 'Servicio', 'Cerrar un caso con knowledge', '3:05', '#1B3F5E'],
      ['marketing', 'Marketing', 'Probar un journey antes de activarlo', '4:12', '#14324F'],
      ['agentforce', 'Supervisión', 'Revisar y aprobar lo que propone el agente', '3:30', '#10304D']
    ]
    const card = ([ic, role, t, dur, bg], i) => { const on = i === 3; return `<div ${on ? 'data-sel ' : ''}style="box-sizing:border-box;padding:12px;border-radius:18px;background:${CARD};box-shadow:0 20px 50px rgba(0,6,16,.45)">
<div style="position:relative;height:130px;border-radius:12px;overflow:hidden;background:linear-gradient(135deg,${bg},#0B1F33)"><div style="position:absolute;left:14px;top:14px">${sfIcon(ic, 34)}</div>
<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M6 4l10 6-10 6z" fill="${INK}"/></svg></div>
<span style="position:absolute;right:10px;bottom:10px;padding:3px 8px;border-radius:7px;background:rgba(0,0,0,.55);font:600 12px Pop;color:#fff">${dur}</span></div>
<p style="margin:10px 4px 0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">${role}</p><p style="margin:3px 4px 4px;font:600 16px/1.3 Pop;color:${INK}">${t}</p></div>` }
    const lib = `<div style="position:absolute;left:820px;top:260px;width:880px;box-sizing:border-box;padding:24px 26px;border-radius:26px;background:${PAPER};${deep};transform:perspective(2200px) rotateY(-8deg) rotateX(3deg);transform-origin:left center;z-index:3">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px"><div style="display:flex;align-items:center;gap:12px"><img src="${LOOM}" alt="Loom" style="width:40px;height:40px"><div><p style="margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">En Loom · sobre tu org</p><p style="margin:2px 0 0;font:760 22px Bric;letter-spacing:-.015em;color:${INK}">Tutoriales de tu equipo</p></div></div><span style="padding:6px 12px;border-radius:999px;background:#fff;box-shadow:0 0 0 1px ${LINE} inset;font:600 12px Pop;letter-spacing:.08em;text-transform:uppercase;color:${MUTED}">Datos de muestra</span></div>
<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px">${vids.map(card).join('')}</div>
<div style="display:flex;gap:12px;margin-top:18px">${[['24', 'tutoriales grabados'], ['3 min', 'duración promedio'], ['Por rol', 'ventas, servicio, marketing y supervisión']].map(([v, k]) => `<div style="flex:1;padding:12px 16px;border-radius:14px;background:#fff;box-shadow:0 0 0 1px ${LINE} inset"><p style="margin:0;font:760 26px Bric;color:${INK}">${v}</p><p style="margin:2px 0 0;font:400 13px Pop;color:${MUTED}">${k}</p></div>`).join('')}</div></div>`
    return stageBg(1260, 540) + platform(1230, 960, 520, 80) + lib
      + bigVoice('Activación y adopción', '¿Cómo aprende tu equipo?', answerHtml('A su ritmo', A).replace('A su ritmo', 'A su<br>ritmo'), `Tutoriales cortos en video, grabados sobre ${b('tu')} Salesforce: responden «¿cómo hago…?» sin agendar una reunión.`, 2, 150) + urlSign()
  } }

  ,
  // SF16 · TU CRM EN CLAUDE (Claudeforce: Salesforce en Claude, beta abierta desde sep. 2026). Una conversación con
  // Claude conectada a Salesforce: la consulta se responde con datos vivos de la org y el cambio propuesto espera la
  // confirmación del ejecutivo (acción gobernada). Wordmark «Claudeforce» de la versión de video de Salesforce (Claude blanco +
  // force celeste con la f del logo), armado en logos/claudeforce-wordmark.svg (render-src/claudeforce-wordmark.mjs).
  { id: 'SF16-crm-en-claude', sel: { targetKind: 'object', label: 'Ejecutivo', participantKind: 'role', anchor: 'bottom-end', scale: 1.0, padding: 'compact' }, body: async () => {
    const LOGOS = R + 'ai-generations/2026-09-29_deck-salesforce/logos/'
    const cfMark = svgUri(LOGOS + 'claudeforce-wordmark.svg')
    const CLAUDE = svgUri(R + 'public/images/logos/partners/claude-logotype.svg')
    const CREAM = '#FAF9F5', CLAY = '#D97757'
    const opp = (n, st, v, risk) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #E8E4DA"><span style="font:600 14px Pop;color:${INK}">${n}</span><span style="font:400 13px Pop;color:${MUTED}">${st}</span><span style="font:600 13px Pop;color:${INK}">${v}</span>${risk ? `<span style="padding:3px 9px;border-radius:999px;box-shadow:0 0 0 1.5px ${CLAY} inset;font:600 11px Pop;color:#9C4A2F">En riesgo</span>` : '<span style="width:78px"></span>'}</div>`
    const chat = `<div style="position:absolute;left:780px;top:170px;width:760px;box-sizing:border-box;padding:22px 26px 22px;border-radius:26px;background:${CREAM};${deep};transform:perspective(2200px) rotateY(-7deg);transform-origin:left center;z-index:3">
<div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid #E8E4DA"><img src="${CLAUDE}" alt="Claude" style="height:26px"><span style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:#fff;box-shadow:0 0 0 1px #E8E4DA inset;font:600 12px Pop;color:${INK}"><img src="${SF_LOGO}" alt="" style="height:16px">Conectado a Salesforce</span></div>
<div style="display:flex;justify-content:flex-end;margin-top:16px"><p style="margin:0;max-width:520px;padding:12px 16px;border-radius:16px 16px 4px 16px;background:#EDE9DF;font:400 15px/1.45 Pop;color:${INK}">¿Qué oportunidades cierran este mes y cuál está en riesgo?</p></div>
<div style="margin-top:14px;padding:14px 16px;border-radius:16px;background:#fff;box-shadow:0 0 0 1px #E8E4DA inset"><p style="margin:0 0 6px;font:400 14px/1.45 Pop;color:${INK}">Tienes <b>3 oportunidades</b> con cierre este mes. <b>Andes Retail</b> lleva 21 días sin actividad:</p>
${opp('Andes Retail', 'Propuesta', '[MONTO]', true)}${opp('Grupo Norte', 'Negociación', '[MONTO]')}${opp('Clínica Sur', 'Cierre', '[MONTO]')}</div>
<div data-sel style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-radius:14px;background:#fff;box-shadow:0 0 0 1.5px ${INK} inset"><span style="font:500 14px/1.35 Pop;color:${INK}">Propongo agendar reunión y crear tarea para el ejecutivo en Salesforce</span><span style="padding:8px 14px;border-radius:10px;background:${INK};color:#fff;font:600 13px Pop;white-space:nowrap">Confirmar</span></div></div>`
    const side = (t, d, x) => `<div style="position:absolute;left:${x}px;top:720px;width:236px;box-sizing:border-box;padding:14px 16px;border-radius:16px;${glass};z-index:4"><p style="margin:0;font:760 18px/1.15 Bric;color:#fff">${t}</p><p style="margin:5px 0 0;font:400 13px/1.4 Pop;color:${SOFT}">${d}</p></div>`
    const tile = `<div style="position:absolute;left:1580px;top:150px;width:200px;height:200px;box-sizing:border-box;border-radius:18px;background:#032D60;box-shadow:0 0 0 1px rgba(0,182,255,.28) inset,0 30px 60px rgba(0,6,16,.55);display:flex;align-items:center;justify-content:center;z-index:4"><img src="${cfMark}" alt="Claudeforce" style="width:168px;height:auto"></div>`
    return stageBg(1180, 520) + platform(1180, 950, 480, 72) + chat + tile
      + side('Ve lo que tú ves', 'Respeta los permisos de tu org.', 780) + side('Tú confirmas', 'Ninguna acción sin tu visto bueno.', 1036) + side('37 skills de ventas', 'Pipeline, cuentas y seguimiento.', 1292)
      + note('Salesforce en Claude · beta abierta desde sep. 2026 · ejemplo ilustrativo')
      + bigVoice('Claudeforce · Enablement conversacional', '¿Y si le preguntas a tu CRM?', answerHtml('Te responde', A).replace('Te responde', 'Te<br>responde'), `Configuramos Salesforce en Claude con permisos, skills y ${b('adopción')}: tu equipo consulta y actualiza el CRM conversando.`, 2, 150) + urlSign()
  } },

  // SF17 · QUÉ MEDIMOS: cinco métricas de la práctica con su fórmula y su fuente, sin cifras (se fijan con baseline en
  // el diagnóstico). Mismas familias que la oferta: delivery, adopción, operación, datos y agentes.
  { id: 'SF17-que-medimos', body: async () => {
    const ms = [
      ['medicion', 'Adopción', 'Usuarios activos ÷ licencias', 'Salesforce', 'Líder del área'],
      ['reloj', 'Primer valor', 'Días del kickoff al primer valor acordado', 'Plan del proyecto', 'Efeonce'],
      ['checklist', 'Soporte en SLA', 'Solicitudes dentro del SLA ÷ total', 'Tu canal de soporte', 'Efeonce'],
      ['base-de-datos', 'Calidad de datos', 'Registros completos y sin duplicar ÷ total', 'Data 360 · informes', 'Admin de tu org'],
      ['ia', 'Agentes', 'Propuestas aprobadas sin corrección ÷ total', 'Agentforce', 'Supervisora']
    ]
    const cw = 330, x0 = 760
    const cards = ms.map(([g, t, f, src, own], i) => { const x = x0 + (i % 3) * (cw + 20) + (i >= 3 ? (cw + 20) / 2 : 0), y = i < 3 ? 190 : 480; return `<div style="position:absolute;left:${x}px;top:${y}px;width:${cw}px;height:262px;box-sizing:border-box;padding:22px 24px;border-radius:22px;${glass};z-index:3">
<div style="width:52px;height:52px">${icon(g, 52, t, 'dark', 'm' + i)}</div>
<p style="margin:16px 0 0;font:760 28px Bric;letter-spacing:-.02em;color:#fff">${t}</p>
<p style="margin:10px 0 0;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.08);font:500 16px/1.4 Pop;color:#E6EDF3">${f}</p>
<p style="margin:12px 0 0;font:500 13px Pop;letter-spacing:.1em;text-transform:uppercase;color:${SOFT}">Fuente · ${src}</p><p style="margin:6px 0 0;font:500 13px Pop;letter-spacing:.1em;text-transform:uppercase;color:${SOFT}">Dueño · ${own}</p></div>` }).join('')
    return stageBg(1300, 520) + platform(1300, 960, 520, 70) + cards
      + note('Sin cifras de promesa: la línea base se mide en el diagnóstico')
      + bigVoice('Qué medimos', '¿Cómo sabes que funciona?', answerHtml('Lo medimos', A).replace('Lo medimos', 'Lo<br>medimos'), `Cada métrica con su fórmula, su fuente y un ${b('dueño')}, desde el diagnóstico.`, 2, 150) + urlSign()
  } },

  // SF18 · SUPERVISIÓN EN VIVO («vívelo» de SF2): el agente propone en Slack, la supervisora aprueba y el cambio queda
  // ejecutado y auditado en Service Cloud. El loop propone → apruebas → ejecuta → queda registrado.
  { id: 'SF18-supervision-vivo', sel: { targetKind: 'object', label: 'Supervisora', participantKind: 'role', anchor: 'bottom-end', scale: 1.0, padding: 'compact' }, body: async () => {
    const SLACK = SFI('slack')
    const msg = `<div style="position:absolute;left:780px;top:190px;width:700px;box-sizing:border-box;padding:22px 24px;border-radius:24px;background:${CARD};${deep};transform:perspective(2200px) rotateY(-7deg);transform-origin:left center;z-index:3">
<div style="display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:1px solid ${LINE}"><img src="${SLACK}" alt="Slack" style="width:30px;height:30px"><span style="font:700 16px Pop;color:${INK}"># servicio-aprobaciones</span></div>
<div style="display:flex;gap:14px;margin-top:16px">${sfIcon('agentforce', 44, 'Agentforce')}<div style="flex:1"><p style="margin:0;font:700 15px Pop;color:${INK}">Agente de casos <span style="margin-left:6px;padding:2px 8px;border-radius:6px;background:${PAPER};font:600 11px Pop;color:${MUTED}">AGENTFORCE</span></p>
<p style="margin:6px 0 0;font:400 15px/1.5 Pop;color:${INK}">Caso <b>#4821</b>: el cliente pide reembolso de <b>[MONTO]</b>. Según la política 3.2 corresponde aprobarlo.</p>
<div style="display:flex;gap:8px;margin-top:10px"><span style="padding:5px 10px;border-radius:8px;background:${PAPER};box-shadow:0 0 0 1px ${LINE} inset;font:500 12px Pop;color:${MUTED}">Historial del cliente</span><span style="padding:5px 10px;border-radius:8px;background:${PAPER};box-shadow:0 0 0 1px ${LINE} inset;font:500 12px Pop;color:${MUTED}">Política 3.2</span></div>
<div style="display:flex;gap:26px;margin-top:14px"><span data-sel style="padding:9px 18px;border-radius:10px;background:${INK};color:#fff;font:600 14px Pop">Aprobar</span><span style="padding:9px 18px;border-radius:10px;box-shadow:0 0 0 1.5px ${INK} inset;color:${INK};font:600 14px Pop">Editar</span><span style="padding:9px 18px;border-radius:10px;box-shadow:0 0 0 1.5px ${LINE} inset;color:${MUTED};font:600 14px Pop">Rechazar</span></div></div></div></div>`
    const steps = [['Propone', 'El agente, con evidencia'], ['Apruebas', 'La supervisora, en Slack'], ['Ejecuta', 'En Service Cloud'], ['Queda registrado', 'Auditoría completa']]
    const flow = `<div style="position:absolute;left:780px;top:660px;display:flex;gap:14px;z-index:3">${steps.map(([t, d], i) => `<div style="width:196px;box-sizing:border-box;padding:16px 18px;border-radius:16px;${i === 1 ? `background:${CARD}` : glass}"><p style="margin:0;font:760 15px Bric;color:${i === 1 ? INK : A}">0${i + 1}</p><p style="margin:4px 0 0;font:760 20px Bric;color:${i === 1 ? INK : '#fff'}">${t}</p><p style="margin:4px 0 0;font:400 13px Pop;color:${i === 1 ? MUTED : SOFT}">${d}</p></div>`).join('')}</div>`
    const done = `<div style="position:absolute;left:1500px;top:250px;width:270px;box-sizing:border-box;padding:18px 18px;border-radius:18px;${glass};z-index:4"><div style="display:flex;align-items:center;gap:10px">${sfIcon('service', 36, 'Service Cloud')}<p style="margin:0;font:760 18px/1.15 Bric;color:#fff">Ejecutado en Service Cloud</p></div><p style="margin:10px 0 0;font:400 14px/1.45 Pop;color:${SOFT}">Reembolso aplicado, cliente notificado y registro de quién aprobó y cuándo.</p></div>`
    return stageBg(1260, 520) + platform(1250, 960, 500, 70) + msg + done + flow
      + note('Ejemplo ilustrativo · la política y los límites se definen con tu equipo')
      + bigVoice('Agentforce · supervisión en vivo', '¿Dónde apruebas al agente?', answerHtml('Donde trabajas', A).replace('Donde trabajas', 'Donde<br>trabajas'), `El agente propone con evidencia, tú ${b('apruebas')} en Slack y el cambio queda ejecutado y registrado.`, 2, 150) + urlSign()
  } }

  ,
  // SF19 · CONTRAPORTADA DE LA PROPUESTA SALESFORCE (receta close-proposal-horizon, línea revenue-salesforce): Nexa de
  // espaldas camina hacia el anillo celeste. Logo de Efeonce protagonista y el eslogan en bloque debajo, al 64 % del
  // ancho del logo (regla del operador 2026-09-29, efeonceGraphicLine.motion.layout.sloganOfLogo), con «Revenue» en el
  // acento de la línea. Contacto canónico (EFEONCE_CONTACT) y redes. Foto a sangre sin interfaz.
  { id: 'SF19-contraportada', body: async () => {
    const photo = await jpgCover(R + 'ai-generations/2026-09-29_deck-salesforce/plates/NXSF3-nexa-contraportada-bordada.png', W, H, 'east')
    const DA = R + 'src/lib/artifact-composer/catalogs/deck-axis/assets/'
    const FILTER = 'filter:brightness(0) invert(1);opacity:.78'
    const soc = ['spotify', 'instagram', 'linkedin', 'threads', 'youtube', 'tiktok'].map(n => `<img src="${svgUri(DA + 'social/' + n + '.svg')}" alt="${n}" style="width:30px;height:30px;object-fit:contain;${FILTER}">`).join('')
    const CI = { mail: svgUri(DA + 'contact/letter-bold.svg'), phone: svgUri(DA + 'contact/phone-calling-bold.svg'), pin: svgUri(DA + 'contact/map-point-bold.svg') }
    const contacts = [['mail', 'sales@efeoncepro.com'], ['phone', '+56 9 3732 3064'], ['phone', '+1 (239) 235-2073'], ['pin', 'Dr. Manuel Barros Borgoño 71, of. 1105, Providencia, Chile']]
    const lay = GL.motion.layout, logoW = 700
    const meta = await sharp(BA + 'efeonce-logo-negative.svg').metadata(), logoH = Math.round(logoW * meta.height / meta.width)
    const word = SF.sloganWord, fs = +(lay.sloganOfLogo * logoW / GL.slogan.widthEmByWord[word]).toFixed(1)
    const sTop = 220 + logoH + Math.round(fs * lay.sloganGapOfFont) - Math.round(fs * .2)
    const lead = GL.slogan.leadColor.onDark
    const slogan = `<p style="position:absolute;left:${M}px;top:${sTop}px;width:${Math.round(logoW * lay.sloganOfLogo)}px;margin:0;font-size:${fs}px;line-height:1;white-space:nowrap;z-index:3"><span style="font:italic 800 ${fs}px Pop;color:${lead};margin-right:.14em">Empower</span> <span style="font:800 ${fs}px Pop;color:${lead}">your</span> <span style="font:italic 900 ${fs}px Pop;color:${A}">${word}</span></p>`
    const cTop = sTop + fs + 110
    return `<img src="${photo}" alt="Nexa, con la chaqueta de Efeonce, camina de espaldas por un piso brillante hacia un gran anillo vertical de luz celeste con una esfera blanca en lo alto" style="position:absolute;inset:0;width:${W}px;height:${H}px">
<img src="${LOGO}" alt="Efeonce" style="position:absolute;left:${M}px;top:220px;width:${logoW}px;height:auto;z-index:3">${slogan}
<div style="position:absolute;left:${M}px;top:${cTop}px;display:flex;align-items:center;gap:22px;z-index:3"><img src="${svgUri(BA + 'url-bubble-baked-dark.svg')}" alt="efeoncepro.com" style="height:30px">${soc}</div>
<div style="position:absolute;left:${M}px;top:${cTop + 60}px;display:flex;flex-direction:column;gap:16px;font:500 20px/1 Pop;color:${lead};z-index:3">${contacts.map(([k, t]) => `<span style="display:inline-flex;align-items:center;gap:12px;white-space:nowrap"><img src="${CI[k]}" alt="" style="width:22px;height:22px;${FILTER}">${t}</span>`).join('')}</div>
${SIN_BADGE ? '' : `<img src="${SF_BADGE}" alt="Salesforce Partner" style="position:absolute;left:${M}px;top:${cTop + 290}px;height:72px;width:auto;z-index:3">`}`
  } }

]

const css = `<style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-Regular.ttf')});font-weight:400}@font-face{font-family:Pop;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}@font-face{font-family:Pop;src:url(${f64('Poppins-ExtraBold.ttf')});font-weight:800}@font-face{font-family:'Poppins';src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:'Poppins';src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}@font-face{font-family:'Bricolage Grotesque';src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}body{margin:0}</style>`
const br = await chromium.launch({ channel: 'chrome' }); const pg = await br.newPage({ viewport: { width: W, height: H } })
for (const sl of slides.filter(s => !process.env.ONLY || process.env.ONLY.split(',').includes(s.id))) {
  const body = await sl.body()
  await pg.setContent(`<html><head>${css}</head><body><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${C.dark}">${body}</div></body></html>`, { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  if (sl.sel) console.log(sl.id, JSON.stringify(await paintSelection(pg, sl.sel)).slice(0, 160))
  const name = sl.id + (SIN_BADGE ? '-sin-badge' : '') + (process.env.DOC === 'propuesta' ? '-propuesta' : '')
  await pg.screenshot({ path: `${OUT}${name}.png` })
  await sharp(`${OUT}${name}.png`).jpeg({ quality: 88 }).toFile(`${OUT}${name}.jpg`)
  console.log('ok', sl.id)
}
await br.close()
