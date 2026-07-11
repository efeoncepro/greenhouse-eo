import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const workspaceRoot = '/Users/jreye/Documents/greenhouse-eo'
const runRoot = path.join(workspaceRoot, 'ai-generations/2026-07-11_glitch-microphone-intro')
const visualPlatePath = path.join(runRoot, 'exports/glitch-microphone-intro-f-percussive-tap-on-air-5s-silent.mp4')
const omniAudioGuidePath = path.join(runRoot, 'masters/glitch-microphone-intro-h-omni-percussive-tap-sound-guidance.mp4')
const outputPath = path.join(runRoot, 'exports/glitch-microphone-intro-i-percussive-tap-on-air-5s-gemini-foley.mp4')
const metadataPath = path.join(runRoot, 'exports/glitch-microphone-intro-i-percussive-tap-on-air-5s-gemini-foley.metadata.json')
const intentPath = path.join(runRoot, 'prompts/gemini-foley-deterministic-finish.md')

const finishIntent = `# Deterministic finish — Glitch percussive tap tap with Gemini Omni foley

## Visual source of truth

Use the approved deterministic visual plate exactly as rendered. Do not use the video pixels from Omni's audio-guidance output: the provider altered the practical sign and introduced a third visual accent, so that video is rejected.

## Audio source and editorial treatment

The Omni guidance clip contains three loud transients. Recover only the first two synthesized microphone-grille impacts:

- First source foley window: 0.30–0.57 s. Align its transient to 0.38 s in the final visual.
- Second source foley window: 0.83–1.20 s. Align its transient to 0.85 s in the final visual.
- Omit the third source transient near 2.1 s entirely.

Both retained sounds are dry, close, brief metal-grille ticks with immediate decay. The first is attenuated by 3 dB so the second reads slightly firmer. There is no music, dialogue, room tone, sound logo, whoosh, or press/click sound. All other time is digital silence.
`

function parseMode() {
  const args = process.argv.slice(2)
  const allowed = new Set(['--plan', '--execute'])
  const unknown = args.filter((arg) => !allowed.has(arg))

  if (unknown.length) throw new Error('Unknown argument(s): ' + unknown.join(', '))
  if (args.includes('--plan') && args.includes('--execute')) throw new Error('Use either --plan or --execute, not both.')
  
return args.includes('--execute') ? 'execute' : 'plan'
}

function probeMedia(filePath) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels',
    '-of', 'json',
    filePath
  ], { encoding: 'utf8' })

  if (result.status !== 0) throw new Error('ffprobe failed: ' + (result.stderr || result.stdout))
  
return JSON.parse(result.stdout)
}

async function checksum(filePath) {
  return createHash('sha256').update(await fs.readFile(filePath)).digest('hex')
}

async function preflight() {
  await fs.access(visualPlatePath)
  await fs.access(omniAudioGuidePath)

  const visual = probeMedia(visualPlatePath)
  const guide = probeMedia(omniAudioGuidePath)
  const visualStream = visual.streams.find((stream) => stream.codec_type === 'video')
  const guideAudio = guide.streams.find((stream) => stream.codec_type === 'audio')

  if (visualStream?.width !== 720 || visualStream?.height !== 1280 || visualStream?.r_frame_rate !== '24/1') {
    throw new Error('Visual plate must be the verified 720x1280, 24fps deterministic candidate.')
  }

  if (guideAudio?.codec_name !== 'aac' || guideAudio?.sample_rate !== '48000' || guideAudio?.channels !== 2) {
    throw new Error('Omni guidance output must provide 48 kHz stereo AAC audio.')
  }

  return {
    visualPlate: { path: visualPlatePath, sha256: await checksum(visualPlatePath), probe: visual },
    omniAudioGuide: { path: omniAudioGuidePath, sha256: await checksum(omniAudioGuidePath), probe: guide }
  }
}

function runFfmpeg() {
  const filter = [
    '[1:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start=0.30:end=0.57,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.005,afade=t=out:st=0.20:d=0.07,volume=0.70794578,adelay=280|280[tap_one]',
    '[1:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start=0.83:end=1.20,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.005,afade=t=out:st=0.27:d=0.10,adelay=710|710[tap_two]',
    'anullsrc=r=48000:cl=stereo,atrim=duration=5[silence]',
    '[silence][tap_one][tap_two]amix=inputs=3:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.89125,atrim=duration=5[foley]'
  ].join(';')

  const result = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', visualPlatePath,
    '-i', omniAudioGuidePath,
    '-filter_complex', filter,
    '-map', '0:v:0',
    '-map', '[foley]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', '5',
    '-movflags', '+faststart',
    outputPath
  ], { encoding: 'utf8' })

  if (result.status !== 0) throw new Error('FFmpeg foley finish failed: ' + (result.stderr || result.stdout))
}

async function main() {
  const mode = parseMode()
  const input = await preflight()

  const plan = {
    mode,
    operation: 'deterministic visual preservation plus two extracted Gemini Omni foley impacts',
    input,
    outputPath,
    intent: 'Retain only the first two Omni-generated foley transients, synchronize them to the two real fingertip contacts, and discard all generated pixels and the third transient.'
  }

  if (mode === 'plan') {
    console.log(JSON.stringify(plan, null, 2))
    
return
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(intentPath, finishIntent)
  const startedAt = new Date().toISOString()

  try {
    runFfmpeg()
    const outputProbe = probeMedia(outputPath)
    const outputVideo = outputProbe.streams.find((stream) => stream.codec_type === 'video')
    const outputAudio = outputProbe.streams.find((stream) => stream.codec_type === 'audio')

    if (outputVideo?.width !== 720 || outputVideo?.height !== 1280 || outputVideo?.r_frame_rate !== '24/1' || outputAudio?.codec_name !== 'aac') {
      throw new Error('Finished output does not preserve the 720x1280 24fps H.264 plus AAC delivery contract.')
    }

    const metadata = {
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      operation: plan.operation,
      intentPath,
      input,
      output: { path: outputPath, sha256: await checksum(outputPath), probe: outputProbe },
      sourceSelection: {
        retainedOmniAudioWindowsSeconds: ['0.30–0.57', '0.83–1.20'],
        finalTransientTargetsSeconds: [0.38, 0.85],
        omittedOmniAudioTransient: 'near 2.1 seconds',
        generatedVideoPixels: 'rejected and not used'
      }
    }

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n')
    console.log(JSON.stringify({ ok: true, output: metadata.output, metadataPath }, null, 2))
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
