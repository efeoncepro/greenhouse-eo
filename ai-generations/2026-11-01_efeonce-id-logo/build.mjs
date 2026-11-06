#!/usr/bin/env node
/**
 * Propuesta de marca de Efeonce ID (la cuenta de Efeonce Auth). Exploración, NO canon: si el operador la aprueba, se
 * promueve a scripts/brand/build-efeonce-id-logos.mjs y a @efeoncepro/axis-brand-assets (`id-*`) con su ADR.
 *
 * La regla de la familia es «la órbita vive en la O». «ID» no tiene O, así que la órbita vive en la D: la panza de la D
 * es media órbita (el arco de 12 a 6, por la derecha) y la esfera va a la 1:30, la posición de toda la familia, con el
 * corte concéntrico de las terminaciones (orbit-ring.mjs). La I y el asta de la D son Poppins Bold, como las letras de
 * AEO y SV360; el anillo es fino (64) frente al asta gruesa: el mismo contraste que la O de AEO.
 * Mismo anillo (64), esfera (88) y aire (22) que Factory, Marketing Studio y Rooms.
 *
 * Uso: node ai-generations/2026-11-01_efeonce-id-logo/build.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as fontkit from 'fontkit'
import { efeonceGraphicLine as GL } from '@efeoncepro/axis-tokens'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../..')
const OUT = path.join(here, 'svg')
const BOLD = fontkit.openSync(path.join(repo, 'src/assets/fonts/Poppins-Bold.ttf'))
const EFEONCE_ASSETS = path.join(repo, 'node_modules/@efeoncepro/axis-brand-assets/assets')
const TRACKING = -18

const growth = GL.lines.find(l => l.key === 'growth')
const VARIANTS = {
  positive: { ink: GL.color.navy, accent: growth.accentOnLight, endorsed: GL.slogan.leadColor.onLight, rule: { color: GL.color.navy, opacity: 0.25 } },
  negative: { ink: '#ffffff', accent: growth.accentOnDark, endorsed: GL.urlBubble.bakedOnDark, rule: { color: '#cfe4fa', opacity: 0.3 } },
  white: { ink: '#ffffff', accent: '#ffffff', endorsed: '#ffffff', rule: { color: '#ffffff', opacity: 0.5 } }
}

const ORBIT = { stroke: 64, sphereR: 88, knock: 22, deg: 45 }
// Para ≤ 24 px: anillo y aire más gruesos, misma esfera relativa, para que la panza no se pierda en el favicon.
const ORBIT_SMALL = { stroke: 118, sphereR: 104, knock: 34, deg: 45 }

const f = n => Number(n.toFixed(2))
const at = (c, rho, t) => ({ x: c.x + rho * Math.sin(t), y: c.y + rho * Math.cos(t) })
const pt = p => `${f(p.x)} ${f(p.y)}`

function shortArc(C, R, P, Q) {
  const cross = (P.x - C.x) * (Q.y - C.y) - (P.y - C.y) * (Q.x - C.x)

  return `A${f(R)} ${f(R)} 0 0 ${cross > 0 ? 1 : 0} ${pt(Q)}`
}

// ─── La D: asta + media órbita con la esfera a la 1:30 ────────────────────────────────────────────────────
const I = BOLD.layout('I').glyphs[0]
const CAP = I.bbox.maxY
const STEM = I.bbox.maxX - I.bbox.minX

/** Media órbita (de 12 a 6 por la derecha) con el corte de la esfera. c = centro sobre el borde derecho del asta. */
function halfOrbit(c, rOut, o) {
  const r = rOut - o.stroke / 2
  const ro = rOut
  const ri = rOut - o.stroke
  const a = (o.deg * Math.PI) / 180
  const S = at(c, r, a)
  const k = o.sphereR + o.knock
  const half = rho => Math.acos((rho * rho + r * r - k * k) / (2 * rho * r))
  const overlap = 14 // entra en el asta: sin costura entre trazos del mismo color
  const top = { o: at(c, ro, 0), i: at(c, ri, 0) }
  const bottom = { o: at(c, ro, Math.PI), i: at(c, ri, Math.PI) }
  const cutO1 = at(c, ro, a - half(ro))
  const cutI1 = at(c, ri, a - half(ri))
  const cutO2 = at(c, ro, a + half(ro))
  const cutI2 = at(c, ri, a + half(ri))

  const upper =
    `M${f(top.o.x - overlap)} ${f(top.o.y)}L${pt(top.o)}` +
    shortArc(c, ro, top.o, cutO1) +
    shortArc(S, k, cutO1, cutI1) +
    shortArc(c, ri, cutI1, top.i) +
    `L${f(top.i.x - overlap)} ${f(top.i.y)}Z`

  // De la esfera a las 6 hay más de 90°, menos de 180°: un solo arco corto por borde.
  const lower =
    `M${pt(cutO2)}` +
    shortArc(c, ro, cutO2, bottom.o) +
    `L${f(bottom.o.x - overlap)} ${f(bottom.o.y)}L${f(bottom.i.x - overlap)} ${f(bottom.i.y)}L${pt(bottom.i)}` +
    shortArc(c, ri, bottom.i, cutI2) +
    shortArc(S, k, cutI2, cutO2) +
    'Z'

  return { d: upper + lower, S, r, sphereR: o.sphereR }
}

