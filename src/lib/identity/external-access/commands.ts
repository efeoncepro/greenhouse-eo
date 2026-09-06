import type { PoolClient } from 'pg'

import {
  appendAudit,
  bumpGrantsVersion,
  insertAuthorityBinding,
  insertAuthorityGrant,
  protectInternalSourceLinks
} from './authority-transactions'

import { withTransaction } from '@/lib/db'
import {
  buildIdentityProfileId,
  buildIdentityProfilePublicId,
  buildIdentitySourceLinkId
} from '@/lib/ids/greenhouse-ids'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { readExternalInvitationConfig } from './config'
import {
  buildInvitationDelivery,
  recordExternalInvitationDeliveryOutcome,
  resolveInvitationAcceptanceUrl,
  sendInvitationEmailViaPlatform,
  type InvitationEmailSender
} from './delivery'
import { ExternalAccessError } from './errors'
import {
  buildExternalBindingId,
  buildExternalGrantId,
  buildExternalIdpSourceSystem,
  buildExternalInvitationId,
  EXTERNAL_IDP_SOURCE_OBJECT_TYPE,
  generateInvitationToken,
  hashInvitationToken
} from './ids'
import {
  BINDING_SELECT,
  ENVIRONMENT_SELECT,
  GRANT_SELECT,
  INVITATION_SELECT,
  mapBindingRow,
  mapEnvironmentRow,
  mapGrantRow,
  mapInvitationRow
} from './store'
import type {
  ExternalAccessActor,
  ExternalCapabilityGrant,
  ExternalIdentityEnvironment,
  ExternalInvitationDelivery,
  ExternalInvitationDeliveryMode,
  ExternalMemberInvitation,
  ExternalOrganizationBinding,
  ExternalRevocationScope
} from './types'
import {
  assertCapability,
  assertEnvironmentId,
  assertEnvironmentStatus,
  assertHttpsUrl,
  assertIssuerClass,
  assertNonEmptyString,
  assertPositiveInteger,
  assertProvider,
  assertSubjectType,
  normalizeEmail,
  optionalString
} from './validation'

/**
 * TASK-1631 — Commands canónicos del dominio external-access.
 *
 * Todos son idempotentes, corren en UNA transacción (estado + audit append-only + outbox) y
 * tienen capability dedicada en la ruta que los expone (una autoridad por command):
 *   upsertExternalIdentityEnvironment · bindExternalOrganization · grantExternalCapability ·
 *   issueExternalInvitation · acceptExternalInvitation · revokeExternalAccess
 *
 * `grants_version` sube en todo cambio de autoridad (grant, revocación de grant/miembro/binding):
 * el gateway compara el `gv` del token con el vigente por igualdad, así que un token anterior deja
 * de despachar aunque siga siendo criptográficamente válido (fail-closed, TASK-1831).
 *
 * Sin `server-only`: el auth-server (TASK-1830) consume `acceptExternalInvitation` in-process.
 */

const actorId = (actor: ExternalAccessActor) => assertNonEmptyString(actor.actorId, 'actorId', 256)

const loadEnvironmentForUpdate = async (client: PoolClient, environmentId: string) => {
  const { rows } = await client.query<Parameters<typeof mapEnvironmentRow>[0]>(
    `SELECT ${ENVIRONMENT_SELECT}
       FROM greenhouse_core.external_identity_environments
      WHERE environment_id = $1
      FOR UPDATE`,
    [environmentId]
  )

  return rows[0] ? mapEnvironmentRow(rows[0]) : null
}

const loadBindingForUpdate = async (client: PoolClient, bindingId: string) => {
  const lookup = await client.query<{ environment_id: string }>(
    `SELECT environment_id FROM greenhouse_core.external_organization_bindings WHERE binding_id=$1`,
    [bindingId]
  )

  if (!lookup.rows[0]) return null
  await loadEnvironmentForUpdate(client, lookup.rows[0].environment_id)

  const { rows } = await client.query<Parameters<typeof mapBindingRow>[0]>(
    `SELECT ${BINDING_SELECT}
       FROM greenhouse_core.external_organization_bindings b
       JOIN greenhouse_core.organizations o ON o.organization_id = b.organization_id
      WHERE b.binding_id = $1 AND b.population='external'
      FOR UPDATE OF b`,
    [bindingId]
  )

  return rows[0] ? mapBindingRow(rows[0]) : null
}

const requireActiveBinding = async (client: PoolClient, bindingId: string): Promise<ExternalOrganizationBinding> => {
  const binding = await loadBindingForUpdate(client, bindingId)

  if (!binding) {
    throw new ExternalAccessError('not_found', 'binding not found', { bindingId })
  }

  if (binding.status !== 'active') {
    throw new ExternalAccessError('binding_not_active', 'binding is revoked', { bindingId })
  }

  const environment = await loadEnvironmentForUpdate(client, binding.environmentId)

  if (!environment || environment.status === 'retired') {
    throw new ExternalAccessError('environment_not_active', 'environment is retired', {
      environmentId: binding.environmentId
    })
  }

  return binding
}

/**
 * Desactiva el source link `(environment, profile)` SÓLO si la persona ya no tiene ninguna
 * membership ligada bajo un binding activo del mismo environment. Una persona puede ser miembro
 * de dos organizaciones en el mismo environment: revocarla en una no la expulsa de la otra.
 */
const deactivateOrphanSourceLinks = async (client: PoolClient, environmentId: string, profileId: string) => {
  await client.query(
    `UPDATE greenhouse_core.identity_profile_source_links l
        SET active = FALSE, is_login_identity = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE l.profile_id = $1
        AND l.source_system = $2
        AND l.source_object_type = $3
        AND l.active = TRUE
        AND NOT EXISTS (SELECT 1 FROM greenhouse_core.internal_native_enrollments e WHERE e.native_link_id=l.link_id AND e.status='active')
        AND NOT EXISTS (
          SELECT 1
            FROM greenhouse_core.external_member_invitations i
            JOIN greenhouse_core.external_organization_bindings b ON b.binding_id = i.binding_id
           WHERE i.profile_id = l.profile_id
             AND i.status = 'linked'
             AND b.status = 'active'
             AND b.environment_id = $4
        )`,
    [profileId, buildExternalIdpSourceSystem(environmentId), EXTERNAL_IDP_SOURCE_OBJECT_TYPE, environmentId]
  )
}

// ── Environment registry ──────────────────────────────────────────────────────────────────────

export type UpsertExternalIdentityEnvironmentInput = {
  environmentId: string
  displayName: string
  provider: string
  providerEnvironmentRef?: string | null
  issuerUrl: string
  jwksUri: string
  audience: string
  issuerClass: string
  subjectType?: string | null
  status?: string | null
  notes?: string | null
}

