import 'server-only'

import { randomUUID } from 'node:crypto'

import { withTransaction } from '@/lib/db'

import { publishClientInstantiated } from '../party-events'
import {
  organizationHasClient,
  selectOrganizationForLifecycleUpdate
} from '../party-store'
import {
  OrganizationAlreadyHasClientError,
  OrganizationNotFoundError,
  type ClientInstantiationResult,
  type LifecycleTriggerEntity,
  type PartyActor
} from '../types'

interface QueryResultLike<T> {
  rows: T[]
}

interface QueryableClient {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ) => Promise<QueryResultLike<T>>
}

export interface InstantiateClientForPartyInput {
  organizationId: string
  triggerEntity: LifecycleTriggerEntity
  billingDefaults?: {
    paymentCurrency?: 'CLP' | 'USD' | 'UF' | 'UTM'
    paymentTermsDays?: number
  }
  actor: PartyActor
}

const DEFAULT_CURRENCY = 'CLP'
const DEFAULT_PAYMENT_TERMS_DAYS = 30

const normalizeClientId = () => `cli-${randomUUID()}`

export const instantiateClientForParty = async (
  input: InstantiateClientForPartyInput,
  existingClient?: QueryableClient
): Promise<ClientInstantiationResult> => {
  const run = async (txClient: QueryableClient): Promise<ClientInstantiationResult> => {
    const organization = await selectOrganizationForLifecycleUpdate(txClient, input.organizationId)

    if (!organization) {
      throw new OrganizationNotFoundError(input.organizationId)
    }

    const existingClientId = await organizationHasClient(txClient, input.organizationId)

    if (existingClientId) {
      throw new OrganizationAlreadyHasClientError(input.organizationId, existingClientId)
    }

    const clientId = normalizeClientId()

    const tenantType = organization.organization_type === 'efeonce_internal'
      ? 'efeonce_internal'
      : 'client'

    const insertedClient = await txClient.query<{ client_id: string }>(
      `INSERT INTO greenhouse_core.clients (
         client_id,
         client_name,
         legal_name,
         hubspot_company_id,
         tenant_type,
         status,
         active,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, 'active', TRUE, NOW(), NOW())
       RETURNING client_id`,
      [
        clientId,
        organization.organization_name,
        organization.organization_name,
        organization.hubspot_company_id,
        tenantType
      ]
    )

    const insertedClientId = insertedClient.rows[0]?.client_id ?? clientId

    const clientProfileId = `cp-${randomUUID()}`
    const paymentCurrency = input.billingDefaults?.paymentCurrency ?? DEFAULT_CURRENCY
    const paymentTermsDays = input.billingDefaults?.paymentTermsDays ?? DEFAULT_PAYMENT_TERMS_DAYS

    await txClient.query(
      `INSERT INTO greenhouse_finance.client_profiles (
         client_profile_id,
         client_id,
         organization_id,
         legal_name,
         hubspot_company_id,
         payment_currency,
         payment_terms_days,
         requires_po,
         requires_hes,
         created_by_user_id,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, FALSE, $8, NOW(), NOW())`,
      [
        clientProfileId,
        insertedClientId,
        organization.organization_id,
        organization.organization_name,
        organization.hubspot_company_id,
        paymentCurrency,
        paymentTermsDays,
        input.actor.userId ?? 'system'
      ]
    )

    await publishClientInstantiated(
      {
        clientId: insertedClientId,
        clientProfileId,
        organizationId: organization.organization_id,
        commercialPartyId: organization.commercial_party_id,
        triggerEntity: input.triggerEntity,
        actorUserId: input.actor.userId ?? null
      },
      txClient
    )

    return {
      clientId: insertedClientId,
      clientProfileId,
      organizationId: organization.organization_id,
      commercialPartyId: organization.commercial_party_id
    }
  }

  if (existingClient) {
    return run(existingClient)
  }

  return withTransaction(run)
}
