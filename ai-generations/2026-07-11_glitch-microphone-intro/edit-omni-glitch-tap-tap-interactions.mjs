import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { GoogleGenAI } from '@google/genai'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const workspaceRoot = '/Users/jreye/Documents/greenhouse-eo'
const runRoot = path.join(workspaceRoot, 'ai-generations/2026-07-11_glitch-microphone-intro')
const sourceVideoPath = path.join(runRoot, 'masters/glitch-microphone-intro-a-natural-omni-master.mp4')
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-d-tap-tap-omni-interactions-edit-master.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-d-tap-tap-omni-interactions-edit-master.metadata.json')
const promptPath = path.join(runRoot, 'prompts/tap-tap-video-edit-interactions.md')
const interactionTimeoutMs = 600000
const pollIntervalMs = 10000

const editPrompt = [
  'Edit this video in place. Preserve the shot, hand, microphone and studio.',
  'Make the index fingertip perform two distinct, gentle microphone soundcheck taps: tap, lift, tap, lift. Keep the motion natural and subtle. After the second tap, let the blue signal respond once. Keep the camera still.'
].join('\n\n')

function parseMode() {
  const args = process.argv.slice(2)
  const allowed = new Set(['--plan', '--execute'])
  const recoverArg = args.find((arg) => arg.startsWith('--recover-interaction='))
  const unknown = args.filter((arg) => !allowed.has(arg) && !arg.startsWith('--recover-interaction='))

  if (unknown.length) throw new Error('Unknown argument(s): ' + unknown.join(', '))
  if (args.includes('--plan') && args.includes('--execute')) throw new Error('Use either --plan or --execute, not both.')
  
return {
    mode: args.includes('--execute') ? 'execute' : 'plan',
    recoverInteractionId: recoverArg ? recoverArg.replace('--recover-interaction=', '') : null
  }
}

function commandOutput(command, args, failureHint) {
  try {
    return execFileSync(command, args, { encoding: 'utf8' }).trim()
  } catch (error) {
    throw new Error(failureHint + '\n' + (error.stderr || error.message))
  }
}

function verifyAuthentication() {
  commandOutput('gcloud', ['auth', 'application-default', 'print-access-token'], 'Application Default Credentials are unavailable. Run gcloud auth application-default login before executing.')
  commandOutput('gcloud', ['auth', 'print-access-token'], 'Google Cloud user authentication is unavailable. Run gcloud auth login before executing.')
}

function probeVideo(filePath) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,duration',
    '-of', 'json',
    filePath
  ], { encoding: 'utf8' })

  if (result.status !== 0) throw new Error('ffprobe failed: ' + (result.stderr || result.stdout))
  
return JSON.parse(result.stdout).streams?.[0] || null
}

async function sourcePreflight() {
  await fs.access(sourceVideoPath)
  const stats = await fs.stat(sourceVideoPath)
  const videoProbe = probeVideo(sourceVideoPath)

  if (videoProbe?.width !== 720 || videoProbe?.height !== 1280 || videoProbe?.r_frame_rate !== '24/1') {
    throw new Error('The edit source must be the verified 720x1280 24fps natural master.')
  }

  return {
    path: sourceVideoPath,
    bytes: stats.size,
    mimeType: 'video/mp4',
    videoProbe
  }
}

function findGeneratedVideoData(interaction) {
  const modelOutput = (interaction?.steps || []).find((step) => step?.type === 'model_output')
  const video = (modelOutput?.content || []).find((content) => content?.type === 'video' && typeof content?.data === 'string')

  if (!video) return null

  return {
    data: video.data,
    mimeType: video.mime_type || video.mimeType || 'video/mp4'
  }
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

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

async function waitForInteraction(ai, interaction) {
  const startedAt = Date.now()
  let current = interaction

  while (current?.status === 'in_progress') {
    if (Date.now() - startedAt > interactionTimeoutMs) {
      const error = new Error('Interactions edit did not complete within the 10 minute polling window.')

      error.interactionSummary = summarizeInteraction(current)
      throw error
    }

    await sleep(pollIntervalMs)
    current = await ai.interactions.get(current.id)
  }

  return current
}

async function main() {
  const { mode, recoverInteractionId } = parseMode()
  const sourceVideo = await sourcePreflight()

  const plan = {
    mode,
    operation: 'video-to-video edit through Gemini Omni Interactions',
    model,
    project,
    location,
    sourceVideo,
    outputPath,
    recoverInteractionId,
    intent: 'Replace the single release gesture with two gentle soundcheck taps. Exact ON AIR typography is reserved for post compositing.'
  }

  if (mode === 'plan') {
    console.log(JSON.stringify(plan, null, 2))
    
return
  }

  verifyAuthentication()
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.mkdir(path.dirname(promptPath), { recursive: true })
  await fs.writeFile(promptPath, editPrompt + '\n')

  const startedAt = new Date().toISOString()
  let interaction = null

  try {
    const ai = new GoogleGenAI({ vertexai: true, project, location })
    const sourceData = (await fs.readFile(sourceVideo.path)).toString('base64')

    if (recoverInteractionId) {
      interaction = await ai.interactions.get(recoverInteractionId)
    } else {
      interaction = await ai.interactions.create({
        model,
        input: [
          { type: 'video', data: sourceData, mime_type: 'video/mp4' },
          { type: 'text', text: editPrompt }
        ],
        response_format: { type: 'video' },
        generation_config: { video_config: { task: 'edit' } },
        background: true,
        store: true
      })
      interaction = await waitForInteraction(ai, interaction)
    }

    if (interaction?.status !== 'completed') {
      const error = new Error('Interactions edit did not reach completed status.')

      error.interactionSummary = summarizeInteraction(interaction)
      throw error
    }

    const output = findGeneratedVideoData(interaction)

    if (!output) {
      const error = new Error('Interactions edit returned no video payload.')

      error.interactionSummary = summarizeInteraction(interaction)
      throw error
    }

    const buffer = Buffer.from(output.data, 'base64')

    await fs.writeFile(outputPath, buffer)

    const metadata = {
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      operation: 'video-to-video edit through Gemini Omni Interactions',
      project,
      location,
      model,
      sourceVideo,
      promptPath,
      outputPath,
      outputBytes: buffer.length,
      videoMimeType: output.mimeType,
      videoProbe: probeVideo(outputPath),
      interaction: summarizeInteraction(interaction)
    }

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n')
    console.log(JSON.stringify({ ok: true, ...plan, metadataPath, outputBytes: buffer.length, interaction: metadata.interaction }, null, 2))
  } catch (error) {
    await fs.writeFile(metadataPath, JSON.stringify({
      ok: false,
      startedAt,
      failedAt: new Date().toISOString(),
      operation: 'video-to-video edit through Gemini Omni Interactions',
      project,
      location,
      model,
      sourceVideo,
      promptPath,
      interactionSummary: error?.interactionSummary || summarizeInteraction(interaction),
      error: error instanceof Error ? error.message : String(error)
    }, null, 2) + '\n')
    throw error
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
