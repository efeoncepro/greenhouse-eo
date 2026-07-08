#!/usr/bin/env node

import { copyFile, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const usage = `Usage:
  pnpm media:webp -- --input <image> --out <file.webp> [options]
  pnpm media:webp -- --input <image> --out-dir <dir> --stem <name> [options]

Options:
  --width <px>     Resize width. Use with --height for exact box.
  --height <px>    Resize height. Use with --width for exact box.
  --quality <n>    WebP quality. Default: 82
  --method <n>     cwebp compression method 0-6. Default: 6
  --copy-to <dir>  Also copy final file to this directory.
  --help           Show this help.
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

function numberOption(args, key, fallback, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  if (args[key] === undefined) {
    return fallback
  }

  const value = Number(args[key])

  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`--${key.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)} must be a number between ${min} and ${max}`)
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

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    process.stdout.write(usage)
    
return
  }

  if (!args.input) {
    throw new Error('Required: --input\n\n' + usage)
  }

  const input = path.resolve(args.input)

  const output = args.out
    ? path.resolve(args.out)
    : args.outDir && args.stem
      ? path.resolve(args.outDir, `${args.stem}.webp`)
      : null

  if (!output) {
    throw new Error('Required: --out or --out-dir plus --stem\n\n' + usage)
  }

  const copyTo = args.copyTo ? path.resolve(args.copyTo) : null
  const width = args.width === undefined ? undefined : numberOption(args, 'width', undefined, { min: 1 })
  const height = args.height === undefined ? undefined : numberOption(args, 'height', undefined, { min: 1 })
  const quality = numberOption(args, 'quality', 82, { min: 1, max: 100 })
  const method = numberOption(args, 'method', 6, { min: 0, max: 6 })

  await stat(input)
  await assertTool('cwebp')
  await mkdir(path.dirname(output), { recursive: true })

  if (copyTo) {
    await mkdir(copyTo, { recursive: true })
  }

  const resizeArgs = width || height ? ['-resize', String(width ?? 0), String(height ?? 0)] : []

  run('cwebp', [
    '-quiet',
    '-q',
    String(quality),
    '-m',
    String(method),
    ...resizeArgs,
    input,
    '-o',
    output,
  ])

  if (copyTo) {
    await copyFile(output, path.join(copyTo, path.basename(output)))
  }

  process.stdout.write(`${JSON.stringify({ ok: true, input, output, copyTo }, null, 2)}\n`)
}

main().catch(error => {
  process.stderr.write(`media:webp failed: ${error.message}\n`)
  process.exit(1)
})
