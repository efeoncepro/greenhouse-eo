import 'server-only'

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { config as loadEnv } from 'dotenv'

import { runFalModel } from '@/lib/ai/fal'

loadEnv({ path: path.join(process.cwd(), '.env.local') })

interface PromptSpec {
  model: string
  source: string
  output: string
  aspectRatio: '9:16' | '16:9'
  duration: number
  brandMode: string
  prompt: string
}

interface OmniOutput {
  video?: {
    url?: string
    content_type?: string
    file_name?: string
    file_size?: number
  }
}

const runDir = path.join(process.cwd(), 'ai-generations', '2026-07-18_high-frequency-campaign-e2e')

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

const main = async () => {
  const spec = JSON.parse(
    await readFile(path.join(runDir, 'prompts', 'omni-off-brand-motion.json'), 'utf8')
  ) as PromptSpec
  const inputBytes = await readFile(path.join(runDir, spec.source))
  const startedAt = new Date().toISOString()
  const startedMs = Date.now()

  const result = await runFalModel<OmniOutput>({
    model: spec.model,
    input: {
      prompt: spec.prompt,
      image_url: `data:image/png;base64,${inputBytes.toString('base64')}`,
      aspect_ratio: spec.aspectRatio,
      duration: spec.duration
    },
    pollTimeoutMs: 900_000,
    pollIntervalMs: 3_000
  })

  if (!result.ok || !result.output?.video?.url) {
    throw new Error(result.errorDetail ?? `Gemini Omni failed with HTTP ${result.httpStatus}`)
  }

  const response = await fetch(result.output.video.url)
  if (!response.ok) throw new Error(`Gemini Omni output download failed with HTTP ${response.status}`)
  const outputBytes = Buffer.from(await response.arrayBuffer())
  const outputPath = path.join(runDir, spec.output)
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, outputBytes)

  const manifest = {
    stage: 'motion-off-brand-proof',
    brandMode: spec.brandMode,
    source: spec.source,
    sourceSha256: sha256(inputBytes),
    transport: 'base64 data URI; not persisted',
    output: spec.output,
    model: spec.model,
    requestId: result.requestId,
    providerLatencyMs: result.latencyMs,
    wallClockMs: Date.now() - startedMs,
    startedAt,
    completedAt: new Date().toISOString(),
    aspectRatio: spec.aspectRatio,
    durationSeconds: spec.duration,
    contentType: result.output.video.content_type ?? null,
    bytes: outputBytes.length,
    sha256: sha256(outputBytes),
    estimatedProviderCostUsd: Number((spec.duration * 0.13).toFixed(2)),
    pricingAsOf: '2026-07-18',
    pricingSource: 'https://fal.ai/models/google/gemini-omni-flash/image-to-video',
    prompt: spec.prompt
  }

  await writeFile(path.join(runDir, 'manifests', '06-omni-off-brand-motion.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  process.stdout.write(`Gemini Omni off-brand motion saved to ${spec.output}\n`)
}

main().catch(error => {
  process.stderr.write(`${(error as Error).message}\n`)
  process.exit(1)
})
