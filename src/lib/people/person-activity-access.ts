import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import {
  canAccessPeopleModule,
  type DerivedTenantAccessContext
} from '@/lib/tenant/authorization'
import { getSupervisorScopeForTenant } from '@/lib/reporting-hierarchy/access'
import { getPersonAccess } from '@/lib/people/permissions'
import { assertMemberVisibleInPeopleScope } from '@/lib/people/access-scope'
import { getPersonIcoProfile, type PersonIcoProfile } from '@/lib/person-360/get-person-ico-profile'

// ── TASK-1216 — Person-level activity/ICO access, primitive canónico (Full API Parity) ───────────
// "Un primitive, muchos consumers": este módulo resuelve, con EXACTAMENTE la misma autorización que
// el endpoint People (`canViewActivity` + anti-IDOR de scope), "¿puede el caller S ver el desempeño
// ICO de la persona P (por nombre o id)?" y devuelve el perfil si corresponde. NO es Nexa-específico:
// lo consumen por igual la UI (server), Nexa, los lanes MCP/app de API Platform y cualquier consumer
// futuro — cada uno sólo mapea su caller a `PeopleActivitySubject` (un shape neutral, session-free).
// Toda la lógica de autorización + resolución vive acá; los consumers son wrappers finos.
//
// Fuente: ADR Full API Parity (`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`). Reusa primitivas People
// canónicas (getPersonAccess, assertMemberVisibleInPeopleScope, getSupervisorScopeForTenant) +
// el reader de datos canónico getPersonIcoProfile. Mirror del precedente anti-oracle de Nexa
// (insight-focus.ts → readNexaInsightDrill).

/**
 * Subject neutral, session-free, para resolver acceso a actividad/desempeño de una persona.
 * Cualquier consumer lo deriva de su propio contexto (sesión web, NexaRuntimeContext, binding MCP,
 * sesión de app) sin acoplarse a NextAuth.
 */
export interface PeopleActivitySubject {
  userId: string
  tenantType: 'client' | 'efeonce_internal'
  memberId: string | null
  roleCodes: string[]
  routeGroups: string[]
  organizationId: string | null
}

export interface ResolvedPeopleActivityScope {
  /** true sólo si el subject tiene la capability `canViewActivity` sobre alguna población. */
  canViewActivity: boolean
  /** accessContext canónico (broad | supervisor) para reusar `assertMemberVisibleInPeopleScope`. */
  accessContext: DerivedTenantAccessContext | null
  /** Org scope efectivo (clients pinean su org; internos suelen ser null = roster completo). */
  organizationId: string | null
}

interface MemberLookupRow extends Record<string, unknown> {
  member_id: string
  display_name: string | null
}

export type MemberReferenceResolution =
  | { status: 'found'; memberId: string; displayName: string }
  | { status: 'not_found' }
  | { status: 'ambiguous'; candidates: Array<{ memberId: string; displayName: string }> }

/**
 * Resultado del reader canónico compuesto. Discriminado para que cada consumer decida su presentación
 * sin reimplementar lógica. `forbidden` (sin capability) y `not_found` (no visible / no existe, uniforme
 * anti-oracle) se distinguen igual que el endpoint People (403 vs 404).
 */
export type MemberIcoAccessResult =
  | { status: 'ok'; memberId: string; displayName: string; profile: PersonIcoProfile }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'ambiguous'; candidates: Array<{ memberId: string; displayName: string }> }

const AMBIGUITY_PROBE_LIMIT = 11
const AMBIGUITY_DISPLAY_LIMIT = 5

const toMinimalTenant = (subject: PeopleActivitySubject): TenantContext =>
  ({
    userId: subject.userId,
    tenantType: subject.tenantType,
    memberId: subject.memberId ?? undefined,
    roleCodes: subject.roleCodes,
    routeGroups: subject.routeGroups
  }) as unknown as TenantContext

/**
 * Resuelve si el subject puede ver actividad/desempeño de personas y bajo qué scope.
 * Replica el gate del endpoint People SIN sesión: clients nunca; broad por route-group/rol;
 * si no, supervisor por línea de reporte formal. La capability final es `canViewActivity`.
 */
export const resolvePeopleActivityScope = async (
  subject: PeopleActivitySubject
): Promise<ResolvedPeopleActivityScope> => {
  // Anti-oracle gate 1 (mirror de get_insight): tenants cliente nunca consultan desempeño de personas.
  if (subject.tenantType !== 'efeonce_internal') {
    return { canViewActivity: false, accessContext: null, organizationId: subject.organizationId ?? null }
  }

  const minimalTenant = toMinimalTenant(subject)

  let accessContext: DerivedTenantAccessContext | null = null

  if (canAccessPeopleModule(minimalTenant)) {
    accessContext = { accessMode: 'broad', supervisorScope: null }
  } else {
    const supervisorScope = await getSupervisorScopeForTenant(minimalTenant).catch(() => null)

    if (supervisorScope?.canAccessSupervisorPeople) {
      accessContext = { accessMode: 'supervisor', supervisorScope }
    }
  }

  if (!accessContext) {
    return { canViewActivity: false, accessContext: null, organizationId: subject.organizationId ?? null }
  }

  // Capability fina: incluso con acceso al módulo, `canViewActivity` puede ser false (ej. finance_admin
  // entra por canAccessPeopleModule pero no ve activity). El gate verdadero es la capability.
  const access = getPersonAccess(subject.roleCodes, {
    supervisorScoped: accessContext.accessMode === 'supervisor'
  })

  return {
    canViewActivity: access.canViewActivity,
    accessContext: access.canViewActivity ? accessContext : null,
    organizationId: subject.organizationId ?? null
  }
}

