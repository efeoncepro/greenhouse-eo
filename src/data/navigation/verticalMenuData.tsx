// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'

const verticalMenuData = (): VerticalMenuDataType[] => [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'tabler-smart-home'
  },
  {
    label: 'Proyectos',
    href: '/proyectos',
    icon: 'tabler-folders'
  },
  {
    label: 'Sprints',
    href: '/sprints',
    icon: 'tabler-bolt'
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: 'tabler-settings'
  }
]

export default verticalMenuData
