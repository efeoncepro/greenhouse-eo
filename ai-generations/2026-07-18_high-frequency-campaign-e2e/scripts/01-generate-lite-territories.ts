import 'server-only'

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { config as loadEnv } from 'dotenv'
import sharp from 'sharp'

import { runFalModel } from '@/lib/ai/fal'

loadEnv({ path: path.join(process.cwd(), '.env.local') })

interface Territory {
  id: string
  title: string
  prompt: string
}

interface FalImage {
  url: string
  width?: number
  height?: number
}

interface SeedreamOutput {
  images?: FalImage[]
  seed?: number
}

const runDir = path.join(process.cwd(), 'ai-generations', '2026-07-18_high-frequency-campaign-e2e')
const outputDir = path.join(runDir, 'work', 'territories')

const generate = async (territory: Territory) => {
  const startedAt = new Date().toISOString()
  const startedMs = Date.now()
  const result = await runFalModel<SeedreamOutput>({
    model: 'bytedance/seedream/v5/lite/text-to-image',
    input: {
      prompt: territory.prompt,
      image_size: { width: 1792, height: 2240 },
      num_images: 1,
      max_images: 1,
      enable_safety_checker: true
    },
    pollTimeoutMs: 600_000
  })

  if (!result.ok || !result.output?.images?.[0]?.url) {
    throw new Error(`${territory.id}: ${result.errorDetail ?? `HTTP ${result.httpStatus}`}`)
  }

  const response = await fetch(result.output.images[0].url)
  if (!response.ok) throw new Error(`${territory.id}: output download HTTP ${response.status}`)

  const bytes = Buffer.from(await response.arrayBuffer())
  const file = `${territory.id}.png`
  const metadata = await sharp(bytes).metadata()
  await writeFile(path.join(outputDir, file), bytes)

  return {
    id: territory.id,
    title: territory.title,
    file: `work/territories/${file}`,
    model: 'bytedance/seedream/v5/lite/text-to-image',
    requestId: result.requestId ?? null,
    providerLatencyMs: result.latencyMs,
    wallClockMs: Date.now() - startedMs,
    startedAt,
    completedAt: new Date().toISOString(),
    seed: result.output.seed ?? null,
    width: metadata.width ?? result.output.images[0].width ?? null,
    height: metadata.height ?? result.output.images[0].height ?? null,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    prompt: territory.prompt
  }
}

const main = async () => {
  const prompts = JSON.parse(
    await readFile(path.join(runDir, 'prompts', 'lite-territories.json'), 'utf8')
  ) as Territory[]
  await mkdir(outputDir, { recursive: true })

  const results = await Promise.all(prompts.map(generate))
  await writeFile(
    path.join(runDir, 'manifests', '01-lite-territories.json'),
    `${JSON.stringify({ stage: 'diverge', pricingAsOf: '2026-07-18', estimatedUnitUsd: 0.035, results }, null, 2)}\n`
  )
  process.stdout.write(`Generated ${results.length} Seedream Lite territories\n`)
}

main().catch(error => {
  process.stderr.write(`${(error as Error).message}\n`)
  process.exit(1)
})
