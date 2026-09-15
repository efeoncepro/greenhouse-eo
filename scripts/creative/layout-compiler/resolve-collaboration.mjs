#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { resolveCollaborationSelectionIntent } from '@efeoncepro/axis-ui-contracts'

const args = process.argv.slice(2)

const readArg = name => {
  const index = args.indexOf(name)

  return index === -1 ? null : args[index + 1]
}

const usage = `AXIS Collaboration Selection Resolver

Usage:
  pnpm creative:collaboration:resolve -- --input <intent.json> [--out <manifest.json>]

The command validates semantic cursor intent and emits axis.collaboration-selection-composition.v1.
It does not render, call a model, publish or approve.
`

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(usage)
  process.exit(0)
}

const inputValue = readArg('--input')
const outputValue = readArg('--out')

if (!inputValue) {
  process.stderr.write(usage)
  process.exit(2)
}

try {
  const inputPath = path.resolve(inputValue)
  const intent = JSON.parse(await readFile(inputPath, 'utf8'))
  const manifest = resolveCollaborationSelectionIntent(intent)
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`

  if (outputValue) {
    const outputPath = path.resolve(outputValue)

    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, serialized)
  } else process.stdout.write(serialized)
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}
