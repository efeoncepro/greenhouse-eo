// Carrusel «Hay frases que no se tocan» — Efeonce · Fiestas Patrias México 2026.
// Composición determinística sobre plates de GPT Image 2.5 Sunburst. Tipografía real (fontkit → paths),
// selección/cursores con el renderer AXIS (resolveCollaborationSelectionIntent + renderCollaborationSelection),
// logo oficial. Ejecutar desde la raíz del repo: node ai-generations/2026-09-16_viva-mexico/render.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'
import { resolveCollaborationSelectionIntent } from '@efeoncepro/axis-ui-contracts'
import { axisAdvertising } from '@efeoncepro/axis-tokens'

import { renderCollaborationSelection } from '../../scripts/creative/layout-compiler/axis-advertising.mjs'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')

const DIR = path.dirname(new URL(import.meta.url).pathname)
const OUT = path.join(DIR, 'slides')
const W = 1080
const H = 1350
const C = axisAdvertising.color
const R = axisAdvertising.recipes

fs.mkdirSync(OUT, { recursive: true })

const bricolage = fontkit.openSync('src/assets/fonts/BricolageGrotesque-Variable.ttf')
const poppins = {
  400: fontkit.openSync('src/assets/fonts/Poppins-Regular.ttf'),
  500: fontkit.openSync('src/assets/fonts/Poppins-Medium.ttf'),
  600: fontkit.openSync('src/assets/fonts/Poppins-SemiBold.ttf'),
  700: fontkit.openSync('src/assets/fonts/Poppins-Bold.ttf')
}

const em = value => (typeof value === 'string' && value.endsWith('em') ? Number(value.slice(0, -2)) : Number(value ?? 0))

const fontFor = spec =>
  spec.family === 'Bricolage'
    ? bricolage.getVariation({ wght: spec.weight, wdth: spec.width, opsz: spec.opticalSize })
    : poppins[spec.weight]

/** Mide y convierte una línea a paths. Devuelve svg (en origen 0,baseline 0), ancho de avance y bbox de tinta. */
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

  return { paths, advance: x, ink }
}

/** Coloca un bloque de líneas centrado en x, con su centro de tinta vertical en `centerY`. */
const textBlock = ({ lines, spec, centerX, centerY, fill, lineHeight }) => {
  const shaped = lines.map(line => shapeLine(line, spec))
  const step = spec.size * lineHeight
  const provisional = shaped.map((line, i) => ({ ...line, baseline: i * step }))
  const top = Math.min(...provisional.map(l => l.baseline + l.ink.top))
  const bottom = Math.max(...provisional.map(l => l.baseline + l.ink.bottom))
  const offsetY = centerY - (top + bottom) / 2
  const bounds = { left: Infinity, top: top + offsetY, right: -Infinity, bottom: bottom + offsetY }
  let svg = ''

  for (const line of provisional) {
    const x = centerX - (line.ink.left + line.ink.right) / 2
    const y = line.baseline + offsetY

    bounds.left = Math.min(bounds.left, x + line.ink.left)
    bounds.right = Math.max(bounds.right, x + line.ink.right)
    svg += `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">${line.paths}</g>`
  }

  return { svg: `<g fill="${fill}">${svg}</g>`, bounds }
}

/** Tamaño que hace que la línea más ancha mida `targetWidth` de tinta. */
const fitSize = (lines, spec, targetWidth) => {
  const probe = { ...spec, size: 100 }
  const widest = Math.max(...lines.map(line => { const s = shapeLine(line, probe); return s.ink.right - s.ink.left }))

  return (100 * targetWidth) / widest
}

// ── Especificaciones AXIS ──────────────────────────────────────────────────────────────────────────
const headlineSpec = { family: 'Bricolage', weight: R.ideaImpact.weight, width: R.ideaImpact.width, opticalSize: R.ideaImpact.opticalSize, tracking: R.ideaImpact.tracking }
const ideaSpec = { family: 'Bricolage', weight: R.ideaShort.weight, width: R.ideaShort.width, opticalSize: R.ideaShort.opticalSize, tracking: R.ideaShort.tracking }

