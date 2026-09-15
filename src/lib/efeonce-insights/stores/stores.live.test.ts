import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import type { InsightRequestV1 } from '../contracts/request'
import type { InsightActor } from '../contracts/states'
import { InsightsHumanGateError } from '../errors'
import { hashCanonical } from '../request-hash'

/**
 * TASK-1845 — stores contra PostgreSQL REAL (`pnpm test:live src/lib/efeonce-insights`).
 *
 * Todo corre dentro de UNA transacción que se revierte al final (sentinel): dos organizaciones
 * sintéticas, reportes, ediciones, snapshot sellado, plan congelado y los negativos que sólo la
 * DB puede probar (triggers de inmutabilidad, matriz de estados, aislamiento por org,
 * idempotencia, código legible sin truncado). Los mocks no ven nada de esto.
 *
 * Skipea sin DB (CI sin proxy): un `skipped` se ve verde — leer `passed` en el reporte.
 */

const hasLiveDb = Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || process.env.GREENHOUSE_POSTGRES_HOST)

class RollbackSentinel extends Error {}

const ACTOR_MEMBER: InsightActor = { kind: 'member', userId: 'live-user-insights-a', memberId: null }
const ACTOR_SYSTEM: InsightActor = { kind: 'system', userId: null, memberId: null }

const buildRequest = (organizationId: string, key: string): InsightRequestV1 => ({
  requestVersion: 'insight_request_v1',
  organizationId,
  modules: ['seo'],
  period: { start: '2026-08-01', endExclusive: '2026-09-01', timeZone: 'America/Santiago' },
  comparison: { kind: 'previous_period' },
  audience: 'client',
  locale: 'es-CL',
  depth: 'standard',
  outputs: ['report_pdf'],
  brand: { efeoncePackVersion: 'axis-1' },
  idempotencyKey: key
})

