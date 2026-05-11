import 'server-only'

import { randomUUID } from 'node:crypto'

import { ENTITLEMENT_CAPABILITY_MAP } from '@/config/entitlements-catalog'
import { withTransaction } from '@/lib/db'
import { __clearCapabilitiesRegistryCache } from '@/lib/capabilities-registry/parity'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

const PLATFORM_SPACE_ID = '__platform__'
const MIN_REASON_LENGTH = 10

type QueryableClient = {
  query: <T = unknown>(text: string, values?: unknown[]) => Promise<{ rows: T[]; rowCount: number | null }>
}

type CapabilityRegistryLockRow = {
  capability_key: string
  deprecated_at: Date | string | null
}

type ActiveGrantCountsRow = {
  role_defaults_count: number | string | bigint | null
  user_overrides_count: number | string | bigint | null
}

type DeprecationUpdateRow = {
  deprecated_at: Date | string
}

type AuditInsertRow = {
  audit_id: string
  created_at: Date | string
}

export class CapabilityDeprecationError extends Error {
  constructor(message: string, readonly statusCode: number, readonly details?: Record<string, unknown>) {
    super(message)
    this.name = 'CapabilityDeprecationError'
  }
}

export type MarkCapabilityDeprecatedInput = {
  capabilityKey: string
  reason: string
  actorUserId: string
  spaceId?: string | null
}

export type MarkCapabilityDeprecatedResult = {
  capabilityKey: string
  deprecatedAt: string
  auditId: string | null
  outboxEventId: string | null
  alreadyDeprecated: boolean
}

const normalizeRequiredText = (value: string, fieldName: string) => {
  const normalized = value.trim()

  if (!normalized) {
    throw new CapabilityDeprecationError(`${fieldName} es obligatorio.`, 400)
  }

  return normalized
}

const normalizeTimestamp = (value: Date | string) => value instanceof Date ? value.toISOString() : new Date(value).toISOString()

const toCount = (value: number | string | bigint | null) => {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') return Number.parseInt(value, 10)

  return value ?? 0
}

const buildAuditId = () => `EAL-${randomUUID()}`

const assertNoActiveGrants = async (client: QueryableClient, capabilityKey: string) => {
  const result = await client.query<ActiveGrantCountsRow>(
    `
      SELECT
        (
          SELECT COUNT(*)
          FROM greenhouse_core.role_entitlement_defaults
          WHERE capability = $1
        )::int AS role_defaults_count,
        (
          SELECT COUNT(*)
          FROM greenhouse_core.user_entitlement_overrides
          WHERE capability = $1
            AND (expires_at IS NULL OR expires_at > NOW())
            AND approval_status <> 'rejected'
        )::int AS user_overrides_count
    `,
    [capabilityKey]
  )

  const counts = result.rows[0] ?? { role_defaults_count: 0, user_overrides_count: 0 }
  const roleDefaultsCount = toCount(counts.role_defaults_count)
  const userOverridesCount = toCount(counts.user_overrides_count)
  const activeGrantCount = roleDefaultsCount + userOverridesCount

  if (activeGrantCount > 0) {
    throw new CapabilityDeprecationError(
      `No se puede deprecar ${capabilityKey}: existen grants activos que la referencian.`,
      409,
      { capabilityKey, roleDefaultsCount, userOverridesCount, activeGrantCount }
    )
  }
}

