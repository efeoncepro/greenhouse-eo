export const MAX_TENANT_CONTACT_PROVISIONING_BATCH_SIZE = 4

export type TenantContactProvisioningOutcome = 'created' | 'reconciled' | 'conflict' | 'invalid' | 'error'

export type TenantContactProvisioningResult = {
  hubspotContactId: string
  email: string | null
  displayName: string
  outcome: TenantContactProvisioningOutcome
  reason: string
  userId: string | null
}

export type TenantContactsProvisioningSummary = {
  clientId: string
  clientName: string
  hubspotCompanyId: string
  requested: number
  created: number
  reconciled: number
  conflicts: number
  invalid: number
  errors: number
  results: TenantContactProvisioningResult[]
}

export const normalizeTenantContactIds = (contactIds: string[]) =>
  Array.from(
    new Set(
      contactIds
        .map(contactId => contactId.trim())
        .filter(Boolean)
    )
  )

export const chunkTenantContactIds = (
  contactIds: string[],
  chunkSize = MAX_TENANT_CONTACT_PROVISIONING_BATCH_SIZE
) => {
  const normalizedContactIds = normalizeTenantContactIds(contactIds)
  const safeChunkSize = Math.max(1, Math.floor(chunkSize))
  const chunks: string[][] = []

  for (let index = 0; index < normalizedContactIds.length; index += safeChunkSize) {
    chunks.push(normalizedContactIds.slice(index, index + safeChunkSize))
  }

  return chunks
}

export const mergeTenantContactsProvisioningSummaries = (
  summaries: TenantContactsProvisioningSummary[]
): TenantContactsProvisioningSummary | null => {
  if (summaries.length === 0) {
    return null
  }

  const [firstSummary] = summaries

  return {
    clientId: firstSummary.clientId,
    clientName: firstSummary.clientName,
    hubspotCompanyId: firstSummary.hubspotCompanyId,
    requested: summaries.reduce((total, summary) => total + summary.requested, 0),
    created: summaries.reduce((total, summary) => total + summary.created, 0),
    reconciled: summaries.reduce((total, summary) => total + summary.reconciled, 0),
    conflicts: summaries.reduce((total, summary) => total + summary.conflicts, 0),
    invalid: summaries.reduce((total, summary) => total + summary.invalid, 0),
    errors: summaries.reduce((total, summary) => total + summary.errors, 0),
    results: summaries.flatMap(summary => summary.results)
  }
}
