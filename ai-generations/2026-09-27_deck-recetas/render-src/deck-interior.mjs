// Deck interior Efeonce con «La órbita»: ocho láminas de contenido (texto, viñetas, equipo, día a día, cotización,
// clientes, partners, stack). Métricas de la lámina de contenido de AXIS (margen 140, eyebrow 16, pregunta 40,
// respuesta 110) y el indicador de navegación de 80 px arriba a la derecha pintado por el motor (una sola órbita por
// lámina). Selección y cursores del renderer de producción. Maquetas de dirección.
import { answerHtml, paintGraphicLine } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { resolveGraphicLineIntent } from '/Users/jreye/Documents/axis-design-system/packages/contracts/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { resolveCollaborationSelectionIntent } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-ui-contracts/dist/index.js'
import { renderCollaborationSelection } from '/Users/jreye/Documents/greenhouse-eo/scripts/creative/layout-compiler/axis-advertising.mjs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync } from 'node:fs'

const R = '/Users/jreye/Documents/greenhouse-eo/', OUT = new URL('./out-deck/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const CAT = R + 'src/lib/artifact-composer/catalogs/deck-axis/assets/'
const BA = R + 'node_modules/@efeoncepro/axis-brand-assets/assets/'
const AI = R + 'ai-generations/'
const W = 1920, H = 1080, M = 140
const C = GL.color, SOFT = GL.slogan.leadColor.onDark
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const svgUri = f => 'data:image/svg+xml;base64,' + readFileSync(f).toString('base64')
const jpg = async (f, w, h, pos = 'centre') => 'data:image/jpeg;base64,' + (await sharp(f).resize(w, h, { fit: 'cover', position: pos }).jpeg({ quality: 88 }).toBuffer()).toString('base64')
const png = buf => 'data:image/png;base64,' + buf.toString('base64')

// superficies: tinta, texto suave, acento (tealDark en papel por contraste; teal en navy)
const S = {
  paper: { bg: C.paper, ink: C.navy, text: '#00284D', soft: '#5F5A69', accent: C.tealDark, rule: '#DCE2E8', bubble: BA + 'url-bubble-baked-light.svg', logo: BA + 'efeonce-logo-positive.svg' },
  dark: { bg: C.dark, ink: '#FFFFFF', text: '#E6EDF3', soft: SOFT, accent: C.teal, rule: '#1D3A57', bubble: BA + 'url-bubble-baked-dark.svg', logo: BA + 'efeonce-logo-negative.svg' }
}
const ring = s => `<span aria-hidden="true" style="display:inline-block;width:.62em;height:.62em;border-radius:50%;border:.1em solid ${s.accent};box-sizing:border-box;margin-right:.42em;vertical-align:-.04em"></span>`

// indicador de navegación: la pieza medida deck.content (80 px arriba a la derecha), motor de AXIS
function indicator(surface, sections, current) {
  const P = GL.pieces.deck.content
  const m = resolveGraphicLineIntent({ canvas: { width: W, height: H, line: 'growth', surface: surface === 'paper' ? 'light' : surface, channel: 'screen' }, elements: [{ kind: 'progress', id: 'nav', sections, current, region: 'upper-end' }] })
  const el = m.elements[0]
  el.ring = { ...el.ring, strokePx: P.ring.strokePx, opacity: P.ring.opacity }; el.arc = { ...el.arc, strokePx: P.arc.strokePx }; el.sphere = { ...el.sphere, radiusPx: P.sphereRadiusPx }
  return '<div style="position:absolute;inset:0;z-index:4;pointer-events:none">' + paintGraphicLine(m, { background: false, idPrefix: 'nav' + current + surface, circles: { nav: { cx: P.ring.cx, cy: P.ring.cy, r: P.ring.r } } }).svg + '</div>'
}
// cabecera canónica: eyebrow, pregunta con su anillo, respuesta con la esfera (una por lámina)
const head = (s, eyebrow, q, a, { top = 110, size = 110, width = 1300 } = {}) => `
<p style="position:absolute;left:${M}px;top:${top}px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${s.soft}">${eyebrow}</p>
<p style="position:absolute;left:${M}px;top:${top + 90}px;width:${width}px;margin:0;font:300 40px/1.2 Pop;color:${s === S.dark ? SOFT : s.text}">${ring(s)}${q}</p>
<p data-answer style="position:absolute;left:${M - 4}px;top:${top + 160}px;margin:0;font:760 ${size}px Bric;line-height:1;letter-spacing:-.035em;color:${s.ink};white-space:nowrap">${answerHtml(a, s.accent)}</p>`
const foot = s => `<img src="${svgUri(s.bubble)}" alt="efeoncepro.com" style="position:absolute;left:${M}px;top:${H - 86}px;height:30px;z-index:4">`

// logos en un solo tono con el mismo peso óptico (misma área de tinta), como la franja de partners de la línea
async function monoLogo(file, color, inkTarget, maxW, maxH, knock = false) {
  const base = await sharp(file, { density: 600 }).resize({ height: 400, fit: 'inside' }).ensureAlpha().png().toBuffer()
  const { data, info } = await sharp(base).extractChannel('alpha').raw().toBuffer({ resolveWithObject: true })
  let ink = 0; { const { data: q } = await sharp(base).raw().toBuffer({ resolveWithObject: true }); for (let i = 0; i < q.length; i += 4) { const lum = (0.2126 * q[i] + 0.7152 * q[i + 1] + 0.0722 * q[i + 2]) / 255; ink += knock && lum > 0.92 ? 0 : q[i + 3] / 255 } }
  let k = Math.sqrt(inkTarget / ink)
  k = Math.min(k, maxW / info.width, maxH / info.height)
  const w = Math.round(info.width * k), h = Math.round(info.height * k)
  const { data: px, info: pi } = await sharp(base).raw().toBuffer({ resolveWithObject: true })
  const a = Buffer.alloc(pi.width * pi.height)
  for (let i = 0; i < a.length; i++) { const o = i * 4, lum = (0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2]) / 255; a[i] = knock && lum > 0.92 ? 0 : px[o + 3] }
  const alpha = await sharp(a, { raw: { width: pi.width, height: pi.height, channels: 1 } }).resize(w * 2, h * 2).png().toBuffer()
  const hex = color.replace('#', ''), rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16))
  const buf = await sharp({ create: { width: w * 2, height: h * 2, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } }).joinChannel(alpha).png().toBuffer()
  return { src: png(buf), w, h }
}
const icon = async (file, px) => png(await sharp(file, { density: 600 }).resize(px * 2, px * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer())

const slides = []

// 1 · TEXTO (navy): la respuesta ES la lámina; escala extrema y la selección la toma entera
{
  const s = S.dark
  slides.push({ id: 'D1-texto', title: 'Texto', surface: 'dark', sel: { label: 'Cliente', anchor: 'bottom-end', scale: 1.6 }, body: `
<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${s.soft}">Por qué existimos</p>
<p style="position:absolute;left:${M}px;top:200px;margin:0;font:300 48px/1.2 Pop;color:${SOFT}">${ring(s)}¿Con quién crece tu marca?</p>
<p data-sel style="position:absolute;left:${M - 16}px;top:270px;margin:0;font:760 400px Bric;line-height:1;letter-spacing:-.05em;color:#fff;white-space:nowrap">${answerHtml('Contigo', s.accent)}</p>
<p style="position:absolute;left:${M}px;top:826px;width:860px;margin:0;font:300 36px/1.35 Pop;color:${s.text}">No te entregamos crecimiento. Lo construimos contigo y te dejamos más capaz de sostenerlo.</p>
<div style="position:absolute;right:${M}px;top:872px;display:flex;flex-direction:column;gap:8px;width:620px">
${[['Co-creación', 'operas con nosotros en vivo'], ['Educación', 'te hacemos mejor, no dependiente'], ['Integralidad', 'un solo interlocutor']].map(([t, d]) => `<p style="margin:0;padding-top:10px;border-top:2px solid ${s.rule};font:600 22px Pop;color:${s.ink};white-space:nowrap">${t} <span style="font-weight:300;color:${s.text}">· ${d}</span></p>`).join('')}
</div>${foot(s)}${indicator('dark', 5, 1)}` })
}

// 2 · VIÑETAS (navy): cuatro puntos numerados, nunca con la esfera; la selección marca el que define la oferta
{
  const s = S.dark
  const items = [
    ['Un solo interlocutor', 'Tu Director de Cuenta coordina todas las líneas. Sin pérdida de contexto entre equipos.'],
    ['Un equipo que opera como sistema', 'Estrategia, creatividad, medios y tecnología bajo el mismo estándar y la misma metodología.'],
    ['Métricas en vivo en Greenhouse', 'OTD, FTR y Revenue Enabled en tu portal, no en un informe que llega tarde.'],
    ['Cada ciclo suma al anterior', 'Loop Marketing: ningún trimestre empieza de cero.']
  ]
  slides.push({ id: 'D2-vinetas', title: 'Texto con viñetas', surface: 'dark', sel: { label: 'Growth', anchor: 'bottom-end' }, body: `
${head(s, 'La experiencia Efeonce', '¿Qué recibes al trabajar con nosotros?', 'Un sistema', { size: 120 })}
<div style="position:absolute;left:${M}px;top:520px;width:1640px;display:grid;grid-template-columns:1fr 1fr;gap:56px 110px">
${items.map(([t, d], i) => `<div ${i === 2 ? 'data-sel' : ''} style="display:flex;gap:34px;align-items:flex-start"><p style="margin:-10px 0 0;font:300 84px Bric;letter-spacing:-.03em;line-height:1;color:${s.accent}">0${i + 1}</p><div style="border-top:2px solid ${s.rule};padding-top:18px;flex:1"><p style="margin:0;font:600 32px/1.2 Pop;color:${s.ink}">${t}</p><p style="margin:10px 0 0;font:300 24px/1.45 Pop;color:${s.text}">${d}</p></div></div>`).join('')}
</div>${foot(s)}${indicator('dark', 5, 2)}` })
}

// 3 · EQUIPO (navy): el squad orbita tu marca. Un solo anillo alrededor del contenido («Tu marca»), el equipo como
// satélites (fotos REALES del catálogo, cargos de la propuesta ganada a Sky) y el arco largo en degradé sin esfera,
// como manda la anatomía cuando la órbita lleva satélites. Sin indicador de navegación: una sola órbita por lámina.
{
  const s = S.dark
  const team = [['julio', 'Julio', 'Responsable de Cuenta'], ['daniela', 'Daniela', 'Creative Operations Lead'], ['melkin', 'Melkin', 'Senior Visual Designer'], ['maria-fernanda', 'María Fernanda', 'SEO Copywriter'], ['andres', 'Andrés', 'SEO Specialist']]
  const cx = 1190, cy = 620, r = 340
  const ringStroke = GL.pieces.deck.section.ring.strokePx * 1.4, arcStroke = GL.pieces.deck.section.arc.strokePx * 1.6
  const angles = [-90, -18, 54, 126, 198]
  const pt = (a, rr = r) => [cx + rr * Math.cos(a * Math.PI / 180), cy + rr * Math.sin(a * Math.PI / 180)]
  const [ax0, ay0] = pt(-90 - 140), [ax1, ay1] = pt(-90 - 10)
  const orbit = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:1"><defs><linearGradient id="arcg" gradientUnits="userSpaceOnUse" x1="${ax0}" y1="${ay0}" x2="${ax1}" y2="${ay1}"><stop offset="0" stop-color="${s.accent}" stop-opacity="0"/><stop offset="1" stop-color="${s.accent}"/></linearGradient><radialGradient id="halo"><stop offset="0" stop-color="${C.halo}" stop-opacity=".13"/><stop offset=".6" stop-color="${C.halo}" stop-opacity=".03"/><stop offset="1" stop-color="${C.halo}" stop-opacity="0"/></radialGradient></defs>
<circle cx="${cx}" cy="${cy}" r="${r * 0.95}" fill="url(#halo)"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.halo}" stroke-opacity=".22" stroke-width="${ringStroke}"/>
<path d="M ${ax0} ${ay0} A ${r} ${r} 0 0 1 ${ax1} ${ay1}" fill="none" stroke="url(#arcg)" stroke-width="${arcStroke}" stroke-linecap="round"/></svg>`
  const sats = []
  for (const [i, [k, n, role]] of team.entries()) {
    const D = i === 0 ? 210 : 150, [x, y] = pt(angles[i])
    const src = await jpg(CAT + `squad/squad-${k}.png`, D * 2, D * 2, 'north')
    const side = i === 3 ? 'left' : i === 4 ? 'below' : 'right'
    const lx = side === 'right' ? x + D / 2 + (i === 0 ? 44 : 22) : side === 'left' ? x - D / 2 - 22 - 260 : x - 130
    const ly = side === 'below' ? y + D / 2 + 14 : i === 0 ? y - 40 : y - 30
    const left = side === 'left', center = side === 'below'
    sats.push(`<img ${i === 0 ? 'data-sel' : ''} src="${src}" alt="${n}" style="position:absolute;left:${x - D / 2}px;top:${y - D / 2}px;width:${D}px;height:${D}px;border-radius:50%;object-fit:cover;z-index:2;box-shadow:0 0 0 6px ${s.bg}">
<div style="position:absolute;left:${lx}px;top:${ly}px;width:260px;z-index:2;text-align:${left ? 'right' : center ? 'center' : 'left'}"><p style="margin:0;font:600 ${i === 0 ? 32 : 26}px Pop;color:${s.ink}">${n}</p><p style="margin:4px 0 0;font:300 ${i === 0 ? 22 : 19}px/1.3 Pop;color:${s.text}">${role}</p></div>`)
  }
  slides.push({ id: 'D3-equipo', title: 'El equipo', surface: 'dark', sel: { label: 'Cliente', anchor: 'top-start', kind: 'object', scale: 1.3 }, body: `
${orbit}
<p style="position:absolute;left:${cx - 200}px;top:${cy - 58}px;width:400px;margin:0;font:760 64px Bric;letter-spacing:-.03em;line-height:1;color:#fff;text-align:center;z-index:2">Tu marca</p>
<p style="position:absolute;left:${cx - 200}px;top:${cy + 18}px;width:400px;margin:0;font:300 22px Pop;color:${s.text};text-align:center;z-index:2">al centro de todo</p>
${sats.join('')}
<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${s.soft}">Tu equipo</p>
<p style="position:absolute;left:${M}px;top:200px;margin:0;font:300 40px/1.2 Pop;color:${SOFT}">${ring(s)}¿Quién trabaja en tu cuenta?</p>
<p style="position:absolute;left:${M - 6}px;top:268px;margin:0;font:760 150px Bric;line-height:.95;letter-spacing:-.045em;color:#fff">Personas<br>${answerHtml('reales', s.accent)}</p>
<p style="position:absolute;left:${M}px;top:600px;width:560px;margin:0;font:300 28px/1.45 Pop;color:${s.text}">Un squad que orbita tu marca, y un solo interlocutor: tu Responsable de Cuenta.</p>
${foot(s)}` })
}

// 4 · DÍA A DÍA (navy): la órbita es el reloj del día. La lente muestra el momento que importa (15:00, revisamos
// contigo) y los otros momentos van como satélites en su hora de reloj: 09:00 a las 9, 11:30 casi arriba, 18:00 abajo.
// El arco en degradé, sin esfera (lleva satélites), recorre del último momento al de ahora. La única esfera: la respuesta.
{
  const s = S.dark
  const cx = 1080, cy = 560, rp = 280, r = Math.round(rp * (1 + GL.orbit.ringAirRatio))
  const clock = h => (h % 12) * 30 - 90
  const pt = (a, rr = r) => [cx + rr * Math.cos(a * Math.PI / 180), cy + rr * Math.sin(a * Math.PI / 180)]
  const lens = await jpg(AI + '2026-09-26_deck-triptico-v2/plates/T3-mide.png', rp * 4, rp * 4, 'north')
  const [ax0, ay0] = pt(clock(11.5) + 4), [ax1, ay1] = pt(clock(15) - 6)
  const orbit = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:1"><defs><linearGradient id="dg" gradientUnits="userSpaceOnUse" x1="${ax0}" y1="${ay0}" x2="${ax1}" y2="${ay1}"><stop offset="0" stop-color="${s.accent}" stop-opacity="0"/><stop offset="1" stop-color="${s.accent}"/></linearGradient><radialGradient id="dh"><stop offset="0" stop-color="${C.halo}" stop-opacity=".13"/><stop offset=".6" stop-color="${C.halo}" stop-opacity=".03"/><stop offset="1" stop-color="${C.halo}" stop-opacity="0"/></radialGradient></defs>
<circle cx="${cx}" cy="${cy}" r="${r * 1.35}" fill="url(#dh)"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.halo}" stroke-opacity=".22" stroke-width="3"/>
<path d="M ${ax0} ${ay0} A ${r} ${r} 0 0 1 ${ax1} ${ay1}" fill="none" stroke="url(#dg)" stroke-width="7" stroke-linecap="round"/></svg>`
  const moments = [
    ['2026-09-26_deck-mosaico-documental/plates/L2-terreno-panaderia.png', 9, '09:00', 'Escuchamos en terreno', 'below'],
    ['2026-09-26_deck-mosaico-documental/plates/L3-taller-post-its.png', 11.5, '11:30', 'Creamos en el taller', 'left'],
    ['2026-09-26_web-hero/plates/H2-pov-tablet.png', 18, '18:00', 'Medimos lo que vendió', 'right']
  ]
  const D = 176, sats = []
  for (const [f, h, t, d, side] of moments) {
    const [x, y] = pt(clock(h))
    const src = await jpg(AI + f, D * 2, D * 2)
    sats.push(`<img src="${src}" alt="${d}" style="position:absolute;left:${x - D / 2}px;top:${y - D / 2}px;width:${D}px;height:${D}px;border-radius:50%;object-fit:cover;z-index:3;box-shadow:0 0 0 7px ${s.bg}">
<div style="position:absolute;${side === 'left' ? `right:${W - (x - D / 2 - 26)}px;text-align:right;top:${y - 42}px` : side === 'below' ? `right:${W - (x + 20)}px;text-align:right;top:${y + D / 2 + 16}px` : `left:${x + D / 2 + 26}px;top:${y - 42}px`};width:280px;z-index:3"><p style="margin:0;font:300 56px Bric;letter-spacing:-.03em;line-height:1;color:${s.ink}">${t}</p><p style="margin:6px 0 0;font:300 21px/1.3 Pop;color:${s.text}">${d}</p></div>`)
  }
  const [nx, ny] = pt(clock(15))
  slides.push({ id: 'D4-dia', title: 'El día a día', surface: 'dark', sel: { label: 'Cliente', anchor: 'top-end', kind: 'group', scale: 1.0 }, body: `
${orbit}
<img src="${lens}" alt="15:00, la líder de cuenta revisa los resultados con el cliente" style="position:absolute;left:${cx - rp}px;top:${cy - rp}px;width:${rp * 2}px;height:${rp * 2}px;border-radius:50%;object-fit:cover;z-index:2">
${sats.join('')}
<div data-sel style="position:absolute;left:${nx + 34}px;top:${ny - 50}px;z-index:3"><p style="margin:0;font:760 76px Bric;letter-spacing:-.04em;line-height:1;color:#fff">15:00</p><p style="margin:6px 0 0;font:600 20px Pop;color:${s.accent};letter-spacing:.08em;text-transform:uppercase">Revisamos contigo</p></div>
<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${s.soft}">Un día con Efeonce</p>
<p style="position:absolute;left:${M}px;top:200px;margin:0;font:300 40px/1.2 Pop;color:${SOFT}">${ring(s)}¿Cómo es un día<br>&nbsp;&nbsp;&nbsp;&nbsp;con nosotros?</p>
<p style="position:absolute;left:${M - 8}px;top:312px;margin:0;font:760 230px Bric;line-height:.95;letter-spacing:-.05em;color:#fff">${answerHtml('Así', s.accent)}</p>
<p style="position:absolute;left:${M}px;top:540px;width:380px;margin:0;font:300 25px/1.45 Pop;color:${s.text}">Del terreno a la medición en el mismo día. A las 15:00 entras tú: no esperas el informe, lo revisas con nosotros.</p>
${foot(s)}` })
}

