import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  financeSchemaDriftResponse,
  isFinanceSchemaDriftError,
  logFinanceSchemaDrift
} from '@/lib/finance/schema-drift'
import { listCommercialProductCatalog } from '@/lib/commercial/product-catalog-store'
import { requireCommercialTenantContext } from '@/lib/tenant/authorization'
import { roundCurrency, toNumber, toDateString } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface ProductRow extends Record<string, unknown> {
  product_id: string
  name: string
  sku: string | null
  description: string | null
  unit_price: string | number | null
  cost_of_goods_sold: string | number | null
  currency: string
  tax_rate: string | number | null
  is_recurring: boolean
  billing_frequency: string | null
  category: string | null
  is_active: boolean
  source_system: string
  hubspot_product_id: string | null
  created_at: string
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source')
  const active = searchParams.get('active')
  const search = searchParams.get('search')
  const view = searchParams.get('view') === 'canonical' ? 'canonical' : 'finance_legacy'

  if (view === 'canonical') {
    try {
      const { items, total } = await listCommercialProductCatalog({
        search,
        source,
        active: active === 'true' ? true : active === 'false' ? false : null,
        limit: 500
      })

      return NextResponse.json({
        view: 'canonical',
        items: items.map(item => ({
          productId: item.productId,
          financeProductId: item.financeProductId,
          productCode: item.productCode,
          name: item.productName,
          productType: item.productType,
          pricingModel: item.pricingModel,
          businessLineCode: item.businessLineCode,
          defaultUnitPrice:
            item.defaultUnitPrice !== null ? roundCurrency(item.defaultUnitPrice) : null,
          defaultUnit: item.defaultUnit,
          currency: item.defaultCurrency,
          description: item.description,
          isActive: item.active,
          source: item.sourceSystem,
          syncStatus: item.syncStatus,
          syncDirection: item.syncDirection,
          hubspotProductId: item.hubspotProductId,
          lastSyncedAt: item.lastSyncedAt,
          updatedAt: item.updatedAt
        })),
        total
      })
    } catch (error) {
      if (isFinanceSchemaDriftError(error)) {
        logFinanceSchemaDrift('products_canonical', error)

        return financeSchemaDriftResponse('products_canonical', { items: [], total: 0 })
      }

      throw error
    }
  }

  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  const push = (condition: string, value: unknown) => {
    idx++
    conditions.push(condition.replace('$?', `$${idx}`))
    values.push(value)
  }

  if (source) push('source_system = $?', source)
  if (active === 'true') push('is_active = $?', true)
  if (active === 'false') push('is_active = $?', false)

  if (search) {
    idx++

    const searchIdx1 = idx

    idx++

    const searchIdx2 = idx

    conditions.push(`(name ILIKE $${searchIdx1} OR sku ILIKE $${searchIdx2})`)
    values.push(`%${search}%`, `%${search}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const rows = await runGreenhousePostgresQuery<ProductRow>(
      `SELECT product_id, name, sku, description, unit_price, cost_of_goods_sold,
              currency, tax_rate, is_recurring, billing_frequency, category,
              is_active, source_system, hubspot_product_id, created_at
       FROM greenhouse_finance.products
       ${whereClause}
       ORDER BY name ASC
       LIMIT 500`,
      values
    )

    const items = rows.map(r => {
      const price = r.unit_price !== null ? roundCurrency(toNumber(r.unit_price)) : null
      const cogs = r.cost_of_goods_sold !== null ? roundCurrency(toNumber(r.cost_of_goods_sold)) : null
      const margin = price && cogs && price > 0 ? roundCurrency(((price - cogs) / price) * 100) : null

      return {
        productId: String(r.product_id),
        name: String(r.name),
        sku: r.sku ? String(r.sku) : null,
        description: r.description ? String(r.description) : null,
        unitPrice: price,
        costOfGoodsSold: cogs,
        margin,
        currency: String(r.currency || 'CLP'),
        taxRate: r.tax_rate !== null ? toNumber(r.tax_rate) : null,
        isRecurring: Boolean(r.is_recurring),
        billingFrequency: r.billing_frequency ? String(r.billing_frequency) : null,
        category: r.category ? String(r.category) : null,
        isActive: Boolean(r.is_active),
        source: String(r.source_system || 'manual'),
        hubspotProductId: r.hubspot_product_id ? String(r.hubspot_product_id) : null,
        createdAt: toDateString(r.created_at as string | null)
      }
    })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    if (isFinanceSchemaDriftError(error)) {
      logFinanceSchemaDrift('products', error)

      return financeSchemaDriftResponse('products', { items: [], total: 0 })
    }

    throw error
  }
}
