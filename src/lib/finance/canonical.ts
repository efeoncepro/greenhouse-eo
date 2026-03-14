import 'server-only'

import {
  FinanceValidationError,
  getFinanceProjectId,
  normalizeString,
  runFinanceQuery
} from '@/lib/finance/shared'

type ClientRow = {
  client_id: string
  client_name: string
  hubspot_company_id: string | null
}

type ClientProfileRow = {
  client_profile_id: string
  client_id: string | null
  hubspot_company_id: string | null
  legal_name: string | null
}

type PayrollEntryRow = {
  entry_id: string
  period_id: string
  member_id: string
}

type MemberRow = {
  member_id: string
  display_name: string
}

export type ResolvedFinanceClientContext = {
  clientId: string | null
  clientProfileId: string | null
  hubspotCompanyId: string | null
  clientName: string | null
  legalName: string | null
}

export type ResolvedFinanceMemberContext = {
  memberId: string | null
  memberName: string | null
  payrollEntryId: string | null
  payrollPeriodId: string | null
}

const preferClientRow = ({
  clientRows,
  normalizedClientId,
  normalizedHubspotCompanyId
}: {
  clientRows: ClientRow[]
  normalizedClientId: string
  normalizedHubspotCompanyId: string
}) => {
  if (normalizedClientId) {
    const exactClient = clientRows.find(row => normalizeString(row.client_id) === normalizedClientId)

    if (exactClient) {
      return exactClient
    }
  }

  if (normalizedHubspotCompanyId) {
    const exactHubspot = clientRows.find(row => normalizeString(row.hubspot_company_id) === normalizedHubspotCompanyId)

    if (exactHubspot) {
      return exactHubspot
    }
  }

  return clientRows[0] ?? null
}

const preferClientProfileRow = ({
  profileRows,
  normalizedClientProfileId,
  normalizedClientId,
  normalizedHubspotCompanyId
}: {
  profileRows: ClientProfileRow[]
  normalizedClientProfileId: string
  normalizedClientId: string
  normalizedHubspotCompanyId: string
}) => {
  if (normalizedClientProfileId) {
    const exactProfile = profileRows.find(row => normalizeString(row.client_profile_id) === normalizedClientProfileId)

    if (exactProfile) {
      return exactProfile
    }
  }

  if (normalizedClientId) {
    const exactClientProfile = profileRows.find(row => normalizeString(row.client_id) === normalizedClientId)

    if (exactClientProfile) {
      return exactClientProfile
    }

    const legacyProfile = profileRows.find(row => normalizeString(row.client_profile_id) === normalizedClientId)

    if (legacyProfile) {
      return legacyProfile
    }
  }

  if (normalizedHubspotCompanyId) {
    const exactHubspotProfile = profileRows.find(row => normalizeString(row.hubspot_company_id) === normalizedHubspotCompanyId)

    if (exactHubspotProfile) {
      return exactHubspotProfile
    }
  }

  return profileRows[0] ?? null
}

