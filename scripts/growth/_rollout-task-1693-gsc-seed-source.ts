/**
 * TASK-1693 — Rollout: encolar una corrida REAL con `seedSource='gsc_queries'` (GASTA ~USD 0,35).
 *
 * Cierra el único Acceptance Criterion que quedó sin ejercitar al completar la task: que una
 * corrida encolada con la fuente medida **persista `source_kind='gsc_queries'`** y que sus seeds
 * salgan de `seo_gsc_daily` — no del textarea.
 *
 * ⚠️ El gasto NO ocurre acá. `queueKeywordDiscovery` resuelve las seeds y persiste la corrida en
 * `pending`; quien llama al proveedor es el drain del ops-worker (`ops-seo-keyword-discovery-drain`,
 * cada 10 min). Por eso este script verifica la parte del AC que SÍ es observable al encolar y
 * deja dicho qué queda por mirar cuando el drain la procese.
 *
 *   npx tsx --env-file=.env.local --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/growth/_rollout-task-1693-gsc-seed-source.ts [--spend]
 *
 * Sin `--spend` sólo reporta qué seeds aportaría la fuente y cuánto costaría.
 */

import { estimateDiscoveryCost } from '../../src/lib/growth/seo/keyword-discovery/contracts'
import { queueKeywordDiscovery, readSeedSourceAvailability } from '../../src/lib/growth/seo/keyword-discovery/queue'
import { runGreenhousePostgresQuery } from '../../src/lib/postgres/client'

const SPEND = process.argv.includes('--spend')

/** Grupo Berel — el Space con módulo SEO, sitio configurado y consultas medidas en la ventana. */
const ORGANIZATION_ID = 'org-32333527-02a8-487b-819e-6f76a761777d'
const SEO_TARGET_ID = 'seot-berel-mx'
const ACTOR = 'user-efeonce-admin-julio-reyes'

const ENV_ON = {
  ...process.env,
  GROWTH_SEO_ENABLED: 'true',
  GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED: 'true'
} as NodeJS.ProcessEnv

const METHODS = [
  { method: 'keyword_suggestions' as const, resultsPerCall: 25 },
  { method: 'related_keywords' as const, resultsPerCall: 25 }
]

const main = async () => {
  const availability = await readSeedSourceAvailability(ORGANIZATION_ID, SEO_TARGET_ID)

  console.log('Insumo por fuente (mismos resolvers que usará el encolado):', availability)

  if (availability.gscQueries === 0) {
    console.log('✗ Sin consultas medidas en la ventana: la fuente no tiene insumo y el command la rechazaría.')
    process.exit(1)
  }

  const estimate = estimateDiscoveryCost({ seedCount: availability.gscQueries, methods: METHODS })

  console.log('Estimado:', JSON.stringify(estimate))

  if (!SPEND) {
    console.log('\nDRY RUN — sin `--spend` no se encola nada.')

    return
  }

  const result = await queueKeywordDiscovery({
    organizationId: ORGANIZATION_ID,
    seoTargetId: SEO_TARGET_ID,
    seedSource: 'gsc_queries',
    methods: METHODS,
    actor: ACTOR,
    env: ENV_ON
  })

  console.log('\nqueueKeywordDiscovery →', JSON.stringify(result))

  if (!result.ok) process.exit(1)

  // ── El AC, verificado contra la fila persistida ────────────────────────────────────────
  const rows = await runGreenhousePostgresQuery<{
    run_id: string
    source_kind: string
    status: string
    seed_count: number
  }>(
    `SELECT run_id, source_kind, status, jsonb_array_length(seed_inputs_json -> 'seeds')::int AS seed_count
       FROM greenhouse_growth.seo_keyword_discovery_runs
      WHERE run_id = $1`,
    [result.runId]
  )

  console.table(rows)

  const run = rows[0]

  console.log(
    run?.source_kind === 'gsc_queries'
      ? `✓ source_kind persistido = 'gsc_queries' con ${run.seed_count} seeds`
      : `✗ source_kind = ${run?.source_kind}`
  )

  /*
   * ⚠️ `seed_inputs_json` es un OBJETO `{seeds: [...]}`, no un array. Asumirlo array revienta con
   * `cannot get array length of a non-array` — pasó al escribir este script.
   *
   * Las seeds tienen que traer `origin: 'gsc_queries'`: es la prueba de que salieron de
   * `seo_gsc_daily` y no del textarea.
   */
  const seedOrigins = await runGreenhousePostgresQuery<{ origin: string; n: number }>(
    `SELECT seed ->> 'origin' AS origin, COUNT(*)::int AS n
       FROM greenhouse_growth.seo_keyword_discovery_runs r,
            LATERAL jsonb_array_elements(r.seed_inputs_json -> 'seeds') AS seed
      WHERE r.run_id = $1
      GROUP BY 1`,
    [result.runId]
  )

  console.log('Procedencia de las seeds persistidas:')
  console.table(seedOrigins)

  console.log(
    '\n⏳ El gasto ocurre en el drain (`ops-seo-keyword-discovery-drain`, cada 10 min).',
    '\n   Volver a mirar la corrida para ver `status=succeeded`, `candidate_count` y `provider_cost`.'
  )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
