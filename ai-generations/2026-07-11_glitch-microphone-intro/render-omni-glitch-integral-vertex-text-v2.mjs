import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const endpoint = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`
const runRoot = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-07-11_glitch-microphone-intro'
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-n-omni-integral-ballistic-tap-master.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-n-omni-integral-ballistic-tap-master.metadata.json')
const promptPath = path.join(runRoot, 'prompts/omni-integral-ballistic-tap-v2.md')

const prompt = `Locked 24fps portrait 9:16 macro shot in a real premium night broadcast studio. No cuts. A black broadcast microphone on a boom fills the lower-right foreground; a mixing console with restrained blue and green LEDs is behind it. An adult male engineer's anatomically normal hand enters from upper left. On the rear wall, well behind the hand and microphone, a small red rectangular illuminated practical sign physically mounted in the studio reads exactly ON AIR. It has correct wall perspective, bokeh, red glow and occlusion like a real sign in the room. It is never a title, overlay, floating card, blur patch or foreground graphic.

Show an unambiguous ordinary microphone sound-check gesture, a gentle fingertip flick, NOT a press. The only moving part is the index finger at its distal joint. Frame 0: the soft index fingertip hovers clearly 12 mm above the upper metal grille. TAP ONE is a complete six-frame action: frames 13–15, quick gentle downward flick through open air; frame 16 only, finger pad touches metal mesh; frames 17–21, a visibly fast spring-back to a 12 mm air gap. Then it remains fully separated, hovering with a clearly visible gap for ten frames. TAP TWO repeats exactly: frames 32–34 approach; frame 35 only contacts; frames 36–40 spring back to a visible gap. Never depict fingertip contact on two consecutive frames. No hand press, resting, slow push, sustained contact, drag or squeeze. The microphone and mesh stay rigid and undeformed; wrist, forearm, other fingers, camera and boom stay still. No extra fingers or anatomy changes.

Exactly on each one-frame contact, native audio makes one quiet, dry and short close-mic fingertip-on-metal-mesh toc: soft low body, less than 0.15 seconds of decay. No click/button sound, keyboard, nail tick, metallic ping, beep, radio static, ambience, music, dialogue or third sound. Only after the second recoil, let distant blue console light respond once at low intensity. Hold quietly after that for a clean hard cut.`

function commandOutput(command, args, hint) {
  try { return execFileSync(command, args, { encoding: 'utf8' }).trim() } catch (error) { throw new Error(`${hint}\n${error.stderr || error.message}`) }
}

function accessToken() {
  commandOutput('gcloud', ['auth', 'application-default', 'print-access-token'], 'Application Default Credentials are unavailable.')
  
return commandOutput('gcloud', ['auth', 'print-access-token'], 'Google Cloud user authentication is unavailable.')
}

function readVideo(response) {
  const parts = response?.candidates?.[0]?.content?.parts || []

  const part = parts.find((entry) => {
    const inline = entry.inlineData || entry.inline_data

    
return inline?.data && String(inline?.mimeType || inline?.mime_type || '').startsWith('video/')
  })

  const inline = part?.inlineData || part?.inline_data

  if (!inline?.data) throw new Error(`Vertex Omni returned no video: ${JSON.stringify({ promptFeedback: response?.promptFeedback || null, candidates: response?.candidates || [] }).slice(0, 4000)}`)
  
return { data: inline.data, mimeType: inline.mimeType || inline.mime_type || 'video/mp4' }
}

function probe(filePath) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', filePath], { encoding: 'utf8' })

  if (result.status !== 0) throw new Error(`ffprobe failed: ${result.stderr || result.stdout}`)
  
return JSON.parse(result.stdout)
}

function summary(response) {
  return {
    responseId: response?.responseId || response?.response_id || null,
    modelVersion: response?.modelVersion || response?.model_version || null,
    usageMetadata: response?.usageMetadata || response?.usage_metadata || null,
    promptFeedback: response?.promptFeedback || response?.prompt_feedback || null,
    candidates: (response?.candidates || []).map((candidate) => ({
      finishReason: candidate?.finishReason || candidate?.finish_reason || null,
      finishMessage: candidate?.finishMessage || candidate?.finish_message || null,
      safetyRatings: candidate?.safetyRatings || candidate?.safety_ratings || null,
      parts: (candidate?.content?.parts || []).map((part) => ({ text: typeof part.text === 'string' ? part.text.slice(0, 1000) : null, mimeType: (part.inlineData || part.inline_data)?.mimeType || (part.inlineData || part.inline_data)?.mime_type || null, hasData: Boolean((part.inlineData || part.inline_data)?.data) }))
    }))
  }
}

async function main() {
  const mode = process.argv[2] || '--plan'

  if (!['--plan', '--execute'].includes(mode) || process.argv.length > 3) throw new Error('Usage: node render-omni-glitch-integral-vertex-text-v2.mjs [--plan|--execute]')
  const plan = { mode, provider: 'Vertex AI / Gemini Omni generateContent', project, location, model, task: 'text-to-video inferred from a text-only request', outputPath, constraints: ['Entire ON AIR sign is generated as a physical in-set practical.', 'No compositing or post-generated overlay.', 'The requested motion encodes a discrete contact/rebound frame contract.'] }

  if (mode === '--plan') return process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
  const token = accessToken()

  await fs.mkdir(path.dirname(promptPath), { recursive: true })
  await fs.writeFile(promptPath, `${prompt}\n`)
  const startedAt = new Date().toISOString()

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'VIDEO'] } })
    })

    const json = await response.json().catch(async () => ({ raw: await response.text().catch(() => '') }))

    if (!response.ok) throw new Error(`Vertex Omni request failed with HTTP ${response.status}: ${JSON.stringify(json).slice(0, 4000)}`)
    const video = readVideo(json)
    const buffer = Buffer.from(video.data, 'base64')

    await fs.writeFile(outputPath, buffer)
    const metadata = { ok: true, ...plan, startedAt, completedAt: new Date().toISOString(), promptPath, output: { path: outputPath, bytes: buffer.length, mimeType: video.mimeType, probe: probe(outputPath) }, response: summary(json) }

    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ ok: true, metadataPath, output: metadata.output, response: metadata.response }, null, 2)}\n`)
  } catch (error) {
    await fs.writeFile(metadataPath, `${JSON.stringify({ ok: false, ...plan, startedAt, failedAt: new Date().toISOString(), promptPath, error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`)
    throw error
  }
}

await main()
