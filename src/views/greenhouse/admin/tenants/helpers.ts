import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'

import type { ThemeColor } from '@core/types'

import type { TenantCapabilityRecord } from '@/lib/admin/tenant-capability-types'
import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { BusinessLineMetadata } from '@/types/business-line'

export const toTitleCase = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase())

export const formatDateTime = (value: string | null) => {
  if (!value) return 'Sin registro'

  return new Date(value).toLocaleString('es-CL')
}

export const formatRelativeDate = (value: string | null) => {
  if (!value) return 'Sin registro'

  return formatDistanceToNowStrict(new Date(value), {
    addSuffix: true,
    locale: es
  })
}

export const normalizeEmailValue = (value: string | null | undefined) => value?.trim().toLowerCase() || null

export const tenantStatusTone = (status: string, active: boolean): ThemeColor => {
  const normalized = status.toLowerCase()

  if (!active || normalized === 'inactive') return 'secondary'
  if (normalized.includes('onboarding') || normalized.includes('invited') || normalized.includes('pending')) return 'warning'

  return 'success'
}

export const userStatusTone = (status: string): ThemeColor => {
  const normalized = status.toLowerCase()

  if (normalized === 'active') return 'success'
  if (normalized === 'invited' || normalized === 'pending') return 'warning'
  if (normalized === 'suspended') return 'error'

  return 'secondary'
}

export const flagTone = (status: string): ThemeColor => {
  if (status === 'enabled') return 'success'
  if (status === 'staged') return 'warning'

  return 'secondary'
}

export const getDisplayNote = (notes: string | null, hubspotCompanyId: string | null) => {
  if (!notes) {
    return hubspotCompanyId ? 'Space importado desde CRM. Revisar contacto principal y capabilities activas.' : null
  }

  if (/closedwon/i.test(notes) || /bootstrap client imported/i.test(notes)) {
    return hubspotCompanyId ? 'Space importado desde CRM. Revisar contacto principal y capabilities activas.' : notes
  }

  return notes
}

export const getFriendlyHubspotError = () =>
  'No se pudieron cargar los contactos CRM en este momento. Reintenta la lectura live de HubSpot.'

type CapabilityPalette = {
  accent: string
  soft: string
  contrast: string
  label: string
}

const resolveCapabilityFamily = (capability: Pick<TenantCapabilityRecord, 'moduleCode' | 'parentModuleCode' | 'moduleLabel'>) => {
  const value = `${capability.parentModuleCode || ''} ${capability.moduleCode} ${capability.moduleLabel}`.toLowerCase()

  if (value.includes('globe')) return 'globe'
  if (value.includes('reach')) return 'reach'
  if (value.includes('wave')) return 'wave'
  if (value.includes('crm') || value.includes('hubspot')) return 'crm'

  return 'core'
}

export const getCapabilityPalette = (
  capability: Pick<TenantCapabilityRecord, 'moduleCode' | 'parentModuleCode' | 'moduleLabel'>
): CapabilityPalette => {
  const family = resolveCapabilityFamily(capability)

  const FAMILY_LABELS: Record<string, string> = {
    globe: 'Globe', reach: 'Reach', wave: 'Wave', crm: 'CRM Solutions', core: 'Efeonce Core'
  }

  const palette = GH_COLORS.capability[family as keyof typeof GH_COLORS.capability] ?? GH_COLORS.capability.core

  return { ...palette, label: FAMILY_LABELS[family] ?? 'Efeonce Core' }
}

/**
 * Resolve capability palette from business_line_metadata when available.
 * Falls back to the hardcoded heuristic-based resolution above.
 */
export const getCapabilityPaletteFromMetadata = (
  capability: Pick<TenantCapabilityRecord, 'moduleCode' | 'parentModuleCode' | 'moduleLabel'>,
  metadataMap: Map<string, BusinessLineMetadata>
): CapabilityPalette => {
  // Try exact match on moduleCode (for business_line records)
  const direct = metadataMap.get(capability.moduleCode)

  if (direct) {
    return {
      accent: direct.colorHex,
      soft: direct.colorBg || `${direct.colorHex}12`,
      contrast: GH_COLORS.service[direct.moduleCode as keyof typeof GH_COLORS.service]?.bg || '#F5F5F5',
      label: direct.label
    }
  }

  // Try parent module (for service_module records under a business_line)
  const parent = capability.parentModuleCode ? metadataMap.get(capability.parentModuleCode) : null

  if (parent) {
    return {
      accent: parent.colorHex,
      soft: parent.colorBg || `${parent.colorHex}12`,
      contrast: GH_COLORS.service[parent.moduleCode as keyof typeof GH_COLORS.service]?.bg || '#F5F5F5',
      label: parent.label
    }
  }

  // Fallback to legacy heuristic
  return getCapabilityPalette(capability)
}

export const getCapabilitySourceLabel = (capability: TenantCapabilityRecord) => {
  if (capability.assignmentSourceSystem === 'greenhouse_admin') {
    return capability.selected ? 'Manual' : 'Manual off'
  }

  if (capability.assignmentSourceSystem === 'hubspot_crm') {
    return capability.selected ? 'HubSpot' : 'HubSpot off'
  }

  return capability.selected ? 'Active' : 'Available'
}

export const getCapabilitySourceTone = (capability: TenantCapabilityRecord): ThemeColor => {
  if (capability.assignmentSourceSystem === 'greenhouse_admin') return 'warning'
  if (capability.assignmentSourceSystem === 'hubspot_crm') return 'info'

  return capability.selected ? 'success' : 'secondary'
}