export const upsertExternalIdentityEnvironment = async (
  input: UpsertExternalIdentityEnvironmentInput,
  actor: ExternalAccessActor
): Promise<{ environment: ExternalIdentityEnvironment; created: boolean; changed: boolean }> => {
  const environmentId = assertEnvironmentId(input.environmentId)
  const displayName = assertNonEmptyString(input.displayName, 'displayName', 200)
  const provider = assertProvider(input.provider)
  const providerEnvironmentRef = optionalString(input.providerEnvironmentRef, 'providerEnvironmentRef', 200)
  const issuerUrl = assertHttpsUrl(input.issuerUrl, 'issuerUrl')
  const jwksUri = assertHttpsUrl(input.jwksUri, 'jwksUri')
  const audience = assertNonEmptyString(input.audience, 'audience', 512)
  const issuerClass = assertIssuerClass(input.issuerClass)
  const subjectType = assertSubjectType(input.subjectType)
  const status = assertEnvironmentStatus(input.status)
  const notes = optionalString(input.notes, 'notes')
  const performedBy = actorId(actor)

  return withTransaction(async client => {
    const existing = await loadEnvironmentForUpdate(client, environmentId)

    if (existing && existing.issuerClass !== issuerClass) {
      // La clase de autoridad no se cambia en caliente: sería re-clasificar tokens ya emitidos.
      throw new ExternalAccessError('conflict', 'issuerClass cannot change on an existing environment', {
        environmentId,
        currentIssuerClass: existing.issuerClass
      })
    }

    const unchanged =
      existing !== null &&
      existing.displayName === displayName &&
      existing.provider === provider &&
      existing.providerEnvironmentRef === providerEnvironmentRef &&
      existing.issuerUrl === issuerUrl &&
      existing.jwksUri === jwksUri &&
      existing.audience === audience &&
      existing.subjectType === subjectType &&
      existing.status === status &&
      existing.notes === notes

    if (unchanged) {
      return { environment: existing, created: false, changed: false }
    }

    const { rows } = await client.query<Parameters<typeof mapEnvironmentRow>[0]>(
      `INSERT INTO greenhouse_core.external_identity_environments (
         environment_id, display_name, provider, provider_environment_ref, issuer_url, jwks_uri, audience,
         issuer_class, subject_type, status, notes, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
       ON CONFLICT (environment_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         provider = EXCLUDED.provider,
         provider_environment_ref = EXCLUDED.provider_environment_ref,
         issuer_url = EXCLUDED.issuer_url,
         jwks_uri = EXCLUDED.jwks_uri,
         audience = EXCLUDED.audience,
         subject_type = EXCLUDED.subject_type,
         status = EXCLUDED.status,
         notes = EXCLUDED.notes,
         updated_by = EXCLUDED.updated_by,
         updated_at = CURRENT_TIMESTAMP
       RETURNING ${ENVIRONMENT_SELECT}`,
      [
        environmentId,
        displayName,
        provider,
        providerEnvironmentRef,
        issuerUrl,
        jwksUri,
        audience,
        issuerClass,
        subjectType,
        status,
        notes,
        performedBy
      ]
    )

    const environment = mapEnvironmentRow(rows[0]!)

    await appendAudit(client, {
      eventType: 'environment_upserted',
      environmentId,
      performedBy,
      metadata: {
        created: existing === null,
        previousIssuerUrl: existing?.issuerUrl ?? null,
        previousStatus: existing?.status ?? null,
        issuerUrl,
        status,
        issuerClass
      }
    })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
        aggregateId: environmentId,
        eventType: EVENT_TYPES.externalEnvironmentUpserted,
        payload: {
          schemaVersion: 1,
          environmentId,
          issuerUrl,
          issuerClass,
          status,
          previousIssuerUrl: existing?.issuerUrl ?? null,
          changedByUserId: performedBy
        }
      },
      client
    )

    return { environment, created: existing === null, changed: true }
  })
}

// ── Organization binding ──────────────────────────────────────────────────────────────────────

export type BindExternalOrganizationInput = {
  organizationId: string
  environmentId: string
  externalOrganizationRef: string
  designatedAdminProfileId?: string | null
  reason?: string | null
}

export const bindExternalOrganization = async (
  input: BindExternalOrganizationInput,
  actor: ExternalAccessActor
): Promise<{ binding: ExternalOrganizationBinding; created: boolean }> => {
  const organizationId = assertNonEmptyString(input.organizationId, 'organizationId', 128)
  const environmentId = assertEnvironmentId(input.environmentId)
  const externalOrganizationRef = assertNonEmptyString(input.externalOrganizationRef, 'externalOrganizationRef', 256)
  const designatedAdminProfileId = optionalString(input.designatedAdminProfileId, 'designatedAdminProfileId', 256)
  const reason = optionalString(input.reason, 'reason')
  const performedBy = actorId(actor)

  return withTransaction(async client => {
    const environment = await loadEnvironmentForUpdate(client, environmentId)

    if (!environment) {
      throw new ExternalAccessError('not_found', 'environment not found', { environmentId })
    }

    if (environment.status === 'suspended' || environment.status === 'retired') {
      throw new ExternalAccessError('environment_not_active', 'environment does not accept bindings', {
        environmentId,
        status: environment.status
      })
    }

    const { rows: organizationRows } = await client.query<{
      organization_type: string
      lifecycle_stage: string
      active: boolean
      status: string
    }>(
      `SELECT organization_type, lifecycle_stage, active, status
         FROM greenhouse_core.organizations
        WHERE organization_id = $1
        FOR SHARE`,
      [organizationId]
    )

    const organization = organizationRows[0] ?? null

    if (!organization) {
      throw new ExternalAccessError('not_found', 'organization not found', { organizationId })
    }

    // Sólo un cliente EXISTENTE y vigente de Account 360 entra en la cohorte. Nunca por dominio de
    // correo, nunca por signup, nunca una organización creada acá.
    if (
      !organization.active ||
      organization.status !== 'active' ||
      !['client', 'both'].includes(organization.organization_type) ||
      organization.lifecycle_stage !== 'active_client'
    ) {
      throw new ExternalAccessError('organization_not_eligible', 'organization is not an active client', {
        organizationId,
        organizationType: organization.organization_type,
        lifecycleStage: organization.lifecycle_stage
      })
    }

    if (designatedAdminProfileId) {
      const { rows: profileRows } = await client.query<{
        active: boolean
        status: string
        merged_into_profile_id: string | null
      }>(`SELECT active, status, merged_into_profile_id FROM greenhouse_core.identity_profiles WHERE profile_id = $1`, [
        designatedAdminProfileId
      ])

      const profile = profileRows[0] ?? null

      if (!profile || !profile.active || profile.status !== 'active' || profile.merged_into_profile_id) {
        throw new ExternalAccessError('invalid_request', 'designatedAdminProfileId is not an active profile', {
          field: 'designatedAdminProfileId'
        })
      }
    }

    const { rows: existingRows } = await client.query<Parameters<typeof mapBindingRow>[0]>(
      `SELECT ${BINDING_SELECT}
         FROM greenhouse_core.external_organization_bindings b
         JOIN greenhouse_core.organizations o ON o.organization_id = b.organization_id
        WHERE b.environment_id = $1
          AND b.status = 'active'
          AND (b.organization_id = $2 OR b.external_organization_ref = $3)
        FOR UPDATE OF b`,
      [environmentId, organizationId, externalOrganizationRef]
    )

    const sameOrganization = existingRows.map(mapBindingRow).find(row => row.organizationId === organizationId)

    if (sameOrganization) {
      if (sameOrganization.population !== 'external')
        throw new ExternalAccessError('conflict', 'binding population mismatch')

      if (sameOrganization.externalOrganizationRef === externalOrganizationRef) {
        return { binding: sameOrganization, created: false }
      }

      throw new ExternalAccessError('conflict', 'organization already bound with a different external reference', {
        bindingId: sameOrganization.bindingId
      })
    }

    if (existingRows.length > 0) {
      throw new ExternalAccessError(
        'conflict',
        'external organization reference already bound to another organization',
        {
          environmentId
        }
      )
    }

    const bindingId = buildExternalBindingId()

    await insertAuthorityBinding(client, {
      bindingId,
      organizationId,
      environmentId,
      externalOrganizationRef,
      population: 'external',
      reason,
      actorId: performedBy,
      designatedAdminProfileId
    })
    const binding = (await loadBindingForUpdate(client, bindingId))!

    return { binding, created: true }
  })
}

// ── Capability grants ─────────────────────────────────────────────────────────────────────────

export type GrantExternalCapabilityInput = {
  bindingId: string
  capability: string
  /** Opcional: restringe el grant a una persona ya ligada del binding. */
  profileId?: string | null
  reason?: string | null
}

