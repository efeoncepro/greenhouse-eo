'use client'

// React Imports
import type { ButtonHTMLAttributes, ReactElement } from 'react'

// Hook Imports
import useVerticalNav from '../../hooks/useVerticalNav'

// Icon Imports
import CloseIcon from '../../svg/Close'
import RadioCircleIcon from '../../svg/RadioCircle'
import RadioCircleMarkedIcon from '../../svg/RadioCircleMarked'

type NavCollapseIconsProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  closeIcon?: ReactElement
  lockedIcon?: ReactElement
  unlockedIcon?: ReactElement
  onClick?: () => void
  onClose?: () => void
  closeLabel?: string
  toggleLabel?: string
}

const NavCollapseIcons = (props: NavCollapseIconsProps) => {
  // Props
  const { closeIcon, lockedIcon, unlockedIcon, onClick, onClose, closeLabel, toggleLabel, ...rest } = props

  // Hooks
  const { isCollapsed, collapseVerticalNav, isBreakpointReached, toggleVerticalNav } = useVerticalNav()

  // Handle Lock / Unlock Icon Buttons click
  const handleClick = (action: 'lock' | 'unlock') => {
    // Setup the verticalNav to be locked or unlocked
    const collapse = action === 'lock' ? false : true

    // Tell the verticalNav to lock or unlock
    collapseVerticalNav(collapse)

    // Call onClick function if passed
    onClick && onClick()
  }

  // Handle Close button click
  const handleClose = () => {
    // Close verticalNav using toggle verticalNav function
    toggleVerticalNav(false)

    // Call onClose function if passed
    onClose && onClose()
  }

  return (
    <>
      {isBreakpointReached ? (
        <button
          type='button'
          aria-label={closeLabel}
          style={{ display: 'grid', placeItems: 'center', inlineSize: 24, blockSize: 24, padding: 0, border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer' }}
          onClick={handleClose}
          {...rest}
        >
          {closeIcon ?? <CloseIcon />}
        </button>
      ) : isCollapsed ? (
        <button
          type='button'
          aria-label={toggleLabel}
          style={{ display: 'grid', placeItems: 'center', inlineSize: 24, blockSize: 24, padding: 0, border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer' }}
          onClick={() => handleClick('lock')}
          {...rest}
        >
          {unlockedIcon ?? <RadioCircleIcon />}
        </button>
      ) : (
        <button
          type='button'
          aria-label={toggleLabel}
          style={{ display: 'grid', placeItems: 'center', inlineSize: 24, blockSize: 24, padding: 0, border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer' }}
          onClick={() => handleClick('unlock')}
          {...rest}
        >
          {lockedIcon ?? <RadioCircleMarkedIcon />}
        </button>
      )}
    </>
  )
}

export default NavCollapseIcons
