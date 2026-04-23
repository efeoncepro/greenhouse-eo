import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { resolveHubSpotBusinessLine } from '@/lib/business-line/hubspot'
import { query, withTransaction } from '@/lib/db'
import {
  getDealCreationContext,
  validateDealCreationSelection,
  type DealCreationContext
} from '@/lib/commercial/deals-store'
import {
  publishDealCreateApprovalRequested,
  publishDealCreateRequested,
  publishDealCreated,
  publishDealCreatedFromGreenhouse
} from '@/lib/commercial/deal-events'
import { ensureHubSpotDealMetadataFresh } from '@/lib/commercial/deal-metadata-sync'
import {
  createHubSpotGreenhouseDeal,
  type HubSpotGreenhouseCreateDealResponse
} from '@/lib/integrations/hubspot-greenhouse-service'

import { promoteParty } from './promote-party'
import {
  DEAL_CREATE_APPROVAL_THRESHOLD_CLP,
  DEAL_CREATE_FINGERPRINT_WINDOW_SECONDS,
  DEAL_CREATE_RATE_LIMIT_TENANT_MAX,
  DEAL_CREATE_RATE_LIMIT_TENANT_WINDOW_SECONDS,
  DEAL_CREATE_RATE_LIMIT_USER_MAX,
  DEAL_CREATE_RATE_LIMIT_USER_WINDOW_SECONDS,
  DealCreateContextEmptyError,
  DealCreateGovernanceIncompleteError,
  DealCreateMappingMissingError,
  DealCreateRateLimitError,
  DealCreateSelectionInvalidError,
  DealCreateValidationError,
  OrganizationHasNoCompanyError,
  type CreateDealFromQuoteContextInput,
  type CreateDealFromQuoteContextResult,
  type DealCreateAttemptStatus
} from './create-deal-types'

interface ResolvedSelection {
  pipelineId: string
  pipelineLabel: string
  stageId: string
  stageLabel: string
}

interface QueryResultLike<T> {
  rows: T[]
}

// TASK-539: canonical write path for deals originated inside Greenhouse.
//
// Pipeline (all transactional unless noted):
//   1. Validate input + resolve organization.
//   2. Rate limit (per-user 60s / per-tenant 1h) — refuse early with 429.
//   3. Idempotency check — explicit key wins; fingerprint (actor + company +
//      deal_name, 5 min) as a soft defense against double-clicks.
//   4. Threshold check — amount_clp > $50M CLP → persist `pending_approval`,
//      emit approval_requested event, return without calling HubSpot.
//   5. Insert attempt row as `pending` (outside TX — we need its id for
//      idempotency even if the Cloud Run call fails).
//   6. POST to Cloud Run /deals (graceful 404 → `endpoint_not_deployed`).
//   7. Inside a transaction: upsert into `greenhouse_commercial.deals`,
//      promoteParty (prospect→opportunity) if applicable, emit events,
//      mark the attempt `completed`.
//
// The Cloud Run POST is deliberately *outside* the DB transaction. If it
// fails mid-way, we record the failure on the attempt row but DO NOT write
// the deal — callers retry with the same idempotency key and the attempt is
// resumed cleanly.

interface OrganizationRow extends Record<string, unknown> {
  organization_id: string
  organization_name: string | null
  hubspot_company_id: string | null
  lifecycle_stage: string | null
  client_id: string | null
  space_id: string | null
}

interface AttemptRow extends Record<string, unknown> {
  attempt_id: string
  status: DealCreateAttemptStatus
  hubspot_deal_id: string | null
  deal_id: string | null
  approval_id: string | null
  created_at: string
  completed_at: string | null
}

interface ActorOwnerRow extends Record<string, unknown> {
  hubspot_owner_id: string | null
}

interface QuoteContactRow extends Record<string, unknown> {
  quotation_id: string
  contact_identity_profile_id: string | null
  hubspot_contact_id: string | null
  contact_display_name: string | null
}

interface ContactResolutionRow extends Record<string, unknown> {
  identity_profile_id: string
  hubspot_contact_id: string | null
  contact_display_name: string | null
}

interface ResolvedOwner {
  hubspotOwnerUserId: string
}

interface ResolvedContact {
  contactIdentityProfileId: string | null
  hubspotContactId: string | null
  displayName: string | null
}

interface ResolvedDealProperties {
  dealType: string | null
  priority: string | null
}

interface ResolvedBusinessLine {
  requestedCode: string | null
  moduleCode: string | null
  hubspotEnumValue: string | null
}

const assertNonEmpty = (value: string | null | undefined, field: string): string => {
  const trimmed = (value ?? '').trim()

  if (!trimmed) {
    throw new DealCreateValidationError(`${field} is required`)
  }

  return trimmed
}

const normalizeCurrency = (value: string | null | undefined): string => {
  const upper = (value ?? 'CLP').trim().toUpperCase()

  return upper || 'CLP'
}

const runQuery = async <T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
  client?: PoolClient
): Promise<T[]> => {
  if (client) {
    const result = await client.query<T>(text, values) as QueryResultLike<T>

    return result.rows
  }

  return query<T>(text, values)
}