export const grantExternalCapability = async (
  input: GrantExternalCapabilityInput,
  actor: ExternalAccessActor
): Promise<{ grant: ExternalCapabilityGrant; created: boolean; grantsVersion: number }> => {
  const bindingId = assertNonEmptyString(input.bindingId, 'bindingId', 128)
  const capability = assertCapability(input.capability)
  const profileId = optionalString(input.profileId, 'profileId', 256)
  const reason = optionalString(input.reason, 'reason')
  const performedBy = actorId(actor)

  return withTransaction(async client => {
    const binding = await requireActiveBinding(client, bindingId)

    if (profileId) {
      const { rows } = await client.query<{ invitation_id: string }>(
        `SELECT invitation_id FROM greenhouse_core.external_member_invitations
          WHERE binding_id = $1 AND profile_id = $2 AND status = 'linked'`,
        [bindingId, profileId]
      )

      if (rows.length === 0) {
        throw new ExternalAccessError('invalid_request', 'profileId is not a linked member of the binding', {
          field: 'profileId',
          bindingId
        })
      }
    }

    const { rows: existingRows } = await client.query<Parameters<typeof mapGrantRow>[0]>(
      `SELECT ${GRANT_SELECT}
         FROM greenhouse_core.external_capability_grants
        WHERE binding_id = $1 AND capability = $2 AND status = 'active'
          AND COALESCE(profile_id, '') = COALESCE($3::text, '')`,
      [bindingId, capability, profileId]
    )

    if (existingRows[0]) {
      return { grant: mapGrantRow(existingRows[0]), created: false, grantsVersion: binding.grantsVersion }
    }

    const grantId = buildExternalGrantId()

    const grantsVersion = await insertAuthorityGrant(client, {
      bindingId,
      environmentId: binding.environmentId,
      organizationId: binding.organizationId,
      population: 'external',
      grantId,
      capability,
      profileId,
      reason,
      actorId: performedBy
    })

    const { rows } = await client.query<Parameters<typeof mapGrantRow>[0]>(
      `SELECT ${GRANT_SELECT} FROM greenhouse_core.external_capability_grants WHERE grant_id=$1`,
      [grantId]
    )


return { grant: mapGrantRow(rows[0]!), created: true, grantsVersion }
  })
}

// ── Invitations ───────────────────────────────────────────────────────────────────────────────

export type IssueExternalInvitationInput = {
  bindingId: string
  email: string
  designatedAdmin?: boolean
  /** Persona existente a la que se ligará el subject; si falta, se resuelve al aceptar. */
  profileId?: string | null
  reason?: string | null
  expiresInHours?: number | null
  /** Recuperación (TASK-1830): revoca la invitación abierta anterior y emite una nueva. */
  reissue?: boolean
  /**
   * TASK-1837 — `system`: Greenhouse envía el correo en el mismo acto (post-commit) y el llamador NO
   * debe exponer `token`; `manual`: comportamiento previo (el token vuelve al llamador). Default:
   * `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED`.
   */
  delivery?: ExternalInvitationDeliveryMode
  /** Metadata auditada del acto (p. ej. `delegatedByProfileId`). Nunca secretos. */
  auditMetadata?: Record<string, unknown>
}

export type IssueExternalInvitationResult = {
  invitation: ExternalMemberInvitation
  /**
   * Sólo presente cuando se emitió una invitación nueva; nunca se persiste ni se vuelve a mostrar.
   * Con `delivery.mode === 'system'` el consumidor HTTP lo descarta: ya viajó en el correo.
   */
  token: string | null
  created: boolean
  /** TASK-1837 — resultado de entrega; es lo que reemplaza al token en las respuestas. */
  delivery: ExternalInvitationDelivery
}

type InsertInvitationInput = {
  bindingId: string
  profileId: string | null
  email: string
  designatedAdmin: boolean
  reason: string | null
  performedBy: string
  expiresInHours: number
  /** Intentos heredados de la cadena (reenvío = rotación: la fila nueva arrastra el conteo). */
  deliveryAttempts: number
}

/** Único INSERT de `external_member_invitations`: emisión, reenvío, revelación y delegación lo comparten. */
const insertInvitationRow = async (client: PoolClient, input: InsertInvitationInput) => {
  const token = generateInvitationToken()
  const invitationId = buildExternalInvitationId()

  const { rows } = await client.query<Parameters<typeof mapInvitationRow>[0]>(
    `INSERT INTO greenhouse_core.external_member_invitations (
       invitation_id, binding_id, profile_id, email, email_normalized, designated_admin, token_hash, status,
       reason, issued_by, expires_at, delivery_attempts
     ) VALUES ($1, $2, $3, $4, $4, $5, $6, 'issued', $7, $8, CURRENT_TIMESTAMP + ($9::int * INTERVAL '1 hour'), $10)
     RETURNING ${INVITATION_SELECT}`,
    [
      invitationId,
      input.bindingId,
      input.profileId,
      input.email,
      input.designatedAdmin,
      hashInvitationToken(token),
      input.reason,
      input.performedBy,
      input.expiresInHours,
      input.deliveryAttempts
    ]
  )

  return { invitation: mapInvitationRow(rows[0]!), token }
}

/**
 * Tope por binding/hora sobre el audit (emisiones + reenvíos + revelaciones). Anti-abuso y
 * anti-enumeración: nadie convierte la emisión en un oráculo de casillas a fuerza de llamadas.
 */
const assertBindingIssueRate = async (client: PoolClient, bindingId: string, limitPerHour: number) => {
  const { rows } = await client.query<{ n: string | number }>(
    `SELECT COUNT(*)::text AS n
       FROM greenhouse_core.external_identity_audit_log
      WHERE binding_id = $1
        AND event_type IN ('invitation_issued', 'invitation_resent', 'invitation_token_revealed')
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'`,
    [bindingId]
  )

  if (Number(rows[0]?.n ?? 0) >= limitPerHour) {
    throw new ExternalAccessError('rate_limited', 'too many invitations for this binding in the last hour', {
      bindingId,
      limitPerHour
    })
  }
}

/**
 * Un binding tiene UN administrador designado vigente. "Vigente" = su membership sigue `linked`.
 * Emitir otra invitación `designatedAdmin` mientras ese admin viva es `conflict`: no hay dos dueños
 * silenciosos; primero se revoca al anterior (`revokeExternalAccess`, scope member).
 */
const assertNoCompetingDesignatedAdmin = async (
  client: PoolClient,
  binding: ExternalOrganizationBinding,
  candidateProfileId: string | null
) => {
  if (!binding.designatedAdminProfileId || binding.designatedAdminProfileId === candidateProfileId) return

  const { rows } = await client.query<{ invitation_id: string }>(
    `SELECT invitation_id FROM greenhouse_core.external_member_invitations
      WHERE binding_id = $1 AND profile_id = $2 AND status = 'linked'
      LIMIT 1`,
    [binding.bindingId, binding.designatedAdminProfileId]
  )

  if (rows.length > 0) {
    throw new ExternalAccessError('conflict', 'binding already has an active designated admin', {
      bindingId: binding.bindingId,
      designatedAdminProfileId: binding.designatedAdminProfileId
    })
  }
}

const resolveDeliveryMode = (requested: ExternalInvitationDeliveryMode | undefined): ExternalInvitationDeliveryMode =>
  requested ?? (readExternalInvitationConfig().systemDeliveryEnabled ? 'system' : 'manual')

/**
 * Post-commit: envía el correo y registra el resultado. Nunca lanza: un fallo de envío deja la
 * invitación emitida con `delivery_status='failed'` y la respuesta lo DICE (honestidad de entrega);
 * jamás se responde "listo" sin correo.
 */
