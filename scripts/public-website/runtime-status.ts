#!/usr/bin/env tsx
/**
 * TASK-1122 — Report the Greenhouse binding status for the public WordPress runtime.
 *
 * This command is read-only. It does not call Kinsta, WordPress, GitHub APIs or
 * mutate the runtime repo.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import {
  DEFAULT_PUBLIC_SITE_RUNTIME_REPO_ROOT,
  readLatestPublicSiteDriftReport,
  readPublicSiteRuntimeBinding
} from '../../src/lib/public-site/runtime-binding'
import { inspectKinstaSshReadiness } from './kinsta-ssh-config'
import { loadPublicWebsiteEnvFiles } from './local-env'

const loadedEnvFiles = loadPublicWebsiteEnvFiles()

type CliOptions = {
  repoRoot: string
  write: boolean
  help: boolean
}

const REPORTS_ROOT = 'docs/operations/public-site-runtime-status'

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
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
  pnpm public-website:runtime-status
  pnpm public-website:runtime-status -- --write
  pnpm public-website:runtime-status -- --repo-root /Users/jreye/Documents/efeonce-public-site-runtime`)
}

const git = (repoRoot: string, args: string[]) => {
  try {
    return execFileSync('git', ['-C', repoRoot, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
  } catch {
    return null
  }
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()

    return
  }

  const workspaceRoot = process.cwd()
  const repoRoot = resolve(options.repoRoot)
  const { binding, bindingPath } = readPublicSiteRuntimeBinding({ workspaceRoot })
  const latestDrift = readLatestPublicSiteDriftReport({ workspaceRoot })

  const repoBranch = existsSync(repoRoot) ? git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']) : null
  const repoHead = existsSync(repoRoot) ? git(repoRoot, ['rev-parse', '--short', 'HEAD']) : null
  const repoStatusShort = existsSync(repoRoot) ? git(repoRoot, ['status', '--short']) : null
  const sshReadiness = inspectKinstaSshReadiness()
  const kinstaApiConfigured = Boolean(process.env.PUBLIC_WEBSITE_KINSTA_API_TOKEN_SECRET_REF?.trim())

  const blockedCapabilities = [
    ...(!kinstaApiConfigured
      ? [
          {
            capability: 'kinsta_cache_clear_via_api',
            lane: 'kinsta_api',
            status: 'blocked',
            reason: 'Kinsta API token is not configured. This does not block SSH/WP-CLI cache purge.'
          },
          {
            capability: 'kinsta_backup_create_via_api',
            lane: 'kinsta_api',
            status: 'blocked',
            reason: 'Kinsta API token is not configured. This does not describe SSH/WP-CLI readiness.'
          }
        ]
      : []),
    {
      capability: 'production_deploy_apply',
      lane: 'release',
      status: 'blocked',
      reason: 'Only no-mutation dry-run is allowed until Kinsta deploy/cache/backup controls are verified.'
    }
  ]

  const report = {
    contractVersion: 'public-site-runtime-status.v2',
    generatedAt: new Date().toISOString(),
    bindingPath,
    site: binding.site,
    repository: binding.repository,
    governedPaths: binding.governedPaths,
    runtimeRepo: {
      repoRoot,
      exists: existsSync(repoRoot),
      branch: repoBranch,
      head: repoHead,
      isClean: repoStatusShort === '',
      statusShort: repoStatusShort
    },
    latestDrift: latestDrift
      ? {
          reportPath: latestDrift.reportPath,
          generatedAt: latestDrift.report.generatedAt,
          liveGeneratedAt: latestDrift.report.liveGeneratedAt,
          counts: latestDrift.report.counts,
          classificationCounts: latestDrift.report.classificationCounts ?? null,
          releaseSafety: latestDrift.report.releaseSafety ?? null
        }
      : null,
    accessLanes: {
      sshWpCli: {
        status: sshReadiness.ready ? 'configured_not_verified' : 'not_configured',
        configured: Boolean(sshReadiness.config),
        keyExists: sshReadiness.keyExists,
        missing: sshReadiness.missing,
        invalid: sshReadiness.invalid,
        verificationCommand: 'pnpm public-website:ssh-check',
        kinstaApiTokenRequired: false
      },
      kinstaApi: {
        status: kinstaApiConfigured ? 'configured_not_verified' : 'not_configured',
        configured: kinstaApiConfigured,
        sshRequired: false
      }
    },
    loadedEnvFiles,
    blockedCapabilities,
    pending: binding.pending
  }

  if (options.write) {
    const reportsRoot = resolve(workspaceRoot, REPORTS_ROOT)
    const outputPath = join(reportsRoot, `status-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)

    mkdirSync(reportsRoot, { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
    console.log(`Wrote Public Site runtime status: ${outputPath}`)
  }

  console.log(
    JSON.stringify(
      {
        site: report.site.url,
        repository: report.repository.url,
        runtimeRepo: report.runtimeRepo,
        latestDrift: report.latestDrift,
        accessLanes: report.accessLanes,
        blockedCapabilities: report.blockedCapabilities.map(item => item.capability)
      },
      null,
      2
    )
  )

  if (!report.runtimeRepo.exists) {
    process.exitCode = 2
  }
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:runtime-status failed: ${message}`)
  process.exit(1)
}
