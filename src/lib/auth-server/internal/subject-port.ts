/** Choose internal authority only from durable corporate session provenance and canonical enrollment. */
import type { SubjectSessionPort } from '../oauth/subject'
import { sha256Hex } from '../oauth/primitives'
import { readCookie } from '../persons/sessions'
import type { AuthServerPersonAuthConfig } from '../persons/config'
import type { PersonAuthStorePort } from '../persons/store/port'
import type { InternalAuthorityPort, createInternalContextService } from './context'

export const createNativeSubjectPort = (deps: {
  base: SubjectSessionPort
  enabled: () => boolean
  config: AuthServerPersonAuthConfig
  issuer: string
  store: PersonAuthStorePort
  authority: InternalAuthorityPort
  contexts: ReturnType<typeof createInternalContextService>
  findEnrollment: (input: {
    environmentId: string
    subject: string
    profileId: string
    upstreamLinkId: string
  }) => Promise<{ bindingId: string } | null>
}): SubjectSessionPort => ({
  resolve: async (request, authorization) => {
    const subject = await deps.base.resolve(request, authorization)

    if (!subject) return null
    const rawSession = readCookie(request.headers.get('cookie'), deps.config.sessionCookieName)

    if (!rawSession) return null
    const sessionHash = sha256Hex(rawSession)

    try {
      const session = await deps.store.getSessionWithLink(sessionHash)

      if (!session || session.session.subject !== subject.subject) return null
      const evidence = await deps.authority.getCorporateSession(sessionHash)

      // A genuine noncorporate session stays in the existing external lane. A failed evidence
      // lookup throws and denies below; it can never silently turn a corporate login into external.
      if (!evidence) return session.session.amr.includes('entra_oidc') ? null : subject
      if (
        !deps.enabled() ||
        !authorization?.clientId.trim() ||
        !authorization.audience.trim() ||
        evidence.provenance !== 'entra_oidc'
      )
        return null

      if (!session || session.session.subject !== subject.subject || session.session.profileId !== evidence.profileId)
        return null

      const enrollment = await deps.findEnrollment({
        ...subject,
        profileId: evidence.profileId,
        upstreamLinkId: evidence.upstreamLinkId
      })

      if (!enrollment) return null

      const resolved = await deps.contexts.create({
        issuer: deps.issuer,
        environmentId: subject.environmentId,
        subject: subject.subject,
        clientId: authorization.clientId,
        audience: authorization.audience,
        sessionHash,
        bindingId: enrollment.bindingId,
        expiresAt: session.session.absoluteExpiresAt
      })

      return resolved.allowed ? { ...subject, authorizationContextId: resolved.context.id } : null
    } catch {
      return null
    }
  }
})
