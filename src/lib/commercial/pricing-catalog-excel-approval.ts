import 'server-only'

import type { PoolClient } from 'pg'

export type PricingCatalogExcelApprovalEntityType = 'sellable_role' | 'tool_catalog' | 'overhead_addon'
export type PricingCatalogExcelApprovalAction = 'create' | 'delete'

export interface PricingCatalogExcelApprovalDiff {
  entityType: PricingCatalogExcelApprovalEntityType
  entityId: string | null
  entitySku: string | null
  action: PricingCatalogExcelApprovalAction
  currentValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  fieldsChanged: string[]
}

export interface ApplyPricingCatalogExcelProposalInput {
  client: PoolClient
  approvalId: string
  reviewerUserId: string
  reviewerName: string
  diff: PricingCatalogExcelApprovalDiff
}

export interface ApplyPricingCatalogExcelProposalResult {
  entityId: string
  appliedFields: string[]
  auditId: string | null
}

export class PricingCatalogExcelApprovalError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code = 'excel_approval_failed', statusCode = 400) {
    super(message)
    this.name = 'PricingCatalogExcelApprovalError'
    this.code = code
    this.statusCode = statusCode
  }
}

const pickString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()

  return trimmed ? trimmed : null
}

const pickNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const pickBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false

  return null
}

const requiredString = (value: unknown, field: string) => {
  const parsed = pickString(value)

  if (!parsed) {
    throw new PricingCatalogExcelApprovalError(
      `Missing required field "${field}" for Excel approval apply.`,
      'excel_approval_missing_field',
      422
    )
  }

  return parsed
}

const requiredNumber = (value: unknown, field: string) => {
  const parsed = pickNumber(value)

  if (parsed === null) {
    throw new PricingCatalogExcelApprovalError(
      `Missing required numeric field "${field}" for Excel approval apply.`,
      'excel_approval_missing_field',
      422
    )
  }

  return parsed
}

const requiredBoolean = (value: unknown, field: string) => {
  const parsed = pickBoolean(value)

  if (parsed === null) {
    throw new PricingCatalogExcelApprovalError(
      `Missing required boolean field "${field}" for Excel approval apply.`,
      'excel_approval_missing_field',
      422
    )
  }

  return parsed
}

export const isPricingCatalogExcelApprovalPayload = (
  value: unknown
): value is { __meta: { source: 'excel_import'; action: PricingCatalogExcelApprovalAction }; diff: PricingCatalogExcelApprovalDiff } => {
  if (!value || typeof value !== 'object') return false

  const payload = value as {
    __meta?: { source?: string; action?: string }
    diff?: { action?: string }
  }

  return payload.__meta?.source === 'excel_import' &&
    (payload.__meta.action === 'create' || payload.__meta.action === 'delete') &&
    typeof payload.diff === 'object' &&
    (payload.diff.action === 'create' || payload.diff.action === 'delete')
}

export const validatePricingCatalogExcelProposalDiff = (diff: PricingCatalogExcelApprovalDiff) => {
  if (!diff.entityId) {
    throw new PricingCatalogExcelApprovalError(
      'Excel approval diff requires entityId.',
      'excel_approval_missing_entity_id',
      422
    )
  }

  if (diff.action === 'create' && !diff.newValues) {
    throw new PricingCatalogExcelApprovalError(
      'Excel create proposal requires newValues.',
      'excel_approval_missing_new_values',
      422
    )
  }

  if (diff.action === 'delete' && !diff.currentValues) {
    throw new PricingCatalogExcelApprovalError(
      'Excel delete proposal requires currentValues.',
      'excel_approval_missing_current_values',
      422
    )
  }
}