/** «ID»: la I de Poppins Bold, el asta de la D del mismo grosor y la panza como media órbita. */
function idMark(o = ORBIT) {
  const layout = BOLD.layout('ID')
  const iPath = I.path.toSVG()
  const dGlyph = layout.glyphs[1]
  const x0 = layout.positions[0].xAdvance + TRACKING
  const stemL = x0 + dGlyph.bbox.minX
  const stemR = stemL + STEM
  const stem = `M${f(stemL)} 0H${f(stemR)}V${f(CAP)}H${f(stemL)}Z`
  const bowl = halfOrbit({ x: stemR, y: CAP / 2 }, CAP / 2, o)
  const left = I.bbox.minX

  return { ink: `${iPath} ${stem}`, bowl, left, right: stemR + CAP / 2, top: CAP, bottom: 0 }
}

function markInner(m, ink, accent) {
  const { S, sphereR } = m.bowl

  return `<path fill="${ink}" d="${m.ink}"/><path fill="${ink}" d="${m.bowl.d}"/><circle fill="${accent}" cx="${f(S.x)}" cy="${f(S.y)}" r="${sphereR}"/>`
}

const doc = (w, h, label, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(w)} ${f(h)}" role="img" aria-label="${label}">${inner}</svg>\n`

function wordSvg(m, ink, accent, label = 'Efeonce ID') {
  const w = m.right - m.left

  return doc(w, m.top - m.bottom, label, `<g transform="translate(${f(-m.left)} ${f(m.top)}) scale(1 -1)">${markInner(m, ink, accent)}</g>`)
}

// Isotipo: el monograma en un cuadro, con aire igual a la mitad del asta.
function isotypeSvg(m, ink, accent) {
  const w = m.right - m.left
  const h = m.top - m.bottom
  const pad = STEM * 0.5
  const side = Math.max(w, h) + 2 * pad

  return doc(side, side, 'Efeonce ID', `<g transform="translate(${f((side - w) / 2 - m.left)} ${f((side + h) / 2)}) scale(1 -1)">${markInner(m, ink, accent)}</g>`)
}

// Teja de app / favicon: fondo oscuro Efeonce, monograma blanco, esfera en el acento.
function tileSvg(m) {
  const side = 1024
  const w = m.right - m.left
  const h = m.top - m.bottom
  const scale = (side * 0.6) / Math.max(w, h)
  const tx = (side - w * scale) / 2 - m.left * scale
  const ty = (side + h * scale) / 2

  return doc(side, side, 'Efeonce ID',
    `<rect width="${side}" height="${side}" rx="${side * 0.22}" fill="${GL.color.dark}"/>` +
    `<g transform="translate(${f(tx)} ${f(ty)}) scale(${f(scale)} ${f(-scale)})">${markInner(m, '#ffffff', growth.accentOnDark)}</g>`)
}

// ─── Lockup de familia: Efeonce | ID ───────────────────────────────────────────────────────────────────────
const viewBoxOf = s => s.match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number)

