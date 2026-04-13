import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { roundCurrency, toNumber, toDateString } from '@/lib/finance/shared'
import { attachAssetToAggregate, buildPrivateAssetDownloadUrl } from '@/lib/storage/greenhouse-assets'

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
  attachmentAssetId: string | null
  attachmentUrl: string | null
  createdAt: string | null
  updatedAt: string | null
}

type PoRow = Record<string, unknown>
type ExistingAttachmentRow = {
  attachment_asset_id: string | null
}

let purchaseOrderAttachmentAssetIdSupportPromise: Promise<boolean> | null = null

const hasPurchaseOrderAttachmentAssetIdColumn = async () => {
  if (!purchaseOrderAttachmentAssetIdSupportPromise) {
    purchaseOrderAttachmentAssetIdSupportPromise = runGreenhousePostgresQuery<{ has_attachment_asset_id: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'greenhouse_finance'
            AND table_name = 'purchase_orders'
            AND column_name = 'attachment_asset_id'
        ) AS has_attachment_asset_id
      `
    )
      .then(rows => Boolean(rows[0]?.has_attachment_asset_id))
      .catch(error => {
        purchaseOrderAttachmentAssetIdSupportPromise = null
        throw error
      })
  }

  return purchaseOrderAttachmentAssetIdSupportPromise
}

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
  attachmentAssetId: r.attachment_asset_id ? String(r.attachment_asset_id) : null,
  attachmentUrl: r.attachment_asset_id
    ? buildPrivateAssetDownloadUrl(String(r.attachment_asset_id))
    : r.attachment_url
      ? String(r.attachment_url)
      : null,
  createdAt: r.created_at ? String(r.created_at) : null,
  updatedAt: r.updated_at ? String(r.updated_at) : null
})

const buildPurchaseOrderAttachmentPersistence = async ({
  attachmentAssetId,
  attachmentUrl
}: {
  attachmentAssetId?: string | null
  attachmentUrl?: string | null
}) => {
  const normalizedAttachmentAssetId = attachmentAssetId?.trim() || null
  const supportsAttachmentAssetId = await hasPurchaseOrderAttachmentAssetIdColumn()

  const normalizedAttachmentUrl =
    normalizedAttachmentAssetId ? buildPrivateAssetDownloadUrl(normalizedAttachmentAssetId) : attachmentUrl || null

  return {
    supportsAttachmentAssetId,
    attachmentAssetId: normalizedAttachmentAssetId,
    attachmentUrl: normalizedAttachmentUrl
  }
}

// ─── List ───────────────────────────────────────────────────────────────────

export const listPurchaseOrders = async (filters?: {
  clientId?: string
  organizationId?: string
  spaceId?: string
  status?: string
}): Promise<PurchaseOrderRecord[]> => {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 0

  const identityConditions: string[] = []

  if (filters?.clientId) {
    idx++
    identityConditions.push(`client_id = $${idx}`)
    values.push(filters.clientId)
  }

  if (filters?.organizationId) {
    idx++
    identityConditions.push(`organization_id = $${idx}`)
    values.push(filters.organizationId)
  }

  if (filters?.spaceId) {
    idx++
    identityConditions.push(`space_id = $${idx}`)
    values.push(filters.spaceId)
  }

  if (identityConditions.length === 1) {
    conditions.push(identityConditions[0])
  } else if (identityConditions.length > 1) {
    conditions.push(`(${identityConditions.join(' OR ')})`)
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
  attachmentAssetId?: string | null
  attachmentUrl?: string | null
  createdBy?: string | null
}

export const createPurchaseOrder = async (input: CreatePurchaseOrderInput): Promise<PurchaseOrderRecord> => {
  const poId = `PO-${randomUUID().slice(0, 8)}`
  const currency = input.currency || 'CLP'
  const exchangeRate = input.exchangeRateToClp ?? 1
  const authorizedClp = roundCurrency(input.authorizedAmount * exchangeRate)

  const attachmentPersistence = await buildPurchaseOrderAttachmentPersistence({
    attachmentAssetId: input.attachmentAssetId,
    attachmentUrl: input.attachmentUrl
  })

  return withGreenhousePostgresTransaction(async client => {
    const columns = [
      'po_id',
      'po_number',
      'client_id',
      'organization_id',
      'space_id',
      'authorized_amount',
      'currency',
      'exchange_rate_to_clp',
      'authorized_amount_clp',
      'invoiced_amount_clp',
      'remaining_amount_clp',
      'invoice_count',
      'status',
      'issue_date',
      'expiry_date',
      'description',
      'service_scope',
      'contact_name',
      'contact_email',
      'notes'
    ]

    const values: unknown[] = [
      poId,
      input.poNumber,
      input.clientId,
      input.organizationId || null,
      input.spaceId || null,
      input.authorizedAmount,
      currency,
      exchangeRate,
      authorizedClp,
      0,
      authorizedClp,
      0,
      'active',
      input.issueDate,
      input.expiryDate || null,
      input.description || null,
      input.serviceScope || null,
      input.contactName || null,
      input.contactEmail || null,
      input.notes || null
    ]

    if (attachmentPersistence.supportsAttachmentAssetId) {
      columns.push('attachment_asset_id')
      values.push(attachmentPersistence.attachmentAssetId)
    }

    columns.push('attachment_url', 'created_by')
    values.push(attachmentPersistence.attachmentUrl, input.createdBy || null)

    const result = await client.query<PoRow>(
      `INSERT INTO greenhouse_finance.purchase_orders (
        ${columns.join(', ')}
      ) VALUES (
        ${values.map((_, index) => `$${index + 1}`).join(', ')}
      ) RETURNING *`,
      values
    )

    if (attachmentPersistence.attachmentAssetId && input.createdBy) {
      await attachAssetToAggregate({
        assetId: attachmentPersistence.attachmentAssetId,
        ownerAggregateType: 'purchase_order',
        ownerAggregateId: poId,
        actorUserId: input.createdBy,
        ownerClientId: input.clientId,
        ownerSpaceId: input.spaceId || null,
        metadata: {
          poNumber: input.poNumber
        },
        client
      })
    }

    return mapRow(result.rows[0])
  })
}

// ─── Update ─────────────────────────────────────────────────────────────────

export const updatePurchaseOrder = async (
  poId: string,
  updates: Partial<Pick<CreatePurchaseOrderInput, 'poNumber' | 'expiryDate' | 'description' | 'serviceScope' | 'contactName' | 'contactEmail' | 'notes' | 'attachmentAssetId' | 'attachmentUrl' | 'createdBy' | 'clientId' | 'spaceId'>>
): Promise<PurchaseOrderRecord | null> => {
  return withGreenhousePostgresTransaction(async client => {
    const sets: string[] = ['updated_at = NOW()']
    const values: unknown[] = []
    let idx = 0

    const attachmentPersistence = updates.attachmentAssetId !== undefined
      ? await buildPurchaseOrderAttachmentPersistence({
          attachmentAssetId: updates.attachmentAssetId,
          attachmentUrl: updates.attachmentUrl
        })
      : null

    const previousAttachmentAssetId =
      attachmentPersistence?.supportsAttachmentAssetId
        ? (
            await client.query<ExistingAttachmentRow>(
              `
                SELECT attachment_asset_id
                FROM greenhouse_finance.purchase_orders
                WHERE po_id = $1
                FOR UPDATE
              `,
              [poId]
            )
          ).rows[0]?.attachment_asset_id || null
        : null

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

    if (attachmentPersistence) {
      if (attachmentPersistence.supportsAttachmentAssetId) {
        add('attachment_asset_id', attachmentPersistence.attachmentAssetId)
      }

      add('attachment_url', attachmentPersistence.attachmentUrl)
    } else {
      add('attachment_url', updates.attachmentUrl)
    }

    if (sets.length <= 1) return getPurchaseOrder(poId)

    idx++

    const result = await client.query<PoRow>(
      `UPDATE greenhouse_finance.purchase_orders SET ${sets.join(', ')} WHERE po_id = $${idx} RETURNING *`,
      [...values, poId]
    )

    const row = result.rows[0]

    if (!row) {
      return null
    }

    if (attachmentPersistence?.attachmentAssetId && updates.createdBy) {
      await attachAssetToAggregate({
        assetId: attachmentPersistence.attachmentAssetId,
        ownerAggregateType: 'purchase_order',
        ownerAggregateId: poId,
        actorUserId: updates.createdBy,
        ownerClientId: updates.clientId || String(row.client_id),
        ownerSpaceId: updates.spaceId === undefined ? (row.space_id ? String(row.space_id) : null) : updates.spaceId || null,
        metadata: {
          poNumber: row.po_number ? String(row.po_number) : null
        },
        client
      })
    }

    if (
      attachmentPersistence?.supportsAttachmentAssetId &&
      previousAttachmentAssetId &&
      previousAttachmentAssetId !== attachmentPersistence.attachmentAssetId
    ) {
      await client.query(
        `
          UPDATE greenhouse_core.assets
          SET
            status = 'orphaned',
            owner_aggregate_id = NULL,
            metadata_json = COALESCE(metadata_json, '{}'::jsonb) || $2::jsonb
          WHERE asset_id = $1
            AND status <> 'deleted'
        `,
        [
          previousAttachmentAssetId,
          JSON.stringify({
            supersededByAssetId: attachmentPersistence.attachmentAssetId || null,
            supersededAt: new Date().toISOString(),
            supersededByAggregateType: 'purchase_order',
            supersededByAggregateId: poId
          })
        ]
      )
    }

    return mapRow(row)
  })
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
