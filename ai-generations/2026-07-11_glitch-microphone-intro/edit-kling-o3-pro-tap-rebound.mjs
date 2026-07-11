import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const runRoot = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-07-11_glitch-microphone-intro'
const project = 'efeonce-group'
const model = 'fal-ai/kling-video/o3/pro/video-to-video/edit'
const sourceVideoPath = path.join(runRoot, 'masters/glitch-microphone-intro-w-veo-3-1-hover-double-tap-master.mp4')
const expectedVideoSha256 = 'e19fd20568f44717c94dcf3132d9c6d814126ce89130aeb79bc310fe186b5789'
const keyVisualPath = '/Users/jreye/Downloads/microfono_broadcast_video_assets/microfono_broadcast_9x16_2160x3840.png'
const expectedKeyVisualSha256 = 'fde797f7a096587392ea3cffb4ada4ff260f0e1329e38135ade32cae4904608e'
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-y-kling-o3-pro-tap-rebound-master.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-y-kling-o3-pro-tap-rebound-master.metadata.json')
const promptPath = path.join(runRoot, 'prompts/kling-o3-pro-tap-rebound-edit.md')
const pollTimeoutMs = 900_000
const pollIntervalMs = 3_000

const prompt = `@Video1 is the source performance and @Image1 is the immutable visual truth. Preserve the entire studio, portrait composition, locked camera, lens, focus, black/navy colour, warm skin, electric-blue ceiling streaks, neon-green console, black broadcast microphone, boom, headphones and the small red ON AIR practical exactly as @Image1 and @Video1. The ON AIR sign stays fixed, physical, legible and behind the hand. Do not add, replace, move, redraw or animate any light, object, text or screen. Remove the unintended isolated white light/orb that appears late in @Video1 and restore that area to the unchanged dark studio from @Image1.

Edit only the index-finger performance. Keep the initial hover. Replace each of the two slow grille contacts with a compact real sound-check tap: fast fingertip downstroke, contact on the metal mesh for one or at most two 24fps frames, immediate spring-like upward rebound to a clear dark air gap. Hold a visible airborne pause between tap one and tap two. After the second rebound, lift the hand gently up-left. The fingertip never rests, presses, holds, drags, rubs, squeezes or bends the grille. Keep wrist, palm, other fingers, microphone, boom and camera stable. Exactly two contacts and two rebounds; no third touch.

This is a localized performance correction in one continuous shot, not a redesign. No cuts, crop, reframing, tracking overlay, mask look, zoom, pan, orbit, transition, text addition, colour shift, digital effect or audio.`

const sha256 = async filePath => createHash('sha256').update(await fs.readFile(filePath)).digest('hex')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function verifyInputs() {
  if (await sha256(sourceVideoPath) !== expectedVideoSha256) throw new Error('W source video hash mismatch.')
  if (await sha256(keyVisualPath) !== expectedKeyVisualSha256) throw new Error('Canonical 4K key visual hash mismatch.')
}

