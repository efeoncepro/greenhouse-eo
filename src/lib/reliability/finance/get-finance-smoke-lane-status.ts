import 'server-only'

import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'

import type {
  FinanceSmokeLaneAvailability,
  FinanceSmokeLaneStatus,
  FinanceSmokeLaneSuite,
  FinanceSmokeLaneSuiteStatus,
  FinanceSmokeLaneTotals
} from '@/types/finance-smoke-lane'

/**
 * TASK-599 — Reader del último resultado del smoke lane Finance.
 *
 * Lee `artifacts/playwright/results.json` (Playwright JSON reporter, configurado
 * en `playwright.config.ts:62-67`) y filtra los specs cuyo path matchea
 * `tests/e2e/smoke/finance-*.spec.ts`.
 *
 * Estrategia de degradación honesta:
 *  - Si el archivo no existe → `availability='awaiting_data'`. Esto sucede
 *    en runtime de Vercel/portal donde el archivo no se distribuye con el
 *    deploy. El reader queda preparado para que un futuro publisher (CI →
 *    DB) escriba en `source_sync_runs` y este reader cambie a leer de PG.
 *  - Si parse falla → `availability='error'` con mensaje.
 *  - Si parse OK pero ninguna spec finance matchea → `awaiting_data` con nota.
 */

const REPORT_RELATIVE_PATH = 'artifacts/playwright/results.json'
const FINANCE_SPEC_PATTERN = /tests\/e2e\/smoke\/finance-[^/]+\.spec\.ts$/

interface PlaywrightTestResult {
  status?: string
  duration?: number
  error?: { message?: string } | null
  errors?: Array<{ message?: string }>
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
  file?: string
  specs?: PlaywrightSpec[]
  suites?: PlaywrightSuite[]
}

interface PlaywrightReport {
  suites?: PlaywrightSuite[]
  stats?: { startTime?: string; duration?: number }
}

const buildEmpty = (
  availability: FinanceSmokeLaneAvailability,
  notes: string[],
  options: { error?: string | null; reportPath?: string | null } = {}
): FinanceSmokeLaneStatus => ({
  availability,
  generatedAt: new Date().toISOString(),
  reportPath: options.reportPath ?? null,
  reportFinishedAt: null,
  totals: { total: 0, passed: 0, failed: 0, skipped: 0 },
  suites: [],
  notes,
  error: options.error ?? null
})

const mapStatus = (raw: string | undefined): FinanceSmokeLaneSuiteStatus => {
  if (raw === 'passed') return 'passed'
  if (raw === 'skipped') return 'skipped'
  if (raw === 'failed' || raw === 'timedOut' || raw === 'interrupted') return 'failed'

  return 'unknown'
}

const collectSpecs = (suite: PlaywrightSuite, contextFile: string | undefined): Array<{ spec: PlaywrightSpec; file: string }> => {
  const file = suite.file ?? contextFile
  const collected: Array<{ spec: PlaywrightSpec; file: string }> = []

  for (const spec of suite.specs ?? []) {
    collected.push({ spec, file: spec.file ?? file ?? '' })
  }

  for (const nested of suite.suites ?? []) {
    collected.push(...collectSpecs(nested, file))
  }

  return collected
}

const summarizeSuite = (
  spec: PlaywrightSpec,
  file: string
): FinanceSmokeLaneSuite => {
  const result = (spec.tests ?? []).flatMap(test => test.results ?? []).at(-1)
  const status = mapStatus(result?.status)
  const duration = typeof result?.duration === 'number' ? Math.round(result.duration) : 0

  const errorMessage = result?.error?.message
    ? result.error.message.slice(0, 240)
    : (result?.errors?.[0]?.message?.slice(0, 240) ?? null)

  return {
    spec: file,
    title: spec.title ?? '<untitled>',
    status,
    durationMs: duration,
    errorMessage: status === 'failed' ? errorMessage : null
  }
}

const aggregateTotals = (suites: FinanceSmokeLaneSuite[]): FinanceSmokeLaneTotals => {
  const totals: FinanceSmokeLaneTotals = { total: suites.length, passed: 0, failed: 0, skipped: 0 }

  for (const suite of suites) {
    if (suite.status === 'passed') totals.passed += 1
    else if (suite.status === 'failed') totals.failed += 1
    else if (suite.status === 'skipped') totals.skipped += 1
  }

  return totals
}

export const parseFinanceSmokeLaneReport = (
  report: PlaywrightReport,
  reportPath: string | null
): FinanceSmokeLaneStatus => {
  const allSpecs = (report.suites ?? []).flatMap(suite => collectSpecs(suite, suite.file))
  const financeSpecs = allSpecs.filter(({ file }) => FINANCE_SPEC_PATTERN.test(file))

  if (financeSpecs.length === 0) {
    return buildEmpty(
      'awaiting_data',
      ['El reporte Playwright no incluye ningún spec de tests/e2e/smoke/finance-*.spec.ts.'],
      { reportPath }
    )
  }

  const suites = financeSpecs
    .map(({ spec, file }) => summarizeSuite(spec, file))
    .sort((a, b) => a.spec.localeCompare(b.spec))

  const totals = aggregateTotals(suites)

  const reportFinishedAt = report.stats?.startTime && typeof report.stats?.duration === 'number'
    ? new Date(Date.parse(report.stats.startTime) + report.stats.duration).toISOString()
    : null

  return {
    availability: 'configured',
    generatedAt: new Date().toISOString(),
    reportPath,
    reportFinishedAt,
    totals,
    suites,
    notes:
      totals.failed === 0
        ? [`${totals.passed} de ${totals.total} specs Finance pasaron.`]
        : [`${totals.failed} spec${totals.failed === 1 ? '' : 's'} Finance en falla — revisar última corrida en GitHub Actions.`],
    error: null
  }
}

