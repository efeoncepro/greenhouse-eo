import 'server-only'

import { query } from '@/lib/db'

// ── Types ──────────────────────────────────────────────────────

export interface TalentReviewItem {
  itemType: 'skill' | 'certification' | 'tool'
  itemId: string
  itemName: string
  memberId: string
  memberDisplayName: string
  memberAvatarUrl: string | null
  verificationStatus: 'self_declared' | 'pending_review' | 'verified' | 'rejected'
  rejectionReason: string | null
  verifiedBy: string | null
  verifiedAt: string | null
  expiryDate: string | null
  isExpired: boolean
  isExpiringSoon: boolean
  createdAt: string | null
}

export interface TalentReviewSummary {
  pendingReview: number
  selfDeclared: number
  expiringSoon: number
  expired: number
  rejected: number
  verified: number
  total: number
}

export interface TalentReviewFilters {
  status?: 'self_declared' | 'pending_review' | 'verified' | 'rejected'
  itemType?: 'skill' | 'certification' | 'tool'
  memberId?: string
  expiryFilter?: 'expiring_soon' | 'expired'
}

// ── Internal row type ──────────────────────────────────────────

type ReviewRow = {
  item_type: string
  item_id: string
  item_name: string
  member_id: string
  member_display_name: string
  member_avatar_url: string | null
  verification_status: string
  rejection_reason: string | null
  verified_by: string | null
  verified_at: string | Date | null
  expiry_date: string | Date | null
  is_expired: boolean
  is_expiring_soon: boolean
  created_at: string | Date | null
}

type SummaryRow = {
  pending_review: string | number
  self_declared: string | number
  expiring_soon: string | number
  expired: string | number
  rejected: string | number
  verified: string | number
  total: string | number
}

// ── Helpers ────────────────────────────────────────────────────

const toTimestamp = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const toDateString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

const toInt = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return parseInt(value, 10) || 0

  return 0
}

const VALID_STATUSES = ['self_declared', 'pending_review', 'verified', 'rejected'] as const

const normalizeStatus = (raw: string): TalentReviewItem['verificationStatus'] =>
  (VALID_STATUSES as readonly string[]).includes(raw) ? raw as TalentReviewItem['verificationStatus'] : 'self_declared'

const mapRow = (row: ReviewRow): TalentReviewItem => ({
  itemType: row.item_type as TalentReviewItem['itemType'],
  itemId: row.item_id,
  itemName: row.item_name,
  memberId: row.member_id,
  memberDisplayName: row.member_display_name,
  memberAvatarUrl: row.member_avatar_url,
  verificationStatus: normalizeStatus(row.verification_status),
  rejectionReason: row.rejection_reason,
  verifiedBy: row.verified_by,
  verifiedAt: toTimestamp(row.verified_at),
  expiryDate: toDateString(row.expiry_date),
  isExpired: Boolean(row.is_expired),
  isExpiringSoon: Boolean(row.is_expiring_soon),
  createdAt: toTimestamp(row.created_at)
})

// ── Base UNION query (shared CTE) ─────────────────────────────

const BASE_CTE = `
  talent_review AS (
    -- Skills
    SELECT
      'skill'::text                  AS item_type,
      ms.skill_code                  AS item_id,
      sc.skill_name                  AS item_name,
      ms.member_id,
      m.display_name                 AS member_display_name,
      m.avatar_url                   AS member_avatar_url,
      ms.verification_status,
      ms.rejection_reason,
      ms.verified_by,
      ms.verified_at,
      NULL::timestamptz              AS expiry_date,
      FALSE                          AS is_expired,
      FALSE                          AS is_expiring_soon,
      ms.created_at
    FROM greenhouse_core.member_skills ms
    INNER JOIN greenhouse_core.skill_catalog sc ON sc.skill_code = ms.skill_code
    INNER JOIN greenhouse_core.members m ON m.member_id = ms.member_id AND m.active = TRUE

    UNION ALL

    -- Certifications: has explicit verification_status + expiry tracking
    SELECT
      'certification'::text          AS item_type,
      c.certification_id             AS item_id,
      c.name                         AS item_name,
      c.member_id,
      m.display_name                 AS member_display_name,
      m.avatar_url                   AS member_avatar_url,
      c.verification_status,
      c.rejection_reason,
      c.verified_by,
      c.verified_at,
      c.expiry_date,
      CASE WHEN c.expiry_date IS NOT NULL AND c.expiry_date < CURRENT_DATE THEN TRUE ELSE FALSE END
                                     AS is_expired,
      CASE WHEN c.expiry_date IS NOT NULL
                AND c.expiry_date >= CURRENT_DATE
                AND c.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
           THEN TRUE ELSE FALSE END
                                     AS is_expiring_soon,
      c.created_at
    FROM greenhouse_core.member_certifications c
    INNER JOIN greenhouse_core.members m ON m.member_id = c.member_id AND m.active = TRUE

    UNION ALL

    -- Tools
    SELECT
      'tool'::text                   AS item_type,
      mt.tool_code                   AS item_id,
      tc.tool_name                   AS item_name,
      mt.member_id,
      m.display_name                 AS member_display_name,
      m.avatar_url                   AS member_avatar_url,
      mt.verification_status,
      mt.rejection_reason,
      mt.verified_by,
      mt.verified_at,
      NULL::timestamptz              AS expiry_date,
      FALSE                          AS is_expired,
      FALSE                          AS is_expiring_soon,
      mt.created_at
    FROM greenhouse_core.member_tools mt
    INNER JOIN greenhouse_core.tool_catalog tc ON tc.tool_code = mt.tool_code
    INNER JOIN greenhouse_core.members m ON m.member_id = mt.member_id AND m.active = TRUE
  )
`

