import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { roundCurrency, toNumber, toDateString } from '@/lib/finance/shared'

// ─── Types ──────────────────────────────────────────────────────────────────

export type HesStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled'

export type HesRecord = {
  hesId: string
  hesNumber: string
  purchaseOrderId: string | null
  quotationId: string | null
  clientId: string
  organizationId: string | null
  spaceId: string | null
  serviceDescription: string
  servicePeriodStart: string | null
  servicePeriodEnd: string | null
  deliverablesSummary: string | null
  amount: number
  currency: string
  amountClp: number
  amountAuthorizedClp: number | null
  status: HesStatus
  submittedAt: string | null
  approvedAt: string | null
  approvedBy: string | null
  rejectionReason: string | null
  incomeId: string | null
  invoiced: boolean
  clientContactName: string | null
  clientContactEmail: string | null
  attachmentUrl: string | null
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
}

type HesRow = Record<string, unknown>

const mapRow = (r: HesRow): HesRecord => ({
  hesId: String(r.hes_id),
  hesNumber: String(r.hes_number),
  purchaseOrderId: r.purchase_order_id ? String(r.purchase_order_id) : null,
  quotationId: r.quotation_id ? String(r.quotation_id) : null,
  clientId: String(r.client_id),
  organizationId: r.organization_id ? String(r.organization_id) : null,
  spaceId: r.space_id ? String(r.space_id) : null,
  serviceDescription: String(r.service_description),
  servicePeriodStart: toDateString(r.service_period_start as string | null),
  servicePeriodEnd: toDateString(r.service_period_end as string | null),
  deliverablesSummary: r.deliverables_summary ? String(r.deliverables_summary) : null,
  amount: toNumber(r.amount),
  currency: String(r.currency || 'CLP'),
  amountClp: toNumber(r.amount_clp),
  amountAuthorizedClp: r.amount_authorized_clp === null || r.amount_authorized_clp === undefined ? null : toNumber(r.amount_authorized_clp),
  status: String(r.status) as HesStatus,
  submittedAt: r.submitted_at ? String(r.submitted_at) : null,
  approvedAt: r.approved_at ? String(r.approved_at) : null,
  approvedBy: r.approved_by ? String(r.approved_by) : null,
  rejectionReason: r.rejection_reason ? String(r.rejection_reason) : null,
  incomeId: r.income_id ? String(r.income_id) : null,
  invoiced: Boolean(r.invoiced),
  clientContactName: r.client_contact_name ? String(r.client_contact_name) : null,
  clientContactEmail: r.client_contact_email ? String(r.client_contact_email) : null,
  attachmentUrl: r.attachment_url ? String(r.attachment_url) : null,
  notes: r.notes ? String(r.notes) : null,
  createdAt: r.created_at ? String(r.created_at) : null,
  updatedAt: r.updated_at ? String(r.updated_at) : null
})

// ─── List ───────────────────────────────────────────────────────────────────

export const listHes = async (filters?: {
  clientId?: string
  organizationId?: string
  spaceId?: string
  status?: string
  purchaseOrderId?: string
  quotationId?: string
}): Promise<HesRecord[]> => {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  const identityConditions: string[] = []

  if (filters?.clientId) { idx++; identityConditions.push(`client_id = $${idx}`); values.push(filters.clientId) }
  if (filters?.organizationId) { idx++; identityConditions.push(`organization_id = $${idx}`); values.push(filters.organizationId) }
  if (filters?.spaceId) { idx++; identityConditions.push(`space_id = $${idx}`); values.push(filters.spaceId) }

  if (identityConditions.length === 1) conditions.push(identityConditions[0])
  if (identityConditions.length > 1) conditions.push(`(${identityConditions.join(' OR ')})`)
  if (filters?.status) { idx++; conditions.push(`status = $${idx}`); values.push(filters.status) }
  if (filters?.purchaseOrderId) { idx++; conditions.push(`purchase_order_id = $${idx}`); values.push(filters.purchaseOrderId) }
  if (filters?.quotationId) { idx++; conditions.push(`quotation_id = $${idx}`); values.push(filters.quotationId) }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await runGreenhousePostgresQuery<HesRow>(
    `SELECT * FROM greenhouse_finance.service_entry_sheets ${where} ORDER BY created_at DESC LIMIT 200`,
    values
  )

  return rows.map(mapRow)
}

// ─── Get ────────────────────────────────────────────────────────────────────

export const getHes = async (hesId: string): Promise<HesRecord | null> => {
  const rows = await runGreenhousePostgresQuery<HesRow>(
    'SELECT * FROM greenhouse_finance.service_entry_sheets WHERE hes_id = $1',
    [hesId]
  )

  return rows.length > 0 ? mapRow(rows[0]) : null
}

// ─── Create ─────────────────────────────────────────────────────────────────

