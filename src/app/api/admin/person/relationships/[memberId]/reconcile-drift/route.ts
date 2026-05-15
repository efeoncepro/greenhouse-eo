import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  PersonRelationshipReconciliationError,
  reconcileMemberContractDrift
} from '@/lib/person-legal-entity-relationships'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

import type { ContractorRelationshipSubtype } from '@/lib/person-legal-entity-relationships'

/**
 * TASK-891 Slice 3 — Person 360 relationship drift reconciliation admin endpoint.
 *
 * `POST /api/admin/person/relationships/[memberId]/reconcile-drift`
 *
 * Cierra la relacion legacy `employee` + abre nueva `contractor` en una sola
 * transaccion atomica. Toda la logica vive en el helper canonico
 * `reconcileMemberContractDrift` (TASK-891 Slice 2). Este route handler valida
 * inputs + capability gate dual + sanitiza errors al boundary.
 *
 * Body shape:
 * ```json
 * {
 *   "contractorSubtype": "contractor" | "honorarios",
 *   "reason": "string >= 20 chars",
 *   "externalCloseDate": "YYYY-MM-DD" | null  // opcional
 * }
 * ```
 *
 * Auth (defense in depth dual-gate):
 * - `requireAdminTenantContext` (route_group=admin + role=EFEONCE_ADMIN)
 * - `can(subject, 'person.legal_entity_relationships.reconcile_drift', 'update', 'tenant')`
 *
 * Capability: V1.0 grant SOLO EFEONCE_ADMIN (drift Person 360 cross-domain).
 *
 * Spec: docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md
 */

export const dynamic = 'force-dynamic'

type ReconcileDriftBody = {
  contractorSubtype?: unknown
  reason?: unknown
  externalCloseDate?: unknown
}

const VALID_SUBTYPES: readonly ContractorRelationshipSubtype[] = ['contractor', 'honorarios']

const isValidSubtype = (value: unknown): value is ContractorRelationshipSubtype =>
  typeof value === 'string' && (VALID_SUBTYPES as readonly string[]).includes(value)

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) => {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  // Capability granular least-privilege gate (V1.0: EFEONCE_ADMIN solo).
  if (!can(tenant, 'person.legal_entity_relationships.reconcile_drift', 'update', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'person.legal_entity_relationships.reconcile_drift' }
    })
  }

  const { memberId } = await params
  const trimmedMemberId = typeof memberId === 'string' ? memberId.trim() : ''

  if (!trimmedMemberId) {
    return NextResponse.json(
      { error: 'memberId es requerido en la ruta.', code: 'invalid_member_id', actionable: false },
      { status: 400 }
    )
  }

  let body: ReconcileDriftBody = {}

  try {
    body = ((await request.json()) as ReconcileDriftBody) ?? {}
  } catch {
    return NextResponse.json(
      { error: 'El cuerpo de la petición debe ser JSON válido.', code: 'invalid_payload', actionable: true },
      { status: 400 }
    )
  }

  // Pre-validate subtype shape (helper hace defense-in-depth en segunda capa).
  if (!isValidSubtype(body.contractorSubtype)) {
    return NextResponse.json(
      {
        error: `El subtipo de contractor debe ser uno de: ${VALID_SUBTYPES.join(', ')}.`,
        code: 'invalid_contractor_subtype',
        actionable: true
      },
      { status: 400 }
    )
  }

  const reason = typeof body.reason === 'string' ? body.reason : ''

  const externalCloseDate =
    typeof body.externalCloseDate === 'string' && body.externalCloseDate.trim() !== ''
      ? body.externalCloseDate.trim()
      : null

  try {
    const result = await reconcileMemberContractDrift({
      memberId: trimmedMemberId,
      contractorSubtype: body.contractorSubtype,
      reason,
      actorUserId: tenant.userId,
      externalCloseDate
    })

    return NextResponse.json(
      {
        closedRelationshipId: result.closedRelationshipId,
        openedRelationshipId: result.openedRelationshipId,
        before: {
          relationshipType: result.beforeSnapshot.relationshipType,
          status: result.beforeSnapshot.status,
          effectiveFrom: result.beforeSnapshot.effectiveFrom,
          effectiveTo: result.beforeSnapshot.effectiveTo
        },
        after: {
          relationshipType: result.afterSnapshot.relationshipType,
          status: result.afterSnapshot.status,
          effectiveFrom: result.afterSnapshot.effectiveFrom,
          effectiveTo: result.afterSnapshot.effectiveTo,
          sourceOfTruth: result.afterSnapshot.sourceOfTruth
        }
      },
      { status: 200 }
    )
  } catch (error) {
    // Canonical reconciliation errors → es-CL safe responses with code.
    if (error instanceof PersonRelationshipReconciliationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          actionable: true,
          ...(error.evidence ? { evidence: error.evidence } : {})
        },
        { status: error.statusCode }
      )
    }

    // Unknown failure → capture Sentry + sanitized 500 (NEVER expose raw error).
    captureWithDomain(error, 'identity', {
      tags: { source: 'admin_person_relationship_reconcile_drift', stage: 'route_handler' },
      extra: {
        memberId: trimmedMemberId,
        actorUserId: tenant.userId
      }
    })

    // Sanitized 500 response — NEVER expose error.message raw to client.
    // El detalle del error vive en Sentry via captureWithDomain (arriba).
    return NextResponse.json(
      {
        error: 'No se pudo reconciliar la relación legal del colaborador. Reintenta o pide soporte al equipo de plataforma.',
        code: 'reconciliation_failed',
        actionable: false
      },
      { status: 500 }
    )
  }
}
