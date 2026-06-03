import { NextResponse } from 'next/server'

import { authorizeLifecycle } from '@/lib/client-lifecycle/api-helpers'
import { listNotionTeamspaceSuggestions } from '@/lib/client-onboarding/notion-teamspace-suggestions'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

// GET /api/admin/clients/lifecycle/notion-teamspaces?q=<text>
// TASK-997 Slice 3 — busca bases (Tareas/Proyectos/Sprints) que la integración
// Greenhouse PRD puede ver, para anclar el teamspace existente del cliente.
// Degradación honesta: si NOTION_TOKEN falta o la integración no está conectada
// al teamspace, devuelve degraded=true + items vacío → la UI cae a "crear nuevo".
export async function GET(request: Request) {
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.case.read')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()

  // Búsqueda vacía → no consultamos Notion (evita traer todo el workspace).
  if (q.length < 2) return NextResponse.json({ items: [], degraded: false })

  try {
    const items = await listNotionTeamspaceSuggestions(q)

    return NextResponse.json({ items, degraded: false })
  } catch (error) {
    captureWithDomain(error, 'integrations.notion', {
      tags: { source: 'client_lifecycle_notion_teamspace_suggest' }
    })

    return NextResponse.json({ items: [], degraded: true })
  }
}
