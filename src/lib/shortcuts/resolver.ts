import { can, canSeeModule, getTenantEntitlements } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject, TenantEntitlements } from '@/lib/entitlements/types'

import {
  AUDIENCE_SHORTCUT_ORDER,
  SHORTCUT_CATALOG,
  getShortcutByKey,
  type CanonicalShortcut,
  type ShortcutKey
} from './catalog'

// TASK-553 — Shortcuts Resolver
//
// Single source of truth for "what shortcuts can this user see / use right
// now". Combines both planes of the access model:
//   - Module-level visibility (canSeeModule)
//   - View-level whitelist (authorizedViews) when the catalog declares it
//   - Capability check (can()) when the catalog declares a finer gate
//
// Consumers (Home + header dropdown) MUST call this resolver. NEVER reimplement
// the gate logic inline — drift between Home and shell is the bug TASK-553
// closes.

const resolveEntitlementsView = (
  input: TenantEntitlementSubject | TenantEntitlements
): { entitlements: TenantEntitlements; subject?: TenantEntitlementSubject } => {
  if ('entries' in input) {
    return { entitlements: input }
  }

  return { entitlements: getTenantEntitlements(input), subject: input }
}

const subjectAuthorizedViews = (subject: TenantEntitlementSubject | undefined): string[] =>
  Array.isArray(subject?.authorizedViews) ? subject.authorizedViews : []

const isShortcutAccessible = (
  subject: TenantEntitlementSubject | undefined,
  entitlements: TenantEntitlements,
  shortcut: CanonicalShortcut
): boolean => {
  if (!canSeeModule(entitlements, shortcut.module)) {
    return false
  }

  if (shortcut.viewCode) {
    const authorizedViews = subjectAuthorizedViews(subject)

    if (!authorizedViews.includes(shortcut.viewCode)) {
      return false
    }
  }

  if (shortcut.requiredCapability) {
    const { capability, action, scope } = shortcut.requiredCapability

    if (!can(entitlements, capability, action, scope)) {
      return false
    }
  }

  return true
}

/**
 * Returns every shortcut the subject can currently access, in catalog order.
 * Used by the header dropdown's "+ Agregar acceso" flow to render eligible
 * options (consumer subtracts the already-pinned ones).
 */
export const resolveAvailableShortcuts = (
  input: TenantEntitlementSubject | TenantEntitlementSubjectWithEntitlements
): CanonicalShortcut[] => {
  const { entitlements, subject } = resolveEntitlementsView(input)

  return SHORTCUT_CATALOG.filter(shortcut => isShortcutAccessible(subject, entitlements, shortcut))
}

/**
 * Returns the top-N shortcuts for the subject, audience-ordered. Drives Home's
 * `recommendedShortcuts` and seeds the header when the user has no pinned
 * shortcuts yet. Default limit = 4 to preserve the existing Home contract.
 */
export const resolveRecommendedShortcuts = (
  input: TenantEntitlementSubject | TenantEntitlementSubjectWithEntitlements,
  limit = 4
): CanonicalShortcut[] => {
  const { entitlements, subject } = resolveEntitlementsView(input)
  const order = AUDIENCE_SHORTCUT_ORDER[entitlements.audienceKey]
  const orderIndex = new Map<ShortcutKey, number>()

  order.forEach((key, index) => orderIndex.set(key, index))

  const visible = SHORTCUT_CATALOG.filter(shortcut => isShortcutAccessible(subject, entitlements, shortcut))

  const ranked = [...visible].sort((left, right) => {
    const leftRank = orderIndex.get(left.key as ShortcutKey) ?? Number.MAX_SAFE_INTEGER
    const rightRank = orderIndex.get(right.key as ShortcutKey) ?? Number.MAX_SAFE_INTEGER

    return leftRank - rightRank
  })

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 4

  return ranked.slice(0, safeLimit)
}

/**
 * Boolean validator for the write path (pin/unpin) and for filtering pins on
 * read. Returns false for unknown keys + for any access plane failure.
 */
export const validateShortcutAccess = (
  input: TenantEntitlementSubject | TenantEntitlementSubjectWithEntitlements,
  shortcutKey: string
): boolean => {
  const shortcut = getShortcutByKey(shortcutKey)

  if (!shortcut) {
    return false
  }

  const { entitlements, subject } = resolveEntitlementsView(input)

  return isShortcutAccessible(subject, entitlements, shortcut)
}

// Helper used to keep Home's existing contract: `id` is the alias of `key` and
// the rest of the legacy projection (`label`, `route`, `icon`, `module`).
export const projectShortcutForHome = (shortcut: CanonicalShortcut) => ({
  id: shortcut.key,
  label: shortcut.label,
  route: shortcut.route,
  icon: shortcut.icon,
  module: shortcut.module
})

// Internal alias to make the resolver accept a precomputed entitlements view
// without coupling to its private shape. Inputs without `authorizedViews` will
// only fail on viewCode-gated shortcuts (correct fail-closed behavior).
type TenantEntitlementSubjectWithEntitlements = TenantEntitlements
