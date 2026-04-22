export const PRODUCT_SYNC_CONFLICT_TYPES = [
  'orphan_in_hubspot',
  'orphan_in_greenhouse',
  'field_drift',
  'sku_collision',
  'archive_mismatch'
] as const

export type ProductSyncConflictType = (typeof PRODUCT_SYNC_CONFLICT_TYPES)[number]

export const PRODUCT_SYNC_CONFLICT_RESOLUTIONS = [
  'pending',
  'resolved_greenhouse_wins',
  'resolved_hubspot_wins',
  'ignored'
] as const

export type ProductSyncConflictResolution = (typeof PRODUCT_SYNC_CONFLICT_RESOLUTIONS)[number]

export const PRODUCT_SYNC_CONFLICT_ACTIONS = [
  'adopt_hubspot_product',
  'archive_hubspot_product',
  'replay_greenhouse',
  'accept_hubspot_field',
  'ignore'
] as const

export type ProductSyncConflictAction = (typeof PRODUCT_SYNC_CONFLICT_ACTIONS)[number]

export const PRODUCT_SYNC_CONFLICT_FIELDS = [
  'productName',
  'description',
  'defaultUnitPrice',
  'isArchived',
  'all'
] as const

export type ProductSyncConflictField = (typeof PRODUCT_SYNC_CONFLICT_FIELDS)[number]

export type ProductSourceKind =
  | 'sellable_role'
  | 'sellable_role_variant'
  | 'tool'
  | 'overhead_addon'
  | 'service'
  | 'manual'
  | 'hubspot_imported'

export interface ProductSyncConflictRow {
  conflictId: string
  productId: string | null
  hubspotProductId: string | null
  conflictType: ProductSyncConflictType
  detectedAt: string
  conflictingFields: Record<string, unknown> | null
  resolutionStatus: ProductSyncConflictResolution
  resolutionAppliedAt: string | null
  resolvedBy: string | null
  metadata: Record<string, unknown>
}

export interface ProductSyncConflictListItem extends ProductSyncConflictRow {
  productCode: string | null
  productName: string | null
  sourceKind: ProductSourceKind | null
  hubspotSyncStatus: string | null
  isArchived: boolean | null
  autoHealEligible: boolean
}

export interface ProductSyncConflictDetail extends ProductSyncConflictListItem {
  financeProductId: string | null
  sourceId: string | null
  sourceVariantKey: string | null
  lastOutboundSyncAt: string | null
  lastDriftCheckAt: string | null
}

export interface ProductSyncConflictSummary {
  totalUnresolved: number
  byType: Record<ProductSyncConflictType, number>
}

export interface ProductSyncConflictListResponse {
  items: ProductSyncConflictListItem[]
  total: number
  summary: ProductSyncConflictSummary
}

export interface ProductSyncConflictLocalSnapshot {
  productId?: string | null
  hubspotProductId?: string | null
  productCode?: string | null
  productName?: string | null
  description?: string | null
  defaultUnitPrice?: number | null
  sourceKind?: string | null
  sourceId?: string | null
  isArchived?: boolean | null
  hubspotSyncStatus?: string | null
}

export interface ProductSyncConflictHubSpotSnapshot {
  hubspotProductId?: string | null
  gh_product_code?: string | null
  gh_source_kind?: string | null
  gh_last_write_at?: string | null
  name?: string | null
  sku?: string | null
  price?: number | null
  description?: string | null
  isArchived?: boolean | null
}

export interface ProductSyncConflictMetadata {
  autoHealEligible?: boolean
  productCode?: string | null
  localSnapshot?: ProductSyncConflictLocalSnapshot
  hubspotSnapshot?: ProductSyncConflictHubSpotSnapshot
  duplicateProducts?: ProductSyncConflictLocalSnapshot[]
  resolutionAction?: ProductSyncConflictAction
  resolutionReason?: string
  replayResult?: Record<string, unknown>
  adoptedProductId?: string | null
  acceptedField?: ProductSyncConflictField
  changedFields?: string[]
}

export interface ProductSyncConflictResolveResponse {
  conflict: ProductSyncConflictRow
  action: ProductSyncConflictAction
  field?: ProductSyncConflictField | null
  pushStatus?: string
  adoptedProductId?: string | null
}

export const PRODUCT_SYNC_CONFLICT_TYPE_LABELS: Record<ProductSyncConflictType, string> = {
  orphan_in_hubspot: 'Orphan en HubSpot',
  orphan_in_greenhouse: 'Orphan en Greenhouse',
  field_drift: 'Drift de campos',
  sku_collision: 'Colision de SKU',
  archive_mismatch: 'Archive mismatch'
}

export const PRODUCT_SYNC_CONFLICT_RESOLUTION_LABELS: Record<ProductSyncConflictResolution, string> = {
  pending: 'Pendiente',
  resolved_greenhouse_wins: 'Greenhouse gana',
  resolved_hubspot_wins: 'HubSpot gana',
  ignored: 'Ignorado'
}

export const PRODUCT_SYNC_CONFLICT_FIELD_LABELS: Record<ProductSyncConflictField, string> = {
  productName: 'Nombre del producto',
  description: 'Descripcion',
  defaultUnitPrice: 'Precio unitario base',
  isArchived: 'Archivado',
  all: 'Todos los campos soportados'
}

export const PRODUCT_SOURCE_KIND_LABELS: Record<ProductSourceKind, string> = {
  sellable_role: 'Sellable role',
  sellable_role_variant: 'Role variant',
  tool: 'Tool',
  overhead_addon: 'Overhead addon',
  service: 'Service',
  manual: 'Manual',
  hubspot_imported: 'HubSpot imported'
}