const loadOrganization = async (organizationId: string): Promise<OrganizationRow | null> => {
  const rows = await query<OrganizationRow>(
    `WITH primary_space AS (
       SELECT s.space_id, s.client_id
       FROM greenhouse_core.spaces AS s
       WHERE s.organization_id = $1
         AND s.active = TRUE
       ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.space_id ASC
       LIMIT 1
     )
     SELECT o.organization_id,
            o.organization_name,
            o.hubspot_company_id,
            o.lifecycle_stage,
            ps.client_id,
            ps.space_id
       FROM greenhouse_core.organizations AS o
       LEFT JOIN primary_space AS ps ON TRUE
      WHERE o.organization_id = $1
        AND o.active = TRUE
      LIMIT 1`,
    [organizationId]
  )

  return rows[0] ?? null
}

const loadActorHubSpotOwnerId = async (
  actor: CreateDealFromQuoteContextInput['actor']
): Promise<string | null> => {
  if (actor.memberId) {
    const rows = await query<ActorOwnerRow>(
      `SELECT hubspot_owner_id
         FROM greenhouse_core.members
        WHERE member_id = $1
          AND hubspot_owner_id IS NOT NULL
        LIMIT 1`,
      [actor.memberId]
    )

    if (rows[0]?.hubspot_owner_id) return rows[0].hubspot_owner_id
  }

  if (actor.identityProfileId) {
    const rows = await query<ActorOwnerRow>(
      `SELECT m.hubspot_owner_id
         FROM greenhouse_serving.person_360 AS p360
         JOIN greenhouse_core.members AS m
           ON m.member_id = p360.member_id
        WHERE p360.identity_profile_id = $1
          AND m.hubspot_owner_id IS NOT NULL
        LIMIT 1`,
      [actor.identityProfileId]
    )

    if (rows[0]?.hubspot_owner_id) return rows[0].hubspot_owner_id
  }

  const rows = await query<ActorOwnerRow>(
    `SELECT m.hubspot_owner_id
       FROM greenhouse_serving.person_360 AS p360
       JOIN greenhouse_core.members AS m
         ON m.member_id = p360.member_id
      WHERE p360.user_id = $1
        AND m.hubspot_owner_id IS NOT NULL
      LIMIT 1`,
    [actor.userId]
  )

  return rows[0]?.hubspot_owner_id ?? null
}

const loadQuoteContact = async (
  quotationId: string,
  organizationId: string
): Promise<QuoteContactRow | null> => {
  const rows = await query<QuoteContactRow>(
    `SELECT q.quotation_id,
            q.contact_identity_profile_id,
            COALESCE(p360.hubspot_contact_id, ct.hubspot_contact_id) AS hubspot_contact_id,
            COALESCE(p360.resolved_display_name, ct.display_name) AS contact_display_name
       FROM greenhouse_commercial.quotations AS q
       LEFT JOIN greenhouse_serving.person_360 AS p360
         ON p360.identity_profile_id = q.contact_identity_profile_id
       LEFT JOIN greenhouse_crm.contacts AS ct
         ON ct.linked_identity_profile_id = q.contact_identity_profile_id
        AND ct.is_deleted = FALSE
       WHERE (q.quotation_id = $1 OR q.finance_quote_id = $1)
         AND q.organization_id = $2
       ORDER BY q.updated_at DESC NULLS LAST, q.created_at DESC NULLS LAST
       LIMIT 1`,
    [quotationId, organizationId]
  )

  return rows[0] ?? null
}

const loadContactResolution = async (
  identityProfileId: string
): Promise<ContactResolutionRow | null> => {
  const rows = await query<ContactResolutionRow>(
    `SELECT p360.identity_profile_id,
            COALESCE(p360.hubspot_contact_id, ct.hubspot_contact_id) AS hubspot_contact_id,
            COALESCE(p360.resolved_display_name, ct.display_name) AS contact_display_name
       FROM greenhouse_serving.person_360 AS p360
       LEFT JOIN greenhouse_crm.contacts AS ct
         ON ct.linked_identity_profile_id = p360.identity_profile_id
        AND ct.is_deleted = FALSE
       WHERE p360.identity_profile_id = $1
       LIMIT 1`,
    [identityProfileId]
  )

  return rows[0] ?? null
}

const resolveOwner = async (
  input: CreateDealFromQuoteContextInput,
  creationContext: DealCreationContext
): Promise<ResolvedOwner> => {
  const explicitOwner = input.ownerHubspotUserId?.trim() || null

  if (explicitOwner) {
    return { hubspotOwnerUserId: explicitOwner }
  }

  const actorOwner = await loadActorHubSpotOwnerId(input.actor)

  if (actorOwner) {
    return { hubspotOwnerUserId: actorOwner }
  }

  const defaultOwner = creationContext.defaultOwnerHubspotUserId?.trim() || null

  if (defaultOwner) {
    return { hubspotOwnerUserId: defaultOwner }
  }

  throw new DealCreateMappingMissingError('owner_mapping_missing', {
    userId: input.actor.userId,
    memberId: input.actor.memberId ?? null,
    identityProfileId: input.actor.identityProfileId ?? null
  })
}