// 5 · COTIZACIÓN (navy): la voz grande a la izquierda y tres planes; Pro sale de la grilla (más alto, en papel,
// con la selección de Finanzas). Montos por propuesta, netos y con el IVA declarado en cada uno.
{
  const s = S.dark
  const plans = [
    ['Basic', 'Para empezar a medir', ['Dashboard y KPIs', 'OTD y RpA', 'Gobierno de marca con IA', 'Reporting mensual']],
    ['Pro', 'Para operar y decidir', ['Dashboard, KPIs y acciones', 'Suma Revenue Enabled', 'Recomendaciones de IA', 'Aprobar y solicitar en el portal', 'Reporting quincenal']],
    ['Enterprise', 'Para escalar con IA', ['Suma IA y API', 'Benchmarks de industria', 'Agentes a medida', 'Integraciones', 'Reporting en tiempo real']]
  ]
  const x0 = 760, cw = 320, gap = 30, top = 250, h = 640
  const cards = plans.map(([name, tag, feats], i) => {
    const pro = i === 1, x = x0 + i * (cw + gap), t = pro ? top - 50 : top, hh = pro ? h + 100 : h
    const ink = pro ? C.navy : '#fff', txt = pro ? '#00284D' : s.text, soft = pro ? '#5F5A69' : SOFT, rule = pro ? '#DCE2E8' : s.rule
    return `<div ${pro ? 'data-sel' : ''} style="position:absolute;left:${x}px;top:${t}px;width:${cw}px;height:${hh}px;border-radius:18px;box-sizing:border-box;padding:${pro ? 40 : 34}px 32px;background:${pro ? C.paper : 'transparent'};box-shadow:${pro ? '0 40px 90px rgba(0,0,0,.45)' : 'inset 0 0 0 1.5px ' + s.rule};z-index:2">
${pro ? `<p style="margin:0 0 14px;font:600 15px Pop;letter-spacing:.12em;text-transform:uppercase;color:${C.tealDark}">Recomendado</p>` : ''}
<p style="margin:0;font:760 ${pro ? 64 : 52}px Bric;letter-spacing:-.03em;line-height:1;color:${ink}">${name}</p>
<p style="margin:10px 0 0;font:300 21px Pop;color:${soft}">${tag}</p>
<p style="margin:${pro ? 34 : 28}px 0 0;font:600 ${pro ? 44 : 36}px Pop;letter-spacing:-.01em;color:${ink}">[MONTO]</p>
<p style="margin:4px 0 0;font:300 17px Pop;color:${soft}">al mes · neto + IVA</p>
<div style="margin-top:${pro ? 30 : 26}px">${feats.map(f => `<p style="margin:0;padding:13px 0;border-top:1.5px solid ${rule};font:${pro ? 400 : 300} 20px/1.3 Pop;color:${txt}">${f}</p>`).join('')}</div></div>`
  }).join('')
  slides.push({ id: 'D5-cotizacion', title: 'Tabla de cotización', surface: 'dark', sel: { label: 'Finanzas', anchor: 'top-end', kind: 'object', scale: 1.2 }, body: `
<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${s.soft}">Inversión</p>
<p style="position:absolute;left:${M}px;top:200px;margin:0;font:300 40px/1.2 Pop;color:${SOFT}">${ring(s)}¿Cómo se cotiza?</p>
<p style="position:absolute;left:${M - 6}px;top:270px;margin:0;font:760 118px Bric;line-height:.95;letter-spacing:-.045em;color:#fff">Por<br>${answerHtml('capacidad', s.accent)}</p>
<p style="position:absolute;left:${M}px;top:560px;width:470px;margin:0;font:300 25px/1.45 Pop;color:${s.text}">El fee del equipo se cotiza por capacidad gobernada, nunca por horas ni piezas. Greenhouse suma la capa de producto.</p>
<p style="position:absolute;left:${M}px;top:${H - 200}px;width:470px;margin:0;font:400 17px/1.4 Pop;color:${SOFT}">Valores netos, IVA no incluido. Los montos se definen en cada propuesta.</p>
${cards}${foot(s)}` })
}

