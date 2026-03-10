// Type Imports
import type { HorizontalMenuDataType } from '@/types/menuTypes'

const horizontalMenuData = (): HorizontalMenuDataType[] => [
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

export default horizontalMenuData
