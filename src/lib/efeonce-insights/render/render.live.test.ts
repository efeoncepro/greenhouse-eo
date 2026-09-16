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

  it('el retry re-encola SOLO los fallidos y la cancelación no miente sobre lo que ya corre', async () => {
    const { withGreenhousePostgresTransaction } = await import('@/lib/postgres/client')
    const { cancelInsightRenderRun, retryFailedInsightOutputs } = await import('./store')

    let failure: unknown = null

    try {
      await withGreenhousePostgresTransaction(async client => {
        const edition = await client.query<{ edition_id: string; organization_id: string }>(
          `SELECT edition_id, organization_id FROM greenhouse_insights.insight_editions LIMIT 1`
        )

        if (!edition.rows[0]) throw new RollbackSentinel('sin ediciones en la base')

        const { edition_id: editionId, organization_id: organizationId } = edition.rows[0]

        const run = await client.query<{ render_run_id: string }>(
          `INSERT INTO greenhouse_insights.insight_render_runs
             (organization_id, edition_id, audience, requested_outputs, requested_by_kind)
           VALUES ($1, $2, 'internal', '["deck_pdf","report_pdf","web"]'::jsonb, 'system')
           RETURNING render_run_id`,
          [organizationId, editionId]
        )

        const renderRunId = run.rows[0]!.render_run_id

        // Tres outputs en los tres estados que importan: uno exitoso, uno fallido, uno corriendo.
        const mk = async (output: string, state: string, extraCols: string, params: unknown[]) => {
          const r = await client.query<{ insight_output_id: string }>(
            `INSERT INTO greenhouse_insights.insight_outputs
               (render_run_id, organization_id, edition_id, output, audience, catalog_name,
                manifest, manifest_hash, state${extraCols ? ', ' + extraCols : ''})
             VALUES ($1, $2, $3, $4, 'internal', 'deck-axis', '{}'::jsonb, $5, $6${
               params.length ? ', ' + params.map((_, i) => `$${7 + i}`).join(', ') : ''
             })
             RETURNING insight_output_id`,
            [renderRunId, organizationId, editionId, output, 'b'.repeat(64), state, ...params]
          )

          return r.rows[0]!.insight_output_id
        }

        const okId = await mk('deck_pdf', 'completed', 'output_asset_id', ['asset-ok'])
        const failedId = await mk('report_pdf', 'failed', 'failure_code', ['render_error'])
        const runningId = await mk('web', 'running', 'lease_expires_at', [new Date(Date.now() + 600_000)])

        // ── Retry: sólo el fallido vuelve a la cola ───────────────────────────────────────────
        const requeued = await retryFailedInsightOutputs({ organizationId, renderRunId, client })

        expect(requeued).toHaveLength(1)
        expect(requeued[0]!.insightOutputId).toBe(failedId)
        expect(requeued[0]!.state).toBe('queued')

        // El retry reusa la fila: no hay una segunda para el mismo target.
        const countReport = await client.query<{ n: string }>(
          `SELECT count(*)::text AS n FROM greenhouse_insights.insight_outputs
            WHERE render_run_id = $1 AND output = 'report_pdf'`,
          [renderRunId]
        )

        expect(countReport.rows[0]!.n).toBe('1')

        // El exitoso NO se tocó.
        const okAfter = await client.query<{ state: string }>(
          `SELECT state FROM greenhouse_insights.insight_outputs WHERE insight_output_id = $1`,
          [okId]
        )

        expect(okAfter.rows[0]!.state).toBe('completed')

        // ── Cancelación: cancela lo pendiente, NO miente sobre lo que corre ───────────────────
        const cancel = await cancelInsightRenderRun({ organizationId, renderRunId, client })

        expect(cancel.cancelled).toBe(1) // el que acabábamos de re-encolar
        expect(cancel.stillRunning).toBe(1) // el 'web' sigue corriendo: no podemos matar al worker

        const runningAfter = await client.query<{ state: string }>(
          `SELECT state FROM greenhouse_insights.insight_outputs WHERE insight_output_id = $1`,
          [runningId]
        )

        expect(runningAfter.rows[0]!.state).toBe('running')

        // Con algo todavía corriendo, el run NO se declara cancelado: sería mentir.
        const runAfter = await client.query<{ state: string }>(
          `SELECT state FROM greenhouse_insights.insight_render_runs WHERE render_run_id = $1`,
          [renderRunId]
        )

        expect(runAfter.rows[0]!.state).not.toBe('cancelled')

        throw new RollbackSentinel('rollback')
      })
    } catch (error) {
      if (!(error instanceof RollbackSentinel)) failure = error
    }

    if (failure) throw failure
  })

  it('la señal de huérfanos ejecuta su SQL contra PostgreSQL real y reporta steady 0', async () => {
    // El SQL de una señal sólo se prueba corriéndolo: un mock valida el TS, no el SQL.
    const { getInsightsRenderOrphanedSignal, INSIGHTS_RENDER_ORPHANED_SIGNAL_ID } = await import(
      '@/lib/reliability/queries/insights-render-orphaned'
    )

    const signal = await getInsightsRenderOrphanedSignal()

    expect(signal.signalId).toBe(INSIGHTS_RENDER_ORPHANED_SIGNAL_ID)
    expect(signal.moduleKey).toBe('insights')
    // Steady esperado hoy: nada huérfano. Si esto falla, hay outputs que nadie va a retomar.
    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('drena')
  })

  it('encolado: insertInsightRenderRun + findInsightOutputsForEdition + listInsightRenderRuns ejecutan su SQL contra PG real', async () => {
    const { withGreenhousePostgresTransaction } = await import('@/lib/postgres/client')
    const { findInsightOutputsForEdition, insertInsightRenderRun, listInsightRenderRuns } = await import('./store')

    let failure: unknown = null

    try {
      await withGreenhousePostgresTransaction(async client => {
        const edition = await client.query<{ edition_id: string; organization_id: string; audience: 'client' | 'internal' }>(
          `SELECT edition_id, organization_id, audience FROM greenhouse_insights.insight_editions LIMIT 1`
        )

        if (!edition.rows[0]) throw new RollbackSentinel('sin ediciones en la base')

        const { edition_id: editionId, organization_id: organizationId, audience } = edition.rows[0]

        const inserted = await insertInsightRenderRun({
          client,
          organizationId,
          editionId,
          audience,
          requestedOutputs: ['deck_pdf'],
          requestedByKind: 'system',
          requestedByUserId: null,
          requestedByMemberId: null,
          outputs: [{ output: 'deck_pdf', catalogName: 'deck-axis', manifest: { input: { artifactId: editionId, slides: [] } }, manifestHash: 'd'.repeat(64) }]
        })

        expect(inserted.run.state).toBe('pending')
        expect(inserted.outputs).toHaveLength(1)
        expect(inserted.outputs[0]!.state).toBe('queued')
        expect(inserted.outputs[0]!.fenceToken).toBe(0)

        const found = await findInsightOutputsForEdition({ client, organizationId, editionId, audience })

        expect(found.map(o => o.insightOutputId)).toContain(inserted.outputs[0]!.insightOutputId)
        // La OTRA audiencia no ve este output: la audiencia es parte de la identidad.
        const other = await findInsightOutputsForEdition({ client, organizationId, editionId, audience: audience === 'client' ? 'internal' : 'client' })

        expect(other.map(o => o.insightOutputId)).not.toContain(inserted.outputs[0]!.insightOutputId)

        const listed = await listInsightRenderRuns({ client, organizationId, editionId, limit: 10, offset: 0 })

        expect(listed.items.map(r => r.renderRunId)).toContain(inserted.run.renderRunId)
        expect(listed.total).toBeGreaterThanOrEqual(1)

        throw new RollbackSentinel('rollback')
      })
    } catch (error) {
      if (!(error instanceof RollbackSentinel)) failure = error
    }

    if (failure) throw failure
  })
})
