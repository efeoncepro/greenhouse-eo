import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const endpoint = 'https://aiplatform.googleapis.com/v1/projects/' + project + '/locations/' + location + '/publishers/google/models/' + model + ':generateContent'

const workspaceRoot = '/Users/jreye/Documents/greenhouse-eo'
const runRoot = path.join(workspaceRoot, 'ai-generations/2026-07-11_glitch-microphone-intro')
const sourceVideoPath = path.join(runRoot, 'masters/glitch-microphone-intro-a-natural-omni-master.mp4')
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-d-tap-tap-omni-edit-master.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-d-tap-tap-omni-edit-master.metadata.json')
const promptPath = path.join(runRoot, 'prompts/tap-tap-video-edit.md')
const retryDelaysMs = [8000, 16000]

const editPrompt = [
  'Edit the supplied vertical broadcast-studio video in place. Preserve the same person hand, skin, microphone, studio, lighting, palette, lens, framing, depth of field, desk and background. Do not introduce new people, fingers, objects, camera moves, cuts, words, logos, UI, music or speech.',
  'Change only the finger performance so it reads as a real sound check: tap tap. Start with the index fingertip hovering naturally about 6 to 8 millimeters above the microphone mesh. At about 0.55 seconds, make one very light first tap: the distal finger joint flexes, the soft fingertip makes contact with the mesh for a brief beat, then lifts naturally. At about 1.30 seconds, make a second light tap with the same finger: descend, brief contact, then lift and settle about 10 to 12 millimeters above the mesh. The two taps must be distinct, gentle and human, never a press-and-hold or a hard poke.',
  'Use physically plausible timing at 24 fps: a small ease into each contact, a short hold at contact, and a soft ease-out on release. Keep the wrist and other fingers quiet with only natural overlap. The microphone must stay rigid and the fingertip must never penetrate or deform the mesh. Keep the camera locked.',
  'Keep the upper background sign panel as a dark practical with diffuse red spill only; do not generate lettering in that panel. After the second tap only, let the existing blue signal arcs and distant console lights answer with one subtle pulse. The rest of the clip settles calmly and remains ready for a hard cut.',
  'Audio is scratch only: quiet studio room tone and two soft fingertip contacts, no music, no voice, no beep and no radio static.'
].join('\n\n')

function parseMode() {
  const args = process.argv.slice(2)
  const allowed = new Set(['--plan', '--execute'])
  const unknown = args.filter((arg) => !allowed.has(arg))

  if (unknown.length) throw new Error('Unknown argument(s): ' + unknown.join(', '))
  if (args.includes('--plan') && args.includes('--execute')) throw new Error('Use either --plan or --execute, not both.')
  
return args.includes('--execute') ? 'execute' : 'plan'
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
  
return commandOutput('gcloud', ['auth', 'print-access-token'], 'Google Cloud user authentication is unavailable. Run gcloud auth login before executing.')
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
  const probe = probeVideo(sourceVideoPath)

  if (probe?.width !== 720 || probe?.height !== 1280 || probe?.r_frame_rate !== '24/1') {
    throw new Error('The edit source must be the verified 720x1280 24fps natural master.')
  }

  return {
    path: sourceVideoPath,
    bytes: stats.size,
    mimeType: 'video/mp4',
    videoProbe: probe
  }
}

async function requestVideo(token, sourceVideo, signal) {
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: sourceVideo.mimeType, data: (await fs.readFile(sourceVideo.path)).toString('base64') } },
          { text: editPrompt }
        ]
      }
    ],
    generationConfig: { responseModalities: ['TEXT', 'VIDEO'] }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'x-goog-user-project': project,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal
  })

  const json = await response.json().catch(async () => ({ raw: await response.text().catch(() => '') }))

  if (!response.ok) {
    const error = new Error('Vertex edit failed with HTTP ' + response.status + ': ' + JSON.stringify(json).slice(0, 2000))

    error.statusCode = response.status
    throw error
  }

  return json
}

