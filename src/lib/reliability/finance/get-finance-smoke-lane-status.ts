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

export const getFinanceSmokeLaneStatus = async (): Promise<FinanceSmokeLaneStatus> => {
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
          'No hay reporte Playwright local todavía. El smoke lane Finance corre en CI (GitHub Actions).',
          'Cuando el job Playwright suba `artifacts/playwright/results.json`, este reader rinde la última corrida.'
        ],
        { reportPath }
      )
    }

    return buildEmpty(
      'error',
      ['Error leyendo reporte Playwright.'],
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
