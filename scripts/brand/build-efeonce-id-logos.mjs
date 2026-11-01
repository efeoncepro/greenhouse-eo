#!/usr/bin/env node
/**
 * Construye la marca de Efeonce ID (la cuenta de Efeonce Auth) en vectores. Aprobada por el operador el 2026-11-01
 * (canvas «Efeonce ID — logo», ruta A pulida; ADR docs/architecture/brand/EFEONCE_ID_MARK_DECISION_V1.md).
 *
 * La regla de la familia, «la órbita vive en la O», aplicada a un nombre sin O: la órbita vive en la D. La D es asta,
 * tramo recto y media órbita (el arco de las 12 a las 6 por la derecha); la única esfera, en el acento de Growth, va a la
 * 1:30 de esa órbita con el corte concéntrico de las terminaciones de la familia. La I y el asta de la D son Poppins Bold;
 * el anillo es fino (64), el mismo de AEO, Factory, Marketing Studio y Rooms. Sin surcos, sin otro elemento: la silueta
 * de la D con la esfera ya se lee como la yema de un dedo (se exploró una huella con surcos y se descartó por pesada).
 *
 * El tramo recto (110 unidades) hace de la D una letra (asta, recta y curva) y alarga el trazo de arriba hasta la esfera:
 * sin él, la media órbita salía directo del asta y dejaba un muñón entre el asta y la esfera.
 *
 * Piezas (cada una en `positive`, `negative` y `white`):
 *  - `efeonce-id-logo`: el monograma «ID» solo, en tinta.
 *  - `efeonce-id-lockup`: Efeonce | ID, la pieza por defecto (ID en el gris de la familia, sólo la esfera en el acento).
 *  - `efeonce-id-isotype`: el monograma en un cuadro, para avatar e ícono de app.
 *  - `efeonce-id-isotype-small`: para 32 px o menos (favicon): anillo 110, esfera 104 y aire 30, para que la panza no
 *    se pierda.
 *
 * Uso: node scripts/brand/build-efeonce-id-logos.mjs <directorio-de-salida>
 * Canon: @efeoncepro/axis-brand-assets (`efeonce-id-*`). Regenerar = correr esto, copiar a packages/brand-assets/assets/
 * y apps/lab/public/branding/, y volver a sellar; nunca editar los SVG a mano.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as fontkit from 'fontkit'
import { efeonceGraphicLine as GL } from '@efeoncepro/axis-tokens'

const here = path.dirname(fileURLToPath(import.meta.url))
const FONTS = path.resolve(here, '../../src/assets/fonts')
const EFEONCE_ASSETS = path.resolve(here, '../../node_modules/@efeoncepro/axis-brand-assets/assets')
const outDir = process.argv[2]

if (!outDir) throw new Error('Uso: build-efeonce-id-logos.mjs <directorio-de-salida>')

const BOLD = fontkit.openSync(path.join(FONTS, 'Poppins-Bold.ttf'))
const TRACKING = -18 // el mismo cierre que Insights, las submarcas SEO/AEO, Marketing Studio, Factory y Rooms

const growth = GL.lines.find(line => line.key === 'growth')

if (!growth) throw new Error('La línea Growth no está en efeonceGraphicLine.lines')

// Tinta, acento, gris de producto y filete de cada variante; todo sale de los tokens de la línea.
const VARIANTS = {
  positive: { ink: GL.color.navy, accent: growth.accentOnLight, endorsed: GL.slogan.leadColor.onLight, rule: { color: GL.color.navy, opacity: 0.25 } },
  negative: { ink: '#ffffff', accent: growth.accentOnDark, endorsed: GL.urlBubble.bakedOnDark, rule: { color: '#cfe4fa', opacity: 0.3 } },
  white: { ink: '#ffffff', accent: '#ffffff', endorsed: '#ffffff', rule: { color: '#ffffff', opacity: 0.5 } }
}

// Geometría (unidades de fuente, 1000 por em). REGULAR: la de la familia. SMALL: la versión para 32 px o menos.
const REGULAR = { stroke: 64, sphereR: 88, knock: 22, straight: 110, deg: 45 }
const SMALL = { stroke: 110, sphereR: 104, knock: 30, straight: 110, deg: 45 }

const f = n => Number(n.toFixed(2))
const at = (c, rho, t) => ({ x: c.x + rho * Math.sin(t), y: c.y + rho * Math.cos(t) })
const pt = p => `${f(p.x)} ${f(p.y)}`

// Arco corto de P a Q sobre el círculo (C, R): el sentido sale del producto cruz.
function shortArc(C, R, P, Q) {
  const cross = (P.x - C.x) * (Q.y - C.y) - (P.y - C.y) * (Q.x - C.x)

  return `A${f(R)} ${f(R)} 0 0 ${cross > 0 ? 1 : 0} ${pt(Q)}`
}

// Arco sobre (c, rho) de t1 a t2, partido en tramos de ≤ 90° para que cada uno sea corto.
function arcAlong(c, rho, t1, t2) {
  const n = Math.max(1, Math.ceil(Math.abs(t2 - t1) / (Math.PI / 2)))
  let d = ''

  for (let i = 1; i <= n; i++) d += shortArc(c, rho, at(c, rho, t1 + ((t2 - t1) * (i - 1)) / n), at(c, rho, t1 + ((t2 - t1) * i) / n))

  return d
}

const I = BOLD.layout('I').glyphs[0]
const CAP = I.bbox.maxY
const STEM = I.bbox.maxX - I.bbox.minX

/**
 * La D: asta + tramo recto + media órbita (de 12 a 6 por la derecha) cortada alrededor de la esfera. Los dos tramos
 * (arriba y abajo de la esfera) son contornos rellenos: sin máscaras, el archivo se ve igual en cualquier visor.
 * Los tramos rectos entran 14 unidades en el asta para que no quede costura entre trazos del mismo color.
 */
