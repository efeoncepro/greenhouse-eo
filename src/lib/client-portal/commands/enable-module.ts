import 'server-only'

import { randomUUID } from 'node:crypto'

import { sql } from 'kysely'

import { __clearClientPortalResolverCache } from '@/lib/client-portal/readers/native/module-resolver'
import { getDb } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { recordAssignmentEvent } from './audit'
import {
  BusinessLineMismatchError,
  ClientPortalValidationError,
  assertReason20Plus
} from './errors'
import { resolveOrganizationCanonicalBusinessLines } from './resolve-org-business-line'

import type { AssignmentSource, ResolvedAssignmentStatus } from '@/lib/client-portal/dto/module'

/**
 * TASK-826 Slice 2 — Atomic command to enable a client_portal module for an org.
 *
 * Patrón canónico atomic transaction:
 *   1. Idempotency check (active assignment con mismo target status → no-op)
 *   2. Fetch módulo activo del catálogo (NO deprecated)
 *   3. Validate applicability_scope vs org canonical business_lines
 *      - 'cross' es metavalue aplicable-a-múltiples → skip check
 *      - empty array (data quality issue común en runtime) → skip check (honest)
 *      - single match → ok
 *      - mismatch → require overrideBusinessLineMismatch + overrideReason >= 20
 *   4. INSERT assignment + audit + outbox v1 (todo en misma tx PG)
 *   5. Post-tx: invalidate resolver cache scoped al org
 *
 * Status default = 'active'. 'pilot' requires expiresAt (CHECK constraint mirror).
 *
 * Idempotent re-call con mismo target status devuelve el assignment existente
 * sin emitir outbox/audit duplicado.
 *
 * Override requires capability `client_portal.module.override_business_line_default`
 * (EFEONCE_ADMIN only) — enforced en el endpoint handler que invoca este command,
 * NO acá. Este helper solo enforce shape del input.
 *
 * Spec V1.4 §7.1 documenta el contract.
 */

export interface EnableClientPortalModuleInput {
  readonly organizationId: string
  readonly moduleKey: string

  /** Default `'active'`. `'pilot'` requires `expiresAt`. */
  readonly status?: ResolvedAssignmentStatus

  readonly source: AssignmentSource
  readonly sourceRefJson?: Record<string, unknown>

  /** ISO date `YYYY-MM-DD`. */
  readonly effectiveFrom: string

  /** ISO timestamp RFC 3339. Required when `status='pilot'`. */
  readonly expiresAt?: string

  readonly approvedByUserId: string

  /** Optional context (operator note, ticket id, etc.). Logged in audit event. */
  readonly reason?: string

  /** Override del check applicability_scope vs org business_line. */
  readonly overrideBusinessLineMismatch?: boolean
  readonly overrideReason?: string
}

export interface EnableClientPortalModuleResult {
  readonly assignmentId: string
  readonly status: ResolvedAssignmentStatus
  readonly idempotent: boolean
}

