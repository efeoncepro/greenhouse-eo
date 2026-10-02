import 'server-only'

import { NextResponse } from 'next/server'

import { z } from 'zod'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { AEO_MARKET_ERRORS } from '@/lib/copy/aeo-markets'
import { GrowthMarketError } from '@/lib/growth/markets'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

import type { MarketActor } from './commands'
import { GraderMarketConfigError } from './contracts'

export const marketDomainErrorResponse = (error: unknown) => {
  if (
    (error instanceof GraderMarketConfigError || error instanceof GrowthMarketError) &&
    Object.hasOwn(AEO_MARKET_ERRORS, error.code)
  ) {
    return canonicalErrorResponse(error.code as keyof typeof AEO_MARKET_ERRORS, { statusOverride: error.statusCode })
  }

  return null
}

export const handleMarketRequest = async (work: (actor: MarketActor) => Promise<unknown>, status = 200) => {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  try {
    return NextResponse.json(await work({ subject: tenant, actor: tenant.userId }), { status })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return canonicalErrorResponse('invalid_request')
    const response = marketDomainErrorResponse(error)

    if (response) return response
    captureWithDomain(error, 'growth', { tags: { source: 'aeo_market_api' } })

    return canonicalErrorResponse('internal_error')
  }
}

export const marketAliasSchema = z
  .object({ name: z.string().trim().min(1).max(160), matchMode: z.enum(['word_ci', 'word_cs']) })
  .strict()
export const marketCompetitorSchema = marketAliasSchema.extend({
  aliases: z.array(marketAliasSchema).max(20).optional(),
  matchMode: z.enum(['word_ci', 'word_cs']).optional()
})
