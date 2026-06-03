import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { upsertCanonicalOrganization } from '@/lib/account-360/organization-identity'
import { instantiateClientForParty } from '@/lib/commercial/party/commands/instantiate-client-for-party'
import { promoteParty } from '@/lib/commercial/party/commands/promote-party'
import { OrganizationAlreadyHasClientError } from '@/lib/commercial/party/types'
import { CURRENCY_DOMAIN_SUPPORT } from '@/lib/finance/currency-domain'

import { provisionClientLifecycle } from './provision-client-lifecycle'
import {
  ClientLifecycleValidationError,
  type ClientLifecycleTriggerSource,
  type ProvisionClientLifecycleResult
} from '../types'

// Wizard origins are richer than OrganizationOrigin; we capture them first-class in
// the case metadata and map to the canonical org origin + case trigger source.
export type WizardOrigin = 'manual' | 'hubspot_company' | 'nubox_sale' | 'adopt'

type BillingCurrency = 'CLP' | 'USD' | 'MXN' | 'UF' | 'UTM'

// Allowed billing currencies = finance_core (CLP/USD/MXN, governed by the registry)
// + CL indexation units (UF/UTM). Derived, NOT hardcoded.
const ALLOWED_BILLING_CURRENCIES: ReadonlySet<string> = new Set<string>([
  ...CURRENCY_DOMAIN_SUPPORT.finance_core,
  'UF',
  'UTM'
])

const ORG_ORIGIN_BY_WIZARD: Record<WizardOrigin, 'manual' | 'adopt'> = {
  manual: 'manual',
  hubspot_company: 'manual',
  nubox_sale: 'manual',
  adopt: 'adopt'
}

export interface ProvisionClientFromWizardInput {
  origin: WizardOrigin
  /** When the operator chose "use the existing org" (dialog branch) — UPDATE path. */
  existingOrganizationId?: string
  identity: {
    organizationName: string
    legalName?: string
    taxId?: string
    taxIdType?: string
    country?: string
    hubspotCompanyId?: string
  }
  finance?: {
    paymentCurrency?: BillingCurrency
    paymentTermsDays?: number
  }
  effectiveDate?: string
  targetCompletionDate?: string
  reason?: string
  hubspotDealId?: string
  clientKind?: string
  triggeredByUserId: string
}

export interface ProvisionClientFromWizardResult {
  organizationId: string
  clientId: string | null
  caseId: string
  status: ProvisionClientLifecycleResult['status']
  checklistItems: ProvisionClientLifecycleResult['checklistItems']
  clientAlreadyExisted: boolean
}

/**
 * Single canonical front door for client birth (TASK-992 Slice 2). In ONE atomic
 * transaction it: (1) writes the org identity + client role via the SSOT
 * `upsertCanonicalOrganization` (TASK-991); (2) instantiates the Cliente +
 * `client_profiles` with the billing currency (incl. MXN); (3) governs the
 * lifecycle transition to `active_client` via `promoteParty` (the only canonical
 * writer of lifecycle_stage + history); (4) opens the observable onboarding case.
 * Idempotent on the client + case (reuses existing ones). The wizard captures
 * `origin`/`clientKind` first-class in the case metadata.
 */
