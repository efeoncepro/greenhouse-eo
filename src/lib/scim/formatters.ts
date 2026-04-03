import type { ScimUser, ScimErrorResponse, ScimListResponse } from '@/types/scim'

// ── Row shape from Kysely / raw query ──

export interface ScimUserRow {
  [key: string]: unknown
  user_id: string
  scim_id: string | null
  email: string | null
  full_name: string | null
  microsoft_oid: string | null
  microsoft_email: string | null
  active: boolean
  created_at: string | Date | null
  updated_at: string | Date | null
}

// ── Formatters ──

export const toScimUser = (row: ScimUserRow): ScimUser => {
  const nameParts = (row.full_name || '').split(' ')
  const givenName = nameParts[0] || ''
  const familyName = nameParts.slice(1).join(' ') || ''

  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: row.scim_id || row.user_id,
    externalId: row.microsoft_oid || undefined,
    userName: row.microsoft_email || row.email || '',
    displayName: row.full_name || undefined,
    name: { givenName, familyName },
    emails: [
      {
        value: row.microsoft_email || row.email || '',
        type: 'work',
        primary: true
      }
    ],
    active: row.active ?? true,
    meta: {
      resourceType: 'User',
      created: row.created_at ? new Date(row.created_at as string).toISOString() : undefined,
      lastModified: row.updated_at ? new Date(row.updated_at as string).toISOString() : undefined
    }
  }
}

export const toScimError = (detail: string, status: number): ScimErrorResponse => ({
  schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
  detail,
  status
})

export const toScimListResponse = (
  resources: ScimUser[],
  startIndex: number,
  itemsPerPage: number,
  totalResults: number
): ScimListResponse<ScimUser> => ({
  schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
  totalResults,
  startIndex,
  itemsPerPage,
  Resources: resources
})
