'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Collapse from '@mui/material/Collapse'
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

  const accentColor =
    accentPaletteKey === 'secondary'
      ? theme.palette.divider
      : theme.palette[accentPaletteKey].main

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

  const chipIcon =
    status === 'verified'
      ? 'tabler-check'
      : status === 'pending_review'
        ? 'tabler-clock'
        : status === 'rejected'
          ? 'tabler-x'
          : status === 'missing'
            ? 'tabler-circle'
            : null

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: theme.shape.customBorderRadius.lg,
        transition: theme.transitions.create(['box-shadow', 'border-color'], { duration: 200 }),
        overflow: 'hidden',
        ...(isAdd && {
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: alpha(theme.palette.primary.main, 0.02)
          }
        }),
        '&:hover': {
          boxShadow: `0 4px 18px ${alpha(theme.palette.text.primary, 0.08)}`
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
          px: 5,
          py: 5,
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
            width: 40,
            height: 40,
            borderRadius: theme.shape.customBorderRadius.md,
            backgroundColor: iconBg,
            color: iconFg,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0
          }}
        >
          <i className={iconClassName} style={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant='body1'
            sx={{
              fontWeight: 600,
              mb: subtitle ? 0.5 : 0,
              color: isAdd ? 'text.secondary' : 'text.primary'
            }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant='body2' color='text.secondary' component='div'>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
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
                style={{ fontSize: 14, marginLeft: 4 }}
                aria-hidden='true'
              />
            }
            sx={{ flexShrink: 0 }}
          />
        ) : null}
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
            alignItems: 'center',
            gap: 3,
            px: 5,
            pt: 4,
            pb: 5,
            borderTop: `1px solid ${theme.palette.divider}`,
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
              borderTop: `1px solid ${theme.palette.divider}`,
              background: `linear-gradient(180deg, ${alpha(theme.palette.text.primary, 0.02)}, ${theme.palette.background.paper})`
            }}
          >
            {form}
          </Box>
        ) : null}
      </Collapse>
    </Card>
  )
}

export default LegalProfileItem