const deliverIssuedInvitation = async (
  issued: { invitation: ExternalMemberInvitation; token: string; environment: ExternalIdentityEnvironment; organizationName: string | null },
  actor: ExternalAccessActor,
  sender: InvitationEmailSender
): Promise<ExternalMemberInvitation> => {
  const sent = await sender({
    invitation: issued.invitation,
    environment: issued.environment,
    organizationName: issued.organizationName,
    token: issued.token
  })

  const recorded = await recordExternalInvitationDeliveryOutcome({
    invitationId: issued.invitation.invitationId,
    outcome: sent.status === 'sent' ? 'sent' : 'failed',
    errorCode: sent.status === 'sent' ? null : sent.errorCode,
    countsAsAttempt: true,
    actor,
    metadata: sent.status === 'sent' ? { deliveryId: sent.deliveryId } : {}
  })

  return recorded ?? issued.invitation
}

export type IssueExternalInvitationOptions = {
  /** Inyectable para tests; default `sendInvitationEmailViaPlatform`. */
  sender?: InvitationEmailSender
}

export const issueExternalInvitation = async (
  input: IssueExternalInvitationInput,
  actor: ExternalAccessActor,
  options: IssueExternalInvitationOptions = {}
): Promise<IssueExternalInvitationResult> => {
  const bindingId = assertNonEmptyString(input.bindingId, 'bindingId', 128)
  const email = normalizeEmail(input.email)
  const designatedAdmin = input.designatedAdmin === true
  const profileId = optionalString(input.profileId, 'profileId', 256)
  const reason = optionalString(input.reason, 'reason')
  const expiresInHours = assertPositiveInteger(input.expiresInHours, 'expiresInHours', 72, 24 * 30)
  const reissue = input.reissue === true
  const performedBy = actorId(actor)
  const deliveryMode = resolveDeliveryMode(input.delivery)
  const config = readExternalInvitationConfig()

  const committed = await withTransaction(async client => {
    const binding = await requireActiveBinding(client, bindingId)
    const environment = await loadEnvironmentForUpdate(client, binding.environmentId)

    if (profileId) {
      const { rows } = await client.query<{ active: boolean; status: string; merged_into_profile_id: string | null }>(
        `SELECT active, status, merged_into_profile_id FROM greenhouse_core.identity_profiles WHERE profile_id = $1`,
        [profileId]
      )

      const profile = rows[0] ?? null

      if (!profile || !profile.active || profile.status !== 'active' || profile.merged_into_profile_id) {
        throw new ExternalAccessError('invalid_request', 'profileId is not an active profile', { field: 'profileId' })
      }
    }

    const { rows: openRows } = await client.query<Parameters<typeof mapInvitationRow>[0]>(
      `SELECT ${INVITATION_SELECT}
         FROM greenhouse_core.external_member_invitations
        WHERE binding_id = $1 AND email_normalized = $2 AND status IN ('issued', 'accepted')
        FOR UPDATE`,
      [bindingId, email]
    )

    const open = openRows[0] ? mapInvitationRow(openRows[0]) : null

    if (open && !reissue) {
      return { kind: 'existing' as const, invitation: open }
    }

    if (designatedAdmin) await assertNoCompetingDesignatedAdmin(client, binding, profileId)
    await assertBindingIssueRate(client, bindingId, config.issueLimitPerBindingPerHour)

    if (open) {
      await client.query(
        `UPDATE greenhouse_core.external_member_invitations
            SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, revoked_by = $2,
                revoke_reason = 'reissued', updated_at = CURRENT_TIMESTAMP
          WHERE invitation_id = $1`,
        [open.invitationId, performedBy]
      )

      await appendAudit(client, {
        eventType: 'invitation_revoked',
        environmentId: binding.environmentId,
        bindingId,
        invitationId: open.invitationId,
        organizationId: binding.organizationId,
        profileId: open.profileId,
        performedBy,
        reason: 'reissued'
      })
    }

    const { invitation, token } = await insertInvitationRow(client, {
      bindingId,
      profileId,
      email,
      designatedAdmin,
      reason,
      performedBy,
      expiresInHours,
      deliveryAttempts: 0
    })

    await appendAudit(client, {
      eventType: 'invitation_issued',
      environmentId: binding.environmentId,
      bindingId,
      invitationId: invitation.invitationId,
      organizationId: binding.organizationId,
      profileId,
      performedBy,
      reason,
      metadata: { designatedAdmin, expiresInHours, reissue: open !== null, deliveryMode, ...(input.auditMetadata ?? {}) }
    })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
        aggregateId: bindingId,
        eventType: EVENT_TYPES.externalInvitationIssued,
        payload: {
          schemaVersion: 1,
          bindingId,
          invitationId: invitation.invitationId,
          organizationId: binding.organizationId,
          environmentId: binding.environmentId,
          designatedAdmin,
          profileId,
          reissue: open !== null,
          deliveryMode,
          changedByUserId: performedBy
        }
      },
      client
    )

    return {
      kind: 'created' as const,
      invitation,
      token,
      environment: environment!,
      organizationName: binding.organizationName
    }
  })

  if (committed.kind === 'existing') {
    return {
      invitation: committed.invitation,
      token: null,
      created: false,
      delivery: buildInvitationDelivery(committed.invitation, deliveryMode)
    }
  }

  if (deliveryMode === 'manual') {
    return {
      invitation: committed.invitation,
      token: committed.token,
      created: true,
      delivery: buildInvitationDelivery(committed.invitation, 'manual')
    }
  }

  const delivered = await deliverIssuedInvitation(
    committed,
    actor,
    options.sender ?? sendInvitationEmailViaPlatform
  )

  return {
    invitation: delivered,
    token: committed.token,
    created: true,
    delivery: buildInvitationDelivery(delivered, 'system')
  }
}

export type ResendExternalInvitationInput = {
  invitationId: string
  /** Contexto de la ruta: si viene y no coincide con el binding de la invitación ⇒ `not_found` (anti-oráculo). */
  bindingId?: string | null
  reason?: string | null
  expiresInHours?: number | null
  delivery?: ExternalInvitationDeliveryMode
}

/**
 * TASK-1837 — Reenviar es ROTAR, nunca reexpedir el mismo secreto (Ory/FusionAuth hacen lo mismo).
 * La invitación abierta queda `revoked` (`resent`), nace una fila nueva con token nuevo que hereda
 * el conteo de intentos de la cadena; el enlace anterior deja de valer en el mismo commit. Topes:
 * `resendLimitPerChain` (429) y el tope por binding/hora (429). Sólo una invitación `issued` se
 * reenvía: aceptada/ligada/revocada/expirada ⇒ `invitation_not_open`.
 */
