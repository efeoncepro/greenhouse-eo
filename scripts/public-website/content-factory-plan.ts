#!/usr/bin/env tsx
/**
 * Plan a local Gutenberg draft artifact from a Content Factory brief.
 *
 * This command is non-mutating: it reads a local brief JSON, generates a local
 * contentFactoryGeneratedDraft.v1 artifact, validates it, and optionally writes
 * local evidence. It never calls WordPress.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { ContentFactoryBrief } from '../../src/lib/public-site/content-factory/contracts'
import { planGeneratedGutenbergPostDraft } from '../../src/lib/public-site/content-factory/gutenberg-planner'
import { validateGeneratedGutenbergDraft } from '../../src/lib/public-site/content-factory/gutenberg-validator'

type CliOptions = {
  file: string | null
  out: string | null
  write: boolean
  help: boolean
}

const REPORTS_ROOT = 'docs/operations/public-site-content-factory'

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    file: null,
    out: null,
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

    if (arg === '--out') {
      const value = normalizedArgv[i + 1]

      if (!value) throw new Error('--out requires a path')

      options.out = value
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
  pnpm public-website:content-factory:plan -- --file ./brief.json
  pnpm public-website:content-factory:plan -- --file ./brief.json --out ./tmp/generated-draft.json
  pnpm public-website:content-factory:plan -- --file ./brief.json --write

Input:
  A local contentFactoryBrief.v1 JSON artifact with lane=post_draft_gutenberg.

Output:
  contentFactoryGeneratedDraft.v1 plus contentFactoryValidation.v1. With --write,
  stores generated-draft-*.json under ${REPORTS_ROOT}.`)
}

const writeJsonFile = (path: string, value: unknown) => {
  const absolutePath = resolve(process.cwd(), path)

  mkdirSync(resolve(absolutePath, '..'), { recursive: true })
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`)

  return absolutePath
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

  const brief = JSON.parse(readFileSync(resolve(process.cwd(), options.file), 'utf8')) as ContentFactoryBrief
  const draft = planGeneratedGutenbergPostDraft(brief)
  const validation = validateGeneratedGutenbergDraft(draft)

  const result = {
    generatedAt: new Date().toISOString(),
    sourceFile: options.file,
    draft,
    validation
  }

  if (options.out) {
    console.log(`Wrote generated Content Factory draft: ${writeJsonFile(options.out, draft)}`)
  }

  if (options.write) {
    const reportsRoot = resolve(process.cwd(), REPORTS_ROOT)
    const outputPath = join(reportsRoot, `generated-draft-${result.generatedAt.replace(/[:.]/g, '-')}.json`)

    mkdirSync(reportsRoot, { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`)
    console.log(`Wrote Public Site Content Factory plan: ${outputPath}`)
  }

  console.log(JSON.stringify(result, null, 2))

  if (validation.status === 'block') {
    process.exitCode = 2
  }
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:content-factory:plan failed: ${message}`)
  process.exit(1)
}
