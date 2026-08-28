/**
 * TASK-1662 — Sanity live del keyword gap competitivo (PG real, SIN proveedor).
 *
 * Corre con el proxy Cloud SQL arriba:
 *   npx tsx --env-file=.env.local --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1662-keyword-gap.ts
 *
 * Ejercita contra PostgreSQL real (gate TASK-893: los mocks ejercitan el TS, nunca el SQL):
 * declarar con autoría → idempotencia → dominio propio inválido → cobertura sintética →
 * readKeywordGap (clasificación + exclusión GSC + factores) → retiro con autoría → outbox.
 *
 * NO llama al proveedor y NO gasta: la captura real de cobertura es rollout (flag OFF,
 * secuencia de verificación de la task con autorización del operador).
 *
 * Residuo: las tablas son append-only (sin DELETE por trigger, a propósito). El competidor
 * sintético usa el TLD reservado `.invalid` (RFC 2606) y queda RETIRADO al final: invisible
 * para readers (sólo leen vigentes), para el batch (sólo vigentes) y para la señal de
 * frescura (sólo vigentes). El residuo es historia legítima de un sistema append-only.
 */

import { runGreenhousePostgresQuery } from '../../src/lib/postgres/client'
import { declareCompetitors, listActiveCompetitors, retireCompetitors } from '../../src/lib/growth/seo/competitors'
import { readKeywordGap } from '../../src/lib/growth/seo/keyword-gap-reader'
import { runCompetitorCoverageBatch } from '../../src/lib/growth/seo/competitor-coverage'

const SANITY_DOMAIN = 'sanity-task-1662.invalid'
const ACTOR = 'sanity-task-1662'

const ENV_ON = { ...process.env, GROWTH_SEO_ENABLED: 'true' } as NodeJS.ProcessEnv
const ENV_GAP_OFF = { ...ENV_ON, GROWTH_SEO_COMPETITOR_GAP_ENABLED: 'false' } as NodeJS.ProcessEnv

let pass = 0
let fail = 0

