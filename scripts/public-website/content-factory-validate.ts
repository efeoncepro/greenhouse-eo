#!/usr/bin/env tsx
/**
 * Validate local Greenhouse AI Content Factory draft artifacts.
 *
 * This command is non-mutating: it reads a local JSON artifact and optionally
 * writes local validation evidence. It never calls WordPress.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { ContentFactoryGeneratedDraft } from '../../src/lib/public-site/content-factory/contracts'
import { validateGeneratedGutenbergDraft } from '../../src/lib/public-site/content-factory/gutenberg-validator'

type CliOptions = {
  file: string | null
  write: boolean
  help: boolean
}

const REPORTS_ROOT = 'docs/operations/public-site-content-factory'

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    file: null,
    write: false,
    help: false
  }

  for (let i = 0; i < normalizedArgv.length; i += 1) {
    const arg = normalizedArgv[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--file') {
      const value = normalizedArgv[i + 1]

      if (!value) throw new Error('--file requires a path')

      options.file = value
      i += 1
      continue
    }

    if (arg === '--write') {
      options.write = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

const printHelp = () => {
  console.log(`Usage:
  pnpm public-website:content-factory:validate -- --file ./tmp/generated-post-draft.json
  pnpm public-website:content-factory:validate -- --file ./tmp/generated-post-draft.json --write

Input:
  A local contentFactoryGeneratedDraft.v1 JSON artifact with draft.kind=gutenberg_post.

Output:
  contentFactoryValidation.v1. With --write, stores validation-*.json under ${REPORTS_ROOT}.`)
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()

    return
  }

  if (!options.file) {
    throw new Error('--file is required')
  }

  const absoluteInputPath = resolve(process.cwd(), options.file)
  const draft = JSON.parse(readFileSync(absoluteInputPath, 'utf8')) as ContentFactoryGeneratedDraft
  const validation = validateGeneratedGutenbergDraft(draft)

  if (options.write) {
    const reportsRoot = resolve(process.cwd(), REPORTS_ROOT)
    const generatedAt = new Date().toISOString()
    const outputPath = join(reportsRoot, `validation-${generatedAt.replace(/[:.]/g, '-')}.json`)

    mkdirSync(reportsRoot, { recursive: true })
    writeFileSync(
      outputPath,
      `${JSON.stringify(
        {
          generatedAt,
          sourceFile: options.file,
          validation
        },
        null,
        2
      )}\n`
    )
    console.log(`Wrote Public Site Content Factory validation: ${outputPath}`)
  }

  console.log(JSON.stringify(validation, null, 2))

  if (validation.status === 'block') {
    process.exitCode = 2
  }
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:content-factory:validate failed: ${message}`)
  process.exit(1)
}
