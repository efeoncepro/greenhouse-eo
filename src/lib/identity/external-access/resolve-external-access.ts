import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'

import {
  buildExternalIdpSourceSystem,
  buildExternalResolutionId,
  EXTERNAL_IDP_SOURCE_OBJECT_TYPE,
  hashExternalSubject
} from './ids'
import type {
  ExternalAccessMembership,
  ExternalAccessResolution,
  ExternalAccessResolutionOutcome,
  ExternalIssuerClass
} from './types'
import { assertEnvironmentId, assertNonEmptyString, optionalString } from './validation'

/**
 * TASK-1631 — Reader de acceso externo por `(environment, subject)`.
 *
 * Es el contrato que consume el gateway (TASK-1831) por HTTP con su identidad workload:
 *   token válido → issuer → environment_id (config del gateway) → ESTE reader → organización +
 *   grants + grants_version. La organización se deriva del binding, nunca de un claim autoafirmado;
 *   la persona se resuelve por el source link `(environment, subject)`, nunca por `client_id` ni email.
 *
 * Fail-closed: cualquier outcome distinto de `bound` deniega y queda en
 * `external_access_resolution_log` (sólo denials, subject hasheado) — de ahí salen las señales
 * `unbound_dispatch_attempt` y `revoked_still_dispatching` sin telemetría cross-runtime.
 */

type EnvironmentRow = {
  environment_id: string
  issuer_class: ExternalIssuerClass
  status: string
}

type LinkRow = {
  profile_id: string
  link_active: boolean
  profile_active: boolean
  profile_status: string
  merged_into_profile_id: string | null
}

type MembershipRow = {
  binding_id: string
  organization_id: string
  external_organization_ref: string
  binding_status: string
  grants_version: number | string
  designated_admin_profile_id: string | null
  revoked_at: string | Date | null
}

type GrantRow = {
  binding_id: string
  capability: string
}

export type ResolveExternalAccessInput = {
  environmentId: string
  subject: string
  /** `azp`/`client_id` del token, sólo para el log de denials; nunca participa en la resolución. */
  clientId?: string | null
}

