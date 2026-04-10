import { NextResponse } from 'next/server'

import {
  resolveShareholderMovementSource,
  searchShareholderMovementSources,
  type ShareholderMovementSourceType
} from '@/lib/finance/shareholder-account/source-links'
import { FinanceValidationError, normalizeString } from '@/lib/finance/shared'
import { requireShareholderAccountTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const SEARCHABLE_SOURCE_TYPES = new Set<ShareholderMovementSourceType>([
  'expense',
  'income',
  'expense_payment',
  'income_payment'
])

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireShareholderAccountTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const sourceType = normalizeString(url.searchParams.get('sourceType')) as ShareholderMovementSourceType
    const sourceId = normalizeString(url.searchParams.get('sourceId'))
    const search = normalizeString(url.searchParams.get('q'))

    if (!sourceType) {
      throw new FinanceValidationError('sourceType is required.', 422)
    }

    const scope = {
      tenantType: tenant.tenantType,
      clientId: tenant.clientId,
      organizationId: tenant.organizationId || null,
      spaceId: tenant.spaceId || null
    } as const

    if (sourceId) {
      if (sourceType === 'manual') {
        throw new FinanceValidationError('manual does not support source resolution.', 422)
      }

      const item = await resolveShareholderMovementSource({
        scope,
        sourceType,
        sourceId
      })

      return NextResponse.json({ item })
    }

    if (!SEARCHABLE_SOURCE_TYPES.has(sourceType)) {
      return NextResponse.json({ items: [] })
    }

    const items = await searchShareholderMovementSources({
      scope,
      sourceType: sourceType as Exclude<ShareholderMovementSourceType, 'manual' | 'settlement_group'>,
      search
    })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    throw error
  }
}
