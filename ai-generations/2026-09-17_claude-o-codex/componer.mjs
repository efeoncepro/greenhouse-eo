// «¿Claude o Codex?» — composición sobre el plate de estudio.
//
// Tres capas, ninguna generada por el modelo:
//   1. Logo sobre un OBJETO DEL ESTUDIO que está fuera de foco: el dorso de un portátil apoyado en
//      la mesa, que el plate trae limpio. El desenfoque es del objeto; la marca se lee.
//   2. Jerarquía tipográfica: titular dominante arriba · la cita del protagonista al margen izquierdo,
//      fuera de eje, como un aparte humano · la marca, sólo sobre el objeto.
//   3. Selección colaborativa AXIS sobre el titular: Clawd y Codex disputándose la decisión.
//
// El texto NUNCA se genera: se moldea con fontkit a trazos SVG desde las fuentes oficiales y las
// recetas de `axisAdvertising`.
// Uso: node ai-generations/2026-09-17_claude-o-codex/componer.mjs [plate.png] [salida.png]
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'
import { axisAdvertising } from '@efeoncepro/axis-tokens'
import { resolveCollaborationSelectionIntent } from '@efeoncepro/axis-ui-contracts'

import { renderCollaborationSelection } from '../../scripts/creative/layout-compiler/axis-advertising.mjs'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const DIR = path.dirname(new URL(import.meta.url).pathname)

const PLATE = process.argv[2] ?? `${DIR}/plates/plate-final.png`
const OUT = process.argv[3] ?? `${DIR}/out/claude-o-codex-4x5-v03.png`

const R = axisAdvertising.recipes
const C = axisAdvertising.color

const TITULO = '¿Claude o Codex?'
// Acentuado según ortografía: el operador lo dictó como «No se cual elegir».
const CITA = '“No sé cuál elegir”'

// Colores de marca de cada mascota, medidos sobre el propio plate (no inventados):
// Clawd toma el naranja oficial de Claude Code; Codex, el azul de su vinilo.
const COLOR_CLAWD = '#d77757'
const COLOR_CODEX = '#2f67db'

const FONTS = {
  bric: fontkit.openSync('src/assets/fonts/BricolageGrotesque-Variable.ttf'),
  'Poppins-500': fontkit.openSync('src/assets/fonts/Poppins-Medium.ttf'),
  'Poppins-700': fontkit.openSync('src/assets/fonts/Poppins-Bold.ttf')
}

// Moldea un texto a trazos y devuelve su caja de TINTA real (no la métrica de la fuente).
const shape = (text, font, size, trackingEm = 0) => {
  const run = font.layout(text)
  const scale = size / font.unitsPerEm
  let x = 0
  let paths = ''
  const ink = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }

  run.glyphs.forEach((g, i) => {
    const p = run.positions[i]
    const gx = x + p.xOffset * scale
    const d = g.path.toSVG()

    if (d) paths += `<path d="${d}" transform="translate(${gx.toFixed(2)} 0) scale(${scale} ${-scale})"/>`
    if (g.bbox && g.bbox.maxX > g.bbox.minX) {
      ink.left = Math.min(ink.left, gx + g.bbox.minX * scale)
      ink.right = Math.max(ink.right, gx + g.bbox.maxX * scale)
      ink.top = Math.min(ink.top, -g.bbox.maxY * scale)
      ink.bottom = Math.max(ink.bottom, -g.bbox.minY * scale)
    }
    x += p.xAdvance * scale + (i === run.glyphs.length - 1 ? 0 : trackingEm * size)
  })

  return { paths, ink, advance: x }
}

const { width: W, height: H } = await sharp(PLATE).metadata()
const ANCHO = W / H > 1.2
const MARGEN = W * 0.075

// ── Nivel 1 · titular ────────────────────────────────────────────────────────────────────────────
// Se deja aire a la derecha para el cursor y la etiqueta del colaborador, que viven fuera de la caja.
const impactFont = FONTS.bric.getVariation({ wght: R.ideaImpact.weight, wdth: R.ideaImpact.width, opsz: R.ideaImpact.opticalSize })
const TR = Number.parseFloat(R.ideaImpact.tracking)
const sonda = shape(TITULO, impactFont, 100, TR)
const tamTitulo = (100 * W * (ANCHO ? 0.36 : 0.58)) / (sonda.ink.right - sonda.ink.left)
const titulo = shape(TITULO, impactFont, tamTitulo, TR)
const xTitulo = W / 2 - (titulo.ink.left + titulo.ink.right) / 2
const yTitulo = Math.round(H * (ANCHO ? 0.09 : 0.135)) - titulo.ink.top
const cajaTitulo = {
  left: xTitulo + titulo.ink.left,
  right: xTitulo + titulo.ink.right,
  top: yTitulo + titulo.ink.top,
  bottom: yTitulo + titulo.ink.bottom
}

// ── Nivel 2 · la cita, fuera de eje y abajo a la izquierda ───────────────────────────────────────
const tamCita = tamTitulo * 0.34
const cita = shape(CITA, FONTS['Poppins-500'], tamCita, Number.parseFloat(R.structureTagline.tracking))

