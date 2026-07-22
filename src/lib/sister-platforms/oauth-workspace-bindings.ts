import 'server-only'

import { query } from '@/lib/db'
import type { TenantAccessRecord } from '@/lib/tenant/access'

const SAFE_WORKSPACE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/
const MAX_DISPLAY_NAME_LENGTH = 160

export type GlobeOAuthWorkspaceBindingV1 = Readonly<{
  workspaceId: string
  displayName: string
  kind: 'internal' | 'organization' | 'client' | 'space'
  isPrimary: boolean
}>

type WorkspaceBindingRow = Readonly<{
  external_scope_id: string
  external_display_name: string | null
  greenhouse_scope_type: GlobeOAuthWorkspaceBindingV1['kind']
  organization_name: string | null
  client_name: string | null
  space_name: string | null
  binding_role: 'primary' | 'secondary' | 'observer'
  binding_status: 'draft' | 'active' | 'suspended' | 'deprecated'
  current_scope: boolean
  authorized: boolean
}>

export type OAuthWorkspaceBindingsQuery = <T extends Record<string, unknown>>(
  text: string,
  values?: unknown[]
) => Promise<T[]>

/**
 * Resolves the browser-safe workspace choices for Globe from Greenhouse-owned bindings.
 *
 * This is an identity-broker projection, not an authorization grant. The query intersects
 * active Globe bindings with the subject's canonical current scope, internal-admin status,
 * active client assignment or client-portal relationship. Globe must still validate the
 * selected id against the authenticated principal and its own enforced tenancy projection.
 */
export async function resolveGlobeOAuthWorkspaceBindings(
  tenant: TenantAccessRecord,
  runQuery: OAuthWorkspaceBindingsQuery = query
): Promise<readonly GlobeOAuthWorkspaceBindingV1[]> {
  const rows = await runQuery<WorkspaceBindingRow>(WORKSPACE_BINDINGS_SQL, [
    tenant.userId,
    tenant.tenantType,
    tenant.clientId || null,
    tenant.organizationId,
    tenant.spaceId
  ])

  const hasExplicitCurrentBinding = rows.some(row => row.current_scope)

  const candidates = rows
    .filter(row => row.binding_status === 'active' && row.authorized)
    .map(mapBindingRow)
    .filter(
      (value): value is Omit<GlobeOAuthWorkspaceBindingV1, 'isPrimary'> & Readonly<{ preferred: boolean }> =>
        value !== null
    )

  if (!hasExplicitCurrentBinding) {
    const fallback = legacyCurrentWorkspace(tenant)

    if (fallback) candidates.push(fallback)
  }

  const deduplicated = new Map<string, (typeof candidates)[number]>()

  for (const candidate of candidates) {
    const existing = deduplicated.get(candidate.workspaceId)

    if (!existing || (!existing.preferred && candidate.preferred)) deduplicated.set(candidate.workspaceId, candidate)
  }

  const ordered = [...deduplicated.values()].sort((left, right) => {
    if (left.preferred !== right.preferred) return left.preferred ? -1 : 1

    return left.displayName.localeCompare(right.displayName, 'es') || left.workspaceId.localeCompare(right.workspaceId)
  })

  return ordered.map((binding, index) => ({
    workspaceId: binding.workspaceId,
    displayName: binding.displayName,
    kind: binding.kind,
    isPrimary: index === 0
  }))
}

function mapBindingRow(
  row: WorkspaceBindingRow
): (Omit<GlobeOAuthWorkspaceBindingV1, 'isPrimary'> & Readonly<{ preferred: boolean }>) | null {
  const workspaceId = normalizeWorkspaceId(row.external_scope_id)

  if (!workspaceId) return null

  return {
    workspaceId,
    displayName: normalizeDisplayName(
      row.external_display_name ?? row.space_name ?? row.client_name ?? row.organization_name,
      workspaceId
    ),
    kind: row.greenhouse_scope_type,
    preferred: row.current_scope
  }
}

function legacyCurrentWorkspace(
  tenant: TenantAccessRecord
): (Omit<GlobeOAuthWorkspaceBindingV1, 'isPrimary'> & Readonly<{ preferred: boolean }>) | null {
  const clientId = tenant.clientId?.trim()

  // A missing legacy scope is absence of authority, not an empty workspace suffix.
  // Explicit broker bindings remain the preferred source and are resolved above.
  if (!clientId) return null

  const workspaceId = normalizeWorkspaceId(`greenhouse-org:${clientId}`)

  if (!workspaceId) return null

  return {
    workspaceId,
    displayName: normalizeDisplayName(tenant.clientName, workspaceId),
    kind: tenant.tenantType === 'efeonce_internal' ? 'internal' : 'client',
    preferred: true
  }
}

