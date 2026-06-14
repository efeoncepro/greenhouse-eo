#!/usr/bin/env tsx
/**
 * TASK-1122 — Build a no-mutation deployment plan from runtime repo to Kinsta.
 *
 * This command reads the latest live manifest and the governed runtime repo. It
 * does not write to Kinsta, clear cache, create backups, call SSH or call the
 * Kinsta API.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import {
  DEFAULT_PUBLIC_SITE_RUNTIME_REPO_ROOT,
  findLatestPublicSiteLiveManifest,
  listPublicSiteRepoFiles,
  readPublicSiteLiveManifest,
  readPublicSiteRuntimeBinding
} from '../../src/lib/public-site/runtime-binding'

type CliOptions = {
  liveManifest: string | null
  repoRoot: string
  write: boolean
  help: boolean
}

type DeployDryRunAction =
  | 'noop'
  | 'would_update'
  | 'would_create'
  | 'would_not_delete_live_only'
  | 'ignored_live'

type DeployDryRunRow = {
  path: string
  action: DeployDryRunAction
  liveSha256?: string
  repoSha256?: string
  liveBytes?: number
  repoBytes?: number
  reason?: string
}

const REPORTS_ROOT = 'docs/operations/public-site-deploy-dry-runs'

const IGNORED_LIVE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /(^|\/)wp-content\/uploads\//, reason: 'WordPress uploads are runtime content.' },
  { pattern: /(^|\/)wp-content\/cache\//, reason: 'WordPress cache is generated runtime content.' },
  { pattern: /(^|\/)node_modules\//, reason: 'Dependencies are not canonical runtime code.' },
  { pattern: /(^|\/)vendor\//, reason: 'Vendor folders are not part of the governed baseline.' },
  { pattern: /\.bak($|-)/i, reason: 'Emergency backup artifact.' },
  { pattern: /backup/i, reason: 'Session/live backup artifact.' },
  { pattern: /\.env($|\.)/i, reason: 'Environment/secrets file.' }
]

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    liveManifest: null,
    repoRoot: DEFAULT_PUBLIC_SITE_RUNTIME_REPO_ROOT,
    write: false,
    help: false
  }

  for (let i = 0; i < normalizedArgv.length; i += 1) {
    const arg = normalizedArgv[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--live-manifest') {
      options.liveManifest = normalizedArgv[i + 1] ?? null
      i += 1
      continue
    }

    if (arg === '--repo-root') {
      options.repoRoot = normalizedArgv[i + 1] ?? options.repoRoot
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
  pnpm public-website:deploy-dry-run
  pnpm public-website:deploy-dry-run -- --write
  pnpm public-website:deploy-dry-run -- --live-manifest tmp/public-site-code-baselines/<timestamp>/manifest.json
  pnpm public-website:deploy-dry-run -- --repo-root /Users/jreye/Documents/efeonce-public-site-runtime`)
}

const ignoreReason = (path: string) => {
  return IGNORED_LIVE_PATTERNS.find(entry => entry.pattern.test(path))?.reason ?? null
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()

    return
  }

  const workspaceRoot = process.cwd()
  const repoRoot = resolve(options.repoRoot)
  const { binding } = readPublicSiteRuntimeBinding({ workspaceRoot })

  const liveManifestPath = resolve(
    workspaceRoot,
    options.liveManifest ?? findLatestPublicSiteLiveManifest({ workspaceRoot }) ?? ''
  )

  if (!liveManifestPath || !existsSync(liveManifestPath)) {
    throw new Error('No live manifest found. Run pnpm public-website:export-live-code first.')
  }

  if (!existsSync(repoRoot)) {
    throw new Error(`Runtime repo root not found: ${repoRoot}`)
  }

  const liveManifest = readPublicSiteLiveManifest(liveManifestPath)
  const repoFiles = listPublicSiteRepoFiles(repoRoot, { governedPaths: binding.governedPaths })

  const liveFiles = liveManifest.files.filter(file =>
    binding.governedPaths.some(governedPath => file.path === governedPath || file.path.startsWith(`${governedPath}/`))
  )

  const repoByPath = new Map(repoFiles.map(file => [file.path, file]))
  const liveByPath = new Map(liveFiles.map(file => [file.path, file]))
  const rows: DeployDryRunRow[] = []

  for (const repoFile of repoFiles) {
    const liveFile = liveByPath.get(repoFile.path)

    if (!liveFile) {
      rows.push({
        path: repoFile.path,
        action: 'would_create',
        repoSha256: repoFile.sha256,
        repoBytes: repoFile.bytes
      })
      continue
    }

    if (liveFile.sha256 !== repoFile.sha256) {
      rows.push({
        path: repoFile.path,
        action: 'would_update',
        liveSha256: liveFile.sha256,
        repoSha256: repoFile.sha256,
        liveBytes: liveFile.bytes,
        repoBytes: repoFile.bytes
      })
      continue
    }

    rows.push({
      path: repoFile.path,
      action: 'noop',
      liveSha256: liveFile.sha256,
      repoSha256: repoFile.sha256,
      liveBytes: liveFile.bytes,
      repoBytes: repoFile.bytes
    })
  }

  for (const liveFile of liveFiles) {
    if (repoByPath.has(liveFile.path)) continue

    const reason = ignoreReason(liveFile.path)

    rows.push({
      path: liveFile.path,
      action: reason ? 'ignored_live' : 'would_not_delete_live_only',
      liveSha256: liveFile.sha256,
      liveBytes: liveFile.bytes,
      reason: reason ?? 'Live-only governed file. Dry-run does not delete by default.'
    })
  }

  rows.sort((a, b) => {
    if (a.action !== b.action) return a.action.localeCompare(b.action)

    return a.path.localeCompare(b.path)
  })

  const counts = rows.reduce<Record<DeployDryRunAction, number>>(
    (acc, row) => {
      acc[row.action] += 1

      return acc
    },
    {
      ignored_live: 0,
      noop: 0,
      would_create: 0,
      would_not_delete_live_only: 0,
      would_update: 0
    }
  )

  const report = {
    contractVersion: 'public-site-runtime-deploy-dry-run.v1',
    generatedAt: new Date().toISOString(),
    mode: 'no_mutation',
    site: binding.site,
    repository: binding.repository,
    repoRoot,
    liveManifestPath,
    liveGeneratedAt: liveManifest.generatedAt,
    governedPaths: binding.governedPaths,
    deploymentBlockedBy: [
      'kinsta_api_token_missing_for_cache_clear',
      'kinsta_api_token_missing_for_backups',
      'production_deploy_apply_requires_explicit_release_task'
    ],
    safetyPolicy: {
      writesToKinsta: false,
      clearsCache: false,
      createsBackup: false,
      deletesLiveOnlyFiles: false
    },
    counts,
    rows
  }

  if (options.write) {
    const reportsRoot = resolve(workspaceRoot, REPORTS_ROOT)
    const outputPath = join(reportsRoot, `dry-run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)

    mkdirSync(reportsRoot, { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
    console.log(`Wrote Public Site deploy dry-run: ${outputPath}`)
  }

  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        site: report.site.url,
        repository: report.repository.url,
        counts,
        deploymentBlockedBy: report.deploymentBlockedBy
      },
      null,
      2
    )
  )

  if (counts.would_not_delete_live_only > 0) {
    process.exitCode = 2
  }
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:deploy-dry-run failed: ${message}`)
  process.exit(1)
}