export const resendExternalInvitation = async (
  input: ResendExternalInvitationInput,
  actor: ExternalAccessActor,
  options: IssueExternalInvitationOptions = {}
): Promise<IssueExternalInvitationResult> => {
  const invitationId = assertNonEmptyString(input.invitationId, 'invitationId', 128)
  const expectedBindingId = optionalString(input.bindingId, 'bindingId', 128)
  const reason = optionalString(input.reason, 'reason')
  const expiresInHours = assertPositiveInteger(input.expiresInHours, 'expiresInHours', 72, 24 * 30)
  const performedBy = actorId(actor)
  const deliveryMode = resolveDeliveryMode(input.delivery)
  const config = readExternalInvitationConfig()

  const committed = await withTransaction(async client => {
    const { rows } = await client.query<Parameters<typeof mapInvitationRow>[0]>(
      `SELECT ${INVITATION_SELECT}
         FROM greenhouse_core.external_member_invitations
        WHERE invitation_id = $1
        FOR UPDATE`,
      [invitationId]
    )

    const previous = rows[0] ? mapInvitationRow(rows[0]) : null

    if (!previous || (expectedBindingId && previous.bindingId !== expectedBindingId)) {
      throw new ExternalAccessError('not_found', 'invitation not found', { invitationId })
    }

    if (previous.status !== 'issued') {
      throw new ExternalAccessError('invitation_not_open', 'only an issued invitation can be resent', {
        invitationId,
        status: previous.status
      })
    }

    if (previous.deliveryAttempts >= config.resendLimitPerChain) {
      throw new ExternalAccessError('rate_limited', 'resend limit reached for this invitation', {
        invitationId,
        limit: config.resendLimitPerChain
      })
    }

    const binding = await requireActiveBinding(client, previous.bindingId)
    const environment = await loadEnvironmentForUpdate(client, binding.environmentId)

    await assertBindingIssueRate(client, binding.bindingId, config.issueLimitPerBindingPerHour)

    await client.query(
      `UPDATE greenhouse_core.external_member_invitations
          SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, revoked_by = $2,
              revoke_reason = 'resent', updated_at = CURRENT_TIMESTAMP
        WHERE invitation_id = $1`,
      [previous.invitationId, performedBy]
    )

    const { invitation, token } = await insertInvitationRow(client, {
      bindingId: binding.bindingId,
      profileId: previous.profileId,
      email: previous.email,
      designatedAdmin: previous.designatedAdmin,
      reason: reason ?? previous.reason,
      performedBy,
      expiresInHours,
      deliveryAttempts: previous.deliveryAttempts
    })

    await appendAudit(client, {
      eventType: 'invitation_resent',
      environmentId: binding.environmentId,
      bindingId: binding.bindingId,
      invitationId: invitation.invitationId,
      organizationId: binding.organizationId,
      profileId: previous.profileId,
      performedBy,
      reason,
      metadata: {
        previousInvitationId: previous.invitationId,
        previousDeliveryStatus: previous.deliveryStatus,
        inheritedAttempts: previous.deliveryAttempts,
        deliveryMode
      }
    })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
        aggregateId: binding.bindingId,
        eventType: EVENT_TYPES.externalInvitationIssued,
        payload: {
          schemaVersion: 1,
          bindingId: binding.bindingId,
          invitationId: invitation.invitationId,
          organizationId: binding.organizationId,
          environmentId: binding.environmentId,
          designatedAdmin: previous.designatedAdmin,
          profileId: previous.profileId,
          reissue: true,
          resendOfInvitationId: previous.invitationId,
          deliveryMode,
          changedByUserId: performedBy
        }
      },
      client
    )

    return { invitation, token, environment: environment!, organizationName: binding.organizationName }
  })

  if (deliveryMode === 'manual') {
    return {
      invitation: committed.invitation,
      token: committed.token,
      created: true,
      delivery: buildInvitationDelivery(committed.invitation, 'manual')
    }
  }

  const delivered = await deliverIssuedInvitation(committed, actor, options.sender ?? sendInvitationEmailViaPlatform)

  return { invitation: delivered, token: committed.token, created: true, delivery: buildInvitationDelivery(delivered, 'system') }
}

export type RevealExternalInvitationTokenInput = {
  invitationId: string
  bindingId?: string | null
  /** Obligatoria, ≥ 10 caracteres. Se audita; el valor del token NUNCA. */
  reason: string
}

export type RevealExternalInvitationTokenResult = {
  invitation: ExternalMemberInvitation
  /** Enlace de 1 hora. Existe sólo en esta respuesta. */
  token: string
  acceptanceUrl: string | null
  expiresAt: string
}

const REVEAL_REASON_MIN_LENGTH = 10

/**
 * TASK-1837 — Excepción gobernada: para la persona sin correo operativo. NO reexpone el secreto
 * (no existe en claro): ROTA la invitación abierta a una nueva de 1 hora sin enviar correo, y
 * devuelve ese token UNA vez. Capability `identity.external_invitation.reveal_token`, razón
 * obligatoria, audit `invitation_token_revealed` (actor + razón + invitation_id; jamás el token),
 * señal `identity.external_invitation.token_revealed` steady 0.
 */
export const revealExternalInvitationToken = async (
  input: RevealExternalInvitationTokenInput,
  actor: ExternalAccessActor
): Promise<RevealExternalInvitationTokenResult> => {
  const invitationId = assertNonEmptyString(input.invitationId, 'invitationId', 128)
  const expectedBindingId = optionalString(input.bindingId, 'bindingId', 128)
  const reason = assertNonEmptyString(input.reason, 'reason', 2000)
  const performedBy = actorId(actor)
  const config = readExternalInvitationConfig()

  if (reason.length < REVEAL_REASON_MIN_LENGTH) {
    throw new ExternalAccessError('invalid_request', 'reason must have at least 10 characters', {
      field: 'reason',
      minLength: REVEAL_REASON_MIN_LENGTH
    })
  }

  return withTransaction(async client => {
    const { rows } = await client.query<Parameters<typeof mapInvitationRow>[0]>(
      `SELECT ${INVITATION_SELECT}
         FROM greenhouse_core.external_member_invitations
        WHERE invitation_id = $1
        FOR UPDATE`,
      [invitationId]
    )

    const previous = rows[0] ? mapInvitationRow(rows[0]) : null

    if (!previous || (expectedBindingId && previous.bindingId !== expectedBindingId)) {
      throw new ExternalAccessError('not_found', 'invitation not found', { invitationId })
    }

    if (previous.status !== 'issued') {
      throw new ExternalAccessError('invitation_not_open', 'only an issued invitation can be revealed', {
        invitationId,
        status: previous.status
      })
    }

    const binding = await requireActiveBinding(client, previous.bindingId)
    const environment = await loadEnvironmentForUpdate(client, binding.environmentId)

    await assertBindingIssueRate(client, binding.bindingId, config.issueLimitPerBindingPerHour)

    await client.query(
      `UPDATE greenhouse_core.external_member_invitations
          SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, revoked_by = $2,
              revoke_reason = 'revealed', updated_at = CURRENT_TIMESTAMP
        WHERE invitation_id = $1`,
      [previous.invitationId, performedBy]
    )

    const { invitation, token } = await insertInvitationRow(client, {
      bindingId: binding.bindingId,
      profileId: previous.profileId,
      email: previous.email,
      designatedAdmin: previous.designatedAdmin,
      reason: previous.reason,
      performedBy,
      expiresInHours: config.revealedLinkTtlHours,
      deliveryAttempts: previous.deliveryAttempts
    })

    await appendAudit(client, {
      eventType: 'invitation_token_revealed',
      environmentId: binding.environmentId,
      bindingId: binding.bindingId,
      invitationId: invitation.invitationId,
      organizationId: binding.organizationId,
      profileId: previous.profileId,
      performedBy,
      reason,
      metadata: { previousInvitationId: previous.invitationId, ttlHours: config.revealedLinkTtlHours }
    })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
        aggregateId: binding.bindingId,
        eventType: EVENT_TYPES.externalInvitationIssued,
        payload: {
          schemaVersion: 1,
          bindingId: binding.bindingId,
          invitationId: invitation.invitationId,
          organizationId: binding.organizationId,
          environmentId: binding.environmentId,
          designatedAdmin: previous.designatedAdmin,
          profileId: previous.profileId,
          reissue: true,
          revealedFromInvitationId: previous.invitationId,
          deliveryMode: 'manual',
          changedByUserId: performedBy
        }
      },
      client
    )

    const resolved = environment ? resolveInvitationAcceptanceUrl(environment, token) : null

    return {
      invitation,
      token,
      acceptanceUrl: resolved?.ok ? resolved.url : null,
      expiresAt: invitation.expiresAt
    }
  })
}

export type AcceptExternalInvitationInput = {
  /** Token en claro entregado por `issueExternalInvitation`; se compara por hash. */
  token: string
  environmentId: string
  /** `sub` verificado por el emisor de ese environment. */
  subject: string
  /** Email verificado por el emisor (magic link/passkey); sólo se usa para ligar a una persona existente. */
  verifiedEmail?: string | null
  displayName?: string | null
}

