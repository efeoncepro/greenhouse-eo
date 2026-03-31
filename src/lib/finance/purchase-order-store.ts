import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { roundCurrency, toNumber, toDateString } from '@/lib/finance/shared'

// ─── Types ──────────────────────────────────────────────────────────────────

export type PurchaseOrderStatus = 'active' | 'consumed' | 'expired' | 'cancelled'

export type PurchaseOrderRecord = {
  poId: string
  poNumber: string
  clientId: string
  organizationId: string | null
  spaceId: string | null
  authorizedAmount: number
  currency: string
  authorizedAmountClp: number
  invoicedAmountClp: number
  remainingAmountClp: number
  invoiceCount: number
  status: PurchaseOrderStatus
  issueDate: string
  expiryDate: string | null
  description: string | null
  serviceScope: string | null
  contactName: string | null
  contactEmail: string | null
  notes: string | null
  attachmentUrl: string | null
  createdAt: string | null
  updatedAt: string | null
}

type PoRow = Record<string, unknown>

const mapRow = (r: PoRow): PurchaseOrderRecord => ({
  poId: String(r.po_id),
  poNumber: String(r.po_number),
  clientId: String(r.client_id),
  organizationId: r.organization_id ? String(r.organization_id) : null,
  spaceId: r.space_id ? String(r.space_id) : null,
  authorizedAmount: toNumber(r.authorized_amount),
  currency: String(r.currency || 'CLP'),
  authorizedAmountClp: toNumber(r.authorized_amount_clp),
  invoicedAmountClp: toNumber(r.invoiced_amount_clp),
  remainingAmountClp: toNumber(r.remaining_amount_clp),
  invoiceCount: Number(r.invoice_count ?? 0),
  status: String(r.status) as PurchaseOrderStatus,
  issueDate: toDateString(r.issue_date as string | null) || '',
  expiryDate: toDateString(r.expiry_date as string | null),
  description: r.description ? String(r.description) : null,
  serviceScope: r.service_scope ? String(r.service_scope) : null,
  contactName: r.contact_name ? String(r.contact_name) : null,
  contactEmail: r.contact_email ? String(r.contact_email) : null,
  notes: r.notes ? String(r.notes) : null,
  attachmentUrl: r.attachment_url ? String(r.attachment_url) : null,
  createdAt: r.created_at ? String(r.created_at) : null,
  updatedAt: r.updated_at ? String(r.updated_at) : null
})

// ─── List ───────────────────────────────────────────────────────────────────

