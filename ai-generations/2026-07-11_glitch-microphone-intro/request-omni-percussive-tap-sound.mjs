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
const sourceVideoPath = path.join(runRoot, 'exports/glitch-microphone-intro-f-percussive-tap-on-air-5s-silent.mp4')
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-h-omni-percussive-tap-sound-guidance.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-h-omni-percussive-tap-sound-guidance.metadata.json')
const promptPath = path.join(runRoot, 'prompts/omni-percussive-tap-sound-edit.md')
const interactionTimeoutMs = 600000
const pollIntervalMs = 10000

const editPrompt = `Edit this existing five-second studio video in place. Preserve the same hand, finger, microphone, ON AIR sign, blue response, lighting, framing, camera and timing. Do not add text, graphics, camera movement, music, dialogue or narration.

When the fingertip makes its two quick sound-check contacts with the metal microphone grille, include a natural close-mic tap for each impact. The first tap is gentle and the second is slightly firmer. Both sounds are short, dry metal-grille ticks with a subtle low body and immediate decay. The action is a strike and rebound, never a button press or heavy thump. The rest of the clip stays quiet.`

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
    '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate',
    '-of', 'json',
    filePath
  ], { encoding: 'utf8' })

  if (result.status !== 0) throw new Error('ffprobe failed: ' + (result.stderr || result.stdout))
  
return JSON.parse(result.stdout)
}

async function checksum(filePath) {
  return createHash('sha256').update(await fs.readFile(filePath)).digest('hex')
}

async function sourcePreflight() {
  await fs.access(sourceVideoPath)
  const stats = await fs.stat(sourceVideoPath)
  const probe = probeVideo(sourceVideoPath)
  const video = probe.streams.find((stream) => stream.codec_type === 'video')

  if (video?.width !== 720 || video?.height !== 1280 || video?.r_frame_rate !== '24/1') {
    throw new Error('The Omni sound-guidance edit source must be the verified 720x1280, 24fps percussive visual candidate.')
  }

  return {
    path: sourceVideoPath,
    sha256: await checksum(sourceVideoPath),
    bytes: stats.size,
    mimeType: 'video/mp4',
    probe
  }
}

function findGeneratedVideoData(interaction) {
  const modelOutput = (interaction?.steps || []).find((step) => step?.type === 'model_output')
  const video = (modelOutput?.content || []).find((content) => content?.type === 'video' && typeof content?.data === 'string')

  return video ? { data: video.data, mimeType: video.mime_type || video.mimeType || 'video/mp4' } : null
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
      const error = new Error('Omni sound-guidance edit did not complete within the 10 minute polling window.')

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
    operation: 'Gemini Omni audio-guidance edit of an already-approved visual candidate',
    model,
    project,
    location,
    sourceVideo,
    outputPath,
    recoverInteractionId,
    intent: 'Request two isolated, percussive microphone-tap foley hits while explicitly preserving every visual pixel. The Omni output audio will be reviewed and may be remuxed onto the deterministic visual plate.'
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
      const error = new Error('Omni sound-guidance edit did not reach completed status.')

      error.interactionSummary = summarizeInteraction(interaction)
      throw error
    }

    const output = findGeneratedVideoData(interaction)

    if (!output) {
      const error = new Error('Omni sound-guidance edit returned no video payload.')

      error.interactionSummary = summarizeInteraction(interaction)
      throw error
    }

    await fs.writeFile(outputPath, Buffer.from(output.data, 'base64'))
    const outputProbe = probeVideo(outputPath)
    const hasAudio = outputProbe.streams.some((stream) => stream.codec_type === 'audio')

    if (!hasAudio) throw new Error('Omni output contains no audio stream; no foley guidance can be recovered.')

    const metadata = {
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      operation: plan.operation,
      project,
      location,
      model,
      sourceVideo,
      promptPath,
      output: {
        path: outputPath,
        sha256: await checksum(outputPath),
        bytes: (await fs.stat(outputPath)).size,
        probe: outputProbe,
        audioPresent: hasAudio
      },
      interaction: summarizeInteraction(interaction)
    }

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n')
    console.log(JSON.stringify({ ok: true, output: metadata.output, metadataPath, interaction: metadata.interaction }, null, 2))
  } catch (error) {
    await fs.writeFile(metadataPath, JSON.stringify({
      ok: false,
      startedAt,
      failedAt: new Date().toISOString(),
      operation: plan.operation,
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
