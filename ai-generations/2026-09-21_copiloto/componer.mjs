// «Tu IA no conoce tu negocio» — composición sobre el plate de la palanca `copiloto`.
//
// ES EL MISMO COMPOSITOR de «¿Claude o Codex?» (2026-09-17), el primer uso de la selección AXIS sobre
// fotografía, con los valores de esta pieza. No es uno nuevo: el canon lo prohíbe, y además este ya
// está probado sobre foto. Lo que cambia son las constantes de contenido y que las posiciones pasan a
// ser relativas al lienzo, porque este plate es 1024×1280 y aquél era 1152×1440.
//
// Tres capas, ninguna generada por el modelo:
//   1. El logo vive DENTRO del primer plano desenfocado, que acá no es un objeto añadido sino la
//      propia mesa: su borde cercano ya está fuera de foco por la óptica de la toma.
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

const PLATE = process.argv[2] ?? `${DIR}/plates/A-copiloto-v5.png`
const OUT = process.argv[3] ?? `${DIR}/out/copiloto-nexa-clawd.png`

const R = axisAdvertising.recipes
const C = axisAdvertising.color

// Dos voces, como la pieza fuente: la entrada prepara y el dominante remata. Se componen por
// separado para que la caja de selección envuelva SÓLO al dominante, que es lo que se está decidiendo.
const ENTRADA = 'Tu IA no conoce'
const TITULO = 'tu negocio.'
const CITA = 'Contexto: 0 %'

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

// ── Entrada · prepara la tesis, encima del dominante y en otra voz ───────────────────────────────
const entradaFont = FONTS.bric.getVariation({ wght: R.ideaLead.weight, wdth: R.ideaLead.width, opsz: R.ideaLead.opticalSize })
const tamEntrada = tamTitulo * 0.46
const entrada = shape(ENTRADA, entradaFont, tamEntrada, Number.parseFloat(R.ideaLead.tracking))
const xEntrada = W / 2 - (entrada.ink.left + entrada.ink.right) / 2
const yEntrada = cajaTitulo.top - tamEntrada * 0.55 - entrada.ink.bottom

// ── Nivel 2 · la cita, fuera de eje y abajo a la izquierda ───────────────────────────────────────
const tamCita = tamTitulo * 0.34
const cita = shape(CITA, FONTS['Poppins-500'], tamCita, Number.parseFloat(R.structureTagline.tracking))

// ── Nivel 3 · la marca, dentro del primer plano desenfocado ──────────────────────────────────────
// NO hay ningún objeto añadido. El primer plano desenfocado es **la mesa misma**: a 135 mm y f/2,8
// su borde cercano ya cae completamente fuera de foco. Medido en este plate: gradiente 5 en el borde
// inferior contra 314 en el rostro — tan desenfocado como el fondo. El logo se apoya ahí, centrado
// en el eje de la pieza, en negativo porque el lecho es oscuro.
const ZONA = { cx: W / 2, cy: Math.round(H * 0.935) }
const MARCA = ANCHO ? null : { cx: ZONA.cx, cy: ZONA.cy, ancho: Math.round(W * 0.20) }   // 20% del lado corto: decisión del operador 2026-09-20

let marcaCapa = null
if (MARCA) {
  const base = await sharp('public/branding/logo-negative.svg', { density: 600 }).resize({ width: MARCA.ancho }).png().toBuffer()
  const { width: nw, height: nh } = await sharp(base).metadata()
  marcaCapa = { input: base, left: Math.round(MARCA.cx - nw / 2), top: Math.round(MARCA.cy - nh / 2) }
}

