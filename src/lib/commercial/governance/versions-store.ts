import 'server-only'

import { query, withTransaction } from '@/lib/db'

import {
  computeVersionDiff,
  deserializeSnapshotLines,
  type SnapshotLine
} from './version-diff'
import { recordAudit } from './audit-log'

import type { VersionDiff, VersionHistoryEntry } from './contracts'

interface VersionRow extends Record<string, unknown> {
  version_id: string
  quotation_id: string
  version_number: number
  snapshot_json: unknown
  diff_from_previous: unknown
  total_cost: string | number | null
  total_price: string | number | null
  total_discount: string | number | null
  effective_margin_pct: string | number | null
  created_by: string
  notes: string | null
  created_at: string | Date
}

const toIso = (value: string | Date): string => (value instanceof Date ? value.toISOString() : value)

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toDiff = (value: unknown): VersionDiff | null => {
  if (!value) return null

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as VersionDiff
    } catch {
      return null
    }
  }

  if (typeof value === 'object') return value as VersionDiff

  return null
}

const mapVersion = (row: VersionRow): VersionHistoryEntry => ({
  versionId: row.version_id,
  versionNumber: row.version_number,
  totalPrice: toNumberOrNull(row.total_price),
  totalCost: toNumberOrNull(row.total_cost),
  totalDiscount: toNumberOrNull(row.total_discount),
  effectiveMarginPct: toNumberOrNull(row.effective_margin_pct),
  createdBy: row.created_by,
  createdAt: toIso(row.created_at),
  notes: row.notes,
  diffFromPrevious: toDiff(row.diff_from_previous)
})

export const listQuotationVersions = async (
  quotationId: string
): Promise<VersionHistoryEntry[]> => {
  const rows = await query<VersionRow>(
    `SELECT version_id, quotation_id, version_number, snapshot_json,
            diff_from_previous, total_cost, total_price, total_discount,
            effective_margin_pct, created_by, notes, created_at
       FROM greenhouse_commercial.quotation_versions
       WHERE quotation_id = $1
       ORDER BY version_number DESC`,
    [quotationId]
  )

  return rows.map(mapVersion)
}

const readLatestVersionSnapshot = async (
  quotationId: string
): Promise<{ versionNumber: number; lines: SnapshotLine[]; totals: { totalPrice: number | null; effectiveMarginPct: number | null } } | null> => {
  const rows = await query<VersionRow>(
    `SELECT version_id, quotation_id, version_number, snapshot_json,
            diff_from_previous, total_cost, total_price, total_discount,
            effective_margin_pct, created_by, notes, created_at
       FROM greenhouse_commercial.quotation_versions
       WHERE quotation_id = $1
       ORDER BY version_number DESC
       LIMIT 1`,
    [quotationId]
  )

  const row = rows[0]

  if (!row) return null

  return {
    versionNumber: row.version_number,
    lines: deserializeSnapshotLines(row.snapshot_json),
    totals: {
      totalPrice: toNumberOrNull(row.total_price),
      effectiveMarginPct: toNumberOrNull(row.effective_margin_pct)
    }
  }
}

const readQuotationLineSnapshot = async (quotationId: string, versionNumber: number): Promise<SnapshotLine[]> => {
  const rows = await query<{
    line_item_id: string
    label: string
    quantity: string | number | null
    unit_price: string | number | null
    subtotal_price: string | number | null
    subtotal_after_discount: string | number | null
    effective_margin_pct: string | number | null
  }>(
    `SELECT line_item_id, label, quantity, unit_price, subtotal_price,
            subtotal_after_discount, effective_margin_pct
       FROM greenhouse_commercial.quotation_line_items
       WHERE quotation_id = $1 AND version_number = $2
       ORDER BY sort_order ASC, line_number ASC`,
    [quotationId, versionNumber]
  )

  return rows.map(row => ({
    lineItemId: row.line_item_id,
    label: row.label,
    quantity: toNumberOrNull(row.quantity),
    unitPrice: toNumberOrNull(row.unit_price),
    subtotalPrice: toNumberOrNull(row.subtotal_price),
    subtotalAfterDiscount: toNumberOrNull(row.subtotal_after_discount),
    effectiveMarginPct: toNumberOrNull(row.effective_margin_pct)
  }))
}

