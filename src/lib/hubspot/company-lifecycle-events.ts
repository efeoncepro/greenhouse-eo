import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

type PublishClient = Parameters<typeof publishOutboxEvent>[1]

export interface CompanyLifecycleStageChangedPayload {
  clientId: string
  organizationId: string
  spaceId: string | null
  hubspotCompanyId: string
  fromStage: string
  toStage: string
  source: 'hubspot_live'
}

export const publishCompanyLifecycleStageChanged = async (
  payload: CompanyLifecycleStageChangedPayload,
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.crmCompany,
      aggregateId: payload.clientId,
      eventType: EVENT_TYPES.companyLifecycleStageChanged,
      payload: { ...payload }
    },
    client
  )
