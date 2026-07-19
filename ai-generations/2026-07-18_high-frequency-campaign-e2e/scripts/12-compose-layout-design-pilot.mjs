import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as fontkit from 'fontkit'
import sharp from 'sharp'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const runDir = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(runDir, '..', '..')
const spec = JSON.parse(await readFile(path.join(runDir, 'brief', 'layout-design-pilot.json'), 'utf8'))
const logoPath = path.join(repoRoot, 'public', 'branding', 'logo-negative.svg')
const fonts = {
  500: fontkit.openSync(path.join(repoRoot, 'src', 'assets', 'fonts', 'Poppins-Medium.ttf')),
  700: fontkit.openSync(path.join(repoRoot, 'src', 'assets', 'fonts', 'Poppins-Bold.ttf')),
  800: fontkit.openSync(path.join(repoRoot, 'src', 'assets', 'fonts', 'Poppins-ExtraBold.ttf'))
}

const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

const glyphPaths = ({ value, x, y, size, weight, fill, tracking = 0, opacity = 1 }) => {
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
  return `<g data-copy="${escapeXml(value)}" transform="translate(${x} ${y})" fill="${fill}" opacity="${opacity}">${paths}</g>`
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

const underlaySvg = format => {
  const { width, height, layout } = format
  const isLandscape = format.id === '16x9'
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="copyShade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#03142D" stop-opacity="0.78"/>
      <stop offset="${isLandscape ? 0.43 : 0.58}" stop-color="#03142D" stop-opacity="0.45"/>
      <stop offset="${isLandscape ? 0.66 : 0.82}" stop-color="#03142D" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#03142D" stop-opacity="0.42"/>
      <stop offset="0.52" stop-color="#03142D" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="frequency" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#2FD7FF"/>
      <stop offset="0.5" stop-color="#7CF4D1"/>
      <stop offset="1" stop-color="#9C63FF"/>
    </linearGradient>
    <radialGradient id="vignette" cx="55%" cy="47%" r="78%">
      <stop offset="0.62" stop-color="#020B1B" stop-opacity="0"/>
      <stop offset="1" stop-color="#020B1B" stop-opacity="0.28"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#copyShade)"/>
  <rect width="${width}" height="${height}" fill="url(#topShade)"/>
  <rect width="${width}" height="${height}" fill="url(#vignette)"/>
  <rect x="${layout.rail.x}" y="${layout.rail.y}" width="${layout.rail.width}" height="${layout.rail.height}" rx="${layout.rail.width / 2}" fill="url(#frequency)"/>
  <circle cx="${layout.rail.x + layout.rail.width / 2}" cy="${layout.rail.y + layout.rail.height + 18}" r="${layout.rail.width / 2}" fill="#7CF4D1" opacity="0.72"/>
  <circle cx="${layout.rail.x + layout.rail.width / 2}" cy="${layout.rail.y + layout.rail.height + 31}" r="${layout.rail.width / 3}" fill="#2FD7FF" opacity="0.48"/>
</svg>`)
}

const copySvg = format => {
  const { width, height, layout } = format
  const message = spec.message
  const headline = message.headline.map((line, index) => glyphPaths({
    value: line,
    x: layout.headline.x,
    y: layout.headline.y + layout.headline.gap * index,
    size: layout.headline.size,
    weight: 800,
    fill: index === 0 ? '#FFFFFF' : '#7CF4D1',
    tracking: layout.headline.tracking
  })).join('\n')
  const supportLines = wrapText({
    value: message.support,
    size: layout.support.size,
    weight: 500,
    maxWidth: layout.support.maxWidth
  })
  const support = supportLines.map((line, index) => glyphPaths({
    value: line,
    x: layout.support.x,
    y: layout.support.y + layout.support.gap * index,
    size: layout.support.size,
    weight: 500,
    fill: '#F4F8FF'
  })).join('\n')

  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${glyphPaths({
    value: message.kicker,
    x: layout.kicker.x,
    y: layout.kicker.y,
    size: layout.kicker.size,
    weight: 700,
    fill: '#B8C9DE',
    tracking: layout.kicker.tracking,
    opacity: 0.92
  })}
  ${headline}
  <g data-full-copy="${escapeXml(message.support)}">
    ${support}
  </g>
  <rect x="${layout.rule.x}" y="${layout.rule.y}" width="${layout.rule.width}" height="${layout.rule.height}" rx="${layout.rule.height / 2}" fill="#B8C9DE" opacity="0.38"/>
  ${glyphPaths({
    value: message.url,
    x: layout.url.x,
    y: layout.url.y,
    size: layout.url.size,
    weight: 700,
    fill: '#FFFFFF',
    tracking: 0.25
  })}
</svg>`)
}

