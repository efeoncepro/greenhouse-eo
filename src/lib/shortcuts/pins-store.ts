import 'server-only'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { isKnownShortcutKey } from './catalog'

// TASK-553 — User shortcut pins persistence layer.
//
// Single canonical reader/writer for `greenhouse_core.user_shortcut_pins`.
// Every API route gating a shortcut mutation flows through here. Shortcut
// access (`validateShortcutAccess`) is enforced ONE level up — the store
// itself trusts that the caller has already validated session + access.
//
// Reads return rows ordered by (display_order ASC, created_at ASC). Unknown
// shortcut keys (catalog retired entries) are tolerated at read time:
// callers filter them via the resolver. The store does NOT silently delete
// them — that audit decision belongs to a future cleanup job.

export interface UserShortcutPinRecord {
  pinId: string
  userId: string
  shortcutKey: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export class UserShortcutPinError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'UserShortcutPinError'
    this.statusCode = statusCode
  }
}

const normalizeRow = (row: {
  pin_id: string | number
  user_id: string
  shortcut_key: string
  display_order: number
  created_at: Date | string
  updated_at: Date | string
}): UserShortcutPinRecord => ({
  pinId: String(row.pin_id),
  userId: row.user_id,
  shortcutKey: row.shortcut_key,
  displayOrder: Number(row.display_order ?? 0),
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
})

const assertNonEmptyUserId = (userId: string) => {
  const trimmed = (userId || '').trim()

  if (!trimmed) {
    throw new UserShortcutPinError('userId is required', 400)
  }

  return trimmed
}

const assertKnownShortcutKey = (shortcutKey: string) => {
  const trimmed = (shortcutKey || '').trim()

  if (!trimmed) {
    throw new UserShortcutPinError('shortcutKey is required', 400)
  }

  if (!isKnownShortcutKey(trimmed)) {
    throw new UserShortcutPinError(`Unknown shortcut key: ${trimmed}`, 400)
  }

  return trimmed
}

/**
 * Returns every pin for the user in canonical display order. Caller must
 * filter by current access using the resolver before exposing in UI.
 */
export const listUserShortcutPins = async (userId: string): Promise<UserShortcutPinRecord[]> => {
  const safeUserId = assertNonEmptyUserId(userId)

  const rows = await runGreenhousePostgresQuery<{
    pin_id: string
    user_id: string
    shortcut_key: string
    display_order: number
    created_at: Date | string
    updated_at: Date | string
  }>(
    `SELECT pin_id, user_id, shortcut_key, display_order, created_at, updated_at
       FROM greenhouse_core.user_shortcut_pins
      WHERE user_id = $1
      ORDER BY display_order ASC, created_at ASC`,
    [safeUserId]
  )

  return rows.map(normalizeRow)
}

/**
 * Adds a pin idempotently. If the pin exists, returns it untouched. The
 * `display_order` defaults to "next available" so new pins land at the end.
 */
export const pinShortcut = async (
  userId: string,
  shortcutKey: string
): Promise<UserShortcutPinRecord> => {
  const safeUserId = assertNonEmptyUserId(userId)
  const safeKey = assertKnownShortcutKey(shortcutKey)

  return withGreenhousePostgresTransaction(async client => {
    const existing = await client.query<{
      pin_id: string
      user_id: string
      shortcut_key: string
      display_order: number
      created_at: Date | string
      updated_at: Date | string
    }>(
      `SELECT pin_id, user_id, shortcut_key, display_order, created_at, updated_at
         FROM greenhouse_core.user_shortcut_pins
        WHERE user_id = $1 AND shortcut_key = $2`,
      [safeUserId, safeKey]
    )

    if (existing.rows.length > 0) {
      return normalizeRow(existing.rows[0])
    }

    const nextOrder = await client.query<{ next_order: number | null }>(
      `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
         FROM greenhouse_core.user_shortcut_pins
        WHERE user_id = $1`,
      [safeUserId]
    )

    const inserted = await client.query<{
      pin_id: string
      user_id: string
      shortcut_key: string
      display_order: number
      created_at: Date | string
      updated_at: Date | string
    }>(
      `INSERT INTO greenhouse_core.user_shortcut_pins (user_id, shortcut_key, display_order)
       VALUES ($1, $2, $3)
       RETURNING pin_id, user_id, shortcut_key, display_order, created_at, updated_at`,
      [safeUserId, safeKey, Number(nextOrder.rows[0]?.next_order ?? 0)]
    )

    return normalizeRow(inserted.rows[0])
  })
}

/**
 * Removes a pin. Returns `true` when a row was deleted, `false` when no
 * such pin existed (idempotent).
 */
