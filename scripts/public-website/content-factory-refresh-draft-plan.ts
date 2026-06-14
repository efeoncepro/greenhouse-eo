#!/usr/bin/env tsx
/**
 * Prepare a non-mutating draft/private clone plan for an existing Gutenberg post refresh.
 *
 * This command consumes a contentFactoryPatchPlan.v1 artifact and builds the signed
 * bridge request shape for the future from-existing-post endpoint. It never calls
 * WordPress and never sends a write.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { ContentFactoryPatchPlan } from '../../src/lib/public-site/content-factory/contracts'
import {
  prepareExistingPostRefreshDraftPlan,
  summarizeExistingPostRefreshDraftPlan
} from '../../src/lib/public-site/content-factory/existing-post-refresh-draft-plan'

type CliOptions = {
  patchPlan: string | null
  manifestId: string | null
  slug: string | null
  status: 'draft' | 'private'
  json: boolean
  write: boolean
  help: boolean
}

const REPORTS_ROOT = 'docs/operations/public-site-content-factory'

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    patchPlan: null,
    manifestId: null,
    slug: null,
    status: 'draft',
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

    if (arg === '--patch-plan') {
      const value = normalizedArgv[i + 1]

      if (!value) throw new Error('--patch-plan requires a path')

      options.patchPlan = value
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

    if (arg === '--slug') {
      const value = normalizedArgv[i + 1]

      if (!value) throw new Error('--slug requires a value')

      options.slug = value
      i += 1
      continue
    }

    if (arg === '--private') {
      options.status = 'private'
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
  pnpm public-website:content-factory:refresh-draft-plan -- --patch-plan ./patch-plan.json
  pnpm public-website:content-factory:refresh-draft-plan -- --patch-plan ./patch-plan.json --private --write
  pnpm public-website:content-factory:refresh-draft-plan -- --patch-plan ./patch-plan.json --manifest-id content-factory.refresh.demo --json

Input:
  A local contentFactoryPatchPlan.v1 JSON artifact with readiness.status=ready_for_draft_clone.

Output:
  contentFactoryExistingPostRefreshDraftPlan.v1 summary by default. Use --json for the full plan.
  With --write, stores refresh-draft-plan-*.json under ${REPORTS_ROOT}.

Safety:
  This command never calls WordPress and never sends writes.`)
}

const readJson = <T>(path: string) => JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as T

const writeEvidence = (plan: ReturnType<typeof prepareExistingPostRefreshDraftPlan>) => {
  const reportsRoot = resolve(process.cwd(), REPORTS_ROOT)

  const outputPath = join(
    reportsRoot,
    `refresh-draft-plan-${plan.sourcePatchPlan.wordpressPostId}-${plan.generatedAt.replace(/[:.]/g, '-')}.json`
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

  if (!options.patchPlan) throw new Error('--patch-plan is required')

  const patchPlan = readJson<ContentFactoryPatchPlan>(options.patchPlan)

  const plan = prepareExistingPostRefreshDraftPlan(patchPlan, {
    manifestId: options.manifestId ?? undefined,
    slug: options.slug ?? undefined,
    status: options.status
  })

  if (options.write) {
    console.log(`Wrote Public Site Content Factory refresh draft plan: ${writeEvidence(plan)}`)
  }

  console.log(JSON.stringify(options.json ? plan : summarizeExistingPostRefreshDraftPlan(plan), null, 2))
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:content-factory:refresh-draft-plan failed: ${message}`)
  process.exit(1)
}