const resolveContact = async (
  input: CreateDealFromQuoteContextInput
): Promise<ResolvedContact> => {
  const explicitContactIdentityProfileId = input.contactIdentityProfileId?.trim() || null

  if (explicitContactIdentityProfileId) {
    const resolution = await loadContactResolution(explicitContactIdentityProfileId)

    if (!resolution?.hubspot_contact_id) {
      throw new DealCreateMappingMissingError('contact_mapping_missing', {
        contactIdentityProfileId: explicitContactIdentityProfileId
      })
    }

    return {
      contactIdentityProfileId: explicitContactIdentityProfileId,
      hubspotContactId: resolution.hubspot_contact_id,
      displayName: resolution.contact_display_name ?? null
    }
  }

  const quotationId = input.quotationId?.trim() || null

  if (!quotationId) {
    return {
      contactIdentityProfileId: null,
      hubspotContactId: null,
      displayName: null
    }
  }

  const quoteContact = await loadQuoteContact(quotationId, input.organizationId)

  if (!quoteContact?.contact_identity_profile_id) {
    return {
      contactIdentityProfileId: null,
      hubspotContactId: null,
      displayName: null
    }
  }

  if (!quoteContact.hubspot_contact_id) {
    throw new DealCreateMappingMissingError('contact_mapping_missing', {
      quotationId,
      contactIdentityProfileId: quoteContact.contact_identity_profile_id
    })
  }

  return {
    contactIdentityProfileId: quoteContact.contact_identity_profile_id,
    hubspotContactId: quoteContact.hubspot_contact_id,
    displayName: quoteContact.contact_display_name ?? null
  }
}

const resolveGovernedOption = (
  propertyName: 'dealType' | 'priority',
  explicitValue: string | null | undefined,
  defaultValue: string | null,
  options: DealCreationContext['dealTypeOptions']
): string | null => {
  const normalizedExplicit = explicitValue?.trim() || null

  if (options.length === 0) {
    if (normalizedExplicit) {
      throw new DealCreateGovernanceIncompleteError(`${propertyName}_metadata_missing`, {
        propertyName,
        requestedValue: normalizedExplicit
      })
    }

    return null
  }

  const selectedValue = normalizedExplicit ?? defaultValue

  if (!selectedValue) {
    throw new DealCreateGovernanceIncompleteError(`${propertyName}_default_missing`, {
      propertyName,
      availableValues: options.map(option => option.value)
    })
  }

  if (!options.some(option => option.value === selectedValue)) {
    throw new DealCreateValidationError(`${propertyName} is not a valid HubSpot option`, {
      propertyName,
      requestedValue: selectedValue,
      availableValues: options.map(option => option.value)
    })
  }

  return selectedValue
}

const resolveDealProperties = (
  input: CreateDealFromQuoteContextInput,
  creationContext: DealCreationContext
): ResolvedDealProperties => ({
  dealType: resolveGovernedOption(
    'dealType',
    input.dealType,
    creationContext.defaultDealType,
    creationContext.dealTypeOptions
  ),
  priority: resolveGovernedOption(
    'priority',
    input.priority,
    creationContext.defaultPriority,
    creationContext.priorityOptions
  )
})

const resolveBusinessLine = async (
  input: CreateDealFromQuoteContextInput
): Promise<ResolvedBusinessLine> => {
  const requestedCode = input.businessLineCode?.trim() || input.actor.businessLineCode?.trim() || null

  if (!requestedCode) {
    return {
      requestedCode: null,
      moduleCode: null,
      hubspotEnumValue: null
    }
  }

  const resolved = await resolveHubSpotBusinessLine(requestedCode)

  return {
    requestedCode,
    moduleCode: resolved?.moduleCode ?? null,
    hubspotEnumValue: resolved?.hubspotEnumValue ?? null
  }
}

const findExistingAttemptByKey = async (idempotencyKey: string): Promise<AttemptRow | null> => {
  const rows = await query<AttemptRow>(
    `SELECT attempt_id, status, hubspot_deal_id, deal_id, approval_id,
            created_at::text AS created_at, completed_at::text AS completed_at
       FROM greenhouse_commercial.deal_create_attempts
       WHERE idempotency_key = $1
       LIMIT 1`,
    [idempotencyKey]
  )

  return rows[0] ?? null
}

const findRecentFingerprint = async (
  actorUserId: string,
  hubspotCompanyId: string | null,
  dealName: string
): Promise<AttemptRow | null> => {
  const rows = await query<AttemptRow>(
    `SELECT attempt_id, status, hubspot_deal_id, deal_id, approval_id,
            created_at::text AS created_at, completed_at::text AS completed_at
       FROM greenhouse_commercial.deal_create_attempts
       WHERE actor_user_id = $1
         AND COALESCE(hubspot_company_id, '') = COALESCE($2, '')
         AND deal_name = $3
         AND status IN ('completed', 'pending_approval', 'pending')
         AND created_at > NOW() - ($4::integer * INTERVAL '1 second')
       ORDER BY created_at DESC
       LIMIT 1`,
    [actorUserId, hubspotCompanyId, dealName, DEAL_CREATE_FINGERPRINT_WINDOW_SECONDS]
  )

  return rows[0] ?? null
}

