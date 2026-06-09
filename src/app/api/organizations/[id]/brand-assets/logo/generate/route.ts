import { NextResponse } from 'next/server'

import {
  canUpdateOrganizationBrandAsset,
  OrganizationBrandAssetError
} from '@/lib/account-360/organization-brand-assets'
import { generateOrganizationLogoDraft } from '@/lib/account-360/organization-logo-generation'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const toErrorResponse = (error: unknown) => {
  if (error instanceof OrganizationBrandAssetError) {
    switch (error.code) {
      case 'organization_not_found':
        return NextResponse.json({ error: 'Organization not found.' }, { status: 404 })
      case 'operating_entity_forbidden':
        return NextResponse.json(
          { error: 'Los logos institucionales o legales de Efeonce no se generan desde este flujo.' },
          { status: 403 }
        )
      default:
        return NextResponse.json({ error: 'No se pudo generar el logo.' }, { status: 400 })
    }
  }

  // OpenAI / persistence failure — sanitized, never leak the raw provider error to the client.
  console.error('POST /api/organizations/[id]/brand-assets/logo/generate failed:', redactErrorForResponse(error))

  return NextResponse.json(
    { error: 'No pudimos generar el logo con IA. Intenta de nuevo en unos segundos.' },
    { status: 502 }
  )
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canUpdateOrganizationBrandAsset(tenant)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const styleHint = typeof body.styleHint === 'string' ? body.styleHint : null

  try {
    const result = await generateOrganizationLogoDraft({
      organizationId: id,
      actorUserId: tenant.userId,
      styleHint
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
