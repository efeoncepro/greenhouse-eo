'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { GH_NEXA } from '@/lib/copy/nexa'
import { useNexaInteractionMode } from '@/lib/nexa/nexa-interaction-mode-context'
import type { NexaInteractionMode } from '@/lib/nexa/interaction-mode'

const COPY = GH_NEXA.interactionMode

const MODE_ICON: Record<NexaInteractionMode, string> = {
  dock: 'tabler-message-circle',
  expandible: 'tabler-layout-bottombar-expand',
  lane: 'tabler-layout-sidebar-right'
}

/**
 * TASK-1079 — selector del modo de interacción con Nexa (dock A / expandible B /
 * lane C). Reusado por el header del panel flotante y el del lane. Solo ofrece los
 * modos disponibles (gating por flags). `tone='onNavy'` para los headers navy.
 */
const NexaModeMenu = ({ tone = 'default' }: { tone?: 'default' | 'onNavy' }) => {
  const theme = useTheme()
  const { mode, availableModes, setMode } = useNexaInteractionMode()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  // Con un solo modo disponible no hay nada que elegir → no renderiza el control.
  if (availableModes.length < 2) return null

  const onNavy = tone === 'onNavy'

  return (
    <>
      <Tooltip title={COPY.menu_trigger_aria}>
        <Box
          component='button'
          type='button'
          aria-label={COPY.menu_trigger_aria}
          aria-haspopup='menu'
          aria-expanded={Boolean(anchor)}
          onClick={e => setAnchor(e.currentTarget)}
          sx={{
            width: 34,
            height: 34,
            flexShrink: 0,
            p: 0,
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'transparent',
            color: onNavy ? alpha(theme.palette.common.white, 0.85) : 'text.secondary',
            transition: theme.transitions.create(['background-color', 'color'], { duration: theme.transitions.duration.shorter }),
            '&:hover': onNavy
              ? { bgcolor: alpha(theme.palette.common.white, 0.2), color: 'common.white' }
              : { bgcolor: 'action.hover', color: 'text.primary' },
            '&:focus-visible': {
              outline: `2px solid ${alpha(theme.palette.primary.main, 0.7)}`,
              outlineOffset: 2
            }
          }}
        >
          <i className='tabler-layout-distribute-horizontal' style={{ fontSize: '1.1rem' }} />
        </Box>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 0.5, minWidth: 248 } } }}
      >
        <Typography variant='overline' sx={{ px: 2, py: 1, display: 'block', color: 'text.disabled', letterSpacing: '0.08em', fontWeight: 600 }}>
          {COPY.menu_title}
        </Typography>
        {availableModes.map(option => {
          const meta = COPY.options[option]
          const selected = option === mode

          return (
            <MenuItem
              key={option}
              selected={selected}
              onClick={() => {
                setMode(option)
                setAnchor(null)
              }}
              sx={{ py: 1.25, gap: 1, alignItems: 'flex-start' }}
            >
              <ListItemIcon sx={{ minWidth: 0, mt: 0.25, color: selected ? 'primary.main' : 'text.secondary' }}>
                <i className={MODE_ICON[option]} style={{ fontSize: '1.1rem' }} />
              </ListItemIcon>
              <ListItemText
                primary={meta.label}
                secondary={meta.description}
                primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: selected ? 600 : 500 } }}
                secondaryTypographyProps={{ variant: 'caption', sx: { lineHeight: 1.4 } }}
              />
              {selected ? (
                <i className='tabler-check' style={{ fontSize: '1rem', color: 'var(--mui-palette-primary-main)', marginTop: 4 }} />
              ) : null}
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}

export default NexaModeMenu