// 6 · CLIENTES (papel): la prueba en escala gigante y el muro de logos en una grilla fina de 5 × 2; la décima celda
// dice dónde operamos. Logos reales del catálogo, un solo tono y el mismo peso.
{
  const s = S.paper
  const ids = ['sky', 'berel', 'bresler', 'carozzi', 'aguas-andinas', 'anam', 'marca-chile', 'gobierno-santiago', 'universidad-temuco']
  const logos = []
  for (const id of ids) logos.push({ id, ...(await monoLogo(CAT + `clients/${id}.svg`, C.navy, 4200, 220, 92)) })
  // Aguas Andinas y la UC de Temuco pierden sus formas internas si se aplanan a un solo tono (operador, 2026-09-27):
  // se recolorean en tonos del mismo navy —el color principal en navy, el secundario en un tinte más claro— y el
  // blanco del logo se conserva, así la montaña, el sol, la cruz y los arcos se siguen leyendo.
  const tint = p => { const h = C.navy.replace('#', ''), c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); return '#' + c.map(v => Math.round(v + (255 - v) * p).toString(16).padStart(2, '0')).join('') }
  const TONAL = {
    'aguas-andinas': { '#014C94': C.navy, '#0A2540': C.navy, '#3A8245': tint(0.38), '#F0A31F': tint(0.72) },
    'universidad-temuco': { '#0077BA': C.navy, '#0177BA': C.navy, '#0178BB': C.navy, '#878786': C.navy, '#888887': C.navy, '#FDC300': tint(0.55) }
  }
  for (const l of logos) {
    const map = TONAL[l.id]; if (!map) continue
    let svg = readFileSync(CAT + `clients/${l.id}.svg`, 'utf8')
    for (const [from, to] of Object.entries(map)) svg = svg.replaceAll(`fill="${from}"`, `fill="${to}"`)
    const k = Math.min(1.14, 230 / l.w, 104 / l.h); l.w = Math.round(l.w * k); l.h = Math.round(l.h * k) // el tono claro pesa menos: se compensa
    l.src = png(await sharp(Buffer.from(svg), { density: 600 }).resize(l.w * 2, l.h * 2, { fit: 'fill' }).png().toBuffer())
  }
  const gx = M, gy = 616, cw = 328, ch = 160
  const cells = logos.map((l, k) => { const col = k % 5, row = Math.floor(k / 5); return `<div style="position:absolute;left:${gx + col * cw}px;top:${gy + row * ch}px;width:${cw}px;height:${ch}px;display:flex;align-items:center;justify-content:center"><img src="${l.src}" alt="${l.id}" style="width:${l.w}px;height:${l.h}px"></div>` }).join('')
  const lines = [0, 1, 2].map(r => `<div style="position:absolute;left:${gx}px;top:${gy + r * ch}px;width:${cw * 5}px;border-top:1.5px solid ${s.rule}"></div>`).join('') + [1, 2, 3, 4].map(c => `<div style="position:absolute;left:${gx + c * cw}px;top:${gy}px;height:${ch * 2}px;border-left:1.5px solid ${s.rule}"></div>`).join('')
  const markets = `<div style="position:absolute;left:${gx + 4 * cw}px;top:${gy + ch}px;width:${cw}px;height:${ch}px;display:flex;flex-direction:column;justify-content:center;padding-left:36px;box-sizing:border-box"><p style="margin:0;font:600 22px Pop;color:${s.ink}">Operamos en</p><p style="margin:6px 0 0;font:300 20px/1.4 Pop;color:${s.soft}">Chile, EE. UU., Colombia,<br>México y Perú</p></div>`
  const stat = (x, v, l, sel) => `<div ${sel ? 'data-sel' : ''} style="position:absolute;left:${x}px;top:196px"><p style="margin:0;font:300 184px Bric;letter-spacing:-.05em;line-height:.9;color:${s.ink}">${v}</p><p style="margin:14px 0 0 8px;font:400 23px/1.35 Pop;color:${s.text}">${l}</p></div>`
  slides.push({ id: 'D6-clientes', title: 'Nuestros clientes', surface: 'paper', sel: { label: 'Growth', anchor: 'bottom-end', kind: 'object', scale: 1.2 }, body: `
<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${s.soft}">Clientes</p>
<p style="position:absolute;left:${M}px;top:200px;margin:0;font:300 40px/1.2 Pop;color:${s.text}">${ring(s)}¿Quién confía<br>&nbsp;&nbsp;&nbsp;&nbsp;en nosotros?</p>
<p style="position:absolute;left:${M - 6}px;top:318px;margin:0;font:760 116px Bric;line-height:.95;letter-spacing:-.045em;color:${s.ink}">Marcas<br>${answerHtml('líderes', s.accent)}</p>
${stat(760, '+127%', 'tráfico orgánico de <b style="font-weight:600">Sky</b><br>frente a LATAM Airlines', true)}
${stat(1290, '+180%', 'ventas digitales<br>de <b style="font-weight:600">Bresler</b>', false)}
${lines}${cells}${markets}${foot(s)}${indicator('paper', 5, 4)}` })
}

