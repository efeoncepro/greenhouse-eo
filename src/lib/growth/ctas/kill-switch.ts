/**
 * TASK-1428 — Growth CTA engine: kill switch global/per-surface (arch §16.3).
 *
 * Estado OPERATIVO persistido en DB (`greenhouse_growth.cta_kill_switch_event`,
 * append-only) — NUNCA una env var: engage/release operan sin redeploy y el render
 * path lo consulta en vivo (sin cache in-memory propio ⇒ efecto server-side
 * inmediato; la ventana efectiva la domina el próximo fetch del renderer, no un TTL
 * — ver §Ventana compuesta en el manual). El estado vigente por scope = último
 * evento (`engage`|`release`).
 *
 * Autorización: la capa API exige `growth.cta.pause` (la autoridad del stop de
 * emergencia §16.3; deliberadamente separada de `publish`). Estos commands son
 * dominio puro — aptos para el loop gobernado propose → confirm → execute (la
 * mutación vive en el endpoint de confirmación humana).
 */
import 'server-only'

import { query, withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  CTA_KILL_SWITCH_AGGREGATE,
  CTA_KILL_SWITCH_CHANGED_EVENT,
  type CtaKillSwitchAction,
  type CtaKillSwitchChangedEventPayload,
  type CtaKillSwitchScope,
} from './contracts'

export type CtaKillSwitchEventRow = {
  kill_event_id: string
  scope: string
  surface_id: string | null
  action: string
  reason: string
  actor_ref: string | null
  created_at: Date
}

/** Estado vigente de los switches: global + surfaces con engage activo. */
export interface CtaKillSwitchState {
  globalKilled: boolean
  killedSurfaceIds: string[]
}

/**
 * Estado vigente = último evento por (scope, surface). Una consulta indexada
 * (`cta_kill_switch_event_scope_idx`); steady state = tabla vacía ⇒ todo activo.
 */
export const getKillSwitchState = async (): Promise<CtaKillSwitchState> => {
  const rows = await query<{ scope: string; surface_id: string | null; action: string }>(
    `SELECT DISTINCT ON (scope, surface_id) scope, surface_id, action
       FROM greenhouse_growth.cta_kill_switch_event
      ORDER BY scope, surface_id, created_at DESC`,
  )

  const globalKilled = rows.some(row => row.scope === 'global' && row.action === 'engage')

  const killedSurfaceIds = rows
    .filter(row => row.scope === 'surface' && row.action === 'engage' && row.surface_id !== null)
    .map(row => row.surface_id as string)

  return { globalKilled, killedSurfaceIds }
}

export interface CtaKillSwitchAuditEntry {
  killEventId: string
  scope: CtaKillSwitchScope
  surfaceId: string | null
  action: CtaKillSwitchAction
  reason: string
  actorRef: string | null
  createdAt: Date
}

/** Audit trail (operador-only; jamás cruza al browser). */
export const listKillSwitchAudit = async (limit = 50): Promise<CtaKillSwitchAuditEntry[]> => {
  const rows = await query<CtaKillSwitchEventRow>(
    `SELECT * FROM greenhouse_growth.cta_kill_switch_event
      ORDER BY created_at DESC
      LIMIT $1`,
    [String(Math.min(Math.max(limit, 1), 200))],
  )

  return rows.map(row => ({
    killEventId: row.kill_event_id,
    scope: row.scope as CtaKillSwitchScope,
    surfaceId: row.surface_id,
    action: row.action as CtaKillSwitchAction,
    reason: row.reason,
    actorRef: row.actor_ref,
    createdAt: row.created_at,
  }))
}

export interface SetKillSwitchInput {
  scope: CtaKillSwitchScope
  surfaceId?: string | null
  action: CtaKillSwitchAction
  reason: string
  actorRef?: string | null
}

export type SetKillSwitchResult =
  | { ok: true; killEventId: string; changed: boolean }
  | { ok: false; reason: 'invalid_input' | 'surface_not_found' }

/**
 * Engage/release idempotente-observable: si el estado vigente ya es el pedido, no
 * inserta evento duplicado (`changed: false`) — un retry no infla el audit trail.
 * INSERT append-only + outbox in-tx (patrón canónico).
 */
export const setCtaKillSwitch = async (input: SetKillSwitchInput): Promise<SetKillSwitchResult> => {
  const reason = input.reason?.trim() ?? ''

  if (reason.length < 5) return { ok: false, reason: 'invalid_input' }

  if (input.scope === 'surface' && !input.surfaceId) return { ok: false, reason: 'invalid_input' }

  if (input.scope === 'global' && input.surfaceId) return { ok: false, reason: 'invalid_input' }

  return withTransaction(async client => {
    if (input.scope === 'surface') {
      const surface = await client.query(
        `SELECT surface_id FROM greenhouse_growth.cta_surface_binding WHERE surface_id = $1`,
        [input.surfaceId],
      )

      if (!surface.rows[0]) return { ok: false as const, reason: 'surface_not_found' as const }
    }

    // Serializa engage/release concurrentes por scope con advisory lock transaccional.
    // NUNCA `FOR UPDATE` acá: el row-lock exige privilegio UPDATE y el runtime solo tiene
    // SELECT/INSERT en esta tabla append-only (bug real cazado en el smoke staging 2026-07-18:
    // el 502 del engage era `permission denied` del FOR UPDATE bajo greenhouse_runtime).
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('growth.cta.kill_switch:' || $1 || ':' || COALESCE($2, '')))`, [
      input.scope,
      input.surfaceId ?? null,
    ])

    const current = await client.query<{ action: string; kill_event_id: string }>(
      `SELECT action, kill_event_id
         FROM greenhouse_growth.cta_kill_switch_event
        WHERE scope = $1 AND surface_id IS NOT DISTINCT FROM $2
        ORDER BY created_at DESC
        LIMIT 1`,
      [input.scope, input.surfaceId ?? null],
    )

    const currentAction = current.rows[0]?.action ?? 'release'

    if (currentAction === input.action) {
      return { ok: true as const, killEventId: current.rows[0]?.kill_event_id ?? '', changed: false }
    }

    const inserted = await client.query<{ kill_event_id: string }>(
      `INSERT INTO greenhouse_growth.cta_kill_switch_event (scope, surface_id, action, reason, actor_ref)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING kill_event_id`,
      [input.scope, input.surfaceId ?? null, input.action, reason, input.actorRef ?? null],
    )

    const payload: CtaKillSwitchChangedEventPayload = {
      schemaVersion: 1,
      scope: input.scope,
      surfaceId: input.surfaceId ?? null,
      action: input.action,
      reason,
      actorRef: input.actorRef ?? null,
    }

    await publishOutboxEvent(
      {
        aggregateType: CTA_KILL_SWITCH_AGGREGATE,
        aggregateId: input.scope === 'global' ? 'global' : (input.surfaceId as string),
        eventType: CTA_KILL_SWITCH_CHANGED_EVENT,
        payload: payload as unknown as Record<string, unknown>,
      },
      client,
    )

    return { ok: true as const, killEventId: inserted.rows[0].kill_event_id, changed: true }
  })
}
