/**
 * Resolución del claim `gv` (TASK-1829 ⇄ TASK-1631).
 *
 * `grants_version` vive por BINDING (organización ↔ environment), no por persona. Regla de emisión:
 * sólo se emite para un sujeto con al menos una membership `bound`; `gv = max(grantsVersion)` de sus
 * memberships. Revocar cualquiera de ellas bumpea su versión y el gateway (TASK-1831) rechequea por
 * igualdad estricta con el reader de bindings; una revocación deja de despachar en ≤ 60 s.
 */

import { resolveExternalAccess } from '@/lib/identity/external-access'

export type GrantsVersionResolution =
  | { bound: true; grantsVersion: number; profileId: string | null; memberships: number }
  | { bound: false; outcome: string; profileId: string | null }

export interface GrantsVersionPort {
  resolve(input: { environmentId: string; subject: string; clientId: string; authorizationContextId?: string | null }): Promise<GrantsVersionResolution>
}

export const createExternalAccessGrantsPort = (): GrantsVersionPort => ({
  resolve: async ({ environmentId, subject, clientId, authorizationContextId }) => {
    if (authorizationContextId) return { bound: false, outcome: 'internal_context_not_supported', profileId: null }

    const resolution = await resolveExternalAccess({ environmentId, subject, clientId })

    if (resolution.outcome !== 'bound' || resolution.memberships.length === 0) {
      return { bound: false, outcome: resolution.outcome, profileId: resolution.profileId }
    }

    const grantsVersion = Math.max(...resolution.memberships.map(membership => membership.grantsVersion))

    return { bound: true, grantsVersion: Math.max(1, grantsVersion), profileId: resolution.profileId, memberships: resolution.memberships.length }
  }
})

/** Port de prueba. Sólo para tests in-process. */
export const createStaticGrantsPort = (resolution: GrantsVersionResolution): GrantsVersionPort => ({
  resolve: async () => resolution
})
