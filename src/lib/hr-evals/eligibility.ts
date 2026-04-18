import 'server-only'

import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// ── Types ──

export interface EvalAccessResult {
  eligible: boolean
  canParticipate: boolean
  canView: boolean
  memberId: string
  reason?: string
}

// ── Helpers ──

const MS_PER_DAY = 86_400_000

const daysSince = (date: string | null): number => {
  if (!date) return 0

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) return 0

  const now = new Date()
  const diffMs = now.getTime() - parsed.getTime()

  return Math.floor(diffMs / MS_PER_DAY)
}

type MemberRow = {
  member_id: string
  contract_type: string | null
  hire_date: string | Date | null
}

const toDateString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return typeof value === 'string' ? value.slice(0, 10) : null
}

// ── Core eligibility logic (pure, testable) ──

export function resolveEvalAccessForMember(member: {
  contractType: string
  hireDate: string | null
}): { canParticipate: boolean; canView: boolean; reason?: string } {
  const contractType = member.contractType?.toLowerCase() ?? ''

  // honorarios: no access
  if (contractType === 'honorarios') {
    return {
      canParticipate: false,
      canView: false,
      reason: 'Honorarios contracts do not have access to performance evaluations.'
    }
  }

  // contractor or eor: access only if tenure > 6 months (180 days)
  if (contractType === 'contractor' || contractType === 'eor') {
    const days = daysSince(member.hireDate)

    return {
      canParticipate: days >= 180,
      canView: days >= 180,
      reason: days < 180
        ? `${contractType === 'eor' ? 'EOR' : 'Contractor'} contracts can access evaluations after 180 days. Current tenure: ${days} days.`
        : undefined
    }
  }

  // indefinido, plazo_fijo, and any other contract type: full access
  return {
    canParticipate: true,
    canView: true
  }
}

// ── Async resolver for API routes (looks up member from DB) ──

/**
 * Resolve eval access for the current tenant session.
 * Looks up the member's contract_type and hire_date from PostgreSQL,
 * then applies eligibility rules.
 */
export async function resolveEvalAccess(tenant: TenantContext): Promise<EvalAccessResult> {
  const memberId = tenant.memberId

  if (!memberId) {
    return {
      eligible: false,
      canParticipate: false,
      canView: false,
      memberId: '',
      reason: 'No member linked to current session.'
    }
  }

  const rows = await runGreenhousePostgresQuery<MemberRow>(
    `
      SELECT
        member_id,
        contract_type,
        hire_date
      FROM greenhouse_core.members
      WHERE member_id = $1
      LIMIT 1
    `,
    [memberId]
  )

  if (rows.length === 0) {
    return {
      eligible: false,
      canParticipate: false,
      canView: false,
      memberId,
      reason: 'Member record not found.'
    }
  }

  const row = rows[0]

  const access = resolveEvalAccessForMember({
    contractType: row.contract_type || 'indefinido',
    hireDate: toDateString(row.hire_date)
  })

  return {
    eligible: access.canView,
    canParticipate: access.canParticipate,
    canView: access.canView,
    memberId,
    reason: access.reason
  }
}
