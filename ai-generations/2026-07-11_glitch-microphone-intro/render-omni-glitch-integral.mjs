import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { GoogleGenAI } from '@google/genai'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const workspaceRoot = '/Users/jreye/Documents/greenhouse-eo'
const runRoot = path.join(workspaceRoot, 'ai-generations/2026-07-11_glitch-microphone-intro')
const sourcePath = '/Users/jreye/Downloads/microfono_broadcast_video_assets/microfono_broadcast_9x16_2160x3840.png'
const expectedSourceSha256 = 'fde797f7a096587392ea3cffb4ada4ff260f0e1329e38135ade32cae4904608e'
const referencePath = path.join(runRoot, 'refs/microfono-broadcast-720x1280-omni-integral.jpg')
const promptPath = path.join(runRoot, 'prompts/omni-integral-practical-tap-tap.md')
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-j-omni-integral-master.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-j-omni-integral-master.metadata.json')
const pollIntervalMs = 10000
const timeoutMs = 600000

const prompt = `One continuous locked 9:16 close-up in this exact broadcast studio. Preserve the supplied image and every existing element exactly, including the background practical sign, microphone, hand, composition and lighting.

At the very start, the index fingertip completes a light tap on the microphone grille and immediately lifts into a visible hover. After a short pause in the air, it makes one more gentle tap and immediately lifts again. Two quick fingertip strikes with clear rebounds, never a press or hold. Keep the wrist, palm, microphone and camera still.

After the second lift, the existing blue studio signal responds very subtly, then everything settles. Native audio: exactly two very soft, close, damped microphone-grille taps; no music, voice, room tone, click, beep or third sound. No cuts, new people, new text, captions, logo, UI or glitch effect.`

function parseMode() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--plan')) return 'plan'
  if (args.length === 1 && args[0] === '--execute') return 'execute'
  throw new Error('Usage: node render-omni-glitch-integral.mjs [--plan|--execute]')
}

function commandOutput(command, args, failureHint) {
  try {
    return execFileSync(command, args, { encoding: 'utf8' }).trim()
  } catch (error) {
    throw new Error(`${failureHint}\n${error.stderr || error.message}`)
  }
}

function verifyAuthentication() {
  commandOutput('gcloud', ['auth', 'print-access-token'], 'Google Cloud user authentication is unavailable. Run gcloud auth login before executing.')
  commandOutput('gcloud', ['auth', 'application-default', 'print-access-token'], 'Application Default Credentials are unavailable. Run gcloud auth application-default login before executing.')
}

async function sha256(filePath) {
  const buffer = await fs.readFile(filePath)


return createHash('sha256').update(buffer).digest('hex')
}

async function prepareReference() {
  const sourceSha256 = await sha256(sourcePath)

  if (sourceSha256 !== expectedSourceSha256) throw new Error(`Source SHA-256 mismatch: ${sourceSha256}`)

  await fs.mkdir(path.dirname(referencePath), { recursive: true })

  const result = spawnSync('ffmpeg', [
    '-y',
    '-i', sourcePath,
    '-vf', 'scale=720:1280:flags=lanczos,format=yuvj420p',
    '-frames:v', '1',
    '-q:v', '2',
    referencePath
  ], { encoding: 'utf8' })

  if (result.status !== 0) throw new Error(`Could not prepare the exact 720x1280 Omni reference: ${result.stderr || result.stdout}`)

  const stats = await fs.stat(referencePath)


return {
    path: referencePath,
    mimeType: 'image/jpeg',
    dimensions: '720x1280',
    sha256: await sha256(referencePath),
    bytes: stats.size,
    sourcePath,
    sourceSha256,
    transformation: 'Lanczos reduction plus JPEG encoding only; no crop, sign neutralization, mask, blur or visual edit.'
  }
}

function probeVideo(filePath) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate',
    '-of', 'json',
    filePath
  ], { encoding: 'utf8' })

  if (result.status !== 0) return { ok: false, error: result.stderr || result.stdout }

