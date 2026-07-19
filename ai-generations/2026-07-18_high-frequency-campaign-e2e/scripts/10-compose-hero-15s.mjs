import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const runDir = path.join(process.cwd(), 'ai-generations', '2026-07-18_high-frequency-campaign-e2e')
const workRoot = path.join(runDir, 'work', 'motion', 'hero-15s')
const deliveryDir = path.join(runDir, 'delivery', 'motion')
const reviewDir = path.join(runDir, 'review')

await Promise.all([
  mkdir(workRoot, { recursive: true }),
  mkdir(deliveryDir, { recursive: true }),
  mkdir(reviewDir, { recursive: true })
])

const specs = [
  {
    id: '9x16',
    width: 720,
    height: 1280,
    deliveryWidth: 1080,
    deliveryHeight: 1920,
    clean: 'work/motion/high-frequency-omni-clean-9x16-8s-v1.mp4',
    m01: 'delivery/9x16/high-frequency-m01-meta-story-reel-9x16-v1.jpg',
    m02: 'delivery/9x16/high-frequency-m02-meta-story-reel-9x16-v1.jpg',
    m03: 'delivery/9x16/high-frequency-m03-meta-story-reel-9x16-v1.jpg',
    tileA: 'delivery/4x5/high-frequency-m01-meta-feed-4x5-v1.jpg',
    tileB: 'delivery/9x16/high-frequency-m02-meta-story-reel-9x16-v1.jpg',
    tileC: 'delivery/16x9/high-frequency-m03-digital-landscape-16x9-v1.jpg',
    wall: {
      a: { width: 250, height: 312, x: 42, y: 132, from: 'left' },
      b: { width: 205, height: 364, x: 430, y: 350, from: 'right' },
      c: { width: 430, height: 242, x: 145, y: 790, from: 'left' }
    }
  },
  {
    id: '16x9',
    width: 1280,
    height: 720,
    deliveryWidth: 1920,
    deliveryHeight: 1080,
    clean: 'work/motion/high-frequency-omni-clean-16x9-8s-v1.mp4',
    m01: 'delivery/16x9/high-frequency-m01-digital-landscape-16x9-v1.jpg',
    m02: 'delivery/16x9/high-frequency-m02-digital-landscape-16x9-v1.jpg',
    m03: 'delivery/16x9/high-frequency-m03-digital-landscape-16x9-v1.jpg',
    tileA: 'delivery/4x5/high-frequency-m01-meta-feed-4x5-v1.jpg',
    tileB: 'delivery/9x16/high-frequency-m02-meta-story-reel-9x16-v1.jpg',
    tileC: 'delivery/16x9/high-frequency-m03-digital-landscape-16x9-v1.jpg',
    wall: {
      a: { width: 280, height: 350, x: 95, y: 185, from: 'left' },
      b: { width: 205, height: 364, x: 450, y: 178, from: 'bottom' },
      c: { width: 440, height: 248, x: 735, y: 235, from: 'right' }
    }
  }
]

