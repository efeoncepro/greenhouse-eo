#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const DEFAULT_RATE_USD = 0.006
const DEFAULT_LIMIT_RUNS = 200
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const usage = () => `Usage:
  pnpm actions:cost:audit [--repo owner/name] [--from YYYY-MM-DD] [--to YYYY-MM-DD]
                          [--limit-runs N] [--rate-usd N] [--workflow NAME]
                          [--format table|json] [--no-jobs]

Examples:
  pnpm actions:cost:audit --from 2026-05-01 --to 2026-05-24
  pnpm actions:cost:audit --repo efeoncepro/greenhouse-eo --format json --limit-runs 500
`

const todayUtcDate = () => new Date().toISOString().slice(0, 10)

const firstDayOfCurrentUtcMonth = () => {
  const now = new Date()

  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
}

const parsePositiveNumber = (value, name) => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number.`)
  }

  return parsed
}

const parsePositiveInteger = (value, name) => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`)
  }

  return parsed
}

export const parseArgs = argv => {
  const options = {
    repo: null,
    from: firstDayOfCurrentUtcMonth(),
    to: todayUtcDate(),
    limitRuns: DEFAULT_LIMIT_RUNS,
    rateUsd: DEFAULT_RATE_USD,
    workflow: null,
    format: 'table',
    includeJobs: true
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if (arg === '--help' || arg === '-h') {
      return { ...options, help: true }
    }

    if (arg === '--repo') {
      options.repo = next
      index += 1
      continue
    }

    if (arg.startsWith('--repo=')) {
      options.repo = arg.slice('--repo='.length)
      continue
    }

    if (arg === '--from') {
      options.from = next
      index += 1
      continue
    }

    if (arg.startsWith('--from=')) {
      options.from = arg.slice('--from='.length)
      continue
    }

    if (arg === '--to') {
      options.to = next
      index += 1
      continue
    }

    if (arg.startsWith('--to=')) {
      options.to = arg.slice('--to='.length)
      continue
    }

    if (arg === '--limit-runs') {
      options.limitRuns = parsePositiveInteger(next, '--limit-runs')
      index += 1
      continue
    }

    if (arg.startsWith('--limit-runs=')) {
      options.limitRuns = parsePositiveInteger(arg.slice('--limit-runs='.length), '--limit-runs')
      continue
    }

    if (arg === '--rate-usd') {
      options.rateUsd = parsePositiveNumber(next, '--rate-usd')
      index += 1
      continue
    }

    if (arg.startsWith('--rate-usd=')) {
      options.rateUsd = parsePositiveNumber(arg.slice('--rate-usd='.length), '--rate-usd')
      continue
    }

    if (arg === '--workflow') {
      options.workflow = next
      index += 1
      continue
    }

    if (arg.startsWith('--workflow=')) {
      options.workflow = arg.slice('--workflow='.length)
      continue
    }

    if (arg === '--format') {
      options.format = next
      index += 1
      continue
    }

    if (arg.startsWith('--format=')) {
      options.format = arg.slice('--format='.length)
      continue
    }

    if (arg === '--no-jobs') {
      options.includeJobs = false
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  if (!options.repo && process.env.GITHUB_REPOSITORY) {
    options.repo = process.env.GITHUB_REPOSITORY
  }

  if (!ISO_DATE_RE.test(options.from)) throw new Error('--from must use YYYY-MM-DD.')
  if (!ISO_DATE_RE.test(options.to)) throw new Error('--to must use YYYY-MM-DD.')
  if (options.from > options.to) throw new Error('--from must be before or equal to --to.')
  if (!['table', 'json'].includes(options.format)) throw new Error('--format must be table or json.')
  if (options.repo && !/^[^/\s]+\/[^/\s]+$/.test(options.repo)) throw new Error('--repo must be owner/name.')

  return options
}

const ghApiJson = (path, fields = []) => {
  const args = ['api', '-X', 'GET', path]

  for (const [key, value] of fields) {
    args.push('-F', `${key}=${value}`)
  }

  const output = execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim()

  if (!output) return null

  return JSON.parse(output)
}

const detectRepo = () => {
  const output = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim()

  if (!/^[^/\s]+\/[^/\s]+$/.test(output)) {
    throw new Error('Could not detect GitHub repository. Pass --repo owner/name.')
  }

  return output
}

const diffMinutes = (start, end) => {
  const startMs = Date.parse(start ?? '')
  const endMs = Date.parse(end ?? '')

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0

  return (endMs - startMs) / 60000
}

const round = (value, digits = 2) => {
  const multiplier = 10 ** digits

  return Math.round(value * multiplier) / multiplier
}

const addAggregate = (map, key, patch) => {
  const current = map.get(key) ?? {
    name: key,
    runs: 0,
    jobs: 0,
    minutes: 0,
    estimatedGrossUsd: 0,
    maxDurationMinutes: 0
  }

  current.runs += patch.runs ?? 0
  current.jobs += patch.jobs ?? 0
  current.minutes += patch.minutes ?? 0
  current.estimatedGrossUsd += patch.estimatedGrossUsd ?? 0
  current.maxDurationMinutes = Math.max(current.maxDurationMinutes, patch.maxDurationMinutes ?? 0)

  map.set(key, current)
}

export const summarizeActionsCost = ({ runs, jobsByRunId = new Map(), rateUsd = DEFAULT_RATE_USD }) => {
  const byWorkflow = new Map()
  const byJob = new Map()
  let totalRuns = 0
  let totalJobs = 0
  let totalMinutes = 0

  for (const run of runs) {
    const runId = String(run.id ?? run.databaseId ?? '')
    const workflowName = run.name ?? run.workflowName ?? '<unknown workflow>'
    const jobs = jobsByRunId.get(runId) ?? []
    const fallbackRunMinutes = diffMinutes(run.run_started_at ?? run.runStartedAt ?? run.created_at, run.updated_at)

    totalRuns += 1

    if (jobs.length === 0) {
      totalMinutes += fallbackRunMinutes
      addAggregate(byWorkflow, workflowName, {
        runs: 1,
        minutes: fallbackRunMinutes,
        estimatedGrossUsd: fallbackRunMinutes * rateUsd,
        maxDurationMinutes: fallbackRunMinutes
      })
      continue
    }

    let runJobMinutes = 0

    for (const job of jobs) {
      const jobName = job.name ?? '<unknown job>'
      const jobMinutes = diffMinutes(job.started_at, job.completed_at)

      totalJobs += 1
      runJobMinutes += jobMinutes
      totalMinutes += jobMinutes

      addAggregate(byJob, `${workflowName} / ${jobName}`, {
        jobs: 1,
        minutes: jobMinutes,
        estimatedGrossUsd: jobMinutes * rateUsd,
        maxDurationMinutes: jobMinutes
      })
    }

    addAggregate(byWorkflow, workflowName, {
      runs: 1,
      jobs: jobs.length,
      minutes: runJobMinutes,
      estimatedGrossUsd: runJobMinutes * rateUsd,
      maxDurationMinutes: runJobMinutes
    })
  }

  const normalize = item => ({
    ...item,
    minutes: round(item.minutes, 2),
    estimatedGrossUsd: round(item.estimatedGrossUsd, 2),
    maxDurationMinutes: round(item.maxDurationMinutes, 2)
  })

  return {
    totals: {
      runs: totalRuns,
      jobs: totalJobs,
      minutes: round(totalMinutes, 2),
      estimatedGrossUsd: round(totalMinutes * rateUsd, 2)
    },
    byWorkflow: [...byWorkflow.values()].map(normalize).sort((a, b) => b.minutes - a.minutes),
    byJob: [...byJob.values()].map(normalize).sort((a, b) => b.minutes - a.minutes)
  }
}

const fetchRuns = ({ repo, from, to, limitRuns, workflow }) => {
  const runs = []
  let page = 1

  while (runs.length < limitRuns) {
    const payload = ghApiJson(`repos/${repo}/actions/runs`, [
      ['per_page', String(Math.min(100, limitRuns - runs.length))],
      ['page', String(page)],
      ['created', `${from}..${to}`]
    ])

    const pageRuns = payload?.workflow_runs ?? []

    if (pageRuns.length === 0) break

    for (const run of pageRuns) {
      if (!workflow || run.name === workflow) runs.push(run)
      if (runs.length >= limitRuns) break
    }

    if (pageRuns.length < 100) break
    page += 1
  }

  return runs
}

const fetchJobsByRunId = (repo, runs) => {
  const jobsByRunId = new Map()

  for (const run of runs) {
    const runId = String(run.id)
    const payload = ghApiJson(`repos/${repo}/actions/runs/${runId}/jobs`, [['per_page', '100']])
    const jobs = payload?.jobs ?? []

    jobsByRunId.set(runId, jobs)
  }

  return jobsByRunId
}

const printTable = report => {
  const header = `GitHub Actions cost audit (${report.repo}, ${report.period.from}..${report.period.to})`

  const notes = [
    'estimatedGrossUsd is job/runtime attribution, not the official invoice.',
    'Official billing remains GitHub Billing Usage / cloud.billing.github.'
  ]

  console.log(header)
  console.log('='.repeat(header.length))
  console.log(
    `Runs: ${report.totals.runs} | Jobs: ${report.totals.jobs} | Minutes: ${report.totals.minutes} | Est. gross: USD ${report.totals.estimatedGrossUsd}`
  )
  console.log(`Rate: USD ${report.rateUsd}/min`)
  console.log('')
  console.log('Top workflows')
  console.table(report.byWorkflow.slice(0, 12))

  if (report.byJob.length > 0) {
    console.log('Top jobs')
    console.table(report.byJob.slice(0, 20))
  }

  console.log('Notes')
  for (const note of notes) console.log(`- ${note}`)
}

export const buildReport = ({ options, runs, jobsByRunId }) => {
  const summary = summarizeActionsCost({ runs, jobsByRunId, rateUsd: options.rateUsd })

  return {
    generatedAt: new Date().toISOString(),
    repo: options.repo,
    period: { from: options.from, to: options.to },
    source: {
      runsEndpoint: 'repos/{owner}/{repo}/actions/runs',
      jobsEndpoint: 'repos/{owner}/{repo}/actions/runs/{run_id}/jobs',
      billingSourceOfTruth: 'src/lib/cloud/github-billing.ts:getGitHubBillingOverview'
    },
    rateUsd: options.rateUsd,
    limitRuns: options.limitRuns,
    workflowFilter: options.workflow,
    includeJobs: options.includeJobs,
    limitations: [
      'Estimation uses run/job timestamps from GitHub Actions API and configured per-minute rate.',
      'It does not account for included minutes, discounts, billing adjustments, storage, cache, or future pricing changes.',
      'GitHub Billing Usage remains the official source for gross/net invoice amounts.'
    ],
    ...summary
  }
}

const main = () => {
  try {
    const options = parseArgs(process.argv.slice(2))

    if (options.help) {
      console.log(usage())
      
return
    }

    options.repo = options.repo ?? detectRepo()

    const runs = fetchRuns(options)
    const jobsByRunId = options.includeJobs ? fetchJobsByRunId(options.repo, runs) : new Map()
    const report = buildReport({ options, runs, jobsByRunId })

    if (options.format === 'json') {
      console.log(JSON.stringify(report, null, 2))
    } else {
      printTable(report)
    }
  } catch (error) {
    console.error(`[actions-cost-audit] ${(error && error.message) || error}`)
    console.error('')
    console.error(usage())
    process.exitCode = 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