const recordDenial = async ({
  environmentId,
  subject,
  clientId,
  outcome,
  bindingId,
  profileId,
  grantsVersion
}: {
  environmentId: string
  subject: string
  clientId: string | null
  outcome: Exclude<ExternalAccessResolutionOutcome, 'bound'>
  bindingId: string | null
  profileId: string | null
  grantsVersion: number | null
}) => {
  try {
    await query(
      `INSERT INTO greenhouse_core.external_access_resolution_log (
         resolution_id, environment_id, subject_hash, client_id, outcome, binding_id, profile_id, grants_version
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        buildExternalResolutionId(),
        environmentId,
        hashExternalSubject(subject),
        clientId,
        outcome,
        bindingId,
        profileId,
        grantsVersion
      ]
    )
  } catch (error) {
    // La denegación ya está decidida: un fallo del log nunca la convierte en allow ni en 500.
    captureWithDomain(error, 'identity', {
      tags: { task: 'TASK-1631', surface: 'external-access-resolution-log' },
      extra: { environmentId, outcome }
    })
  }
}

type RevokedMembershipRow = { binding_id: string; grants_version: number | string }

const findLatestRevokedMembership = async (profileId: string, environmentId: string) => {
  const rows = await query<RevokedMembershipRow>(
    `SELECT b.binding_id, b.grants_version
       FROM greenhouse_core.external_member_invitations i
       JOIN greenhouse_core.external_organization_bindings b ON b.binding_id = i.binding_id
      WHERE i.profile_id = $1
        AND b.environment_id = $2
        AND i.status = 'revoked'
        AND i.linked_at IS NOT NULL
      ORDER BY i.revoked_at DESC NULLS LAST
      LIMIT 1`,
    [profileId, environmentId]
  )

  return rows[0] ?? null
}

export const resolveExternalAccess = async (input: ResolveExternalAccessInput): Promise<ExternalAccessResolution> => {
  const environmentId = assertEnvironmentId(input.environmentId)
  const subject = assertNonEmptyString(input.subject, 'subject', 1024)
  const clientId = optionalString(input.clientId, 'clientId', 512)
  const resolvedAt = new Date().toISOString()

  const deny = async (
    outcome: Exclude<ExternalAccessResolutionOutcome, 'bound'>,
    context: { issuerClass: ExternalIssuerClass | null; profileId: string | null; bindingId: string | null; grantsVersion: number | null }
  ): Promise<ExternalAccessResolution> => {
    await recordDenial({
      environmentId,
      subject,
      clientId,
      outcome,
      bindingId: context.bindingId,
      profileId: context.profileId,
      grantsVersion: context.grantsVersion
    })

    return {
      outcome,
      environmentId,
      issuerClass: context.issuerClass,
      profileId: context.profileId,
      memberships: [],
      resolvedAt
    }
  }

  const environmentRows = await query<EnvironmentRow>(
    `SELECT environment_id, issuer_class, status
       FROM greenhouse_core.external_identity_environments
      WHERE environment_id = $1`,
    [environmentId]
  )

  const environment = environmentRows[0] ?? null

  if (!environment || environment.status !== 'active') {
    return deny('environment_inactive', {
      issuerClass: environment?.issuer_class ?? null,
      profileId: null,
      bindingId: null,
      grantsVersion: null
    })
  }

  const sourceSystem = buildExternalIdpSourceSystem(environmentId)

  // Se leen también los links INACTIVOS: la revocación desactiva el link (y con él la sesión del
  // auth-server, TASK-1830), y sin esta lectura toda revocación se vería como `unbound` — el soporte
  // no podría distinguir "nunca fue nadie" de "fue revocado", y `revoked_still_dispatching` no vería
  // nada. La autorización sigue exigiendo link ACTIVO + membership ligada + binding activo.
  const linkRows = await query<LinkRow>(
    `SELECT l.profile_id, l.active AS link_active, p.active AS profile_active, p.status AS profile_status,
            p.merged_into_profile_id
       FROM greenhouse_core.identity_profile_source_links l
       JOIN greenhouse_core.identity_profiles p ON p.profile_id = l.profile_id
      WHERE l.source_system = $1
        AND l.source_object_type = $2
        AND l.source_object_id = $3
      ORDER BY l.active DESC, l.updated_at DESC`,
    [sourceSystem, EXTERNAL_IDP_SOURCE_OBJECT_TYPE, subject]
  )

  const activeLinks = linkRows.filter(row => row.link_active)

  if (activeLinks.length !== 1) {
    // >1 activos = colisión (el índice único lo impide, pero fail-closed igual). 0 activos: si hubo
    // un link (hoy inactivo) con membership revocada en este environment, el outcome es `revoked`.
    const inactiveLink = activeLinks.length === 0 ? (linkRows[0] ?? null) : null
    const latestRevoked = inactiveLink ? await findLatestRevokedMembership(inactiveLink.profile_id, environmentId) : null

    return deny(latestRevoked ? 'revoked' : 'unbound', {
      issuerClass: environment.issuer_class,
      profileId: latestRevoked ? inactiveLink!.profile_id : null,
      bindingId: latestRevoked?.binding_id ?? null,
      grantsVersion: latestRevoked ? Number(latestRevoked.grants_version) : null
    })
  }

  const link = activeLinks[0]!

  if (!link.profile_active || link.profile_status !== 'active' || link.merged_into_profile_id) {
    return deny('profile_inactive', {
      issuerClass: environment.issuer_class,
      profileId: link.profile_id,
      bindingId: null,
      grantsVersion: null
    })
  }

  const membershipRows = await query<MembershipRow>(
    `SELECT b.binding_id, b.organization_id, b.external_organization_ref, b.status AS binding_status,
            b.grants_version, b.designated_admin_profile_id, b.revoked_at
       FROM greenhouse_core.external_member_invitations i
       JOIN greenhouse_core.external_organization_bindings b ON b.binding_id = i.binding_id
      WHERE i.profile_id = $1
        AND i.status = 'linked'
        AND b.environment_id = $2
      ORDER BY (b.status = 'active') DESC, b.bound_at DESC`,
    [link.profile_id, environmentId]
  )

  const activeMemberships = membershipRows.filter(row => row.binding_status === 'active')

  if (activeMemberships.length === 0) {
    const latestRevoked = membershipRows[0] ?? null

    return deny(latestRevoked ? 'revoked' : 'unbound', {
      issuerClass: environment.issuer_class,
      profileId: link.profile_id,
      bindingId: latestRevoked?.binding_id ?? null,
      grantsVersion: latestRevoked ? Number(latestRevoked.grants_version) : null
    })
  }

  const bindingIds = activeMemberships.map(row => row.binding_id)

  const grantRows = await query<GrantRow>(
    `SELECT binding_id, capability
       FROM greenhouse_core.external_capability_grants
      WHERE binding_id = ANY($1::text[])
        AND status = 'active'
        AND (profile_id IS NULL OR profile_id = $2)
      ORDER BY capability COLLATE "C"`,
    [bindingIds, link.profile_id]
  )

  const memberships: ExternalAccessMembership[] = activeMemberships.map(row => ({
    bindingId: row.binding_id,
    organizationId: row.organization_id,
    externalOrganizationRef: row.external_organization_ref,
    grantsVersion: Number(row.grants_version),
    grants: Array.from(
      new Set(grantRows.filter(grant => grant.binding_id === row.binding_id).map(grant => grant.capability))
    ),
    designatedAdmin: row.designated_admin_profile_id === link.profile_id
  }))

  return {
    outcome: 'bound',
    environmentId,
    issuerClass: environment.issuer_class,
    profileId: link.profile_id,
    memberships,
    resolvedAt
  }
}