const insertAuditRow = async (
  client: PoolClient,
  params: {
    entityType: PricingCatalogExcelApprovalEntityType
    entityId: string
    entitySku: string | null
    action: 'created' | 'deleted'
    reviewerUserId: string
    reviewerName: string
    approvalId: string
    previousValues: Record<string, unknown> | null
    newValues: Record<string, unknown> | null
    fieldsChanged: string[]
  }
) => {
  const res = await client.query<{ audit_id: string }>(
    `INSERT INTO greenhouse_commercial.pricing_catalog_audit_log (
       entity_type, entity_id, entity_sku, action,
       actor_user_id, actor_name, change_summary
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING audit_id`,
    [
      params.entityType,
      params.entityId,
      params.entitySku,
      params.action,
      params.reviewerUserId,
      params.reviewerName,
      JSON.stringify({
        approval_id: params.approvalId,
        source: 'excel_import',
        previous_values: params.previousValues,
        new_values: params.newValues,
        fields_changed: params.fieldsChanged
      })
    ]
  )

  return res.rows[0]?.audit_id ?? null
}

const applyCreateRole = async (
  client: PoolClient,
  diff: PricingCatalogExcelApprovalDiff,
  approvalId: string,
  reviewerUserId: string,
  reviewerName: string
): Promise<ApplyPricingCatalogExcelProposalResult> => {
  const values = diff.newValues ?? {}
  const entityId = diff.entityId ?? requiredString(values.role_id, 'role_id')

  const existing = await client.query<{ role_id: string }>(
    `SELECT role_id FROM greenhouse_commercial.sellable_roles WHERE role_id = $1 LIMIT 1`,
    [entityId]
  )

  if (existing.rowCount && existing.rowCount > 0) {
    throw new PricingCatalogExcelApprovalError(
      `Sellable role ${entityId} already exists; cannot apply Excel create.`,
      'excel_approval_entity_exists',
      409
    )
  }

  const roleSku = pickString(values.role_sku)

  const inserted = await client.query<{ role_id: string; role_sku: string | null }>(
    `INSERT INTO greenhouse_commercial.sellable_roles (
       role_id, role_sku, role_code, role_label_es, role_label_en, category, tier, tier_label,
       can_sell_as_staff, can_sell_as_service_component, active, notes, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
     RETURNING role_id, role_sku`,
    [
      entityId,
      roleSku,
      requiredString(values.role_code, 'role_code'),
      requiredString(values.role_label_es, 'role_label_es'),
      pickString(values.role_label_en),
      requiredString(values.role_category, 'role_category'),
      requiredString(values.role_tier, 'role_tier'),
      requiredString(values.tier_label, 'tier_label'),
      requiredBoolean(values.can_sell_as_staff, 'can_sell_as_staff'),
      requiredBoolean(values.can_sell_as_service_component, 'can_sell_as_service_component'),
      requiredBoolean(values.active, 'active'),
      pickString(values.notes)
    ]
  )

  const auditId = await insertAuditRow(client, {
    entityType: 'sellable_role',
    entityId: inserted.rows[0]?.role_id ?? entityId,
    entitySku: inserted.rows[0]?.role_sku ?? roleSku,
    action: 'created',
    reviewerUserId,
    reviewerName,
    approvalId,
    previousValues: null,
    newValues: values,
    fieldsChanged: Object.keys(values)
  })

  return {
    entityId: inserted.rows[0]?.role_id ?? entityId,
    appliedFields: Object.keys(values),
    auditId
  }
}

