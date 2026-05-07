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

const MENU_ITEMS: Array<{ key: MenuKey; icon: string; color: 'primary' | 'success' | 'info' | 'secondary' }> = [
  { key: 'catalog', icon: 'tabler-books', color: 'primary' },
  { key: 'service', icon: 'tabler-package', color: 'success' },
  { key: 'template', icon: 'tabler-template', color: 'info' },
  { key: 'manual', icon: 'tabler-edit', color: 'secondary' }
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
              elevation={4}
              sx={theme => ({
                mt: 1,
                minWidth: 260,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                overflow: 'hidden'
              })}
            >
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id='add-line-menu' autoFocusItem={open}>
                  {MENU_ITEMS.map(item => (
                    <MenuItem
                      key={item.key}
                      onClick={() => handleMenu(item.key)}
                      sx={{ py: 1.25, gap: 1.5, minHeight: 44 }}
                    >
                      <i
                        className={item.icon}
                        aria-hidden='true'
                        style={{ fontSize: 18, color: `var(--mui-palette-${item.color}-main)` }}
                      />
                      <Stack spacing={0}>
                        <Typography variant='body2' sx={{ fontWeight: 500, lineHeight: 1.3 }}>
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
