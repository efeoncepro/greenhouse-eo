/** Presentation only: this DTO neither grants scopes nor replaces resource authorization. */
export type ConsentContextInput = {
  environmentId: string
  subject: string
  clientId: string
  audience: string
  authorizationContextId?: string | null
}

export type ConsentContextResolution =
  | {
      outcome: 'resolved'
      population: 'internal' | 'external'
      organizations: readonly {
        organizationName: string
        capabilities: readonly string[]
      }[]
    }
  | { outcome: 'denied' | 'unavailable' }

export interface ConsentContextPort {
  resolve(input: ConsentContextInput): Promise<ConsentContextResolution>
}
