import type { PoolClient } from 'pg'

import { deleteExternalCanaryAuthArtifacts } from '@/lib/auth-server/maintenance/external-canary-cleanup'
import { query, withTransaction } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { appendAudit, insertAuthorityBinding } from './authority-transactions'
import { revokeExternalAccess } from './commands'
import { ExternalAccessError } from './errors'
import {
  buildExternalBindingId,
  buildExternalCanaryOrganizationId,
  buildExternalCanaryOrganizationPublicId,
  buildExternalCanaryRegistrationId,
  buildExternalIdpSourceSystem,
  EXTERNAL_IDP_SOURCE_OBJECT_TYPE
} from './ids'
import {
  BINDING_SELECT,
  CANARY_REGISTRATION_SELECT,
  mapBindingRow,
  mapCanaryRegistrationRow,
  type CanaryRegistrationRow
} from './store'
import {
  EXTERNAL_CANARY_CAPABILITY,
  type ExternalAccessActor,
  type ExternalCanaryRegistration,
  type ExternalOrganizationBinding
} from './types'
import { assertEnvironmentId, assertNonEmptyString } from './validation'

const RUN_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,127}$/
const REGISTRATION_ID_PATTERN = /^xcr-[0-9a-f-]{36}$/
const ORGANIZATION_ID_PATTERN = /^org-[0-9a-f-]{36}$/
const ORGANIZATION_PUBLIC_ID_PATTERN = /^EO-CANARY-[0-9a-f-]{36}$/
const MAX_TTL_MS = 30 * 24 * 60 * 60 * 1000
const MIN_TTL_MS = 60 * 60 * 1000

const requireReason = (value: unknown) => {
  const reason = assertNonEmptyString(value, 'reason', 2000)

  if (reason.length < 10)
    throw new ExternalAccessError('invalid_request', 'reason must have at least 10 characters', { field: 'reason' })

  return reason
}

const requireIdShape = (value: unknown, field: string, pattern: RegExp) => {
  const id = assertNonEmptyString(value, field, 128)

  if (!pattern.test(id)) throw new ExternalAccessError('invalid_request', `${field} has an invalid shape`, { field })

  return id
}

const requireFutureExpiry = (value: unknown) => {
  const raw = assertNonEmptyString(value, 'expiresAt', 64)
  const expiresAt = new Date(raw)
  const ttl = expiresAt.getTime() - Date.now()

  if (!Number.isFinite(expiresAt.getTime()) || ttl < MIN_TTL_MS || ttl > MAX_TTL_MS) {
    throw new ExternalAccessError('invalid_request', 'expiresAt must be between 1 hour and 30 days from now', {
      field: 'expiresAt'
    })
  }

  return expiresAt
}

const actorId = (actor: ExternalAccessActor) => assertNonEmptyString(actor.actorId, 'actorId', 256)

export type PlannedExternalCanaryFixture = {
  runId: string
  canaryRegistrationId: string
  organizationId: string
  organizationPublicId: string
}

/**
 * Genera los identificadores ANTES del primer write. El operador/script debe escribirlos en el
 * manifiesto y pasarlos sin cambios a `createExternalCanaryFixture`.
 */
export const planExternalCanaryFixture = (runIdInput: string): PlannedExternalCanaryFixture => {
  const runId = assertNonEmptyString(runIdInput, 'runId', 128)

  if (!RUN_ID_PATTERN.test(runId))
    throw new ExternalAccessError('invalid_request', 'runId has an invalid shape', { field: 'runId' })

  return {
    runId,
    canaryRegistrationId: buildExternalCanaryRegistrationId(),
    organizationId: buildExternalCanaryOrganizationId(),
    organizationPublicId: buildExternalCanaryOrganizationPublicId()
  }
}

export type CreateExternalCanaryFixtureInput = PlannedExternalCanaryFixture & {
  environmentId: string
  externalOrganizationRef: string
  expiresAt: string
  reason: string
}

