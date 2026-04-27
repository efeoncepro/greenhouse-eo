import 'server-only'

import { ROLE_CODES } from '@/config/role-codes'
import { query } from '@/lib/db'
import { FinanceValidationError } from '@/lib/finance/shared'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

export type PaymentInstrumentResponsibleCandidate = {
  userId: string
  label: string
  email: string | null
  avatarUrl: string | null
  memberId: string | null
  identityProfileId: string | null
  roleCodes: string[]
  isCurrentUser: boolean
  isFinanceRole: boolean
}

type ResponsibleCandidateRow = {
  user_id: string
  email: string | null
  microsoft_email: string | null
  full_name: string | null
  avatar_url: string | null
  member_id: string | null
  identity_profile_id: string | null
  member_display_name: string | null
  identity_full_name: string | null
  job_title: string | null
  active_role_codes: string[] | null
}

const RESPONSIBLE_ROLE_CODES = [
  ROLE_CODES.EFEONCE_ADMIN,
  ROLE_CODES.FINANCE_ADMIN,
  ROLE_CODES.FINANCE_ANALYST
] as const

const FINANCE_ROLE_CODES = [
  ROLE_CODES.FINANCE_ADMIN,
  ROLE_CODES.FINANCE_ANALYST
] as const

const rolePriority = new Map<string, number>(
  RESPONSIBLE_ROLE_CODES.map((roleCode, index) => [roleCode, index])
)

const normalizeRoles = (value: string[] | null | undefined) =>
  Array.isArray(value) ? value.filter(Boolean) : []

const hasAnyRole = (roleCodes: readonly string[], candidates: readonly string[]) =>
  roleCodes.some(roleCode => candidates.includes(roleCode))

const toCandidate = (row: ResponsibleCandidateRow, currentUserId: string | null): PaymentInstrumentResponsibleCandidate => {
  const roleCodes = normalizeRoles(row.active_role_codes)
  const label = row.member_display_name || row.identity_full_name || row.full_name || row.email || row.microsoft_email || row.user_id

  return {
    userId: row.user_id,
    label,
    email: row.email || row.microsoft_email || null,
    avatarUrl: row.avatar_url,
    memberId: row.member_id,
    identityProfileId: row.identity_profile_id,
    roleCodes,
    isCurrentUser: Boolean(currentUserId && row.user_id === currentUserId),
    isFinanceRole: hasAnyRole(roleCodes, FINANCE_ROLE_CODES)
  }
}

const sortCandidates = (
  a: PaymentInstrumentResponsibleCandidate,
  b: PaymentInstrumentResponsibleCandidate
) => {
  if (a.isCurrentUser !== b.isCurrentUser) return a.isCurrentUser ? -1 : 1

  const aPriority = Math.min(...a.roleCodes.map(role => rolePriority.get(role) ?? 99))
  const bPriority = Math.min(...b.roleCodes.map(role => rolePriority.get(role) ?? 99))

  if (aPriority !== bPriority) return aPriority - bPriority

  return a.label.localeCompare(b.label, 'es')
}

export const getPaymentInstrumentResponsibleCandidates = async (
  tenant: TenantContext
): Promise<PaymentInstrumentResponsibleCandidate[]> => {
  const currentUserHasResponsibleRole = hasAnyRole(tenant.roleCodes, RESPONSIBLE_ROLE_CODES)

  const rows = await query<ResponsibleCandidateRow>(
    `
      SELECT
        cu.user_id,
        cu.email,
        cu.microsoft_email,
        cu.full_name,
        cu.avatar_url,
        cu.member_id,
        cu.identity_profile_id,
        m.display_name AS member_display_name,
        ip.full_name AS identity_full_name,
        COALESCE(m.headline, ip.job_title) AS job_title,
        COALESCE(
          ARRAY_AGG(DISTINCT ura.role_code) FILTER (
            WHERE ura.role_code IS NOT NULL
              AND ura.active = TRUE
              AND ura.status = 'active'
              AND (ura.effective_from IS NULL OR ura.effective_from <= CURRENT_TIMESTAMP)
              AND (ura.effective_to IS NULL OR ura.effective_to >= CURRENT_TIMESTAMP)
          ),
          ARRAY[]::text[]
        ) AS active_role_codes
      FROM greenhouse_core.client_users cu
      LEFT JOIN greenhouse_core.user_role_assignments ura
        ON ura.user_id = cu.user_id
      LEFT JOIN greenhouse_core.members m
        ON m.member_id = cu.member_id
      LEFT JOIN greenhouse_core.identity_profiles ip
        ON ip.profile_id = cu.identity_profile_id
      WHERE cu.active = TRUE
        AND cu.status IN ('active', 'invited')
        AND cu.tenant_type = 'efeonce_internal'
      GROUP BY
        cu.user_id,
        cu.email,
        cu.microsoft_email,
        cu.full_name,
        cu.avatar_url,
        cu.member_id,
        cu.identity_profile_id,
        m.display_name,
        ip.full_name,
        m.headline,
        ip.job_title
      HAVING
        COALESCE(
          ARRAY_AGG(DISTINCT ura.role_code) FILTER (
            WHERE ura.role_code IS NOT NULL
              AND ura.active = TRUE
              AND ura.status = 'active'
              AND (ura.effective_from IS NULL OR ura.effective_from <= CURRENT_TIMESTAMP)
              AND (ura.effective_to IS NULL OR ura.effective_to >= CURRENT_TIMESTAMP)
          ),
          ARRAY[]::text[]
        ) && $1::text[]
        OR ($2::boolean = TRUE AND cu.user_id = $3)
      ORDER BY cu.full_name ASC NULLS LAST, cu.email ASC NULLS LAST, cu.user_id ASC
    `,
    [RESPONSIBLE_ROLE_CODES, currentUserHasResponsibleRole, tenant.userId]
  )

  return rows
    .map(row => toCandidate(row, tenant.userId))
    .sort(sortCandidates)
}

export const assertPaymentInstrumentResponsibleAssignable = async ({
  tenant,
  responsibleUserId,
  currentResponsibleUserId = null
}: {
  tenant: TenantContext
  responsibleUserId: string | null | undefined
  currentResponsibleUserId?: string | null
}) => {
  if (!responsibleUserId) return

  if (currentResponsibleUserId && responsibleUserId === currentResponsibleUserId) return

  const candidates = await getPaymentInstrumentResponsibleCandidates(tenant)
  const isAssignable = candidates.some(candidate => candidate.userId === responsibleUserId)

  if (!isAssignable) {
    throw new FinanceValidationError(
      'El responsable debe ser un usuario interno activo con rol de Finanzas o Superadministrador.',
      422,
      { responsibleUserId },
      'PAYMENT_INSTRUMENT_RESPONSIBLE_NOT_ASSIGNABLE'
    )
  }
}
