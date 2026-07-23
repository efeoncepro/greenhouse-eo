import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const RUN_ID = '2026-07-22_mural-guacamayas-agency-promo-16x9-seedance-v1'
const ROOT = process.cwd()
const RUN_DIR = path.join(ROOT, 'ai-generations', RUN_ID)
const PROMPT_PATH = path.join(RUN_DIR, 'prompt.md')
const MODEL = 'bytedance/seedance-2.0/reference-to-video'
const OUTPUT_PATH = path.join(RUN_DIR, 'masters', 'art-macaws-agency-promo-16x9-seedance-v1-master.mp4')
const METADATA_PATH = path.join(RUN_DIR, 'masters', 'art-macaws-agency-promo-16x9-seedance-v1-master.metadata.json')
const REFERENCE_VIDEO = path.join(RUN_DIR, 'references', 'art-macaws-v1-reference-626x1112.mp4')
const REFERENCES = [
  path.join(ROOT, 'ai-generations/2026-07-07_mural-guacamayas-hero/keyframe-01-eye.png'),
  path.join(ROOT, 'ai-generations/2026-07-07_mural-guacamayas-hero/keyframe-02-wing-breakout.png'),
  path.join(ROOT, 'ai-generations/2026-07-07_mural-guacamayas-hero/keyframe-03-flight-trails.png')
]

const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex')

const loadAsset = async (filePath: string, mimeType: string) => {
  const bytes = await readFile(filePath)

  return {
    path: filePath,
    bytes,
    mimeType,
    size: bytes.length,
    sha256: sha256(bytes),
    dataUri: `data:${mimeType};base64,${bytes.toString('base64')}`
  }
}

const plan = async () => {
  const video = await loadAsset(REFERENCE_VIDEO, 'video/mp4')
  const images = await Promise.all(REFERENCES.map(filePath => loadAsset(filePath, 'image/png')))

  return {
    runId: RUN_ID,
    provider: 'Fal',
    model: MODEL,
    operation: 'reference-to-video',
    attemptsAuthorized: 1,
    output: { duration: '10', aspectRatio: '16:9', resolution: '720p', bitrateMode: 'high', nativeAudio: true },
    referenceAuthority: {
      Video1: 'motion, causal transformation, timing, camera and flight choreography',
      Image1: 'opening/closing eye, identity and impasto',
      Image2: 'wall-to-wing material breakthrough',
      Image3: 'flight state, paint ribbons, depth and atmosphere'
    },
    references: [
      { role: 'Video1', path: video.path, bytes: video.size, sha256: video.sha256 },
      ...images.map((image, index) => ({ role: `Image${index + 1}`, path: image.path, bytes: image.size, sha256: image.sha256 }))
    ],
    promptPath: PROMPT_PATH,
    outputPath: OUTPUT_PATH,
    reviewStatus: 'candidate_pending_operator_review'
  }
}

const execute = async () => {
  const startedAt = new Date().toISOString()
  const prompt = (await readFile(PROMPT_PATH, 'utf8')).trim()
  const video = await loadAsset(REFERENCE_VIDEO, 'video/mp4')
  const images = await Promise.all(REFERENCES.map(filePath => loadAsset(filePath, 'image/png')))
  const { runFalModel } = await import('@/lib/ai/fal')

  const result = await runFalModel<{ video?: { url?: string; content_type?: string; file_name?: string; file_size?: number }; seed?: number }>({
    model: MODEL,
    input: {
      prompt,
      video_urls: [video.dataUri],
      image_urls: images.map(image => image.dataUri),
      resolution: '720p',
      duration: '10',
      aspect_ratio: '16:9',
      generate_audio: true,
      bitrate_mode: 'high'
    },
    pollTimeoutMs: 900_000,
    pollIntervalMs: 2_500
  })

  if (!result.ok) {
    throw new Error(`Fal failed (${result.httpStatus}): ${result.errorDetail ?? 'unknown provider error'}`)
  }

  const outputUrl = result.output?.video?.url

  if (!outputUrl || !outputUrl.startsWith('https://')) {
    throw new Error('Fal completed without a valid HTTPS video URL.')
  }

  const response = await fetch(outputUrl)

  if (!response.ok) throw new Error(`Unable to download Fal output (${response.status}).`)

  const outputBytes = Buffer.from(await response.arrayBuffer())
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(OUTPUT_PATH, outputBytes)

  const metadata = {
    ...(await plan()),
    startedAt,
    completedAt: new Date().toISOString(),
    requestId: result.requestId,
    httpStatus: result.httpStatus,
    latencyMs: result.latencyMs,
    secretSource: result.secretSource,
    providerSeed: result.output?.seed ?? null,
    output: {
      path: OUTPUT_PATH,
      bytes: outputBytes.length,
      sha256: sha256(outputBytes),
      mimeType: result.output?.video?.content_type ?? 'video/mp4'
    },
    reviewStatus: 'candidate_pending_operator_review'
  }

  await writeFile(METADATA_PATH, `${JSON.stringify(metadata, null, 2)}\n`)

  console.log(JSON.stringify({ ok: true, outputPath: OUTPUT_PATH, metadataPath: METADATA_PATH, requestId: result.requestId }, null, 2))
}

const main = async () => {
  const mode = process.argv[2]

  if (mode === '--plan') {
    console.log(JSON.stringify(await plan(), null, 2))
  } else if (mode === '--execute') {
    await execute()
  } else {
    throw new Error('Use --plan or --execute.')
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Unknown Seedance runner error.')
  process.exitCode = 1
})
