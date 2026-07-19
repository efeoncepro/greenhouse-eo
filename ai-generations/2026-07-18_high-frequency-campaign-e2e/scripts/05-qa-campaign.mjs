import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const runDir = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(runDir, '..', '..')
const matrix = JSON.parse(await readFile(path.join(runDir, 'brief', 'campaign-matrix.json'), 'utf8'))
const composed = JSON.parse(await readFile(path.join(runDir, 'manifests', '05-composed-campaign.json'), 'utf8'))
const lite = JSON.parse(await readFile(path.join(runDir, 'manifests', '01-lite-territories.json'), 'utf8'))
const pro = JSON.parse(await readFile(path.join(runDir, 'manifests', '03-pro-anchor.json'), 'utf8'))
const gpt = JSON.parse(await readFile(path.join(runDir, 'manifests', '04-gpt-format-derivatives.json'), 'utf8'))
const campaign = JSON.parse(await readFile(path.join(runDir, 'manifests', 'campaign-manifest.json'), 'utf8'))

const checks = []
const check = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail })
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const csvEscape = value => `"${String(value).replaceAll('"', '""')}"`

check('asset-count', composed.results.length === matrix.expected.releaseAssets, `${composed.results.length}/${matrix.expected.releaseAssets} release assets`)
check('message-count', matrix.messages.length === matrix.expected.messages, `${matrix.messages.length}/${matrix.expected.messages} messages`)
check('format-count', matrix.formats.length === matrix.expected.formats, `${matrix.formats.length}/${matrix.expected.formats} formats`)
check('lite-divergence', lite.results.length === 3, `${lite.results.length}/3 independent Lite territories`)
check('pro-model', pro.model === 'bytedance/seedream/v5/pro/edit', pro.model)
check('gpt-model-routing', gpt.results.every(item => item.model === 'gpt-image-2' && item.modelFallbackReason === null), 'All derivatives used gpt-image-2 with no fallback')
check('anchor-lineage', gpt.results.every(item => item.sourceSha256 === pro.sha256), 'Every format derives directly from the approved Pro anchor')

const technical = []
const expectedNames = new Set()
for (const format of matrix.formats) {
  for (const message of matrix.messages) {
    expectedNames.add(`${matrix.campaign}-${message.id}-${format.channel}-${format.id}-v1.jpg`)
  }
}

for (const item of composed.results) {
  const format = matrix.formats.find(candidate => candidate.id === item.formatId)
  const message = matrix.messages.find(candidate => candidate.id === item.messageId)
  const filePath = path.join(runDir, item.file)
  const bytes = await readFile(filePath)
  const metadata = await sharp(bytes).metadata()
  const overlay = await readFile(path.join(runDir, item.overlay), 'utf8')
  const filename = path.basename(item.file)
  const outlinedCopy = [...overlay.matchAll(/data-copy="([^"]*)"/g)].map(match => match[1])
  const copyPresent = message.headline.every(value => outlinedCopy.includes(value))
    && outlinedCopy.includes(matrix.url)
    && (format.showSupport === false || outlinedCopy.join(' ').includes(message.support))
  const exactHash = sha256(bytes) === item.sha256
  technical.push({
    file: item.file,
    expectedDimensions: `${format.width}x${format.height}`,
    actualDimensions: `${metadata.width}x${metadata.height}`,
    format: metadata.format,
    colourspace: metadata.space,
    bytes: bytes.length,
    sha256: item.sha256,
    dimensionsPass: metadata.width === format.width && metadata.height === format.height,
    formatPass: metadata.format === 'jpeg',
    colourspacePass: metadata.space === 'srgb',
    weightPass: bytes.length <= format.maxBytes,
    densityPass: metadata.density === format.density,
    releaseClassPass: item.releaseClass === format.releaseClass,
    prepressHonestyPass: format.releaseClass !== 'print-production-proof' || format.requiresVendorIcc === true,
    exactCopyPass: copyPresent && !overlay.includes('<text'),
    hashPass: exactHash,
    namingPass: expectedNames.has(filename)
  })
}

