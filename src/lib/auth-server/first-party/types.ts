import type { OAuthHttpRequest } from '../oauth/http'

export type FirstPartyProduct = 'rooms' | 'synthetic-rp'
export type FirstPartyClient = {
  clientId: string
  product: FirstPartyProduct
  redirectUris: string[]
  tokenEndpointAuthMethod: 'client_secret_basic' | 'client_secret_post'
  clientSecretHash: string
  status: 'active' | 'suspended' | 'retired'
  allowLocalDevelopment: boolean
  sessionMaxAgeSeconds: number
  createdBy: string
  createdAt: Date
}
export type FirstPartyIdentity = {
  sessionHash: string
  subject: string
  profileId: string
  environmentId: string
  authTime: Date
  expiresAt: Date
}
export interface FirstPartyIdentityPort {
  resolveRequest(request: OAuthHttpRequest, now: Date): Promise<FirstPartyIdentity | null>
  resolveSession(sessionHash: string, now: Date): Promise<FirstPartyIdentity | null>
}
export type FirstPartyCode = {
  codeHash: string
  clientId: string
  sessionHash: string
  subject: string
  redirectUri: string
  codeChallenge: string
  nonce: string
  authTime: Date
  expiresAt: Date
  createdAt: Date
  consumedAt: Date | null
  invalidatedAt: Date | null
}
export type FirstPartyLoginTransaction = {
  transactionHash: string; clientId: string; authorizationUrl: string
  freshAfter: Date | null; previousSessionHash: string | null; expiresAt: Date; consumedAt: Date | null
}
export type FirstPartyAccessHandle = {
  tokenHash: string
  codeHash: string
  clientId: string
  sessionHash: string
  subject: string
  authTime: Date
  createdAt: Date
  expiresAt: Date
  revokedAt: Date | null
}
export interface FirstPartyStore {
  getClient(clientId: string): Promise<FirstPartyClient | null>
  /** Insert-only: existing registrations are never silently overwritten. */
  insertClient(client: FirstPartyClient): Promise<boolean>
  insertCode(code: FirstPartyCode): Promise<void>
  insertLoginTransaction(transaction: FirstPartyLoginTransaction): Promise<void>
  getLoginTransaction(hash: string): Promise<FirstPartyLoginTransaction | null>
  consumeLoginTransaction(hash: string, now: Date): Promise<boolean>
  consumeCode(codeHash: string, clientId: string, now: Date): Promise<{ status: 'consumed' | 'reused' | 'expired'; code: FirstPartyCode } | null>
  insertAccessHandle(handle: FirstPartyAccessHandle): Promise<boolean>
  getAccessHandle(tokenHash: string): Promise<FirstPartyAccessHandle | null>
  revokeAccessHandle(tokenHash: string, clientId: string, now: Date): Promise<void>
  revokeCodeHandles(codeHash: string, now: Date): Promise<void>
}
export type FirstPartyConfig = { enabled: boolean; issuer: string; environmentId: string }
export const FIRST_PARTY_CLIENT_PREFIX = 'efeonce-rp-'
export const FIRST_PARTY_CODE_PREFIX = 'efpc'
export const FIRST_PARTY_ACCESS_PREFIX = 'efpa'
export const FIRST_PARTY_TOKEN_TTL_SECONDS = 300
export const FIRST_PARTY_PRODUCTS: Record<FirstPartyProduct, { displayName: string }> = {
  rooms: { displayName: 'Rooms' },
  'synthetic-rp': { displayName: 'Efeonce Test' }
}
