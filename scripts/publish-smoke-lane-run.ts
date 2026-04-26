#!/usr/bin/env node
/**
 * Publish a smoke lane run to `greenhouse_sync.smoke_lane_runs`.
 *
 * Designed to be invoked from CI (GitHub Actions, Cloud Build, etc.) right
 * after a Playwright/Vitest smoke lane finishes, so the reliability dashboard
 * has a fresh PG-backed signal regardless of the runtime that serves the read.
 *
 * Usage:
 *   pnpm sync:smoke-lane <lane-key> [--report=<path>] [--commit=<sha>]
 *
 * Env (auto-resolved from GitHub Actions when present):
 *   GITHUB_SHA, GITHUB_REF_NAME, GITHUB_RUN_ID, GITHUB_REPOSITORY
 *
 * Examples:
 *   pnpm sync:smoke-lane finance.web
 *   pnpm sync:smoke-lane delivery.web --report=artifacts/playwright/results.json
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { randomUUID } from 'node:crypto'

import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

interface CliArgs {
  laneKey: string
  reportPath: string
  commitSha: string
  branch: string | null
  workflowRunUrl: string | null
}

interface PlaywrightTestResult {
  status?: string
  duration?: number
}

interface PlaywrightTest {
  results?: PlaywrightTestResult[]
}

interface PlaywrightSpec {
  title?: string
  file?: string
  tests?: PlaywrightTest[]
}

interface PlaywrightSuite {
  title?: string
  specs?: PlaywrightSpec[]
  suites?: PlaywrightSuite[]
}

interface PlaywrightReport {
  suites?: PlaywrightSuite[]
  stats?: { startTime?: string; duration?: number }
}

const parseArgs = (): CliArgs => {
  const positional: string[] = []
  const flags: Record<string, string> = {}

  for (const raw of process.argv.slice(2)) {
    if (raw.startsWith('--')) {
      const eq = raw.indexOf('=')

      if (eq === -1) {
        flags[raw.slice(2)] = 'true'
      } else {
        flags[raw.slice(2, eq)] = raw.slice(eq + 1)
      }
    } else {
      positional.push(raw)
    }
  }

  const laneKey = positional[0]

  if (!laneKey) {
    console.error('ERROR: lane-key positional argument is required (e.g. `finance.web`).')
    process.exit(2)
  }

  const repo = process.env.GITHUB_REPOSITORY ?? ''
  const runId = process.env.GITHUB_RUN_ID ?? ''

  const workflowRunUrl =
    flags.workflowRunUrl ||
    (repo && runId ? `https://github.com/${repo}/actions/runs/${runId}` : null)

  return {
    laneKey,
    reportPath: flags.report ?? 'artifacts/playwright/results.json',
    commitSha: flags.commit ?? process.env.GITHUB_SHA ?? 'unknown',
    branch: flags.branch ?? process.env.GITHUB_REF_NAME ?? null,
    workflowRunUrl
  }
}

interface FlattenedSpec {
  title: string
  file: string
  status: 'passed' | 'failed' | 'flaky' | 'skipped'
  durationMs: number
}

const collectSpecs = (suite: PlaywrightSuite, file: string | undefined, out: FlattenedSpec[]) => {
  const currentFile = suite.title?.endsWith('.spec.ts') ? suite.title : file ?? ''

  for (const spec of suite.specs ?? []) {
    const test = spec.tests?.[0]
    const result = test?.results?.[0]
    const rawStatus = result?.status ?? 'skipped'

    let status: FlattenedSpec['status'] = 'skipped'

    if (rawStatus === 'passed') status = 'passed'
    else if (rawStatus === 'failed' || rawStatus === 'timedOut' || rawStatus === 'interrupted') status = 'failed'
    else if (rawStatus === 'flaky') status = 'flaky'

    out.push({
      title: spec.title ?? '(untitled)',
      file: spec.file ?? currentFile,
      status,
      durationMs: Math.max(0, Math.trunc(result?.duration ?? 0))
    })
  }

  for (const child of suite.suites ?? []) {
    collectSpecs(child, currentFile, out)
  }
}

const main = async () => {
  const args = parseArgs()
  const reportFullPath = resolve(process.cwd(), args.reportPath)

  let raw: string

  try {
    raw = await readFile(reportFullPath, 'utf8')
  } catch (error) {
    console.error(`ERROR: cannot read report at ${reportFullPath}: ${(error as Error).message}`)
    process.exit(1)
  }

  let report: PlaywrightReport

  try {
    report = JSON.parse(raw) as PlaywrightReport
  } catch (error) {
    console.error(`ERROR: report is not valid JSON: ${(error as Error).message}`)
    process.exit(1)
  }

  const flattened: FlattenedSpec[] = []

  for (const suite of report.suites ?? []) {
    collectSpecs(suite, undefined, flattened)
  }

  const totals = {
    total: flattened.length,
    passed: flattened.filter(s => s.status === 'passed').length,
    failed: flattened.filter(s => s.status === 'failed').length,
    skipped: flattened.filter(s => s.status === 'skipped').length,
    flaky: flattened.filter(s => s.status === 'flaky').length
  }

  const status: 'passed' | 'failed' | 'flaky' =
    totals.failed > 0 ? 'failed' : totals.flaky > 0 ? 'flaky' : 'passed'

  const startedAt = report.stats?.startTime ?? new Date().toISOString()

  const finishedAt = new Date(
    new Date(startedAt).getTime() + Math.max(0, Math.trunc(report.stats?.duration ?? 0))
  ).toISOString()

  const summaryJson = {
    suites: flattened.map(s => ({
      title: s.title,
      file: s.file,
      status: s.status,
      durationMs: s.durationMs
    })),
    failedSpecs: flattened.filter(s => s.status === 'failed').map(s => ({ title: s.title, file: s.file })),
    flakyCount: totals.flaky
  }

  const runId = `smoke-${args.laneKey}-${args.commitSha.slice(0, 8)}-${randomUUID().slice(0, 6)}`

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.smoke_lane_runs (
       smoke_lane_run_id, lane_key, commit_sha, branch, workflow_run_url,
       status, started_at, finished_at, duration_ms,
       total_tests, passed_tests, failed_tests, skipped_tests, summary_json
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9,
             $10, $11, $12, $13, $14::jsonb)`,
    [
      runId,
      args.laneKey,
      args.commitSha,
      args.branch,
      args.workflowRunUrl,
      status,
      startedAt,
      finishedAt,
      Math.max(0, Math.trunc(report.stats?.duration ?? 0)),
      totals.total,
      totals.passed,
      totals.failed,
      totals.skipped,
      JSON.stringify(summaryJson)
    ]
  )

  console.log(
    `[smoke-lane-publish] lane=${args.laneKey} status=${status} ` +
    `total=${totals.total} passed=${totals.passed} failed=${totals.failed} skipped=${totals.skipped} ` +
    `commit=${args.commitSha.slice(0, 7)} runId=${runId}`
  )

  await closeGreenhousePostgres()
}

main().catch(async error => {
  console.error('[smoke-lane-publish] failed:', error)
  await closeGreenhousePostgres().catch(() => {})
  process.exit(1)
})
