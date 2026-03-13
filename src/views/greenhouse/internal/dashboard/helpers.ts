'use client'

import type { ThemeColor } from '@core/types'

import type { InternalDashboardClientRow } from '@/lib/internal/get-internal-dashboard-overview'

const integerFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0
})

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
})

type ControlTowerStatus = 'active' | 'onboarding' | 'attention' | 'inactive'

export type DerivedControlTowerTenant = InternalDashboardClientRow & {
  activationRate: number
  pendingActivationRate: number
  statusKey: ControlTowerStatus
  statusLabel: string
  statusTone: ThemeColor | 'default'
  statusDescription: string
  statusPriority: number
  lastActivityDays: number | null
  lastActivityLabel: string
  lastActivityTimestamp: number
  ageDays: number | null
  capabilityCodes: string[]
  primaryAlerts: string[]
  needsAttention: boolean
}

export type ControlTowerSummary = {
  activeClients: number
  activeUsers: number
  invitedUsers: number
  totalUsers: number
  internalAdmins: number
  spacesWithoutActivity: number
  avgOnTimePct: number | null
  trackedOtdProjects: number
  attentionCount: number
  onboardingCount: number
  inactiveCount: number
  newClientsThisMonth: number
  lastActivityAt: string | null
}

export const formatInteger = (value: number) => integerFormatter.format(value)

export const formatPercent = (value: number | null) => {
  if (value === null) return '--'

  return `${formatInteger(Math.round(value))}%`
}

export const getCapabilityLabel = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase())

export const getCapabilityTone = (value: string): ThemeColor | 'default' => {
  const normalized = value.toLowerCase()

  if (normalized.includes('globe')) return 'secondary'
  if (normalized.includes('reach')) return 'primary'
  if (normalized.includes('wave')) return 'info'
  if (normalized.includes('crm') || normalized.includes('hubspot')) return 'warning'

  return 'default'
}

const getDateValue = (value: string | null) => {
  if (!value) return null

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

const getDayDiff = (value: string | null) => {
  const target = getDateValue(value)

  if (!target) return null

  const now = new Date()
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const targetUtc = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate())

  return Math.floor((todayUtc - targetUtc) / (1000 * 60 * 60 * 24))
}

export const formatRelativeDate = (value: string | null) => {
  const diffDays = getDayDiff(value)

  if (diffDays === null) return 'Sin actividad registrada'
  if (diffDays <= 0) return 'hoy'
  if (diffDays === 1) return 'hace 1 dia'
  if (diffDays < 7) return `hace ${diffDays} dias`
  if (diffDays < 14) return 'hace 1 semana'
  if (diffDays < 21) return 'hace 2 semanas'
  if (diffDays < 30) return 'hace 3 semanas'

  return dateFormatter.format(getDateValue(value)!)
}

export const getOtdTone = (value: number | null): ThemeColor | 'default' => {
  if (value === null) return 'default'
  if (value >= 90) return 'success'
  if (value >= 70) return 'warning'

  return 'error'
}

export const buildAttentionSummary = (tenant: InternalDashboardClientRow) => {
  const alerts: string[] = []
  const ageDays = getDayDiff(tenant.createdAt)
  const lastActivityDays = getDayDiff(tenant.lastActivityAt)
  const pendingResetRate = tenant.totalUsers > 0 ? tenant.pendingResetUsers / tenant.totalUsers : 0

  if (tenant.scopedProjects === 0 && (ageDays ?? 0) > 14) alerts.push('Asignar proyectos al scope')
  if (pendingResetRate > 0.8 && (ageDays ?? 0) > 7) alerts.push('Reenviar invitaciones')
  if (tenant.activeUsers === 0 && tenant.totalUsers > 5) alerts.push('Contactar al cliente')
  if ((lastActivityDays ?? 0) > 30) alerts.push('Revisar relacion')
  if (tenant.avgOnTimePct !== null && tenant.avgOnTimePct < 70) alerts.push('Revisar OTD%')

  return alerts
}

const buildStatusModel = (tenant: InternalDashboardClientRow) => {
  const ageDays = getDayDiff(tenant.createdAt)
  const lastActivityDays = getDayDiff(tenant.lastActivityAt)
  const pendingActivationRate = tenant.totalUsers > 0 ? tenant.invitedUsers / tenant.totalUsers : 0
  const pendingResetRate = tenant.totalUsers > 0 ? tenant.pendingResetUsers / tenant.totalUsers : 0

  if (tenant.scopedProjects === 0 && (ageDays ?? 0) > 14) {
    return {
      statusKey: 'attention' as const,
      statusLabel: 'Requiere atencion',
      statusTone: 'error' as const,
      statusDescription: 'Sin proyectos scoped despues de 14 dias.',
      statusPriority: 0
    }
  }

  if (tenant.activeUsers === 0 && tenant.totalUsers > 5) {
    return {
      statusKey: 'attention' as const,
      statusLabel: 'Requiere atencion',
      statusTone: 'error' as const,
      statusDescription: 'Sin activacion real del cliente.',
      statusPriority: 0
    }
  }

  if ((lastActivityDays ?? 0) > 60) {
    return {
      statusKey: 'inactive' as const,
      statusLabel: 'Inactivo',
      statusTone: 'default' as const,
      statusDescription: 'Sin actividad reciente en mas de 60 dias.',
      statusPriority: 3
    }
  }

  if ((ageDays ?? 999) < 30 || pendingResetRate > 0.8 || pendingActivationRate > 0.8) {
    return {
      statusKey: 'onboarding' as const,
      statusLabel: 'Onboarding',
      statusTone: 'warning' as const,
      statusDescription: 'Todavia en activacion o arranque.',
      statusPriority: 1
    }
  }

  if (tenant.scopedProjects > 0 && tenant.activeUsers > 0) {
    return {
      statusKey: 'active' as const,
      statusLabel: 'Activo',
      statusTone: 'success' as const,
      statusDescription: 'Con usuarios activos y proyectos scoped.',
      statusPriority: 2
    }
  }

  return {
    statusKey: 'inactive' as const,
    statusLabel: 'Inactivo',
    statusTone: 'default' as const,
    statusDescription: 'Sin senales claras de uso.',
    statusPriority: 3
  }
}

