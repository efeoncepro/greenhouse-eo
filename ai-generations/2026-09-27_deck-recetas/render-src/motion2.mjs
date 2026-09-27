// Motion con punch: el lenguaje de movimiento de la órbita aplicado a una pieza con foto fija (16:9, 9,6 s).
// Cuadros clave pintados con axis-graphic-line + selección AXIS de producción; cierre con cuadros reales del sting v1.1.
import { paintGraphicLine, answerHtml } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { resolveGraphicLineIntent } from '/Users/jreye/Documents/axis-design-system/packages/contracts/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { resolveCollaborationSelectionIntent } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-ui-contracts/dist/index.js'
import { renderCollaborationSelection } from '/Users/jreye/Documents/greenhouse-eo/scripts/creative/layout-compiler/axis-advertising.mjs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync } from 'node:fs'
const R = '/Users/jreye/Documents/greenhouse-eo/'
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const T = GL.color.teal, DARK = GL.color.dark, SOFT = GL.slogan.leadColor.onDark, W = 1920, H = 1080
const P = GL.pieces.lens.wall, RP = P.ring.r / (1 + GL.orbit.ringAirRatio)
// toma elegida PARA la lente (misma que la animación): la cara queda centrada en el círculo
const K = 1.1, PW = Math.round(1024 * K), PH = Math.round(1792 * K), PL = Math.round(P.ring.cx - 467 * K), PT = Math.round(P.ring.cy - 90 - 425 * K)
const ph = await sharp(R + 'ai-generations/2026-09-26_web-movil/plates/M1-avanza-polo.png').resize(PW, PH).toBuffer()
const photo = 'data:image/jpeg;base64,' + (await sharp({ create: { width: W, height: H, channels: 3, background: DARK } }).composite([{ input: await sharp(ph).extract({ left: 0, top: -PT, width: Math.min(PW, W - PL), height: H }).toBuffer(), left: PL, top: 0 }]).jpeg({ quality: 90 }).toBuffer()).toString('base64')
function lens(rPhoto, sweep, zoom, id, start = P.arc.startDeg) {
  const m = resolveGraphicLineIntent({ canvas: { width: W, height: H, line: 'growth', surface: 'dark', channel: 'screen' }, elements: [{ kind: 'lens', id: 'lens', photoId: 'ph', alt: 'x', region: 'center-end', accentSphere: 'upper-start' }] })
  const el = m.elements[0]
  el.ring = { ...el.ring, strokePx: P.ring.strokePx, opacity: P.ring.opacity }
  el.arc = { ...el.arc, strokePx: P.arc.strokePx, startDeg: start, sweepDeg: sweep }
  el.sphere = { ...el.sphere, radiusPx: P.sphereRadiusPx }
  if (el.inside) el.inside = { ...el.inside, zoom: 1 + (zoom - 1.2) * 0.5 }
  return paintGraphicLine(m, { photos: { ph: photo }, background: true, idPrefix: id, circles: { lens: { cx: P.ring.cx, cy: P.ring.cy, r: rPhoto } } }).svg.replace('<svg ', '<svg style="position:absolute;inset:0" ')
}
const pt = (deg, r) => [P.ring.cx + r * Math.cos(deg * Math.PI / 180), P.ring.cy + r * Math.sin(deg * Math.PI / 180)]
const arcPath = (a0, a1, r) => { const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}` }
const overlay = s => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:3">${s}</svg>`
// estela del arco rápido: tramos anteriores cada vez más tenues (desenfoque de movimiento sólo en el tramo rápido)
const trail = (end, n = 4) => Array.from({ length: n }, (_, i) => `<path d="${arcPath(end - 60 - i * 14, end - 8 - i * 14, P.ring.r)}" fill="none" stroke="${T}" stroke-opacity="${0.35 - i * 0.08}" stroke-width="${P.arc.strokePx}" stroke-linecap="round"/>`).join('')
const pulse = (deg) => { const [x, y] = pt(deg, P.ring.r); return `<circle cx="${x}" cy="${y}" r="${P.sphereRadiusPx * 2.6}" fill="none" stroke="${T}" stroke-opacity=".55" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${P.sphereRadiusPx * 4.2}" fill="none" stroke="${T}" stroke-opacity=".22" stroke-width="1.5"/>` }
const ring = `<span style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${T};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>`
const q = `<p style="position:absolute;left:140px;top:262px;margin:0;font:300 40px Pop;color:${SOFT};white-space:nowrap">${ring}¿Tu marketing mide lo que vende?</p>`
const ans = (siStyle = '') => `<p data-sel style="position:absolute;left:128px;top:352px;margin:0;font:760 170px Bric;letter-spacing:-.05em;line-height:.92;color:#fff;z-index:2">Ahora<br><span style="display:inline-block;transform-origin:0 70%;${siStyle}">${answerHtml('sí', T)}</span></p>`
const end = P.arc.startDeg + (P.arc.endDeg - P.arc.startDeg)
const frames = [
  ['0,0–0,3 s · Anticipación', 'Navy vacío. El anillo aparece chico y la esfera retrocede antes de salir.', `<div style="position:absolute;inset:0;background:${DARK}"></div>${overlay(`<circle cx="${P.ring.cx}" cy="${P.ring.cy}" r="70" fill="none" stroke="#72ded8" stroke-opacity=".35" stroke-width="3.4"/><circle cx="${pt(-112, 70)[0]}" cy="${pt(-112, 70)[1]}" r="${P.sphereRadiusPx}" fill="${T}"/>`)}`],
  ['0,3–0,8 s · La lente se abre', 'El círculo crece y descubre la foto: la escena entra por la lente, rápido y con curva de llegada.', `${lens(RP * 0.58, 18, 1.35, 'm2')}${overlay(`<circle cx="${P.ring.cx}" cy="${P.ring.cy}" r="${RP * 0.72}" fill="none" stroke="#72ded8" stroke-opacity=".18" stroke-width="2"/><circle cx="${P.ring.cx}" cy="${P.ring.cy}" r="${RP * 0.86}" fill="none" stroke="#72ded8" stroke-opacity=".08" stroke-width="2"/>`)}`],
  ['0,8–1,2 s · El arco corre y la esfera golpea', 'Tramo rápido con estela; la esfera llega con sobrepaso y un pulso de impacto con eco.', `${lens(RP, P.arc.endDeg - P.arc.startDeg, 1.2, 'm3')}${overlay(trail(end) + pulse(end))}`],
  ['1,2–1,8 s · La voz entra con sobrepaso', 'Pregunta primero; «Ahora» ya asentó; «sí» llega un 12 % más grande y se asienta.', `${lens(RP, P.arc.endDeg - P.arc.startDeg, 1.2, 'm4')}${q}${ans('transform:scale(1.12);opacity:.75')}`],
  ['1,8–2,4 s · La selección encaja', 'Los corchetes de AXIS se ajustan a la respuesta y entra el cursor de Growth. Un protagonista a la vez.', `${lens(RP, P.arc.endDeg - P.arc.startDeg, 1.2, 'm5')}${q}${ans()}`, true],
  ['2,4–4,4 s · Sostén', 'Todo quieto salvo la foto, que respira dentro de la lente (hasta 10 %). Este cuadro es el estático de respaldo.', `${lens(RP, P.arc.endDeg - P.arc.startDeg, 1.32, 'm6')}${q}${ans()}`, true],
  ['4,4–5,4 s · Cierre: reveal', 'El reveal aprobado v1.1, el mismo cierre del audiovisual: la nave entra en su órbita y se asienta.', `<img src="data:image/png;base64,${readFileSync('out-dwm/reveal-1.0.png').toString('base64')}" style="position:absolute;inset:0;width:${W}px;height:${H}px">`],
  ['5,4–8,0 s · Tapa final', 'Logo con el eslogan: la tapa de cierre del reveal. Con sonido, el golpe del lenguaje de movimiento.', `<img src="data:image/png;base64,${readFileSync('out-dwm/reveal-final.png').toString('base64')}" style="position:absolute;inset:0;width:${W}px;height:${H}px">`]
]
const head = `<style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Poppins;src:url(${f64('Poppins-Bold.ttf')});font-weight:700}body{margin:0;background:${DARK}}</style>`
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage({ viewport: { width: W, height: H } })
const shots = []
for (const [i, [t, cap, body, sel]] of frames.entries()) {
  const wrap = x => `<html><head>${head}</head><body><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${DARK}">${body}${x}</div></body></html>`
  await pg.setContent(wrap(''), { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready)
  if (sel) {
    const box = await pg.evaluate(() => { const e = document.querySelector('[data-sel]'); const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect(); return { left: b.left, top: b.top + b.height * 0.1, right: b.right, bottom: b.bottom - b.height * 0.05 } })
    const m = resolveCollaborationSelectionIntent({ targetId: 'r', targetKind: 'text', variant: 'eight-handles', padding: 'standard', overlay: 'subtle', cursors: [{ id: 'g', kind: 'collaborator', targetId: 'r', anchor: 'bottom-end', action: 'resize', label: 'Growth', participantKind: 'role' }] })
    const rs = renderCollaborationSelection({ manifest: m, targetBounds: box, canvas: { width: W, height: H }, measureLabel: (l, s) => l.length * s * 0.62, presentation: { collaboratorScale: 1.6 } })
    await pg.setContent(wrap(overlay(rs.underlay).replace('z-index:3', 'z-index:1') + overlay(rs.overlay).replace('z-index:3', 'z-index:4')), { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready)
  }
  const buf = await pg.screenshot()
  shots.push({ t, cap, src: 'data:image/jpeg;base64,' + (await sharp(buf).resize(800).jpeg({ quality: 84 }).toBuffer()).toString('base64') })
}
const board = `<html><head><style>@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}body{margin:0;background:#F4F6F8}</style></head><body><div id="b" style="padding:40px;width:1760px">
<p style="margin:0 0 22px;font:600 22px Pop;color:#00284D">Motion · 8 s con foto fija · el lenguaje de movimiento de la órbita, cuadro a cuadro</p>
<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:34px 28px">${shots.map(s => `<figure style="margin:0"><img src="${s.src}" style="width:100%;display:block;border-radius:4px"><figcaption style="margin-top:10px;font:600 15px Pop;color:#00284D">${s.t}</figcaption><p style="margin:3px 0 0;font:300 14px/1.45 Pop;color:#3a4756">${s.cap}</p></figure>`).join('')}</div></div></body></html>`
await pg.setViewportSize({ width: 1840, height: 1000 })
await pg.setContent(board, { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready)
await (await pg.$('#b')).screenshot({ path: 'out-dwm/Motion2.png' }); await b.close()
await sharp('out-dwm/Motion2.png').jpeg({ quality: 86 }).toFile('out-dwm/Motion2.jpg')
console.log((await sharp('out-dwm/Motion2.jpg').metadata()).width, (await sharp('out-dwm/Motion2.jpg').metadata()).height)
