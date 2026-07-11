import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const runRoot = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-07-11_glitch-microphone-intro'
const project = 'efeonce-group'
const model = 'bytedance/seedance-2.0/image-to-video'
const sourcePath = '/Users/jreye/Downloads/microfono_broadcast_video_assets/microfono_broadcast_9x16_2160x3840.png'
const expectedSourceSha256 = 'fde797f7a096587392ea3cffb4ada4ff260f0e1329e38135ade32cae4904608e'
const takeId = process.env.SEEDANCE_TAKE || 's'

if (!['s', 't'].includes(takeId)) throw new Error('SEEDANCE_TAKE must be s or t.')
const outputPath = path.join(runRoot, `masters/glitch-microphone-intro-${takeId}-seedance-2-source-keyvisual-master.mp4`)
const metadataPath = path.join(runRoot, `masters/glitch-microphone-intro-${takeId}-seedance-2-source-keyvisual-master.metadata.json`)
const promptPath = path.join(runRoot, `prompts/seedance-2-source-keyvisual-${takeId}-tap-tap.md`)
const pollTimeoutMs = 600_000
const pollIntervalMs = 3_000

const promptS = `@Image1 is the exact starting frame and immutable visual truth. Animate only its existing physical world; preserve every object, composition, lens, focus, color, practical light, black/navy contrast, electric-blue ceiling streaks, neon-green console accents, microphone, boom, headphones, console, hand and background signs exactly as photographed. Locked portrait 9:16 macro camera, no reframing, no cuts, no new objects, no text additions and no design or color changes.

At the start, the index fingertip gently lifts a few millimetres from the microphone grille into a natural hover. It performs the real live-studio sound-check action: tap, tap. The fingertip makes two compact, light strikes on the upper metal grille. Each tap is brief contact followed immediately by a visible elastic rebound and clear air gap before the next. It must never read as pressing a button, holding contact, slow pushing, dragging, squeezing, or bending the mesh. Wrist, palm, forearm, other fingers, microphone, boom and camera remain stable. After the second rebound, the existing studio lights answer once very subtly, then the hand retreats and the microphone holds ready for a hard cut.

Native audio: exactly two synchronized, quiet and dry fingertip-on-broadcast-microphone-grille tocs. Each is short, damped and has a small low body response. No music, no voice, no room ambience, no UI click, no keyboard, no nail tick, no metallic ring, no beep, no radio static, no third impact and no added sound effect.`

const promptT = `@Image1 is the exact starting frame and immutable visual truth. Keep the photographed studio completely locked: same portrait 9:16 composition, lens, camera, focus, black/navy palette, warm hand skin tone, electric-blue streaks, neon-green console accents, black horizontal broadcast microphone, boom, headphones, console and every existing practical light. The red ON AIR sign remains a small, fixed, physical sign in the rear of the same studio; do not emphasize it, move it, add text, replace it, or make it a graphic. No reframing, no cuts, no transitions, no new objects, no visual redesign, no colour shift, no animated screen or light response.

Animate one precise real-world sound-check gesture only. The fingertip seen touching at frame zero immediately breaks that inherited contact within the first 4 frames and rises 30–40 mm above the curved metal grille. It then makes exactly two light, percussive fingertip strikes, at approximately 1.45 seconds and 2.25 seconds. Each strike is a compact ballistic downstroke onto the top of the metal mesh, a contact lasting at most 2 output frames, then an immediate spring-like upward rebound. Between strike one and strike two the fingertip is visibly airborne above the grille for at least 8 consecutive frames; there is a clear dark air gap, no pressure, no deformation and no resting contact. The finger must never press, hold, drag, rub, stroke, squeeze, bend the mesh, touch a button, or slowly push down. Keep the wrist, palm, forearm, other fingers, microphone, boom and camera mechanically still. After the second rebound, lift the hand diagonally up-left and leave the microphone ready in its original position.

Native audio is otherwise silent: exactly two synchronized 100–150 ms dry, low, damped fingertip-on-broadcast-microphone-grille thuds, one for each visual contact. Do not make a click, tap on a button, metallic ring, UI sound, voice, music, ambience, room tone, beep, static, whoosh, third transient or tail.`

const prompt = takeId === 's' ? promptS : promptT

const sha256 = async filePath => createHash('sha256').update(await fs.readFile(filePath)).digest('hex')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function getFalKey() {
  const { stdout } = await execFileAsync('gcloud', ['secrets', 'versions', 'access', 'latest', '--secret=greenhouse-fal-api-key', `--project=${project}`], { maxBuffer: 1024 * 1024 })
  const value = stdout.trim()

  if (!value) throw new Error('Fal API key resolved empty from Secret Manager.')
  
return value
}

