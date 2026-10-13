import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { applyGreenhousePostgresProfile } from '../../../../scripts/lib/load-greenhouse-tool-env'

import { isInsightOutputLiveIdentityViolation } from './contracts'

/**
 * Identidad VIVA de los outputs del render contra PostgreSQL REAL
 * (`pnpm test:live src/lib/efeonce-insights/render/render-identity`).
 *
 * Archivo propio porque aplica el Up de la migración del índice parcial DENTRO de una transacción
 * revertida, y eso es DDL: exige el perfil `ops` (dueño de las tablas), que debe fijarse ANTES de
 * que el pool singleton exista. Los demás live tests del render corren con el perfil runtime.
 *
 * Skipea sin DB: un `skipped` se ve verde — leer `passed` en el reporte.
 */

const hasLiveDb = Boolean(
  process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || process.env.GREENHOUSE_POSTGRES_HOST
)

class RollbackSentinel extends Error {}

describe.skipIf(!hasLiveDb)('Insights render — identidad viva de los outputs (PostgreSQL real, perfil ops)', () => {
  // Incidente 2026-10-04: un `dead_letter` bloqueaba para siempre su (org, edición, output, audiencia)
  // porque la UNIQUE era total. Se aplica el Up de la migración DENTRO de la transacción revertida
  // (idempotente: si ya está aplicada es no-op), así esto prueba el SQL real del índice parcial sin
  // mutar la instancia compartida. Usa el output `web` (no renderizable): no existe ninguna fila real
  // con esa identidad, así que el test no choca con outputs de producción.
  it('índice parcial: un dead_letter libera su identidad, y dos outputs VIVOS de la misma identidad chocan', async () => {
    applyGreenhousePostgresProfile('ops')

    const { withGreenhousePostgresTransaction } = await import('@/lib/postgres/client')
    const { findInsightOutputsForEdition, insertInsightRenderRun } = await import('./store')

    const migration = readFileSync(join(process.cwd(), 'migrations/20261004152040741_insights-outputs-live-identity-partial-unique.sql'), 'utf8')
    const up = migration.split('-- Down Migration')[0]!

    let failure: unknown = null

    try {
      await withGreenhousePostgresTransaction(async client => {
        await client.query(up)

        const indexes = await client.query<{ indexname: string; indexdef: string }>(
          `SELECT indexname, indexdef FROM pg_indexes
            WHERE schemaname = 'greenhouse_insights' AND tablename = 'insight_outputs' AND indexname LIKE 'insight_outputs_%identity_uq'`
        )

        expect(indexes.rows.map(r => r.indexname)).toEqual(['insight_outputs_live_identity_uq'])
        expect(indexes.rows[0]!.indexdef).toMatch(/WHERE/)

        const edition = await client.query<{ edition_id: string; organization_id: string; audience: 'client' | 'internal' }>(
          `SELECT edition_id, organization_id, audience FROM greenhouse_insights.insight_editions LIMIT 1`
        )

        if (!edition.rows[0]) throw new RollbackSentinel('sin ediciones en la base')

        const { edition_id: editionId, organization_id: organizationId, audience } = edition.rows[0]

        const enqueue = (supersedesOutputId: string | null) =>
          insertInsightRenderRun({
            client,
            organizationId,
            editionId,
            audience,
            requestedOutputs: ['web'],
            requestedByKind: 'member',
            requestedByUserId: 'user-agent-e2e-001',
            requestedByMemberId: null,
            outputs: [{ output: 'web', catalogName: 'insights-report', manifest: { input: { artifactId: editionId } }, manifestHash: 'e'.repeat(64), supersedesOutputId }]
          })

        const first = await enqueue(null)
        const deadId = first.outputs[0]!.insightOutputId

        // El primer encargo termina en dead_letter (fallo determinista, como el semantic_rejected de Berel).
        await client.query(
          `UPDATE greenhouse_insights.insight_outputs
              SET state = 'dead_letter', failure_code = 'semantic_rejected', failure_detail = 'test', finished_at = now()
            WHERE insight_output_id = $1`,
          [deadId]
        )

        // Re-encargar el mismo target YA NO choca (antes: unique violation ⇒ 500 internal_error).
        const second = await enqueue(deadId)
        const liveId = second.outputs[0]!.insightOutputId

        expect(liveId).not.toBe(deadId)
        expect(second.outputs[0]!.state).toBe('queued')

        // El historial nombra al output reemplazado; la fila muerta sigue intacta (append-only).
        const queuedEvent = await client.query<{ detail: { supersedes?: string } }>(
          `SELECT detail FROM greenhouse_insights.insight_render_events WHERE insight_output_id = $1 AND to_state = 'queued'`,
          [liveId]
        )

        expect(queuedEvent.rows[0]!.detail.supersedes).toBe(deadId)

        const both = await findInsightOutputsForEdition({ client, organizationId, editionId, audience })
        const webRows = both.filter(o => o.output === 'web')

        // Mismo `created_at` (una sola transacción ⇒ un solo now()): se compara como conjunto.
        expect(webRows.map(o => [o.insightOutputId, o.state]).sort()).toEqual([
          [liveId, 'queued'],
          [deadId, 'dead_letter']
        ].sort())

        // Un TERCER encargo mientras el segundo está vivo: el índice parcial lo frena, con SU nombre.
        await client.query('SAVEPOINT live_collision')

        const collision = await enqueue(null).then(
          () => null,
          (error: unknown) => error
        )

        await client.query('ROLLBACK TO SAVEPOINT live_collision')
        expect(collision).toMatchObject({ code: '23505', constraint: 'insight_outputs_live_identity_uq' })
        expect(isInsightOutputLiveIdentityViolation(collision)).toBe(true)

        // Y un dead_letter no puede "revivir" por un UPDATE suelto mientras otro vivo ocupa la identidad.
        await client.query('SAVEPOINT revive')

        const revive = await client
          .query(`UPDATE greenhouse_insights.insight_outputs SET state = 'queued', failure_code = NULL WHERE insight_output_id = $1`, [deadId])
          .then(
            () => null,
            (error: unknown) => error
          )

        await client.query('ROLLBACK TO SAVEPOINT revive')
        expect(revive).toMatchObject({ code: '23505', constraint: 'insight_outputs_live_identity_uq' })

        throw new RollbackSentinel('rollback')
      })
    } catch (error) {
      if (!(error instanceof RollbackSentinel)) failure = error
    }

    if (failure) throw failure
  })
})