// ── Public API ─────────────────────────────────────────────────

export const getTalentReviewQueue = async (
  filters?: TalentReviewFilters
): Promise<TalentReviewItem[]> => {
  const conditions: string[] = ['TRUE']
  const params: unknown[] = []
  let idx = 1

  if (filters?.status) {
    conditions.push(`tr.verification_status = $${idx++}`)
    params.push(filters.status)
  }

  if (filters?.itemType) {
    conditions.push(`tr.item_type = $${idx++}`)
    params.push(filters.itemType)
  }

  if (filters?.memberId) {
    conditions.push(`tr.member_id = $${idx++}`)
    params.push(filters.memberId)
  }

  if (filters?.expiryFilter === 'expired') {
    conditions.push(`tr.is_expired = TRUE`)
  } else if (filters?.expiryFilter === 'expiring_soon') {
    conditions.push(`tr.is_expiring_soon = TRUE`)
  }

  const rows = await query<ReviewRow>(
    `
      WITH ${BASE_CTE}
      SELECT
        tr.item_type,
        tr.item_id,
        tr.item_name,
        tr.member_id,
        tr.member_display_name,
        tr.member_avatar_url,
        tr.verification_status,
        tr.rejection_reason,
        tr.verified_by,
        tr.verified_at,
        tr.expiry_date,
        tr.is_expired,
        tr.is_expiring_soon,
        tr.created_at
      FROM talent_review tr
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        CASE tr.verification_status
          WHEN 'pending_review' THEN 0
          WHEN 'rejected'       THEN 1
          WHEN 'self_declared'  THEN 2
          WHEN 'verified'       THEN 3
          ELSE 4
        END ASC,
        tr.is_expiring_soon DESC,
        tr.is_expired DESC,
        tr.created_at DESC NULLS LAST
    `,
    params
  )

  return rows.map(mapRow)
}

export const getTalentReviewSummary = async (): Promise<TalentReviewSummary> => {
  const rows = await query<SummaryRow>(
    `
      WITH ${BASE_CTE}
      SELECT
        COUNT(*) FILTER (WHERE tr.verification_status = 'pending_review')  AS pending_review,
        COUNT(*) FILTER (WHERE tr.verification_status = 'self_declared')   AS self_declared,
        COUNT(*) FILTER (WHERE tr.is_expiring_soon = TRUE)                 AS expiring_soon,
        COUNT(*) FILTER (WHERE tr.is_expired = TRUE)                       AS expired,
        COUNT(*) FILTER (WHERE tr.verification_status = 'rejected')        AS rejected,
        COUNT(*) FILTER (WHERE tr.verification_status = 'verified')        AS verified,
        COUNT(*)                                                           AS total
      FROM talent_review tr
    `
  )

  const row = rows[0]

  if (!row) {
    return {
      pendingReview: 0,
      selfDeclared: 0,
      expiringSoon: 0,
      expired: 0,
      rejected: 0,
      verified: 0,
      total: 0
    }
  }

  return {
    pendingReview: toInt(row.pending_review),
    selfDeclared: toInt(row.self_declared),
    expiringSoon: toInt(row.expiring_soon),
    expired: toInt(row.expired),
    rejected: toInt(row.rejected),
    verified: toInt(row.verified),
    total: toInt(row.total)
  }
}
