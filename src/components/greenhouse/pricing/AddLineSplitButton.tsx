'use client'

import { useCallback, useRef, useState } from 'react'

import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Grow from '@mui/material/Grow'
import MenuItem from '@mui/material/MenuItem'
import MenuList from '@mui/material/MenuList'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_PRICING } from '@/lib/copy/pricing'

export interface AddLineSplitButtonProps {
  onCatalog: () => void
  onService: () => void
  onTemplate: () => void
  onManual: () => void
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
}

type MenuKey = 'catalog' | 'service' | 'template' | 'manual'

const MENU_ITEMS: Array<{ key: MenuKey; icon: string; color: 'primary' | 'success' | 'info' | 'warning' }> = [
  { key: 'catalog', icon: 'tabler-books', color: 'primary' },
  { key: 'service', icon: 'tabler-package', color: 'success' },
  { key: 'template', icon: 'tabler-template', color: 'info' },
  { key: 'manual', icon: 'tabler-edit', color: 'info' }
]

const AddLineSplitButton = ({
  onCatalog,
  onService,
  onTemplate,
  onManual,
  disabled = false,
  size = 'small'
}: AddLineSplitButtonProps) => {
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)

  const handleMenu = useCallback(
    (key: MenuKey) => {
      setOpen(false)

      switch (key) {
        case 'catalog':
          return onCatalog()
        case 'service':
          return onService()
        case 'template':
          return onTemplate()
        case 'manual':
          return onManual()
      }
    },
    [onCatalog, onService, onTemplate, onManual]
  )

  const handleToggle = useCallback(() => setOpen(prev => !prev), [])
  const handleClose = useCallback(() => setOpen(false), [])

  return (
    <>
      <ButtonGroup
        ref={anchorRef}
        variant='contained'
        size={size}
        disabled={disabled}
        aria-label={GH_PRICING.addMenu.triggerLabel}
      >
        <Button
          onClick={onCatalog}
          startIcon={<i className='tabler-plus' aria-hidden='true' />}
          aria-label={GH_PRICING.addMenu.defaultAriaLabel}
        >
          {GH_PRICING.addMenu.triggerLabel}
        </Button>
        <Button
          size={size}
          aria-controls={open ? 'add-line-menu' : undefined}
          aria-expanded={open}
          aria-haspopup='menu'
          aria-label={GH_PRICING.addMenu.caretAriaLabel}
          onClick={handleToggle}
          sx={{ minWidth: 32, px: 1 }}
        >
          <i className='tabler-chevron-down' aria-hidden='true' />
        </Button>
      </ButtonGroup>
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement='bottom-end'
        transition
        disablePortal={false}
        sx={{ zIndex: theme => theme.zIndex.modal + 1 }}
      >
        {({ TransitionProps }) => (
          <Grow {...TransitionProps} style={{ transformOrigin: 'top right' }}>
            <Paper
              sx={theme => ({
                mt: 1,
                minWidth: 292,
                border: `1px solid ${theme.greenhouseElevation.floating.borderColor}`,
                borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                boxShadow: theme.greenhouseElevation.floating.boxShadow,
                overflow: 'hidden'
              })}
            >
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id='add-line-menu' autoFocusItem={open} sx={{ p: 0.75 }}>
                  {MENU_ITEMS.map(item => (
                    <MenuItem
                      key={item.key}
                      onClick={() => handleMenu(item.key)}
                      sx={theme => ({
                        py: 1.1,
                        px: 1.2,
                        gap: 1.25,
                        minHeight: 48,
                        borderRadius: `${theme.shape.customBorderRadius.md}px`,
                        '&:hover, &.Mui-focusVisible': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.06)
                        }
                      })}
                    >
                      <Stack
                        alignItems='center'
                        justifyContent='center'
                        sx={theme => ({
                          width: 30,
                          height: 30,
                          borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                          color: `${item.color}.main`,
                          backgroundColor: alpha(theme.palette[item.color].main, 0.08),
                          flexShrink: 0
                        })}
                      >
                        <i className={item.icon} aria-hidden='true' style={{ fontSize: 17 }} />
                      </Stack>
                      <Stack spacing={0}>
                        <Typography variant='body2' sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                          {GH_PRICING.addMenu.items[item.key]}
                        </Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  )
}

export default AddLineSplitButton
