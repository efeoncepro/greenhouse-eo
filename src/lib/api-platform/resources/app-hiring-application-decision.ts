import 'server-only'

import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { can } from '@/lib/entitlements/runtime'
import {
  confirmHiringApplicationDecision,
  isHiringError,
  proposeHiringApplicationDecision,
  readHiringApplicationOutcome,
} from '@/lib/hiring'
import type { DecideHiringApplicationInput, HiringDecision, HiringDecisionCause } from '@/types/hiring'

/**
 * TASK-1773 — el carril gobernado del eje de desenlace.
 *
 * El lane `app` es un ADAPTADOR: valida transporte y autorización, y delega. Si un agente necesita una
 * regla de negocio que el command no tiene, la regla va al command —donde la comparten todos los
 * consumers— y nunca a este archivo.
 */

type CommandBody = Record<string, unknown>

const string = (body: CommandBody, key: string) => (typeof body[key] === 'string' ? (body[key] as string).trim() : '')

const idempotencyKey = (request: Request, body: CommandBody) =>
  request.headers.get('idempotency-key')?.trim() || string(body, 'idempotencyKey')

/**
 * Traduce el error de dominio al del lane sin filtrar detalle interno.
 *
 * 🔴 Mapea por CÓDIGO de dominio, no por status. El command emite TRES 409 distintos y cada uno tiene una
 * acción distinta para quien llama; colapsarlos por `statusCode === 409` fue un defecto de la primera
 * versión de este archivo — la misma clase que TASK-1751 corrigió del lado del candidato.
 */
const DOMAIN_409_CODES: Record<string, 'hiring_decision_proposal_stale' | 'hiring_decision_idempotency_conflict' | 'hiring_opening_not_open_for_decision'> = {
  hiring_decision_proposal_stale: 'hiring_decision_proposal_stale',
  hiring_decision_idempotency_conflict: 'hiring_decision_idempotency_conflict',
  hiring_opening_not_open_for_decision: 'hiring_opening_not_open_for_decision',
}

const run = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    if (isHiringError(error)) {
      const statusCode = error.statusCode ?? 400
      const domainCode = (error as { code?: string }).code ?? ''

      throw new ApiPlatformError(error.message, {
        statusCode,
        errorCode:
          statusCode === 404
            ? 'not_found'
            : statusCode === 403
              ? 'forbidden'
              : statusCode === 409
                ? (DOMAIN_409_CODES[domainCode] ?? 'hiring_decision_proposal_stale')
                : 'bad_request',
      })
    }

    throw error
  }
}

const assertInternalCapability = (context: AppPlatformRequestContext, action: 'read' | 'execute') => {
  if (context.tenant.tenantType !== 'efeonce_internal' || !can(context.tenant, 'hiring.application.decide', action, 'tenant')) {
    throw new ApiPlatformError('Hiring application decision is not allowed.', { statusCode: 403, errorCode: 'forbidden' })
  }
}

/**
 * 🔴 Confirmar NO es federable hoy, y esto es fail-closed deliberado.
 *
 * `efeonce.mcp.hiring.write` no existe en código: está propuesto en TASK-1720/1722 como clase de
 * blast-radius y permanece bloqueado hasta el grant revocable de TASK-1631. Mientras tanto, un token
 * delegado puede LEER el desenlace y PROPONER una decisión, pero la confirmación exige una sesión humana.
 *
 * Es el mismo reparto que rige en el resto de Hiring: el agente propone y lee, el humano confirma.
 */
const assertConfirmationIsHuman = (context: AppPlatformRequestContext) => {
  if (context.authSource === 'sister_platform_oauth') {
    throw new ApiPlatformError('Decision confirmation requires a human session.', {
      statusCode: 403,
      errorCode: 'forbidden',
    })
  }
}

export const getAppHiringApplicationOutcome = async ({
  context,
  applicationId,
}: {
  context: AppPlatformRequestContext
  applicationId: string
}) => {
  assertInternalCapability(context, 'read')

  return run(() => readHiringApplicationOutcome(applicationId))
}

export const proposeAppHiringApplicationDecision = async ({
  context,
  applicationId,
  body,
}: {
  context: AppPlatformRequestContext
  applicationId: string
  body: CommandBody
}) => {
  assertInternalCapability(context, 'execute')

  return run(() =>
    proposeHiringApplicationDecision({
      applicationId,
      decision: string(body, 'decision') as HiringDecision,
      cause: (string(body, 'cause') || null) as HiringDecisionCause | null,
    }),
  )
}

export const confirmAppHiringApplicationDecision = async ({
  context,
  request,
  applicationId,
  body,
}: {
  context: AppPlatformRequestContext
  request: Request
  applicationId: string
  body: CommandBody
}) => {
  assertInternalCapability(context, 'execute')
  assertConfirmationIsHuman(context)

  const input = {
    decision: string(body, 'decision') as HiringDecision,
    cause: (string(body, 'cause') || null) as HiringDecisionCause | null,
    reason: { summary: string(body, 'reasonSummary') },
    idempotencyKey: idempotencyKey(request, body),
    // Sin esto, `selected` y `backup_selected` fallaban SIEMPRE por este carril: el command exige
    // destino para ambos (`assertDestination`), y el adaptador no lo reenviaba. Dos de los seis
    // desenlaces quedaban inalcanzables por la ruta que existe para alcanzarlos.
    selectedDestination: (string(body, 'selectedDestination') || null) as DecideHiringApplicationInput['selectedDestination'],
  } satisfies DecideHiringApplicationInput

  return run(() =>
    confirmHiringApplicationDecision({
      applicationId,
      effectDigest: string(body, 'effectDigest'),
      input,
      actorUserId: context.tenant.userId,
    }),
  )
}
