#!/usr/bin/env node
/**
 * Construye la marca de producto de Efeonce Marketing Studio en vectores. Aprobada por el operador el 2026-10-02
 * (canvas «Logo Marketing Studio»; ADR docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_NAMING_AND_MARK_DECISION_V1.md).
 *
 * La regla de la familia: «la órbita vive en la O». «Marketing Studio» en Poppins Bold, pasado a contornos con fontkit;
 * la «o» de Studio se reemplaza por un anillo fino en la tinta de la palabra con la esfera a la 1:30 en el acento Growth y
 * un corte en el anillo alrededor de la esfera. Mismo método que build-seo-aeo-logos.mjs.
 *
 * Piezas (cada una en `positive`, `negative` y `white`):
 *  - `marketing-studio-logo`: la palabra sola, en tinta (sólo dentro del portal).
 *  - `marketing-studio-lockup`: Efeonce | Marketing Studio, la pieza por defecto.
 *  - `marketing-studio-short-lockup` y `marketing-studio-compact`: Efeonce | Studio, con filete y sin él.
 *  - `marketing-studio-stacked-lockup` y `marketing-studio-short-stacked-lockup`: Efeonce arriba, el producto debajo.
 *  - `marketing-studio-isotype`: la S rodeada por la órbita (favicon, pantalla de inicio, barra colapsada).
 *  - `marketing-studio-icon`: la nave de Efeonce sobre «Studio» liso (avatar, sticker, merch: lo que circula suelto).
 *
 * Junto a Efeonce el producto baja su brillo al gris medido de la marca y sólo la esfera conserva el acento. «Studio» a
 * secas es Marketing Studio; nunca «MKT».
 *
 * Uso: node scripts/brand/build-marketing-studio-logos.mjs <directorio-de-salida>
 * Canon: @efeoncepro/axis-brand-assets (`marketing-studio-*`). Regenerar = correr esto, copiar a
 * packages/brand-assets/assets/ y volver a sellar; nunca editar los SVG a mano.
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

if (!outDir) throw new Error('Uso: build-marketing-studio-logos.mjs <directorio-de-salida>')

const BOLD = fontkit.openSync(path.join(FONTS, 'Poppins-Bold.ttf'))
const TRACKING = -18 // el mismo cierre que Insights y las submarcas SEO/AEO

const growth = GL.lines.find(line => line.key === 'growth')

if (!growth) throw new Error('La línea Growth no está en efeonceGraphicLine.lines')

// Tinta, acento, gris de producto y filete de cada variante; todo sale de los tokens de la línea.
const VARIANTS = {
  positive: { ink: GL.color.navy, accent: growth.accentOnLight, endorsed: GL.slogan.leadColor.onLight, rule: { color: GL.color.navy, opacity: 0.25 } },
  negative: { ink: '#ffffff', accent: growth.accentOnDark, endorsed: GL.urlBubble.bakedOnDark, rule: { color: '#cfe4fa', opacity: 0.3 } },
  white: { ink: '#ffffff', accent: '#ffffff', endorsed: '#ffffff', rule: { color: '#ffffff', opacity: 0.5 } }
}

// Geometría de la órbita (unidades de fuente, 1000 por em): la de las submarcas, esfera a la 1:30.
const ORBIT = { stroke: 64, sphereR: 88, knock: 22, deg: 45 }

const f = n => Number(n.toFixed(2))

// ─── Palabra con la órbita en la «o» ─────────────────────────────────────────────────────────────────────────
function word(runs) {
  let x = 0
  const ink = []
  const rings = []
  let top = -Infinity
  let bottom = Infinity

  runs.forEach((run, ri) => {
    const layout = BOLD.layout(run.text)

    layout.glyphs.forEach((g, gi) => {
      const bb = g.bbox

      top = Math.max(top, bb.maxY)
      bottom = Math.min(bottom, bb.minY)

      if (run.orbit && run.text[gi] === 'o' && gi === run.text.length - 1) {
        const rOut = (bb.maxY - bb.minY) / 2
        const r = rOut - ORBIT.stroke / 2
        const cx = x + bb.minX + rOut
        const cy = (bb.minY + bb.maxY) / 2
        const a = (ORBIT.deg * Math.PI) / 180
        const ring = { cx, cy, r, rOut, a, sx: cx + r * Math.sin(a), sy: cy + r * Math.cos(a) }

        top = Math.max(top, ring.sy + ORBIT.sphereR)
        rings.push(ring)
        x += bb.minX + 2 * rOut + (layout.positions[gi].xAdvance - bb.maxX) + TRACKING
      } else {
        if (g.path.commands.length) ink.push(g.path.translate(x, 0).toSVG())
        x += layout.positions[gi].xAdvance + TRACKING
      }
    })
    if (run.space && ri < runs.length - 1) x += run.space
  })

  return { ink, rings, right: x - TRACKING, top, bottom }
}

const ringPath = o => orbitRingPath({ cx: o.cx, cy: o.cy, r: o.r, stroke: ORBIT.stroke, a: o.a, sphereR: ORBIT.sphereR, knock: ORBIT.knock })

const ringMarkup = (o, ink, accent) =>
  `<path fill="${ink}" d="${ringPath(o)}"/><circle fill="${accent}" cx="${f(o.sx)}" cy="${f(o.sy)}" r="${ORBIT.sphereR}"/>`

function wordSvg(b, ink, accent, label) {
  const rings = b.rings.map(o => ringMarkup(o, ink, accent)).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(b.right)} ${f(b.top - b.bottom)}" role="img" aria-label="${label}"><g transform="translate(0 ${f(b.top)}) scale(1 -1)"><path fill="${ink}" d="${b.ink.join(' ')}"/>${rings}</g></svg>\n`
}

// ─── Símbolo: la S rodeada por la órbita ────────────────────────────────────────────────────────────────────
function isotype({ ink, accent }) {
  const rOut = 360
  const ring = { cx: 0, cy: 0, r: rOut - ORBIT.stroke / 2, a: (ORBIT.deg * Math.PI) / 180 }

  ring.sx = ring.r * Math.sin(ring.a)
  ring.sy = ring.r * Math.cos(ring.a)

  const g = BOLD.layout('S').glyphs[0]
  const bb = g.bbox
  // La letra queda entera dentro del anillo: su semidiagonal no pasa del 80 % del radio interior.
  const s = (0.8 * (rOut - ORBIT.stroke)) / Math.hypot((bb.maxX - bb.minX) / 2, (bb.maxY - bb.minY) / 2)
  const top = Math.max(rOut, ring.sy + ORBIT.sphereR)
  const right = Math.max(rOut, ring.sx + ORBIT.sphereR)
  const letter = `<g transform="scale(${f(s)}) translate(${f(-(bb.minX + bb.maxX) / 2)} ${f(-(bb.minY + bb.maxY) / 2)})"><path fill="${ink}" d="${g.path.toSVG()}"/></g>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(rOut + right)} ${f(top + rOut)}" role="img" aria-label="Efeonce Marketing Studio"><g transform="translate(${rOut} ${f(top)}) scale(1 -1)">${ringMarkup(ring, ink, accent)}${letter}</g></svg>\n`
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

// Ícono: la nave (ya trae su órbita y su esfera) sobre «Studio» liso en gris: una sola esfera por pieza.
function icon(variant) {
  const v = VARIANTS[variant]
  const isoH = 100
  const ship = nest(efeonceAsset('isotype', variant), 0, 0, { h: isoH })
  const plain = word([{ text: 'Studio' }])
  const w = nest(wordSvg(plain, v.endorsed, v.accent, 'Studio'), ship.w * 0.07, isoH + 24, { w: ship.w * 0.86 })

  return doc(ship.w, isoH + 24 + w.h, 'Efeonce Marketing Studio', ship.markup + w.markup)
}

// ─── Salida ──────────────────────────────────────────────────────────────────────────────────────────────────
fs.mkdirSync(outDir, { recursive: true })
const written = []
const write = (name, content) => { fs.writeFileSync(path.join(outDir, name), content); written.push(name) }

const full = word([{ text: 'Marketing', space: 260 }, { text: 'Studio', orbit: true }])
const short = word([{ text: 'Studio', orbit: true }])
const LABEL = 'Efeonce Marketing Studio'

for (const variant of Object.keys(VARIANTS)) {
  const v = VARIANTS[variant]

  write(`marketing-studio-logo-${variant}.svg`, wordSvg(full, v.ink, v.accent, LABEL))
  write(`marketing-studio-lockup-${variant}.svg`, horizontal(full, variant, LABEL, true))
  write(`marketing-studio-short-lockup-${variant}.svg`, horizontal(short, variant, 'Efeonce Studio', true))
  write(`marketing-studio-compact-${variant}.svg`, horizontal(short, variant, 'Efeonce Studio', false))
  write(`marketing-studio-stacked-lockup-${variant}.svg`, stacked(full, variant, LABEL, 0.92))
  write(`marketing-studio-short-stacked-lockup-${variant}.svg`, stacked(short, variant, 'Efeonce Studio', 0.52))
  write(`marketing-studio-isotype-${variant}.svg`, isotype(v))
  write(`marketing-studio-icon-${variant}.svg`, icon(variant))
}

console.log(JSON.stringify({ accent: growth.accentOnLight, files: written.length }))
