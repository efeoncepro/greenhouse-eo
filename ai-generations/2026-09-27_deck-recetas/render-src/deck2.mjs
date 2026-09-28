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

const R = '/Users/jreye/Documents/greenhouse-eo/', OUT = new URL('./out-deck2/', import.meta.url).pathname
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


// ── Segunda tanda del deck interior: seguridad, caso, plan, gráfico, testimonio, agenda, próximos pasos, fuerza
// híbrida, BeX, Grader, líneas de servicio, por qué elegirnos y las cuatro propuestas (con el acento de su línea).
const L = Object.fromEntries(GL.lines.map(l => [l.key, l]))
const lineDark = key => ({ ...S.dark, accent: L[key].accentOnDark }) // fondo Efeonce siempre; sólo cambia el acento (operador, 2026-09-26)
const PH = f => AI + f
const PHOTOS = {
  T1: '2026-09-26_deck-triptico-v2/plates/T1-escucha.png', T2: '2026-09-26_deck-triptico-v2/plates/T2-crea.png', T3: '2026-09-26_deck-triptico-v2/plates/T3-mide.png',
  H1b: '2026-09-26_web-hero/plates/H1b-estratega-uniforme.png', D1: '2026-09-26_ooh-caminero-lente/plates/D1-mupi-rodaje-en-vivo.png',
  D2: '2026-09-26_ooh-caminero-lente/plates/D2-led-medicion.png', D3: '2026-09-26_ooh-caminero-lente/plates/D3-led-medicion-mira-izquierda.png',
  SE1: '2026-09-28_deck-seo-aeo/plates/SE1-te-encuentran-isotipo.png', P2: '2026-09-26_deck-web-motion/plates/P2-web-hero-taller.png', M2: '2026-09-26_web-movil/plates/M2-voltea-chaqueta.png'
}
const eyebrow = (s, t, top = 110) => `<p style="position:absolute;left:${M}px;top:${top}px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${s.soft}">${t}</p>`
const question = (s, q, top = 200, dark = true) => `<p style="position:absolute;left:${M}px;top:${top}px;margin:0;font:300 40px/1.2 Pop;color:${dark ? SOFT : s.text}">${ring(s)}${q}</p>`
const answer = (s, lines, top, size, attrs = '') => `<p ${attrs} style="position:absolute;left:${M - 6}px;top:${top}px;margin:0;font:760 ${size}px Bric;line-height:.95;letter-spacing:-.045em;color:${s.ink};white-space:nowrap">${lines.slice(0, -1).map(l => l + '<br>').join('')}${answerHtml(lines.at(-1), s.accent)}</p>`
// lente con su órbita (anillo con aire, arco corto arriba a la izquierda 200°–250° y la esfera en la punta)
function lens(s, src, cx, cy, rp) {
  const r = rp * (1 + GL.orbit.ringAirRatio), pt = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]
  const [x0, y0] = pt(200), [x1, y1] = pt(250)
  return `<img src="${src}" alt="" style="position:absolute;left:${cx - rp}px;top:${cy - rp}px;width:${rp * 2}px;height:${rp * 2}px;border-radius:50%;object-fit:cover;z-index:1">
<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:1"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.halo}" stroke-opacity=".28" stroke-width="3"/><path d="M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}" fill="none" stroke="${s.accent}" stroke-width="6" stroke-linecap="round"/><circle cx="${x1}" cy="${y1}" r="12" fill="${s.accent}"/></svg>`
}
const ctaBtn = (s, x, y, t, desc) => `<a data-cta href="#" style="position:absolute;left:${x}px;top:${y}px;padding:22px 38px;border-radius:14px;background:${s.accent};color:${C.dark};font:600 24px Pop;text-decoration:none;z-index:4;white-space:nowrap">${t}</a>
<p data-desc style="position:absolute;left:${x}px;top:0;margin:0;font:300 20px/1.4 Pop;color:${s === S.paper ? s.soft : SOFT};z-index:4">${desc}</p>`

const slides = []

// E1 · POR QUÉ ES SEGURO (papel): cada riesgo con su cobertura; la selección toma el primer paso chico
{
  const s = S.paper
  const rows = [
    ['Que no encajemos', 'Sample Sprint', 'Un piloto pagado, acotado y gobernado, con informe de cierre y una decisión clara.'],
    ['Que se atrase', 'Métricas con umbral', 'OTD ≥ 90 % y FTR ≥ 80 %, medidos cada semana y visibles en tu portal.'],
    ['Depender de una persona', 'Traspaso documentado', 'Reemplazo formal del equipo, con el contexto escrito y sin perder memoria.'],
    ['No ver qué pasa', 'Transparencia radical', 'La operación en vivo en Greenhouse: lo que pedimos, lo que entregamos y cuánto demora.']
  ]
  const x0 = 800, top = 250, rh = 170
  const html = rows.map(([risk, name, how], i) => `<div ${i === 0 ? 'data-sel' : ''} style="position:absolute;left:${x0}px;top:${top + i * rh}px;width:980px;height:${rh - 20}px;display:grid;grid-template-columns:300px 1fr;gap:40px;border-top:2px solid ${s.rule};padding-top:22px;box-sizing:border-box">
<p style="margin:0;font:300 26px/1.3 Pop;color:${s.soft}">${risk}</p>
<div><p style="margin:0;font:760 44px Bric;letter-spacing:-.025em;line-height:1;color:${s.ink}">${name}</p><p style="margin:10px 0 0;font:300 22px/1.4 Pop;color:${s.text}">${how}</p></div></div>`).join('')
  slides.push({ id: 'E1-seguro', surface: s, sel: { label: 'Cliente', anchor: 'top-start', kind: 'object', scale: 1.15 }, body: `
${eyebrow(s, 'Riesgo controlado')}${question(s, '¿Y si no funciona?', 200, false)}
${answer(s, ['Empiezas', 'chico'], 270, 132)}
<p style="position:absolute;left:${M}px;top:560px;width:520px;margin:0;font:300 26px/1.45 Pop;color:${s.text}">Cada riesgo tiene su cobertura escrita. Y el primer paso es un piloto, no un contrato largo.</p>
<p style="position:absolute;left:${x0}px;top:200px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${s.soft}">El riesgo</p><p style="position:absolute;left:${x0 + 340}px;top:200px;margin:0;font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${s.soft}">Cómo lo cubrimos</p>
${html}${foot(s)}${indicator('paper', 5, 5)}` })
}

// E2 · CASO DE ÉXITO (sección partida aprobada: panel de papel con una esquina de 300 px; foto a sangre a la derecha)
{
  const s = S.paper
  const photo = await jpg(PH(PHOTOS.T2), 1260, 1080)
  const sky = await monoLogo(CAT + 'clients/sky.svg', C.navy, 5200, 200, 70)
  const stats = [['+2.000', 'piezas aprobadas'], ['39', 'campañas'], ['88 %', 'entregas a tiempo'], ['−25 %', 'tiempo de producción']]
  slides.push({ id: 'E2-caso', surface: s, sel: { label: 'Performance', anchor: 'bottom-end', kind: 'object', scale: 1.15 }, body: `
<img src="${photo}" alt="El equipo creativo arma la pared de pruebas" style="position:absolute;left:660px;top:0;width:1260px;height:1080px">
<div style="position:absolute;left:0;top:0;width:1000px;height:1080px;background:${C.paper};border-radius:0 300px 0 0"></div>
<div style="position:absolute;left:${M}px;top:104px;display:flex;align-items:center;gap:22px"><img src="${sky.src}" alt="Sky Airlines" style="width:${sky.w}px;height:${sky.h}px"><span style="font:500 16px Pop;letter-spacing:.14em;text-transform:uppercase;color:${s.soft}">Caso · 12 meses</span></div>
${question(s, '¿Qué cambió con Sky?', 210, false)}
${answer(s, ['Más rápido'], 280, 124)}
<div style="position:absolute;left:${M}px;top:470px;width:760px;display:grid;grid-template-columns:1fr 1fr;gap:34px 50px">
${stats.map(([v, l], i) => `<div ${i === 3 ? 'data-sel' : ''} style="border-top:2px solid ${s.rule};padding-top:16px"><p style="margin:0;font:300 104px Bric;letter-spacing:-.045em;line-height:.95;color:${s.ink}">${v}</p><p style="margin:8px 0 0;font:400 22px Pop;color:${s.text}">${l}</p></div>`).join('')}
</div>
<p style="position:absolute;left:${M}px;top:${H - 142}px;width:760px;margin:0;font:400 16px/1.4 Pop;color:${s.soft}">Métricas de entrega del equipo creativo de Sky Airlines en 12 meses, en 5 mercados. Caso publicado.</p>
${foot(s)}` })
}

