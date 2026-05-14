import 'server-only'

import { query } from '@/lib/db'

import {
  evaluateInternalCollaboratorEligibility,
  type EligibilityVerdict
} from './eligibility'
import { listActiveOverridesForTenantMapping } from './eligibility-overrides-store'
import {
  MemberIdentityDriftError,
  provisionInternalCollaboratorFromScim,
  type ProvisionInternalCollaboratorResult
} from './provisioning-internal-collaborator'

/**
 * TASK-872 Slice 5 — Backfill engine for SCIM internal collaborators.
 *
 * Reusable from both CLI (scripts/scim/backfill-internal-collaborators.ts) and
 * future admin endpoint. Defaults to dry-run; mutates only when caller explicitly
 * passes `apply: true` with a non-empty allowlist + actor.
 *
 * Triple safety:
 * - apply requires allowlist (no bulk masivo accidental)
 * - apply requires actor (audit trail)
 * - per-user failure NOT aborts script (best-effort batch)
 *
 * Spec: docs/tasks/in-progress/TASK-872-scim-internal-collaborator-provisioning.md
 * Validated by arch-architect 2026-05-13 (Sesión 2 Slice 5 4-pillar Score).
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface BackfillPlan {
  readonly eligibleApply: Array<{
    readonly userId: string
    readonly email: string
    readonly externalId: string
    readonly displayName: string
    readonly missingRelations: ReadonlyArray<'member' | 'identity_profile' | 'person_membership'>
    readonly eligibilityVerdict: Extract<EligibilityVerdict, { eligible: true }>
  }>
  readonly ineligible: Array<{
    readonly userId: string
    readonly email: string
    readonly verdictReason: string
  }>
  readonly alreadyComplete: Array<{
    readonly userId: string
    readonly email: string
    readonly memberId: string
  }>
  readonly notFound: Array<{
    readonly email: string
    readonly reason: 'not_in_client_users' | 'not_internal_tenant' | 'no_scim_id' | 'no_microsoft_oid'
  }>
  readonly summary: {
    readonly totalRequested: number
    readonly eligibleApplyCount: number
    readonly ineligibleCount: number
    readonly alreadyCompleteCount: number
    readonly notFoundCount: number
  }
}

export interface ApplyResult {
  readonly userId: string
  readonly email: string
  readonly outcome:
    | 'created_member'
    | 'reused_existing'
    | 'skipped_ineligible'
    | 'skipped_already_complete'
    | 'skipped_not_found'
    | 'failed_drift'
    | 'failed_other'
  readonly memberId?: string
  readonly cascadeOutcome?: string
  readonly errorMessage?: string
}

export interface ApplyReport {
  readonly results: readonly ApplyResult[]
  readonly summary: {
    readonly totalProcessed: number
    readonly createdCount: number
    readonly reusedCount: number
    readonly skippedCount: number
    readonly failedCount: number
  }
}

interface ClientUserRow extends Record<string, unknown> {
  user_id: string
  scim_id: string | null
  email: string
  full_name: string | null
  microsoft_oid: string | null
  identity_profile_id: string | null
  member_id: string | null
  tenant_type: string
  microsoft_tenant_id: string | null
}

interface TenantMappingRow extends Record<string, unknown> {
  scim_tenant_mapping_id: string
  allowed_email_domains: string[]
  default_role_code: string
  microsoft_tenant_id: string | null
}

const EFEONCE_INTERNAL_MAPPING_ID = 'scim-tm-efeonce'

const fetchTenantMapping = async (mappingId: string): Promise<TenantMappingRow | null> => {
  const rows = await query<TenantMappingRow>(
    `SELECT scim_tenant_mapping_id, allowed_email_domains, default_role_code, microsoft_tenant_id
     FROM greenhouse_core.scim_tenant_mappings
     WHERE scim_tenant_mapping_id = $1
     LIMIT 1`,
    [mappingId]
  )

  return rows[0] ?? null
}

const fetchClientUserByEmail = async (email: string): Promise<ClientUserRow | null> => {
  const rows = await query<ClientUserRow>(
    `SELECT user_id, scim_id, email, full_name, microsoft_oid, identity_profile_id,
            member_id, tenant_type, microsoft_tenant_id
     FROM greenhouse_core.client_users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email.trim()]
  )

  return rows[0] ?? null
}

const splitDisplayName = (full: string | null): { givenName: string | null; familyName: string | null } => {
  if (!full) return { givenName: null, familyName: null }

  const parts = full.trim().split(/\s+/)

  if (parts.length === 0) return { givenName: null, familyName: null }
  if (parts.length === 1) return { givenName: parts[0], familyName: null }

  return {
    givenName: parts[0],
    familyName: parts.slice(1).join(' ')
  }
}

/**
 * Plan backfill: dry-run analysis for the given allowlist of emails.
 *
 * Pre-flight checks per email:
 * 1. Exists as client_users
 * 2. tenant_type === 'efeonce_internal'
 * 3. scim_id IS NOT NULL (originado SCIM)
 * 4. microsoft_oid IS NOT NULL
 * 5. If member_id IS NOT NULL + identity_profile_id IS NOT NULL → alreadyComplete
 * 6. Else: evaluate eligibility (4-layer); ineligible → record + skip
 * 7. Eligible → record in eligibleApply with missingRelations diff
 */
