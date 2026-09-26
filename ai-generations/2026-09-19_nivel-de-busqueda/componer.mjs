// «Nivel de búsqueda» — trendjacking GTA VI / estética Vice City para Efeonce.
//
// Mecanismo: reencuadre por doble sentido. En el GTA en español las estrellas de persecución se llaman
// «nivel de búsqueda»; en la búsqueda con IA (AEO), que todos te busquen es justo lo que quieres.
//
// El dispositivo de la serie es un HUD PROPIO de cinco estrellas (no el HUD de Rockstar, ni su tipografía,
// ni sus marcas). El texto NUNCA se genera: se moldea con fontkit a trazos desde las fuentes oficiales y
// las recetas vigentes de `axisAdvertising`. Los plates vienen de gpt-image-2.5-flare sin texto ni logos.
//
// Uso: node ai-generations/2026-09-19_nivel-de-busqueda/componer.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'
import { axisAdvertising } from '@efeoncepro/axis-tokens'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const DIR = path.dirname(new URL(import.meta.url).pathname)
const R = axisAdvertising.recipes
const C = axisAdvertising.color

const W = 1152
const H = 1440
const M = Math.round(W * 0.075)
const FINAL = { width: 1080, height: 1350 }

const bric = fontkit.openSync('src/assets/fonts/BricolageGrotesque-Variable.ttf')
const pop = {
  400: fontkit.openSync('src/assets/fonts/Poppins-Regular.ttf'),
  600: fontkit.openSync('src/assets/fonts/Poppins-SemiBold.ttf'),
  700: fontkit.openSync('src/assets/fonts/Poppins-Bold.ttf')
}
const idea = recipe => bric.getVariation({ wght: recipe.weight, wdth: recipe.width, opsz: recipe.opticalSize })
const em = v => Number.parseFloat(v)

// Moldea una línea a trazos y devuelve su caja de TINTA real.
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

// Corta por palabras al ancho máximo; `breaks` fuerza saltos con «|» para balancear a mano.
const wrap = (text, font, size, maxWidth, trackingEm) => {
  const lines = []

  for (const chunk of text.split('|')) {
    let line = ''

    for (const word of chunk.trim().split(/\s+/)) {
      const probe = line ? `${line} ${word}` : word

      if (line && shape(probe, font, size, trackingEm).advance > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = probe
      }
    }
    if (line) lines.push(line)
  }

  return lines
}

// Bloque de texto: devuelve svg + caja de tinta total. align: 'left' | 'center'.
const block = ({ text, font, size, tracking, leading, x, y, maxWidth, fill, align = 'left' }) => {
  const lines = wrap(text, font, size, maxWidth, tracking)
  let svg = ''
  const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }

  lines.forEach((line, i) => {
    const s = shape(line, font, size, tracking)
    const baseline = y + i * size * leading
    const lx = align === 'center' ? x - (s.ink.left + s.ink.right) / 2 : x - s.ink.left

    svg += `<g fill="${fill}" transform="translate(${lx.toFixed(2)} ${baseline.toFixed(2)})">${s.paths}</g>`
    box.left = Math.min(box.left, lx + s.ink.left)
    box.right = Math.max(box.right, lx + s.ink.right)
    box.top = Math.min(box.top, baseline + s.ink.top)
    box.bottom = Math.max(box.bottom, baseline + s.ink.bottom)
  })

  return { svg, box, lines }
}

