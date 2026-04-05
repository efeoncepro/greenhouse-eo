import 'server-only'

import { query } from '@/lib/db'

import type { ResponsibilityType, ScopeType } from '@/config/responsibility-codes'

// ── Response types ──

export interface ResponsibilityRecord {
  responsibilityId: string
  memberId: string
  memberName: string
  memberEmail: string | null
  scopeType: ScopeType
  scopeId: string
  scopeName: string | null
  responsibilityType: ResponsibilityType
  responsibilityLabel: string
  isPrimary: boolean
  effectiveFrom: string
  effectiveTo: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ScopeOwnership {
  accountLead: { memberId: string; memberName: string } | null
  deliveryLead: { memberId: string; memberName: string } | null
  financeReviewer: { memberId: string; memberName: string } | null
  operationsLead: { memberId: string; memberName: string } | null
}

// ── Raw row type ──

interface ResponsibilityJoinRow extends Record<string, unknown> {
  responsibility_id: string
  member_id: string
  display_name: string | null
  primary_email: string | null
  scope_type: string
  scope_id: string
  responsibility_type: string
  is_primary: boolean
  effective_from: string
  effective_to: string | null
  active: boolean
  created_at: string
  updated_at: string
}

// ── Readers ──

/**
 * List all responsibilities, optionally filtered by scope, member, or type.
 * Uses raw SQL because the table is not yet in Kysely types until migration runs and types are regenerated.
 */
export async function listResponsibilities(filters?: {
  scopeType?: ScopeType
  scopeId?: string
  memberId?: string
  responsibilityType?: ResponsibilityType
  activeOnly?: boolean
}): Promise<ResponsibilityRecord[]> {
  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (filters?.scopeType) {
    conditions.push(`r.scope_type = $${idx++}`)
    params.push(filters.scopeType)
  }

  if (filters?.scopeId) {
    conditions.push(`r.scope_id = $${idx++}`)
    params.push(filters.scopeId)
  }

  if (filters?.memberId) {
    conditions.push(`r.member_id = $${idx++}`)
    params.push(filters.memberId)
  }

  if (filters?.responsibilityType) {
    conditions.push(`r.responsibility_type = $${idx++}`)
    params.push(filters.responsibilityType)
  }

  if (filters?.activeOnly !== false) {
    conditions.push(`r.active = TRUE`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await query<ResponsibilityJoinRow>(
    `SELECT
       r.responsibility_id,
       r.member_id,
       m.display_name,
       m.primary_email,
       r.scope_type,
       r.scope_id,
       r.responsibility_type,
       r.is_primary,
       r.effective_from::text,
       r.effective_to::text,
       r.active,
       r.created_at::text,
       r.updated_at::text
     FROM greenhouse_core.operational_responsibilities r
     INNER JOIN greenhouse_core.members m ON m.member_id = r.member_id
     ${where}
     ORDER BY r.created_at DESC`,
    params
  )

  return rows.map((r) => ({
    responsibilityId: r.responsibility_id,
    memberId: r.member_id,
    memberName: String(r.display_name ?? ''),
    memberEmail: r.primary_email ? String(r.primary_email) : null,
    scopeType: r.scope_type as ScopeType,
    scopeId: r.scope_id,
    scopeName: null,
    responsibilityType: r.responsibility_type as ResponsibilityType,
    responsibilityLabel: r.responsibility_type,
    isPrimary: Boolean(r.is_primary),
    effectiveFrom: String(r.effective_from),
    effectiveTo: r.effective_to ? String(r.effective_to) : null,
    active: Boolean(r.active),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }))
}

/**
 * Get primary ownership roles for a given scope (space, organization, etc.).
 * Used by Agency Space 360, Organization detail, and other consumers.
 */
export async function getScopeOwnership(scopeType: ScopeType, scopeId: string): Promise<ScopeOwnership> {
  const rows = await query<Record<string, unknown> & { responsibility_type: string; member_id: string; display_name: string | null }>(
    `SELECT r.responsibility_type, r.member_id, m.display_name
     FROM greenhouse_core.operational_responsibilities r
     INNER JOIN greenhouse_core.members m ON m.member_id = r.member_id
     WHERE r.scope_type = $1 AND r.scope_id = $2
       AND r.is_primary = TRUE AND r.active = TRUE`,
    [scopeType, scopeId]
  )

  const byType = new Map(
    rows.map((r) => [r.responsibility_type, { memberId: r.member_id, memberName: String(r.display_name ?? '') }])
  )

  return {
    accountLead: byType.get('account_lead') ?? null,
    deliveryLead: byType.get('delivery_lead') ?? null,
    financeReviewer: byType.get('finance_reviewer') ?? null,
    operationsLead: byType.get('operations_lead') ?? null
  }
}

/**
 * Get all responsibilities for a specific member.
 */
export async function getMemberResponsibilities(memberId: string): Promise<ResponsibilityRecord[]> {
  return listResponsibilities({ memberId, activeOnly: true })
}

/**
 * Get all responsibilities for a space (used by Agency Space 360).
 */
export async function getSpaceResponsibilities(spaceId: string): Promise<ResponsibilityRecord[]> {
  return listResponsibilities({ scopeType: 'space', scopeId: spaceId, activeOnly: true })
}
