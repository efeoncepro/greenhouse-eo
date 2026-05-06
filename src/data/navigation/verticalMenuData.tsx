// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'
import { getGreenhouseNavigationCopy } from '@/config/greenhouse-navigation-copy'

const verticalMenuData = (locale?: string | null): VerticalMenuDataType[] => {
  const { client: GH_CLIENT_NAV } = getGreenhouseNavigationCopy(locale)

  return [
  {
    label: GH_CLIENT_NAV.dashboard.label,
    href: '/home',
    icon: 'tabler-smart-home'
  },
  {
    label: GH_CLIENT_NAV.projects.label,
    href: '/proyectos',
    icon: 'tabler-folders'
  },
  {
    label: GH_CLIENT_NAV.sprints.label,
    href: '/sprints',
    icon: 'tabler-bolt'
  },
  {
    label: GH_CLIENT_NAV.settings.label,
    href: '/settings',
    icon: 'tabler-settings'
  },
  {
    label: GH_CLIENT_NAV.updates.label,
    href: '/updates',
    icon: 'tabler-bell'
  }
  ]
}

export default verticalMenuData
