/** TASK-1836 — server-owned delegated context. No token/issuer/email can manufacture internal authority. */
import { randomUUID } from 'node:crypto'

export const AUTHORIZATION_CONTEXT_VERSION = 1 as const

export type InternalAuthorizationContext = {
  id: string
  version: typeof AUTHORIZATION_CONTEXT_VERSION
  issuer: string
  environmentId: string
  subject: string
  profileId: string
  clientId: string
  audience: string
  organizationId: string
  bindingId: string
  sessionHash: string
  upstreamLinkId: string
  authTime: Date
  createdAt: Date
  expiresAt: Date
  revokedAt: Date | null
}

/** Current facts read from the canonical identity/grant owner, never claims submitted by the caller. */
export type InternalAuthorityFacts = {
  environmentId: string
  subject: string
  profileId: string
  organizationId: string
  bindingId: string
  upstreamLinkId: string
  population: 'internal' | 'external'
  eligible: boolean
  bindingActive: boolean
  sourceLinkActive: boolean
  grantsVersion: number
  capabilities: readonly string[]
}

export type CorporateSessionEvidence = {
  sessionHash: string
  environmentId: string
  subject: string
  profileId: string
  upstreamLinkId: string
  provenance: 'entra_oidc' | 'external'
  authTime: Date
  expiresAt: Date
  revokedAt: Date | null
}

export interface InternalContextStorePort {
  /** Atomically reuses the context for the same session/client/binding; never renews its lifetime. */
  insert(context: InternalAuthorizationContext): Promise<InternalAuthorizationContext | void>
  get(id: string): Promise<InternalAuthorizationContext | null>
  revoke(input: { id: string; now: Date; reason: string }): Promise<boolean>
}

export interface InternalAuthorityPort {
  /** Must re-read eligibility, source links and effective grants on every invocation. No positive cache in V1. */
  resolve(input: {
    environmentId: string
    subject: string
    profileId: string
    bindingId: string
  }): Promise<InternalAuthorityFacts | null>
  getCorporateSession(sessionHash: string): Promise<CorporateSessionEvidence | null>
}

export type InternalContextRequest = {
  id: string
  version: number
  issuer: string
  environmentId: string
  subject: string
  clientId: string
  audience: string
  /** Signed gv; only present on resource-server verification, not when renewing a valid grant. */
  grantsVersion?: number
}

export type InternalContextResolution =
  | {
      allowed: false
      reason: 'disabled' | 'context_invalid' | 'session_invalid' | 'ineligible' | 'version_stale' | 'unavailable'
    }
  | { allowed: true; context: InternalAuthorizationContext; grantsVersion: number; capabilities: readonly string[] }

const validDate = (date: Date): boolean => Number.isFinite(date.getTime())

const current = (expiresAt: Date, revokedAt: Date | null, now: Date): boolean =>
  validDate(expiresAt) && revokedAt === null && expiresAt.getTime() > now.getTime()

