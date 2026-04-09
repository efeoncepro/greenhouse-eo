import { NextResponse } from 'next/server'

import { listShareholderPersonOptions } from '@/lib/finance/shareholder-account/store'
import { FinanceValidationError } from '@/lib/finance/shared'
import { requireShareholderAccountTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireShareholderAccountTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const search = url.searchParams.get('q')
    const items = await listShareholderPersonOptions({ search })

    return NextResponse.json({
      items,
      total: items.length
    })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
