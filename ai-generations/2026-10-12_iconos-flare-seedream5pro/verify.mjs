// Readback of original outputs and receipts, not a test of the generation implementation.
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.dirname(fileURLToPath(import.meta.url))
const icons = ['01-lupa', '02-grafico', '03-carpeta', '04-escudo']
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const manifest = { date: '2026-10-12', status: 'internal-material-comparison', samePromptsPerPair: true,
  references: [], requestedSize: '2048x2048', background: 'opaque neutral studio', runs: [],
  costBasis: 'Standard OpenAI tokens + effective BytePlus account image rates; estimated, not invoice',
  totalEstimatedUsd: { flare: 0, seedream: 0 }, noAutomaticRetries: true }

for (const lane of ['flare', 'seedream']) {
  for (const icon of icons) {
    const relative = `${lane}/${icon}.png`
    const bytes = await fs.readFile(path.join(root, relative))
    const meta = await sharp(bytes).metadata()
    if (meta.format !== 'png' || meta.width !== 2048 || meta.height !== 2048) throw new Error(`Wrong contract: ${relative}`)
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    let transparentPixels = 0
    let alphaMin = 255
    for (let i = 3; i < data.length; i += info.channels) {
      alphaMin = Math.min(alphaMin, data[i])
      if (data[i] < 255) transparentPixels++
    }
    const run = JSON.parse(await fs.readFile(path.join(root, 'logs', `${lane}-${icon}.json`), 'utf8'))
    if (run.exitCode !== 0) throw new Error(`Unsuccessful request: ${relative}`)
    let usage, estimatedUsd, requestId = null
    if (lane === 'flare') {
      const log = await fs.readFile(path.join(root, 'logs', `${lane}-${icon}.log`), 'utf8')
      const m = /usage: in (\d+) \(img (\d+) · txt (\d+)\) · out (\d+) · total (\d+)/.exec(log)
      if (!m) throw new Error(`Missing OpenAI usage: ${icon}`)
      usage = { inputTokens: +m[1], imageInputTokens: +m[2], textInputTokens: +m[3], outputTokens: +m[4], totalTokens: +m[5] }
      estimatedUsd = (usage.imageInputTokens * 8 + usage.textInputTokens * 5 + usage.outputTokens * 30) / 1e6
    } else {
      const receipt = JSON.parse(await fs.readFile(path.join(root, 'receipts', icon, 'receipt.json'), 'utf8'))
      usage = receipt.usage; estimatedUsd = receipt.estimatedUsd; requestId = receipt.requestId
      if (receipt.model !== 'dola-seedream-5-0-pro-260628') throw new Error(`Wrong Seedream model: ${icon}`)
    }
    manifest.totalEstimatedUsd[lane] += estimatedUsd
    const prompt = await fs.readFile(path.join(root, 'prompts', `${icon}.txt`))
    manifest.runs.push({ lane, icon, model: lane === 'flare' ? 'gpt-image-2.5-flare' : 'dola-seedream-5-0-pro-260628',
      quality: lane === 'flare' ? 'max' : 'standard', file: relative, pngSha256: hash(bytes),
      promptSha256: hash(prompt), bytes: bytes.length, format: meta.format, width: meta.width, height: meta.height,
      nativeChannels: meta.channels, nativeHasAlpha: meta.hasAlpha, alphaMin, transparentPixels,
      elapsedSeconds: run.elapsedSeconds, usage, estimatedUsd, requestId })
  }
}
for (const lane of ['flare', 'seedream']) manifest.totalEstimatedUsd[lane] = +manifest.totalEstimatedUsd[lane].toFixed(6)
await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify({ outputs: manifest.runs.length, contract: 'all PNG 2048x2048, original opaque outputs', totalEstimatedUsd: manifest.totalEstimatedUsd }))