export const createInternalContextService = (deps: {
  enabled: () => boolean
  store: InternalContextStorePort
  authority: InternalAuthorityPort
  now?: () => Date
}) => {
  const now = () => (deps.now ?? (() => new Date()))()

  const resolve = async (request: InternalContextRequest): Promise<InternalContextResolution> => {
    if (!deps.enabled()) return { allowed: false, reason: 'disabled' }

    try {
      const context = await deps.store.get(request.id)
      const time = now()

      if (
        !context ||
        request.version !== AUTHORIZATION_CONTEXT_VERSION ||
        context.version !== request.version ||
        context.issuer !== request.issuer ||
        context.environmentId !== request.environmentId ||
        context.subject !== request.subject ||
        context.clientId !== request.clientId ||
        context.audience !== request.audience ||
        !current(context.expiresAt, context.revokedAt, time)
      ) {
        return { allowed: false, reason: 'context_invalid' }
      }

      const session = await deps.authority.getCorporateSession(context.sessionHash)

      // Session expiry does not terminate a consented refresh family. Revocation/provenance still does.
      // Creating a context requires a live session; using it requires an unrevoked matching authentication record.
      if (
        !session ||
        session.provenance !== 'entra_oidc' ||
        session.revokedAt !== null ||
        session.sessionHash !== context.sessionHash ||
        session.environmentId !== context.environmentId ||
        session.subject !== context.subject ||
        session.profileId !== context.profileId ||
        session.upstreamLinkId !== context.upstreamLinkId ||
        !validDate(session.authTime) ||
        session.authTime.getTime() !== context.authTime.getTime()
      ) {
        return { allowed: false, reason: 'session_invalid' }
      }

      const facts = await deps.authority.resolve(context)

      if (
        !facts ||
        facts.population !== 'internal' ||
        !facts.eligible ||
        !facts.bindingActive ||
        !facts.sourceLinkActive ||
        facts.environmentId !== context.environmentId ||
        facts.subject !== context.subject ||
        facts.profileId !== context.profileId ||
        facts.organizationId !== context.organizationId ||
        facts.bindingId !== context.bindingId ||
        facts.upstreamLinkId !== context.upstreamLinkId ||
        !Number.isSafeInteger(facts.grantsVersion) ||
        facts.grantsVersion < 1 ||
        !Array.isArray(facts.capabilities) ||
        facts.capabilities.some(capability => typeof capability !== 'string')
      ) {
        return { allowed: false, reason: 'ineligible' }
      }

      if (request.grantsVersion !== undefined && request.grantsVersion !== facts.grantsVersion) {
        return { allowed: false, reason: 'version_stale' }
      }

      return { allowed: true, context, grantsVersion: facts.grantsVersion, capabilities: [...facts.capabilities] }
    } catch {
      return { allowed: false, reason: 'unavailable' }
    }
  }

  const create = async (input: {
    issuer: string
    environmentId: string
    subject: string
    clientId: string
    audience: string
    sessionHash: string
    bindingId: string
    expiresAt: Date
  }): Promise<InternalContextResolution> => {
    if (!deps.enabled()) return { allowed: false, reason: 'disabled' }

    try {
      const session = await deps.authority.getCorporateSession(input.sessionHash)
      const time = now()

      if (
        !session ||
        session.provenance !== 'entra_oidc' ||
        session.sessionHash !== input.sessionHash ||
        session.environmentId !== input.environmentId ||
        session.subject !== input.subject ||
        !current(session.expiresAt, session.revokedAt, time) ||
        !validDate(session.authTime) ||
        session.authTime.getTime() > time.getTime() ||
        !current(input.expiresAt, null, time)
      ) {
        return { allowed: false, reason: 'session_invalid' }
      }

      const facts = await deps.authority.resolve({ ...input, profileId: session.profileId })

      if (
        !facts ||
        facts.population !== 'internal' ||
        !facts.eligible ||
        !facts.bindingActive ||
        !facts.sourceLinkActive ||
        facts.environmentId !== input.environmentId ||
        facts.subject !== input.subject ||
        facts.profileId !== session.profileId ||
        facts.bindingId !== input.bindingId ||
        facts.upstreamLinkId !== session.upstreamLinkId ||
        !Number.isSafeInteger(facts.grantsVersion) ||
        facts.grantsVersion < 1 ||
        !Array.isArray(facts.capabilities) ||
        facts.capabilities.some(capability => typeof capability !== 'string')
      ) {
        return { allowed: false, reason: 'ineligible' }
      }

      const context: InternalAuthorizationContext = {
        id: randomUUID(),
        version: AUTHORIZATION_CONTEXT_VERSION,
        issuer: input.issuer,
        environmentId: input.environmentId,
        subject: input.subject,
        clientId: input.clientId,
        audience: input.audience,
        profileId: session.profileId,
        organizationId: facts.organizationId,
        bindingId: facts.bindingId,
        sessionHash: session.sessionHash,
        upstreamLinkId: session.upstreamLinkId,
        authTime: session.authTime,
        createdAt: time,
        expiresAt: input.expiresAt,
        revokedAt: null
      }

      const persisted = (await deps.store.insert(context)) ?? context

      // Recheck after insert: an intervening revocation cannot issue a context from stale evidence.
      return resolve({ ...input, id: persisted.id, version: persisted.version })
    } catch {
      return { allowed: false, reason: 'unavailable' }
    }
  }

  return { create, resolve }
}
