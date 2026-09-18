// KV paraguas «Tu IA no conoce tu negocio» — versión Clawd. Plate: Nexa + Clawd 3D (GPT Image 2.5 Sunburst).
// Copy, logo y scrim determinísticos (fontkit → paths, tokens AXIS). PNG 1080×1350 (regla: social en PNG).
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
const PLATE = process.env.PLATE ?? 'plates/plate-kv-4x5-v02.png'
const OUT = process.env.OUT ?? 'kv-tu-ia-no-conoce-clawd-4x5-v02.png'
const SUPPORT = ['Claude razona increíble. Nadie le ha', 'contado cómo funciona tu empresa.']

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

const MARGIN = 72
// Contraste tipográfico: entrada Bricolage ideaLead (420) en softOnDark → remate «tu negocio.» ideaImpact (780) blanco.
const leadFont = bric.getVariation({ wght: R.ideaLead.weight, wdth: R.ideaLead.width, opsz: R.ideaLead.opticalSize })
const punchFont = bric.getVariation({ wght: R.ideaImpact.weight, wdth: R.ideaImpact.width, opsz: R.ideaImpact.opticalSize })
const fit = (t, font, target, tr) => { const pr = shape(t, font, 100, tr); return (100 * target) / (pr.ink.right - pr.ink.left) }
const punchSize = fit('tu negocio.', punchFont, W * 0.66, -0.035)
const leadSize = punchSize * 0.62
const headSize = punchSize
const head = [shape('Tu IA no conoce', leadFont, leadSize, -0.02), shape('tu negocio.', punchFont, punchSize, -0.035)]
const HEAD_FG = [SOFT, '#ffffff']
const sup = SUPPORT.map(t => shape(t, popMedium, 34, -0.005))

const LOGO_W = 170
const LOGO_H = LOGO_W * (196.68 / 837.07)
const BOTTOM = H - 64
const logo = { x: W - MARGIN - LOGO_W, y: BOTTOM - LOGO_H }

// Pila de texto anclada abajo: bajada termina en BOTTOM, titular arriba de la bajada.
const LEAD_SUP = 46
const LEAD_HEAD = punchSize * 0.9
const supY = [BOTTOM - LEAD_SUP - sup[1].ink.bottom * 0, BOTTOM].map((_, i) => BOTTOM - (1 - i) * LEAD_SUP)
const headBaseLast = supY[0] + sup[0].ink.top - 34
const headY = [headBaseLast - LEAD_HEAD, headBaseLast]
const x0 = l => MARGIN - l.ink.left

const boxes = []
let text = ''
head.forEach((l, i) => {
  text += `<g fill="${HEAD_FG[i]}" transform="translate(${x0(l).toFixed(2)} ${headY[i].toFixed(2)})">${l.paths}</g>`
  boxes.push({ name: `head${i}`, fg: HEAD_FG[i], left: MARGIN, right: x0(l) + l.ink.right, top: headY[i] + l.ink.top, bottom: headY[i] + l.ink.bottom })
})
sup.forEach((l, i) => {
  text += `<g fill="${SOFT}" transform="translate(${x0(l).toFixed(2)} ${supY[i].toFixed(2)})">${l.paths}</g>`
  boxes.push({ name: `sup${i}`, fg: SOFT, left: MARGIN, right: x0(l) + l.ink.right, top: supY[i] + l.ink.top, bottom: supY[i] + l.ink.bottom })
})

const textRight = Math.max(...boxes.map(b => b.right))
const supRight = Math.max(...boxes.filter(b => b.name.startsWith('sup')).map(b => b.right))

if (supRight > logo.x - 32) throw new Error(`La bajada invade la firma: ${supRight.toFixed(1)} > ${(logo.x - 32).toFixed(1)}`)
if (textRight > W - MARGIN) throw new Error(`El titular sale del margen: ${textRight.toFixed(1)}`)

const scrim = `<defs>
  <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0.58" stop-color="#011a33" stop-opacity="0"/>
    <stop offset="0.74" stop-color="#011a33" stop-opacity="0.5"/>
    <stop offset="0.86" stop-color="#011a33" stop-opacity="0.86"/>
    <stop offset="1" stop-color="#011a33" stop-opacity="0.95"/>
  </linearGradient>
  <radialGradient id="l" cx="0.28" cy="0.84" r="0.55"><stop offset="0" stop-color="#011a33" stop-opacity="0.62"/><stop offset="1" stop-color="#011a33" stop-opacity="0"/></radialGradient>
  <radialGradient id="v" cx="0.5" cy="0.4" r="0.8"><stop offset="0.6" stop-color="#011a33" stop-opacity="0"/><stop offset="1" stop-color="#011a33" stop-opacity="0.45"/></radialGradient>
</defs><rect width="${W}" height="${H}" fill="url(#v)"/><rect width="${W}" height="${H}" fill="url(#s)"/><rect width="${W}" height="${H}" fill="url(#l)"/>`

const logoRaw = fs.readFileSync('public/branding/logo-negative.svg', 'utf8').replace(/<\?xml[^>]*>/, '')
const logoSvg = `<g transform="translate(${logo.x.toFixed(2)} ${logo.y.toFixed(2)})">${logoRaw.replace('<svg ', `<svg width="${LOGO_W}" height="${LOGO_H.toFixed(2)}" `)}</g>`

const plate = await sharp(path.join(DIR, PLATE)).resize(W, H, { kernel: 'lanczos3' }).toColourspace('srgb').png().toBuffer()
const graded = await sharp(plate).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${scrim}</svg>`) }]).png().toBuffer()

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${text}${logoSvg}</svg>`
const overlay = await sharp(Buffer.from(svg), { density: 144 }).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer()
const out = path.join(DIR, OUT)

await sharp(graded).composite([{ input: overlay }]).png({ compressionLevel: 9 }).toFile(out)
fs.writeFileSync(out.replace(/\.png$/, '-overlay.svg'), svg)

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

const contrast = {}

for (const b of boxes) contrast[b.name] = await worst(b, b.fg)
contrast.logo = await worst({ left: logo.x, right: logo.x + LOGO_W, top: logo.y, bottom: logo.y + LOGO_H }, '#ffffff')
const fail = Object.entries(contrast).filter(([, v]) => v < 4.5)

fs.writeFileSync(out.replace(/\.png$/, '-qa.json'), `${JSON.stringify({ plate: PLATE, headSize: Number(headSize.toFixed(1)), boxes, logo, contrast }, null, 2)}\n`)
await sharp(out).resize(390, 488).png().toFile(out.replace(/\.png$/, '-mobile-390.png'))
console.log(JSON.stringify(contrast), headSize.toFixed(1))
if (fail.length) throw new Error(`Contraste bajo 4,5:1: ${JSON.stringify(fail)}`)
