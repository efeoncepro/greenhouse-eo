// v2 «Hay días que sí rediseñaríamos» — composición exacta sobre plate 3D (GPT Image 2.5 Sunburst desde boceto con
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

// Zona libre medida sobre el plate: el «7» termina en y≈1030 (x 870–890). El texto empieza bajo y=1048.
const COPY_TOP = 1052
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

// Viñeta cinematográfica: bordes y base más profundos → foco en el objeto y soporte de lectura del remate.
const vignette = `<defs>
  <radialGradient id="v" cx="0.46" cy="0.4" r="0.78"><stop offset="0.55" stop-color="#011d3a" stop-opacity="0"/><stop offset="1" stop-color="#011d3a" stop-opacity="0.62"/></radialGradient>
  <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0.7" stop-color="#011d3a" stop-opacity="0"/><stop offset="1" stop-color="#011d3a" stop-opacity="0.55"/></linearGradient>
</defs><rect width="${W}" height="${H}" fill="url(#v)"/><rect width="${W}" height="${H}" fill="url(#b)"/>`

const logoRaw = fs.readFileSync('public/branding/logo-negative.svg', 'utf8').replace(/<\?xml[^>]*>/, '')
const text = `<g fill="${SOFT}" transform="translate(${leadX.toFixed(2)} ${leadY.toFixed(2)})">${lead.paths}</g><g fill="#ffffff" transform="translate(${punchX.toFixed(2)} ${punchY.toFixed(2)})">${punch.paths}</g>`
const logoSvg = `<g transform="translate(${logo.x.toFixed(2)} ${logo.y.toFixed(2)})">${logoRaw.replace('<svg ', `<svg width="${LOGO_W}" height="${LOGO_H.toFixed(2)}" `)}</g>`

const plate = await sharp(path.join(DIR, 'plate-3d-v01.png')).resize(W, H, { kernel: 'lanczos3' }).toColourspace('srgb').png().toBuffer()
const graded = await sharp(plate).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${vignette}</svg>`) }]).png().toBuffer()

// Guardia: ningún píxel brillante del «7» dentro de la caja del copy.
{
  const box = { left: Math.floor(copy.left) - 8, top: Math.floor(copy.top) - 8, width: Math.ceil(copy.right - copy.left) + 16, height: Math.ceil(copy.bottom - copy.top) + 16 }
  const { data, info } = await sharp(graded).extract(box).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let bright = 0

  for (let i = 0; i < data.length; i += info.channels) if (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] > 150) bright++
  if (bright > 0) throw new Error(`El copy se superpone a ${bright} píxeles brillantes del plate`)
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${text}${logoSvg}</svg>`
const overlay = await sharp(Buffer.from(svg), { density: 144 }).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer()
const out = path.join(DIR, 'post-17-v2.png')

await sharp(graded).composite([{ input: overlay }]).png({ compressionLevel: 9 }).toFile(out)
fs.writeFileSync(path.join(DIR, 'post-17-v2-overlay.svg'), svg)

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
  file: 'post-17-v2.png',
  punchSize: Number(punchSize.toFixed(1)),
  copy,
  logo,
  contrast: {
    lead: await worst({ left: leadX + lead.ink.left, right: leadX + lead.ink.right, top: leadY + lead.ink.top, bottom: leadY + lead.ink.bottom }, SOFT),
    punch: await worst({ left: punchX + punch.ink.left, right: punchX + punch.ink.right, top: punchY + punch.ink.top, bottom: punchY + punch.ink.bottom }, '#ffffff'),
    logo: await worst({ left: logo.x, right: logo.x + LOGO_W, top: logo.y, bottom: logo.y + LOGO_H }, '#ffffff')
  }
}

fs.writeFileSync(path.join(DIR, 'qa-v2.json'), `${JSON.stringify(qa, null, 2)}\n`)
await sharp(out).resize(390, 488).png().toFile(path.join(DIR, 'post-17-v2-mobile-390.png'))
console.log(JSON.stringify(qa.contrast), qa.punchSize)
