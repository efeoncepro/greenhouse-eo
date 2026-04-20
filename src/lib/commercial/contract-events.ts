import 'server-only'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

interface QueryableClient {
  query: (text: string, values?: unknown[]) => Promise<unknown>
}

interface BaseContractPayload {
  contractId: string
  contractNumber?: string | null
  clientId?: string | null
  organizationId?: string | null
  spaceId?: string | null
  status?: string | null
  commercialModel?: string | null
  staffingModel?: string | null
  originatorQuoteId?: string | null
}

interface ContractLifecyclePayload extends BaseContractPayload {
  effectiveAt?: string | null
  reason?: string | null
  quotationId?: string | null
  relationshipType?: string | null
}

interface ContractRenewalDuePayload extends BaseContractPayload {
  endDate: string
  daysUntilExpiry: number
  autoRenewal: boolean
}

interface ContractProfitabilityPayload extends BaseContractPayload {
  periodYear: number
  periodMonth: number
  realizedRevenueClp?: number | null
  attributedCostClp?: number | null
  effectiveMarginPct?: number | null
  marginDriftPct?: number | null
}

const publishContractEvent = async <T extends BaseContractPayload>(
  eventType: string,
  payload: T,
  client?: QueryableClient
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.contract,
      aggregateId: payload.contractId,
      eventType,
      payload: { ...payload } as Record<string, unknown>
    },
    client
  )
}

export const publishContractCreated = async (
  payload: ContractLifecyclePayload,
  client?: QueryableClient
) => publishContractEvent(EVENT_TYPES.contractCreated, payload, client)

export const publishContractActivated = async (
  payload: ContractLifecyclePayload,
  client?: QueryableClient
) => publishContractEvent(EVENT_TYPES.contractActivated, payload, client)

export const publishContractRenewed = async (
  payload: ContractLifecyclePayload,
  client?: QueryableClient
) => publishContractEvent(EVENT_TYPES.contractRenewed, payload, client)

export const publishContractModified = async (
  payload: ContractLifecyclePayload,
  client?: QueryableClient
) => publishContractEvent(EVENT_TYPES.contractModified, payload, client)

export const publishContractTerminated = async (
  payload: ContractLifecyclePayload,
  client?: QueryableClient
) => publishContractEvent(EVENT_TYPES.contractTerminated, payload, client)

export const publishContractCompleted = async (
  payload: ContractLifecyclePayload,
  client?: QueryableClient
) => publishContractEvent(EVENT_TYPES.contractCompleted, payload, client)

export const publishContractRenewalDue = async (
  payload: ContractRenewalDuePayload,
  client?: QueryableClient
) => publishContractEvent(EVENT_TYPES.contractRenewalDue, payload, client)

export const publishContractProfitabilityMaterialized = async (
  payload: ContractProfitabilityPayload,
  client?: QueryableClient
) => publishContractEvent(EVENT_TYPES.contractProfitabilityMaterialized, payload, client)
