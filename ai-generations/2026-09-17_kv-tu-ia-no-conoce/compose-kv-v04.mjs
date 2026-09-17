// KV paraguas v04 «Tu IA no conoce tu negocio» — muro navy pintado (escenografía, sin degradado), jerarquía tipográfica
// y selección colaborativa AXIS sobre «tu negocio.»: cursor multiplayer «Claude», cursor local y etiqueta de capa
// «Contexto: 0 %». Logo Efeonce centrado sobre el escritorio. FORMAT=4x5 (1080×1350) · FORMAT=9x16 (1080×1920).
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
const R = axisAdvertising.recipes
const C = axisAdvertising.color
const FORMAT = process.env.FORMAT ?? '4x5'

// Medidas sobre cada plate (px del lienzo final): muro libre, inicio del pelo, escritorio y zona segura.
const SPEC = {
  '4x5': { W: 1080, H: 1350, plate: 'feed/plate-4x5-wide-navy.png', wall: [253, 827], headTop: 356, top: 64, impactWidth: 0.47, desk: [1070, 1350], logoCenterY: 1212, logoW: 210, safe: 0 },
  '9x16': { W: 1080, H: 1920, plate: 'wall/plate-9x16-navy.png', wall: [141, 937], headTop: 500, top: 252, impactWidth: 0.47, desk: [1556, 1920], logoCenterY: 1606, logoW: 220, safe: 0.13 }
}[FORMAT]
const { W, H } = SPEC
const OUT = `kv-tu-ia-no-conoce-clawd-${FORMAT}-v04.png`

const FONTS = {
  bric: fontkit.openSync('src/assets/fonts/BricolageGrotesque-Variable.ttf'),
  'Poppins-500': fontkit.openSync('src/assets/fonts/Poppins-Medium.ttf'),
  'Poppins-600': fontkit.openSync('src/assets/fonts/Poppins-SemiBold.ttf'),
  'Poppins-700': fontkit.openSync('src/assets/fonts/Poppins-Bold.ttf')
}

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

// ── Titular con jerarquía: entrada Poppins 500 softOnDark → remate Bricolage ideaImpact blanco ──────────────────
const impactFont = FONTS.bric.getVariation({ wght: R.ideaImpact.weight, wdth: R.ideaImpact.width, opsz: R.ideaImpact.opticalSize })
const IMPACT_TR = -0.035
const probe = shape('tu negocio.', impactFont, 100, IMPACT_TR)
const impactSize = (100 * W * SPEC.impactWidth) / (probe.ink.right - probe.ink.left)
const impact = shape('tu negocio.', impactFont, impactSize, IMPACT_TR)
const lead = shape('Tu IA no conoce', FONTS['Poppins-500'], impactSize * 0.4, -0.005)
const center = (l, baseline) => { const x = W / 2 - (l.ink.left + l.ink.right) / 2; return { x, y: baseline, left: x + l.ink.left, right: x + l.ink.right, top: baseline + l.ink.top, bottom: baseline + l.ink.bottom } }

const leadBox = center(lead, SPEC.top - lead.ink.top)
const GAP = impactSize * 0.24
const impactBox = center(impact, leadBox.bottom + GAP - impact.ink.top)

// ── Selección colaborativa AXIS sobre «tu negocio.» ──────────────────────────────────────────────────────────────
const measureLabel = (label, size) => shape(label, FONTS['Poppins-700'], size).advance
const manifest = resolveCollaborationSelectionIntent({
  targetId: 'kv-headline-negocio',
  targetKind: 'text',
  variant: 'eight-handles',
  padding: 'standard',
  overlay: 'subtle',
  cursors: [
    { id: 'claude', kind: 'collaborator', targetId: 'kv-headline-negocio', anchor: 'top-end', action: 'select', label: 'Claude', participantKind: 'role' },
    { id: 'local', kind: 'local', targetId: 'kv-headline-negocio', anchor: 'bottom-start', action: 'select' }
  ]
})
const rendered = renderCollaborationSelection({ manifest, targetBounds: impactBox, canvas: { width: W, height: H }, measureLabel })
const selOverlay = rendered.overlay.replace(/<text x="(-?[\d.]+)" y="(-?[\d.]+)" fill="([^"]+)" font-family="[^"]*" font-size="([\d.]+)" font-weight="700">([^<]*)<\/text>/g, (_, x, y, fill, size, label) => {
  const s = shape(label.replaceAll('&amp;', '&'), FONTS['Poppins-700'], Number(size))
  return `<g fill="${fill}" transform="translate(${x} ${y})">${s.paths}</g>`
})

if (/<text/.test(selOverlay)) throw new Error('Quedó un <text> sin convertir a paths')
if (!rendered.evidence.withinCanvas) throw new Error(`Selección fuera del lienzo: ${JSON.stringify(rendered.evidence)}`)

const pad = { x: manifest.selection.paddingRatio.inline * W, y: manifest.selection.paddingRatio.block * W }
const selBounds = { left: impactBox.left - pad.x, right: impactBox.right + pad.x, top: impactBox.top - pad.y, bottom: impactBox.bottom + pad.y }

