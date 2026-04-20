import 'server-only'

import type { PricingCatalogAuditEntry, PricingCatalogEntityType } from './pricing-catalog-audit-store'

export interface RevertTargetDescriptor {
  entityType: PricingCatalogEntityType
  entityId: string
  entitySku: string | null
  method: 'PATCH' | 'PUT'
  pathname: string
  payload: Record<string, unknown>
  /**
   * Acción semántica original que estamos revirtiendo. El endpoint de revert
   * puede usarla para decidir si el revert es aceptable (ej. bulk_imported
   * no se puede revertir con un click).
   */
  originalAction: PricingCatalogAuditEntry['action']
}

export class PricingCatalogRevertNotSupportedError extends Error {
  code: string

  constructor(message: string, code = 'revert_not_supported') {
    super(message)
    this.name = 'PricingCatalogRevertNotSupportedError'
    this.code = code
  }
}

const REVERT_DISABLED_ACTIONS: readonly PricingCatalogAuditEntry['action'][] = [
  'bulk_imported',
  'bulk_edited',
  'reverted',
  'approval_applied'
]

const READ_ONLY_ENTITY_TYPES: readonly PricingCatalogEntityType[] = ['fte_hours_guide']

const GOVERNANCE_ENTITY_TYPES: readonly PricingCatalogEntityType[] = [
  'role_tier_margin',
  'service_tier_margin',
  'commercial_model_multiplier',
  'country_pricing_factor',
  'employment_type'
]

/**
 * Constructs an inverse PATCH payload from an audit entry so the revert endpoint
 * can apply it (TASK-471 slice 2).
 *
 * Strategy:
 *   - `previous_values` from `change_summary` becomes the new PATCH payload.
 *   - `new_values` becomes the "discarded" state.
 *   - Only fields present in `previous_values` are restored (avoid accidental
 *     nulling of fields that existed before but weren't captured).
 *
 * Not supported (throws `PricingCatalogRevertNotSupportedError`):
 *   - Actions: bulk_imported / bulk_edited (too many rows), reverted (already a
 *     revert; use a new revert instead), approval_applied (revert would bypass
 *     maker-checker — require new approval).
 *   - Entity types: fte_hours_guide (read-only).
 *   - Missing or empty `previous_values` in change_summary.
 *
 * Endpoint routing:
 *   - sellable_role → PATCH /api/admin/pricing-catalog/roles/[id]
 *   - tool_catalog → PATCH /api/admin/pricing-catalog/tools/[id]
 *   - overhead_addon → PATCH /api/admin/pricing-catalog/overheads/[id]
 *   - service_catalog → PATCH /api/admin/pricing-catalog/services/[id]
 *   - governance types → PATCH /api/admin/pricing-catalog/governance (con query)
 */
export const buildRevertPayload = (entry: PricingCatalogAuditEntry): RevertTargetDescriptor => {
  if (REVERT_DISABLED_ACTIONS.includes(entry.action)) {
    throw new PricingCatalogRevertNotSupportedError(
      `Revert not supported for action="${entry.action}".`,
      `revert_disabled_${entry.action}`
    )
  }

  if (READ_ONLY_ENTITY_TYPES.includes(entry.entityType)) {
    throw new PricingCatalogRevertNotSupportedError(
      `Revert not supported for entity_type="${entry.entityType}" (read-only).`,
      'revert_read_only_entity'
    )
  }

  const rawPrevious = (entry.changeSummary?.previous_values ??
    entry.changeSummary?.previousValues) as Record<string, unknown> | undefined

  if (!rawPrevious || typeof rawPrevious !== 'object' || Object.keys(rawPrevious).length === 0) {
    // For `created`: reverting means deactivating/deleting — complex, not V1.
    if (entry.action === 'created') {
      throw new PricingCatalogRevertNotSupportedError(
        'Revert of "created" requires explicit deletion; not supported in V1.',
        'revert_created_not_supported'
      )
    }

    throw new PricingCatalogRevertNotSupportedError(
      'Audit entry has no previous_values to restore.',
      'revert_no_previous_values'
    )
  }

  const payload: Record<string, unknown> = { ...rawPrevious }

  // Build endpoint URL per entity type.
  if (GOVERNANCE_ENTITY_TYPES.includes(entry.entityType)) {
    return {
      entityType: entry.entityType,
      entityId: entry.entityId,
      entitySku: entry.entitySku,
      method: 'PATCH',
      pathname: `/api/admin/pricing-catalog/governance?type=${encodeURIComponent(entry.entityType)}&id=${encodeURIComponent(entry.entityId)}`,
      payload,
      originalAction: entry.action
    }
  }

  const entitySegmentMap: Record<PricingCatalogEntityType, string> = {
    sellable_role: 'roles',
    tool_catalog: 'tools',
    overhead_addon: 'overheads',
    service_catalog: 'services',
    // Governance types handled above; these fall through defensively.
    role_tier_margin: 'governance',
    service_tier_margin: 'governance',
    commercial_model_multiplier: 'governance',
    country_pricing_factor: 'governance',
    employment_type: 'governance',
    fte_hours_guide: 'governance'
  }

  const segment = entitySegmentMap[entry.entityType]

  if (!segment) {
    throw new PricingCatalogRevertNotSupportedError(
      `Unsupported entity_type "${entry.entityType}".`,
      'revert_unknown_entity_type'
    )
  }

  return {
    entityType: entry.entityType,
    entityId: entry.entityId,
    entitySku: entry.entitySku,
    method: 'PATCH',
    pathname: `/api/admin/pricing-catalog/${segment}/${encodeURIComponent(entry.entityId)}`,
    payload,
    originalAction: entry.action
  }
}

export const isRevertSupported = (entry: PricingCatalogAuditEntry): boolean => {
  try {
    buildRevertPayload(entry)

    return true
  } catch {
    return false
  }
}
