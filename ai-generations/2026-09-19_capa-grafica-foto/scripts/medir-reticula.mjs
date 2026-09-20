// Instrumento de medición: extrae la retícula REAL del carrusel aprobado «Nivel de búsqueda» (v2).
// No compone nada. Replica el apilado determinista de componer-v2.mjs con las mismas recetas AXIS
// y los mismos inputs (brief/slides-v2.json) para reportar, en px y en fracción de lienzo, dónde
// cae la tinta de cada voz. Salida: out/reticula-aprobada.json + tabla por consola.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { axisAdvertising } from '@efeoncepro/axis-tokens'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..')
const SRC = path.join(REPO, 'ai-generations/2026-09-19_nivel-de-busqueda')
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../out')

const R = axisAdvertising.recipes
const W = 1152
const H = 1440
const M = Math.round(W * 0.07)
const DOMINANT_WIDTH = 78

const bric = fontkit.openSync(path.join(REPO, 'src/assets/fonts/BricolageGrotesque-Variable.ttf'))
const pop = {
  400: fontkit.openSync(path.join(REPO, 'src/assets/fonts/Poppins-Regular.ttf')),
  700: fontkit.openSync(path.join(REPO, 'src/assets/fonts/Poppins-Bold.ttf'))
}
const fontFor = (recipe, width = recipe.width) =>
  bric.getVariation({ wght: recipe.weight, wdth: width, opsz: recipe.opticalSize })
const em = v => Number.parseFloat(v)

const shape = (text, font, size, trackingEm = 0) => {
  const run = font.layout(text)
  const scale = size / font.unitsPerEm
  let x = 0
  const ink = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }

  run.glyphs.forEach((g, i) => {
    const p = run.positions[i]
    const gx = x + p.xOffset * scale
    const gy = -p.yOffset * scale

    if (g.bbox && g.bbox.maxX > g.bbox.minX) {
      ink.left = Math.min(ink.left, gx + g.bbox.minX * scale)
      ink.right = Math.max(ink.right, gx + g.bbox.maxX * scale)
      ink.top = Math.min(ink.top, gy - g.bbox.maxY * scale)
      ink.bottom = Math.max(ink.bottom, gy - g.bbox.minY * scale)
    }
    x += p.xAdvance * scale + (i === run.glyphs.length - 1 ? 0 : trackingEm * size)
  })

  return { ink, advance: x }
}

const wrap = (text, font, size, maxWidth, trackingEm) => {
  const lines = []

  for (const chunk of text.split('|')) {
    let line = ''

    for (const word of chunk.trim().split(/\s+/)) {
      const probe = line ? `${line} ${word}` : word

      if (line && shape(probe, font, size, trackingEm).advance > maxWidth) {
        lines.push(line)
        line = word
      } else line = probe
    }
    if (line) lines.push(line)
  }

  return lines
}

const block = ({ text, font, size, tracking = 0, leading, x, topY, maxWidth = W, align = 'left' }) => {
  const lines = wrap(text, font, size, maxWidth, tracking)
  const shaped = lines.map(l => shape(l, font, size, tracking))
  const firstTop = shaped[0].ink.top
  const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }

  shaped.forEach((s, i) => {
    const baseline = topY - firstTop + i * size * leading
    const lx = align === 'center' ? x - (s.ink.left + s.ink.right) / 2 : x - s.ink.left

    box.left = Math.min(box.left, lx + s.ink.left)
    box.right = Math.max(box.right, lx + s.ink.right)
    box.top = Math.min(box.top, baseline + s.ink.top)
    box.bottom = Math.max(box.bottom, baseline + s.ink.bottom)
  })

  return { box, lines }
}

const plain = t => t.replace(/\*\*|\[\[|\]\]/g, '')
const f3 = n => Math.round(n * 1000) / 1000
const frac = (v, total) => f3(v / total)

const SLIDES = JSON.parse(fs.readFileSync(`${SRC}/brief/slides-v2.json`, 'utf8'))
const rows = []

