import { NextResponse } from 'next/server'

import {
  CURRENCY_CODES,
  setAuthoritativePrice,
  type CurrencyCode
} from '@/lib/commercial/product-catalog-prices'
import { getCommercialProduct } from '@/lib/commercial/product-catalog-store'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────
// TASK-605 Fase E — Admin API: bulk set authoritative prices.
//
// Accepts 1..6 currency entries. Each authoritative upsert also
// recomputes the remaining 5 derived currencies via FX (TASK-602).
// Response reports authoritative rows written + derived + missingRates.
// ─────────────────────────────────────────────────────────────

interface PricesBody {
  prices?: Array<{
    currencyCode: string
    unitPrice: number
  }>
}

const isCurrencyCode = (value: string): value is CurrencyCode =>
  (CURRENCY_CODES as readonly string[]).includes(value)

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const productId = id.trim()

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  const entry = await getCommercialProduct(productId)

  if (!entry) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const body = (await request.json()) as PricesBody
  const inputPrices = Array.isArray(body.prices) ? body.prices : []

  if (inputPrices.length === 0) {
    return NextResponse.json({ error: 'prices array is required' }, { status: 400 })
  }

  const written: Array<{
    currencyCode: CurrencyCode
    authoritative: { unitPrice: number }
    derivedCount: number
    missingRates: CurrencyCode[]
  }> = []

  const errors: Array<{ currencyCode: string; error: string }> = []

  for (const entry of inputPrices) {
    const codeRaw = String(entry.currencyCode || '').toUpperCase().trim()

    if (!isCurrencyCode(codeRaw)) {
      errors.push({ currencyCode: codeRaw, error: `Unsupported currency code; must be one of ${CURRENCY_CODES.join(', ')}` })
      continue
    }

    const price = Number(entry.unitPrice)

    if (!Number.isFinite(price) || price < 0) {
      errors.push({ currencyCode: codeRaw, error: 'unitPrice must be a non-negative finite number' })
      continue
    }

    try {
      const result = await setAuthoritativePrice({
        productId,
        currencyCode: codeRaw,
        unitPrice: price,
        source: 'gh_admin'
      })

      written.push({
        currencyCode: codeRaw,
        authoritative: { unitPrice: result.authoritative.unitPrice },
        derivedCount: result.derived.length,
        missingRates: result.missingRates
      })
    } catch (err) {
      errors.push({
        currencyCode: codeRaw,
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  const status = errors.length === 0 ? 200 : written.length === 0 ? 400 : 207

  return NextResponse.json(
    {
      productId,
      written,
      errors
    },
    { status }
  )
}