export interface CreateVersionParams {
  quotationId: string
  actor: { userId: string; name: string }
  notes?: string | null
}

export interface CreateVersionResult {
  newVersionNumber: number
  clonedFromVersion: number
  linesCloned: number
}

export const createNewVersion = async (
  params: CreateVersionParams
): Promise<CreateVersionResult> => {
  return withTransaction(async client => {
    const quotationRows = await client.query<{
      quotation_id: string
      current_version: number
      total_cost: string | number | null
      total_price: string | number | null
      total_discount: string | number | null
      effective_margin_pct: string | number | null
      created_by: string
    }>(
      `SELECT quotation_id, current_version, total_cost, total_price,
              total_discount, effective_margin_pct, created_by
         FROM greenhouse_commercial.quotations
         WHERE quotation_id = $1
         FOR UPDATE`,
      [params.quotationId]
    )

    const quotation = quotationRows.rows[0]

    if (!quotation) {
      throw new Error('Quotation not found')
    }

    const previousVersion = quotation.current_version
    const newVersion = previousVersion + 1

    const previousLinesResult = await client.query<{
      line_item_id: string
      finance_line_item_id: string | null
      finance_quote_id: string | null
      product_id: string | null
      finance_product_id: string | null
      hubspot_line_item_id: string | null
      hubspot_product_id: string | null
      source_system: string
      line_type: string
      sort_order: number
      line_number: number | null
      label: string
      description: string | null
      member_id: string | null
      role_code: string | null
      fte_allocation: string | number | null
      hours_estimated: string | number | null
      unit: string
      quantity: string | number
      unit_cost: string | number | null
      cost_breakdown: unknown
      subtotal_cost: string | number | null
      unit_price: string | number | null
      subtotal_price: string | number | null
      discount_type: string | null
      discount_value: string | number | null
      discount_amount: string | number | null
      subtotal_after_discount: string | number | null
      margin_pct: string | number | null
      effective_margin_pct: string | number | null
      recurrence_type: string
      currency: string | null
      legacy_tax_amount: string | number | null
      legacy_total_amount: string | number | null
      notes: string | null
    }>(
      `SELECT * FROM greenhouse_commercial.quotation_line_items
         WHERE quotation_id = $1 AND version_number = $2
         ORDER BY sort_order ASC, line_number ASC`,
      [params.quotationId, previousVersion]
    )

    let linesCloned = 0

    for (const line of previousLinesResult.rows) {
      await client.query(
        `INSERT INTO greenhouse_commercial.quotation_line_items (
           quotation_id, version_number, product_id, finance_product_id,
           hubspot_line_item_id, hubspot_product_id, source_system, line_type,
           sort_order, line_number, label, description, member_id, role_code,
           fte_allocation, hours_estimated, unit, quantity, unit_cost,
           cost_breakdown, subtotal_cost, unit_price, subtotal_price,
           discount_type, discount_value, discount_amount, subtotal_after_discount,
           margin_pct, effective_margin_pct, recurrence_type, currency,
           legacy_tax_amount, legacy_total_amount, notes
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
           $17, $18, $19, $20::jsonb, $21, $22, $23, $24, $25, $26, $27, $28, $29,
           $30, $31, $32, $33, $34
         )`,
        [
          params.quotationId,
          newVersion,
          line.product_id,
          line.finance_product_id,
          line.hubspot_line_item_id,
          line.hubspot_product_id,
          line.source_system,
          line.line_type,
          line.sort_order,
          line.line_number,
          line.label,
          line.description,
          line.member_id,
          line.role_code,
          line.fte_allocation,
          line.hours_estimated,
          line.unit,
          line.quantity,
          line.unit_cost,
          JSON.stringify(line.cost_breakdown ?? {}),
          line.subtotal_cost,
          line.unit_price,
          line.subtotal_price,
          line.discount_type,
          line.discount_value,
          line.discount_amount,
          line.subtotal_after_discount,
          line.margin_pct,
          line.effective_margin_pct,
          line.recurrence_type,
          line.currency,
          line.legacy_tax_amount,
          line.legacy_total_amount,
          line.notes
        ]
      )

      linesCloned += 1
    }

    const snapshotLines: SnapshotLine[] = previousLinesResult.rows.map(line => ({
      lineItemId: line.line_item_id,
      label: line.label,
      quantity: toNumberOrNull(line.quantity) ?? 0,
      unitPrice: toNumberOrNull(line.unit_price),
      subtotalPrice: toNumberOrNull(line.subtotal_price),
      subtotalAfterDiscount: toNumberOrNull(line.subtotal_after_discount),
      effectiveMarginPct: toNumberOrNull(line.effective_margin_pct)
    }))

    await client.query(
      `INSERT INTO greenhouse_commercial.quotation_versions (
         quotation_id, version_number, snapshot_json, total_cost, total_price,
         total_discount, effective_margin_pct, created_by, notes
       ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (quotation_id, version_number) DO UPDATE SET
         snapshot_json = EXCLUDED.snapshot_json,
         total_cost = EXCLUDED.total_cost,
         total_price = EXCLUDED.total_price,
         total_discount = EXCLUDED.total_discount,
         effective_margin_pct = EXCLUDED.effective_margin_pct,
         notes = EXCLUDED.notes`,
      [
        params.quotationId,
        newVersion,
        JSON.stringify(snapshotLines),
        quotation.total_cost,
        quotation.total_price,
        quotation.total_discount,
        quotation.effective_margin_pct,
        params.actor.userId,
        params.notes ?? null
      ]
    )

    await client.query(
      `UPDATE greenhouse_commercial.quotations
          SET current_version = $1, status = 'draft', updated_at = CURRENT_TIMESTAMP
          WHERE quotation_id = $2`,
      [newVersion, params.quotationId]
    )

    await recordAudit(
      {
        quotationId: params.quotationId,
        versionNumber: newVersion,
        action: 'version_created',
        actorUserId: params.actor.userId,
        actorName: params.actor.name,
        details: {
          fromVersion: previousVersion,
          toVersion: newVersion,
          linesCloned,
          notes: params.notes ?? null
        }
      },
      client
    )

    return { newVersionNumber: newVersion, clonedFromVersion: previousVersion, linesCloned }
  })
}

