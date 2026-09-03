/**
 * TASK-1805 — Sanity del expand/contract de metodología ETV contra PG REAL, sin dejar rastro.
 *
 * Corre con el proxy Cloud SQL arriba:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1805-etv-schema.ts
 *
 * Todo ocurre dentro de UNA transacción (una sola conexión) que termina en ROLLBACK deliberado —
 * incluida la aplicación del CONTRACT parqueado en docs/tasks/pending-migrations/, cuyo DDL es
 * transaccional en PostgreSQL. Así se prueba coexistencia y rechazo de duplicados con las constraints
 * finales SIN aplicarlas a la instancia compartida. Cero llamadas al proveedor.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const CUTOFF = '2026-11-01T00:00:00Z'
const SANITY_DOMAIN = 'task-1805-sanity.invalid'

class RollbackSentinel extends Error {}

type Client = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }> }

const main = async () => {
  const { withGreenhousePostgresTransaction, closeGreenhousePostgres } = await import('../../src/lib/postgres/client')

  let pass = 0
  let fail = 0

  const check = (label: string, ok: boolean, detail?: string) => {
    if (ok) pass += 1
    else fail += 1
    console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  }

  const expectError = async (label: string, run: () => Promise<unknown>, needle: string, client: Client) => {
    await client.query('SAVEPOINT sp')

    try {
      await run()
      check(label, false, 'no lanzó')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      check(label, message.includes(needle), message.slice(0, 160))
    } finally {
      await client.query('ROLLBACK TO SAVEPOINT sp')
    }
  }

  const insertOverview = (client: Client, values: Record<string, unknown>) =>
    client.query(
      `INSERT INTO greenhouse_growth.seo_domain_overview_snapshots
         (normalized_domain, domain, location_code, language_code, capture_date, source_endpoint,
          organic_etv, captured_at, captured_by_organization_id, provider_cost,
          etv_methodology_version, etv_methodology_evidence, etv_requested_at, etv_policy_version, etv_historical_basis)
       VALUES ($1, $1, '2152', 'es', $2, 'domain_rank_overview', $3, $4,
               (SELECT organization_id FROM greenhouse_core.organizations WHERE public_id = 'EO-ORG-0007'), 0,
               $5, $6, $7, $8, $9)
       ON CONFLICT ON CONSTRAINT seo_domain_overview_capture_method_unique DO NOTHING
       RETURNING domain_overview_id`,
      [
        SANITY_DOMAIN,
        values.captureDate,
        values.etv ?? 10,
        values.capturedAt ?? '2026-10-15T12:00:00Z',
        values.version,
        values.evidence,
        values.requestedAt ?? null,
        values.policy ?? null,
        values.basis ?? null
      ]
    )

  try {
    await withGreenhousePostgresTransaction(async rawClient => {
      const client = rawClient as unknown as Client

      // 1. Filas existentes: cada fila es legacy contractual (sin requested_at) O explícita completa
      //    (requested_at + policy). Un conteo duro (5/8/2) mentía apenas un writer/sanity escribió
      //    su primera fila explícita (TASK-1806 Slice 0, 2026-09-03): el invariante es la consistencia
      //    de la evidencia, no la foto del día del expand.
      for (const table of ['seo_domain_overview_snapshots', 'seo_url_visibility_snapshots', 'seo_prospect_diagnostics']) {
        const { rows } = await client.query(
          `SELECT count(*)::int AS total,
                  count(*) FILTER (WHERE etv_methodology_version = 'legacy_static_v1' AND etv_methodology_evidence = 'contract_default_pre_cutoff' AND etv_requested_at IS NULL)::int AS contractual,
                  count(*) FILTER (WHERE etv_methodology_evidence = 'explicit_request' AND etv_requested_at IS NOT NULL AND etv_policy_version IS NOT NULL)::int AS explicit
             FROM greenhouse_growth.${table}`
        )

        const row = rows[0] as { total: number; contractual: number; explicit: number }

        check(
          `${table}: toda fila es legacy contractual o explícita completa`,
          row.total === row.contractual + row.explicit,
          `contractual=${row.contractual} explicit=${row.explicit} total=${row.total}`
        )
      }

      // 2. Escritura explícita legacy pre-corte (writer nuevo) → inserta.
      const explicit = await insertOverview(client, {
        captureDate: '2026-10-15',
        version: 'legacy_static_v1',
        evidence: 'explicit_request',
        requestedAt: '2026-10-15T12:00:00Z',
        policy: 'etv-policy.v1'
      })

      check('explicit_request legacy pre-corte inserta', explicit.rowCount === 1)

      // 3. Mismo sujeto/mercado/fecha/método → DO NOTHING (idempotencia formula-aware).
      const dup = await insertOverview(client, {
        captureDate: '2026-10-15',
        version: 'legacy_static_v1',
        evidence: 'explicit_request',
        requestedAt: '2026-10-15T12:05:00Z',
        policy: 'etv-policy.v1'
      })

      check('duplicado del MISMO método → DO NOTHING', dup.rowCount === 0)

      // 4. Evidencia inconsistente → CHECK.
      await expectError(
        'explicit_request sin requested_at/policy → CHECK',
        () => insertOverview(client, { captureDate: '2026-10-16', version: 'legacy_static_v1', evidence: 'explicit_request' }),
        'etv_evidence_consistency_check',
        client
      )

      // 5. Guard de corte: evidencia contractual capturada desde el corte → rechazada.
      await expectError(
        'contract_default_pre_cutoff con captured_at >= corte → guard',
        () =>
          insertOverview(client, {
            captureDate: '2026-11-01',
            capturedAt: CUTOFF,
            version: 'legacy_static_v1',
            evidence: 'contract_default_pre_cutoff'
          }),
        'rechaza evidencia contractual',
        client
      )

      // 6. Guard de corte: legacy solicitado desde el corte → rechazado.
      await expectError(
        'legacy con etv_requested_at >= corte → guard',
        () =>
          insertOverview(client, {
            captureDate: '2026-11-01',
            capturedAt: '2026-11-01T00:00:01Z',
            version: 'legacy_static_v1',
            evidence: 'explicit_request',
            requestedAt: CUTOFF,
            policy: 'etv-policy.v1'
          }),
        'rechaza legacy solicitado',
        client
      )

      // 7. Base histórica sólo para improved.
      await expectError(
        'etv_historical_basis en fila legacy → CHECK',
        () =>
          insertOverview(client, {
            captureDate: '2026-10-17',
            version: 'legacy_static_v1',
            evidence: 'explicit_request',
            requestedAt: '2026-10-17T12:00:00Z',
            policy: 'etv-policy.v1',
            basis: 'fully_recomputed'
          }),
        'etv_historical_basis_check',
        client
      )

      // 8. Antes del contract, un segundo método el mismo día choca con la UNIQUE legacy (esperado).
      await expectError(
        'ANTES del contract: improved mismo día choca con UNIQUE legacy (coexistencia aún cerrada)',
        () =>
          insertOverview(client, {
            captureDate: '2026-10-15',
            version: 'improved_layout_clickstream_v2',
            evidence: 'explicit_request',
            requestedAt: '2026-10-15T12:10:00Z',
            policy: 'etv-policy.v1'
          }),
        'seo_domain_overview_capture_unique',
        client
      )

      // 9. Append-only intacto.
      await expectError(
        'UPDATE sigue bloqueado (append-only)',
        () => client.query(`UPDATE greenhouse_growth.seo_domain_overview_snapshots SET organic_etv = 1 WHERE normalized_domain = $1`, [SANITY_DOMAIN]),
        'append-only',
        client
      )

      // 10. Aplicar el CONTRACT dentro de la transacción y probar coexistencia real.
      const pending = await readFile(
        path.resolve(process.cwd(), 'docs/tasks/pending-migrations/TASK-1805-etv-methodology-contract.sql.pending'),
        'utf8'
      )

      const upSql = pending.split('-- Down Migration')[0].split('-- Up Migration')[1]

      await client.query(upSql)
      check('contract aplicado en la transacción (DDL transaccional)', true)

      const improved = await insertOverview(client, {
        captureDate: '2026-10-15',
        etv: 12,
        version: 'improved_layout_clickstream_v2',
        evidence: 'explicit_request',
        requestedAt: '2026-10-15T12:10:00Z',
        policy: 'etv-policy.v1',
        basis: 'fully_recomputed'
      })

      check('DESPUÉS del contract: improved coexiste con legacy el mismo día', improved.rowCount === 1)

      const improvedDup = await insertOverview(client, {
        captureDate: '2026-10-15',
        version: 'improved_layout_clickstream_v2',
        evidence: 'explicit_request',
        requestedAt: '2026-10-15T12:11:00Z',
        policy: 'etv-policy.v1',
        basis: 'fully_recomputed'
      })

      check('DESPUÉS del contract: duplicado improved → DO NOTHING', improvedDup.rowCount === 0)

      const { rows: coexist } = await client.query(
        `SELECT etv_methodology_version, organic_etv::float8 AS etv FROM greenhouse_growth.seo_domain_overview_snapshots
          WHERE normalized_domain = $1 AND capture_date = '2026-10-15' ORDER BY 1`,
        [SANITY_DOMAIN]
      )

      check('dos filas, una por método, mismo sujeto/mercado/fecha', coexist.length === 2, JSON.stringify(coexist))

      // 11. Tras el contract, un INSERT sin método (código viejo) DEBE fallar: ya no hay default.
      await expectError(
        'DESPUÉS del contract: INSERT sin método → NOT NULL (el default transitorio se fue)',
        () =>
          client.query(
            `INSERT INTO greenhouse_growth.seo_domain_overview_snapshots
               (normalized_domain, domain, location_code, language_code, capture_date, source_endpoint, captured_by_organization_id)
             VALUES ($1, $1, '2152', 'es', '2026-10-18', 'domain_rank_overview',
                     (SELECT organization_id FROM greenhouse_core.organizations WHERE public_id = 'EO-ORG-0007'))`,
            [SANITY_DOMAIN]
          ),
        'null value in column "etv_methodology_version"',
        client
      )

      // 12. Hecho ETV del prospecto sin metodología → CHECK (NOT VALID aplica a filas nuevas).
      await expectError(
        'DESPUÉS del contract: hecho estimated_monthly_traffic sin etvMethodologyVersion → CHECK',
        () =>
          client.query(
            `INSERT INTO greenhouse_growth.seo_prospect_diagnostic_facts (diagnostic_id, kind, magnitude, captured_at, source, detail_json)
             SELECT diagnostic_id, 'estimated_monthly_traffic', 1, now(), 'labs_ranked_keywords', '{"basis":"etv_sum_organic"}'::jsonb
               FROM greenhouse_growth.seo_prospect_diagnostics LIMIT 1`
          ),
        'seo_prospect_facts_etv_methodology_check',
        client
      )

      throw new RollbackSentinel('rollback deliberado')
    })
  } catch (error) {
    if (!(error instanceof RollbackSentinel)) throw error
  } finally {
    await closeGreenhousePostgres()
  }

  console.log(`\nTASK-1805 sanity: ${pass} ✅ / ${fail} ❌ (transacción revertida; la base quedó como estaba)`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
