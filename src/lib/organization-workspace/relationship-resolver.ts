import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-611 — Subject ↔ Organization relationship resolver.
 *
 * Spec: docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md §4.3
 * (recalibrado V1.1 Delta 2026-05-08).
 *
 * 5 categorías canónicas (la 5a es la rama base):
 *   - internal_admin       : subject tiene rol efeonce_admin (acceso transversal).
 *   - assigned_member      : subject está asignado al cliente que pertenece a esta organización.
 *   - client_portal_user   : subject pertenece al portal del cliente que mapea a esta organización.
 *   - unrelated_internal   : subject es interno pero no asignado ni admin.
 *   - no_relation          : subject no tiene relación con esta organización.
 *
 * Cross-tenant isolation: enforced en SQL — un subject `client` solo puede resolver
 * `client_portal_user` o `no_relation`; un subject internal nunca aparece como
 * `client_portal_user`. La lectura está acotada por joins a `greenhouse_core.spaces`
 * que tiene tanto `client_id` como `organization_id` (bridge canónico).
 *
 * Pattern source: TASK-700 single-roundtrip CTE; TASK-742 captureWithDomain identity.
 */

export type SubjectTenantType = 'client' | 'efeonce_internal' | string

export type ResolveSubjectOrganizationRelationInput = {
  subjectUserId: string
  subjectTenantType: SubjectTenantType
  organizationId: string
}

export type SubjectOrganizationRelation =
  | { kind: 'internal_admin'; subjectUserId: string; organizationId: string }
  | {
      kind: 'assigned_member'
      subjectUserId: string
      organizationId: string
      memberId: string
      clientId: string
      assignmentId: string
      roleTitleOverride: string | null
      activeFrom: Date | null
      activeUntil: Date | null
    }
  | {
      kind: 'client_portal_user'
      subjectUserId: string
      organizationId: string
      clientId: string
    }
  | { kind: 'unrelated_internal'; subjectUserId: string; organizationId: string }
  | { kind: 'no_relation'; subjectUserId: string; organizationId: string }

const INTERNAL_TENANT_TYPES: ReadonlySet<string> = new Set(['efeonce_internal', 'internal'])

const isInternalTenantType = (tenantType: SubjectTenantType): boolean =>
  INTERNAL_TENANT_TYPES.has(tenantType)

const isClientTenantType = (tenantType: SubjectTenantType): boolean => tenantType === 'client'

type ResolverRow = {
  is_admin: boolean
  assignment_id: string | null
  member_id: string | null
  client_id_assignment: string | null
  role_title_override: string | null
  start_date: Date | string | null
  end_date: Date | string | null
  client_id_portal: string | null
}

const QUERY_SQL = `
  -- ISSUE-071 fix — SELECT TRUE AS is_admin (boolean) en lugar de SELECT 1
  -- (integer). El COALESCE de abajo combina con FALSE (boolean), por lo que
  -- el CTE debe emitir el mismo tipo. PG rechaza con "COALESCE types integer
  -- and boolean cannot be matched". Detectado al activar TASK-613 V1.1 cuando
  -- el resolver corrió por primera vez contra PG real (los unit tests usaban
  -- mocks, no exercise SQL real).
  WITH subject_admin AS (
    SELECT TRUE AS is_admin
    FROM greenhouse_core.user_role_assignments
    WHERE user_id = $1
      AND role_code = 'efeonce_admin'
      AND COALESCE(active, TRUE) = TRUE
      AND (effective_to IS NULL OR effective_to > now())
    LIMIT 1
  ),
  subject_member AS (
    -- bridge user -> member via client_users.member_id (canonical link)
    SELECT cu.member_id
    FROM greenhouse_core.client_users cu
    WHERE cu.user_id = $1
      AND cu.member_id IS NOT NULL
      AND COALESCE(cu.active, TRUE) = TRUE
    LIMIT 1
  ),
  org_clients AS (
    -- the canonical bridge: spaces is the only table with both client_id + organization_id.
    -- a single organization may map to multiple client rows historically; we union them.
    SELECT DISTINCT s.client_id
    FROM greenhouse_core.spaces s
    WHERE s.organization_id = $2
      AND s.client_id IS NOT NULL
      AND COALESCE(s.active, TRUE) = TRUE
  ),
  subject_assignment AS (
    SELECT
      cta.assignment_id,
      cta.member_id,
      cta.client_id     AS client_id_assignment,
      cta.role_title_override,
      cta.start_date,
      cta.end_date
    FROM greenhouse_core.client_team_assignments cta
    JOIN subject_member sm ON sm.member_id = cta.member_id
    JOIN org_clients oc    ON oc.client_id = cta.client_id
    WHERE COALESCE(cta.active, TRUE) = TRUE
      AND (cta.start_date IS NULL OR cta.start_date <= CURRENT_DATE)
      AND (cta.end_date   IS NULL OR cta.end_date   >= CURRENT_DATE)
    ORDER BY cta.start_date DESC NULLS LAST, cta.assignment_id ASC
    LIMIT 1
  ),
  subject_client_portal AS (
    SELECT cu.client_id AS client_id_portal
    FROM greenhouse_core.client_users cu
    JOIN org_clients oc ON oc.client_id = cu.client_id
    WHERE cu.user_id = $1
      AND COALESCE(cu.active, TRUE) = TRUE
      AND cu.tenant_type = 'client'
    LIMIT 1
  )
  SELECT
    COALESCE((SELECT is_admin FROM subject_admin), FALSE)        AS is_admin,
    (SELECT assignment_id        FROM subject_assignment)         AS assignment_id,
    (SELECT member_id            FROM subject_assignment)         AS member_id,
    (SELECT client_id_assignment FROM subject_assignment)         AS client_id_assignment,
    (SELECT role_title_override  FROM subject_assignment)         AS role_title_override,
    (SELECT start_date           FROM subject_assignment)         AS start_date,
    (SELECT end_date             FROM subject_assignment)         AS end_date,
    (SELECT client_id_portal     FROM subject_client_portal)      AS client_id_portal
`