const HEADLINE = ['¡Viva', 'México!']
// 64 %: deja aire para que las etiquetas de colaboradores anclados en esquina queden dentro del lienzo (contrato AXIS).
headlineSpec.size = fitSize(HEADLINE, headlineSpec, W * 0.52)
const HEAD_CENTER_Y = H * 0.37
const headline = textBlock({ lines: HEADLINE, spec: headlineSpec, centerX: W / 2, centerY: HEAD_CENTER_Y, fill: C.inkOnDark, lineHeight: R.ideaImpact.lineHeight })

const IDEA = ['Hay frases', 'que no se tocan.']
ideaSpec.size = fitSize(IDEA, ideaSpec, W * 0.54)
const idea = textBlock({ lines: IDEA, spec: ideaSpec, centerX: W / 2, centerY: HEAD_CENTER_Y, fill: C.inkOnDark, lineHeight: R.ideaShort.lineHeight })

/**
 * Pila de tramos con funciones distintas (entrada · puente · remate), centrada. El espacio entre tramos se controla
 * por GAP DE TINTA real (top de la siguiente − bottom de la anterior), no por leading: las familias y tamaños difieren.
 */
const stackBlock = ({ parts, centerX, centerY }) => {
  const shaped = parts.map(part => ({ ...part, shape: shapeLine(part.text, part.spec) }))
  let cursor = 0
  const placed = shaped.map((part, index) => {
    const baseline = index === 0 ? 0 : cursor + part.gapBefore - part.shape.ink.top
    cursor = baseline + part.shape.ink.bottom

    return { ...part, baseline }
  })
  const top = placed[0].baseline + placed[0].shape.ink.top
  const offsetY = centerY - (top + cursor) / 2
  const bounds = { left: Infinity, top: top + offsetY, right: -Infinity, bottom: cursor + offsetY }
  const metrics = []
  let svg = ''

  for (const part of placed) {
    const x = centerX - (part.shape.ink.left + part.shape.ink.right) / 2
    const y = part.baseline + offsetY

    bounds.left = Math.min(bounds.left, x + part.shape.ink.left)
    bounds.right = Math.max(bounds.right, x + part.shape.ink.right)
    svg += `<g fill="${part.fill}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">${part.shape.paths}</g>`
    metrics.push({ text: part.text, family: part.spec.family, weight: part.spec.weight, size: Number(part.spec.size.toFixed(2)), inkTop: Number((y + part.shape.ink.top).toFixed(2)), inkBottom: Number((y + part.shape.ink.bottom).toFixed(2)), inkWidth: Number((part.shape.ink.right - part.shape.ink.left).toFixed(2)) })
  }

  const gaps = metrics.slice(1).map((m, i) => Number((m.inkTop - metrics[i].inkBottom).toFixed(2)))

  return { svg, bounds, metrics, gaps }
}

const bric = (recipe, weight, size) => ({ family: 'Bricolage', weight: weight ?? recipe.weight, width: recipe.width, opticalSize: recipe.opticalSize, tracking: recipe.tracking, size })
const pop = (weight, size, tracking = '-0.005em') => ({ family: 'Poppins', weight, size, tracking })

/** Escala una pila para que su tramo más ancho mida `targetWidth` de tinta, conservando las proporciones entre tramos. */
const fitStack = (parts, targetWidth) => {
  const widest = Math.max(...parts.map(part => { const s = shapeLine(part.text, part.spec); return s.ink.right - s.ink.left }))
  const k = targetWidth / widest

  return parts.map(part => ({ ...part, spec: { ...part.spec, size: part.spec.size * k }, gapBefore: (part.gapBefore ?? 0) * k }))
}

// Variante A (recomendada): entrada Poppins → puente Bricolage liviano → remate Bricolage pesado con el mecanismo.
const IDEA_A = fitStack(
  [
    { text: 'Hay frases que', spec: pop(500, 58), fill: C.softOnDark },
    { text: 'no se', spec: bric(R.ideaLead, 420, 112), fill: C.inkOnDark, gapBefore: 20 },
    { text: 'tocan.', spec: bric(R.ideaImpact, 800, 220), fill: C.inkOnDark, gapBefore: 14 }
  ],
  W * 0.5
)

