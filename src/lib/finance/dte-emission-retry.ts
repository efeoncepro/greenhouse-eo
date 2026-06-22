import 'server-only'

import { claimPendingDteEmissions, markDteEmitted, markDteEmissionFailed } from '@/lib/finance/dte-emission-queue'
import { emitDte } from '@/lib/nubox/emission'

export interface DteEmissionRetryResult {
  processed: number
  emitted: number
  failed: number
  message?: string
}

export const processDteEmissionRetryQueue = async (batchSize = 5): Promise<DteEmissionRetryResult> => {
  const items = await claimPendingDteEmissions(batchSize)

  if (items.length === 0) {
    return { processed: 0, emitted: 0, failed: 0, message: 'No pending DTE emissions' }
  }

  let emitted = 0
  let failed = 0

  for (const item of items) {
    try {
      console.log(`[dte-emission-retry] Processing ${item.incomeId} (${item.dteTypeCode}) attempt ${item.attemptCount}`)
      const result = await emitDte({ incomeId: item.incomeId, dteTypeCode: item.dteTypeCode || '33' })

      if (!result.success) {
        await markDteEmissionFailed(
          item.queueId,
          result.error || 'Unknown DTE emission error',
          item.attemptCount,
          item.maxAttempts
        )
        failed++
        continue
      }

      await markDteEmitted(item.queueId)
      emitted++
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)

      await markDteEmissionFailed(item.queueId, errorMsg, item.attemptCount, item.maxAttempts)
      failed++
    }
  }

  return { processed: items.length, emitted, failed }
}
