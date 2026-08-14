/**
 * TASK-1664 — Sanity live del keyword discovery contra PG real (gate TASK-893).
 *
 * Verifica lo que los mocks NO pueden probar, porque vive en la base:
 *   1. las 3 tablas, sus UNIQUEs, sus triggers y sus GRANTs existen de verdad;
 *   2. el SQL real del enqueue/claim/candidates/actions ejecuta sin sorpresas de tipos
 *      (COALESCE, date-math de intervalos, jsonb, ON CONFLICT por constraint nombrado);
 *   3. el claim `pending → running` es atómico (el segundo UPDATE matchea cero filas);
 *   4. UPDATE/DELETE de candidates y DELETE de runs están bloqueados por trigger;
 *   5. las queries de las señales de confiabilidad ejecutan contra el schema real;
 *   6. los readers/commands read-only reales (`previewKeywordDiscovery`,
 *      `readKeywordDiscovery`) responden contra datos reales sin gastar.
 *
 * Todo lo que ESCRIBE corre dentro de UNA transacción fijada que aborta con un sentinel
 * (patrón del sanity de TASK-1661): las tablas son append-only y un DELETE de limpieza está
 * bloqueado por diseño, así que la única salida limpia es no committear jamás.
 *
 * Uso (proxy en 127.0.0.1:15432 — `pnpm pg:connect` lo levanta):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1664-keyword-discovery.ts
 *
 * SMOKE REAL CON GASTO (Slice 5 — sólo con autorización del operador):
 *   ... _sanity-task-1664-keyword-discovery.ts --spend
 * Encola y ejecuta UNA corrida real (1 seed, keyword_suggestions, limit 10) contra el
 * target activo de la org indicada en SEO_SANITY_ORG (default: la org de seot-berel-mx),
 * verifica ledger/candidatos/idempotencia. Costo esperado ~USD 0.03. Requiere
 * DATAFORSEO_API_LOGIN + DATAFORSEO_API_PASSWORD(_SECRET_REF) en el entorno.
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

// Flags ON sólo para ESTE proceso: el runtime compartido sigue OFF.
process.env.GROWTH_SEO_ENABLED = 'true'
process.env.GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED = 'true'

const ROLLBACK_SENTINEL = 'sanity-rollback'
const SPEND = process.argv.includes('--spend')

const main = async () => {
  const { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } = await import('@/lib/postgres/client')

  const checks: Array<[string, boolean]> = []

  const record = (label: string, passed: boolean) => {
    checks.push([label, passed])
    console.log(`${passed ? '✅' : '❌'} ${label}`)
    if (!passed) process.exitCode = 1
  }

  // ── 1. Estructura ─────────────────────────────────────────────────────────

  const structure = await runGreenhousePostgresQuery<{
    tables: number
    uniques: number
    triggers: number
    runtime_can_delete_candidates: boolean
    runtime_can_update_runs: boolean
  }>(`
    SELECT
      (SELECT COUNT(*)::int FROM information_schema.tables
        WHERE table_schema = 'greenhouse_growth'
          AND table_name IN ('seo_keyword_discovery_runs','seo_keyword_discovery_candidates','seo_keyword_discovery_actions')) AS tables,
      (SELECT COUNT(*)::int FROM pg_constraint
        WHERE conname IN ('seo_keyword_discovery_runs_idempotency_unique',
                          'seo_keyword_discovery_candidates_provenance_unique',
                          'seo_keyword_discovery_actions_idempotency_unique')) AS uniques,
      (SELECT COUNT(*)::int FROM pg_trigger
        WHERE tgname IN ('trg_seo_keyword_discovery_runs_no_delete',
                         'trg_seo_keyword_discovery_candidates_append_only',
                         'trg_seo_keyword_discovery_actions_append_only')
          AND NOT tgisinternal) AS triggers,
      EXISTS (SELECT 1 FROM information_schema.role_table_grants
               WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_keyword_discovery_candidates'
                 AND grantee = 'greenhouse_runtime' AND privilege_type = 'DELETE') AS runtime_can_delete_candidates,
      EXISTS (SELECT 1 FROM information_schema.role_table_grants
               WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_keyword_discovery_runs'
                 AND grantee = 'greenhouse_runtime' AND privilege_type = 'UPDATE') AS runtime_can_update_runs
  `)

  const s = structure[0]

  record('las 3 tablas de discovery existen', s?.tables === 3)
  record('los 3 UNIQUEs existen', s?.uniques === 3)
  record('los 3 triggers append-only existen', s?.triggers === 3)
  record('runtime NO puede DELETE candidates', s?.runtime_can_delete_candidates === false)
  record('runtime SÍ puede UPDATE runs (máquina de estados)', s?.runtime_can_update_runs === true)

  // Target real para las pruebas (no se muta): el de Berel MX o el indicado por env.
  const targetRow = (
    await runGreenhousePostgresQuery<{ seo_target_id: string; organization_id: string; location_code: string; language_code: string }>(
      `SELECT seo_target_id, organization_id, location_code, language_code
         FROM greenhouse_growth.seo_targets
        WHERE ($1::text IS NOT NULL AND organization_id = $1 AND status = 'active')
           OR ($1::text IS NULL AND seo_target_id = 'seot-berel-mx')
        LIMIT 1`,
      [process.env.SEO_SANITY_ORG ?? null]
    )
  )[0]

  if (!targetRow) {
    console.error('No hay target activo para el sanity (esperaba seot-berel-mx o SEO_SANITY_ORG).')
    process.exit(1)
  }

  // ── 2-4. Escrituras dentro de la transacción que aborta ───────────────────

  try {
    await withGreenhousePostgresTransaction(async client => {
      const stamp = Date.now()
      const idem = `sanity-1664-${stamp}`

      const inserted = await client.query<{ run_id: string }>(
        `INSERT INTO greenhouse_growth.seo_keyword_discovery_runs
           (organization_id, seo_target_id, source_kind, seed_inputs_json, methods_json,
            location_code, language_code, status, estimated_cost_usd, created_by, idempotency_key)
         VALUES ($1, $2, 'manual', $3::jsonb, $4::jsonb, $5, $6, 'pending', 0.03, 'sanity-1664', $7)
         ON CONFLICT ON CONSTRAINT seo_keyword_discovery_runs_idempotency_unique DO NOTHING
         RETURNING run_id`,
        [
          targetRow.organization_id,
          targetRow.seo_target_id,
          JSON.stringify({ seeds: [{ keyword: 'sanity 1664', normalizedKeyword: 'sanity 1664', origin: 'manual' }] }),
          JSON.stringify([{ method: 'keyword_suggestions', resultsPerCall: 10 }]),
          targetRow.location_code,
          targetRow.language_code,
          idem
        ]
      )

      const runId = inserted.rows[0]?.run_id ?? ''

      record('enqueue inserta run pending con id prefijado', runId.startsWith('seokdr-'))

      const dup = await client.query<{ run_id: string }>(
        `INSERT INTO greenhouse_growth.seo_keyword_discovery_runs
           (organization_id, seo_target_id, source_kind, seed_inputs_json, methods_json,
            location_code, language_code, status, estimated_cost_usd, created_by, idempotency_key)
         VALUES ($1, $2, 'manual', '{}'::jsonb, '[]'::jsonb, $3, $4, 'pending', 0, 'sanity-1664', $5)
         ON CONFLICT ON CONSTRAINT seo_keyword_discovery_runs_idempotency_unique DO NOTHING
         RETURNING run_id`,
        [targetRow.organization_id, targetRow.seo_target_id, targetRow.location_code, targetRow.language_code, idem]
      )

      record('mismo idempotency_key NO inserta segunda corrida', dup.rows.length === 0)

      // Claim atómico (el MISMO SQL del runner, con el JOIN a seo_targets).
      const claim = await client.query<{ run_id: string; root_domain: string }>(
        `UPDATE greenhouse_growth.seo_keyword_discovery_runs r
            SET status = 'running', started_at = clock_timestamp()
           FROM greenhouse_growth.seo_targets t
          WHERE r.run_id = $1
            AND r.status = 'pending'
            AND t.seo_target_id = r.seo_target_id
          RETURNING r.run_id, t.root_domain`,
        [runId]
      )

      record('claim pending→running devuelve la corrida con root_domain', claim.rows[0]?.run_id === runId && Boolean(claim.rows[0]?.root_domain))

      const secondClaim = await client.query(
        `UPDATE greenhouse_growth.seo_keyword_discovery_runs r
            SET status = 'running', started_at = clock_timestamp()
           FROM greenhouse_growth.seo_targets t
          WHERE r.run_id = $1
            AND r.status = 'pending'
            AND t.seo_target_id = r.seo_target_id
          RETURNING r.run_id`,
        [runId]
      )

      record('segundo claim matchea CERO filas (busy sin gasto)', secondClaim.rows.length === 0)

      // Candidato con la MISMA sentencia del finalize.
      const candidateInsert = `
        INSERT INTO greenhouse_growth.seo_keyword_discovery_candidates
          (run_id, organization_id, seo_target_id, keyword, normalized_keyword,
           seed_keywords_json, source_endpoint, source_rank, raw_payload_hash)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
        ON CONFLICT ON CONSTRAINT seo_keyword_discovery_candidates_provenance_unique DO NOTHING`

      const cand = await client.query(candidateInsert, [
        runId,
        targetRow.organization_id,
        targetRow.seo_target_id,
        'sanity candidato 1664',
        'sanity candidato 1664',
        JSON.stringify(['sanity 1664']),
        'keyword_suggestions',
        1,
        'deadbeef'
      ])

      record('candidato se inserta', cand.rowCount === 1)

      const candDup = await client.query(candidateInsert, [
        runId,
        targetRow.organization_id,
        targetRow.seo_target_id,
        'sanity candidato 1664',
        'sanity candidato 1664',
        JSON.stringify(['otra seed']),
        'keyword_suggestions',
        2,
        'deadbeef'
      ])

      record('retry de subllamada NO duplica candidato (provenance unique)', candDup.rowCount === 0)

      const candidateId = (
        await client.query<{ candidate_id: string }>(
          `SELECT candidate_id FROM greenhouse_growth.seo_keyword_discovery_candidates
            WHERE run_id = $1 AND normalized_keyword = 'sanity candidato 1664'`,
          [runId]
        )
      ).rows[0]?.candidate_id as string

      // CHECK del enum: keyword_overview NO es procedencia de candidato.
      await client.query('SAVEPOINT bad_endpoint')

      let endpointRejected = false

      try {
        await client.query(candidateInsert, [
          runId,
          targetRow.organization_id,
          targetRow.seo_target_id,
          'x',
          'x',
          '[]',
          'keyword_overview',
          1,
          null
        ])
      } catch {
        endpointRejected = true
        await client.query('ROLLBACK TO SAVEPOINT bad_endpoint')
      }

      record('CHECK rechaza keyword_overview como procedencia de candidato', endpointRejected)

      // Acción append-only + idempotencia.
      const actionInsert = `
        INSERT INTO greenhouse_growth.seo_keyword_discovery_actions
          (candidate_id, organization_id, action_kind, actor, idempotency_key, metadata_json)
        VALUES ($1, $2, $3, $4, $5, '{}'::jsonb)
        ON CONFLICT ON CONSTRAINT seo_keyword_discovery_actions_idempotency_unique DO NOTHING
        RETURNING action_id`

      const action = await client.query(actionInsert, [candidateId, targetRow.organization_id, 'dismissed', 'sanity-1664', `${idem}-a`])

      record('acción se inserta', action.rows.length === 1)

      const actionDup = await client.query(actionInsert, [candidateId, targetRow.organization_id, 'rejected', 'sanity-1664', `${idem}-a`])

      record('misma idempotency_key de acción NO duplica', actionDup.rows.length === 0)

      // Triggers append-only.
      await client.query('SAVEPOINT mutate_candidate')

      let updateBlocked = false

      try {
        await client.query(`UPDATE greenhouse_growth.seo_keyword_discovery_candidates SET keyword = 'x' WHERE candidate_id = $1`, [candidateId])
      } catch {
        updateBlocked = true
        await client.query('ROLLBACK TO SAVEPOINT mutate_candidate')
      }

      record('UPDATE de candidato bloqueado por trigger', updateBlocked)

      await client.query('SAVEPOINT delete_run')

      let deleteBlocked = false

      try {
        await client.query(`DELETE FROM greenhouse_growth.seo_keyword_discovery_runs WHERE run_id = $1`, [runId])
      } catch {
        deleteBlocked = true
        await client.query('ROLLBACK TO SAVEPOINT delete_run')
      }

      record('DELETE de run bloqueado por trigger', deleteBlocked)

      // Cierre del run (misma sentencia del finalize) + transición sólo desde running.
      const finalize = await client.query(
        `UPDATE greenhouse_growth.seo_keyword_discovery_runs
            SET status = 'succeeded', error_code = NULL, provider_calls = 1,
                actual_cost_usd = 0.0132, candidate_count = candidate_count + 1,
                completed_at = clock_timestamp()
          WHERE run_id = $1 AND status = 'running'`,
        [runId]
      )

      record('finalize transiciona running→succeeded', finalize.rowCount === 1)

      const reFinalize = await client.query(
        `UPDATE greenhouse_growth.seo_keyword_discovery_runs
            SET status = 'failed', completed_at = clock_timestamp()
          WHERE run_id = $1 AND status = 'running'`,
        [runId]
      )

      record('un run cerrado NO se reescribe (matchea cero filas)', reFinalize.rowCount === 0)

      throw new Error(ROLLBACK_SENTINEL)
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== ROLLBACK_SENTINEL) throw error
  }

  // ── 5. Señales de confiabilidad (SQL real) ────────────────────────────────

  const { getSeoKeywordDiscoveryStuckRunsSignal, getSeoKeywordDiscoveryProviderErrorsSignal } = await import(
    '@/lib/reliability/queries/seo-keyword-discovery-health'
  )

  const stuck = await getSeoKeywordDiscoveryStuckRunsSignal()

  record('señal stuck_runs ejecuta contra PG real', stuck.severity !== 'unknown')

  const provErrors = await getSeoKeywordDiscoveryProviderErrorsSignal()

  record('señal provider_errors ejecuta contra PG real', provErrors.severity !== 'unknown')

  // ── 6. Commands read-only reales (sin gasto) ──────────────────────────────

  const { previewKeywordDiscovery } = await import('@/lib/growth/seo/keyword-discovery/queue')
  const { readKeywordDiscovery } = await import('@/lib/growth/seo/keyword-discovery/reader')

  const preview = await previewKeywordDiscovery({
    organizationId: targetRow.organization_id,
    seoTargetId: targetRow.seo_target_id,
    seedSource: 'gsc_queries',
    methods: [],
    actor: 'sanity-1664'
  })

  // GSC-only: costo cero SIEMPRE; si la org no tiene consultas GSC el comando lo declara.
  record(
    'previewKeywordDiscovery GSC-only responde (costo 0 o invalid_seed honesto)',
    (preview.ok && preview.estimate.estimatedCostUsd === 0) || (!preview.ok && preview.errorCode === 'invalid_seed')
  )

  const read = await readKeywordDiscovery({ organizationId: targetRow.organization_id })

  record('readKeywordDiscovery lista corridas de la org', read.ok === true)

  const foreign = await readKeywordDiscovery({ organizationId: targetRow.organization_id, runId: 'seokdr-inexistente' })

  record('run inexistente/ajeno responde run_not_found (anti-oracle)', !foreign.ok && foreign.errorCode === 'run_not_found')

  // ── 7. SMOKE REAL CON GASTO (--spend) ─────────────────────────────────────

  if (SPEND) {
    console.log('\n— SMOKE REAL (gasta ~USD 0.03) —')

    // El transporte LANZA sin spend recorder: el import es parte del contrato.
    await import('@/lib/growth/seo/register-provider-spend')

    const { queueKeywordDiscovery } = await import('@/lib/growth/seo/keyword-discovery/queue')
    const { runKeywordDiscovery } = await import('@/lib/growth/seo/keyword-discovery/runner')

    const membersBefore = (
      await runGreenhousePostgresQuery<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_keyword_set_members`
      )
    )[0]?.n

    const queued = await queueKeywordDiscovery({
      organizationId: targetRow.organization_id,
      seoTargetId: targetRow.seo_target_id,
      seedSource: 'manual',
      manualSeeds: ['pintura'],
      methods: [{ method: 'keyword_suggestions', resultsPerCall: 10 }],
      actor: 'sanity-1664-smoke'
    })

    if (!queued.ok) {
      record(`smoke: enqueue falló (${queued.errorCode}/${queued.blockedReason ?? queued.reason ?? ''})`, false)
    } else if (queued.deduped) {
      // El mismo intent ya corrió (re-ejecución del sanity): la idempotencia es el resultado.
      record(`smoke: mismo intent devuelve la corrida existente ${queued.runId} SIN gastar (deduped)`, true)

      const attempt = await runKeywordDiscovery(queued.runId)

      record('smoke: el runner rechaza re-ejecutar una corrida ya cerrada (busy, cero llamadas)', !attempt.ok && attempt.errorCode === 'busy')

      const reread = await readKeywordDiscovery({ organizationId: targetRow.organization_id, runId: queued.runId })

      record(
        'smoke: el reader sirve la corrida histórica con sus candidatos y lente de mercado',
        reread.ok && reread.totalCandidates > 0 && reread.marketAvailability === 'available'
      )
    } else {
      record(`smoke: corrida encolada ${queued.runId} — estimado USD ${queued.estimatedCostUsd}`, true)
      console.log(`   fórmula: ${queued.formula}`)

      const result = await runKeywordDiscovery(queued.runId)

      if (!result.ok) {
        record(`smoke: runner falló (${result.errorCode})`, false)
      } else {
        record(
          `smoke: corrida ${result.status} — ${result.candidateCount} candidatos, ${result.providerCalls} llamadas, USD ${result.actualCostUsd}, ${result.marketRowsWritten} filas de mercado`,
          result.status === 'succeeded' || result.status === 'no_results'
        )
        record('smoke: el costo real quedó dentro del estimado', result.actualCostUsd <= queued.estimatedCostUsd)

        const ledger = await runGreenhousePostgresQuery<{ cost: string }>(
          `SELECT COALESCE(SUM(provider_cost_usd), 0)::text AS cost
             FROM greenhouse_growth.seo_provider_spend_daily
            WHERE organization_id = $1 AND family = 'labs' AND spend_date = CURRENT_DATE`,
          [targetRow.organization_id]
        )

        record(`smoke: ledger del día registra gasto labs (USD ${ledger[0]?.cost})`, Number(ledger[0]?.cost ?? 0) > 0)

        const reread = await readKeywordDiscovery({ organizationId: targetRow.organization_id, runId: queued.runId })

        record(
          'smoke: el reader compone candidatos con lente de mercado',
          reread.ok && reread.run?.status === result.status && reread.totalCandidates === result.candidateCount
        )

        const requeue = await queueKeywordDiscovery({
          organizationId: targetRow.organization_id,
          seoTargetId: targetRow.seo_target_id,
          seedSource: 'manual',
          manualSeeds: ['pintura'],
          methods: [{ method: 'keyword_suggestions', resultsPerCall: 10 }],
          actor: 'sanity-1664-smoke'
        })

        record('smoke: mismo intent re-encolado devuelve la MISMA corrida (deduped, USD 0)', requeue.ok && requeue.deduped && requeue.runId === queued.runId)
      }
    }

    const membersAfter = (
      await runGreenhousePostgresQuery<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_keyword_set_members`
      )
    )[0]?.n

    record('smoke: seo_keyword_set_members NO cambió (cero auto-track)', membersBefore === membersAfter)
  }

  const passed = checks.filter(([, ok]) => ok).length

  console.log(`\n${passed}/${checks.length} checks OK${SPEND ? ' (incluye smoke con gasto)' : ''}`)
  process.exit(process.exitCode ?? 0)
}

main().catch(error => {
  console.error('Sanity TASK-1664 reventó:', error)
  process.exit(1)
})
