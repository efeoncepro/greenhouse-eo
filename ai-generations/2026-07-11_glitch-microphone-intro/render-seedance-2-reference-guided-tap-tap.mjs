import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const runRoot = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-07-11_glitch-microphone-intro'
const project = 'efeonce-group'
const sourcePath = '/Users/jreye/Downloads/microfono_broadcast_video_assets/microfono_broadcast_9x16_2160x3840.png'
const takeId = process.env.SEEDANCE_GUIDED_TAKE || 'x'

const motionSourcePath = path.join(runRoot, takeId === 'z'
  ? 'masters/glitch-microphone-intro-o-omni-integral-natural-double-tap-master.mp4'
  : 'masters/glitch-microphone-intro-t-seedance-2-source-keyvisual-master.mp4')

const foleySourcePath = path.join(runRoot, 'masters/glitch-microphone-intro-o-omni-integral-natural-double-tap-master.mp4')

if (!['u', 'v', 'x', 'z'].includes(takeId)) throw new Error('SEEDANCE_GUIDED_TAKE must be u, v, x or z.')

const model = ['x', 'z'].includes(takeId)
  ? 'bytedance/seedance-2.0/fast/reference-to-video'
  : 'bytedance/seedance-2.0/reference-to-video'

const motionGuidePath = path.join(runRoot, `refs/glitch-microphone-intro-${takeId}-ballistic-motion-guide-720x1280.mp4`)
const foleyGuidePath = path.join(runRoot, `refs/glitch-microphone-intro-${takeId}-two-monitor-response-guide.wav`)
const outputPath = path.join(runRoot, `masters/glitch-microphone-intro-${takeId}-seedance-2-reference-guided-master.mp4`)
const metadataPath = path.join(runRoot, `masters/glitch-microphone-intro-${takeId}-seedance-2-reference-guided-master.metadata.json`)
const promptPath = path.join(runRoot, `prompts/seedance-2-reference-guided-tap-tap-${takeId}.md`)
const expectedSourceSha256 = 'fde797f7a096587392ea3cffb4ada4ff260f0e1329e38135ade32cae4904608e'

const expectedMotionSourceSha256 = takeId === 'z'
  ? 'e575896c318f852b042624a0e3d160fc1cc35d4c9dde229b4eff997163c516d4'
  : '8a71efd9eb31b91b960779df9822941381238ecc93687b7bfb0e11fce33c7dda'

const expectedFoleySourceSha256 = 'e575896c318f852b042624a0e3d160fc1cc35d4c9dde229b4eff997163c516d4'
const pollTimeoutMs = 900_000
const pollIntervalMs = 3_000

const prompt = `@Image1 is the immutable visual truth for the entire result. Preserve its exact portrait composition, locked lens and camera, black/navy palette, warm hand, electric-blue ceiling streaks, neon-green console, black horizontal broadcast microphone, boom, headphones, console, focus and every physical practical. The small red ON AIR sign remains the same fixed, diegetic sign in the rear studio from first frame to last; it must not move, mutate, flicker, become a graphic, overlay, title card or foreground element.

@Video1 is a performance-only reference. Transfer only its natural human tap-tap cadence and spring-like fingertip rebounds into @Image1; never copy its different studio, microphone, camera, colour, sign, lighting or composition. The index begins hovering with a clear dark air gap. It makes exactly two tiny ballistic sound-check strikes on the curved metal grille: a fast fingertip downstroke, an instantaneous kiss of the mesh, immediate upward bounce to a clear air gap, a quiet airborne pause, then the second instantaneous kiss and bounce. At 24 fps each visible contact occupies one or at most two output frames. The fingertip never rests on the grille. It never presses, holds, drags, rubs, strokes, squeezes, touches a button or bends the mesh. Wrist, palm, other fingers, microphone, boom and camera remain mechanically stable. After the second rebound the hand lifts gently up-left and the microphone settles ready.

Generate no audio. The two amplified studio-monitor responses will be synchronized only after the visual passes review.

One continuous five-second 24 fps shot. No cuts, reframing, zoom, pan, orbit, transition, new object, text addition, animated screen, light response, colour shift or visual redesign.`

const sha256 = async filePath => createHash('sha256').update(await fs.readFile(filePath)).digest('hex')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function verifyInputs() {
  const checks = [
    [sourcePath, expectedSourceSha256, 'canonical 4K source'],
    [motionSourcePath, expectedMotionSourceSha256, 'take T motion source'],
    [foleySourcePath, expectedFoleySourceSha256, 'take O foley source']
  ]

  for (const [filePath, expected, label] of checks) {
    const actual = await sha256(filePath)

    if (actual !== expected) throw new Error(`${label} hash mismatch; stop before generation.`)
  }
}

