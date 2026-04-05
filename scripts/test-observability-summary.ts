import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type Inventory = {
  generatedAt: string
  totalFiles: number
  byDomain: Record<string, number>
  byType: Record<string, number>
  byEnvironment: Record<string, number>
}

type VitestResults = {
  success: boolean
  numTotalTestSuites: number
  numPassedTestSuites: number
  numFailedTestSuites: number
  numPendingTestSuites: number
  numTotalTests: number
  numPassedTests: number
  numFailedTests: number
  numPendingTests: number
  numTodoTests: number
  startTime?: number
  testResults?: Array<{
    name?: string
    status?: string
    startTime?: number
    endTime?: number
  }>
}

type CoverageMetric = {
  total: number
  covered: number
  skipped: number
  pct: number
}

type CoverageSummary = {
  total?: {
    lines: CoverageMetric
    statements: CoverageMetric
    functions: CoverageMetric
    branches: CoverageMetric
  }
}

const repoRoot = process.cwd()
const testsDir = path.join(repoRoot, 'artifacts', 'tests')
const coverageDir = path.join(repoRoot, 'artifacts', 'coverage')
const summaryPath = path.join(testsDir, 'summary.md')

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T
  } catch {
    return null
  }
}

const readText = async (filePath: string): Promise<string | null> => {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

const formatDuration = (results: VitestResults | null) => {
  if (!results?.testResults?.length) return 'n/a'

  const durations = results.testResults
    .filter(test => typeof test.startTime === 'number' && typeof test.endTime === 'number')
    .map(test => (test.endTime as number) - (test.startTime as number))

  if (durations.length === 0) return 'n/a'

  const totalMs = durations.reduce((sum, value) => sum + value, 0)

  return `${(totalMs / 1000).toFixed(2)}s`
}

const getTopDomains = (inventory: Inventory | null) => {
  if (!inventory) return []

  return Object.entries(inventory.byDomain)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
}

const getWarnings = (logContents: string | null) => {
  if (!logContents) return []

  const lines = logContents
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(
      line =>
        line.startsWith('stderr |') ||
        line.startsWith('Not implemented:') ||
        line.includes('Each child in a list should have a unique "key" prop.')
    )

  return [...new Set(lines)].slice(0, 6)
}

const getSuiteCounts = (results: VitestResults | null) => {
  if (!results?.testResults?.length) {
    return {
      total: null,
      passed: null,
      failed: null,
      skipped: null
    }
  }

  const suites = new Map<string, string>()

  for (const testResult of results.testResults) {
    const suiteName = testResult.name ?? `suite-${suites.size}`
    const suiteStatus = testResult.status ?? 'unknown'

    suites.set(suiteName, suiteStatus)
  }

  const counts = {
    total: suites.size,
    passed: 0,
    failed: 0,
    skipped: 0
  }

  for (const suiteStatus of suites.values()) {
    if (suiteStatus === 'failed') {
      counts.failed += 1
      continue
    }

    if (suiteStatus === 'skipped' || suiteStatus === 'pending' || suiteStatus === 'todo') {
      counts.skipped += 1
      continue
    }

    counts.passed += 1
  }

  return counts
}

const main = async () => {
  await mkdir(testsDir, { recursive: true })

  const inventory = await readJson<Inventory>(path.join(testsDir, 'inventory.json'))
  const results = await readJson<VitestResults>(path.join(testsDir, 'results.json'))
  const coverage = await readJson<CoverageSummary>(path.join(coverageDir, 'coverage-summary.json'))
  const vitestLog = await readText(path.join(testsDir, 'vitest.log'))
  const warnings = getWarnings(vitestLog)
  const topDomains = getTopDomains(inventory)
  const suiteCounts = getSuiteCounts(results)

  const lines = [
    '# Test Observability Summary',
    '',
    `- Generated at: ${new Date().toISOString()}`,
    '',
    '## Inventory',
    `- Total test files: ${inventory?.totalFiles ?? 'n/a'}`,
    `- Types: ${
      inventory
        ? Object.entries(inventory.byType)
            .map(([type, count]) => `${type}=${count}`)
            .join(', ')
        : 'n/a'
    }`,
    `- Environments: ${
      inventory
        ? Object.entries(inventory.byEnvironment)
            .map(([environment, count]) => `${environment}=${count}`)
            .join(', ')
        : 'n/a'
    }`,
    `- Top domains: ${topDomains.length > 0 ? topDomains.map(([domain, count]) => `${domain}=${count}`).join(', ') : 'n/a'}`,
    '',
    '## Last Test Run',
    `- Success: ${results ? (results.success ? 'yes' : 'no') : 'n/a'}`,
    `- Test files: ${suiteCounts.total ?? 'n/a'} total / ${suiteCounts.passed ?? 'n/a'} passed / ${suiteCounts.failed ?? 'n/a'} failed / ${suiteCounts.skipped ?? 'n/a'} skipped`,
    `- Tests: ${results?.numTotalTests ?? 'n/a'} total / ${results?.numPassedTests ?? 'n/a'} passed / ${results?.numFailedTests ?? 'n/a'} failed / ${results?.numPendingTests ?? 'n/a'} skipped / ${results?.numTodoTests ?? 'n/a'} todo`,
    `- Approx duration: ${formatDuration(results)}`,
    '',
    '## Coverage',
    `- Lines: ${coverage?.total?.lines?.pct ?? 'n/a'}%`,
    `- Statements: ${coverage?.total?.statements?.pct ?? 'n/a'}%`,
    `- Functions: ${coverage?.total?.functions?.pct ?? 'n/a'}%`,
    `- Branches: ${coverage?.total?.branches?.pct ?? 'n/a'}%`,
    '',
    '## Artifacts',
    '- `artifacts/tests/inventory.json`',
    '- `artifacts/tests/inventory.md`',
    '- `artifacts/tests/results.json`',
    '- `artifacts/tests/vitest.log`',
    '- `artifacts/tests/summary.md`',
    '- `artifacts/coverage/coverage-summary.json`',
    '- `artifacts/coverage/index.html`',
    ''
  ]

  if (warnings.length > 0) {
    lines.push('## Notable Warnings', ...warnings.map(warning => `- ${warning}`), '')
  }

  const summary = `${lines.join('\n')}\n`

  await writeFile(summaryPath, summary)

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`)
  }

  process.stdout.write(summary)
}

main().catch(error => {
  console.error('[test-observability-summary] failed to generate summary', error)
  process.exitCode = 1
})