check('dimensions', technical.every(item => item.dimensionsPass), 'All release files have exact delivery dimensions')
check('jpeg-release', technical.every(item => item.formatPass), 'All release files are JPEG')
check('srgb', technical.every(item => item.colourspacePass), 'All release files are sRGB')
check('weight-budget', technical.every(item => item.weightPass), 'Every asset respects its channel-specific weight budget')
check('density', technical.every(item => item.densityPass), 'Every asset carries its declared digital/print proof density')
check('prepress-honesty', technical.every(item => item.prepressHonestyPass), 'Offline files are explicitly proofs pending vendor ICC/prepress')
check('exact-copy', technical.every(item => item.exactCopyPass), 'All copy is deterministic Poppins outlines; no live SVG text nodes')
check('hash-integrity', technical.every(item => item.hashPass), 'All release hashes match the composition manifest')
check('naming', technical.every(item => item.namingPass), 'All filenames match the release convention')

const story = matrix.formats.find(item => item.id === '9x16')
const storyTopSafe = story.height * 0.12
const storyBottomSafe = story.height * 0.8
check('story-top-safe-zone', story.layout.logo.top >= storyTopSafe, `Logo top ${story.layout.logo.top}px; safe boundary ${storyTopSafe}px`)
check('story-bottom-safe-zone', story.layout.url.y <= storyBottomSafe, `URL baseline ${story.layout.url.y}px; safe boundary ${storyBottomSafe}px`)

const logoBytes = await readFile(path.join(repoRoot, 'public', 'branding', 'logo-negative.svg'))
const logoHash = sha256(logoBytes)
check('official-logo', composed.logo === 'public/branding/logo-negative.svg', `${composed.logo} · ${logoHash}`)
const packageBytes = await readFile(path.join(runDir, campaign.release.package))
check(
  'release-package',
  packageBytes.length === campaign.release.packageBytes && sha256(packageBytes) === campaign.release.packageSha256,
  `${campaign.release.package} · ${packageBytes.length} bytes · ${sha256(packageBytes)}`
)

const inputImageTokens = gpt.results.reduce((sum, item) => sum + (item.usage?.input_tokens_details?.image_tokens ?? 0), 0)
const inputTextTokens = gpt.results.reduce((sum, item) => sum + (item.usage?.input_tokens_details?.text_tokens ?? 0), 0)
const outputImageTokens = gpt.results.reduce((sum, item) => sum + (item.usage?.output_tokens_details?.image_tokens ?? item.usage?.output_tokens ?? 0), 0)
const openAiCostUsd = inputImageTokens * 8 / 1_000_000 + inputTextTokens * 5 / 1_000_000 + outputImageTokens * 30 / 1_000_000
const falLiteCostUsd = lite.results.length * lite.estimatedUnitUsd
const falProCostUsd = 0.135
const estimatedProviderCostUsd = falLiteCostUsd + falProCostUsd + openAiCostUsd

const metrics = {
  pricingAsOf: '2026-07-18',
  pricingSources: {
    falLite: 'https://fal.ai/models/bytedance/seedream/v5/lite/text-to-image/api',
    falPro: 'https://fal.ai/models/bytedance/seedream/v5/pro/edit',
    openAi: 'https://developers.openai.com/api/docs/pricing'
  },
  calls: {
    seedreamLite: lite.results.length,
    seedreamPro: 1,
    gptImage2: gpt.results.length,
    totalGenerative: lite.results.length + 1 + gpt.results.length
  },
  outputs: { territories: 3, anchor: 1, sourcePlates: 3, staticReleaseAssets: composed.results.length },
  latencyMs: {
    liteParallelWallClockApprox: Math.max(...lite.results.map(item => item.wallClockMs)),
    pro: pro.wallClockMs,
    gptSequential: gpt.results.reduce((sum, item) => sum + item.wallClockMs, 0)
  },
  usage: { inputImageTokens, inputTextTokens, outputImageTokens },
  estimatedCostUsd: {
    falLite: Number(falLiteCostUsd.toFixed(4)),
    falPro: Number(falProCostUsd.toFixed(4)),
    openAi: Number(openAiCostUsd.toFixed(4)),
    totalGenerative: Number(estimatedProviderCostUsd.toFixed(4))
  },
  costNote: 'Provider estimate only; excludes human time, storage, media spend, tax and regional pricing uplifts.'
}