export const planBackfill = async (allowlist: ReadonlyArray<string>): Promise<BackfillPlan> => {
  const normalizedEmails = Array.from(new Set(allowlist.map(e => e.trim().toLowerCase()).filter(Boolean)))

  const plan: {
    eligibleApply: BackfillPlan['eligibleApply'][number][]
    ineligible: BackfillPlan['ineligible'][number][]
    alreadyComplete: BackfillPlan['alreadyComplete'][number][]
    notFound: BackfillPlan['notFound'][number][]
  } = { eligibleApply: [], ineligible: [], alreadyComplete: [], notFound: [] }

  const mapping = await fetchTenantMapping(EFEONCE_INTERNAL_MAPPING_ID)

  if (!mapping) {
    throw new Error(`Internal tenant mapping '${EFEONCE_INTERNAL_MAPPING_ID}' not found in scim_tenant_mappings`)
  }

  const overrides = await listActiveOverridesForTenantMapping(mapping.scim_tenant_mapping_id)

  for (const email of normalizedEmails) {
    const user = await fetchClientUserByEmail(email)

    if (!user) {
      plan.notFound.push({ email, reason: 'not_in_client_users' })
      continue
    }

    if (user.tenant_type !== 'efeonce_internal') {
      plan.notFound.push({ email, reason: 'not_internal_tenant' })
      continue
    }

    if (!user.scim_id) {
      plan.notFound.push({ email, reason: 'no_scim_id' })
      continue
    }

    if (!user.microsoft_oid) {
      plan.notFound.push({ email, reason: 'no_microsoft_oid' })
      continue
    }

    // Already complete?
    if (user.member_id && user.identity_profile_id) {
      plan.alreadyComplete.push({ userId: user.user_id, email, memberId: user.member_id })
      continue
    }

    // Build eligibility input (defense in depth: re-evaluate per email)
    const { givenName, familyName } = splitDisplayName(user.full_name)

    const verdict = evaluateInternalCollaboratorEligibility({
      upn: email,
      email,
      externalId: user.microsoft_oid,
      displayName: user.full_name,
      givenName,
      familyName,
      allowedDomains: mapping.allowed_email_domains,
      overrides
    })

    if (!verdict.eligible) {
      plan.ineligible.push({
        userId: user.user_id,
        email,
        verdictReason: `${verdict.outcome}:${verdict.reason}`
      })
      continue
    }

    const missingRelations: Array<'member' | 'identity_profile' | 'person_membership'> = []

    if (!user.member_id) missingRelations.push('member')
    if (!user.identity_profile_id) missingRelations.push('identity_profile')
    // person_membership: assumed missing if member is missing (primitive creates both)
    if (!user.member_id) missingRelations.push('person_membership')

    plan.eligibleApply.push({
      userId: user.user_id,
      email,
      externalId: user.microsoft_oid,
      displayName: user.full_name ?? email,
      missingRelations,
      eligibilityVerdict: verdict
    })
  }

  const summary = {
    totalRequested: normalizedEmails.length,
    eligibleApplyCount: plan.eligibleApply.length,
    ineligibleCount: plan.ineligible.length,
    alreadyCompleteCount: plan.alreadyComplete.length,
    notFoundCount: plan.notFound.length
  }

  return { ...plan, summary }
}

