/**
 * TASK-1709 — Sanity live del diagnóstico de prospecto (PG real + proveedor real).
 *
 * Corre con el proxy Cloud SQL arriba:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1709-prospect-diagnostic.ts [--spend]
 *
 * Sin `--spend` ejecuta sólo los checks gratis (forecast, cost_blocked con tope bajo y
 * ledger intacto). Con `--spend` ejecuta la corrida real (~USD 0,25), verifica el ledger
 * atribuido a EO-ORG-0007 y la idempotencia (segundo disparo = USD 0).
 */

import { runGreenhousePostgresQuery } from '../../src/lib/postgres/client'
import { forecastProspectDiagnosticCostUsd } from '../../src/lib/growth/seo/prospect/contracts'
import { runProspectDiagnostic } from '../../src/lib/growth/seo/prospect/command'

const SPEND = process.argv.includes('--spend')
const DOMAIN = process.env.SANITY_PROSPECT_DOMAIN ?? 'skyairline.com'
const MARKET = process.env.SANITY_PROSPECT_MARKET ?? 'CL'

const ENV_ON = {
  ...process.env,
  GROWTH_SEO_ENABLED: 'true',
  GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED: 'true'
} as NodeJS.ProcessEnv

const efeonceLedgerToday = async (): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ total: number }>(
    `SELECT COALESCE(SUM(provider_cost_usd), 0)::float8 AS total
       FROM greenhouse_growth.seo_provider_spend_daily
      WHERE organization_id = (SELECT organization_id FROM greenhouse_core.organizations WHERE public_id = 'EO-ORG-0007')
        AND spend_date = CURRENT_DATE`
  )

  return rows[0]?.total ?? 0
}

const main = async () => {
  let pass = 0
  let fail = 0

  const check = (label: string, ok: boolean, detail?: string) => {
    if (ok) pass += 1
    else fail += 1
    console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  }

  // 1. Forecast en banda.
  const forecast = forecastProspectDiagnosticCostUsd()

  check('forecast en banda (< USD 0,50)', forecast.totalUsd > 0.1 && forecast.totalUsd < 0.5, `USD ${forecast.totalUsd}`)

  // 2. Flag OFF → disabled sin gasto.
  const disabled = await runProspectDiagnostic({
    rootDomain: DOMAIN,
    market: MARKET,
    actor: 'sanity:task-1709',
    env: { ...process.env, GROWTH_SEO_ENABLED: 'true', GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED: 'false' } as NodeJS.ProcessEnv
  })

  check('flag OFF → disabled', !disabled.ok && disabled.errorCode === 'disabled')

  // 3. Tope artificialmente bajo → cost_blocked y el ledger NO se mueve.
  const ledgerBefore = await efeonceLedgerToday()

  const blocked = await runProspectDiagnostic({
    rootDomain: DOMAIN,
    market: MARKET,
    actor: 'sanity:task-1709',
    env: { ...ENV_ON, GROWTH_SEO_PROSPECT_DIAGNOSTIC_CEILING_USD: '0.01' } as NodeJS.ProcessEnv
  })

  const ledgerAfterBlocked = await efeonceLedgerToday()

  check('tope bajo → cost_blocked', !blocked.ok && blocked.errorCode === 'cost_blocked')
  check('cost_blocked → ledger intacto (cero llamadas)', ledgerAfterBlocked === ledgerBefore, `USD ${ledgerBefore} → ${ledgerAfterBlocked}`)

  if (!SPEND) {
    console.log(`\n(sin --spend: corrida real omitida)\nResultado: ${pass} pass / ${fail} fail`)
    process.exit(fail > 0 ? 1 : 0)
  }

  // 4. Corrida REAL.
  console.log(`\n▶ corrida real sobre ${DOMAIN} (${MARKET}) — forecast USD ${forecast.totalUsd}`)
  const started = Date.now()
  const result = await runProspectDiagnostic({ rootDomain: DOMAIN, market: MARKET, actor: 'sanity:task-1709', env: ENV_ON })
  const ledgerAfterRun = await efeonceLedgerToday()

  if (!result.ok) {
    check('corrida real completada', false, `errorCode=${result.errorCode}`)
  } else {
    const d = result.diagnostic

    check('corrida real completada', d.status === 'completed', `${Date.now() - started}ms`)
    check('costo real ≤ tope', (d.cost.actualUsd ?? 0) <= d.cost.ceilingUsd, `actual USD ${d.cost.actualUsd} / tope ${d.cost.ceilingUsd}`)
    check('hechos con lente y fecha', d.facts.length > 0 && d.facts.every(f => f.lens === 'estimated' && !!f.capturedAt), `${d.facts.length} hechos`)
    check(
      'ledger movido ≈ costo real',
      Math.abs(ledgerAfterRun - ledgerBefore - (d.cost.actualUsd ?? 0)) < 0.02,
      `ledger Δ USD ${(ledgerAfterRun - ledgerBefore).toFixed(4)} vs actual ${d.cost.actualUsd}`
    )

    console.log('\nHechos:')

    for (const f of d.facts) {
      console.log(`  · ${f.kind} = ${f.magnitude === null ? 'null' : f.magnitude} (${f.source})`)
    }

    // 5. Idempotencia: segundo disparo el mismo día = USD 0.
    const second = await runProspectDiagnostic({ rootDomain: DOMAIN, market: MARKET, actor: 'sanity:task-1709', env: ENV_ON })
    const ledgerAfterSecond = await efeonceLedgerToday()

    check('idempotencia: reused=true', second.ok && second.reused === true)
    check('idempotencia: ledger intacto (USD 0)', ledgerAfterSecond === ledgerAfterRun, `USD ${ledgerAfterRun} → ${ledgerAfterSecond}`)
  }

  console.log(`\nResultado: ${pass} pass / ${fail} fail`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(error => {
  console.error('💥 sanity crash:', error)
  process.exit(1)
})
