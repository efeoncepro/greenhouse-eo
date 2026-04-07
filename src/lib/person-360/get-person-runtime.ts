import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getPersonOperationalServing } from './get-person-operational-serving'
import { getPersonIcoProfile } from './get-person-ico-profile'

/**
 * @deprecated Use `getPersonComplete360(identifier, { facets: ['identity', 'delivery'] })`
 * from `@/lib/person-360/person-complete-360` instead. The federated 360 resolver
 * provides the same data with authorization, caching, and observability (TASK-273).
 *
 * Person 360 Runtime — Consolidated serving-first read model.
 *
 * Instead of fan-out to 8+ stores, reads from 3 materialized projections:
 * 1. person_360 view (identity + member + user + CRM facets)
 * 2. person_operational_metrics (delivery KPIs by period)
 * 3. ico_member_metrics (ICO performance by period)
 *
 * Specialized drill-downs (finance, payroll, HR) remain in their own stores
 * but are NOT included in the runtime snapshot — they're loaded on-demand by tabs.
 */

export interface PersonRuntimeSnapshot {

  // Identity
  identityProfileId: string
  eoId: string | null
  memberId: string | null
  userId: string | null

  // Resolved display
  displayName: string
  email: string | null
  avatarUrl: string | null
  phone: string | null
  jobTitle: string | null

  // Member facet
  memberStatus: string | null
  memberActive: boolean
  departmentName: string | null
  employmentType: string | null
  hireDate: string | null
  jobLevel: string | null

  // User facet
  tenantType: string | null
  clientId: string | null
  clientName: string | null
  lastLoginAt: string | null
  authMode: string | null

  // Facet flags
  hasMemberFacet: boolean
  hasUserFacet: boolean
  hasCrmFacet: boolean

  // Operational summary (from serving projections)
  operational: {
    hasData: boolean
    source: string
    tasksCompleted: number
    tasksActive: number
    rpaAvg: number | null
    otdPct: number | null
    ftrPct: number | null
    stuckAssetCount: number
  } | null

  // ICO summary
  ico: {
    hasData: boolean
    health: 'green' | 'yellow' | 'red' | null
    rpaAvg: number | null
    otdPct: number | null
    ftrPct: number | null
  } | null

  // Metadata
  materializedAt: string | null
}

interface Person360Row extends Record<string, unknown> {
  identity_profile_id: string
  eo_id: string | null
  member_id: string | null
  user_id: string | null
  resolved_display_name: string | null
  resolved_email: string | null
  resolved_avatar_url: string | null
  resolved_phone: string | null
  resolved_job_title: string | null
  member_status: string | null
  member_active: boolean | null
  department_name: string | null
  employment_type: string | null
  hire_date: string | null
  job_level: string | null
  tenant_type: string | null
  client_id: string | null
  client_name: string | null
  last_login_at: string | null
  auth_mode: string | null
  has_member_facet: boolean | null
  has_user_facet: boolean | null
  has_crm_facet: boolean | null
  updated_at: string | null
}

export const getPersonRuntimeSnapshot = async (
  memberId: string
): Promise<PersonRuntimeSnapshot | null> => {
  // 1. Read identity from person_360 serving view
  const identityRows = await runGreenhousePostgresQuery<Person360Row>(
    `SELECT * FROM greenhouse_serving.person_360
     WHERE member_id = $1
     LIMIT 1`,
    [memberId]
  ).catch(() => [] as Person360Row[])

  if (identityRows.length === 0) return null

  const p = identityRows[0]

  // 2. Read operational metrics (Postgres-first, no BQ fan-out)
  const [ops, ico] = await Promise.all([
    getPersonOperationalServing(memberId).catch(() => null),
    getPersonIcoProfile(memberId, 1).catch(() => null)
  ])

  return {
    identityProfileId: p.identity_profile_id,
    eoId: p.eo_id,
    memberId: p.member_id,
    userId: p.user_id,

    displayName: p.resolved_display_name || 'Sin nombre',
    email: p.resolved_email,
    avatarUrl: p.resolved_avatar_url,
    phone: p.resolved_phone,
    jobTitle: p.resolved_job_title,

    memberStatus: p.member_status,
    memberActive: p.member_active ?? false,
    departmentName: p.department_name,
    employmentType: p.employment_type,
    hireDate: p.hire_date,
    jobLevel: p.job_level,

    tenantType: p.tenant_type,
    clientId: p.client_id,
    clientName: p.client_name,
    lastLoginAt: p.last_login_at,
    authMode: p.auth_mode,

    hasMemberFacet: p.has_member_facet ?? false,
    hasUserFacet: p.has_user_facet ?? false,
    hasCrmFacet: p.has_crm_facet ?? false,

    operational: ops?.hasData ? {
      hasData: true,
      source: ops.source,
      tasksCompleted: ops.current?.tasksCompleted ?? 0,
      tasksActive: ops.current?.tasksActive ?? 0,
      rpaAvg: ops.current?.rpaAvg ?? null,
      otdPct: ops.current?.otdPct ?? null,
      ftrPct: ops.current?.ftrPct ?? null,
      stuckAssetCount: ops.current?.stuckAssetCount ?? 0
    } : null,

    ico: ico?.hasData ? {
      hasData: true,
      health: ico.health,
      rpaAvg: ico.current?.rpaAvg ?? null,
      otdPct: ico.current?.otdPct ?? null,
      ftrPct: ico.current?.ftrPct ?? null
    } : null,

    materializedAt: p.updated_at
  }
}
