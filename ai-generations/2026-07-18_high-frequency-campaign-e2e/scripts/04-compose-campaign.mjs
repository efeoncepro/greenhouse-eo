import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as fontkit from 'fontkit'
import sharp from 'sharp'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const runDir = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(runDir, '..', '..')
const matrix = JSON.parse(await readFile(path.join(runDir, 'brief', 'campaign-matrix.json'), 'utf8'))
const logoPath = path.join(repoRoot, 'public', 'branding', 'logo-negative.svg')
const fonts = {
  500: fontkit.openSync(path.join(repoRoot, 'src', 'assets', 'fonts', 'Poppins-Medium.ttf')),
  700: fontkit.openSync(path.join(repoRoot, 'src', 'assets', 'fonts', 'Poppins-Bold.ttf')),
  800: fontkit.openSync(path.join(repoRoot, 'src', 'assets', 'fonts', 'Poppins-ExtraBold.ttf'))
}

const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const glyphPaths = ({ value, x, y, size, weight, fill, tracking = 0 }) => {
  const font = fonts[weight]
  const run = font.layout(value)
  const scale = size / font.unitsPerEm
  let cursor = 0
  const paths = run.glyphs.map((glyph, index) => {
    const position = run.positions[index]
    const dx = cursor + position.xOffset * scale
    const dy = -position.yOffset * scale
    cursor += position.xAdvance * scale + tracking
    const raw = glyph.path.toSVG().trim()
    const markup = raw.startsWith('<') ? raw : `<path d="${raw}"/>`
    return `<g transform="translate(${dx.toFixed(3)} ${dy.toFixed(3)}) scale(${scale.toFixed(6)} ${(-scale).toFixed(6)})">${markup}</g>`
  }).join('')
  return `<g data-copy="${escapeXml(value)}" transform="translate(${x} ${y})" fill="${fill}">${paths}</g>`
}

const measureText = ({ value, size, weight, tracking = 0 }) => {
  const font = fonts[weight]
  const run = font.layout(value)
  const scale = size / font.unitsPerEm
  return run.positions.reduce((sum, position, index) => (
    sum + position.xAdvance * scale + (index === run.positions.length - 1 ? 0 : tracking)
  ), 0)
}

const wrapText = ({ value, size, weight, tracking = 0, maxWidth }) => {
  const words = value.split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (line && measureText({ value: candidate, size, weight, tracking }) > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

const overlaySvg = ({ format, message }) => {
  const { width, height, layout } = format
  const headline = message.headline.map((line, index) => glyphPaths({
    value: line,
    x: layout.headline.x,
    y: layout.headline.y + layout.headline.gap * index,
    size: layout.headline.size,
    weight: 800,
    fill: index === 0 ? '#FFFFFF' : '#7CF4D1',
    tracking: -1
  })).join('\n')
  const supportLines = wrapText({
    value: message.support,
    size: layout.support.size,
    weight: 500,
    maxWidth: layout.support.maxWidth
  })
  const support = format.showSupport === false ? '' : supportLines.map((line, index) => glyphPaths({
    value: line,
    x: layout.support.x,
    y: layout.support.y + index * layout.support.gap,
    size: layout.support.size,
    weight: 500,
    fill: '#FFFFFF',
    tracking: 0
  })).join('\n')
  const url = glyphPaths({
    value: matrix.url,
    x: layout.url.x,
    y: layout.url.y,
    size: layout.url.size,
    weight: 700,
    fill: '#FFFFFF',
    tracking: 0.3
  })

  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="copyShade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#04152F" stop-opacity="0.58"/>
      <stop offset="0.42" stop-color="#04152F" stop-opacity="0.26"/>
      <stop offset="0.72" stop-color="#04152F" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2FD7FF"/>
      <stop offset="0.52" stop-color="#7CF4D1"/>
      <stop offset="1" stop-color="#9C63FF"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#copyShade)"/>
  <rect x="${layout.accent.x}" y="${layout.accent.y}" width="${layout.accent.width}" height="${layout.accent.height}" rx="${layout.accent.height / 2}" fill="url(#accent)"/>
  ${headline}
  ${support}
  ${url}
</svg>`)
}

const results = []
await mkdir(path.join(runDir, 'work', 'composition'), { recursive: true })

for (const format of matrix.formats) {
  let plate = sharp(path.join(runDir, format.plate)).toColourspace('srgb')
  if (format.sourceCrop) plate = plate.extract(format.sourceCrop)
  const plateBytes = await plate.resize(format.width, format.height, { fit: 'fill' }).png().toBuffer()
  const logoBytes = await sharp(logoPath).resize({ width: format.layout.logo.width }).png().toBuffer()

  for (const message of matrix.messages) {
    const outputDir = path.join(runDir, 'delivery', format.id)
    await mkdir(outputDir, { recursive: true })
    const overlay = overlaySvg({ format, message })
    const overlayPath = path.join(runDir, 'work', 'composition', `${message.id}-${format.id}-overlay.svg`)
    await writeFile(overlayPath, overlay)
    const filename = `${matrix.campaign}-${message.id}-${format.channel}-${format.id}-v1.jpg`
    const outputPath = path.join(outputDir, filename)
    const outputBytes = await sharp(plateBytes)
      .composite([
        { input: overlay, left: 0, top: 0 },
        { input: logoBytes, left: format.layout.logo.left, top: format.layout.logo.top }
      ])
      .flatten({ background: '#04152F' })
      .toColourspace('srgb')
      .withMetadata({ density: format.density ?? 72 })
      .jpeg({ quality: 92, chromaSubsampling: '4:4:4', progressive: true, mozjpeg: true })
      .toBuffer()
    await writeFile(outputPath, outputBytes)
    const metadata = await sharp(outputBytes).metadata()
    results.push({
      id: `${message.id}-${format.id}`,
      messageId: message.id,
      formatId: format.id,
      channel: format.channel,
      releaseClass: format.releaseClass,
      brandMode: format.brandMode,
      density: format.density ?? 72,
      maxBytes: format.maxBytes,
      requiresVendorIcc: format.requiresVendorIcc ?? false,
      file: path.relative(runDir, outputPath),
      overlay: path.relative(runDir, overlayPath),
      sourcePlate: format.plate,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      colourspace: metadata.space,
      bytes: outputBytes.length,
      sha256: createHash('sha256').update(outputBytes).digest('hex'),
      exactCopy: {
        headline: message.headline,
        support: message.support,
        url: matrix.url
      }
    })
  }
}

await writeFile(
  path.join(runDir, 'manifests', '05-composed-campaign.json'),
  `${JSON.stringify({ stage: 'deterministic-composition', logo: 'public/branding/logo-negative.svg', renderer: 'sharp + fontkit outlined Poppins', results }, null, 2)}\n`
)
process.stdout.write(`Composed ${results.length} release assets\n`)
