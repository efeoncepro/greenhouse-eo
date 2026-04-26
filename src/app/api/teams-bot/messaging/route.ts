import { createHash } from 'crypto'

import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getTenantAccessRecordByMicrosoftOid } from '@/lib/tenant/access'
import {
  BotFrameworkJwtError,
  validateBotFrameworkJwt
} from '@/lib/integrations/teams/bot-framework/jwt-validator'
import { dispatchTeamsBotAction } from '@/lib/teams-bot/action-registry'

// Side-effect import: registers all bundled handlers (ops-alert-snooze, notification-mark-read).
import '@/lib/teams-bot/handlers'

/**
 * TASK-671 — Inbound endpoint for Bot Framework activities.
 *
 * The Greenhouse Teams bot POSTs every Activity (message, conversationUpdate, invoke)
 * to this endpoint with a bearer JWT issued by `https://login.botframework.com`.
 * We validate the JWT, persist the activity for audit + idempotency, and dispatch
 * any `Action.Submit` payload through the action-registry.
 *
 * Security model:
 *  - The bot's expected app id is `process.env.GREENHOUSE_TEAMS_BOT_APP_ID`. The check
 *    fails closed if the env var is missing.
 *  - The principal who clicked is identified by the `aadObjectId` claim in the activity
 *    body (`from.aadObjectId`). We map it to a Greenhouse `TenantAccessRecord` via
 *    `getTenantAccessRecordByMicrosoftOid`.
 *  - The activity is persisted before dispatch with an idempotency key. The unique
 *    constraint blocks double-execution if the bot retries.
 *  - Errors are redacted in `handler_error_summary` (no tokens, no PII, no full stacks).
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface BotFrameworkActivity {
  type?: string
  id?: string
  conversation?: { id?: string; tenantId?: string }
  from?: { aadObjectId?: string; id?: string; name?: string }
  serviceUrl?: string
  value?: unknown
  text?: unknown
  channelData?: { tenant?: { id?: string } }
}

const computeIdempotencyKey = (activityId: string, actionId: string, fromAadObjectId: string) =>
  createHash('sha256').update(`${activityId}|${actionId}|${fromAadObjectId}`).digest('hex')

const SAFE_ACTION_ID_PATTERN = /^[a-z0-9._-]{1,128}$/i
const MAX_PAYLOAD_BYTES = 64 * 1024

const redactError = (error: unknown): string => {
  if (!error) return 'unknown'
  const raw = error instanceof Error ? error.message : String(error)

  // Strip JWTs, bearer tokens, GCP secret URIs, emails — paranoid baseline.
  return raw
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<jwt>')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer <redacted>')
    .replace(/projects\/[^/\s]+\/secrets\/[^/\s]+(?:\/versions\/[^\s]+)?/g, 'projects/<redacted>')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<email>')
    .slice(0, 500)
}

const persistInboundAction = async (params: {
  botAppId: string
  azureTenantId: string
  fromAadObjectId: string
  conversationId: string
  activityId: string
  actionId: string
  actionData: unknown
  idempotencyKey: string
  resolvedUserId: string | null
  resolvedMemberId: string | null
}): Promise<{ inserted: boolean }> => {
  const result = await runGreenhousePostgresQuery<{ inbound_id: string }>(
    `INSERT INTO greenhouse_core.teams_bot_inbound_actions (
       bot_app_id, azure_tenant_id, from_aad_object_id, conversation_id,
       activity_id, action_id, action_data_json, idempotency_key,
       handler_status, resolved_user_id, resolved_member_id, handler_started_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, 'pending', $9, $10, CURRENT_TIMESTAMP)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING inbound_id`,
    [
      params.botAppId,
      params.azureTenantId,
      params.fromAadObjectId,
      params.conversationId,
      params.activityId,
      params.actionId,
      JSON.stringify(params.actionData ?? {}).slice(0, MAX_PAYLOAD_BYTES),
      params.idempotencyKey,
      params.resolvedUserId,
      params.resolvedMemberId
    ]
  )

  return { inserted: result.length > 0 }
}

const updateInboundStatus = async (params: {
  idempotencyKey: string
  status:
    | 'succeeded'
    | 'failed'
    | 'rejected_unauthorized'
    | 'rejected_unknown_action'
    | 'rejected_disabled_action'
  errorSummary?: string | null
  resolvedUserId?: string | null
  resolvedMemberId?: string | null
}) => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_core.teams_bot_inbound_actions
        SET handler_status = $2,
            handler_finished_at = CURRENT_TIMESTAMP,
            handler_error_summary = COALESCE($3, handler_error_summary),
            resolved_user_id = COALESCE($4, resolved_user_id),
            resolved_member_id = COALESCE($5, resolved_member_id)
      WHERE idempotency_key = $1`,
    [
      params.idempotencyKey,
      params.status,
      params.errorSummary ?? null,
      params.resolvedUserId ?? null,
      params.resolvedMemberId ?? null
    ]
  )
}

export async function POST(request: Request) {
  const expectedAppId = process.env.GREENHOUSE_TEAMS_BOT_APP_ID

  if (!expectedAppId) {
    return NextResponse.json(
      { error: 'GREENHOUSE_TEAMS_BOT_APP_ID is not configured' },
      { status: 503 }
    )
  }

  const authHeader = request.headers.get('authorization') || ''

  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
  }

  const token = authHeader.slice(7).trim()

  let validated

  try {
    validated = await validateBotFrameworkJwt({ token, expectedAppId })
  } catch (error) {
    if (error instanceof BotFrameworkJwtError) {
      return NextResponse.json({ error: 'JWT validation failed' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Auth check unavailable' }, { status: 503 })
  }

  let activity: BotFrameworkActivity

  try {
    activity = (await request.json()) as BotFrameworkActivity
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Bot Framework sends conversationUpdate / messageUpdate events too; we only act on
  // submits with `value.actionId` set. Acknowledge everything else with 200 so the bot
  // does not retry.
  const data = (activity.value && typeof activity.value === 'object' ? activity.value : {}) as Record<
    string,
    unknown
  >

  const actionIdRaw = typeof data.actionId === 'string' ? data.actionId : null

  if (!actionIdRaw) {
    return NextResponse.json({ ok: true, ignored: 'no_action_id' }, { status: 200 })
  }

  if (!SAFE_ACTION_ID_PATTERN.test(actionIdRaw)) {
    return NextResponse.json({ error: 'Malformed actionId' }, { status: 400 })
  }

  const fromAadObjectId = activity.from?.aadObjectId
  const activityId = activity.id
  const conversationId = activity.conversation?.id

  const azureTenantId =
    activity.conversation?.tenantId || activity.channelData?.tenant?.id || ''

  if (!fromAadObjectId || !activityId || !conversationId) {
    return NextResponse.json({ error: 'Missing activity identity fields' }, { status: 400 })
  }

  const idempotencyKey = computeIdempotencyKey(activityId, actionIdRaw, fromAadObjectId)

  let principal

  try {
    principal = await getTenantAccessRecordByMicrosoftOid(fromAadObjectId)
  } catch (error) {
    await persistInboundAction({
      botAppId: validated.appId,
      azureTenantId,
      fromAadObjectId,
      conversationId,
      activityId,
      actionId: actionIdRaw,
      actionData: data,
      idempotencyKey,
      resolvedUserId: null,
      resolvedMemberId: null
    }).catch(() => undefined)

    await updateInboundStatus({
      idempotencyKey,
      status: 'failed',
      errorSummary: redactError(error)
    }).catch(() => undefined)

    return NextResponse.json({ error: 'Identity lookup unavailable' }, { status: 503 })
  }

  if (!principal) {
    await persistInboundAction({
      botAppId: validated.appId,
      azureTenantId,
      fromAadObjectId,
      conversationId,
      activityId,
      actionId: actionIdRaw,
      actionData: data,
      idempotencyKey,
      resolvedUserId: null,
      resolvedMemberId: null
    }).catch(() => undefined)

    await updateInboundStatus({
      idempotencyKey,
      status: 'rejected_unauthorized',
      errorSummary: 'no_tenant_access_record'
    }).catch(() => undefined)

    return NextResponse.json(
      { error: 'No Greenhouse principal mapped to this Microsoft user' },
      { status: 403 }
    )
  }

  const insert = await persistInboundAction({
    botAppId: validated.appId,
    azureTenantId,
    fromAadObjectId,
    conversationId,
    activityId,
    actionId: actionIdRaw,
    actionData: data,
    idempotencyKey,
    resolvedUserId: principal.userId,
    resolvedMemberId: principal.memberId
  })

  if (!insert.inserted) {
    return NextResponse.json({ ok: true, idempotent_replay: true }, { status: 200 })
  }

  const result = await dispatchTeamsBotAction(actionIdRaw, data, {
    tenantContext: principal,
    aadObjectId: fromAadObjectId,
    memberId: principal.memberId,
    conversationId,
    activityId
  })

  if (!result.ok) {
    const status =
      result.reason === 'invalid_data'
        ? 'rejected_unknown_action'
        : result.reason === 'missing_capability' || result.reason === 'missing_role'
          ? 'rejected_unauthorized'
          : 'failed'

    await updateInboundStatus({
      idempotencyKey,
      status,
      errorSummary: result.message.slice(0, 500),
      resolvedUserId: principal.userId,
      resolvedMemberId: principal.memberId
    }).catch(() => undefined)

    const httpStatus =
      result.reason === 'invalid_data'
        ? 400
        : result.reason === 'missing_capability' || result.reason === 'missing_role'
          ? 403
          : 500

    return NextResponse.json({ error: result.message }, { status: httpStatus })
  }

  await updateInboundStatus({
    idempotencyKey,
    status: 'succeeded',
    resolvedUserId: principal.userId,
    resolvedMemberId: principal.memberId
  }).catch(() => undefined)

  return NextResponse.json(
    { ok: true, message: result.message ?? null, updatedCard: result.updatedCardJson ?? null },
    { status: 200 }
  )
}
