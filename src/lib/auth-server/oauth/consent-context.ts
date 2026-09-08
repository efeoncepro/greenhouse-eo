/** Presentation only: this DTO neither grants scopes nor replaces resource authorization. */
export type ConsentContextInput = {
  environmentId: string
  subject: string
  clientId: string
  audience: string
  authorizationContextId?: string | null
  authorizationContextVersion?: 1 | 2
}

export type ConsentContextResolution =
  | {
      outcome: 'resolved'
      population: 'internal' | 'external'
      authorityClass?: 'internal_multi_org'
      moreOrganizationsAvailable?: boolean
      organizations: readonly {
        organizationName: string
        capabilities: readonly string[]
      }[]
    }
  | { outcome: 'denied' | 'unavailable' }

export interface ConsentContextPort {
  resolve(input: ConsentContextInput): Promise<ConsentContextResolution>
}
