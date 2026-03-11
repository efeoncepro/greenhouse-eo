'use client'

// React Imports
import { useRef, useState } from 'react'

// MUI Imports
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import MenuList from '@mui/material/MenuList'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

// Type Imports
import type { Mode } from '@core/types'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

const ModeDropdown = () => {
  // States
  const [open, setOpen] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)

  // Refs
  const anchorRef = useRef<HTMLButtonElement>(null)

  // Hooks
  const { settings, updateSettings } = useSettings()

  const handleClose = () => {
    setOpen(false)
    setTooltipOpen(false)
  }

  const handleToggle = () => {
    setOpen(prevOpen => !prevOpen)
  }

  const handleModeSwitch = (mode: Mode) => {
    handleClose()

    if (settings.mode !== mode) {
      updateSettings({ mode: mode })
    }
  }

  const getModeIcon = () => {
    if (settings.mode === 'system') {
      return 'tabler-device-laptop'
    } else if (settings.mode === 'dark') {
      return 'tabler-moon-stars'
    } else {
      return 'tabler-sun'
    }
  }

  const modeOptions: Array<{ value: Mode; label: string; icon: string }> = [
    { value: 'light', label: 'Claro', icon: 'tabler-sun' },
    { value: 'dark', label: 'Oscuro', icon: 'tabler-moon-stars' },
    { value: 'system', label: 'Sistema', icon: 'tabler-device-laptop' }
  ]

  return (
    <>
      <Tooltip
        title={`Tema: ${modeOptions.find(option => option.value === settings.mode)?.label || 'Sistema'}`}
        onOpen={() => setTooltipOpen(true)}
        onClose={() => setTooltipOpen(false)}
        open={open ? false : tooltipOpen ? true : false}
      >
        <IconButton
          ref={anchorRef}
          onClick={handleToggle}
          className='text-textPrimary'
          aria-label='Cambiar tema'
          aria-haspopup='menu'
          aria-expanded={open}
        >
          <i className={getModeIcon()} />
        </IconButton>
      </Tooltip>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        className='min-is-[160px] !mbs-3 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{ transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top' }}
          >
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList onKeyDown={handleClose}>
                  {modeOptions.map(option => (
                    <MenuItem
                      key={option.value}
                      className='gap-3 rounded-lg m-1'
                      onClick={() => handleModeSwitch(option.value)}
                      selected={settings.mode === option.value}
                    >
                      <i className={option.icon} />
                      <Typography color='text.primary'>{option.label}</Typography>
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default ModeDropdown
