#!/usr/bin/env tsx
/**
 * Deep-inspect a WordPress Gutenberg post for Content Factory refresh planning.
 *
 * This command is read-only. It executes a temporary PHP inspection through the
 * canonical remote WP-CLI wrapper, parses Gutenberg blocks, and optionally
 * writes local evidence. It never mutates WordPress.
 */

import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import type { ContentFactoryPostDeepInspection } from '../../src/lib/public-site/content-factory/contracts'
import {
  buildPostDeepInspectionEvalPhp,
  CONTENT_FACTORY_POST_DEEP_INSPECTION_CONTRACT_VERSION,
  summarizePostDeepInspection
} from '../../src/lib/public-site/content-factory/post-deep-inspection'

type CliOptions = {
  postId: number | null
  json: boolean
  write: boolean
  help: boolean
}

const REPORTS_ROOT = 'docs/operations/public-site-content-factory'

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    postId: null,
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

    if (arg === '--post-id') {
      const value = Number(normalizedArgv[i + 1])

      if (!Number.isInteger(value) || value <= 0) throw new Error('--post-id requires a positive integer')

      options.postId = value
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
  pnpm public-website:content-factory:inspect-post-deep -- --post-id 248398
  pnpm public-website:content-factory:inspect-post-deep -- --post-id 248398 --json
  pnpm public-website:content-factory:inspect-post-deep -- --post-id 248398 --write

Output:
  contentFactoryPostDeepInspection.v1 summary by default.
  Use --json for the full block tree.
  Use --write to store post-deep-inspection-*.json under ${REPORTS_ROOT}.`)
}

const runWpCliInspection = (postId: number): ContentFactoryPostDeepInspection => {
  const tempDir = mkdtempSync(join(tmpdir(), 'greenhouse-post-deep-inspection-'))
  const evalFile = join(tempDir, `inspect-post-${postId}.php`)

  try {
    writeFileSync(evalFile, buildPostDeepInspectionEvalPhp(postId))

    const result = spawnSync('pnpm', ['exec', 'tsx', 'scripts/public-website/wpcli-remote.ts', '--eval-file', evalFile], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })

    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`

    if (result.error) {
      throw result.error
    }

    if (result.status !== 0) {
      throw new Error(`wp_cli_exit_${result.status}: ${output.slice(0, 1000).trim()}`)
    }

    const contractMarker = '"contractVersion"'
    const markerIndex = output.indexOf(contractMarker)
    const jsonStart = markerIndex >= 0 ? output.lastIndexOf('{', markerIndex) : output.indexOf('{')

    if (jsonStart < 0) {
      throw new Error(`wp_cli_output_missing_json stdout=${JSON.stringify(output.slice(0, 500))}`)
    }

    let inspection: ContentFactoryPostDeepInspection

    try {
      inspection = JSON.parse(output.slice(jsonStart)) as ContentFactoryPostDeepInspection
    } catch (error) {
      const context = output.slice(Math.max(0, jsonStart - 200), jsonStart + 500)
      const message = error instanceof Error ? error.message : String(error)

      throw new Error(`wp_cli_json_parse_failed: ${message}; context=${JSON.stringify(context)}`)
    }

    if (inspection.contractVersion !== CONTENT_FACTORY_POST_DEEP_INSPECTION_CONTRACT_VERSION) {
      throw new Error(`Unsupported deep inspection contract: ${inspection.contractVersion}`)
    }

    return inspection
  } finally {
    rmSync(tempDir, { force: true, recursive: true })
  }
}

const writeEvidence = (inspection: ContentFactoryPostDeepInspection) => {
  const reportsRoot = resolve(process.cwd(), REPORTS_ROOT)

  const outputPath = join(
    reportsRoot,
    `post-deep-inspection-${inspection.post.id}-${inspection.scannedAt.replace(/[:.]/g, '-')}.json`
  )

  mkdirSync(reportsRoot, { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(inspection, null, 2)}\n`)

  return outputPath
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()

    return
  }

  if (!options.postId) {
    throw new Error('--post-id is required')
  }

  const inspection = runWpCliInspection(options.postId)

  if (options.write) {
    console.log(`Wrote Public Site post deep inspection: ${writeEvidence(inspection)}`)
  }

  console.log(JSON.stringify(options.json ? inspection : summarizePostDeepInspection(inspection), null, 2))

  if (inspection.mediaIssues.length > 0) {
    process.exitCode = 2
  }
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:content-factory:inspect-post-deep failed: ${message}`)

  if (error && typeof error === 'object' && 'stderr' in error) {
    const stderr = (error as { stderr?: Buffer | string }).stderr
    const stderrText = Buffer.isBuffer(stderr) ? stderr.toString('utf8') : stderr

    if (stderrText?.trim()) console.error(stderrText.trim())
  }

  process.exit(1)
}
