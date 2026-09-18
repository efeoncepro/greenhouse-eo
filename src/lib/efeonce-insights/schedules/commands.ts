import 'server-only'

/**
 * TASK-1848 — commands de la recurrencia de Insights (arquitectura §9).
 *
 * Autoridad: `insights.schedule.manage` (interna). La persona que ACTIVA el schedule es su autoridad
 * durable: cada ocurrencia se genera con SU acceso vigente, revalidado en el tick (`tick.ts`). Si
 * pierde el acceso o el módulo se retira, el schedule se pausa solo — nunca sigue a nombre de nadie.
 *
 * La plantilla es un `InsightRequestV1` sin período ni key; se valida AL CREAR contra el último
 * período cerrado, con el mismo validador que un encargo manual (un schedule no abre otro contrato).
 */

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { assertInsightsAccess } from '../authz'
import { validateInsightRequest } from '../commands/validate-request'
import { InsightsInputError, InsightsNotFoundError, InsightsNotReadyError, InsightsQuotaExceededError, InsightsSchedulesDisabledError } from '../errors'
import { publishInsightScheduleChanged } from '../events'
import { isInsightsSchedulesEnabled } from '../flags'
import { isValidTimeZone, resolveClosedInsightPeriods, type InsightScheduleCadence } from '../window'

import {
  INSIGHT_SCHEDULE_CADENCES,
  INSIGHT_SCHEDULE_MAX_ACTIVE_PER_ORG,
  type InsightScheduleDto,
  type InsightScheduleRecord,
  type InsightScheduleState
} from './contracts'
import {
  countActiveInsightSchedules,
  getInsightSchedule,
  insertInsightSchedule,
  listInsightSchedules,
  listRecentInsightScheduleOccurrences,
  transitionInsightSchedule
} from './store'