export type AcceptExternalInvitationResult = {
  invitation: ExternalMemberInvitation
  profileId: string
  linkId: string
  bindingId: string
  organizationId: string
  profileCreated: boolean
  /**
   * Subjects ANTERIORES de esta misma persona en este environment que quedaron desactivados
   * (recuperación por re-invitación, TASK-1830). El emisor revoca su sesión y sus credenciales:
   * sin eso, quien tuviera el passkey viejo conservaría el acceso que la re-invitación pretende
   * quitarle.
   */
  supersededSubjects: string[]
}

/**
 * Liga el subject verificado a UNA persona canónica y convierte la invitación en membership.
 *
 * Resolución determinista de la persona (en este orden, sin fallback silencioso):
 *   1. `invitation.profile_id` si el operador la fijó al invitar;
 *   2. el source link `(environment, subject)` ya activo (re-invitación/recuperación);
 *   3. la persona activa cuyo `canonical_email` coincide EXACTAMENTE con el email de la invitación —
 *      que el emisor acaba de verificar — si hay UNA sola; dos o más ⇒ `identity_collision`
 *      (revisión manual), cero ⇒ se crea un `identity_profile` nuevo (`external_contact`).
 * El email nunca resuelve un token en el gateway: sólo participa acá, bajo invitación auditada.
 */
export const acceptExternalInvitation = async (
  input: AcceptExternalInvitationInput,
  actor: ExternalAccessActor
): Promise<AcceptExternalInvitationResult> => {
  const token = assertNonEmptyString(input.token, 'token', 512)
  const environmentId = assertEnvironmentId(input.environmentId)
  const subject = assertNonEmptyString(input.subject, 'subject', 1024)
  const verifiedEmail = input.verifiedEmail ? normalizeEmail(input.verifiedEmail) : null
  const displayName = optionalString(input.displayName, 'displayName', 200)
  const performedBy = actorId(actor)

  return withTransaction(async client => {
    await loadEnvironmentForUpdate(client, environmentId)

    const { rows: invitationRows } = await client.query<Parameters<typeof mapInvitationRow>[0]>(
      `SELECT ${INVITATION_SELECT}
         FROM greenhouse_core.external_member_invitations
        WHERE token_hash = $1
        FOR UPDATE`,
      [hashInvitationToken(token)]
    )

    const invitation = invitationRows[0] ? mapInvitationRow(invitationRows[0]) : null

    if (!invitation) {
      throw new ExternalAccessError('not_found', 'invitation not found')
    }

    if (invitation.status !== 'issued' && invitation.status !== 'accepted') {
      throw new ExternalAccessError('invitation_not_open', 'invitation is not open', {
        invitationId: invitation.invitationId,
        status: invitation.status
      })
    }

    if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
      await client.query(
        `UPDATE greenhouse_core.external_member_invitations
            SET status = 'expired', updated_at = CURRENT_TIMESTAMP
          WHERE invitation_id = $1`,
        [invitation.invitationId]
      )

      throw new ExternalAccessError('invitation_expired', 'invitation expired', {
        invitationId: invitation.invitationId
      })
    }

    if (verifiedEmail && verifiedEmail !== invitation.email.toLowerCase()) {
      throw new ExternalAccessError('invalid_request', 'verified email does not match the invitation', {
        invitationId: invitation.invitationId
      })
    }

    const binding = await requireActiveBinding(client, invitation.bindingId)

    if (binding.environmentId !== environmentId) {
      throw new ExternalAccessError('invalid_request', 'invitation belongs to another environment', {
        invitationId: invitation.invitationId
      })
    }

    const environment = await loadEnvironmentForUpdate(client, environmentId)

    if (!environment || environment.status !== 'active') {
      throw new ExternalAccessError('environment_not_active', 'environment is not active', { environmentId })
    }

    const sourceSystem = buildExternalIdpSourceSystem(environmentId)

    const { rows: subjectLinkRows } = await client.query<{ profile_id: string }>(
      `SELECT profile_id FROM greenhouse_core.identity_profile_source_links
        WHERE source_system = $1 AND source_object_type = $2 AND source_object_id = $3 AND active = TRUE`,
      [sourceSystem, EXTERNAL_IDP_SOURCE_OBJECT_TYPE, subject]
    )

    const subjectProfileId = subjectLinkRows[0]?.profile_id ?? null

    if (subjectLinkRows.length > 1) {
      throw new ExternalAccessError('identity_collision', 'subject resolves to more than one profile', {
        environmentId
      })
    }

    if (invitation.profileId && subjectProfileId && invitation.profileId !== subjectProfileId) {
      throw new ExternalAccessError('identity_collision', 'subject already linked to a different profile', {
        invitationId: invitation.invitationId
      })
    }

    let profileId = invitation.profileId ?? subjectProfileId
    let profileCreated = false

    if (!profileId) {
      const { rows: emailRows } = await client.query<{ profile_id: string }>(
        `SELECT profile_id FROM greenhouse_core.identity_profiles
          WHERE lower(canonical_email) = $1 AND active = TRUE AND status = 'active' AND merged_into_profile_id IS NULL
          ORDER BY created_at ASC`,
        [invitation.email.toLowerCase()]
      )

      if (emailRows.length > 1) {
        throw new ExternalAccessError('identity_collision', 'more than one active profile matches the invited email', {
          invitationId: invitation.invitationId,
          matches: emailRows.length
        })
      }

      profileId = emailRows[0]?.profile_id ?? null
    }

    if (!profileId) {
      const sourceInput = { sourceSystem, sourceObjectType: EXTERNAL_IDP_SOURCE_OBJECT_TYPE, sourceObjectId: subject }

      profileId = buildIdentityProfileId(sourceInput)

      await client.query(
        `INSERT INTO greenhouse_core.identity_profiles (
           profile_id, public_id, profile_type, canonical_email, full_name, status, active,
           primary_source_system, primary_source_object_type, primary_source_object_id
         ) VALUES ($1, $2, 'external_contact', $3, $4, 'active', TRUE, $5, $6, $7)`,
        [
          profileId,
          buildIdentityProfilePublicId(sourceInput),
          invitation.email,
          displayName ?? invitation.email,
          sourceSystem,
          EXTERNAL_IDP_SOURCE_OBJECT_TYPE,
          subject
        ]
      )
      profileCreated = true
    } else {
      const { rows: profileRows } = await client.query<{
        active: boolean
        status: string
        merged_into_profile_id: string | null
      }>(
        `SELECT active, status, merged_into_profile_id FROM greenhouse_core.identity_profiles WHERE profile_id = $1 FOR UPDATE`,
        [profileId]
      )

      const profile = profileRows[0] ?? null

      if (!profile || !profile.active || profile.status !== 'active' || profile.merged_into_profile_id) {
        throw new ExternalAccessError('conflict', 'target profile is not active', { profileId })
      }
    }

    await protectInternalSourceLinks(client, environmentId, profileId)

    const linkId = buildIdentitySourceLinkId({
      profileId,
      sourceSystem,
      sourceObjectType: EXTERNAL_IDP_SOURCE_OBJECT_TYPE,
      sourceObjectId: subject
    })

    // ON CONFLICT sobre el UNIQUE canónico (profile, system, type, id). El índice único parcial de
    // TASK-1631 garantiza además que el subject activo no viva en otro profile (ya verificado arriba).
    await client.query(
      `INSERT INTO greenhouse_core.identity_profile_source_links (
         link_id, profile_id, source_system, source_object_type, source_object_id,
         source_user_id, source_email, source_display_name, is_login_identity, active
       ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7, TRUE, TRUE)
       ON CONFLICT (profile_id, source_system, source_object_type, source_object_id) DO UPDATE SET
         source_email = EXCLUDED.source_email,
         source_display_name = COALESCE(EXCLUDED.source_display_name, greenhouse_core.identity_profile_source_links.source_display_name),
         is_login_identity = TRUE,
         active = TRUE,
         updated_at = CURRENT_TIMESTAMP`,
      [linkId, profileId, sourceSystem, EXTERNAL_IDP_SOURCE_OBJECT_TYPE, subject, invitation.email, displayName]
    )

    // Re-invitación (recuperación de TASK-1830): los subjects ANTERIORES de esta misma persona en
    // este environment dejan de estar activos.
    //
    // `deactivateOrphanSourceLinks` NO cubre esto: su condición es por PERFIL —«¿le queda alguna
    // membership linked?»— y tras una re-invitación la respuesta es sí, la nueva. Sin este UPDATE,
    // el subject viejo seguiría autenticando y la recuperación no recuperaría nada: quien tuviera
    // sus passkeys o su sesión conservaría el acceso.
    //
    // El índice único parcial de TASK-1631 garantiza un PERFIL por subject; esto garantiza lo
    // recíproco, un subject vivo por perfil y environment.
    const { rows: supersededLinkRows } = await client.query<{ source_object_id: string }>(
      `UPDATE greenhouse_core.identity_profile_source_links
          SET active = FALSE, is_login_identity = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE profile_id = $1
          AND source_system = $2
          AND source_object_type = $3
          AND source_object_id <> $4
          AND active
        RETURNING source_object_id`,
      [profileId, sourceSystem, EXTERNAL_IDP_SOURCE_OBJECT_TYPE, subject]
    )

    const supersededSubjects = supersededLinkRows.map(row => row.source_object_id)

    // Re-invitación: la membership anterior de la misma persona en el mismo binding queda superseded.
    const { rows: supersededRows } = await client.query<{ invitation_id: string }>(
      `UPDATE greenhouse_core.external_member_invitations
          SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, revoked_by = $3,
              revoke_reason = 'superseded_by_reinvitation', updated_at = CURRENT_TIMESTAMP
        WHERE binding_id = $1 AND profile_id = $2 AND status = 'linked' AND invitation_id <> $4
        RETURNING invitation_id`,
      [binding.bindingId, profileId, performedBy, invitation.invitationId]
    )

    const { rows: linkedRows } = await client.query<Parameters<typeof mapInvitationRow>[0]>(
      `UPDATE greenhouse_core.external_member_invitations
          SET status = 'linked', profile_id = $2, link_id = $3,
              accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP), linked_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE invitation_id = $1
        RETURNING ${INVITATION_SELECT}`,
      [invitation.invitationId, profileId, linkId]
    )

    if (invitation.designatedAdmin) {
      await client.query(
        `UPDATE greenhouse_core.external_organization_bindings
            SET designated_admin_profile_id = $2, updated_at = CURRENT_TIMESTAMP
          WHERE binding_id = $1`,
        [binding.bindingId, profileId]
      )
    }

    await appendAudit(client, {
      eventType: 'invitation_linked',
      environmentId,
      bindingId: binding.bindingId,
      invitationId: invitation.invitationId,
      organizationId: binding.organizationId,
      profileId,
      performedBy,
      metadata: {
        linkId,
        profileCreated,
        designatedAdmin: invitation.designatedAdmin,
        supersededInvitationIds: supersededRows.map(row => row.invitation_id)
      }
    })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
        aggregateId: binding.bindingId,
        eventType: EVENT_TYPES.externalInvitationLinked,
        payload: {
          schemaVersion: 1,
          bindingId: binding.bindingId,
          invitationId: invitation.invitationId,
          organizationId: binding.organizationId,
          environmentId,
          profileId,
          linkId,
          profileCreated,
          designatedAdmin: invitation.designatedAdmin,
          changedByUserId: performedBy
        }
      },
      client
    )

    return {
      invitation: mapInvitationRow(linkedRows[0]!),
      profileId,
      linkId,
      bindingId: binding.bindingId,
      organizationId: binding.organizationId,
      profileCreated,
      supersededSubjects
    }
  })
}

