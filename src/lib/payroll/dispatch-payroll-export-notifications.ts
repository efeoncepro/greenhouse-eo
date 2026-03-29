import 'server-only'

import { publishPendingOutboxEvents } from '@/lib/sync/outbox-consumer'
import { ensureReactiveSchema, processReactiveEvents } from '@/lib/sync/reactive-consumer'

export interface PayrollExportNotificationDispatchResult {
  outbox: Awaited<ReturnType<typeof publishPendingOutboxEvents>> | null
  reactive: Awaited<ReturnType<typeof processReactiveEvents>> | null
  error?: string
}

export const dispatchPayrollExportNotifications = async (): Promise<PayrollExportNotificationDispatchResult> => {
  let outbox: Awaited<ReturnType<typeof publishPendingOutboxEvents>> | null = null
  let reactive: Awaited<ReturnType<typeof processReactiveEvents>> | null = null
  let error: string | undefined

  try {
    outbox = await publishPendingOutboxEvents({ batchSize: 100 })
  } catch (publishError) {
    error = publishError instanceof Error ? publishError.message : 'Failed to publish outbox events.'
  }

  try {
    await ensureReactiveSchema()
    reactive = await processReactiveEvents({ domain: 'notifications' })
  } catch (reactiveError) {
    error = reactiveError instanceof Error ? reactiveError.message : error || 'Failed to dispatch payroll notifications.'
  }

  return {
    outbox,
    reactive,
    ...(error ? { error } : {})
  }
}
