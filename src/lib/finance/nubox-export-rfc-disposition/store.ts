import 'server-only'

import {
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

// TASK-990 Slice 4 — Reviewed disposition for Nubox export invoices whose RFC
// could not be auto-matched to an organization. Capture is idempotent (one row
// per export sale); resolution links to the canonical organization or dismisses,
// gated upstream by capability `finance.nubox_export.review_disposition` and
// audited via the append-only outbox event below.

export const NUBOX_EXPORT_RFC_DISPOSITION_RESOLVED_EVENT =
  'finance.nubox_export.rfc_disposition_resolved'

export type OrphanRfcExportInput = {
  nuboxSaleId: string
  dteTypeCode: string | null
  rfcRaw: string
  rfcNormalized: string
  clientTradeName: string | null
  foreignTotalAmount: number | null
  foreignCurrencyCode: string | null
  functionalTotalAmountClp: number | null
}

export type NuboxExportRfcDisposition = {
  dispositionId: string
  nuboxSaleId: string
  dteTypeCode: string | null
  rfcRaw: string
  rfcNormalized: string
  clientTradeName: string | null
  foreignTotalAmount: number | null
  foreignCurrencyCode: string | null
  functionalTotalAmountClp: number | null
  status: 'pending_review' | 'resolved' | 'dismissed'
  resolvedOrganizationId: string | null
  resolutionReason: string | null
  resolvedByUserId: string | null
  resolvedAt: string | null
  firstSeenAt: string
  lastSeenAt: string
}

export class NuboxExportDispositionError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'disposition_not_found'
      | 'disposition_not_pending'
      | 'reason_too_short'
      | 'organization_required'
      | 'organization_not_found'
  ) {
    super(message)
    this.name = 'NuboxExportDispositionError'
  }
}

/**
 * Idempotently capture orphan export sales (export DTE with no organization
 * match). Re-capture of an already-pending row refreshes `last_seen_at` + the
 * foreign-amount snapshot; rows already resolved/dismissed are left untouched.
 */