// ── Revocation ────────────────────────────────────────────────────────────────────────────────

export type RevokeExternalAccessInput =
  | { scope: 'binding'; bindingId: string; reason: string }
  | { scope: 'grant'; grantId: string; reason: string }
  | { scope: 'member'; bindingId: string; profileId: string; reason: string }
  | { scope: 'invitation'; invitationId: string; reason: string }

export type RevokeExternalAccessResult = {
  scope: ExternalRevocationScope
  changed: boolean
  bindingId: string | null
  grantsVersion: number | null
  revokedGrantIds: string[]
  revokedProfileIds: string[]
  revokedInvitationIds: string[]
}

const revokeGrantsOfBinding = async (
  client: PoolClient,
  bindingId: string,
  performedBy: string,
  reason: string,
  filter: { profileId?: string | null; grantId?: string | null } = {}
) => {
  const { rows } = await client.query<{ grant_id: string }>(
    `UPDATE greenhouse_core.external_capability_grants
        SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, revoked_by = $2, revoke_reason = $3,
            updated_at = CURRENT_TIMESTAMP
      WHERE binding_id = $1 AND status = 'active'
        AND ($4::text IS NULL OR profile_id = $4)
        AND ($5::text IS NULL OR grant_id = $5)
      RETURNING grant_id`,
    [bindingId, performedBy, reason, filter.profileId ?? null, filter.grantId ?? null]
  )

  return rows.map(row => row.grant_id)
}

const revokeMembersOfBinding = async (
  client: PoolClient,
  bindingId: string,
  performedBy: string,
  reason: string,
  profileId: string | null
) => {
  const { rows } = await client.query<{ invitation_id: string; profile_id: string | null }>(
    `UPDATE greenhouse_core.external_member_invitations
        SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, revoked_by = $2, revoke_reason = $3,
            updated_at = CURRENT_TIMESTAMP
      WHERE binding_id = $1 AND status IN ('issued', 'accepted', 'linked')
        AND ($4::text IS NULL OR profile_id = $4)
      RETURNING invitation_id, profile_id`,
    [bindingId, performedBy, reason, profileId]
  )

  return rows
}

