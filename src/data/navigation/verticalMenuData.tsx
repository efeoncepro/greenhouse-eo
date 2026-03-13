// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'
import { GH_CLIENT_NAV } from '@/config/greenhouse-nomenclature'

const verticalMenuData = (): VerticalMenuDataType[] => [
  {
    label: GH_CLIENT_NAV.dashboard.label,
    href: '/dashboard',
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
  }
]

export default verticalMenuData
