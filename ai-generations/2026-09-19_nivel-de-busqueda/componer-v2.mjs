// «Nivel de búsqueda» v2 — trendjacking GTA VI para Efeonce.
//
// Lenguaje visual (brief/gta6-visual-study.md): key art de realismo ilustrado pintado, Florida hiperreal de 2026,
// HUD mínimo (estrellas arriba a la derecha, tarjetas de notificación sobre la acción). Nada del juego se copia:
// estrellas, íconos, tarjetas y tipografía son nuestros; los plates no contienen personajes ni marcas del juego.
//
// Jerarquía en cuatro niveles por lámina (nunca plana):
//   1. etiqueta de misión (Poppins 700, tracking de label, acento)
//   2. entrada (Bricolage ideaShort)
//   3. palabra dominante (Bricolage ideaImpact condensado, 2,5–3× la entrada) + selección colaborativa AXIS
//   4. tarjeta de notificación (Poppins) sobre la escena
//   + gesto Guttery (máx. 1 por pieza, ≤3 palabras) donde aporta voz.
//
// Uso: node ai-generations/2026-09-19_nivel-de-busqueda/componer-v2.mjs [id…]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'
import { axisAdvertising } from '@efeoncepro/axis-tokens'
import { resolveCollaborationSelectionIntent } from '@efeoncepro/axis-ui-contracts'

import { renderCollaborationSelection } from '../../scripts/creative/layout-compiler/axis-advertising.mjs'
import { compositeLuminosity } from '../../scripts/creative/layout-compiler/compiler.mjs'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const DIR = path.dirname(new URL(import.meta.url).pathname)
const R = axisAdvertising.recipes
const C = axisAdvertising.color

const W = 1152
const H = 1440
const M = Math.round(W * 0.07)
const FINAL = { width: 1080, height: 1350 }
const ACCENT = C.accentSurface // #ff6500, naranja Efeonce = el atardecer de la ciudad

const bric = fontkit.openSync('src/assets/fonts/BricolageGrotesque-Variable.ttf')
const pop = {
  400: fontkit.openSync('src/assets/fonts/Poppins-Regular.ttf'),
  500: fontkit.openSync('src/assets/fonts/Poppins-Medium.ttf'),
  600: fontkit.openSync('src/assets/fonts/Poppins-SemiBold.ttf'),
  700: fontkit.openSync('src/assets/fonts/Poppins-Bold.ttf')
}
const GUTTERY = path.join(os.homedir(), 'Library/Fonts/Guttery.otf')
const gutt = fs.existsSync(GUTTERY) ? fontkit.openSync(GUTTERY) : null

// Dominante: receta ideaImpact (peso, opsz, tracking, leading). Decisión declarada: ancho 78 dentro del eje
// autorizado de la familia (75–100) para el registro condensado del cartel de acción; no se deforma el glifo.
const DOMINANT_WIDTH = 78
const fontFor = (recipe, width = recipe.width) => bric.getVariation({ wght: recipe.weight, wdth: width, opsz: recipe.opticalSize })
const em = v => Number.parseFloat(v)

const shape = (text, font, size, trackingEm = 0) => {
  const run = font.layout(text)
  const scale = size / font.unitsPerEm
  let x = 0
  let paths = ''
  const ink = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }

  run.glyphs.forEach((g, i) => {
    const p = run.positions[i]
    const gx = x + p.xOffset * scale
    const gy = -p.yOffset * scale
    const d = g.path.toSVG()

    if (d) paths += `<path d="${d}" transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${scale} ${-scale})"/>`
    if (g.bbox && g.bbox.maxX > g.bbox.minX) {
      ink.left = Math.min(ink.left, gx + g.bbox.minX * scale)
      ink.right = Math.max(ink.right, gx + g.bbox.maxX * scale)
      ink.top = Math.min(ink.top, gy - g.bbox.maxY * scale)
      ink.bottom = Math.max(ink.bottom, gy - g.bbox.minY * scale)
    }
    x += p.xAdvance * scale + (i === run.glyphs.length - 1 ? 0 : trackingEm * size)
  })

  return { paths, ink, advance: x }
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

