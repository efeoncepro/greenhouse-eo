import { test, expect, gotoAuthenticated } from '../fixtures/auth'

/**
 * TASK-774 Slice 6 — verifica que el reliability signal
 * `finance.account_balances.fx_drift` está en steady state (severity=ok,
 * count=0) en staging.
 *
 * El signal recompute closing_balance esperado desde VIEWs canónicas TASK-766
 * + COALESCE(settlement_legs.amount_clp, ...) y compara contra persisted.
 * Steady state = 0. Si > 0, el materializer corrió antes del fix Slice 2 o
 * emerge nuevo callsite con anti-patrón SUM(payment.amount) sin _clp.
 *
 * Hits el admin endpoint `/api/admin/reliability` con agent auth + Vercel
 * bypass header (configurados en playwright.config.ts).
 */
test.describe('finance.account_balances.fx_drift — TASK-774', () => {
  test('reliability overview reports account_balances FX drift signal at count=0', async ({ page }) => {
    const response = await gotoAuthenticated(page, '/api/admin/reliability')

    expect(response?.status(), 'overview status').toBeLessThan(400)

    const body = await response!.json()

    const allSignals = (body.modules ?? []).flatMap((m: { signals?: unknown[] }) => m.signals ?? [])

    const fxDriftSignal = allSignals.find(
      (s: { signalId?: string }) => s.signalId === 'finance.account_balances.fx_drift'
    )

    expect(fxDriftSignal, 'account_balances FX drift signal exists').toBeDefined()
    expect(fxDriftSignal.severity, 'fx drift severity').toBe('ok')

    const countEvidence = fxDriftSignal.evidence?.find(
      (e: { label?: string }) => e.label === 'count'
    )

    expect(countEvidence?.value, 'fx drift count').toBe('0')
  })
})
