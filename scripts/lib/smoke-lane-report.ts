export type SmokeLaneSpecStatus = 'passed' | 'failed' | 'flaky' | 'skipped'

export interface PlaywrightTestResult {
  status?: string
  duration?: number
}

export interface PlaywrightTest {
  results?: PlaywrightTestResult[]
}

export interface PlaywrightSpec {
  title?: string
  file?: string
  tests?: PlaywrightTest[]
}

export interface PlaywrightSuite {
  title?: string
  file?: string
  specs?: PlaywrightSpec[]
  suites?: PlaywrightSuite[]
}

export interface PlaywrightReport {
  suites?: PlaywrightSuite[]
  stats?: { startTime?: string; duration?: number }
}

export interface FlattenedSmokeLaneSpec {
  title: string
  file: string
  status: SmokeLaneSpecStatus
  durationMs: number
}

export interface SmokeLaneReportTotals {
  total: number
  passed: number
  failed: number
  skipped: number
  flaky: number
}

const FAILED_RESULT_STATUSES = new Set(['failed', 'timedOut', 'interrupted'])

const sumDurationMs = (test: PlaywrightTest): number =>
  (test.results ?? []).reduce((total, result) => total + Math.max(0, Math.trunc(result.duration ?? 0)), 0)

const deriveTestStatus = (test: PlaywrightTest): SmokeLaneSpecStatus => {
  const results = test.results ?? []

  if (results.length === 0) return 'skipped'

  const finalStatus = results.at(-1)?.status
  const hadFailedAttempt = results.some(result => FAILED_RESULT_STATUSES.has(result.status ?? ''))

  if (finalStatus === 'passed') {
    return hadFailedAttempt ? 'flaky' : 'passed'
  }

  if (finalStatus === 'skipped') return 'skipped'
  if (FAILED_RESULT_STATUSES.has(finalStatus ?? '')) return 'failed'

  // Unknown Playwright statuses should be loud, not silently green.
  return 'failed'
}

export const deriveSpecStatus = (spec: PlaywrightSpec): SmokeLaneSpecStatus => {
  const testStatuses = (spec.tests ?? []).map(deriveTestStatus)

  if (testStatuses.length === 0) return 'skipped'
  if (testStatuses.some(status => status === 'failed')) return 'failed'
  if (testStatuses.some(status => status === 'flaky')) return 'flaky'
  if (testStatuses.some(status => status === 'passed')) return 'passed'

  return 'skipped'
}

const collectSpecs = (
  suite: PlaywrightSuite,
  contextFile: string | undefined,
  out: Array<{ spec: PlaywrightSpec; file: string }>
) => {
  const currentFile = suite.file ?? (suite.title?.endsWith('.spec.ts') ? suite.title : contextFile)

  for (const spec of suite.specs ?? []) {
    out.push({ spec, file: spec.file ?? currentFile ?? '' })
  }

  for (const child of suite.suites ?? []) {
    collectSpecs(child, currentFile, out)
  }
}

export const flattenPlaywrightReport = (report: PlaywrightReport): FlattenedSmokeLaneSpec[] => {
  const collected: Array<{ spec: PlaywrightSpec; file: string }> = []

  for (const suite of report.suites ?? []) {
    collectSpecs(suite, suite.file, collected)
  }

  return collected.map(({ spec, file }) => ({
    title: spec.title ?? '(untitled)',
    file,
    status: deriveSpecStatus(spec),
    durationMs: (spec.tests ?? []).reduce((total, test) => total + sumDurationMs(test), 0)
  }))
}

export const summarizeSmokeLaneSpecs = (specs: FlattenedSmokeLaneSpec[]): SmokeLaneReportTotals => ({
  total: specs.length,
  passed: specs.filter(spec => spec.status === 'passed').length,
  failed: specs.filter(spec => spec.status === 'failed').length,
  skipped: specs.filter(spec => spec.status === 'skipped').length,
  flaky: specs.filter(spec => spec.status === 'flaky').length
})