const headers = apiKey => ({ Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' })

async function requestJson(url, options) {
  const response = await fetch(url, options)
  const body = await response.json().catch(() => null)

  
return { response, body }
}

function parseMode() {
  const mode = process.argv[2] || '--plan'

  if (!['--plan', '--execute', '--recover'].includes(mode) || process.argv.length > 3) throw new Error('Usage: node render-seedance-2-source-keyvisual-direct-queue.mjs [--plan|--execute|--recover]')
  
return mode
}

async function pollToResult({ apiKey, requestId, statusUrl, responseUrl }) {
  const started = Date.now()

  while (Date.now() - started < pollTimeoutMs) {
    await sleep(pollIntervalMs)
    const { response, body } = await requestJson(statusUrl, { headers: headers(apiKey) })

    if (!response.ok) throw new Error(`Fal status failed with HTTP ${response.status}.`)
    const status = body?.status

    if (status === 'COMPLETED') {
      const result = await requestJson(responseUrl, { headers: headers(apiKey) })

      if (!result.response.ok) throw new Error(`Fal result fetch failed with HTTP ${result.response.status}.`)
      
return result.body
    }

    if (status !== 'IN_QUEUE' && status !== 'IN_PROGRESS') throw new Error(`Fal job ${requestId} reached unexpected status ${status || 'unknown'}.`)
  }

  throw new Error(`Fal job ${requestId} did not complete inside ${pollTimeoutMs} ms.`)
}

async function main() {
  const mode = parseMode()
  const sourceHash = await sha256(sourcePath)

  if (sourceHash !== expectedSourceSha256) throw new Error('Canonical 4K source hash mismatch; stop before generation.')
  const sourceStats = await fs.stat(sourcePath)

  const plan = {
    provider: 'fal.ai direct queue fallback',
    takeId,
    reasonForFallback: 'The canonical runFalModel helper stalled before returning a Fal request ID in this CLI process. This out-of-band script follows the same official queue contract and obtains the existing key only through GCP Secret Manager; it never prints or persists the key.',
    model,
    task: 'image-to-video',
    input: { path: sourcePath, sha256: sourceHash, dimensions: '2160x3840', mimeType: 'image/png' },
    outputPath,
    expected: '5 seconds, 1080p, 9:16, native audio',
    costNote: 'Official Fal documentation checked 2026-07-11: Seedance 2.0 Standard is approximately US$0.682/second at 1080p, so the 5-second run is expected around US$3.41 plus token billing.'
  }

  if (mode === '--plan') return process.stdout.write(`${JSON.stringify({ mode, ...plan }, null, 2)}\n`)

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.mkdir(path.dirname(promptPath), { recursive: true })
  await fs.writeFile(promptPath, `${prompt}\n`)
  const startedAt = new Date().toISOString()
  const apiKey = await getFalKey()
  let requestId = null

  try {
    let result

    if (mode === '--recover') {
      const previous = JSON.parse(await fs.readFile(metadataPath, 'utf8'))

      requestId = previous?.fal?.requestId || null
      if (!requestId || !previous?.fal?.statusUrl || !previous?.fal?.responseUrl) throw new Error('No recoverable Fal queue metadata exists.')
      result = await pollToResult({ apiKey, requestId, statusUrl: previous.fal.statusUrl, responseUrl: previous.fal.responseUrl })
    } else {
      const sourceData = await fs.readFile(sourcePath)

      const { response, body } = await requestJson(`https://queue.fal.run/${model}`, {
        method: 'POST',
        headers: headers(apiKey),
        body: JSON.stringify({
          prompt,
          image_url: `data:image/png;base64,${sourceData.toString('base64')}`,
          resolution: '1080p',
          duration: '5',
          aspect_ratio: '9:16',
          generate_audio: true,
          end_user_id: 'greenhouse-glitch-intro'
        })
      })

      if (!response.ok || !body?.request_id) throw new Error(`Fal queue submit failed with HTTP ${response.status}: ${typeof body?.detail === 'string' ? body.detail : 'missing request_id'}`)
      requestId = body.request_id
      const queuedMetadata = { ok: null, state: 'queued', mode, ...plan, startedAt, promptPath, source: { path: sourcePath, sha256: sourceHash, bytes: sourceStats.size }, fal: { requestId, statusUrl: body.status_url, responseUrl: body.response_url } }

      await fs.writeFile(metadataPath, `${JSON.stringify(queuedMetadata, null, 2)}\n`)
      process.stderr.write(`Fal Seedance request ${requestId} queued.\n`)
      result = await pollToResult({ apiKey, requestId, statusUrl: body.status_url, responseUrl: body.response_url })
    }

    const remoteVideo = result?.video

    if (!remoteVideo?.url) throw new Error('Fal completed but did not return a video URL.')
    const remote = await fetch(remoteVideo.url)

    if (!remote.ok) throw new Error(`Fal output download failed with HTTP ${remote.status}.`)
    const bytes = Buffer.from(await remote.arrayBuffer())

    await fs.writeFile(outputPath, bytes)
    const metadata = { ok: true, state: 'completed', mode, ...plan, startedAt, completedAt: new Date().toISOString(), promptPath, source: { path: sourcePath, sha256: sourceHash, bytes: sourceStats.size }, fal: { requestId, seed: result?.seed ?? null, remoteVideo }, output: { path: outputPath, bytes: bytes.length, sha256: await sha256(outputPath) } }

    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ ok: true, output: metadata.output, fal: metadata.fal }, null, 2)}\n`)
  } catch (error) {
    const current = await fs.readFile(metadataPath, 'utf8').then(JSON.parse).catch(() => ({}))

    await fs.writeFile(metadataPath, `${JSON.stringify({ ...current, ok: false, state: 'failed', failedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`)
    throw error
  }
}

await main()
