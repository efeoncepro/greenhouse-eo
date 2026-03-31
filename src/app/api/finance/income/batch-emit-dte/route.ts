import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { emitDte, type EmitDteResult } from '@/lib/nubox/emission'
import { enqueueDteEmissionWithType } from '@/lib/finance/dte-emission-queue'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const VALID_DTE_CODES = ['33', '34', '56', '61', '38', '39', '41', '52']
const MAX_BATCH_SIZE = 50

const isRetryableDteError = (error: string | null | undefined) => {
  const normalized = (error || '').toLowerCase()

  if (!normalized) return true

  return ![
    'income not found',
    'dte already emitted',
    'no client_id on income',
    'organization not found or missing rut'
  ].some(marker => normalized.includes(marker))
}

export async function POST(request: Request) {
  await requireFinanceTenantContext()

  const body = (await request.json()) as { incomeIds?: string[]; dteTypeCode?: string }

  const { incomeIds, dteTypeCode = '33' } = body

  if (!Array.isArray(incomeIds) || incomeIds.length === 0) {
    return NextResponse.json({ error: 'incomeIds must be a non-empty array' }, { status: 400 })
  }

  if (incomeIds.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Maximum ${MAX_BATCH_SIZE} incomes per batch` },
      { status: 400 }
    )
  }

  if (!VALID_DTE_CODES.includes(dteTypeCode)) {
    return NextResponse.json(
      { error: `Invalid DTE type code. Valid: ${VALID_DTE_CODES.join(', ')}` },
      { status: 400 }
    )
  }

  const results: EmitDteResult[] = []

  // Process sequentially to avoid overwhelming the Nubox API
  for (const incomeId of incomeIds) {
    try {
      const result = await emitDte({ incomeId, dteTypeCode })

      if (!result.success && isRetryableDteError(result.error)) {
        await enqueueDteEmissionWithType(incomeId, 'finance_batch_emit_route', dteTypeCode).catch(() => {})
      }

      results.push(result)
    } catch (error) {
      await enqueueDteEmissionWithType(incomeId, 'finance_batch_emit_route', dteTypeCode).catch(() => {})
      results.push({
        success: false,
        incomeId,
        nuboxDocumentId: null,
        nuboxSiiTrackId: null,
        emissionStatus: null,
        folio: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const succeeded = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return NextResponse.json({
    total: results.length,
    succeeded,
    failed,
    results
  })
}
