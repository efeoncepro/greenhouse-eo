import 'server-only'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

type PublishClient = Parameters<typeof publishOutboxEvent>[1]

export interface CapacityOvercommitDetectedCommitmentPayload {
  quotation_id: string
  quotation_number: string | null
  quotation_status: string
  quotation_updated_at: string | null
  quotation_sent_at: string | null
  quotation_approved_at: string | null
  line_item_id: string
  line_type: 'person'
  label: string
  hours_estimated: number | null
  fte_allocation: number | null
  resolved_hours: number
  resolved_hours_source: 'hours_estimated' | 'fte_allocation'
}

export interface CapacityOvercommitDetectedPayload {
  member_id: string
  as_of_date: string
  period_year: number
  period_month: number
  contracted_hours: number
  commercial_availability_hours: number
  commitment_hours: number
  overcommit_hours: number
  commitment_count: number
  commitments: CapacityOvercommitDetectedCommitmentPayload[]
}

export const publishCapacityOvercommitDetected = async (
  payload: CapacityOvercommitDetectedPayload,
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.commercialCapacity,
      aggregateId: payload.member_id,
      eventType: EVENT_TYPES.commercialCapacityOvercommitDetected,
      payload: payload as unknown as Record<string, unknown>
    },
    client
  )