export const provisionClientFromWizard = async (
  input: ProvisionClientFromWizardInput,
  existingClient?: PoolClient
): Promise<ProvisionClientFromWizardResult> => {
  const name = input.identity.organizationName?.trim()

  if (!name) {
    throw new ClientLifecycleValidationError('organization_name_required', 'El nombre de la empresa es obligatorio.', 400)
  }

  const country = input.identity.country?.trim() || null
  const taxId = input.identity.taxId?.trim() || null

  if (!taxId || !country) {
    throw new ClientLifecycleValidationError(
      'identity_incomplete',
      'La identidad tributaria (país + ID tributario) es obligatoria para dar de alta el cliente.',
      400,
      { hasTaxId: Boolean(taxId), hasCountry: Boolean(country) }
    )
  }

  const paymentCurrency = input.finance?.paymentCurrency

  if (paymentCurrency && !ALLOWED_BILLING_CURRENCIES.has(paymentCurrency)) {
    throw new ClientLifecycleValidationError(
      'currency_unsupported',
      `La moneda ${paymentCurrency} no está soportada para facturación.`,
      422,
      { allowed: [...ALLOWED_BILLING_CURRENCIES] }
    )
  }

  const effectiveDate = input.effectiveDate && input.effectiveDate.trim()
    ? input.effectiveDate
    : new Date().toISOString().slice(0, 10)

  const run = async (client: PoolClient): Promise<ProvisionClientFromWizardResult> => {
    // 1. Org row via the canonical SSOT (TASK-991). Sets identity + client role +
    //    type. lifecycle_stage is NOT written here — promoteParty (step 3) is the
    //    only canonical writer of lifecycle_stage + history.
    const org = await upsertCanonicalOrganization(
      {
        existingOrganizationId: input.existingOrganizationId ?? null,
        organizationName: name,
        legalName: input.identity.legalName?.trim() || null,
        taxId,
        taxIdType: input.identity.taxIdType?.trim() || null,
        country,
        hubspotCompanyId: input.identity.hubspotCompanyId?.trim() || null,
        hasClientRole: true,
        origin: ORG_ORIGIN_BY_WIZARD[input.origin]
      },
      client
    )

    // 2. Instantiate the Cliente + client_profiles (idempotent: reuse if it exists).
    let clientId: string | null = null
    let clientAlreadyExisted = false

    try {
      const instantiated = await instantiateClientForParty(
        {
          organizationId: org.organizationId,
          triggerEntity: { type: 'manual', id: 'client_lifecycle_wizard' },
          billingDefaults: paymentCurrency
            ? { paymentCurrency, paymentTermsDays: input.finance?.paymentTermsDays }
            : input.finance?.paymentTermsDays
              ? { paymentTermsDays: input.finance.paymentTermsDays }
              : undefined,
          actor: { userId: input.triggeredByUserId }
        },
        client
      )

      clientId = instantiated.clientId
    } catch (error) {
      if (error instanceof OrganizationAlreadyHasClientError) {
        clientAlreadyExisted = true

        const existing = await client.query<{ client_id: string }>(
          `SELECT client_id FROM greenhouse_finance.client_profiles
           WHERE organization_id = $1 ORDER BY created_at ASC LIMIT 1`,
          [org.organizationId]
        )

        clientId = existing.rows[0]?.client_id ?? null
      } else {
        throw error
      }
    }

    // 3. Govern the lifecycle transition to active_client (promoteParty is the
    //    canonical — and only — writer of lifecycle_stage + history; TASK-991).
    //    Its internal instantiate is a no-op here because the client already
    //    exists from step 2 (preserving the MXN billing profile). Idempotent: a
    //    same-stage promotion (e.g. an already-active org) is a no-op.
    await promoteParty(
      {
        organizationId: org.organizationId,
        toStage: 'active_client',
        source: 'manual',
        actor: { userId: input.triggeredByUserId, reason: input.reason },
        triggerEntity: { type: 'manual', id: 'client_lifecycle_wizard' },
        metadata: { origin: input.origin }
      },
      client
    )

    // 4. Open the observable onboarding case.
    const metadata: Record<string, unknown> = { origin: input.origin }

    if (input.clientKind) metadata.clientKind = input.clientKind

    const lifecycle = await provisionClientLifecycle(
      {
        organizationId: org.organizationId,
        caseKind: 'onboarding',
        triggerSource: input.origin === 'adopt' ? ('adopt' as ClientLifecycleTriggerSource) : 'manual',
        triggeredByUserId: input.triggeredByUserId,
        effectiveDate,
        targetCompletionDate: input.targetCompletionDate,
        reason: input.reason,
        hubspotDealId: input.hubspotDealId,
        metadataExtra: metadata
      },
      client
    )

    return {
      organizationId: org.organizationId,
      clientId,
      caseId: lifecycle.caseId,
      status: lifecycle.status,
      checklistItems: lifecycle.checklistItems,
      clientAlreadyExisted
    }
  }

  return existingClient ? run(existingClient) : withTransaction(run)
}
