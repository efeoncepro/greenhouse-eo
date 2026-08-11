'use client'

// MUI Imports
import IconButton from '@mui/material/IconButton'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Copy Imports
import { getMicrocopy } from '@/lib/copy'

const microcopy = getMicrocopy()

const NavToggle = () => {
  // Hooks
  const { toggleVerticalNav, isBreakpointReached } = useVerticalNav()

  const handleClick = () => {
    toggleVerticalNav()
  }

  // TASK-1388 (a11y) — el toggle del drawer era un `<i>` sin role ni nombre
  // accesible; ahora es un botón real con aria-label.
  return (
    <>
      {isBreakpointReached && (
        <IconButton aria-label={microcopy.aria.openMenu} className='text-textPrimary' onClick={handleClick}>
          <i className='tabler-menu-2 text-2xl' />
        </IconButton>
      )}
    </>
  )
}

export default NavToggle