export const refreshVersionDiff = async (quotationId: string, versionNumber: number): Promise<void> => {
  if (versionNumber <= 1) return

  const previous = await readLatestVersionSnapshotBefore(quotationId, versionNumber)

  if (!previous) return

  const currentLines = await readQuotationLineSnapshot(quotationId, versionNumber)

  const currentTotalsRows = await query<{
    total_price: string | number | null
    effective_margin_pct: string | number | null
  }>(
    `SELECT total_price, effective_margin_pct
       FROM greenhouse_commercial.quotation_versions
       WHERE quotation_id = $1 AND version_number = $2`,
    [quotationId, versionNumber]
  )

  const current = {
    lines: currentLines,
    totals: {
      totalPrice: toNumberOrNull(currentTotalsRows[0]?.total_price ?? null),
      effectiveMarginPct: toNumberOrNull(currentTotalsRows[0]?.effective_margin_pct ?? null)
    }
  }

  const diff = computeVersionDiff(previous, current)

  await query(
    `UPDATE greenhouse_commercial.quotation_versions
        SET diff_from_previous = $1::jsonb
        WHERE quotation_id = $2 AND version_number = $3`,
    [JSON.stringify(diff), quotationId, versionNumber]
  )
}

const readLatestVersionSnapshotBefore = async (
  quotationId: string,
  before: number
): Promise<{ lines: SnapshotLine[]; totals: { totalPrice: number | null; effectiveMarginPct: number | null } } | null> => {
  const rows = await query<VersionRow>(
    `SELECT version_id, quotation_id, version_number, snapshot_json,
            diff_from_previous, total_cost, total_price, total_discount,
            effective_margin_pct, created_by, notes, created_at
       FROM greenhouse_commercial.quotation_versions
       WHERE quotation_id = $1 AND version_number < $2
       ORDER BY version_number DESC
       LIMIT 1`,
    [quotationId, before]
  )

  const row = rows[0]

  if (!row) return null

  return {
    lines: deserializeSnapshotLines(row.snapshot_json),
    totals: {
      totalPrice: toNumberOrNull(row.total_price),
      effectiveMarginPct: toNumberOrNull(row.effective_margin_pct)
    }
  }
}

void readLatestVersionSnapshot
