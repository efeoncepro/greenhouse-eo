import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const runRoot = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-07-11_glitch-microphone-intro'
const videoPath = path.join(runRoot, 'masters/glitch-microphone-intro-v-seedance-2-reference-guided-master.mp4')
const audioPath = path.join(runRoot, 'refs/glitch-microphone-intro-v-two-monitor-response-guide.wav')
const outputPath = path.join(runRoot, 'exports/glitch-microphone-intro-v-monitor-response-candidate.mp4')
const metadataPath = path.join(runRoot, 'exports/glitch-microphone-intro-v-monitor-response-candidate.metadata.json')

const sha256 = async filePath => createHash('sha256').update(await fs.readFile(filePath)).digest('hex')

async function main() {
  const mode = process.argv[2] || '--plan'

  if (!['--plan', '--execute'].includes(mode) || process.argv.length > 3) {
    throw new Error('Usage: node finish-glitch-monitor-response-master.mjs [--plan|--execute]')
  }

  const plan = {
    operation: 'lossless video stream copy + exact two-response monitor audio mux',
    videoPath,
    audioPath,
    outputPath,
    visualPolicy: 'No crop, overlay, mask, tracking, retime, re-encode or visual composition.',
    audioPolicy: 'Exactly two band-limited amplified mic-check responses from the studio monitor/corneta; silence elsewhere.'
  }

  if (mode === '--plan') return process.stdout.write(`${JSON.stringify({ mode, ...plan }, null, 2)}\n`)

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  const videoSha256 = await sha256(videoPath)
  const audioSha256 = await sha256(audioPath)

  await execFileAsync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', videoPath, '-i', audioPath,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-ar', '48000', '-shortest', '-movflags', '+faststart', '-y', outputPath
  ], { maxBuffer: 16 * 1024 * 1024 })

  const metadata = {
    ok: true,
    createdAt: new Date().toISOString(),
    ...plan,
    input: { videoSha256, audioSha256 },
    output: { bytes: (await fs.stat(outputPath)).size, sha256: await sha256(outputPath) }
  }

  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`)
}

await main()
