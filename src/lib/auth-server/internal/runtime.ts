/** Composition shared by the native issuer and the trusted ecosystem reader. */
import { canDelegateInternalCapability } from '@/lib/identity/internal-access/delegation'
import { query } from '@/lib/db'
import { withInternalAuthoritySnapshot } from '@/lib/identity/internal-access/snapshot'
import { readInternalTargetAuthority, type InternalTargetRequest } from '@/lib/identity/internal-access/target-authority'
import { readAccessTokenRecord } from '../oauth/store/postgres-store'
import { EFEONCE_MCP_BASE_SCOPE } from '../oauth/scopes'
import type { GrantsVersionPort } from '../oauth/grants'
import { isCurrentInternalAccessToken } from './access-token'
import {
  resolveInternalAuthority,
  resolveInternalSessionIdentity,
  resolveEnrolledInternalIdentity
} from '@/lib/identity/internal-access/store'
import type { AuthServerOAuthConfig } from '../oauth/config'
import type { SubjectSessionPort } from '../oauth/subject'
import type { AuthServerPersonAuthConfig } from '../persons/config'
import type { PersonAuthStorePort } from '../persons/store/port'
import { buildSessionCookie, createPersonSession } from '../persons/sessions'
import { enforceRateLimit } from '../persons/rate-limit'
import { createInternalContextService } from './context'
import { createRuntimeConsentContextPort } from './consent-context'
import { internalAuthEnabled, internalMultiOrgIssuanceEnabled, internalMultiOrgReaderEnabled, readInternalOidcConfig } from './config'
import type { InternalContextRequest, InternalContextVersion } from './context'
import { createInternalLoginEnvelope } from './envelope'
import { createInternalLoginFlow, createEntraOidcClient, InternalLoginError } from './oidc'
import { createInternalLoginHandler } from './login-http'
import { PostgresInternalContextStore, PostgresInternalLoginTransactions } from './postgres-store'
import { getCorporateSessionEvidence, insertCorporateSession } from './postgres-sessions'
import { createNativeSubjectPort } from './subject-port'

export const createRuntimeInternalContexts = ({
  readQuery = query, allowMultiOrganization = internalMultiOrgIssuanceEnabled, now
}: { readQuery?: typeof query; allowMultiOrganization?: (profileId: string) => boolean; now?: () => Date } = {}) => {
  const authority = {
    resolve: async (input: Parameters<typeof resolveInternalAuthority>[0] & { version?: InternalContextVersion }) => {
      const facts = await resolveInternalAuthority(input, readQuery)

      if (!facts) return null
      // V2 grants are resolved per target by Greenhouse; the legacy binding remains only the actor anchor.
      if (input.version === 2) return { ...facts, capabilities: [] }

      const effective = await Promise.all(
        facts.capabilities.map(async capability =>
          (await canDelegateInternalCapability(facts.profileId, capability)) ? capability : null
        )
      )

      return { ...facts, capabilities: effective.filter((value): value is string => value !== null) }
    },
    getCorporateSession: (sessionHash: string) => getCorporateSessionEvidence(sessionHash, readQuery)
  }

  const contexts = createInternalContextService({
    enabled: internalAuthEnabled,
    store: new PostgresInternalContextStore(readQuery),
    authority,
    allowMultiOrganization,
    now
  })

  return { authority, contexts }
}

/** The same authoritative snapshot backs OAuth/consent and the machine-only resource reader. */
export const resolveRuntimeInternalMultiOrg = async (input: {
  context: InternalContextRequest
  target: InternalTargetRequest
  surface: 'issuer' | 'reader'
  jti?: string
}) => {
  try {
    return await withInternalAuthoritySnapshot(async ({ readQuery, now }) => {
      const allowMultiOrganization = input.surface === 'reader'
        ? () => internalMultiOrgReaderEnabled() : internalMultiOrgIssuanceEnabled

      const { contexts } = createRuntimeInternalContexts({ readQuery, now: () => now, allowMultiOrganization })

      if (input.context.version !== 2) return { allowed: false as const, reason: 'context_invalid' }

      if (input.surface === 'reader') {
        if (!input.jti) return { allowed: false as const, reason: 'token_invalid' }

        const current = await isCurrentInternalAccessToken({
          ...input.context, jti: input.jti, authorizationContextId: input.context.id
        }, { getAccessToken: async jti => {
          const token = await readAccessTokenRecord(jti, readQuery)

          return token?.scopes.includes(EFEONCE_MCP_BASE_SCOPE) ? token : null
        } }, now)

        if (!current) return { allowed: false as const, reason: 'token_invalid' }
      }

      const actor = await contexts.resolve(input.context)

      if (!actor.allowed) return actor
      const targets = await readInternalTargetAuthority(actor.context.profileId, input.target, { readQuery, now })

      if (targets.outcome !== 'resolved') return { allowed: false as const, reason: 'organization_denied' }

      if (!internalAuthEnabled() || !allowMultiOrganization(actor.context.profileId)) {
        return { allowed: false as const, reason: 'disabled' }
      }

      return { ...actor, targets }
    })
  } catch {
    return { allowed: false as const, reason: 'unavailable' }
  }
}

