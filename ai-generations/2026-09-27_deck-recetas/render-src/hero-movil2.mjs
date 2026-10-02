// Hero web en teléfono, mobile-first de verdad: toma vertical nativa a sangre (M2, uniforme), la voz gigante arriba
// sobre el cielo calmo con su selección AXIS, y el grupo CTA en la zona del pulgar sobre el lecho. Se renderiza el
// MISMO html a 360, 390 y 430 de ancho: tipografía y posiciones salen del ancho/alto, no de coordenadas fijas.
import { answerHtml } from '/Users/jreye/Documents/axis-design-system/packages/graphic-line/dist/index.js'
import { efeonceGraphicLine as GL } from '/Users/jreye/Documents/axis-design-system/packages/tokens/dist/index.js'
import { resolveCollaborationSelectionIntent } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-ui-contracts/dist/index.js'
import { renderCollaborationSelection } from '/Users/jreye/Documents/greenhouse-eo/scripts/creative/layout-compiler/axis-advertising.mjs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright-core/index.mjs'
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
import { readFileSync, mkdirSync } from 'node:fs'
const R = '/Users/jreye/Documents/greenhouse-eo/', OUT = new URL('./out-movil/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const f64 = n => 'data:font/ttf;base64,' + readFileSync(R + 'src/assets/fonts/' + n).toString('base64')
const logo = 'data:image/svg+xml;base64,' + readFileSync(R + 'node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-negative.svg').toString('base64')
const T = GL.color.teal, DARK = GL.color.dark, SOFT = GL.slogan.leadColor.onDark, LR = 837.07 / 196.68
const PLATE = process.env.PLATE ?? 'M2-voltea-chaqueta', CX = Number(process.env.CX ?? 610) / 1024
const SRC = R + `ai-generations/2026-09-26_web-movil/plates/${PLATE}.png`
const measureLabel = (l, s) => l.length * s * 0.62
const ring = `<span style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${T};border-radius:50%;margin-right:.35em;vertical-align:.08em;box-sizing:border-box"></span>`
const sizes = [[360, 780, 'Android compacto'], [390, 844, 'iPhone 15'], [430, 932, 'iPhone Pro Max']]
const head = `<style>@font-face{font-family:Bric;src:url(${f64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}@font-face{font-family:Pop;src:url(${f64('Poppins-Light.ttf')});font-weight:300}@font-face{font-family:Pop;src:url(${f64('Poppins-SemiBold.ttf')});font-weight:600}@font-face{font-family:Poppins;src:url(${f64('Poppins-Bold.ttf')});font-weight:700}body{margin:0;background:${DARK}}</style>`
const b = await chromium.launch({ channel: 'chrome' }); const pg = await b.newPage()
const shots = []
for (const [W, H, name] of sizes) {
  const sw = Math.round(1024 * H / 1792), left = Math.max(0, Math.min(sw - W, Math.round(CX * sw - W / 2)))
  const photo = 'data:image/jpeg;base64,' + (await sharp(SRC).resize(sw, H).extract({ left, top: 0, width: W, height: H }).jpeg({ quality: 90 }).toBuffer()).toString('base64')
  const g = Math.round(W * 0.06), fs = Math.round(W * 0.218), top = Math.round(H * 0.135), SB = Math.round(H * 0.056)
  const body = `<img src="${photo}" style="position:absolute;inset:0;width:${W}px;height:${H}px">
<div style="position:absolute;left:0;top:0;width:${W}px;height:${SB}px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 ${Math.round(W*0.085)}px 6px;box-sizing:border-box;z-index:6;font:600 ${Math.round(W*0.042)}px Pop;color:#fff"><span>9:41</span><svg width="${Math.round(W*0.17)}" height="13" viewBox="0 0 66 13"><rect x="0" y="8" width="3.5" height="5" rx="1" fill="#fff"/><rect x="5.5" y="5.5" width="3.5" height="7.5" rx="1" fill="#fff"/><rect x="11" y="3" width="3.5" height="10" rx="1" fill="#fff"/><rect x="16.5" y="0" width="3.5" height="13" rx="1" fill="#fff"/><path d="M26 5a10 10 0 0 1 14 0M29 8a5.5 5.5 0 0 1 8 0" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="33" cy="11" r="1.6" fill="#fff"/><rect x="44" y="1" width="19" height="11" rx="3" stroke="#fff" stroke-opacity=".5" fill="none"/><rect x="46" y="3" width="14" height="7" rx="1.5" fill="#fff"/><rect x="64" y="4.5" width="1.6" height="4" rx=".8" fill="#fff" fill-opacity=".5"/></svg></div>
<div style="position:absolute;left:${Math.round(W/2-W*0.17)}px;top:${H-10}px;width:${Math.round(W*0.34)}px;height:5px;border-radius:3px;background:#fff;z-index:6"></div>
<div style="position:absolute;left:0;top:${SB}px;width:${W}px;height:${Math.round(H * 0.065)}px;display:flex;align-items:center;justify-content:space-between;padding:0 ${g}px;box-sizing:border-box;z-index:5"><img src="${logo}" style="width:${Math.round(W * 0.27)}px;height:${W * 0.27 / LR}px"><svg width="26" height="18" viewBox="0 0 26 18"><path d="M1 2h24M1 9h24M9 16h16" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg></div>
<p style="position:absolute;left:${g}px;top:${top}px;margin:0;font:300 ${Math.round(W * 0.044)}px Pop;color:${SOFT};white-space:nowrap">${ring}¿Tu marketing mide lo que vende?</p>
<p data-sel style="position:absolute;left:${g + Math.round(fs * 0.04)}px;top:${top + Math.round(W * 0.085)}px;margin:0;font:760 ${fs}px Bric;letter-spacing:-.055em;line-height:.9;color:#fff;white-space:nowrap;z-index:2">Ahora ${answerHtml('sí', T)}</p>
<a data-cta href="#" style="position:absolute;left:${g}px;top:${Math.round(H * 0.79)}px;padding:${Math.round(W * 0.047)}px ${Math.round(W * 0.075)}px;border-radius:14px;background:${T};color:${DARK};font:600 ${Math.round(W * 0.047)}px Pop;text-decoration:none;z-index:4;white-space:nowrap">Agenda un diagnóstico</a>
<p data-desc style="position:absolute;left:${g}px;top:0;width:${W - 2 * g}px;margin:0;font:300 ${Math.round(W * 0.037)}px/1.4 Pop;color:#C9D4DF">Revisamos contigo qué mide hoy tu marketing.</p>`
  await pg.setViewportSize({ width: W, height: H })
  const wrap = x => `<html><head>${head}</head><body><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${DARK}">${body}${x}</div></body></html>`
  await pg.setContent(wrap(''), { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready)
  const box = await pg.evaluate(() => { const e = document.querySelector('[data-sel]'); const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect(); return { left: b.left, top: b.top + b.height * 0.1, right: b.right, bottom: b.bottom - b.height * 0.06 } })
  const svg = (s, z) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="position:absolute;inset:0;z-index:${z};pointer-events:none">${s}</svg>`
  const m = resolveCollaborationSelectionIntent({ targetId: 'r', targetKind: 'text', variant: 'eight-handles', padding: 'standard', overlay: 'subtle', cursors: [{ id: 'g', kind: 'collaborator', targetId: 'r', anchor: 'bottom-end', action: 'resize', label: 'Growth', participantKind: 'role' }] })
  const rs = renderCollaborationSelection({ manifest: m, targetBounds: box, canvas: { width: W, height: H }, measureLabel, presentation: { collaboratorScale: W / 560 } })
  if (!rs.evidence.withinCanvas) console.warn(W, 'selección fuera del lienzo', JSON.stringify(rs.bounds))
  let extra = svg(rs.underlay, 1) + svg(rs.overlay, 3)
  const cb = await pg.evaluate(() => { const r = document.querySelector('[data-cta]').getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom } })
  const mc = resolveCollaborationSelectionIntent({ targetId: 'cta', targetKind: 'group', variant: 'open-brackets', padding: 'compact', overlay: 'none', cursors: [{ id: 'u', kind: 'local', targetId: 'cta', anchor: 'end-center', action: 'select' }] })
  const rc = renderCollaborationSelection({ manifest: mc, targetBounds: cb, canvas: { width: W, height: H }, measureLabel, presentation: { localCursorScale: W / 380 } })
  if (!rc.evidence.withinCanvas) console.warn(W, 'CTA fuera del lienzo')
  const bottom = Math.max(rc.bounds.bottom ?? rc.bounds.top + rc.bounds.height, ...rc.evidence.cursorEvidence.map(c => c.bounds.bottom ?? (c.bounds.top + c.bounds.height)))
  extra += svg(rc.overlay, 5) + `<style>[data-desc]{top:${Math.round(bottom + W * 0.04)}px !important}</style>`
  await pg.setContent(wrap(extra), { waitUntil: 'load' }); await pg.evaluate(() => document.fonts.ready)
  const file = `${OUT}${PLATE}-${W}.png`
  await pg.screenshot({ path: file })
  const d = await pg.evaluate(() => { const r = document.querySelector('[data-desc]').getBoundingClientRect(); return r.bottom })
  console.log(W, H, 'desc bottom', Math.round(d), 'sel', JSON.stringify(box))
  shots.push({ W, H, name, file })
}
await b.close()
// lámina: los tres anchos lado a lado, alineados por abajo, a escala real
const pad = 40, gap = 48, cw = shots.reduce((a, s) => a + s.W, 0) + gap * 2 + pad * 2, ch = 932 + pad * 2 + 40
const comps = []; let x = pad
for (const s of shots) { comps.push({ input: s.file, left: x, top: pad + 40 + (932 - s.H) }); x += s.W + gap }
await sharp({ create: { width: cw, height: ch, channels: 3, background: '#F4F6F8' } }).composite(comps).png().toFile(`${OUT}${PLATE}-board.png`)
console.log('board', cw, ch)
