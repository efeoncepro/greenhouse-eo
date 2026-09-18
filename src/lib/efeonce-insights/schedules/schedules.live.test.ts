import { describe, expect, it } from 'vitest'

/**
 * TASK-1848 Slice 3 — recurrencia contra PostgreSQL REAL (`pnpm test:live src/lib/efeonce-insights/schedules`).
 *
 * Lo que ningún mock prueba: la ocurrencia ÚNICA por (schedule, versión, período) ante dos ticks, el
 * claim atómico (sólo un tick genera), la recuperación de una ocurrencia `generating` caída, el CHECK
 * que sólo admite `draft_for_review` y el trigger que impide reactivar un schedule retirado.
 * Todo dentro de UNA transacción que se revierte (sentinel).
 */

const hasLiveDb = Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || process.env.GREENHOUSE_POSTGRES_HOST)

class RollbackSentinel extends Error {}

describe.skipIf(!hasLiveDb)('TASK-1848 — recurrencia (PostgreSQL real)', () => {
  it('ocurrencia única ante doble tick, claim único, recuperación de caída y retiro terminal', async () => {
    const { withGreenhousePostgresTransaction } = await import('@/lib/postgres/client')
    const store = await import('./store')

    let failure: unknown = null

    try {
      await withGreenhousePostgresTransaction(async client => {
        const org = await client.query<{ organization_id: string }>(`SELECT organization_id FROM greenhouse_insights.insight_editions ORDER BY created_at DESC LIMIT 1`)

        if (!org.rows[0]) throw new RollbackSentinel('sin ediciones en la base: nada que probar')

        const organizationId = org.rows[0].organization_id

        const schedule = await store.insertInsightSchedule(client, {
          organizationId, label: 'Live test mensual', cadence: 'monthly', timeZone: 'America/Santiago', consolidationDays: 3, catchUpLimit: 1,
          requestTemplate: { modules: ['seo'] }, authorizedByActorKind: 'member', authorizedByUserId: 'live-user'
        })

        expect(schedule).toMatchObject({ state: 'draft', reviewPolicy: 'draft_for_review', scheduleVersion: 1 })

        const period = { scheduleId: schedule.scheduleId, scheduleVersion: 1, organizationId, periodStart: '2026-08-01', periodEndExclusive: '2026-09-01' }
        const first = await store.ensureInsightScheduleOccurrence(period, client)
        const second = await store.ensureInsightScheduleOccurrence(period, client)

        expect(second.occurrenceId).toBe(first.occurrenceId)

        const count = await client.query<{ n: string }>(`SELECT count(*)::text AS n FROM greenhouse_insights.insight_schedule_occurrences WHERE schedule_id = $1`, [schedule.scheduleId])

        expect(count.rows[0]!.n).toBe('1')

        const claimA = await store.claimInsightScheduleOccurrence(first.occurrenceId, 30, 3, client)
        const claimB = await store.claimInsightScheduleOccurrence(first.occurrenceId, 30, 3, client)

        expect(claimA?.state).toBe('generating')
        expect(claimB).toBeNull()

        // Un tick que murió generando: pasado el umbral, la ocurrencia se recupera (misma key ⇒ misma edición).
        await client.query(`UPDATE greenhouse_insights.insight_schedule_occurrences SET updated_at = now() - interval '2 hours' WHERE occurrence_id = $1`, [first.occurrenceId])
        expect((await store.claimInsightScheduleOccurrence(first.occurrenceId, 30, 3, client))?.attempts).toBe(2)

        // Sólo draft_for_review: autoemitir no existe en V1.
        await client.query('SAVEPOINT auto_issue')
        await expect(client.query(`UPDATE greenhouse_insights.insight_schedules SET review_policy = 'auto_issue' WHERE schedule_id = $1`, [schedule.scheduleId])).rejects.toThrow()
        await client.query('ROLLBACK TO SAVEPOINT auto_issue')

        const active = await store.transitionInsightSchedule(client, { scheduleId: schedule.scheduleId, fromStates: ['draft'], state: 'active' })

        expect(active?.activatedAt).not.toBeNull()

        const retired = await store.transitionInsightSchedule(client, { scheduleId: schedule.scheduleId, fromStates: ['active'], state: 'retired' })

        expect(retired?.state).toBe('retired')

        await client.query('SAVEPOINT resurrect')
        await expect(client.query(`UPDATE greenhouse_insights.insight_schedules SET state = 'active' WHERE schedule_id = $1`, [schedule.scheduleId])).rejects.toThrow(/no se reactiva/)
        await client.query('ROLLBACK TO SAVEPOINT resurrect')

        throw new RollbackSentinel('ok')
      })
    } catch (error) {
      failure = error
    }

    if (!(failure instanceof RollbackSentinel)) throw failure
    if (failure.message !== 'ok') console.warn(`[live] ${failure.message}`)
  })
})