export const createRuntimeMultiOrgGrantsResolver = (config: AuthServerOAuthConfig): GrantsVersionPort['resolve'] => async input => {
  if (!input.authorizationContextId) return { bound: false, profileId: null, outcome: 'internal_context_required' }

  const result = await resolveRuntimeInternalMultiOrg({
    context: { ...input, id: input.authorizationContextId, version: 2, issuer: config.issuer, audience: config.mcpAudience },
    target: { intent: 'organizations', limit: 1 }, surface: 'issuer'
  })

  if (!result.allowed || !result.targets.targets.length) return { bound: false, profileId: null, outcome: 'internal_authority_unavailable' }

  return {
    bound: true, profileId: result.context.profileId, grantsVersion: result.grantsVersion,
    authorizationContextVersion: 2, memberships: result.targets.targets.length
  }
}

export const createInternalAuthRuntime = (deps: {
  oauthConfig: AuthServerOAuthConfig
  personConfig: AuthServerPersonAuthConfig
  personStore: PersonAuthStorePort
  baseSubject: SubjectSessionPort
}) => {
  const { authority, contexts } = createRuntimeInternalContexts()
  const enabled = () => internalAuthEnabled() && deps.personConfig.personAuthEnabled && deps.oauthConfig.oauthEnabled

  const subjectPort = createNativeSubjectPort({
    base: deps.baseSubject,
    enabled,
    config: deps.personConfig,
    issuer: deps.oauthConfig.issuer,
    store: deps.personStore,
    authority,
    contexts,
    contextVersion: profileId => internalMultiOrgIssuanceEnabled(profileId) ? 2 : 1,
    findEnrollment: resolveInternalSessionIdentity
  })

  // Configuration is resolved lazily so an OFF deployment needs no Entra secret or KMS key.
  const upstream = () =>
    createEntraOidcClient({
      config: readInternalOidcConfig(deps.oauthConfig.issuer),
      getClientSecret: async () => process.env.AUTH_SERVER_ENTRA_CLIENT_SECRET ?? ''
    })

  const flow = createInternalLoginFlow({
    enabled,
    issuer: deps.oauthConfig.issuer,
    store: new PostgresInternalLoginTransactions(createInternalLoginEnvelope(deps.oauthConfig.environmentId)),
    upstream: {
      authorizationUrl: input => upstream().authorizationUrl(input),
      exchange: input => upstream().exchange(input)
    }
  })

  const handler = createInternalLoginHandler({
    enabled,
    flow,
    allowAttempt: async (request, stage) => {
      // Ingress is restricted to the ALB. Its appended client hop, not a user-supplied first hop,
      // must be trusted by the deployment. Missing IP shares a conservative anonymous bucket.
      const ip = request.headers.get('x-forwarded-for')?.trim() || null

      const decision = await enforceRateLimit({
        store: deps.personStore,
        config: deps.personConfig,
        rule: { action: `internal_${stage}`, dimension: 'ip', windowSeconds: 600, limit: 20 },
        value: ip,
        now: new Date()
      })

      return decision.allowed
    },
    onOutcome: async event =>
      deps.personStore.recordAttempt({
        method: 'entra_oidc',
        stage: event.stage === 'login' ? 'request' : 'consume',
        outcome: event.outcome === 'success' ? 'success' : 'rejected',
        reasonCode: event.reason,
        environmentId: deps.oauthConfig.environmentId,
        subjectHash: null,
        ipHash: null,
        userAgentHash: null,
        correlationId: null,
        details: event.diagnostic ? { diagnostic: event.diagnostic } : {}
      }),
    completeSession: async identity => {
      if (!enabled()) throw new InternalLoginError('configuration_invalid')

      const enrolled = await resolveEnrolledInternalIdentity({
        ...identity,
        environmentId: deps.oauthConfig.environmentId
      })

      if (!enrolled) throw new InternalLoginError('upstream_rejected', 'identity_not_enrolled')

      const created = await createPersonSession({
        store: { insertSession: record => insertCorporateSession(record, enrolled.upstreamLinkId, identity) },
        config: deps.personConfig,
        now: new Date(),
        input: {
          subject: enrolled.subject,
          environmentId: enrolled.environmentId,
          profileId: enrolled.profileId,
          linkId: enrolled.nativeLinkId,
          amr: ['entra_oidc'],
          authTime: identity.authTime,
          ipHash: null,
          userAgentHash: null,
          correlationId: null
        }
      })

      return buildSessionCookie(
        deps.personConfig.sessionCookieName,
        created.sessionId,
        deps.personConfig.sessionSlidingTtlSeconds
      )
    }
  })

  const consentContextPort = createRuntimeConsentContextPort(deps.oauthConfig, contexts, async input => {
    const result = await resolveRuntimeInternalMultiOrg({ context: input, target: { intent: 'organizations', limit: 50 }, surface: 'issuer' })

    return result.allowed ? result.targets : { outcome: 'denied' }
  })

  return { contexts, subjectPort, handler, consentContextPort }
}
