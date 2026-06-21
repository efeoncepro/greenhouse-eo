import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { can } from '@/lib/entitlements/runtime'
import { submitHes } from '@/lib/finance/hes-store'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TASK-1193 — gate fino de acción (capability != route-group).
  if (!can(tenant, 'finance.hes.submit', 'update', 'tenant')) {
    return NextResponse.json({ error: 'No tienes permiso para enviar HES a aprobación.', code: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const result = await submitHes(id)

  if (!result) {
    return NextResponse.json({ error: 'La HES no existe o ya no está en borrador.' }, { status: 404 })
  }

  return NextResponse.json(result)
}
