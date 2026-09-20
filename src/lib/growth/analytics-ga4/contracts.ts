import 'server-only'

export const GA4_READ_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
export const GA4_STATE_TTL_MS = 15 * 60 * 1000

export type Ga4ConnectionStatus = 'pending' | 'active' | 'revoked' | 'expired'

export interface Ga4Connection {
  organizationId: string
  propertyId: string | null
  propertyName: string | null
  status: Ga4ConnectionStatus
  scopes: string[]
  tokenSecretRef: string | null
  connectedByUserId: string | null
  connectedAt: string | null
  lastVerifiedAt: string | null
  lastErrorCode: string | null
}

export interface Ga4PropertyOption {
  propertyId: string
  displayName: string
  accountName: string
}

export type Ga4ConnectionError =
  | 'disabled'
  | 'not_configured'
  | 'state_invalid'
  | 'oauth_failed'
  | 'secret_write_failed'
  | 'not_connected'
  | 'token_unhealthy'
  | 'query_failed'
  | 'property_not_accessible'
