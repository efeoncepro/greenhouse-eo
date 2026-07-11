import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const project = 'efeonce-group'
const model = 'gemini-omni-flash-preview'
const runRoot = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-07-11_glitch-microphone-intro'
const referencePath = path.join(runRoot, 'refs/glitch-keyref-hand-light-720.jpg')
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-r-omni-hand-reference-practical-master.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-r-omni-hand-reference-practical-master.metadata.json')
const promptPath = path.join(runRoot, 'prompts/omni-hand-reference-practical-v6.md')

const prompt = `Animate the supplied portrait image as the exact visual world. Preserve the same hand, black horizontal broadcast microphone, right-side boom, console, headphone silhouette, deep black/navy shadows, cold electric-blue lines, tiny neon-green waveform/console lights, tight vertical framing and high contrast. Do not introduce a warm brown or amber studio, yellow speakers, alternate microphone, vertical microphone, different boom, different desk, new composition or new color palette.

In the upper rear wall, behind the hand and microphone, place the familiar small red illuminated practical sign used by a radio studio to tell the room that the transmission is live. It is a real mounted object in the same navy set, with wall perspective, soft red spill, shallow-focus bokeh, two bold white capital words and no overlap with the fingertip. It is never a floating graphic, overlay, title, card, mask or foreground element.

The relaxed index fingertip performs a genuine microphone sound check: two quick, gentle fingertip taps on the upper metal grille. Each contact is a compact flick down and an immediate visible spring-back into open air before the next. The gesture reads tap, bounce, air gap, tap, bounce; never press, rest, hold, drag, squeeze, button click or deform the microphone. Keep wrist, palm, forearm, other fingers, microphone, boom and camera stable. After the second rebound the existing blue and green practicals answer once, very subtly, then the hand withdraws and the microphone holds ready for a hard cut.

Native sound has exactly two synchronized dry, muted fingertip-on-metal-mesh tocs with a small low body and short decay. No music, dialogue, voice, room tone, UI click, keyboard, nail tick, long metallic ring, beep, radio static, third impact or sound effect.`

function commandOutput(command, args, hint) { try { return execFileSync(command, args, { encoding: 'utf8' }).trim() } catch (error) { throw new Error(`${hint}\n${error.stderr || error.message}`) } }

function token() { commandOutput('gcloud', ['auth', 'application-default', 'print-access-token'], 'Application Default Credentials are unavailable.'); 

return commandOutput('gcloud', ['auth', 'print-access-token'], 'Google Cloud user authentication is unavailable.') }

function probe(filePath) { const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate', '-of', 'json', filePath], { encoding: 'utf8' });

 if (result.status !== 0) throw new Error(`ffprobe failed: ${result.stderr || result.stdout}`); 

return JSON.parse(result.stdout) }

function findVideo(response) { const parts = response?.candidates?.[0]?.content?.parts || [];

 const part = parts.find((entry) => { const inline = entry.inlineData || entry.inline_data;

 

return inline?.data && String(inline?.mimeType || inline?.mime_type || '').startsWith('video/') });

 const inline = part?.inlineData || part?.inline_data;

 if (!inline?.data) throw new Error(`Vertex Omni returned no video: ${JSON.stringify({ promptFeedback: response?.promptFeedback || null, candidates: response?.candidates || [] }).slice(0, 4000)}`); 

return { data: inline.data, mimeType: inline.mimeType || inline.mime_type || 'video/mp4' } }

async function main() {
  const mode = process.argv[2] || '--plan'

  if (!['--plan', '--execute'].includes(mode) || process.argv.length > 3) throw new Error('Usage: node render-omni-glitch-hand-jpeg-practical-v6.mjs [--plan|--execute]')
  await fs.access(referencePath)
  const plan = { mode, provider: 'Vertex AI / Gemini Omni generateContent', project, location: 'global', model, task: 'image-to-video inferred from JPEG reference plus text', referencePath, outputPath, constraints: ['Keep reference visual identity.', 'Use only an in-set live-transmission practical sign, never an overlay.', 'Two tap-and-rebound events with native foley.'] }

  if (mode === '--plan') return process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
  const startedAt = new Date().toISOString()

  await fs.writeFile(promptPath, `${prompt}\n`)

  try {
    const response = await fetch(`https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/${model}:generateContent`, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: (await fs.readFile(referencePath)).toString('base64') } }, { text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'VIDEO'] } }) })
    const json = await response.json().catch(async () => ({ raw: await response.text().catch(() => '') }))

    if (!response.ok) throw new Error(`Vertex Omni request failed with HTTP ${response.status}: ${JSON.stringify(json).slice(0, 4000)}`)
    const video = findVideo(json)
    const buffer = Buffer.from(video.data, 'base64')

    await fs.writeFile(outputPath, buffer)
    const metadata = { ok: true, ...plan, startedAt, completedAt: new Date().toISOString(), promptPath, output: { path: outputPath, bytes: buffer.length, mimeType: video.mimeType, probe: probe(outputPath) }, promptFeedback: json?.promptFeedback || null, usageMetadata: json?.usageMetadata || null }

    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ ok: true, metadataPath, output: metadata.output })}\n`)
  } catch (error) {
    await fs.writeFile(metadataPath, `${JSON.stringify({ ok: false, ...plan, startedAt, failedAt: new Date().toISOString(), promptPath, error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`)
    throw error
  }
}

await main()
