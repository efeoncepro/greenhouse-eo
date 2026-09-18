// Saludo Fiestas Patrias Chile 2026 — Efeonce · exploración de 3 direcciones (volantín, pañuelo, fonda).
// Composición determinística sobre plates de GPT Image 2.5 Sunburst: tipografía real (fontkit → paths),
// recetas AXIS advertising y logo oficial. Ejecutar desde la raíz: node ai-generations/2026-09-17_fiestas-patrias-chile/render.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'
import { axisAdvertising } from '@efeoncepro/axis-tokens'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')

const DIR = path.dirname(new URL(import.meta.url).pathname)
const OUT = path.join(DIR, 'entrega')
const W = 1080
const H = 1350
const C = axisAdvertising.color
const R = axisAdvertising.recipes

fs.mkdirSync(OUT, { recursive: true })

const bricolage = fontkit.openSync('src/assets/fonts/BricolageGrotesque-Variable.ttf')
const poppins = { 600: fontkit.openSync('src/assets/fonts/Poppins-SemiBold.ttf') }

const em = value => (typeof value === 'string' && value.endsWith('em') ? Number(value.slice(0, -2)) : Number(value ?? 0))
const fontFor = spec => (spec.family === 'Bricolage' ? bricolage.getVariation({ wght: spec.weight, wdth: spec.width, opsz: spec.opticalSize }) : poppins[spec.weight])

const shapeLine = (text, spec) => {
  const font = fontFor(spec)
  const run = font.layout(text)
  const scale = spec.size / font.unitsPerEm
  const tracking = em(spec.tracking) * spec.size
  let x = 0
  let paths = ''
  const ink = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }

  run.glyphs.forEach((glyph, index) => {
    const position = run.positions[index]
    const gx = x + position.xOffset * scale
    const gy = -position.yOffset * scale
    const d = glyph.path.toSVG()

    if (d) paths += `<path d="${d}" transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${scale} ${-scale})"/>`

    if (glyph.bbox && Number.isFinite(glyph.bbox.minX) && glyph.bbox.maxX > glyph.bbox.minX) {
      ink.left = Math.min(ink.left, gx + glyph.bbox.minX * scale)
      ink.right = Math.max(ink.right, gx + glyph.bbox.maxX * scale)
      ink.top = Math.min(ink.top, gy - glyph.bbox.maxY * scale)
      ink.bottom = Math.max(ink.bottom, gy - glyph.bbox.minY * scale)
    }

    x += position.xAdvance * scale + (index === run.glyphs.length - 1 ? 0 : tracking)
  })

  return { paths, ink }
}

/** Bloque de líneas; `align` center|left respecto de `x`, con el centro de tinta vertical en `centerY`. */
const textBlock = ({ lines, spec, x: anchorX, centerY, fill, lineHeight, align = 'center' }) => {
  const step = spec.size * lineHeight
  const shaped = lines.map((line, i) => ({ ...shapeLine(line, spec), baseline: i * step }))
  const top = Math.min(...shaped.map(l => l.baseline + l.ink.top))
  const bottom = Math.max(...shaped.map(l => l.baseline + l.ink.bottom))
  const offsetY = centerY - (top + bottom) / 2
  let svg = ''

  for (const line of shaped) {
    const x = align === 'center' ? anchorX - (line.ink.left + line.ink.right) / 2 : anchorX - line.ink.left

    svg += `<g transform="translate(${x.toFixed(2)} ${(line.baseline + offsetY).toFixed(2)})">${line.paths}</g>`
  }

  return { svg: `<g fill="${fill}">${svg}</g>`, top: top + offsetY, bottom: bottom + offsetY }
}

const fitSize = (lines, spec, targetWidth) => {
  const probe = { ...spec, size: 100 }
  const widest = Math.max(...lines.map(line => { const s = shapeLine(line, probe); return s.ink.right - s.ink.left }))

  return (100 * targetWidth) / widest
}

const idea = (lines, width) => {
  const spec = { family: 'Bricolage', weight: R.ideaShort.weight, width: R.ideaShort.width, opticalSize: R.ideaShort.opticalSize, tracking: R.ideaShort.tracking }

  spec.size = fitSize(lines, spec, width)

  return spec
}

const label = size => ({ family: 'Poppins', weight: 600, tracking: R.structureLabel.tracking, size })

const LOGO_RATIO = 196.68 / 837.07
const logo = ({ x, y, width }) => {
  const raw = fs.readFileSync('public/branding/logo-negative.svg', 'utf8').replace(/<\?xml[^>]*>/, '')

  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">${raw.replace('<svg ', `<svg width="${width}" height="${(width * LOGO_RATIO).toFixed(2)}" `)}</g>`
}

const gradient = (id, from, to, stops) =>
  `<defs><linearGradient id="${id}" x1="0" y1="${from}" x2="0" y2="${to}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient></defs>`

const SAFE = 72
const FELICES = ['¡FELICES FIESTAS PATRIAS!']

// ── 1 · Volantín: texto en el cielo, arriba ─────────────────────────────────────────────────────────
const volantin = () => {
  const LINES = ['Gracias por', 'encumbrar', 'con nosotros.']
  const head = textBlock({ lines: LINES, spec: idea(LINES, W * 0.56), x: W / 2, centerY: 190, fill: C.inkOnDark, lineHeight: R.ideaShort.lineHeight })
  const sub = textBlock({ lines: FELICES, spec: label(30), x: W / 2, centerY: head.bottom + 50, fill: C.softOnDark, lineHeight: 1 })
  const LW = 190

  return {
    plate: 'a-volantin', offsetY: 270,
    layers: [
      gradient('g1', 0, 1, [[0, '#001a33', 0.45], [0.45, '#001a33', 0], [0.82, '#000', 0], [1, '#000', 0.55]]),
      `<rect width="${W}" height="${H}" fill="url(#g1)"/>`,
      head.svg, sub.svg,
      logo({ x: (W - LW) / 2, y: H - SAFE - LW * LOGO_RATIO, width: LW })
    ]
  }
}

