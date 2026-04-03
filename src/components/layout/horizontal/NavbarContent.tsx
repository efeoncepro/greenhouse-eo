'use client'

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import NavToggle from './NavToggle'
import Logo from '@components/layout/shared/Logo'
import NavSearch from '@components/layout/shared/search'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import ShortcutsDropdown from '@components/layout/shared/ShortcutsDropdown'
import NotificationDropdown from '@components/layout/shared/NotificationsDropdown'
import UserDropdown from '@components/layout/shared/UserDropdown'

// Hook Imports
import useHorizontalNav from '@menu/hooks/useHorizontalNav'

// Util Imports
import { horizontalLayoutClasses } from '@layouts/utils/layoutClasses'

// Shortcuts data
const shortcuts = [
  { url: '/finance', icon: 'tabler-chart-bar', title: 'Finanzas', subtitle: 'Dashboard' },
  { url: '/finance/income', icon: 'tabler-cash', title: 'Ventas', subtitle: 'Documentos de venta' },
  { url: '/admin/users', icon: 'tabler-users', title: 'Usuarios', subtitle: 'Gestión' },
  { url: '/admin/roles', icon: 'tabler-lock', title: 'Roles', subtitle: 'Permisos' },
  { url: '/hr/payroll', icon: 'tabler-report-money', title: 'Nómina', subtitle: 'People' },
  { url: '/admin/settings', icon: 'tabler-settings', title: 'Configuración', subtitle: 'Sistema' }
]

const NavbarContent = () => {
  // Hooks
  const { isBreakpointReached } = useHorizontalNav()

  return (
    <div
      className={classnames(horizontalLayoutClasses.navbarContent, 'flex items-center justify-between gap-4 is-full')}
    >
      <div className='flex items-center gap-4'>
        <NavToggle />
        {!isBreakpointReached && <Logo />}
        <NavSearch />
      </div>
      <div className='flex items-center gap-1'>
        <ModeDropdown />
        <ShortcutsDropdown shortcuts={shortcuts} />
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </div>
  )
}

export default NavbarContent
