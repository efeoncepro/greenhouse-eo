import { query } from '@/lib/db'

import { buildExternalIdpSourceSystem, EXTERNAL_IDP_SOURCE_OBJECT_TYPE } from './ids'

import type {
  EligibleClientOrganization,
  ExternalBindingStatus,
  ExternalCapabilityGrant,
  ExternalIdentityEnvironment,
  ExternalMemberInvitation,
  ExternalOrganizationBinding
} from './types'

/**
 * TASK-1631 — Readers del dominio external-access (SQL embebido verificado contra PG real:
 * columnas de la migración 20260904104914802 + `organizations.organization_name`/`legal_name`).
 */

type EnvironmentRow = {
  environment_id: string
  display_name: string
  provider: string
  provider_environment_ref: string | null
  issuer_url: string
  jwks_uri: string
  audience: string
  issuer_class: ExternalIdentityEnvironment['issuerClass']
  subject_type: ExternalIdentityEnvironment['subjectType']
  status: ExternalIdentityEnvironment['status']
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string | Date
  updated_at: string | Date
}

type BindingRow = {
  binding_id: string
  organization_id: string
  organization_name: string | null
  environment_id: string
  external_organization_ref: string
  status: ExternalBindingStatus
  grants_version: number | string
  designated_admin_profile_id: string | null
  reason: string | null
  bound_by: string
  bound_at: string | Date
  revoked_by: string | null
  revoked_at: string | Date | null
  revoke_reason: string | null
}

type GrantRow = {
  grant_id: string
  binding_id: string
  capability: string
  profile_id: string | null
  status: ExternalCapabilityGrant['status']
  reason: string | null
  granted_by: string
  granted_at: string | Date
  revoked_by: string | null
  revoked_at: string | Date | null
  revoke_reason: string | null
}

type InvitationRow = {
  invitation_id: string
  binding_id: string
  profile_id: string | null
  email: string
  designated_admin: boolean
  status: ExternalMemberInvitation['status']
  reason: string | null
  issued_by: string
  issued_at: string | Date
  expires_at: string | Date
  accepted_at: string | Date | null
  linked_at: string | Date | null
  link_id: string | null
  revoked_by: string | null
  revoked_at: string | Date | null
  revoke_reason: string | null
}

type EligibleOrganizationRow = {
  organization_id: string
  organization_name: string | null
  legal_name: string | null
  organization_type: string
  lifecycle_stage: string
  active_bindings: number | string
}

const iso = (value: string | Date) => (value instanceof Date ? value.toISOString() : new Date(value).toISOString())
const isoOrNull = (value: string | Date | null) => (value === null ? null : iso(value))

export const ENVIRONMENT_SELECT = `
  environment_id, display_name, provider, provider_environment_ref, issuer_url, jwks_uri, audience,
  issuer_class, subject_type, status, notes, created_by, updated_by, created_at, updated_at
`

export const BINDING_SELECT = `
  b.binding_id, b.organization_id, o.organization_name, b.environment_id, b.external_organization_ref,
  b.status, b.grants_version, b.designated_admin_profile_id, b.reason, b.bound_by, b.bound_at,
  b.revoked_by, b.revoked_at, b.revoke_reason
`

export const GRANT_SELECT = `
  grant_id, binding_id, capability, profile_id, status, reason, granted_by, granted_at,
  revoked_by, revoked_at, revoke_reason
`

export const INVITATION_SELECT = `
  invitation_id, binding_id, profile_id, email, designated_admin, status, reason, issued_by, issued_at,
  expires_at, accepted_at, linked_at, link_id, revoked_by, revoked_at, revoke_reason
`

export const mapEnvironmentRow = (row: EnvironmentRow): ExternalIdentityEnvironment => ({
  environmentId: row.environment_id,
  displayName: row.display_name,
  provider: row.provider,
  providerEnvironmentRef: row.provider_environment_ref,
  issuerUrl: row.issuer_url,
  jwksUri: row.jwks_uri,
  audience: row.audience,
  issuerClass: row.issuer_class,
  subjectType: row.subject_type,
  status: row.status,
  notes: row.notes,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at)
})

export const mapBindingRow = (row: BindingRow): ExternalOrganizationBinding => ({
  bindingId: row.binding_id,
  organizationId: row.organization_id,
  organizationName: row.organization_name,
  environmentId: row.environment_id,
  externalOrganizationRef: row.external_organization_ref,
  status: row.status,
  grantsVersion: Number(row.grants_version),
  designatedAdminProfileId: row.designated_admin_profile_id,
  reason: row.reason,
  boundBy: row.bound_by,
  boundAt: iso(row.bound_at),
  revokedBy: row.revoked_by,
  revokedAt: isoOrNull(row.revoked_at),
  revokeReason: row.revoke_reason
})