// La cita va al margen izquierdo, fuera del eje del titular: rompe la simetría y la deja claramente
// por debajo en la jerarquía. Se mantiene a la izquierda del pelo, que es donde el fondo deja de ser
// oscuro — medido: sobre el pelo el contraste cae a 1,17:1.
// El chip es OPCIONAL. Criterio de RECORRIDO DE LA VISTA (operador, 2026-09-21): la mirada entra por el
// titular, baja por el eje central a la escena y sale por la firma. Un elemento al margen, a media altura,
// queda FUERA de ese recorrido: es un desvío lateral sin destino y se lee como un adorno pegado. Si va,
// va sobre el eje, como escalón entre el titular y la escena. Y que no tape a Nexa se MIDE abajo.
const CHIP = process.env.CHIP ?? 'no'          // 'no' | 'centro'
const yCita = Math.round(H * 0.275) - cita.ink.top
const xCita = W / 2 - (cita.ink.left + cita.ink.right) / 2

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
    { id: 'clawd', kind: 'collaborator', targetId: 'titulo-decision', anchor: 'top-end', action: 'select', label: 'Claude', participantKind: 'role' },
    { id: 'local', kind: 'local', targetId: 'titulo-decision', anchor: 'bottom-start', action: 'select' }
  ]
})
const rendered = renderCollaborationSelection({
  manifest,
  targetBounds: cajaTitulo,
  canvas: { width: W, height: H },
  measureLabel,
  presentation: { collaboratorScale: 1.7, localCursorScale: 1.15, participantColors: { clawd: COLOR_CLAWD } }
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

// Pastilla del chip: fondo azul activo de marca, tinta blanca. El alto sale de la tinta real.
const chipPadX = tamCita * 0.62
const chipPadY = tamCita * 0.42
const chipBox = {
  left: xCita + cita.ink.left - chipPadX,
  right: xCita + cita.ink.right + chipPadX,
  top: yCita + cita.ink.top - chipPadY,
  bottom: yCita + cita.ink.bottom + chipPadY
}
const chip = `<rect x="${chipBox.left.toFixed(2)}" y="${chipBox.top.toFixed(2)}" ` +
  `width="${(chipBox.right - chipBox.left).toFixed(2)}" height="${(chipBox.bottom - chipBox.top).toFixed(2)}" ` +
  `rx="${((chipBox.bottom - chipBox.top) / 2).toFixed(2)}" fill="#0375DB"/>`

// ── Guarda del chip: ¿hay algo debajo? (sólo si el chip va) ─────────────────────────────────────
// La condición del operador es que el chip NO tape a Nexa. Un comentario no lo garantiza: se mide el
// detalle del plate dentro de la caja. Un muro liso da un gradiente bajo; un rostro, una mano o la
// criatura dan bordes. Si hay estructura, abortar — la pieza se recompone, no se publica encima.
if (CHIP !== 'no') {
  // Se mide con AIRE alrededor: que el chip no tape algo no basta, rozarlo también ensucia — la
  // primera pasada pasó la caja estricta y el borde derecho del chip tocaba el signo de interrogación.
  const aire = Math.round((chipBox.bottom - chipBox.top) * 0.5)
  const cajaX = Math.max(0, Math.floor(chipBox.left - aire))
  const cajaY = Math.max(0, Math.floor(chipBox.top - aire))
  const cajaW = Math.min(W - cajaX, Math.ceil(chipBox.right - chipBox.left) + aire * 2)
  const cajaH = Math.min(H - cajaY, Math.ceil(chipBox.bottom - chipBox.top) + aire * 2)
  const { data, info } = await sharp(PLATE)
    .extract({ left: cajaX, top: cajaY, width: cajaW, height: cajaH })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let suma = 0
  let n = 0
  for (let y = 0; y < info.height; y++) {
    for (let x = 1; x < info.width; x++) {
      suma += Math.abs(data[y * info.width + x] - data[y * info.width + x - 1])
      n++
    }
  }
  const detalle = suma / n
  console.error(`  chip · detalle bajo la caja ${detalle.toFixed(2)} (muro liso < 3)`)
  if (detalle > 3) {
    throw new Error(
      `El chip caería sobre algo con detalle (gradiente ${detalle.toFixed(2)} en [${cajaX},${cajaY} ${cajaW}x${cajaH}]). ` +
        'El chip es opcional y no puede tapar a Nexa: muévelo a una zona vacía del muro o quítalo.'
    )
  }
}

const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${seleccion}
  ${CHIP === 'no' ? '' : chip}
  <g fill="${C.softOnDark}" transform="translate(${xEntrada.toFixed(2)} ${yEntrada.toFixed(2)})">${entrada.paths}</g>
  <g fill="${C.inkOnDark}" transform="translate(${xTitulo.toFixed(2)} ${yTitulo.toFixed(2)})">${titulo.paths}</g>
  ${CHIP === 'no' ? '' : `<g fill="${C.inkOnDark}" transform="translate(${xCita.toFixed(2)} ${yCita.toFixed(2)})">${cita.paths}</g>`}
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
