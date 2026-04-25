import type {
  ProductSyncConflictAction,
  ProductSyncConflictDetail,
  ProductSyncConflictField,
  ProductSyncConflictHubSpotSnapshot,
  ProductSyncConflictLocalSnapshot,
  ProductSyncConflictMetadata,
  ProductSourceKind
} from './types'

export interface ProductSyncActionSupport {
  action: ProductSyncConflictAction
  label: string
  description: string
  submitLabel: string
}

export interface ProductSyncDiffRow {
  field: string
  greenhouse: unknown
  hubspot: unknown
}

const ACCEPTABLE_HUBSPOT_IMPORT_SOURCES: ProductSourceKind[] = ['manual', 'hubspot_imported']

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

export const getConflictMetadata = (detail: ProductSyncConflictDetail): ProductSyncConflictMetadata =>
  (detail.metadata ?? {}) as ProductSyncConflictMetadata

export const getLocalSnapshot = (detail: ProductSyncConflictDetail): ProductSyncConflictLocalSnapshot | null =>
  getConflictMetadata(detail).localSnapshot ?? null

export const getHubSpotSnapshot = (detail: ProductSyncConflictDetail): ProductSyncConflictHubSpotSnapshot | null =>
  getConflictMetadata(detail).hubspotSnapshot ?? null

export const getDuplicateProducts = (detail: ProductSyncConflictDetail): ProductSyncConflictLocalSnapshot[] =>
  Array.isArray(getConflictMetadata(detail).duplicateProducts)
    ? (getConflictMetadata(detail).duplicateProducts as ProductSyncConflictLocalSnapshot[])
    : []

export const getConflictDisplayName = (detail: Pick<
  ProductSyncConflictDetail,
  'productName' | 'productCode' | 'hubspotProductId' | 'productId' | 'conflictId'
>) => detail.productName || detail.productCode || detail.hubspotProductId || detail.productId || detail.conflictId

export const getConflictAvailableFields = (detail: ProductSyncConflictDetail): ProductSyncConflictField[] => {
  const supportedFields: ProductSyncConflictField[] = []
  const raw = detail.conflictingFields ?? {}

  if (Object.prototype.hasOwnProperty.call(raw, 'productName')) {
    supportedFields.push('productName')
  }

  if (Object.prototype.hasOwnProperty.call(raw, 'description')) {
    supportedFields.push('description')
  }

  if (Object.prototype.hasOwnProperty.call(raw, 'defaultUnitPrice')) {
    supportedFields.push('defaultUnitPrice')
  }

  if (Object.prototype.hasOwnProperty.call(raw, 'isArchived')) {
    supportedFields.push('isArchived')
  }

  if (
    supportedFields.length === 0 &&
    detail.conflictType === 'archive_mismatch' &&
    (getLocalSnapshot(detail)?.isArchived != null || getHubSpotSnapshot(detail)?.isArchived != null)
  ) {
    supportedFields.push('isArchived')
  }

  return supportedFields
}

export const getConflictDiffRows = (detail: ProductSyncConflictDetail): ProductSyncDiffRow[] => {
  const raw = detail.conflictingFields ?? {}

  return Object.entries(raw).flatMap(([field, value]) => {
    const record = asRecord(value)

    if (!record) return []
    if (!('greenhouse' in record) && !('hubspot' in record)) return []

    return [
      {
        field,
        greenhouse: record.greenhouse,
        hubspot: record.hubspot
      }
    ]
  })
}

export const getSupportedActions = (detail: ProductSyncConflictDetail): ProductSyncActionSupport[] => {
  if (detail.resolutionStatus !== 'pending') {
    return []
  }

  const supported: ProductSyncActionSupport[] = []
  const availableFields = getConflictAvailableFields(detail)

  const canAcceptHubSpot =
    detail.productId != null &&
    detail.sourceKind != null &&
    ACCEPTABLE_HUBSPOT_IMPORT_SOURCES.includes(detail.sourceKind) &&
    availableFields.length > 0

  switch (detail.conflictType) {
    case 'orphan_in_hubspot':
      if (detail.hubspotProductId) {
        supported.push({
          action: 'adopt_hubspot_product',
          label: 'Adoptar producto HubSpot',
          submitLabel: 'Adoptar producto',
          description:
            'Materializa el producto remoto dentro de Greenhouse usando el snapshot del conflicto como base.'
        })
        supported.push({
          action: 'archive_hubspot_product',
          label: 'Archivar en HubSpot',
          submitLabel: 'Archivar en HubSpot',
          description: 'Marca el producto remoto como archivado y deja a Greenhouse como la decision operativa.'
        })
      }

      break
    case 'orphan_in_greenhouse':
      if (detail.productId) {
        supported.push({
          action: 'replay_greenhouse',
          label: 'Reenviar estado Greenhouse',
          submitLabel: 'Reenviar a HubSpot',
          description: 'Reintenta el outbound Greenhouse para recrear o reanclar el producto remoto.'
        })
      }

      break
    case 'field_drift':
      if (detail.productId) {
        supported.push({
          action: 'replay_greenhouse',
          label: 'Reenviar estado Greenhouse',
          submitLabel: 'Reaplicar Greenhouse',
          description: 'Sobrescribe en HubSpot los campos Greenhouse-owned usando el snapshot local actual.'
        })
      }

      if (canAcceptHubSpot) {
        supported.push({
          action: 'accept_hubspot_field',
          label: 'Aceptar valor de HubSpot',
          submitLabel: 'Aceptar valor remoto',
          description: 'Trae a Greenhouse el valor remoto para los campos soportados del conflicto.'
        })
      }

      break
    case 'sku_collision':
      break
    case 'archive_mismatch':
      if (detail.productId) {
        supported.push({
          action: 'replay_greenhouse',
          label: 'Reenviar estado Greenhouse',
          submitLabel: 'Aplicar archivo Greenhouse',
          description: 'Sincroniza de nuevo el estado archivado desde Greenhouse hacia HubSpot.'
        })
      }

      if (canAcceptHubSpot) {
        supported.push({
          action: 'accept_hubspot_field',
          label: 'Aceptar estado HubSpot',
          submitLabel: 'Aceptar estado remoto',
          description: 'Trae el flag de archivado remoto a Greenhouse cuando el producto lo permite.'
        })
      }

      break
  }

  supported.push({
    action: 'ignore',
    label: 'Ignorar conflicto',
    submitLabel: 'Marcar como ignorado',
    description: 'Cierra el conflicto sin mutar Greenhouse ni HubSpot.'
  })

  return supported
}

export const getDefaultAction = (detail: ProductSyncConflictDetail): ProductSyncConflictAction | null =>
  getSupportedActions(detail)[0]?.action ?? null

export const getDefaultFieldForAction = (
  detail: ProductSyncConflictDetail,
  action: ProductSyncConflictAction | null
): ProductSyncConflictField | null => {
  if (action !== 'accept_hubspot_field') {
    return null
  }

  const fields = getConflictAvailableFields(detail)

  if (fields.length === 0) return null
  if (fields.length === 1) return fields[0]

  return 'all'
}
