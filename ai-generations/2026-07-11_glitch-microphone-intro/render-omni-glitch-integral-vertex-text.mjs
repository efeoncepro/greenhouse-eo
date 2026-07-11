import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const endpoint = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`
const workspaceRoot = '/Users/jreye/Documents/greenhouse-eo'
const runRoot = path.join(workspaceRoot, 'ai-generations/2026-07-11_glitch-microphone-intro')
const promptPath = path.join(runRoot, 'prompts/omni-integral-vertex-text-to-video.md')
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-l-omni-integral-vertex-text-master.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-l-omni-integral-vertex-text-master.metadata.json')

const prompt = `A single continuous portrait 9:16 macro close-up in a real premium broadcast studio, at night. Locked camera, no cuts. The black broadcast microphone and boom occupy the lower-right foreground. A professional mixing console fills the lower background with restrained blue and green LEDs. An adult male hand enters from the upper left, warmly lit against deep navy studio shadows and electric blue practical light.

In the upper-right rear wall, a small red rectangular practical sign is physically mounted in the studio. Its exact readable text is: ON AIR. It is behind the hand and microphone, with real perspective, natural bokeh and a subtle red glow. It is part of the set, never a title, overlay, floating card or foreground element.

0.00–0.55: the relaxed index fingertip hovers 6–10 mm above the upper-front metal grille. 0.55–0.67: the soft fingertip pad makes a light microphone soundcheck tap, contacts the grille for one or two frames only, and immediately rebounds to a visible hover. 0.67–1.08: calm air gap. 1.08–1.25: the same fingertip makes a second gentle tap, again only one or two frames, then immediately rebounds. It reads tap, lift, tap, lift: never press, hold, drag, button click, squeeze or microphone deformation. The wrist, palm, forearm, boom and microphone remain stable; natural anatomy, no extra fingers.

Only after the second rebound, the blue studio signal arcs and console light answer once, very subtly. Then hold still for a clean hard cut. Native sound: exactly two close, quiet, damped fingertip-on-microphone-grille foley hits, each a small muted toc with a tiny microphone-body response. No mouse click, keyboard, plastic button, nail, metallic ping, beep, room tone, music, dialogue, voice, third accent or signal sound. No captions, new text, logo, UI, extra people or glitch effect.`

function parseMode() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--plan')) return 'plan'
  if (args.length === 1 && args[0] === '--execute') return 'execute'
  throw new Error('Usage: node render-omni-glitch-integral-vertex-text.mjs [--plan|--execute]')
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
    '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate',
    '-of', 'json',
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

  const plan = {
    runId: '2026-07-11_glitch-microphone-intro',
    take: 'l-omni-integral-vertex-text',
    mode,
    provider: 'Vertex AI / Gemini Omni generateContent',
    project,
    location,
    model,
    task: 'text_to_video inferred by Vertex from a text-only request',
    outputPath,
    prompt,
    sourceDirection: 'The 4K key visual and storyboard direct composition and light. They are not transmitted because Omni blocks their intact practical-containing pixels before generation.',
    constraints: [
      'ON AIR is specified as a physical practical generated inside the shot, never post-composed.',
      'The gesture is tap, lift, tap, lift, not pressure.',
      'The native Omni audio is reviewed as a candidate, not automatically accepted.'
    ]
  }

  if (mode === 'plan') {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)

return
  }

  verifyAdc()
  const token = getAccessToken()

  await fs.mkdir(path.dirname(promptPath), { recursive: true })
  await fs.writeFile(promptPath, `${prompt}\n`)
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
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'VIDEO'] }
      })
    })

    const json = await response.json().catch(async () => ({ raw: await response.text().catch(() => '') }))

    if (!response.ok) throw new Error(`Vertex Omni request failed with HTTP ${response.status}: ${JSON.stringify(json).slice(0, 3000)}`)
    const video = findVideo(json)

    if (!video) throw new Error(`Vertex Omni returned no video: ${JSON.stringify(summarizeResponse(json))}`)

    const buffer = Buffer.from(video.data, 'base64')

    await fs.writeFile(outputPath, buffer)

    const metadata = {
      ok: true,
      ...plan,
      startedAt,
      completedAt: new Date().toISOString(),
      promptPath,
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
      promptPath,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

await main()
