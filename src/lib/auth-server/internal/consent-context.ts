import { getExternalOrganizationBinding } from '@/lib/identity/external-access/store'
import { resolveExternalAccess } from '@/lib/identity/external-access/resolve-external-access'
import type { ExternalAccessResolution, ExternalOrganizationBinding } from '@/lib/identity/external-access/types'
import type { AuthServerOAuthConfig } from '../oauth/config'
import type { ConsentContextPort, ConsentContextResolution } from '../oauth/consent-context'
import type { InternalContextRequest, InternalContextResolution } from './context'

type Config = Pick<AuthServerOAuthConfig, 'issuer' | 'environmentId' | 'mcpAudience'>
type Membership = { bindingId: string; organizationId: string; grantsVersion: number; capabilities: readonly string[] }
export type ConsentContextDependencies = {
  config: Config
  internal: { resolve(input: InternalContextRequest): Promise<InternalContextResolution> }
  external: (input: { environmentId: string; subject: string; clientId: string }) => Promise<ExternalAccessResolution>
  getBinding: (bindingId: string) => Promise<ExternalOrganizationBinding | null>
}

/** Fresh provider authority followed by canonical names; no email lookup, cache, or cross-org union. */
export const createConsentContextPort = (deps: ConsentContextDependencies): ConsentContextPort => ({
  resolve: async input => {
    if (
      input.environmentId !== deps.config.environmentId ||
      input.audience !== deps.config.mcpAudience ||
      !input.subject.trim() ||
      !input.clientId.trim()
    )
      return { outcome: 'denied' }

    try {
      let population: 'internal' | 'external'
      let memberships: readonly Membership[]

      // Presence of an invalid internal context must never choose the external lane.
      if (input.authorizationContextId !== undefined && input.authorizationContextId !== null) {
        if (!input.authorizationContextId.trim()) return { outcome: 'denied' }

        const resolved = await deps.internal.resolve({
          id: input.authorizationContextId,
          version: 1,
          issuer: deps.config.issuer,
          environmentId: input.environmentId,
          subject: input.subject,
          clientId: input.clientId,
          audience: input.audience
        })

        if (!resolved.allowed) return { outcome: resolved.reason === 'unavailable' ? 'unavailable' : 'denied' }
        const context = resolved.context

        if (
          context.id !== input.authorizationContextId ||
          context.version !== 1 ||
          context.issuer !== deps.config.issuer ||
          context.environmentId !== input.environmentId ||
          context.subject !== input.subject ||
          context.clientId !== input.clientId ||
          context.audience !== input.audience
        )
          return { outcome: 'denied' }
        population = 'internal'
        memberships = [
          {
            bindingId: context.bindingId,
            organizationId: context.organizationId,
            grantsVersion: resolved.grantsVersion,
            capabilities: resolved.capabilities
          }
        ]
      } else {
        const resolved = await deps.external({
          environmentId: input.environmentId,
          subject: input.subject,
          clientId: input.clientId
        })

        if (
          resolved.outcome !== 'bound' ||
          resolved.environmentId !== input.environmentId ||
          !resolved.memberships.length
        )
          return { outcome: 'denied' }
        population = 'external'
        memberships = resolved.memberships.map(membership => ({ ...membership, capabilities: membership.grants }))
      }

      const organizations: Extract<ConsentContextResolution, { outcome: 'resolved' }>['organizations'][number][] = []

      for (const membership of memberships) {
        const binding = await deps.getBinding(membership.bindingId)

        if (
          !binding ||
          binding.bindingId !== membership.bindingId ||
          binding.organizationId !== membership.organizationId ||
          binding.environmentId !== input.environmentId ||
          binding.status !== 'active' ||
          binding.revokedAt !== null ||
          binding.grantsVersion !== membership.grantsVersion ||
          !binding.organizationName?.trim()
        )
          return { outcome: 'denied' }
        organizations.push({
          organizationName: binding.organizationName.trim(),
          capabilities: [...membership.capabilities]
        })
      }

      return { outcome: 'resolved', population, organizations }
    } catch {
      return { outcome: 'unavailable' }
    }
  }
})

/** Production composition reuses the canonical readers; internal contexts are supplied by runtime. */
export const createRuntimeConsentContextPort = (
  config: Config,
  internal: ConsentContextDependencies['internal']
): ConsentContextPort =>
  createConsentContextPort({
    config,
    internal,
    external: resolveExternalAccess,
    getBinding: getExternalOrganizationBinding
  })
