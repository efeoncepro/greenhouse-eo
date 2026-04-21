import 'server-only'

import type { ProductSourceKind } from './types'

// TASK-546 Fase B sub-flag registry. Each source has its own env-driven flag
// so staging can enroll them one at a time (roles → tools → overheads →
// services). Default is OFF — enabling requires explicit env override.
//
// Pattern follows `src/lib/finance/bigquery-write-flag.ts`: decentralized,
// simple helper per flag. There is no global registry in the codebase.

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

const readFlag = (name: string): boolean => {
  const raw = process.env[name]

  if (!raw) return false

  return TRUE_VALUES.has(raw.trim().toLowerCase())
}

export const isProductSyncRolesEnabled = () =>
  readFlag('GREENHOUSE_PRODUCT_SYNC_ROLES')

export const isProductSyncToolsEnabled = () =>
  readFlag('GREENHOUSE_PRODUCT_SYNC_TOOLS')

export const isProductSyncOverheadsEnabled = () =>
  readFlag('GREENHOUSE_PRODUCT_SYNC_OVERHEADS')

export const isProductSyncServicesEnabled = () =>
  readFlag('GREENHOUSE_PRODUCT_SYNC_SERVICES')

// Subset of ProductSourceKind that can flow from a source store through the
// materializer. `manual` and `hubspot_imported` are excluded because they
// never originate from a Greenhouse source catalog emit. `sellable_role_variant`
// is reserved for Fase B+ and has no handler today.
export type AutoMaterializableSourceKind =
  | 'sellable_role'
  | 'tool'
  | 'overhead_addon'
  | 'service'

export const AUTO_MATERIALIZABLE_SOURCE_KINDS: readonly AutoMaterializableSourceKind[] = [
  'sellable_role',
  'tool',
  'overhead_addon',
  'service'
] as const

export const isAutoMaterializableSourceKind = (
  kind: ProductSourceKind | string
): kind is AutoMaterializableSourceKind =>
  (AUTO_MATERIALIZABLE_SOURCE_KINDS as readonly string[]).includes(kind)

export const isProductSyncEnabled = (kind: AutoMaterializableSourceKind): boolean => {
  switch (kind) {
    case 'sellable_role':
      return isProductSyncRolesEnabled()
    case 'tool':
      return isProductSyncToolsEnabled()
    case 'overhead_addon':
      return isProductSyncOverheadsEnabled()
    case 'service':
      return isProductSyncServicesEnabled()
  }
}