export const enableClientPortalModule = async (
  input: EnableClientPortalModuleInput
): Promise<EnableClientPortalModuleResult> => {
  const targetStatus: ResolvedAssignmentStatus = input.status ?? 'active'

  if (targetStatus === 'pilot' && !input.expiresAt) {
    throw new ClientPortalValidationError(
      'pilot status requires expiresAt',
      400,
      { field: 'expiresAt', moduleKey: input.moduleKey }
    )
  }

  const db = await getDb()

  const result = await db.transaction().execute(async tx => {
    // 1. Idempotency check
    const existing = await tx
      .selectFrom('greenhouse_client_portal.module_assignments')
      .select(['assignment_id', 'status'])
      .where('organization_id', '=', input.organizationId)
      .where('module_key', '=', input.moduleKey)
      .where('effective_to', 'is', null)
      .executeTakeFirst()

    if (existing && existing.status === targetStatus) {
      return {
        assignmentId: existing.assignment_id,
        status: existing.status as ResolvedAssignmentStatus,
        idempotent: true
      }
    }

    if (existing) {
      throw new ClientPortalValidationError(
        `Assignment already active with status='${existing.status}'; use pause/resume/expire commands instead`,
        409,
        { existingAssignmentId: existing.assignment_id, existingStatus: existing.status }
      )
    }

    // 2. Fetch módulo activo
    const moduleRow = await tx
      .selectFrom('greenhouse_client_portal.modules')
      .select(['module_key', 'applicability_scope', 'tier'])
      .where('module_key', '=', input.moduleKey)
      .where('effective_to', 'is', null)
      .executeTakeFirst()

    if (!moduleRow) {
      throw new ClientPortalValidationError(
        `Module '${input.moduleKey}' not found or deprecated`,
        404,
        { moduleKey: input.moduleKey }
      )
    }

    // 3. Validate applicability_scope vs org canonical business_lines
    //    Honest skip cases (V1.4 §3.1 reconciliation):
    //      - 'cross' = metavalue aplicable-a-múltiples
    //      - empty array = data quality issue (0 orgs hoy live)
    //    Hard fail si applicability_scope NO matchea ningún BL del array.
    if (moduleRow.applicability_scope !== 'cross') {
      const orgBusinessLines = await resolveOrganizationCanonicalBusinessLines(
        input.organizationId,
        tx
      )

      if (orgBusinessLines.length > 0 && !orgBusinessLines.includes(moduleRow.applicability_scope)) {
        const overrideOk =
          input.overrideBusinessLineMismatch === true &&
          typeof input.overrideReason === 'string' &&
          input.overrideReason.trim().length >= 20

        if (!overrideOk) {
          throw new BusinessLineMismatchError(
            `Module applicability_scope='${moduleRow.applicability_scope}' does not match any organization business_line (resolved: [${orgBusinessLines.join(', ')}]). Override requires overrideBusinessLineMismatch=true + overrideReason >=20 chars + capability client_portal.module.override_business_line_default.`,
            {
              moduleApplicabilityScope: moduleRow.applicability_scope,
              orgBusinessLines: [...orgBusinessLines]
            }
          )
        }

        assertReason20Plus(input.overrideReason, 'overrideReason')
      }
    }

    // 4. INSERT assignment + audit + outbox v1 (atomic en tx)
    const assignmentId = `cpma-${randomUUID()}`

    await tx
      .insertInto('greenhouse_client_portal.module_assignments')
      .values({
        assignment_id: assignmentId,
        organization_id: input.organizationId,
        module_key: input.moduleKey,
        status: targetStatus,
        source: input.source,
        source_ref_json: (input.sourceRefJson ?? {}) as never,
        effective_from: input.effectiveFrom,
        expires_at: input.expiresAt ?? null,
        approved_by_user_id: input.approvedByUserId,
        approved_at: sql`CURRENT_TIMESTAMP` as never
      })
      .execute()

    await recordAssignmentEvent(
      {
        assignmentId,
        eventKind: 'enabled',
        toStatus: targetStatus,
        actorUserId: input.approvedByUserId,
        payload: {
          source: input.source,
          sourceRefJson: input.sourceRefJson ?? {},
          reason: input.reason,
          overrideBusinessLineMismatch: input.overrideBusinessLineMismatch === true,
          overrideReason: input.overrideReason
        }
      },
      tx
    )

    await publishOutboxEvent(
      {
        aggregateType: 'client_portal_module_assignment',
        aggregateId: assignmentId,
        eventType: 'client.portal.module.assignment.created',
        payload: {
          version: 1,
          assignmentId,
          organizationId: input.organizationId,
          moduleKey: input.moduleKey,
          status: targetStatus,
          source: input.source,
          effectiveFrom: input.effectiveFrom,
          expiresAt: input.expiresAt ?? null
        }
      },
      tx
    )

    return { assignmentId, status: targetStatus, idempotent: false }
  })

  // 5. Post-tx cache invalidation (scoped al org). Skip cuando idempotent
  //    no-op: no hubo state change en DB, no hace falta drop cache.
  if (!result.idempotent) {
    __clearClientPortalResolverCache(input.organizationId)
  }

  return result
}
