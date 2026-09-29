#!/usr/bin/env node
/**
 * Construye las submarcas de producto SEO/AEO de Efeonce en vectores: SV360 (Search Visibility 360), AEO,
 * AEO Assessment y AI Visibility Report. Aprobadas por el operador el 2026-09-29 (canvas «Marcas SEO y AEO de Efeonce»).
 *
 * La regla de la familia: «la órbita vive en la O». La o del logo de Efeonce ya es la nave en órbita; cada submarca la
 * hereda en su propia O: la O de AEO, el 0 de SV360 (vuelta completa: la esfera vuelve a las 12) y la o de «Report».
 * La palabra va en Poppins (Bold; el descriptor en Medium), pasada a contornos con fontkit; la letra se reemplaza por un
 * anillo fino en la tinta de la palabra con una esfera en el acento de la línea Engine (SEO y medición) y un corte en el
 * anillo alrededor de la esfera, como el planeta del logo de Efeonce. Mismo método que build-insights-logo.mjs.
 *
 * Variantes: `positive` (tinta navy, sobre papel), `negative` (blanco, sobre oscuro) y `white` (todo blanco, esfera
 * incluida, para fotos y fondos de color donde el acento no alcanza contraste). Lockups con las medidas del de Insights:
 * Efeonce a 30 px de alto, 20 de aire, filete de 1 × 26, 20 de aire y la submarca en gris (junto a Efeonce baja su
 * brillo; sólo la esfera conserva el acento).
 *
 * Uso: node scripts/brand/build-seo-aeo-logos.mjs <directorio-de-salida>
 * Canon: @efeoncepro/axis-brand-assets (`sv360-*`, `aeo-*`, `aeo-assessment-*`, `ai-visibility-report-*`). Regenerar =
 * correr esto, copiar a packages/brand-assets/assets/ y volver a sellar; nunca editar los SVG a mano.
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

if (!outDir) throw new Error('Uso: build-seo-aeo-logos.mjs <directorio-de-salida>')

const BOLD = fontkit.openSync(path.join(FONTS, 'Poppins-Bold.ttf'))
const MEDIUM = fontkit.openSync(path.join(FONTS, 'Poppins-Medium.ttf'))
const TRACKING = -18 // el mismo cierre que Insights

const engine = GL.lines.find(line => line.key === 'engine')

if (!engine) throw new Error('La línea Engine no está en efeonceGraphicLine.lines')

// Tinta, acento y gris de cada variante; todo sale de los tokens de la línea.
const VARIANTS = {
  positive: { ink: GL.color.navy, accent: engine.accentOnLight, endorsed: GL.slogan.leadColor.onLight, rule: { color: GL.color.navy, opacity: 0.25 } },
  negative: { ink: '#ffffff', accent: engine.accentOnDark, endorsed: GL.urlBubble.bakedOnDark, rule: { color: '#cfe4fa', opacity: 0.3 } },
  white: { ink: '#ffffff', accent: '#ffffff', endorsed: '#ffffff', rule: { color: '#ffffff', opacity: 0.5 } }
}

// Geometría de la órbita (unidades de fuente, 1000 por em). La esfera a las 1:30 (45°) salvo en SV360, donde el 0 es
// la vuelta completa y la esfera vuelve a la partida (0°), como manda la línea al 100 %.
const ORBIT = { stroke: 64, sphereR: 88, knock: 22 }

const MARKS = {
  sv360: { label: 'Efeonce SV360', runs: [{ font: BOLD, text: 'SV360', orbit: { char: '0', deg: 0, kernBefore: -35 } }], isotype: true },
  'sv360-name': { label: 'Efeonce SV360 Search Visibility 360', runs: [{ font: BOLD, text: 'SV360', orbit: { char: '0', deg: 0, kernBefore: -35 }, space: 240 }, { font: MEDIUM, text: 'Search Visibility 360', scale: 0.62 }] },
  aeo: { label: 'Efeonce AEO', runs: [{ font: BOLD, text: 'AEO', orbit: { char: 'O', deg: 45 } }], isotype: true },
  'aeo-assessment': { label: 'Efeonce AEO Assessment', runs: [{ font: BOLD, text: 'AEO', orbit: { char: 'O', deg: 45 }, space: 260 }, { font: MEDIUM, text: 'Assessment', scale: 0.8 }] },
  'ai-visibility-report': { label: 'Efeonce AI Visibility Report', runs: [{ font: BOLD, text: 'AI Visibility', space: 260 }, { font: MEDIUM, text: 'Report', orbit: { char: 'o', deg: 45 } }], orbit: { stroke: 60, sphereR: 84, knock: 20 } }
}

const f = n => Number(n.toFixed(2))

function build(mark) {
  const o = { ...ORBIT, ...mark.orbit }
  let x = 0
  const ink = []
  const rings = []
  let top = -Infinity
  let bottom = Infinity

  mark.runs.forEach((run, ri) => {
    const layout = run.font.layout(run.text)
    const sc = run.scale ?? 1

    layout.glyphs.forEach((g, gi) => {
      top = Math.max(top, g.bbox.maxY * sc)
      bottom = Math.min(bottom, g.bbox.minY * sc)

      if (run.orbit && run.text[gi] === run.orbit.char) {
        x += run.orbit.kernBefore ?? 0
        const bb = g.bbox
        const rOut = (bb.maxY - bb.minY) / 2
        const r = rOut - o.stroke / 2
        const cx = x + bb.minX + rOut
        const cy = (bb.minY + bb.maxY) / 2
        const a = (run.orbit.deg * Math.PI) / 180
        const ring = { cx, cy, r, rOut, a, sx: cx + r * Math.sin(a), sy: cy + r * Math.cos(a), ...o }

        top = Math.max(top, cy + rOut, ring.sy + o.sphereR)
        bottom = Math.min(bottom, cy - rOut)
        rings.push(ring)
        x += bb.minX + 2 * rOut + (layout.positions[gi].xAdvance - bb.maxX) + TRACKING
      } else {
        if (g.path.commands.length) ink.push(g.path.scale(sc, sc).translate(x, 0).toSVG())
        x += (layout.positions[gi].xAdvance + TRACKING) * sc
      }
    })
    if (run.space && ri < mark.runs.length - 1) x += run.space
  })

  return { ink, rings, right: x - TRACKING, top, bottom }
}

function ringPath(o) {
  const cut = Math.asin((o.sphereR + o.knock) / (2 * o.r)) * 2
  const p = t => [o.cx + o.r * Math.sin(t), o.cy + o.r * Math.cos(t)]
  const [sx, sy] = p(o.a + cut)
  const [ex, ey] = p(o.a - cut + 2 * Math.PI)

  return `M${f(sx)} ${f(sy)}A${f(o.r)} ${f(o.r)} 0 1 0 ${f(ex)} ${f(ey)}`
}

function svg(b, { ink, accent }, label, isotype = false) {
  let minX = 0
  let maxX = b.right
  let { top, bottom } = b

  if (isotype) {
    const o = b.rings[0]

    minX = o.cx - o.rOut
    maxX = Math.max(o.cx + o.rOut, o.sx + o.sphereR)
    top = Math.max(o.cy + o.rOut, o.sy + o.sphereR)
    bottom = o.cy - o.rOut
  }

  const word = isotype ? '' : `<path fill="${ink}" d="${b.ink.join(' ')}"/>`
  const rings = b.rings.map(o => `<path fill="none" stroke="${ink}" stroke-width="${o.stroke}" d="${ringPath(o)}"/><circle fill="${accent}" cx="${f(o.sx)}" cy="${f(o.sy)}" r="${o.sphereR}"/>`).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(maxX - minX)} ${f(top - bottom)}" role="img" aria-label="${label}"><g transform="translate(${f(-minX)} ${f(top)}) scale(1 -1)">${word}${rings}</g></svg>\n`
}

// ─── Lockup: Efeonce | submarca ──────────────────────────────────────────────────────────────────────────────
const LOCKUP = { efeonceH: 30, gap: 20, ruleW: 1, ruleH: 26 }
// Las mayúsculas de la submarca miden como las letras de Efeonce: 21 px para las 719 unidades de «AEO» completo.
const MARK_PX_PER_UNIT = 21 / 719

const viewBoxOf = s => s.match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number)

const efeonceLogo = variant => {
  const file = variant === 'positive' ? 'efeonce-logo-positive.svg' : 'efeonce-logo-negative.svg'
  const raw = fs.readFileSync(path.join(EFEONCE_ASSETS, file), 'utf8')
  const fills = Object.fromEntries([...raw.matchAll(/\.(cls-\d+)\s*\{\s*fill:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]))

  // El logo trae su color en un <style>: se pasa a atributos para que ningún visor lo pierda. En `white` todo es blanco.
  return raw
    .replace(/<\?xml[^>]*>/, '')
    .replace(/<defs>[\s\S]*?<\/defs>/, '')
    .replace(/class="(cls-\d+)"/g, (_, c) => `fill="${variant === 'white' ? '#ffffff' : (fills[c] ?? '#000')}"`)
    .replace(/\s(id|data-name)="[^"]*"/g, '')
}

const nest = (source, x, y, h) => {
  const [, , vw, vh] = viewBoxOf(source)
  const w = f((vw * h) / vh)
  const body = source.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

  return { w, markup: `<svg x="${f(x)}" y="${f(y)}" width="${w}" height="${f(h)}" viewBox="0 0 ${vw} ${vh}">${body}</svg>` }
}

function lockup(b, variant, label) {
  const v = VARIANTS[variant]
  const markSvg = svg(b, { ink: v.endorsed, accent: v.accent }, label)
  const markH = (b.top - b.bottom) * MARK_PX_PER_UNIT
  const H = Math.max(LOCKUP.efeonceH, LOCKUP.ruleH, markH)
  const e = nest(efeonceLogo(variant), 0, (H - LOCKUP.efeonceH) / 2, LOCKUP.efeonceH)
  const ruleX = e.w + LOCKUP.gap
  const m = nest(markSvg, ruleX + LOCKUP.ruleW + LOCKUP.gap, (H - markH) / 2, markH)
  const W = f(ruleX + LOCKUP.ruleW + LOCKUP.gap + m.w)
  const rule = `<rect x="${f(ruleX)}" y="${f((H - LOCKUP.ruleH) / 2)}" width="${LOCKUP.ruleW}" height="${LOCKUP.ruleH}" fill="${v.rule.color}" fill-opacity="${v.rule.opacity}"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${f(H)}" role="img" aria-label="${label}">\n  ${e.markup}\n  ${rule}\n  ${m.markup}\n</svg>\n`
}

fs.mkdirSync(outDir, { recursive: true })
const written = []
const write = (name, content) => { fs.writeFileSync(path.join(outDir, name), content); written.push(name) }

for (const [id, mark] of Object.entries(MARKS)) {
  const b = build(mark)

  for (const variant of Object.keys(VARIANTS)) {
    const v = VARIANTS[variant]

    // `sv360-name` sólo existe como lockup (el nombre completo acompaña al logo, no lo reemplaza).
    if (id === 'sv360-name') {
      write(`sv360-name-lockup-${variant}.svg`, lockup(b, variant, mark.label))
      continue
    }

    write(`${id}-logo-${variant}.svg`, svg(b, v, mark.label))
    write(`${id}-lockup-${variant}.svg`, lockup(b, variant, mark.label))
    if (mark.isotype) write(`${id}-isotype-${variant}.svg`, svg(b, v, mark.label, true))
  }
}

console.log(JSON.stringify({ engineAccent: engine.accentOnLight, files: written.length }))