return { ok: true, data: JSON.parse(result.stdout) }
}

function summarizeInteraction(interaction) {
  return {
    id: interaction?.id || null,
    status: interaction?.status || null,
    model: interaction?.model || null,
    created: interaction?.created || null,
    updated: interaction?.updated || null,
    outputTypes: (interaction?.steps || [])
      .filter((step) => step?.type === 'model_output')
      .flatMap((step) => step?.content || [])
      .map((output) => ({ type: output?.type || null, mimeType: output?.mime_type || output?.mimeType || null, hasData: Boolean(output?.data) }))
  }
}

function findVideo(interaction) {
  const modelOutput = (interaction?.steps || []).find((step) => step?.type === 'model_output')
  const video = (modelOutput?.content || []).find((content) => content?.type === 'video' && typeof content?.data === 'string')

  if (!video) return null

return { data: video.data, mimeType: video.mime_type || video.mimeType || 'video/mp4' }
}

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

async function waitForCompletion(ai, interaction) {
  const started = Date.now()
  let current = interaction

  while (current?.status === 'in_progress') {
    if (Date.now() - started > timeoutMs) throw new Error('Gemini Omni interaction did not complete within ten minutes.')
    await sleep(pollIntervalMs)
    current = await ai.interactions.get(current.id)
  }


return current
}

async function writeMetadata(payload) {
  await fs.mkdir(path.dirname(metadataPath), { recursive: true })
  await fs.writeFile(metadataPath, `${JSON.stringify(payload, null, 2)}\n`)
}

async function main() {
  const mode = parseMode()
  const reference = await prepareReference()

  const plan = {
    runId: '2026-07-11_glitch-microphone-intro',
    take: 'j-omni-integral',
    mode,
    provider: 'Vertex AI / Gemini Omni',
    project,
    location,
    model,
    task: 'image_to_video',
    reference,
    outputPath,
    prompt,
    constraints: [
      'The source includes ON AIR and is passed intact; no sign-neutral adapter is allowed.',
      'The first original contact becomes the first impact and must rebound immediately.',
      'Native audio is reviewed separately; only exactly two realistic grille hits are eligible.'
    ]
  }

  if (mode === 'plan') {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)

return
  }

  verifyAuthentication()
  await fs.mkdir(path.dirname(promptPath), { recursive: true })
  await fs.writeFile(promptPath, `${prompt}\n`)
  const startedAt = new Date().toISOString()
  let interaction = null

  try {
    const ai = new GoogleGenAI({ vertexai: true, project, location })
    const referenceData = (await fs.readFile(reference.path)).toString('base64')

    interaction = await ai.interactions.create({
      model,
      input: [
        { type: 'image', data: referenceData, mime_type: reference.mimeType },
        { type: 'text', text: prompt }
      ],
      response_format: { type: 'video', aspect_ratio: '9:16' },
      generation_config: { video_config: { task: 'image_to_video' } },
      background: true,
      store: true
    })
    interaction = await waitForCompletion(ai, interaction)
    const video = findVideo(interaction)

    if (interaction?.status !== 'completed' || !video) throw new Error(`Gemini Omni did not return a video: ${JSON.stringify(summarizeInteraction(interaction))}`)

    const buffer = Buffer.from(video.data, 'base64')

    await fs.writeFile(outputPath, buffer)

    const metadata = {
      ok: true,
      ...plan,
      startedAt,
      completedAt: new Date().toISOString(),
      promptPath,
      interaction: summarizeInteraction(interaction),
      output: { path: outputPath, bytes: buffer.length, mimeType: video.mimeType, probe: probeVideo(outputPath) }
    }

    await writeMetadata(metadata)
    process.stdout.write(`${JSON.stringify({ ok: true, metadataPath, interaction: metadata.interaction, output: metadata.output }, null, 2)}\n`)
  } catch (error) {
    await writeMetadata({
      ok: false,
      ...plan,
      startedAt,
      failedAt: new Date().toISOString(),
      promptPath,
      interaction: summarizeInteraction(interaction),
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

await main()
