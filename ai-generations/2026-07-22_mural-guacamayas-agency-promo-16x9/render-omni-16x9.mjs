import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const endpoint = `https://aiplatform.googleapis.com/v1beta1/projects/${project}/locations/${location}/interactions`
const runRoot = path.dirname(fileURLToPath(import.meta.url))
const sourceRoot = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-07-07_mural-guacamayas-hero'
const originalMasterPath = '/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/video/social/art-macaws/v1/art-macaws-v1-omni-master.mp4'
const promptPath = path.join(runRoot, 'prompt.md')
const outputPath = path.join(runRoot, 'masters/art-macaws-agency-promo-16x9-v1-omni-master.mp4')
const metadataPath = path.join(runRoot, 'masters/art-macaws-agency-promo-16x9-v1-omni-master.metadata.json')
const motionReferencePath = path.join(runRoot, 'refs/art-macaws-approved-motion-anchor-3s.mp4')

const references = [
  path.join(sourceRoot, 'keyframe-01-eye.png'),
  path.join(sourceRoot, 'keyframe-02-wing-breakout.png'),
  path.join(sourceRoot, 'keyframe-03-flight-trails.png')
]

function parseMode() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--plan')) return 'plan'
  if (args.length === 1 && args[0] === '--execute') return 'execute'
  throw new Error('Usage: node render-omni-16x9.mjs [--plan|--execute]')
}

function accessToken() {
  return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

async function ensureMotionReference() {
  await fs.mkdir(path.dirname(motionReferencePath), { recursive: true })
  execFileSync('ffmpeg', [
    '-y',
    '-ss', '3.3',
    '-i', originalMasterPath,
    '-t', '3.0',
    '-an',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '15',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    motionReferencePath
  ], { stdio: 'ignore' })

  return fs.readFile(motionReferencePath)
}

function summarizeInteraction(interaction) {
  return {
    id: interaction?.id ?? null,
    status: interaction?.status ?? null,
    model: interaction?.model ?? null,
    outputTypes: (interaction?.steps ?? [])
      .filter((step) => step?.type === 'model_output')
      .flatMap((step) => step?.content ?? [])
      .map((content) => ({
        type: content?.type ?? null,
        mimeType: content?.mime_type ?? content?.mimeType ?? null,
        hasData: typeof content?.data === 'string',
        hasUri: typeof content?.uri === 'string'
      }))
  }
}

function outputVideo(interaction) {
  const modelOutput = (interaction?.steps ?? []).find((step) => step?.type === 'model_output')

  return (modelOutput?.content ?? []).find((content) => content?.type === 'video') ?? null
}

async function writeMetadata(payload) {
  await fs.mkdir(path.dirname(metadataPath), { recursive: true })
  await fs.writeFile(metadataPath, `${JSON.stringify(payload, null, 2)}\n`)
}

async function main() {
  const mode = parseMode()
  const prompt = await fs.readFile(promptPath, 'utf8')
  const referenceBuffers = await Promise.all(references.map((reference) => fs.readFile(reference)))
  const referenceManifest = references.map((reference, index) => ({
    role: `IMAGE_REF_${index}`,
    path: reference,
    bytes: referenceBuffers[index].length,
    sha256: sha256(referenceBuffers[index])
  }))
  const plan = {
    runId: path.basename(runRoot),
    mode,
    provider: 'Vertex AI / Gemini Omni Interactions API',
    project,
    location,
    model,
    task: 'reference_to_video',
    aspectRatio: '16:9',
    expectedDurationSeconds: 10,
    expectedResolution: '1280x720',
    attemptsAuthorized: 1,
    references: referenceManifest,
    motionReference: {
      role: 'VIDEO_REF_3',
      sourcePath: originalMasterPath,
      extraction: { startSeconds: 3.3, durationSeconds: 3.0 },
      path: motionReferencePath,
      purpose: 'approved temporal behavior and camera-weight anchor; portrait framing is not authoritative'
    },
    promptPath,
    outputPath,
    reviewStatus: 'candidate_pending_human_review'
  }

  if (mode === 'plan') {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
    return
  }

  const motionReferenceBuffer = await ensureMotionReference()
  plan.motionReference.bytes = motionReferenceBuffer.length
  plan.motionReference.sha256 = sha256(motionReferenceBuffer)
  const input = referenceBuffers.map((buffer) => ({
    type: 'image',
    data: buffer.toString('base64'),
    mime_type: 'image/png'
  }))
  input.push({ type: 'video', data: motionReferenceBuffer.toString('base64'), mime_type: 'video/mp4' })
  input.push({ type: 'text', text: prompt })

  const startedAt = new Date().toISOString()
  let interaction = null

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input,
        response_format: { type: 'video', aspect_ratio: '16:9' },
        generation_config: { video_config: { task: 'reference_to_video' } },
        background: false,
        store: false,
        stream: false
      }),
      signal: AbortSignal.timeout(240_000)
    })

    interaction = await response.json()

    if (!response.ok) {
      throw new Error(`Gemini Omni request failed with HTTP ${response.status}: ${interaction?.error?.message ?? 'unknown provider error'}`)
    }

    const video = outputVideo(interaction)

    if (interaction?.status !== 'completed' || (!video?.data && !video?.uri)) {
      throw new Error(`Gemini Omni returned no completed video: ${JSON.stringify(summarizeInteraction(interaction))}`)
    }

    let buffer

    if (typeof video.data === 'string') {
      buffer = Buffer.from(video.data, 'base64')
    } else {
      const download = await fetch(video.uri, { headers: { Authorization: `Bearer ${accessToken()}` } })

      if (!download.ok) throw new Error(`Video URI download failed with HTTP ${download.status}`)
      buffer = Buffer.from(await download.arrayBuffer())
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, buffer)
    await writeMetadata({
      ok: true,
      ...plan,
      startedAt,
      completedAt: new Date().toISOString(),
      interaction: summarizeInteraction(interaction),
      usage: interaction?.usage ?? null,
      output: {
        path: outputPath,
        bytes: buffer.length,
        sha256: sha256(buffer),
        mimeType: video.mime_type ?? video.mimeType ?? 'video/mp4'
      }
    })
    process.stdout.write(`${JSON.stringify({ ok: true, metadataPath, outputPath, interaction: summarizeInteraction(interaction) }, null, 2)}\n`)
  } catch (error) {
    await writeMetadata({
      ok: false,
      ...plan,
      startedAt,
      failedAt: new Date().toISOString(),
      interaction: summarizeInteraction(interaction),
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

await main()