// ── Nivel 3 · la marca, sobre el objeto del estudio que está fuera de foco ───────────────────────
// El plate trae un PORTÁTIL real apoyado en la mesa entre él y la cámara: se ve el dorso de la tapa,
// asomando sobre el borde de la mesa, con sus dos esquinas dentro del cuadro y completamente
// desenfocado por estar a centímetros del lente. Su dorso llega LIMPIO desde el plate.
//
//   · El desenfoque es del OBJETO, no del logo: la marca va nítida y se lee.
//   · El color sale de la luminancia medida del dorso (L ≈ 37/255, más oscuro que la mesa):
//     tapa oscura → logo en NEGATIVO. El navy sobre claro era del intento anterior y no pertenecía
//     a esta escena nocturna.
//   · Va centrado en el ANCHO DE LA TAPA, no en el del lienzo.
const TAPA = { izquierda: 240, derecha: 950, arriba: 1230, abajo: 1440, luminancia: 37 }
const MARCA = ANCHO
  ? null
  : { cx: (TAPA.izquierda + TAPA.derecha) / 2, cy: (TAPA.arriba + TAPA.abajo) / 2, ancho: Math.round((TAPA.derecha - TAPA.izquierda) * 0.44) }

let marcaCapa = null
if (MARCA) {
  const base = await sharp('public/branding/logo-negative.svg', { density: 600 }).resize({ width: MARCA.ancho }).png().toBuffer()
  const { width: nw, height: nh } = await sharp(base).metadata()
  marcaCapa = { input: base, left: Math.round(MARCA.cx - nw / 2), top: Math.round(MARCA.cy - nh / 2) }
}

// La cita va al margen izquierdo, fuera del eje del titular: rompe la simetría y la deja claramente
// por debajo en la jerarquía. Se mantiene a la izquierda del pelo, que es donde el fondo deja de ser
// oscuro — medido: sobre el pelo el contraste cae a 1,17:1.
const yCita = cajaTitulo.bottom + tamTitulo * 1.05 - cita.ink.top
const xCita = W * 0.055 - cita.ink.left

// ── Selección colaborativa AXIS sobre el titular ─────────────────────────────────────────────────
// La decisión es el objeto seleccionado y las dos mascotas se la disputan: cada cursor lleva su
// color de marca, la tinta de la etiqueta la elige el adapter por contraste.
const measureLabel = (label, size) => shape(label, FONTS['Poppins-700'], size).advance
const manifest = resolveCollaborationSelectionIntent({
  targetId: 'titulo-decision',
  targetKind: 'text',
  variant: 'eight-handles',
  padding: 'standard',
  overlay: 'subtle',
  cursors: [
    { id: 'clawd', kind: 'collaborator', targetId: 'titulo-decision', anchor: 'top-end', action: 'select', label: 'Clawd', participantKind: 'role' },
    { id: 'codex', kind: 'collaborator', targetId: 'titulo-decision', anchor: 'top-start', action: 'select', label: 'Codex', participantKind: 'role' },
    { id: 'local', kind: 'local', targetId: 'titulo-decision', anchor: 'bottom-end', action: 'select' }
  ]
})
const rendered = renderCollaborationSelection({
  manifest,
  targetBounds: cajaTitulo,
  canvas: { width: W, height: H },
  measureLabel,
  presentation: { collaboratorScale: 1.7, localCursorScale: 1.15, participantColors: { clawd: COLOR_CLAWD, codex: COLOR_CODEX } }
})

// El adapter emite <text>; acá no hay fuentes instaladas en el render, así que se convierte a trazos.
const seleccion = rendered.overlay.replace(
  /<text x="(-?[\d.]+)" y="(-?[\d.]+)" fill="([^"]+)" font-family="[^"]*" font-size="([\d.]+)" font-weight="700">([^<]*)<\/text>/g,
  (_, x, y, fill, size, label) => {
    const s = shape(label.replaceAll('&amp;', '&'), FONTS['Poppins-700'], Number(size))
    return `<g fill="${fill}" transform="translate(${x} ${y})">${s.paths}</g>`
  }
)
if (/<text/.test(seleccion)) throw new Error('Quedó un <text> sin convertir a trazos')
if (!rendered.evidence.withinCanvas) throw new Error(`Selección fuera del lienzo: ${JSON.stringify(rendered.evidence)}`)

const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${seleccion}
  <g fill="${C.inkOnDark}" transform="translate(${xTitulo.toFixed(2)} ${yTitulo.toFixed(2)})">${titulo.paths}</g>
  <g fill="${C.softOnDark}" transform="translate(${xCita.toFixed(2)} ${yCita.toFixed(2)})">${cita.paths}</g>
</svg>`)

await sharp(PLATE)
  .composite([
    ...(marcaCapa ? [marcaCapa] : []),
    { input: overlay, left: 0, top: 0 }
  ])
  .png()
  .toFile(OUT)

console.log(JSON.stringify({
  salida: OUT,
  lienzo: [W, H],
  jerarquia: {
    titular: { tam: Math.round(tamTitulo), tinta: [Math.round(cajaTitulo.top), Math.round(cajaTitulo.bottom)] },
    cita: { tam: Math.round(tamCita), tinta: [Math.round(yCita + cita.ink.top), Math.round(yCita + cita.ink.bottom)] }
  },
  seleccion: { cursores: manifest.cursors.map(c => c.id), dentroDelLienzo: rendered.evidence.withinCanvas },
  marcaSobreElObjeto: MARCA
}, null, 2))
