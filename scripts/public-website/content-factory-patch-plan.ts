#!/usr/bin/env tsx
/**
 * Build a non-mutating Gutenberg patch plan from a refresh plan and patch brief.
 *
 * This command reads local JSON artifacts only. It never calls WordPress.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type {
  ContentFactoryPatchBrief,
  ContentFactoryRefreshPlan
} from '../../src/lib/public-site/content-factory/contracts'
import {
  CONTENT_FACTORY_PATCH_PLAN_CONTRACT_VERSION,
  prepareGutenbergPatchPlan,
  summarizeGutenbergPatchPlan
} from '../../src/lib/public-site/content-factory/patch-plan'

type CliOptions = {
  refreshPlan: string | null
  brief: string | null
  json: boolean
  write: boolean
  help: boolean
}

const REPORTS_ROOT = 'docs/operations/public-site-content-factory'

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    refreshPlan: null,
    brief: null,
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

    if (arg === '--refresh-plan') {
      const value = normalizedArgv[i + 1]

      if (!value) throw new Error('--refresh-plan requires a path')

      options.refreshPlan = value
      i += 1
      continue
    }

    if (arg === '--brief') {
      const value = normalizedArgv[i + 1]

      if (!value) throw new Error('--brief requires a path')

      options.brief = value
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
  pnpm public-website:content-factory:patch-plan -- --refresh-plan ./refresh-plan.json --brief ./patch-brief.json
  pnpm public-website:content-factory:patch-plan -- --refresh-plan ./refresh-plan.json --brief ./patch-brief.json --write
  pnpm public-website:content-factory:patch-plan -- --refresh-plan ./refresh-plan.json --brief ./patch-brief.json --json

Input:
  A local contentFactoryRefreshPlan.v1 JSON artifact and a contentFactoryPatchBrief.v1 JSON artifact.

Output:
  contentFactoryPatchPlan.v1 summary by default. Use --json for the full plan.
  With --write, stores patch-plan-*.json under ${REPORTS_ROOT}.

Safety:
  This command never calls WordPress and never sends writes.`)
}

const readJson = <T>(path: string) => JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as T

const writeEvidence = (plan: ReturnType<typeof prepareGutenbergPatchPlan>) => {
  const reportsRoot = resolve(process.cwd(), REPORTS_ROOT)

  const outputPath = join(
    reportsRoot,
    `patch-plan-${plan.target.wordpressPostId}-${plan.generatedAt.replace(/[:.]/g, '-')}.json`
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

  if (!options.refreshPlan) throw new Error('--refresh-plan is required')
  if (!options.brief) throw new Error('--brief is required')

  const refreshPlan = readJson<ContentFactoryRefreshPlan>(options.refreshPlan)
  const brief = readJson<ContentFactoryPatchBrief>(options.brief)
  const plan = prepareGutenbergPatchPlan(refreshPlan, brief)

  if (plan.contractVersion !== CONTENT_FACTORY_PATCH_PLAN_CONTRACT_VERSION) {
    throw new Error(`Unsupported patch plan contract: ${plan.contractVersion}`)
  }

  if (options.write) {
    console.log(`Wrote Public Site Content Factory patch plan: ${writeEvidence(plan)}`)
  }

  console.log(JSON.stringify(options.json ? plan : summarizeGutenbergPatchPlan(plan), null, 2))
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:content-factory:patch-plan failed: ${message}`)
  process.exit(1)
}