export const createExternalCanaryFixture = async (
  input: CreateExternalCanaryFixtureInput,
  actor: ExternalAccessActor
): Promise<{ registration: ExternalCanaryRegistration; created: boolean }> => {
  const runId = requireIdShape(input.runId, 'runId', RUN_ID_PATTERN)

  const canaryRegistrationId = requireIdShape(
    input.canaryRegistrationId,
    'canaryRegistrationId',
    REGISTRATION_ID_PATTERN
  )

  const organizationId = requireIdShape(input.organizationId, 'organizationId', ORGANIZATION_ID_PATTERN)

  const organizationPublicId = requireIdShape(
    input.organizationPublicId,
    'organizationPublicId',
    ORGANIZATION_PUBLIC_ID_PATTERN
  )

  const environmentId = assertEnvironmentId(input.environmentId)
  const externalOrganizationRef = assertNonEmptyString(input.externalOrganizationRef, 'externalOrganizationRef', 256)
  const expiresAt = requireFutureExpiry(input.expiresAt)
  const reason = requireReason(input.reason)
  const performedBy = actorId(actor)

  return withTransaction(async client => {
    const existing = await client.query<CanaryRegistrationRow>(
      `SELECT ${CANARY_REGISTRATION_SELECT}
         FROM greenhouse_core.external_canary_registrations r
         JOIN greenhouse_core.organizations o ON o.organization_id=r.organization_id
        WHERE r.run_id=$1 OR r.canary_registration_id=$2
        FOR UPDATE OF r`,
      [runId, canaryRegistrationId]
    )

    if (existing.rows[0]) {
      const registration = mapCanaryRegistrationRow(existing.rows[0])

      const exact =
        registration.runId === runId &&
        registration.canaryRegistrationId === canaryRegistrationId &&
        registration.organizationId === organizationId &&
        registration.organizationPublicId === organizationPublicId &&
        registration.environmentId === environmentId &&
        registration.externalOrganizationRef === externalOrganizationRef &&
        registration.expiresAt === expiresAt.toISOString()

      if (!exact)
        throw new ExternalAccessError('conflict', 'canary manifest identifiers conflict with an existing registration')

      return { registration, created: false }
    }

    const environment = await client.query<{ issuer_class: string; status: string }>(
      `SELECT issuer_class,status FROM greenhouse_core.external_identity_environments
        WHERE environment_id=$1 FOR SHARE`,
      [environmentId]
    )

    const environmentRow = environment.rows[0]

    if (!environmentRow) throw new ExternalAccessError('not_found', 'environment not found', { environmentId })

    if (environmentRow.issuer_class !== 'external' || environmentRow.status !== 'active') {
      throw new ExternalAccessError('environment_not_active', 'environment does not accept external canaries', {
        environmentId,
        status: environmentRow.status
      })
    }

    await client.query(
      `INSERT INTO greenhouse_core.organizations (
         organization_id,public_id,organization_name,organization_type,status,active,is_operating_entity,
         lifecycle_stage,lifecycle_stage_since,lifecycle_stage_source,lifecycle_stage_by,origin,notes,
         tax_id,tax_id_type,hubspot_company_id,created_at,updated_at
       ) VALUES ($1,$2,$3,'other','inactive',FALSE,FALSE,'disqualified',NOW(),'operator_override',$4,
                 'manual',$5,NULL,NULL,NULL,NOW(),NOW())`,
      [
        organizationId,
        organizationPublicId,
        `Efeonce MCP Canary — ${runId}`,
        performedBy,
        `TASK-1832 synthetic canary fixture; registration ${canaryRegistrationId}`
      ]
    )

    const inserted = await client.query<CanaryRegistrationRow>(
      `INSERT INTO greenhouse_core.external_canary_registrations (
         canary_registration_id,run_id,organization_id,environment_id,external_organization_ref,
         capability,status,reason,registered_by,expires_at
       ) VALUES ($1,$2,$3,$4,$5,$6,'active',$7,$8,$9)
       RETURNING canary_registration_id,run_id,organization_id,$10::text AS public_id,$11::text AS organization_name,
         environment_id,external_organization_ref,capability,status,reason,registered_by,registered_at,expires_at,
         revoked_by,revoked_at,revoke_reason`,
      [
        canaryRegistrationId,
        runId,
        organizationId,
        environmentId,
        externalOrganizationRef,
        EXTERNAL_CANARY_CAPABILITY,
        reason,
        performedBy,
        expiresAt,
        organizationPublicId,
        `Efeonce MCP Canary — ${runId}`
      ]
    )

    await appendAudit(client, {
      eventType: 'canary_registered',
      environmentId,
      organizationId,
      performedBy,
      reason,
      metadata: {
        canaryRegistrationId,
        runId,
        capability: EXTERNAL_CANARY_CAPABILITY,
        expiresAt: expiresAt.toISOString()
      }
    })
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.externalCanaryRegistration,
        aggregateId: canaryRegistrationId,
        eventType: EVENT_TYPES.externalCanaryRegistered,
        payload: {
          schemaVersion: 1,
          canaryRegistrationId,
          runId,
          organizationId,
          environmentId,
          capability: EXTERNAL_CANARY_CAPABILITY,
          expiresAt: expiresAt.toISOString(),
          changedByUserId: performedBy
        }
      },
      client
    )

    return { registration: mapCanaryRegistrationRow(inserted.rows[0]!), created: true }
  })
}

export type BindExternalCanaryOrganizationInput = {
  canaryRegistrationId: string
  reason: string
}

