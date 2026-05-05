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

// TASK-553 — Shortcuts data is no longer hardcoded here. ShortcutsDropdown
// is self-contained: it reads /api/me/shortcuts (canonical resolver +
// per-user pins). To register a new shortcut, extend src/lib/shortcuts/catalog.ts.

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
        <ShortcutsDropdown />
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </div>
  )
}

export default NavbarContent
