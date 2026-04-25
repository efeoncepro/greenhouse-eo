import 'server-only'

import type { PoolClient } from 'pg'

export interface EntityWhitelist {
  schema: string
  table: string
  pk: string
  columns: readonly string[]
}

/**
 * Column whitelists per entity_type used by governance write paths:
 *   - Revert (TASK-471 slice 2)
 *   - Approval auto-apply (TASK-471 gap Gap-1)
 *   - Excel import apply (TASK-471 slice 6 / Gap-5)
 *
 * V1 scope: sellable_role, tool_catalog, overhead_addon, service_catalog.
 * Governance types (role_tier_margin, service_tier_margin,
 * commercial_model_multiplier, country_pricing_factor, employment_type,
 * fte_hours_guide) route via the `governance` router endpoint shape and are
 * out of scope for direct table writes in V1.
 *
 * Whitelists are intentionally conservative — exclude generated columns,
 * FKs managed by separate stores, timestamps auto-maintained, and any field
 * that would require re-validation via the constraint validator.
 */
export const PRICING_CATALOG_ENTITY_WHITELIST: Record<string, EntityWhitelist> = {
  sellable_role: {
    schema: 'greenhouse_commercial',
    table: 'sellable_roles',
    pk: 'role_id',
    columns: [
      'role_label_es',
      'role_label_en',
      'category',
      'tier',
      'tier_label',
      'can_sell_as_staff',
      'can_sell_as_service_component',
      'active',
      'notes'
    ]
  },
  tool_catalog: {
    schema: 'greenhouse_ai',
    table: 'tool_catalog',
    pk: 'tool_id',
    columns: [
      'tool_name',
      'tool_category',
      'cost_model',
      'subscription_amount',
      'subscription_currency',
      'subscription_billing_cycle',
      'is_active',
      'notes'
    ]
  },
  overhead_addon: {
    schema: 'greenhouse_commercial',
    table: 'overhead_addons',
    pk: 'addon_id',
    columns: [
      'addon_name',
      'category',
      'addon_type',
      'cost_internal_usd',
      'margin_pct',
      'final_price_usd',
      'pct_min',
      'final_price_pct',
      'pct_max',
      'visible_to_client',
      'active',
      'notes'
    ]
  },
  service_catalog: {
    schema: 'greenhouse_commercial',
    table: 'service_pricing',
    pk: 'pricing_id',
    columns: [
      'service_name',
      'service_description',
      'tier',
      'unit_price_usd',
      'currency',
      'active',
      'notes'
    ]
  }
}

const camelToSnake = (camel: string): string =>
  camel.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)

/**
 * Filters a free-form changeset (camelCase or snake_case keys) to the columns
 * allowed by the whitelist, returning a SQL-safe updates object.
 */
export const filterChangesetByWhitelist = (
  changeset: Record<string, unknown>,
  whitelist: EntityWhitelist
): Record<string, unknown> => {
  const updates: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(changeset)) {
    const snakeKey = key.includes('_') ? key : camelToSnake(key)

    if ((whitelist.columns as readonly string[]).includes(snakeKey)) {
      updates[snakeKey] = value
    }
  }

  return updates
}

export class EntityWriterError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code = 'entity_writer_error', statusCode = 400) {
    super(message)
    this.name = 'EntityWriterError'
    this.code = code
    this.statusCode = statusCode
  }
}

export interface ApplyEntityChangesInput {
  client: PoolClient
  entityType: string
  entityId: string
  changeset: Record<string, unknown>
}

export interface ApplyEntityChangesResult {
  updatedFields: string[]
  rowsAffected: number
}

/**
 * Applies a whitelisted changeset to the target entity table within an
 * existing transaction. Used by revert + approval-apply + excel-apply.
 *
 * Throws `EntityWriterError` when:
 *   - entity_type is not in the whitelist (code=entity_not_supported, 400)
 *   - changeset has no whitelisted fields (code=no_whitelisted_fields, 400)
 *   - row does not exist (code=entity_gone, 409)
 */
export const applyPricingCatalogEntityChanges = async (
  input: ApplyEntityChangesInput
): Promise<ApplyEntityChangesResult> => {
  const whitelist = PRICING_CATALOG_ENTITY_WHITELIST[input.entityType]

  if (!whitelist) {
    throw new EntityWriterError(
      `Entity type "${input.entityType}" is not supported by the V1 writer whitelist.`,
      'entity_not_supported',
      400
    )
  }

  const updates = filterChangesetByWhitelist(input.changeset, whitelist)

  if (Object.keys(updates).length === 0) {
    throw new EntityWriterError(
      'No whitelisted fields in changeset.',
      'no_whitelisted_fields',
      400
    )
  }

  const setClauses: string[] = []
  const values: unknown[] = []

  Object.entries(updates).forEach(([col, val]) => {
    setClauses.push(`"${col}" = $${values.length + 1}`)
    values.push(val)
  })

  values.push(input.entityId)

  const res = await input.client.query(
    `UPDATE ${whitelist.schema}.${whitelist.table}
        SET ${setClauses.join(', ')},
            updated_at = NOW()
      WHERE ${whitelist.pk} = $${values.length}
      RETURNING ${whitelist.pk}`,
    values
  )

  if (res.rowCount === 0) {
    throw new EntityWriterError(
      'Entity no longer exists; cannot apply changes.',
      'entity_gone',
      409
    )
  }

  return { updatedFields: Object.keys(updates), rowsAffected: res.rowCount ?? 0 }
}
