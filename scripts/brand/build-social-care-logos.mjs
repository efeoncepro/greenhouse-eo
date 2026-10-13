#!/usr/bin/env node
/**
 * Construye la marca de Efeonce Social Care en vectores. PROPUESTA del 2026-10-10, sin aprobar: nació con la
 * propuesta de social care 2027 para SKY y el operador pidió «el logo como hemos hecho con los demás».
 *
 * La regla de la familia: «la órbita vive en la O». «Social Care» en Poppins Bold, pasado a contornos con fontkit; la
 * «o» de Social es un anillo fino en la tinta de la palabra con la esfera a la 1:30 en el acento de la línea Brand
 * (social care es un servicio de la práctica creativa). Sale de build-factory-logos.mjs y build-creative-studio-logos.mjs;
 * el anillo, con sus terminaciones concéntricas a la esfera, sale de orbit-ring.mjs.
 *
 * Dos rutas (`--gesto orbita` por defecto, `--gesto burbuja`):
 *  - `orbita`: la marca tal como la familia. Su símbolo es la S dentro de la órbita con acento Brand, que es el MISMO
 *    dibujo que el isotipo de Creative Studio: por eso existe la segunda ruta.
 *  - `burbuja`: el anillo gana una cola abajo a la izquierda y se lee como un globo de comentario, en la palabra y en el
 *    símbolo (el globo solo, sin letra). Es el gesto propio del producto.
 *
 * Piezas (cada una en `positive`, `negative` y `white`):
 *  - `social-care-logo`: la palabra sola, en tinta.
 *  - `social-care-lockup`: Efeonce | Social Care, la pieza por defecto.
 *  - `social-care-compact`: efeonce Social Care sin filete, para espacios angostos.
 *  - `social-care-stacked-lockup`: Efeonce arriba, Social Care debajo.
 *  - `social-care-isotype`: el símbolo (favicon, avatar, barra colapsada).
 *  - `social-care-icon`: la nave de Efeonce sobre «Social Care» liso (lo que circula suelto: una sola esfera).
 *
 * Uso: node scripts/brand/build-social-care-logos.mjs <directorio-de-salida> [--gesto orbita|burbuja]
 * Canon cuando se apruebe: @efeoncepro/axis-brand-assets (`social-care-*`), copiando la salida a
 * packages/brand-assets/assets/ y resellando; nunca editar los SVG a mano. Hoy NO está en AXIS.
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

if (!outDir) throw new Error('Uso: build-social-care-logos.mjs <directorio-de-salida> [--gesto orbita|burbuja]')

const gi0 = process.argv.indexOf('--gesto')
const GESTO = gi0 === -1 ? 'orbita' : process.argv[gi0 + 1]

if (!['orbita', 'burbuja'].includes(GESTO)) throw new Error('--gesto acepta orbita o burbuja')

const BOLD = fontkit.openSync(path.join(FONTS, 'Poppins-Bold.ttf'))
const TRACKING = -18 // el mismo cierre que Insights, las submarcas SEO/AEO y Marketing Studio

// Social care es un servicio de la práctica creativa: lleva el acento de la línea Brand, como Creative Studio.
const brand = GL.lines.find(line => line.key === 'brand')

if (!brand) throw new Error('La línea Brand no está en efeonceGraphicLine.lines')

// Tinta, acento, gris de producto y filete de cada variante; todo sale de los tokens de la línea.
const VARIANTS = {
  positive: { ink: GL.color.navy, accent: brand.accentOnLight, endorsed: GL.slogan.leadColor.onLight, rule: { color: GL.color.navy, opacity: 0.25 } },
  negative: { ink: '#ffffff', accent: brand.accentOnDark, endorsed: GL.urlBubble.bakedOnDark, rule: { color: '#cfe4fa', opacity: 0.3 } },
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

      if (run.orbit && run.text[gi] === 'o' && gi === run.text.indexOf('o')) {
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

// Cola del globo de comentario: un triángulo abajo a la izquierda (7:30), con la base metida en el trazo del anillo y la
// punta hacia la esquina de la caja de la letra, para no salir de la línea de base ni tocar la letra vecina.
const TAIL = { from: 208, to: 244, tip: 224, reach: 1.33 }
const rad = d => (d * Math.PI) / 180

function tailPath(o) {
  const ro = o.rOut ?? o.r + ORBIT.stroke / 2
  const base = ro - ORBIT.stroke * 0.5
  const p = (rho, deg) => `${f(o.cx + rho * Math.sin(rad(deg)))} ${f(o.cy + rho * Math.cos(rad(deg)))}`

  return `M${p(base, TAIL.from)}L${p(ro * TAIL.reach, TAIL.tip)}L${p(base, TAIL.to)}Z`
}

const ringMarkup = (o, ink, accent) =>
  `<path fill="${ink}" d="${ringPath(o)}${GESTO === 'burbuja' ? tailPath(o) : ''}"/><circle fill="${accent}" cx="${f(o.sx)}" cy="${f(o.sy)}" r="${ORBIT.sphereR}"/>`

function wordSvg(b, ink, accent, label) {
  const rings = b.rings.map(o => ringMarkup(o, ink, accent)).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(b.right)} ${f(b.top - b.bottom)}" role="img" aria-label="${label}"><g transform="translate(0 ${f(b.top)}) scale(1 -1)"><path fill="${ink}" d="${b.ink.join(' ')}"/>${rings}</g></svg>\n`
}

// ─── Símbolo ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// Ruta órbita: la S dentro del anillo (la regla de la familia). Ruta burbuja: el globo solo, sin letra.
function isotype({ ink, accent }) {
  const rOut = 360
  const ring = { cx: 0, cy: 0, r: rOut - ORBIT.stroke / 2, rOut, a: (ORBIT.deg * Math.PI) / 180 }

  ring.sx = ring.r * Math.sin(ring.a)
  ring.sy = ring.r * Math.cos(ring.a)

  const top = Math.max(rOut, ring.sy + ORBIT.sphereR)
  const right = Math.max(rOut, ring.sx + ORBIT.sphereR)
  let letter = ''

  if (GESTO === 'orbita') {
    const g = BOLD.layout('S').glyphs[0]
    const bb = g.bbox
    // La letra queda entera dentro del anillo: su semidiagonal no pasa del 80 % del radio interior.
    const s = (0.8 * (rOut - ORBIT.stroke)) / Math.hypot((bb.maxX - bb.minX) / 2, (bb.maxY - bb.minY) / 2)

    letter = `<g transform="scale(${f(s)}) translate(${f(-(bb.minX + bb.maxX) / 2)} ${f(-(bb.minY + bb.maxY) / 2)})"><path fill="${ink}" d="${g.path.toSVG()}"/></g>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(rOut + right)} ${f(top + rOut)}" role="img" aria-label="Efeonce Social Care"><g transform="translate(${rOut} ${f(top)}) scale(1 -1)">${ringMarkup(ring, ink, accent)}${letter}</g></svg>\n`
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
    // Sin espacios al final de línea: el gate `git diff --check` de AXIS rechaza los que trae el archivo de Efeonce.
    .replace(/[ \t]+$/gm, '')
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

// Ícono: la nave (ya trae su órbita y su esfera) sobre «Social Care» liso en gris: una sola esfera por pieza.
function icon(variant) {
  const v = VARIANTS[variant]
  const isoH = 100
  const ship = nest(efeonceAsset('isotype', variant), 0, 0, { h: isoH })
  const plain = word([{ text: 'Social', space: 260 }, { text: 'Care' }])
  const w = nest(wordSvg(plain, v.endorsed, v.accent, 'Social Care'), ship.w * 0.04, isoH + 24, { w: ship.w * 0.92 })

  return doc(ship.w, isoH + 24 + w.h, 'Efeonce Social Care', ship.markup + w.markup)
}

// ─── Salida ──────────────────────────────────────────────────────────────────────────────────────────────────
fs.mkdirSync(outDir, { recursive: true })
const written = []
const write = (name, content) => { fs.writeFileSync(path.join(outDir, name), content); written.push(name) }

const socialCare = word([{ text: 'Social', orbit: true, space: 260 }, { text: 'Care' }])
const LABEL = 'Efeonce Social Care'

for (const variant of Object.keys(VARIANTS)) {
  const v = VARIANTS[variant]

  write(`social-care-logo-${variant}.svg`, wordSvg(socialCare, v.ink, v.accent, LABEL))
  write(`social-care-lockup-${variant}.svg`, horizontal(socialCare, variant, LABEL, true))
  write(`social-care-compact-${variant}.svg`, horizontal(socialCare, variant, LABEL, false))
  write(`social-care-stacked-lockup-${variant}.svg`, stacked(socialCare, variant, LABEL, 0.86))
  write(`social-care-isotype-${variant}.svg`, isotype(v))
  write(`social-care-icon-${variant}.svg`, icon(variant))
}

console.log(JSON.stringify({ gesto: GESTO, accent: brand.accentOnLight, files: written.length }))
