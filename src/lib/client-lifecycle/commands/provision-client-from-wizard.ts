import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { coerceHubspotIndustryValue } from '@/config/hubspot-industries'
import { upsertCanonicalOrganization } from '@/lib/account-360/organization-identity'
import type { FinanceContactRecord } from '@/lib/commercial/party/commands/instantiate-client-for-party'
import { writeSpaceNotionSourcesFromIntent, type NotionConnectIntent } from '@/lib/client-onboarding/notion-connect-store'
import { allocateSpaceNumericCode } from '@/lib/services/allocate-space-numeric-code'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
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
    /** TASK-997 Slice 1 — canonical HubSpot industry `value` (e.g. 'RETAIL'). */
    industry?: string
    hubspotCompanyId?: string
  }
  finance?: {
    paymentCurrency?: BillingCurrency
    paymentTermsDays?: number
  }
  /** TASK-997 Slice 2 — contactos de finanzas con provenance (suggest HubSpot o manual). */
  financeContacts?: FinanceContactRecord[]
  /** TASK-997 Slice 3 — bases Notion ancladas (teamspace existente del cliente). */
  notionAnchors?: { notionDatabaseId: string; title: string }[]
  /** TASK-997 Slice 4 / TASK-998 — equipo + canal de Teams anclado (existente del cliente). */
  teamsAnchor?: { teamId: string; teamName: string; channelId?: string; channelName?: string } | null
  /** TASK-998 — intent de connect Notion: secret ya provisionado + db ids elegidos.
   *  Se guarda como metadata del caso; el `space_notion_sources` se escribe cuando
   *  exista el Space. El secret NUNCA queda crudo (acá solo va el `*_SECRET_REF`). */
  notionConnectIntent?: NotionConnectIntent
  /** TASK-998/992 — el Space operativo del cliente. Si se omite, no se crea (legacy). */
  space?: { spaceName?: string; spaceType?: string }
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
  /** TASK-998/992 — Space operativo creado/reusado. null si no hubo client. */
  spaceId: string | null
  /** TASK-998 — true si se escribió space_notion_sources desde el intent. */
  notionConnected: boolean
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
        industry: coerceHubspotIndustryValue(input.identity.industry),
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
          financeContacts: input.financeContacts,
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

    // 2.5 — Space operativo del cliente (canónico: un Cliente = un Space). Idempotente:
    //   reusa el existente; si no, lo crea con numeric_code canónico (allocator con
    //   advisory lock TASK-700). Atómico con la tx del composer.
    let spaceId: string | null = null
    let notionConnected = false

    if (clientId) {
      const existingSpace = await client.query<{ space_id: string }>(
        `SELECT space_id FROM greenhouse_core.spaces WHERE client_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [clientId]
      )

      if (existingSpace.rows[0]) {
        spaceId = existingSpace.rows[0].space_id
      } else {
        const numericCode = await allocateSpaceNumericCode()

        spaceId = `space-${clientId}`

        await client.query(
          `INSERT INTO greenhouse_core.spaces (
             space_id, client_id, organization_id, space_name, space_type, status, active, numeric_code, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, 'active', TRUE, $6, NOW(), NOW())
           ON CONFLICT (space_id) DO NOTHING`,
          [
            spaceId,
            clientId,
            org.organizationId,
            input.space?.spaceName?.trim() || name,
            input.space?.spaceType?.trim() || 'client_space',
            numericCode
          ]
        )

        await publishOutboxEvent(
          {
            aggregateType: 'space',
            aggregateId: spaceId,
            eventType: 'commercial.space.auto_created',
            payload: {
              version: 1,
              spaceId,
              clientId,
              organizationId: org.organizationId,
              clientName: name,
              source: 'client_lifecycle_wizard',
              createdAt: effectiveDate
            }
          },
          client
        )
      }

      // TASK-998 — completa space_notion_sources desde el intent (el Space ya existe).
      if (spaceId && input.notionConnectIntent?.secretRef) {
        const written = await writeSpaceNotionSourcesFromIntent(spaceId, input.notionConnectIntent, input.triggeredByUserId, client)

        notionConnected = written.ok
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

    // TASK-997 Slice 3 — teamspace de Notion anclado (External Reference). Se guarda
    // como intent en la metadata del caso; el aprovisionamiento async lo consume
    // (checklist provision_notion_workspace) para registrar las bases en
    // greenhouse_core.space_notion_sources cuando el space exista. NO se escribe
    // inline (el space aún no existe en el commit del wizard).
    if (input.notionAnchors && input.notionAnchors.length > 0) {
      metadata.notionAnchors = input.notionAnchors.map(a => ({
        notionDatabaseId: a.notionDatabaseId,
        title: a.title
      }))
    }

    // TASK-997 Slice 4 — equipo de Teams anclado (intent). El aprovisionamiento
    // async lo consume para registrar teams_notification_channels cuando aplique.
    if (input.teamsAnchor?.teamId) {
      metadata.teamsAnchor = {
        teamId: input.teamsAnchor.teamId,
        teamName: input.teamsAnchor.teamName,
        channelId: input.teamsAnchor.channelId ?? null,
        channelName: input.teamsAnchor.channelName ?? null
      }
    }

    // TASK-998 — intent de connect Notion (token-por-teamspace). El secret YA está
    // provisionado (el endpoint llamó provisionNotionConnectIntent); acá solo se
    // ancla el `*_SECRET_REF` + los db ids. La escritura a space_notion_sources
    // ocurre cuando el Space exista (checklist provision_notion_workspace). NUNCA
    // se guarda el token crudo.
    if (input.notionConnectIntent?.secretRef) {
      metadata.notionConnectIntent = input.notionConnectIntent
    }

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
      clientAlreadyExisted,
      spaceId,
      notionConnected
    }
  }

  return existingClient ? run(existingClient) : withTransaction(run)
}