function normalizeWorkspaceId(value: string): string | null {
  const normalized = value.trim()

  return SAFE_WORKSPACE_ID.test(normalized) ? normalized : null
}

function normalizeDisplayName(value: string | null | undefined, fallback: string): string {
  const normalized = value?.replace(/\s+/g, ' ').trim()

  return (normalized || fallback).slice(0, MAX_DISPLAY_NAME_LENGTH)
}

const WORKSPACE_BINDINGS_SQL = `
  WITH subject AS (
    SELECT
      cu.user_id,
      cu.member_id,
      cu.client_id,
      cu.tenant_type
    FROM greenhouse_core.client_users AS cu
    WHERE cu.user_id = $1
      AND COALESCE(cu.active, TRUE) = TRUE
      AND cu.status IN ('active', 'invited')
    LIMIT 1
  ),
  subject_admin AS (
    SELECT TRUE AS is_admin
    FROM greenhouse_core.user_role_assignments
    WHERE user_id = $1
      AND role_code = 'efeonce_admin'
      AND COALESCE(active, TRUE) = TRUE
      AND status = 'active'
      AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
      AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
    LIMIT 1
  ),
  subject_assignments AS (
    SELECT DISTINCT cta.client_id
    FROM greenhouse_core.client_team_assignments AS cta
    JOIN subject ON subject.member_id = cta.member_id
    WHERE COALESCE(cta.active, TRUE) = TRUE
      AND (cta.start_date IS NULL OR cta.start_date <= CURRENT_DATE)
      AND (cta.end_date IS NULL OR cta.end_date >= CURRENT_DATE)
  ),
  binding_rows AS (
    SELECT
      b.external_scope_id,
      b.external_display_name,
      b.greenhouse_scope_type,
      org.organization_name,
      client.client_name,
      space.space_name,
      b.binding_role,
      b.binding_status,
      CASE
        WHEN b.greenhouse_scope_type = 'internal' THEN $2 = 'efeonce_internal'
        WHEN b.greenhouse_scope_type = 'space' THEN b.space_id = $5
        WHEN b.greenhouse_scope_type = 'client' THEN b.client_id = $3
        WHEN b.greenhouse_scope_type = 'organization' THEN b.organization_id = $4
        ELSE FALSE
      END AS current_scope,
      CASE
        WHEN b.greenhouse_scope_type = 'internal' THEN $2 = 'efeonce_internal'
        WHEN EXISTS (SELECT 1 FROM subject_admin) THEN TRUE
        WHEN b.greenhouse_scope_type = 'space' THEN
          b.space_id = $5
          OR b.client_id = $3
          OR b.client_id IN (SELECT client_id FROM subject_assignments)
        WHEN b.greenhouse_scope_type = 'client' THEN
          b.client_id = $3
          OR b.client_id IN (SELECT client_id FROM subject_assignments)
        WHEN b.greenhouse_scope_type = 'organization' THEN
          b.organization_id = $4
          OR EXISTS (
            SELECT 1
            FROM greenhouse_core.spaces AS related_space
            WHERE related_space.organization_id = b.organization_id
              AND COALESCE(related_space.active, TRUE) = TRUE
              AND (
                related_space.client_id = $3
                OR related_space.client_id IN (SELECT client_id FROM subject_assignments)
              )
          )
        ELSE FALSE
      END AS authorized
    FROM greenhouse_core.sister_platform_bindings AS b
    LEFT JOIN greenhouse_core.organizations AS org ON org.organization_id = b.organization_id
    LEFT JOIN greenhouse_core.clients AS client ON client.client_id = b.client_id
    LEFT JOIN greenhouse_core.spaces AS space ON space.space_id = b.space_id
    WHERE b.sister_platform_key = 'globe'
  )
  SELECT *
  FROM binding_rows
  ORDER BY
    current_scope DESC,
    CASE binding_role WHEN 'primary' THEN 0 WHEN 'secondary' THEN 1 ELSE 2 END,
    COALESCE(space_name, client_name, organization_name, external_display_name, external_scope_id),
    external_scope_id
  LIMIT 200
`