for (const s of SLIDES) {
  const x = s.align === 'center' ? W / 2 : M
  let y = s.top * H
  const voices = []
  const record = (id, size, b) => {
    voices.push({ id, size, top: f3(b.top), bottom: f3(b.bottom), left: f3(b.left), right: f3(b.right), lines: b.lines?.length })
    return b
  }

  if (s.label) {
    const lsize = 26
    const probe = shape(s.label, pop[700], lsize, em(R.structureLabel.tracking))
    const starR = lsize * 0.46
    const gapS = lsize * 0.55
    const totalW = starR * 2 + gapS + (probe.ink.right - probe.ink.left)
    const lx0 = s.align === 'center' ? x - totalW / 2 : x
    const lab = block({ text: s.label, font: pop[700], size: lsize, tracking: em(R.structureLabel.tracking), leading: 1.2, x: lx0 + starR * 2 + gapS, topY: y })

    record('etiqueta', lsize, lab.box)
    voices.at(-1).gapAntes = null
    y = lab.box.bottom + 26
  }

  if (s.lead) {
    const lr = R.ideaLead
    const size = s.leadSize ?? 70
    const le = block({ text: plain(s.lead), font: fontFor(lr), size, tracking: em(lr.tracking), leading: lr.lineHeight, x, topY: y, maxWidth: W * (s.textWidth ?? 0.8), align: s.align })

    record('entrada', size, { ...le.box, lines: le.lines })
    voices.at(-1).gapAntes = f3(le.box.top - (voices.at(-2)?.bottom ?? le.box.top))
    y = le.box.bottom + (s.leadGap ?? 30)
  }

  const ir = R.ideaImpact
  const domFont = fontFor(ir, DOMINANT_WIDTH)
  let domSize = s.dominantSize
  const widest = Math.max(...plain(s.dominant).split('|').map(t => {
    const k = shape(t.trim(), domFont, domSize, em(ir.tracking))

    return k.ink.right - k.ink.left
  }))

  if (s.dominantMax && widest > s.dominantMax * W) domSize = (domSize * (s.dominantMax * W)) / widest
  const dom = block({ text: plain(s.dominant), font: domFont, size: domSize, tracking: em(ir.tracking), leading: ir.lineHeight, x, topY: y, maxWidth: W * 0.9, align: s.align })

  record('dominante', Math.round(domSize * 10) / 10, { ...dom.box, lines: dom.lines })
  voices.at(-1).gapAntes = voices.length > 1 ? f3(dom.box.top - voices.at(-2).bottom) : null
  y = dom.box.bottom

  if (s.tail) {
    const tr = R.ideaMedium
    const size = s.tailSize ?? 76
    const t = block({ text: plain(s.tail), font: fontFor(tr), size, tracking: em(tr.tracking), leading: tr.lineHeight, x, topY: y + (s.tailGap ?? 26), maxWidth: W * (s.textWidth ?? 0.8), align: s.align })

    record('cierre', size, { ...t.box, lines: t.lines })
    voices.at(-1).gapAntes = f3(t.box.top - dom.box.bottom)
    y = t.box.bottom
  }

  const first = voices[0]
  const last = voices.at(-1)
  const widestInk = Math.max(...voices.map(v => v.right)) - Math.min(...voices.map(v => v.left))

  rows.push({
    id: s.id,
    align: s.align ?? 'left',
    voces: voices.length,
    marginIzq: frac(M, W),
    inicioTinta: frac(first.top, H),
    finTinta: frac(last.bottom, H),
    altoZona: frac(last.bottom - first.top, H),
    anchoTinta: frac(widestInk, W),
    domSizePorAlto: frac(voices.find(v => v.id === 'dominante').size, H),
    domVsEntrada: voices.find(v => v.id === 'entrada')
      ? f3(voices.find(v => v.id === 'dominante').size / voices.find(v => v.id === 'entrada').size)
      : null,
    domVsEtiqueta: voices.find(v => v.id === 'etiqueta')
      ? f3(voices.find(v => v.id === 'dominante').size / voices.find(v => v.id === 'etiqueta').size)
      : null,
    voices
  })
}

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(`${OUT}/reticula-aprobada.json`, `${JSON.stringify({ canvas: { W, H, M }, slides: rows }, null, 2)}\n`)

const pad = (v, n) => String(v).padEnd(n)
console.log(`Lienzo ${W}×${H} (export ${1080}×${1350}) · margen ${M}px = ${frac(M, W)} del ancho\n`)
console.log(`${pad('lámina', 24)}${pad('voces', 6)}${pad('inicio', 8)}${pad('fin', 8)}${pad('altoZona', 10)}${pad('anchoTinta', 12)}${pad('dom/H', 8)}${pad('dom:ent', 9)}dom:etq`)
for (const r of rows) {
  console.log(
    pad(r.id, 24) + pad(r.voces, 6) + pad(r.inicioTinta, 8) + pad(r.finTinta, 8) + pad(r.altoZona, 10) +
    pad(r.anchoTinta, 12) + pad(r.domSizePorAlto, 8) + pad(r.domVsEntrada ?? '—', 9) + (r.domVsEtiqueta ?? '—')
  )
}
console.log('\nGaps de tinta entre voces (px) y como fracción del tamaño de la voz que sigue:')
for (const r of rows) {
  const g = r.voices.filter(v => v.gapAntes != null).map(v => `${v.id} ${v.gapAntes}px (${f3(v.gapAntes / v.size)}×)`)

  console.log(`  ${pad(r.id, 24)} ${g.join(' · ')}`)
}
