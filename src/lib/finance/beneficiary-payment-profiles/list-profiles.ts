import 'server-only'

import { query } from '@/lib/db'
import type {
  BeneficiaryPaymentProfileBeneficiaryType,
  BeneficiaryPaymentProfileCurrency,
  BeneficiaryPaymentProfileSafe,
  BeneficiaryPaymentProfileStatus
} from '@/types/payment-profiles'

import { mapAuditRow, mapProfileRowSafe, type ProfileAuditRow, type ProfileRow } from './row-mapper'

export interface ListPaymentProfilesFilters {
  spaceId?: string
  beneficiaryType?: BeneficiaryPaymentProfileBeneficiaryType
  beneficiaryId?: string
  currency?: BeneficiaryPaymentProfileCurrency
  status?: BeneficiaryPaymentProfileStatus | 'all'
  providerSlug?: string
  search?: string
  limit?: number
  offset?: number
}

export async function listPaymentProfiles(
  filters: ListPaymentProfilesFilters = {}
): Promise<{ items: BeneficiaryPaymentProfileSafe[]; total: number }> {
  const conditions: string[] = ['TRUE']
  const params: unknown[] = []
  let i = 1

  if (filters.spaceId) {
    conditions.push(`space_id = $${i++}`)
    params.push(filters.spaceId)
  }

  if (filters.beneficiaryType) {
    conditions.push(`beneficiary_type = $${i++}`)
    params.push(filters.beneficiaryType)
  }

  if (filters.beneficiaryId) {
    conditions.push(`beneficiary_id = $${i++}`)
    params.push(filters.beneficiaryId)
  }

  if (filters.currency) {
    conditions.push(`currency = $${i++}`)
    params.push(filters.currency)
  }

  if (filters.status && filters.status !== 'all') {
    conditions.push(`status = $${i++}`)
    params.push(filters.status)
  }

  if (filters.providerSlug) {
    conditions.push(`provider_slug = $${i++}`)
    params.push(filters.providerSlug)
  }

  if (filters.search) {
    conditions.push(
      `(beneficiary_name ILIKE $${i} OR beneficiary_id ILIKE $${i} OR account_holder_name ILIKE $${i})`
    )
    params.push(`%${filters.search}%`)
    i += 1
  }

  const whereClause = conditions.join(' AND ')

  const countRows = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM greenhouse_finance.beneficiary_payment_profiles WHERE ${whereClause}`,
    params
  )

  const total = Number(countRows[0]?.total ?? 0)

  const limit = Math.min(500, Math.max(1, filters.limit ?? 100))
  const offset = Math.max(0, filters.offset ?? 0)

  const rows = await query<ProfileRow>(
    `SELECT * FROM greenhouse_finance.beneficiary_payment_profiles
      WHERE ${whereClause}
      ORDER BY status = 'active' DESC, created_at DESC
      LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  )

  return {
    items: rows.map(mapProfileRowSafe),
    total
  }
}

export async function getPaymentProfileById(
  profileId: string
): Promise<BeneficiaryPaymentProfileSafe | null> {
  const rows = await query<ProfileRow>(
    `SELECT * FROM greenhouse_finance.beneficiary_payment_profiles WHERE profile_id = $1 LIMIT 1`,
    [profileId]
  )

  return rows[0] ? mapProfileRowSafe(rows[0]) : null
}

export async function getActivePaymentProfile(input: {
  spaceId?: string | null
  beneficiaryType: BeneficiaryPaymentProfileBeneficiaryType
  beneficiaryId: string
  currency: BeneficiaryPaymentProfileCurrency
}): Promise<BeneficiaryPaymentProfileSafe | null> {
  const rows = await query<ProfileRow>(
    `SELECT * FROM greenhouse_finance.beneficiary_payment_profiles
      WHERE COALESCE(space_id, '__no_space__') = COALESCE($1::text, '__no_space__')
        AND beneficiary_type = $2
        AND beneficiary_id = $3
        AND currency = $4
        AND status = 'active'
      LIMIT 1`,
    [input.spaceId ?? null, input.beneficiaryType, input.beneficiaryId, input.currency]
  )

  return rows[0] ? mapProfileRowSafe(rows[0]) : null
}

export async function listProfileAuditEntries(profileId: string, limit = 100) {
  const rows = await query<ProfileAuditRow>(
    `SELECT * FROM greenhouse_finance.beneficiary_payment_profile_audit_log
      WHERE profile_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [profileId, Math.min(500, Math.max(1, limit))]
  )

  return rows.map(mapAuditRow)
}
