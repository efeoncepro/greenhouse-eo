import 'server-only'

import { resolveSecret } from '@/lib/secrets/secret-manager'

// ── Types ──

export interface EntraUserProfile {
  id: string
  displayName: string | null
  mail: string | null
  userPrincipalName: string
  jobTitle: string | null
  department: string | null
  companyName: string | null
  officeLocation: string | null
  city: string | null
  country: string | null
  state: string | null
  mobilePhone: string | null
  businessPhones: string[]
  preferredLanguage: string | null
  accountEnabled: boolean
  usageLocation: string | null
}

export interface EntraManagerRef {
  id: string
  displayName: string | null
  mail: string | null
  userPrincipalName: string | null
}

export interface EntraUserWithManager extends EntraUserProfile {
  manager: EntraManagerRef | null
}

// ── Token cache ──

let cachedToken: { value: string; expiresAt: number } | null = null

const getClientSecret = async (): Promise<string> => {
  const resolution = await resolveSecret({ envVarName: 'AZURE_AD_CLIENT_SECRET' })

  if (resolution.value) return resolution.value

  const direct = process.env.AZURE_AD_CLIENT_SECRET?.trim()

  if (!direct) throw new Error('[entra] AZURE_AD_CLIENT_SECRET not configured')

  return direct
}

const getAccessToken = async (): Promise<string> => {
  const now = Date.now()

  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value
  }

  const tenantId = process.env.AZURE_AD_TENANT_ID?.trim() || 'a80bf6c1-7c45-4d70-b043-51389622a0e4'
  const clientId = process.env.AZURE_AD_CLIENT_ID?.trim()

  if (!clientId) throw new Error('[entra] AZURE_AD_CLIENT_ID not configured')

  const clientSecret = await getClientSecret()

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })
    }
  )

  if (!response.ok) {
    const body = await response.text()

    throw new Error(`[entra] Token request failed (${response.status}): ${body}`)
  }

  const data = await response.json()

  cachedToken = {
    value: data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000
  }

  return data.access_token
}

// ── Public API ──

const GRAPH_USER_FIELDS = [
  'id', 'displayName', 'mail', 'userPrincipalName', 'jobTitle',
  'department', 'companyName', 'officeLocation', 'city', 'country',
  'state', 'mobilePhone', 'businessPhones', 'preferredLanguage',
  'accountEnabled', 'usageLocation'
].join(',')

/**
 * Fetch profile photo for a single Entra user.
 * Returns the raw image buffer + content type, or null if the user has no photo.
 * Microsoft Graph requires a separate endpoint for photos — they don't come in bulk user queries.
 */
export const fetchEntraUserPhoto = async (
  oid: string
): Promise<{ buffer: Buffer; contentType: string } | null> => {
  const token = await getAccessToken()

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${oid}/photo/$value`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  if (res.status === 404) return null
  if (!res.ok) return null

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const arrayBuffer = await res.arrayBuffer()

  return { buffer: Buffer.from(arrayBuffer), contentType }
}

export const fetchEntraUsers = async (): Promise<EntraUserProfile[]> => {
  const token = await getAccessToken()

  const allUsers: EntraUserProfile[] = []
  let nextUrl: string | null = `https://graph.microsoft.com/v1.0/users?$select=${GRAPH_USER_FIELDS}&$top=100`

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) {
      const body = await res.text()

      throw new Error(`[entra] Graph API request failed (${res.status}): ${body}`)
    }

    const data = await res.json()

    allUsers.push(...(data.value || []))
    nextUrl = data['@odata.nextLink'] || null
  }

  return allUsers
}

export const fetchEntraUserManager = async (oid: string): Promise<EntraManagerRef | null> => {
  const token = await getAccessToken()

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${oid}/manager?$select=id,displayName,mail,userPrincipalName`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )

  if (res.status === 404) return null

  if (!res.ok) {
    const body = await res.text().catch(() => '')

    throw new Error(`[entra] Manager request failed (${res.status}): ${body}`)
  }

  const data = await res.json()

  return {
    id: data.id,
    displayName: data.displayName ?? null,
    mail: data.mail ?? null,
    userPrincipalName: data.userPrincipalName ?? null
  }
}

export const fetchEntraUsersWithManagers = async (): Promise<EntraUserWithManager[]> => {
  const users = await fetchEntraUsers()
  const results: EntraUserWithManager[] = []

  for (const user of users) {
    try {
      const manager = await fetchEntraUserManager(user.id)

      results.push({
        ...user,
        manager
      })
    } catch (error) {
      console.warn(
        '[entra] Unable to resolve manager for user:',
        user.id,
        error instanceof Error ? error.message : error
      )

      results.push({
        ...user,
        manager: null
      })
    }
  }

  return results
}