export const bindExternalCanaryOrganization = async (
  input: BindExternalCanaryOrganizationInput,
  actor: ExternalAccessActor
): Promise<{ binding: ExternalOrganizationBinding; created: boolean }> => {
  const canaryRegistrationId = requireIdShape(
    input.canaryRegistrationId,
    'canaryRegistrationId',
    REGISTRATION_ID_PATTERN
  )

  const reason = requireReason(input.reason)
  const performedBy = actorId(actor)

  return withTransaction(async client => {
    const lookup = await client.query<
      CanaryRegistrationRow & {
        organization_type: string
        lifecycle_stage: string
        organization_active: boolean
        organization_status: string
        tax_id: string | null
        hubspot_company_id: string | null
      }
    >(
      `SELECT ${CANARY_REGISTRATION_SELECT},o.organization_type,o.lifecycle_stage,o.active AS organization_active,
              o.status AS organization_status,o.tax_id,o.hubspot_company_id
         FROM greenhouse_core.external_canary_registrations r
         JOIN greenhouse_core.organizations o ON o.organization_id=r.organization_id
        WHERE r.canary_registration_id=$1 FOR UPDATE OF r,o`,
      [canaryRegistrationId]
    )

    const row = lookup.rows[0]

    if (!row) throw new ExternalAccessError('canary_not_registered', 'canary registration not found')

    if (row.status !== 'active' || new Date(row.expires_at).getTime() <= Date.now()) {
      throw new ExternalAccessError('canary_expired', 'canary registration is revoked or expired', {
        canaryRegistrationId
      })
    }

    if (
      row.organization_active ||
      row.organization_status !== 'inactive' ||
      row.organization_type !== 'other' ||
      row.lifecycle_stage !== 'disqualified' ||
      row.tax_id ||
      row.hubspot_company_id
    ) {
      throw new ExternalAccessError('organization_not_eligible', 'canary organization lost its isolated posture', {
        canaryRegistrationId
      })
    }

    const blockers = await client.query<{ lifecycle: string; spaces: string; memberships: string }>(
      `SELECT
        (SELECT count(*)::text FROM greenhouse_core.organization_lifecycle_history WHERE organization_id=$1) AS lifecycle,
        (SELECT count(*)::text FROM greenhouse_core.spaces WHERE organization_id=$1) AS spaces,
        (SELECT count(*)::text FROM greenhouse_core.person_memberships WHERE organization_id=$1) AS memberships`,
      [row.organization_id]
    )

    if (Object.values(blockers.rows[0] ?? {}).some(value => Number(value) > 0)) {
      throw new ExternalAccessError('organization_not_eligible', 'canary organization has non-canary references', {
        canaryRegistrationId
      })
    }

    const existing = await client.query<Parameters<typeof mapBindingRow>[0]>(
      `SELECT ${BINDING_SELECT}
         FROM greenhouse_core.external_organization_bindings b
         JOIN greenhouse_core.organizations o ON o.organization_id=b.organization_id
        WHERE b.canary_registration_id=$1 OR
          (b.environment_id=$2 AND b.status='active'
           AND (b.organization_id=$3 OR b.external_organization_ref=$4))
        FOR UPDATE OF b`,
      [canaryRegistrationId, row.environment_id, row.organization_id, row.external_organization_ref]
    )

    if (existing.rows[0]) {
      const binding = mapBindingRow(existing.rows[0])

      if (binding.canaryRegistrationId === canaryRegistrationId && binding.bindingPurpose === 'canary') {
        return { binding, created: false }
      }

      throw new ExternalAccessError('conflict', 'canary organization or external reference is already bound')
    }

    const bindingId = buildExternalBindingId()
    const expiresAt = new Date(row.expires_at)

    await insertAuthorityBinding(client, {
      bindingId,
      organizationId: row.organization_id,
      environmentId: row.environment_id,
      externalOrganizationRef: row.external_organization_ref,
      population: 'external',
      bindingPurpose: 'canary',
      canaryRegistrationId,
      expiresAt,
      actorId: performedBy,
      reason,
      designatedAdminProfileId: null
    })

    const inserted = await client.query<Parameters<typeof mapBindingRow>[0]>(
      `SELECT ${BINDING_SELECT} FROM greenhouse_core.external_organization_bindings b
        JOIN greenhouse_core.organizations o ON o.organization_id=b.organization_id WHERE b.binding_id=$1`,
      [bindingId]
    )

    return { binding: mapBindingRow(inserted.rows[0]!), created: true }
  })
}

export const revokeExternalCanaryFixture = async (
  input: { canaryRegistrationId: string; reason: string },
  actor: ExternalAccessActor
): Promise<{ registration: ExternalCanaryRegistration; bindingRevoked: boolean }> => {
  const canaryRegistrationId = requireIdShape(
    input.canaryRegistrationId,
    'canaryRegistrationId',
    REGISTRATION_ID_PATTERN
  )

  const reason = requireReason(input.reason)
  const performedBy = actorId(actor)

  const bindingRows = await query<{ binding_id: string; status: string }>(
    `SELECT binding_id,status FROM greenhouse_core.external_organization_bindings
      WHERE canary_registration_id=$1`,
    [canaryRegistrationId]
  )

  let bindingRevoked = false

  if (bindingRows[0]?.status === 'active') {
    const result = await revokeExternalAccess({ scope: 'binding', bindingId: bindingRows[0].binding_id, reason }, actor)

    bindingRevoked = result.changed
  }

  return withTransaction(async client => {
    const lookup = await client.query<CanaryRegistrationRow>(
      `SELECT ${CANARY_REGISTRATION_SELECT}
         FROM greenhouse_core.external_canary_registrations r
         JOIN greenhouse_core.organizations o ON o.organization_id=r.organization_id
        WHERE r.canary_registration_id=$1 FOR UPDATE OF r`,
      [canaryRegistrationId]
    )

    const current = lookup.rows[0] ? mapCanaryRegistrationRow(lookup.rows[0]) : null

    if (!current) throw new ExternalAccessError('canary_not_registered', 'canary registration not found')
    if (current.status === 'revoked') return { registration: current, bindingRevoked }

    const updated = await client.query<CanaryRegistrationRow>(
      `UPDATE greenhouse_core.external_canary_registrations r
          SET status='revoked',revoked_by=$2,revoked_at=NOW(),revoke_reason=$3,updated_at=NOW()
        WHERE r.canary_registration_id=$1
        RETURNING r.*, $4::text AS public_id, $5::text AS organization_name`,
      [canaryRegistrationId, performedBy, reason, current.organizationPublicId, current.organizationName]
    )

    await appendAudit(client, {
      eventType: 'canary_revoked',
      environmentId: current.environmentId,
      organizationId: current.organizationId,
      bindingId: bindingRows[0]?.binding_id ?? null,
      performedBy,
      reason,
      metadata: { canaryRegistrationId, runId: current.runId, bindingRevoked }
    })
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.externalCanaryRegistration,
        aggregateId: canaryRegistrationId,
        eventType: EVENT_TYPES.externalCanaryRevoked,
        payload: {
          schemaVersion: 1,
          canaryRegistrationId,
          runId: current.runId,
          organizationId: current.organizationId,
          environmentId: current.environmentId,
          bindingId: bindingRows[0]?.binding_id ?? null,
          changedByUserId: performedBy
        }
      },
      client
    )

    return { registration: mapCanaryRegistrationRow(updated.rows[0]!), bindingRevoked }
  })
}

type ForeignKeyReference = {
  target: 'organization' | 'binding' | 'profile' | 'source_link' | 'registration' | 'session' | 'oauth_client'
  sourceSchema: string
  sourceTable: string
  sourceColumn: string
  count: number
  expected: boolean
}