async function getFalKey() {
  const { stdout } = await execFileAsync('gcloud', [
    'secrets', 'versions', 'access', 'latest', '--secret=greenhouse-fal-api-key', `--project=${project}`
  ], { maxBuffer: 1024 * 1024 })

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

async function pollToResult({ apiKey, requestId, statusUrl, responseUrl }) {
  const started = Date.now()

  while (Date.now() - started < pollTimeoutMs) {
    await sleep(pollIntervalMs)
    const { response, body } = await requestJson(statusUrl, { headers: headers(apiKey) })

    if (!response.ok) throw new Error(`Fal status failed with HTTP ${response.status}.`)

    if (body?.status === 'COMPLETED') {
      const result = await requestJson(responseUrl, { headers: headers(apiKey) })

      if (!result.response.ok) throw new Error(`Fal result fetch failed with HTTP ${result.response.status}.`)

      return result.body
    }

    if (body?.status !== 'IN_QUEUE' && body?.status !== 'IN_PROGRESS') {
      throw new Error(`Fal job ${requestId} reached unexpected status ${body?.status || 'unknown'}.`)
    }
  }

  throw new Error(`Fal job ${requestId} did not complete inside ${pollTimeoutMs} ms.`)
}

async function dataUri(filePath, mimeType) {
  return `data:${mimeType};base64,${(await fs.readFile(filePath)).toString('base64')}`
}

async function main() {
  const mode = process.argv[2] || '--plan'

  if (!['--plan', '--execute', '--recover'].includes(mode) || process.argv.length > 3) {
    throw new Error('Usage: node edit-kling-o3-pro-tap-rebound.mjs [--plan|--execute|--recover]')
  }

  await verifyInputs()

  const plan = {
    provider: 'fal.ai direct queue', model, takeId: 'y',
    strategy: 'localized generative video edit of W performance; canonical 4K image supplied for appearance continuity; no masking/compositing',
    sourceVideo: { path: sourceVideoPath, sha256: expectedVideoSha256, durationSeconds: 4 },
    keyVisual: { path: keyVisualPath, sha256: expectedKeyVisualSha256 },
    outputPath, expected: '4 seconds, silent; exact source framing and practical with two 1–2-frame contacts',
    costNote: 'Official Fal docs checked 2026-07-11: Kling O3 Pro edit is US$0.168/s; the four-second input is estimated at US$0.67.'
  }

  if (mode === '--plan') return process.stdout.write(`${JSON.stringify({ mode, ...plan }, null, 2)}\n`)
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(promptPath, `${prompt}\n`)
  const apiKey = await getFalKey()
  const startedAt = new Date().toISOString()
  let requestId = null

  try {
    let result

    if (mode === '--recover') {
      const previous = JSON.parse(await fs.readFile(metadataPath, 'utf8'))

      requestId = previous?.fal?.requestId || null

      if (!requestId || !previous?.fal?.statusUrl || !previous?.fal?.responseUrl) {
        throw new Error('No recoverable Fal queue metadata exists.')
      }

      result = await pollToResult({ apiKey, requestId, statusUrl: previous.fal.statusUrl, responseUrl: previous.fal.responseUrl })
    } else {
      const { response, body } = await requestJson(`https://queue.fal.run/${model}`, {
        method: 'POST', headers: headers(apiKey), body: JSON.stringify({
          prompt,
          video_url: await dataUri(sourceVideoPath, 'video/mp4'),
          image_urls: [await dataUri(keyVisualPath, 'image/png')],
          keep_audio: false,
          shot_type: 'customize'
        })
      })

      if (!response.ok || !body?.request_id) {
        throw new Error(`Fal queue submit failed with HTTP ${response.status}: ${typeof body?.detail === 'string' ? body.detail : JSON.stringify(body?.detail || 'missing request_id')}`)
      }

      requestId = body.request_id
      await fs.writeFile(metadataPath, `${JSON.stringify({
        ok: null, state: 'queued', mode, ...plan, startedAt, promptPath,
        fal: { requestId, statusUrl: body.status_url, responseUrl: body.response_url }
      }, null, 2)}\n`)
      process.stderr.write(`Fal Kling O3 Pro edit ${requestId} queued.\n`)
      result = await pollToResult({ apiKey, requestId, statusUrl: body.status_url, responseUrl: body.response_url })
    }

    if (!result?.video?.url) throw new Error('Fal completed but did not return a video URL.')
    const remote = await fetch(result.video.url)

    if (!remote.ok) throw new Error(`Fal output download failed with HTTP ${remote.status}.`)
    const bytes = Buffer.from(await remote.arrayBuffer())

    await fs.writeFile(outputPath, bytes)

    const metadata = {
      ok: true, state: 'completed', mode, ...plan, startedAt, completedAt: new Date().toISOString(), promptPath,
      fal: { requestId, remoteVideo: result.video },
      output: { path: outputPath, bytes: bytes.length, sha256: await sha256(outputPath) }
    }

    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ ok: true, output: metadata.output, fal: metadata.fal }, null, 2)}\n`)
  } catch (error) {
    const current = await fs.readFile(metadataPath, 'utf8').then(JSON.parse).catch(() => ({}))

    await fs.writeFile(metadataPath, `${JSON.stringify({
      ...current, ok: false, state: 'failed', failedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    }, null, 2)}\n`)
    throw error
  }
}

await main()
