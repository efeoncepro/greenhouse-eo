'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import type { ThemeColor } from '@core/types'

import { LEGAL_PROFILE_COPY } from './copy'
import type { ItemAccent, LegalDocumentStatus } from './types'

interface LegalProfileItemProps {
  iconClassName: string
  title: string
  subtitle?: ReactNode
  accent: ItemAccent
  status?: LegalDocumentStatus | 'missing'
  expanded: boolean
  onToggle: () => void
  /** Status block shown below header (verified info, rejected reason, etc.) */
  statusBlock?: ReactNode
  /** Form to render when expanded */
  form?: ReactNode
  /** Empty/add variant — different visuals */
  variant?: 'item' | 'add'
}

const ACCENT_COLOR_MAP: Record<ItemAccent, 'success' | 'warning' | 'error' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  neutral: 'secondary'
}

const STATUS_TO_CHIP_ICON: Record<LegalDocumentStatus | 'missing', string> = {
  pending_review: 'tabler-clock',
  verified: 'tabler-check',
  rejected: 'tabler-x',
  archived: 'tabler-archive',
  expired: 'tabler-calendar-off',
  missing: 'tabler-circle'
}

/**
 * TASK-784 flat redesign — Single-container pattern.
 *
 * NO Card wrapper, NO border, NO borderRadius, NO box-shadow, NO borderLeft
 * accent. Estado se comunica por chip + icon tinted bg + subtitle tonal.
 *
 * El componente padre (LegalProfileTab) provee el unico container y dibuja
 * `<Divider/>` entre items.
 */
const LegalProfileItem = ({
  iconClassName,
  title,
  subtitle,
  accent,
  status,
  expanded,
  onToggle,
  statusBlock,
  form,
  variant = 'item'
}: LegalProfileItemProps) => {
  const theme = useTheme()
  const isAdd = variant === 'add'
  const accentPaletteKey = ACCENT_COLOR_MAP[accent]

  const iconBg =
    accentPaletteKey === 'secondary'
      ? alpha(theme.palette.text.primary, 0.04)
      : alpha(theme.palette[accentPaletteKey].main, 0.12)

  const iconFg =
    accentPaletteKey === 'secondary'
      ? theme.palette.text.secondary
      : theme.palette[accentPaletteKey].main

  const chipLabel = status
    ? LEGAL_PROFILE_COPY.states[status as keyof typeof LEGAL_PROFILE_COPY.states]
    : null

  const chipColor: ThemeColor =
    accentPaletteKey === 'secondary' ? 'secondary' : (accentPaletteKey as ThemeColor)

  const chipIcon = status ? STATUS_TO_CHIP_ICON[status] : null

  return (
    <Box
      sx={{
        backgroundColor: 'transparent',
        transition: theme.transitions.create('background-color', { duration: 150 }),
        '&:hover': {
          backgroundColor: alpha(theme.palette.text.primary, 0.025)
        }
      }}
    >
      <Box
        component='button'
        type='button'
        onClick={onToggle}
        aria-expanded={expanded}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          px: 6,
          py: 4,
          width: '100%',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          color: 'inherit',
          font: 'inherit',
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: '-2px'
          }
        }}
      >
        <Box
          aria-hidden='true'
          sx={{
            width: 36,
            height: 36,
            borderRadius: theme.shape.customBorderRadius.md,
            backgroundColor: iconBg,
            color: iconFg,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0
          }}
        >
          <i className={iconClassName} style={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction='row'
            alignItems='center'
            spacing={2}
            flexWrap='wrap'
            sx={{ mb: subtitle ? 0.5 : 0 }}
          >
            <Typography
              variant='body2'
              sx={{
                fontWeight: isAdd ? 500 : 600,
                color: isAdd ? 'text.secondary' : 'text.primary'
              }}
            >
              {title}
            </Typography>
            {chipLabel && chipIcon ? (
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color={chipColor}
                label={chipLabel}
                icon={
                  <i
                    className={chipIcon}
                    style={{ fontSize: 12, marginLeft: 4 }}
                    aria-hidden='true'
                  />
                }
                sx={{ height: 20, '& .MuiChip-label': { px: 1.5, fontSize: 11 } }}
              />
            ) : null}
          </Stack>
          {subtitle ? (
            <Typography variant='caption' color='text.secondary' component='div'>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <i
          className='tabler-chevron-down'
          style={{
            fontSize: 18,
            color: theme.palette.text.secondary,
            transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0
          }}
          aria-hidden='true'
        />
      </Box>

      {statusBlock && !expanded ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
            // Sangrado: mismo offset del icon (px:6 + 36px + gap 4 = ~80px)
            pl: `calc(${theme.spacing(6)} + 36px + ${theme.spacing(4)})`,
            pr: 6,
            pb: 4,
            mt: -2,
            color: 'text.secondary',
            fontSize: 13
          }}
        >
          {statusBlock}
        </Box>
      ) : null}

      <Collapse in={expanded} timeout={200} unmountOnExit={false}>
        {form ? (
          <Box
            sx={{
              backgroundColor: alpha(theme.palette.text.primary, 0.02),
              borderTop: `1px solid ${theme.palette.divider}`
            }}
          >
            {form}
          </Box>
        ) : null}
      </Collapse>
    </Box>
  )
}

export default LegalProfileItem