const countAttemptsInWindow = async (
  scope: { column: 'actor_user_id' | 'tenant_scope'; value: string },
  windowSeconds: number
): Promise<number> => {
  const rows = await query<{ count: string | number }>(
    `SELECT COUNT(*)::text AS count
       FROM greenhouse_commercial.deal_create_attempts
       WHERE ${scope.column} = $1
         AND created_at > NOW() - ($2::integer * INTERVAL '1 second')
         AND status IN ('completed', 'pending_approval', 'pending')`,
    [scope.value, windowSeconds]
  )

  return Number(rows[0]?.count ?? 0)
}

const enforceRateLimits = async (actor: { userId: string; tenantScope: string }): Promise<void> => {
  const userCount = await countAttemptsInWindow(
    { column: 'actor_user_id', value: actor.userId },
    DEAL_CREATE_RATE_LIMIT_USER_WINDOW_SECONDS
  )

  if (userCount >= DEAL_CREATE_RATE_LIMIT_USER_MAX) {
    throw new DealCreateRateLimitError(
      'user',
      DEAL_CREATE_RATE_LIMIT_USER_WINDOW_SECONDS,
      userCount,
      DEAL_CREATE_RATE_LIMIT_USER_MAX
    )
  }

  const tenantCount = await countAttemptsInWindow(
    { column: 'tenant_scope', value: actor.tenantScope },
    DEAL_CREATE_RATE_LIMIT_TENANT_WINDOW_SECONDS
  )

  if (tenantCount >= DEAL_CREATE_RATE_LIMIT_TENANT_MAX) {
    throw new DealCreateRateLimitError(
      'tenant',
      DEAL_CREATE_RATE_LIMIT_TENANT_WINDOW_SECONDS,
      tenantCount,
      DEAL_CREATE_RATE_LIMIT_TENANT_MAX
    )
  }
}

const insertPendingAttempt = async (input: {
  idempotencyKey: string | null
  organizationId: string
  hubspotCompanyId: string | null
  actorUserId: string
  tenantScope: string
  dealName: string
  amount: number | null
  amountClp: number | null
  currency: string
  pipelineId: string | null
  stageId: string | null
  ownerHubspotUserId: string | null
  contactIdentityProfileId: string | null
  hubspotContactId: string | null
  dealType: string | null
  priority: string | null
  businessLineCode: string | null
  metadata: Record<string, unknown>
}): Promise<string> => {
  const rows = await query<{ attempt_id: string }>(
    `INSERT INTO greenhouse_commercial.deal_create_attempts (
       idempotency_key,
       organization_id,
       hubspot_company_id,
       actor_user_id,
       tenant_scope,
       deal_name,
       amount,
       amount_clp,
       currency,
       pipeline_id,
       stage_id,
       owner_hubspot_user_id,
       contact_identity_profile_id,
       hubspot_contact_id,
       deal_type,
       priority,
       business_line_code,
       metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb)
     RETURNING attempt_id`,
    [
      input.idempotencyKey,
      input.organizationId,
      input.hubspotCompanyId,
      input.actorUserId,
      input.tenantScope,
      input.dealName,
      input.amount,
      input.amountClp,
      input.currency,
      input.pipelineId,
      input.stageId,
      input.ownerHubspotUserId,
      input.contactIdentityProfileId,
      input.hubspotContactId,
      input.dealType,
      input.priority,
      input.businessLineCode,
      JSON.stringify(input.metadata)
    ]
  )

  const row = rows[0]

  if (!row) throw new Error('Failed to persist deal_create_attempts row')

  return row.attempt_id
}

const finalizeAttempt = async (
  attemptId: string,
  update: {
    status: DealCreateAttemptStatus
    hubspotDealId?: string | null
    dealId?: string | null
    approvalId?: string | null
    errorCode?: string | null
    errorMessage?: string | null
  }
): Promise<void> => {
  await query(
    `UPDATE greenhouse_commercial.deal_create_attempts
        SET status = $2,
            hubspot_deal_id = COALESCE($3, hubspot_deal_id),
            deal_id = COALESCE($4, deal_id),
            approval_id = COALESCE($5, approval_id),
            error_code = $6,
            error_message = $7,
            completed_at = NOW()
      WHERE attempt_id = $1`,
    [
      attemptId,
      update.status,
      update.hubspotDealId ?? null,
      update.dealId ?? null,
      update.approvalId ?? null,
      update.errorCode ?? null,
      update.errorMessage ?? null
    ]
  )
}

