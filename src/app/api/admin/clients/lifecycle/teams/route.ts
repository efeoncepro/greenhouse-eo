import { NextResponse } from 'next/server'

import { authorizeLifecycle } from '@/lib/client-lifecycle/api-helpers'
import { listTeamsForLinking, listTeamChannelsForLinking } from '@/lib/client-onboarding/teams-channels-reader'

export const dynamic = 'force-dynamic'

/**
 * TASK-998 — GET /api/admin/clients/lifecycle/teams
 *
 * Self-serve de Teams para el checklist de onboarding (read-only, bot Graph):
 *   - sin `?teamId`  → lista los equipos que el bot puede ver.
 *   - con `?teamId=` → lista los canales de ese equipo.
 * El canal elegido se registra después en teams_notification_channels.
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.case.open')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'No autorizado', code: 'unauthorized', actionable: false }, { status: 401 })

  const teamId = new URL(request.url).searchParams.get('teamId')?.trim()

  if (teamId) {
    const result = await listTeamChannelsForLinking(teamId)

    if (!result.ok) {
      return NextResponse.json({ error: result.reason ?? 'No pudimos listar los canales.', code: 'teams_graph_error', actionable: true, channels: [] }, { status: 502 })
    }

    return NextResponse.json({ ok: true, channels: result.channels })
  }

  const result = await listTeamsForLinking()

  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? 'No pudimos listar los equipos.', code: 'teams_graph_error', actionable: true, teams: [] }, { status: 502 })
  }

  return NextResponse.json({ ok: true, teams: result.teams })
}