// ── 3 · Pañuelo: texto abajo a la izquierda, sobre la zona oscura ───────────────────────────────────
const panuelo = () => {
  const LINES = ['Que este 18', 'se viva', 'con ritmo.']
  const spec = idea(LINES, W * 0.5)
  const LW = 170
  const logoY = H - SAFE - LW * LOGO_RATIO
  const sub = textBlock({ lines: FELICES, spec: label(26), x: SAFE, centerY: logoY - 70, fill: C.softOnDark, lineHeight: 1, align: 'left' })
  const headHeight = spec.size * R.ideaShort.lineHeight * 2 + spec.size * 0.75
  const head = textBlock({ lines: LINES, spec, x: SAFE, centerY: sub.top - 44 - headHeight / 2, fill: C.inkOnDark, lineHeight: R.ideaShort.lineHeight, align: 'left' })

  return {
    plate: 'b-panuelo', offsetY: 0,
    layers: [
      gradient('g3', 0, 1, [[0, '#001a33', 0], [0.5, '#001a33', 0], [1, '#001a33', 0.85]]),
      `<rect width="${W}" height="${H}" fill="url(#g3)"/>`,
      head.svg, sub.svg,
      logo({ x: SAFE, y: logoY, width: LW })
    ]
  }
}

// ── 4 · Fonda: «¡Pase no más!» pintado en el letrero; saludo abajo ──────────────────────────────────
const fonda = () => {
  // Letrero del plate (1024x1536 → 1080 de ancho, escala 1.0547): x 152–953, y 285–548.
  const SIGN = { cx: 553, cy: 415, w: 640 }
  const SIGN_LINES = ['¡Pase no más!']
  const sign = textBlock({ lines: SIGN_LINES, spec: idea(SIGN_LINES, SIGN.w * 0.86), x: SIGN.cx, centerY: SIGN.cy, fill: '#fdf6e8', lineHeight: 1 })
  const LINES = ['Gracias por un gran', 'año juntos.']
  const LW = 180
  const logoY = H - SAFE - LW * LOGO_RATIO
  const sub = textBlock({ lines: FELICES, spec: label(28), x: W / 2, centerY: logoY - 62, fill: C.softOnDark, lineHeight: 1 })
  const spec = idea(LINES, W * 0.66)
  const head = textBlock({ lines: LINES, spec, x: W / 2, centerY: sub.top - 40 - spec.size * 0.8, fill: C.inkOnDark, lineHeight: R.ideaShort.lineHeight })

  return {
    plate: 'c-fonda', offsetY: 0,
    layers: [
      gradient('g4', 0, 1, [[0, '#001a33', 0], [0.55, '#001a33', 0], [0.78, '#001a33', 0.7], [1, '#001a33', 0.92]]),
      `<rect width="${W}" height="${H}" fill="url(#g4)"/>`,
      `<g opacity="0.94">${sign.svg}</g>`,
      head.svg, sub.svg,
      logo({ x: (W - LW) / 2, y: logoY, width: LW })
    ]
  }
}

// ── 1 · Volantín horizontal (correo, 16:9): texto a la izquierda, volantín a la derecha ─────────────
const HW = 1600
const HH = 900
const volantinH = () => {
  const X = 120
  const LINES = ['Gracias por encumbrar', 'con nosotros.']
  const spec = idea(LINES, HW * 0.46)
  const head = textBlock({ lines: LINES, spec, x: X, centerY: 250, fill: C.inkOnDark, lineHeight: R.ideaShort.lineHeight, align: 'left' })
  const sub = textBlock({ lines: FELICES, spec: label(30), x: X, centerY: head.bottom + 52, fill: C.inkOnDark, lineHeight: 1, align: 'left' })
  const LW = 190

  return {
    plate: 'a-volantin-h-v03', width: HW, height: HH, offsetY: 167,
    layers: [
      gradient('gh', 0, 1, [[0, '#001a33', 0.5], [0.55, '#001a33', 0.12], [0.8, '#000', 0], [1, '#000', 0.6]]),
      `<rect width="${HW}" height="${HH}" fill="url(#gh)"/>`,
      head.svg, sub.svg,
      logo({ x: X, y: HH - 64 - LW * LOGO_RATIO, width: LW })
    ]
  }
}

const VERSION = process.argv[2] ?? 'v02'
const JOBS = VERSION === 'v01'
  ? [['1-volantin', volantin], ['3-panuelo', panuelo], ['4-fonda', fonda]]
  : [['1-volantin-4x5', () => ({ ...volantin(), plate: 'a-volantin-v03' })], ['1-volantin-16x9', volantinH]]

for (const [id, build] of JOBS) {
  const { plate, offsetY, layers, width = W, height = H } = build()
  const meta = await sharp(path.join(DIR, 'plates', `${plate}.png`)).metadata()
  const base = await sharp(path.join(DIR, 'plates', `${plate}.png`)).resize(width, Math.round((width * meta.height) / meta.width)).extract({ left: 0, top: offsetY, width, height }).png().toBuffer()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${layers.join('')}</svg>`

  fs.writeFileSync(path.join(DIR, `overlay-${id}-${VERSION}.svg`), svg)
  await sharp(base).composite([{ input: Buffer.from(svg) }]).png().toFile(path.join(OUT, `fiestas-patrias-chile-${id}-${VERSION}.png`))
  console.log('✓', id, VERSION)
}