const insertOrUpdateDealRow = async (
  cloudRunResponse: HubSpotGreenhouseCreateDealResponse,
  organization: OrganizationRow,
  input: CreateDealFromQuoteContextInput,
  attemptId: string,
  selection: ResolvedSelection,
  ownerHubspotUserId: string,
  resolvedContact: ResolvedContact,
  resolvedProperties: ResolvedDealProperties,
  client?: PoolClient
): Promise<string> => {
  if (!cloudRunResponse.hubspotDealId) {
    throw new Error('Cloud Run /deals returned success without hubspotDealId')
  }

  // Resolved values are source of truth; Cloud Run echoes override them only
  // when the external service reshaped the request.
  const effectivePipelineId = cloudRunResponse.pipelineUsed ?? selection.pipelineId
  const effectiveStageId = cloudRunResponse.stageUsed ?? selection.stageId

  const pipelineLabel = cloudRunResponse.pipelineUsed && cloudRunResponse.pipelineUsed !== selection.pipelineId
    ? cloudRunResponse.pipelineUsed
    : selection.pipelineLabel

  const stageLabel = cloudRunResponse.stageUsed && cloudRunResponse.stageUsed !== selection.stageId
    ? cloudRunResponse.stageUsed
    : selection.stageLabel

  const rows = await runQuery<{ deal_id: string }>(
    `INSERT INTO greenhouse_commercial.deals (
       hubspot_deal_id,
       hubspot_pipeline_id,
       client_id,
       organization_id,
       space_id,
       deal_name,
       dealstage,
       dealstage_label,
       pipeline_name,
       deal_type,
       priority,
       amount,
       amount_clp,
       currency,
       deal_owner_hubspot_user_id,
       deal_owner_user_id,
       contact_identity_profile_id,
       hubspot_contact_id,
       source_payload,
       created_in_hubspot_at,
       hubspot_last_synced_at,
       created_at,
       updated_at
      ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, NOW(), NOW(), NOW(), NOW()
      )
     ON CONFLICT (hubspot_deal_id) DO UPDATE
       SET deal_name = EXCLUDED.deal_name,
           deal_type = COALESCE(EXCLUDED.deal_type, deals.deal_type),
           priority = COALESCE(EXCLUDED.priority, deals.priority),
           amount = COALESCE(EXCLUDED.amount, deals.amount),
           amount_clp = COALESCE(EXCLUDED.amount_clp, deals.amount_clp),
           currency = EXCLUDED.currency,
           hubspot_pipeline_id = COALESCE(EXCLUDED.hubspot_pipeline_id, deals.hubspot_pipeline_id),
           dealstage = COALESCE(EXCLUDED.dealstage, deals.dealstage),
           dealstage_label = COALESCE(EXCLUDED.dealstage_label, deals.dealstage_label),
           pipeline_name = COALESCE(EXCLUDED.pipeline_name, deals.pipeline_name),
           deal_owner_hubspot_user_id = COALESCE(EXCLUDED.deal_owner_hubspot_user_id, deals.deal_owner_hubspot_user_id),
           deal_owner_user_id = COALESCE(EXCLUDED.deal_owner_user_id, deals.deal_owner_user_id),
           contact_identity_profile_id = COALESCE(EXCLUDED.contact_identity_profile_id, deals.contact_identity_profile_id),
           hubspot_contact_id = COALESCE(EXCLUDED.hubspot_contact_id, deals.hubspot_contact_id),
           source_payload = EXCLUDED.source_payload,
           updated_at = NOW(),
           hubspot_last_synced_at = NOW()
     RETURNING deal_id`,
    [
      cloudRunResponse.hubspotDealId,
      effectivePipelineId,
      organization.client_id,
      organization.organization_id,
      organization.space_id,
      input.dealName,
      effectiveStageId,
      stageLabel,
      pipelineLabel,
      cloudRunResponse.dealTypeUsed ?? resolvedProperties.dealType,
      cloudRunResponse.priorityUsed ?? resolvedProperties.priority,
      input.amount ?? null,
      input.amountClp ?? null,
      normalizeCurrency(input.currency),
      ownerHubspotUserId,
      input.actor.userId,
      resolvedContact.contactIdentityProfileId,
      resolvedContact.hubspotContactId,
      JSON.stringify({
        origin: 'greenhouse_quote_builder',
        attempt_id: attemptId,
        quotation_id: input.quotationId ?? null,
        contact_identity_profile_id: resolvedContact.contactIdentityProfileId,
        hubspot_contact_id: resolvedContact.hubspotContactId,
        cloud_run_response: { status: cloudRunResponse.status },
        resolved_selection: selection,
        resolved_owner_hubspot_user_id: ownerHubspotUserId,
        resolved_properties: {
          dealType: cloudRunResponse.dealTypeUsed ?? resolvedProperties.dealType,
          priority: cloudRunResponse.priorityUsed ?? resolvedProperties.priority
        }
      })
    ],
    client
  )

  const row = rows[0]

  if (!row) throw new Error('Failed to upsert deals row after HubSpot create')

  return row.deal_id
}