/**
 * Apply backfill: per-user invocation of provisionInternalCollaboratorFromScim
 * within its own withTransaction. Failures of one user do NOT abort the batch.
 *
 * SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED flag is NOT consulted here — the
 * backfill bypasses the SCIM endpoint and invokes the primitive directly. Operator
 * authority is the `actorUserId` parameter + per-call audit log.
 */
export const applyBackfill = async (
  plan: BackfillPlan,
  options: { actorUserId: string }
): Promise<ApplyReport> => {
  const actorUserId = options.actorUserId.trim()

  if (!actorUserId) {
    throw new Error('actorUserId is required to apply backfill (audit trail).')
  }

  const mapping = await fetchTenantMapping(EFEONCE_INTERNAL_MAPPING_ID)

  if (!mapping) {
    throw new Error(`Internal tenant mapping '${EFEONCE_INTERNAL_MAPPING_ID}' not found`)
  }

  const results: ApplyResult[] = []

  // Already complete: skip without invoking primitive
  for (const item of plan.alreadyComplete) {
    results.push({
      userId: item.userId,
      email: item.email,
      outcome: 'skipped_already_complete',
      memberId: item.memberId
    })
  }

  // Ineligible: skip with audit log
  for (const item of plan.ineligible) {
    results.push({
      userId: item.userId,
      email: item.email,
      outcome: 'skipped_ineligible',
      errorMessage: item.verdictReason
    })
  }

  // Not found: skip with audit log
  for (const item of plan.notFound) {
    results.push({
      userId: '(not_found)',
      email: item.email,
      outcome: 'skipped_not_found',
      errorMessage: item.reason
    })
  }

  // Apply eligible
  for (const target of plan.eligibleApply) {
    try {
      const result: ProvisionInternalCollaboratorResult = await provisionInternalCollaboratorFromScim({
        email: target.email,
        externalId: target.externalId,
        displayName: target.displayName,
        microsoftTenantId: mapping.microsoft_tenant_id,
        microsoftEmail: target.email,
        tenantMappingId: mapping.scim_tenant_mapping_id,
        defaultRoleCode: mapping.default_role_code,
        active: true,
        entraJobTitle: null,
        eligibilityVerdict: target.eligibilityVerdict
      })

      // Audit log: insert scim_sync_log row para forensic trail
      await query(
        `INSERT INTO greenhouse_core.scim_sync_log (
           operation, scim_id, external_id, email, microsoft_tenant_id,
           request_summary, response_status, error_message
         )
         VALUES ('BACKFILL', NULL, $1, $2, $3, $4::jsonb, 200, $5)`,
        [
          target.externalId,
          target.email,
          mapping.microsoft_tenant_id,
          JSON.stringify({
            actorUserId,
            taskRef: 'TASK-872 Slice 5',
            cascadeOutcome: result.cascadeOutcome,
            idempotent: result.idempotent
          }),
          result.idempotent ? 'idempotent_reuse' : null
        ]
      )

      results.push({
        userId: result.userId,
        email: target.email,
        outcome: result.idempotent ? 'reused_existing' : 'created_member',
        memberId: result.memberId,
        cascadeOutcome: result.cascadeOutcome
      })
    } catch (error) {
      const isDriftError = error instanceof MemberIdentityDriftError
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Audit log: insert scim_sync_log row para forensic
      await query(
        `INSERT INTO greenhouse_core.scim_sync_log (
           operation, scim_id, external_id, email, microsoft_tenant_id,
           request_summary, response_status, error_message
         )
         VALUES ('BACKFILL', NULL, $1, $2, $3, $4::jsonb, 500, $5)`,
        [
          target.externalId,
          target.email,
          mapping.microsoft_tenant_id,
          JSON.stringify({
            actorUserId,
            taskRef: 'TASK-872 Slice 5',
            errorKind: isDriftError ? 'member_identity_drift' : 'other'
          }),
          errorMessage.slice(0, 500)
        ]
      ).catch(() => {})

      results.push({
        userId: target.userId,
        email: target.email,
        outcome: isDriftError ? 'failed_drift' : 'failed_other',
        errorMessage
      })
    }
  }

  const createdCount = results.filter(r => r.outcome === 'created_member').length
  const reusedCount = results.filter(r => r.outcome === 'reused_existing').length
  const skippedCount = results.filter(r => r.outcome.startsWith('skipped_')).length
  const failedCount = results.filter(r => r.outcome.startsWith('failed_')).length

  return {
    results,
    summary: {
      totalProcessed: results.length,
      createdCount,
      reusedCount,
      skippedCount,
      failedCount
    }
  }
}

