import { test, expect, getAuthenticatedJson } from '../fixtures/auth'

interface ReliabilitySmokeSignal {
  signalId?: string
  severity?: string
  evidence?: Array<{ label?: string; value?: string }>
}

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
  test('reliability overview reports account_balances FX drift signal at count=0', async ({ request }) => {
    test.setTimeout(75_000)

    const body = await getAuthenticatedJson<{ modules?: Array<{ signals?: ReliabilitySmokeSignal[] }> }>(
      request,
      '/api/admin/reliability',
      { timeoutMs: 70_000 }
    )

    const allSignals = (body.modules ?? []).flatMap(m => m.signals ?? [])

    const fxDriftSignal = allSignals.find(s => s.signalId === 'finance.account_balances.fx_drift')

    if (!fxDriftSignal) {
      throw new Error('Missing account_balances FX drift signal')
    }

    expect(fxDriftSignal.severity, 'fx drift severity').toBe('ok')

    const countEvidence = fxDriftSignal.evidence?.find(
      (e: { label?: string }) => e.label === 'count'
    )

    expect(countEvidence?.value, 'fx drift count').toBe('0')
  })
})
