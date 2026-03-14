'use client'

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import NavToggle from './NavToggle'
import NavSearch from '@components/layout/shared/search'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import ShortcutsDropdown from '@components/layout/shared/ShortcutsDropdown'
import NotificationDropdown from '@components/layout/shared/NotificationsDropdown'
import UserDropdown from '@components/layout/shared/UserDropdown'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

// Shortcuts data
const shortcuts = [
  { url: '/finance', icon: 'tabler-chart-bar', title: 'Finanzas', subtitle: 'Dashboard' },
  { url: '/finance/income', icon: 'tabler-cash', title: 'Ingresos', subtitle: 'Facturación' },
  { url: '/admin/users', icon: 'tabler-users', title: 'Usuarios', subtitle: 'Gestión' },
  { url: '/admin/roles', icon: 'tabler-lock', title: 'Roles', subtitle: 'Permisos' },
  { url: '/hr/payroll', icon: 'tabler-report-money', title: 'Nómina', subtitle: 'People' },
  { url: '/admin/settings', icon: 'tabler-settings', title: 'Configuración', subtitle: 'Sistema' }
]

// Notifications data (placeholder — replace with real data source)
const notifications = [
  {
    title: 'Bienvenido a Greenhouse',
    subtitle: 'Tu portal operativo está listo',
    time: 'Ahora',
    read: false,
    avatarIcon: 'tabler-plant-2',
    avatarColor: 'success' as const
  }
]

const NavbarContent = () => {
  return (
    <div className={classnames(verticalLayoutClasses.navbarContent, 'flex items-center justify-between gap-4 is-full')}>
      <div className='flex items-center gap-4'>
        <NavToggle />
        <NavSearch />
      </div>
      <div className='flex items-center gap-1'>
        <ModeDropdown />
        <ShortcutsDropdown shortcuts={shortcuts} />
        <NotificationDropdown notifications={notifications} />
        <UserDropdown />
      </div>
    </div>
  )
}

export default NavbarContent