const efeonceAsset = variant => {
  const raw = fs.readFileSync(path.join(EFEONCE_ASSETS, `efeonce-logo-${variant === 'positive' ? 'positive' : 'negative'}.svg`), 'utf8')
  const fills = Object.fromEntries([...raw.matchAll(/\.(cls-\d+)\s*\{\s*fill:\s*([^;]+);/g)].map(x => [x[1], x[2].trim()]))

  return raw
    .replace(/<\?xml[^>]*>/, '')
    .replace(/<defs>[\s\S]*?<\/defs>/, '')
    .replace(/class="(cls-\d+)"/g, (_, c) => `fill="${variant === 'white' ? '#ffffff' : (fills[c] ?? '#000')}"`)
    .replace(/\s(id|data-name)="[^"]*"/g, '')
    .replace(/[ \t]+$/gm, '')
}

const nest = (source, x, y, { h, w }) => {
  const [, , vw, vh] = viewBoxOf(source)
  const width = w ?? (vw * h) / vh
  const height = h ?? (vh * w) / vw
  const body = source.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

  return { w: width, h: height, markup: `<svg x="${f(x)}" y="${f(y)}" width="${f(width)}" height="${f(height)}" viewBox="0 0 ${vw} ${vh}">${body}</svg>` }
}

const LOCKUP = { efeonceH: 30, gap: 20, ruleW: 1, ruleH: 26 }
const MARK_PX_PER_UNIT = 21 / 719

function lockupSvg(m, variant) {
  const v = VARIANTS[variant]
  const mark = wordSvg(m, v.endorsed, v.accent)
  const markH = (m.top - m.bottom) * MARK_PX_PER_UNIT
  const H = Math.max(LOCKUP.efeonceH, LOCKUP.ruleH, markH)
  const e = nest(efeonceAsset(variant), 0, (H - LOCKUP.efeonceH) / 2, { h: LOCKUP.efeonceH })
  let x = e.w + LOCKUP.gap
  const rule = `<rect x="${f(x)}" y="${f((H - LOCKUP.ruleH) / 2)}" width="${LOCKUP.ruleW}" height="${LOCKUP.ruleH}" fill="${v.rule.color}" fill-opacity="${v.rule.opacity}"/>`

  x += LOCKUP.ruleW + LOCKUP.gap
  const mk = nest(mark, x, (H - markH) / 2, { h: markH })

  return doc(x + mk.w, H, 'Efeonce ID', e.markup + rule + mk.markup)
}

// ─── Construcción (lámina explicativa) ─────────────────────────────────────────────────────────────────────
function constructionSvg(m) {
  const pad = 260
  const w = m.right - m.left + pad * 2
  const h = m.top - m.bottom + pad * 2
  const c = { x: m.bowl.S.x - m.bowl.r * Math.sin(Math.PI / 4), y: CAP / 2 }
  const rOut = CAP / 2
  const guide = '#36c8bf'
  const line = (x1, y1, x2, y2, dash = '') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${guide}" stroke-width="3" ${dash ? `stroke-dasharray="${dash}"` : ''} vector-effect="non-scaling-stroke"/>`
  const ring = `<circle cx="${f(c.x)}" cy="${f(c.y)}" r="${f(m.bowl.r)}" fill="none" stroke="${guide}" stroke-width="3" stroke-dasharray="14 12" vector-effect="non-scaling-stroke"/>`
  const knock = `<circle cx="${f(m.bowl.S.x)}" cy="${f(m.bowl.S.y)}" r="${ORBIT.sphereR + ORBIT.knock}" fill="none" stroke="${guide}" stroke-width="3" vector-effect="non-scaling-stroke"/>`
  const guides =
    line(m.left - 200, CAP, m.right + 200, CAP, '6 8') +
    line(m.left - 200, 0, m.right + 200, 0, '6 8') +
    line(c.x, -120, c.x, CAP + 120, '6 8') +
    line(c.x, c.y, m.bowl.S.x + 170 * Math.SQRT1_2, m.bowl.S.y + 170 * Math.SQRT1_2) +
    ring + knock +
    `<circle cx="${f(c.x)}" cy="${f(c.y)}" r="9" fill="${guide}"/>`

  return doc(w, h, 'Construcción de Efeonce ID',
    `<rect width="${f(w)}" height="${f(h)}" fill="${GL.color.dark}"/>` +
    `<g transform="translate(${f(pad - m.left)} ${f(pad + m.top)}) scale(1 -1)">${markInner(m, '#ffffff', growth.accentOnDark)}<g opacity="0.85">${guides}</g></g>`)
}

// ─── Direcciones descartadas (para comparar) ───────────────────────────────────────────────────────────────
// B: la I dentro de una órbita completa. C: «id» en minúscula con la esfera como punto de la i.
function directionB() {
  const r = 330
  const ro = r + ORBIT.stroke / 2
  const ri = r - ORBIT.stroke / 2
  const a = Math.PI / 4
  const S = { x: r * Math.sin(a), y: r * Math.cos(a) }
  const k = ORBIT.sphereR + ORBIT.knock
  const half = rho => Math.acos((rho * rho + r * r - k * k) / (2 * rho * r))
  const p = (rho, t) => `${f(rho * Math.sin(t))} ${f(rho * Math.cos(t))}`
  const ring = `M${p(ro, a + half(ro))}A${f(ro)} ${f(ro)} 0 1 0 ${p(ro, a - half(ro))}A${k} ${k} 0 0 1 ${p(ri, a - half(ri))}A${f(ri)} ${f(ri)} 0 1 1 ${p(ri, a + half(ri))}A${k} ${k} 0 0 1 ${p(ro, a + half(ro))}Z`
  const ih = 380
  const iw = STEM
  const side = 2 * ro + 2 * STEM * 0.5

  return doc(side, side, 'Dirección B',
    `<g transform="translate(${f(side / 2)} ${f(side / 2)}) scale(1 -1)"><path fill="#ffffff" d="${ring}"/><rect x="${f(-iw / 2)}" y="${f(-ih / 2)}" width="${f(iw)}" height="${ih}" fill="#ffffff"/><circle fill="${growth.accentOnDark}" cx="${f(S.x)}" cy="${f(S.y)}" r="${ORBIT.sphereR}"/></g>`)
}

function directionC() {
  const layout = BOLD.layout('ıd') // ı sin punto + d
  let x = 0
  const ink = []
  let dotX = 0
  let right = 0

  layout.glyphs.forEach((g, i) => {
    if (i === 0) dotX = x + (g.bbox.minX + g.bbox.maxX) / 2
    ink.push(g.path.translate(x, 0).toSVG())
    right = x + g.bbox.maxX
    x += layout.positions[i].xAdvance + TRACKING
  })

  const top = 780
  const w = right + 60
  const h = top + 40

  return doc(w, h, 'Dirección C',
    `<g transform="translate(20 ${top}) scale(1 -1)"><path fill="#ffffff" d="${ink.join(' ')}"/><circle fill="${growth.accentOnDark}" cx="${f(dotX)}" cy="660" r="${ORBIT.sphereR}"/></g>`)
}

// ─── Salida ────────────────────────────────────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true })
const write = (name, content) => fs.writeFileSync(path.join(OUT, name), content)

const mark = idMark()
const small = idMark(ORBIT_SMALL)

for (const variant of Object.keys(VARIANTS)) {
  const v = VARIANTS[variant]

  write(`id-logo-${variant}.svg`, wordSvg(mark, v.ink, v.accent))
  write(`id-lockup-${variant}.svg`, lockupSvg(mark, variant))
  write(`id-isotype-${variant}.svg`, isotypeSvg(mark, v.ink, v.accent))
  write(`id-isotype-small-${variant}.svg`, isotypeSvg(small, v.ink, v.accent))
}

write('id-app-tile.svg', tileSvg(mark))
write('id-app-tile-small.svg', tileSvg(small))
write('id-construction.svg', constructionSvg(mark))
write('direction-b.svg', directionB())
write('direction-c.svg', directionC())

console.log(JSON.stringify({ cap: CAP, stem: STEM, sphere: mark.bowl.S, files: fs.readdirSync(OUT).length }))
