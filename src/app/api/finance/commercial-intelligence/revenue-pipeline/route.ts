import 'server-only'

import { NextResponse } from 'next/server'

import {
  listRevenuePipelineUnified,
  type UnifiedPipelineCategory,
  type UnifiedPipelineFilters
} from '@/lib/commercial-intelligence/revenue-pipeline-reader'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const VALID_CATEGORIES: UnifiedPipelineCategory[] = ['deal', 'contract', 'pre-sales']

const parseCategory = (value: string | null): UnifiedPipelineCategory | null => {
  if (!value) return null

  return VALID_CATEGORIES.includes(value as UnifiedPipelineCategory)
    ? (value as UnifiedPipelineCategory)
    : null
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)

  const isInternal = tenant.tenantType === 'efeonce_internal'
  const clientIdParam = searchParams.get('clientId')
  const organizationIdParam = searchParams.get('organizationId')

  const filters: UnifiedPipelineFilters = {
    clientId: isInternal ? clientIdParam || null : tenant.clientId,
    organizationId: isInternal ? organizationIdParam || null : null,
    spaceId: tenant.spaceId ?? null,
    businessLineCode: searchParams.get('businessLineCode') || null,
    category: parseCategory(searchParams.get('category')),
    stage: searchParams.get('stage') || null,
    lifecyclestage: searchParams.get('lifecyclestage') || null
  }

  const result = await listRevenuePipelineUnified(filters)

  return NextResponse.json(result)
}