// E3 · PLAN DE 90 DÍAS (navy): la órbita del motor mide el plan en tres tramos; vamos en el primero
{
  const s = S.dark
  const cx = 1050, cy = 600, r = 250
  const m = resolveGraphicLineIntent({ canvas: { width: W, height: H, line: 'growth', surface: 'dark', channel: 'screen' }, elements: [{ kind: 'progress', id: 'plan', sections: 3, current: 1, region: 'upper-end' }] })
  const el = m.elements[0]; el.ring = { ...el.ring, strokePx: 3, opacity: 0.3 }; el.arc = { ...el.arc, strokePx: 10 }; el.sphere = { ...el.sphere, radiusPx: 16 }
  const orbit = '<div style="position:absolute;inset:0;z-index:1">' + paintGraphicLine(m, { background: false, idPrefix: 'plan', circles: { plan: { cx, cy, r } } }).svg + '</div>'
  const pt = (a, rr) => [cx + rr * Math.cos(a * Math.PI / 180), cy + rr * Math.sin(a * Math.PI / 180)]
  const phases = [[-30, 'Días 1–30', 'Arranque', 'Auditoría, línea base y primeras piezas: movimiento desde la primera semana.'], [90, 'Días 31–60', 'Ritmo pleno', 'El ciclo mensual completo: planificar, producir, entregar y medir.'], [210, 'Días 61–90', 'Evidencia', 'Primera evidencia medible y primer informe de resultados.']]
  const nums = phases.map(([a], i) => { const [x, y] = pt(a, r + 44); return `<p style="position:absolute;left:${x - 20}px;top:${y - 20}px;width:40px;margin:0;text-align:center;font:600 26px Pop;color:${i === 0 ? s.accent : SOFT};z-index:2">${i + 1}</p>` }).join('')
  const legend = phases.map(([a, d, t, desc], i) => `<div ${i === 0 ? 'data-sel' : ''} style="position:absolute;left:1380px;top:${300 + i * 210}px;width:280px;z-index:2"><p style="margin:0;font:600 17px Pop;letter-spacing:.12em;text-transform:uppercase;color:${i === 0 ? s.accent : SOFT}">${i + 1} · ${d}</p><p style="margin:6px 0 0;font:760 44px Bric;letter-spacing:-.03em;line-height:1;color:#fff">${t}</p><p style="margin:10px 0 0;font:300 19px/1.4 Pop;color:${s.text}">${desc}</p></div>`).join('')
  slides.push({ id: 'E3-plan', surface: s, sel: { label: 'Equipo', anchor: 'bottom-end', kind: 'group', scale: 1.05 }, body: `
${orbit}${nums}
<p style="position:absolute;left:${cx - 160}px;top:${cy - 76}px;width:320px;margin:0;text-align:center;font:300 150px Bric;letter-spacing:-.05em;line-height:1;color:#fff;z-index:2">90</p>
<p style="position:absolute;left:${cx - 160}px;top:${cy + 76}px;width:320px;margin:0;text-align:center;font:300 22px Pop;color:${s.text};z-index:2">días a la primera evidencia</p>
${legend}
${eyebrow(s, 'Plan de trabajo')}${question(s, '¿Qué pasa al empezar?')}
${answer(s, ['Movimiento'], 270, 104)}
<p style="position:absolute;left:${M}px;top:430px;width:460px;margin:0;font:300 25px/1.45 Pop;color:${s.text}">El arco mide el plan: tres tramos de 30 días y hoy vamos en el primero.</p>
${foot(s)}` })
}

// E4 · GRÁFICO (papel): el dato manda. Tiempo de producción en índice (antes = 100) y la anotación en el gráfico
{
  const s = S.paper
  const x0 = 780, y0 = 330, maxW = 900, bh = 120
  const bars = [['Antes', 100, '#C9D2DC', s.text], ['Con Efeonce', 75, C.navy, '#fff']]
  const html = bars.map(([l, v, fill, ink], i) => `<p style="position:absolute;left:${x0}px;top:${y0 + i * 210 - 44}px;margin:0;font:500 22px Pop;color:${s.text}">${l}</p>
<div ${i === 1 ? 'data-sel' : ''} style="position:absolute;left:${x0}px;top:${y0 + i * 210}px;width:${maxW * v / 100}px;height:${bh}px;background:${fill};border-radius:0 10px 10px 0;display:flex;align-items:center;justify-content:flex-end;padding-right:28px;box-sizing:border-box"><span style="font:300 64px Bric;letter-spacing:-.03em;color:${ink}">${v}</span></div>`).join('')
  const kpis = [['+2.000', 'piezas aprobadas'], ['39', 'campañas'], ['0,12', 'ajustes por pieza'], ['5', 'mercados']]
  slides.push({ id: 'E4-grafico', surface: s, sel: { label: 'Performance', anchor: 'bottom-end', kind: 'object', scale: 1.1 }, body: `
${eyebrow(s, 'Resultados · Sky Airlines')}${question(s, '¿Cuánto más rápido?', 200, false)}
${answer(s, ['Un cuarto'], 270, 120)}
<p style="position:absolute;left:${M}px;top:420px;width:520px;margin:0;font:300 25px/1.45 Pop;color:${s.text}">El tiempo de producción bajó 25 % en 12 meses de operación con el equipo creativo.</p>
${html}
<div style="position:absolute;left:${x0 + maxW * 0.75 + 30}px;top:${y0 + 210}px;height:${bh}px;display:flex;align-items:center;gap:18px"><span style="width:70px;border-top:2px dashed ${s.ink}"></span><span style="font:760 64px Bric;letter-spacing:-.03em;color:${s.accent}">−25 %</span></div>
<p style="position:absolute;left:${x0}px;top:${y0 + 360}px;margin:0;font:400 16px Pop;color:${s.soft}">Tiempo de producción por campaña, en índice (antes = 100).</p>
<div style="position:absolute;left:${M}px;top:800px;width:1640px;display:grid;grid-template-columns:repeat(4,1fr);border-top:2px solid ${s.rule}">
${kpis.map(([v, l]) => `<div style="padding-top:18px"><p style="margin:0;font:300 64px Bric;letter-spacing:-.03em;line-height:1;color:${s.ink}">${v}</p><p style="margin:6px 0 0;font:400 20px Pop;color:${s.text}">${l}</p></div>`).join('')}
</div>
<p style="position:absolute;left:${M + 360}px;top:${H - 80}px;margin:0;font:400 15px Pop;color:${s.soft}">Fuente: caso publicado de Sky Airlines, métricas de entrega de 12 meses.</p>
${foot(s)}${indicator('paper', 5, 3)}` })
}

// E5 · TESTIMONIO (navy): la cita real, textual y publicada; la selección toma lo que más importa
{
  const s = S.dark
  const sky = await monoLogo(CAT + 'clients/sky.svg', '#FFFFFF', 5200, 200, 64)
  slides.push({ id: 'E5-testimonio', surface: s, sel: { label: 'Cliente', anchor: 'bottom-end', kind: 'text', scale: 1.2 }, body: `
${eyebrow(s, 'En palabras de Sky')}${question(s, '¿Cómo es trabajar con nosotros?')}
<p style="position:absolute;left:${M - 10}px;top:250px;margin:0;font:300 220px Bric;line-height:1;color:${s.accent}">«</p>
<p style="position:absolute;left:${M}px;top:430px;width:1500px;margin:0;font:300 54px/1.32 Pop;letter-spacing:-.01em;color:#fff">Hemos mejorado muchísimo en cuanto a las herramientas tecnológicas. Siento que hemos podido, gracias a ellos, <span data-sel style="font-weight:600">agilizar mucho la carga de trabajo</span>.</p>
<div style="position:absolute;left:${M}px;top:800px;display:flex;align-items:center;gap:28px"><img src="${sky.src}" alt="Sky Airlines" style="width:${sky.w}px;height:${sky.h}px"><span style="width:2px;height:48px;background:${s.rule}"></span><div><p style="margin:0;font:600 26px Pop;color:#fff">Adriana Contreras</p><p style="margin:4px 0 0;font:300 20px Pop;color:${s.text}">Team SKY</p></div></div>
${foot(s)}${indicator('dark', 5, 3)}` })
}

// E5b · TESTIMONIO con impacto (operador, 2026-09-27: «hay que mejorarlo, no se ve bien»). La frase que importa es la
// respuesta, a escala de titular y entre comillas; la cita completa, textual, debajo como contexto; a la derecha, la
// prueba del mismo caso publicado (tres cifras con fuente). La selección toma la frase del cliente.
{
  const s = S.dark
  const sky = await monoLogo(CAT + 'clients/sky.svg', '#FFFFFF', 5200, 200, 64)
  const proof = [['+2.000', 'piezas aprobadas'], ['88 %', 'entregadas a tiempo'], ['−25 %', 'tiempo de producción']]
  slides.push({ id: 'E5b-testimonio', surface: s, sel: { label: 'Cliente', anchor: 'top-end', kind: 'text', scale: 1.15 }, body: `
<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0"><defs><radialGradient id="tq" cx="560" cy="520" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.halo}" stop-opacity=".10"/><stop offset="1" stop-color="${C.halo}" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#tq)"/></svg>
${eyebrow(s, 'En palabras de Sky')}${question(s, '¿Cómo es trabajar con nosotros?')}
<p aria-hidden="true" style="position:absolute;left:${M - 14}px;top:236px;margin:0;font:760 190px Bric;line-height:1;color:${s.accent}">«</p>
<p style="position:absolute;left:${M - 6}px;top:392px;width:1080px;margin:0;font:760 104px Bric;line-height:.98;letter-spacing:-.04em;color:#fff"><span data-sel>Agilizar mucho<br>la carga de trabajo</span><span style="color:${s.accent}">»</span></p>
<p style="position:absolute;left:${M}px;top:664px;width:980px;margin:0;font:300 27px/1.5 Pop;color:${s.text}">«Hemos mejorado muchísimo en cuanto a las herramientas tecnológicas. Siento que hemos podido, gracias a ellos, agilizar mucho la carga de trabajo.»</p>
<div style="position:absolute;left:${M}px;top:822px;display:flex;align-items:center;gap:28px"><img src="${sky.src}" alt="Sky Airlines" style="width:${sky.w}px;height:${sky.h}px"><span style="width:2px;height:48px;background:${s.rule}"></span><div><p style="margin:0;font:600 26px Pop;color:#fff">Adriana Contreras</p><p style="margin:4px 0 0;font:300 20px Pop;color:${s.text}">Team SKY</p></div></div>
<div style="position:absolute;left:1390px;top:330px;width:390px">
${proof.map(([v, l], i) => `<div style="padding:${i ? 26 : 0}px 0 26px;border-bottom:2px solid ${s.rule}"><p style="margin:0;font:760 88px Bric;letter-spacing:-.04em;line-height:1;color:${i === 2 ? s.accent : '#fff'}">${v}</p><p style="margin:8px 0 0;font:400 22px Pop;color:${s.text}">${l}</p></div>`).join('')}
<p style="margin:18px 0 0;font:400 15px/1.4 Pop;color:${s.soft}">Fuente: caso publicado de Sky Airlines, métricas de entrega de 12 meses.</p>
</div>
${foot(s)}${indicator('dark', 5, 3)}` })
}

