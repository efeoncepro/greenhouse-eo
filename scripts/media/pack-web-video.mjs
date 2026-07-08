#!/usr/bin/env node

import { copyFile, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const usage = `Usage:
  pnpm media:web-video -- --input <video> --out-dir <dir> --stem <name> [options]

Options:
  --width <px>          Output width. Default: 640
  --height <px>         Output height. Default: 360
  --fps <n>             Output frames per second. Default: 24
  --trim-start <sec>    Start offset in seconds. Default: 0
  --duration <sec>      Optional duration in seconds.
  --poster-offset <sec> Poster frame offset from trim start. Default: 0.8
  --crf-webm <n>        VP9 CRF. Higher is smaller. Default: 34
  --crf-mp4 <n>         H.264 CRF. Higher is smaller. Default: 23
  --fit <cover|contain> Resize behavior. Default: cover
  --copy-to <dir>       Also copy final files to this directory.
  --help                Show this help.

Outputs:
  <stem>.webm
  <stem>.mp4
  <stem>-poster.jpg
`

function parseArgs(argv) {
  const args = {}

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]

    if (token === '--') {
      continue
    }

    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`)
    }

    const [rawKey, inlineValue] = token.slice(2).split(/=(.*)/s, 2)
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase())

    if (key === 'help') {
      args.help = true
      continue
    }

    if (inlineValue !== undefined) {
      args[key] = inlineValue
      continue
    }

    const next = argv[i + 1]

    if (!next || next.startsWith('--')) {
      throw new Error(`Missing value for --${rawKey}`)
    }

    args[key] = next
    i += 1
  }

  return args
}

function numberOption(args, key, fallback, { min = 0 } = {}) {
  if (args[key] === undefined) {
    return fallback
  }

  const value = Number(args[key])

  if (!Number.isFinite(value) || value < min) {
    throw new Error(`--${key.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)} must be a number >= ${min}`)
  }

  return value
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`)
  }
}

async function assertTool(command) {
  const result = spawnSync(command, ['-version'], { stdio: 'ignore' })

  if (result.error || result.status !== 0) {
    throw new Error(`${command} is required but was not found or is not executable`)
  }
}

function buildFilter({ width, height, fps, fit }) {
  const scaleMode = fit === 'contain' ? 'decrease' : 'increase'
  const base = [`fps=${fps}`, `scale=${width}:${height}:force_original_aspect_ratio=${scaleMode}`]

  if (fit === 'contain') {
    base.push(`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`)
  } else {
    base.push(`crop=${width}:${height}`)
  }

  base.push('setsar=1', 'format=yuv420p')

  return base.join(',')
}

function seekArgs(trimStart, duration) {
  const args = []

  if (trimStart > 0) {
    args.push('-ss', String(trimStart))
  }

  if (duration !== undefined) {
    args.push('-t', String(duration))
  }

  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    process.stdout.write(usage)
    
return
  }

  if (!args.input || !args.outDir || !args.stem) {
    throw new Error('Required: --input, --out-dir, --stem\n\n' + usage)
  }

  const input = path.resolve(args.input)
  const outDir = path.resolve(args.outDir)
  const copyTo = args.copyTo ? path.resolve(args.copyTo) : null
  const width = numberOption(args, 'width', 640, { min: 1 })
  const height = numberOption(args, 'height', 360, { min: 1 })
  const fps = numberOption(args, 'fps', 24, { min: 1 })
  const trimStart = numberOption(args, 'trimStart', 0, { min: 0 })
  const duration = args.duration === undefined ? undefined : numberOption(args, 'duration', undefined, { min: 0.01 })
  const posterOffset = numberOption(args, 'posterOffset', 0.8, { min: 0 })
  const crfWebm = numberOption(args, 'crfWebm', 34, { min: 0 })
  const crfMp4 = numberOption(args, 'crfMp4', 23, { min: 0 })
  const fit = args.fit ?? 'cover'

  if (!['cover', 'contain'].includes(fit)) {
    throw new Error('--fit must be cover or contain')
  }

  await stat(input)
  await assertTool('ffmpeg')
  await mkdir(outDir, { recursive: true })

  if (copyTo) {
    await mkdir(copyTo, { recursive: true })
  }

  const filter = buildFilter({ width, height, fps, fit })
  const webm = path.join(outDir, `${args.stem}.webm`)
  const mp4 = path.join(outDir, `${args.stem}.mp4`)
  const poster = path.join(outDir, `${args.stem}-poster.jpg`)

  run('ffmpeg', [
    '-y',
    ...seekArgs(trimStart, duration),
    '-i',
    input,
    '-vf',
    filter,
    '-an',
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    String(crfWebm),
    '-deadline',
    'good',
    '-row-mt',
    '1',
    webm,
  ])

  run('ffmpeg', [
    '-y',
    ...seekArgs(trimStart, duration),
    '-i',
    input,
    '-vf',
    filter,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    String(crfMp4),
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    mp4,
  ])

  run('ffmpeg', [
    '-y',
    '-ss',
    String(trimStart + posterOffset),
    '-i',
    input,
    '-frames:v',
    '1',
    '-update',
    '1',
    '-vf',
    filter,
    '-q:v',
    '3',
    poster,
  ])

  const outputs = { webm, mp4, poster }

  if (copyTo) {
    await Promise.all(
      Object.values(outputs).map(file => copyFile(file, path.join(copyTo, path.basename(file)))),
    )
  }

  process.stdout.write(`${JSON.stringify({ ok: true, input, outDir, copyTo, outputs }, null, 2)}\n`)
}

main().catch(error => {
  process.stderr.write(`media:web-video failed: ${error.message}\n`)
  process.exit(1)
})
