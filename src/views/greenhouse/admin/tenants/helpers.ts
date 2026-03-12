import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'

import type { ThemeColor } from '@core/types'

import type { TenantCapabilityRecord } from '@/lib/admin/tenant-capability-types'

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

  if (family === 'globe') {
    return { accent: '#7C3AED', soft: 'rgba(124,58,237,0.12)', contrast: '#F5F3FF', label: 'Globe' }
  }

  if (family === 'reach') {
    return { accent: '#4F46E5', soft: 'rgba(79,70,229,0.12)', contrast: '#EEF2FF', label: 'Reach' }
  }

  if (family === 'wave') {
    return { accent: '#0891B2', soft: 'rgba(8,145,178,0.12)', contrast: '#ECFEFF', label: 'Wave' }
  }

  if (family === 'crm') {
    return { accent: '#FF7A59', soft: 'rgba(255,122,89,0.14)', contrast: '#FFF7F4', label: 'CRM Solutions' }
  }

  return { accent: '#1E3A5F', soft: 'rgba(30,58,95,0.12)', contrast: '#EFF6FF', label: 'Efeonce Core' }
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
