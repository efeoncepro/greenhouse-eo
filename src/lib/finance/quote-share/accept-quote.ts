import 'server-only'

import { query } from '@/lib/db'

/**
 * TASK-631 Fase 2 — Record client acceptance via the public share link.
 *
 * Stores the acceptance metadata on the quotation row. Idempotent: if the
 * quote is already accepted, returns the existing acceptance details
 * without overwriting them.
 *
 * NOTE: this is NOT eSignature integration — that comes with TASK-619
 * (DocuSign). This is a "soft acceptance" that records intent + metadata
 * for sales rep follow-up. Sales rep still confirms via contract signing.
 */

export interface AcceptanceInput {
  quotationId: string
  versionNumber: number
  acceptedByName: string
  acceptedByRole?: string | null
  acceptedViaShortCode?: string | null
  acceptedIp?: string | null
}

export interface AcceptanceRecord {
  acceptedAt: string
  acceptedByName: string
  acceptedByRole: string | null
}

interface AcceptedRow extends Record<string, unknown> {
  accepted_at: string | Date | null
  accepted_by_name: string | null
  accepted_by_role: string | null
}

const toIso = (value: string | Date | null): string | null => {
  if (!value) return null

  return value instanceof Date ? value.toISOString() : value
}

export type AcceptanceOutcome =
  | { kind: 'accepted'; record: AcceptanceRecord; alreadyAccepted: boolean }
  | { kind: 'not-found' }
  | { kind: 'version-mismatch'; currentVersion: number }

export const recordQuoteAcceptance = async (
  input: AcceptanceInput
): Promise<AcceptanceOutcome> => {
  const trimmedName = input.acceptedByName.trim()

  if (!trimmedName) {
    throw new Error('acceptedByName is required and cannot be empty')
  }

  // First, check the quote exists + version matches
  const headerRows = await query<{ current_version: number }>(
    `SELECT current_version
       FROM greenhouse_commercial.quotations
       WHERE quotation_id = $1`,
    [input.quotationId]
  )

  if (headerRows.length === 0) return { kind: 'not-found' }

  const currentVersion = Number(headerRows[0].current_version)

  if (currentVersion !== input.versionNumber) {
    return { kind: 'version-mismatch', currentVersion }
  }

  // Idempotent UPDATE — only sets acceptance if not already set
  const updatedRows = await query<AcceptedRow>(
    `UPDATE greenhouse_commercial.quotations
       SET accepted_at = COALESCE(accepted_at, now()),
           accepted_by_name = COALESCE(accepted_by_name, $2),
           accepted_by_role = COALESCE(accepted_by_role, $3),
           accepted_via_short_code = COALESCE(accepted_via_short_code, $4),
           accepted_ip = COALESCE(accepted_ip, $5)
       WHERE quotation_id = $1
       RETURNING accepted_at, accepted_by_name, accepted_by_role`,
    [
      input.quotationId,
      trimmedName,
      input.acceptedByRole?.trim() ?? null,
      input.acceptedViaShortCode ?? null,
      input.acceptedIp ?? null
    ]
  )

  const row = updatedRows[0]

  if (!row || !row.accepted_at) {
    throw new Error('UPDATE returned no row or accepted_at was null')
  }

  // Detect "already accepted" — if the persisted name doesn't match the new
  // input name, we know it was previously accepted by someone else
  const alreadyAccepted = row.accepted_by_name !== trimmedName

  return {
    kind: 'accepted',
    record: {
      acceptedAt: toIso(row.accepted_at) ?? new Date().toISOString(),
      acceptedByName: row.accepted_by_name ?? trimmedName,
      acceptedByRole: row.accepted_by_role
    },
    alreadyAccepted
  }
}