// ── Etiqueta de capa (como el nombre/medida de una capa en el editor), centrada bajo la selección ───────────────
const CHIP_SIZE = Math.max(18, W * 0.02)
const chipText = shape('Contexto: 0 %', FONTS['Poppins-600'], CHIP_SIZE, 0.01)
const chipH = CHIP_SIZE * 1.75
const chipW = chipText.advance + CHIP_SIZE * 1.3
const chip = { x: W / 2 - chipW / 2, y: selBounds.bottom + W * 0.012, w: chipW, h: chipH }
const CHIP_FILL = '#0375db'
const chipSvg = `<rect x="${chip.x.toFixed(2)}" y="${chip.y.toFixed(2)}" width="${chip.w.toFixed(2)}" height="${chip.h.toFixed(2)}" rx="${(chipH * 0.22).toFixed(2)}" fill="${CHIP_FILL}"/><g fill="#ffffff" transform="translate(${(chip.x + CHIP_SIZE * 0.65).toFixed(2)} ${(chip.y + chipH / 2 - (chipText.ink.top + chipText.ink.bottom) / 2).toFixed(2)})">${chipText.paths}</g>`

// ── Firma ────────────────────────────────────────────────────────────────────────────────────────────────────────
const LOGO_W = SPEC.logoW
const LOGO_H = LOGO_W * (196.68 / 837.07)
const logo = { x: (W - LOGO_W) / 2, y: SPEC.logoCenterY - LOGO_H / 2 }

// ── Guardias ─────────────────────────────────────────────────────────────────────────────────────────────────────
const stackBottom = chip.y + chip.h

if (leadBox.top < H * SPEC.safe) throw new Error('Titular fuera de la zona segura superior')
if (stackBottom > SPEC.headTop - 16) throw new Error(`El bloque pisa la cabeza: ${stackBottom.toFixed(0)} > ${SPEC.headTop - 16}`)
if (selBounds.left < SPEC.wall[0] || selBounds.right > SPEC.wall[1]) throw new Error(`Selección fuera del muro: ${selBounds.left.toFixed(0)}–${selBounds.right.toFixed(0)}`)
if (logo.y < SPEC.desk[0] + 12 || logo.y + LOGO_H > Math.min(SPEC.desk[1], H * (1 - SPEC.safe))) throw new Error('Logo fuera del escritorio o de la zona segura inferior')

const text = `<g fill="${C.softOnDark}" transform="translate(${leadBox.x.toFixed(2)} ${leadBox.y.toFixed(2)})">${lead.paths}</g><g fill="#ffffff" transform="translate(${impactBox.x.toFixed(2)} ${impactBox.y.toFixed(2)})">${impact.paths}</g>`
const logoRaw = fs.readFileSync('public/branding/logo-negative.svg', 'utf8').replace(/<\?xml[^>]*>/, '')
const logoSvg = `<g transform="translate(${logo.x.toFixed(2)} ${logo.y.toFixed(2)})">${logoRaw.replace('<svg ', `<svg width="${LOGO_W}" height="${LOGO_H.toFixed(2)}" `)}</g>`

const plate = await sharp(path.join(DIR, SPEC.plate)).resize(W, H, { fit: 'cover', kernel: 'lanczos3' }).removeAlpha().toColourspace('srgb').png().toBuffer()
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${rendered.underlay}${text}${selOverlay}${chipSvg}${logoSvg}</svg>`
const overlay = await sharp(Buffer.from(svg), { density: 144 }).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer()
const out = path.join(DIR, OUT)

await sharp(plate).composite([{ input: overlay }]).png({ compressionLevel: 9 }).toFile(out)
fs.writeFileSync(out.replace(/\.png$/, '-overlay.svg'), svg)

// ── Contraste peor caso (p98 del fondo bajo tinta clara) ─────────────────────────────────────────────────────────
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const lum = hex => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) }
const worst = async (b, fgHex) => {
  const left = Math.max(0, Math.floor(b.left)), top = Math.max(0, Math.floor(b.top))
  const { data, info } = await sharp(plate).extract({ left, top, width: Math.ceil(b.right - b.left), height: Math.ceil(b.bottom - b.top) }).raw().toBuffer({ resolveWithObject: true })
  const l = []

  for (let i = 0; i < data.length; i += info.channels) l.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]))
  l.sort((a, c) => a - c)
  const bg = l[Math.floor(l.length * 0.98)]
  const fg = lum(fgHex)

  return Number(((Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)).toFixed(2))
}

const contrast = {
  lead: await worst(leadBox, C.softOnDark),
  impact: await worst(impactBox, '#ffffff'),
  chipText: Number(((1.05) / (lum(CHIP_FILL) + 0.05)).toFixed(2)),
  logo: await worst({ left: logo.x, right: logo.x + LOGO_W, top: logo.y, bottom: logo.y + LOGO_H }, '#ffffff')
}

fs.writeFileSync(out.replace(/\.png$/, '-qa.json'), `${JSON.stringify({ format: FORMAT, plate: SPEC.plate, impactSize: Number(impactSize.toFixed(1)), leadBox, impactBox, selBounds, chip, stackBottom, logo, contrast, selection: rendered.evidence }, null, 2)}\n`)
await sharp(out).resize(390).png().toFile(out.replace(/\.png$/, '-mobile-390.png'))
console.log(FORMAT, JSON.stringify(contrast), 'impact', impactSize.toFixed(1), 'stackBottom', stackBottom.toFixed(0), 'head', SPEC.headTop)

const fail = Object.entries(contrast).filter(([, v]) => v < 4.5)

if (fail.length) throw new Error(`Contraste bajo 4,5:1: ${JSON.stringify(fail)}`)