// Bloque multilínea anclado por la PARTE SUPERIOR de la tinta (topY) para apilar niveles con aire exacto.
const block = ({ text, font, size, tracking = 0, leading, x, topY, maxWidth = W, fill, align = 'left' }) => {
  const lines = wrap(text, font, size, maxWidth, tracking)
  const shaped = lines.map(l => shape(l, font, size, tracking))
  const firstTop = shaped[0].ink.top
  const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  let svg = ''

  shaped.forEach((s, i) => {
    const baseline = topY - firstTop + i * size * leading
    const lx = align === 'center' ? x - (s.ink.left + s.ink.right) / 2 : align === 'right' ? x - s.ink.right : x - s.ink.left

    svg += `<g fill="${fill}" transform="translate(${lx.toFixed(2)} ${baseline.toFixed(2)})">${s.paths}</g>`
    box.left = Math.min(box.left, lx + s.ink.left)
    box.right = Math.max(box.right, lx + s.ink.right)
    box.top = Math.min(box.top, baseline + s.ink.top)
    box.bottom = Math.max(box.bottom, baseline + s.ink.bottom)
  })

  return { svg, box, lines }
}


// ── Texto enriquecido: **negrita** (peso superior de la misma familia) y [[acento]] (naranja Efeonce) ──
// La jerarquía también vive DENTRO de la línea: un bloque nunca es un solo peso plano si tiene una palabra clave.
const parseRich = text =>
  text.split('|').map(chunk => {
    const words = []
    let bold = false
    let accent = false
    let cur = ''
    const flush = () => {
      if (cur) words.push({ text: cur, bold, accent })
      cur = ''
    }

    for (let i = 0; i < chunk.length; i++) {
      if (chunk.startsWith('**', i)) { flush(); bold = !bold; i++; continue }
      if (chunk.startsWith('[[', i)) { flush(); accent = true; i++; continue }
      if (chunk.startsWith(']]', i)) { flush(); accent = false; i++; continue }
      if (chunk[i] === ' ') { flush(); words.push({ space: true }); continue }
      cur += chunk[i]
    }
    flush()

    // fusiona fragmentos contiguos (sin espacio) en una palabra con estilos por segmento
    const out = []
    let w = []

    for (const t of words) {
      if (t.space) { if (w.length) out.push(w); w = []; continue }
      w.push(t)
    }
    if (w.length) out.push(w)

    return out
  })