const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) {
    pass += 1
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
  } else {
    fail += 1
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const main = async () => {
  // Target real con módulo seo_v2 vigente (el command lo exige).
  const targets = await runGreenhousePostgresQuery<{
    seo_target_id: string
    organization_id: string
    root_domain: string
  }>(
    `SELECT t.seo_target_id, t.organization_id, t.root_domain
       FROM greenhouse_growth.seo_targets t
      WHERE t.status = 'active'
        AND EXISTS (
          SELECT 1 FROM greenhouse_client_portal.module_assignments ma
           WHERE ma.organization_id = t.organization_id
             AND ma.module_key = 'seo_v2'
             AND ma.effective_to IS NULL
             AND ma.status IN ('active', 'pilot')
        )
      ORDER BY t.created_at ASC
      LIMIT 1`
  )

  const target = targets[0]

  if (!target) throw new Error('No hay seo_target activo con módulo seo_v2 — sanity no puede correr.')

  console.log(`Target: ${target.seo_target_id} (${target.root_domain})`)

  try {
    // ── 1. Declarar con autoría ──
    const declared = await declareCompetitors(
      target.seo_target_id,
      [`https://www.${SANITY_DOMAIN.toUpperCase()}/ruta?x=1`],
      ACTOR,
      { source: 'seed', proposalRef: 'sanity:task-1662', env: ENV_ON }
    )

    check('declare ok', declared.ok)
    if (!declared.ok) throw new Error(`declare falló: ${declared.errorCode}`)

    const outcome = declared.outcomes[0]

    check('declare normaliza y declara', outcome?.status === 'declared' && outcome.domain === SANITY_DOMAIN, JSON.stringify(outcome))

    const authorship = await runGreenhousePostgresQuery<{
      declared_by: string
      declared_source: string
      proposal_ref: string | null
      declared_at: string | null
    }>(
      `SELECT declared_by, declared_source, proposal_ref, declared_at::text AS declared_at
         FROM greenhouse_growth.seo_competitors
        WHERE seo_target_id = $1 AND competitor_domain = $2 AND effective_to IS NULL`,
      [target.seo_target_id, SANITY_DOMAIN]
    )

    check(
      'autoría completa en la fila (CHECK del schema)',
      authorship[0]?.declared_by === ACTOR &&
        authorship[0]?.declared_source === 'seed' &&
        authorship[0]?.proposal_ref === 'sanity:task-1662' &&
        Boolean(authorship[0]?.declared_at),
      JSON.stringify(authorship[0])
    )

    // ── 2. Idempotencia ──
    const redeclared = await declareCompetitors(target.seo_target_id, [SANITY_DOMAIN], ACTOR, { env: ENV_ON })

    check('re-declare es already_declared', redeclared.ok && redeclared.outcomes[0]?.status === 'already_declared')

    // ── 3. El dominio del propio cliente es invalid ──
    const self = await declareCompetitors(target.seo_target_id, [target.root_domain], ACTOR, { env: ENV_ON })

    check('dominio propio → invalid', self.ok && self.outcomes[0]?.status === 'invalid', JSON.stringify(self.ok ? self.outcomes : self))

    // ── 4. Cobertura sintética (INSERT permitido; el gap se deriva de esto) ──
    const competitorId = (await listActiveCompetitors(target.seo_target_id)).find(
      competitor => competitor.competitorDomain === SANITY_DOMAIN
    )?.seoCompetitorId

    check('competidor vigente listado', Boolean(competitorId))
    if (!competitorId) throw new Error('sin competitorId')

    const runRows = await runGreenhousePostgresQuery<{ coverage_run_id: string }>(
      `INSERT INTO greenhouse_growth.seo_competitor_coverage_runs
         (seo_competitor_id, seo_target_id, location_code, language_code, capture_date, status, rows_written, provider_cost, source_run_id)
       SELECT $1, $2, t.location_code, t.language_code, CURRENT_DATE, 'captured', 3, 0, 'sanity-task-1662'
         FROM greenhouse_growth.seo_targets t WHERE t.seo_target_id = $2
       ON CONFLICT (seo_competitor_id, capture_date) WHERE status = 'captured' DO NOTHING
       RETURNING coverage_run_id`,
      [competitorId, target.seo_target_id]
    )

    const coverageRunId = runRows[0]?.coverage_run_id

    check('run de cobertura sintético insertado', Boolean(coverageRunId))
    if (!coverageRunId) throw new Error('sin coverage run (¿ranura del día tomada?)')

    // Una query REAL con impresiones del cliente (para probar la exclusión ●).
    const measuredRows = await runGreenhousePostgresQuery<{ query: string }>(
      `SELECT query FROM greenhouse_growth.seo_gsc_daily
        WHERE organization_id = $1 AND capture_date >= (CURRENT_DATE - 28)
        GROUP BY query HAVING SUM(impressions) > 0
        ORDER BY SUM(impressions) DESC LIMIT 1`,
      [target.organization_id]
    )

    const measuredKeyword = measuredRows[0]?.query ?? null

    console.log(`  keyword medida real para exclusión: ${measuredKeyword ?? '(no hay GSC — se salta ese check)'}`)

    const syntheticRows: Array<[string, number, number | null]> = [
      ['sanity task 1662 gap contenido', 3, null],
      ['sanity task 1662 gap peor', 4, 15],
      ...(measuredKeyword ? ([[measuredKeyword, 5, null]] as Array<[string, number, number | null]>) : [])
    ]

    for (const [keyword, competitorRank, clientRank] of syntheticRows) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_growth.seo_competitor_keyword_coverage
           (coverage_run_id, seo_competitor_id, seo_target_id, keyword, location_code, language_code, capture_date,
            competitor_rank, competitor_url, client_rank, client_url, serp_item_types)
         SELECT $1, $2, $3, $4, t.location_code, t.language_code, CURRENT_DATE, $5, NULL, $6, NULL,
                CASE WHEN $4 = 'sanity task 1662 gap contenido' THEN '["organic","ai_overview"]'::jsonb ELSE NULL END
           FROM greenhouse_growth.seo_targets t WHERE t.seo_target_id = $3
         ON CONFLICT ON CONSTRAINT seo_competitor_keyword_coverage_run_keyword_unique DO NOTHING`,
        [coverageRunId, competitorId, target.seo_target_id, keyword, competitorRank, clientRank]
      )
    }

    // ── 5. readKeywordGap contra SQL real ──
    const gap = await readKeywordGap(target.seo_target_id, { seoCompetitorId: competitorId, env: ENV_ON })

    check('readKeywordGap ok', gap.ok)
    if (!gap.ok) throw new Error(`reader falló: ${gap.errorCode}`)

    const coverage = gap.competitors[0]?.coverage

    check('cobertura available', coverage?.state === 'available')

    if (coverage?.state === 'available') {
      check('evidence ancla = coverageRunId', coverage.coverageRunId === coverageRunId)

      const contentKeywords = coverage.contentGap.map(row => row.keyword)

      check('content_gap clasificado', contentKeywords.includes('sanity task 1662 gap contenido'), JSON.stringify(contentKeywords))
      check(
        'ranks_worse separado',
        coverage.ranksWorse.length === 1 && coverage.ranksWorse[0].keyword === 'sanity task 1662 gap peor' && coverage.ranksWorse[0].clientRank === 15
      )

      if (measuredKeyword) {
        check(
          '🔴 keyword con GSC medido EXCLUIDA del gap',
          coverage.excluded.measuredInGsc >= 1 &&
            !contentKeywords.includes(measuredKeyword) &&
            !coverage.ranksWorse.some(row => row.keyword === measuredKeyword),
          `excluded.measuredInGsc=${coverage.excluded.measuredInGsc}`
        )
      }

      const withFeatures = coverage.contentGap.find(row => row.keyword === 'sanity task 1662 gap contenido')

      check(
        'SERP features como lista + AIO derivado',
        Array.isArray(withFeatures?.factors.serpFeatures) && withFeatures?.factors.aiOverviewPresent === true,
        JSON.stringify(withFeatures?.factors.serpFeatures)
      )
      check(
        'factores de mercado ausentes = sin_dato (keyword sintética sin fila de mercado)',
        withFeatures?.factors.searchVolume === null &&
          withFeatures?.factors.linkBarrier === 'unknown' &&
          withFeatures?.factors.attainablePositionBand === 'sin_dato'
      )

      const worse = coverage.ranksWorse[0]

      check('sin serp_info = sin_dato (null), jamás lista vacía', worse?.factors.serpFeatures === null && worse?.factors.aiOverviewPresent === null)

      const sorted = [...contentKeywords].sort((a, b) => a.localeCompare(b))

      check('orden NEUTRAL alfabético', JSON.stringify(contentKeywords) === JSON.stringify(sorted))
    }

    // ── 6. El batch con flag OFF no toca nada ──
    const disabledBatch = await runCompetitorCoverageBatch({ env: ENV_GAP_OFF })

    check('batch con flag OFF → disabled', disabledBatch.status === 'disabled')

    // ── 7. Outbox del compromiso ──
    const events = await runGreenhousePostgresQuery<{ event_type: string; n: string }>(
      `SELECT event_type, COUNT(*)::text AS n
         FROM greenhouse_sync.outbox_events
        WHERE aggregate_id = $1
          AND event_type IN ('growth.seo.competitor.declared', 'growth.seo.competitor.retired')
        GROUP BY event_type`,
      [target.seo_target_id]
    )

    check(
      'evento declared en el outbox',
      events.some(event => event.event_type === 'growth.seo.competitor.declared'),
      JSON.stringify(events)
    )
  } finally {
    // ── Cleanup honesto: retirar SIEMPRE (append-only — cerrar ventana, no borrar) ──
    const retired = await retireCompetitors(target.seo_target_id, [SANITY_DOMAIN], ACTOR, {
      reason: 'sanity TASK-1662 — competidor sintético retirado al cierre',
      env: ENV_ON
    })

    check('retiro (cleanup) ok', retired.ok && retired.outcomes[0]?.status === 'retired', JSON.stringify(retired.ok ? retired.outcomes : retired))

    const closed = await runGreenhousePostgresQuery<{ retired_by: string | null; effective_to: string | null }>(
      `SELECT retired_by, effective_to::text AS effective_to
         FROM greenhouse_growth.seo_competitors
        WHERE seo_target_id = $1 AND competitor_domain = $2
        ORDER BY effective_from DESC LIMIT 1`,
      [target.seo_target_id, SANITY_DOMAIN]
    )

    check('autoría del retiro persistida (CHECK)', closed[0]?.retired_by === ACTOR && Boolean(closed[0]?.effective_to))
  }

  // Post-retiro: el reader ya no ve al competidor.
  const after = await readKeywordGap(target.seo_target_id, { env: ENV_ON })

  check(
    'retirado → fuera del reader',
    after.ok && !after.competitors.some(entry => entry.competitor.competitorDomain === SANITY_DOMAIN)
  )

  console.log(`\n${fail === 0 ? '✓' : '✗'} sanity TASK-1662: ${pass} pass / ${fail} fail`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(error => {
  console.error('sanity TASK-1662 reventó:', error)
  process.exit(1)
})
