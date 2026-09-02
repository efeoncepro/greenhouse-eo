/**
 * TASK-1805 — Dry-run del evaluador ETV: plan + forecast + replay de fixtures, CERO gasto.
 *
 * Corre con el proxy Cloud SQL arriba (sólo para leer el ledger antes/después y probar que no
 * registra gasto):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1805-etv-evaluator.ts
 *
 * Es el entregable «evaluador seguro» de la foundation. La ejecución PAGADA (shadow/canary/A-B)
 * pertenece a TASK-1806 y exige gate ON, allowlist, tope USD y aprobación humana — nada de eso
 * ocurre acá aunque las env estén puestas: este script no tiene camino al proveedor.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const FIXTURES_DIR = path.resolve(process.cwd(), 'src/lib/growth/seo/etv-methodology/__fixtures__')

const readFixture = (name: string) => JSON.parse(readFileSync(path.join(FIXTURES_DIR, `${name}.json`), 'utf8'))

const main = async () => {
  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('../../src/lib/postgres/client')

  const { planEtvEvaluation, dryRunEtvEvaluation, resolveEtvEvaluatorConfig, describeEtvEvaluationMatrix } = await import(
    '../../src/lib/growth/seo/etv-methodology/evaluator'
  )

  const { replayEtvFixtures } = await import('../../src/lib/growth/seo/etv-methodology/replay')

  let pass = 0
  let fail = 0

  const check = (label: string, ok: boolean, detail?: string) => {
    if (ok) pass += 1
    else fail += 1
    console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  }

  const ledgerTotal = async (): Promise<number> => {
    const rows = await runGreenhousePostgresQuery<{ total: number }>(
      `SELECT COALESCE(SUM(provider_cost_usd), 0)::float8 AS total FROM greenhouse_growth.seo_provider_spend_daily WHERE spend_date = CURRENT_DATE`
    )

    return rows[0]?.total ?? 0
  }

  const ledgerBefore = await ledgerTotal()

  try {
    // 1. Matriz congelada.
    const matrix = describeEtvEvaluationMatrix()

    check('matriz 6 consumidas / 3 ignoradas / 5 no habilitadas', matrix.consumedFamilies.length === 6 && matrix.ignoredCallers.length === 3 && matrix.notEnabled.length === 5)

    // 2. Plan con la cohorte mínima del runbook (Efeonce CL + Berel MX), gate tal como esté en env.
    const config = resolveEtvEvaluatorConfig()

    const plan = planEtvEvaluation({
      mode: 'exact_ab',
      config,
      cells: [
        { subject: 'efeoncepro.com', locationCode: '2152', languageCode: 'es', familySlug: 'domain_rank_overview' },
        { subject: 'efeoncepro.com', locationCode: '2152', languageCode: 'es', familySlug: 'ranked_keywords', rowLimit: 100 },
        { subject: 'berel.com', locationCode: '2484', languageCode: 'es', familySlug: 'domain_rank_overview' },
        { subject: 'berel.com', locationCode: '2484', languageCode: 'es', familySlug: 'ranked_keywords', rowLimit: 100 },
        { subject: 'berel.com', locationCode: '2484', languageCode: 'es', familySlug: 'relevant_pages', rowLimit: 100 }
      ]
    })

    const dry = dryRunEtvEvaluation(plan, config)

    console.log(
      `[dry-run] mode=${plan.mode} cells=${plan.cells} requests=${plan.requestCount} blocked=${plan.blockedCount} forecastUsd=${plan.forecastUsd} providerCalls=${plan.providerCalls} wouldExecute=${dry.wouldExecute}`
    )
    for (const reason of dry.reasons) console.log(`  · ${reason}`)

    for (const planned of plan.plannedRequests) {
      console.log(
        `  ${planned.cell.familySlug.padEnd(24)} ${planned.cell.subject.padEnd(16)} ${planned.methodology.padEnd(30)} ${
          planned.request ? JSON.stringify(planned.request.requestParams) : `BLOQUEADA:${planned.blockedReason}`
        } USD ${planned.estimatedCostUsd}`
      )
    }

    check('plan: providerCalls=0 por construcción', plan.providerCalls === 0)
    check('plan: dos requests por celda (una por fórmula)', plan.plannedRequests.length === 10)
    check('dry-run con gate por defecto (OFF) NO ejecutaría', config.enabled ? true : dry.wouldExecute === false, `enabled=${config.enabled}`)

    // 3. Replay de fixtures con los parsers de producción.
    const domainReplay = replayEtvFixtures({
      family: 'domain_rank_overview',
      legacy: readFixture('domain_rank_overview.legacy'),
      improved: readFixture('domain_rank_overview.improved'),
      mode: 'exact_ab',
      context: { domain: 'cliente.cl', locationCode: '2152', languageCode: 'es' }
    })

    check('replay foto de dominio: count intacto, ETV cambia', domainReplay.comparison.organicCount.absolute === 0 && (domainReplay.comparison.organicEtv.absolute ?? 0) !== 0,
      `etv ${domainReplay.comparison.organicEtv.legacy} → ${domainReplay.comparison.organicEtv.improved} (${domainReplay.comparison.organicEtv.relative})`)

    const pagesReplay = replayEtvFixtures({
      family: 'relevant_pages',
      legacy: readFixture('relevant_pages.legacy'),
      improved: readFixture('relevant_pages.improved'),
      mode: 'exact_ab'
    })

    check(
      'replay relevant pages: la membresía del top-N cambia (Jaccard < 1)',
      (pagesReplay.comparison.membership.jaccard ?? 1) < 1,
      `jaccard=${pagesReplay.comparison.membership.jaccard} entries=${pagesReplay.comparison.membership.entries.join(',')} exits=${pagesReplay.comparison.membership.exits.join(',')}`
    )
    check('replay declara que prueba compatibilidad técnica, no exactitud', domainReplay.proves === 'technical_compatibility_only')

    // 4. El ledger no se movió: cero gasto.
    const ledgerAfter = await ledgerTotal()

    check('ledger de gasto intacto (USD 0 de esta corrida)', Math.abs(ledgerAfter - ledgerBefore) < 1e-9, `antes=${ledgerBefore} después=${ledgerAfter}`)
  } finally {
    await closeGreenhousePostgres()
  }

  console.log(`\nTASK-1805 evaluador: ${pass} ✅ / ${fail} ❌ — cero llamadas al proveedor`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