// E6 · AGENDA (papel): cinco temas grandes; la órbita de navegación de 80 px en la esquina
{
  const s = S.paper
  const items = ['Quiénes somos', 'Cómo trabajamos', 'Resultados', 'Nuestra propuesta', 'Próximos pasos']
  slides.push({ id: 'E6-agenda', surface: s, sel: { label: 'Cliente', anchor: 'bottom-start', kind: 'object', scale: 1.1 }, body: `
${eyebrow(s, 'Agenda')}${question(s, '¿Qué veremos hoy?', 200, false)}
${answer(s, ['Cinco', 'temas'], 270, 140)}
<div style="position:absolute;left:820px;top:170px;width:960px">
${items.map((t, i) => `<div ${i === 3 ? 'data-sel' : ''} style="display:flex;align-items:baseline;gap:40px;border-top:2px solid ${s.rule};padding:18px 0 22px"><span style="font:300 80px Bric;letter-spacing:-.04em;line-height:1;color:${i === 3 ? s.accent : s.ink};width:130px">0${i + 1}</span><span style="font:${i === 3 ? 600 : 300} 46px Pop;letter-spacing:-.01em;color:${s.ink}">${t}</span></div>`).join('')}
</div>
${foot(s)}${indicator('paper', 5, 0)}` })
}

// E7 · PRÓXIMOS PASOS (navy): tres pasos y el grupo CTA aprobado (botón + corchetes + cursor local)
{
  const s = S.dark
  const steps = [['01', 'Diagnóstico', 'Sin costo: medimos dónde estás con el Brand Visibility Grader, un CRM Gap Analysis o un Creative Velocity Audit.'], ['02', 'Sample Sprint', 'Un piloto pagado y acotado para probar el encaje antes de comprometerte.'], ['03', 'Operación', 'Capacidad gobernada On-Going, con tus métricas en vivo en Greenhouse.']]
  const cw = 500, gx = 70
  const html = steps.map(([n, t, d], i) => `<div style="position:absolute;left:${M + i * (cw + gx)}px;top:470px;width:${cw}px"><div style="display:flex;align-items:center;gap:18px"><span style="font:300 64px Bric;letter-spacing:-.03em;line-height:1;color:${i === 0 ? s.accent : SOFT}">${n}</span><span style="flex:1;border-top:2px solid ${i === 0 ? s.accent : s.rule}"></span></div><p style="margin:22px 0 0;font:760 52px Bric;letter-spacing:-.03em;line-height:1;color:#fff">${t}</p><p style="margin:12px 0 0;font:300 22px/1.45 Pop;color:${s.text}">${d}</p></div>`).join('')
  slides.push({ id: 'E7-pasos', surface: s, cta: true, body: `
${eyebrow(s, 'Próximos pasos')}${question(s, '¿Y ahora qué sigue?')}
${answer(s, ['Empecemos'], 270, 150)}
${html}
${ctaBtn(s, M, 760, 'Agenda un diagnóstico', 'sales@efeoncepro.com · +56 9 3732 3064')}
${foot(s)}${indicator('dark', 5, 5)}` })
}

// F1 · FUERZA HÍBRIDA (navy): personas y agentes sobre el mismo trabajo — dos cursores en la misma selección —
// y la autoridad del agente que crece por tramos; las personas conservan la responsabilidad
{
  const s = S.dark
  const steps = ['Leer y resumir', 'Proponer', 'Ejecutar con límites', 'Actuar con aprobación']
  const bx = 1070, bw = 170, gap = 14, base = 900
  const bars = steps.map((t, i) => { const h = 150 + i * 110, x = bx + i * (bw + gap); return `<div style="position:absolute;left:${x}px;top:${base - h}px;width:${bw}px;height:${h}px;border-radius:14px 14px 0 0;background:${i === 3 ? s.accent : `rgba(114,222,216,${0.08 + i * 0.07})`};box-sizing:border-box;padding:20px 18px"><p style="margin:0;font:300 44px Bric;line-height:1;color:${i === 3 ? C.dark : '#fff'}">${i + 1}</p><p style="margin:10px 0 0;font:600 20px/1.25 Pop;color:${i === 3 ? C.dark : '#fff'}">${t}</p></div>` }).join('')
  slides.push({ id: 'F1-hibrido', surface: s, sel: { cursors: [['Estrategia', 'top-end'], ['Agente IA', 'bottom-end']], kind: 'text', scale: 1.25 }, body: `
${eyebrow(s, 'Fuerza de trabajo híbrida')}${question(s, '¿Quién hace el trabajo?')}
${answer(s, ['Personas', 'y agentes'], 290, 150, 'data-sel')}
<p style="position:absolute;left:${M}px;top:650px;width:600px;margin:0;font:300 27px/1.45 Pop;color:${s.text}">Diseñamos, activamos y operamos equipos donde personas y agentes comparten un trabajo medible. Las personas conservan la responsabilidad.</p>
<p style="position:absolute;left:${bx}px;top:260px;width:760px;margin:0;font:600 18px Pop;letter-spacing:.12em;text-transform:uppercase;color:${SOFT}">La autoridad del agente crece por tramos</p>
${bars}
<div style="position:absolute;left:${bx}px;top:${base}px;width:${4 * bw + 3 * gap}px;border-top:2px solid ${s.rule}"></div>
<p style="position:absolute;left:${bx}px;top:${base + 22}px;width:760px;margin:0;font:300 19px/1.4 Pop;color:${s.text}">Blueprint → primer equipo híbrido → operación híbrida → operación agéntica gestionada</p>
${foot(s)}${indicator('dark', 5, 2)}` })
}

// F1b · FUERZA HÍBRIDA, VERSIÓN ESCENA: la estratega y un agente trabajando la misma pieza en la misma pantalla.
// Dos selecciones de producción sobre el monitor: ella toma el gráfico, el agente toma las imágenes.
{
  const s = S.dark
  const photo = await jpg(PH('2026-09-26_deck-hibrido/plates/HW1-mismo-trabajo.png'), W, H)
  slides.push({ id: 'F1b-hibrido-escena', surface: s, multi: [
    { box: { left: 1606, top: 388, right: 1866, bottom: 530 }, label: 'Estrategia', anchor: 'bottom-start' },
    { box: { left: 1614, top: 172, right: 1872, bottom: 368 }, label: 'Agente IA', anchor: 'top-start', color: '#0375db' }
  ], body: `
<img src="${photo}" alt="Una estratega de Efeonce con polo y lanyard señala el gráfico en un monitor grande mientras un agente trabaja las imágenes de la misma pieza" style="position:absolute;inset:0;width:${W}px;height:${H}px">
${eyebrow(s, 'Fuerza de trabajo híbrida')}${question(s, '¿Quién hace el trabajo?')}
${answer(s, ['Personas', 'y agentes'], 280, 160)}
<p style="position:absolute;left:${M}px;top:640px;width:600px;margin:0;font:300 28px/1.45 Pop;color:${s.text}">Sobre la misma pieza, al mismo tiempo. El agente suma capacidad medible; la persona decide y responde.</p>
${foot(s)}` })
}