const richBlock = ({ text, fonts, size, tracking = 0, leading, x, topY, maxWidth = W, fill, accentFill = ACCENT, align = 'left' }) => {
  const segW = seg => shape(seg.text, seg.bold ? fonts.bold : fonts.base, size, tracking)
  const wordWidth = word => word.reduce((a, seg) => a + segW(seg).advance, 0)
  const space = shape('a a', fonts.base, size).advance - shape('aa', fonts.base, size).advance
  const lines = []

  for (const chunk of parseRich(text)) {
    let line = []
    let width = 0

    for (const word of chunk) {
      const ww = wordWidth(word)

      if (line.length && width + space + ww > maxWidth) { lines.push(line); line = []; width = 0 }
      width += (line.length ? space : 0) + ww
      line.push(word)
    }
    if (line.length) lines.push(line)
  }

  let svg = ''
  const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  const accentBoxes = []
  let firstTop = null

  // medir tinta de la primera línea para anclar por arriba
  const lineInk = line => {
    let cx = 0
    const ink = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
    const parts = []

    line.forEach((word, wi) => {
      if (wi) cx += space
      for (const seg of word) {
        const sh = segW(seg)

        parts.push({ seg, sh, dx: cx })
        if (sh.ink.left !== Infinity) {
          ink.left = Math.min(ink.left, cx + sh.ink.left)
          ink.right = Math.max(ink.right, cx + sh.ink.right)
          ink.top = Math.min(ink.top, sh.ink.top)
          ink.bottom = Math.max(ink.bottom, sh.ink.bottom)
        }
        cx += sh.advance
      }
    })

    return { ink, parts }
  }

  lines.forEach((line, i) => {
    const { ink, parts } = lineInk(line)

    if (firstTop === null) firstTop = ink.top
    const baseline = topY - firstTop + i * size * leading
    const lx = align === 'center' ? x - (ink.left + ink.right) / 2 : align === 'right' ? x - ink.right : x - ink.left

    for (const { seg, sh, dx } of parts) {
      const color = seg.accent ? accentFill : fill

      svg += `<g fill="${color}" transform="translate(${(lx + dx).toFixed(2)} ${baseline.toFixed(2)})">${sh.paths}</g>`
      if (seg.accent && sh.ink.left !== Infinity) accentBoxes.push({ left: lx + dx + sh.ink.left, right: lx + dx + sh.ink.right, top: baseline + sh.ink.top, bottom: baseline + sh.ink.bottom })
    }
    box.left = Math.min(box.left, lx + ink.left)
    box.right = Math.max(box.right, lx + ink.right)
    box.top = Math.min(box.top, baseline + ink.top)
    box.bottom = Math.max(box.bottom, baseline + ink.bottom)
  })

  return { svg, box, accentBoxes, lines: lines.map(l => l.map(w => w.map(s => s.text).join('')).join(' ')) }
}

const BRIC = (recipe, width = recipe.width, boldWeight = 800) => ({
  base: bric.getVariation({ wght: recipe.weight, wdth: width, opsz: recipe.opticalSize }),
  bold: bric.getVariation({ wght: boldWeight, wdth: width, opsz: recipe.opticalSize })
})
const POP = { base: pop[400], bold: pop[700] }