const results = []
await mkdir(path.join(runDir, 'work', 'layout-design', 'composition'), { recursive: true })
await mkdir(path.join(runDir, 'delivery', 'layout-design'), { recursive: true })

for (const format of spec.formats) {
  const sourcePath = path.join(runDir, format.finishedPlate)
  const sourceBytes = await readFile(sourcePath)
  const plateBytes = await sharp(sourceBytes)
    .resize(format.width, format.height, { fit: 'fill' })
    .toColourspace('srgb')
    .png()
    .toBuffer()
  const underlay = underlaySvg(format)
  const copy = copySvg(format)
  const logoBytes = await sharp(logoPath).resize({ width: format.layout.logo.width }).png().toBuffer()
  const underlayPath = path.join(runDir, 'work', 'layout-design', 'composition', `${format.id}-underlay.png`)
  const overlayPath = path.join(runDir, 'work', 'layout-design', 'composition', `${format.id}-copy.svg`)
  const underlayBytes = await sharp(plateBytes)
    .composite([{ input: underlay, left: 0, top: 0 }])
    .toColourspace('srgb')
    .png()
    .toBuffer()
  await writeFile(underlayPath, underlayBytes)
  await writeFile(overlayPath, copy)

  const outputPath = path.join(runDir, format.output)
  const outputBytes = await sharp(underlayBytes)
    .composite([
      { input: copy, left: 0, top: 0 },
      { input: logoBytes, left: format.layout.logo.left, top: format.layout.logo.top }
    ])
    .flatten({ background: '#03142D' })
    .toColourspace('srgb')
    .withMetadata({ density: 72 })
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4', progressive: true, mozjpeg: true })
    .toBuffer()
  await writeFile(outputPath, outputBytes)
  const metadata = await sharp(outputBytes).metadata()

  results.push({
    id: format.id,
    anchorId: spec.anchorId,
    anchorRevision: spec.anchorRevision,
    topology: { kind: 'star', derivationParent: 'anchor' },
    brandMode: spec.brandMode,
    channelMode: spec.channelMode,
    sourcePlate: format.finishedPlate,
    sourcePlateSha256: sha256(sourceBytes),
    underlay: path.relative(runDir, underlayPath),
    copyOverlay: path.relative(runDir, overlayPath),
    output: format.output,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    colourspace: metadata.space,
    bytes: outputBytes.length,
    sha256: sha256(outputBytes),
    copyField: format.copyField,
    exactCopy: spec.message,
    layout: format.layout
  })
}

const byId = Object.fromEntries(results.map(item => [item.id, item]))
const landscape = await sharp(path.join(runDir, byId['16x9'].output)).resize(1200, 675).toBuffer()
const feed = await sharp(path.join(runDir, byId['4x5'].output)).resize(640, 800).toBuffer()
const story = await sharp(path.join(runDir, byId['9x16'].output)).resize(450, 800).toBuffer()
const contactSheet = await sharp({
  create: { width: 2000, height: 1680, channels: 3, background: '#07152B' }
}).composite([
  { input: landscape, left: 400, top: 55 },
  { input: feed, left: 285, top: 805 },
  { input: story, left: 1170, top: 805 }
]).jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true }).toBuffer()
const contactSheetPath = path.join(runDir, 'review', 'layout-design-pilot-contact-sheet.jpg')
await writeFile(contactSheetPath, contactSheet)

await writeFile(
  path.join(runDir, 'manifests', '13-layout-design-composition.json'),
  `${JSON.stringify({
    stage: 'layout-design-deterministic-composition',
    renderer: 'sharp + fontkit outlined Poppins',
    logo: 'public/branding/logo-negative.svg',
    contactSheet: path.relative(runDir, contactSheetPath),
    results
  }, null, 2)}\n`
)
process.stdout.write(`Composed ${results.length} layout-design masters\n`)
