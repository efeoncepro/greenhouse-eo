#!/usr/bin/env node
/**
 * Construye la marca de Efeonce Rooms en vectores. Aprobada por el operador el 2026-10-08 (canvas «Efeonce Rooms — Logo»,
 * ruta B «Encuentro»; ADR docs/architecture/rooms/EFEONCE_ROOMS_MARK_DECISION_V1.md).
 *
 * La regla de la familia, «la órbita vive en la O», aplicada a una palabra con dos «o»: las dos «o» de «Rooms» son dos
 * órbitas enlazadas (quien propone y quien decide, en la misma sala) y la única esfera de la marca se posa en el cruce de
 * arriba, el punto de encuentro, en el acento Growth. En el cruce de abajo la segunda órbita pasa por encima de la
 * primera. Mismo anillo (64 unidades), misma esfera (88) y mismo aire (22) que Factory y Marketing Studio; los cortes se
 * calculan como contornos, sin máscaras, para que el archivo se vea igual en cualquier visor.
 *
 * Piezas (cada una en `positive`, `negative` y `white`):
 *  - `rooms-logo`: la palabra sola, en tinta.
 *  - `rooms-lockup`: Efeonce | Rooms, la pieza por defecto.
 *  - `rooms-compact`: efeonce Rooms sin filete, para espacios muy angostos.
 *  - `rooms-stacked-lockup`: Efeonce arriba, Rooms debajo.
 *  - `rooms-isotype`: las dos órbitas enlazadas con la esfera, sin letra (favicon, avatar, ícono de la sala).
 *  - `rooms-icon`: la nave de Efeonce sobre «Rooms» liso (lo que circula suelto: una sola esfera, la de la nave).
 *
 * Junto a Efeonce el producto baja su brillo al gris medido de la marca y sólo la esfera conserva el acento.
 *
 * Uso: node scripts/brand/build-rooms-logos.mjs <directorio-de-salida>
 * Canon: @efeoncepro/axis-brand-assets (`rooms-*`). Regenerar = correr esto, copiar a packages/brand-assets/assets/ y
 * volver a sellar; nunca editar los SVG a mano.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as fontkit from 'fontkit'
import { efeonceGraphicLine as GL } from '@efeoncepro/axis-tokens'

import { orbitRingPath } from './orbit-ring.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const FONTS = path.resolve(here, '../../src/assets/fonts')
const EFEONCE_ASSETS = path.resolve(here, '../../node_modules/@efeoncepro/axis-brand-assets/assets')
const outDir = process.argv[2]

if (!outDir) throw new Error('Uso: build-rooms-logos.mjs <directorio-de-salida>')

const BOLD = fontkit.openSync(path.join(FONTS, 'Poppins-Bold.ttf'))
const TRACKING = -18 // el mismo cierre que Insights, las submarcas SEO/AEO, Marketing Studio y Factory

const growth = GL.lines.find(line => line.key === 'growth')

if (!growth) throw new Error('La línea Growth no está en efeonceGraphicLine.lines')

// Tinta, acento, gris de producto y filete de cada variante; todo sale de los tokens de la línea.
const VARIANTS = {
  positive: { ink: GL.color.navy, accent: growth.accentOnLight, endorsed: GL.slogan.leadColor.onLight, rule: { color: GL.color.navy, opacity: 0.25 } },
  negative: { ink: '#ffffff', accent: growth.accentOnDark, endorsed: GL.urlBubble.bakedOnDark, rule: { color: '#cfe4fa', opacity: 0.3 } },
  white: { ink: '#ffffff', accent: '#ffffff', endorsed: '#ffffff', rule: { color: '#ffffff', opacity: 0.5 } }
}

// Geometría de la órbita (unidades de fuente, 1000 por em): la de la familia. LINK = separación de los centros de las
// dos órbitas sobre el radio medio del anillo (aprobada en 1,3: el cruce de abajo se lee y la esfera queda bajo la
// altura de mayúsculas).
const ORBIT = { stroke: 64, sphereR: 88, knock: 22, deg: 45 }
const LINK = 1.3

const f = n => Number(n.toFixed(2))

// Un punto a ángulo t (desde las 12, en sentido horario) y radio rho alrededor de c. Coordenadas de fuente (y arriba).
const at = (c, rho, t) => ({ x: c.x + rho * Math.sin(t), y: c.y + rho * Math.cos(t) })
const pt = p => `${f(p.x)} ${f(p.y)}`

// Arco corto de P a Q sobre el círculo (C, R): el sentido sale del producto cruz.
function shortArc(C, R, P, Q) {
  const cross = (P.x - C.x) * (Q.y - C.y) - (P.y - C.y) * (Q.x - C.x)

  return `A${f(R)} ${f(R)} 0 0 ${cross > 0 ? 1 : 0} ${pt(Q)}`
}

// Tramo de anillo entre dos cortes: arco exterior en sentido horario de t1 a t2, tapa de salida sobre el círculo de
// corte, arco interior de vuelta y tapa de entrada. Los ángulos ya vienen resueltos por borde (exterior e interior).
function ringSegment(c, r, { t1o, t1i, t2o, t2i, capIn, capOut }) {
  const ro = r + ORBIT.stroke / 2
  const ri = r - ORBIT.stroke / 2
  const span = (b, a) => ((b - a) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
  const o1 = at(c, ro, t1o)
  const o2 = at(c, ro, t2o)
  const i1 = at(c, ri, t1i)
  const i2 = at(c, ri, t2i)

  return (
    `M${pt(o1)}A${f(ro)} ${f(ro)} 0 ${span(t2o, t1o) > Math.PI ? 1 : 0} 0 ${pt(o2)}` +
    shortArc(capOut.C, capOut.R, o2, i2) +
    `A${f(ri)} ${f(ri)} 0 ${span(t2i, t1i) > Math.PI ? 1 : 0} 1 ${pt(i1)}` +
    shortArc(capIn.C, capIn.R, i1, o1) +
    'Z'
  )
}

// Las dos órbitas enlazadas. c1 a la izquierda, c2 a la derecha, ambas de radio medio r, a distancia d = LINK · r.
// S (la esfera) es el cruce de arriba de los dos radios medios.
function linkGeometry(c1x, cy, r) {
  const d = LINK * r
  const c1 = { x: c1x, y: cy }
  const c2 = { x: c1x + d, y: cy }
  const h = Math.sqrt(r * r - (d / 2) ** 2)
  const S = { x: c1x + d / 2, y: cy + h }

  return { c1, c2, r, d, S }
}

function linkMarkup(g, ink, accent) {
  const { c1, c2, r, d, S } = g
  const k = ORBIT.sphereR + ORBIT.knock
  const ro = r + ORBIT.stroke / 2
  const ri = r - ORBIT.stroke / 2
  // Corte de la esfera sobre la órbita de radio medio r: semiángulo visto desde su centro, por borde.
  const half = rho => Math.acos((rho * rho + r * r - k * k) / (2 * rho * r))
  // Banda de la segunda órbita, ensanchada por el aire: corta a la primera en el cruce de abajo.
  const bandIn = r - ORBIT.stroke / 2 - ORBIT.knock
  const bandOut = r + ORBIT.stroke / 2 + ORBIT.knock
  // Ángulo (desde c1) donde el círculo de radio rho alrededor de c1 corta el de radio R alrededor de c2, en la mitad de abajo.
  const below = (rho, R) => Math.PI / 2 + Math.acos((rho * rho + d * d - R * R) / (2 * rho * d))
  const a1 = Math.atan2(S.x - c1.x, S.y - c1.y)
  const a2 = Math.atan2(S.x - c2.x, S.y - c2.y)
  const sphereCap = { C: S, R: k }

  // Primera órbita: dos tramos. El corto va de la esfera al cruce de abajo; el largo, del cruce de abajo a la esfera.
  const short = ringSegment(c1, r, {
    t1o: a1 + half(ro), t1i: a1 + half(ri), t2o: below(ro, bandIn), t2i: below(ri, bandIn),
    capIn: sphereCap, capOut: { C: c2, R: bandIn }
  })

  const long = ringSegment(c1, r, {
    t1o: below(ro, bandOut), t1i: below(ri, bandOut), t2o: a1 - half(ro) + 2 * Math.PI, t2i: a1 - half(ri) + 2 * Math.PI,
    capIn: { C: c2, R: bandOut }, capOut: sphereCap
  })

  // Segunda órbita: entera salvo el corte de la esfera, como el anillo de cualquier submarca.
  const second = orbitRingPath({ cx: c2.x, cy: c2.y, r, stroke: ORBIT.stroke, a: a2, sphereR: ORBIT.sphereR, knock: ORBIT.knock })

  return `<path fill="${ink}" d="${short}${long}${second}"/><circle fill="${accent}" cx="${f(S.x)}" cy="${f(S.y)}" r="${ORBIT.sphereR}"/>`
}

// ─── Palabra: «Rooms» con las dos «o» enlazadas, o liso ──────────────────────────────────────────────────────
function word(text, { link }) {
  const layout = BOLD.layout(text)
  const ink = []
  const links = []
  let x = 0
  let top = -Infinity
  let bottom = Infinity

  for (let i = 0; i < layout.glyphs.length; i++) {
    const g = layout.glyphs[i]
    const bb = g.bbox

    top = Math.max(top, bb.maxY)
    bottom = Math.min(bottom, bb.minY)

    if (link && text[i] === 'o' && text[i + 1] === 'o') {
      const rOut = (bb.maxY - bb.minY) / 2
      const geo = linkGeometry(x + bb.minX + rOut, (bb.minY + bb.maxY) / 2, rOut - ORBIT.stroke / 2)
      const next = layout.glyphs[i + 1]

      top = Math.max(top, geo.S.y + ORBIT.sphereR)
      links.push(geo)
      x = geo.c2.x + rOut + (layout.positions[i + 1].xAdvance - next.bbox.maxX) + TRACKING
      i++
    } else {
      if (g.path.commands.length) ink.push(g.path.translate(x, 0).toSVG())
      x += layout.positions[i].xAdvance + TRACKING
    }
  }

  return { ink, links, right: x - TRACKING, top, bottom }
}

function wordSvg(b, ink, accent, label) {
  const links = b.links.map(geo => linkMarkup(geo, ink, accent)).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(b.right)} ${f(b.top - b.bottom)}" role="img" aria-label="${label}"><g transform="translate(0 ${f(b.top)}) scale(1 -1)"><path fill="${ink}" d="${b.ink.join(' ')}"/>${links}</g></svg>\n`
}

// ─── Símbolo: las dos órbitas enlazadas, sin letra ──────────────────────────────────────────────────────────
// Mismo anillo, esfera y aire que en la palabra (radio medio 210): a tamaño de favicon el enlace sigue leyéndose. El
// cuadro ajusta al ancho de las dos órbitas, como los isotipos de la familia ajustan al de su órbita.
function isotype({ ink, accent }) {
  const r = 210
  const geo = linkGeometry(-(LINK * r) / 2, 0, r)
  const rOut = r + ORBIT.stroke / 2
  const width = geo.d + 2 * rOut
  const top = Math.max(rOut, geo.S.y + ORBIT.sphereR)
  const bottom = -rOut
  const side = Math.max(width, top - bottom)
  const cy = (top + bottom) / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(side)} ${f(side)}" role="img" aria-label="Efeonce Rooms"><g transform="translate(${f(side / 2)} ${f(side / 2 + cy)}) scale(1 -1)">${linkMarkup(geo, ink, accent)}</g></svg>\n`
}

// ─── Piezas de Efeonce (logo e isotipo del paquete) ──────────────────────────────────────────────────────────
const viewBoxOf = s => s.match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number)

const efeonceAsset = (kind, variant) => {
  const raw = fs.readFileSync(path.join(EFEONCE_ASSETS, `efeonce-${kind}-${variant === 'positive' ? 'positive' : 'negative'}.svg`), 'utf8')
  const fills = Object.fromEntries([...raw.matchAll(/\.(cls-\d+)\s*\{\s*fill:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]))

  // El archivo trae su color en un <style>: se pasa a atributos para que ningún visor lo pierda. En `white` todo es blanco.
  return raw
    .replace(/<\?xml[^>]*>/, '')
    .replace(/<defs>[\s\S]*?<\/defs>/, '')
    .replace(/class="(cls-\d+)"/g, (_, c) => `fill="${variant === 'white' ? '#ffffff' : (fills[c] ?? '#000')}"`)
    .replace(/\s(id|data-name)="[^"]*"/g, '')
}

const nest = (source, x, y, { h, w }) => {
  const [, , vw, vh] = viewBoxOf(source)
  const width = w ?? (vw * h) / vh
  const height = h ?? (vh * w) / vw
  const body = source.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

  return { w: width, h: height, markup: `<svg x="${f(x)}" y="${f(y)}" width="${f(width)}" height="${f(height)}" viewBox="0 0 ${vw} ${vh}">${body}</svg>` }
}

const doc = (w, h, label, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(w)} ${f(h)}" role="img" aria-label="${label}">${inner}</svg>\n`

// Medidas de la familia: Efeonce a 30 de alto, 20 de aire, filete 1 × 26, 20 de aire; las letras del producto miden
// como las de Efeonce (21 px para 719 unidades de fuente).
const LOCKUP = { efeonceH: 30, gap: 20, compactGap: 16, ruleW: 1, ruleH: 26 }
const MARK_PX_PER_UNIT = 21 / 719

function horizontal(b, variant, label, withRule) {
  const v = VARIANTS[variant]
  const mark = wordSvg(b, v.endorsed, v.accent, label)
  const markH = (b.top - b.bottom) * MARK_PX_PER_UNIT
  const H = Math.max(LOCKUP.efeonceH, LOCKUP.ruleH, markH)
  const e = nest(efeonceAsset('logo', variant), 0, (H - LOCKUP.efeonceH) / 2, { h: LOCKUP.efeonceH })
  let x = e.w + (withRule ? LOCKUP.gap : LOCKUP.compactGap)
  let rule = ''

  if (withRule) {
    rule = `<rect x="${f(x)}" y="${f((H - LOCKUP.ruleH) / 2)}" width="${LOCKUP.ruleW}" height="${LOCKUP.ruleH}" fill="${v.rule.color}" fill-opacity="${v.rule.opacity}"/>`
    x += LOCKUP.ruleW + LOCKUP.gap
  }

  const m = nest(mark, x, (H - markH) / 2, { h: markH })

  return doc(x + m.w, H, label, e.markup + rule + m.markup)
}

// Apilado: Efeonce arriba; el producto centrado debajo, a una fracción del ancho de Efeonce.
function stacked(b, variant, label, widthRatio) {
  const v = VARIANTS[variant]
  const e = nest(efeonceAsset('logo', variant), 0, 0, { h: LOCKUP.efeonceH })
  const mw = e.w * widthRatio
  const gap = LOCKUP.efeonceH * 0.42
  const m = nest(wordSvg(b, v.endorsed, v.accent, label), (e.w - mw) / 2, LOCKUP.efeonceH + gap, { w: mw })

  return doc(e.w, LOCKUP.efeonceH + gap + m.h, label, e.markup + m.markup)
}

// Ícono: la nave (ya trae su órbita y su esfera) sobre «Rooms» liso en gris: una sola esfera por pieza.
function icon(variant) {
  const v = VARIANTS[variant]
  const isoH = 100
  const ship = nest(efeonceAsset('isotype', variant), 0, 0, { h: isoH })
  const plain = word('Rooms', { link: false })
  const w = nest(wordSvg(plain, v.endorsed, v.accent, 'Rooms'), ship.w * 0.04, isoH + 24, { w: ship.w * 0.92 })

  return doc(ship.w, isoH + 24 + w.h, 'Efeonce Rooms', ship.markup + w.markup)
}

// ─── Salida ──────────────────────────────────────────────────────────────────────────────────────────────────
fs.mkdirSync(outDir, { recursive: true })
const written = []
const write = (name, content) => { fs.writeFileSync(path.join(outDir, name), content); written.push(name) }

const rooms = word('Rooms', { link: true })
const LABEL = 'Efeonce Rooms'

for (const variant of Object.keys(VARIANTS)) {
  const v = VARIANTS[variant]

  write(`rooms-logo-${variant}.svg`, wordSvg(rooms, v.ink, v.accent, LABEL))
  write(`rooms-lockup-${variant}.svg`, horizontal(rooms, variant, LABEL, true))
  write(`rooms-compact-${variant}.svg`, horizontal(rooms, variant, LABEL, false))
  write(`rooms-stacked-lockup-${variant}.svg`, stacked(rooms, variant, LABEL, 0.62))
  write(`rooms-isotype-${variant}.svg`, isotype(v))
  write(`rooms-icon-${variant}.svg`, icon(variant))
}

console.log(JSON.stringify({ accent: growth.accentOnLight, link: LINK, files: written.length }))