export const revokeExternalAccess = async (
  input: RevokeExternalAccessInput,
  actor: ExternalAccessActor
): Promise<RevokeExternalAccessResult> => {
  const reason = assertNonEmptyString(input.reason, 'reason', 2000)
  const performedBy = actorId(actor)

  return withTransaction(async client => {
    if (input.scope === 'grant' || input.scope === 'invitation') {
      const table = input.scope === 'grant' ? 'external_capability_grants' : 'external_member_invitations'
      const key = input.scope === 'grant' ? 'grant_id' : 'invitation_id'
      const value = input.scope === 'grant' ? input.grantId : input.invitationId

      const lookup = await client.query<{ environment_id: string }>(
        `SELECT b.environment_id FROM greenhouse_core.${table} x JOIN greenhouse_core.external_organization_bindings b ON b.binding_id=x.binding_id WHERE x.${key}=$1`,
        [value]
      )

      if (!lookup.rows[0]) throw new ExternalAccessError('not_found', 'authority not found')
      await loadEnvironmentForUpdate(client, lookup.rows[0].environment_id)
    }

    if (input.scope === 'binding') {
      const bindingId = assertNonEmptyString(input.bindingId, 'bindingId', 128)
      const binding = await loadBindingForUpdate(client, bindingId)

      if (!binding) throw new ExternalAccessError('not_found', 'binding not found', { bindingId })

      if (binding.status === 'revoked') {
        return {
          scope: 'binding',
          changed: false,
          bindingId,
          grantsVersion: binding.grantsVersion,
          revokedGrantIds: [],
          revokedProfileIds: [],
          revokedInvitationIds: []
        }
      }

      const revokedGrantIds = await revokeGrantsOfBinding(client, bindingId, performedBy, reason)
      const members = await revokeMembersOfBinding(client, bindingId, performedBy, reason, null)

      await client.query(
        `UPDATE greenhouse_core.external_organization_bindings
            SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, revoked_by = $2, revoke_reason = $3,
                updated_at = CURRENT_TIMESTAMP
          WHERE binding_id = $1`,
        [bindingId, performedBy, reason]
      )

      const revokedProfileIds = Array.from(
        new Set(members.map(row => row.profile_id).filter((id): id is string => !!id))
      )

      for (const profileId of revokedProfileIds) {
        await deactivateOrphanSourceLinks(client, binding.environmentId, profileId)
      }

      const grantsVersion = await bumpGrantsVersion(client, bindingId)

      await appendAudit(client, {
        eventType: 'binding_revoked',
        environmentId: binding.environmentId,
        bindingId,
        organizationId: binding.organizationId,
        performedBy,
        reason,
        metadata: {
          grantsVersion,
          revokedGrantIds,
          revokedProfileIds,
          revokedInvitationIds: members.map(row => row.invitation_id)
        }
      })

      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
          aggregateId: bindingId,
          eventType: EVENT_TYPES.externalAccessRevoked,
          payload: {
            schemaVersion: 1,
            scope: 'binding',
            bindingId,
            organizationId: binding.organizationId,
            environmentId: binding.environmentId,
            grantsVersion,
            revokedGrantIds,
            revokedProfileIds,
            changedByUserId: performedBy
          }
        },
        client
      )

      return {
        scope: 'binding',
        changed: true,
        bindingId,
        grantsVersion,
        revokedGrantIds,
        revokedProfileIds,
        revokedInvitationIds: members.map(row => row.invitation_id)
      }
    }

    if (input.scope === 'grant') {
      const grantId = assertNonEmptyString(input.grantId, 'grantId', 128)

      const { rows } = await client.query<Parameters<typeof mapGrantRow>[0]>(
        `SELECT ${GRANT_SELECT} FROM greenhouse_core.external_capability_grants WHERE grant_id = $1 FOR UPDATE`,
        [grantId]
      )

      const grant = rows[0] ? mapGrantRow(rows[0]) : null

      if (!grant) throw new ExternalAccessError('not_found', 'grant not found', { grantId })

      const binding = await loadBindingForUpdate(client, grant.bindingId)

      if (!binding) throw new ExternalAccessError('not_found', 'binding not found', { bindingId: grant.bindingId })

      if (grant.status === 'revoked') {
        return {
          scope: 'grant',
          changed: false,
          bindingId: binding.bindingId,
          grantsVersion: binding.grantsVersion,
          revokedGrantIds: [],
          revokedProfileIds: [],
          revokedInvitationIds: []
        }
      }

      const revokedGrantIds = await revokeGrantsOfBinding(client, binding.bindingId, performedBy, reason, { grantId })
      const grantsVersion = await bumpGrantsVersion(client, binding.bindingId)

      await appendAudit(client, {
        eventType: 'grant_revoked',
        environmentId: binding.environmentId,
        bindingId: binding.bindingId,
        grantId,
        organizationId: binding.organizationId,
        profileId: grant.profileId,
        performedBy,
        reason,
        metadata: { capability: grant.capability, grantsVersion }
      })

      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
          aggregateId: binding.bindingId,
          eventType: EVENT_TYPES.externalAccessRevoked,
          payload: {
            schemaVersion: 1,
            scope: 'grant',
            bindingId: binding.bindingId,
            grantId,
            organizationId: binding.organizationId,
            environmentId: binding.environmentId,
            capability: grant.capability,
            profileId: grant.profileId,
            grantsVersion,
            changedByUserId: performedBy
          }
        },
        client
      )

      return {
        scope: 'grant',
        changed: true,
        bindingId: binding.bindingId,
        grantsVersion,
        revokedGrantIds,
        revokedProfileIds: [],
        revokedInvitationIds: []
      }
    }

    if (input.scope === 'member') {
      const bindingId = assertNonEmptyString(input.bindingId, 'bindingId', 128)
      const profileId = assertNonEmptyString(input.profileId, 'profileId', 256)
      const binding = await loadBindingForUpdate(client, bindingId)

      if (!binding) throw new ExternalAccessError('not_found', 'binding not found', { bindingId })

      const members = await revokeMembersOfBinding(client, bindingId, performedBy, reason, profileId)
      const revokedGrantIds = await revokeGrantsOfBinding(client, bindingId, performedBy, reason, { profileId })

      if (members.length === 0 && revokedGrantIds.length === 0) {
        return {
          scope: 'member',
          changed: false,
          bindingId,
          grantsVersion: binding.grantsVersion,
          revokedGrantIds: [],
          revokedProfileIds: [],
          revokedInvitationIds: []
        }
      }

      await deactivateOrphanSourceLinks(client, binding.environmentId, profileId)

      const grantsVersion = await bumpGrantsVersion(client, bindingId)

      await appendAudit(client, {
        eventType: 'member_revoked',
        environmentId: binding.environmentId,
        bindingId,
        organizationId: binding.organizationId,
        profileId,
        performedBy,
        reason,
        metadata: { grantsVersion, revokedGrantIds, revokedInvitationIds: members.map(row => row.invitation_id) }
      })

      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
          aggregateId: bindingId,
          eventType: EVENT_TYPES.externalAccessRevoked,
          payload: {
            schemaVersion: 1,
            scope: 'member',
            bindingId,
            organizationId: binding.organizationId,
            environmentId: binding.environmentId,
            profileId,
            grantsVersion,
            revokedGrantIds,
            changedByUserId: performedBy
          }
        },
        client
      )

      return {
        scope: 'member',
        changed: true,
        bindingId,
        grantsVersion,
        revokedGrantIds,
        revokedProfileIds: [profileId],
        revokedInvitationIds: members.map(row => row.invitation_id)
      }
    }

    const invitationId = assertNonEmptyString(input.invitationId, 'invitationId', 128)

    const { rows } = await client.query<Parameters<typeof mapInvitationRow>[0]>(
      `SELECT ${INVITATION_SELECT} FROM greenhouse_core.external_member_invitations WHERE invitation_id = $1 FOR UPDATE`,
      [invitationId]
    )

    const invitation = rows[0] ? mapInvitationRow(rows[0]) : null

    if (!invitation) throw new ExternalAccessError('not_found', 'invitation not found', { invitationId })

    const binding = await loadBindingForUpdate(client, invitation.bindingId)

    if (!binding) throw new ExternalAccessError('not_found', 'binding not found', { bindingId: invitation.bindingId })

    if (invitation.status !== 'issued' && invitation.status !== 'accepted') {
      // Una invitación ya ligada es una membership: se revoca con scope `member`.
      return {
        scope: 'invitation',
        changed: false,
        bindingId: binding.bindingId,
        grantsVersion: binding.grantsVersion,
        revokedGrantIds: [],
        revokedProfileIds: [],
        revokedInvitationIds: []
      }
    }

    await client.query(
      `UPDATE greenhouse_core.external_member_invitations
          SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, revoked_by = $2, revoke_reason = $3,
              updated_at = CURRENT_TIMESTAMP
        WHERE invitation_id = $1`,
      [invitationId, performedBy, reason]
    )

    await appendAudit(client, {
      eventType: 'invitation_revoked',
      environmentId: binding.environmentId,
      bindingId: binding.bindingId,
      invitationId,
      organizationId: binding.organizationId,
      profileId: invitation.profileId,
      performedBy,
      reason
    })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
        aggregateId: binding.bindingId,
        eventType: EVENT_TYPES.externalAccessRevoked,
        payload: {
          schemaVersion: 1,
          scope: 'invitation',
          bindingId: binding.bindingId,
          invitationId,
          organizationId: binding.organizationId,
          environmentId: binding.environmentId,
          grantsVersion: binding.grantsVersion,
          changedByUserId: performedBy
        }
      },
      client
    )

    return {
      scope: 'invitation',
      changed: true,
      bindingId: binding.bindingId,
      grantsVersion: binding.grantsVersion,
      revokedGrantIds: [],
      revokedProfileIds: [],
      revokedInvitationIds: [invitationId]
    }
  })
}
