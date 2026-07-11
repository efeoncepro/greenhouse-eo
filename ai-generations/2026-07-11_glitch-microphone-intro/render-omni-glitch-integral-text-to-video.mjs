import fs from 'node:fs/promises'
import path from 'node:path'

import { GoogleGenAI } from '@google/genai'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const workspaceRoot = '/Users/jreye/Documents/greenhouse-eo'
const runRoot = path.join(workspaceRoot, 'ai-generations/2026-07-11_glitch-microphone-intro')
const promptPath = path.join(runRoot, 'prompts/omni-integral-text-to-video.md')
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-k-omni-integral-text-to-video-master.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-k-omni-integral-text-to-video-master.metadata.json')
const pollIntervalMs = 10000
const timeoutMs = 600000

const prompt = `Single continuous, locked 9:16 cinematic macro close-up inside a real dark broadcast studio at night. Same visual direction as a premium radio control room: a black broadcast microphone and boom fill the lower-right foreground; a mixing console with dim blue and green LEDs fills the lower background; an adult male hand enters from upper left; warm realistic skin against deep navy shadows, electric blue practicals and subtle green console light. No camera move and no cut.

A small red rectangular ON AIR sign is physically screwed to the acoustic rear wall in the upper-right background. Its text reads exactly ON AIR. It is a real studio practical: correct perspective, red glow, natural depth of field, behind the hand and microphone, never floating, never a foreground title, never a graphic overlay.

[0.0–0.55s] The relaxed index fingertip hovers 6–10 mm above the upper-front metal grille of the microphone. [0.55–0.67s] The soft pad of that fingertip performs a light microphone soundcheck tap: contact for only one or two frames, then immediate rebound upward to a clear hover. [0.67–1.08s] Quiet visible air gap. [1.08–1.25s] The same fingertip makes a second light tap and immediately rebounds. This reads tap, lift, tap, lift — never pressing, holding, dragging, clicking a button, squeezing or deforming the microphone. Wrist, palm, forearm, boom and microphone stay stable; no extra fingers or anatomy changes. [1.33–1.70s] Only after the second rebound, the existing blue signal arcs and console glow respond once, minimally. Then the studio remains still for a clean hard cut.

Native sound has exactly two soft close microphone-check foley hits: damped fingertip against a metal grille with a tiny muted microphone-body response. No mouse click, keyboard, plastic button, nail, metallic ring, beep, room tone, music, speech, voice or third sound. No captions, extra text, logo, UI, glitch effect, additional people or camera movement.`

function parseMode() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--plan')) return 'plan'
  if (args.length === 1 && args[0] === '--execute') return 'execute'
  throw new Error('Usage: node render-omni-glitch-integral-text-to-video.mjs [--plan|--execute]')
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

  const plan = {
    runId: '2026-07-11_glitch-microphone-intro',
    take: 'k-omni-integral-text-to-video',
    mode,
    provider: 'Vertex AI / Gemini Omni',
    project,
    location,
    model,
    task: 'text_to_video',
    outputPath,
    prompt,
    sourceDirection: 'Original 4K key visual and storyboard remain direction references; they are not passed as image input because Omni rejected the intact source before generation.',
    constraints: [
      'ON AIR is generated as a physical practical inside the complete shot, never a post overlay.',
      'Two fingertip strikes have explicit rebounds and exactly two diegetic audio hits.',
      'The output remains a candidate until visual and audio review pass.'
    ]
  }

  if (mode === 'plan') {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)

return
  }

  await fs.mkdir(path.dirname(promptPath), { recursive: true })
  await fs.writeFile(promptPath, `${prompt}\n`)
  const startedAt = new Date().toISOString()
  let interaction = null

  try {
    const ai = new GoogleGenAI({ vertexai: true, project, location })

    interaction = await ai.interactions.create({
      model,
      input: prompt,
      response_format: { type: 'video', aspect_ratio: '9:16' },
      generation_config: { video_config: { task: 'text_to_video' } },
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
      output: { path: outputPath, bytes: buffer.length, mimeType: video.mimeType }
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