const ffmpeg = args => execFileSync('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: 'inherit' })
const abs = relative => path.join(runDir, relative)
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const encodeVideo = ['-r', '24', '-an', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '18']

const makeMotionSegment = (spec, output) => {
  ffmpeg([
    '-ss', '0', '-t', '7.2', '-i', abs(spec.clean),
    '-vf', `scale=${spec.width}:${spec.height}:force_original_aspect_ratio=increase,crop=${spec.width}:${spec.height},fps=24,format=yuv420p`,
    ...encodeVideo, output
  ])
}

const makePanSegment = (spec, input, output, direction) => {
  const scaledWidth = Math.ceil(spec.width * 1.08 / 2) * 2
  const scaledHeight = Math.ceil(spec.height * 1.08 / 2) * 2
  const x = direction === 'forward' ? `(in_w-out_w)*t/1.5` : `(in_w-out_w)*(1-t/1.5)`
  const y = direction === 'forward' ? `(in_h-out_h)*(1-t/1.5)/2` : `(in_h-out_h)*t/3`
  ffmpeg([
    '-loop', '1', '-t', '1.5', '-framerate', '24', '-i', abs(input),
    '-vf', `scale=${scaledWidth}:${scaledHeight}:force_original_aspect_ratio=increase,crop=${spec.width}:${spec.height}:x='${x}':y='${y}',fps=24,format=yuv420p`,
    ...encodeVideo, output
  ])
}

const entryX = (tile, canvasWidth) => {
  if (tile.from === 'left') return `if(lt(t,0.45),-w+(t/0.45)*(${tile.x}+w),${tile.x})`
  if (tile.from === 'right') return `if(lt(t,0.25),${canvasWidth},if(lt(t,0.70),${canvasWidth}-((t-0.25)/0.45)*(${canvasWidth}-${tile.x}),${tile.x}))`
  return `${tile.x}`
}

const entryY = (tile, canvasHeight) => {
  if (tile.from === 'bottom') return `if(lt(t,0.25),${canvasHeight},if(lt(t,0.70),${canvasHeight}-((t-0.25)/0.45)*(${canvasHeight}-${tile.y}),${tile.y}))`
  return `${tile.y}`
}

const tileFilter = (index, tile, label) =>
  `[${index}:v]scale=${tile.width}:${tile.height}:force_original_aspect_ratio=decrease,` +
  `pad=${tile.width + 8}:${tile.height + 8}:4:4:color=white,format=rgba[${label}]`

const makeWallSegment = (spec, output) => {
  const { a, b, c } = spec.wall
  const filter = [
    `[0:v]scale=${spec.width}:${spec.height}:force_original_aspect_ratio=increase,crop=${spec.width}:${spec.height},gblur=sigma=18,eq=brightness=-0.28:saturation=0.75,format=rgba[bg]`,
    tileFilter(1, a, 'a'),
    tileFilter(2, b, 'b'),
    tileFilter(3, c, 'c'),
    `[bg][a]overlay=x='${entryX(a, spec.width)}':y='${entryY(a, spec.height)}':eof_action=pass[o1]`,
    `[o1][b]overlay=x='${entryX(b, spec.width)}':y='${entryY(b, spec.height)}':eof_action=pass[o2]`,
    `[o2][c]overlay=x='${entryX(c, spec.width)}':y='${entryY(c, spec.height)}':eof_action=pass,trim=duration=2.3,setpts=PTS-STARTPTS,fps=24,format=yuv420p[v]`
  ].join(';')

  ffmpeg([
    '-loop', '1', '-t', '2.3', '-framerate', '24', '-i', abs(spec.m01),
    '-loop', '1', '-t', '2.3', '-framerate', '24', '-i', abs(spec.tileA),
    '-loop', '1', '-t', '2.3', '-framerate', '24', '-i', abs(spec.tileB),
    '-loop', '1', '-t', '2.3', '-framerate', '24', '-i', abs(spec.tileC),
    '-filter_complex', filter, '-map', '[v]', ...encodeVideo, output
  ])
}

const makeEndcard = (spec, output) => {
  ffmpeg([
    '-loop', '1', '-t', '2.5', '-framerate', '24', '-i', abs(spec.m01),
    '-vf', `scale=${spec.width}:${spec.height}:force_original_aspect_ratio=increase,crop=${spec.width}:${spec.height},fps=24,format=yuv420p`,
    ...encodeVideo, output
  ])
}

const results = []

for (const spec of specs) {
  const workDir = path.join(workRoot, spec.id)
  await mkdir(workDir, { recursive: true })
  const segments = [
    path.join(workDir, 'sh01-motion.mp4'),
    path.join(workDir, 'sh02-m02.mp4'),
    path.join(workDir, 'sh03-m03.mp4'),
    path.join(workDir, 'sh04-format-wall.mp4'),
    path.join(workDir, 'sh05-endcard.mp4')
  ]

  makeMotionSegment(spec, segments[0])
  makePanSegment(spec, spec.m02, segments[1], 'forward')
  makePanSegment(spec, spec.m03, segments[2], 'reverse')
  makeWallSegment(spec, segments[3])
  makeEndcard(spec, segments[4])

  const rough = path.join(workDir, `high-frequency-hero-${spec.id}-15s-rough.mp4`)
  ffmpeg([
    ...segments.flatMap(segment => ['-i', segment]),
    '-filter_complex', '[0:v][1:v][2:v][3:v][4:v]concat=n=5:v=1:a=0,fps=24,format=yuv420p[v]',
    '-map', '[v]', ...encodeVideo, rough
  ])

  const filename = `high-frequency-m01-brand-light-hero-${spec.id}-15s-v1.mp4`
  const output = path.join(deliveryDir, filename)
  const preliminary = path.join(workDir, `high-frequency-hero-${spec.id}-15s-preliminary.mp4`)
  const audioFilter = [
    `[1:a]asplit=2[a0][a1]`,
    `[a0]atrim=0:8,asetpts=PTS-STARTPTS[a0t]`,
    `[a1]atrim=0:7.5,asetpts=PTS-STARTPTS[a1t]`,
    `[a0t][a1t]acrossfade=d=0.5:c1=tri:c2=tri,atrim=0:15,afade=t=out:st=13.8:d=1.2,aresample=48000,volume=-6dB[a]`,
    `[0:v]scale=${spec.deliveryWidth}:${spec.deliveryHeight}:flags=lanczos,fps=24,format=yuv420p[v]`
  ].join(';')

  ffmpeg([
    '-i', rough, '-i', abs(spec.clean),
    '-filter_complex', audioFilter,
    '-map', '[v]', '-map', '[a]', '-t', '15',
    '-r', '24', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-preset', 'slow', '-crf', '17', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', preliminary
  ])

  ffmpeg([
    '-i', preliminary, '-map', '0:v:0', '-map', '0:a:0',
    '-c:v', 'copy',
    '-af', 'acompressor=threshold=-30dB:ratio=8:attack=10:release=250:makeup=12dB,loudnorm=I=-16:TP=-2.5:LRA=7',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', '15', '-movflags', '+faststart', output
  ])

  const poster = output.replace('.mp4', '-poster.jpg')
  ffmpeg(['-ss', '14.4', '-i', output, '-frames:v', '1', '-q:v', '2', poster])

  const contactSheet = path.join(reviewDir, `motion-hero-${spec.id}-15s-contact-sheet.jpg`)
  const thumbWidth = spec.id === '9x16' ? 270 : 480
  ffmpeg([
    '-i', output,
    '-vf', `fps=1/2,scale=${thumbWidth}:-2:flags=lanczos,tile=4x2:padding=8:margin=8:color=0x06162d`,
    '-frames:v', '1', '-q:v', '2', contactSheet
  ])

  const bytes = await readFile(output)
  const posterBytes = await readFile(poster)
  const probe = JSON.parse(execFileSync('ffprobe', [
    '-v', 'error', '-show_entries',
    'stream=index,codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels:format=duration,size,format_name',
    '-of', 'json', output
  ], { encoding: 'utf8' }))

  results.push({
    id: `hero-${spec.id}-15s`,
    kind: 'hero',
    formatId: spec.id,
    brandMode: 'brand-light',
    channelMode: 'digital-motion',
    output: path.relative(runDir, output),
    poster: path.relative(runDir, poster),
    contactSheet: path.relative(runDir, contactSheet),
    sourceMotion: spec.clean,
    sourceStills: [spec.m01, spec.m02, spec.m03, spec.tileA, spec.tileB, spec.tileC],
    durationSeconds: 15,
    deterministicEndcardSeconds: 2.5,
    loudnessTargetLufs: -16,
    truePeakCeilingDbfs: -1,
    generativeCostUsd: 0,
    rasterNote: 'Deterministic Lanczos scale from 720p clean master to 1080p delivery raster; not native 1080p detail.',
    bytes: bytes.length,
    sha256: sha256(bytes),
    posterSha256: sha256(posterBytes),
    probe
  })
}

await writeFile(
  path.join(runDir, 'manifests', '10-hero-15s-release.json'),
  `${JSON.stringify({
    stage: 'deterministic-15s-hero-edit',
    renderer: 'ffmpeg; existing Omni motion + exact campaign stills + format-wall composite',
    storyboard: 'brief/motion-15s-animatic-shotlist.md',
    edl: 'brief/motion-15s-edl.md',
    soundDesign: 'brief/motion-15s-sound-design.md',
    results
  }, null, 2)}\n`
)

process.stdout.write(`Composed ${results.length} deterministic 15-second hero masters\n`)