function idMark(o) {
  const layout = BOLD.layout('ID')
  const stemL = layout.positions[0].xAdvance + TRACKING + layout.glyphs[1].bbox.minX
  const stemR = stemL + STEM
  const c = { x: stemR + o.straight, y: CAP / 2 }
  const ro = CAP / 2
  const ri = ro - o.stroke
  const r = ro - o.stroke / 2
  const a = (o.deg * Math.PI) / 180
  const S = at(c, r, a)
  const k = o.sphereR + o.knock
  const half = rho => Math.acos((rho * rho + r * r - k * k) / (2 * rho * r))
  const lead = o.straight + 14

  const topO = at(c, ro, 0)
  const topI = at(c, ri, 0)
  const botO = at(c, ro, Math.PI)
  const botI = at(c, ri, Math.PI)
  const cutO1 = at(c, ro, a - half(ro))
  const cutI1 = at(c, ri, a - half(ri))
  const cutO2 = at(c, ro, a + half(ro))
  const cutI2 = at(c, ri, a + half(ri))

  const upper =
    `M${f(topO.x - lead)} ${f(topO.y)}L${pt(topO)}` +
    arcAlong(c, ro, 0, a - half(ro)) +
    shortArc(S, k, cutO1, cutI1) +
    arcAlong(c, ri, a - half(ri), 0) +
    `L${f(topI.x - lead)} ${f(topI.y)}Z`

  const lower =
    `M${pt(cutO2)}` +
    arcAlong(c, ro, a + half(ro), Math.PI) +
    `L${f(botO.x - lead)} ${f(botO.y)}L${f(botI.x - lead)} ${f(botI.y)}L${pt(botI)}` +
    arcAlong(c, ri, Math.PI, a + half(ri)) +
    shortArc(S, k, cutI2, cutO2) +
    'Z'

  return {
    letters: `${I.path.toSVG()} M${f(stemL)} 0H${f(stemR)}V${f(CAP)}H${f(stemL)}Z`,
    bowl: upper + lower,
    S,
    sphereR: o.sphereR,
    left: I.bbox.minX,
    right: c.x + ro,
    top: CAP
  }
}

const markInner = (m, ink, accent) =>
  `<path fill="${ink}" d="${m.letters}"/><path fill="${ink}" d="${m.bowl}"/><circle fill="${accent}" cx="${f(m.S.x)}" cy="${f(m.S.y)}" r="${m.sphereR}"/>`

const doc = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(w)} ${f(h)}" role="img" aria-label="Efeonce ID">${inner}</svg>\n`

// Coordenadas de fuente (y arriba) a pantalla: se voltea dentro del propio archivo.
const flip = (m, x, y, s = 1) => `translate(${f(x - m.left * s)} ${f(y + m.top * s)}) scale(${Number(s.toFixed(6))} ${Number((-s).toFixed(6))})`