const applyCreateTool = async (
  client: PoolClient,
  diff: PricingCatalogExcelApprovalDiff,
  approvalId: string,
  reviewerUserId: string,
  reviewerName: string
): Promise<ApplyPricingCatalogExcelProposalResult> => {
  const values = diff.newValues ?? {}
  const entityId = diff.entityId ?? requiredString(values.tool_id, 'tool_id')

  const existing = await client.query<{ tool_id: string }>(
    `SELECT tool_id FROM greenhouse_ai.tool_catalog WHERE tool_id = $1 LIMIT 1`,
    [entityId]
  )

  if (existing.rowCount && existing.rowCount > 0) {
    throw new PricingCatalogExcelApprovalError(
      `Tool ${entityId} already exists; cannot apply Excel create.`,
      'excel_approval_entity_exists',
      409
    )
  }

  const toolSku = pickString(values.tool_sku)

  const inserted = await client.query<{ tool_id: string; tool_sku: string | null }>(
    `INSERT INTO greenhouse_ai.tool_catalog (
       tool_id, tool_sku, tool_name, provider_id, tool_category, cost_model,
       subscription_amount, subscription_currency, subscription_billing_cycle, is_active, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::numeric, $8, $9, $10, CURRENT_TIMESTAMP)
     RETURNING tool_id, tool_sku`,
    [
      entityId,
      toolSku,
      requiredString(values.tool_name, 'tool_name'),
      requiredString(values.provider_id, 'provider_id'),
      requiredString(values.tool_category, 'tool_category'),
      requiredString(values.cost_model, 'cost_model'),
      pickNumber(values.subscription_amount),
      pickString(values.subscription_currency),
      pickString(values.subscription_billing_cycle),
      requiredBoolean(values.is_active, 'is_active')
    ]
  )

  const auditId = await insertAuditRow(client, {
    entityType: 'tool_catalog',
    entityId: inserted.rows[0]?.tool_id ?? entityId,
    entitySku: inserted.rows[0]?.tool_sku ?? toolSku,
    action: 'created',
    reviewerUserId,
    reviewerName,
    approvalId,
    previousValues: null,
    newValues: values,
    fieldsChanged: Object.keys(values)
  })

  return {
    entityId: inserted.rows[0]?.tool_id ?? entityId,
    appliedFields: Object.keys(values),
    auditId
  }
}

const applyCreateOverhead = async (
  client: PoolClient,
  diff: PricingCatalogExcelApprovalDiff,
  approvalId: string,
  reviewerUserId: string,
  reviewerName: string
): Promise<ApplyPricingCatalogExcelProposalResult> => {
  const values = diff.newValues ?? {}
  const entityId = diff.entityId ?? requiredString(values.addon_id, 'addon_id')

  const existing = await client.query<{ addon_id: string }>(
    `SELECT addon_id FROM greenhouse_commercial.overhead_addons WHERE addon_id = $1 LIMIT 1`,
    [entityId]
  )

  if (existing.rowCount && existing.rowCount > 0) {
    throw new PricingCatalogExcelApprovalError(
      `Overhead addon ${entityId} already exists; cannot apply Excel create.`,
      'excel_approval_entity_exists',
      409
    )
  }

  const addonSku = pickString(values.addon_sku)

  const inserted = await client.query<{ addon_id: string; addon_sku: string }>(
    `INSERT INTO greenhouse_commercial.overhead_addons (
       addon_id, addon_sku, addon_name, category, addon_type, cost_internal_usd,
       margin_pct, final_price_usd, visible_to_client, active, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6::numeric, $7::numeric, $8::numeric, $9, $10, CURRENT_TIMESTAMP)
     RETURNING addon_id, addon_sku`,
    [
      entityId,
      addonSku,
      requiredString(values.addon_name, 'addon_name'),
      requiredString(values.category, 'category'),
      requiredString(values.addon_type, 'addon_type'),
      requiredNumber(values.cost_internal_usd, 'cost_internal_usd'),
      pickNumber(values.margin_pct),
      pickNumber(values.final_price_usd),
      requiredBoolean(values.visible_to_client, 'visible_to_client'),
      requiredBoolean(values.active, 'active')
    ]
  )

  const auditId = await insertAuditRow(client, {
    entityType: 'overhead_addon',
    entityId: inserted.rows[0]?.addon_id ?? entityId,
    entitySku: inserted.rows[0]?.addon_sku ?? addonSku,
    action: 'created',
    reviewerUserId,
    reviewerName,
    approvalId,
    previousValues: null,
    newValues: values,
    fieldsChanged: Object.keys(values)
  })

  return {
    entityId: inserted.rows[0]?.addon_id ?? entityId,
    appliedFields: Object.keys(values),
    auditId
  }
}

