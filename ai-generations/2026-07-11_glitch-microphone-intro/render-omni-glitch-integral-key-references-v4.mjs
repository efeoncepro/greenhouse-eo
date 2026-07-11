import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const project = 'efeonce-group'
const location = 'global'
const model = 'gemini-omni-flash-preview'
const endpoint = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`
const runRoot = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-07-11_glitch-microphone-intro'
const sourcePath = '/Users/jreye/Downloads/microfono_broadcast_video_assets/microfono_broadcast_9x16_2160x3840.png'
const sourceSha256 = 'fde797f7a096587392ea3cffb4ada4ff260f0e1329e38135ade32cae4904608e'

const references = [
  { role: 'hand-and-light', path: path.join(runRoot, 'refs/glitch-keyref-hand-light-720.png') },
  { role: 'microphone-and-console', path: path.join(runRoot, 'refs/glitch-keyref-mic-console-720.png') },
  { role: 'navy-blue-practicals', path: path.join(runRoot, 'refs/glitch-keyref-navy-blue-practicals-720.png') }
]

const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-p-omni-key-reference-integral-master.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-p-omni-key-reference-integral-master.metadata.json')
const promptPath = path.join(runRoot, 'prompts/omni-key-reference-integral-v4.md')

const prompt = `Use the supplied visual reference crops as one exact art-direction blueprint for a single 9:16 vertical broadcast-studio shot. Reconstruct their same physical world, not a generic podcast or warm wood studio: the same adult male hand and skin texture, the same black horizontal broadcast microphone with large rounded black mesh grille and gold edge highlights, the same right-side boom hardware, the same mixing console, headphones, deep black/navy room, electric blue practical lines and small neon-green console/waveform accents. Preserve the key visual's high-contrast navy-blue-green palette and cool night lighting. Do not introduce amber/brown room lighting, yellow studio speakers, alternate microphone design, a vertical microphone, a different boom, a different desk or a different composition.

One locked, cinematic macro camera. The hand enters from the upper-left and the microphone occupies the lower-right foreground, as in the references. A small red rectangular ON AIR sign is physically mounted on the rear studio wall, behind both the hand and the microphone. It has natural perspective, bokeh and red spill, remains small in the background and never overlaps the fingertip. It is part of the set from the first frame, not overlay text, a floating card, mask or post-production element.

The engineer performs a normal microphone test: tap tap. The relaxed index fingertip hovers above the metal grille, then makes two light, compact fingertip strikes. Each is clearly tap then immediate bounce into a visible air gap before the next: no press, no resting contact, no slow push, no button click, no squeeze, no drag and no microphone deformation. Wrist, forearm, other fingers, boom and camera stay quiet. After the second rebound, only the already-present blue/green studio practicals answer subtly, then the hand withdraws and the microphone holds ready for the cut.

Native sound is exactly two quiet dry fingertip-to-metal-microphone-grille tocs, short and damped with a modest low body. No music, voice, room tone, UI click, plastic button sound, keyboard, nail tick, metallic ring, beep, radio static, third accent or signal sound.`

async function sha256(filePath) {
  return createHash('sha256').update(await fs.readFile(filePath)).digest('hex')
}

function commandOutput(command, args, hint) {
  try { return execFileSync(command, args, { encoding: 'utf8' }).trim() } catch (error) { throw new Error(`${hint}\n${error.stderr || error.message}`) }
}

function token() {
  commandOutput('gcloud', ['auth', 'application-default', 'print-access-token'], 'Application Default Credentials are unavailable.')
  
return commandOutput('gcloud', ['auth', 'print-access-token'], 'Google Cloud user authentication is unavailable.')
}

function findVideo(response) {
  const parts = response?.candidates?.[0]?.content?.parts || []

  const part = parts.find((entry) => { const inline = entry.inlineData || entry.inline_data;

 

return inline?.data && String(inline?.mimeType || inline?.mime_type || '').startsWith('video/') })

  const inline = part?.inlineData || part?.inline_data

  if (!inline?.data) throw new Error(`Vertex Omni returned no video: ${JSON.stringify({ promptFeedback: response?.promptFeedback || null, candidates: response?.candidates || [] }).slice(0, 4000)}`)
  
return { data: inline.data, mimeType: inline.mimeType || inline.mime_type || 'video/mp4' }
}

function probe(filePath) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', filePath], { encoding: 'utf8' })

  if (result.status !== 0) throw new Error(`ffprobe failed: ${result.stderr || result.stdout}`)
  
return JSON.parse(result.stdout)
}

function responseSummary(response) {
  return {
    responseId: response?.responseId || response?.response_id || null,
    modelVersion: response?.modelVersion || response?.model_version || null,
    usageMetadata: response?.usageMetadata || response?.usage_metadata || null,
    promptFeedback: response?.promptFeedback || response?.prompt_feedback || null,
    candidates: (response?.candidates || []).map((candidate) => ({ finishReason: candidate?.finishReason || candidate?.finish_reason || null, finishMessage: candidate?.finishMessage || candidate?.finish_message || null, safetyRatings: candidate?.safetyRatings || candidate?.safety_ratings || null, parts: (candidate?.content?.parts || []).map((part) => ({ text: typeof part.text === 'string' ? part.text.slice(0, 1000) : null, mimeType: (part.inlineData || part.inline_data)?.mimeType || (part.inlineData || part.inline_data)?.mime_type || null, hasData: Boolean((part.inlineData || part.inline_data)?.data) })) }))
  }
}

async function main() {
  const mode = process.argv[2] || '--plan'

  if (!['--plan', '--execute'].includes(mode) || process.argv.length > 3) throw new Error('Usage: node render-omni-glitch-integral-key-references-v4.mjs [--plan|--execute]')
  if (await sha256(sourcePath) !== sourceSha256) throw new Error('Canonical 4K source hash mismatch; stop before producing references.')
  for (const reference of references) await fs.access(reference.path)
  const referenceManifest = await Promise.all(references.map(async (reference) => ({ ...reference, sha256: await sha256(reference.path), bytes: (await fs.stat(reference.path)).size, mimeType: 'image/png', derivation: 'crop and Lanczos reduction from canonical source; no blur, mask, replacement or overlay; the ON AIR panel is excluded from reference pixels because that complete input path is provider-blocked.' })))
  const plan = { mode, provider: 'Vertex AI / Gemini Omni generateContent', project, location, model, task: 'multi-reference image-to-video inferred from three unmodified source crops plus text', canonicalSource: { path: sourcePath, sha256: sourceSha256 }, references: referenceManifest, outputPath, constraints: ['Use the source design, palette, hand, microphone and console.', 'Generate the ON AIR sign in the physical plate; never compose it after generation.', 'Gesture is tap, rebound, air gap, tap, rebound.'] }

  if (mode === '--plan') return process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)

  const startedAt = new Date().toISOString()

  await fs.mkdir(path.dirname(promptPath), { recursive: true })
  await fs.writeFile(promptPath, `${prompt}\n`)

  try {
    const referenceParts = await Promise.all(references.map(async (reference) => ({ inlineData: { mimeType: 'image/png', data: (await fs.readFile(reference.path)).toString('base64') } })))
    const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [...referenceParts, { text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'VIDEO'] } }) })
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
