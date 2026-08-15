import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import { toHiringErrorResponse } from '@/lib/hiring'
import { canAccessHiringCandidateDocument, revealCandidateIdentityDocument } from '@/lib/hiring/documents'
import { PersonLegalProfileError } from '@/lib/person-legal-profile'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1714 — `POST /api/hiring/candidate-facets/[candidateFacetId]/identity-documents/[documentId]/reveal`.
 *
 * Camino auditado para leer el valor completo del documento de identidad de un
 * CANDIDATO. El reveal de TASK-784 sólo existía anclado a `memberId`, y un
 * candidato no tiene member hasta el handoff (TASK-356), así que hasta acá no
 * había ninguna forma legítima de leer un dato que el sistema ya sabía capturar.
 *
 * Tres puertas, en orden: sesión interna → `canAccessHiringCandidateDocument`
 * (capability `hiring.application.read`, `client_*` denegado por `tenantType`) →
 * capability `hiring.candidate.reveal_identity`. La pertenencia del documento al
 * candidato la verifica el command, no esta ruta.
 *
 * El `value_full` viaja UNA vez en esta respuesta y no se escribe a log, Sentry,
 * outbox ni audit. El `reason` va al audit log; nunca a un log de aplicación.
 */
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ candidateFacetId: string; documentId: string }> },
) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!canAccessHiringCandidateDocument(tenant)) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.application.read' } })
  }

  if (!can(tenant, 'hiring.candidate.reveal_identity', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'hiring.candidate.reveal_identity' },
    })
  }

  const { candidateFacetId, documentId } = await params

  let body: Record<string, unknown> = {}

  try {
    body = ((await request.json()) as Record<string, unknown> | null) ?? {}
  } catch {
    body = {}
  }

  const reason = typeof body.reason === 'string' ? body.reason : ''

  try {
    const session = await getServerAuthSession()

    const result = await revealCandidateIdentityDocument({
      candidateFacetId,
      documentId,
      actorUserId: tenant.userId,
      actorEmail: session?.user?.email ?? null,
      reason,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
    })

    return NextResponse.json(result)
  } catch (error) {
    // `PersonLegalProfileError` trae los estados propios del reveal de TASK-784
    // (`reveal_disabled_for_status` 409 para archivado/expirado). Se mapean acá
    // porque `toHiringErrorResponse` sólo conoce los errores del dominio Hiring;
    // sin esto, un 409 honesto se degradaría a 500 genérico.
    //
    // El mensaje se reescribe en es-CL en vez de reenviar el del helper: ése lleva
    // el identificador interno del documento y no está redactado para un operador.
    if (error instanceof PersonLegalProfileError) {
      const message =
        error.code === 'reveal_disabled_for_status'
          ? 'Este documento está archivado o expirado, así que no se puede revelar.'
          : 'No pudimos revelar el documento de identidad de este candidato.'

      return NextResponse.json({ error: message, code: error.code, actionable: false }, { status: error.statusCode })
    }

    // El `documentId` va al tag de observabilidad; el `reason` y el valor NO.
    return toHiringErrorResponse(
      error,
      'POST /api/hiring/candidate-facets/[candidateFacetId]/identity-documents/[documentId]/reveal',
    )
  }
}
