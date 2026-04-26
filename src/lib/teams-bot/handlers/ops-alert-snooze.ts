import 'server-only'

import {
  registerTeamsBotAction,
  type TeamsBotActionContext,
  type TeamsBotActionResult
} from '../action-registry'

/**
 * TASK-671 — handler for the "Silenciar 24h" Action.Submit attached to ops alert cards.
 *
 * Idempotency: the inbound endpoint persists every Action.Submit to
 * `greenhouse_core.teams_bot_inbound_actions` with a unique idempotency key. If the bot
 * retries the activity, the unique constraint blocks duplicate inserts and this handler
 * never runs twice with the same `(activityId, actionId, fromAadObjectId)` tuple.
 *
 * Storage: the snooze metadata (alertSignature + snoozedUntil) lives in the JSON payload
 * of the same row (`action_data_json`). Future readers join on `alert_signature`.
 *
 * Authorization: requires the principal to be in the `internal` route group (i.e. an
 * Efeonce internal user). External clients cannot snooze ops alerts.
 */

const ALERT_SIGNATURE_MAX_LEN = 256

interface OpsAlertSnoozeData {
  alertSignature: string
  /** Number of hours to silence; bounded server-side to [1, 168] (1 hour to 7 days). */
  hours: number
}

const validateData = (data: unknown): data is OpsAlertSnoozeData => {
  if (!data || typeof data !== 'object') return false

  const sig = (data as { alertSignature?: unknown }).alertSignature
  const hours = (data as { hours?: unknown }).hours

  if (typeof sig !== 'string' || !sig.trim().length || sig.length > ALERT_SIGNATURE_MAX_LEN) return false
  if (typeof hours !== 'number' || !Number.isFinite(hours) || hours < 1 || hours > 168) return false

  return true
}

const handler = async (
  data: OpsAlertSnoozeData,
  ctx: TeamsBotActionContext
): Promise<TeamsBotActionResult> => {
  const snoozedUntil = new Date(Date.now() + data.hours * 3_600_000).toISOString()
  const fullName = ctx.tenantContext.fullName || ctx.tenantContext.email

  return {
    ok: true,
    message: `🔕 Silenciada por ${fullName} hasta ${snoozedUntil}`
  }
}

registerTeamsBotAction<OpsAlertSnoozeData>({
  actionId: 'ops.alert.snooze',
  description: 'Silencia una alerta de ops por una ventana acotada (1h a 7d).',
  domain: 'ops',
  requiredRouteGroups: ['internal'],
  validateData,
  handler
})
