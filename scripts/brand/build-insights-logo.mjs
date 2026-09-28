#!/usr/bin/env node
/**
 * Construye la marca de Efeonce Insights en vectores (logo + isotipo, positivo y negativo).
 *
 * La palabra es «ınsights» en Poppins Bold (la fuente de estructura de la marca), pasada a contornos con fontkit; el
 * punto de la primera «i» se reemplaza por una órbita mínima: un anillo en la tinta de la palabra y una esfera en el
 * acento de Growth montada a las 1:30, con un corte en el anillo alrededor de la esfera (como el planeta del logo de
 * Efeonce). Todas las medidas están en unidades de la fuente (1000 por em) y derivan del fuste de la «ı».
 *
 * Uso: node scripts/brand/build-insights-logo.mjs <directorio-de-salida>
 * Las variables INSIGHTS_* sólo existen para comparar exploraciones; el canon usa los valores por defecto.
 * Canon: @efeoncepro/axis-brand-assets (`insights-logo-*`, `insights-isotype-*`). Regenerar = correr esto y volver a
 * sellar el paquete; nunca editar los SVG a mano.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as fontkit from 'fontkit'

const here = path.dirname(fileURLToPath(import.meta.url))
const FONT = path.resolve(here, '../../src/assets/fonts/Poppins-Bold.ttf')
const outDir = process.argv[2]

if (!outDir) throw new Error('Uso: build-insights-logo.mjs <directorio-de-salida>')

const INK = { positive: '#023c70', negative: '#ffffff' }
const ACCENT = { positive: '#0e8c82', negative: '#36c8bf' } // accent-growth en papel / en oscuro

const font = fontkit.openSync(FONT)
const TRACKING = Number(process.env.INSIGHTS_TRACKING ?? -18) // unidades por glifo: más cerrado que el texto corrido, sin que «gh» ni «ts» se toquen

// Geometría del punto-órbita, derivada del fuste de la «ı» (75–246, 171 de ancho) y de la altura de x (558).
const stem = font.glyphForCodePoint(0x131).bbox
const STEM_W = stem.maxX - stem.minX
const RING_STROKE = Number(process.env.INSIGHTS_RING_STROKE ?? Math.round(STEM_W * 0.33)) // ~56: la misma relación que la órbita del logo de Efeonce con sus letras
const RING_OUTER = Number(process.env.INSIGHTS_RING_OUTER ?? 130) // radio exterior: el anillo es ~1,5 veces el fuste, legible desde 18 px
const RING_R = RING_OUTER - RING_STROKE / 2
const GAP_TO_X = 72 // aire entre la altura de x y el anillo, el del punto original de la «i»
const RING_CY = Number(process.env.INSIGHTS_RING_CY ?? font.xHeight + GAP_TO_X + RING_OUTER)
const SPHERE_R = Number(process.env.INSIGHTS_SPHERE_R ?? 48) // ~1,7 veces el trazo del anillo: pesa como un planeta sin tapar la órbita
const SPHERE_ANGLE = 45 // grados desde las 12, sentido horario
const KNOCKOUT = Number(process.env.INSIGHTS_KNOCKOUT ?? 14) // corte del anillo alrededor de la esfera

const run = font.layout('ınsights')
let x = 0
const glyphPaths = []

run.glyphs.forEach((g, i) => {
  glyphPaths.push(g.path.translate(x, 0).toSVG())
  x += run.positions[i].xAdvance + (i < run.glyphs.length - 1 ? TRACKING : 0)
})
const ringCx = (stem.minX + stem.maxX) / 2
const rad = (SPHERE_ANGLE * Math.PI) / 180
const sphereCx = ringCx + RING_R * Math.sin(rad)
const sphereCy = RING_CY + RING_R * Math.cos(rad)

// Anillo con corte: arco que empieza y termina donde el círculo de corte cruza la línea media del anillo.
const cutHalf = Math.asin((SPHERE_R + KNOCKOUT) / (2 * RING_R)) * 2
const a0 = rad + cutHalf
const a1 = rad - cutHalf + 2 * Math.PI
const pt = a => [ringCx + RING_R * Math.sin(a), RING_CY + RING_R * Math.cos(a)]
const [sx, sy] = pt(a0)
const [ex, ey] = pt(a1)
const f = n => Number(n.toFixed(2))

const ringPath = KNOCKOUT < 0
  ? `M${f(ringCx - RING_R)} ${f(RING_CY)}a${RING_R} ${RING_R} 0 1 0 ${2 * RING_R} 0a${RING_R} ${RING_R} 0 1 0 ${-2 * RING_R} 0`
  : `M${f(sx)} ${f(sy)}A${RING_R} ${RING_R} 0 1 0 ${f(ex)} ${f(ey)}`
// En coordenadas de fuente y crece hacia arriba; el SVG se voltea con un transform de grupo.

const wordRight = x
const top = Math.max(RING_CY + RING_OUTER, sphereCy + SPHERE_R)
const bottom = Math.min(...run.glyphs.map(g => g.bbox.minY)) // descendente de la «g»
const left = Math.min(stem.minX, ringCx - RING_OUTER)
const pad = 0

const build = (variant, kind) => {
  const ink = INK[variant]
  const accent = ACCENT[variant]
  const glyphs = kind === 'logo' ? glyphPaths.slice(1) : []
  const stemPath = glyphPaths[0]
  const minX = f(left - pad)
  const maxX = kind === 'logo' ? f(wordRight + pad) : f(Math.max(stem.maxX, ringCx + RING_OUTER, sphereCx + SPHERE_R) + pad)
  const minY = kind === 'logo' ? bottom : 0
  const w = f(maxX - minX)
  const h = f(top - minY + pad)

  
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Efeonce Insights">
  <g transform="translate(${f(-minX)} ${f(top + pad)}) scale(1 -1)">
    <path fill="${ink}" d="${[stemPath, ...glyphs].join(' ')}"/>
    <path fill="none" stroke="${ink}" stroke-width="${RING_STROKE}" stroke-linecap="butt" d="${ringPath}"/>
    <circle fill="${accent}" cx="${f(sphereCx)}" cy="${f(sphereCy)}" r="${SPHERE_R}"/>
  </g>
</svg>
`
}

fs.mkdirSync(outDir, { recursive: true })

for (const kind of ['logo', 'isotype']) {
  for (const variant of ['positive', 'negative']) {
    fs.writeFileSync(path.join(outDir, `insights-${kind}-${variant}.svg`), build(variant, kind))
  }
}

console.log(JSON.stringify({ STEM_W, RING_STROKE, RING_OUTER, RING_CY, SPHERE_R, top, bottom, wordRight }, null, 0))
