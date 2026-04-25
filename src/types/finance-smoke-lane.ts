/**
 * TASK-599 — Finance Preventive Test Lane status contract.
 *
 * Lectura del último resultado del smoke lane Finance (Playwright JSON
 * reporter). Consumido por `buildFinanceSmokeLaneSignals` para emitir
 * señales `kind=test_lane` en el Reliability Control Plane.
 */

export type FinanceSmokeLaneAvailability = 'configured' | 'awaiting_data' | 'error'

export type FinanceSmokeLaneSuiteStatus = 'passed' | 'failed' | 'skipped' | 'unknown'

export interface FinanceSmokeLaneSuite {
  spec: string
  title: string
  status: FinanceSmokeLaneSuiteStatus
  durationMs: number
  errorMessage: string | null
}

export interface FinanceSmokeLaneTotals {
  total: number
  passed: number
  failed: number
  skipped: number
}

export interface FinanceSmokeLaneStatus {
  availability: FinanceSmokeLaneAvailability
  generatedAt: string
  reportPath: string | null
  reportFinishedAt: string | null
  totals: FinanceSmokeLaneTotals
  suites: FinanceSmokeLaneSuite[]
  notes: string[]
  error: string | null
}