// 7 · PARTNERS (navy): los nueve programas que la línea permite declarar, en un solo tono y el mismo peso, 5 + 4
{
  const s = S.dark
  const P = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-26_firma-partners/logos/'
  const list = [['hubspot', 'hubspot-logotype.svg'], ['salesforce', 'salesforce.com_logo.svg'], ['adobe', 'adobe-logotype.svg'], ['microsoft', 'microsoft_logo_2012.svg'], ['aws', 'amazon_web_services_logo.svg'], ['googlecloud', 'google_cloud_logo.svg'], ['claude', 'claude-logotype.svg'], ['openai', 'openai_logo.svg'], ['byteplus', 'byteplus.png']]
  const logos = []
  for (const [id, f] of list) logos.push({ id, ...(await monoLogo(P + f, '#FFFFFF', 4600, 260, 96, true)) })
  const rows = [logos.slice(0, 5), logos.slice(5)]
  const html = rows.map((r, ri) => `<div style="position:absolute;left:${M}px;top:${[616, 806][ri]}px;width:${ri ? 1300 : 1640}px;height:110px;display:flex;justify-content:space-between;align-items:center">${r.map(l => `<img ${l.id === 'claude' ? 'data-sel' : ''} src="${l.src}" alt="${l.id}" style="width:${l.w}px;height:${l.h}px;display:block">`).join('')}</div>`).join('')
  slides.push({ id: 'D7-partners', title: 'Nuestros partners', surface: 'dark', sel: { label: 'Agentes IA', anchor: 'bottom-end', kind: 'object' }, body: `
${head(s, 'Partners', '¿Con quién construimos?', 'Con los grandes')}
<div style="position:absolute;left:${M}px;top:488px;display:flex;align-items:center;gap:26px"><img src="${svgUri(s.logo)}" alt="Efeonce" style="height:44px;display:block"><span style="width:2px;height:40px;background:${s.rule}"></span><span style="font:400 24px Pop;color:${SOFT}">Partner oficial de</span></div>
<p style="position:absolute;right:${M + 120}px;top:330px;width:560px;margin:0;font:300 26px/1.45 Pop;color:${s.text};text-align:right">Programas oficiales de los fabricantes con los que operamos tu crecimiento.</p>
<div style="position:absolute;left:${M}px;top:568px;width:1640px;border-top:2px solid ${s.rule}"></div>
${html}${indicator('dark', 5, 4)}` })
}