// F1c · FUERZA HÍBRIDA, METÁFORA: coautoría. Nexa (la agente, con su identidad completa y la chaqueta de Efeonce) y un
// director de arte (hoodie de Efeonce) con las manos sobre la misma prueba impresa, mirándose al decidir. Mismo equipo,
// mismo uniforme. La pieza la toman dos cursores a la vez: el de él y el de Nexa.
{
  const s = S.dark
  const photo = await jpg(PH('2026-09-26_deck-nexa/plates/NX2-mismo-equipo.png'), W, H)
  slides.push({ id: 'F1c-hibrido-nexa', surface: s, sel: { box: { left: 1210, top: 830, right: 1700, bottom: 920 }, cursors: [['Dirección de arte', 'top-start'], ['Nexa', 'top-end']], kind: 'object', scale: 1.2 }, body: `
<img src="${photo}" alt="Nexa, con la chaqueta de Efeonce, y un director de arte con el hoodie de Efeonce apoyan las manos sobre la misma prueba impresa y se miran al decidir" style="position:absolute;inset:0;width:${W}px;height:${H}px">
${eyebrow(s, 'Fuerza de trabajo híbrida')}${question(s, '¿Quién firmó esta pieza?')}
${answer(s, ['Los dos'], 290, 176)}
<p style="position:absolute;left:${M}px;top:540px;width:560px;margin:0;font:300 28px/1.45 Pop;color:${s.text}">Humanos y agentes en el mismo equipo, con el mismo uniforme. El agente multiplica; la persona decide y responde.</p>
${foot(s)}` })
}

// F1d · FUERZA HÍBRIDA, CINE: Nexa con traje biónico en la línea de partida, mirando a cámara, y su escuadra de agentes
// mini robots listos para correr. La voz: «¿Listos para la carrera?» «Vamos.»; la selección toma la respuesta con dos
// cursores, Nexa y Agentes.
{
  const s = S.dark
  const photo = await jpg(PH('2026-09-26_deck-nexa/plates/NX3-nexa-bionica.png'), W, H)
  slides.push({ id: 'F1d-hibrido-carrera', surface: s, sel: { label: 'Nexa', anchor: 'top-end', kind: 'text', scale: 1.2 }, body: `
<img src="${photo}" alt="Nexa, con un traje biónico navy y blanco, en posición de partida mira a cámara rodeada de cinco mini robots agentes con caras alegres, listos para correr" style="position:absolute;inset:0;width:${W}px;height:${H}px">
${eyebrow(s, 'Fuerza de trabajo híbrida')}${question(s, '¿Listos para la carrera?')}
${answer(s, ['Vamos'], 285, 176, 'data-sel')}
<p style="position:absolute;left:${M}px;top:560px;width:500px;margin:0;font:300 27px/1.45 Pop;color:${s.text}">Nexa y sus agentes arrancan contigo. Cada agente con su tarea, todos en el mismo equipo.</p>
${foot(s)}` })
}

// F1e · FUERZA HÍBRIDA, CINE v2: lentes transparentes azulados, proporciones reales (plano medio a 2 m, 85 mm),
// pechera limpia sin emblema inventado y semáforo de partida al fondo.
{
  const s = S.dark
  const photo = await jpg(PH('2026-09-26_deck-nexa/plates/NX5b-nexa-bionica-isotipo.png'), W, H)
  slides.push({ id: 'F1e-hibrido-carrera-lentes', surface: s, sel: { label: 'Nexa', anchor: 'top-end', kind: 'text', scale: 1.2 }, body: `
<img src="${photo}" alt="Nexa, con traje biónico navy y blanco con el isotipo de Efeonce en el pecho y lentes transparentes azulados, mira a cámara en la partida; cinco mini robots agentes de caras alegres la rodean y al fondo se encienden cinco luces de partida" style="position:absolute;inset:0;width:${W}px;height:${H}px">
${eyebrow(s, 'Fuerza de trabajo híbrida')}${question(s, '¿Listos para la carrera?')}
${answer(s, ['Vamos'], 285, 176, 'data-sel')}
<p style="position:absolute;left:${M}px;top:560px;width:500px;margin:0;font:300 27px/1.45 Pop;color:${s.text}">Nexa y sus agentes arrancan contigo. Cada agente con su tarea, todos en el mismo equipo.</p>
${foot(s)}` })
}

// F2 · AEO + BeX (línea Engine): la visibilidad en IA se gana capa por capa; cinco niveles en escalera
{
  const s = lineDark('engine')
  const lv = [['Be Found', 'que te encuentre'], ['Be Readable', 'que te entienda'], ['Be Correct', 'que te represente bien'], ['Be Actionable', 'que pueda actuar'], ['Be Intrinsic', 'que te prefiera']]
  const html = lv.map(([t, d], i) => { const y = 820 - i * 132, x = 800 + i * 60; return `<div ${i === 2 ? 'data-sel' : ''} style="position:absolute;left:${x}px;top:${y}px;display:flex;align-items:baseline;gap:26px;white-space:nowrap"><span style="font:300 26px Pop;color:${SOFT};width:40px">${i + 1}</span><span style="font:760 ${i === 4 ? 92 : 80}px Bric;letter-spacing:-.035em;line-height:1;color:${i === 4 ? s.accent : '#fff'}">${t}</span><span style="font:300 24px Pop;color:${s.text}">${d}</span></div>` }).join('')
  slides.push({ id: 'F2-bex', surface: s, sel: { label: 'SEO · AEO', anchor: 'bottom-end', kind: 'object', scale: 1.1 }, body: `
${eyebrow(s, 'AEO · metodología BeX')}${question(s, '¿Te recomienda la IA?')}
${answer(s, ['Capa', 'por capa'], 270, 140)}
<p style="position:absolute;left:${M}px;top:590px;width:520px;margin:0;font:300 25px/1.45 Pop;color:${s.text}">ChatGPT, Claude, Perplexity, Gemini y Google AI Overviews. Subimos tu marca nivel por nivel.</p>
<p style="position:absolute;left:${M}px;top:${H - 150}px;width:520px;margin:0;font:400 17px/1.4 Pop;color:${SOFT}">Be Intrinsic es una trayectoria, no una garantía.</p>
${html}${foot(s)}` })
}

// F2b · BeX, MEJORADA: la escalera se vuelve materia. Cada nivel es un peldaño de vidrio que se ilumina más a medida
// que sube; el quinto es el bloque sólido del azul de Engine. Los peldaños sangran a la derecha.
{
  const s = lineDark('engine')
  const lv = [['Be Found', 'que te encuentre'], ['Be Readable', 'que te entienda'], ['Be Correct', 'que te represente bien'], ['Be Actionable', 'que pueda actuar'], ['Be Intrinsic', 'que te prefiera']]
  const slabs = lv.map((_, i) => { const y = 820 - i * 132, x = 760 + i * 70; const top = i === 4
    ? `background:linear-gradient(90deg, ${s.accent} 0%, ${s.accent} 70%, #3a9bff 100%);box-shadow:0 0 90px rgba(3,117,219,.55)`
    : `background:linear-gradient(90deg, rgba(3,117,219,${0.10 + i * 0.07}) 0%, rgba(3,117,219,${0.04 + i * 0.04}) 100%);border-top:2px solid rgba(90,170,255,${0.25 + i * 0.15})`
    return `<div style="position:absolute;left:${x}px;top:${y - 22}px;width:${W - x}px;height:124px;border-radius:18px 0 0 18px;${top}"></div>` }).join('')
  const html = lv.map(([t, d], i) => { const y = 820 - i * 132, x = 760 + i * 70; return `<div ${i === 2 ? 'data-sel' : ''} style="position:absolute;left:${x + 34}px;top:${y + 2}px;display:flex;align-items:baseline;gap:22px;white-space:nowrap;z-index:2"><span style="font:300 30px Bric;color:${i === 4 ? '#fff' : SOFT};width:30px">${i + 1}</span><span style="font:760 ${i === 4 ? 86 : 76}px Bric;letter-spacing:-.035em;line-height:1;color:#fff;opacity:${i === 4 ? 1 : 0.62 + i * 0.1}">${t}</span><span style="font:${i === 4 ? 500 : 300} 23px Pop;color:${i === 4 ? '#fff' : s.text}">${d}</span></div>` }).join('')
  slides.push({ id: 'F2b-bex-escalera', surface: s, sel: { label: 'SEO · AEO', anchor: 'bottom-end', kind: 'object', scale: 1.1 }, body: `
${slabs}
${eyebrow(s, 'AEO · metodología BeX')}${question(s, '¿Te recomienda la IA?')}
${answer(s, ['Capa', 'por capa'], 270, 140)}
<p style="position:absolute;left:${M}px;top:590px;width:500px;margin:0;font:300 25px/1.45 Pop;color:${s.text}">ChatGPT, Claude, Perplexity, Gemini y Google AI Overviews. Subimos tu marca nivel por nivel.</p>
<p style="position:absolute;left:${M}px;top:${H - 150}px;width:520px;margin:0;font:400 17px/1.4 Pop;color:${SOFT}">Be Intrinsic es una trayectoria, no una garantía.</p>
${html}${foot(s)}` })
}