// ── HUD propio ───────────────────────────────────────────────────────────────────────────────────
const starPath = (cx, cy, r) => {
  const pts = []

  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 === 0 ? r : r * 0.46

    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`)
  }

  return `M${pts.join('L')}Z`
}

// Íconos de "quién te persigue": aquí no son patrullas, son motores de respuesta (genéricos, sin marcas).
const unitIcons = (x, cy, s) => {
  const bubble = `<path d="M${x},${cy - s * 0.42} h${s * 0.9} a${s * 0.12},${s * 0.12} 0 0 1 ${s * 0.12},${s * 0.12} v${s * 0.52} a${s * 0.12},${s * 0.12} 0 0 1 -${s * 0.12},${s * 0.12} h-${s * 0.5} l-${s * 0.22},${s * 0.2} v-${s * 0.2} h-${s * 0.18} a${s * 0.12},${s * 0.12} 0 0 1 -${s * 0.12},-${s * 0.12} v-${s * 0.52} a${s * 0.12},${s * 0.12} 0 0 1 ${s * 0.12},-${s * 0.12}z" fill="none" stroke="#fff" stroke-width="${s * 0.09}" stroke-linejoin="round"/>`
  const sx = x + s * 1.55
  const spark = `<path d="M${sx},${cy - s * 0.5} C${sx + s * 0.06},${cy - s * 0.1} ${sx + s * 0.1},${cy - s * 0.06} ${sx + s * 0.5},${cy} C${sx + s * 0.1},${cy + s * 0.06} ${sx + s * 0.06},${cy + s * 0.1} ${sx},${cy + s * 0.5} C${sx - s * 0.06},${cy + s * 0.1} ${sx - s * 0.1},${cy + s * 0.06} ${sx - s * 0.5},${cy} C${sx - s * 0.1},${cy - s * 0.06} ${sx - s * 0.06},${cy - s * 0.1} ${sx},${cy - s * 0.5}z" fill="#fff"/>`
  const mx = x + s * 2.55
  const lens = `<circle cx="${mx}" cy="${cy - s * 0.08}" r="${s * 0.3}" fill="none" stroke="#fff" stroke-width="${s * 0.09}"/><path d="M${mx + s * 0.22},${cy + s * 0.14} l${s * 0.26},${s * 0.26}" stroke="#fff" stroke-width="${s * 0.11}" stroke-linecap="round"/>`

  return { svg: bubble + spark + lens, width: s * 2.9 }
}

let glowId = 0
const hud = ({ lit, current = null, r = 34, gap = 12, right = W - M, top = M }) => {
  const step = r * 2 + gap
  const total = step * 5 - gap
  const cy = top + 44 + r
  const start = right - total + r
  let glow = ''
  let stars = ''

  for (let i = 0; i < 5; i++) {
    const cx = start + i * step
    const d = starPath(cx, cy, r)
    const isCurrent = current === i + 1

    if (i < lit) {
      const fill = isCurrent ? ACCENT : '#ffffff'

      glow += `<path d="${d}" fill="${fill}"/>`
      stars += `<path d="${d}" fill="${fill}" stroke="${isCurrent ? '#ffd9bf' : '#ffffff'}" stroke-width="${(r * 0.06).toFixed(1)}" stroke-linejoin="round"/>`
      if (isCurrent) stars += `<circle cx="${cx}" cy="${cy}" r="${r * 1.45}" fill="none" stroke="${ACCENT}" stroke-width="${(r * 0.08).toFixed(1)}" stroke-opacity="0.55"/>`
    } else {
      stars += `<path d="${d}" fill="rgba(0,10,30,0.55)" stroke="#ffffff" stroke-width="${(r * 0.09).toFixed(1)}" stroke-linejoin="round"/>`
    }
  }

  const icons = unitIcons(start - r - 26 - r * 2.9 * 0.9, cy, r * 0.9)
  const labelSize = 22
  const label = shape('NIVEL DE BÚSQUEDA', pop[700], labelSize, em(R.structureLabel.tracking))
  const lx = right - label.ink.right
  const ly = top - label.ink.top
  const id = `g${glowId++}`

  return {
    defs: `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${(r * 0.4).toFixed(1)}"/></filter>`,
    svg: `<g filter="url(#${id})" opacity="0.9">${glow}</g>${stars}<g opacity="${lit ? 1 : 0.85}">${icons.svg}</g><g fill="#ffffff" transform="translate(${lx.toFixed(1)} ${ly.toFixed(1)})">${label.paths}</g>`,
    box: { left: start - r - 26 - r * 2.9, right, top: top + label.ink.top - ly + ly, bottom: cy + r }
  }
}

// ── Tarjeta de notificación (lenguaje de HUD: overlay sobre la acción, vidrio esmerilado real) ─────
const card = ({ header, body, x, bottom, width }) => {
  const pad = 34
  const headSize = 23
  const bodySize = 36
  const head = shape(header.toUpperCase(), pop[700], headSize, em(R.structureLabel.tracking))
  const bodyB = richBlock({ text: body, fonts: POP, size: bodySize, tracking: em(R.structureLead.tracking), leading: 1.32, x: x + pad, topY: 0, maxWidth: width - pad * 2, fill: C.softOnDark })
  const headH = head.ink.bottom - head.ink.top
  const bodyH = bodyB.box.bottom - bodyB.box.top
  const h = pad + headH + 22 + bodyH + pad
  const top = bottom - h
  const dot = 11
  const headY = top + pad - head.ink.top
  const bodyTop = top + pad + headH + 22
  const bodyFinal = richBlock({ text: body, fonts: POP, size: bodySize, tracking: em(R.structureLead.tracking), leading: 1.32, x: x + pad, topY: bodyTop, maxWidth: width - pad * 2, fill: C.softOnDark, accentFill: '#ffffff' })

  return {
    rect: { left: x, top, width, height: h, radius: 26 },
    svg: `<rect x="${x}" y="${top}" width="${width}" height="${h}" rx="26" fill="#070a24" fill-opacity="0.62" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.5"/>
      <rect x="${x}" y="${top}" width="7" height="${h}" rx="3.5" fill="${ACCENT}"/>
      <circle cx="${x + pad + dot}" cy="${headY + head.ink.top + headH / 2}" r="${dot}" fill="${ACCENT}"/>
      <g fill="${C.softOnDark}" transform="translate(${x + pad + dot * 2 + 14 - head.ink.left} ${headY})">${head.paths}</g>
      ${bodyFinal.svg}`,
    textBoxes: [bodyFinal.box],
    box: { left: x, right: x + width, top, bottom }
  }
}

