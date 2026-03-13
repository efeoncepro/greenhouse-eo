// Type Imports
import type { HorizontalMenuDataType } from '@/types/menuTypes'
import { GH_NAV } from '@/config/greenhouse-nomenclature'

const horizontalMenuData = (): HorizontalMenuDataType[] => [
  {
    label: GH_NAV.dashboard.label,
    href: '/dashboard',
    icon: 'tabler-smart-home'
  },
  {
    label: GH_NAV.projects.label,
    href: '/proyectos',
    icon: 'tabler-folders'
  },
  {
    label: GH_NAV.sprints.label,
    href: '/sprints',
    icon: 'tabler-bolt'
  },
  {
    label: GH_NAV.settings.label,
    href: '/settings',
    icon: 'tabler-settings'
  }
]

export default horizontalMenuData