/**
 * Resuelve una referencia de persona (nombre libre o member_id) a un `member_id`, ACOTADO al scope
 * del subject (supervisor → sólo su subárbol visible; broad → roster). Anti-enumeración: la query
 * nunca mira fuera del scope, así que ambigüedad y candidatos provienen sólo de personas visibles.
 */
export const resolveMemberReferenceInScope = async (
  reference: string,
  scope: ResolvedPeopleActivityScope
): Promise<MemberReferenceResolution> => {
  const trimmed = reference.trim()

  if (!trimmed || !scope.canViewActivity) {
    return { status: 'not_found' }
  }

  const visibleMemberIds =
    scope.accessContext?.accessMode === 'supervisor'
      ? scope.accessContext.supervisorScope?.visibleMemberIds ?? []
      : null

  // Supervisor con scope vacío → nadie visible.
  if (visibleMemberIds !== null && visibleMemberIds.length === 0) {
    return { status: 'not_found' }
  }

  const values: unknown[] = [trimmed]
  let scopeClause = ''

  if (visibleMemberIds !== null) {
    values.push(visibleMemberIds)
    scopeClause = `AND m.member_id = ANY($${values.length}::text[])`
  }

  values.push(AMBIGUITY_PROBE_LIMIT)
  const limitPlaceholder = `$${values.length}`

  const rows = await runGreenhousePostgresQuery<MemberLookupRow>(
    `SELECT m.member_id, m.display_name
       FROM greenhouse_core.members m
      WHERE m.active = TRUE
        AND (m.member_id = $1 OR m.display_name ILIKE '%' || $1 || '%')
        ${scopeClause}
      ORDER BY
        CASE WHEN m.member_id = $1 THEN 0
             WHEN LOWER(m.display_name) = LOWER($1) THEN 1
             ELSE 2 END,
        m.display_name ASC
      LIMIT ${limitPlaceholder}`,
    values
  )

  if (rows.length === 0) {
    return { status: 'not_found' }
  }

  // Match exacto (member_id o nombre completo) gana sobre coincidencias parciales → no es ambiguo.
  const exact = rows.find(
    row => row.member_id === trimmed || (row.display_name ?? '').toLowerCase() === trimmed.toLowerCase()
  )

  if (exact) {
    return {
      status: 'found',
      memberId: exact.member_id,
      displayName: (exact.display_name ?? '').trim() || exact.member_id
    }
  }

  if (rows.length === 1) {
    const row = rows[0]

    return {
      status: 'found',
      memberId: row.member_id,
      displayName: (row.display_name ?? '').trim() || row.member_id
    }
  }

  return {
    status: 'ambiguous',
    candidates: rows.slice(0, AMBIGUITY_DISPLAY_LIMIT).map(row => ({
      memberId: row.member_id,
      displayName: (row.display_name ?? '').trim() || row.member_id
    }))
  }
}

/**
 * Gate final de defensa-en-profundidad: confirma que el member resuelto sigue visible en el scope
 * (incluye el chequeo SQL de org-scope). Devuelve true/false (nunca filtra existencia: el caller
 * traduce false → respuesta uniforme de "no encontré / sin acceso"). Reusa el gate canónico de People.
 */
export const isMemberVisibleInActivityScope = async (
  memberId: string,
  scope: ResolvedPeopleActivityScope
): Promise<boolean> => {
  if (!scope.canViewActivity || !scope.accessContext) {
    return false
  }

  try {
    await assertMemberVisibleInPeopleScope({
      memberId,
      organizationId: scope.organizationId,
      accessContext: scope.accessContext
    })

    return true
  } catch {
    return false
  }
}

/**
 * Reader canónico COMPUESTO — el punto de entrada que consumen TODOS los lanes (UI, Nexa, MCP, app).
 * Dado un subject neutral + una referencia de persona (nombre o id), aplica scope+capability+anti-IDOR
 * y devuelve el perfil ICO (OTD + RpA + FTR + salud + tendencia). Cero lógica duplicada por consumer.
 *
 * @param trendMonths meses de tendencia a incluir (default 6, igual que el endpoint People).
 */
export const readMemberIcoProfileForSubject = async (
  subject: PeopleActivitySubject,
  reference: string,
  options: { trendMonths?: number } = {}
): Promise<MemberIcoAccessResult> => {
  const scope = await resolvePeopleActivityScope(subject)

  if (!scope.canViewActivity) {
    return { status: 'forbidden' }
  }

  const resolution = await resolveMemberReferenceInScope(reference, scope)

  if (resolution.status === 'not_found') {
    return { status: 'not_found' }
  }

  if (resolution.status === 'ambiguous') {
    return { status: 'ambiguous', candidates: resolution.candidates }
  }

  // Defensa en profundidad: el resolver ya acota a scope, pero el gate canónico añade el chequeo
  // SQL de org-scope y mantiene una sola fuente de verdad de visibilidad.
  const visible = await isMemberVisibleInActivityScope(resolution.memberId, scope)

  if (!visible) {
    return { status: 'not_found' }
  }

  const profile = await getPersonIcoProfile(resolution.memberId, options.trendMonths ?? 6, {
    organizationId: scope.organizationId
  })

  return {
    status: 'ok',
    memberId: resolution.memberId,
    displayName: resolution.displayName,
    profile
  }
}
