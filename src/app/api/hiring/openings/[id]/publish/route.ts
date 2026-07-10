import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { getHiringOpeningById, publishOpening, toHiringErrorResponse, unpublishOpening } from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-353 — `POST/DELETE /api/hiring/openings/[id]/publish` (publication governance).
 *
 * POST publica el opening (proyección pública allowlist); DELETE lo despublica. Ambos
 * gateados por la capability `hiring.opening.publish` (verbo execute, least-privilege sin
 * comercial). POST exige `public_title` presente (guard 422 en el store).
 */
export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.opening.publish', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.opening.publish' } })
  }

  try {
    const { id } = await params
    const result = await publishOpening(id, tenant.userId)
    const opening = await getHiringOpeningById(id)

    revalidatePath('/public/careers')
    revalidatePath(`/public/careers/${result.publicId}`)

    
    return NextResponse.json({ ...result, opening })
  } catch (error) {
    return toHiringErrorResponse(error, 'opening_publish')
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.opening.publish', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.opening.publish' } })
  }

  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') === 'closed' ? 'closed' : 'paused'
    const result = await unpublishOpening(id, tenant.userId, mode)
    const opening = await getHiringOpeningById(id)

    revalidatePath('/public/careers')
    revalidatePath(`/public/careers/${result.publicId}`)

    
    return NextResponse.json({ ...result, opening })
  } catch (error) {
    return toHiringErrorResponse(error, 'opening_unpublish')
  }
}
