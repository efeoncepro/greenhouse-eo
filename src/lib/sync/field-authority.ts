import 'server-only'

export const PARTY_HUBSPOT_FIELDS = [
  'lifecyclestage',
  'gh_commercial_party_id',
  'gh_last_quote_at',
  'gh_last_contract_at',
  'gh_active_contracts_count',
  'gh_mrr_tier',
  'gh_last_write_at'
] as const

export type PartyHubSpotField = (typeof PARTY_HUBSPOT_FIELDS)[number]
export type FieldAuthorityOwner = 'greenhouse' | 'hubspot'

export interface PartyFieldAuthorityContext {
  hasActiveQuoteOrContract: boolean
}

export const resolvePartyFieldAuthority = (
  field: PartyHubSpotField,
  context: PartyFieldAuthorityContext
): FieldAuthorityOwner => {
  if (field === 'lifecyclestage') {
    return context.hasActiveQuoteOrContract ? 'greenhouse' : 'hubspot'
  }

  return 'greenhouse'
}
