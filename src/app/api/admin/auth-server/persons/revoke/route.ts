import { NextResponse } from 'next/server'

import { authServerErrorResponse, readJsonBody, requireAuthServerOperator } from '@/lib/auth-server/oauth/admin-http'
import { readAuthServerOAuthConfig } from '@/lib/auth-server/oauth/config'
import { PostgresPersonAuthStore, revokePersonAuthState } from '@/lib/auth-server/persons'

export const dynamic = 'force-dynamic'

/**
 * TASK-1830 — Revocar TODO el acceso de una persona externa en `auth.efeonce.org`: sesiones,
 * passkeys y TOTP. Capability `identity.auth_person.revoke` (EFEONCE_ADMIN).
 *
 * Existe por Full API Parity, no como conveniencia: la revocación de acceso de una persona es una
 * capacidad de negocio, así que nace con contrato programático gobernado y no como un botón. El
 * mismo command lo consumen esta ruta, el CLI y —por construcción— Nexa con su loop de
 * confirmación humana.
 *
 * NO es el camino de recuperación: recuperar es re-invitar (`issueExternalInvitation` con
 * `reissue`), que ya revoca lo anterior por su cuenta. Esto es el corte de emergencia — un
 * dispositivo perdido, una salida — cuando NO se quiere devolver el acceso.
 *
 * Idempotente: llamarla dos veces devuelve ceros, no falla.
 */
export async function POST(request: Request) {
  const { operator, response } = await requireAuthServerOperator('identity.auth_person.revoke', 'execute')

  if (!operator) return response

  try {
    const body = await readJsonBody(request)
    const config = readAuthServerOAuthConfig()
    const subject = String(body.subject ?? '').trim()
    const reason = String(body.reason ?? '').trim()

    if (!subject || reason.length < 10) {
      return NextResponse.json(
        {
          error: 'Indica el sujeto y una razón de al menos 10 caracteres para dejar constancia de la revocación.',
          code: 'invalid_request',
          actionable: false
        },
        { status: 422 }
      )
    }

    const result = await revokePersonAuthState(
      {
        store: new PostgresPersonAuthStore(),
        environmentId:
          typeof body.environmentId === 'string' && body.environmentId ? body.environmentId : config.environmentId,
        now: () => new Date()
      },
      { subject, reason, actorRef: operator.actor.actorId, correlationId: null }
    )

    return NextResponse.json(result)
  } catch (error) {
    return authServerErrorResponse(error, 'admin.auth-server.persons.revoke')
  }
}