export const finalizeControlTowerTenant = (tenant: InternalDashboardClientRow): DerivedControlTowerTenant => {
  const ageDays = getDayDiff(tenant.createdAt)
  const lastActivityDays = getDayDiff(tenant.lastActivityAt)
  const statusModel = buildStatusModel(tenant)
  const capabilityCodes = [...tenant.businessLines, ...tenant.serviceModules]
  const lastActivityTimestamp = getDateValue(tenant.lastActivityAt)?.getTime() || 0
  const primaryAlerts = buildAttentionSummary(tenant)

  return {
    ...tenant,
    activationRate: tenant.totalUsers > 0 ? tenant.activeUsers / tenant.totalUsers : 0,
    pendingActivationRate: tenant.totalUsers > 0 ? tenant.invitedUsers / tenant.totalUsers : 0,
    statusKey: statusModel.statusKey,
    statusLabel: statusModel.statusLabel,
    statusTone: statusModel.statusTone,
    statusDescription: statusModel.statusDescription,
    statusPriority: statusModel.statusPriority,
    lastActivityDays,
    lastActivityLabel: formatRelativeDate(tenant.lastActivityAt),
    lastActivityTimestamp,
    ageDays,
    capabilityCodes,
    primaryAlerts,
    needsAttention: statusModel.statusKey === 'attention'
  }
}

export const compareControlTowerTenants = (left: DerivedControlTowerTenant, right: DerivedControlTowerTenant) => {
  if (left.statusPriority !== right.statusPriority) {
    return left.statusPriority - right.statusPriority
  }

  if (left.lastActivityTimestamp !== right.lastActivityTimestamp) {
    return right.lastActivityTimestamp - left.lastActivityTimestamp
  }

  return left.clientName.localeCompare(right.clientName)
}

export const buildControlTowerSummary = (
  tenants: DerivedControlTowerTenant[],
  internalAdmins: number
): ControlTowerSummary => {
  const now = new Date()
  const currentMonth = now.getUTCMonth()
  const currentYear = now.getUTCFullYear()

  const weighted = tenants.reduce(
    (accumulator, tenant) => {
      const createdAt = getDateValue(tenant.createdAt)
      const tenantOtdWeight = tenant.trackedOtdProjects
      const previousLastActivity = accumulator.lastActivityAt ? getDateValue(accumulator.lastActivityAt)?.getTime() || 0 : 0

      return {
        activeClients: accumulator.activeClients + (tenant.statusKey === 'active' ? 1 : 0),
        activeUsers: accumulator.activeUsers + tenant.activeUsers,
        invitedUsers: accumulator.invitedUsers + tenant.invitedUsers,
        totalUsers: accumulator.totalUsers + tenant.totalUsers,
        spacesWithoutActivity:
          accumulator.spacesWithoutActivity + (tenant.scopedProjects === 0 || (tenant.lastActivityDays ?? 999) > 30 ? 1 : 0),
        trackedOtdProjects: accumulator.trackedOtdProjects + tenantOtdWeight,
        otdWeightedSum: accumulator.otdWeightedSum + (tenant.avgOnTimePct ?? 0) * tenantOtdWeight,
        attentionCount: accumulator.attentionCount + (tenant.statusKey === 'attention' ? 1 : 0),
        onboardingCount: accumulator.onboardingCount + (tenant.statusKey === 'onboarding' ? 1 : 0),
        inactiveCount: accumulator.inactiveCount + (tenant.statusKey === 'inactive' ? 1 : 0),
        newClientsThisMonth:
          accumulator.newClientsThisMonth +
          (createdAt && createdAt.getUTCMonth() === currentMonth && createdAt.getUTCFullYear() === currentYear ? 1 : 0),
        lastActivityAt: tenant.lastActivityTimestamp > previousLastActivity ? tenant.lastActivityAt : accumulator.lastActivityAt
      }
    },
    {
      activeClients: 0,
      activeUsers: 0,
      invitedUsers: 0,
      totalUsers: 0,
      spacesWithoutActivity: 0,
      trackedOtdProjects: 0,
      otdWeightedSum: 0,
      attentionCount: 0,
      onboardingCount: 0,
      inactiveCount: 0,
      newClientsThisMonth: 0,
      lastActivityAt: null as string | null
    }
  )

  return {
    activeClients: weighted.activeClients,
    activeUsers: weighted.activeUsers,
    invitedUsers: weighted.invitedUsers,
    totalUsers: weighted.totalUsers,
    internalAdmins,
    spacesWithoutActivity: weighted.spacesWithoutActivity,
    avgOnTimePct: weighted.trackedOtdProjects > 0 ? weighted.otdWeightedSum / weighted.trackedOtdProjects : null,
    trackedOtdProjects: weighted.trackedOtdProjects,
    attentionCount: weighted.attentionCount,
    onboardingCount: weighted.onboardingCount,
    inactiveCount: weighted.inactiveCount,
    newClientsThisMonth: weighted.newClientsThisMonth,
    lastActivityAt: weighted.lastActivityAt
  }
}