// ── HUD propio de cinco estrellas ────────────────────────────────────────────────────────────────
const starPath = (cx, cy, r) => {
  const pts = []

  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 === 0 ? r : r * 0.45

    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`)
  }

  return `M${pts.join('L')}Z`
}

const LIT = C.accentSurface // naranja Efeonce: el atardecer de la ciudad y la marca coinciden

const hud = ({ lit, r, cx0, cy, gap, align = 'right', label = true }) => {
  const step = r * 2 + gap
  const total = step * 5 - gap
  const start = align === 'right' ? cx0 - total + r : align === 'center' ? cx0 - total / 2 + r : cx0 + r
  let glow = ''
  let stars = ''

  for (let i = 0; i < 5; i++) {
    const cx = start + i * step
    const d = starPath(cx, cy, r)

    if (i < lit) {
      glow += `<path d="${d}" fill="${LIT}"/>`
      stars += `<path d="${d}" fill="${LIT}" stroke="#ffd2b0" stroke-width="${(r * 0.05).toFixed(1)}" stroke-linejoin="round"/>`
    } else {
      stars += `<path d="${d}" fill="rgba(0,20,45,0.35)" stroke="rgba(255,255,255,0.78)" stroke-width="${(r * 0.07).toFixed(1)}" stroke-linejoin="round"/>`
    }
  }

  let labelSvg = ''
  let labelBox = null

  if (label) {
    const size = Math.max(22, r * 0.42)
    const s = shape('NIVEL DE BÚSQUEDA', pop[600], size, em(R.structureLabel.tracking))
    const ly = cy - r - size * 0.9
    const left = start - r
    const lx = align === 'right' ? left + total - s.ink.right : align === 'center' ? start - r + total / 2 - (s.ink.left + s.ink.right) / 2 : left - s.ink.left

    labelSvg = `<g fill="${C.inkOnDark}" transform="translate(${lx.toFixed(1)} ${ly.toFixed(1)})">${s.paths}</g>`
    labelBox = { left: lx + s.ink.left, right: lx + s.ink.right, top: ly + s.ink.top, bottom: ly + s.ink.bottom }
  }

  const blur = (r * 0.35).toFixed(1)

  return {
    svg: `<g filter="url(#glow${blur.replace('.', '')})">${glow}</g>${stars}${labelSvg}`,
    defs: `<filter id="glow${blur.replace('.', '')}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${blur}"/></filter>`,
    labelBox,
    box: { left: start - r, right: start - r + total, top: cy - r, bottom: cy + r }
  }
}

// ── Utilidades de contraste sobre los píxeles reales ─────────────────────────────────────────────
const lum = (r, g, b) => {
  const f = c => {
    c /= 255

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const contrastUnder = async (buf, box, ink = [255, 255, 255]) => {
  const left = Math.max(0, Math.floor(box.left))
  const top = Math.max(0, Math.floor(box.top))
  const width = Math.min(W - left, Math.ceil(box.right - box.left))
  const height = Math.min(H - top, Math.ceil(box.bottom - box.top))
  const { data } = await sharp(buf).extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const ls = []

  for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]))
  ls.sort((a, b) => a - b)
  const inkL = lum(...ink)
  // Peor caso: el fondo más claro (p98) bajo el texto claro.
  const bg = ls[Math.floor(ls.length * 0.98)]
  const ratio = (Math.max(inkL, bg) + 0.05) / (Math.min(inkL, bg) + 0.05)

  return Math.round(ratio * 100) / 100
}

// ── Piezas ───────────────────────────────────────────────────────────────────────────────────────
// scrim: gradiente vertical local {from,to,opacity} en fracciones de alto — sólo donde el plate lo pide.
const SLIDES = JSON.parse(fs.readFileSync(`${DIR}/brief/slides.json`, 'utf8'))

const logoBuf = async (w, variant) =>
  sharp(`public/branding/${variant === 'color' ? 'logo-full.svg' : 'logo-negative.svg'}`, { density: 600 }).resize({ width: w }).png().toBuffer()

const qa = []

for (const s of SLIDES) {
  const plate = `${DIR}/plates/${s.plate}.png`
  let defs = ''
  let body = ''
  const boxes = []

  // Scrim gradual local.
  let base = sharp(plate)
  const layers = []

  if (s.scrim) {
    const { from, to, opacity, dir = 'down' } = s.scrim
    const y1 = from * H
    const y2 = to * H
    const [o1, o2] = dir === 'down' ? [opacity, 0] : [0, opacity]

    layers.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="s" x1="0" y1="${y1}" x2="0" y2="${y2}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#00142d" stop-opacity="${o1}"/><stop offset="1" stop-color="#00142d" stop-opacity="${o2}"/></linearGradient></defs><rect x="0" y="${Math.min(y1, y2)}" width="${W}" height="${Math.abs(y2 - y1)}" fill="url(#s)"/>${dir === 'down' ? `<rect x="0" y="0" width="${W}" height="${y1}" fill="#00142d" fill-opacity="${opacity}"/>` : `<rect x="0" y="${y2}" width="${W}" height="${H - y2}" fill="#00142d" fill-opacity="${opacity}"/>`}</svg>`),
      left: 0,
      top: 0
    })
  }

  // HUD
  if (s.hud) {
    const h = s.hud.mode === 'corner'
      ? hud({ lit: s.hud.lit, r: 38, cx0: W - M, cy: M + 70, gap: 14, align: 'right' })
      : hud({ lit: s.hud.lit, r: 74, cx0: W / 2, cy: s.hud.y * H, gap: 26, align: 'center' })

    defs += h.defs
    body += h.svg
    boxes.push({ id: 'hud-label', box: h.labelBox })
  }

  let cursorY = s.headline.y * H

  // Titular
  const rec = R[s.headline.recipe]
  const hfont = idea(rec)
  const hsize = s.headline.size
  const hl = block({
    text: s.headline.text,
    font: hfont,
    size: hsize,
    tracking: em(rec.tracking),
    leading: rec.lineHeight,
    x: s.align === 'center' ? W / 2 : M,
    y: cursorY,
    maxWidth: W * (s.headline.maxWidth ?? 0.84),
    fill: C.inkOnDark,
    align: s.align
  })

  body += hl.svg
  boxes.push({ id: 'titular', box: hl.box })

  // Apoyo
  if (s.support) {
    const srec = R.structureLead
    const ssize = s.support.size
    const sp = block({
      text: s.support.text,
      font: pop[400],
      size: ssize,
      tracking: em(srec.tracking),
      leading: srec.lineHeight,
      x: s.align === 'center' ? W / 2 : M,
      y: hl.box.bottom + ssize * (s.support.gap ?? 1.9),
      maxWidth: W * (s.support.maxWidth ?? 0.8),
      fill: C.softOnDark,
      align: s.align
    })

    body += sp.svg
    boxes.push({ id: 'apoyo', box: sp.box })
  }

  if (s.logo) {
    const lb = await logoBuf(s.logo.width, s.logo.variant)
    const { width: lw, height: lh } = await sharp(lb).metadata()

    layers.push({ input: lb, left: Math.round(W / 2 - lw / 2), top: Math.round(H - M * 0.9 - lh) })
    boxes.push({ id: 'logo', box: { left: W / 2 - lw / 2, right: W / 2 + lw / 2, top: H - M * 0.9 - lh, bottom: H - M * 0.9 }, logo: true })
  }

  // Base sin texto para medir contraste (plate + scrim).
  const bare = await base.clone().composite(layers.filter(l => !boxes.find(b => b.logo && l.top === Math.round(b.box.top)))).png().toBuffer()
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`)
  const master = await sharp(bare).composite([...layers.filter(l => boxes.find(b => b.logo && l.top === Math.round(b.box.top))), { input: overlay, left: 0, top: 0 }]).png().toBuffer()

  const out = `${DIR}/out/${s.id}.png`

  await sharp(master).resize(FINAL).png().toFile(out)
  await sharp(master).resize({ width: 390 }).png().toFile(`${DIR}/out/preview-390/${s.id}.png`)

  const contraste = {}

  for (const b of boxes) {
    if (!b.box) continue
    if (b.box.left < 0 || b.box.right > W || b.box.top < 0 || b.box.bottom > H) throw new Error(`${s.id}: ${b.id} fuera del lienzo`)
    if (!b.logo) contraste[b.id] = await contrastUnder(bare, b.box)
  }

  qa.push({ id: s.id, lineasTitular: hl.lines, contraste })
}

fs.writeFileSync(`${DIR}/out/qa.json`, JSON.stringify(qa, null, 2))
console.log(JSON.stringify(qa, null, 2))