export const listPurchaseOrders = async (filters?: {
  clientId?: string
  status?: string
}): Promise<PurchaseOrderRecord[]> => {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  if (filters?.clientId) {
    idx++
    conditions.push(`client_id = $${idx}`)
    values.push(filters.clientId)
  }

  if (filters?.status) {
    idx++
    conditions.push(`status = $${idx}`)
    values.push(filters.status)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await runGreenhousePostgresQuery<PoRow>(
    `SELECT * FROM greenhouse_finance.purchase_orders
     ${where}
     ORDER BY issue_date DESC
     LIMIT 200`,
    values
  )

  return rows.map(mapRow)
}

// ─── Get by ID ──────────────────────────────────────────────────────────────

export const getPurchaseOrder = async (poId: string): Promise<PurchaseOrderRecord | null> => {
  const rows = await runGreenhousePostgresQuery<PoRow>(
    'SELECT * FROM greenhouse_finance.purchase_orders WHERE po_id = $1',
    [poId]
  )

  return rows.length > 0 ? mapRow(rows[0]) : null
}

// ─── Create ─────────────────────────────────────────────────────────────────

export type CreatePurchaseOrderInput = {
  poNumber: string
  clientId: string
  organizationId?: string | null
  spaceId?: string | null
  authorizedAmount: number
  currency?: string
  exchangeRateToClp?: number
  issueDate: string
  expiryDate?: string | null
  description?: string | null
  serviceScope?: string | null
  contactName?: string | null
  contactEmail?: string | null
  notes?: string | null
  attachmentUrl?: string | null
  createdBy?: string | null
}

export const createPurchaseOrder = async (input: CreatePurchaseOrderInput): Promise<PurchaseOrderRecord> => {
  const poId = `PO-${randomUUID().slice(0, 8)}`
  const currency = input.currency || 'CLP'
  const exchangeRate = input.exchangeRateToClp ?? 1
  const authorizedClp = roundCurrency(input.authorizedAmount * exchangeRate)

  const rows = await runGreenhousePostgresQuery<PoRow>(
    `INSERT INTO greenhouse_finance.purchase_orders (
      po_id, po_number, client_id, organization_id, space_id,
      authorized_amount, currency, exchange_rate_to_clp, authorized_amount_clp,
      invoiced_amount_clp, remaining_amount_clp, invoice_count,
      status, issue_date, expiry_date,
      description, service_scope, contact_name, contact_email,
      notes, attachment_url, created_by
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      0, $9, 0,
      'active', $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18
    ) RETURNING *`,
    [
      poId, input.poNumber, input.clientId, input.organizationId || null, input.spaceId || null,
      input.authorizedAmount, currency, exchangeRate, authorizedClp,
      input.issueDate, input.expiryDate || null,
      input.description || null, input.serviceScope || null,
      input.contactName || null, input.contactEmail || null,
      input.notes || null, input.attachmentUrl || null, input.createdBy || null
    ]
  )

  return mapRow(rows[0])
}

// ─── Update ─────────────────────────────────────────────────────────────────

export const updatePurchaseOrder = async (
  poId: string,
  updates: Partial<Pick<CreatePurchaseOrderInput, 'poNumber' | 'expiryDate' | 'description' | 'serviceScope' | 'contactName' | 'contactEmail' | 'notes' | 'attachmentUrl'>>
): Promise<PurchaseOrderRecord | null> => {
  const sets: string[] = ['updated_at = NOW()']
  const values: unknown[] = []
  let idx = 0

  const add = (column: string, value: unknown) => {
    if (value !== undefined) {
      idx++
      sets.push(`${column} = $${idx}`)
      values.push(value)
    }
  }

  add('po_number', updates.poNumber)
  add('expiry_date', updates.expiryDate)
  add('description', updates.description)
  add('service_scope', updates.serviceScope)
  add('contact_name', updates.contactName)
  add('contact_email', updates.contactEmail)
  add('notes', updates.notes)
  add('attachment_url', updates.attachmentUrl)

  if (sets.length <= 1) return getPurchaseOrder(poId)

  idx++

  const rows = await runGreenhousePostgresQuery<PoRow>(
    `UPDATE greenhouse_finance.purchase_orders SET ${sets.join(', ')} WHERE po_id = $${idx} RETURNING *`,
    [...values, poId]
  )

  return rows.length > 0 ? mapRow(rows[0]) : null
}

// ─── Cancel ─────────────────────────────────────────────────────────────────

export const cancelPurchaseOrder = async (poId: string): Promise<PurchaseOrderRecord | null> => {
  const rows = await runGreenhousePostgresQuery<PoRow>(
    `UPDATE greenhouse_finance.purchase_orders SET status = 'cancelled', updated_at = NOW()
     WHERE po_id = $1 AND status = 'active' RETURNING *`,
    [poId]
  )

  return rows.length > 0 ? mapRow(rows[0]) : null
}

// ─── Reconcile Balance ──────────────────────────────────────────────────────

export const reconcilePurchaseOrderBalance = async (poId: string): Promise<PurchaseOrderRecord | null> => {
  const stats = await runGreenhousePostgresQuery<{ total_clp: string; count: string }>(
    `SELECT COALESCE(SUM(total_amount_clp), 0)::text AS total_clp, COUNT(*)::text AS count
     FROM greenhouse_finance.income
     WHERE purchase_order_id = $1 AND COALESCE(is_annulled, FALSE) = FALSE`,
    [poId]
  )

  const invoiced = toNumber(stats[0]?.total_clp)
  const count = Number(stats[0]?.count ?? 0)

  const po = await getPurchaseOrder(poId)

  if (!po) return null

  const remaining = roundCurrency(po.authorizedAmountClp - invoiced)
  const newStatus = remaining <= 0 ? 'consumed' : po.status

  const rows = await runGreenhousePostgresQuery<PoRow>(
    `UPDATE greenhouse_finance.purchase_orders SET
      invoiced_amount_clp = $2, remaining_amount_clp = $3,
      invoice_count = $4, status = $5, updated_at = NOW()
     WHERE po_id = $1 RETURNING *`,
    [poId, invoiced, remaining, count, newStatus]
  )

  return rows.length > 0 ? mapRow(rows[0]) : null
}

// ─── Expire POs ─────────────────────────────────────────────────────────────

export const expireOverduePurchaseOrders = async (): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ po_id: string }>(
    `UPDATE greenhouse_finance.purchase_orders SET status = 'expired', updated_at = NOW()
     WHERE status = 'active' AND expiry_date < CURRENT_DATE
     RETURNING po_id`
  )

  return rows.length
}

// ─── Active POs for client (for income form selector) ───────────────────────

export const getActivePurchaseOrdersForClient = async (clientId: string): Promise<PurchaseOrderRecord[]> => {
  const rows = await runGreenhousePostgresQuery<PoRow>(
    `SELECT * FROM greenhouse_finance.purchase_orders
     WHERE client_id = $1 AND status = 'active'
     ORDER BY issue_date DESC`,
    [clientId]
  )

  return rows.map(mapRow)
}