export type ExternalCanaryCleanupPlan = {
  canaryRegistrationId: string
  runId: string
  environmentId: string
  organizationId: string
  bindingIds: string[]
  profileIds: string[]
  sourceLinkIds: string[]
  oauthClientIds: string[]
  subjectCount: number
  registrationRevoked: boolean
  activeAuthorityCount: number
  activeAuthCount: number
  authArtifacts: Record<string, number>
  foreignKeyReferences: ForeignKeyReference[]
  logicalBlockers: string[]
  unexpectedRefs: number
  deletionReady: boolean
}

const quoteIdentifier = (identifier: string) => `"${identifier.replaceAll('"', '""')}"`

const EXPECTED_FK_SOURCES = new Set([
  'organization:greenhouse_core.external_canary_registrations.organization_id',
  'organization:greenhouse_core.external_organization_bindings.organization_id',
  'binding:greenhouse_core.external_capability_grants.binding_id',
  'binding:greenhouse_core.external_member_invitations.binding_id',
  'profile:greenhouse_core.external_capability_grants.profile_id',
  'profile:greenhouse_core.external_member_invitations.profile_id',
  'profile:greenhouse_core.identity_profile_source_links.profile_id',
  'profile:greenhouse_auth.authorization_contexts.profile_id',
  'source_link:greenhouse_core.external_member_invitations.link_id',
  'source_link:greenhouse_auth.sessions.link_id',
  'source_link:greenhouse_auth.authorization_contexts.upstream_link_id',
  'organization:greenhouse_auth.authorization_contexts.organization_id',
  'binding:greenhouse_auth.authorization_contexts.binding_id',
  'oauth_client:greenhouse_auth.authorization_codes.client_id',
  'oauth_client:greenhouse_auth.refresh_tokens.client_id',
  'oauth_client:greenhouse_auth.access_tokens.client_id',
  'oauth_client:greenhouse_auth.client_consents.client_id',
  'oauth_client:greenhouse_auth.authorization_contexts.client_id',
  'registration:greenhouse_core.external_organization_bindings.canary_registration_id'
])

const EMPTY_AUTH_ARTIFACTS = {
  sessions: 0,
  magicLinks: 0,
  passkeyCredentials: 0,
  passkeyChallenges: 0,
  totpEnrollments: 0,
  authorizationCodes: 0,
  refreshTokens: 0,
  accessTokens: 0,
  clientConsents: 0,
  authorizationContexts: 0,
  oauthClients: 0
} as const

const censusForeignKeys = async (
  client: PoolClient,
  target: ForeignKeyReference['target'],
  relation: string,
  targetColumn: string,
  values: string[]
): Promise<ForeignKeyReference[]> => {
  if (values.length === 0) return []

  const catalog = await client.query<{
    source_schema: string
    source_table: string
    source_column: string
    columns: number | string
  }>(
    `SELECT ns.nspname AS source_schema,c.relname AS source_table,a.attname AS source_column,
            cardinality(fk.conkey) AS columns
       FROM pg_constraint fk
       JOIN pg_class c ON c.oid=fk.conrelid
       JOIN pg_namespace ns ON ns.oid=c.relnamespace
       JOIN pg_attribute a ON a.attrelid=fk.conrelid AND a.attnum=fk.conkey[1]
       JOIN pg_attribute ta ON ta.attrelid=fk.confrelid AND ta.attnum=fk.confkey[1]
      WHERE fk.contype='f' AND fk.confrelid=$1::regclass AND ta.attname=$2
      ORDER BY ns.nspname,c.relname,a.attname`,
    [relation, targetColumn]
  )

  const references: ForeignKeyReference[] = []

  for (const row of catalog.rows) {
    if (Number(row.columns) !== 1) {
      references.push({
        target,
        sourceSchema: row.source_schema,
        sourceTable: row.source_table,
        sourceColumn: row.source_column,
        count: 1,
        expected: false
      })
      continue
    }

    const count = await client.query<{ total: string }>(
      `SELECT count(*)::text AS total FROM ${quoteIdentifier(row.source_schema)}.${quoteIdentifier(row.source_table)}
        WHERE ${quoteIdentifier(row.source_column)}::text = ANY($1::text[])`,
      [values]
    )

    const source = `${target}:${row.source_schema}.${row.source_table}.${row.source_column}`

    references.push({
      target,
      sourceSchema: row.source_schema,
      sourceTable: row.source_table,
      sourceColumn: row.source_column,
      count: Number(count.rows[0]?.total ?? 0),
      expected: EXPECTED_FK_SOURCES.has(source)
    })
  }

  return references
}

