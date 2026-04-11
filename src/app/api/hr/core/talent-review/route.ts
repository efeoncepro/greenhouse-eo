import { NextResponse } from 'next/server'

import { requireHrTenantContext } from '@/lib/tenant/authorization'
import {
  getTalentReviewQueue,
  getTalentReviewSummary
} from '@/lib/hr-core/talent-review'
import type { TalentReviewFilters } from '@/lib/hr-core/talent-review'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['self_declared', 'pending_review', 'verified', 'rejected'] as const
const VALID_ITEM_TYPES = ['skill', 'certification', 'tool'] as const
const VALID_EXPIRY_FILTERS = ['expiring_soon', 'expired'] as const

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)

    const filters: TalentReviewFilters = {}

    const status = searchParams.get('status')

    if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
      filters.status = status as TalentReviewFilters['status']
    }

    const itemType = searchParams.get('itemType')

    if (itemType && (VALID_ITEM_TYPES as readonly string[]).includes(itemType)) {
      filters.itemType = itemType as TalentReviewFilters['itemType']
    }

    const memberId = searchParams.get('memberId')

    if (memberId && memberId.trim()) {
      filters.memberId = memberId.trim()
    }

    const expiryFilter = searchParams.get('expiryFilter')

    if (expiryFilter && (VALID_EXPIRY_FILTERS as readonly string[]).includes(expiryFilter)) {
      filters.expiryFilter = expiryFilter as TalentReviewFilters['expiryFilter']
    }

    const [items, summary] = await Promise.all([
      getTalentReviewQueue(filters),
      getTalentReviewSummary()
    ])

    return NextResponse.json({ items, summary })
  } catch (error) {
    console.error('[hr/core/talent-review] GET error:', error)

    return NextResponse.json(
      { error: 'Unable to load talent review queue.' },
      { status: 500 }
    )
  }
}