// F3 · BRAND VISIBILITY GRADER (línea Engine): el anillo es la composición real del puntaje: 7 dimensiones con su peso
{
  const s = lineDark('engine')
  const dims = [['AI Visibility', 25], ['Entity Clarity', 15], ['Category Ownership', 15], ['Competitive Share of Voice', 15], ['Citation Quality', 15], ['Message Alignment', 10], ['Revenue Intent Coverage', 5]]
  const cx = 1310, cy = 520, r = 250, gapDeg = 3
  let a = -90
  const pt = (d, rr) => [cx + rr * Math.cos(d * Math.PI / 180), cy + rr * Math.sin(d * Math.PI / 180)]
  const segs = [], labs = []
  for (const [i, [n, w]] of dims.entries()) {
    const sweep = w * 3.6, a0 = a + gapDeg / 2, a1 = a + sweep - gapDeg / 2
    const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r)
    segs.push(`<path d="M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}" fill="none" stroke="${s.accent}" stroke-opacity="${i === 0 ? 1 : 0.35 + 0.08 * (6 - i)}" stroke-width="${i === 0 ? 34 : 26}" stroke-linecap="butt"/>`)
    const mid = a + sweep / 2, [lx, ly] = pt(mid, r + 70), right = Math.cos(mid * Math.PI / 180) >= 0 || i === 6
    labs.push(`<div ${i === 0 ? 'data-sel' : ''} style="position:absolute;${right ? `left:${lx}px;text-align:left` : `left:${lx - 300}px;text-align:right`};top:${ly - 26}px;width:300px;z-index:2"><p style="margin:0;font:300 40px Bric;line-height:1;color:#fff">${w}</p><p style="margin:2px 0 0;font:400 18px Pop;color:${s.text}">${n}</p></div>`)
    a += sweep
  }
  slides.push({ id: 'F3-grader', surface: s, cta: true, body: `
<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:1">${segs.join('')}</svg>
<p style="position:absolute;left:${cx - 150}px;top:${cy - 64}px;width:300px;margin:0;text-align:center;font:300 110px Bric;letter-spacing:-.04em;line-height:1;color:#fff;z-index:2">100</p>
<p style="position:absolute;left:${cx - 150}px;top:${cy + 50}px;width:300px;margin:0;text-align:center;font:300 22px Pop;color:${s.text};z-index:2">puntos en 7 dimensiones</p>
${labs.join('')}
${eyebrow(s, 'Brand Visibility Grader')}${question(s, '¿Cómo te ve la IA?')}
${answer(s, ['Mídelo'], 270, 150)}
<p style="position:absolute;left:${M}px;top:450px;width:560px;margin:0;font:300 25px/1.45 Pop;color:${s.text}">Cómo los motores de respuesta entienden y recomiendan tu marca, frente a tu competencia. El informe es privado.</p>
${ctaBtn(s, M, 700, 'Mide tu marca gratis', 'think.efeoncepro.com/brand-visibility')}
${foot(s)}` })
}

// F4 · LÍNEAS DE SERVICIO (Efeonce héroe): foto a sangre del registro aprobado, el logo gigante sobre la pared calma
// como titular y las cinco líneas como lista tipográfica grande; la selección toma «un solo interlocutor»
{
  const s = S.dark
  const photo = await jpg(PH(PHOTOS.H1b), 1920, 1080, 'east')
  const lines = [['Creative Services', 'marca, campañas y producción'], ['Growth Strategy & Measurement', 'estrategia, GTM y Revenue Enabled'], ['RevOps & CRM', 'CRM, automatización e inteligencia comercial'], ['Media & Distribution', 'medios, performance e influencia'], ['Digital Services & Engineering', 'SEO y AEO, web, datos y agentes']]
  const list = lines.map(([n, d], i) => `<div style="display:flex;align-items:baseline;gap:22px;border-top:1.5px solid rgba(255,255,255,.18);padding:12px 0 14px"><span style="font:300 22px Pop;color:${SOFT};width:34px">0${i + 1}</span><span style="font:760 48px Bric;letter-spacing:-.025em;line-height:1;color:#fff;white-space:nowrap">${n}</span></div>`).join('')
  slides.push({ id: 'F4-lineas', surface: s, sel: { label: 'Cliente', anchor: 'bottom-end', kind: 'text', scale: 1.2 }, body: `
<img src="${photo}" alt="Estratega de Efeonce con el polo y el lanyard, junto a su portátil" style="position:absolute;inset:0;width:${W}px;height:${H}px">
${eyebrow(s, 'Nuestras líneas de servicio', 96)}
<img src="${svgUri(S.dark.logo)}" alt="Efeonce" style="position:absolute;left:${M - 4}px;top:150px;width:880px;display:block">
<p style="position:absolute;left:${M}px;top:378px;margin:0;font:300 50px/1.38 Pop;color:#fff;z-index:2">Cinco líneas.<br><span data-sel style="font-weight:600">Un solo interlocutor.</span></p>
<div style="position:absolute;left:${M}px;top:672px;width:820px;z-index:2">${list}</div>
${indicator('dark', 5, 1)}` })
}

// F4b · LÍNEAS DE SERVICIO, VERSIÓN NEXA: Nexa, con su identidad completa y la chaqueta de Efeonce, presenta con la mano
// abierta las cinco líneas; cada línea dice su palabra de familia en su propio acento (operador: se permiten los acentos
// de las líneas; el fondo sigue siendo el de Efeonce). La selección con el cursor de Nexa toma la pila completa.
{
  const s = S.dark
  const photo = await jpg(PH('2026-09-26_deck-nexa/plates/NX1-nexa-presenta.png'), W, H)
  const rows = [['growth', 'Growth', 'Growth Strategy & Measurement'], ['brand', 'Brand', 'Creative Services'], ['engine', 'Engine', 'Digital Services & Engineering'], ['voice', 'Voice', 'Media & Distribution'], ['revenue-hubspot', 'Revenue', 'RevOps & CRM']]
  const stack = rows.map(([k, w, n]) => `<div style="margin-bottom:10px"><p style="margin:0;font:500 17px Pop;letter-spacing:.12em;text-transform:uppercase;color:${SOFT}">${n}</p><p style="margin:2px 0 0;font:760 96px Bric;letter-spacing:-.04em;line-height:.95;color:${L[k].accentOnDark}">${w}</p></div>`).join('')
  slides.push({ id: 'F4b-lineas-nexa', surface: s, sel: { label: 'Nexa', anchor: 'bottom-end', kind: 'group', scale: 1.25 }, body: `
<img src="${photo}" alt="Nexa, con la chaqueta de Efeonce, presenta con la mano abierta las cinco líneas de servicio" style="position:absolute;inset:0;width:${W}px;height:${H}px">
${eyebrow(s, 'Nuestras líneas de servicio', 96)}
<img src="${svgUri(S.dark.logo)}" alt="Efeonce" style="position:absolute;left:${M}px;top:150px;height:52px">
<p style="position:absolute;left:${M + 290}px;top:160px;margin:0;font:300 30px Pop;color:#fff">Cinco líneas. Una sola relación.</p>
<div data-sel style="position:absolute;left:${M}px;top:262px;width:max-content">${stack}</div>
${foot(s)}` })
}

// F4c · LÍNEAS DE SERVICIO, NEXA CON PUNCH (cine): cinco esferas de luz, una por línea y en su acento, orbitan a Nexa y dejan su estela; la del naranja se posa en su palma. Antes: Nexa, con su identidad completa y la chaqueta de Efeonce, presenta con la mano
// abierta las cinco líneas; cada línea dice su palabra de familia en su propio acento (operador: se permiten los acentos
// de las líneas; el fondo sigue siendo el de Efeonce). La selección con el cursor de Nexa toma la pila completa.
{
  const s = S.dark
  const photo = await jpg(PH('2026-09-26_deck-nexa/plates/NX6b-nexa-cinco-orbitas-isotipo.png'), W, H)
  const rows = [['growth', 'Growth', 'Growth Strategy & Measurement'], ['brand', 'Brand', 'Creative Services'], ['engine', 'Engine', 'Digital Services & Engineering'], ['voice', 'Voice', 'Media & Distribution'], ['revenue-hubspot', 'Revenue', 'RevOps & CRM']]
  const stack = rows.map(([k, w, n]) => `<div style="margin-bottom:10px"><p style="margin:0;font:500 17px Pop;letter-spacing:.12em;text-transform:uppercase;color:${SOFT}">${n}</p><p style="margin:2px 0 0;font:760 96px Bric;letter-spacing:-.04em;line-height:.95;color:${L[k].accentOnDark}">${w}</p></div>`).join('')
  slides.push({ id: 'F4c-lineas-nexa-orbitas', surface: s, sel: { label: 'Nexa', anchor: 'bottom-end', kind: 'group', scale: 1.25 }, body: `
<img src="${photo}" alt="Nexa, con la chaqueta de Efeonce, mira a cámara mientras cinco esferas de luz en teal, naranja, azul, rojo y magenta orbitan a su alrededor dejando estelas; la naranja flota sobre su palma" style="position:absolute;inset:0;width:${W}px;height:${H}px">
${eyebrow(s, 'Nuestras líneas de servicio', 96)}
<img src="${svgUri(S.dark.logo)}" alt="Efeonce" style="position:absolute;left:${M}px;top:150px;height:52px">
<p style="position:absolute;left:${M + 290}px;top:160px;margin:0;font:300 30px Pop;color:#fff">Cinco líneas. Una sola relación.</p>
<div data-sel style="position:absolute;left:${M}px;top:262px;width:max-content">${stack}</div>
${foot(s)}` })
}