// Variante B: entrada Poppins → afirmación completa en Bricolage pesado.
const IDEA_B = fitStack(
  [
    { text: 'Hay frases que', spec: pop(500, 58), fill: C.softOnDark },
    { text: 'no se tocan.', spec: bric(R.ideaImpact, 780, 150), fill: C.inkOnDark, gapBefore: 22 }
  ],
  W * 0.56
)

const ideaA = stackBlock({ parts: IDEA_A, centerX: W / 2, centerY: HEAD_CENTER_Y + 30 })
const ideaB = stackBlock({ parts: IDEA_B, centerX: W / 2, centerY: HEAD_CENTER_Y + 30 })

// ── Logo oficial ───────────────────────────────────────────────────────────────────────────────────
const LOGO_W = 200
const LOGO_RATIO = 196.68 / 837.07
const LOGO_H = LOGO_W * LOGO_RATIO
const safeBlock = H * 0.06
const logoBox = { x: (W - LOGO_W) / 2, y: H - safeBlock - LOGO_H }

const logo = () => {
  const raw = fs.readFileSync('public/branding/logo-negative.svg', 'utf8').replace(/<\?xml[^>]*>/, '')

  return `<g transform="translate(${logoBox.x.toFixed(2)} ${logoBox.y.toFixed(2)})">${raw.replace('<svg ', `<svg width="${LOGO_W}" height="${LOGO_H.toFixed(2)}" `)}</g>`
}

// ── Equipo (fotos oficiales del squad, recorte circular) ─────────────────────────────────────────────
const SQUAD = 'src/lib/artifact-composer/catalogs/deck-axis/assets/squad'
const TEAM = {
  daniela: { name: 'Daniela', file: 'squad-daniela.png' },
  melkin: { name: 'Melkin', file: 'squad-melkin.png' },
  andres: { name: 'Andrés', file: 'squad-andres.png' }
}

