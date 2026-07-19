import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const repoRoot = process.cwd()
const runDir = path.join(repoRoot, 'ai-generations', '2026-07-18_high-frequency-campaign-e2e')
const outputDir = path.join(runDir, 'delivery', 'motion')
await mkdir(outputDir, { recursive: true })

const specs = [
  {
    id: '9x16',
    width: 720,
    height: 1280,
    clean: 'work/motion/high-frequency-omni-clean-9x16-8s-v1.mp4',
    endcard: 'delivery/9x16/high-frequency-m01-meta-story-reel-9x16-v1.jpg'
  },
  {
    id: '16x9',
    width: 1280,
    height: 720,
    clean: 'work/motion/high-frequency-omni-clean-16x9-8s-v1.mp4',
    endcard: 'delivery/16x9/high-frequency-m01-digital-landscape-16x9-v1.jpg'
  }
]

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const results = []

const compose = ({ source, endcard, output, width, height, motionSeconds, totalSeconds }) => {
  const transitionSeconds = 0.4
  const endcardSeconds = totalSeconds - motionSeconds + transitionSeconds
  const transitionOffset = motionSeconds - transitionSeconds
  const videoFilter = [
    `[0:v]trim=0:${motionSeconds},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=24,format=yuv420p[v0]`,
    `[1:v]trim=0:${endcardSeconds},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=24,format=yuv420p[v1]`,
    `[v0][v1]xfade=transition=fade:duration=${transitionSeconds}:offset=${transitionOffset}[v]`,
    `[0:a]atrim=0:${motionSeconds},asetpts=PTS-STARTPTS,afade=t=out:st=${Math.max(0, motionSeconds - 0.6)}:d=0.6,apad=pad_dur=${totalSeconds - motionSeconds}[a]`
  ].join(';')

  execFileSync('ffmpeg', [
    '-y', '-v', 'error',
    '-i', source,
    '-loop', '1', '-framerate', '24', '-t', String(endcardSeconds), '-i', endcard,
    '-filter_complex', videoFilter,
    '-map', '[v]', '-map', '[a]', '-t', String(totalSeconds),
    '-r', '24', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-preset', 'slow', '-crf', '18', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '192k', output
  ], { stdio: 'inherit' })
}

for (const spec of specs) {
  for (const variant of [
    { kind: 'master', motionSeconds: 8, totalSeconds: 10 },
    { kind: 'bumper', motionSeconds: 4, totalSeconds: 6 }
  ]) {
    const filename = `high-frequency-m01-brand-light-${variant.kind}-${spec.id}-${variant.totalSeconds}s-v1.mp4`
    const outputPath = path.join(outputDir, filename)
    compose({
      source: path.join(runDir, spec.clean),
      endcard: path.join(runDir, spec.endcard),
      output: outputPath,
      width: spec.width,
      height: spec.height,
      motionSeconds: variant.motionSeconds,
      totalSeconds: variant.totalSeconds
    })
    const bytes = await readFile(outputPath)
    const probe = JSON.parse(execFileSync('ffprobe', [
      '-v', 'error', '-show_entries',
      'stream=index,codec_name,width,height,r_frame_rate:format=duration,size,format_name',
      '-of', 'json', outputPath
    ], { encoding: 'utf8' }))
    const posterPath = path.join(outputDir, filename.replace('.mp4', '-poster.jpg'))
    execFileSync('ffmpeg', [
      '-y', '-v', 'error', '-ss', String(variant.totalSeconds - 0.15), '-i', outputPath,
      '-frames:v', '1', '-q:v', '2', posterPath
    ], { stdio: 'inherit' })
    const posterBytes = await readFile(posterPath)
    results.push({
      id: `${variant.kind}-${spec.id}`,
      kind: variant.kind,
      formatId: spec.id,
      brandMode: 'brand-light',
      channelMode: 'digital-motion',
      source: spec.clean,
      endcard: spec.endcard,
      output: path.relative(runDir, outputPath),
      poster: path.relative(runDir, posterPath),
      durationSeconds: variant.totalSeconds,
      motionSeconds: variant.motionSeconds,
      deterministicEndcardSeconds: variant.totalSeconds - variant.motionSeconds,
      bytes: bytes.length,
      sha256: sha256(bytes),
      posterSha256: sha256(posterBytes),
      probe
    })
  }
}

await writeFile(
  path.join(runDir, 'manifests', '08-motion-release.json'),
  `${JSON.stringify({
    stage: 'deterministic-motion-post',
    renderer: 'ffmpeg xfade + official deterministic end card',
    results
  }, null, 2)}\n`
)
process.stdout.write(`Composed ${results.length} professional motion deliverables\n`)
