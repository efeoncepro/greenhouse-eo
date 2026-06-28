import { test, expect, getAuthenticatedJson } from '../fixtures/auth'

interface ReliabilitySmokeSignal {
  signalId?: string
  severity?: string
  evidence?: Array<{ label?: string; value?: string }>
}

/**
 * TASK-775 Slice 8 — verifica que el reliability signal `platform.cron.staging_drift`
 * está en steady state (count=0) en staging.
 *
 * El signal detecta cuando un path Vercel async-critical (outbox*, sync-*, hubspot-*,
 * webhook-*, entra-*, nubox-*, *-monitor, etc.) no tiene equivalente Cloud Scheduler.
 * Steady state = 0. Si > 0, hay crons que no corren en staging custom env, y el
 * flujo downstream queda colgado silenciosamente.
 *
 * Hits el admin endpoint `/api/admin/reliability` y busca el signal.
 */
test.describe('platform.cron.staging_drift — TASK-775', () => {
  test('reliability overview reports cron staging drift signal at count=0', async ({ request }) => {
    test.setTimeout(75_000)

    const body = await getAuthenticatedJson<{ modules?: Array<{ signals?: ReliabilitySmokeSignal[] }> }>(
      request,
      '/api/admin/reliability',
      { timeoutMs: 70_000 }
    )

    // Walk modules to find sync module signals
    const allSignals = (body.modules ?? []).flatMap(m => m.signals ?? [])

    const driftSignal = allSignals.find(s => s.signalId === 'platform.cron.staging_drift')

    if (!driftSignal) {
      throw new Error('Missing cron staging drift signal')
    }

    expect(driftSignal.severity, 'cron drift severity').toBe('ok')

    const countEvidence = driftSignal.evidence?.find(
      (e: { label?: string }) => e.label === 'count'
    )

    expect(countEvidence?.value, 'cron drift count').toBe('0')
  })
})