for (const person of Object.values(TEAM)) {
  const size = 160
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`)
  const face = await sharp(path.join(SQUAD, person.file)).extract({ left: 70, top: 10, width: 280, height: 280 }).resize(size, size).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()

  person.uri = `data:image/png;base64,${face.toString('base64')}`
}

const avatarImage = (person, cx, cy, d, ring = C.stableLightField) =>
  `<circle cx="${cx}" cy="${cy}" r="${d / 2 + 3}" fill="${ring}"/><image href="${person.uri}" x="${cx - d / 2}" y="${cy - d / 2}" width="${d}" height="${d}"/>`

// ── Comentario de revisión ─────────────────────────────────────────────────────────────────────────
const CARD_W = 880
const CARD_GAP = 96

const commentCard = ({ body, rejected, person, when = 'ahora', resolved = null }) => {
  const x = (W - CARD_W) / 2
  const y = headline.bounds.bottom + CARD_GAP
  const pad = 34
  const avatar = resolved ? 84 : 104
  const overlap = avatar * 0.62
  const avatarsWidth = resolved ? avatar + (resolved.length - 1) * overlap : avatar
  const columnX = x + pad + avatarsWidth + 26
  const titleText = resolved ? 'Hilo resuelto' : person.name
  const name = shapeLine(titleText, { family: 'Poppins', weight: 600, size: 32, tracking: 0 })
  const whenLine = shapeLine(when, { family: 'Poppins', weight: 400, size: 26, tracking: 0 })
  const text = shapeLine(body, { family: 'Poppins', weight: 500, size: 38, tracking: '-0.005em' })
  const headerBaseline = y + pad + 34
  const bodyBaseline = headerBaseline + 60
  const contentHeight = Math.max(avatar, bodyBaseline + text.ink.bottom - (y + pad))
  const height = pad * 2 + contentHeight
  const ay = y + height / 2
  let svg = ''

  svg += `<rect x="${x + 2}" y="${y + 10}" width="${CARD_W}" height="${height.toFixed(2)}" rx="26" fill="#000814" opacity="0.35"/>`
  svg += `<rect x="${x}" y="${y}" width="${CARD_W}" height="${height.toFixed(2)}" rx="26" fill="${C.stableLightField}"/>`

  if (resolved) resolved.forEach((member, index) => { svg += avatarImage(member, x + pad + avatar / 2 + index * overlap, ay, avatar) })
  else svg += avatarImage(person, x + pad + avatar / 2, ay, avatar)

  svg += `<g fill="${C.inkOnLight}" transform="translate(${columnX.toFixed(2)} ${headerBaseline.toFixed(2)})">${name.paths}</g>`
  svg += `<g fill="${C.mutedOnLight}" transform="translate(${(columnX + name.advance + 14).toFixed(2)} ${headerBaseline.toFixed(2)})">${whenLine.paths}</g>`
  svg += `<g fill="${rejected ? C.mutedOnLight : C.inkOnLight}" transform="translate(${columnX.toFixed(2)} ${bodyBaseline.toFixed(2)})">${text.paths}</g>`

  if (rejected) {
    const midY = bodyBaseline + (text.ink.top + text.ink.bottom) / 2
    svg += `<line x1="${(columnX - 4).toFixed(2)}" y1="${midY.toFixed(2)}" x2="${(columnX + text.ink.right + 6).toFixed(2)}" y2="${midY.toFixed(2)}" stroke="${C.accentInkOnLight}" stroke-width="4.5" stroke-linecap="round"/>`
  }

  const chipLabel = rejected ? 'DESCARTADO' : resolved ? 'RESUELTO' : null
  let chipLeft = x + CARD_W - pad

  if (chipLabel) {
    const ink = rejected ? C.accentInkOnLight : C.inkOnLight
    const chip = shapeLine(chipLabel, { family: 'Poppins', weight: 600, size: 19, tracking: '0.08em' })
    const chipW = chip.advance + 34
    const chipH = 40
    const chipX = x + CARD_W - pad - chipW
    const chipY = headerBaseline - 13 - chipH / 2
    chipLeft = chipX
    svg += `<rect x="${chipX.toFixed(2)}" y="${chipY.toFixed(2)}" width="${chipW.toFixed(2)}" height="${chipH}" rx="20" fill="none" stroke="${ink}" stroke-width="2.5"/>`
    svg += `<g fill="${ink}" transform="translate(${(chipX + 17).toFixed(2)} ${(chipY + chipH / 2 - (chip.ink.top + chip.ink.bottom) / 2).toFixed(2)})">${chip.paths}</g>`
  }

  // Nada se recorta: si el texto no cabe en su columna, el render falla.
  if (columnX + text.ink.right > x + CARD_W - pad) throw new Error(`Comentario desborda la tarjeta: «${body}»`)
  if (columnX + name.advance + 14 + whenLine.advance > chipLeft - 12) throw new Error(`Encabezado choca con la etiqueta: «${titleText}»`)

  return { svg, bounds: { left: x, top: y, right: x + CARD_W, bottom: y + height } }
}

// ── Selección colaborativa AXIS ────────────────────────────────────────────────────────────────────
const labelFont = { family: 'Poppins', weight: 700, tracking: 0 }
const measureLabel = (label, size) => shapeLine(label, { ...labelFont, size }).advance

const selection = intent => {
  const manifest = resolveCollaborationSelectionIntent(intent)
  const rendered = renderCollaborationSelection({ manifest, targetBounds: headline.bounds, canvas: { width: W, height: H }, measureLabel })
  // librsvg no garantiza Poppins: cada <text> del renderer se reemplaza por paths de la fuente real, en la misma posición.
  const overlay = rendered.overlay.replace(/<text x="(-?[\d.]+)" y="(-?[\d.]+)" fill="([^"]+)" font-family="[^"]*" font-size="([\d.]+)" font-weight="700">([^<]*)<\/text>/g, (_, x, y, fill, size, label) => {
    const shaped = shapeLine(label.replaceAll('&amp;', '&'), { ...labelFont, size: Number(size) })

    return `<g fill="${fill}" transform="translate(${x} ${y})">${shaped.paths}</g>`
  })

  if (/<text/.test(overlay)) throw new Error('Quedó un <text> sin convertir a paths')

  if (!rendered.evidence.withinCanvas) throw new Error(`Selección fuera del lienzo: ${JSON.stringify(rendered.evidence.cursorEvidence)}`)

  return { svg: rendered.underlay + overlay, evidence: rendered.evidence }
}

const intent = (variant, cursors, overlay = 'subtle') => ({ targetId: 'viva-mexico-headline', targetKind: 'text', variant, padding: 'standard', overlay, cursors })

// ── Láminas ────────────────────────────────────────────────────────────────────────────────────────
const { daniela, melkin, andres } = TEAM

const SLIDES = [
  { id: '01', plate: 'a', layers: () => [headline.svg, commentCard({ person: daniela, body: '¿Lo hacemos más memorable?', rejected: false }), logo()] },
  {
    id: '02',
    plate: 'a',
    layers: () => [selection(intent('eight-handles', [{ id: 'local', kind: 'local', targetId: 'viva-mexico-headline', anchor: 'bottom-end', action: 'select' }])), headline.svg, commentCard({ person: daniela, body: '¿Lo hacemos más memorable?', rejected: true })]
  },
  {
    id: '03',
    plate: 'a',
    layers: () => [
      selection(intent('eight-handles', [{ id: 'melkin', kind: 'collaborator', targetId: 'viva-mexico-headline', anchor: 'top-end', action: 'resize', label: 'Melkin', participantKind: 'person' }])),
      headline.svg,
      commentCard({ person: melkin, body: '¿Le sumamos un claim?', rejected: true, when: 'hace 1 min' })
    ]
  },
  {
    id: '04',
    plate: 'a',
    layers: () => [
      selection(
        intent('eight-handles', [
          { id: 'local', kind: 'local', targetId: 'viva-mexico-headline', anchor: 'bottom-end', action: 'resize' },
          { id: 'andres', kind: 'collaborator', targetId: 'viva-mexico-headline', anchor: 'top-start', action: 'rotate', label: 'Andrés', participantKind: 'person' }
        ])
      ),
      headline.svg,
      commentCard({ person: andres, body: '¿Probamos una variante A/B?', rejected: true, when: 'hace 2 min' })
    ]
  },
  {
    id: '05',
    plate: 'a',
    layers: () => [
      selection(intent('four-corners', [{ id: 'daniela', kind: 'collaborator', state: 'moving', canvasRegion: 'upper-end', label: 'Daniela', participantKind: 'person' }], 'none')),
      headline.svg,
      commentCard({ resolved: [daniela, melkin, andres], body: '3 sugerencias, 0 cambios.', rejected: false })
    ]
  },
  { id: '06', plate: 'a', layers: () => [ideaA.svg] },
  { id: '06b', plate: 'a', variant: true, layers: () => [ideaB.svg] },
  { id: '06-v1', plate: 'a', variant: true, layers: () => [idea.svg] },
  { id: '07', plate: 'b', layers: () => [headline.svg, logo()] },
  { id: '07-v02', plate: 'b-v02', variant: true, layers: () => [headline.svg, logo()] },
  { id: '06-graded', plate: 'a-graded', variant: true, layers: () => [ideaA.svg] }
]

const plateCache = {}

/**
 * Lámina 7: el final de fuegos llena de chispas la zona del titular. Scrim radial gradual (sin bordes) centrado en la
 * tinta del titular, en el navy del cielo; se aplica al plate ANTES de medir contraste, así la medición es la final.
 */
const radialScrim = bounds => {
  const cx = (bounds.left + bounds.right) / 2
  const cy = (bounds.top + bounds.bottom) / 2
  const rx = (bounds.right - bounds.left) * 0.95
  const ry = (bounds.bottom - bounds.top) * 1.05

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><radialGradient id="s" cx="${cx}" cy="${cy}" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${cx} ${cy}) scale(${rx} ${ry}) translate(${-cx} ${-cy})"><stop offset="0" stop-color="#01142b" stop-opacity="0.82"/><stop offset="0.55" stop-color="#01142b" stop-opacity="0.55"/><stop offset="1" stop-color="#01142b" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/></svg>`)
}

