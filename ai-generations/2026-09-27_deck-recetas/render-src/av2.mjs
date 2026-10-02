// Producción audiovisual con generadores de texto y recursos de una producción real: cartela de apertura, generador de
// caracteres (lower third), callout con selección AXIS, super de dato con la órbita que mide, pantalla dividida,
// subtítulos y cierre. Cuadros 16:9 sobre los cuadros clave generados (uniforme por registro). Maqueta de dirección.
import { answerHtml, paintGraphicLine } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { resolveGraphicLineIntent } from '/Users/jreye/Documents/axis-design-system/packages/contracts/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { resolveCollaborationSelectionIntent } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-ui-contracts/dist/index.js'
import { renderCollaborationSelection } from '/Users/jreye/Documents/greenhouse-eo/scripts/creative/layout-compiler/axis-advertising.mjs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync } from 'node:fs'
const R = '/Users/jreye/Documents/greenhouse-eo/', A = R + 'ai-generations/2026-09-26_audiovisual/plates/'
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const img = async (f, w = 1920, h = 1080) => 'data:image/jpeg;base64,' + (await sharp(f).resize(w, h, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer()).toString('base64')
const T = GL.color.teal, DARK = GL.color.dark, SOFT = GL.slogan.leadColor.onDark, W = 1920, H = 1080
const ring = c => `<span style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${c ?? T};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>`
const bg = src => `<img src="${src}" style="position:absolute;inset:0;width:${W}px;height:${H}px">`
// generador de caracteres: barra fina de acento + nombre del rol en Bricolage + contexto en Poppins, sobre la zona oscura
const lower = (x, y, a, b) => `<div data-grp style="position:absolute;left:${x}px;top:${y}px"><p style="margin:0;font:300 38px Pop;color:${SOFT};white-space:nowrap">${ring()}${b}</p><p style="margin:4px 0 0;font:760 128px Bric;letter-spacing:-.045em;line-height:1;color:#fff;white-space:nowrap">${answerHtml(a, T)}</p></div>`
const v1 = await img(A + 'V1-terreno.png'), v2 = await img(A + 'V2-detalle.png'), v3 = await img(A + 'V3-sala.png')
const reveal = await img('/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/5. Contenidos/13- Branding/Motion Órbita Efeonce/v1.1/reveal/16x9/navy/efeonce-orbita-reveal_16x9_navy_cuadro-final.png')
// órbita que MIDE el dato del super (62 %): arco desde las 12, pieza chica, sobre la zona calma
function measure(cx, cy, r, v, sections = 100) {
  const m = resolveGraphicLineIntent({ canvas: { width: W, height: H, line: 'growth', surface: 'dark', channel: 'screen' }, elements: [{ kind: 'progress', id: 'm', sections, current: sections === 100 ? v : 1, region: 'upper-end' }] })
  const el = m.elements[0]; el.ring = { ...el.ring, strokePx: 3, opacity: 0.4 }; el.arc = { ...el.arc, strokePx: sections === 100 ? 9 : 14 }; el.sphere = { ...el.sphere, radiusPx: sections === 100 ? 14 : 22 }
  return '<div style="position:absolute;inset:0;z-index:3">' + paintGraphicLine(m, { background: false, idPrefix: 'm' + v, circles: { m: { cx, cy, r } } }).svg + '</div>'
}
const frames = [
  ['01 · 0–2,5 s · Cartela de apertura', 'La voz de la línea: pregunta en Poppins con su anillo y respuesta gigante con la esfera. La órbita mide el capítulo (1 de 3) y la selección encaja al final.', `<div style="position:absolute;inset:0;background:${DARK}"></div>${measure(1420, 520, 380, 34, 3)}
<p style="position:absolute;left:150px;top:196px;margin:0;font:300 52px Pop;color:${SOFT};white-space:nowrap">${ring()}¿Cómo trabajamos?</p>
<p data-sel style="position:absolute;left:128px;top:318px;margin:0;font:760 400px Bric;letter-spacing:-.06em;line-height:.9;color:#fff;white-space:nowrap">${answerHtml('Así', T)}</p>
<p style="position:absolute;left:1170px;top:430px;width:500px;margin:0;font:760 96px Bric;letter-spacing:-.04em;color:#fff;text-align:center">Escucha</p><p style="position:absolute;left:1170px;top:548px;width:500px;margin:0;font:300 34px Pop;color:${SOFT};text-align:center">capítulo 1 de 3</p>`, { box: 'auto', label: 'Dirección de arte', anchor: 'bottom-end', kind: 'text' }],
  ['02 · 2,5–5 s · Generador de caracteres', 'Generador de caracteres en la voz de la línea: lugar y hora con el anillo, el equipo con la esfera, y los corchetes con el cursor de Producción que lo «firman». Entra en 0,4 s.', `${bg(v1)}${lower(120, 800, 'Producción', 'Terreno · panadería del cliente, 06:40')}`, { box: 'grp', label: 'Producción', anchor: 'top-end', kind: 'group' }],
  ['03 · 5–6,5 s · Callout con selección', 'Los corchetes de AXIS marcan el detalle que importa y el cursor de Dirección de arte lo toma.', `${bg(v2)}`, { box: { left: 720, top: 560, right: 1060, bottom: 800 }, label: 'Dirección de arte', anchor: 'top-start', kind: 'object' }],
  ['04 · 6,5–8 s · Super de dato', 'La cifra en grande sobre la zona calma y la órbita que la mide. Se arma con el golpe del arco.', `${bg(v3)}${measure(300, 760, 150, 62)}<p style="position:absolute;left:180px;top:712px;margin:0;font:760 88px Bric;letter-spacing:-.04em;color:#fff;text-align:center;width:240px">62%</p><p style="position:absolute;left:500px;top:720px;width:420px;margin:0;font:300 34px/1.35 Pop;color:#fff">de los cortes se aprueban a la primera</p>`],
  ['05 · 8–9,5 s · Pantalla dividida', 'Terreno y sala en el mismo cuadro: del «escucha» al «mide». La línea divisoria es el acento.', `<img src="${v1}" style="position:absolute;left:-800px;top:0;width:${W}px;height:${H}px;clip-path:inset(0 160px 0 800px)"><img src="${v3}" style="position:absolute;left:60px;top:0;width:${W}px;height:${H}px;clip-path:inset(0 60px 0 900px)"><div style="position:absolute;left:957px;top:0;width:6px;height:${H}px;background:${T}"></div>
<p style="position:absolute;left:110px;top:860px;margin:0;font:760 90px Bric;letter-spacing:-.04em;color:#fff">Escucha</p><p style="position:absolute;left:1070px;top:860px;margin:0;font:760 90px Bric;letter-spacing:-.04em;color:#fff">${answerHtml('mide', T)}</p>`],
  ['06 · Todo el video · Subtítulos', 'Subtítulos quemados para redes: Poppins 600, dos líneas máximo, centrados en el tercio inferior, sin caja.', `${bg(v3)}<p style="position:absolute;left:0;top:880px;width:${W}px;margin:0;font:600 46px/1.3 Pop;color:#fff;text-align:center;text-shadow:0 2px 6px rgba(0,0,0,.55)">«Ya no discutimos el gusto:<br>vemos qué corte vende.»</p>`],
  ['07 · 9,5–13,1 s · Cierre', 'Reveal aprobado con sonido. Firma la marca, nunca la toma.', `${bg(reveal)}`]
]
const head = `<style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}@font-face{font-family:Poppins;src:url(${f64('Poppins-Bold.ttf')});font-weight:700}body{margin:0;background:${DARK}}[data-sel],[data-grp]{z-index:2}</style>`
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: W, height: H } })
const shots = []
for (const [t, cap, body, sel] of frames) {
  const wrap = x => `<html><head>${head}</head><body><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${DARK}">${body}${x}</div></body></html>`
  await pg.setContent(wrap(''), { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready)
  let extra = ''
  if (sel) {
    let box = sel.box
    if (box === 'auto') box = await pg.evaluate(() => { const e = document.querySelector('[data-sel]'); const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect(); return { left: b.left, top: b.top + b.height * 0.14, right: b.right, bottom: b.bottom - b.height * 0.06 } })
    if (box === 'grp') box = await pg.evaluate(() => { const r = document.querySelector('[data-grp]').getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom } })
    const grp = sel.kind === 'group'
    const m = resolveCollaborationSelectionIntent({ targetId: 'o', targetKind: sel.kind, variant: grp ? 'open-brackets' : 'eight-handles', padding: grp ? 'compact' : 'standard', overlay: grp ? 'none' : 'subtle', cursors: [{ id: 'c', kind: 'collaborator', targetId: 'o', anchor: sel.anchor, action: 'select', label: sel.label, participantKind: 'department' }] })
    const rs = renderCollaborationSelection({ manifest: m, targetBounds: box, canvas: { width: W, height: H }, measureLabel: (l, s) => l.length * s * 0.62, presentation: { collaboratorScale: grp ? 1.2 : 1.6 } })
    if (!rs.evidence.withinCanvas) console.warn(t, 'selección fuera del lienzo')
    extra = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:1">${rs.underlay}</svg><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:3">${rs.overlay}</svg>`
    await pg.setContent(wrap(extra), { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready)
  }
  shots.push({ t, cap, src: 'data:image/jpeg;base64,' + (await sharp(await pg.screenshot()).resize(800).jpeg({ quality: 84 }).toBuffer()).toString('base64') })
}
const board = `<html><head><style>@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}body{margin:0;background:#F4F6F8}</style></head><body><div id="b" style="padding:40px;width:1760px">
<p style="margin:0 0 22px;font:600 22px Pop;color:#00284D">Producción audiovisual · «Cómo trabajamos», 13 s · generadores de texto y recursos de producción</p>
<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:34px 28px">${shots.map(s => `<figure style="margin:0"><img src="${s.src}" style="width:100%;display:block;border-radius:4px"><figcaption style="margin-top:10px;font:600 15px Pop;color:#00284D">${s.t}</figcaption><p style="margin:3px 0 0;font:300 14px/1.45 Pop;color:#3a4756">${s.cap}</p></figure>`).join('')}</div></div></body></html>`
await pg.setViewportSize({ width: 1840, height: 1000 })
await pg.setContent(board, { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready)
await (await pg.$('#b')).screenshot({ path: 'out-dwm/AV2.png' }); await b.close()
await sharp('out-dwm/AV2.png').jpeg({ quality: 86 }).toFile('out-dwm/AV2.jpg')
const md = await sharp('out-dwm/AV2.jpg').metadata(); console.log(md.width, md.height)