interface ScheduleScope {
  subject: TenantEntitlementSubject
  actorOrganizationId: string | null
  organizationId: string
  env?: NodeJS.ProcessEnv
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Campos que la ocurrencia resuelve: la plantilla no puede fijarlos. */
const RESERVED_TEMPLATE_FIELDS = ['period', 'idempotencyKey', 'organizationId'] as const

export const normalizeInsightScheduleDefinition = (body: unknown) => {
  const raw = isRecord(body) ? body : {}

  if (typeof raw.label !== 'string' || raw.label.trim().length < 3 || raw.label.trim().length > 120) {
    throw new InsightsInputError('label debe tener entre 3 y 120 caracteres', { field: 'label' })
  }

  if (typeof raw.cadence !== 'string' || !(INSIGHT_SCHEDULE_CADENCES as readonly string[]).includes(raw.cadence)) {
    throw new InsightsInputError('cadence debe ser weekly o monthly', { field: 'cadence' })
  }

  const timeZone = typeof raw.timeZone === 'string' && raw.timeZone.trim() ? raw.timeZone.trim() : 'America/Santiago'

  if (!isValidTimeZone(timeZone)) throw new InsightsInputError('timeZone debe ser una zona IANA válida', { field: 'timeZone' })

  const consolidationDays = raw.consolidationDays ?? 3
  const catchUpLimit = raw.catchUpLimit ?? 1

  if (typeof consolidationDays !== 'number' || !Number.isInteger(consolidationDays) || consolidationDays < 0 || consolidationDays > 15) {
    throw new InsightsInputError('consolidationDays debe ser un entero entre 0 y 15', { field: 'consolidationDays' })
  }

  if (typeof catchUpLimit !== 'number' || !Number.isInteger(catchUpLimit) || catchUpLimit < 1 || catchUpLimit > 3) {
    throw new InsightsInputError('catchUpLimit debe ser un entero entre 1 y 3', { field: 'catchUpLimit' })
  }

  if (raw.reviewPolicy !== undefined && raw.reviewPolicy !== 'draft_for_review') {
    // Autoemitir/autoenviar no existe en V1: pedirlo es un error explícito, no un default silencioso.
    throw new InsightsInputError('Sólo draft_for_review está disponible: cada ocurrencia queda en revisión humana', { field: 'reviewPolicy' })
  }

  if (!isRecord(raw.requestTemplate)) throw new InsightsInputError('requestTemplate debe ser un objeto', { field: 'requestTemplate' })

  const reserved = RESERVED_TEMPLATE_FIELDS.filter(field => field in (raw.requestTemplate as Record<string, unknown>))

  if (reserved.length > 0) throw new InsightsInputError('requestTemplate no puede fijar período, idempotency key ni organización', { field: 'requestTemplate', reserved })

  return {
    label: raw.label.trim(),
    cadence: raw.cadence as InsightScheduleCadence,
    timeZone,
    consolidationDays,
    catchUpLimit,
    requestTemplate: raw.requestTemplate as Record<string, unknown>
  }
}

/** La plantilla + un período concreto = un encargo; lo valida el mismo validador del encargo manual. */
export const buildScheduledInsightRequest = (schedule: Pick<InsightScheduleRecord, 'requestTemplate' | 'timeZone' | 'organizationId'>, period: { start: string; endExclusive: string }, idempotencyKey?: string) => ({
  ...schedule.requestTemplate,
  requestVersion: 'insight_request_v1',
  organizationId: schedule.organizationId,
  period: { start: period.start, endExclusive: period.endExclusive, timeZone: schedule.timeZone },
  ...(idempotencyKey ? { idempotencyKey } : {})
})

const toDto = async (schedule: InsightScheduleRecord): Promise<InsightScheduleDto> => {
  const occurrences = await listRecentInsightScheduleOccurrences(schedule.scheduleId)
  const { authorizedByUserId: _authorizedBy, ...rest } = schedule

  void _authorizedBy

  return {
    ...rest,
    recentOccurrences: occurrences.map(occurrence => ({
      occurrenceId: occurrence.occurrenceId,
      periodStart: occurrence.periodStart,
      periodEndExclusive: occurrence.periodEndExclusive,
      state: occurrence.state,
      editionId: occurrence.editionId,
      failureCode: occurrence.failureCode
    }))
  }
}

export const createInsightSchedule = async (input: ScheduleScope & { body: unknown }): Promise<{ schedule: InsightScheduleDto }> => {
  if (!isInsightsSchedulesEnabled(input.env)) throw new InsightsSchedulesDisabledError()

  const grant = await assertInsightsAccess({ ...input, need: 'schedule_manage' })
  const definition = normalizeInsightScheduleDefinition(input.body)
  const [probePeriod] = resolveClosedInsightPeriods({ cadence: definition.cadence, timeZone: definition.timeZone, consolidationDays: definition.consolidationDays, count: 1 })

  // Validar ahora lo que el tick ejecutará después: un schedule inválido falla al crearlo, no en cada ocurrencia.
  validateInsightRequest(buildScheduledInsightRequest({ ...definition, organizationId: grant.organizationId }, probePeriod!), {
    organizationId: grant.organizationId,
    allowedAudiences: grant.allowedAudiences
  })

  const schedule = await withGreenhousePostgresTransaction(async client => {
    const created = await insertInsightSchedule(client, {
      organizationId: grant.organizationId,
      ...definition,
      authorizedByActorKind: grant.actor.kind,
      authorizedByUserId: grant.actor.userId ?? ''
    })

    await publishInsightScheduleChanged(client, { version: 1, scheduleId: created.scheduleId, organizationId: created.organizationId, state: created.state, scheduleVersion: created.scheduleVersion, actorKind: grant.actor.kind })

    return created
  })

  return { schedule: await toDto(schedule) }
}

const TRANSITIONS: Record<'activate' | 'pause' | 'retire', { from: InsightScheduleState[]; to: InsightScheduleState }> = {
  activate: { from: ['draft', 'paused'], to: 'active' },
  pause: { from: ['active'], to: 'paused' },
  retire: { from: ['draft', 'active', 'paused'], to: 'retired' }
}

export const transitionInsightScheduleCommand = async (
  input: ScheduleScope & { scheduleId: string; action: 'activate' | 'pause' | 'retire' }
): Promise<{ schedule: InsightScheduleDto; idempotent: boolean }> => {
  // Activar exige el flag; pausar y retirar siempre deben ser posibles.
  if (input.action === 'activate' && !isInsightsSchedulesEnabled(input.env)) throw new InsightsSchedulesDisabledError()

  const grant = await assertInsightsAccess({ ...input, need: 'schedule_manage' })
  const transition = TRANSITIONS[input.action]

  const result = await withGreenhousePostgresTransaction(async client => {
    const current = await getInsightSchedule(client, input.scheduleId, { organizationId: grant.organizationId, forUpdate: true })

    if (!current) throw new InsightsNotFoundError('schedule', input.scheduleId)
    if (current.state === transition.to) return { schedule: current, idempotent: true }

    if (!transition.from.includes(current.state)) {
      throw new InsightsNotReadyError(`Un schedule ${current.state} no puede pasar a ${transition.to}`, { state: current.state })
    }

    if (input.action === 'activate' && (await countActiveInsightSchedules(client, grant.organizationId)) >= INSIGHT_SCHEDULE_MAX_ACTIVE_PER_ORG) {
      throw new InsightsQuotaExceededError('La organización alcanzó el máximo de recurrencias activas', { limit: INSIGHT_SCHEDULE_MAX_ACTIVE_PER_ORG })
    }

    const updated = await transitionInsightSchedule(client, {
      scheduleId: current.scheduleId,
      fromStates: transition.from,
      state: transition.to,
      pauseReason: transition.to === 'paused' ? 'manual' : null,
      // Quien ACTIVA pasa a ser la autoridad durable: la ocurrencia se genera con su acceso vigente.
      ...(input.action === 'activate' ? { authorizedByActorKind: grant.actor.kind, authorizedByUserId: grant.actor.userId ?? current.authorizedByUserId } : {})
    })

    if (!updated) throw new InsightsNotReadyError('El schedule cambió de estado en paralelo; vuelve a intentarlo', { scheduleId: current.scheduleId })

    await publishInsightScheduleChanged(client, { version: 1, scheduleId: updated.scheduleId, organizationId: updated.organizationId, state: updated.state, scheduleVersion: updated.scheduleVersion, actorKind: grant.actor.kind })

    return { schedule: updated, idempotent: false }
  })

  return { schedule: await toDto(result.schedule), idempotent: result.idempotent }
}

export const readInsightSchedules = async (scope: ScheduleScope): Promise<{ items: InsightScheduleDto[] }> => {
  const grant = await assertInsightsAccess({ ...scope, need: 'schedule_read' })

  return { items: await Promise.all((await listInsightSchedules(grant.organizationId)).map(toDto)) }
}

export const readInsightSchedule = async (scope: ScheduleScope & { scheduleId: string }): Promise<InsightScheduleDto> => {
  const grant = await assertInsightsAccess({ ...scope, need: 'schedule_read' })
  const schedule = await getInsightSchedule(undefined, scope.scheduleId, { organizationId: grant.organizationId })

  if (!schedule) throw new InsightsNotFoundError('schedule', scope.scheduleId)

  return toDto(schedule)
}