const buildCleanupPlan = async (
  client: PoolClient,
  canaryRegistrationId: string
): Promise<ExternalCanaryCleanupPlan> => {
  const registration = await client.query<
    CanaryRegistrationRow & {
      organization_type: string
      lifecycle_stage: string
      organization_active: boolean
      organization_status: string
      tax_id: string | null
      hubspot_company_id: string | null
    }
  >(
    `SELECT ${CANARY_REGISTRATION_SELECT},o.organization_type,o.lifecycle_stage,o.active AS organization_active,
            o.status AS organization_status,o.tax_id,o.hubspot_company_id
       FROM greenhouse_core.external_canary_registrations r
       JOIN greenhouse_core.organizations o ON o.organization_id=r.organization_id
      WHERE r.canary_registration_id=$1 FOR UPDATE OF r,o`,
    [canaryRegistrationId]
  )

  const row = registration.rows[0]

  if (!row) throw new ExternalAccessError('canary_not_registered', 'canary registration not found')

  const bindings = await client.query<{ binding_id: string; status: string }>(
    `SELECT binding_id,status FROM greenhouse_core.external_organization_bindings
      WHERE canary_registration_id=$1 FOR UPDATE`,
    [canaryRegistrationId]
  )

  const bindingIds = bindings.rows.map(item => item.binding_id)

  const profiles =
    bindingIds.length === 0
      ? { rows: [] as Array<{ profile_id: string }> }
      : await client.query<{ profile_id: string }>(
          `SELECT DISTINCT owned.profile_id
             FROM (
               SELECT profile_id FROM greenhouse_core.external_member_invitations
                WHERE binding_id=ANY($1::text[])
               UNION ALL
               SELECT profile_id FROM greenhouse_core.external_capability_grants
                WHERE binding_id=ANY($1::text[])
             ) owned
            WHERE owned.profile_id IS NOT NULL`,
          [bindingIds]
        )

  const profileIds = profiles.rows.map(item => item.profile_id)

  const invitationLinks =
    bindingIds.length === 0
      ? { rows: [] as Array<{ link_id: string }> }
      : await client.query<{ link_id: string }>(
          `SELECT DISTINCT link_id FROM greenhouse_core.external_member_invitations
            WHERE binding_id=ANY($1::text[]) AND link_id IS NOT NULL`,
          [bindingIds]
        )

  const invitationLinkIds = invitationLinks.rows.map(item => item.link_id)

  const links =
    profileIds.length === 0 && invitationLinkIds.length === 0
      ? {
          rows: [] as Array<{
            link_id: string
            source_system: string
            source_object_type: string
            source_object_id: string
            data_origin: string
          }>
        }
      : await client.query<{
          link_id: string
          source_system: string
          source_object_type: string
          source_object_id: string
          data_origin: string
        }>(
          `SELECT l.link_id,l.source_system,l.source_object_type,l.source_object_id,p.data_origin
           FROM greenhouse_core.identity_profile_source_links l
           JOIN greenhouse_core.identity_profiles p ON p.profile_id=l.profile_id
          WHERE l.profile_id=ANY($1::text[]) OR l.link_id=ANY($2::text[])`,
          [profileIds, invitationLinkIds]
        )

  const sourceLinkIds = links.rows.map(item => item.link_id)
  const subjectIds = Array.from(new Set(links.rows.map(item => item.source_object_id)))
  const logicalBlockers: string[] = []

  if (row.status !== 'revoked') logicalBlockers.push('registration_active')

  if (
    row.organization_active ||
    row.organization_status !== 'inactive' ||
    row.organization_type !== 'other' ||
    row.lifecycle_stage !== 'disqualified' ||
    row.tax_id ||
    row.hubspot_company_id
  ) {
    logicalBlockers.push('organization_posture_changed')
  }

  if (links.rows.some(item => item.data_origin !== 'smoke_test')) logicalBlockers.push('non_smoke_test_profile')
  const expectedSource = buildExternalIdpSourceSystem(row.environment_id)

  if (
    links.rows.some(
      item => item.source_system !== expectedSource || item.source_object_type !== EXTERNAL_IDP_SOURCE_OBJECT_TYPE
    )
  ) {
    logicalBlockers.push('shared_profile_source_link')
  }

  const active =
    bindingIds.length === 0
      ? { rows: [{ total: '0' }] }
      : await client.query<{ total: string }>(
          `SELECT (
          (SELECT count(*) FROM greenhouse_core.external_organization_bindings WHERE binding_id=ANY($1::text[]) AND status='active') +
          (SELECT count(*) FROM greenhouse_core.external_capability_grants WHERE binding_id=ANY($1::text[]) AND status='active') +
          (SELECT count(*) FROM greenhouse_core.external_member_invitations WHERE binding_id=ANY($1::text[]) AND status IN ('issued','accepted','linked'))
        )::text AS total`,
          [bindingIds]
        )

  const activeAuthorityCount = Number(active.rows[0]?.total ?? 0)

  if (activeAuthorityCount > 0) logicalBlockers.push('active_authority')

  // A DCR creado por el canary se marca con `software_id=run_id`. La unión con los artefactos del
  // sujeto detecta un cliente que hubiera omitido esa marca; en ese caso el plan se niega a asumir
  // ownership y `oauth_client_not_run_owned` bloquea el borrado. Un DCR correctamente marcado sigue
  // siendo run-owned aunque una ceremonia diagnóstica haya usado por error otro sujeto: el cleanup
  // elimina sólo sus hijos client-scoped, nunca la sesión ni la identidad de ese otro sujeto.
  const oauthClients = await client.query<{ client_id: string }>(
    `SELECT DISTINCT owned.client_id
       FROM (
         SELECT client_id FROM greenhouse_auth.oauth_clients
          WHERE registration_kind='dcr' AND metadata_json #>> '{dcr,software_id}'=$1
         UNION ALL
         SELECT client_id FROM greenhouse_auth.authorization_codes WHERE environment_id=$2 AND subject=ANY($3::text[])
         UNION ALL
         SELECT client_id FROM greenhouse_auth.refresh_tokens WHERE environment_id=$2 AND subject=ANY($3::text[])
         UNION ALL
         SELECT client_id FROM greenhouse_auth.access_tokens WHERE environment_id=$2 AND subject=ANY($3::text[])
         UNION ALL
         SELECT client_id FROM greenhouse_auth.client_consents WHERE environment_id=$2 AND subject=ANY($3::text[])
         UNION ALL
         SELECT client_id FROM greenhouse_auth.authorization_contexts WHERE environment_id=$2 AND subject=ANY($3::text[])
       ) owned
      ORDER BY owned.client_id`,
    [row.run_id, row.environment_id, subjectIds]
  )

  const oauthClientIds = oauthClients.rows.map(item => item.client_id)

  type AuthInventoryRow = {
    sessions: string
    magic_links: string
    passkey_credentials: string
    passkey_challenges: string
    totp_enrollments: string
    authorization_codes: string
    refresh_tokens: string
    access_tokens: string
    client_consents: string
    authorization_contexts: string
    oauth_clients: string
    active_auth: string
    unsafe_oauth_clients: string
  }

  const authInventory = await client.query<AuthInventoryRow>(
    `SELECT
      (SELECT count(*)::text FROM greenhouse_auth.sessions WHERE environment_id=$1 AND subject=ANY($2::text[])) AS sessions,
      (SELECT count(*)::text FROM greenhouse_auth.magic_link_tokens WHERE environment_id=$1 AND subject=ANY($2::text[])) AS magic_links,
      (SELECT count(*)::text FROM greenhouse_auth.passkey_credentials WHERE environment_id=$1 AND subject=ANY($2::text[])) AS passkey_credentials,
      (SELECT count(*)::text FROM greenhouse_auth.passkey_challenges WHERE environment_id=$1 AND (subject=ANY($2::text[]) OR correlation_id=$3)) AS passkey_challenges,
      (SELECT count(*)::text FROM greenhouse_auth.totp_enrollments WHERE environment_id=$1 AND subject=ANY($2::text[])) AS totp_enrollments,
      (SELECT count(*)::text FROM greenhouse_auth.authorization_codes WHERE client_id=ANY($4::text[])) AS authorization_codes,
      (SELECT count(*)::text FROM greenhouse_auth.refresh_tokens WHERE client_id=ANY($4::text[])) AS refresh_tokens,
      (SELECT count(*)::text FROM greenhouse_auth.access_tokens WHERE client_id=ANY($4::text[])) AS access_tokens,
      (SELECT count(*)::text FROM greenhouse_auth.client_consents WHERE client_id=ANY($4::text[])) AS client_consents,
      (SELECT count(*)::text FROM greenhouse_auth.authorization_contexts WHERE client_id=ANY($4::text[]) OR binding_id=ANY($5::text[])) AS authorization_contexts,
      (SELECT count(*)::text FROM greenhouse_auth.oauth_clients WHERE client_id=ANY($4::text[])) AS oauth_clients,
      ((SELECT count(*) FROM greenhouse_auth.sessions WHERE environment_id=$1 AND subject=ANY($2::text[]) AND revoked_at IS NULL AND expires_at>NOW()) +
       (SELECT count(*) FROM greenhouse_auth.magic_link_tokens WHERE environment_id=$1 AND subject=ANY($2::text[]) AND consumed_at IS NULL AND expires_at>NOW()) +
       (SELECT count(*) FROM greenhouse_auth.passkey_credentials WHERE environment_id=$1 AND subject=ANY($2::text[]) AND revoked_at IS NULL) +
       (SELECT count(*) FROM greenhouse_auth.passkey_challenges WHERE environment_id=$1 AND (subject=ANY($2::text[]) OR correlation_id=$3) AND consumed_at IS NULL AND expires_at>NOW()) +
       (SELECT count(*) FROM greenhouse_auth.totp_enrollments WHERE environment_id=$1 AND subject=ANY($2::text[]) AND status<>'revoked') +
       (SELECT count(*) FROM greenhouse_auth.authorization_codes WHERE client_id=ANY($4::text[]) AND consumed_at IS NULL AND expires_at>NOW()) +
       (SELECT count(*) FROM greenhouse_auth.refresh_tokens WHERE client_id=ANY($4::text[]) AND status='active' AND expires_at>NOW()) +
       (SELECT count(*) FROM greenhouse_auth.access_tokens WHERE client_id=ANY($4::text[]) AND revoked_at IS NULL AND expires_at>NOW()) +
       (SELECT count(*) FROM greenhouse_auth.client_consents WHERE client_id=ANY($4::text[]) AND status='active') +
       (SELECT count(*) FROM greenhouse_auth.authorization_contexts WHERE (client_id=ANY($4::text[]) OR binding_id=ANY($5::text[])) AND revoked_at IS NULL AND expires_at>NOW()) +
       (SELECT count(*) FROM greenhouse_auth.oauth_clients WHERE client_id=ANY($4::text[]) AND status='active'))::text AS active_auth,
      (SELECT count(*)::text FROM greenhouse_auth.oauth_clients
        WHERE client_id=ANY($4::text[]) AND NOT (
          registration_kind='dcr' AND created_by='dcr' AND metadata_json #>> '{dcr,software_id}'=$3
        )) AS unsafe_oauth_clients`,
    [row.environment_id, subjectIds, row.run_id, oauthClientIds, bindingIds]
  )

  const inventory = authInventory.rows[0]

  const authArtifacts = inventory
    ? {
        sessions: Number(inventory.sessions),
        magicLinks: Number(inventory.magic_links),
        passkeyCredentials: Number(inventory.passkey_credentials),
        passkeyChallenges: Number(inventory.passkey_challenges),
        totpEnrollments: Number(inventory.totp_enrollments),
        authorizationCodes: Number(inventory.authorization_codes),
        refreshTokens: Number(inventory.refresh_tokens),
        accessTokens: Number(inventory.access_tokens),
        clientConsents: Number(inventory.client_consents),
        authorizationContexts: Number(inventory.authorization_contexts),
        oauthClients: Number(inventory.oauth_clients)
      }
    : { ...EMPTY_AUTH_ARTIFACTS }

  const activeAuthCount = Number(inventory?.active_auth ?? 0)
  const unsafeOAuthClientCount = Number(inventory?.unsafe_oauth_clients ?? 0)

  if (activeAuthCount > 0) logicalBlockers.push('active_auth')
  if (unsafeOAuthClientCount > 0) logicalBlockers.push('oauth_client_not_run_owned')

  const shared = await client.query<{ total: string }>(
    `SELECT (
      (SELECT count(*) FROM greenhouse_core.external_organization_bindings
        WHERE organization_id=$1 AND canary_registration_id IS DISTINCT FROM $2) +
      (SELECT count(*) FROM greenhouse_core.external_capability_grants
        WHERE profile_id=ANY($3::text[]) AND NOT (binding_id=ANY($4::text[]))) +
      (SELECT count(*) FROM greenhouse_core.external_member_invitations
        WHERE (profile_id=ANY($3::text[]) OR link_id=ANY($5::text[]))
          AND NOT (binding_id=ANY($4::text[])))
    )::text AS total`,
    [row.organization_id, canaryRegistrationId, profileIds, bindingIds, sourceLinkIds]
  )

  const sharedReferenceCount = Number(shared.rows[0]?.total ?? 0)

  if (sharedReferenceCount > 0) logicalBlockers.push('shared_canary_graph')

  const sessions = await client.query<{ session_hash: string }>(
    `SELECT session_hash FROM greenhouse_auth.sessions
      WHERE environment_id=$1 AND subject=ANY($2::text[])
      ORDER BY session_hash`,
    [row.environment_id, subjectIds]
  )

  const sessionHashes = sessions.rows.map(item => item.session_hash)

  // `pg` serializa consultas por conexión. Mantener este censo secuencial evita lanzar consultas
  // simultáneas sobre el mismo cliente transaccional (comportamiento deprecado en pg@9).
  const foreignKeyReferences: ForeignKeyReference[] = []

  const censusTargets: Array<[ForeignKeyReference['target'], string, string, string[]]> = [
    ['organization', 'greenhouse_core.organizations', 'organization_id', [row.organization_id]],
    ['binding', 'greenhouse_core.external_organization_bindings', 'binding_id', bindingIds],
    ['profile', 'greenhouse_core.identity_profiles', 'profile_id', profileIds],
    ['source_link', 'greenhouse_core.identity_profile_source_links', 'link_id', sourceLinkIds],
    ['registration', 'greenhouse_core.external_canary_registrations', 'canary_registration_id', [canaryRegistrationId]],
    ['session', 'greenhouse_auth.sessions', 'session_hash', sessionHashes],
    ['oauth_client', 'greenhouse_auth.oauth_clients', 'client_id', oauthClientIds]
  ]

  for (const [target, relation, targetColumn, values] of censusTargets) {
    foreignKeyReferences.push(...(await censusForeignKeys(client, target, relation, targetColumn, values)))
  }

  const unexpectedRefs = foreignKeyReferences
    .filter(reference => !reference.expected)
    .reduce((sum, reference) => sum + reference.count, sharedReferenceCount)

  return {
    canaryRegistrationId,
    runId: row.run_id,
    environmentId: row.environment_id,
    organizationId: row.organization_id,
    bindingIds,
    profileIds,
    sourceLinkIds,
    oauthClientIds,
    subjectCount: subjectIds.length,
    registrationRevoked: row.status === 'revoked',
    activeAuthorityCount,
    activeAuthCount,
    authArtifacts,
    foreignKeyReferences,
    logicalBlockers,
    unexpectedRefs,
    deletionReady: logicalBlockers.length === 0 && unexpectedRefs === 0
  }
}

