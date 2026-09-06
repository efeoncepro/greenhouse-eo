import 'server-only'

import type { ApiPlatformRequestContext, ApiPlatformSuccessResult } from '@/lib/api-platform/core/context'
import { ApiPlatformError, type ApiPlatformErrorCode } from '@/lib/api-platform/core/errors'
import {
  issueDelegatedExternalInvitation,
  listDelegatedExternalInvitations,
  readExternalInvitationConfig,
  type ExternalAccessErrorCode,
  type ExternalInvitationDelivery,
  type ExternalMemberInvitation
} from '@/lib/identity/external-access'
import { isExternalAccessError } from '@/lib/identity/external-access/errors'

/**
 * TASK-1837 — Lane ecosystem de la AUTORIDAD DELEGADA del cliente.
 *
 *   GET  /api/platform/ecosystem/identity/invitations?environment=&subject=&(bindingId=|organizationId=)
 *   POST /api/platform/ecosystem/identity/invitations   { environment, subject, bindingId|organizationId, email, reason? }
 *
 * Mismo patrón que `identity/binding` (TASK-1631): el gateway (consumer con binding de scope
 * `internal`) verifica el JWT de la persona y llama acá con `(environment, subject)`; Greenhouse
 * resuelve la membership y exige `designatedAdmin` sobre el `bindingId` pedido. El binding NUNCA se
 * toma del body como autoridad: se toma de la resolución, y el `bindingId` del body sólo elige entre
 * las memberships de la persona (403 si no es suya). El harness ecosystem no conoce personas — la
 * verificación del token vive en el gateway (`efeonce-mcp`, TASK-1831) — por eso esta lane no
 * acepta un bearer de persona directo.
 *
 * Flag `EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED` apagado ⇒ 404 anti-oráculo, igual que un
 * consumer no-internal.
 */

export type EcosystemDelegatedInvitationPayload = {
  invitation: ExternalMemberInvitation
  created: boolean
  delivery: ExternalInvitationDelivery
}

const CODE_MAP: Record<ExternalAccessErrorCode, { status: number; code: ApiPlatformErrorCode }> = {
  invalid_request: { status: 422, code: 'bad_request' },
  not_found: { status: 404, code: 'not_found' },
  conflict: { status: 409, code: 'bad_request' },
  organization_not_eligible: { status: 422, code: 'bad_request' },
  environment_not_active: { status: 409, code: 'bad_request' },
  binding_not_active: { status: 409, code: 'binding_not_active' },
  invitation_not_open: { status: 409, code: 'bad_request' },
  invitation_expired: { status: 410, code: 'bad_request' },
  identity_collision: { status: 409, code: 'bad_request' },
  forbidden: { status: 403, code: 'forbidden' },
  rate_limited: { status: 429, code: 'rate_limited' },
  limit_reached: { status: 422, code: 'bad_request' }
}

const toApiPlatformError = (error: unknown): never => {
  if (isExternalAccessError(error)) {
    const mapped = CODE_MAP[error.code]

    throw new ApiPlatformError('Invitation request rejected', {
      statusCode: mapped.status,
      errorCode: mapped.code,
      details: { domainCode: error.code, ...(error.details ?? {}) }
    })
  }

  throw error
}

const assertLaneAvailable = (context: ApiPlatformRequestContext) => {
  if (!readExternalInvitationConfig().delegatedAuthorityEnabled || context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Not found', { statusCode: 404, errorCode: 'not_found' })
  }
}

const optionalStringParam = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiPlatformError(`Missing ${field}`, { statusCode: 400, errorCode: 'bad_request', details: { field } })
  }

  return value.trim()
}

export const listEcosystemDelegatedInvitations = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<{ bindingId: string; count: number; items: ExternalMemberInvitation[] }>> => {
  assertLaneAvailable(context)

  const { searchParams } = new URL(request.url)

  try {
    const result = await listDelegatedExternalInvitations({
      environmentId: requiredString(searchParams.get('environment'), 'environment'),
      subject: requiredString(searchParams.get('subject'), 'subject'),
      bindingId: optionalStringParam(searchParams.get('bindingId')),
      organizationId: optionalStringParam(searchParams.get('organizationId'))
    })

    return { data: { bindingId: result.bindingId, count: result.items.length, items: result.items } }
  } catch (error) {
    return toApiPlatformError(error)
  }
}

export const createEcosystemDelegatedInvitation = async ({
  context,
  body
}: {
  context: ApiPlatformRequestContext
  body: unknown
}): Promise<EcosystemDelegatedInvitationPayload> => {
  assertLaneAvailable(context)

  const input = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}

  try {
    const result = await issueDelegatedExternalInvitation({
      environmentId: requiredString(input.environment, 'environment'),
      subject: requiredString(input.subject, 'subject'),
      bindingId: optionalStringParam(input.bindingId),
      organizationId: optionalStringParam(input.organizationId),
      email: requiredString(input.email, 'email'),
      reason: typeof input.reason === 'string' ? input.reason : null,
      designatedAdmin: input.designatedAdmin === true
    })

    // El token NUNCA sale por esta lane: con entrega del sistema viajó en el correo; sin ella, el
    // administrador delegado no tiene derecho a verlo (sólo la excepción admin de Efeonce lo revela).
    return { invitation: result.invitation, created: result.created, delivery: result.delivery }
  } catch (error) {
    return toApiPlatformError(error)
  }
}
