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
const referencePath = path.join(runRoot, 'refs/microfono-broadcast-sign-neutral-720x1280-omni-reference.jpg')
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-q-omni-source-design-practical-master.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-q-omni-source-design-practical-master.metadata.json')
const promptPath = path.join(runRoot, 'prompts/omni-source-design-practical-v5.md')

const prompt = `Use the supplied portrait image as an exact visual blueprint and preserve its entire art direction. Keep the same adult male hand, warm skin texture, black horizontal broadcast microphone at lower right, boom hardware, console, headphones, near-black/navy studio, cold electric-blue practical lines, restrained neon-green waveform/console lights, and tiny warm gold highlights on the grille. Keep its same close vertical composition, lens, contrast and deep navy-blue-green night palette. Do not replace it with a warm brown/amber podcast room, yellow speakers, a new microphone design, a vertical microphone, a different boom, a different desk or a different framing.

At the existing small red rear-wall practical position, restore a real physical red illuminated studio sign whose readable letters are ON AIR. The sign is small, behind the hand and microphone, mounted to the wall with real perspective, bokeh and red spill. It is part of the original physical room from the first frame. It must not be an overlay, floating card, foreground label, masked patch or graphic, and it must never cover the fingertip.

The finger begins hovering 8 millimetres above the upper metal microphone grille. Perform a normal subtle live-mic test: tap tap. The same relaxed index fingertip gives two short gentle downward flicks, and after each contact it immediately springs back to a clearly visible air gap before the next. It reads strike, rebound, air gap, strike, rebound: never press, hold, rest, squeeze, drag, click a button or deform the metal mesh. Keep wrist, palm, forearm, other fingers, microphone, boom and camera stable. Only after the second rebound, let the existing blue/green console response wake once, quietly. Then settle for the hard cut.

Native sound: exactly two synchronized soft dry fingertip-on-metal-microphone-grille tocs, a small muted low body and immediate decay. No music, voice, room tone, UI click, plastic button, keyboard, nail tick, metallic ring, beep, radio static, third event or signal sound.`

async function sha256(filePath) { return createHash('sha256').update(await fs.readFile(filePath)).digest('hex') }

function commandOutput(command, args, hint) { try { return execFileSync(command, args, { encoding: 'utf8' }).trim() } catch (error) { throw new Error(`${hint}\n${error.stderr || error.message}`) } }

function token() { commandOutput('gcloud', ['auth', 'application-default', 'print-access-token'], 'Application Default Credentials are unavailable.'); 

return commandOutput('gcloud', ['auth', 'print-access-token'], 'Google Cloud user authentication is unavailable.') }

function findVideo(response) { const parts = response?.candidates?.[0]?.content?.parts || [];

 const part = parts.find((entry) => { const inline = entry.inlineData || entry.inline_data;

 

return inline?.data && String(inline?.mimeType || inline?.mime_type || '').startsWith('video/') });

 const inline = part?.inlineData || part?.inline_data;

 if (!inline?.data) throw new Error(`Vertex Omni returned no video: ${JSON.stringify({ promptFeedback: response?.promptFeedback || null, candidates: response?.candidates || [] }).slice(0, 4000)}`); 

return { data: inline.data, mimeType: inline.mimeType || inline.mime_type || 'video/mp4' } }

function probe(filePath) { const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', filePath], { encoding: 'utf8' });

 if (result.status !== 0) throw new Error(`ffprobe failed: ${result.stderr || result.stdout}`); 

return JSON.parse(result.stdout) }

function responseSummary(response) { return { responseId: response?.responseId || response?.response_id || null, modelVersion: response?.modelVersion || response?.model_version || null, usageMetadata: response?.usageMetadata || response?.usage_metadata || null, promptFeedback: response?.promptFeedback || response?.prompt_feedback || null, candidates: (response?.candidates || []).map((candidate) => ({ finishReason: candidate?.finishReason || candidate?.finish_reason || null, finishMessage: candidate?.finishMessage || candidate?.finish_message || null, safetyRatings: candidate?.safetyRatings || candidate?.safety_ratings || null, parts: (candidate?.content?.parts || []).map((part) => ({ text: typeof part.text === 'string' ? part.text.slice(0, 1000) : null, mimeType: (part.inlineData || part.inline_data)?.mimeType || (part.inlineData || part.inline_data)?.mime_type || null, hasData: Boolean((part.inlineData || part.inline_data)?.data) })) })) } }

async function main() {
  const mode = process.argv[2] || '--plan'

  if (!['--plan', '--execute'].includes(mode) || process.argv.length > 3) throw new Error('Usage: node render-omni-glitch-source-design-jpeg-v5.mjs [--plan|--execute]')
  if (await sha256(sourcePath) !== sourceSha256) throw new Error('Canonical source hash mismatch; stop.')
  await fs.access(referencePath)
  const reference = { path: referencePath, sha256: await sha256(referencePath), bytes: (await fs.stat(referencePath)).size, mimeType: 'image/jpeg', derivation: '720x1280 JPEG derived from canonical 4K key visual. It preserves the full visual design, hand, microphone, console and palette; the original legible sign panel is defocused only in inference reference because this preview blocks the intact source. The final sign must be born physically in the generated scene, never composited after.' }
  const plan = { mode, provider: 'Vertex AI / Gemini Omni generateContent', project, location, model, task: 'image-to-video inferred from a JPEG reference plus text', canonicalSource: { path: sourcePath, sha256: sourceSha256 }, reference, outputPath, constraints: ['Preserve supplied art direction and object design.', 'The ON AIR sign must be physical/generated in-scene.', 'No visual post-compositing.', 'Tap, rebound, gap, tap, rebound with two native foley hits.'] }

  if (mode === '--plan') return process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
  const startedAt = new Date().toISOString()

  await fs.mkdir(path.dirname(promptPath), { recursive: true })
  await fs.writeFile(promptPath, `${prompt}\n`)

  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: (await fs.readFile(referencePath)).toString('base64') } }, { text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'VIDEO'] } }) })
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
