import 'server-only'

/**
 * TASK-1848 — tick de la recurrencia (`ops-worker` `/insights/schedules/tick`, UN job de Cloud
 * Scheduler para todas las organizaciones; nunca uno por cliente).
 *
 * Por schedule activo:
 *   1. Revalida la AUTORIDAD durable con el acceso VIGENTE de quien lo activó (`session_360`: activo,
 *      internal, roles actuales) y la capability `insights.schedule.manage` + `insights.edition.create`
 *      + módulo `insights_v1`. Si algo falta, pausa el schedule con el motivo (no genera a nombre de nadie).
 *   2. Resuelve los últimos `catch_up_limit` períodos cerrados y consolidados (catch-up acotado: no
 *      hay tormenta histórica) posteriores a la activación.
 *   3. Una ocurrencia por (schedule, versión, período) — dos ticks no duplican — y su edición con
 *      idempotency key derivada de la ocurrencia (dos ticks ⇒ la misma edición).
 *   4. Pide el render de los outputs renderizables. La edición queda en revisión humana: V1 nunca
 *      emite ni envía.
 *
 * Además purga la retención del access log del reader público (§10).
 */

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { captureWithDomain } from '@/lib/observability/capture'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { assertInsightsAccess } from '../authz'
import { createInsightEdition } from '../commands/create-edition'
import { isInsightsError } from '../errors'
import { publishInsightScheduleChanged, publishInsightScheduleOccurrenceGenerated } from '../events'
import { isInsightsRenderEnabled, isInsightsSchedulesEnabled } from '../flags'
import { requestInsightRender } from '../render/commands'
import { INSIGHT_RENDERABLE_OUTPUTS } from '../render/contracts'
import { runInsightsQuery } from '../stores/db'
import { civilToday, formatCivilDate, resolveClosedInsightPeriods } from '../window'

import { buildScheduledInsightRequest } from './commands'
import {
  INSIGHT_SCHEDULE_MAX_OCCURRENCE_ATTEMPTS,
  INSIGHT_SCHEDULE_STALE_GENERATING_MINUTES,
  INSIGHT_SHARE_ACCESS_RETENTION_DAYS,
  insightScheduleEditionKey,
  type InsightSchedulePauseReason,
  type InsightScheduleRecord
} from './contracts'
import {
  claimInsightScheduleOccurrence,
  countRecentFailedOccurrences,
  ensureInsightScheduleOccurrence,
  finishInsightScheduleOccurrence,
  listActiveInsightSchedules,
  purgeInsightShareAccessData,
  transitionInsightSchedule
} from './store'

export interface InsightSchedulesTickResult {
  skipped?: 'flag_off'
  schedules: number
  generated: number
  failed: number
  paused: number
  retention: { accessEvents: number; rateBuckets: number } | null
}

/** Sujeto VIGENTE de la autoridad durable, desde la vista de sesión canónica (roles con su ciclo de vida). */
export const loadScheduleAuthoritySubject = async (userId: string): Promise<TenantEntitlementSubject | null> => {
  const rows = await runInsightsQuery<{ user_id: string; tenant_type: string; role_codes: string[] | null; route_groups: string[] | null; member_id: string | null; active: boolean; status: string }>(
    undefined,
    `SELECT user_id, tenant_type, role_codes, route_groups, member_id, active, status
       FROM greenhouse_serving.session_360
      WHERE user_id = $1
      LIMIT 1`,
    [userId]
  )

  const row = rows[0]

  if (!row || !row.active || row.status !== 'active' || row.tenant_type !== 'efeonce_internal') return null

  const roleCodes = row.role_codes ?? []

  return {
    userId: row.user_id,
    tenantType: 'efeonce_internal',
    roleCodes,
    primaryRoleCode: roleCodes[0] ?? '',
    routeGroups: row.route_groups ?? [],
    authorizedViews: [],
    ...(row.member_id ? { memberId: row.member_id } : {})
  }
}

const pauseSchedule = async (schedule: InsightScheduleRecord, reason: InsightSchedulePauseReason) => {
  await withGreenhousePostgresTransaction(async client => {
    const paused = await transitionInsightSchedule(client, { scheduleId: schedule.scheduleId, fromStates: ['active'], state: 'paused', pauseReason: reason })

    if (paused) {
      await publishInsightScheduleChanged(client, { version: 1, scheduleId: paused.scheduleId, organizationId: paused.organizationId, state: 'paused', scheduleVersion: paused.scheduleVersion, reason, actorKind: 'system' })
    }
  })
}

/** Revalida la autoridad; devuelve el sujeto o el motivo de pausa. */
const revalidateAuthority = async (schedule: InsightScheduleRecord): Promise<{ subject: TenantEntitlementSubject } | { pause: InsightSchedulePauseReason }> => {
  const subject = await loadScheduleAuthoritySubject(schedule.authorizedByUserId)

  if (!subject) return { pause: 'authority_revoked' }

  try {
    await assertInsightsAccess({ subject, actorOrganizationId: null, organizationId: schedule.organizationId, need: 'schedule_manage' })
    await assertInsightsAccess({ subject, actorOrganizationId: null, organizationId: schedule.organizationId, need: 'create' })
  } catch (error) {
    if (isInsightsError(error) && error.code === 'not_found') return { pause: 'module_unavailable' }
    if (isInsightsError(error) && error.code === 'forbidden') return { pause: 'authority_revoked' }

    throw error
  }

  return { subject }
}

