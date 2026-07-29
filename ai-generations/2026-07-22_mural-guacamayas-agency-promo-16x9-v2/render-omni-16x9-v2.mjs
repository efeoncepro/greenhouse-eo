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
const promptPath = path.join(runRoot, 'prompt.md')
const outputPath = path.join(runRoot, 'masters/art-macaws-agency-promo-16x9-v2-omni-master.mp4')
const metadataPath = path.join(runRoot, 'masters/art-macaws-agency-promo-16x9-v2-omni-master.metadata.json')
const references = ['keyframe-01-eye.png', 'keyframe-02-wing-breakout.png', 'keyframe-03-flight-trails.png']
  .map((name) => path.join(sourceRoot, name))

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex')
const token = () => execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()

function mode() {
  const args = process.argv.slice(2)
  if (args.length === 0 || args.includes('--plan')) return 'plan'
  if (args.length === 1 && args[0] === '--execute') return 'execute'
  throw new Error('Usage: node render-omni-16x9-v2.mjs [--plan|--execute]')
}

function summarize(interaction) {
  return {
    id: interaction?.id ?? null,
    status: interaction?.status ?? null,
    model: interaction?.model ?? null,
    outputs: (interaction?.steps ?? [])
      .filter((step) => step?.type === 'model_output')
      .flatMap((step) => step?.content ?? [])
      .map((item) => ({ type: item?.type ?? null, mimeType: item?.mime_type ?? null, hasData: Boolean(item?.data), hasUri: Boolean(item?.uri) }))
  }
}

function findVideo(interaction) {
  const output = (interaction?.steps ?? []).find((step) => step?.type === 'model_output')
  return (output?.content ?? []).find((item) => item?.type === 'video') ?? null
}

async function writeMetadata(value) {
  await fs.mkdir(path.dirname(metadataPath), { recursive: true })
  await fs.writeFile(metadataPath, `${JSON.stringify(value, null, 2)}\n`)
}

async function main() {
  const executionMode = mode()
  const prompt = await fs.readFile(promptPath, 'utf8')
  const buffers = await Promise.all(references.map((reference) => fs.readFile(reference)))
  const plan = {
    runId: path.basename(runRoot),
    mode: executionMode,
    provider: 'Vertex AI / Gemini Omni Interactions API',
    project,
    location,
    model,
    task: 'reference_to_video',
    aspectRatio: '16:9',
    expectedDurationSeconds: 10,
    attemptsAuthorized: 1,
    references: references.map((reference, index) => ({ role: `IMAGE_REF_${index}`, path: reference, bytes: buffers[index].length, sha256: sha256(buffers[index]) })),
    promptPath,
    outputPath,
    fidelityContract: 'same art direction and causal mural-to-living-paint transformation; full generative 16:9 shot',
    reviewStatus: 'candidate_pending_operator_review'
  }

  if (executionMode === 'plan') {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
    return
  }

  const startedAt = new Date().toISOString()
  let interaction = null

  try {
    const input = buffers.map((buffer) => ({ type: 'image', data: buffer.toString('base64'), mime_type: 'image/png' }))
    input.push({ type: 'text', text: prompt })
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
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
    if (!response.ok) throw new Error(`Gemini Omni HTTP ${response.status}: ${interaction?.error?.message ?? 'unknown error'}`)
    const video = findVideo(interaction)
    if (interaction?.status !== 'completed' || (!video?.data && !video?.uri)) throw new Error(`No completed video: ${JSON.stringify(summarize(interaction))}`)

    let buffer
    if (video.data) buffer = Buffer.from(video.data, 'base64')
    else {
      const download = await fetch(video.uri, { headers: { Authorization: `Bearer ${token()}` } })
      if (!download.ok) throw new Error(`Video download HTTP ${download.status}`)
      buffer = Buffer.from(await download.arrayBuffer())
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, buffer)
    await writeMetadata({ ok: true, ...plan, startedAt, completedAt: new Date().toISOString(), interaction: summarize(interaction), usage: interaction?.usage ?? null, output: { path: outputPath, bytes: buffer.length, sha256: sha256(buffer), mimeType: video?.mime_type ?? 'video/mp4' } })
    process.stdout.write(`${JSON.stringify({ ok: true, outputPath, metadataPath, interaction: summarize(interaction) }, null, 2)}\n`)
  } catch (error) {
    await writeMetadata({ ok: false, ...plan, startedAt, failedAt: new Date().toISOString(), interaction: summarize(interaction), error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

await main()
