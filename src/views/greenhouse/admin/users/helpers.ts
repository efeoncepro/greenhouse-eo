import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'

import type { ThemeColor } from '@core/types'

import type { AdminUserDetail } from '@/lib/admin/get-admin-user-detail'

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

export const statusTone = (status: string): ThemeColor => {
  if (status === 'active') return 'success'
  if (status === 'invited' || status === 'pending') return 'warning'
  if (status === 'suspended') return 'error'

  return 'secondary'
}

export const tenantTone = (tenantType: string): ThemeColor =>
  tenantType === 'efeonce_internal' ? 'info' : 'success'

export const accessLevelTone = (accessLevel: string): ThemeColor => {
  if (accessLevel.includes('admin') || accessLevel.includes('write')) return 'success'
  if (accessLevel.includes('edit')) return 'info'
  if (accessLevel.includes('comment')) return 'warning'

  return 'secondary'
}

export const roleIconFor = (roleCode: string) => {
  const normalized = roleCode.toLowerCase()

  if (normalized.includes('admin')) return 'tabler-crown'
  if (normalized.includes('creative') || normalized.includes('design')) return 'tabler-palette'
  if (normalized.includes('ops') || normalized.includes('operations')) return 'tabler-briefcase'
  if (normalized.includes('finance') || normalized.includes('billing')) return 'tabler-cash'
  if (normalized.includes('campaign')) return 'tabler-speakerphone'

  return 'tabler-user'
}

export const roleColorFor = (roleCode: string): ThemeColor => {
  const normalized = roleCode.toLowerCase()

  if (normalized.includes('admin')) return 'error'
  if (normalized.includes('internal')) return 'info'
  if (normalized.includes('ops') || normalized.includes('operations')) return 'warning'

  return 'primary'
}

export const getProjectAccessProgress = (accessLevel: string) => {
  const normalized = accessLevel.toLowerCase()

  if (normalized.includes('admin')) return 100
  if (normalized.includes('write') || normalized.includes('edit')) return 78
  if (normalized.includes('comment')) return 56

  return 32
}

export type UserTimelineEvent = {
  id: string
  color: ThemeColor
  title: string
  caption: string
  timestamp: string | null
}

export const buildUserTimeline = (data: AdminUserDetail): UserTimelineEvent[] =>
  [
    {
      id: 'last-login',
      color: 'success' as ThemeColor,
      title: data.lastLoginAt ? 'Ultimo acceso al portal' : 'Sin acceso registrado',
      caption: data.lastLoginAt
        ? `Ingreso a ${data.defaultPortalHomePath || '/dashboard'} desde el tenant ${data.client.clientName}.`
        : 'El usuario aun no registra login visible en Greenhouse.',
      timestamp: data.lastLoginAt
    },
    {
      id: 'scope-sync',
      color: 'info' as ThemeColor,
      title: `${data.projectScopes.length} scopes de proyecto activos`,
      caption:
        data.projectScopes.length > 0
          ? `Visibilidad sobre ${data.projectScopes.length} proyectos y ${data.campaignScopes.length} campanas.`
          : 'No hay scopes de proyecto activos para este usuario.',
      timestamp: data.updatedAt
    },
    {
      id: 'invite',
      color: 'warning' as ThemeColor,
      title: data.invitedAt ? 'Invitacion emitida' : 'Invitacion no registrada',
      caption: data.invitedAt
        ? `Modo de autenticacion ${toTitleCase(data.authMode)} y estado ${toTitleCase(data.status)}.`
        : 'No existe timestamp de invitacion disponible en BigQuery.',
      timestamp: data.invitedAt
    },
    {
      id: 'created',
      color: 'primary' as ThemeColor,
      title: 'Alta en client_users',
      caption: `Usuario asociado a ${data.client.clientName} (${toTitleCase(data.tenantType)}).`,
      timestamp: data.createdAt
    }
  ].sort((left, right) => {
    const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0
    const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0

    return rightTime - leftTime
  })
