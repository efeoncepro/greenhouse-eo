import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const runRoot = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-07-11_glitch-microphone-intro'
const project = 'efeonce-group'
const model = 'fal-ai/veo3.1/image-to-video'
const parentVideoPath = path.join(runRoot, 'masters/glitch-microphone-intro-v-seedance-2-reference-guided-master.mp4')
const expectedParentSha256 = '55b2fc9f956978c6322425ffda4ed8fdd49c04615ee83773ce145de61c448c5b'
const hoverSourcePath = path.join(runRoot, 'refs/glitch-microphone-intro-w-hover-source-v-frame-036.png')
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-w-veo-3-1-hover-double-tap-master.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-w-veo-3-1-hover-double-tap-master.metadata.json')
const promptPath = path.join(runRoot, 'prompts/veo-3-1-hover-source-double-tap.md')
const pollTimeoutMs = 900_000
const pollIntervalMs = 3_000

const prompt = `The supplied image is the exact first frame and immutable visual truth. Preserve its portrait composition, locked camera and lens, shallow focus, black/navy studio, warm hand, electric-blue ceiling streaks, neon-green console, black horizontal broadcast microphone, boom, headphones, console and every physical practical. The small red ON AIR sign remains the same fixed, legible, diegetic sign in the rear studio from first frame to last. It never moves, mutates, flickers, becomes a graphic, overlay, title card or foreground element.

The index is already hovering above the curved microphone grille with a visible dark air gap. Perform exactly two tiny real-world sound-check taps. Each is a fast ballistic fingertip downstroke, contact of the soft fingertip pad on the metal mesh for one or at most two 24fps frames, then an immediate elastic rebound upward to a clearly visible air gap. Hold the first airborne rebound for a quiet beat, then perform the second identical one-to-two-frame tap and rebound. The finger never rests on the grille and never presses, holds, drags, rubs, squeezes, touches a button or bends the mesh. Keep wrist, palm, other fingers, microphone, boom and camera mechanically stable. After the second rebound the hand lifts gently up-left and the untouched microphone settles ready.

One continuous four-second 24fps shot. No audio. No cuts, reframing, zoom, pan, orbit, transition, new object, text addition, animated screen, light response, colour shift, visual redesign or digital effect.`

const negativePrompt = 'held finger, pressing, sustained contact, button press, dragging, rubbing, mesh deformation, microphone movement, extra fingers, anatomy mutation, camera movement, zoom, pan, orbit, cuts, overlay text, title card, UI, flicker, color shift, illegible ON AIR, moving ON AIR, music, speech, sound'
const sha256 = async filePath => createHash('sha256').update(await fs.readFile(filePath)).digest('hex')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function prepareSource() {
  if (await sha256(parentVideoPath) !== expectedParentSha256) {
    throw new Error('Parent V master hash mismatch; stop before generation.')
  }

  await fs.mkdir(path.dirname(hoverSourcePath), { recursive: true })
  await execFileAsync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', parentVideoPath,
    '-vf', 'select=eq(n\\,36)', '-frames:v', '1', '-y', hoverSourcePath
  ], { maxBuffer: 16 * 1024 * 1024 })

  return { path: hoverSourcePath, bytes: (await fs.stat(hoverSourcePath)).size, sha256: await sha256(hoverSourcePath), dimensions: '1080x1920' }
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

async function main() {
  const mode = process.argv[2] || '--plan'

  if (!['--plan', '--prepare', '--execute', '--recover'].includes(mode) || process.argv.length > 3) {
    throw new Error('Usage: node render-veo-3-1-hover-source-double-tap.mjs [--plan|--prepare|--execute|--recover]')
  }

  const source = await prepareSource()

  const plan = {
    provider: 'fal.ai direct queue', model, takeId: 'w',
    strategy: 'Veo 3.1 from an unedited integral hover frame; two generated visual taps; audio disabled and governed separately',
    parent: { path: parentVideoPath, sha256: expectedParentSha256, frame: 36 }, source,
    outputPath, expected: '4 seconds, 1080p, 9:16, 24 fps target, silent',
    costNote: 'Official Fal docs checked 2026-07-11: Veo 3.1 is US$0.20/s without audio at 1080p; four seconds are estimated at US$0.80.'
  }

  if (mode === '--plan' || mode === '--prepare') {
    return process.stdout.write(`${JSON.stringify({ ok: true, mode, ...plan }, null, 2)}\n`)
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(promptPath, `${prompt}\n\nNegative prompt: ${negativePrompt}\n`)
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
      const imageData = await fs.readFile(hoverSourcePath)

      const { response, body } = await requestJson(`https://queue.fal.run/${model}`, {
        method: 'POST', headers: headers(apiKey),
        body: JSON.stringify({
          prompt, negative_prompt: negativePrompt, aspect_ratio: '9:16', duration: '4s',
          resolution: '1080p', generate_audio: false, auto_fix: false, safety_tolerance: '4',
          image_url: `data:image/png;base64,${imageData.toString('base64')}`
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
      process.stderr.write(`Fal Veo 3.1 request ${requestId} queued.\n`)
      result = await pollToResult({ apiKey, requestId, statusUrl: body.status_url, responseUrl: body.response_url })
    }

    if (!result?.video?.url) throw new Error('Fal completed but did not return a video URL.')
    const remote = await fetch(result.video.url)

    if (!remote.ok) throw new Error(`Fal output download failed with HTTP ${remote.status}.`)
    const bytes = Buffer.from(await remote.arrayBuffer())

    await fs.writeFile(outputPath, bytes)

    const metadata = {
      ok: true, state: 'completed', mode, ...plan, startedAt, completedAt: new Date().toISOString(), promptPath,
      fal: { requestId, seed: result?.seed ?? null, remoteVideo: result.video },
      output: { path: outputPath, bytes: bytes.length, sha256: await sha256(outputPath) }
    }

    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ ok: true, output: metadata.output, fal: metadata.fal, source }, null, 2)}\n`)
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
