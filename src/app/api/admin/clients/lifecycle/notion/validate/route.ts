import { NextResponse } from 'next/server'

import { authorizeLifecycle } from '@/lib/client-lifecycle/api-helpers'
import { discoverNotionDatabasesForToken } from '@/lib/client-onboarding/notion-token-connect'

export const dynamic = 'force-dynamic'

/**
 * TASK-998 — POST /api/admin/clients/lifecycle/notion/validate
 *
 * Valida un token de integración Notion scoped a un teamspace y devuelve las DBs
 * que el token puede ver, auto-clasificadas (Tareas/Proyectos/Sprints/otras). NO
 * persiste ni loggea el token — es solo el paso de validación del wizard/checklist.
 * La provisión real (Secret Manager + space_notion_sources) ocurre en el connect.
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.case.open')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'No autorizado', code: 'unauthorized', actionable: false }, { status: 401 })

  let token = ''

  try {
    const body = (await request.json()) as { token?: unknown }

    token = typeof body.token === 'string' ? body.token : ''
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.', code: 'invalid_body', actionable: false }, { status: 400 })
  }

  const result = await discoverNotionDatabasesForToken(token)

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason ?? 'El token no pudo validarse.', code: 'token_invalid', actionable: true, databases: [], suggested: result.suggested },
      { status: 422 }
    )
  }

  return NextResponse.json({
    ok: true,
    databases: result.databases,
    suggested: result.suggested
  })
}
