import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import type { HubSpotGreenhouseContactProfile } from '@/lib/integrations/hubspot-greenhouse-service'

const SNAPSHOT_VERSION = 1
const SNAPSHOT_MAX_AGE_MS = 15 * 60 * 1000

type TenantContactProvisioningSnapshotPayload = {
  version: number
  clientId: string
  hubspotCompanyId: string
  fetchedAt: string
  contacts: HubSpotGreenhouseContactProfile[]
}

const getSnapshotSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET?.trim()

  if (!secret) {
    return null
  }

  return secret
}

const toBase64Url = (value: string) => Buffer.from(value, 'utf8').toString('base64url')

const fromBase64Url = (value: string) => Buffer.from(value, 'base64url').toString('utf8')

const signPayload = (encodedPayload: string, secret: string) =>
  createHmac('sha256', secret).update(encodedPayload).digest('base64url')

const normalizeContacts = (contacts: HubSpotGreenhouseContactProfile[]): HubSpotGreenhouseContactProfile[] =>
  contacts.map(contact => ({
    hubspotContactId: contact.hubspotContactId,
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
    displayName: contact.displayName,
    phone: null,
    mobilePhone: null,
    jobTitle: contact.jobTitle,
    lifecyclestage: contact.lifecyclestage,
    hsLeadStatus: contact.hsLeadStatus,
    company: contact.company
  }))

export const buildTenantContactProvisioningSnapshotToken = ({
  clientId,
  hubspotCompanyId,
  fetchedAt,
  contacts
}: {
  clientId: string
  hubspotCompanyId: string | null
  fetchedAt: string | null
  contacts: HubSpotGreenhouseContactProfile[]
}) => {
  const secret = getSnapshotSecret()

  if (!secret || !hubspotCompanyId || !fetchedAt || contacts.length === 0) {
    return null
  }

  const payload: TenantContactProvisioningSnapshotPayload = {
    version: SNAPSHOT_VERSION,
    clientId,
    hubspotCompanyId,
    fetchedAt,
    contacts: normalizeContacts(contacts)
  }

  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = signPayload(encodedPayload, secret)

  return `${encodedPayload}.${signature}`
}

export const verifyTenantContactProvisioningSnapshotToken = ({
  token,
  clientId,
  hubspotCompanyId
}: {
  token: string
  clientId: string
  hubspotCompanyId: string | null
}): HubSpotGreenhouseContactProfile[] | null => {
  const secret = getSnapshotSecret()

  if (!secret || !hubspotCompanyId) {
    return null
  }

  const [encodedPayload, providedSignature] = token.split('.')

  if (!encodedPayload || !providedSignature) {
    return null
  }

  const expectedSignature = signPayload(encodedPayload, secret)

  if (expectedSignature.length !== providedSignature.length) {
    return null
  }

  const left = Buffer.from(providedSignature, 'utf8')
  const right = Buffer.from(expectedSignature, 'utf8')

  if (!timingSafeEqual(left, right)) {
    return null
  }

  let payload: TenantContactProvisioningSnapshotPayload

  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as TenantContactProvisioningSnapshotPayload
  } catch {
    return null
  }

  if (
    payload.version !== SNAPSHOT_VERSION ||
    payload.clientId !== clientId ||
    payload.hubspotCompanyId !== hubspotCompanyId ||
    !Array.isArray(payload.contacts)
  ) {
    return null
  }

  const fetchedAtMs = Date.parse(payload.fetchedAt)

  if (!Number.isFinite(fetchedAtMs) || Date.now() - fetchedAtMs > SNAPSHOT_MAX_AGE_MS) {
    return null
  }

  return normalizeContacts(payload.contacts)
}
