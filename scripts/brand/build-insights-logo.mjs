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
 * También arma el lockup oficial (`insights-lockup-*`): el logo de Efeonce, un filete y el logo de Insights en gris
 * (la marca que acompaña baja su brillo para que Efeonce mande; sólo la esfera conserva el acento). Proporciones del
 * lockup aprobado en el canvas «Insights en vivo» (2026-09-28), en píxeles con el logo de Efeonce a 30 px de alto.
 *
 * Canon: @efeoncepro/axis-brand-assets (`insights-logo-*`, `insights-isotype-*`, `insights-lockup-*`). Regenerar = correr
 * esto y volver a sellar el paquete; nunca editar los SVG a mano.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as fontkit from 'fontkit'

import { orbitRingPath } from './orbit-ring.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const FONT = path.resolve(here, '../../src/assets/fonts/Poppins-Bold.ttf')
const outDir = process.argv[2]

if (!outDir) throw new Error('Uso: build-insights-logo.mjs <directorio-de-salida>')

const INK = { positive: '#023c70', negative: '#ffffff' }
const ACCENT = { positive: '#0e8c82', negative: '#36c8bf' } // accent-growth en papel / en oscuro

// Insights junto a Efeonce: grises de marca medidos (≥ 4,5:1), no la tinta plena.
// Oscuro: el gris de marca fusionado sobre navy (#6f89a2, 4,83:1). Papel: el gris de «Empower your» (#6b6b6b, 5,0:1).
const ENDORSED_INK = { positive: '#6b6b6b', negative: '#6f89a2' }
const EFEONCE_ASSETS = path.resolve(here, '../../node_modules/@efeoncepro/axis-brand-assets/assets')

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

// Anillo con corte concéntrico a la esfera (orbit-ring.mjs); con KNOCKOUT negativo, anillo entero sin corte.
const f = n => Number(n.toFixed(2))

const ringPath = KNOCKOUT < 0
  ? null
  : orbitRingPath({ cx: ringCx, cy: RING_CY, r: RING_R, stroke: RING_STROKE, a: rad, sphereR: SPHERE_R, knock: KNOCKOUT })

const fullRing = `M${f(ringCx - RING_R)} ${f(RING_CY)}a${RING_R} ${RING_R} 0 1 0 ${2 * RING_R} 0a${RING_R} ${RING_R} 0 1 0 ${-2 * RING_R} 0`
// En coordenadas de fuente y crece hacia arriba; el SVG se voltea con un transform de grupo.

const wordRight = x
const top = Math.max(RING_CY + RING_OUTER, sphereCy + SPHERE_R)
const bottom = Math.min(...run.glyphs.map(g => g.bbox.minY)) // descendente de la «g»
const left = Math.min(stem.minX, ringCx - RING_OUTER)
const pad = 0

const build = (variant, kind, ink = INK[variant]) => {
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
    ${ringPath ? `<path fill="${ink}" d="${ringPath}"/>` : `<path fill="none" stroke="${ink}" stroke-width="${RING_STROKE}" d="${fullRing}"/>`}
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

// ─── Lockup: Efeonce | Insights ──────────────────────────────────────────────────────────────────────────────
// Medidas del canvas aprobado, en px con Efeonce a 30 de alto: 20 de aire, filete de 1 × 26, 20 de aire e Insights a
// 31,5 de alto; los tres centrados en vertical.
const LOCKUP = { efeonceH: 30, gap: 20, ruleW: 1, ruleH: 26, insightsH: 31.5 }
const RULE = { positive: { color: '#023c70', opacity: 0.25 }, negative: { color: '#cfe4fa', opacity: 0.3 } }

const viewBoxOf = svg => svg.match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number)

// El logo de Efeonce trae su color en un <style>: se pasa a atributos para que ningún visor lo pierda.
const inlineStyles = svg => {
  const fills = Object.fromEntries([...svg.matchAll(/\.(cls-\d+)\s*\{\s*fill:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]))

  return svg
    .replace(/<\?xml[^>]*>/, '')
    .replace(/<defs>[\s\S]*?<\/defs>/, '')
    .replace(/class="(cls-\d+)"/g, (_, c) => `fill="${fills[c] ?? '#000'}"`)
    .replace(/\s(id|data-name)="[^"]*"/g, '')
}

const nest = (svg, x, y, h) => {
  const [, , vw, vh] = viewBoxOf(svg)
  const w = f((vw * h) / vh)
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

  return { w, markup: `<svg x="${f(x)}" y="${f(y)}" width="${w}" height="${f(h)}" viewBox="0 0 ${vw} ${vh}">${body}</svg>` }
}

for (const variant of ['positive', 'negative']) {
  const efeonce = inlineStyles(fs.readFileSync(path.join(EFEONCE_ASSETS, `efeonce-logo-${variant}.svg`), 'utf8'))
  const insights = build(variant, 'logo', ENDORSED_INK[variant])
  const H = Math.max(LOCKUP.efeonceH, LOCKUP.ruleH, LOCKUP.insightsH)
  const e = nest(efeonce, 0, (H - LOCKUP.efeonceH) / 2, LOCKUP.efeonceH)
  const ruleX = e.w + LOCKUP.gap
  const i = nest(insights, ruleX + LOCKUP.ruleW + LOCKUP.gap, (H - LOCKUP.insightsH) / 2, LOCKUP.insightsH)
  const W = f(ruleX + LOCKUP.ruleW + LOCKUP.gap + i.w)
  const rule = `<rect x="${f(ruleX)}" y="${f((H - LOCKUP.ruleH) / 2)}" width="${LOCKUP.ruleW}" height="${LOCKUP.ruleH}" fill="${RULE[variant].color}" fill-opacity="${RULE[variant].opacity}"/>`

  fs.writeFileSync(
    path.join(outDir, `insights-lockup-${variant}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${f(H)}" role="img" aria-label="Efeonce Insights">\n  ${e.markup}\n  ${rule}\n  ${i.markup}\n</svg>\n`
  )
}

console.log(JSON.stringify({ STEM_W, RING_STROKE, RING_OUTER, RING_CY, SPHERE_R, top, bottom, wordRight }, null, 0))