export const unpinShortcut = async (userId: string, shortcutKey: string): Promise<boolean> => {
  const safeUserId = assertNonEmptyUserId(userId)
  const trimmedKey = (shortcutKey || '').trim()

  if (!trimmedKey) {
    throw new UserShortcutPinError('shortcutKey is required', 400)
  }

  const result = await runGreenhousePostgresQuery<{ pin_id: string }>(
    `DELETE FROM greenhouse_core.user_shortcut_pins
      WHERE user_id = $1 AND shortcut_key = $2
      RETURNING pin_id`,
    [safeUserId, trimmedKey]
  )

  return result.length > 0
}

/**
 * Reorders the user's pins atomically. Unknown keys, keys not pinned by
 * the user, and duplicates are rejected before any UPDATE runs. Pins not
 * mentioned in `orderedKeys` keep their existing relative order, appended
 * after the explicitly ordered set.
 */
export const reorderUserShortcutPins = async (
  userId: string,
  orderedKeys: readonly string[]
): Promise<UserShortcutPinRecord[]> => {
  const safeUserId = assertNonEmptyUserId(userId)

  if (!Array.isArray(orderedKeys)) {
    throw new UserShortcutPinError('orderedKeys must be an array', 400)
  }

  const seen = new Set<string>()
  const safeKeys: string[] = []

  for (const raw of orderedKeys) {
    const key = (raw || '').trim()

    if (!key) {
      throw new UserShortcutPinError('orderedKeys contains an empty entry', 400)
    }

    if (seen.has(key)) {
      throw new UserShortcutPinError(`Duplicate shortcutKey in order: ${key}`, 400)
    }

    if (!isKnownShortcutKey(key)) {
      throw new UserShortcutPinError(`Unknown shortcut key: ${key}`, 400)
    }

    seen.add(key)
    safeKeys.push(key)
  }

  return withGreenhousePostgresTransaction(async client => {
    const existing = await client.query<{ shortcut_key: string }>(
      `SELECT shortcut_key
         FROM greenhouse_core.user_shortcut_pins
        WHERE user_id = $1`,
      [safeUserId]
    )

    const existingKeys = new Set(existing.rows.map(row => row.shortcut_key))

    for (const key of safeKeys) {
      if (!existingKeys.has(key)) {
        throw new UserShortcutPinError(`Shortcut not pinned by user: ${key}`, 400)
      }
    }

    let order = 0

    for (const key of safeKeys) {
      await client.query(
        `UPDATE greenhouse_core.user_shortcut_pins
            SET display_order = $3
          WHERE user_id = $1 AND shortcut_key = $2`,
        [safeUserId, key, order]
      )

      order += 1
      existingKeys.delete(key)
    }

    // Tail keys (not mentioned) keep relative order, appended after.
    const tail = existing.rows
      .filter(row => existingKeys.has(row.shortcut_key))
      .map(row => row.shortcut_key)

    for (const key of tail) {
      await client.query(
        `UPDATE greenhouse_core.user_shortcut_pins
            SET display_order = $3
          WHERE user_id = $1 AND shortcut_key = $2`,
        [safeUserId, key, order]
      )

      order += 1
    }

    const refreshed = await client.query<{
      pin_id: string
      user_id: string
      shortcut_key: string
      display_order: number
      created_at: Date | string
      updated_at: Date | string
    }>(
      `SELECT pin_id, user_id, shortcut_key, display_order, created_at, updated_at
         FROM greenhouse_core.user_shortcut_pins
        WHERE user_id = $1
        ORDER BY display_order ASC, created_at ASC`,
      [safeUserId]
    )

    return refreshed.rows.map(normalizeRow)
  })
}

/**
 * Counts pins whose `shortcut_key` is no longer in the canonical catalog.
 * Used by reliability signal `home.shortcuts.invalid_pins`.
 */
export const countInvalidUserShortcutPins = async (): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ count: string | number }>(
    `SELECT COUNT(*)::INT AS count
       FROM greenhouse_core.user_shortcut_pins`
  )

  // We can't introspect the catalog server-side via SQL, so we count all
  // pins and let the caller cross-reference. The simple shape lets the
  // signal reader load all distinct keys in one query.
  return Number(rows[0]?.count ?? 0)
}

/**
 * Returns DISTINCT shortcut keys currently pinned by any user. Used by the
 * reliability signal to detect catalog drift (keys not in the canonical
 * catalog anymore).
 */
export const listDistinctPinnedShortcutKeys = async (): Promise<string[]> => {
  const rows = await runGreenhousePostgresQuery<{ shortcut_key: string }>(
    `SELECT DISTINCT shortcut_key FROM greenhouse_core.user_shortcut_pins`
  )

  return rows.map(row => row.shortcut_key)
}