export const captureOrphanRfcExports = async (
  rows: OrphanRfcExportInput[]
): Promise<number> => {
  if (rows.length === 0) return 0

  let captured = 0

  for (const row of rows) {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_finance.nubox_export_rfc_dispositions (
         nubox_sale_id, dte_type_code, rfc_raw, rfc_normalized, client_trade_name,
         foreign_total_amount, foreign_currency_code, functional_total_amount_clp
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (nubox_sale_id) DO UPDATE SET
         last_seen_at = NOW(),
         dte_type_code = EXCLUDED.dte_type_code,
         client_trade_name = EXCLUDED.client_trade_name,
         foreign_total_amount = EXCLUDED.foreign_total_amount,
         foreign_currency_code = EXCLUDED.foreign_currency_code,
         functional_total_amount_clp = EXCLUDED.functional_total_amount_clp
       WHERE greenhouse_finance.nubox_export_rfc_dispositions.status = 'pending_review'`,
      [
        row.nuboxSaleId,
        row.dteTypeCode,
        row.rfcRaw,
        row.rfcNormalized,
        row.clientTradeName,
        row.foreignTotalAmount,
        row.foreignCurrencyCode,
        row.functionalTotalAmountClp
      ]
    )
    captured += 1
  }

  return captured
}

const ROW_SELECT = `
  disposition_id          AS "dispositionId",
  nubox_sale_id           AS "nuboxSaleId",
  dte_type_code           AS "dteTypeCode",
  rfc_raw                 AS "rfcRaw",
  rfc_normalized          AS "rfcNormalized",
  client_trade_name       AS "clientTradeName",
  foreign_total_amount    AS "foreignTotalAmount",
  foreign_currency_code   AS "foreignCurrencyCode",
  functional_total_amount_clp AS "functionalTotalAmountClp",
  status,
  resolved_organization_id AS "resolvedOrganizationId",
  resolution_reason        AS "resolutionReason",
  resolved_by_user_id      AS "resolvedByUserId",
  resolved_at              AS "resolvedAt",
  first_seen_at            AS "firstSeenAt",
  last_seen_at             AS "lastSeenAt"
`

export const countPendingNuboxExportRfcDispositions = async (): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT COUNT(*)::int AS n
       FROM greenhouse_finance.nubox_export_rfc_dispositions
      WHERE status = 'pending_review'`
  )

  return Number(rows[0]?.n ?? 0)
}

export const listPendingNuboxExportRfcDispositions = async (
  limit = 100
): Promise<NuboxExportRfcDisposition[]> =>
  runGreenhousePostgresQuery<NuboxExportRfcDisposition>(
    `SELECT ${ROW_SELECT}
       FROM greenhouse_finance.nubox_export_rfc_dispositions
      WHERE status = 'pending_review'
      ORDER BY last_seen_at DESC
      LIMIT $1`,
    [limit]
  )

export type ResolveDispositionInput =
  | {
      dispositionId: string
      action: 'link'
      organizationId: string
      reason: string
      actorUserId: string
    }
  | {
      dispositionId: string
      action: 'dismiss'
      reason: string
      actorUserId: string
    }

/**
 * Resolve a pending disposition — link it to the canonical organization or
 * dismiss it. Atomic: UPDATE + append-only outbox audit in one transaction.
 * Name similarity is candidate evidence only; the operator supplies the org.
 */
export const resolveNuboxExportRfcDisposition = async (
  input: ResolveDispositionInput
): Promise<NuboxExportRfcDisposition> => {
  const reason = input.reason?.trim() ?? ''

  if (reason.length < 10) {
    throw new NuboxExportDispositionError(
      'La razón de la disposición debe tener al menos 10 caracteres.',
      'reason_too_short'
    )
  }

  if (input.action === 'link' && !input.organizationId) {
    throw new NuboxExportDispositionError(
      'Una disposición resuelta requiere una organización canónica.',
      'organization_required'
    )
  }

  return withGreenhousePostgresTransaction(async client => {
    const existing = await client.query<{ status: string }>(
      `SELECT status FROM greenhouse_finance.nubox_export_rfc_dispositions
        WHERE disposition_id = $1 FOR UPDATE`,
      [input.dispositionId]
    )

    if (existing.rows.length === 0) {
      throw new NuboxExportDispositionError(
        'Disposición no encontrada.',
        'disposition_not_found'
      )
    }

    if (existing.rows[0]?.status !== 'pending_review') {
      throw new NuboxExportDispositionError(
        'La disposición ya fue resuelta o descartada.',
        'disposition_not_pending'
      )
    }

    if (input.action === 'link') {
      const org = await client.query<{ organization_id: string }>(
        `SELECT organization_id FROM greenhouse_core.organizations WHERE organization_id = $1`,
        [input.organizationId]
      )

      if (org.rows.length === 0) {
        throw new NuboxExportDispositionError(
          'La organización indicada no existe.',
          'organization_not_found'
        )
      }
    }

    const status = input.action === 'link' ? 'resolved' : 'dismissed'
    const organizationId = input.action === 'link' ? input.organizationId : null

    const updated = await client.query<NuboxExportRfcDisposition>(
      `UPDATE greenhouse_finance.nubox_export_rfc_dispositions
          SET status = $2,
              resolved_organization_id = $3,
              resolution_reason = $4,
              resolved_by_user_id = $5,
              resolved_at = NOW(),
              last_seen_at = NOW()
        WHERE disposition_id = $1
        RETURNING ${ROW_SELECT}`,
      [input.dispositionId, status, organizationId, reason, input.actorUserId]
    )

    const row = updated.rows[0] as NuboxExportRfcDisposition

    await publishOutboxEvent(
      {
        aggregateType: 'finance_nubox_export_disposition',
        aggregateId: input.dispositionId,
        eventType: NUBOX_EXPORT_RFC_DISPOSITION_RESOLVED_EVENT,
        payload: {
          schemaVersion: 1,
          dispositionId: input.dispositionId,
          nuboxSaleId: row.nuboxSaleId,
          rfcNormalized: row.rfcNormalized,
          action: input.action,
          status,
          resolvedOrganizationId: organizationId,
          resolvedByUserId: input.actorUserId,
          resolvedAt: row.resolvedAt
        }
      },
      client
    )

    return row
  })
}