// ── Contraste real ───────────────────────────────────────────────────────────────────────────────
const lum = (r, g, b) => {
  const f = c => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const contrastUnder = async (buf, box, inkL = 1) => {
  const left = Math.max(0, Math.floor(box.left))
  const top = Math.max(0, Math.floor(box.top))
  const width = Math.max(1, Math.min(W - left, Math.ceil(box.right - box.left)))
  const height = Math.max(1, Math.min(H - top, Math.ceil(box.bottom - box.top)))
  const { data } = await sharp(buf).extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const ls = []

  for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]))
  ls.sort((a, b) => a - b)
  const bg = ls[Math.floor(ls.length * 0.98)]

  return Math.round(((Math.max(inkL, bg) + 0.05) / (Math.min(inkL, bg) + 0.05)) * 100) / 100
}

const measureLabel = (label, size) => shape(label, pop[700], size).advance
const labelToPaths = svg =>
  svg.replace(
    /<text x="(-?[\d.]+)" y="(-?[\d.]+)" fill="([^"]+)" font-family="[^"]*" font-size="([\d.]+)" font-weight="700">([^<]*)<\/text>/g,
    (_, x, y, fill, size, label) => `<g fill="${fill}" transform="translate(${x} ${y})">${shape(label.replaceAll('&amp;', '&'), pop[700], Number(size)).paths}</g>`
  )

// ── Piezas ───────────────────────────────────────────────────────────────────────────────────────
const SLIDES = JSON.parse(fs.readFileSync(`${DIR}/brief/slides-v2.json`, 'utf8'))
const only = process.argv.slice(2)
const qa = []

fs.mkdirSync(`${DIR}/out-v2/preview-390`, { recursive: true })

