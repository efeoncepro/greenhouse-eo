import 'server-only'

import { NextResponse } from 'next/server'

import { listOverheadAddons } from '@/lib/commercial/overhead-addons-store'
import { listEmploymentTypes, listSellableRoles } from '@/lib/commercial/sellable-roles-store'
import { listServiceCatalog } from '@/lib/commercial/service-catalog-store'
import { listToolCatalog } from '@/lib/commercial/tool-catalog-store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const LOOKUP_TYPES = ['role', 'tool', 'addon', 'person', 'employment_type', 'service'] as const

type LookupType = (typeof LOOKUP_TYPES)[number]

interface LookupItem {
  sku: string
  label: string
  description?: string | null
  category?: string | null
  metadata?: Record<string, unknown>
}

const isLookupType = (value: string | null): value is LookupType =>
  typeof value === 'string' && (LOOKUP_TYPES as readonly string[]).includes(value)

const matches = (haystack: string | null | undefined, needle: string): boolean => {
  if (!needle) return true

  return (haystack ?? '').toLowerCase().includes(needle.toLowerCase())
}

const lookupRoles = async (query: string): Promise<LookupItem[]> => {
  const rows = await listSellableRoles({ activeOnly: true })

  return rows
    .filter(
      row =>
        matches(row.roleSku, query) ||
        matches(row.roleLabelEs, query) ||
        matches(row.roleLabelEn, query) ||
        matches(row.category, query)
    )
    .map(row => ({
      sku: row.roleSku,
      label: row.roleLabelEs,
      description: row.roleLabelEn ?? null,
      category: row.category,
      metadata: {
        roleId: row.roleId,
        tier: row.tier,
        tierLabel: row.tierLabel,
        canSellAsStaff: row.canSellAsStaff,
        canSellAsServiceComponent: row.canSellAsServiceComponent
      }
    }))
}

const matchesBusinessLine = (applicable: readonly string[] | null | undefined, businessLineCode: string): boolean => {
  if (!applicable || applicable.length === 0) return true

  return applicable.includes(businessLineCode)
}

const lookupTools = async (query: string, businessLineCode: string | null): Promise<LookupItem[]> => {
  const rows = await listToolCatalog({ active: true })

  return rows
    .filter(row => {
      const textMatch =
        matches(row.toolSku, query) ||
        matches(row.toolName, query) ||
        matches(row.vendor, query) ||
        matches(row.toolCategory, query)

      if (!textMatch) return false
      if (!businessLineCode) return true

      const applicable = (row as { applicableBusinessLines?: readonly string[] | null }).applicableBusinessLines

      return matchesBusinessLine(applicable, businessLineCode)
    })
    .map(row => ({
      sku: row.toolSku ?? row.toolId,
      label: row.toolName,
      description: row.vendor,
      category: row.toolCategory,
      metadata: {
        toolId: row.toolId,
        costModel: row.costModel,
        subscriptionAmount: row.subscriptionAmount,
        subscriptionCurrency: row.subscriptionCurrency,
        vendor: row.vendor
      }
    }))
}

const lookupAddons = async (query: string): Promise<LookupItem[]> => {
  const rows = await listOverheadAddons({ active: true })

  return rows
    .filter(
      row =>
        matches(row.addonSku, query) || matches(row.addonName, query) || matches(row.category, query)
    )
    .map(row => ({
      sku: row.addonSku,
      label: row.addonName,
      description: row.category,
      category: row.addonType,
      metadata: {
        unit: row.unit,
        costInternalUsd: row.costInternalUsd,
        marginPct: row.marginPct,
        finalPriceUsd: row.finalPriceUsd,
        finalPricePct: row.finalPricePct
      }
    }))
}

const lookupEmploymentTypes = async (query: string): Promise<LookupItem[]> => {
  const rows = await listEmploymentTypes({ activeOnly: true })

  return rows
    .filter(
      row =>
        matches(row.employmentTypeCode, query) ||
        matches(row.labelEs, query) ||
        matches(row.labelEn, query)
    )
    .map(row => ({
      sku: row.employmentTypeCode,
      label: row.labelEs,
      description: row.labelEn ?? null,
      category: row.countryCode,
      metadata: {
        paymentCurrency: row.paymentCurrency,
        appliesPrevisional: row.appliesPrevisional,
        appliesBonuses: row.appliesBonuses
      }
    }))
}

const lookupServices = async (query: string, businessLineCode: string | null): Promise<LookupItem[]> => {
  const rows = await listServiceCatalog({ activeOnly: true })

  return rows
    .filter(row => {
      const textMatch =
        matches(row.serviceSku, query) ||
        matches(row.moduleName, query) ||
        matches(row.displayName, query) ||
        matches(row.serviceCategory, query)

      if (!textMatch) return false
      if (!businessLineCode) return true
      if (!row.businessLineCode) return true

      return row.businessLineCode === businessLineCode
    })
    .map(row => ({
      sku: row.serviceSku,
      label: row.displayName ?? row.moduleName,
      description: row.defaultDescription ?? row.serviceType,
      category: row.serviceCategory,
      metadata: {
        moduleId: row.moduleId,
        moduleCode: row.moduleCode,
        tier: row.tier,
        commercialModel: row.commercialModel,
        serviceUnit: row.serviceUnit,
        serviceType: row.serviceType,
        defaultDurationMonths: row.defaultDurationMonths,
        businessLineCode: row.businessLineCode,
        roleRecipeCount: row.roleRecipeCount,
        toolRecipeCount: row.toolRecipeCount
      }
    }))
}

const lookupPeople = async (query: string, limit: number): Promise<LookupItem[]> => {
  const pattern = `%${query.replace(/[%_]/g, match => `\\${match}`)}%`

  const rows = await runGreenhousePostgresQuery<{
    member_id: string
    display_name: string | null
    email: string | null
    role_title: string | null
    department_name: string | null
  }>(
    `SELECT member_id, display_name, email, role_title, department_name
       FROM greenhouse_core.team_members
      WHERE active = TRUE
        AND (
          display_name ILIKE $1
          OR email ILIKE $1
          OR role_title ILIKE $1
        )
      ORDER BY display_name NULLS LAST
      LIMIT $2`,
    [pattern, limit]
  )

  return rows.map(row => ({
    sku: row.member_id,
    label: row.display_name ?? 'Sin nombre',
    description: row.email,
    category: row.role_title ?? 'Sin cargo',
    metadata: {
      department: row.department_name
    }
  }))
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const query = (searchParams.get('query') ?? '').trim()
  const businessLineCode = searchParams.get('businessLineCode')
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 10)))

  if (!isLookupType(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${LOOKUP_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  let items: LookupItem[] = []

  try {
    if (type === 'role') items = await lookupRoles(query)
    else if (type === 'tool') items = await lookupTools(query, businessLineCode)
    else if (type === 'addon') items = await lookupAddons(query)
    else if (type === 'employment_type') items = await lookupEmploymentTypes(query)
    else if (type === 'person') items = await lookupPeople(query, limit)
    else if (type === 'service') items = await lookupServices(query, businessLineCode)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lookup failed.'

    return NextResponse.json({ error: message }, { status: 500 })
  }

  const sliced = items.slice(0, limit)

  return NextResponse.json(
    { items: sliced, hasMore: items.length > limit },
    { headers: { 'Cache-Control': 'private, max-age=300' } }
  )
}