// F5 · POR QUÉ ELEGIRNOS (papel): un muro de cifras citables; la selección toma el «1»
{
  const s = S.paper
  const facts = [['+10', 'años ejecutando en LATAM'], ['5', 'mercados: Chile, EE. UU., Colombia, México y Perú'], ['+90', 'empresas operan con Efeonce'], ['1', 'solo interlocutor para todas las líneas'], ['En vivo', 'tu operación visible en Greenhouse'], ['Revenue', 'Enabled: medimos negocio, no vanidad']]
  const html = facts.map(([v, l], i) => { const col = i % 3, row = Math.floor(i / 3); return `<div ${i === 3 ? 'data-sel' : ''} style="position:absolute;left:${800 + col * 330}px;top:${230 + row * 360}px;width:300px;border-top:2px solid ${s.rule};padding-top:20px"><p style="margin:0;font:300 ${v.length > 4 ? 92 : 150}px Bric;letter-spacing:-.05em;line-height:1;color:${s.ink};white-space:nowrap">${v}</p><p style="margin:14px 0 0;font:400 22px/1.35 Pop;color:${s.text}">${l}</p></div>` }).join('')
  slides.push({ id: 'F5-porque', surface: s, sel: { label: 'Cliente', anchor: 'bottom-end', kind: 'object', scale: 1.1 }, body: `
${eyebrow(s, 'Por qué elegirnos')}${question(s, '¿Por qué Efeonce?', 200, false)}
${answer(s, ['Por esto'], 270, 140)}
<p style="position:absolute;left:${M}px;top:450px;width:520px;margin:0;font:300 26px/1.45 Pop;color:${s.text}">No te entregamos crecimiento: lo construimos contigo y te dejamos más capaz de sostenerlo.</p>
${html}${foot(s)}${indicator('paper', 5, 1)}` })
}

// P · NUESTRA PROPUESTA (cuatro versiones, cada una con el acento de su línea): la voz, la lente con su foto y la
// escalera de entrada; la selección marca por dónde se empieza
async function proposal(id, key, tag, q, a, promise, photo, pos, steps, note) {
  const s = lineDark(key)
  const src = await jpg(PH(PHOTOS[photo]), 800, 800, pos)
  const n = steps.length, cw = (1640 - (n - 1) * 20) / n
  const html = steps.map(([t, d, k], i) => `<div ${i === 0 ? 'data-sel' : ''} style="position:absolute;left:${M + i * (cw + 20)}px;top:680px;width:${cw}px;height:270px;border-radius:16px;box-sizing:border-box;padding:26px 26px;background:${i === 0 ? C.paper : 'transparent'};box-shadow:${i === 0 ? '0 30px 70px rgba(0,0,0,.4)' : 'inset 0 0 0 1.5px ' + s.rule}">
<p style="margin:0;font:600 15px Pop;letter-spacing:.12em;text-transform:uppercase;color:${i === 0 ? L[key].accentOnLight : SOFT}">${k}</p>
<p style="margin:10px 0 0;font:760 38px/1.05 Bric;letter-spacing:-.025em;color:${i === 0 ? C.navy : '#fff'}">${t}</p>
<p style="margin:12px 0 0;font:300 19px/1.4 Pop;color:${i === 0 ? '#00284D' : s.text}">${d}</p></div>`).join('')
  slides.push({ id, surface: s, sel: { label: 'Cliente', anchor: 'top-end', kind: 'object', scale: 1.1 }, body: `
${lens(s, src, 1520, 330, 220)}
${eyebrow(s, 'Nuestra propuesta · ' + tag)}${question(s, q)}
${answer(s, [a], 270, 140)}
<p style="position:absolute;left:${M}px;top:440px;width:900px;margin:0;font:300 26px/1.45 Pop;color:${s.text}">${promise}</p>
${html}
${note ? `<p style="position:absolute;left:${M + 520}px;top:${H - 80}px;margin:0;font:400 16px Pop;color:${SOFT}">${note}</p>` : ''}
${foot(s)}` })
}
await proposal('P1-aeo', 'engine', 'AEO', '¿Te encuentra la IA?', 'Visible', 'Vendemos visibilidad, entrando por SEO: que buscadores y motores de respuesta te encuentren, te entiendan y te recomienden.', 'D2', 'center',
  [['Diagnóstico', 'Brand Visibility Grader: tu presencia en ChatGPT, Claude, Perplexity, Gemini y Google.', 'Empieza aquí · sin costo'], ['Foundation', 'Proyecto de precio fijo: base técnica, entidad y contenido.', 'Proyecto'], ['Operación', 'Retainer mensual de visibilidad por capacidad declarada.', 'On-Going'], ['Plataforma', 'Portal, métricas ICO y medición continua.', 'Greenhouse']], 'Sin promesas de ranking: medimos y mostramos el avance.')
await proposal('P2-creativo', 'brand', 'Servicios creativos', '¿Cómo escalas tu contenido?', 'Con sistema', 'Convertimos estrategia e ideas en sistemas, contenido y producción confiable, con capacidad gobernada y memoria de marca.', 'T2', 'center',
  [['Creative Sprint', 'Un proyecto pagado y acotado para probar el encaje con tu marca.', 'Empieza aquí'], ['Creative Capacity', 'Squad dedicado On-Going, con capacidad gobernada y métricas de entrega.', 'Managed Squad'], ['Creative Studio', 'Sistema de producción con memoria de marca y control de derechos.', 'Producción']], 'Sky: +2.000 piezas aprobadas en 12 meses, 88 % a tiempo.')
await proposal('P3-web', 'engine', 'Web', '¿Para quién es tu web?', 'Para todos', 'Web diseñada para humanos, buscadores y agentes: que convierta, que se encuentre y que un agente pueda operarla.', 'D3', 'center',
  [['Web Foundation', 'La base: arquitectura, contenido y medición bien hechos.', 'Empieza aquí'], ['Conversion Website', 'Una web pensada para convertir, con experimentos y datos.', 'Proyecto'], ['Agent-Ready', 'Lista para que los agentes la lean y actúen sobre ella.', 'Agentes'], ['Performance Ops', 'Operación continua de rendimiento y mejora.', 'On-Going']], null)
await proposal('P4-revops', 'revenue-hubspot', 'RevOps', '¿Tu CRM vende contigo?', 'Con agentes', 'HubSpot operado como servicio: de la evaluación a la operación gestionada, con agentes que trabajan dentro de tu CRM.', 'H1b', 'center',
  [['Evaluación', 'Sin costo: dónde está tu CRM y qué le falta.', 'Empieza aquí · sin costo'], ['Blueprint', 'El diseño pagado de tu operación de revenue.', 'Proyecto'], ['Implementación', 'Implementación o migración, lista para operar.', 'Proyecto'], ['Operación gestionada', 'HubSpot y agentes operados por nosotros, mes a mes.', 'On-Going']], 'Marketing, ventas, servicio, datos y Agent Hub.')

await proposal('P5-seo', 'engine', 'SEO', '¿Cómo te encuentran?', 'Con método', 'Que te encuentren en Google y que la IA no te ignore: base técnica, autoridad temática y entidad, trabajadas y medidas como un sistema.', 'SE1', 'east',
  [['Diagnóstico', 'Tu punto de partida en búsqueda y en IA: sin ese mapa no hay plan honesto.', 'Empieza aquí · sin costo'], ['Base técnica', 'Rastreo, indexación, Core Web Vitals y datos estructurados.', 'Proyecto'], ['Contenido y autoridad', 'Clusters por intención, landings que convierten, PR y link building real.', 'On-Going'], ['Reporte vivo', 'Tráfico calificado, share of voice y visibilidad en IA, en Greenhouse.', 'Greenhouse']], 'No prometemos rankings. Reportamos lo que se mueve.')

// P2b · PROPUESTA CREATIVA, VERSIÓN PLASTILINA: la voz blanda de la iconografía (canónica D22) como protagonista con su
// órbita sesgada, la foto del oficio en un panel con la esquina de 300 px de la sección partida aprobada, y los tres
// pasos con íconos Plastilina en reposo. Acento de Brand sobre el fondo Efeonce.
{
  const { skewedOrbitHeroSvg, resolveIcon } = await import('/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/icons.js')
  const s = lineDark('brand')
  const photo = await jpg(PH('2026-09-26_deck-creativo/plates/CR1-explosion-color.png'), 1020, 1080, 'north')
  const hero = skewedOrbitHeroSvg({ glyph: 'bombillo', line: 'brand', surface: 'dark', width: W, height: H, object: { x: 170, y: 64, size: 580 }, gesture: true, label: 'Bombillo: la idea' }).replace('<svg ', '<svg style="position:absolute;inset:0;z-index:1" ')
  const steps = [['rayo', 'Creative Sprint', 'Un proyecto pagado y acotado para probar el encaje.', 'Empieza aquí'], ['paleta', 'Creative Capacity', 'Squad dedicado On-Going, con capacidad gobernada.', 'Managed Squad'], ['claqueta', 'Creative Studio', 'Producción con memoria de marca y control de derechos.', 'Producción']]
  const stepHtml = steps.map(([g, t, d, k], i) => `<div ${i === 0 ? 'data-sel' : ''} style="position:absolute;left:${M + i * 250}px;top:880px;width:240px;display:flex;gap:12px;align-items:center"><div style="flex:none;width:52px;height:52px">${resolveIcon({ glyph: g, size: 52, line: 'brand', surface: 'dark', label: t, idPrefix: 'st' + i }).svg}</div><div><p style="margin:0;font:600 13px Pop;letter-spacing:.12em;text-transform:uppercase;color:${i === 0 ? s.accent : SOFT}">${k}</p><p style="margin:4px 0 0;font:760 23px/1.05 Bric;letter-spacing:-.02em;color:#fff">${t}</p></div></div>`).join('')
  slides.push({ id: 'P2b-creativo-plastilina', surface: s, sel: { label: 'Cliente', anchor: 'bottom-end', kind: 'object', scale: 1.1 }, body: `
<div style="position:absolute;left:900px;top:0;width:1020px;height:${H}px;border-radius:300px 0 0 0;overflow:hidden"><img src="${photo}" alt="Una directora creativa con el hoodie de Efeonce lanza al aire cientos de tarjetas de color y ríe" style="width:1020px;height:${H}px;display:block"></div>
${hero}
${eyebrow(s, 'Nuestra propuesta · Servicios creativos', 640)}
${question(s, '¿Cómo escalas tu contenido?', 676)}
${answer(s, ['Con sistema'], 736, 116)}
${stepHtml}
<p style="position:absolute;left:960px;top:${H - 70}px;margin:0;font:600 18px Pop;color:#fff;z-index:2">Sky: +2.000 piezas aprobadas en 12 meses</p>
${foot(s)}` })
}

