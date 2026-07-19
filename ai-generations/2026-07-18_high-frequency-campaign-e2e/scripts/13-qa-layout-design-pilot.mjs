import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const runDir = path.resolve(scriptDir, '..')
const spec = JSON.parse(await readFile(path.join(runDir, 'brief', 'layout-design-pilot.json'), 'utf8'))
const manifest = JSON.parse(await readFile(path.join(runDir, 'manifests', '13-layout-design-composition.json'), 'utf8'))
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

const linearChannel = value => {
  const channel = value / 255
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

const relativeLuminance = (red, green, blue) => (
  0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue)
)

const contrast = (lighter, darker) => (lighter + 0.05) / (darker + 0.05)
const mintLuminance = relativeLuminance(0x7C, 0xF4, 0xD1)
const checks = []

const finishMetrics = async format => {
  let source = sharp(path.join(runDir, format.sourcePlate)).toColourspace('srgb')
  if (format.sourceCrop) source = source.extract(format.sourceCrop)
  const sourceData = await source
    .resize(format.workingWidth, format.workingHeight, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer()
  const finishedData = await sharp(path.join(runDir, format.finishedPlate))
    .resize(format.workingWidth, format.workingHeight, { fit: 'fill' })
    .toColourspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer()
  let absoluteDifference = 0
  let sourceChroma = 0
  let finishedChroma = 0
  for (let index = 0; index < sourceData.length; index += 3) {
    absoluteDifference += Math.abs(sourceData[index] - finishedData[index])
    absoluteDifference += Math.abs(sourceData[index + 1] - finishedData[index + 1])
    absoluteDifference += Math.abs(sourceData[index + 2] - finishedData[index + 2])
    sourceChroma += Math.max(sourceData[index], sourceData[index + 1], sourceData[index + 2]) -
      Math.min(sourceData[index], sourceData[index + 1], sourceData[index + 2])
    finishedChroma += Math.max(finishedData[index], finishedData[index + 1], finishedData[index + 2]) -
      Math.min(finishedData[index], finishedData[index + 1], finishedData[index + 2])
  }
  const pixelCount = sourceData.length / 3
  return {
    normalizedMae: absoluteDifference / sourceData.length / 255,
    sourceMeanChroma: sourceChroma / pixelCount / 255,
    finishedMeanChroma: finishedChroma / pixelCount / 255
  }
}

for (const format of spec.formats) {
  const result = manifest.results.find(item => item.id === format.id)
  if (!result) throw new Error(`Missing composition result for ${format.id}`)
  const outputPath = path.join(runDir, result.output)
  const bytes = await readFile(outputPath)
  const metadata = await sharp(bytes).metadata()
  const overlay = await readFile(path.join(runDir, result.copyOverlay), 'utf8')
  const field = {
    left: Math.round(format.copyField.x * format.width),
    top: Math.round(format.copyField.y * format.height),
    width: Math.round(format.copyField.width * format.width),
    height: Math.round(format.copyField.height * format.height)
  }
  const { data, info } = await sharp(path.join(runDir, result.underlay))
    .extract(field)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const luminances = []
  for (let index = 0; index < data.length; index += info.channels) {
    luminances.push(relativeLuminance(data[index], data[index + 1], data[index + 2]))
  }
  luminances.sort((a, b) => a - b)
  const p95 = luminances[Math.floor(luminances.length * 0.95)] ?? 1
  const whiteContrastP95 = contrast(1, p95)
  const mintContrastP95 = contrast(Math.max(mintLuminance, p95), Math.min(mintLuminance, p95))
  const exactCopyPresent = [
    spec.message.kicker,
    ...spec.message.headline,
    spec.message.url
  ].every(value => overlay.includes(`data-copy="${value}"`)) &&
    overlay.includes(`data-full-copy="${spec.message.support}"`)
  const storySafe = format.id !== '9x16' || (
    format.layout.logo.top >= format.height * 0.12 &&
    format.layout.url.y <= format.height * 0.8
  )
  const finishing = await finishMetrics(format)

  const assertions = {
    dimensions: metadata.width === format.width && metadata.height === format.height,
    jpeg: metadata.format === 'jpeg',
    srgb: metadata.space === 'srgb',
    maxBytes: bytes.length <= 5_242_880,
    exactCopyPresent,
    officialLogo: manifest.logo === 'public/branding/logo-negative.svg',
    whiteContrastP95: whiteContrastP95 >= 4.5,
    mintContrastP95: mintContrastP95 >= 3,
    finishDeltaBounded: finishing.normalizedMae <= 0.22,
    storyInterfaceSafe: storySafe,
    manifestHash: sha256(bytes) === result.sha256
  }
  checks.push({
    id: format.id,
    output: result.output,
    bytes: bytes.length,
    width: metadata.width,
    height: metadata.height,
    colourspace: metadata.space,
    copyField: field,
    whiteContrastP95: Number(whiteContrastP95.toFixed(2)),
    mintContrastP95: Number(mintContrastP95.toFixed(2)),
    finishing: {
      normalizedMae: Number(finishing.normalizedMae.toFixed(4)),
      sourceMeanChroma: Number(finishing.sourceMeanChroma.toFixed(4)),
      finishedMeanChroma: Number(finishing.finishedMeanChroma.toFixed(4)),
      relativeChromaChange: Number(((finishing.finishedMeanChroma / finishing.sourceMeanChroma) - 1).toFixed(4))
    },
    assertions,
    pass: Object.values(assertions).every(Boolean)
  })
}

const report = {
  stage: 'layout-design-technical-qa',
  checkedAt: new Date().toISOString(),
  pass: checks.every(item => item.pass),
  checks
}
await writeFile(
  path.join(runDir, 'qa', 'layout-design-pilot-technical.json'),
  `${JSON.stringify(report, null, 2)}\n`
)
if (!report.pass) {
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`)
  process.exit(1)
}
process.stdout.write(`Layout-design technical QA PASS (${checks.length} assets)\n`)
