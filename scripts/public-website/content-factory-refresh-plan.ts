#!/usr/bin/env tsx
/**
 * Build a non-mutating Gutenberg refresh plan from a deep post inspection.
 *
 * This command reads a local contentFactoryPostDeepInspection.v1 artifact and
 * emits contentFactoryRefreshPlan.v1. It never calls WordPress.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { ContentFactoryPostDeepInspection } from '../../src/lib/public-site/content-factory/contracts'
import {
  CONTENT_FACTORY_REFRESH_PLAN_CONTRACT_VERSION,
  prepareGutenbergRefreshPlan,
  summarizeGutenbergRefreshPlan
} from '../../src/lib/public-site/content-factory/refresh-plan'

type CliOptions = {
  inspection: string | null
  objective: string | null
  maxEditableTextCandidates: number | null
  json: boolean
  write: boolean
  help: boolean
}

const REPORTS_ROOT = 'docs/operations/public-site-content-factory'

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    inspection: null,
    objective: null,
    maxEditableTextCandidates: null,
    json: false,
    write: false,
    help: false
  }

  for (let i = 0; i < normalizedArgv.length; i += 1) {
    const arg = normalizedArgv[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--inspection') {
      const value = normalizedArgv[i + 1]

      if (!value) throw new Error('--inspection requires a path')

      options.inspection = value
      i += 1
      continue
    }

    if (arg === '--objective') {
      const value = normalizedArgv[i + 1]

      if (!value) throw new Error('--objective requires a value')

      options.objective = value
      i += 1
      continue
    }

    if (arg === '--max-editable-text-candidates') {
      const value = Number(normalizedArgv[i + 1])

      if (!Number.isInteger(value) || value <= 0) {
        throw new Error('--max-editable-text-candidates requires a positive integer')
      }

      options.maxEditableTextCandidates = value
      i += 1
      continue
    }

    if (arg === '--json') {
      options.json = true
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
  pnpm public-website:content-factory:refresh-plan -- --inspection ./docs/operations/public-site-content-factory/post-deep-inspection-248398-....json
  pnpm public-website:content-factory:refresh-plan -- --inspection ./inspection.json --objective "Refresh intro and SEO angle" --write
  pnpm public-website:content-factory:refresh-plan -- --inspection ./inspection.json --json

Input:
  A local contentFactoryPostDeepInspection.v1 JSON artifact.

Output:
  contentFactoryRefreshPlan.v1 summary by default. Use --json for the full plan.
  With --write, stores refresh-plan-*.json under ${REPORTS_ROOT}.

Safety:
  This command never calls WordPress and never sends writes.`)
}

const writeEvidence = (plan: ReturnType<typeof prepareGutenbergRefreshPlan>) => {
  const reportsRoot = resolve(process.cwd(), REPORTS_ROOT)

  const outputPath = join(
    reportsRoot,
    `refresh-plan-${plan.target.wordpressPostId}-${plan.generatedAt.replace(/[:.]/g, '-')}.json`
  )

  mkdirSync(reportsRoot, { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`)

  return outputPath
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()

    return
  }

  if (!options.inspection) {
    throw new Error('--inspection is required')
  }

  const inspection = JSON.parse(
    readFileSync(resolve(process.cwd(), options.inspection), 'utf8')
  ) as ContentFactoryPostDeepInspection

  const plan = prepareGutenbergRefreshPlan(inspection, {
    objective: options.objective ?? undefined,
    maxEditableTextCandidates: options.maxEditableTextCandidates ?? undefined
  })

  if (plan.contractVersion !== CONTENT_FACTORY_REFRESH_PLAN_CONTRACT_VERSION) {
    throw new Error(`Unsupported refresh plan contract: ${plan.contractVersion}`)
  }

  if (options.write) {
    console.log(`Wrote Public Site Content Factory refresh plan: ${writeEvidence(plan)}`)
  }

  console.log(JSON.stringify(options.json ? plan : summarizeGutenbergRefreshPlan(plan), null, 2))
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:content-factory:refresh-plan failed: ${message}`)
  process.exit(1)
}
