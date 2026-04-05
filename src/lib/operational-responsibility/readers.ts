import 'server-only'

import { getDb } from '@/lib/db'

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

// ── Readers ──

/**
 * List all responsibilities, optionally filtered by scope, member, or type.
 */
export async function listResponsibilities(filters?: {
  scopeType?: ScopeType
  scopeId?: string
  memberId?: string
  responsibilityType?: ResponsibilityType
  activeOnly?: boolean
}): Promise<ResponsibilityRecord[]> {
  const db = await getDb()

  let q = db
    .selectFrom('greenhouse_core.operational_responsibilities as r')
    .innerJoin('greenhouse_core.members as m', 'm.member_id', 'r.member_id')
    .select([
      'r.responsibility_id',
      'r.member_id',
      'm.display_name',
      'm.primary_email',
      'r.scope_type',
      'r.scope_id',
      'r.responsibility_type',
      'r.is_primary',
      'r.effective_from',
      'r.effective_to',
      'r.active',
      'r.created_at',
      'r.updated_at'
    ])
    .orderBy('r.created_at', 'desc')

  if (filters?.scopeType) {
    q = q.where('r.scope_type', '=', filters.scopeType)
  }

  if (filters?.scopeId) {
    q = q.where('r.scope_id', '=', filters.scopeId)
  }

  if (filters?.memberId) {
    q = q.where('r.member_id', '=', filters.memberId)
  }

  if (filters?.responsibilityType) {
    q = q.where('r.responsibility_type', '=', filters.responsibilityType)
  }

  if (filters?.activeOnly !== false) {
    q = q.where('r.active', '=', true)
  }

  const rows = await q.execute()

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
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_core.operational_responsibilities as r')
    .innerJoin('greenhouse_core.members as m', 'm.member_id', 'r.member_id')
    .select(['r.responsibility_type', 'r.member_id', 'm.display_name'])
    .where('r.scope_type', '=', scopeType)
    .where('r.scope_id', '=', scopeId)
    .where('r.is_primary', '=', true)
    .where('r.active', '=', true)
    .execute()

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
