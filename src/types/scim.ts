/**
 * SCIM 2.0 Protocol Types
 *
 * Subset of RFC 7643/7644 needed for Entra ID provisioning.
 */

// ── SCIM User Resource ──

export interface ScimUser {
  schemas: string[]
  id: string
  externalId?: string
  userName: string
  displayName?: string
  name?: {
    givenName?: string
    familyName?: string
  }
  emails?: Array<{
    value: string
    type?: string
    primary?: boolean
  }>
  active: boolean
  meta: {
    resourceType: 'User'
    created?: string
    lastModified?: string
  }
}

// ── SCIM Request Types ──

export interface ScimCreateUserRequest {
  schemas: string[]
  userName: string
  displayName?: string
  name?: {
    givenName?: string
    familyName?: string
  }
  emails?: Array<{
    value: string
    type?: string
    primary?: boolean
  }>
  externalId?: string
  active?: boolean
}

export interface ScimPatchOperation {
  op: 'Replace' | 'Add' | 'Remove' | 'replace' | 'add' | 'remove'
  path?: string
  value?: unknown
}

export interface ScimPatchRequest {
  schemas: string[]
  Operations: ScimPatchOperation[]
}

// ── SCIM Response Types ──

export interface ScimListResponse<T> {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse']
  totalResults: number
  startIndex: number
  itemsPerPage: number
  Resources: T[]
}

export interface ScimErrorResponse {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:Error']
  detail: string
  status: number
}
