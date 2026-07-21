import 'server-only'

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { config as loadEnv } from 'dotenv'
import sharp from 'sharp'

import { runFalModel } from '@/lib/ai/fal'

loadEnv({ path: path.join(process.cwd(), '.env.local') })

interface PromptSpec {
  model: string
  source: string
  output: string
  prompt: string
}

interface SeedreamOutput {
  images?: Array<{ url: string; width?: number; height?: number }>
  seed?: number
}

const runDir = path.join(process.cwd(), 'ai-generations', '2026-07-18_high-frequency-campaign-e2e')

const main = async () => {
  const spec = JSON.parse(await readFile(path.join(runDir, 'prompts', 'pro-anchor.json'), 'utf8')) as PromptSpec
  const inputBytes = await readFile(path.join(runDir, spec.source))
  const inputSha256 = createHash('sha256').update(inputBytes).digest('hex')
  const dataUri = `data:image/png;base64,${inputBytes.toString('base64')}`
  const startedAt = new Date().toISOString()
  const startedMs = Date.now()

  const result = await runFalModel<SeedreamOutput>({
    model: spec.model,
    input: {
      prompt: spec.prompt,
      image_urls: [dataUri],
      image_size: { width: 1600, height: 2000 },
      num_images: 1,
      output_format: 'png',
      enable_safety_checker: true
    },
    pollTimeoutMs: 600_000
  })

  if (!result.ok || !result.output?.images?.[0]?.url) {
    throw new Error(result.errorDetail ?? `Seedream Pro failed with HTTP ${result.httpStatus}`)
  }

  const response = await fetch(result.output.images[0].url)
  if (!response.ok) throw new Error(`Seedream Pro output download failed with HTTP ${response.status}`)
  const outputBytes = Buffer.from(await response.arrayBuffer())
  const outputPath = path.join(runDir, spec.output)
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, outputBytes)
  const metadata = await sharp(outputBytes).metadata()

  const manifest = {
    stage: 'develop-anchor',
    source: spec.source,
    sourceSha256: inputSha256,
    transport: 'base64 data URI; not persisted',
    output: spec.output,
    model: spec.model,
    requestId: result.requestId,
    providerLatencyMs: result.latencyMs,
    wallClockMs: Date.now() - startedMs,
    startedAt,
    completedAt: new Date().toISOString(),
    seed: result.output.seed ?? null,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    bytes: outputBytes.length,
    sha256: createHash('sha256').update(outputBytes).digest('hex'),
    prompt: spec.prompt
  }

  await writeFile(path.join(runDir, 'manifests', '03-pro-anchor.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  process.stdout.write(`Seedream Pro anchor saved to ${spec.output}\n`)
}

main().catch(error => {
  process.stderr.write(`${(error as Error).message}\n`)
  process.exit(1)
})
