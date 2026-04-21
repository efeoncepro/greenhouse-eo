import 'server-only'

import { createHash } from 'node:crypto'

import type { GhOwnedFieldsSnapshot } from './types'

// TASK-545 Fase A: canonical checksum for Greenhouse-owned product fields.
//
// Used by the drift detection pipeline (TASK-548) to compare the current
// Greenhouse state against the last successful HubSpot push. If the hash
// drifts while `last_outbound_sync_at` is recent, HubSpot has diverged.
//
// The field order below is **load-bearing** — changing it invalidates every
// stored checksum. Only add new fields at the end, and coordinate with the
// TASK-548 drift cron when you do.
//
// NULL handling: NULL → empty string. This keeps the hash stable when a
// nullable field is toggled via `UPDATE … SET description = NULL`. Callers
// that want to treat "no value" differently from "empty string" must do that
// at the schema level, not here.

const CHECKSUM_FIELD_ORDER: ReadonlyArray<keyof GhOwnedFieldsSnapshot> = [
  'product_code',
  'product_name',
  'description',
  'default_unit_price',
  'default_currency',
  'default_unit',
  'product_type',
  'pricing_model',
  'business_line_code',
  'is_archived'
] as const

const normalizeValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'

  if (typeof value === 'number') {
    // Canonical numeric rendering — avoid float drift that would break the
    // hash when JS serializes 1 vs 1.0 differently across callers.
    return Number.isFinite(value) ? String(value) : ''
  }

  return String(value)
}

/**
 * Compute SHA-256 checksum of the Greenhouse-owned product fields.
 * Inputs are joined with `|` in the canonical order; NULLs → empty string.
 */
export const computeGhOwnedFieldsChecksum = (snapshot: GhOwnedFieldsSnapshot): string => {
  const joined = CHECKSUM_FIELD_ORDER
    .map(field => normalizeValue(snapshot[field]))
    .join('|')

  return createHash('sha256').update(joined).digest('hex')
}

/** Field order exposed for documentation / tests. Not for runtime use. */
export const GH_OWNED_FIELDS_CHECKSUM_ORDER = CHECKSUM_FIELD_ORDER