export const markCapabilityDeprecated = async ({
  capabilityKey,
  reason,
  actorUserId,
  spaceId
}: MarkCapabilityDeprecatedInput): Promise<MarkCapabilityDeprecatedResult> => {
  const normalizedCapabilityKey = normalizeRequiredText(capabilityKey, 'capabilityKey')
  const normalizedReason = normalizeRequiredText(reason, 'reason')
  const normalizedActorUserId = normalizeRequiredText(actorUserId, 'actorUserId')
  const effectiveSpaceId = spaceId?.trim() || PLATFORM_SPACE_ID

  if (normalizedReason.length < MIN_REASON_LENGTH) {
    throw new CapabilityDeprecationError(`reason debe tener al menos ${MIN_REASON_LENGTH} caracteres.`, 400)
  }

  if (normalizedCapabilityKey in ENTITLEMENT_CAPABILITY_MAP) {
    throw new CapabilityDeprecationError(
      `No se puede deprecar ${normalizedCapabilityKey}: todavía existe en el catálogo TS.`,
      409,
      { capabilityKey: normalizedCapabilityKey }
    )
  }

  const result = await withTransaction<MarkCapabilityDeprecatedResult>(async client => {
    const registryResult = await client.query<CapabilityRegistryLockRow>(
      `
        SELECT capability_key, deprecated_at
        FROM greenhouse_core.capabilities_registry
        WHERE capability_key = $1
        FOR UPDATE
      `,
      [normalizedCapabilityKey]
    )

    const registryRow = registryResult.rows[0]

    if (!registryRow) {
      throw new CapabilityDeprecationError(
        `Capability ${normalizedCapabilityKey} no existe en capabilities_registry.`,
        404,
        { capabilityKey: normalizedCapabilityKey }
      )
    }

    if (registryRow.deprecated_at) {
      return {
        capabilityKey: normalizedCapabilityKey,
        deprecatedAt: normalizeTimestamp(registryRow.deprecated_at),
        auditId: null,
        outboxEventId: null,
        alreadyDeprecated: true
      }
    }

    await assertNoActiveGrants(client, normalizedCapabilityKey)

    const updateResult = await client.query<DeprecationUpdateRow>(
      `
        UPDATE greenhouse_core.capabilities_registry
        SET deprecated_at = NOW()
        WHERE capability_key = $1
        RETURNING deprecated_at
      `,
      [normalizedCapabilityKey]
    )

    const deprecatedAt = updateResult.rows[0]?.deprecated_at

    if (!deprecatedAt) {
      throw new CapabilityDeprecationError(
        `No se pudo deprecar ${normalizedCapabilityKey}.`,
        500,
        { capabilityKey: normalizedCapabilityKey }
      )
    }

    const auditId = buildAuditId()

    const auditResult = await client.query<AuditInsertRow>(
      `
        INSERT INTO greenhouse_core.entitlement_governance_audit_log (
          audit_id,
          space_id,
          change_type,
          capability,
          performed_by,
          reason
        )
        VALUES ($1, $2, 'capability_deprecated', $3, $4, $5)
        RETURNING audit_id, created_at
      `,
      [auditId, effectiveSpaceId, normalizedCapabilityKey, normalizedActorUserId, normalizedReason]
    )

    const auditRow = auditResult.rows[0]

    if (!auditRow) {
      throw new CapabilityDeprecationError(
        `No se pudo auditar la deprecación de ${normalizedCapabilityKey}.`,
        500,
        { capabilityKey: normalizedCapabilityKey }
      )
    }

    const outboxEventId = await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.entitlementGovernance,
        aggregateId: `${effectiveSpaceId}:capability:${normalizedCapabilityKey}`,
        eventType: EVENT_TYPES.capabilityDeprecated,
        payload: {
          schemaVersion: 1,
          spaceId: effectiveSpaceId,
          capabilityKey: normalizedCapabilityKey,
          reason: normalizedReason,
          actorUserId: normalizedActorUserId,
          deprecatedAt: normalizeTimestamp(deprecatedAt),
          auditId: auditRow.audit_id
        }
      },
      client
    )

    return {
      capabilityKey: normalizedCapabilityKey,
      deprecatedAt: normalizeTimestamp(deprecatedAt),
      auditId: auditRow.audit_id,
      outboxEventId,
      alreadyDeprecated: false
    }
  })

  __clearCapabilitiesRegistryCache()

  return result
}