const resolveSelection = async (
  input: CreateDealFromQuoteContextInput,
  context: DealCreationContext
): Promise<ResolvedSelection> => {
  if (context.pipelines.length === 0) {
    throw new DealCreateContextEmptyError()
  }

  const pipelineId = input.pipelineId ?? context.defaultPipelineId
  const stageId = input.stageId ?? context.defaultStageId

  if (!pipelineId || !stageId) {
    throw new DealCreateSelectionInvalidError(
      !pipelineId ? 'pipeline_unknown' : 'stage_unknown',
      {
        pipelineProvided: pipelineId,
        stageProvided: stageId,
        defaultsSource: context.defaultsSource
      }
    )
  }

  const validation = await validateDealCreationSelection({
    pipelineId,
    stageId,
    context
  })

  if (!validation.valid) {
    throw new DealCreateSelectionInvalidError(validation.errorCode!, {
      pipelineId,
      stageId,
      pipelineLabel: validation.pipelineLabel ?? null,
      stageLabel: validation.stageLabel ?? null
    })
  }

  return {
    pipelineId,
    pipelineLabel: validation.pipelineLabel ?? pipelineId,
    stageId,
    stageLabel: validation.stageLabel ?? stageId
  }
}

/**
 * Canonical entry point for inline deal creation from the Quote Builder.
 *
 * Capability is enforced at the route layer via `hasEntitlement(subject,
 * 'commercial.deal.create', 'create')`. This function assumes the caller
 * has already validated the capability.
 */
