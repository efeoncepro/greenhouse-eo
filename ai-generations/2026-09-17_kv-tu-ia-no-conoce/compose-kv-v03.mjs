// KV paraguas v03 «Tu IA no conoce tu negocio» — Nexa con hoodie Efeonce y Clawd 3D, cámara lejana.
// Titular plano (un peso, Bricolage ideaShort, inkOnLight) sobre la pared; logo Efeonce centrado sobre el escritorio
// desenfocado. Formatos: FORMAT=4x5 (1080×1350, plate ancho) · FORMAT=9x16 (1080×1920, zona segura de historia).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import sharp from 'sharp'
import { axisAdvertising } from '@efeoncepro/axis-tokens'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const DIR = path.dirname(new URL(import.meta.url).pathname)
const R = axisAdvertising.recipes
const MODE = process.env.MODE ?? 'light' // dark: tinta navy + luz suave sobre la pared · light: tinta blanca + pared oscurecida arriba
const INK = MODE === 'dark' ? axisAdvertising.color.inkOnLight : '#ffffff'
const FORMAT = process.env.FORMAT ?? '4x5'

// Medidas sobre cada plate (px del lienzo final): pared libre, inicio del pelo de Nexa y frente del escritorio.
const SPEC = {
  '4x5': { W: 1080, H: 1350, plate: 'feed/plate-4x5-wide.png', wall: [262, 818], headTop: 350, titleWidth: 0.5, titleTop: 118, desk: [1060, 1350], logoCenterY: 1212, logoW: 210, safe: 0 },
  '9x16': { W: 1080, H: 1920, plate: 'story/plate-9x16.png', wall: [150, 930], headTop: 500, titleWidth: 0.62, titleTop: 270, desk: [1556, 1920], logoCenterY: 1606, logoW: 220, safe: 0.13 }
}[FORMAT]
const { W, H } = SPEC
const OUT = `kv-tu-ia-no-conoce-clawd-${FORMAT}-v03${MODE === 'dark' ? 'a' : 'b'}.png`

const bric = fontkit.openSync('src/assets/fonts/BricolageGrotesque-Variable.ttf')
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

// Titular plano: un solo peso y tamaño para las dos líneas (pedido del operador).
const font = bric.getVariation({ wght: R.ideaShort.weight, wdth: R.ideaShort.width, opsz: R.ideaShort.opticalSize })
const TR = -0.03
const LINES = ['Tu IA no conoce', 'tu negocio.']
const probe = shape(LINES[0], font, 100, TR)
const size = (100 * W * SPEC.titleWidth) / (probe.ink.right - probe.ink.left)
const lines = LINES.map(t => shape(t, font, size, TR))
const LH = size * R.ideaShort.lineHeight
const base0 = SPEC.titleTop - lines[0].ink.top
const bases = [base0, base0 + LH]
const boxes = lines.map((l, i) => {
  const x = W / 2 - (l.ink.left + l.ink.right) / 2
  return { x, y: bases[i], left: x + l.ink.left, right: x + l.ink.right, top: bases[i] + l.ink.top, bottom: bases[i] + l.ink.bottom }
})
const title = { left: Math.min(...boxes.map(b => b.left)), right: Math.max(...boxes.map(b => b.right)), top: boxes[0].top, bottom: boxes[1].bottom }

const LOGO_W = SPEC.logoW
const LOGO_H = LOGO_W * (196.68 / 837.07)
const logo = { x: (W - LOGO_W) / 2, y: SPEC.logoCenterY - LOGO_H / 2 }

// Guardias de composición.
if (title.left < SPEC.wall[0] || title.right > SPEC.wall[1]) throw new Error(`Titular fuera de la pared libre: ${title.left.toFixed(0)}–${title.right.toFixed(0)}`)
if (title.bottom > SPEC.headTop - 24) throw new Error(`Titular pisa la cabeza: ${title.bottom.toFixed(0)} > ${SPEC.headTop - 24}`)
if (title.top < H * SPEC.safe) throw new Error('Titular fuera de la zona segura superior')
if (logo.y < SPEC.desk[0] + 12 || logo.y + LOGO_H > Math.min(SPEC.desk[1], H * (1 - SPEC.safe))) throw new Error('Logo fuera del escritorio o de la zona segura inferior')

