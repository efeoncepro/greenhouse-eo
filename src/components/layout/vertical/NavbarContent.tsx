'use client'

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import NavToggle from './NavToggle'
import GlobalCommandPalette from '@components/layout/shared/GlobalCommandPalette'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import ShortcutsDropdown from '@components/layout/shared/ShortcutsDropdown'
import NotificationDropdown from '@components/layout/shared/NotificationsDropdown'
import UserDropdown from '@components/layout/shared/UserDropdown'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

// TASK-553 — Shortcuts data is no longer hardcoded here. ShortcutsDropdown
// is self-contained: it reads /api/me/shortcuts (canonical resolver +
// per-user pins). To register a new shortcut, extend src/lib/shortcuts/catalog.ts.

type Props = {
  /** TASK-1388 — avatar del chrome resuelto server-side en `(dashboard)/layout.tsx`. */
  avatarUrl?: string | null
}

const NavbarContent = ({ avatarUrl = null }: Props) => {
  return (
    <div className={classnames(verticalLayoutClasses.navbarContent, 'flex items-center justify-between gap-4 is-full')}>
      <div className='flex items-center gap-4'>
        <NavToggle />
        <GlobalCommandPalette />
      </div>
      <div className='flex items-center gap-1'>
        <ModeDropdown />
        <ShortcutsDropdown />
        <NotificationDropdown />
        <UserDropdown avatarUrl={avatarUrl} />
      </div>
    </div>
  )
}

export default NavbarContent