export const mapGrantRow = (row: GrantRow): ExternalCapabilityGrant => ({
  grantId: row.grant_id,
  bindingId: row.binding_id,
  capability: row.capability,
  profileId: row.profile_id,
  status: row.status,
  reason: row.reason,
  grantedBy: row.granted_by,
  grantedAt: iso(row.granted_at),
  revokedBy: row.revoked_by,
  revokedAt: isoOrNull(row.revoked_at),
  revokeReason: row.revoke_reason
})

export const mapInvitationRow = (row: InvitationRow): ExternalMemberInvitation => ({
  invitationId: row.invitation_id,
  bindingId: row.binding_id,
  profileId: row.profile_id,
  email: row.email,
  designatedAdmin: row.designated_admin,
  status: row.status,
  reason: row.reason,
  issuedBy: row.issued_by,
  issuedAt: iso(row.issued_at),
  expiresAt: iso(row.expires_at),
  acceptedAt: isoOrNull(row.accepted_at),
  linkedAt: isoOrNull(row.linked_at),
  linkId: row.link_id,
  revokedBy: row.revoked_by,
  revokedAt: isoOrNull(row.revoked_at),
  revokeReason: row.revoke_reason
})

export const listExternalIdentityEnvironments = async (): Promise<ExternalIdentityEnvironment[]> => {
  const rows = await query<EnvironmentRow>(
    `SELECT ${ENVIRONMENT_SELECT}
       FROM greenhouse_core.external_identity_environments
      ORDER BY environment_id COLLATE "C"`
  )

  return rows.map(mapEnvironmentRow)
}

export const getExternalIdentityEnvironment = async (
  environmentId: string
): Promise<ExternalIdentityEnvironment | null> => {
  const rows = await query<EnvironmentRow>(
    `SELECT ${ENVIRONMENT_SELECT}
       FROM greenhouse_core.external_identity_environments
      WHERE environment_id = $1`,
    [environmentId]
  )

  return rows[0] ? mapEnvironmentRow(rows[0]) : null
}

/**
 * Elegibilidad de la cohorte: organizaciones cliente EXISTENTES de Account 360. `eligible` es
 * `true` sólo para `active_client`; el resto se lista para que el operador vea por qué no entra.
 * Nunca un dominio de correo ni un signup: sólo filas de `greenhouse_core.organizations`.
 */
export const listEligibleClientOrganizations = async ({
  search = null,
  limit = 100
}: {
  search?: string | null
  limit?: number
} = {}): Promise<EligibleClientOrganization[]> => {
  const rows = await query<EligibleOrganizationRow>(
    `SELECT o.organization_id, o.organization_name, o.legal_name, o.organization_type, o.lifecycle_stage,
            (SELECT count(*) FROM greenhouse_core.external_organization_bindings b
              WHERE b.organization_id = o.organization_id AND b.status = 'active') AS active_bindings
       FROM greenhouse_core.organizations o
      WHERE o.organization_type IN ('client', 'both')
        AND o.active = TRUE
        AND o.status = 'active'
        AND ($1::text IS NULL
             OR o.organization_name ILIKE '%' || $1 || '%'
             OR o.legal_name ILIKE '%' || $1 || '%'
             OR o.organization_id = $1)
      ORDER BY (o.lifecycle_stage = 'active_client') DESC,
               COALESCE(o.organization_name, o.legal_name, o.organization_id) COLLATE "C"
      LIMIT $2`,
    [search, limit]
  )

  return rows.map(row => ({
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    legalName: row.legal_name,
    organizationType: row.organization_type,
    lifecycleStage: row.lifecycle_stage,
    eligible: row.lifecycle_stage === 'active_client',
    activeBindings: Number(row.active_bindings)
  }))
}

export const getExternalOrganizationBinding = async (
  bindingId: string
): Promise<ExternalOrganizationBinding | null> => {
  const rows = await query<BindingRow>(
    `SELECT ${BINDING_SELECT}
       FROM greenhouse_core.external_organization_bindings b
       JOIN greenhouse_core.organizations o ON o.organization_id = b.organization_id
      WHERE b.binding_id = $1`,
    [bindingId]
  )

  return rows[0] ? mapBindingRow(rows[0]) : null
}

export const listExternalOrganizationBindings = async ({
  organizationId = null,
  environmentId = null,
  status = null,
  limit = 200
}: {
  organizationId?: string | null
  environmentId?: string | null
  status?: ExternalBindingStatus | null
  limit?: number
} = {}): Promise<ExternalOrganizationBinding[]> => {
  const rows = await query<BindingRow>(
    `SELECT ${BINDING_SELECT}
       FROM greenhouse_core.external_organization_bindings b
       JOIN greenhouse_core.organizations o ON o.organization_id = b.organization_id
      WHERE ($1::text IS NULL OR b.organization_id = $1)
        AND ($2::text IS NULL OR b.environment_id = $2)
        AND ($3::text IS NULL OR b.status = $3)
      ORDER BY b.bound_at DESC, b.binding_id COLLATE "C"
      LIMIT $4`,
    [organizationId, environmentId, status, limit]
  )

  return rows.map(mapBindingRow)
}