const runOccurrence = async (
  schedule: InsightScheduleRecord,
  subject: TenantEntitlementSubject,
  period: { start: string; endExclusive: string },
  env: NodeJS.ProcessEnv
): Promise<'generated' | 'failed' | 'noop'> => {
  const occurrence = await ensureInsightScheduleOccurrence({
    scheduleId: schedule.scheduleId,
    scheduleVersion: schedule.scheduleVersion,
    organizationId: schedule.organizationId,
    periodStart: period.start,
    periodEndExclusive: period.endExclusive
  })

  const claimed = await claimInsightScheduleOccurrence(occurrence.occurrenceId, INSIGHT_SCHEDULE_STALE_GENERATING_MINUTES, INSIGHT_SCHEDULE_MAX_OCCURRENCE_ATTEMPTS)

  if (!claimed) return 'noop'

  const idempotencyKey = insightScheduleEditionKey(schedule.scheduleId, schedule.scheduleVersion, period.start)

  try {
    const created = await createInsightEdition({
      subject,
      actorOrganizationId: null,
      organizationId: schedule.organizationId,
      request: buildScheduledInsightRequest(schedule, period, idempotencyKey),
      env
    })

    let renderRunId: string | null = null
    const renderable = created.edition.outputs.filter(output => (INSIGHT_RENDERABLE_OUTPUTS as readonly string[]).includes(output))

    if (created.edition.state === 'ready_for_review' && renderable.length > 0 && isInsightsRenderEnabled(env)) {
      const render = await requestInsightRender({ subject, actorOrganizationId: null, organizationId: schedule.organizationId, editionId: created.edition.editionId, outputs: renderable, env })

      renderRunId = render.run.renderRunId
    }

    const failedGeneration = created.edition.state === 'failed'

    await finishInsightScheduleOccurrence({
      occurrenceId: claimed.occurrenceId,
      state: failedGeneration ? 'failed' : renderRunId ? 'render_requested' : 'generated',
      editionId: created.edition.editionId,
      renderRunId,
      failureCode: failedGeneration ? `generation_failed:${created.edition.failedPhase ?? 'unknown'}` : null
    })

    if (!failedGeneration) {
      await withGreenhousePostgresTransaction(client =>
        publishInsightScheduleOccurrenceGenerated(client, {
          version: 1,
          occurrenceId: claimed.occurrenceId,
          scheduleId: schedule.scheduleId,
          organizationId: schedule.organizationId,
          periodStart: period.start,
          periodEndExclusive: period.endExclusive,
          editionId: created.edition.editionId,
          renderRunId
        })
      )
    }

    return failedGeneration ? 'failed' : 'generated'
  } catch (error) {
    captureWithDomain(error, 'insights', { tags: { source: 'insights_schedule_occurrence' }, extra: { scheduleId: schedule.scheduleId, periodStart: period.start } })
    await finishInsightScheduleOccurrence({ occurrenceId: claimed.occurrenceId, state: 'failed', failureCode: isInsightsError(error) ? error.code : 'unexpected_error' })

    return 'failed'
  }
}

export const runInsightSchedulesTick = async (env: NodeJS.ProcessEnv = process.env, now: Date = new Date()): Promise<InsightSchedulesTickResult> => {
  const result: InsightSchedulesTickResult = { schedules: 0, generated: 0, failed: 0, paused: 0, retention: null }

  // La retención corre aunque la recurrencia esté apagada: es higiene del reader público, no producto.
  try {
    result.retention = await purgeInsightShareAccessData(INSIGHT_SHARE_ACCESS_RETENTION_DAYS)
  } catch (error) {
    captureWithDomain(error, 'insights', { tags: { source: 'insights_share_retention' } })
  }

  if (!isInsightsSchedulesEnabled(env)) return { ...result, skipped: 'flag_off' }

  const schedules = await listActiveInsightSchedules()

  for (const schedule of schedules) {
    result.schedules++

    try {
      const authority = await revalidateAuthority(schedule)

      if ('pause' in authority) {
        await pauseSchedule(schedule, authority.pause)
        result.paused++
        continue
      }

      const activatedOn = schedule.activatedAt ? formatCivilDate(civilToday(schedule.timeZone, new Date(schedule.activatedAt))) : null

      // Sólo períodos que cierran DESPUÉS de activar: activar no dispara ediciones retroactivas.
      const periods = resolveClosedInsightPeriods({
        cadence: schedule.cadence,
        timeZone: schedule.timeZone,
        consolidationDays: schedule.consolidationDays,
        count: schedule.catchUpLimit,
        now
      }).filter(period => !activatedOn || period.endExclusive > activatedOn)

      for (const period of periods) {
        const outcome = await runOccurrence(schedule, authority.subject, period, env)

        if (outcome === 'generated') result.generated++
        if (outcome === 'failed') result.failed++
      }

      // Tres fallos seguidos pausan: seguir generando borradores rotos sólo agrega ruido.
      if ((await countRecentFailedOccurrences(schedule.scheduleId, schedule.scheduleVersion)) >= 3) {
        await pauseSchedule(schedule, 'repeated_failures')
        result.paused++
      }
    } catch (error) {
      captureWithDomain(error, 'insights', { tags: { source: 'insights_schedules_tick' }, extra: { scheduleId: schedule.scheduleId } })
      result.failed++
    }
  }

  return result
}