describe.runIf(hasLiveDb)('TASK-1845 — Insights stores (live DB, tx revertida)', () => {
  it('report/edition/snapshot/plan respetan ownership, inmutabilidad, matriz e idempotencia', async () => {
    const { withGreenhousePostgresTransaction } = await import('@/lib/postgres/client')
    const stores = await import('./index')

    const suffix = randomUUID().slice(0, 8)
    const orgA = `live-insights-org-a-${suffix}`
    const orgB = `live-insights-org-b-${suffix}`

    const expectPgError = async (client: { query: (sql: string, params?: unknown[]) => Promise<unknown> }, run: () => Promise<unknown>, pattern: RegExp) => {
      await client.query('SAVEPOINT neg')
      await expect(run()).rejects.toThrow(pattern)
      await client.query('ROLLBACK TO SAVEPOINT neg')
    }

    let failure: unknown = null

    await withGreenhousePostgresTransaction(async client => {
      try {
        for (const org of [orgA, orgB]) {
          await client.query(
            `INSERT INTO greenhouse_core.organizations (organization_id, organization_name, organization_type, origin)
             VALUES ($1, $2, 'client', 'manual')`,
            [org, `Live Insights ${org}`]
          )
        }

        // ── Reporte: código legible asignado por la DB, único y sin truncado ─────────────────
        const reportA = await stores.insertInsightReport(client, { organizationId: orgA, title: 'Informe SEO agosto', purpose: 'Seguimiento mensual', actor: ACTOR_MEMBER })
        const reportA2 = await stores.insertInsightReport(client, { organizationId: orgA, title: 'Segundo informe', purpose: 'Seguimiento mensual', actor: ACTOR_SYSTEM })
        const reportB = await stores.insertInsightReport(client, { organizationId: orgB, title: 'Informe de otra org', purpose: 'Aislamiento', actor: ACTOR_MEMBER })

        expect(reportA.reportCode).toMatch(/^EO-INS-\d{6,}$/)
        expect(reportA.reportCode).not.toBe(reportA2.reportCode)
        expect(await stores.getInsightReportById(client, orgB, reportA.reportId)).toBeNull()
        expect(await stores.getInsightReportByCode(client, orgA, reportA.reportCode)).not.toBeNull()
        expect((await stores.listInsightReports(client, { organizationId: orgA, limit: 10, offset: 0 })).total).toBe(2)

        await expectPgError(client, () => client.query(`UPDATE greenhouse_insights.insight_reports SET organization_id = $1 WHERE report_id = $2`, [orgB, reportA.reportId]), /inmutables/)
        // Con el runtime (sin DELETE) el grant corta antes que el trigger; con ops/migrator responde el trigger.
        await expectPgError(client, () => client.query(`DELETE FROM greenhouse_insights.insight_reports WHERE report_id = $1`, [reportA.reportId]), /append-only|permission denied/)

        // ── Edición: versión bajo lock, idempotencia, org heredada del reporte ──────────────
        const request = buildRequest(orgA, `live-key-${suffix}`)

        const base = {
          reportId: reportA.reportId,
          organizationId: orgA,
          audience: 'client' as const,
          request,
          requestHash: hashCanonical(request),
          idempotencyKey: request.idempotencyKey ?? null,
          modules: ['seo'],
          outputs: ['report_pdf'],
          periodTimeZone: 'America/Santiago',
          periodStartUtc: '2026-08-01T04:00:00.000Z',
          periodEndUtc: '2026-09-01T04:00:00.000Z',
          supersedesEditionId: null,
          actor: ACTOR_MEMBER
        }

        await stores.lockInsightReport(client, orgA, reportA.reportId)
        const edition1 = await stores.insertInsightEdition(client, base)
        const edition2 = await stores.insertInsightEdition(client, { ...base, idempotencyKey: null, supersedesEditionId: edition1.editionId })

        expect(edition1.version).toBe(1)
        expect(edition2.version).toBe(2)
        expect(edition1.state).toBe('draft')
        expect(await stores.findInsightEditionByIdempotencyKey(client, orgA, request.idempotencyKey!)).toMatchObject({ editionId: edition1.editionId })
        expect(await stores.findInsightEditionByIdempotencyKey(client, orgB, request.idempotencyKey!)).toBeNull()
        expect(await stores.getInsightEditionById(client, orgB, edition1.editionId)).toBeNull()

        await expectPgError(client, () => stores.insertInsightEdition(client, base), /insight_editions_idempotency_unique/)
        await expectPgError(client, () => stores.insertInsightEdition(client, { ...base, idempotencyKey: null, organizationId: orgB }), /no coincide con la del reporte/)
        await expectPgError(client, () => stores.insertInsightEdition(client, { ...base, idempotencyKey: null, reportId: reportB.reportId, organizationId: orgB, supersedesEditionId: edition1.editionId }), /mismo reporte/)

        // ── Ciclo de vida: matriz + gate humano + historial append-only ─────────────────────
        const collecting = await stores.transitionInsightEditionState(client, { organizationId: orgA, editionId: edition1.editionId, toState: 'collecting', actor: ACTOR_SYSTEM, reason: 'inicia recolección' })

        expect(collecting.edition.state).toBe('collecting')
        expect(collecting.idempotent).toBe(false)

        const again = await stores.transitionInsightEditionState(client, { organizationId: orgA, editionId: edition1.editionId, toState: 'collecting', actor: ACTOR_SYSTEM, reason: 'reintento del mismo paso' })

        expect(again.idempotent).toBe(true)
        expect(again.transition.transitionId).toBe(collecting.transition.transitionId)

        const failed = await stores.transitionInsightEditionState(client, { organizationId: orgA, editionId: edition1.editionId, toState: 'failed', actor: ACTOR_SYSTEM, reason: 'reader caído' })

        expect(failed.edition.failedPhase).toBe('collecting')

        const recovered = await stores.transitionInsightEditionState(client, { organizationId: orgA, editionId: edition1.editionId, toState: 'collecting', actor: ACTOR_SYSTEM, reason: 'recuperación por fase' })

        expect(recovered.edition.failedPhase).toBeNull()
        expect(recovered.transition.metadata.recoveryPhase).toBe('collecting')

        await stores.transitionInsightEditionState(client, { organizationId: orgA, editionId: edition1.editionId, toState: 'composing', actor: ACTOR_SYSTEM, reason: 'evidencia lista' })
        await stores.transitionInsightEditionState(client, { organizationId: orgA, editionId: edition1.editionId, toState: 'validating', actor: ACTOR_SYSTEM, reason: 'plan listo' })
        await stores.transitionInsightEditionState(client, { organizationId: orgA, editionId: edition1.editionId, toState: 'ready_for_review', actor: ACTOR_SYSTEM, reason: 'validación ok', patch: { reviewOwnerUserId: 'live-reviewer' } })

        await expect(
          stores.transitionInsightEditionState(client, { organizationId: orgA, editionId: edition1.editionId, toState: 'issued', actor: ACTOR_SYSTEM, reason: 'sistema intenta emitir', patch: { issued: { byUserId: 'x', hash: 'a'.repeat(64) } } })
        ).rejects.toBeInstanceOf(InsightsHumanGateError)

        // La DB también defiende la matriz aunque el TS se salte.
        await expectPgError(client, () => client.query(`UPDATE greenhouse_insights.insight_editions SET state = 'issued', issued_at = now(), issued_by_user_id = 'x', issued_hash = $2 WHERE edition_id = $1 AND false OR edition_id = $1 AND state = 'draft'`, [edition2.editionId, 'b'.repeat(64)]), /Transición de estado ilegal/)

        const issued = await stores.transitionInsightEditionState(client, { organizationId: orgA, editionId: edition1.editionId, toState: 'issued', actor: ACTOR_MEMBER, reason: 'aprobación humana', patch: { issued: { byUserId: ACTOR_MEMBER.userId!, hash: 'c'.repeat(64) } } })

        expect(issued.edition.issuedHash).toBe('c'.repeat(64))
        expect(issued.transition.requiresHumanGate).toBe(true)

        await expectPgError(client, () => client.query(`UPDATE greenhouse_insights.insight_editions SET issued_hash = $2 WHERE edition_id = $1`, [edition1.editionId, 'd'.repeat(64)]), /issued_\* es inmutable/)
        await expectPgError(client, () => client.query(`UPDATE greenhouse_insights.insight_editions SET review_owner_user_id = 'otro' WHERE edition_id = $1`, [edition1.editionId]), /no muta/)
        await expectPgError(client, () => client.query(`UPDATE greenhouse_insights.insight_edition_transitions SET reason = 'x' WHERE edition_id = $1`, [edition1.editionId]), /append-only|permission denied/)
        await expectPgError(client, () => client.query(`DELETE FROM greenhouse_insights.insight_editions WHERE edition_id = $1`, [edition1.editionId]), /append-only|permission denied/)

        const history = await stores.listInsightEditionTransitions(client, orgA, edition1.editionId)

        expect(history.map(row => row.toState)).toEqual(['collecting', 'failed', 'collecting', 'composing', 'validating', 'ready_for_review', 'issued'])
        expect((await stores.listInsightEditions(client, { organizationId: orgA, states: ['issued'], limit: 10, offset: 0 })).total).toBe(1)
        expect((await stores.listInsightEditions(client, { organizationId: orgB, limit: 10, offset: 0 })).total).toBe(0)

        // ── Snapshot: sellado inmutable; plan sólo sobre snapshot SELLADO; congelado inmutable ─
        const snapshot = await stores.upsertInsightEvidenceSnapshot(client, {
          organizationId: orgA,
          editionId: edition2.editionId,
          content: {
            facts: [],
            sources: [{ module: 'seo', adapterVersion: 'seo_adapter_v1', reader: 'readSeoOverviewKpis', asOf: '2026-08-31', method: { name: 'gsc', version: 'seo_measurement_v1' }, coverage: { kind: 'complete', ratio: 1, populationSize: null }, servedWindow: null }],
            rejections: []
          }
        })

        await expectPgError(client, () => stores.upsertInsightEditorialPlan(client, { organizationId: orgA, editionId: edition2.editionId, snapshotId: snapshot.snapshotId, plan: emptyPlan(), provenance: { mode: 'deterministic', modelId: null, promptVersion: null, usage: {} } }), /SELLADO/)

        const sealed = await stores.sealInsightEvidenceSnapshot(client, { organizationId: orgA, snapshotId: snapshot.snapshotId })

        expect(sealed.snapshotHash).toMatch(/^[0-9a-f]{64}$/)
        expect(sealed.asOfMax).toBe('2026-08-31T00:00:00.000Z')
        expect((await stores.sealInsightEvidenceSnapshot(client, { organizationId: orgA, snapshotId: snapshot.snapshotId })).snapshotHash).toBe(sealed.snapshotHash)
        await expect(stores.upsertInsightEvidenceSnapshot(client, { organizationId: orgA, editionId: edition2.editionId, content: { facts: [], sources: [], rejections: [] } })).rejects.toThrow(/sellado/)
        await expectPgError(client, () => client.query(`UPDATE greenhouse_insights.insight_evidence_snapshots SET facts_json = '[{}]'::jsonb WHERE snapshot_id = $1`, [snapshot.snapshotId]), /sellado y es inmutable/)

        const plan = await stores.upsertInsightEditorialPlan(client, { organizationId: orgA, editionId: edition2.editionId, snapshotId: snapshot.snapshotId, plan: emptyPlan(), provenance: { mode: 'deterministic', modelId: null, promptVersion: null, usage: {} } })
        const frozen = await stores.freezeInsightEditorialPlan(client, { organizationId: orgA, planId: plan.planId })

        expect(frozen.planHash).toBe(hashCanonical(emptyPlan()))
        await expect(stores.upsertInsightEditorialPlan(client, { organizationId: orgA, editionId: edition2.editionId, snapshotId: snapshot.snapshotId, plan: emptyPlan(), provenance: { mode: 'deterministic', modelId: null, promptVersion: null, usage: {} } })).rejects.toThrow(/congelado/)
        await expectPgError(client, () => client.query(`INSERT INTO greenhouse_insights.insight_editorial_plans (edition_id, organization_id, snapshot_id, plan_json, authoring_mode, model_id) VALUES ($1, $2, $3, '{}', 'ai_bounded', 'gemini')`, [edition1.editionId, orgA, snapshot.snapshotId]), /insight_plans_ai_provenance|otra edición/)
        expect(await stores.getInsightEditorialPlanByEdition(client, orgB, edition2.editionId)).toBeNull()
        expect(await stores.getInsightEvidenceSnapshotByEdition(client, orgA, edition2.editionId)).toMatchObject({ sealedAt: expect.any(String) })
      } catch (error) {
        failure = error
      }

      // Siempre revertir: la base es compartida (dev/staging/prod) y nada de esto debe persistir.
      throw new RollbackSentinel('rollback')
    }).catch(error => {
      if (!(error instanceof RollbackSentinel)) failure = error
    })

    if (failure) throw failure
  }, 60_000)
})

const emptyPlan = () => ({
  planVersion: 'editorial_plan_v1' as const,
  locale: 'es-CL',
  executiveSummary: [],
  chapters: [],
  actions: [],
  limits: [],
  methodology: [],
  references: []
})
