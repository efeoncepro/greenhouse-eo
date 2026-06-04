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

/**
 * TASK-997 Slice 2 — contacto de finanzas persistido con provenance (External
 * Reference). `source='hubspot'` ⇒ `hubspotContactId` apunta a la persona real en
 * `greenhouse_crm.contacts` (elegido del suggest); `source='manual'` ⇒ ingresado a
 * mano (sin id). NUNCA un string suelto: la referencia mantiene la trazabilidad.
 */
export interface FinanceContactRecord {
  name: string
  email: string | null
  role: string | null
  hubspotContactId: string | null
  source: 'hubspot' | 'manual'
}

export interface InstantiateClientForPartyInput {
  organizationId: string
  triggerEntity: LifecycleTriggerEntity
  billingDefaults?: {
    // finance_core currencies (CLP/USD/MXN — TASK-990) + CL indexation units (UF/UTM).
    // The valid finance_core set is governed by CURRENCY_DOMAIN_SUPPORT.finance_core;
    // callers resolving from user input must validate against it (see the wizard composer).
    paymentCurrency?: 'CLP' | 'USD' | 'MXN' | 'UF' | 'UTM'
    paymentTermsDays?: number
  }
  /** TASK-997 Slice 2 — contactos de finanzas (suggest HubSpot o manual). */
  financeContacts?: FinanceContactRecord[]
  /** TASK-1006 — perfil financiero declarado en el alta. Todos opcionales; defaults legacy
   *  preservados cuando no vienen. `billingCountry` ya viene auto-derivado del país de la org
   *  desde la UI. `clients.country_code` NO va aquí: se deriva de organization.country. */
  financeProfile?: {
    billingAddress?: string | null
    billingCountry?: string | null
    requiresPo?: boolean
    requiresHes?: boolean
    currentPoNumber?: string | null
    currentHesNumber?: string | null
    specialConditions?: string | null
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

    // TASK-1006 — país del cliente = país de la org (SSOT). null-safe; trim→null.
    const clientCountryCode =
      typeof organization.country === 'string' && organization.country.trim().length > 0
        ? organization.country.trim()
        : null

    const insertedClient = await txClient.query<{ client_id: string }>(
      `INSERT INTO greenhouse_core.clients (
         client_id,
         client_name,
         legal_name,
         hubspot_company_id,
         country_code,
         tenant_type,
         status,
         active,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 'active', TRUE, NOW(), NOW())
       RETURNING client_id`,
      [
        clientId,
        organization.organization_name,
        organization.organization_name,
        organization.hubspot_company_id,
        clientCountryCode,
        tenantType
      ]
    )

    const insertedClientId = insertedClient.rows[0]?.client_id ?? clientId

    const clientProfileId = `cp-${randomUUID()}`
    const paymentCurrency = input.billingDefaults?.paymentCurrency ?? DEFAULT_CURRENCY
    const paymentTermsDays = input.billingDefaults?.paymentTermsDays ?? DEFAULT_PAYMENT_TERMS_DAYS

    const financeContacts =
      input.financeContacts && input.financeContacts.length > 0
        ? JSON.stringify(input.financeContacts)
        : null

    // TASK-1006 — perfil financiero del alta. Defaults legacy preservados cuando no viene
    // financeProfile (billing_* = null, requires_* = FALSE). El N° OC/HES se persiste solo
    // si el toggle correspondiente está activo (ya normalizado en el route; defensa extra acá).
    const fp = input.financeProfile
    const requiresPo = fp?.requiresPo ?? false
    const requiresHes = fp?.requiresHes ?? false

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
         current_po_number,
         current_hes_number,
         billing_address,
         billing_country,
         special_conditions,
         finance_contacts,
         created_by_user_id,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16, NOW(), NOW())`,
      [
        clientProfileId,
        insertedClientId,
        organization.organization_id,
        organization.organization_name,
        organization.hubspot_company_id,
        paymentCurrency,
        paymentTermsDays,
        requiresPo,
        requiresHes,
        requiresPo ? (fp?.currentPoNumber ?? null) : null,
        requiresHes ? (fp?.currentHesNumber ?? null) : null,
        fp?.billingAddress ?? null,
        fp?.billingCountry ?? null,
        fp?.specialConditions ?? null,
        financeContacts,
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