async function prepareGuides() {
  await verifyInputs()

  if (takeId === 'z') {
    return {
      motionGuide: { path: motionSourcePath, bytes: (await fs.stat(motionSourcePath)).size, sha256: await sha256(motionSourcePath) },
      foleyGuide: null
    }
  }

  await fs.mkdir(path.dirname(motionGuidePath), { recursive: true })
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'glitch-u-guide-'))
  const framesDir = path.join(tempRoot, 'frames')
  const sequenceDir = path.join(tempRoot, 'sequence')

  await fs.mkdir(framesDir)
  await fs.mkdir(sequenceDir)

  try {
    await execFileAsync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-i', motionSourcePath,
      '-vf', 'fps=24,scale=720:1280:flags=lanczos',
      path.join(framesDir, 'frame-%03d.png')
    ], { maxBuffer: 16 * 1024 * 1024 })

    const sequence = takeId === 'u'
      ? [
          ...Array(28).fill(31),
          34, 35, 36, 37, 38, 39,
          40,
          39, 38, 37, 36, 35, 34,
          ...Array(6).fill(31),
          34, 35, 36, 37, 38, 39,
          40,
          39, 38, 37, 36, 35, 34,
          33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20
        ]
      : takeId === 'v'
        ? [
          ...Array(28).fill(31),
          34, 35, 36, 37,
          39,
          37, 36, 35, 34,
          ...Array(10).fill(31),
          34, 35, 36, 37,
          39,
          37, 36, 35, 34,
          33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20
        ]
        : [
          ...Array(28).fill(31),
          37, 39, 37,
          ...Array(14).fill(31),
          37, 39, 37,
          34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20
        ]

    while (sequence.length < 120) sequence.push(20)

    for (let index = 0; index < sequence.length; index += 1) {
      const sourceFrame = String(sequence[index]).padStart(3, '0')
      const targetFrame = String(index + 1).padStart(3, '0')

      await fs.copyFile(path.join(framesDir, `frame-${sourceFrame}.png`), path.join(sequenceDir, `frame-${targetFrame}.png`))
    }

    await execFileAsync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-framerate', '24', '-i', path.join(sequenceDir, 'frame-%03d.png'),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '24', '-movflags', '+faststart', '-an', '-y', motionGuidePath
    ], { maxBuffer: 16 * 1024 * 1024 })

    const audioFilter = [
      'anullsrc=r=48000:cl=stereo:d=5[silence]',
      `[0:a]atrim=start=1.32:end=1.58,asetpts=PTS-STARTPTS,highpass=f=70,lowpass=f=4200,equalizer=f=170:t=q:w=0.9:g=6,equalizer=f=2800:t=q:w=1.2:g=-4,acompressor=threshold=0.04:ratio=3:attack=3:release=90:makeup=1.8,afade=t=out:st=0.20:d=0.06,adelay=${takeId === 'u' ? 1400 : 1320}|${takeId === 'u' ? 1400 : 1320}[first]`,
      `[0:a]atrim=start=1.64:end=1.84,asetpts=PTS-STARTPTS,highpass=f=70,lowpass=f=4200,equalizer=f=170:t=q:w=0.9:g=6,equalizer=f=2800:t=q:w=1.2:g=-4,acompressor=threshold=0.04:ratio=3:attack=3:release=90:makeup=1.8,afade=t=out:st=0.14:d=0.06,adelay=${takeId === 'u' ? 2200 : 2100}|${takeId === 'u' ? 2200 : 2100}[second]`,
      '[silence][first][second]amix=inputs=3:normalize=0:dropout_transition=0,atrim=duration=5[out]'
    ].join(';')

    await execFileAsync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-i', foleySourcePath,
      '-filter_complex', audioFilter, '-map', '[out]', '-c:a', 'pcm_s24le', '-ar', '48000', '-y', foleyGuidePath
    ], { maxBuffer: 16 * 1024 * 1024 })
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }

  return {
    motionGuide: { path: motionGuidePath, bytes: (await fs.stat(motionGuidePath)).size, sha256: await sha256(motionGuidePath) },
    foleyGuide: { path: foleyGuidePath, bytes: (await fs.stat(foleyGuidePath)).size, sha256: await sha256(foleyGuidePath) }
  }
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
    const status = body?.status

    if (status === 'COMPLETED') {
      const result = await requestJson(responseUrl, { headers: headers(apiKey) })

      if (!result.response.ok) throw new Error(`Fal result fetch failed with HTTP ${result.response.status}.`)

      return result.body
    }

    if (status !== 'IN_QUEUE' && status !== 'IN_PROGRESS') {
      throw new Error(`Fal job ${requestId} reached unexpected status ${status || 'unknown'}.`)
    }
  }

  throw new Error(`Fal job ${requestId} did not complete inside ${pollTimeoutMs} ms.`)
}

