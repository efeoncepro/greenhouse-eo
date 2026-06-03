import { NextResponse } from 'next/server'

import { authorizeLifecycle } from '@/lib/client-lifecycle/api-helpers'
import { listTeamsChannelSuggestions } from '@/lib/client-onboarding/teams-channel-suggestions'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

// GET /api/admin/clients/lifecycle/teams-channels?q=<text>
// TASK-997 Slice 4 — busca equipos de Microsoft Teams (Graph) para anclar el canal
// existente del cliente. Degradación honesta: si faltan credenciales/permisos Graph,
// devuelve degraded=true + items vacío → la UI cae a "crear canal nuevo".
export async function GET(request: Request) {
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.case.read')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()

  if (q.length < 2) return NextResponse.json({ items: [], degraded: false })

  try {
    const items = await listTeamsChannelSuggestions(q)

    return NextResponse.json({ items, degraded: false })
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'client_lifecycle_teams_channel_suggest' }
    })

    return NextResponse.json({ items: [], degraded: true })
  }
}
