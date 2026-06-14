#!/usr/bin/env tsx
/**
 * Prepare a non-mutating WordPress draft smoke plan for Content Factory drafts.
 *
 * This command never sends the request. It validates a local generated draft and
 * builds the signed bridge request shape with redacted headers for review.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { ContentFactoryGeneratedDraft } from '../../src/lib/public-site/content-factory/contracts'
import { prepareGutenbergDraftSmokePlan } from '../../src/lib/public-site/content-factory/draft-smoke-plan'

type CliOptions = {
  file: string | null
  manifestId: string | null
  status: 'draft' | 'private'
  write: boolean
  help: boolean
}

const REPORTS_ROOT = 'docs/operations/public-site-content-factory'

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    file: null,
    manifestId: null,
    status: 'draft',
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

    if (arg === '--manifest-id') {
      const value = normalizedArgv[i + 1]

      if (!value) throw new Error('--manifest-id requires a value')

      options.manifestId = value
      i += 1
      continue
    }

    if (arg === '--private') {
      options.status = 'private'
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
  pnpm public-website:content-factory:smoke-plan -- --file ./generated-post-draft.json
  pnpm public-website:content-factory:smoke-plan -- --file ./generated-post-draft.json --private --write
  pnpm public-website:content-factory:smoke-plan -- --file ./generated-post-draft.json --manifest-id greenhouse-smoke-ai-revops

Input:
  A local contentFactoryGeneratedDraft.v1 JSON artifact with draft.kind=gutenberg_post.

Output:
  contentFactoryDraftSmokePlan.v1. With --write, stores smoke-plan-*.json under ${REPORTS_ROOT}.

Safety:
  This command never calls WordPress and never sends a write.`)
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

  const draft = JSON.parse(readFileSync(resolve(process.cwd(), options.file), 'utf8')) as ContentFactoryGeneratedDraft

  const plan = prepareGutenbergDraftSmokePlan(draft, {
    manifestId: options.manifestId ?? undefined,
    status: options.status
  })

  if (options.write) {
    const reportsRoot = resolve(process.cwd(), REPORTS_ROOT)
    const outputPath = join(reportsRoot, `smoke-plan-${plan.generatedAt.replace(/[:.]/g, '-')}.json`)

    mkdirSync(reportsRoot, { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`)
    console.log(`Wrote Public Site Content Factory smoke plan: ${outputPath}`)
  }

  console.log(JSON.stringify(plan, null, 2))
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:content-factory:smoke-plan failed: ${message}`)
  process.exit(1)
}