async function asDataUri(filePath, mimeType) {
  return `data:${mimeType};base64,${(await fs.readFile(filePath)).toString('base64')}`
}

function parseMode() {
  const mode = process.argv[2] || '--plan'

  if (!['--plan', '--prepare', '--execute', '--recover'].includes(mode) || process.argv.length > 3) {
    throw new Error('Usage: node render-seedance-2-reference-guided-tap-tap.mjs [--plan|--prepare|--execute|--recover]')
  }

  return mode
}

async function main() {
  const mode = parseMode()

  await verifyInputs()

  const plan = {
    provider: 'fal.ai direct queue',
    model,
    takeId,
    strategy: 'reference-guided integral regeneration: immutable 4K image + timing-only motion guide + two amplified monitor-response audio cues',
    source: { path: sourcePath, sha256: expectedSourceSha256, dimensions: '2160x3840' },
    motionSource: { path: motionSourcePath, sha256: expectedMotionSourceSha256 },
    foleySource: { path: foleySourcePath, sha256: expectedFoleySourceSha256 },
    outputPath,
    expected: takeId !== 'u'
      ? `5 seconds, ${['x', 'z'].includes(takeId) ? '720p' : '1080p'}, 9:16, 24 fps target, silent generated visual; exact monitor responses muxed only after visual approval`
      : '5 seconds, 1080p, 9:16, 24 fps target, native generated audio',
    costNote: ['x', 'z'].includes(takeId)
      ? 'Official Fal docs checked 2026-07-11: fast 720p with video input is approximately US$0.1452/s; five seconds are estimated at US$0.73 plus token billing.'
      : 'Official Fal docs checked 2026-07-11: 1080p is US$0.682/s and video input applies a 0.6 multiplier; five seconds are estimated at US$2.05 plus token billing.'
  }

  if (mode === '--plan') return process.stdout.write(`${JSON.stringify({ mode, ...plan }, null, 2)}\n`)
  const guides = await prepareGuides()

  if (mode === '--prepare') return process.stdout.write(`${JSON.stringify({ ok: true, mode, ...guides }, null, 2)}\n`)

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(promptPath, `${prompt}\n`)
  const startedAt = new Date().toISOString()
  const apiKey = await getFalKey()
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
      const payload = {
        prompt,
        image_urls: [await asDataUri(sourcePath, 'image/png')],
        video_urls: [await asDataUri(takeId === 'z' ? motionSourcePath : motionGuidePath, 'video/mp4')],
        ...(takeId === 'z' ? {} : { audio_urls: [await asDataUri(foleyGuidePath, 'audio/wav')] }),
        resolution: ['x', 'z'].includes(takeId) ? '720p' : '1080p',
        duration: '5',
        aspect_ratio: '9:16',
        generate_audio: takeId === 'u',
        bitrate_mode: 'high',
        end_user_id: 'greenhouse-glitch-intro'
      }

      const { response, body } = await requestJson(`https://queue.fal.run/${model}`, {
        method: 'POST', headers: headers(apiKey), body: JSON.stringify(payload)
      })

      if (!response.ok || !body?.request_id) {
        throw new Error(`Fal queue submit failed with HTTP ${response.status}: ${typeof body?.detail === 'string' ? body.detail : JSON.stringify(body?.detail || 'missing request_id')}`)
      }

      requestId = body.request_id

      const queuedMetadata = {
        ok: null, state: 'queued', mode, ...plan, startedAt, promptPath, guides,
        fal: { requestId, statusUrl: body.status_url, responseUrl: body.response_url }
      }

      await fs.writeFile(metadataPath, `${JSON.stringify(queuedMetadata, null, 2)}\n`)
      process.stderr.write(`Fal Seedance reference-guided request ${requestId} queued.\n`)
      result = await pollToResult({ apiKey, requestId, statusUrl: body.status_url, responseUrl: body.response_url })
    }

    const remoteVideo = result?.video

    if (!remoteVideo?.url) throw new Error('Fal completed but did not return a video URL.')
    const remote = await fetch(remoteVideo.url)

    if (!remote.ok) throw new Error(`Fal output download failed with HTTP ${remote.status}.`)
    const bytes = Buffer.from(await remote.arrayBuffer())

    await fs.writeFile(outputPath, bytes)

    const metadata = {
      ok: true, state: 'completed', mode, ...plan, startedAt, completedAt: new Date().toISOString(),
      promptPath, guides, fal: { requestId, seed: result?.seed ?? null, remoteVideo },
      output: { path: outputPath, bytes: bytes.length, sha256: await sha256(outputPath) }
    }

    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ ok: true, output: metadata.output, fal: metadata.fal, guides }, null, 2)}\n`)
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