export const resolveFinanceClientContext = async ({
  clientId,
  clientProfileId,
  hubspotCompanyId
}: {
  clientId?: unknown
  clientProfileId?: unknown
  hubspotCompanyId?: unknown
}): Promise<ResolvedFinanceClientContext> => {
  const normalizedClientId = normalizeString(clientId)
  const normalizedClientProfileId = normalizeString(clientProfileId)
  const normalizedHubspotCompanyId = normalizeString(hubspotCompanyId)

  if (!normalizedClientId && !normalizedClientProfileId && !normalizedHubspotCompanyId) {
    return {
      clientId: null,
      clientProfileId: null,
      hubspotCompanyId: null,
      clientName: null,
      legalName: null
    }
  }

  const projectId = getFinanceProjectId()

  const clientRows = await runFinanceQuery<ClientRow>(`
    SELECT client_id, client_name, CAST(hubspot_company_id AS STRING) AS hubspot_company_id
    FROM \`${projectId}.greenhouse.clients\`
    WHERE active = TRUE
      AND (
        (@clientId != '' AND client_id = @clientId)
        OR (@hubspotCompanyId != '' AND CAST(hubspot_company_id AS STRING) = @hubspotCompanyId)
      )
  `, {
    clientId: normalizedClientId,
    hubspotCompanyId: normalizedHubspotCompanyId
  })

  const profileRows = await runFinanceQuery<ClientProfileRow>(`
    SELECT client_profile_id, client_id, hubspot_company_id, legal_name
    FROM \`${projectId}.greenhouse.fin_client_profiles\`
    WHERE (
      (@clientProfileId != '' AND client_profile_id = @clientProfileId)
      OR (@clientId != '' AND (client_id = @clientId OR client_profile_id = @clientId))
      OR (@hubspotCompanyId != '' AND hubspot_company_id = @hubspotCompanyId)
    )
  `, {
    clientProfileId: normalizedClientProfileId,
    clientId: normalizedClientId,
    hubspotCompanyId: normalizedHubspotCompanyId
  })

  const preferredClient = preferClientRow({
    clientRows,
    normalizedClientId,
    normalizedHubspotCompanyId
  })

  const preferredProfile = preferClientProfileRow({
    profileRows,
    normalizedClientProfileId,
    normalizedClientId,
    normalizedHubspotCompanyId
  })

  if (
    normalizedClientId
    && !clientRows.some(row => normalizeString(row.client_id) === normalizedClientId)
    && !profileRows.some(row =>
      normalizeString(row.client_id) === normalizedClientId
      || normalizeString(row.client_profile_id) === normalizedClientId
    )
  ) {
    throw new FinanceValidationError('clientId does not exist in the finance client context.', 409)
  }

  if (
    normalizedClientProfileId
    && !profileRows.some(row => normalizeString(row.client_profile_id) === normalizedClientProfileId)
  ) {
    throw new FinanceValidationError('clientProfileId does not exist in the finance client context.', 409)
  }

  if (
    normalizedHubspotCompanyId
    && !clientRows.some(row => normalizeString(row.hubspot_company_id) === normalizedHubspotCompanyId)
    && !profileRows.some(row => normalizeString(row.hubspot_company_id) === normalizedHubspotCompanyId)
  ) {
    throw new FinanceValidationError('hubspotCompanyId does not exist in the finance client context.', 409)
  }

  const canonicalClientId = normalizedClientId
    || normalizeString(preferredProfile?.client_id)
    || normalizeString(preferredClient?.client_id)
    || ''

  const canonicalHubspotCompanyId = normalizedHubspotCompanyId
    || normalizeString(preferredProfile?.hubspot_company_id)
    || normalizeString(preferredClient?.hubspot_company_id)
    || ''

  if (normalizedClientId && preferredClient && normalizeString(preferredClient.client_id) !== normalizedClientId) {
    throw new FinanceValidationError('clientId does not match the resolved finance client context.', 409)
  }

  if (
    normalizedHubspotCompanyId &&
    preferredClient &&
    normalizeString(preferredClient.hubspot_company_id) &&
    normalizeString(preferredClient.hubspot_company_id) !== normalizedHubspotCompanyId
  ) {
    throw new FinanceValidationError('hubspotCompanyId does not match the resolved finance client context.', 409)
  }

  if (
    preferredProfile &&
    canonicalClientId &&
    normalizeString(preferredProfile.client_id) &&
    normalizeString(preferredProfile.client_id) !== canonicalClientId
  ) {
    throw new FinanceValidationError('clientProfileId points to a different client than clientId.', 409)
  }

  if (
    preferredProfile &&
    canonicalHubspotCompanyId &&
    normalizeString(preferredProfile.hubspot_company_id) &&
    normalizeString(preferredProfile.hubspot_company_id) !== canonicalHubspotCompanyId
  ) {
    throw new FinanceValidationError('clientProfileId points to a different HubSpot company than hubspotCompanyId.', 409)
  }

  return {
    clientId: canonicalClientId || null,
    clientProfileId: normalizeString(preferredProfile?.client_profile_id) || null,
    hubspotCompanyId: canonicalHubspotCompanyId || null,
    clientName: normalizeString(preferredClient?.client_name) || null,
    legalName: normalizeString(preferredProfile?.legal_name) || null
  }
}

export const resolveFinanceMemberContext = async ({
  memberId,
  payrollEntryId
}: {
  memberId?: unknown
  payrollEntryId?: unknown
}): Promise<ResolvedFinanceMemberContext> => {
  const normalizedMemberId = normalizeString(memberId)
  const normalizedPayrollEntryId = normalizeString(payrollEntryId)

  if (!normalizedMemberId && !normalizedPayrollEntryId) {
    return {
      memberId: null,
      memberName: null,
      payrollEntryId: null,
      payrollPeriodId: null
    }
  }

  const projectId = getFinanceProjectId()

  const payrollRows = normalizedPayrollEntryId
    ? await runFinanceQuery<PayrollEntryRow>(`
      SELECT entry_id, period_id, member_id
      FROM \`${projectId}.greenhouse.payroll_entries\`
      WHERE entry_id = @payrollEntryId
      LIMIT 1
    `, { payrollEntryId: normalizedPayrollEntryId })
    : []

  const payrollRow = payrollRows[0] ?? null

  if (normalizedPayrollEntryId && !payrollRow) {
    throw new FinanceValidationError('payrollEntryId does not exist.', 409)
  }

  if (normalizedMemberId && payrollRow && normalizeString(payrollRow.member_id) !== normalizedMemberId) {
    throw new FinanceValidationError('memberId does not match payrollEntryId.', 409)
  }

  const resolvedMemberId = normalizedMemberId || normalizeString(payrollRow?.member_id)

  const memberRows = resolvedMemberId
    ? await runFinanceQuery<MemberRow>(`
      SELECT member_id, display_name
      FROM \`${projectId}.greenhouse.team_members\`
      WHERE member_id = @memberId
      LIMIT 1
    `, { memberId: resolvedMemberId })
    : []

  const memberRow = memberRows[0] ?? null

  if (resolvedMemberId && !memberRow) {
    throw new FinanceValidationError('memberId does not exist.', 409)
  }

  return {
    memberId: resolvedMemberId || null,
    memberName: normalizeString(memberRow?.display_name) || null,
    payrollEntryId: normalizeString(payrollRow?.entry_id) || normalizedPayrollEntryId || null,
    payrollPeriodId: normalizeString(payrollRow?.period_id) || null
  }
}
