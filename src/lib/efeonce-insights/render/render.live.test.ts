import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { InsightRenderFenceLostError } from './contracts'

/**
 * TASK-1846 Slice 2 — lease + fencing contra PostgreSQL REAL
 * (`pnpm test:live src/lib/efeonce-insights/render`).
 *
 * Prueba el criterio de aceptación que ningún mock puede probar: "dos workers y un lease vencido
 * no crean dos outputs finales; el fencing impide la finalización vieja".
 *
 * Todo corre dentro de UNA transacción que se revierte (sentinel). Es obligatorio: las tablas son
 * append-only por trigger, así que un test que commitee no se puede limpiar con DELETE.
 *
 * Skipea sin DB: un `skipped` se ve verde — leer `passed` en el reporte.
 */

const hasLiveDb = Boolean(
  process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || process.env.GREENHOUSE_POSTGRES_HOST
)

class RollbackSentinel extends Error {}

describe.skipIf(!hasLiveDb)('TASK-1846 — lease y fencing del render (PostgreSQL real)', () => {
  it('un lease vencido permite reclamar, y la finalización vieja NO escribe', async () => {
    const { withGreenhousePostgresTransaction } = await import('@/lib/postgres/client')
    const { claimNextInsightOutputForExecution, markInsightOutputCompleted } = await import('./store')

    let failure: unknown = null

    try {
      await withGreenhousePostgresTransaction(async client => {
        // Se cuelga de una edición existente: crear una edición completa no es el objeto de prueba.
        const edition = await client.query<{ edition_id: string; organization_id: string }>(
          `SELECT edition_id, organization_id FROM greenhouse_insights.insight_editions LIMIT 1`
        )

        if (!edition.rows[0]) throw new RollbackSentinel('sin ediciones en la base: nada que probar')

        const { edition_id: editionId, organization_id: organizationId } = edition.rows[0]

        const run = await client.query<{ render_run_id: string }>(
          `INSERT INTO greenhouse_insights.insight_render_runs
             (organization_id, edition_id, audience, requested_outputs, requested_by_kind)
           VALUES ($1, $2, 'internal', '["deck_pdf"]'::jsonb, 'system')
           RETURNING render_run_id`,
          [organizationId, editionId]
        )

        const renderRunId = run.rows[0]!.render_run_id

        const output = await client.query<{ insight_output_id: string }>(
          `INSERT INTO greenhouse_insights.insight_outputs
             (render_run_id, organization_id, edition_id, output, audience, catalog_name,
              manifest, manifest_hash)
           VALUES ($1, $2, $3, 'deck_pdf', 'internal', 'deck-axis', '{}'::jsonb, $4)
           RETURNING insight_output_id`,
          [renderRunId, organizationId, editionId, 'a'.repeat(64)]
        )

        const outputId = output.rows[0]!.insight_output_id

        // ── Worker A reclama ──────────────────────────────────────────────────────────────────
        const claimA = await claimNextInsightOutputForExecution({ client })

        expect(claimA).not.toBeNull()
        // Si esto falla, la cola tenía otra fila: el test estaría probando un output ajeno.
        expect(claimA!.insightOutputId).toBe(outputId)
        expect(claimA!.state).toBe('running')
        expect(claimA!.fenceToken).toBe(1)
        expect(claimA!.leaseExpiresAt).not.toBeNull()

        // ── El lease de A vence (worker vivo pero colgado) ────────────────────────────────────
        await client.query(
          `UPDATE greenhouse_insights.insight_outputs
              SET lease_expires_at = now() - interval '1 minute'
            WHERE insight_output_id = $1`,
          [outputId]
        )

        // ── Worker B reclama la MISMA fila y el fence sube ────────────────────────────────────
        const claimB = await claimNextInsightOutputForExecution({ client })

        expect(claimB).not.toBeNull()
        expect(claimB!.insightOutputId).toBe(outputId)
        expect(claimB!.fenceToken).toBe(2)

        // ── A termina tarde y quiere finalizar con su fence viejo ─────────────────────────────
        await expect(
          markInsightOutputCompleted({
            client,
            insightOutputId: outputId,
            fenceToken: claimA!.fenceToken,
            outputAssetId: `asset-${randomUUID()}`,
            outputReport: { by: 'worker-A-desfasado' }
          })
        ).rejects.toBeInstanceOf(InsightRenderFenceLostError)

        // Y no escribió NADA: sigue running, sin asset.
        const after = await client.query<{ state: string; output_asset_id: string | null }>(
          `SELECT state, output_asset_id FROM greenhouse_insights.insight_outputs
            WHERE insight_output_id = $1`,
          [outputId]
        )

        expect(after.rows[0]!.state).toBe('running')
        expect(after.rows[0]!.output_asset_id).toBeNull()

        // ── B sí puede finalizar: UN solo output final ────────────────────────────────────────
        const completed = await markInsightOutputCompleted({
          client,
          insightOutputId: outputId,
          fenceToken: claimB!.fenceToken,
          outputAssetId: `asset-${randomUUID()}`,
          outputReport: { by: 'worker-B' }
        })

        expect(completed.state).toBe('completed')
        expect(completed.outputAssetId).not.toBeNull()

        throw new RollbackSentinel('rollback')
      })
    } catch (error) {
      if (!(error instanceof RollbackSentinel)) failure = error
    }

    if (failure) throw failure
  })
})
