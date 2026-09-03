/**
 * TASK-1806 Slice 1 — CLI del shadow legacy/improved de ETV (`exact_ab`, cohorte preregistrada).
 *
 * Uso (proxy Cloud SQL arriba + ADC vigente + creds DataForSEO en el proceso):
 *
 *   # DRY-RUN (default): plan, forecast, caps, contract de schema, idempotencia y entitlement.
 *   # NO llama al proveedor (`providerCalls=0`).
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/dataforseo-etv-shadow.ts --dry-run
 *
 *   # Corrida real (GASTA): exige --execute explícito Y el gate del evaluador ON con allowlist + caps.
 *   ... --execute [--cohort=scripts/growth/etv-shadow-cohorts/<archivo>.json] [--artifact-dir=.captures/etv-shadow/<dir>]
 *
 * Después de una corrida con --execute reconcilia el ledger `seo_provider_spend_daily` (labs, hoy)
 * antes/después contra el costo real acumulado del summary (tolerancia 0,000001). Exit ≠ 0 si la
 * corrida no ejecutó, abortó o el ledger no cuadra.
 *
 * Los artefactos van a `.captures/` (gitignored): respuestas crudas por request + `summary.json`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const DEFAULT_COHORT = 'scripts/growth/etv-shadow-cohorts/2026-09-03-preregistered.json'
const LEDGER_TOLERANCE_USD = 0.000001

const args = new Map<string, string>()

for (const raw of process.argv.slice(2)) {
  const match = raw.match(/^--([^=]+)(?:=(.*))?$/)

  if (match) args.set(match[1], match[2] ?? 'true')
}

const main = async () => {
  const execute = args.get('execute') === 'true'
  const dryRun = !execute || args.get('dry-run') === 'true'

  if (execute && args.get('dry-run') === 'true') {
    console.error('[etv-shadow] --execute y --dry-run son excluyentes.')
    process.exit(1)
  }

  const cohortPath = path.resolve(process.cwd(), args.get('cohort') ?? DEFAULT_COHORT)

  // Imports diferidos: el cliente PG y el ledger leen env al cargar (patrón de los sanities).
  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('../../src/lib/postgres/client')

  // ⚠️ Obligatorio ANTES de cualquier llamada cobrada: sin el spend recorder el transporte LANZA.
  await import('../../src/lib/growth/seo/register-provider-spend')

  const { resolveEtvEvaluatorConfig } = await import('../../src/lib/growth/seo/etv-methodology/evaluator')
  const { assertEtvShadowCohort, preflightEtvShadow, runEtvShadow } = await import('../../src/lib/growth/seo/etv-methodology/shadow-runner')
  const { enforceSeoRunEntitlement } = await import('../../src/lib/growth/seo/entitlement')

  const cohort = assertEtvShadowCohort(JSON.parse(readFileSync(cohortPath, 'utf8')))
  const config = resolveEtvEvaluatorConfig()
  const today = new Date().toISOString().slice(0, 10)
  const artifactDir = path.resolve(process.cwd(), args.get('artifact-dir') ?? path.join('.captures', 'etv-shadow', `${today}-${cohort.id}`))

  const writeArtifact = async (relativePath: string, content: string) => {
    const target = path.join(artifactDir, relativePath)

    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, content, 'utf8')
  }

  const artifactExists = async (relativePath: string) => existsSync(path.join(artifactDir, relativePath))

  const ledgerLabsToday = async (): Promise<number> => {
    const rows = await runGreenhousePostgresQuery<{ total: number }>(
      `SELECT COALESCE(SUM(provider_cost_usd), 0)::float8 AS total
         FROM greenhouse_growth.seo_provider_spend_daily
        WHERE spend_date = CURRENT_DATE
          AND family = 'labs'`
    )

    return rows[0]?.total ?? 0
  }

  const executeShadow = async (): Promise<number> => {
    const ledgerBefore = await ledgerLabsToday()

    console.log(`[ledger] labs hoy ANTES: USD ${ledgerBefore}`)

    const summary = await runEtvShadow({
      cohort,
      config,
      mode: 'exact_ab',
      artifactDir,
      deps: { query: runGreenhousePostgresQuery, enforceSeoRunEntitlement, writeArtifact, artifactExists }
    })

    const ledgerAfter = await ledgerLabsToday()
    const ledgerDelta = Number((ledgerAfter - ledgerBefore).toFixed(6))
    const ledgerMatches = Math.abs(ledgerDelta - summary.totals.costUsd) <= LEDGER_TOLERANCE_USD

    console.log(
      `[run] ${summary.runId} executed=${summary.executed} requests=${summary.totals.requests} costUsd=${summary.totals.costUsd} forecastUsd=${summary.totals.forecastUsd} aborted=${summary.totals.aborted}${summary.totals.abortReason ? ` (${summary.totals.abortReason})` : ''}`
    )

    for (const reason of summary.reasons) console.log(`  · ${reason}`)

    for (const request of summary.requests) {
      console.log(
        `  [${request.cellIndex}] ${request.familySlug.padEnd(24)} ${request.subject.padEnd(16)} ${request.methodology.padEnd(30)} ${request.status.padEnd(20)} ` +
          `status=${request.statusCode ?? '-'} ok=${request.ok} USD ${request.costUsd} ${request.latencyMs ?? '-'}ms ` +
          `persist=${request.persisted.table ?? '-'}:${request.persisted.rows}${request.persisted.conflict ? ' CONFLICT' : ''}` +
          `${request.prospectTraffic ? ` prospect=${JSON.stringify(request.prospectTraffic)}` : ''}` +
          `${request.errorCode ? ` error=${request.errorCode}` : ''}`
      )
    }

    console.log(`[ledger] labs hoy DESPUÉS: USD ${ledgerAfter} · delta USD ${ledgerDelta} vs costo real USD ${summary.totals.costUsd} → ${ledgerMatches ? 'CUADRA' : 'NO CUADRA'}`)
    console.log(`[etv-shadow] summary → ${path.join(artifactDir, 'summary.json')}`)

    return !summary.executed || summary.totals.aborted || !ledgerMatches ? 1 : 0
  }

  let exitCode = 0

  try {
    console.log(`[etv-shadow] cohorte ${cohort.id} · aprobada por ${cohort.approvedBy} (${cohort.approvedAt}) · ${cohort.cells.length} celda(s)`)
    console.log(`[etv-shadow] gate enabled=${config.enabled} allowlist=[${config.subjectAllowlist.join(',')}] maxRequests=${config.maxRequests} budgetUsd=${config.budgetUsd}`)
    console.log(`[etv-shadow] artefactos → ${artifactDir}`)

    const preflight = await preflightEtvShadow({
      cohort,
      config,
      mode: 'exact_ab',
      deps: { query: runGreenhousePostgresQuery, enforceSeoRunEntitlement, artifactExists }
    })

    const { plan } = preflight

    console.log(
      `[plan] mode=${plan.mode} cells=${plan.cells} requests=${plan.requestCount} blocked=${plan.blockedCount} forecastUsd=${plan.forecastUsd} providerCalls=${plan.providerCalls}`
    )
    console.log(`[caps] maxRequests=${plan.caps.maxRequests} (${plan.caps.exceedsRequests ? 'EXCEDIDO' : 'ok'}) budgetUsd=${plan.caps.budgetUsd} (${plan.caps.exceedsBudget ? 'EXCEDIDO' : 'ok'})`)

    for (const [index, cell] of cohort.cells.entries()) {
      const planned = plan.plannedRequests.filter(candidate => candidate.cell === cell)

      console.log(
        `  [${index}] ${cell.familySlug.padEnd(24)} ${cell.subject.padEnd(16)} ${cell.locationCode}/${cell.languageCode}` +
          `${cell.purpose ? ` purpose=${cell.purpose}` : ''}${cell.period ? ` ${cell.period.fromMonth}..${cell.period.toMonth}` : ''}` +
          `${cell.targets ? ` targets=${cell.targets.length}` : ''} → ` +
          planned
            .map(request => `${request.methodology}:${request.blockedReason ? `BLOQUEADA(${request.blockedReason})` : `USD ${request.estimatedCostUsd}`}`)
            .join(' · ')
      )
    }

    console.log(`[preflight] contract de schema: UNIQUE legacy presentes = [${preflight.legacyUniqueConstraints.join(', ') || 'ninguna'}]`)
    console.log(`[preflight] already_captured (hoy) = ${preflight.alreadyCaptured.length} · pendientes = ${preflight.remaining.length} · forecast restante USD ${preflight.remainingForecastUsd}`)

    for (const gate of preflight.entitlement) {
      console.log(`[preflight] entitlement ${gate.organizationId}: estimado USD ${gate.estimatedCostUsd} → ${gate.allowed ? 'permitido' : `BLOQUEADO (${gate.blockedReason})`}`)
    }

    console.log(`[preflight] wouldExecute=${preflight.wouldExecute}`)
    for (const reason of preflight.reasons) console.log(`  · ${reason}`)

    if (dryRun) {
      console.log('[etv-shadow] DRY-RUN — providerCalls=0, ledger intacto. Repite con --execute para comprar (exige el gate ON).')
    } else {
      exitCode = await executeShadow()
    }
  } finally {
    await closeGreenhousePostgres()
  }

  process.exit(exitCode)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