// 8 · STACK (navy): el mapa del stack. Greenhouse al centro («donde todo se mide»), las herramientas como satélites
// sobre una sola órbita, agrupadas por oficio (Crear · Medir · Operar); el arco largo en degradé sin esfera marca «Medir».
{
  const s = S.dark
  const groups = [
    ['Crear', -118, [['adobe-photoshop-isotype', 'Photoshop'], ['adobe-illustrator-isotype', 'Illustrator'], ['adobe-premiere-isotype', 'Premiere'], ['adobe-after-effects-isotype', 'After Effects'], ['adobe-firefly-isotype', 'Firefly'], ['higgsfield-isotype', 'Higgsfield'], ['magnific-isotype', 'Magnific'], ['frameio-isotype', 'Frame.io']]],
    ['Medir', 0, [['semrush-isotype', 'Semrush'], ['ahrefs-isotype', 'Ahrefs'], ['screaming-frog-isotype', 'Screaming Frog'], ['brand-visibility-grader-isotype', 'Visibility Grader']]],
    ['Operar', 95, [['notion-isotype', 'Notion'], ['slack-isotype', 'Slack'], ['teams-isotype', 'Teams'], ['microsoft-365-isotype', 'Microsoft 365']]]
  ]
  const cx = 1230, cy = 560, r = 330, step = 20, D = 88
  const pt = (a, rr = r) => [cx + rr * Math.cos(a * Math.PI / 180), cy + rr * Math.sin(a * Math.PI / 180)]
  const sats = [], labels = []
  let count = 0
  for (const [g, mid, tools] of groups) {
    const a0 = mid - (tools.length - 1) * step / 2
    for (const [k, [f, n]] of tools.entries()) {
      const [x, y] = pt(a0 + k * step)
      const src = await icon(CAT + `tools/${f}.svg`, 50)
      sats.push(`<div style="position:absolute;left:${x - D / 2}px;top:${y - D / 2}px;width:${D}px;height:${D}px;border-radius:50%;background:${C.paper};display:flex;align-items:center;justify-content:center;z-index:3;box-shadow:0 0 0 8px ${s.bg},0 18px 40px rgba(0,0,0,.35)"><img src="${src}" alt="${n}" style="width:50px;height:50px"></div>`)
      count++
    }
    const [lx, ly] = pt(mid, r + 118)
    labels.push(`<div style="position:absolute;left:${lx - 130}px;top:${ly - 30}px;width:260px;text-align:center;z-index:3"><p style="margin:0;font:600 30px Pop;color:${g === 'Medir' ? s.accent : s.ink}">${g}</p><p style="margin:2px 0 0;font:300 18px Pop;color:${s.text}">${tools.length} herramientas</p></div>`)
  }
  const [ax0, ay0] = pt(-96), [ax1, ay1] = pt(38)
  const orbit = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:1"><defs><linearGradient id="sg" gradientUnits="userSpaceOnUse" x1="${ax0}" y1="${ay0}" x2="${ax1}" y2="${ay1}"><stop offset="0" stop-color="${s.accent}" stop-opacity="0"/><stop offset="1" stop-color="${s.accent}"/></linearGradient><radialGradient id="sh"><stop offset="0" stop-color="${C.halo}" stop-opacity=".13"/><stop offset=".6" stop-color="${C.halo}" stop-opacity=".03"/><stop offset="1" stop-color="${C.halo}" stop-opacity="0"/></radialGradient></defs>
<circle cx="${cx}" cy="${cy}" r="${r * 1.2}" fill="url(#sh)"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.halo}" stroke-opacity=".22" stroke-width="3"/>
<path d="M ${ax0} ${ay0} A ${r} ${r} 0 0 1 ${ax1} ${ay1}" fill="none" stroke="url(#sg)" stroke-width="7" stroke-linecap="round"/></svg>`
  slides.push({ id: 'D8-stack', title: 'Nuestro stack', surface: 'dark', sel: { label: 'Growth', anchor: 'bottom-start', kind: 'text', scale: 1.1 }, body: `
${orbit}${sats.join('')}${labels.join('')}
<p style="position:absolute;left:${cx - 220}px;top:${cy - 96}px;width:440px;margin:0;font:300 22px Pop;color:${s.text};text-align:center;z-index:2">Todo se conecta en</p>
<p style="position:absolute;left:${cx - 220}px;top:${cy - 30}px;width:440px;margin:0;text-align:center;z-index:2"><span data-sel style="font:760 70px Bric;letter-spacing:-.03em;line-height:1;color:#fff">Greenhouse</span></p>
<p style="position:absolute;left:${cx - 220}px;top:${cy + 70}px;width:440px;margin:0;font:300 20px Pop;color:${SOFT};text-align:center;z-index:2">donde cada pieza se mide</p>
<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${s.soft}">Nuestro stack</p>
<p style="position:absolute;left:${M}px;top:200px;margin:0;font:300 40px/1.2 Pop;color:${SOFT}">${ring(s)}¿Con qué trabajamos?</p>
<p style="position:absolute;left:${M - 6}px;top:270px;margin:0;font:760 150px Bric;line-height:.95;letter-spacing:-.045em;color:#fff">Con lo<br>${answerHtml('mejor', s.accent)}</p>
<p style="position:absolute;left:${M}px;top:600px;width:440px;margin:0;font:300 26px/1.45 Pop;color:${s.text}">${count} herramientas por oficio, conectadas a nuestra plataforma para que cada pieza se pueda medir.</p>
${foot(s)}` })
}

// 8b · STACK con impacto (operador, 2026-09-27: «más impacto; es la lámina del stack que permite un delivery premium»).
// Una sola órbita, en perspectiva: las 16 herramientas como fichas de vidrio que giran alrededor de Greenhouse; las de
// atrás más chicas y tenues (pasan detrás del núcleo), las de adelante más grandes. El núcleo es un escenario de luz,
// no una esfera (la esfera es sólo de la voz). Oficios marcados sobre la órbita; la voz a la izquierda, fuera de ella.
{
  const s = S.dark
  const tools = [
    ['Crear', 'adobe-photoshop-isotype', 'Photoshop'], ['Crear', 'adobe-illustrator-isotype', 'Illustrator'], ['Crear', 'adobe-premiere-isotype', 'Premiere'], ['Crear', 'adobe-after-effects-isotype', 'After Effects'],
    ['Crear', 'adobe-firefly-isotype', 'Firefly'], ['Crear', 'higgsfield-isotype', 'Higgsfield'], ['Crear', 'magnific-isotype', 'Magnific'], ['Crear', 'frameio-isotype', 'Frame.io'],
    ['Medir', 'semrush-isotype', 'Semrush'], ['Medir', 'ahrefs-isotype', 'Ahrefs'], ['Medir', 'screaming-frog-isotype', 'Screaming Frog'], ['Medir', 'brand-visibility-grader-isotype', 'Visibility Grader'],
    ['Operar', 'notion-isotype', 'Notion'], ['Operar', 'slack-isotype', 'Slack'], ['Operar', 'teams-isotype', 'Teams'], ['Operar', 'microsoft-365-isotype', 'Microsoft 365']
  ]
  const cx = 1265, cy = 575, rx = 560, ry = 205, tilt = -9 * Math.PI / 180
  const P = t => { const x = rx * Math.cos(t), y = ry * Math.sin(t); return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt), (Math.sin(t) + 1) / 2] }
  // Reparto: Crear ocupa la mitad de atrás-izquierda y el frente izquierdo, Medir la derecha, Operar el frente.
  const t0 = 196 * Math.PI / 180, span = 2 * Math.PI
  // Reparto por LARGO de arco (no por ángulo): así las fichas no se amontonan en los extremos de la elipse.
  const N = 2000, cum = [0]
  for (let k = 1; k <= N; k++) { const a = P(t0 + span * (k - 1) / N), b = P(t0 + span * k / N); cum.push(cum[k - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])) }
  const tAt = u => { const L = cum[N] * u; let k = cum.findIndex(c => c >= L); if (k < 1) k = 1; return t0 + span * (k - 1 + (L - cum[k - 1]) / (cum[k] - cum[k - 1] || 1)) / N }
  const tiles = []
  for (const [i, [g, f, n]] of tools.entries()) {
    const t = tAt(i / tools.length)
    const [x, y, d] = P(t)
    const size = Math.round(76 + 46 * d), op = (0.6 + 0.4 * d).toFixed(2), blur = d < 0.35 ? (0.35 - d) * 5 : 0
    const src = await icon(CAT + `tools/${f}.svg`, 64)
    tiles.push({ d, html: `<div style="position:absolute;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.27)}px;background:linear-gradient(160deg,#ffffff 0%,#EEF3F7 55%,#DDE6EE 100%);box-shadow:0 0 0 1px rgba(255,255,255,.55) inset,0 ${Math.round(10 + 22 * d)}px ${Math.round(24 + 40 * d)}px rgba(0,8,20,.55),0 0 ${Math.round(30 * d)}px rgba(114,222,216,${(0.18 * d).toFixed(2)});display:flex;align-items:center;justify-content:center;opacity:${op};filter:blur(${blur.toFixed(2)}px);z-index:${d > 0.5 ? 6 : 2}"><img src="${src}" alt="${n}" style="width:${Math.round(size * 0.56)}px;height:${Math.round(size * 0.56)}px"></div>`, g, t })
  }
  // la órbita: mitad de atrás tenue (z1), mitad de adelante brillante (z5), arco de acento en «Medir»
  const pathOf = (a, b, n = 90) => Array.from({ length: n + 1 }, (_, k) => { const [x, y] = P(a + (b - a) * k / n); return `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}` }).join(' ')
  const iMed = tools.findIndex(x => x[0] === 'Medir')
  const tm0 = tAt((iMed - 0.5) / tools.length), tm1 = tAt((iMed + 3.5) / tools.length)
  const orbitBack = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:1"><defs><radialGradient id="stk-halo" cx="${cx}" cy="${cy}" r="640" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.halo}" stop-opacity=".20"/><stop offset=".45" stop-color="${C.halo}" stop-opacity=".06"/><stop offset="1" stop-color="${C.halo}" stop-opacity="0"/></radialGradient><radialGradient id="stk-stage" cx="${cx}" cy="${cy + 70}" r="260" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 ${(cy + 70) * 0.72}) scale(1 .28)"><stop offset="0" stop-color="${C.halo}" stop-opacity=".55"/><stop offset=".5" stop-color="${C.teal}" stop-opacity=".16"/><stop offset="1" stop-color="${C.teal}" stop-opacity="0"/></radialGradient><linearGradient id="stk-beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${C.halo}" stop-opacity=".22"/><stop offset="1" stop-color="${C.halo}" stop-opacity="0"/></linearGradient><filter id="stk-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter></defs>
<rect width="${W}" height="${H}" fill="url(#stk-halo)"/>
<ellipse cx="${cx}" cy="${cy + 70}" rx="260" ry="72" fill="url(#stk-stage)"/>
<ellipse cx="${cx}" cy="${cy + 70}" rx="230" ry="60" fill="none" stroke="${C.halo}" stroke-opacity=".55" stroke-width="2"/>
<path d="${pathOf(Math.PI, 2 * Math.PI)}" fill="none" stroke="${C.halo}" stroke-opacity=".22" stroke-width="2.5"/></svg>`
  const orbitFront = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:5;pointer-events:none"><defs><linearGradient id="stk-arc" gradientUnits="userSpaceOnUse" x1="${P(tm0)[0]}" y1="${P(tm0)[1]}" x2="${P(tm1)[0]}" y2="${P(tm1)[1]}"><stop offset="0" stop-color="${s.accent}" stop-opacity="0"/><stop offset="1" stop-color="${s.accent}"/></linearGradient></defs>