export const listExternalCapabilityGrants = async (bindingId: string): Promise<ExternalCapabilityGrant[]> => {
  const rows = await query<GrantRow>(
    `SELECT ${GRANT_SELECT}
       FROM greenhouse_core.external_capability_grants
      WHERE binding_id = $1
      ORDER BY status = 'active' DESC, capability COLLATE "C", granted_at DESC`,
    [bindingId]
  )

  return rows.map(mapGrantRow)
}

export const listExternalMemberInvitations = async (bindingId: string): Promise<ExternalMemberInvitation[]> => {
  const rows = await query<InvitationRow>(
    `SELECT ${INVITATION_SELECT}
       FROM greenhouse_core.external_member_invitations
      WHERE binding_id = $1
      ORDER BY issued_at DESC, invitation_id COLLATE "C"`,
    [bindingId]
  )

  return rows.map(mapInvitationRow)
}

/**
 * TASK-1830 — Source link `external_idp:<environment>` de una persona externa.
 *
 * Es el reader canónico que el authorization server consume para dos cosas distintas:
 *
 * 1. `getActiveExternalIdpLinkBySubject` — validez de la sesión EN CADA REQUEST. Una sesión vive
 *    mientras su link siga `active`; si el operador revoca el acceso, la sesión muere en el
 *    siguiente request (invariante de `TASK-1830`, no un job de limpieza).
 * 2. `findActiveExternalIdpLinkByEmail` — resolución correo → `subject` para el magic link. El
 *    `source_email` lo escribe `acceptExternalInvitation` desde la invitación del operador, nunca
 *    desde input del usuario, así que es una llave confiable.
 *
 * NUNCA se resuelve una persona por `client_id` ni por email fuera de este camino, y el resultado
 * jamás distingue "no existe" de "no autorizado" hacia afuera: eso lo decide el caller
 * (anti-enumeración).
 */

export type ExternalIdpSourceLink = {
  linkId: string
  profileId: string
  environmentId: string
  subject: string
  email: string | null
  displayName: string | null
  active: boolean
}

type SourceLinkRow = {
  link_id: string
  profile_id: string
  source_object_id: string
  source_email: string | null
  source_display_name: string | null
  active: boolean
}

const SOURCE_LINK_SELECT = `link_id, profile_id, source_object_id, source_email, source_display_name, active`

const mapSourceLinkRow = (row: SourceLinkRow, environmentId: string): ExternalIdpSourceLink => ({
  linkId: row.link_id,
  profileId: row.profile_id,
  environmentId,
  subject: row.source_object_id,
  email: row.source_email,
  displayName: row.source_display_name,
  active: row.active
})

export const getActiveExternalIdpLinkBySubject = async ({
  environmentId,
  subject
}: {
  environmentId: string
  subject: string
}): Promise<ExternalIdpSourceLink | null> => {
  const rows = await query<SourceLinkRow>(
    `SELECT ${SOURCE_LINK_SELECT}
       FROM greenhouse_core.identity_profile_source_links
      WHERE source_system = $1
        AND source_object_type = $2
        AND source_object_id = $3
        AND active`,
    [buildExternalIdpSourceSystem(environmentId), EXTERNAL_IDP_SOURCE_OBJECT_TYPE, subject]
  )

  return rows[0] ? mapSourceLinkRow(rows[0], environmentId) : null
}

/**
 * El índice único parcial de `TASK-1631` garantiza un solo link ACTIVO por `(system, type, subject)`,
 * pero NO por correo: una persona puede tener dos subjects históricos con el mismo correo si alguien
 * la re-invitó. Por eso más de una coincidencia activa devuelve `null` en vez de elegir una — un
 * login ambiguo se resuelve con una re-invitación auditada, nunca adivinando.
 */
export const findActiveExternalIdpLinkByEmail = async ({
  environmentId,
  email
}: {
  environmentId: string
  email: string
}): Promise<ExternalIdpSourceLink | null> => {
  const rows = await query<SourceLinkRow>(
    `SELECT ${SOURCE_LINK_SELECT}
       FROM greenhouse_core.identity_profile_source_links
      WHERE source_system = $1
        AND source_object_type = $2
        AND lower(source_email) = lower($3)
        AND active
      LIMIT 2`,
    [buildExternalIdpSourceSystem(environmentId), EXTERNAL_IDP_SOURCE_OBJECT_TYPE, email]
  )

  if (rows.length !== 1) return null

  return mapSourceLinkRow(rows[0], environmentId)
}