for (const s of SLIDES.filter(x => !only.length || only.includes(x.id))) {
  const plate = `${DIR}/plates-v2/${s.plate}`
  let defs = ''
  let under = ''
  let body = ''
  const checks = []
  const layers = []

  // Oscurecimiento sólo donde el plate lo pide (gradual, desde arriba), declarado por lámina.
  if (s.scrimTop) {
    defs += `<linearGradient id="st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050818" stop-opacity="${s.scrimTop.opacity}"/><stop offset="1" stop-color="#050818" stop-opacity="0"/></linearGradient>`
    under += `<rect x="0" y="0" width="${W}" height="${s.scrimTop.to * H}" fill="url(#st)"/>`
  }

  if (s.scrimBottom) {
    const y0 = s.scrimBottom.from * H

    defs += `<linearGradient id="sb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050818" stop-opacity="0"/><stop offset="1" stop-color="#050818" stop-opacity="${s.scrimBottom.opacity}"/></linearGradient>`
    under += `<rect x="0" y="${y0}" width="${W}" height="${H - y0}" fill="url(#sb)"/>`
  }

  const hudEl = hud({ lit: s.hud.lit, current: s.hud.current ?? null })

  defs += hudEl.defs
  body += hudEl.svg

  const x = s.align === 'center' ? W / 2 : M
  let y = s.top * H

  // 1 · etiqueta
  if (s.label) {
    // Etiqueta blanca con marcador-estrella naranja: el acento vive en el glifo, la lectura en el blanco.
    const lsize = 26
    const probe = shape(s.label, pop[700], lsize, em(R.structureLabel.tracking))
    const starR = lsize * 0.46
    const gapS = lsize * 0.55
    const totalW = starR * 2 + gapS + (probe.ink.right - probe.ink.left)
    const lx0 = s.align === 'center' ? x - totalW / 2 : x
    const lab = block({ text: s.label, font: pop[700], size: lsize, tracking: em(R.structureLabel.tracking), leading: 1.2, x: lx0 + starR * 2 + gapS, topY: y, fill: '#ffffff', align: 'left' })
    const scy = (lab.box.top + lab.box.bottom) / 2

    body += `<path d="${starPath(lx0 + starR, scy, starR)}" fill="${ACCENT}"/>` + lab.svg
    checks.push({ id: 'etiqueta', box: lab.box })
    y = lab.box.bottom + 26
  }

  // 2 · entrada
  if (s.lead) {
    const lr = R.ideaLead
    const le = richBlock({ text: s.lead, fonts: BRIC(lr, lr.width, 760), size: s.leadSize ?? 70, tracking: em(lr.tracking), leading: lr.lineHeight, x, topY: y, maxWidth: W * (s.textWidth ?? 0.8), fill: C.softOnDark, accentFill: '#ffffff', align: s.align })

    body += le.svg
    checks.push({ id: 'entrada', box: le.box })
    y = le.box.bottom + (s.leadGap ?? 30)
  }

  // 3 · dominante (+ selección colaborativa)
  const ir = R.ideaImpact
  const domFont = fontFor(ir, DOMINANT_WIDTH)
  // Ajuste al ancho máximo declarado (deja aire para etiquetas de colaboradores fuera de la caja).
  let domSize = s.dominantSize
  const widest = Math.max(...s.dominant.replace(/\*\*|\[\[|\]\]/g, '').split('|').map(t => { const k = shape(t.trim(), domFont, domSize, em(ir.tracking)); return k.ink.right - k.ink.left }))
  if (s.dominantMax && widest > s.dominantMax * W) domSize = domSize * (s.dominantMax * W) / widest
  const dom = richBlock({ text: s.dominant, fonts: { base: domFont, bold: domFont }, size: domSize, tracking: em(ir.tracking), leading: ir.lineHeight, x, topY: y, maxWidth: W * 0.9, fill: '#ffffff', align: s.align })

  checks.push({ id: 'dominante', box: dom.box })
  dom.accentBoxes.forEach((b, i) => checks.push({ id: `dominante-acento-${i}`, box: b, inkL: lum(255, 101, 0) }))

  let selection = ''
  let selEvidence = null

  if (s.selection) {
    const manifest = resolveCollaborationSelectionIntent({
      targetId: 'dominante',
      targetKind: 'text',
      variant: 'eight-handles',
      padding: 'standard',
      overlay: 'subtle',
      cursors: s.selection.cursors.map(c =>
        c.state === 'moving'
          ? { id: c.id, kind: 'collaborator', state: 'moving', canvasRegion: c.region, action: 'move', label: c.label, participantKind: c.who ?? 'role' }
          : c.kind === 'local'
            ? { id: c.id, kind: 'local', targetId: 'dominante', anchor: c.anchor, action: c.action ?? 'select' }
            : { id: c.id, kind: 'collaborator', targetId: 'dominante', anchor: c.anchor, action: c.action ?? 'select', label: c.label, participantKind: c.who ?? 'role' }
      )
    })
    const colors = Object.fromEntries(s.selection.cursors.filter(c => c.color).map(c => [c.id, c.color]))
    const rendered = renderCollaborationSelection({
      manifest,
      targetBounds: dom.box,
      canvas: { width: W, height: H },
      measureLabel,
      presentation: { collaboratorScale: 1.8, localCursorScale: 1.2, participantColors: colors }
    })

    if (!rendered.evidence.withinCanvas) throw new Error(`${s.id}: selección fuera del lienzo ${JSON.stringify({ target: rendered.evidence.target, bounds: rendered.bounds, labels: rendered.evidence.cursorEvidence.map(c => [c.id, c.labelBounds]) })}`)
    under += rendered.underlay
    selection = labelToPaths(rendered.overlay)
    if (/<text/.test(selection)) throw new Error(`${s.id}: quedó <text>`)
    selEvidence = { selection: rendered.evidence.selection, cursores: rendered.evidence.cursorEvidence.map(c => ({ id: c.id, labelBounds: c.labelBounds })) }
  }

  body += dom.svg
  y = dom.box.bottom

  // display posterior (cierre de la frase) si existe
  if (s.after) {
    const ar = R.ideaMedium
    const af = richBlock({ text: s.after, fonts: BRIC(ar, ar.width, 800), size: s.afterSize ?? 74, tracking: em(ar.tracking), leading: ar.lineHeight, x, topY: y + (s.afterGap ?? 34), maxWidth: W * (s.textWidth ?? 0.8), fill: s.afterFill ?? '#ffffff', align: s.align })
    af.accentBoxes.forEach((b, i) => checks.push({ id: `cierre-acento-${i}`, box: b, inkL: lum(255, 101, 0) }))

    body += af.svg
    checks.push({ id: 'cierre-frase', box: af.box })
    y = af.box.bottom
  }

  // gesto Guttery (máx. 1)
  if (s.gesture && gutt) {
    const g = shape(s.gesture.text, gutt, s.gesture.size, 0)
    const gx = s.gesture.x * W
    const gy = s.gesture.y * H

    body += `<g fill="${s.gesture.color ?? ACCENT}" transform="translate(${gx} ${gy}) rotate(${s.gesture.rotate ?? -6})">${g.paths}</g>`
    const gc = (s.gesture.color ?? ACCENT).replace('#', '')
    checks.push({ id: 'gesto', box: { left: gx + g.ink.left, right: gx + g.ink.right, top: gy + g.ink.top, bottom: gy + g.ink.bottom }, inkL: lum(parseInt(gc.slice(0, 2), 16), parseInt(gc.slice(2, 4), 16), parseInt(gc.slice(4, 6), 16)) })
  }

  // cierre inferior (sobre el piso oscuro de la escena)
  if (s.footer) {
    const fr = R.ideaLead
    const ft = richBlock({ text: s.footer.text, fonts: BRIC(fr, fr.width, 780), size: s.footer.size, tracking: em(fr.tracking), leading: fr.lineHeight, x: W / 2, topY: s.footer.y * H, maxWidth: W * 0.84, fill: C.softOnDark, accentFill: '#ffffff', align: 'center' })
    ft.accentBoxes.forEach((b, i) => checks.push({ id: `cierre-inferior-acento-${i}`, box: b }))

    body += ft.svg
    checks.push({ id: 'cierre-inferior', box: ft.box })
  }

  // 4 · tarjeta
  let cardEl = null

  if (s.card) {
    const cw = W * (s.card.width ?? 0.74)
    const cx = s.card.align === 'right' ? W - M - cw : s.align === 'center' ? (W - cw) / 2 : M

    cardEl = card({ header: s.card.header, body: s.card.body, x: cx, bottom: s.card.bottom * H, width: cw })
  }

  // Composición: plate → (tarjeta: vidrio esmerilado real del propio plate) → underlay → texto → selección → logo
  const base = sharp(plate)
  const baseBuf = await base.png().toBuffer()

  if (cardEl) {
    const { left, top, width, height, radius } = cardEl.rect
    const L = Math.round(left)
    const T = Math.round(top)
    const Wc = Math.round(width)
    const Hc = Math.round(height)
    const blurred = await sharp(baseBuf).extract({ left: L, top: T, width: Wc, height: Hc }).blur(22).modulate({ saturation: 1.15 }).png().toBuffer()
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${Wc}" height="${Hc}"><rect width="${Wc}" height="${Hc}" rx="${radius}" fill="#fff"/></svg>`)
    const rounded = await sharp(blurred).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()

    layers.push({ input: rounded, left: L, top: T })
  }

  const underSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}</defs>${under}${cardEl ? cardEl.svg.split('\n')[0] : ''}</svg>`)
  const bare = await sharp(baseBuf).composite([...layers, { input: underSvg, left: 0, top: 0 }]).png().toBuffer()

  const top = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}</defs>${body}${cardEl ? cardEl.svg.split('\n').slice(1).join('\n') : ''}${selection}</svg>`)
  const topLayers = [{ input: top, left: 0, top: 0 }]

  if (s.logo) {
    const lb = await sharp(`public/branding/${s.logo.variant === 'color' ? 'logo-full.svg' : 'logo-negative.svg'}`, { density: 600 }).resize({ width: s.logo.width }).png().toBuffer()
    const { width: lw, height: lh } = await sharp(lb).metadata()
    const lx = s.logo.x != null ? Math.round(s.logo.x * W - lw / 2) : Math.round(W / 2 - lw / 2)
    const ly = Math.round(H - M * 0.85 - lh)

    topLayers.push({ input: lb, left: lx, top: ly })
    checks.push({ id: 'logo', box: { left: lx, right: lx + lw, top: ly, bottom: ly + lh }, inkL: s.logo.variant === 'color' ? lum(2, 60, 112) : 1 })
  }

  let master = await sharp(bare).composite(topLayers).png().toBuffer()

  // Firma web: SVG canónico url-lum con fusión de luminosidad no separable (compositor canónico, opacidad 0.72).
  if (s.url) {
    const src = await sharp('src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg', { density: 600 }).png().toBuffer()
    const uw = Math.round(s.url.width * W)
    const { height: uh0, width: uw0 } = await sharp(src).metadata()
    const uh = Math.round((uh0 * uw) / uw0)
    const left = Math.round(W / 2 - uw / 2)
    const topU = Math.round(s.url.y * H)
    const res = await compositeLuminosity({ backdropBytes: master, sourceBytes: src, left, top: topU, width: uw, opacity: 0.72 })

    master = res.output
    if (!res.evidence || res.evidence.method !== 'non-separable-luminosity') throw new Error('url-lum sin evidencia de fusión')
    checks.push({ id: 'url', box: { left, right: left + uw, top: topU, bottom: topU + uh }, skipContrast: true })
  }

  await sharp(master).resize(FINAL).png().toFile(`${DIR}/out-v2/${s.id}.png`)
  await sharp(master).resize({ width: 390 }).png().toFile(`${DIR}/out-v2/preview-390/${s.id}.png`)

  const contraste = {}

  for (const c of checks) {
    if (c.box.left < 0 || c.box.right > W || c.box.top < 0 || c.box.bottom > H) throw new Error(`${s.id}: ${c.id} fuera del lienzo`)
    if (!c.skipContrast) contraste[c.id] = await contrastUnder(bare, c.box, c.inkL ?? 1)
  }
  if (cardEl) contraste.tarjeta = await contrastUnder(bare, cardEl.textBoxes[0])

  qa.push({ id: s.id, dominante: dom.lines, contraste, seleccion: selEvidence })
}

fs.writeFileSync(`${DIR}/out-v2/qa${only.length ? '-parcial' : ''}.json`, JSON.stringify(qa, null, 2))
for (const q of qa) console.log(q.id, JSON.stringify(q.contraste))