// Bound for type narrowing in CLI
export const formatPlanHuman = (plan: BackfillPlan): string => {
  const lines: string[] = []

  lines.push('━━━ SCIM Internal Collaborator Backfill — Plan ━━━')
  lines.push('')
  lines.push(`Total requested: ${plan.summary.totalRequested}`)
  lines.push(`  Eligible for apply: ${plan.summary.eligibleApplyCount}`)
  lines.push(`  Already complete:   ${plan.summary.alreadyCompleteCount}`)
  lines.push(`  Ineligible:         ${plan.summary.ineligibleCount}`)
  lines.push(`  Not found:          ${plan.summary.notFoundCount}`)
  lines.push('')

  if (plan.eligibleApply.length > 0) {
    lines.push('— Eligible apply targets —')

    for (const t of plan.eligibleApply) {
      lines.push(`  • ${t.email} (user=${t.userId}, oid=${t.externalId.slice(0, 8)}…)`)
      lines.push(`    missing: ${t.missingRelations.join(', ')}; verdict: ${t.eligibilityVerdict.reason}`)
    }

    lines.push('')
  }

  if (plan.alreadyComplete.length > 0) {
    lines.push('— Already complete (skip) —')

    for (const t of plan.alreadyComplete) {
      lines.push(`  • ${t.email} (user=${t.userId}, member=${t.memberId})`)
    }

    lines.push('')
  }

  if (plan.ineligible.length > 0) {
    lines.push('— Ineligible (skip) —')

    for (const t of plan.ineligible) {
      lines.push(`  • ${t.email} (user=${t.userId}, reason=${t.verdictReason})`)
    }

    lines.push('')
  }

  if (plan.notFound.length > 0) {
    lines.push('— Not found (skip) —')

    for (const t of plan.notFound) {
      lines.push(`  • ${t.email} (reason=${t.reason})`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

export const formatApplyReportHuman = (report: ApplyReport): string => {
  const lines: string[] = []

  lines.push('━━━ SCIM Internal Collaborator Backfill — Apply Report ━━━')
  lines.push('')
  lines.push(`Processed: ${report.summary.totalProcessed}`)
  lines.push(`  Created member:    ${report.summary.createdCount}`)
  lines.push(`  Reused existing:   ${report.summary.reusedCount}`)
  lines.push(`  Skipped:           ${report.summary.skippedCount}`)
  lines.push(`  Failed:            ${report.summary.failedCount}`)
  lines.push('')

  for (const r of report.results) {
    const status = r.outcome.startsWith('failed_')
      ? '❌'
      : r.outcome.startsWith('skipped_')
        ? '⏭️ '
        : r.outcome === 'created_member'
          ? '✓'
          : '↻'

    const detail =
      r.outcome === 'created_member' || r.outcome === 'reused_existing'
        ? `member=${r.memberId}, cascade=${r.cascadeOutcome}`
        : r.errorMessage || ''

    lines.push(`  ${status} ${r.email} → ${r.outcome} ${detail ? `(${detail})` : ''}`)
  }

  return lines.join('\n')
}
