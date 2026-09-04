import { NextResponse } from 'next/server'

import { listEligibleClientOrganizations } from '@/lib/identity/external-access'
import { externalAccessErrorResponse, requireExternalAccessOperator } from '@/lib/identity/external-access/http'

export const dynamic = 'force-dynamic'

/**
 * TASK-1631 — Elegibilidad de la cohorte externa: organizaciones cliente EXISTENTES de Account 360.
 * Sólo lectura (`identity.external_binding.read`). Nunca crea organizaciones ni infiere por dominio.
 */
export async function GET(request: Request) {
  const { operator, response } = await requireExternalAccessOperator('identity.external_binding.read', 'read')

  if (!operator) return response

  try {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.trim() || null
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 500)
    const items = await listEligibleClientOrganizations({ search, limit })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.eligibility')
  }
}
