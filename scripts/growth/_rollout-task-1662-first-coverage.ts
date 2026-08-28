/**
 * TASK-1662 — Rollout: primera corrida REAL de cobertura de competidor (GASTA ~USD 0,16).
 *
 * Autorización plena del operador 2026-08-28 ("Autorizo plenamente"). Secuencia de la task:
 * declarar competidor real → dry-run → corrida real sobre UN competidor de UNA org →
 * verificar provider_cost en el ledger → leer el gap.
 *
 * Sujeto: seot-berel-mx (berel.com, MX) → competidor comex.com.mx.
 * Evidencia de la declaración: docs/audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md
 * (Authority 57 vs 39; "la categoría en México tiene un solo dominio fuerte").
 *
 *   npx tsx --env-file=.env.local --require ./scripts/lib/server-only-shim.cjs scripts/growth/_rollout-task-1662-first-coverage.ts --spend
 *
 * Sin `--spend`: declara (idempotente) + dry-run solamente.
 */

import { runGreenhousePostgresQuery } from '../../src/lib/postgres/client'
import { declareCompetitors, listActiveCompetitors } from '../../src/lib/growth/seo/competitors'
import {
  captureCompetitorCoverage,
  previewCompetitorCoverageCapture
} from '../../src/lib/growth/seo/competitor-coverage'
import { readKeywordGap } from '../../src/lib/growth/seo/keyword-gap-reader'

const SPEND = process.argv.includes('--spend')
const TARGET = 'seot-berel-mx'
const COMPETITOR_DOMAIN = 'comex.com.mx'
const ACTOR = 'user-efeonce-admin-julio-reyes'

const ENV_ON = {
  ...process.env,
  GROWTH_SEO_ENABLED: 'true',
  GROWTH_SEO_COMPETITOR_GAP_ENABLED: 'true'
} as NodeJS.ProcessEnv

const berelLedgerToday = async (): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ total: number }>(
    `SELECT COALESCE(SUM(provider_cost_usd), 0)::float8 AS total
       FROM greenhouse_growth.seo_provider_spend_daily
      WHERE organization_id = (SELECT organization_id FROM greenhouse_growth.seo_targets WHERE seo_target_id = $1)
        AND family = 'labs' AND consumer = 'seo' AND spend_date = CURRENT_DATE`,
    [TARGET]
  )

  return rows[0]?.total ?? 0
}

const main = async () => {
  // ── 1. Declaración (idempotente) ──
  const declared = await declareCompetitors(TARGET, [COMPETITOR_DOMAIN], ACTOR, {
    source: 'seed',
    proposalRef: 'audit:BEREL_SEO_DIAGNOSTIC_2026-08-25',
    env: ENV_ON
  })

  if (!declared.ok) throw new Error(`declare falló: ${declared.errorCode}`)
  console.log('declare:', JSON.stringify(declared.outcomes), `(${declared.activeCompetitorCount}/${declared.capacity})`)

  const competitor = (await listActiveCompetitors(TARGET)).find(c => c.competitorDomain === COMPETITOR_DOMAIN)

  if (!competitor) throw new Error('competidor no vigente tras declarar')
  console.log('competitorId:', competitor.seoCompetitorId, '| declaredBy:', competitor.declaredBy, '| proposalRef:', competitor.proposalRef)

  // ── 2. Dry-run ──
  const preview = await previewCompetitorCoverageCapture(competitor.seoCompetitorId, ENV_ON)

  console.log('dry-run:', JSON.stringify(preview))
  if (!preview.ok) throw new Error(`preview falló: ${preview.errorCode}`)
  if (!preview.gateAllowed) throw new Error(`gate bloqueado: ${preview.gateBlockedReason}`)

  if (!SPEND) {
    console.log('\nSin --spend: me detengo antes de gastar.')
    process.exit(0)
  }

  if (preview.fresh) {
    console.log('\nYa hay cobertura fresca (<30 días) — no se re-compra. Leyendo el gap existente…')
  } else {
    // ── 3. Corrida REAL ──
    const ledgerBefore = await berelLedgerToday()
    const result = await captureCompetitorCoverage(competitor.seoCompetitorId, ENV_ON)

    console.log('\ncaptura:', JSON.stringify(result))
    if (result.status !== 'captured') throw new Error(`captura no exitosa: ${result.status}`)

    const ledgerAfter = await berelLedgerToday()

    console.log(
      `ledger labs/seo hoy (org Berel): ${ledgerBefore.toFixed(4)} → ${ledgerAfter.toFixed(4)} (Δ ${(ledgerAfter - ledgerBefore).toFixed(4)} vs provider_cost ${result.providerCostUsd.toFixed(4)})`
    )
  }

  // ── 4. Leer el gap real ──
  const gap = await readKeywordGap(TARGET, { seoCompetitorId: competitor.seoCompetitorId, env: ENV_ON })

  if (!gap.ok) throw new Error(`reader falló: ${gap.errorCode}`)

  const coverage = gap.competitors[0]?.coverage

  if (coverage?.state !== 'available') throw new Error(`cobertura no disponible: ${JSON.stringify(coverage)}`)

  console.log(
    `\ngap ${COMPETITOR_DOMAIN} (run ${coverage.coverageRunId}, ${coverage.captureDate}):` +
      `\n  content_gap (no aparezco): ${coverage.contentGap.length} (+${coverage.truncated.contentGap} truncadas)` +
      `\n  ranks_worse (aparezco peor): ${coverage.ranksWorse.length}` +
      `\n  declaredTargets (compromisos): ${coverage.declaredTargets.length}` +
      `\n  excluidas por GSC medido: ${coverage.excluded.measuredInGsc} · cliente mejor/igual: ${coverage.excluded.clientBetterOrEqual}`
  )

  const sample = coverage.contentGap.slice(0, 8)

  console.log('\nmuestra content_gap (orden alfabético neutral):')

  for (const row of sample) {
    console.log(
      `  · "${row.keyword}" comp#${row.competitorRank} | vol ${row.factors.searchVolume ?? 'sin_dato'} | cpc ${row.factors.cpcUsd ?? 'sin_dato'} | barrera ${row.factors.linkBarrier} | banda ${row.factors.attainablePositionBand} | AIO ${row.factors.aiOverviewPresent ?? 'sin_dato'} | features ${row.factors.serpFeatures ? row.factors.serpFeatures.length : 'sin_dato'}`
    )
  }

  const marketRows = await runGreenhousePostgresQuery<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_keyword_market_data
      WHERE source_endpoint = 'domain_intersection' AND capture_date = CURRENT_DATE`
  )

  console.log(`\nfilas de mercado gratis hoy (source domain_intersection): ${marketRows[0]?.n}`)
  console.log('\n✓ rollout TASK-1662: primera corrida verificada')
  process.exit(0)
}

main().catch(error => {
  console.error('rollout TASK-1662 reventó:', error)
  process.exit(1)
})
