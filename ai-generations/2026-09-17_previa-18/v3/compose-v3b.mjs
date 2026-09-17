// v3 «Hay días que sí rediseñaríamos» (luz dramática, cámara heroica) — composición exacta sobre plate 3D (GPT Image 2.5 Sunburst desde boceto con
// glifos Bricolage reales). Texto y logo determinísticos (fontkit → paths), PNG 1080×1350 (regla: social en PNG).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'
import { axisAdvertising } from '@efeoncepro/axis-tokens'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const DIR = path.dirname(new URL(import.meta.url).pathname)
const W = 1080
const H = 1350
const R = axisAdvertising.recipes
const SOFT = axisAdvertising.color.softOnDark

const bric = fontkit.openSync('src/assets/fonts/BricolageGrotesque-Variable.ttf')
const popMedium = fontkit.openSync('src/assets/fonts/Poppins-Medium.ttf')

const shape = (text, font, size, trackingEm) => {
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

const punchFont = bric.getVariation({ wght: R.ideaImpact.weight, wdth: R.ideaImpact.width, opsz: 72 })
const probe = shape('sí rediseñaríamos.', punchFont, 100, -0.03)
const punchSize = (100 * W * 0.58) / (probe.ink.right - probe.ink.left)
const punch = shape('sí rediseñaríamos.', punchFont, punchSize, -0.03)
const lead = shape('Hay días que', popMedium, 44, -0.005)

// Plate v3: los números terminan en y≈1000; el piso reflectante ocupa el resto (se oscurece con scrim gradual).
const COPY_TOP = 1064
const GAP = 14
const leadY = COPY_TOP - lead.ink.top
const punchY = leadY + lead.ink.bottom + GAP - punch.ink.top
const leadX = W / 2 - (lead.ink.left + lead.ink.right) / 2
const punchX = W / 2 - (punch.ink.left + punch.ink.right) / 2
const copy = { left: Math.min(leadX + lead.ink.left, punchX + punch.ink.left), right: Math.max(leadX + lead.ink.right, punchX + punch.ink.right), top: leadY + lead.ink.top, bottom: punchY + punch.ink.bottom }

const LOGO_W = 180
const LOGO_H = LOGO_W * (196.68 / 837.07)
const logo = { x: (W - LOGO_W) / 2, y: H - H * 0.06 - LOGO_H }

if (copy.bottom > logo.y - 36) throw new Error(`Copy invade la firma: ${copy.bottom.toFixed(1)} > ${(logo.y - 36).toFixed(1)}`)

// Luz que decae con la distancia: el piso reflectante se oscurece gradualmente bajo la escena (sin bordes visibles),
// para sostener la lectura del remate sin apagar los reflejos cercanos a los números.
const vignette = `<defs>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0.7" stop-color="#010e1d" stop-opacity="0"/>
    <stop offset="0.8" stop-color="#010e1d" stop-opacity="0.72"/>
    <stop offset="1" stop-color="#010e1d" stop-opacity="0.9"/>
  </linearGradient>
  <radialGradient id="v" cx="0.45" cy="0.38" r="0.8"><stop offset="0.6" stop-color="#010e1d" stop-opacity="0"/><stop offset="1" stop-color="#010e1d" stop-opacity="0.45"/></radialGradient>
</defs><rect width="${W}" height="${H}" fill="url(#v)"/><rect width="${W}" height="${H}" fill="url(#floor)"/>`

const logoRaw = fs.readFileSync('public/branding/logo-negative.svg', 'utf8').replace(/<\?xml[^>]*>/, '')
const text = `<g fill="${SOFT}" transform="translate(${leadX.toFixed(2)} ${leadY.toFixed(2)})">${lead.paths}</g><g fill="#ffffff" transform="translate(${punchX.toFixed(2)} ${punchY.toFixed(2)})">${punch.paths}</g>`
const logoSvg = `<g transform="translate(${logo.x.toFixed(2)} ${logo.y.toFixed(2)})">${logoRaw.replace('<svg ', `<svg width="${LOGO_W}" height="${LOGO_H.toFixed(2)}" `)}</g>`

const plate = await sharp(path.join(DIR, 'plate-3d-v03-red.png')).resize(W, H, { kernel: 'lanczos3' }).toColourspace('srgb').png().toBuffer()
const graded = await sharp(plate).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${vignette}</svg>`) }]).png().toBuffer()

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${text}${logoSvg}</svg>`
const overlay = await sharp(Buffer.from(svg), { density: 144 }).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer()
const out = path.join(DIR, 'post-17-v3b.png')

await sharp(graded).composite([{ input: overlay }]).png({ compressionLevel: 9 }).toFile(out)
fs.writeFileSync(path.join(DIR, 'post-17-v3b-overlay.svg'), svg)

const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const worst = async (b, fgHex) => {
  const left = Math.max(0, Math.floor(b.left)), top = Math.max(0, Math.floor(b.top))
  const { data, info } = await sharp(graded).extract({ left, top, width: Math.ceil(b.right - b.left), height: Math.ceil(b.bottom - b.top) }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const l = []

  for (let i = 0; i < data.length; i += info.channels) l.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]))
  l.sort((a, c) => a - c)

  const bg = l[Math.floor(l.length * 0.98)]
  const n = parseInt(fgHex.slice(1), 16)
  const fg = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)

  return Number(((Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)).toFixed(2))
}

const qa = {
  file: 'post-17-v3b.png',
  punchSize: Number(punchSize.toFixed(1)),
  copy,
  logo,
  contrast: {
    lead: await worst({ left: leadX + lead.ink.left, right: leadX + lead.ink.right, top: leadY + lead.ink.top, bottom: leadY + lead.ink.bottom }, SOFT),
    punch: await worst({ left: punchX + punch.ink.left, right: punchX + punch.ink.right, top: punchY + punch.ink.top, bottom: punchY + punch.ink.bottom }, '#ffffff'),
    logo: await worst({ left: logo.x, right: logo.x + LOGO_W, top: logo.y, bottom: logo.y + LOGO_H }, '#ffffff')
  }
}

fs.writeFileSync(path.join(DIR, 'qa-v3b.json'), `${JSON.stringify(qa, null, 2)}\n`)
// Contraste mínimo obligatorio (peor caso p98 del fondo bajo la tinta).
for (const [k, v] of Object.entries(qa.contrast)) if (v < 4.5) throw new Error(`Contraste insuficiente en ${k}: ${v}:1`)
await sharp(out).resize(390, 488).png().toFile(path.join(DIR, 'post-17-v3b-mobile-390.png'))
console.log(JSON.stringify(qa.contrast), qa.punchSize)