function readVideo(response) {
  const parts = response?.candidates?.[0]?.content?.parts || []

  const videoPart = parts.find((part) => {
    const inline = part.inlineData || part.inline_data
    const mimeType = inline?.mimeType || inline?.mime_type || ''

    
return inline?.data && mimeType.startsWith('video/')
  })

  const inline = videoPart?.inlineData || videoPart?.inline_data

  if (!inline?.data) {
    const error = new Error('Vertex edit returned no inline video payload.')

    error.responseSummary = {
      responseId: response?.responseId || response?.response_id || null,
      modelVersion: response?.modelVersion || response?.model_version || null,
      usageMetadata: response?.usageMetadata || response?.usage_metadata || null,
      promptFeedback: response?.promptFeedback || null,
      candidates: response?.candidates || []
    }
    throw error
  }

  return {
    data: inline.data,
    mimeType: inline.mimeType || inline.mime_type || 'video/mp4',
    responseText: parts.filter((part) => typeof part.text === 'string').map((part) => part.text).join('\n\n').slice(0, 4000)
  }
}

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

async function requestWithRetry(token, sourceVideo, signal) {
  for (let attempt = 1; attempt <= retryDelaysMs.length + 1; attempt += 1) {
    try {
      return { response: await requestVideo(token, sourceVideo, signal), attemptsUsed: attempt }
    } catch (error) {
      const delayMs = retryDelaysMs[attempt - 1]

      if ((error.statusCode !== 429 && (error.statusCode < 500 || error.statusCode > 599)) || delayMs === undefined) {
        error.attemptsUsed = attempt
        throw error
      }

      console.warn('Vertex edit attempt ' + attempt + ' retrying after ' + delayMs + 'ms.')
      await sleep(delayMs)
    }
  }

  throw new Error('Retry loop exited unexpectedly.')
}

async function main() {
  const mode = parseMode()
  const sourceVideo = await sourcePreflight()

  const plan = {
    mode,
    operation: 'video-to-video edit',
    model,
    endpoint,
    sourceVideo,
    outputPath,
    intent: 'Replace the single release gesture with two gentle sound-check taps while preserving the shot. The exact ON AIR sign is intentionally reserved for post compositing.'
  }

  if (mode === 'plan') {
    console.log(JSON.stringify(plan, null, 2))
    
return
  }

  const token = verifyAuthentication()

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.mkdir(path.dirname(promptPath), { recursive: true })
  await fs.writeFile(promptPath, editPrompt + '\n')

  const startedAt = new Date().toISOString()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 300000)
    let requestResult

    try {
      requestResult = await requestWithRetry(token, sourceVideo, controller.signal)
    } finally {
      clearTimeout(timeout)
    }

    const video = readVideo(requestResult.response)
    const buffer = Buffer.from(video.data, 'base64')

    await fs.writeFile(outputPath, buffer)

    const metadata = {
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      operation: 'video-to-video edit',
      project,
      location,
      model,
      endpoint,
      sourceVideo,
      promptPath,
      outputPath,
      outputBytes: buffer.length,
      videoMimeType: video.mimeType,
      videoProbe: probeVideo(outputPath),
      attemptsUsed: requestResult.attemptsUsed,
      usageMetadata: requestResult.response.usageMetadata || null,
      responseText: video.responseText
    }

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n')
    console.log(JSON.stringify({ ok: true, ...plan, metadataPath, outputBytes: buffer.length }, null, 2))
  } catch (error) {
    await fs.writeFile(metadataPath, JSON.stringify({
      ok: false,
      startedAt,
      failedAt: new Date().toISOString(),
      operation: 'video-to-video edit',
      project,
      location,
      model,
      sourceVideo,
      promptPath,
      attemptsUsed: error?.attemptsUsed || 1,
      responseSummary: error?.responseSummary || null,
      error: error instanceof Error ? error.message : String(error)
    }, null, 2) + '\n')
    throw error
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