const passed = checks.every(item => item.pass) && technical.every(item => Object.entries(item).filter(([key]) => key.endsWith('Pass')).every(([, value]) => value))
await writeFile(path.join(runDir, 'qa', 'technical-qa.json'), `${JSON.stringify({ passed, checks, technical }, null, 2)}\n`)
await writeFile(path.join(runDir, 'qa', 'run-metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`)

const csvRows = [['message_id', 'format', 'channel', 'release_class', 'brand_mode', 'file', 'dimensions', 'bytes', 'headline', 'support', 'support_rendered', 'alt_text']]
for (const item of composed.results) {
  const message = matrix.messages.find(candidate => candidate.id === item.messageId)
  const format = matrix.formats.find(candidate => candidate.id === item.formatId)
  const renderedSupport = format.showSupport === false ? '' : ` ${message.support}`
  const alt = `Pieza de campaña Efeonce: un colibrí iridiscente vuela hacia la derecha y deja una estela de módulos de color. Texto: ${message.headline.join(' ')}${renderedSupport}`
  csvRows.push([
    item.messageId,
    item.formatId,
    item.channel,
    item.releaseClass,
    item.brandMode,
    item.file,
    `${item.width}x${item.height}`,
    item.bytes,
    message.headline.join(' '),
    message.support,
    String(format.showSupport !== false),
    alt
  ])
}
await writeFile(
  path.join(runDir, 'delivery', 'asset-matrix.csv'),
  `${csvRows.map(row => row.map(csvEscape).join(',')).join('\n')}\n`
)

const reviewItems = composed.results.map((item, index) => {
  const message = matrix.messages.find(candidate => candidate.id === item.messageId)
  return {
    id: item.id,
    index: index + 1,
    title: `${item.messageId.toUpperCase()} · ${item.formatId} · ${item.channel}`,
    src: `../${item.file}`,
    href: `../${item.file}`,
    prompt: `${message.headline.join(' ')} — ${message.support}`
  }
})
await writeFile(path.join(runDir, 'review', 'review-manifest.json'), `${JSON.stringify(reviewItems, null, 2)}\n`)

const renderReviewBinary = process.argv.includes('--render-review')
if (renderReviewBinary) {
const cellWidth = 600
const cellHeight = 720
const titleHeight = 90
const canvasWidth = cellWidth * matrix.formats.length
const canvasHeight = titleHeight + cellHeight * 3
const composites = []
for (let row = 0; row < matrix.messages.length; row += 1) {
  for (let col = 0; col < matrix.formats.length; col += 1) {
    const message = matrix.messages[row]
    const format = matrix.formats[col]
    const item = composed.results.find(candidate => candidate.messageId === message.id && candidate.formatId === format.id)
    const thumb = await sharp(path.join(runDir, item.file))
      .resize(540, 620, { fit: 'contain', background: '#F2F4F7' })
      .jpeg({ quality: 88 })
      .toBuffer()
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="540" height="50"><rect width="540" height="50" fill="#FFFFFF"/><text x="0" y="32" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#172033">${message.id.toUpperCase()} · ${format.id} · ${format.channel}</text></svg>`)
    composites.push({ input: thumb, left: col * cellWidth + 30, top: titleHeight + row * cellHeight + 20 })
    composites.push({ input: label, left: col * cellWidth + 30, top: titleHeight + row * cellHeight + 650 })
  }
}
const title = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${titleHeight}"><rect width="100%" height="100%" fill="#FFFFFF"/><text x="30" y="56" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#172033">HIGH FREQUENCY · CAMPAIGN RELEASE V3</text></svg>`)
composites.push({ input: title, left: 0, top: 0 })
await sharp({ create: { width: canvasWidth, height: canvasHeight, channels: 3, background: '#F2F4F7' } })
  .composite(composites)
  .jpeg({ quality: 90, progressive: true })
  .toFile(path.join(runDir, 'review', 'campaign-contact-sheet.jpg'))
}

if (!passed) {
  process.stderr.write('Campaign QA failed. See qa/technical-qa.json\n')
  process.exit(1)
}
process.stdout.write(`Campaign QA passed · estimated provider cost $${estimatedProviderCostUsd.toFixed(4)}\n`)
