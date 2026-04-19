import 'server-only'

import { NextResponse } from 'next/server'

import {
  expandServiceIntoQuoteLines,
  type ExpandServiceInput,
  type ServiceLineOverride
} from '@/lib/commercial/service-catalog-expand'
import type { PricingOutputCurrency } from '@/lib/finance/pricing/contracts'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const COMMERCIAL_MODELS = ['on_going', 'on_demand', 'hybrid', 'license_consulting'] as const
const OUTPUT_CURRENCIES = ['USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN'] as const

type Body = {
  serviceSku?: unknown
  overrides?: unknown
  outputCurrency?: unknown
  countryFactorCode?: unknown
  quoteDate?: unknown
  commercialModelOverride?: unknown
}

const parseOverrides = (value: unknown): { roles?: ServiceLineOverride[]; tools?: ServiceLineOverride[] } | undefined => {
  if (!value || typeof value !== 'object') return undefined

  const source = value as { roles?: unknown; tools?: unknown }

  const mapArr = (input: unknown): ServiceLineOverride[] | undefined => {
    if (!Array.isArray(input)) return undefined

    return input
      .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
      .map(entry => ({
        lineOrder: Number(entry.lineOrder),
        hoursPerPeriod:
          entry.hoursPerPeriod === undefined || entry.hoursPerPeriod === null
            ? null
            : Number(entry.hoursPerPeriod),
        quantity: entry.quantity === undefined || entry.quantity === null ? null : Number(entry.quantity),
        excluded: entry.excluded === true
      }))
      .filter(line => Number.isInteger(line.lineOrder) && line.lineOrder > 0)
  }

  return {
    roles: mapArr(source.roles),
    tools: mapArr(source.tools)
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body

  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const serviceSku = typeof body.serviceSku === 'string' ? body.serviceSku.trim() : ''

  if (!serviceSku) {
    return NextResponse.json({ error: 'serviceSku is required.' }, { status: 400 })
  }

  const outputCurrency =
    typeof body.outputCurrency === 'string' &&
    (OUTPUT_CURRENCIES as readonly string[]).includes(body.outputCurrency)
      ? (body.outputCurrency as PricingOutputCurrency)
      : undefined

  const commercialModelOverride =
    typeof body.commercialModelOverride === 'string' &&
    (COMMERCIAL_MODELS as readonly string[]).includes(body.commercialModelOverride)
      ? (body.commercialModelOverride as (typeof COMMERCIAL_MODELS)[number])
      : null

  const input: ExpandServiceInput = {
    serviceSku,
    overrides: parseOverrides(body.overrides),
    outputCurrency,
    countryFactorCode: typeof body.countryFactorCode === 'string' ? body.countryFactorCode : undefined,
    quoteDate: typeof body.quoteDate === 'string' ? body.quoteDate : undefined,
    commercialModelOverride
  }

  try {
    const result = await expandServiceIntoQuoteLines(input)

    return NextResponse.json({
      service: {
        moduleId: result.service.moduleId,
        moduleCode: result.service.moduleCode,
        serviceSku: result.service.serviceSku,
        displayName: result.service.displayName ?? result.service.moduleName,
        moduleName: result.service.moduleName,
        serviceCategory: result.service.serviceCategory,
        serviceUnit: result.service.serviceUnit,
        commercialModel: result.service.commercialModel,
        tier: result.service.tier,
        defaultDurationMonths: result.service.defaultDurationMonths,
        businessLineCode: result.service.businessLineCode
      },
      lines: result.lines,
      pricing: result.pricing
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to expand service.'

    const status =
      error && typeof error === 'object' && 'status' in error && typeof (error as { status?: unknown }).status === 'number'
        ? (error as { status: number }).status
        : 500

    return NextResponse.json({ error: message }, { status })
  }
}