export const createDealFromQuoteContext = async (
  input: CreateDealFromQuoteContextInput
): Promise<CreateDealFromQuoteContextResult> => {
  const dealName = assertNonEmpty(input.dealName, 'dealName')

  assertNonEmpty(input.organizationId, 'organizationId')
  assertNonEmpty(input.actor.userId, 'actor.userId')
  assertNonEmpty(input.actor.tenantScope, 'actor.tenantScope')

  const organization = await loadOrganization(input.organizationId)

  if (!organization) {
    throw new DealCreateValidationError(`Organization ${input.organizationId} not found`, {
      organizationId: input.organizationId
    })
  }

  if (!organization.hubspot_company_id) {
    throw new OrganizationHasNoCompanyError(input.organizationId)
  }

  // 1. Idempotency check — explicit key short-circuits.
  if (input.idempotencyKey) {
    const existing = await findExistingAttemptByKey(input.idempotencyKey)

    if (existing) {
      return {
        attemptId: existing.attempt_id,
        status: existing.status,
        dealId: existing.deal_id,
        hubspotDealId: existing.hubspot_deal_id,
        dealNameUsed: null,
        organizationPromoted: false,
        requiresApproval: existing.status === 'pending_approval',
        approvalId: existing.approval_id,
        message: `Idempotent hit on existing attempt ${existing.attempt_id} (status=${existing.status})`,
        pipelineUsed: null,
        pipelineLabelUsed: null,
        stageUsed: null,
        stageLabelUsed: null,
        dealTypeUsed: null,
        priorityUsed: null,
        ownerUsed: null,
        contactIdentityProfileIdUsed: null,
        contactUsed: null
      }
    }
  } else {
    // Soft fingerprint dedupe for actors without an explicit key.
    const fingerprint = await findRecentFingerprint(
      input.actor.userId,
      organization.hubspot_company_id,
      dealName
    )

    if (fingerprint) {
      return {
        attemptId: fingerprint.attempt_id,
        status: fingerprint.status,
        dealId: fingerprint.deal_id,
        hubspotDealId: fingerprint.hubspot_deal_id,
        dealNameUsed: null,
        organizationPromoted: false,
        requiresApproval: fingerprint.status === 'pending_approval',
        approvalId: fingerprint.approval_id,
        message: `Fingerprint dedupe — reusing attempt ${fingerprint.attempt_id} from ${fingerprint.created_at}`,
        pipelineUsed: null,
        pipelineLabelUsed: null,
        stageUsed: null,
        stageLabelUsed: null,
        dealTypeUsed: null,
        priorityUsed: null,
        ownerUsed: null,
        contactIdentityProfileIdUsed: null,
        contactUsed: null
      }
    }
  }

  // 1.5 Resolve pipeline/stage selection from governance registry. Throws
  // DealCreateSelectionInvalidError or DealCreateContextEmptyError — the
  // route layer maps those to 422/409.
  try {
    await ensureHubSpotDealMetadataFresh()
  } catch (error) {
    console.error('[createDealFromQuoteContext] metadata refresh failed', error)
  }

  const resolvedBusinessLine = await resolveBusinessLine(input)

  const creationContext = await getDealCreationContext({
    tenantScope: input.actor.tenantScope,
    businessLineCode: resolvedBusinessLine.moduleCode
  })

  if (creationContext.blockingIssues.length > 0) {
    throw new DealCreateGovernanceIncompleteError('context_not_ready', {
      blockingIssues: creationContext.blockingIssues
    })
  }

  const selection = await resolveSelection(input, creationContext)
  const resolvedOwner = await resolveOwner(input, creationContext)
  const resolvedContact = await resolveContact(input)
  const resolvedProperties = resolveDealProperties(input, creationContext)

  // 2. Rate limit. Throws DealCreateRateLimitError → 429 at the route layer.
  await enforceRateLimits(input.actor)

  // 3. Insert pending attempt row (outside tx — idempotency substrate).
  const attemptId = await insertPendingAttempt({
    idempotencyKey: input.idempotencyKey ?? null,
    organizationId: organization.organization_id,
    hubspotCompanyId: organization.hubspot_company_id,
    actorUserId: input.actor.userId,
    tenantScope: input.actor.tenantScope,
    dealName,
    amount: input.amount ?? null,
    amountClp: input.amountClp ?? null,
    currency: normalizeCurrency(input.currency),
    pipelineId: selection.pipelineId,
    stageId: selection.stageId,
    ownerHubspotUserId: resolvedOwner.hubspotOwnerUserId,
    contactIdentityProfileId: resolvedContact.contactIdentityProfileId,
    hubspotContactId: resolvedContact.hubspotContactId,
    dealType: resolvedProperties.dealType,
    priority: resolvedProperties.priority,
    businessLineCode: resolvedBusinessLine.moduleCode,
    metadata: {
      origin: 'greenhouse_quote_builder',
      quotation_id: input.quotationId ?? null,
      contact_identity_profile_id: resolvedContact.contactIdentityProfileId,
      hubspot_contact_id: resolvedContact.hubspotContactId,
      requested_business_line_code: resolvedBusinessLine.requestedCode,
      resolved_business_line_code: resolvedBusinessLine.moduleCode,
      resolved_hubspot_business_line: resolvedBusinessLine.hubspotEnumValue,
      resolved_selection: selection,
      resolved_properties: resolvedProperties,
      defaults_source: creationContext.defaultsSource
    }
  })

  await publishDealCreateRequested({
    attemptId,
    organizationId: organization.organization_id,
    hubspotCompanyId: organization.hubspot_company_id,
    actorUserId: input.actor.userId,
    dealName,
    amountClp: input.amountClp ?? null,
    idempotencyKey: input.idempotencyKey ?? null
  })

  // 4. Threshold check — high-value deals require approval before HubSpot.
  if (input.amountClp !== null && input.amountClp !== undefined && input.amountClp > DEAL_CREATE_APPROVAL_THRESHOLD_CLP) {
    const approvalId = `deal-approval-${randomUUID()}`

    await finalizeAttempt(attemptId, {
      status: 'pending_approval',
      approvalId,
      errorCode: null,
      errorMessage: null
    })

    await publishDealCreateApprovalRequested({
      attemptId,
      organizationId: organization.organization_id,
      hubspotCompanyId: organization.hubspot_company_id,
      actorUserId: input.actor.userId,
      dealName,
      amountClp: input.amountClp,
      thresholdClp: DEAL_CREATE_APPROVAL_THRESHOLD_CLP,
      approvalId
    })

    return {
      attemptId,
      status: 'pending_approval',
      dealId: null,
      hubspotDealId: null,
      dealNameUsed: dealName,
      organizationPromoted: false,
      requiresApproval: true,
      approvalId,
      message: `Deal exceeds CLP ${DEAL_CREATE_APPROVAL_THRESHOLD_CLP.toLocaleString('es-CL')} threshold — approval pending.`,
      pipelineUsed: selection.pipelineId,
      pipelineLabelUsed: selection.pipelineLabel,
      stageUsed: selection.stageId,
      stageLabelUsed: selection.stageLabel,
      dealTypeUsed: resolvedProperties.dealType,
      priorityUsed: resolvedProperties.priority,
      ownerUsed: resolvedOwner.hubspotOwnerUserId,
      contactIdentityProfileIdUsed: resolvedContact.contactIdentityProfileId,
      contactUsed: resolvedContact.hubspotContactId
    }
  }

  // 5. POST to Cloud Run. Wrap in try/catch so failures are recorded.
  let response: HubSpotGreenhouseCreateDealResponse

  try {
    response = await createHubSpotGreenhouseDeal({
      idempotencyKey: input.idempotencyKey ?? attemptId,
      hubspotCompanyId: organization.hubspot_company_id,
      dealName,
      amount: input.amount ?? null,
      currency: normalizeCurrency(input.currency),
      pipelineId: selection.pipelineId,
      stageId: selection.stageId,
      dealType: resolvedProperties.dealType,
      priority: resolvedProperties.priority,
      ownerHubspotUserId: resolvedOwner.hubspotOwnerUserId,
      closeDate: input.closeDateHint ?? null,
      businessLineCode: resolvedBusinessLine.hubspotEnumValue,
      origin: 'greenhouse_quote_builder',
      correlationId: attemptId,
      hubspotContactId: resolvedContact.hubspotContactId
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    await finalizeAttempt(attemptId, {
      status: 'failed',
      errorCode: 'CLOUD_RUN_ERROR',
      errorMessage: message
    })

    throw error
  }

  if (response.status === 'endpoint_not_deployed') {
    await finalizeAttempt(attemptId, {
      status: 'endpoint_not_deployed',
      errorCode: 'CLOUD_RUN_ENDPOINT_MISSING',
      errorMessage: response.message ?? null
    })

    return {
      attemptId,
      status: 'endpoint_not_deployed',
      dealId: null,
      hubspotDealId: null,
      dealNameUsed: dealName,
      organizationPromoted: false,
      requiresApproval: false,
      approvalId: null,
      message:
        response.message ?? 'Cloud Run /deals endpoint not deployed yet — attempt persisted for replay.',
      pipelineUsed: selection.pipelineId,
      pipelineLabelUsed: selection.pipelineLabel,
      stageUsed: selection.stageId,
      stageLabelUsed: selection.stageLabel,
      dealTypeUsed: resolvedProperties.dealType,
      priorityUsed: resolvedProperties.priority,
      ownerUsed: resolvedOwner.hubspotOwnerUserId,
      contactIdentityProfileIdUsed: resolvedContact.contactIdentityProfileId,
      contactUsed: resolvedContact.hubspotContactId
    }
  }

  // 6. Persist deal + promote party + emit events, all in one transaction.
  const effectiveOwner = response.ownerUsed ?? resolvedOwner.hubspotOwnerUserId

  const { dealId, organizationPromoted } = await withTransaction(async client => {
    const newDealId = await insertOrUpdateDealRow(
      response,
      organization,
      input,
      attemptId,
      selection,
      effectiveOwner,
      resolvedContact,
      resolvedProperties,
      client
    )

    let promoted = false

    if (organization.lifecycle_stage === 'prospect') {
      await promoteParty({
        organizationId: organization.organization_id,
        toStage: 'opportunity',
        source: 'deal_won',
        actor: { userId: input.actor.userId, reason: 'First deal created from Quote Builder' },
        triggerEntity: { type: 'deal', id: newDealId }
      }, client)
      promoted = true
    }

    await publishDealCreated({
      dealId: newDealId,
      hubspotDealId: response.hubspotDealId ?? '',
      hubspotPipelineId: response.pipelineUsed ?? selection.pipelineId,
      dealstage: response.stageUsed ?? selection.stageId,
      clientId: organization.client_id,
      organizationId: organization.organization_id,
      spaceId: organization.space_id,
      amountClp: input.amountClp ?? null,
      currency: normalizeCurrency(input.currency),
      closeDate: input.closeDateHint ?? null
    }, client)

    await publishDealCreatedFromGreenhouse({
      dealId: newDealId,
      hubspotDealId: response.hubspotDealId ?? '',
      organizationId: organization.organization_id,
      hubspotCompanyId: organization.hubspot_company_id,
      dealName,
      amount: input.amount ?? null,
      amountClp: input.amountClp ?? null,
      currency: normalizeCurrency(input.currency),
      pipelineId: response.pipelineUsed ?? selection.pipelineId,
      stageId: response.stageUsed ?? selection.stageId,
      dealType: response.dealTypeUsed ?? resolvedProperties.dealType,
      priority: response.priorityUsed ?? resolvedProperties.priority,
      ownerHubspotUserId: effectiveOwner,
      contactIdentityProfileId: resolvedContact.contactIdentityProfileId,
      hubspotContactId: resolvedContact.hubspotContactId,
      actorUserId: input.actor.userId,
      quotationId: input.quotationId ?? null,
      origin: 'greenhouse_quote_builder',
      attemptId
    }, client)

    return { dealId: newDealId, organizationPromoted: promoted }
  })

  await finalizeAttempt(attemptId, {
    status: 'completed',
    hubspotDealId: response.hubspotDealId,
    dealId
  })

  const effectivePipelineId = response.pipelineUsed ?? selection.pipelineId
  const effectiveStageId = response.stageUsed ?? selection.stageId

  const effectivePipelineLabel =
    response.pipelineUsed && response.pipelineUsed !== selection.pipelineId
      ? response.pipelineUsed
      : selection.pipelineLabel

  const effectiveStageLabel =
    response.stageUsed && response.stageUsed !== selection.stageId
      ? response.stageUsed
      : selection.stageLabel

  return {
    attemptId,
    status: 'completed',
    dealId,
    hubspotDealId: response.hubspotDealId,
    dealNameUsed: dealName,
    organizationPromoted,
    requiresApproval: false,
    approvalId: null,
    message: organizationPromoted
      ? 'Deal created in HubSpot; organization promoted prospect → opportunity.'
      : 'Deal created in HubSpot.',
    pipelineUsed: effectivePipelineId,
    pipelineLabelUsed: effectivePipelineLabel,
    stageUsed: effectiveStageId,
    stageLabelUsed: effectiveStageLabel,
    dealTypeUsed: response.dealTypeUsed ?? resolvedProperties.dealType,
    priorityUsed: response.priorityUsed ?? resolvedProperties.priority,
    ownerUsed: effectiveOwner,
    contactIdentityProfileIdUsed: resolvedContact.contactIdentityProfileId,
    contactUsed: resolvedContact.hubspotContactId
  }
}