const applySoftDelete = async (
  client: PoolClient,
  diff: PricingCatalogExcelApprovalDiff,
  approvalId: string,
  reviewerUserId: string,
  reviewerName: string
): Promise<ApplyPricingCatalogExcelProposalResult> => {
  const entityId = diff.entityId

  if (!entityId) {
    throw new PricingCatalogExcelApprovalError('Excel delete proposal requires entityId.', 'excel_approval_missing_entity_id', 422)
  }

  if (diff.entityType === 'sellable_role') {
    const res = await client.query<{ role_id: string }>(
      `UPDATE greenhouse_commercial.sellable_roles
          SET active = FALSE,
              updated_at = CURRENT_TIMESTAMP
        WHERE role_id = $1
          AND active = TRUE
      RETURNING role_id`,
      [entityId]
    )

    if (res.rowCount === 0) {
      throw new PricingCatalogExcelApprovalError(
        `Sellable role ${entityId} is missing or already inactive.`,
        'excel_approval_entity_gone',
        409
      )
    }

    const auditId = await insertAuditRow(client, {
      entityType: 'sellable_role',
      entityId,
      entitySku: diff.entitySku,
      action: 'deleted',
      reviewerUserId,
      reviewerName,
      approvalId,
      previousValues: diff.currentValues,
      newValues: { active: false },
      fieldsChanged: ['active']
    })

    return { entityId, appliedFields: ['active'], auditId }
  }

  if (diff.entityType === 'tool_catalog') {
    const res = await client.query<{ tool_id: string }>(
      `UPDATE greenhouse_ai.tool_catalog
          SET is_active = FALSE,
              updated_at = CURRENT_TIMESTAMP
        WHERE tool_id = $1
          AND is_active = TRUE
      RETURNING tool_id`,
      [entityId]
    )

    if (res.rowCount === 0) {
      throw new PricingCatalogExcelApprovalError(
        `Tool ${entityId} is missing or already inactive.`,
        'excel_approval_entity_gone',
        409
      )
    }

    const auditId = await insertAuditRow(client, {
      entityType: 'tool_catalog',
      entityId,
      entitySku: diff.entitySku,
      action: 'deleted',
      reviewerUserId,
      reviewerName,
      approvalId,
      previousValues: diff.currentValues,
      newValues: { is_active: false },
      fieldsChanged: ['is_active']
    })

    return { entityId, appliedFields: ['is_active'], auditId }
  }

  const res = await client.query<{ addon_id: string }>(
    `UPDATE greenhouse_commercial.overhead_addons
        SET active = FALSE,
            updated_at = CURRENT_TIMESTAMP
      WHERE addon_id = $1
        AND active = TRUE
    RETURNING addon_id`,
    [entityId]
  )

  if (res.rowCount === 0) {
    throw new PricingCatalogExcelApprovalError(
      `Overhead addon ${entityId} is missing or already inactive.`,
      'excel_approval_entity_gone',
      409
    )
  }

  const auditId = await insertAuditRow(client, {
    entityType: 'overhead_addon',
    entityId,
    entitySku: diff.entitySku,
    action: 'deleted',
    reviewerUserId,
    reviewerName,
    approvalId,
    previousValues: diff.currentValues,
    newValues: { active: false },
    fieldsChanged: ['active']
  })

  return { entityId, appliedFields: ['active'], auditId }
}

export const applyPricingCatalogExcelProposal = async (
  input: ApplyPricingCatalogExcelProposalInput
): Promise<ApplyPricingCatalogExcelProposalResult> => {
  validatePricingCatalogExcelProposalDiff(input.diff)

  if (input.diff.action === 'delete') {
    return applySoftDelete(
      input.client,
      input.diff,
      input.approvalId,
      input.reviewerUserId,
      input.reviewerName
    )
  }

  if (input.diff.entityType === 'sellable_role') {
    return applyCreateRole(
      input.client,
      input.diff,
      input.approvalId,
      input.reviewerUserId,
      input.reviewerName
    )
  }

  if (input.diff.entityType === 'tool_catalog') {
    return applyCreateTool(
      input.client,
      input.diff,
      input.approvalId,
      input.reviewerUserId,
      input.reviewerName
    )
  }

  return applyCreateOverhead(
    input.client,
    input.diff,
    input.approvalId,
    input.reviewerUserId,
    input.reviewerName
  )
}
