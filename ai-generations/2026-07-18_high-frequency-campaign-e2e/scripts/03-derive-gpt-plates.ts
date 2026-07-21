import 'server-only'

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { config as loadEnv } from 'dotenv'
import sharp from 'sharp'

import { editOpenAIImage, type OpenAIImageSize } from '@/lib/ai/openai-image'

loadEnv({ path: path.join(process.cwd(), '.env.local') })

interface DerivativeSpec {
  id: string
  size: OpenAIImageSize
  output: string
  prompt: string
}

const runDir = path.join(process.cwd(), 'ai-generations', '2026-07-18_high-frequency-campaign-e2e')
const source = path.join(runDir, 'work', 'anchor', 'high-frequency-anchor-v1.png')

const main = async () => {
  const specs = JSON.parse(
    await readFile(path.join(runDir, 'prompts', 'gpt-format-derivatives.json'), 'utf8')
  ) as DerivativeSpec[]
  const sourceBytes = await readFile(source)
  const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex')
  const results = []

  for (const spec of specs) {
    const startedAt = new Date().toISOString()
    const startedMs = Date.now()
    process.stdout.write(`Deriving ${spec.id} with GPT Image 2…\n`)
    const result = await editOpenAIImage({
      prompt: spec.prompt,
      image: { path: source },
      model: 'gpt-image-2',
      size: spec.size,
      quality: 'high',
      format: 'png',
      background: 'opaque',
      numberOfImages: 1,
      timeoutMs: 420_000
    })
    const bytes = Buffer.from(result.imageBytesBase64, 'base64')
    const outputPath = path.join(runDir, spec.output)
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, bytes)
    const metadata = await sharp(bytes).metadata()
    results.push({
      id: spec.id,
      source: 'work/anchor/high-frequency-anchor-v1.png',
      sourceSha256,
      output: spec.output,
      operation: result.operation,
      model: result.model,
      requestedModel: result.requestedModel,
      modelFallbackReason: result.modelFallbackReason,
      size: result.size,
      quality: result.quality,
      format: result.format,
      background: result.background,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      usage: result.usage,
      secretSource: result.secretSource,
      startedAt,
      completedAt: new Date().toISOString(),
      wallClockMs: Date.now() - startedMs,
      prompt: spec.prompt
    })
  }

  await writeFile(
    path.join(runDir, 'manifests', '04-gpt-format-derivatives.json'),
    `${JSON.stringify({ stage: 'derive-formats', sourceSha256, results }, null, 2)}\n`
  )
  process.stdout.write(`Generated ${results.length} GPT Image 2 source plates\n`)
}

main().catch(error => {
  process.stderr.write(`${(error as Error).message}\n`)
  process.exit(1)
})
