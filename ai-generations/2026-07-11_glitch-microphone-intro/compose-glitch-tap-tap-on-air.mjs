import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const workspaceRoot = '/Users/jreye/Documents/greenhouse-eo'
const runRoot = path.join(workspaceRoot, 'ai-generations/2026-07-11_glitch-microphone-intro')
const sourceVideoPath = path.join(runRoot, 'exports/glitch-microphone-intro-a-natural-5s-silent.mp4')
const sourceKeyVisualPath = '/Users/jreye/Downloads/microfono_broadcast_video_assets/microfono_broadcast_9x16_2160x3840.png'
const outputPath = path.join(runRoot, 'exports/glitch-microphone-intro-f-percussive-tap-on-air-5s-silent.mp4')
const metadataPath = path.join(runRoot, 'exports/glitch-microphone-intro-f-percussive-tap-on-air-5s-silent.metadata.json')
const intentPath = path.join(runRoot, 'prompts/percussive-tap-editorial-recovery.md')

const editorialIntent = `# Editorial recovery — Glitch percussive tap tap + practical ON AIR

This is a deterministic edit of the already generated five-second Omni video. It does not request new pixels from a model.

## Motion construction: percussive contact, never a press

- 0.00–0.20: quiet hover. Wrist, knuckles and forearm stay stable.
- 0.20–0.38: first fingertip strike. The distal index travels down quickly.
- 0.38: contact lasts one to two frames only; there is no hold or visible compression.
- 0.38–0.55: immediate rebound to a clear hover.
- 0.55–0.67: short hover separation.
- 0.67–0.85: second fingertip strike.
- 0.85: second one-to-two-frame contact.
- 0.85–1.15: the real forward-source recovery lifts the finger; only then does the blue response appear.
- 1.15–5.00: held release pose for the handoff to the Glitch intro.

This is an audio-check knock: a quick strike-and-rebound, not a finger pressing a button. There must be no sustained contact, deformation of the microphone grille, forearm drop, or finger hold. The second strike is the one that activates the blue signal. The edit retimes only a trajectory already present in the source; it never invents a second hand, changes anatomy, or changes the camera.

## Exact typography repair

The model-adapted input had intentionally neutralised the sign to make image generation possible. The 4K supplied key visual is therefore used as the source of truth for the \`ON AIR\` sign. Crop only the small physical panel at its native background scale (180×118 in the 720×1280 delivery), place it at x=400/y=257, and never cover the foreground hand or fingertip. This is a practical mounted in the studio background, not a foreground graphic card. No AI text generation is used.
`

function parseMode() {
  const args = process.argv.slice(2)
  const allowed = new Set(['--plan', '--execute'])
  const unknown = args.filter((arg) => !allowed.has(arg))

  if (unknown.length) throw new Error('Unknown argument(s): ' + unknown.join(', '))
  if (args.includes('--plan') && args.includes('--execute')) throw new Error('Use either --plan or --execute, not both.')
  
return args.includes('--execute') ? 'execute' : 'plan'
}

function probeVideo(filePath) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,duration',
    '-of', 'json',
    filePath
  ], { encoding: 'utf8' })

  if (result.status !== 0) throw new Error('ffprobe failed: ' + (result.stderr || result.stdout))
  
return JSON.parse(result.stdout).streams?.[0] || null
}

async function checksum(filePath) {
  return createHash('sha256').update(await fs.readFile(filePath)).digest('hex')
}

async function preflight() {
  await fs.access(sourceVideoPath)
  await fs.access(sourceKeyVisualPath)

  const sourceVideoProbe = probeVideo(sourceVideoPath)

  if (sourceVideoProbe?.width !== 720 || sourceVideoProbe?.height !== 1280 || sourceVideoProbe?.r_frame_rate !== '24/1') {
    throw new Error('The editorial source must be the verified 720x1280, 24fps, five-second Omni export.')
  }

  return {
    sourceVideo: {
      path: sourceVideoPath,
      sha256: await checksum(sourceVideoPath),
      videoProbe: sourceVideoProbe
    },
    sourceKeyVisual: {
      path: sourceKeyVisualPath,
      sha256: await checksum(sourceKeyVisualPath)
    }
  }
}

function runFfmpeg() {
  const filter = [
    '[0:v]trim=start=2.35:end=2.39,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.20,trim=duration=0.20[hold_start]',
    '[0:v]trim=start=2.35:end=2.85,setpts=(PTS-STARTPTS)/2.78[tap_one_strike]',
    '[0:v]trim=start=2.35:end=2.85,reverse,setpts=(PTS-STARTPTS)/2.94[tap_one_rebound]',
    '[0:v]trim=start=2.35:end=2.39,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.12,trim=duration=0.12[hover_gap]',
    '[0:v]trim=start=2.35:end=2.85,setpts=(PTS-STARTPTS)/2.78[tap_two_strike]',
    '[0:v]trim=start=2.85:end=3.60,setpts=(PTS-STARTPTS)/2.50[tap_two_recovery]',
    '[0:v]trim=start=3.60:end=3.64,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=3.85,trim=duration=3.85[hold_end]',
    '[hold_start][tap_one_strike][tap_one_rebound][hover_gap][tap_two_strike][tap_two_recovery][hold_end]concat=n=7:v=1:a=0[taps]',
    '[1:v]crop=540:354:1200:771,scale=180:118:flags=lanczos[onair_practical]',
    '[taps][onair_practical]overlay=400:257:eval=init,trim=duration=5,format=yuv420p[out]'
  ].join(';')

  const result = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', sourceVideoPath,
    '-i', sourceKeyVisualPath,
    '-filter_complex', filter,
    '-map', '[out]',
    '-an',
    '-r', '24',
    '-t', '5',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '17',
    '-movflags', '+faststart',
    outputPath
  ], { encoding: 'utf8' })

  if (result.status !== 0) throw new Error('FFmpeg editorial recovery failed: ' + (result.stderr || result.stdout))
}

async function main() {
  const mode = parseMode()
  const input = await preflight()

  const plan = {
    mode,
    operation: 'deterministic editorial recovery of the already generated Omni video',
    outputPath,
    input,
    intent: 'Create two percussive fingertip strike-and-rebound taps with a clear hover between; restore the exact supplied ON AIR sign as a small studio practical behind the hand.'
  }

  if (mode === 'plan') {
    console.log(JSON.stringify(plan, null, 2))
    
return
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.mkdir(path.dirname(intentPath), { recursive: true })
  await fs.writeFile(intentPath, editorialIntent)

  const startedAt = new Date().toISOString()

  try {
    runFfmpeg()
    const outputProbe = probeVideo(outputPath)

    if (outputProbe?.width !== 720 || outputProbe?.height !== 1280 || outputProbe?.r_frame_rate !== '24/1') {
      throw new Error('Editorial output does not preserve the 720x1280 24fps delivery contract.')
    }

    const metadata = {
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      operation: plan.operation,
      intentPath,
      input,
      output: {
        path: outputPath,
        sha256: await checksum(outputPath),
        videoProbe: outputProbe
      }
    }

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n')
    console.log(JSON.stringify({ ok: true, outputPath, metadataPath, output: metadata.output }, null, 2))
  } catch (error) {
    await fs.writeFile(metadataPath, JSON.stringify({
      ok: false,
      startedAt,
      failedAt: new Date().toISOString(),
      operation: plan.operation,
      input,
      error: error instanceof Error ? error.message : String(error)
    }, null, 2) + '\n')
    throw error
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
