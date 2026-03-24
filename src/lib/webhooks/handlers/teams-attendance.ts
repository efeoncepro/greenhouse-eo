import { registerInboundHandler } from '@/lib/webhooks/inbound'
import { ingestAttendanceRecords } from '@/lib/hr-core/service'
import type { RecordAttendanceInput } from '@/types/hr-core'

registerInboundHandler('hr.attendance.teams', async (_inboxEvent, _rawBody, parsedPayload) => {
  const body = parsedPayload as { entries?: RecordAttendanceInput[] } | null
  const entries = Array.isArray(body?.entries) ? body.entries : []

  if (entries.length === 0) {
    throw new Error('entries is required')
  }

  await ingestAttendanceRecords({ entries, recordedBy: 'teams-webhook' })
})
