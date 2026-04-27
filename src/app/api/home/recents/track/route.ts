import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-696 — Recents writer.
 *
 * Receives `{ entityKind, entityId, title?, href?, viewCode?, tenantId?, badge? }`
 * and upserts into `greenhouse_serving.user_recent_items`. Idempotent
 * via UNIQUE (user_id, entity_kind, entity_id): repeated visits bump
 * `last_seen_at` and `visit_count` instead of inserting new rows.
 *
 * Called from a tiny client-side beacon mounted on the dashboard layout.
 */

export const dynamic = 'force-dynamic'

interface TrackPayload {
  entityKind?: string
  entityId?: string
  title?: string | null
  href?: string | null
  viewCode?: string | null
  tenantId?: string | null
  badge?: string | null
}

const VALID_KINDS = new Set([
  'project',
  'quote',
  'client',
  'invoice',
  'payroll_period',
  'task',
  'space',
  'view',
  'report',
  'member'
])

export async function POST(request: Request) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: TrackPayload

  try {
    payload = (await request.json()) as TrackPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!payload.entityKind || !payload.entityId) {
    return NextResponse.json({ error: 'Missing entityKind/entityId' }, { status: 400 })
  }

  if (!VALID_KINDS.has(payload.entityKind)) {
    return NextResponse.json({ error: 'Unknown entityKind' }, { status: 400 })
  }

  const snapshotJson = payload.badge ? JSON.stringify({ badge: payload.badge }) : null

  try {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_serving.user_recent_items
         (user_id, entity_kind, entity_id, tenant_id, view_code, title, href, snapshot_jsonb, last_seen_at, visit_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), 1)
       ON CONFLICT (user_id, entity_kind, entity_id) DO UPDATE
         SET last_seen_at = NOW(),
             visit_count = greenhouse_serving.user_recent_items.visit_count + 1,
             title = COALESCE(EXCLUDED.title, greenhouse_serving.user_recent_items.title),
             href = COALESCE(EXCLUDED.href, greenhouse_serving.user_recent_items.href),
             view_code = COALESCE(EXCLUDED.view_code, greenhouse_serving.user_recent_items.view_code),
             tenant_id = COALESCE(EXCLUDED.tenant_id, greenhouse_serving.user_recent_items.tenant_id),
             snapshot_jsonb = COALESCE(EXCLUDED.snapshot_jsonb, greenhouse_serving.user_recent_items.snapshot_jsonb)`,
      [
        session.user.userId,
        payload.entityKind,
        payload.entityId,
        payload.tenantId ?? null,
        payload.viewCode ?? null,
        payload.title ?? null,
        payload.href ?? null,
        snapshotJson
      ]
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[home/recents/track] write failed:', error)

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