/**
 * Plates: `a` = v02 (láminas 1–6) · `b` = v03 (final con profundidad) + scrim radial · `a-graded` = propuesta de
 * acabado «modo edición» (más frío y contenido) para que el final de la lámina 7 estalle por contraste de secuencia.
 */
const PLATE_FILES = { a: 'plate-a-v02.png', b: 'plate-b-v03.png', 'b-v02': 'plate-b-v02.png', 'a-graded': 'plate-a-v02.png' }

const plate = async key => {
  if (!plateCache[key]) {
    let image = sharp(path.join(DIR, 'plates', PLATE_FILES[key])).resize(W, H, { fit: 'cover' }).toColourspace('srgb')

    if (key === 'a-graded') image = image.modulate({ brightness: 0.86, saturation: 0.72 }).linear(1.04, -4)
    if (key === 'b' || key === 'b-v02') image = sharp(await image.png().toBuffer()).composite([{ input: radialScrim(headline.bounds) }])

    plateCache[key] = await image.png().toBuffer()
  }

  return plateCache[key]
}

// Contraste peor caso: luminancia del percentil 98 del fondo bajo la caja de tinta vs. tinta blanca.
const worstContrast = async (buffer, bounds) => {
  const left = Math.max(0, Math.floor(bounds.left))
  const top = Math.max(0, Math.floor(bounds.top))
  const width = Math.min(W - left, Math.ceil(bounds.right - bounds.left))
  const height = Math.min(H - top, Math.ceil(bounds.bottom - bounds.top))
  const { data, info } = await sharp(buffer).extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  const lum = []

  for (let i = 0; i < data.length; i += info.channels) lum.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]))
  lum.sort((a, b) => a - b)

  const p98 = lum[Math.floor(lum.length * 0.98)]

  return Number(((1.05) / (p98 + 0.05)).toFixed(2))
}