// P2c · PROPUESTA CREATIVA DIGITAL, REPLANTEADA: foto a sangre de la directora creativa dirigiendo una constelación de
// pantallas en todos los formatos digitales (story, reel, feed, video, banner) que orbitan a su alrededor. La voz
// «¿Tu marca en cada pantalla?» «En todas.» en el espacio oscuro; las tres formas de comprar con íconos Plastilina.
{
  const { resolveIcon } = await import('/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/icons.js')
  const s = lineDark('brand')
  const photo = await jpg(PH('2026-09-26_deck-creativo/plates/CR2b-constelacion-isotipo.png'), W, H)
  const steps = [['rayo', 'Creative Sprint', 'Empieza aquí'], ['paleta', 'Creative Capacity', 'Managed Squad'], ['claqueta', 'Creative Studio', 'Producción']]
  const stepHtml = steps.map(([g, t, k], i) => `<div style="position:absolute;left:${M + i * 245}px;top:870px;width:235px;display:flex;gap:12px;align-items:center;z-index:2"><div style="flex:none;width:50px;height:50px">${resolveIcon({ glyph: g, size: 50, line: 'brand', surface: 'dark', label: t, idPrefix: 'sc' + i }).svg}</div><div><p style="margin:0;font:600 13px Pop;letter-spacing:.12em;text-transform:uppercase;color:${i === 0 ? '#fff' : SOFT}">${k}</p><p style="margin:4px 0 0;font:760 22px/1.05 Bric;letter-spacing:-.02em;color:#fff">${t}</p></div></div>`).join('')
  slides.push({ id: 'P2c-creativo-digital', surface: s, sel: { label: 'Cliente', anchor: 'top-end', kind: 'text', scale: 1.2 }, body: `
<img src="${photo}" alt="Una directora creativa con el hoodie de Efeonce dirige con las manos una órbita de pantallas flotantes en formatos story, reel, feed, video y banner, llenas de color" style="position:absolute;inset:0;width:${W}px;height:${H}px">
${eyebrow(s, 'Nuestra propuesta · Servicios creativos', 120)}
${question(s, '¿Tu marca en cada pantalla?', 186)}
${answer(s, ['En todas'], 312, 168, 'data-sel')}
<p style="position:absolute;left:${M}px;top:530px;width:560px;margin:0;font:300 26px/1.45 Pop;color:${s.text}">Social, campañas, video, motion y creatividad para performance. Una idea que llega a cada formato, con capacidad creativa gobernada.</p>
<p style="position:absolute;left:${M}px;top:740px;margin:0;font:600 19px Pop;color:#fff">Sky: +2.000 piezas aprobadas en 12 meses</p>
${stepHtml}
${foot(s)}` })
}

// P3b · PROPUESTA WEB CON PUNCH (cine): el líder web acomoda un módulo dentro de una web holográfica gigante que usan a
// la vez un cursor humano, el haz de un buscador y tres agentes mini robots. «¿Para quién es tu web?» «Para todos.»
{
  const { resolveIcon } = await import('/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/icons.js')
  const s = lineDark('engine')
  const photo = await jpg(PH('2026-09-26_deck-web/plates/WB1b-web-para-todos-isotipo.png'), W, H)
  const steps = [['web', 'Web Foundation', 'Empieza aquí'], ['embudo', 'Conversion Website', 'Proyecto'], ['automatizacion', 'Agent-Ready', 'Agentes'], ['medicion', 'Performance Ops', 'On-Going']]
  const stepHtml = steps.map(([g, t, k], i) => `<div style="position:absolute;left:${M + i * 176}px;top:800px;width:170px;display:flex;flex-direction:column;gap:10px;z-index:2"><div style="width:44px;height:44px">${resolveIcon({ glyph: g, size: 44, line: 'engine', surface: 'dark', label: t, idPrefix: 'wb' + i }).svg}</div><div><p style="margin:0;font:600 12px Pop;letter-spacing:.12em;text-transform:uppercase;color:${i === 0 ? '#fff' : SOFT}">${k}</p><p style="margin:4px 0 0;font:760 21px/1.05 Bric;letter-spacing:-.02em;color:#fff">${t}</p></div></div>`).join('')
  slides.push({ id: 'P3b-web-para-todos', surface: s, sel: { label: 'Cliente', anchor: 'top-end', kind: 'text', scale: 1.2 }, body: `
<img src="${photo}" alt="Un líder web con el polo de Efeonce acomoda con la mano un módulo dentro de una web holográfica gigante de luz azul, que usan a la vez un cursor, el haz de un buscador y tres agentes mini robots de caras alegres" style="position:absolute;inset:0;width:${W}px;height:${H}px">
${eyebrow(s, 'Nuestra propuesta · Web', 120)}
${question(s, '¿Para quién es tu web?', 186)}
${answer(s, ['Para todos'], 318, 140, 'data-sel')}
<p style="position:absolute;left:${M}px;top:500px;width:560px;margin:0;font:300 26px/1.45 Pop;color:${s.text}">Para personas, buscadores y agentes de IA: una web que convierte, se encuentra y se deja operar.</p>
${stepHtml}
${foot(s)}` })
}

// P1b · PROPUESTA AEO CON PUNCH (cine): entre miles de tarjetas oscuras (las marcas que nadie ve), el haz de una
// respuesta de IA elige una sola, junto a la estratega de Efeonce. «¿Te encuentra la IA?» «Visible.»
{
  const { resolveIcon } = await import('/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/icons.js')
  const s = lineDark('engine')
  const photo = await jpg(PH('2026-09-26_deck-aeo/plates/AE2b-la-ia-te-elige-isotipo.png'), W, H)
  const steps = [['busqueda', 'Diagnóstico', 'Sin costo'], ['contenido', 'Foundation', 'Proyecto'], ['medicion', 'Operación', 'On-Going'], ['informe', 'Plataforma', 'Greenhouse']]
  const stepHtml = steps.map(([g, t, k], i) => `<div style="position:absolute;left:${M + i * 176}px;top:800px;width:170px;display:flex;flex-direction:column;gap:10px;z-index:2"><div style="width:44px;height:44px">${resolveIcon({ glyph: g, size: 44, line: 'engine', surface: 'dark', label: t, idPrefix: 'ae' + i }).svg}</div><div><p style="margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${i === 0 ? '#fff' : SOFT}">${k}</p><p style="margin:4px 0 0;font:760 21px/1.05 Bric;letter-spacing:-.02em;color:#fff">${t}</p></div></div>`).join('')
  slides.push({ id: 'P1b-aeo-visible', surface: s, sel: { label: 'Cliente', anchor: 'top-end', kind: 'text', scale: 1.2 }, body: `
<img src="${photo}" alt="Una estratega SEO con el polo de Efeonce mira a cámara; detrás, entre miles de tarjetas oscuras que se pierden en la distancia, el haz azul de una burbuja de respuesta de IA ilumina una sola tarjeta, que brilla y se adelanta" style="position:absolute;inset:0;width:${W}px;height:${H}px">
${eyebrow(s, 'Nuestra propuesta · AEO', 120)}
${question(s, '¿Te encuentra la IA?', 186)}
${answer(s, ['Visible'], 318, 160, 'data-sel')}
<p style="position:absolute;left:${M}px;top:520px;width:640px;margin:0;font:300 26px/1.45 Pop;color:${s.text}">Entre miles de marcas, que ChatGPT, Claude, Perplexity, Gemini y Google te encuentren, te entiendan y te recomienden.</p>
${stepHtml}
<p style="position:absolute;left:${M + 320}px;top:${H - 80}px;margin:0;font:400 16px Pop;color:${SOFT}">Sin promesas de ranking: medimos y mostramos el avance.</p>
${foot(s)}` })
}