/**
 * Read the latest Finance smoke lane status from the canonical
 * `greenhouse_sync.smoke_lane_runs` table (CI uploads here after every
 * Playwright run via `pnpm sync:smoke-lane <lane-key>`).
 *
 * Falls back to the legacy filesystem reader for local dev workflows where
 * the developer wants to inspect their last `pnpm test:e2e` run without
 * pushing a commit. The PG path is the canonical source of truth in any
 * deployed runtime (Vercel, Cloud Run, etc.) where the artifacts directory
 * doesn't ship.
 */

const FINANCE_LANE_KEY = 'finance.web'

interface SmokeLaneRunRow extends Record<string, unknown> {
  smoke_lane_run_id: string
  lane_key: string
  commit_sha: string
  branch: string | null
  workflow_run_url: string | null
  status: string
  started_at: Date | string
  finished_at: Date | string | null
  duration_ms: number | null
  total_tests: number
  passed_tests: number
  failed_tests: number
  skipped_tests: number
  summary_json: unknown
}

const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value || null

  return null
}

const readLatestPgRun = async (): Promise<SmokeLaneRunRow | null> => {
  try {
    const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

    const rows = await runGreenhousePostgresQuery<SmokeLaneRunRow>(
      `SELECT * FROM greenhouse_sync.smoke_lane_runs
        WHERE lane_key = $1
        ORDER BY started_at DESC
        LIMIT 1`,
      [FINANCE_LANE_KEY]
    )

    return rows[0] ?? null
  } catch {
    return null
  }
}

const buildFromPgRun = (row: SmokeLaneRunRow): FinanceSmokeLaneStatus => {
  const totals: FinanceSmokeLaneTotals = {
    total: row.total_tests,
    passed: row.passed_tests,
    failed: row.failed_tests,
    skipped: row.skipped_tests
  }

  const summary = (row.summary_json && typeof row.summary_json === 'object')
    ? (row.summary_json as Record<string, unknown>)
    : {}

  const suites: FinanceSmokeLaneSuite[] = Array.isArray(summary.suites)
    ? (summary.suites as FinanceSmokeLaneSuite[])
    : []

  const availability: FinanceSmokeLaneAvailability =
    row.status === 'passed' || row.status === 'flaky'
      ? 'configured'
      : row.status === 'cancelled'
        ? 'awaiting_data'
        : 'error'

  return {
    availability,
    generatedAt: new Date().toISOString(),
    reportPath: `pg://greenhouse_sync.smoke_lane_runs/${row.smoke_lane_run_id}`,
    reportFinishedAt: toIsoString(row.finished_at) ?? toIsoString(row.started_at),
    totals,
    suites,
    notes:
      totals.failed === 0
        ? [`${totals.passed} de ${totals.total} specs Finance pasaron (commit ${row.commit_sha.slice(0, 7)}${row.branch ? `, ${row.branch}` : ''}).`]
        : [`${totals.failed} spec${totals.failed === 1 ? '' : 's'} Finance en falla en commit ${row.commit_sha.slice(0, 7)} — revisar workflow run.`],
    error: row.status === 'errored' ? 'CI workflow errored before tests started.' : null
  }
}

export const getFinanceSmokeLaneStatus = async (): Promise<FinanceSmokeLaneStatus> => {
  // 1) Canonical: latest run from PG (CI publishes here).
  const pgRun = await readLatestPgRun()

  if (pgRun) {
    return buildFromPgRun(pgRun)
  }

  // 2) Legacy fallback: local Playwright run on disk (developer dev loop).
  const reportPath = resolve(process.cwd(), REPORT_RELATIVE_PATH)

  let raw: string

  try {
    raw = await fs.readFile(reportPath, 'utf8')
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    if (code === 'ENOENT') {
      return buildEmpty(
        'awaiting_data',
        [
          'Sin runs de smoke lane registrados en `greenhouse_sync.smoke_lane_runs`.',
          'CI debe llamar `pnpm sync:smoke-lane finance.web` después de cada Playwright run para poblar esta tabla.'
        ],
        { reportPath }
      )
    }

    return buildEmpty(
      'error',
      ['Error leyendo reporte Playwright (fallback local).'],
      { reportPath, error: (error as Error).message }
    )
  }

  let report: PlaywrightReport

  try {
    report = JSON.parse(raw) as PlaywrightReport
  } catch (error) {
    return buildEmpty(
      'error',
      ['Reporte Playwright no es JSON válido.'],
      { reportPath, error: (error as Error).message }
    )
  }

  return parseFinanceSmokeLaneReport(report, reportPath)
}
