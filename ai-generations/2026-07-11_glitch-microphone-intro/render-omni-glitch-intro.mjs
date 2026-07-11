import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const endpoint = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`

const workspaceRoot = '/Users/jreye/Documents/greenhouse-eo'
const runRoot = path.join(workspaceRoot, 'ai-generations/2026-07-11_glitch-microphone-intro')
const sourcePath = '/Users/jreye/Downloads/microfono_broadcast_video_assets/microfono_broadcast_9x16_2160x3840.png'
const expectedSourceSha256 = 'fde797f7a096587392ea3cffb4ada4ff260f0e1329e38135ade32cae4904608e'
const refsDir = path.join(runRoot, 'refs')
const promptsDir = path.join(runRoot, 'prompts')
const mastersDir = path.join(runRoot, 'masters')
const reviewDir = path.join(runRoot, 'review')
const retryDelaysMs = [8000, 16000]

const referenceProfiles = {
  'original-720-png': {
    fileName: 'microfono-broadcast-720x1280-omni-reference.png',
    mimeType: 'image/png',
    dimensions: '720x1280',
    transformation: 'Lanczos scale from canonical 2160x3840 PNG to model-supported 720x1280 PNG; no crop or visual adjustment.',
    ffmpegArgs: ['-vf', 'scale=720:1280:flags=lanczos,format=rgb24']
  },
  'sign-neutral-720-jpeg': {
    fileName: 'microfono-broadcast-sign-neutral-720x1280-omni-reference.jpg',
    mimeType: 'image/jpeg',
    dimensions: '720x1280',
    transformation: 'Lanczos scale from canonical 2160x3840 PNG, then a local blur over the legible ON AIR sign only; composition, hand, microphone and lighting are preserved. JPEG is stripped of source metadata for the model adapter.',
    ffmpegArgs: [
      '-filter_complex',
      '[0:v]scale=720:1280:flags=lanczos,split=2[base][sign];[sign]crop=180:118:400:257,boxblur=14:7[blurredSign];[base][blurredSign]overlay=400:257,format=yuvj420p[out]',
      '-map', '[out]',
      '-frames:v', '1',
      '-q:v', '2'
    ]
  }
}

const takes = {
  probe: {
    stem: 'glitch-microphone-intro-probe-source-input',
    prompt: 'Animate the supplied portrait broadcast-studio image as one calm continuous cinematic shot. Preserve the existing hand, microphone, composition and lighting. Keep motion extremely subtle and natural. No added people, no text overlays, no cuts, no music and no speech.'
  },
  natural: {
    stem: 'glitch-microphone-intro-a-natural',
    direction: 'Keep the signal response almost imperceptible. The emotional emphasis is the quiet, natural fingertip pressure and release.'
  },
  tactile: {
    stem: 'glitch-microphone-intro-b-tactile',
    direction: 'Make the soft-pulp compression and recovery of the fingertip slightly more readable while remaining restrained and physically plausible.'
  },
  signal: {
    stem: 'glitch-microphone-intro-c-signal',
    direction: 'After the physical contact only, make the pre-existing blue signal arcs and distant console response slightly more legible without becoming VFX.'
  }
}

function parseTargets() {
  const allowedArgs = new Set(['--plan', '--execute'])
  const onlyArg = process.argv.find((arg) => arg.startsWith('--only='))
  const referenceProfileArg = process.argv.find((arg) => arg.startsWith('--reference-profile='))
  const unknownArgs = process.argv.slice(2).filter((arg) => !allowedArgs.has(arg) && !arg.startsWith('--only=') && !arg.startsWith('--reference-profile='))

  if (unknownArgs.length) throw new Error(`Unknown argument(s): ${unknownArgs.join(', ')}`)

  if (process.argv.includes('--plan') && process.argv.includes('--execute')) {
    throw new Error('Use either --plan or --execute, not both.')
  }

  const targetNames = onlyArg
    ? onlyArg.replace('--only=', '').split(',').map((value) => value.trim()).filter(Boolean)
    : Object.keys(takes)

  const unknownTargets = targetNames.filter((target) => !takes[target])

  if (unknownTargets.length) throw new Error(`Unknown take(s): ${unknownTargets.join(', ')}`)

  const referenceProfileName = referenceProfileArg
    ? referenceProfileArg.replace('--reference-profile=', '')
    : 'sign-neutral-720-jpeg'

  const referenceProfile = referenceProfiles[referenceProfileName]

  if (!referenceProfile) {
    throw new Error(`Unknown reference profile "${referenceProfileName}". Allowed profiles: ${Object.keys(referenceProfiles).join(', ')}`)
  }

  return { targetNames, referenceProfileName, referenceProfile }
}

async function sha256(filePath) {
  const buffer = await fs.readFile(filePath)

  
return createHash('sha256').update(buffer).digest('hex')
}

async function sourcePreflight() {
  await fs.access(sourcePath)
  const actualSha256 = await sha256(sourcePath)

  if (actualSha256 !== expectedSourceSha256) {
    throw new Error(`Source SHA-256 mismatch. Expected ${expectedSourceSha256}, received ${actualSha256}. Stop and update the manifest only after reviewing the source change.`)
  }

  const stats = await fs.stat(sourcePath)

  return {
    path: sourcePath,
    sha256: actualSha256,
    bytes: stats.size,
    dimensions: '2160x3840',
    note: 'The canonical 4K PNG is never cropped or altered. Execution derives a 720x1280 model adapter because Gemini Omni Flash Preview supports 720p reference images.'
  }
}

async function prepareReference(source, referenceProfile) {
  const referencePath = path.join(refsDir, referenceProfile.fileName)

  const result = spawnSync('ffmpeg', [
    '-y',
    '-i', source.path,
    ...referenceProfile.ffmpegArgs,
    referencePath
  ], { encoding: 'utf8' })

  if (result.status !== 0) {
    throw new Error(`Could not prepare the ${referenceProfile.dimensions} ${referenceProfile.mimeType} model adapter: ${result.stderr || result.stdout}`)
  }

  const stats = await fs.stat(referencePath)

  return {
    path: referencePath,
    sha256: await sha256(referencePath),
    bytes: stats.size,
    profile: referenceProfile,
    dimensions: referenceProfile.dimensions,
    mimeType: referenceProfile.mimeType,
    derivedFrom: source.path,
    transformation: referenceProfile.transformation
  }
}

function commandOutput(command, args, failureHint) {
  try {
    return execFileSync(command, args, { encoding: 'utf8' }).trim()
  } catch (error) {
    throw new Error(`${failureHint}\n${error.stderr || error.message}`)
  }
}

function getAccessToken() {
  return commandOutput('gcloud', ['auth', 'print-access-token'], 'Google Cloud user authentication is unavailable. Run `gcloud auth login` before executing.')
}

function verifyAdc() {
  commandOutput('gcloud', ['auth', 'application-default', 'print-access-token'], 'Application Default Credentials are unavailable. Run `gcloud auth application-default login` before executing.')
}

function buildPrompt(variant) {
  if (variant.prompt) return variant.prompt

  return `Create one calm 24fps vertical cinematic broadcast-studio shot using the supplied 720x1280 reference image as the visual guide. Preserve its composition, the microphone, the hand and the existing navy, blue, green and warm practical lighting.