const report = { headline: { size: Number(headlineSpec.size.toFixed(2)), bounds: headline.bounds, recipe: 'ideaImpact' }, idea: { size: Number(ideaSpec.size.toFixed(2)), bounds: idea.bounds, recipe: 'ideaShort' }, logo: { ...logoBox, width: LOGO_W, height: LOGO_H }, slides: [] }

for (const slide of SLIDES) {
  const base = await plate(slide.plate)
  const layers = slide.layers()
  const evidence = layers.find(layer => layer?.evidence)?.evidence ?? null
  const cards = layers.filter(layer => layer?.bounds)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${layers.map(layer => (typeof layer === 'string' ? layer : layer.svg)).join('')}</svg>`

  fs.writeFileSync(path.join(OUT, `${slide.id}-overlay.svg`), svg)

  const out = path.join(OUT, `${slide.id}.png`)
  await sharp(base).composite([{ input: Buffer.from(svg) }]).png().toFile(out)

  const textBounds = slide.id === '06' || slide.id === '06-graded' ? ideaA.bounds : slide.id === '06b' ? ideaB.bounds : slide.id === '06-v1' ? idea.bounds : headline.bounds
  report.slides.push({
    id: slide.id,
    plate: slide.plate,
    contrastWorstCase: await worstContrast(base, textBounds),
    logoContrastWorstCase: ['01', '07', '07-v02'].includes(slide.id) ? await worstContrast(base, { left: logoBox.x, top: logoBox.y, right: logoBox.x + LOGO_W, bottom: logoBox.y + LOGO_H }) : null,
    cards: cards.map(card => card.bounds),
    selection: evidence ? { bounds: evidence.cursorEvidence?.length ? undefined : undefined, withinCanvas: evidence.withinCanvas, cursors: evidence.cursorEvidence } : null
  })
}

// Contact sheet para revisar la secuencia.
const thumbW = 360
const thumbH = 450
const gap = 16
const sheet = sharp({ create: { width: thumbW * 4 + gap * 5, height: thumbH * 2 + gap * 3, channels: 3, background: '#111111' } })
const tiles = await Promise.all(SLIDES.filter(slide => !slide.variant).map(async (slide, i) => ({ input: await sharp(path.join(OUT, `${slide.id}.png`)).resize(thumbW, thumbH).png().toBuffer(), left: gap + (i % 4) * (thumbW + gap), top: gap + Math.floor(i / 4) * (thumbH + gap) })))
await sheet.composite(tiles).jpeg({ quality: 90 }).toFile(path.join(DIR, 'contact-sheet.jpg'))

report.ideaVariants = { A: { metrics: ideaA.metrics, inkGaps: ideaA.gaps, bounds: ideaA.bounds }, B: { metrics: ideaB.metrics, inkGaps: ideaB.gaps, bounds: ideaB.bounds } }
fs.writeFileSync(path.join(DIR, 'qa-composition.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report.slides.map(s => ({ id: s.id, contrast: s.contrastWorstCase, logo: s.logoContrastWorstCase, withinCanvas: s.selection?.withinCanvas })), null, 1))
