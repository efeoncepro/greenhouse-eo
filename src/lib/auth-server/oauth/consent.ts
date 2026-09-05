/**
 * Consentimiento por cliente y scope (TASK-1829).
 *
 * Commands canónicos `grantClientConsent` / `revokeClientConsent`: idempotentes (índice único parcial
 * sobre consents activos), auditados, consumidos por la pantalla de consentimiento (task ui-ux, vía
 * `POST /oauth/consent`), Admin Center / CLI (`auth.consent.revoke`) y Nexa. Revocar un consentimiento
 * revoca todas las familias de tokens de (subject, client) en la misma llamada.
 *
 * Invariante: ningún access token se emite sin fila `active` para cada scope pedido.
 */

import { recordOAuthAudit, type OAuthRequestAuditContext } from './audit'
import { OAuthProtocolError } from './errors'
import { isKnownScope } from './scopes'
import type { ClientConsentRecord, OAuthStorePort } from './store/port'

export type ConsentActor = { actor: string; via: 'authorize_screen' | 'admin' | 'cli' | 'nexa' }

export type GrantClientConsentInput = {
  authorizationContextId?: string | null
  subject: string
  environmentId: string
  clientId: string
  scopes: readonly string[]
} & ConsentActor

export type RevokeClientConsentInput = {
  subject: string
  environmentId: string
  clientId: string
  /** `null` = todos los scopes del cliente. */
  scopes: readonly string[] | null
  reason: string
} & ConsentActor

export type ConsentDeps = { store: OAuthStorePort; now?: () => Date; audit?: OAuthRequestAuditContext }

const SYSTEM_AUDIT: OAuthRequestAuditContext = { ipHash: null, userAgentHash: null, correlationId: 'system' }

const assertScopes = (scopes: readonly string[]) => {
  if (scopes.length === 0) throw new OAuthProtocolError('invalid_scope', { description: 'scope required', reason: 'empty' })

  for (const scope of scopes) {
    if (!isKnownScope(scope)) throw new OAuthProtocolError('invalid_scope', { description: 'unknown scope', reason: 'unknown_scope' })
  }
}

export const grantClientConsent = async (input: GrantClientConsentInput, deps: ConsentDeps): Promise<ClientConsentRecord[]> => {
  assertScopes(input.scopes)

  const client = await deps.store.getClient(input.clientId)

  if (!client || client.status !== 'active') {
    throw new OAuthProtocolError('invalid_client', { description: 'unknown client', reason: 'client_not_found' })
  }

  const now = (deps.now ?? (() => new Date()))()
  const before = await deps.store.listActiveConsents(input)
  const known = new Set(before.map(row => row.scope))
  const added = input.scopes.filter(scope => !known.has(scope))

  const consents = await deps.store.grantConsents({
    authorizationContextId: input.authorizationContextId ?? null,
    subject: input.subject,
    environmentId: input.environmentId,
    clientId: input.clientId,
    scopes: input.scopes,
    grantedVia: input.via,
    grantedBy: input.actor,
    now
  })

  await recordOAuthAudit(deps.store, deps.audit ?? SYSTEM_AUDIT, {
    eventType: 'consent_granted',
    outcome: 'success',
    clientId: input.clientId,
    subject: input.subject,
    grantId: null,
    errorCode: null,
    details: { scopes: [...input.scopes], added, via: input.via }
  })

  return consents
}

export const revokeClientConsent = async (
  input: RevokeClientConsentInput,
  deps: ConsentDeps
): Promise<{ consentsRevoked: number; refreshRevoked: number; accessRevoked: number }> => {
  if (input.scopes) assertScopes(input.scopes)

  if (!/^[A-Za-z0-9][A-Za-z0-9 ._:-]{2,127}$/.test(input.reason)) {
    throw new OAuthProtocolError('invalid_request', { description: 'reason required', reason: 'reason_format' })
  }

  const now = (deps.now ?? (() => new Date()))()

  const consentsRevoked = await deps.store.revokeConsents({
    subject: input.subject,
    environmentId: input.environmentId,
    clientId: input.clientId,
    scopes: input.scopes,
    revokedBy: input.actor,
    reason: input.reason,
    now
  })

  // Sin consentimiento no hay token: se revoca toda familia viva de (subject, client), aunque quede
  // algún scope consentido (el cliente vuelve a authorize y recibe un set nuevo con el scope vigente).
  const revoked = await deps.store.revokeGrantsForSubjectClient({
    subject: input.subject,
    environmentId: input.environmentId,
    clientId: input.clientId,
    now,
    reason: `consent_revoked:${input.reason}`
  })

  await recordOAuthAudit(deps.store, deps.audit ?? SYSTEM_AUDIT, {
    eventType: 'consent_revoked',
    outcome: 'success',
    clientId: input.clientId,
    subject: input.subject,
    grantId: null,
    errorCode: null,
    details: { scopes: input.scopes ? [...input.scopes] : null, consentsRevoked, ...revoked, via: input.via }
  })

  return { consentsRevoked, ...revoked }
}

/** Scopes pedidos que todavía no tienen consentimiento activo. */
export const missingConsentScopes = (consents: readonly ClientConsentRecord[], scopes: readonly string[]): string[] => {
  const active = new Set(consents.map(row => row.scope))

  return scopes.filter(scope => !active.has(scope))
}