<path d="${pathOf(0, Math.PI)}" fill="none" stroke="${C.halo}" stroke-opacity=".5" stroke-width="3.5"/>
<path d="${pathOf(tm0, tm1)}" fill="none" stroke="${s.accent}" stroke-opacity=".35" stroke-width="16" filter="url(#stk-glow)"/>
<path d="${pathOf(tm0, tm1)}" fill="none" stroke="url(#stk-arc)" stroke-width="7" stroke-linecap="round"/></svg>`
  // etiquetas de oficio, fuera de la órbita
  const label = (g, t, push) => { const [px, py] = P(t), nx = px - cx, ny = py - cy, nl = Math.hypot(nx, ny), x = px + nx / nl * push - 0, y = py + ny / nl * push * 0.75 - 30; return `<div style="position:absolute;left:${x - 130}px;top:${y}px;width:260px;text-align:center;z-index:7"><p style="margin:0;font:600 28px Pop;color:${g === 'Medir' ? s.accent : s.ink}">${g}</p><p style="margin:0;font:300 18px Pop;color:${s.text}">${tools.filter(x => x[0] === g).length} herramientas</p></div>` }
  const tMid = g => { const ix = tools.map((x, i) => [x[0], i]).filter(x => x[0] === g).map(x => x[1]); return tAt((ix[0] + ix[ix.length - 1]) / 2 / tools.length) }
  const labels = label('Crear', tMid('Crear'), 120) + label('Medir', tMid('Medir'), 150) + label('Operar', tMid('Operar'), 120)
  const back = tiles.filter(x => x.d <= 0.5).map(x => x.html).join(''), front = tiles.filter(x => x.d > 0.5).map(x => x.html).join('')
  slides.push({ id: 'D8b-stack-impacto', title: 'Nuestro stack', surface: 'dark', body: `