export const inspectExternalCanaryCleanup = async (
  canaryRegistrationIdInput: string
): Promise<ExternalCanaryCleanupPlan> => {
  const canaryRegistrationId = requireIdShape(
    canaryRegistrationIdInput,
    'canaryRegistrationId',
    REGISTRATION_ID_PATTERN
  )

  return withTransaction(client => buildCleanupPlan(client, canaryRegistrationId))
}

export const cleanupExternalCanaryFixture = async (
  input: { canaryRegistrationId: string; apply?: boolean; reason: string },
  actor: ExternalAccessActor
): Promise<{ applied: boolean; plan: ExternalCanaryCleanupPlan; readback?: Record<string, number> }> => {
  const canaryRegistrationId = requireIdShape(
    input.canaryRegistrationId,
    'canaryRegistrationId',
    REGISTRATION_ID_PATTERN
  )

  const reason = requireReason(input.reason)
  const performedBy = actorId(actor)

  return withTransaction(async client => {
    const plan = await buildCleanupPlan(client, canaryRegistrationId)

    if (!input.apply) return { applied: false, plan }

    if (!plan.deletionReady) {
      throw new ExternalAccessError('canary_cleanup_blocked', 'canary cleanup has blockers', {
        canaryRegistrationId,
        unexpectedRefs: plan.unexpectedRefs,
        logicalBlockers: plan.logicalBlockers.length
      })
    }

    const executionRole = await client.query<{ current_user: string; migrator: boolean }>(
      `SELECT current_user,pg_has_role(current_user,'greenhouse_migrator','member') AS migrator`
    )

    if (!executionRole.rows[0]?.migrator) {
      throw new ExternalAccessError('forbidden', 'canary cleanup apply requires the migrator database profile', {
        canaryRegistrationId
      })
    }

    await appendAudit(client, {
      eventType: 'canary_cleanup_completed',
      bindingId: plan.bindingIds[0] ?? null,
      organizationId: plan.organizationId,
      performedBy,
      reason,
      metadata: {
        canaryRegistrationId,
        runId: plan.runId,
        bindingIds: plan.bindingIds,
        profileIds: plan.profileIds,
        unexpectedRefs: plan.unexpectedRefs
      }
    })
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.externalCanaryRegistration,
        aggregateId: canaryRegistrationId,
        eventType: EVENT_TYPES.externalCanaryCleanupCompleted,
        payload: {
          schemaVersion: 1,
          canaryRegistrationId,
          runId: plan.runId,
          organizationId: plan.organizationId,
          deletedBindingCount: plan.bindingIds.length,
          deletedProfileCount: plan.profileIds.length,
          changedByUserId: performedBy
        }
      },
      client
    )

    const ownedSubjects =
      plan.sourceLinkIds.length === 0
        ? []
        : (
            await client.query<{ source_object_id: string }>(
              `SELECT DISTINCT source_object_id
                 FROM greenhouse_core.identity_profile_source_links
                WHERE link_id=ANY($1::text[])
                ORDER BY source_object_id`,
              [plan.sourceLinkIds]
            )
          ).rows.map(item => item.source_object_id)

    // El dominio de auth elimina sus artefactos antes de que identidad retire los source links.
    // Los ledgers append-only quedan fuera a propósito y sólo conservan hashes.
    await deleteExternalCanaryAuthArtifacts(client, {
      environmentId: plan.environmentId,
      subjects: ownedSubjects,
      runId: plan.runId,
      bindingIds: plan.bindingIds,
      oauthClientIds: plan.oauthClientIds
    })

    if (plan.bindingIds.length > 0) {
      await client.query(`DELETE FROM greenhouse_core.external_capability_grants WHERE binding_id=ANY($1::text[])`, [
        plan.bindingIds
      ])
      await client.query(`DELETE FROM greenhouse_core.external_member_invitations WHERE binding_id=ANY($1::text[])`, [
        plan.bindingIds
      ])
    }

    if (plan.sourceLinkIds.length > 0) {
      await client.query(`DELETE FROM greenhouse_core.identity_profile_source_links WHERE link_id=ANY($1::text[])`, [
        plan.sourceLinkIds
      ])
    }

    if (plan.profileIds.length > 0) {
      await client.query(`DELETE FROM greenhouse_core.identity_profiles WHERE profile_id=ANY($1::text[])`, [
        plan.profileIds
      ])
    }

    if (plan.bindingIds.length > 0) {
      await client.query(
        `DELETE FROM greenhouse_core.external_organization_bindings WHERE binding_id=ANY($1::text[])`,
        [plan.bindingIds]
      )
    }

    await client.query(`DELETE FROM greenhouse_core.external_canary_registrations WHERE canary_registration_id=$1`, [
      canaryRegistrationId
    ])
    await client.query(`DELETE FROM greenhouse_core.organizations WHERE organization_id=$1`, [plan.organizationId])

    const readbackRows = await client.query<{
      organizations: string
      registrations: string
      bindings: string
      grants: string
      invitations: string
      profiles: string
      source_links: string
      sessions: string
      magic_links: string
      passkey_credentials: string
      passkey_challenges: string
      totp_enrollments: string
      authorization_codes: string
      refresh_tokens: string
      access_tokens: string
      client_consents: string
      authorization_contexts: string
      oauth_clients: string
    }>(
      `SELECT
        (SELECT count(*)::text FROM greenhouse_core.organizations WHERE organization_id=$1) AS organizations,
        (SELECT count(*)::text FROM greenhouse_core.external_canary_registrations WHERE canary_registration_id=$2) AS registrations,
        (SELECT count(*)::text FROM greenhouse_core.external_organization_bindings WHERE binding_id=ANY($3::text[])) AS bindings,
        (SELECT count(*)::text FROM greenhouse_core.external_capability_grants WHERE binding_id=ANY($3::text[])) AS grants,
        (SELECT count(*)::text FROM greenhouse_core.external_member_invitations WHERE binding_id=ANY($3::text[])) AS invitations,
        (SELECT count(*)::text FROM greenhouse_core.identity_profiles WHERE profile_id=ANY($4::text[])) AS profiles,
        (SELECT count(*)::text FROM greenhouse_core.identity_profile_source_links WHERE link_id=ANY($5::text[])) AS source_links,
        (SELECT count(*)::text FROM greenhouse_auth.sessions WHERE environment_id=$6 AND subject=ANY($7::text[])) AS sessions,
        (SELECT count(*)::text FROM greenhouse_auth.magic_link_tokens WHERE environment_id=$6 AND subject=ANY($7::text[])) AS magic_links,
        (SELECT count(*)::text FROM greenhouse_auth.passkey_credentials WHERE environment_id=$6 AND subject=ANY($7::text[])) AS passkey_credentials,
        (SELECT count(*)::text FROM greenhouse_auth.passkey_challenges WHERE environment_id=$6 AND (subject=ANY($7::text[]) OR correlation_id=$8)) AS passkey_challenges,
        (SELECT count(*)::text FROM greenhouse_auth.totp_enrollments WHERE environment_id=$6 AND subject=ANY($7::text[])) AS totp_enrollments,
        (SELECT count(*)::text FROM greenhouse_auth.authorization_codes WHERE client_id=ANY($9::text[])) AS authorization_codes,
        (SELECT count(*)::text FROM greenhouse_auth.refresh_tokens WHERE client_id=ANY($9::text[])) AS refresh_tokens,
        (SELECT count(*)::text FROM greenhouse_auth.access_tokens WHERE client_id=ANY($9::text[])) AS access_tokens,
        (SELECT count(*)::text FROM greenhouse_auth.client_consents WHERE client_id=ANY($9::text[])) AS client_consents,
        (SELECT count(*)::text FROM greenhouse_auth.authorization_contexts WHERE client_id=ANY($9::text[]) OR binding_id=ANY($3::text[])) AS authorization_contexts,
        (SELECT count(*)::text FROM greenhouse_auth.oauth_clients WHERE client_id=ANY($9::text[])) AS oauth_clients`,
      [
        plan.organizationId,
        canaryRegistrationId,
        plan.bindingIds,
        plan.profileIds,
        plan.sourceLinkIds,
        plan.environmentId,
        ownedSubjects,
        plan.runId,
        plan.oauthClientIds
      ]
    )

    const raw = readbackRows.rows[0]!
    const readback = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Number(value)]))

    if (Object.values(readback).some(value => value !== 0)) {
      throw new ExternalAccessError('canary_cleanup_blocked', 'canary cleanup readback is not zero', {
        canaryRegistrationId
      })
    }

    return { applied: true, plan, readback }
  })
}