const toDateOrNull = (value: Date | string | null): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value

  const parsed = new Date(value)

  return Number.isFinite(parsed.getTime()) ? parsed : null
}

/**
 * Resolves the canonical relationship between a subject (user) and an organization.
 *
 * Single Postgres roundtrip with CTEs. Cross-tenant isolation enforced en SQL:
 * - `subject_client_portal` filtra `tenant_type = 'client'` — un internal NUNCA cae en este branch.
 * - `subject_assignment` requiere user → member bridge + member en cliente que mapea a la org.
 *
 * Errors PG son convertidos a `no_relation` con `captureWithDomain('identity', ...)`. El caller
 * (projection helper en Slice 4) decide entonces si convertir a `degradedMode`.
 *
 * Cualquier subject sin match cae a `unrelated_internal` (si tenant=internal) o `no_relation`.
 */
export const resolveSubjectOrganizationRelation = async (
  input: ResolveSubjectOrganizationRelationInput
): Promise<SubjectOrganizationRelation> => {
  const { subjectUserId, subjectTenantType, organizationId } = input

  if (!subjectUserId || !organizationId) {
    return { kind: 'no_relation', subjectUserId, organizationId }
  }

  let row: ResolverRow | null

  try {
    const rows = await query<ResolverRow>(QUERY_SQL, [subjectUserId, organizationId])

    row = rows[0] ?? null
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'workspace_projection_relationship_resolver' },
      extra: { subjectUserId, organizationId, subjectTenantType }
    })

    throw error
  }

  if (!row) {
    return isInternalTenantType(subjectTenantType)
      ? { kind: 'unrelated_internal', subjectUserId, organizationId }
      : { kind: 'no_relation', subjectUserId, organizationId }
  }

  // 1. Internal admin — highest priority. Cross-tenant capable.
  if (row.is_admin) {
    return { kind: 'internal_admin', subjectUserId, organizationId }
  }

  // 2. Assigned member — internal user assigned to a client mapping to this org.
  if (row.assignment_id && row.member_id && row.client_id_assignment) {
    return {
      kind: 'assigned_member',
      subjectUserId,
      organizationId,
      memberId: row.member_id,
      clientId: row.client_id_assignment,
      assignmentId: row.assignment_id,
      roleTitleOverride: row.role_title_override,
      activeFrom: toDateOrNull(row.start_date),
      activeUntil: toDateOrNull(row.end_date)
    }
  }

  // 3. Client portal user — explicitly tenant=client gated in SQL CTE.
  if (row.client_id_portal && isClientTenantType(subjectTenantType)) {
    return {
      kind: 'client_portal_user',
      subjectUserId,
      organizationId,
      clientId: row.client_id_portal
    }
  }

  // 4. Internal but unrelated.
  if (isInternalTenantType(subjectTenantType)) {
    return { kind: 'unrelated_internal', subjectUserId, organizationId }
  }

  // 5. Base — no relation.
  return { kind: 'no_relation', subjectUserId, organizationId }
}
