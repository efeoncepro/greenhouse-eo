// «¿Claude o Codex?» — titular compuesto sobre el plate de estudio.
// El texto NUNCA se genera: se moldea con fontkit a trazos SVG desde las fuentes oficiales y las
// recetas de `axisAdvertising`, y se compone con sharp sobre la foto.
// Uso: node ai-generations/2026-09-17_claude-o-codex/componer.mjs [plate.png] [salida.png]
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'
import { axisAdvertising } from '@efeoncepro/axis-tokens'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const DIR = path.dirname(new URL(import.meta.url).pathname)

const PLATE = process.argv[2] ?? `${DIR}/plates/plate-v02.png`
const OUT = process.argv[3] ?? `${DIR}/out/claude-o-codex-4x5-v01.png`

const R = axisAdvertising.recipes
const C = axisAdvertising.color

const TITULO = '¿Claude o Codex?'
// Acentuado según ortografía: el operador escribió «No se cual elegir» sin tildes al dictarlo.
const CITA = '“No sé cuál elegir”'

const FONTS = {
  bric: fontkit.openSync('src/assets/fonts/BricolageGrotesque-Variable.ttf'),
  'Poppins-500': fontkit.openSync('src/assets/fonts/Poppins-Medium.ttf')
}

// Moldea un texto a trazos y devuelve su caja de tinta real (no la métrica de la fuente).
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

  return { paths, ink }
}

const { width: W, height: H } = await sharp(PLATE).metadata()

// ── Titular: Bricolage ideaImpact, ajustado al ancho objetivo por la tinta, no por la métrica ──
const impactFont = FONTS.bric.getVariation({ wght: R.ideaImpact.weight, wdth: R.ideaImpact.width, opsz: R.ideaImpact.opticalSize })
const TR = Number.parseFloat(R.ideaImpact.tracking)
const ANCHO_TITULO = 0.8
const sonda = shape(TITULO, impactFont, 100, TR)
const tamTitulo = (100 * W * ANCHO_TITULO) / (sonda.ink.right - sonda.ink.left)
const titulo = shape(TITULO, impactFont, tamTitulo, TR)

// ── Cita: Poppins structureTagline, proporcional al titular ──
const tamCita = tamTitulo * 0.30
const cita = shape(CITA, FONTS['Poppins-500'], tamCita, Number.parseFloat(R.structureTagline.tracking))

// Centrado óptico por la tinta; la línea base se deriva de la altura de tinta medida.
const centrar = (l, baseline) => ({
  x: W / 2 - (l.ink.left + l.ink.right) / 2,
  y: baseline,
  top: baseline + l.ink.top,
  bottom: baseline + l.ink.bottom
})

const TOP = Math.round(H * 0.072) // margen superior de la tinta del titular
const baseTitulo = TOP - titulo.ink.top
const pTitulo = centrar(titulo, baseTitulo)
const baseCita = pTitulo.bottom + tamTitulo * 0.46 - cita.ink.top
const pCita = centrar(cita, baseCita)

// ── Logo Efeonce en negativo, centrado abajo ──
const LOGO_W = Math.round(W * 0.17)
const logo = await sharp('public/branding/logo-negative.svg', { density: 600 }).resize({ width: LOGO_W }).png().toBuffer()
const { height: logoH } = await sharp(logo).metadata()

const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <g fill="${C.inkOnDark}" transform="translate(${pTitulo.x.toFixed(2)} ${pTitulo.y.toFixed(2)})">${titulo.paths}</g>
  <g fill="${C.softOnDark}" transform="translate(${pCita.x.toFixed(2)} ${pCita.y.toFixed(2)})">${cita.paths}</g>
</svg>`)

await sharp(PLATE)
  .composite([
    { input: overlay, left: 0, top: 0 },
    { input: logo, left: Math.round((W - LOGO_W) / 2), top: Math.round(H - logoH - H * 0.038) }
  ])
  .png()
  .toFile(OUT)

console.log(JSON.stringify({
  salida: OUT,
  lienzo: [W, H],
  titulo: { texto: TITULO, tam: Math.round(tamTitulo), tinta: [Math.round(pTitulo.top), Math.round(pTitulo.bottom)] },
  cita: { texto: CITA, tam: Math.round(tamCita), tinta: [Math.round(pCita.top), Math.round(pCita.bottom)] }
}, null, 2))
