import 'server-only'

import {
  generateProductCatalogDriftRunId,
  writeProductCatalogDriftRunComplete,
  writeProductCatalogDriftRunFailure,
  writeProductCatalogDriftRunStart
} from '@/lib/commercial/product-catalog/drift-run-tracker'
import { runProductCatalogDriftDetection } from '@/lib/commercial/product-catalog/drift-reconciler'

export const runProductCatalogDriftDetectJob = async () => {
  const runId = generateProductCatalogDriftRunId()
  const startedAt = Date.now()

  await writeProductCatalogDriftRunStart({
    runId,
    triggeredBy: 'ops_worker',
    notes: 'product catalog drift detect'
  })

  try {
    const result = await runProductCatalogDriftDetection()
    const durationMs = Date.now() - startedAt

    await writeProductCatalogDriftRunComplete({
      runId,
      status: result.status === 'endpoint_not_deployed' ? 'cancelled' : 'succeeded',
      summary: {
        hubspotItemsRead: result.hubspotItemsRead,
        greenhouseItemsRead: result.greenhouseItemsRead,
        conflictsDetected: result.conflictsDetected,
        conflictsInserted: result.conflictsInserted,
        conflictsRefreshed: result.conflictsRefreshed,
        autoHealed: result.autoHealed,
        alertsSent: result.alertsSent,
        durationMs
      },
      notes: result.message ?? null
    })

    return {
      runId,
      durationMs,
      ...result
    }
  } catch (error) {
    await writeProductCatalogDriftRunFailure({ runId, error })
    throw error
  }
}