const text = boxes.map((b, i) => `<g fill="${INK}" transform="translate(${b.x.toFixed(2)} ${b.y.toFixed(2)})">${lines[i].paths}</g>`).join('')
const logoRaw = fs.readFileSync('public/branding/logo-negative.svg', 'utf8').replace(/<\?xml[^>]*>/, '')
const logoSvg = `<g transform="translate(${logo.x.toFixed(2)} ${logo.y.toFixed(2)})">${logoRaw.replace('<svg ', `<svg width="${LOGO_W}" height="${LOGO_H.toFixed(2)}" `)}</g>`

const raw = await sharp(path.join(DIR, SPEC.plate)).resize(W, H, { fit: 'cover', kernel: 'lanczos3' }).removeAlpha().toColourspace('srgb').png().toBuffer()
// Tratamiento de pared bajo el titular (medido después, sobre el plate ya tratado).
const cx = (title.left + title.right) / 2
const cy = (title.top + title.bottom) / 2
const tw = title.right - title.left
const th = title.bottom - title.top
const wallFx = MODE === 'dark'
  ? `<defs><radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${tw * 0.78}" gradientTransform="translate(${cx} ${cy}) scale(1 ${((th + 160) / (tw * 1.1)).toFixed(3)}) translate(${-cx} ${-cy})"><stop offset="0" stop-color="#f3f5f8" stop-opacity="0.9"/><stop offset="0.6" stop-color="#f3f5f8" stop-opacity="0.72"/><stop offset="1" stop-color="#f3f5f8" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>`
  : `<defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#011a33" stop-opacity="0.9"/><stop offset="${((title.bottom + 20) / H).toFixed(3)}" stop-color="#011a33" stop-opacity="0.76"/><stop offset="${((SPEC.headTop + 30) / H).toFixed(3)}" stop-color="#011a33" stop-opacity="0.38"/><stop offset="${((SPEC.headTop + 110) / H).toFixed(3)}" stop-color="#011a33" stop-opacity="0.16"/><stop offset="${((SPEC.headTop + 260) / H).toFixed(3)}" stop-color="#011a33" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#t)"/>`
const plate = await sharp(raw).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${wallFx}</svg>`) }]).png().toBuffer()
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${text}${logoSvg}</svg>`
const overlay = await sharp(Buffer.from(svg), { density: 144 }).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer()
const out = path.join(DIR, OUT)

await sharp(plate).composite([{ input: overlay }]).png({ compressionLevel: 9 }).toFile(out)
fs.writeFileSync(out.replace(/\.png$/, '-overlay.svg'), svg)

// Contraste peor caso sobre el plate: texto oscuro → percentil 2 (fondo más oscuro); logo blanco → percentil 98.
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const lum = hex => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) }
const worst = async (b, fgHex, darkInk) => {
  const left = Math.max(0, Math.floor(b.left)), top = Math.max(0, Math.floor(b.top))
  const { data, info } = await sharp(plate).extract({ left, top, width: Math.ceil(b.right - b.left), height: Math.ceil(b.bottom - b.top) }).raw().toBuffer({ resolveWithObject: true })
  const l = []

  for (let i = 0; i < data.length; i += info.channels) l.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]))
  l.sort((a, c) => a - c)
  const bg = l[Math.floor(l.length * (darkInk ? 0.02 : 0.98))]
  const fg = lum(fgHex)

  return Number(((Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)).toFixed(2))
}

const contrast = {
  line0: await worst(boxes[0], INK, true),
  line1: await worst(boxes[1], INK, true),
  logo: await worst({ left: logo.x, right: logo.x + LOGO_W, top: logo.y, bottom: logo.y + LOGO_H }, '#ffffff', false)
}

fs.writeFileSync(out.replace(/\.png$/, '-qa.json'), `${JSON.stringify({ format: FORMAT, plate: SPEC.plate, titleSize: Number(size.toFixed(1)), title, logo, contrast }, null, 2)}\n`)
await sharp(out).resize(390).png().toFile(out.replace(/\.png$/, '-mobile-390.png'))
console.log(FORMAT, JSON.stringify(contrast), 'title', size.toFixed(1), JSON.stringify(title))

const fail = Object.entries(contrast).filter(([, v]) => v < 4.5)

if (fail.length) throw new Error(`Contraste bajo 4,5:1: ${JSON.stringify(fail)}`)
