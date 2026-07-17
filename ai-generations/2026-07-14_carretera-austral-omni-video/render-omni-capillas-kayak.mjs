import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const endpoint = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`

const workspaceRoot = '/Users/jreye/Documents/greenhouse-eo'
const runRoot = path.join(workspaceRoot, 'ai-generations/2026-07-14_carretera-austral-omni-video')
const firstFramePath = path.join(runRoot, 'keyframes/capillas-kayak-first-frame-16x9.png')
const promptPath = path.join(runRoot, 'prompts/omni-capillas-kayak.md')
const outputPath = path.join(runRoot, 'masters/carretera-austral-capillas-kayak-omni-master.mp4')
const metadataPath = path.join(runRoot, 'masters/carretera-austral-capillas-kayak-omni-master.metadata.json')

function parseMode() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--plan')) return 'plan'
  if (args.length === 1 && args[0] === '--execute') return 'execute'
  throw new Error('Usage: node render-omni-capillas-kayak.mjs [--plan|--execute]')
}

function commandOutput(command, args, failureHint) {
  try {
    return execFileSync(command, args, { encoding: 'utf8' }).trim()
  } catch (error) {
    throw new Error(`${failureHint}\n${error.stderr || error.message}`)
  }
}

function getAccessToken() {
  return commandOutput('gcloud', ['auth', 'print-access-token'], 'Google Cloud user authentication is unavailable. Run gcloud auth login before executing.')
}

function verifyAdc() {
  commandOutput('gcloud', ['auth', 'application-default', 'print-access-token'], 'Application Default Credentials are unavailable. Run gcloud auth application-default login before executing.')
}

function findVideo(response) {
  const parts = response?.candidates?.[0]?.content?.parts || []

  const videoPart = parts.find((part) => {
    const inline = part.inlineData || part.inline_data
    const mimeType = inline?.mimeType || inline?.mime_type || ''

    return inline?.data && mimeType.startsWith('video/')
  })

  const inline = videoPart?.inlineData || videoPart?.inline_data

  if (!inline?.data) return null

  return { data: inline.data, mimeType: inline.mimeType || inline.mime_type || 'video/mp4' }
}

function summarizeResponse(response) {
  return {
    responseId: response?.responseId || response?.response_id || null,
    modelVersion: response?.modelVersion || response?.model_version || null,
    usageMetadata: response?.usageMetadata || response?.usage_metadata || null,
    promptFeedback: response?.promptFeedback || response?.prompt_feedback || null,
    candidates: (response?.candidates || []).map((candidate) => ({
      finishReason: candidate?.finishReason || candidate?.finish_reason || null,
      finishMessage: candidate?.finishMessage || candidate?.finish_message || null,
      safetyRatings: candidate?.safetyRatings || candidate?.safety_ratings || null,
      parts: (candidate?.content?.parts || []).map((part) => ({
        text: typeof part.text === 'string' ? part.text.slice(0, 1000) : null,
        mimeType: (part.inlineData || part.inline_data)?.mimeType || (part.inlineData || part.inline_data)?.mime_type || null,
        hasData: Boolean((part.inlineData || part.inline_data)?.data)
      }))
    }))
  }
}

function probeVideo(filePath) {
  const result = spawnSync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration,size,bit_rate:stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate',
    '-of',
    'json',
    filePath
  ], { encoding: 'utf8' })

  if (result.status !== 0) return { ok: false, error: result.stderr || result.stdout }

  return { ok: true, data: JSON.parse(result.stdout) }
}

async function writeMetadata(payload) {
  await fs.mkdir(path.dirname(metadataPath), { recursive: true })
  await fs.writeFile(metadataPath, `${JSON.stringify(payload, null, 2)}\n`)
}

async function main() {
  const mode = parseMode()
  const prompt = await fs.readFile(promptPath, 'utf8')

  const plan = {
    runId: '2026-07-14_carretera-austral-omni-video',
    take: 'capillas-kayak-omni-master',
    mode,
    provider: 'Google Cloud / Vertex AI / Gemini Omni generateContent',
    project,
    location,
    model,
    endpoint,
    task: 'image_to_video using a generated first frame anchored to the article image',
    firstFramePath,
    outputPath,
    promptPath,
    constraints: [
      'Illustrative generated asset, not documentary SKY footage.',
      'No logos, text overlays, UI, SKY uniforms, or recognizable real people.',
      'Native audio is reviewed as a candidate before publication.'
    ]
  }

  if (mode === 'plan') {
    process.stdout.write(`${JSON.stringify({ ...plan, prompt }, null, 2)}\n`)

    return
  }

  verifyAdc()
  const token = getAccessToken()
  const firstFrame = await fs.readFile(firstFramePath)
  const startedAt = new Date().toISOString()

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-goog-user-project': project,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: firstFrame.toString('base64')
                }
              },
              { text: prompt }
            ]
          }
        ],
        generationConfig: { responseModalities: ['TEXT', 'VIDEO'] }
      })
    })

    const json = await response.json().catch(async () => ({ raw: await response.text().catch(() => '') }))

    if (!response.ok) throw new Error(`Vertex Omni request failed with HTTP ${response.status}: ${JSON.stringify(json).slice(0, 3000)}`)
    const video = findVideo(json)

    if (!video) throw new Error(`Vertex Omni returned no video: ${JSON.stringify(summarizeResponse(json))}`)

    const buffer = Buffer.from(video.data, 'base64')

    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, buffer)

    const metadata = {
      ok: true,
      ...plan,
      startedAt,
      completedAt: new Date().toISOString(),
      response: summarizeResponse(json),
      output: { path: outputPath, bytes: buffer.length, mimeType: video.mimeType, probe: probeVideo(outputPath) }
    }

    await writeMetadata(metadata)
    process.stdout.write(`${JSON.stringify({ ok: true, metadataPath, output: metadata.output, response: metadata.response }, null, 2)}\n`)
  } catch (error) {
    await writeMetadata({
      ok: false,
      ...plan,
      startedAt,
      failedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

await main()
