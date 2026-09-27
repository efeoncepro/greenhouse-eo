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

