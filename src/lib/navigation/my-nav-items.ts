/**
 * TASK-1388 — builder canónico de la navegación personal (`/my/*`).
 *
 * Única fuente del conjunto hoja+gating de "Mi Ficha", consumida por DOS
 * superficies que deben permanecer idénticas en visibilidad:
 *
 *   - `UserDropdown` (portal interno): tras el rehome de TASK-1388 lo personal
 *     vive en el dropdown del avatar, no en el sidebar.
 *   - `VerticalMenu` (rama no-interna): el colaborador puro (routeGroup `my`)
 *     conserva "Mi Ficha" en su rail — para él ES su contenido (guardrail del
 *     follow-up del portal cliente en la spec de TASK-1388).
 *
 * El gating replica el contrato del menú (TASK-136): `authorizedViews` vacío →
 * fallback permisivo por ítem; los ítems dinámicos exigen además su condición
 * de sesión (TASK-796 contractor / TASK-1022 contratos). Este builder NO
 * decide autorización de página — la page server-side sigue siendo la puerta.
 */

import type { GH_MY_NAV } from '@/config/greenhouse-nomenclature'

export type MyNavCopyKey = keyof typeof GH_MY_NAV

export interface MyNavAccess {
  authorizedViews: readonly string[]
  /** TASK-796 — `/my/contractor` sólo con engagement vivo. */
  hasActiveContractorEngagement: boolean
  /** TASK-1022 — `/my/offers` y `/my/contracts` sólo con documento de contratación. */
  hasWorkforceContractingDocument: boolean
}

export interface MyNavItem {
  copyKey: MyNavCopyKey
  href: string
  icon: string
  viewCode: string
}

interface MyNavItemDefinition extends MyNavItem {
  requires?: (access: MyNavAccess) => boolean
}

const MY_NAV_ITEMS: readonly MyNavItemDefinition[] = [
  { copyKey: 'assignments', href: '/my/assignments', icon: 'tabler-users', viewCode: 'mi_ficha.mis_asignaciones' },
  { copyKey: 'performance', href: '/my/performance', icon: 'tabler-chart-bar', viewCode: 'mi_ficha.mi_desempeno' },
  { copyKey: 'delivery', href: '/my/delivery', icon: 'tabler-list-check', viewCode: 'mi_ficha.mi_delivery' },
  { copyKey: 'profile', href: '/my/profile', icon: 'tabler-user-circle', viewCode: 'mi_ficha.mi_perfil' },
  { copyKey: 'payroll', href: '/my/payroll', icon: 'tabler-receipt', viewCode: 'mi_ficha.mi_nomina' },
  {
    copyKey: 'contractor',
    href: '/my/contractor',
    icon: 'tabler-briefcase',
    viewCode: 'mi_ficha.mi_contratacion',
    requires: access => access.hasActiveContractorEngagement
  },
  {
    copyKey: 'offers',
    href: '/my/offers',
    icon: 'tabler-file-text',
    viewCode: 'mi_ficha.mis_contratos',
    requires: access => access.hasWorkforceContractingDocument
  },
  {
    copyKey: 'contracts',
    href: '/my/contracts',
    icon: 'tabler-file-certificate',
    viewCode: 'mi_ficha.mis_contratos',
    requires: access => access.hasWorkforceContractingDocument
  },
  { copyKey: 'paymentProfile', href: '/my/payment-profile', icon: 'tabler-credit-card', viewCode: 'mi_ficha.mi_cuenta_pago' },
  { copyKey: 'leave', href: '/my/leave', icon: 'tabler-calendar-event', viewCode: 'mi_ficha.mis_permisos' },
  { copyKey: 'goals', href: '/my/goals', icon: 'tabler-target', viewCode: 'mi_ficha.mis_objetivos' },
  { copyKey: 'evaluations', href: '/my/evaluations', icon: 'tabler-clipboard-check', viewCode: 'mi_ficha.mis_evaluaciones' },
  { copyKey: 'organization', href: '/my/organization', icon: 'tabler-building', viewCode: 'mi_ficha.mi_organizacion' }
] as const

/** Ítem de entrada "Mi Greenhouse" (`/my`) — el dropdown del avatar lo antepone; el rail del colaborador lo pinta aparte como home. */
export const MY_NAV_HOME: MyNavItem = {
  copyKey: 'dashboard',
  href: '/my',
  icon: 'tabler-smart-home',
  viewCode: 'mi_ficha.mi_inicio'
}

const canSeeView = (authorizedViews: readonly string[], viewCode: string): boolean => {
  if (authorizedViews.length === 0) return true

  return authorizedViews.includes(viewCode)
}

export const buildMyNavItems = (access: MyNavAccess, options?: { includeHome?: boolean }): MyNavItem[] => {
  const items = MY_NAV_ITEMS.filter(item => {
    if (item.requires && !item.requires(access)) return false

    return canSeeView(access.authorizedViews, item.viewCode)
  }).map(item => ({ copyKey: item.copyKey, href: item.href, icon: item.icon, viewCode: item.viewCode }))

  if (options?.includeHome && canSeeView(access.authorizedViews, MY_NAV_HOME.viewCode)) {
    return [MY_NAV_HOME, ...items]
  }

  return items
}
