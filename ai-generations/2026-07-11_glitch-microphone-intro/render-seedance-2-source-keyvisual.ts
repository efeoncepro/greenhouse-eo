import 'server-only'

import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { runFalModel } from '../../src/lib/ai/fal'
import { loadGreenhouseToolEnv } from '../../scripts/lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()

const runRoot = path.resolve(process.cwd(), 'ai-generations/2026-07-11_glitch-microphone-intro')
const sourcePath = '/Users/jreye/Downloads/microfono_broadcast_video_assets/microfono_broadcast_9x16_2160x3840.png'
const expectedSourceSha256 = 'fde797f7a096587392ea3cffb4ada4ff260f0e1329e38135ade32cae4904608e'
const model = 'bytedance/seedance-2.0/image-to-video'
const outputPath = path.join(runRoot, 'masters/glitch-microphone-intro-s-seedance-2-source-keyvisual-master.mp4')
const metadataPath = path.join(runRoot, 'masters/glitch-microphone-intro-s-seedance-2-source-keyvisual-master.metadata.json')
const promptPath = path.join(runRoot, 'prompts/seedance-2-source-keyvisual-tap-tap.md')

const prompt = `@Image1 is the exact starting frame and immutable visual truth. Animate only its existing physical world; preserve every object, composition, lens, focus, color, practical light, black/navy contrast, electric-blue ceiling streaks, neon-green console accents, microphone, boom, headphones, console, hand and background signs exactly as photographed. Locked portrait 9:16 macro camera, no reframing, no cuts, no new objects, no text additions and no design or color changes.

At the start, the index fingertip gently lifts a few millimetres from the microphone grille into a natural hover. It performs the real live-studio sound-check action: tap, tap. The fingertip makes two compact, light strikes on the upper metal grille. Each tap is brief contact followed immediately by a visible elastic rebound and clear air gap before the next. It must never read as pressing a button, holding contact, slow pushing, dragging, squeezing, or bending the mesh. Wrist, palm, forearm, other fingers, microphone, boom and camera remain stable. After the second rebound, the existing studio lights answer once very subtly, then the hand retreats and the microphone holds ready for a hard cut.

Native audio: exactly two synchronized, quiet and dry fingertip-on-broadcast-microphone-grille tocs. Each is short, damped and has a small low body response. No music, no voice, no room ambience, no UI click, no keyboard, no nail tick, no metallic ring, no beep, no radio static, no third impact and no added sound effect.`

type SeedanceOutput = {
  video?: { url?: string; content_type?: string; file_name?: string; file_size?: number }
  seed?: number
}

const sha256 = async (filePath: string) => createHash('sha256').update(await readFile(filePath)).digest('hex')

const parseMode = () => {
  const mode = process.argv[2] || '--plan'

  if (!['--plan', '--execute'].includes(mode) || process.argv.length > 3) {
    throw new Error('Usage: pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs ai-generations/2026-07-11_glitch-microphone-intro/render-seedance-2-source-keyvisual.ts [--plan|--execute]')
  }

  
return mode
}

const main = async () => {
  const mode = parseMode()
  const sourceHash = await sha256(sourcePath)

  if (sourceHash !== expectedSourceSha256) throw new Error('Canonical 4K source hash mismatch; stop before generation.')

  const sourceStats = await stat(sourcePath)

  const plan = {
    mode,
    provider: 'fal.ai',
    model,
    task: 'image-to-video',
    input: { sourcePath, sourceHash, dimensions: '2160x3840', mimeType: 'image/png' },
    output: { outputPath, expected: '5 seconds, 1080p, 9:16, native audio' },
    costNote: 'Official Fal model documentation checked 2026-07-11: Seedance 2.0 Standard is approximately US$0.682/second at 1080p; this 5-second run is expected to cost about US$3.41 plus token billing.',
    constraints: ['Source key visual is the exact first frame.', 'No post-produced ON AIR layer or design substitution.', 'Tap/rebound gesture plus exactly two native foley hits.']
  }

  if (mode === '--plan') {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
    
return
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await mkdir(path.dirname(promptPath), { recursive: true })
  await writeFile(promptPath, `${prompt}\n`)
  const startedAt = new Date().toISOString()

  await writeFile(metadataPath, `${JSON.stringify({ ok: null, state: 'submitting', ...plan, startedAt, promptPath }, null, 2)}\n`)

  try {
    const sourceData = await readFile(sourcePath)

    process.stderr.write('Submitting Seedance 2.0 job to fal.ai.\n')

    const result = await runFalModel<SeedanceOutput>({
      model,
      input: {
        prompt,
        image_url: `data:image/png;base64,${sourceData.toString('base64')}`,
        resolution: '1080p',
        duration: '5',
        aspect_ratio: '9:16',
        generate_audio: true,
        end_user_id: 'greenhouse-glitch-intro'
      },
      pollTimeoutMs: 600_000,
      pollIntervalMs: 3_000
    })

    process.stderr.write(`Seedance 2.0 request completed (HTTP ${result.httpStatus}).\n`)

    if (!result.ok || !result.output?.video?.url) {
      throw new Error(`Fal Seedance request failed: HTTP ${result.httpStatus}; ${result.errorDetail || 'missing generated video URL'}`)
    }

    const generatedVideo = await fetch(result.output.video.url)

    if (!generatedVideo.ok) throw new Error(`Fal output download failed with HTTP ${generatedVideo.status}.`)
    const bytes = Buffer.from(await generatedVideo.arrayBuffer())

    await writeFile(outputPath, bytes)

    const metadata = {
      ok: true,
      ...plan,
      startedAt,
      completedAt: new Date().toISOString(),
      promptPath,
      source: { path: sourcePath, sha256: sourceHash, bytes: sourceStats.size },
      fal: {
        requestId: result.requestId,
        httpStatus: result.httpStatus,
        latencyMs: result.latencyMs,
        secretSource: result.secretSource,
        seed: result.output.seed ?? null,
        remoteVideo: result.output.video
      },
      output: { path: outputPath, bytes: bytes.length, sha256: await sha256(outputPath) }
    }

    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ ok: true, metadataPath, output: metadata.output, fal: metadata.fal }, null, 2)}\n`)
  } catch (error) {
    await writeFile(metadataPath, `${JSON.stringify({ ok: false, ...plan, startedAt, failedAt: new Date().toISOString(), promptPath, error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`)
    throw error
  }
}

const keepAlive = setInterval(() => undefined, 1_000)

main()
  .catch(error => {
    console.error(error instanceof Error ? error.stack : error)
    process.exitCode = 1
  })
  .finally(() => clearInterval(keepAlive))