export type CreateHesInput = {
  hesNumber: string
  purchaseOrderId?: string | null
  quotationId?: string | null
  clientId: string
  organizationId?: string | null
  spaceId?: string | null
  serviceDescription: string
  servicePeriodStart?: string | null
  servicePeriodEnd?: string | null
  deliverablesSummary?: string | null
  amount: number
  currency?: string
  exchangeRateToClp?: number
  clientContactName?: string | null
  clientContactEmail?: string | null
  attachmentUrl?: string | null
  notes?: string | null
  createdBy?: string | null
}

export const createHes = async (input: CreateHesInput): Promise<HesRecord> => {
  const hesId = `HES-${randomUUID().slice(0, 8)}`
  const currency = input.currency || 'CLP'
  const exchangeRate = input.exchangeRateToClp ?? 1
  const amountClp = roundCurrency(input.amount * exchangeRate)

  // TASK-350: if quotationId not provided but purchaseOrderId is, auto-inherit
  // the quotation_id from the PO (so the HES is automatically threaded to the
  // canonical quotation ancestor).
  let quotationId = input.quotationId || null

  if (!quotationId && input.purchaseOrderId) {
    const inheritRows = await runGreenhousePostgresQuery<{ quotation_id: string | null }>(
      `SELECT quotation_id FROM greenhouse_finance.purchase_orders WHERE po_id = $1 LIMIT 1`,
      [input.purchaseOrderId]
    )

    quotationId = inheritRows[0]?.quotation_id || null
  }

  const rows = await runGreenhousePostgresQuery<HesRow>(
    `INSERT INTO greenhouse_finance.service_entry_sheets (
      hes_id, hes_number, purchase_order_id, client_id, organization_id, space_id,
      service_description, service_period_start, service_period_end, deliverables_summary,
      amount, currency, amount_clp,
      status,
      submitted_at,
      client_contact_name, client_contact_email, attachment_url, notes,
      created_by, quotation_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13,
      'submitted',
      NOW(),
      $14, $15, $16, $17,
      $18, $19
    ) RETURNING *`,
    [
      hesId, input.hesNumber, input.purchaseOrderId || null,
      input.clientId, input.organizationId || null, input.spaceId || null,
      input.serviceDescription, input.servicePeriodStart || null,
      input.servicePeriodEnd || null, input.deliverablesSummary || null,
      input.amount, currency, amountClp,
      input.clientContactName || null, input.clientContactEmail || null,
      input.attachmentUrl || null, input.notes || null,
      input.createdBy || null, quotationId
    ]
  )

  return mapRow(rows[0])
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

export const submitHes = async (hesId: string): Promise<HesRecord | null> => {
  const rows = await runGreenhousePostgresQuery<HesRow>(
    `UPDATE greenhouse_finance.service_entry_sheets SET
      status = 'submitted', submitted_at = NOW(), updated_at = NOW()
    WHERE hes_id = $1 AND status = 'draft' RETURNING *`,
    [hesId]
  )

  return rows.length > 0 ? mapRow(rows[0]) : null
}

export type ApproveHesOptions = {
  actorUserId: string
  amountAuthorizedClp?: number | null
}

/**
 * Approves a HES. Accepts either the legacy positional string signature
 * (`approveHes(hesId, 'user-id')`) or the object form
 * (`approveHes(hesId, { actorUserId, amountAuthorizedClp })`).
 *
 * When `amountAuthorizedClp` is omitted, it defaults to the current
 * `amount_clp` of the HES at approval time (authorized == submitted).
 */
export const approveHes = async (
  hesId: string,
  approvedByOrOptions: string | ApproveHesOptions
): Promise<HesRecord | null> => {
  const options: ApproveHesOptions =
    typeof approvedByOrOptions === 'string'
      ? { actorUserId: approvedByOrOptions }
      : approvedByOrOptions

  const authorizedValue =
    options.amountAuthorizedClp === undefined || options.amountAuthorizedClp === null
      ? null
      : roundCurrency(Number(options.amountAuthorizedClp))

  const rows = await runGreenhousePostgresQuery<HesRow>(
    `UPDATE greenhouse_finance.service_entry_sheets SET
      status = 'approved',
      approved_at = NOW(),
      approved_by = $2,
      amount_authorized_clp = COALESCE($3::numeric, amount_clp),
      updated_at = NOW()
    WHERE hes_id = $1 AND status = 'submitted' RETURNING *`,
    [hesId, options.actorUserId, authorizedValue]
  )

  return rows.length > 0 ? mapRow(rows[0]) : null
}

export const rejectHes = async (hesId: string, reason: string): Promise<HesRecord | null> => {
  const rows = await runGreenhousePostgresQuery<HesRow>(
    `UPDATE greenhouse_finance.service_entry_sheets SET
      status = 'rejected', rejection_reason = $2, updated_at = NOW()
    WHERE hes_id = $1 AND status = 'submitted' RETURNING *`,
    [hesId, reason]
  )

  return rows.length > 0 ? mapRow(rows[0]) : null
}
