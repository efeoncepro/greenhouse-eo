import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const endpoint = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`

const workspaceRoot = '/Users/jreye/Documents/greenhouse-eo'
const runRoot = path.join(workspaceRoot, 'ai-generations/2026-07-11_glitch-microphone-intro')
const sourcePath = path.join(runRoot, 'masters/glitch-microphone-intro-l-omni-integral-vertex-text-master.mp4')
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-m-omni-integral-tap-rebound-edit-master.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-m-omni-integral-tap-rebound-edit-master.metadata.json')
const promptPath = path.join(runRoot, 'prompts/omni-integral-tap-rebound-edit.md')

const prompt = `Edit this supplied portrait broadcast-studio video in place. Preserve the complete physical studio plate: same locked camera, microphone, boom, console, adult hand, skin, lighting, perspective, depth of field and the small red ON AIR practical mounted on the rear wall. The ON AIR sign is already physically in the set behind the hand and microphone; retain it as natural background practical signage. Never turn it into a title, overlay, floating card, foreground element, blur patch or graphic.

Change only the index-finger action during the first 1.4 seconds. This is a real microphone sound check, not pressing a button. The fingertip begins hovering 6–10 millimetres above the round metal mesh. At 0.55–0.67 s it performs TAP ONE: a small downward strike from the distal finger joint, a single-frame-to-two-frame touch of the soft finger pad on the mesh, and an immediate upward rebound. The fingertip must be visibly separated from the grille again by 0.75 s. At 1.08–1.25 s it performs TAP TWO with the same mechanism, then rebounds to a visible 10–12 millimetre air gap by 1.35 s. Read exactly: strike, contact, rebound; air gap; strike, contact, rebound. Never press, hold, push, rest, drag, squeeze or leave the fingertip on the microphone.

Keep the wrist, forearm and other fingers relaxed and almost still. The microphone, boom and grille remain rigid; no finger penetration, no mesh deformation, no camera move, no cuts, no extra fingers and no anatomy changes. Only after the second rebound may the existing distant console and blue practical light answer once, subtly. Then settle and hold.

Replace the native sound with exactly two synchronized quiet close-mic foley impacts at the two contacts: each is a dry, muted fingertip-on-metal-microphone-grille toc with a small low body thud and very short decay. No mouse click, plastic button click, keyboard, nail tick, metallic ping, beep, radio static, signal effect, room ambience, music, speech, third hit or other sound.`

function commandOutput(command, args, hint) {
  try {
    return execFileSync(command, args, { encoding: 'utf8' }).trim()
  } catch (error) {
    throw new Error(`${hint}\n${error.stderr || error.message}`)
  }
}

function getToken() {
  commandOutput('gcloud', ['auth', 'application-default', 'print-access-token'], 'Application Default Credentials are unavailable.')
  
return commandOutput('gcloud', ['auth', 'print-access-token'], 'Google Cloud user authentication is unavailable.')
}

function probe(filePath) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', filePath], { encoding: 'utf8' })

  if (result.status !== 0) throw new Error(`ffprobe failed: ${result.stderr || result.stdout}`)
  
return JSON.parse(result.stdout)
}

function videoFrom(response) {
  const parts = response?.candidates?.[0]?.content?.parts || []

  const part = parts.find((item) => {
    const inline = item.inlineData || item.inline_data
    const mimeType = inline?.mimeType || inline?.mime_type || ''

    
return inline?.data && mimeType.startsWith('video/')
  })

  const inline = part?.inlineData || part?.inline_data

  if (!inline?.data) throw new Error(`Vertex Omni returned no video: ${JSON.stringify({ promptFeedback: response?.promptFeedback || null, candidates: response?.candidates || [] }).slice(0, 4000)}`)
  
return { data: inline.data, mimeType: inline.mimeType || inline.mime_type || 'video/mp4' }
}

function responseSummary(response) {
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

async function main() {
  const mode = process.argv[2] || '--plan'

  if (!['--plan', '--execute'].includes(mode) || process.argv.length > 3) throw new Error('Usage: node edit-omni-glitch-l-tap-rebound.mjs [--plan|--execute]')

  await fs.access(sourcePath)
  const sourceProbe = probe(sourcePath)
  const sourceVideo = sourceProbe.streams.find((stream) => stream.codec_type === 'video')

  if (sourceVideo?.width !== 720 || sourceVideo?.height !== 1280 || sourceVideo?.r_frame_rate !== '24/1') throw new Error('Expected the 720x1280 24fps Omni take L as source.')

  const plan = {
    mode,
    provider: 'Vertex AI / Gemini Omni generateContent',
    model,
    task: 'video-to-video edit inferred from inline video input',
    sourcePath,
    outputPath,
    constraints: ['Preserve the integral physical ON AIR practical.', 'Change only the physical tap/rebound action and native foley.', 'No post-compositing.']
  }

  if (mode === '--plan') return process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)

  const token = getToken()

  await fs.mkdir(path.dirname(promptPath), { recursive: true })
  await fs.writeFile(promptPath, `${prompt}\n`)
  const startedAt = new Date().toISOString()

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType: 'video/mp4', data: (await fs.readFile(sourcePath)).toString('base64') } },
          { text: prompt }
        ] }],
        generationConfig: { responseModalities: ['TEXT', 'VIDEO'] }
      })
    })

    const json = await response.json().catch(async () => ({ raw: await response.text().catch(() => '') }))

    if (!response.ok) throw new Error(`Vertex Omni edit failed with HTTP ${response.status}: ${JSON.stringify(json).slice(0, 4000)}`)
    const video = videoFrom(json)
    const buffer = Buffer.from(video.data, 'base64')

    await fs.writeFile(outputPath, buffer)

    const metadata = {
      ok: true,
      ...plan,
      startedAt,
      completedAt: new Date().toISOString(),
      promptPath,
      sourceProbe,
      output: { path: outputPath, bytes: buffer.length, mimeType: video.mimeType, probe: probe(outputPath) },
      response: responseSummary(json)
    }

    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ ok: true, metadataPath, output: metadata.output, response: metadata.response }, null, 2)}\n`)
  } catch (error) {
    await fs.writeFile(metadataPath, `${JSON.stringify({ ok: false, ...plan, startedAt, failedAt: new Date().toISOString(), promptPath, error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`)
    throw error
  }
}

await main()
