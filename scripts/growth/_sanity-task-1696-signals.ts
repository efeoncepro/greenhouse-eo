/**
 * TASK-1696 — Sanity live de las tres señales contra PG real.
 *
 * Gate TASK-893: las queries llevan COALESCE, FILTER, CASE, JOIN a jsonb y aritmética de fechas.
 * Los mocks ejercitan el TS, NO el SQL — un `column does not exist` o un mismatch de tipos en un
 * COALESCE compila, pasa typecheck y revienta recién contra PostgreSQL.
 *
 * Read-only: ninguna de las tres escribe.
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1696-signals.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const main = async () => {
  const { getGrowthDataForSeoSpendLedgerDriftSignal } = await import(
    '@/lib/reliability/queries/growth-dataforseo-spend-ledger-drift'
  )

  const { getGrowthAiVisibilityObservationYieldSignal } = await import(
    '@/lib/reliability/queries/growth-ai-visibility-observation-yield'
  )

  const { getSeoProviderCostOverBudgetSignal } = await import(
    '@/lib/reliability/queries/seo-provider-cost-over-budget'
  )

  const signals = [
    await getGrowthDataForSeoSpendLedgerDriftSignal(),
    await getGrowthAiVisibilityObservationYieldSignal(),
    await getSeoProviderCostOverBudgetSignal()
  ]

  let failures = 0

  for (const signal of signals) {
    // `unknown` es el estado que toma el catch: significa que la query NO corrió. Es exactamente
    // lo que este sanity existe para atrapar — un signal que degrada honesto se ve igual de
    // tranquilo en el tablero que uno que funciona.
    const ok = signal.severity !== 'unknown'

    console.log(`${ok ? '✓' : '✗'} ${signal.signalId} → ${signal.severity}`)
    console.log(`    ${signal.summary}`)

    for (const item of signal.evidence ?? []) {
      console.log(`    · ${item.label}: ${item.value}`)
    }

    if (!ok) failures += 1
  }

  if (failures > 0) {
    console.error(`\nFAIL — ${failures} señal(es) no pudieron leer su query contra PG.`)
    process.exit(1)
  }

  console.log('\nOK — las tres queries corren contra PostgreSQL real.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
