// Hero web Efeonce — tres direcciones con punch: A lente gigante + selección AXIS, B foto de puesta en escena a
// sangre + tipografía gigante con selección, C el foco (spotlightRecipe tal cual). Más el teléfono de A.
// Selección y cursores: resolveCollaborationSelectionIntent + renderCollaborationSelection (los de producción).
import { paintGraphicLine, answerHtml, spotlightRecipe, recipeHtml } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { resolveGraphicLineIntent } from '/Users/jreye/Documents/axis-design-system/packages/contracts/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { resolveCollaborationSelectionIntent } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-ui-contracts/dist/index.js'
import { renderCollaborationSelection } from '/Users/jreye/Documents/greenhouse-eo/scripts/creative/layout-compiler/axis-advertising.mjs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync } from 'node:fs'

const R = '/Users/jreye/Documents/greenhouse-eo/'
const OUT = new URL('./out-hero/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const logo = 'data:image/svg+xml;base64,' + readFileSync(R + 'node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-negative.svg').toString('base64')
const img = async (file, w, h) => 'data:image/jpeg;base64,' + (await sharp(R + file).resize(w, h, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer()).toString('base64')
const T = GL.color.teal, DARK = GL.color.dark, SOFT = GL.slogan.leadColor.onDark, LR = 837.07 / 196.68
const P2 = 'ai-generations/2026-09-26_deck-web-motion/plates/P2-web-hero-taller.png'
const H1 = 'ai-generations/2026-09-26_web-hero/plates/H1-estratega-mira.png'
const ring = `<span style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${T};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>`
const nav = (W, pad = 56) => `<div style="position:absolute;left:0;top:0;width:${W}px;height:84px;display:flex;align-items:center;justify-content:space-between;padding:0 ${pad}px;box-sizing:border-box;z-index:5">
<img src="${logo}" style="width:150px;height:${150 / LR}px">
<div style="display:flex;gap:36px;align-items:center;font:400 16px Pop;color:#E2E2E2"><span>Servicios</span><span>Casos</span><span>Insights</span><span>Nosotros</span>
<span style="padding:12px 24px;border-radius:999px;border:1.5px solid ${T};color:#fff;font-weight:500">Conversemos</span></div></div>`
const cta = (x, y, t = 'Agenda un diagnóstico') => `<span style="position:absolute;left:${x}px;top:${y}px;padding:18px 34px;border-radius:999px;background:${T};color:${DARK};font:600 18px Pop;z-index:4">${t}</span>`
const measureLabel = (label, size) => label.length * size * 0.62

function lens(W, H, photo, circle, id, sweep = 50) {
  const m = resolveGraphicLineIntent({ canvas: { width: W, height: H, line: 'growth', surface: 'dark', channel: 'screen' }, elements: [{ kind: 'lens', id: 'lens', photoId: 'ph', alt: 'x', region: 'center-end', accentSphere: 'upper-start' }] })
  const el = m.elements[0]
  const p = GL.pieces.lens['deck-cover'], k = circle.r / (p.ring.r / (1 + GL.orbit.ringAirRatio))
  el.ring = { ...el.ring, strokePx: p.ring.strokePx * k, opacity: p.ring.opacity }
  el.arc = { ...el.arc, strokePx: p.arc.strokePx * k, startDeg: p.arc.startDeg, sweepDeg: sweep }
  el.sphere = { ...el.sphere, radiusPx: p.sphereRadiusPx * k }
  if (el.inside) el.inside = { ...el.inside, zoom: 1 }
  return paintGraphicLine(m, { photos: { ph: photo }, background: true, idPrefix: id, circles: { lens: circle } }).svg.replace('<svg ', '<svg style="position:absolute;inset:0" ')
}

const pieces = []
// A · lente gigante + selección AXIS sobre la respuesta
{
  const W = 1440, H = 900
  const photo = await img(P2, W, H)
  pieces.push({ id: 'A-lente', W, H, sel: { cursors: [{ id: 'local', kind: 'local', anchor: 'end-center', action: 'select' }, { id: 'e', kind: 'collaborator', anchor: 'bottom-end', action: 'resize', label: 'Estrategia', participantKind: 'role' }], scale: 1.5 },
    body: `${lens(W, H, photo, { cx: 1050, cy: 500, r: 330 }, 'ha')}${nav(W)}
<p style="position:absolute;left:96px;top:250px;margin:0;font:300 30px Pop;line-height:1.3;color:${SOFT};white-space:nowrap">${ring}¿Qué hace Efeonce?</p>
<p data-sel style="position:absolute;left:92px;top:300px;margin:0;font:760 200px Bric;letter-spacing:-.045em;line-height:1;color:#fff;white-space:nowrap">${answerHtml('Crecer', T)}</p>
<p style="position:absolute;left:96px;top:560px;width:470px;margin:0;font:300 20px/1.55 Pop;color:#C9D4DF">Estrategia, contenido y datos en un mismo equipo. Lo que hacemos se ve, y se mide desde el primer mes.</p>
${cta(96, 680)}` })
}
// B · foto de puesta en escena a sangre + tipografía gigante con selección
{
  const W = 1440, H = 900
  const photo = await img(H1, W, H)
  pieces.push({ id: 'B-sangre', W, H, sel: { cursors: [{ id: 'local', kind: 'local', anchor: 'end-center', action: 'select' }, { id: 'g', kind: 'collaborator', anchor: 'bottom-end', action: 'resize', label: 'Growth', participantKind: 'role' }], scale: 1.5 },
    body: `<img src="${photo}" style="position:absolute;inset:0;width:${W}px;height:${H}px">${nav(W)}
<p style="position:absolute;left:96px;top:300px;margin:0;font:300 30px Pop;line-height:1.3;color:${SOFT};white-space:nowrap">${ring}¿Tu marketing ya mide lo que vende?</p>
<p data-sel style="position:absolute;left:90px;top:352px;margin:0;font:760 190px Bric;letter-spacing:-.045em;line-height:1;color:#fff;white-space:nowrap">${answerHtml('Ahora sí', T)}</p>
${cta(96, 620, 'Conversemos')}` })
}
// C · el foco (receta tal cual, lienzo 1920 escalado a 1440) con su prueba
{
  const photo = await img(H1, 1920, 1080)
  const rec = spotlightRecipe('photo', { photoId: 'h1', photoSrc: photo, alt: 'La estratega muestra el tablero', answer: 'Te hacemos visible', proof: 'Y lo medimos.' })
  pieces.push({ id: 'C-foco', W: 1440, H: 810, body: `<div style="position:absolute;left:0;top:0;width:1920px;height:1080px;transform:scale(.75);transform-origin:0 0">${recipeHtml(rec)}</div>${nav(1440)}${cta(106, 600, 'Conversemos')}` })
}
// A en el teléfono: la lente arriba (su círculo entra entero), la respuesta grande con su selección debajo
{
  const W = 390, H = 844
  // lienzo del teléfono con el recorte de la escena (sujetos) exactamente en la caja del círculo
  const crop = await sharp(R + P2).extract({ left: 792, top: 24, width: 1000, height: 1000 }).resize(390, 390).toBuffer()
  const photo = 'data:image/jpeg;base64,' + (await sharp({ create: { width: W, height: H, channels: 3, background: '#0a0f14' } }).composite([{ input: crop, left: 0, top: 55 }]).jpeg({ quality: 90 }).toBuffer()).toString('base64')
  pieces.push({ id: 'A-movil', W, H, sel: { cursors: [{ id: 'e', kind: 'collaborator', anchor: 'bottom-end', action: 'resize', label: 'Growth', participantKind: 'role' }], scale: 0.85 },
    body: `${lens(W, H, photo, { cx: 200, cy: 250, r: 138 }, 'hm')}
<div style="position:absolute;left:0;top:0;width:${W}px;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;box-sizing:border-box;z-index:5"><img src="${logo}" style="width:112px;height:${112 / LR}px"><span style="font:300 28px Pop;color:#E2E2E2">≡</span></div>
<p style="position:absolute;left:22px;top:450px;margin:0;font:300 18px Pop;color:${SOFT};white-space:nowrap">${ring}¿Qué hace Efeonce?</p>
<p data-sel style="position:absolute;left:20px;top:478px;margin:0;font:760 92px Bric;letter-spacing:-.045em;line-height:1;color:#fff;white-space:nowrap">${answerHtml('Crecer', T)}</p>
<p style="position:absolute;left:22px;top:640px;width:340px;margin:0;font:300 16px/1.5 Pop;color:#C9D4DF">Estrategia, contenido y datos en un mismo equipo, medido desde el primer mes.</p>
<span style="position:absolute;left:22px;top:740px;padding:15px 28px;border-radius:999px;background:${T};color:${DARK};font:600 16px Pop">Agenda un diagnóstico</span>` })
}

const head = `<style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:'Bricolage Grotesque';src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-Regular.ttf')});font-weight:400}@font-face{font-family:Pop;src:url(${f64('Poppins-Medium.ttf')});font-weight:500}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}@font-face{font-family:Poppins;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Poppins;src:url(${f64('Poppins-Regular.ttf')});font-weight:400}@font-face{font-family:Poppins;src:url(${f64('Poppins-Bold.ttf')});font-weight:700}body{margin:0;background:${DARK}}[data-sel]{z-index:2}</style>`
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage()
for (const p of pieces) {
  await pg.setViewportSize({ width: p.W, height: p.H })
  const wrap = extra => `<html><head>${head}</head><body><div style="position:relative;width:${p.W}px;height:${p.H}px;overflow:hidden;background:${DARK}">${p.body}${extra}</div></body></html>`
  await pg.setContent(wrap(''), { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready)
  let extra = ''
  if (p.sel) {
    // la caja de la respuesta CON su esfera (la esfera es parte del texto)
    const box = await pg.evaluate(() => { const e = document.querySelector('[data-sel]'); const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect(); const s = e.querySelector('[data-part="sphere"], span:last-child').getBoundingClientRect(); return { left: b.left, top: b.top + b.height * 0.12, right: Math.max(b.right, s.right), bottom: b.bottom - b.height * 0.1 } })
    const manifest = resolveCollaborationSelectionIntent({ targetId: 'r', targetKind: 'text', variant: 'eight-handles', padding: 'standard', overlay: 'subtle',
      cursors: p.sel.cursors.map(c => c.kind === 'local' ? { id: c.id, kind: 'local', targetId: 'r', anchor: c.anchor, action: c.action } : { ...c, targetId: 'r' }) })
    const rs = renderCollaborationSelection({ manifest, targetBounds: box, canvas: { width: p.W, height: p.H }, measureLabel, presentation: { collaboratorScale: p.sel.scale, localCursorScale: p.sel.scale * 0.7 } })
    if (!rs.evidence.withinCanvas) console.warn(p.id, 'selección fuera del lienzo')
    const svg = (s, z) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.W} ${p.H}" width="${p.W}" height="${p.H}" style="position:absolute;inset:0;z-index:${z};pointer-events:none">${s}</svg>`
    extra = svg(rs.underlay, 1) + svg(rs.overlay, 3)
    await pg.setContent(wrap(extra), { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready)
  }
  await pg.screenshot({ path: OUT + p.id + '.png' })
  await sharp(OUT + p.id + '.png').jpeg({ quality: 88 }).toFile(OUT + p.id + '.jpg')
}
await b.close(); console.log(pieces.map(p => p.id).join(' '))
