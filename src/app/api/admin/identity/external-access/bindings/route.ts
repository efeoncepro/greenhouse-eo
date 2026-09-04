import { NextResponse } from 'next/server'

import {
  bindExternalOrganization,
  listExternalOrganizationBindings,
  type ExternalBindingStatus
} from '@/lib/identity/external-access'
import {
  externalAccessErrorResponse,
  readJsonBody,
  requireExternalAccessOperator
} from '@/lib/identity/external-access/http'

export const dynamic = 'force-dynamic'

/**
 * TASK-1631 — Bindings organización canónica ↔ environment externo.
 * GET  → `identity.external_binding.read` (filtros organizationId/environmentId/status)
 * POST → `identity.external_binding.bind` (idempotente: mismo org+env+ref devuelve el existente)
 */
export async function GET(request: Request) {
  const { operator, response } = await requireExternalAccessOperator('identity.external_binding.read', 'read')

  if (!operator) return response

  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    const items = await listExternalOrganizationBindings({
      organizationId: url.searchParams.get('organizationId')?.trim() || null,
      environmentId: url.searchParams.get('environmentId')?.trim() || null,
      status: status === 'active' || status === 'revoked' ? (status as ExternalBindingStatus) : null,
      limit: Math.min(Math.max(Number(url.searchParams.get('limit') || 200), 1), 500)
    })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.bindings.list')
  }
}

export async function POST(request: Request) {
  const { operator, response } = await requireExternalAccessOperator('identity.external_binding.bind', 'create')

  if (!operator) return response

  try {
    const body = await readJsonBody(request)

    const result = await bindExternalOrganization(
      {
        organizationId: String(body.organizationId ?? ''),
        environmentId: String(body.environmentId ?? ''),
        externalOrganizationRef: String(body.externalOrganizationRef ?? ''),
        designatedAdminProfileId:
          typeof body.designatedAdminProfileId === 'string' ? body.designatedAdminProfileId : null,
        reason: typeof body.reason === 'string' ? body.reason : null
      },
      operator.actor
    )

    return NextResponse.json(result, { status: result.created ? 201 : 200 })
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.bindings.bind')
  }
}