const logoSvg = (m, v) => doc(m.right - m.left, m.top, `<g transform="${flip(m, 0, 0)}">${markInner(m, v.ink, v.accent)}</g>`)

// Isotipo: el monograma centrado en un cuadro, con medio asta de aire a cada lado del lado mayor.
function isotypeSvg(m, v) {
  const w = m.right - m.left
  const side = Math.max(w, m.top) + STEM

  return doc(side, side, `<g transform="${flip(m, (side - w) / 2, (side - m.top) / 2)}">${markInner(m, v.ink, v.accent)}</g>`)
}

// ─── Lockup de familia: Efeonce | ID ─────────────────────────────────────────────────────────────────────────
const viewBoxOf = s => s.match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number)

const efeonceLogo = variant => {
  const raw = fs.readFileSync(path.join(EFEONCE_ASSETS, `efeonce-logo-${variant === 'positive' ? 'positive' : 'negative'}.svg`), 'utf8')
  const fills = Object.fromEntries([...raw.matchAll(/\.(cls-\d+)\s*\{\s*fill:\s*([^;]+);/g)].map(x => [x[1], x[2].trim()]))

  // El archivo trae su color en un <style>: se pasa a atributos para que ningún visor lo pierda. En `white` todo es blanco.
  return raw
    .replace(/<\?xml[^>]*>/, '')
    .replace(/<defs>[\s\S]*?<\/defs>/, '')
    .replace(/class="(cls-\d+)"/g, (_, cl) => `fill="${variant === 'white' ? '#ffffff' : (fills[cl] ?? '#000')}"`)
    .replace(/\s(id|data-name)="[^"]*"/g, '')
    // Sin espacios al final de línea: el gate `git diff --check` de AXIS rechaza los que trae el archivo de Efeonce.
    .replace(/[ \t]+$/gm, '')
}

// Medidas de la familia: Efeonce a 30 de alto, 20 de aire, filete 1 × 26, 20 de aire; las letras del producto miden
// como las de Efeonce (21 px para 719 unidades de fuente).
const LOCKUP = { efeonceH: 30, gap: 20, ruleW: 1, ruleH: 26 }
const MARK_PX_PER_UNIT = 21 / 719

function lockupSvg(m, variant) {
  const v = VARIANTS[variant]
  const source = efeonceLogo(variant)
  const [, , vw, vh] = viewBoxOf(source)
  const ew = (vw * LOCKUP.efeonceH) / vh
  const markH = m.top * MARK_PX_PER_UNIT
  const s = markH / m.top
  const markW = (m.right - m.left) * s
  const H = Math.max(LOCKUP.efeonceH, LOCKUP.ruleH, markH)
  const body = source.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  const ruleX = ew + LOCKUP.gap
  const markX = ruleX + LOCKUP.ruleW + LOCKUP.gap

  return doc(markX + markW, H,
    `<svg x="0" y="${f((H - LOCKUP.efeonceH) / 2)}" width="${f(ew)}" height="${LOCKUP.efeonceH}" viewBox="0 0 ${vw} ${vh}">${body}</svg>` +
    `<rect x="${f(ruleX)}" y="${f((H - LOCKUP.ruleH) / 2)}" width="${LOCKUP.ruleW}" height="${LOCKUP.ruleH}" fill="${v.rule.color}" fill-opacity="${v.rule.opacity}"/>` +
    `<g transform="${flip(m, markX, (H - markH) / 2, s)}">${markInner(m, v.endorsed, v.accent)}</g>`)
}

// ─── Salida ──────────────────────────────────────────────────────────────────────────────────────────────────
fs.mkdirSync(outDir, { recursive: true })
const written = []
const write = (name, content) => { fs.writeFileSync(path.join(outDir, name), content); written.push(name) }

const regular = idMark(REGULAR)
const small = idMark(SMALL)

for (const variant of Object.keys(VARIANTS)) {
  const v = VARIANTS[variant]

  write(`efeonce-id-logo-${variant}.svg`, logoSvg(regular, v))
  write(`efeonce-id-lockup-${variant}.svg`, lockupSvg(regular, variant))
  write(`efeonce-id-isotype-${variant}.svg`, isotypeSvg(regular, v))
  write(`efeonce-id-isotype-small-${variant}.svg`, isotypeSvg(small, v))
}

console.log(JSON.stringify({ accent: growth.accentOnLight, files: written.length }))
