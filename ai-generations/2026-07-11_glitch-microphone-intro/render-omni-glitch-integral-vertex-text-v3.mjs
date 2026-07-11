import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const endpoint = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`
const runRoot = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-07-11_glitch-microphone-intro'
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-o-omni-integral-natural-double-tap-master.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-o-omni-integral-natural-double-tap-master.metadata.json')
const promptPath = path.join(runRoot, 'prompts/omni-integral-natural-double-tap-v3.md')

const prompt = `Three-second locked portrait 9:16 macro shot in a real premium radio broadcast studio at night, no cuts. A black broadcast microphone on its boom is in the foreground. A restrained mixing console is behind it with blue and green practical LEDs. An adult male audio engineer's natural hand enters from upper left. A small red rectangular ON AIR sign is physically fixed to the rear wall, behind the hand and microphone. The sign has true perspective, bokeh, and red practical spill; it is part of the set, never a graphic, title, overlay, foreground card or blur patch.

The engineer performs the ordinary real-world test of a live microphone: tap tap. With a relaxed arched index finger, the soft fingertip makes two quick, tiny downward flicks on the top metal grille. Each flick is a gentle strike and immediate bounce: fingertip hits the mesh for a moment, then springs visibly back into open air before the next flick. The camera sees a clear air gap after each tap. It is never a finger pushing down, pressing a button, resting on the grille, slowly lowering, dragging, squeezing or holding. The index finger's distal joint provides the bounce; wrist and other fingers remain relaxed and quiet. The metal grille and microphone do not dent, bend or move. Natural anatomy, no extra fingers.

Native sound contains exactly two synchronized small dry microphone-check impacts: fingertip pad against metal mesh, a muted low toc with almost instantaneous decay. Silence otherwise: no clicks, plastic button sounds, nail ticks, bell-like metal ring, beeps, radio static, music, voice, dialogue or extra hit. After the second rebound, one restrained blue console indicator wakes and then the shot holds still for a hard cut.`

function commandOutput(command, args, hint) { try { return execFileSync(command, args, { encoding: 'utf8' }).trim() } catch (error) { throw new Error(`${hint}\n${error.stderr || error.message}`) } }

function token() { commandOutput('gcloud', ['auth', 'application-default', 'print-access-token'], 'Application Default Credentials are unavailable.'); 

return commandOutput('gcloud', ['auth', 'print-access-token'], 'Google Cloud user authentication is unavailable.') }

function findVideo(response) {
  const parts = response?.candidates?.[0]?.content?.parts || []

  const part = parts.find((entry) => { const inline = entry.inlineData || entry.inline_data;

 

return inline?.data && String(inline?.mimeType || inline?.mime_type || '').startsWith('video/') })

  const inline = part?.inlineData || part?.inline_data

  if (!inline?.data) throw new Error(`Vertex Omni returned no video: ${JSON.stringify({ promptFeedback: response?.promptFeedback || null, candidates: response?.candidates || [] }).slice(0, 4000)}`)
  
return { data: inline.data, mimeType: inline.mimeType || inline.mime_type || 'video/mp4' }
}

function probe(filePath) { const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', filePath], { encoding: 'utf8' });

 if (result.status !== 0) throw new Error(`ffprobe failed: ${result.stderr || result.stdout}`); 

return JSON.parse(result.stdout) }

function responseSummary(response) { return { responseId: response?.responseId || response?.response_id || null, modelVersion: response?.modelVersion || response?.model_version || null, usageMetadata: response?.usageMetadata || response?.usage_metadata || null, promptFeedback: response?.promptFeedback || response?.prompt_feedback || null, candidates: (response?.candidates || []).map((candidate) => ({ finishReason: candidate?.finishReason || candidate?.finish_reason || null, finishMessage: candidate?.finishMessage || candidate?.finish_message || null, safetyRatings: candidate?.safetyRatings || candidate?.safety_ratings || null, parts: (candidate?.content?.parts || []).map((part) => ({ text: typeof part.text === 'string' ? part.text.slice(0, 1000) : null, mimeType: (part.inlineData || part.inline_data)?.mimeType || (part.inlineData || part.inline_data)?.mime_type || null, hasData: Boolean((part.inlineData || part.inline_data)?.data) })) })) } }

async function main() {
  const mode = process.argv[2] || '--plan'

  if (!['--plan', '--execute'].includes(mode) || process.argv.length > 3) throw new Error('Usage: node render-omni-glitch-integral-vertex-text-v3.mjs [--plan|--execute]')
  const plan = { mode, provider: 'Vertex AI / Gemini Omni generateContent', project, location, model, task: 'text-to-video inferred from a text-only request', outputPath, constraints: ['The ON AIR sign is a physical generated practical.', 'No post-compositing.', 'Gesture must read strike, bounce, gap, strike, bounce.'] }

  if (mode === '--plan') return process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
  const startedAt = new Date().toISOString()

  await fs.mkdir(path.dirname(promptPath), { recursive: true })
  await fs.writeFile(promptPath, `${prompt}\n`)

  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'VIDEO'] } }) })
    const json = await response.json().catch(async () => ({ raw: await response.text().catch(() => '') }))

    if (!response.ok) throw new Error(`Vertex Omni request failed with HTTP ${response.status}: ${JSON.stringify(json).slice(0, 4000)}`)
    const video = findVideo(json)
    const buffer = Buffer.from(video.data, 'base64')

    await fs.writeFile(outputPath, buffer)
    const metadata = { ok: true, ...plan, startedAt, completedAt: new Date().toISOString(), promptPath, output: { path: outputPath, bytes: buffer.length, mimeType: video.mimeType, probe: probe(outputPath) }, response: responseSummary(json) }

    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ ok: true, metadataPath, output: metadata.output, response: metadata.response }, null, 2)}\n`)
  } catch (error) {
    await fs.writeFile(metadataPath, `${JSON.stringify({ ok: false, ...plan, startedAt, failedAt: new Date().toISOString(), promptPath, error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`)
    throw error
  }
}

await main()
