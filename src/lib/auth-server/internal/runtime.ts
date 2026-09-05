/** Composition shared by the native issuer and the trusted ecosystem reader. */
import { canDelegateInternalCapability } from '@/lib/identity/internal-access/delegation'
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
import { internalAuthEnabled, readInternalOidcConfig } from './config'
import { createInternalLoginEnvelope } from './envelope'
import { createInternalLoginFlow, createEntraOidcClient, InternalLoginError } from './oidc'
import { createInternalLoginHandler } from './login-http'
import { PostgresInternalContextStore, PostgresInternalLoginTransactions } from './postgres-store'
import { getCorporateSessionEvidence, insertCorporateSession } from './postgres-sessions'
import { createNativeSubjectPort } from './subject-port'

export const createRuntimeInternalContexts = () => {
  const authority = {
    resolve: async (input: Parameters<typeof resolveInternalAuthority>[0]) => {
      const facts = await resolveInternalAuthority(input)

      if (!facts) return null

      const effective = await Promise.all(
        facts.capabilities.map(async capability =>
          (await canDelegateInternalCapability(facts.profileId, capability)) ? capability : null
        )
      )

      return { ...facts, capabilities: effective.filter((value): value is string => value !== null) }
    },
    getCorporateSession: getCorporateSessionEvidence
  }

  const contexts = createInternalContextService({
    enabled: internalAuthEnabled,
    store: new PostgresInternalContextStore(),
    authority
  })

  return { authority, contexts }
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

  const consentContextPort = createRuntimeConsentContextPort(deps.oauthConfig, contexts)

  return { contexts, subjectPort, handler, consentContextPort }
}