${orbitBack}${back}
<p style="position:absolute;left:${cx - 260}px;top:${cy - 150}px;width:520px;margin:0;font:300 22px Pop;color:${s.text};text-align:center;z-index:4">Todo se conecta en</p>
<p style="position:absolute;left:${cx - 260}px;top:${cy - 104}px;width:520px;margin:0;text-align:center;z-index:4;font:760 92px Bric;letter-spacing:-.035em;line-height:1;color:#fff;text-shadow:0 0 40px rgba(114,222,216,.35)">Greenhouse</p>
<p style="position:absolute;left:${cx - 260}px;top:${cy + 4}px;width:520px;margin:0;font:300 21px Pop;color:${SOFT};text-align:center;z-index:4">donde cada pieza se mide</p>
${orbitFront}${front}${labels}
<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${s.soft}">Nuestro stack</p>
<p style="position:absolute;left:${M}px;top:200px;margin:0;font:300 40px/1.2 Pop;color:${SOFT}">${ring(s)}¿Con qué trabajamos?</p>
<p style="position:absolute;left:${M - 6}px;top:270px;margin:0;font:760 150px Bric;line-height:.95;letter-spacing:-.045em;color:#fff">Con lo<br>${answerHtml('mejor', s.accent)}</p>
<p style="position:absolute;left:${M}px;top:610px;width:430px;margin:0;font:300 26px/1.45 Pop;color:${s.text}"><b style="font-weight:600;color:#fff">16</b> herramientas en tres oficios, conectadas a una plataforma: así cada pieza sale con calidad y se mide.</p>
${foot(s)}` })
}

// 8c · STACK apilado: tres capas de vidrio (Operar · Medir · Crear) sobre la base de luz de Greenhouse, en isométrica.
// Una sola órbita, alrededor de la base. Las fichas van de pie sobre su capa, de atrás hacia adelante.
{
  const s = S.dark
  const layers = [
    ['Operar', 'lo que se coordina', [['notion-isotype', 'Notion'], ['slack-isotype', 'Slack'], ['teams-isotype', 'Teams'], ['microsoft-365-isotype', 'Microsoft 365']]],
    ['Medir', 'lo que se prueba', [['semrush-isotype', 'Semrush'], ['ahrefs-isotype', 'Ahrefs'], ['screaming-frog-isotype', 'Screaming Frog'], ['brand-visibility-grader-isotype', 'Visibility Grader']]],
    ['Crear', 'lo que se produce', [['adobe-photoshop-isotype', 'Photoshop'], ['adobe-illustrator-isotype', 'Illustrator'], ['adobe-premiere-isotype', 'Premiere'], ['adobe-after-effects-isotype', 'After Effects'], ['adobe-firefly-isotype', 'Firefly'], ['higgsfield-isotype', 'Higgsfield'], ['magnific-isotype', 'Magnific'], ['frameio-isotype', 'Frame.io']]]
  ]
  const U = 110, cx = 1350, cy = 548, c30 = Math.cos(Math.PI / 6), s30 = 0.5
  const iso = (u, v, h = 0) => [cx + (u - v) * c30 * U, cy + (u + v) * s30 * U - h]
  const poly = pts => pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')
  const slab = (u0, v0, u1, v1, h, th, top, side, stroke, id) => {
    const A = iso(u0, v0, h), B = iso(u1, v0, h), Cc = iso(u1, v1, h), D = iso(u0, v1, h)
    const B2 = iso(u1, v0, h - th), C2 = iso(u1, v1, h - th), D2 = iso(u0, v1, h - th)
    return `<polygon points="${poly([D, Cc, C2, D2])}" fill="${side}" opacity=".95"/><polygon points="${poly([Cc, B, B2, C2])}" fill="${side}" opacity=".75"/><polygon points="${poly([A, B, Cc, D])}" fill="${top}" stroke="${stroke}" stroke-width="2"/>`
  }
  const HS = [160, 320, 480] // alturas de Operar, Medir, Crear sobre la base
  let svgBack = '', html = [], labels = ''
  // base: Greenhouse, más ancha, con la órbita alrededor
  const bu0 = -0.6, bv0 = -0.6, bu1 = 4.6, bv1 = 2.6
  const [ox, oy] = iso(2, 1, 0)
  svgBack += `<ellipse cx="${ox}" cy="${oy}" rx="620" ry="250" fill="url(#stk3-floor)"/>`
  svgBack += slab(bu0, bv0, bu1, bv1, 0, 22, 'url(#stk3-base)', '#0B2A40', 'rgba(114,222,216,.8)', 'base')
  // pilares de luz en las cuatro esquinas de las capas
  for (const [u, v] of [[0, 0], [4, 0], [4, 2], [0, 2]]) { const [x0, y0] = iso(u, v, 0), [x1, y1] = iso(u, v, HS[2]); svgBack += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="url(#stk3-pillar)" stroke-width="2"/>` }
  // Fichas oscuras con el fondo nativo de la app para los isotipos que se pierden sobre blanco (operador, 2026-09-27).
  const DARK = { 'adobe-photoshop-isotype': '#001E36', 'adobe-illustrator-isotype': '#330000', 'adobe-premiere-isotype': '#00005B', 'adobe-after-effects-isotype': '#00005B', 'higgsfield-isotype': '#0A0A0A' }
  let count = 0
  for (const [li, [name, what, tools]] of layers.entries()) {
    const h = HS[li]
    svgBack += slab(0, 0, 4, 2, h, 12, 'rgba(114,222,216,.10)', 'rgba(8,40,62,.9)', 'rgba(114,222,216,.55)', name)
    const cols = 4, rows = Math.ceil(tools.length / cols)
    const cells = tools.map((t, k) => { const r = rows === 1 ? 1 : (k < cols ? 0.5 : 1.5), c = k % cols + 0.5; return { t, u: c, v: r } }).sort((a, b) => (a.u + a.v) - (b.u + b.v))
    for (const { t: [f, n], u, v } of cells) {
      const [x, y] = iso(u, v, h), size = 70
      const src = await icon(CAT + `tools/${f}.svg`, 56)
      html.push({ z: 10 + li * 20 + Math.round((u + v) * 2), s: `<div style="position:absolute;left:${x - size / 2}px;top:${y - size - 4}px;width:${size}px;height:${size}px;border-radius:19px;background:${DARK[f] ? `linear-gradient(160deg,${DARK[f]} 0%,${DARK[f]} 70%,#000 100%)` : 'linear-gradient(160deg,#ffffff 0%,#EEF3F7 60%,#D9E3EC 100%)'};box-shadow:0 0 0 1px ${DARK[f] ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.6)'} inset,0 14px 26px rgba(0,8,20,.55),0 0 22px rgba(114,222,216,.18);display:flex;align-items:center;justify-content:center;z-index:ZZ"><img src="${src}" alt="${n}" style="width:40px;height:40px"></div>` })
      count++
    }
    // etiqueta a la izquierda de la capa, con su guía
    const [lx, ly] = iso(0, 2, h - 6)
    labels += `<div style="position:absolute;left:${lx - 430}px;top:${ly - 30}px;width:350px;text-align:right;white-space:nowrap;z-index:90"><p style="margin:0;font:600 28px Pop;color:${name === 'Medir' ? s.accent : s.ink}">${name}</p><p style="margin:0;font:300 18px Pop;color:${s.text}">${tools.length} herramientas · ${what}</p></div>`
    svgBack += `<line x1="${lx - 70}" y1="${ly - 8}" x2="${lx - 8}" y2="${ly - 8}" stroke="${s.rule}" stroke-width="2"/>`
  }
  // la órbita alrededor de la base (una por lámina), con el arco de acento
  const orb = (t) => { const [x, y] = iso(2 + 3.6 * Math.cos(t), 1 + 3.6 * Math.sin(t), -11); return [x, y] }
  const opath = (a, b, n = 120) => Array.from({ length: n + 1 }, (_, k) => { const [x, y] = orb(a + (b - a) * k / n); return `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}` }).join(' ')
  const svgFront = `<path d="${opath(-0.25 * Math.PI, 0.75 * Math.PI)}" fill="none" stroke="${C.halo}" stroke-opacity=".45" stroke-width="3"/><path d="${opath(0.05 * Math.PI, 0.55 * Math.PI)}" fill="none" stroke="${s.accent}" stroke-width="7" stroke-linecap="round" filter="url(#stk3-glow)" opacity=".5"/><path d="${opath(0.05 * Math.PI, 0.55 * Math.PI)}" fill="none" stroke="${s.accent}" stroke-width="5" stroke-linecap="round"/>`
  const svgOrbitBack = `<path d="${opath(0.75 * Math.PI, 1.75 * Math.PI)}" fill="none" stroke="${C.halo}" stroke-opacity=".2" stroke-width="2.5"/>`
  const defs = `<defs><radialGradient id="stk3-floor"><stop offset="0" stop-color="${C.halo}" stop-opacity=".22"/><stop offset=".6" stop-color="${C.halo}" stop-opacity=".05"/><stop offset="1" stop-color="${C.halo}" stop-opacity="0"/></radialGradient><linearGradient id="stk3-base" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1E6F77"/><stop offset=".55" stop-color="#0E4A5A"/><stop offset="1" stop-color="#0A3248"/></linearGradient><linearGradient id="stk3-pillar" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${C.halo}" stop-opacity=".7"/><stop offset="1" stop-color="${C.halo}" stop-opacity=".08"/></linearGradient><filter id="stk3-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter><radialGradient id="stk3-halo" cx="${cx}" cy="${cy - 250}" r="720" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.halo}" stop-opacity=".16"/><stop offset=".5" stop-color="${C.halo}" stop-opacity=".04"/><stop offset="1" stop-color="${C.halo}" stop-opacity="0"/></radialGradient></defs>`
  // el nombre de la base, escrito sobre su canto frontal
  const [gx, gy] = iso(bu0, bv1, 0)
  const tiles = html.map(t => t.s.replace('ZZ', String(t.z))).join('')
  slides.push({ id: 'D8c-stack-capas', title: 'Nuestro stack', surface: 'dark', body: `
<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:1">${defs}<rect width="${W}" height="${H}" fill="url(#stk3-halo)"/>${svgOrbitBack}${svgBack}</svg>
${tiles}
<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:80;pointer-events:none">${defs}${svgFront}</svg>
${labels}
<div style="position:absolute;left:${gx - 590}px;top:${gy - 70}px;width:480px;text-align:right;z-index:90"><p style="margin:0;font:300 20px Pop;color:${s.text}">Todo se conecta en</p><img src="${svgUri(s.logo)}" alt="Efeonce" style="display:block;margin:10px 0 10px auto;width:400px;height:auto;filter:drop-shadow(0 0 24px rgba(114,222,216,.35))"><p style="margin:2px 0 0;font:300 18px Pop;color:${SOFT}">donde cada pieza se mide</p></div>
<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:89;pointer-events:none"><line x1="${gx - 100}" y1="${gy + 10}" x2="${gx - 8}" y2="${gy + 10}" stroke="${C.halo}" stroke-opacity=".7" stroke-width="2"/></svg>
<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${s.soft}">Nuestro stack</p>
<p style="position:absolute;left:${M}px;top:200px;margin:0;font:300 40px/1.2 Pop;color:${SOFT}">${ring(s)}¿Con qué trabajamos?</p>
<p style="position:absolute;left:${M - 6}px;top:270px;margin:0;font:760 150px Bric;line-height:.95;letter-spacing:-.045em;color:#fff">Con lo<br>${answerHtml('mejor', s.accent)}</p>
<p style="position:absolute;left:${M}px;top:610px;width:330px;margin:0;font:300 26px/1.45 Pop;color:${s.text}"><b style="font-weight:600;color:#fff">${count}</b> herramientas en tres capas, conectadas en Efeonce: así cada pieza sale con calidad y se mide.</p>
${foot(s)}` })
}

// 4b · TU DÍA A DÍA con las herramientas (operador, 2026-09-27): las revisiones de piezas en Frame.io, los proyectos y
// tareas en Notion, las reuniones en Teams, la reportería automatizada con Efeonce Insights y todo en el panel propio
// de Greenhouse. Una sola órbita alrededor del panel; cada momento es una parada con su herramienta.
{
  const s = S.dark
  const panel = await jpg(CAT + 'product/greenhouse-seo-dashboard.png', 1040, 621)
  const ghIso = svgUri(R + 'public/images/greenhouse/SVG/negative-isotipo-green.svg')
  const stops = [
    { a: -142, f: 'teams-isotype', n: 'Microsoft Teams', t: 'Nos reunimos', d: 'las reuniones de seguimiento', side: 'start' },
    { a: -38, f: 'notion-isotype', n: 'Notion', t: 'Proyectos y tareas', d: 'el plan al día y a la vista', side: 'end' },
    { a: 38, f: 'frameio-isotype', n: 'Frame.io', t: 'Revisas las piezas', d: 'comentas sobre la pieza visual', side: 'end' },
    { a: 142, f: null, n: 'Efeonce Insights', t: 'Reportes automáticos', d: 'sin armar informes a mano', side: 'start' }
  ]
  const cx = 1165, cy = 560, r = 340, D = 100
  const pt = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]
  let tiles = ''
  for (const st of stops) {
    const [x, y] = pt(st.a)
    const img = st.f ? `<img src="${await icon(CAT + `tools/${st.f}.svg`, 60)}" alt="${st.n}" style="width:58px;height:58px">` : `<img src="${svgUri(BA + 'efeonce-isotype-negative.svg')}" alt="Efeonce Insights" style="width:62px;height:auto">`
    const bg = st.f ? 'linear-gradient(160deg,#ffffff 0%,#EEF3F7 60%,#D9E3EC 100%)' : `linear-gradient(160deg,#0E3A57 0%,${C.dark} 100%)`
    tiles += `<div style="position:absolute;left:${x - D / 2}px;top:${y - D / 2}px;width:${D}px;height:${D}px;border-radius:28px;background:${bg};box-shadow:0 0 0 1px rgba(255,255,255,${st.f ? '.6' : '.25'}) inset,0 16px 34px rgba(0,8,20,.55),0 0 26px rgba(114,222,216,.22);display:flex;align-items:center;justify-content:center;z-index:5">${img}</div>`
    const lx = st.side === 'end' ? x + D / 2 + 22 : x - D / 2 - 22 - 300
    tiles += `<div style="position:absolute;left:${lx}px;top:${y - 44}px;width:300px;text-align:${st.side === 'end' ? 'left' : 'right'};z-index:5"><p style="margin:0;font:500 15px Pop;letter-spacing:.12em;text-transform:uppercase;color:${s.soft}">${st.n}</p><p style="margin:4px 0 0;font:600 28px Pop;color:#fff;white-space:nowrap">${st.t}</p><p style="margin:2px 0 0;font:300 19px Pop;color:${s.text};white-space:nowrap">${st.d}</p></div>`
  }
  const [ax0, ay0] = pt(-142), [ax1, ay1] = pt(142)
  const orbit = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:1"><defs><radialGradient id="dd-h" cx="${cx}" cy="${cy}" r="560" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.halo}" stop-opacity=".16"/><stop offset=".6" stop-color="${C.halo}" stop-opacity=".04"/><stop offset="1" stop-color="${C.halo}" stop-opacity="0"/></radialGradient><linearGradient id="dd-a" gradientUnits="userSpaceOnUse" x1="${ax0}" y1="${ay0}" x2="${ax1}" y2="${ay1}"><stop offset="0" stop-color="${s.accent}" stop-opacity=".15"/><stop offset="1" stop-color="${s.accent}"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#dd-h)"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.halo}" stroke-opacity=".22" stroke-width="3"/>
<path d="M ${ax0} ${ay0} A ${r} ${r} 0 1 1 ${ax1} ${ay1}" fill="none" stroke="url(#dd-a)" stroke-width="7" stroke-linecap="round"/></svg>`
  slides.push({ id: 'D4b-dia-herramientas', title: 'Tu día a día con Efeonce', surface: 'dark', body: `
${orbit}
<div style="position:absolute;left:${cx - 260}px;top:${cy - 190}px;width:520px;z-index:3">
<div style="width:520px;height:310px;border-radius:18px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.18),0 30px 70px rgba(0,8,20,.6),0 0 60px rgba(114,222,216,.22)"><img src="${panel}" alt="Panel de Greenhouse con la visibilidad SEO del cliente en vivo" style="width:520px;height:310px;display:block"></div>
<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:22px"><img src="${ghIso}" alt="" style="height:30px"><p style="margin:0;font:600 26px Pop;color:#fff">Tu panel en Greenhouse</p></div>
<p style="margin:4px 0 0;text-align:center;font:300 19px Pop;color:${s.text}">todo en un solo lugar, en vivo</p>
</div>
${tiles}
<p style="position:absolute;left:${M}px;top:110px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${s.soft}">Tu día a día con Efeonce</p>
<p style="position:absolute;left:${M}px;top:200px;margin:0;font:300 40px/1.2 Pop;color:${SOFT}">${ring(s)}¿Cómo trabajamos<br><span style="padding-left:1.04em">contigo?</span></p>
<p style="position:absolute;left:${M - 6}px;top:330px;margin:0;font:760 170px Bric;line-height:.95;letter-spacing:-.045em;color:#fff">${answerHtml('Así', s.accent)}</p>
<p style="position:absolute;left:${M}px;top:560px;width:360px;margin:0;font:300 26px/1.45 Pop;color:${s.text}">Cada cosa en su herramienta y <b style="font-weight:600;color:#fff">todo</b> a la vista en tu panel, sin esperar el informe.</p>
${foot(s)}` })
}

const css = `<style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-Regular.ttf')});font-weight:400}@font-face{font-family:Pop;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}@font-face{font-family:Poppins;src:url(${f64('Poppins-Bold.ttf')});font-weight:700}body{margin:0}[data-sel]{position:relative;z-index:2}</style>`
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: W, height: H } })
const only = process.env.ONLY?.split(',')
for (const sl of slides) {
  if (only && !only.includes(sl.id)) continue
  const s = S[sl.surface]
  const wrap = x => `<html><head>${css}</head><body><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${s.bg}">${sl.body}${x}</div></body></html>`
  await pg.setContent(wrap(''), { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready)
  const box = await pg.evaluate(() => { const e = document.querySelector('[data-sel]'); if (!e) return null; let r; if (e.tagName === 'SPAN' || e.tagName === 'P') { const g = document.createRange(); g.selectNodeContents(e); const b = g.getBoundingClientRect(); const pad = b.height * 0.16; r = { left: b.left, right: b.right, top: b.top + pad, bottom: b.bottom - pad * 0.6 } } else r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom } })
  let extra = ''
  if (box && sl.sel) {
    const kind = sl.sel.kind ?? 'text'
    const m = resolveCollaborationSelectionIntent({ targetId: 't', targetKind: kind, variant: 'eight-handles', padding: 'standard', overlay: kind === 'text' ? 'subtle' : 'none', cursors: [{ id: 'c', kind: 'collaborator', targetId: 't', anchor: sl.sel.anchor, action: 'select', label: sl.sel.label, participantKind: 'department' }] })
    const rs = renderCollaborationSelection({ manifest: m, targetBounds: box, canvas: { width: W, height: H }, measureLabel: (l, z) => l.length * z * 0.62, presentation: { collaboratorScale: sl.sel.scale ?? 1.25 } })
    if (!rs.evidence.withinCanvas) console.warn(sl.id, 'selección fuera del lienzo')
    const svg = (x, z) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:${z};pointer-events:none">${x}</svg>`
    extra = svg(rs.underlay, 1) + svg(rs.overlay, 3)
    await pg.setContent(wrap(extra), { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready)
  }
  await pg.screenshot({ path: `${OUT}${sl.id}.png` })
  await sharp(`${OUT}${sl.id}.png`).jpeg({ quality: 88 }).toFile(`${OUT}${sl.id}.jpg`)
  console.log('ok', sl.id)
}
await b.close()
