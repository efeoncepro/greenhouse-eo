import 'server-only'

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { config as loadEnv } from 'dotenv'
import sharp from 'sharp'

import { runFalModel } from '@/lib/ai/fal'

loadEnv({ path: path.join(process.cwd(), '.env.local') })

interface SourceCrop {
  left: number
  top: number
  width: number
  height: number
}

interface FormatSpec {
  id: string
  workingWidth: number
  workingHeight: number
  sourcePlate: string
  sourceCrop: SourceCrop | null
  finishedPlate: string
}

interface PilotSpec {
  anchorId: string
  anchorRevision: number
  formats: FormatSpec[]
}

interface PromptSpec {
  id: string
  model: string
  prompt: string
  estimatedCostUsd: number
}

interface SeedreamOutput {
  images?: Array<{ url: string; width?: number; height?: number }>
  seed?: number
}

const runDir = path.join(process.cwd(), 'ai-generations', '2026-07-18_high-frequency-campaign-e2e')
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

const main = async () => {
  const pilot = JSON.parse(
    await readFile(path.join(runDir, 'brief', 'layout-design-pilot.json'), 'utf8')
  ) as PilotSpec
  const prompts = JSON.parse(
    await readFile(path.join(runDir, 'prompts', 'layout-design-finish.json'), 'utf8')
  ) as PromptSpec[]
  const results = []

  for (const format of pilot.formats) {
    const prompt = prompts.find(item => item.id === format.id)
    if (!prompt) throw new Error(`Missing finishing prompt for ${format.id}`)

    const sourcePath = path.join(runDir, format.sourcePlate)
    const sourceBytes = await readFile(sourcePath)
    let prepared = sharp(sourceBytes).toColourspace('srgb')
    if (format.sourceCrop) prepared = prepared.extract(format.sourceCrop)
    const preparedBytes = await prepared
      .resize(format.workingWidth, format.workingHeight, { fit: 'fill' })
      .jpeg({ quality: 94, chromaSubsampling: '4:4:4', mozjpeg: true })
      .toBuffer()
    const dataUri = `data:image/jpeg;base64,${preparedBytes.toString('base64')}`
    const startedAt = new Date().toISOString()
    const startedMs = Date.now()

    process.stdout.write(`Finishing ${format.id} with Seedream 5 Pro…\n`)
    const result = await runFalModel<SeedreamOutput>({
      model: prompt.model,
      input: {
        prompt: prompt.prompt,
        image_urls: [dataUri],
        image_size: { width: format.workingWidth, height: format.workingHeight },
        num_images: 1,
        output_format: 'png',
        enable_safety_checker: true
      },
      pollTimeoutMs: 600_000
    })

    if (!result.ok || !result.output?.images?.[0]?.url) {
      throw new Error(result.errorDetail ?? `Seedream Pro ${format.id} failed with HTTP ${result.httpStatus}`)
    }

    const response = await fetch(result.output.images[0].url)
    if (!response.ok) throw new Error(`Seedream Pro ${format.id} download failed with HTTP ${response.status}`)
    const outputBytes = Buffer.from(await response.arrayBuffer())
    const outputPath = path.join(runDir, format.finishedPlate)
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, outputBytes)
    const metadata = await sharp(outputBytes).metadata()

    results.push({
      id: format.id,
      stage: 'finish',
      topology: { kind: 'star', anchorRevision: pilot.anchorRevision, derivationParent: 'anchor' },
      anchorId: pilot.anchorId,
      source: format.sourcePlate,
      sourceSha256: sha256(sourceBytes),
      preparedInputSha256: sha256(preparedBytes),
      transport: 'ephemeral JPEG data URI; prepared working copy not persisted',
      output: format.finishedPlate,
      model: prompt.model,
      requestId: result.requestId,
      providerLatencyMs: result.latencyMs,
      wallClockMs: Date.now() - startedMs,
      startedAt,
      completedAt: new Date().toISOString(),
      seed: result.output.seed ?? null,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      bytes: outputBytes.length,
      sha256: sha256(outputBytes),
      estimatedCostUsd: prompt.estimatedCostUsd,
      delta: 'material integration and premium photographic cohesion only',
      locks: ['one complete bird', 'pose and geometry', 'copy field', 'navy palette', 'tile-wake trajectory'],
      prompt: prompt.prompt
    })
  }

  await writeFile(
    path.join(runDir, 'manifests', '12-layout-design-finish.json'),
    `${JSON.stringify({ stage: 'layout-design-generative-finish', results }, null, 2)}\n`
  )
  process.stdout.write(`Finished ${results.length} layout-design plates\n`)
}

main().catch(error => {
  process.stderr.write(`${(error as Error).message}\n`)
  process.exit(1)
})
