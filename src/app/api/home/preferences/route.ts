import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-696 — Smart Home v2 user preferences endpoint.
 *
 * Persists `ui_density`, `home_default_view`, `home_v2_opt_out` on
 * `greenhouse_core.client_users`. The page route reads these on every
 * render to decide v1 vs v2 + density CSS scale + default landing
 * surface.
 */

export const dynamic = 'force-dynamic'

const VALID_DENSITY = new Set(['cozy', 'comfortable', 'compact'])

interface PreferencesPayload {
  uiDensity?: 'cozy' | 'comfortable' | 'compact' | null
  homeDefaultView?: string | null
  homeV2OptOut?: boolean
}

export async function GET() {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await runGreenhousePostgresQuery<{
    ui_density: string | null
    home_default_view: string | null
    home_v2_opt_out: boolean | null
    preferences_updated_at: string | null
  } & Record<string, unknown>>(
    `SELECT ui_density, home_default_view, home_v2_opt_out, preferences_updated_at
       FROM greenhouse_core.client_users
      WHERE user_id = $1`,
    [session.user.userId]
  ).catch(() => [])

  const row = rows[0]

  return NextResponse.json({
    uiDensity: row?.ui_density ?? null,
    homeDefaultView: row?.home_default_view ?? null,
    homeV2OptOut: row?.home_v2_opt_out ?? false,
    preferencesUpdatedAt: row?.preferences_updated_at ?? null
  })
}

export async function PATCH(request: Request) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: PreferencesPayload

  try {
    payload = (await request.json()) as PreferencesPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: string[] = []
  const params: unknown[] = []
  let position = 1

  if ('uiDensity' in payload) {
    if (payload.uiDensity != null && !VALID_DENSITY.has(payload.uiDensity)) {
      return NextResponse.json({ error: 'Invalid density' }, { status: 400 })
    }
    updates.push(`ui_density = $${position++}`)
    params.push(payload.uiDensity)
  }

  if ('homeDefaultView' in payload) {
    updates.push(`home_default_view = $${position++}`)
    params.push(payload.homeDefaultView)
  }

  if ('homeV2OptOut' in payload) {
    updates.push(`home_v2_opt_out = $${position++}`)
    params.push(Boolean(payload.homeV2OptOut))
  }

  if (updates.length === 0) {
    return NextResponse.json({ ok: true, noop: true })
  }

  updates.push(`preferences_updated_at = NOW()`)
  params.push(session.user.userId)

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_core.client_users
        SET ${updates.join(', ')}
      WHERE user_id = $${position}`,
    params
  )

  return NextResponse.json({ ok: true })
}