The first frame already shows a hand lightly touching the microphone grille. Hold that quiet moment, then the index fingertip makes one very small natural press and lifts only a few millimeters. Keep the hand, microphone and studio stable. Use one locked close camera with a barely perceptible slow push-in and shallow depth of field.

After the touch, the existing blue signal arcs pulse once very softly and distant console lights become slightly more active. The final moment is calm and still, ready for a hard cut to the next program scene.

${variant.direction}

No added people, no cuts, no text overlays, no music or speech.`
}

function readVideoPart(response) {
  const parts = response?.candidates?.[0]?.content?.parts || []

  const videoPart = parts.find((part) => {
    const inline = part.inlineData || part.inline_data
    const mimeType = inline?.mimeType || inline?.mime_type || ''

    
return inline?.data && mimeType.startsWith('video/')
  })

  const inline = videoPart?.inlineData || videoPart?.inline_data

  if (!inline?.data) {
    const error = new Error('Vertex response did not include an inline video payload.')

    error.responseSummary = {
      responseId: response?.responseId || response?.response_id || null,
      modelVersion: response?.modelVersion || response?.model_version || null,
      modelStatus: response?.modelStatus || response?.model_status || null,
      usageMetadata: response?.usageMetadata || response?.usage_metadata || null,
      promptFeedback: response?.promptFeedback || null,
      candidates: (response?.candidates || []).map((candidate) => ({
        finishReason: candidate?.finishReason || candidate?.finish_reason || null,
        finishMessage: candidate?.finishMessage || candidate?.finish_message || null,
        safetyRatings: candidate?.safetyRatings || candidate?.safety_ratings || null,
        parts: (candidate?.content?.parts || []).map((part) => ({
          text: typeof part.text === 'string' ? part.text.slice(0, 4000) : null,
          inlineData: part.inlineData || part.inline_data
            ? { mimeType: (part.inlineData || part.inline_data).mimeType || (part.inlineData || part.inline_data).mime_type || null, hasData: Boolean((part.inlineData || part.inline_data).data) }
            : null
        }))
      }))
    }
    throw error
  }

  return {
    data: inline.data,
    mimeType: inline.mimeType || inline.mime_type || 'video/mp4',
    responseText: parts.filter((part) => typeof part.text === 'string').map((part) => part.text).join('\n\n').slice(0, 4000)
  }
}

function probeVideo(filePath) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,duration',
    '-of', 'json',
    filePath
  ], { encoding: 'utf8' })

  if (result.status !== 0) return { ok: false, error: result.stderr || result.stdout }

  try {
    return { ok: true, stream: JSON.parse(result.stdout).streams?.[0] || null }
  } catch {
    return { ok: false, error: 'ffprobe returned invalid JSON.' }
  }
}

async function requestVideo({ token, reference, prompt, signal }) {
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: reference.mimeType, data: (await fs.readFile(reference.path)).toString('base64') } },
          { text: prompt }
        ]
      }
    ],
    generationConfig: { responseModalities: ['TEXT', 'VIDEO'] }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-goog-user-project': project,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal
  })

  const json = await response.json().catch(async () => ({ raw: await response.text().catch(() => '') }))

  if (!response.ok) {
    const error = new Error(`Vertex request failed with HTTP ${response.status}: ${JSON.stringify(json).slice(0, 2000)}`)

    error.statusCode = response.status
    throw error
  }

  return json
}

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

function canRetry(error) {
  return error?.statusCode === 429 || (error?.statusCode >= 500 && error?.statusCode <= 599)
}

async function requestVideoWithRetry(request) {
  const attempts = retryDelaysMs.length + 1

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await requestVideo(request)

      
return { response, attemptsUsed: attempt }
    } catch (error) {
      const delayMs = retryDelaysMs[attempt - 1]

      if (!canRetry(error) || delayMs === undefined) {
        error.attemptsUsed = attempt
        throw error
      }

      console.warn(`Vertex attempt ${attempt}/${attempts} failed with retryable status ${error.statusCode}; retrying after ${delayMs}ms.`)
      await sleep(delayMs)
    }
  }

  throw new Error('Retry loop exited unexpectedly.')
}

async function renderTake({ takeName, source, reference, token }) {
  const take = takes[takeName]
  const prompt = buildPrompt(take)
  const promptPath = path.join(promptsDir, `${takeName}.md`)
  const masterPath = path.join(mastersDir, `${take.stem}-omni-master.mp4`)
  const metadataPath = path.join(mastersDir, `${take.stem}-omni-master.metadata.json`)
  const startedAt = new Date().toISOString()

  await fs.writeFile(promptPath, prompt)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 300000)
    let requestResult

    try {
      requestResult = await requestVideoWithRetry({
        token,
        reference,
        prompt,
        signal: controller.signal
      })
    } finally {
      clearTimeout(timeout)
    }

    const response = requestResult.response
    const video = readVideoPart(response)
    const buffer = Buffer.from(video.data, 'base64')

    await fs.writeFile(masterPath, buffer)

    const metadata = {
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      project,
      location,
      model,
      endpoint,
      takeName,
      promptPath,
      source,
      reference,
      masterPath,
      outputBytes: buffer.length,
      videoMimeType: video.mimeType,
      videoProbe: probeVideo(masterPath),
      attemptsUsed: requestResult.attemptsUsed,
      usageMetadata: response.usageMetadata || null,
      responseText: video.responseText
    }

    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
    
return { takeName, masterPath, metadataPath, outputBytes: buffer.length }
  } catch (error) {
    await fs.writeFile(metadataPath, `${JSON.stringify({
      ok: false,
      startedAt,
      failedAt: new Date().toISOString(),
      project,
      location,
      model,
      takeName,
      source,
      reference,
      attemptsUsed: error?.attemptsUsed || 1,
      responseSummary: error?.responseSummary || null,
      error: error instanceof Error ? error.message : String(error)
    }, null, 2)}\n`)
    throw error
  }
}

async function main() {
  const { targetNames, referenceProfileName, referenceProfile } = parseTargets()
  const source = await sourcePreflight()

  const executionPlan = {
    mode: process.argv.includes('--execute') ? 'execute' : 'plan',
    runRoot,
    source,
    referencePlan: {
      profile: referenceProfileName,
      dimensions: referenceProfile.dimensions,
      mimeType: referenceProfile.mimeType,
      transformation: referenceProfile.transformation
    },
    endpoint,
    model,
    targets: targetNames.map((takeName) => ({ takeName, stem: takes[takeName].stem })),
    costNote: 'Approximate cost is governed by current Vertex pricing; verify before executing. This script never renders unless --execute is supplied.'
  }

  if (!process.argv.includes('--execute')) {
    console.log(JSON.stringify(executionPlan, null, 2))
    
return
  }

  verifyAdc()
  const token = getAccessToken()

  await Promise.all([refsDir, promptsDir, mastersDir, reviewDir].map((directory) => fs.mkdir(directory, { recursive: true })))
  const reference = await prepareReference(source, referenceProfile)

  const results = []

  for (const takeName of targetNames) {
    console.log(`Rendering ${takeName} (${takes[takeName].stem})`)
    results.push(await renderTake({ takeName, source, reference, token }))
  }

  console.log(JSON.stringify({ ok: true, ...executionPlan, results }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
