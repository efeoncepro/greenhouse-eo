#!/usr/bin/env tsx
/**
 * Author a Gutenberg draft from a structured article spec.
 *
 * This is the operable "author" lane: an agent (or a future governed LLM) writes
 * the real content as a typed GutenbergArticleSpec JSON; this command assembles a
 * correct contentFactoryGeneratedDraft.v1 (anchored headings + populated Yoast TOC
 * by construction) and validates it. Non-mutating: it never calls WordPress.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { authorGutenbergDraft, type GutenbergArticleSpec } from '../../src/lib/public-site/content-factory/article-authoring'
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
  const options: CliOptions = { file: null, out: null, write: false, help: false }

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
  pnpm public-website:content-factory:author -- --file ./spec.json
  pnpm public-website:content-factory:author -- --file ./spec.json --out ./tmp/draft.json
  pnpm public-website:content-factory:author -- --file ./spec.json --write

Input:
  A local GutenbergArticleSpec JSON (title, seo, intro[], sections[], cta?).
  The author decides the content; this command guarantees the structure.

Output:
  contentFactoryGeneratedDraft.v1 plus contentFactoryValidation.v1. With --write,
  stores authored-draft-*.json under ${REPORTS_ROOT}. Never calls WordPress.`)
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

  const spec = JSON.parse(readFileSync(resolve(process.cwd(), options.file), 'utf8')) as GutenbergArticleSpec
  const draft = authorGutenbergDraft(spec)
  const validation = validateGeneratedGutenbergDraft(draft)

  const result = {
    generatedAt: new Date().toISOString(),
    sourceFile: options.file,
    draft,
    validation
  }

  if (options.out) {
    const absolutePath = resolve(process.cwd(), options.out)

    mkdirSync(resolve(absolutePath, '..'), { recursive: true })
    writeFileSync(absolutePath, `${JSON.stringify(draft, null, 2)}\n`)
    console.log(`Wrote authored Content Factory draft: ${absolutePath}`)
  }

  if (options.write) {
    const reportsRoot = resolve(process.cwd(), REPORTS_ROOT)
    const outputPath = join(reportsRoot, `authored-draft-${result.generatedAt.replace(/[:.]/g, '-')}.json`)

    mkdirSync(reportsRoot, { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`)
    console.log(`Wrote Public Site Content Factory authored draft: ${outputPath}`)
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

  console.error(`public-website:content-factory:author failed: ${message}`)
  process.exit(1)
}