// P5b · PROPUESTA SEO CON PUNCH (cine, 2026-09-28): el estratega SEO frente al mapa de luz de su oficio —la grilla
// técnica en el piso, los clusters como constelaciones y la entidad como núcleo con su órbita— «¿Te encuentra Google?»
// «Y la IA.» Isotipo del polo compuesto con foto:isotipo.
{
  const { resolveIcon } = await import('/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/icons.js')
  const s = lineDark('engine')
  const photo = await jpg(PH('2026-09-28_deck-seo-aeo/plates/SE1-te-encuentran-isotipo.png'), W, H)
  const steps = [['busqueda', 'Diagnóstico', 'Sin costo'], ['contenido', 'Técnica y contenido', 'Proyecto'], ['medicion', 'Autoridad y entidad', 'On-Going'], ['informe', 'Reporte vivo', 'Greenhouse']]
  const stepHtml = steps.map(([g, t, k], i) => `<div style="position:absolute;left:${M + i * 176}px;top:800px;width:170px;display:flex;flex-direction:column;gap:10px;z-index:2"><div style="width:44px;height:44px">${resolveIcon({ glyph: g, size: 44, line: 'engine', surface: 'dark', label: t, idPrefix: 'se' + i }).svg}</div><div><p style="margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${i === 0 ? '#fff' : SOFT}">${k}</p><p style="margin:4px 0 0;font:760 21px/1.05 Bric;letter-spacing:-.02em;color:#fff">${t}</p></div></div>`).join('')
  slides.push({ id: 'P5b-seo-te-encuentran', surface: s, sel: { label: 'Cliente', anchor: 'bottom-end', kind: 'text', scale: 1.2 }, body: `
<img src="${photo}" alt="Un estratega SEO con el polo de Efeonce mira a cámara; detrás, un mapa de luz: una grilla teal en el piso, constelaciones de puntos unidos por hilos y un núcleo de luz azul con su órbita al que todo se conecta" style="position:absolute;inset:0;width:${W}px;height:${H}px">
${eyebrow(s, 'Nuestra propuesta · SEO', 120)}
${question(s, '¿Te encuentra Google?', 186)}
${answer(s, ['Y la IA'], 318, 160, 'data-sel')}
<p style="position:absolute;left:${M}px;top:648px;width:640px;margin:0;font:300 25px/1.4 Pop;color:${s.text}">Posicionamiento SEO con método: base técnica, autoridad temática y entidad, para que Google te encuentre y la IA no te ignore.</p>
${stepHtml}
<p style="position:absolute;left:${M + 320}px;top:${H - 80}px;margin:0;font:400 16px Pop;color:${SOFT}">No prometemos rankings. Reportamos lo que se mueve.</p>
${foot(s)}` })
}

// P4b · PROPUESTA REVOPS CON PUNCH (cine): un bow-tie de luz (captar → cerrar → crecer) cruza el cuadro; la líder
// RevOps lo dirige desde el nudo y los agentes viajan en el flujo. «¿Tu CRM vende contigo?» «Con agentes.»
{
  const { resolveIcon } = await import('/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/icons.js')
  const s = lineDark('revenue-hubspot')
  const photo = await jpg(PH('2026-09-26_deck-revops/plates/RV1b-motor-de-revenue-isotipo.png'), W, H)
  const steps = [['informe', 'Evaluación', 'Sin costo'], ['embudo', 'Blueprint', 'Proyecto'], ['crm', 'Implementación', 'Proyecto'], ['automatizacion', 'Operación gestionada', 'On-Going']]
  const stepHtml = steps.map(([g, t, k], i) => `<div style="position:absolute;left:${M + i * 176}px;top:840px;width:170px;display:flex;flex-direction:column;gap:10px;z-index:2"><div style="width:44px;height:44px">${resolveIcon({ glyph: g, size: 44, line: 'revenue-hubspot', surface: 'dark', label: t, idPrefix: 'rv' + i }).svg}</div><div><p style="margin:0;font:600 12px Pop;letter-spacing:.1em;text-transform:uppercase;color:${i === 0 ? '#fff' : SOFT}">${k}</p><p style="margin:4px 0 0;font:760 21px/1.05 Bric;letter-spacing:-.02em;color:#fff">${t}</p></div></div>`).join('')
  slides.push({ id: 'P4b-revops-motor', surface: s, sel: { label: 'Cliente', anchor: 'bottom-end', kind: 'text', scale: 1.2 }, body: `
<img src="${photo}" alt="Una líder RevOps con la chaqueta de Efeonce mira a cámara y dirige con la mano el nudo brillante de un moño de luz magenta y azul: miles de partículas convergen hacia el nudo y vuelven a abrirse, mientras tres agentes mini robots viajan en el flujo" style="position:absolute;inset:0;width:${W}px;height:${H}px">
${eyebrow(s, 'Nuestra propuesta · RevOps', 120)}
${question(s, '¿Tu CRM vende contigo?', 186)}
${answer(s, ['Con agentes'], 318, 140, 'data-sel')}
<p style="position:absolute;left:${M}px;top:510px;width:600px;margin:0;font:300 26px/1.45 Pop;color:${s.text}">HubSpot operado como servicio: marketing, ventas y servicio en un solo motor, con agentes que trabajan dentro de tu CRM.</p>
${stepHtml}
${foot(s)}` })
}

const css = `<style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-Regular.ttf')});font-weight:400}@font-face{font-family:Pop;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}@font-face{font-family:Poppins;src:url(${f64('Poppins-Bold.ttf')});font-weight:700}body{margin:0}[data-sel]{z-index:2}</style>`
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: W, height: H } })
const only = process.env.ONLY?.split(',')
const svgL = (x, z) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:${z};pointer-events:none">${x}</svg>`
for (const sl of slides) {
  if (only && !only.includes(sl.id)) continue
  const s = sl.surface
  const wrap = x => `<html><head>${css}</head><body><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${s.bg}">${sl.body}${x}</div></body></html>`
  await pg.setContent(wrap(''), { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready)
  let extra = ''
  if (sl.sel) {
    const box = sl.sel.box ?? await pg.evaluate(() => { const e = document.querySelector('[data-sel]'); if (!e) return null; let r; if (e.tagName === 'SPAN' || e.tagName === 'P') { const g = document.createRange(); g.selectNodeContents(e); const b = g.getBoundingClientRect(); const pad = b.height * (e.tagName === 'P' ? 0.06 : 0.16); r = { left: b.left, right: b.right, top: b.top + pad, bottom: b.bottom - pad * 0.6 } } else r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom } })
    const kind = sl.sel.kind ?? 'text'
    const cursors = (sl.sel.cursors ?? [[sl.sel.label, sl.sel.anchor]]).map(([label, anchor], k) => ({ id: 'c' + k, kind: 'collaborator', targetId: 't', anchor, action: k ? 'resize' : 'select', label, participantKind: 'department' }))
    const m = resolveCollaborationSelectionIntent({ targetId: 't', targetKind: kind, variant: 'eight-handles', padding: 'standard', overlay: kind === 'text' ? 'subtle' : 'none', cursors })
    const rs = renderCollaborationSelection({ manifest: m, targetBounds: box, canvas: { width: W, height: H }, measureLabel: (l, z) => l.length * z * 0.62, presentation: { collaboratorScale: sl.sel.scale ?? 1.2 } })
    if (!rs.evidence.withinCanvas) console.warn(sl.id, 'selección fuera del lienzo', JSON.stringify(rs.evidence.cursorEvidence.map(c => c.labelBounds)))
    extra += svgL(rs.underlay, 1) + svgL(rs.overlay, 3)
  }
  if (sl.multi) {
    for (const [k, t] of sl.multi.entries()) {
      const m = resolveCollaborationSelectionIntent({ targetId: 't' + k, targetKind: 'object', variant: 'eight-handles', padding: 'standard', overlay: 'none', cursors: [{ id: 'm' + k, kind: 'collaborator', targetId: 't' + k, anchor: t.anchor, action: 'select', label: t.label, participantKind: 'department' }] })
      const rs = renderCollaborationSelection({ manifest: m, targetBounds: t.box, canvas: { width: W, height: H }, measureLabel: (l, z) => l.length * z * 0.62, presentation: { collaboratorScale: 1.25, participantColors: t.color ? { ['m' + k]: t.color } : {} } })
      if (!rs.evidence.withinCanvas) console.warn(sl.id, k, 'fuera del lienzo')
      extra += svgL(rs.underlay, 1) + svgL(rs.overlay, 3)
    }
  }
  if (sl.cta) {
    const cb = await pg.evaluate(() => { const r = document.querySelector('[data-cta]').getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom } })
    const mc = resolveCollaborationSelectionIntent({ targetId: 'cta', targetKind: 'group', variant: 'open-brackets', padding: 'compact', overlay: 'none', cursors: [{ id: 'u', kind: 'local', targetId: 'cta', anchor: 'end-center', action: 'select' }] })
    const rc = renderCollaborationSelection({ manifest: mc, targetBounds: cb, canvas: { width: W, height: H }, measureLabel: (l, z) => l.length * z * 0.62, presentation: { localCursorScale: 1.3 } })
    const bottom = Math.max(rc.bounds.bottom ?? rc.bounds.top + rc.bounds.height, ...rc.evidence.cursorEvidence.map(c => c.bounds.bottom ?? (c.bounds.top + c.bounds.height)))
    extra += svgL(rc.overlay, 5) + `<style>[data-desc]{top:${Math.round(bottom + 20)}px !important}</style>`
  }
  if (extra) { await pg.setContent(wrap(extra), { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready) }
  await pg.screenshot({ path: `${OUT}${sl.id}.png` })
  await sharp(`${OUT}${sl.id}.png`).jpeg({ quality: 88 }).toFile(`${OUT}${sl.id}.jpg`)
  console.log('ok', sl.id)
}
await b.close()
