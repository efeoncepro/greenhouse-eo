import 'server-only'

import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { getCanonicalPersonByUserId } from '@/lib/identity/canonical-person'
import type { HubSpotGreenhouseQuoteSender } from '@/lib/integrations/hubspot-greenhouse-service'

export class HubSpotQuotePublishContractError extends Error {
  readonly code:
    | 'sender_missing'
    | 'sender_name_incomplete'
    | 'sender_email_missing'
    | 'issuing_company_missing'

  constructor(
    code:
      | 'sender_missing'
      | 'sender_name_incomplete'
      | 'sender_email_missing'
      | 'issuing_company_missing',
    message: string
  ) {
    super(message)
    this.name = 'HubSpotQuotePublishContractError'
    this.code = code
  }
}

const splitFullName = (value: string) => {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length < 2) return null

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  }
}

export const resolveHubSpotQuoteSender = async (
  actorUserId: string | null | undefined
): Promise<HubSpotGreenhouseQuoteSender> => {
  if (!actorUserId?.trim()) {
    throw new HubSpotQuotePublishContractError(
      'sender_missing',
      'No pudimos resolver el remitente de la cotización porque no existe actor canónico asociado.'
    )
  }

  const person = await getCanonicalPersonByUserId(actorUserId.trim())

  if (!person) {
    throw new HubSpotQuotePublishContractError(
      'sender_missing',
      'No pudimos resolver el remitente de la cotización desde person_360.'
    )
  }

  const displayName =
    person.displayName?.trim() ||
    person.portalDisplayName?.trim() ||
    null

  const email =
    person.canonicalEmail?.trim() ||
    person.portalEmail?.trim() ||
    person.memberEmail?.trim() ||
    null

  if (!displayName) {
    throw new HubSpotQuotePublishContractError(
      'sender_name_incomplete',
      'No pudimos resolver nombre y apellido del remitente de la cotización.'
    )
  }

  const parsedName = splitFullName(displayName)

  if (!parsedName) {
    throw new HubSpotQuotePublishContractError(
      'sender_name_incomplete',
      `El remitente "${displayName}" no tiene nombre y apellido suficientes para publicar la cotización en HubSpot.`
    )
  }

  if (!email) {
    throw new HubSpotQuotePublishContractError(
      'sender_email_missing',
      `El remitente "${displayName}" no tiene email canónico para publicar la cotización en HubSpot.`
    )
  }

  const operatingEntity = await getOperatingEntityIdentity()

  if (!operatingEntity?.legalName?.trim()) {
    throw new HubSpotQuotePublishContractError(
      'issuing_company_missing',
      'No pudimos resolver la empresa emisora canónica para publicar la cotización en HubSpot.'
    )
  }

  return {
    firstName: parsedName.firstName,
    lastName: parsedName.lastName,
    email,
    companyName: operatingEntity.legalName.trim()
  }
}
