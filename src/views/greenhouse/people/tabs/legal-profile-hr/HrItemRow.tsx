'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import type { ThemeColor } from '@core/types'

import type { ItemAccent } from './types'

interface HrItemRowProps {
  iconClassName: string
  title: string
  /** Mascara fija debajo del titulo (e.g. xx.xxx.678-K) */
  mask?: string | null
  chipLabel?: string | null
  chipColor?: ThemeColor
  chipIcon?: string | null
  subtitle?: ReactNode
  accent: ItemAccent
  /** Acciones (botones) inline */
  actions?: ReactNode
  /** Banner por encima de las acciones (e.g. reject reason) */
  preActionsBanner?: ReactNode
  /** Form embebido (cuando esta editando HR-direct) */
  expandedForm?: ReactNode
}

const ACCENT_PALETTE: Record<ItemAccent, 'success' | 'warning' | 'error' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  neutral: 'secondary'
}

const HrItemRow = ({
  iconClassName,
  title,
  mask,
  chipLabel,
  chipColor,
  chipIcon,
  subtitle,
  accent,
  actions,
  preActionsBanner,
  expandedForm
}: HrItemRowProps) => {
  const theme = useTheme()
  const paletteKey = ACCENT_PALETTE[accent]

  const accentColor =
    paletteKey === 'secondary' ? theme.palette.divider : theme.palette[paletteKey].main

  const iconBg =
    paletteKey === 'secondary'
      ? alpha(theme.palette.text.primary, 0.04)
      : alpha(theme.palette[paletteKey].main, 0.12)

  const iconFg =
    paletteKey === 'secondary'
      ? theme.palette.text.secondary
      : theme.palette[paletteKey].main

  const resolvedChipColor: ThemeColor =
    chipColor ?? (paletteKey === 'secondary' ? 'secondary' : (paletteKey as ThemeColor))

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: theme.shape.customBorderRadius.md,
        transition: theme.transitions.create('box-shadow', { duration: 200 }),
        '&:hover': {
          boxShadow: `0 4px 18px ${alpha(theme.palette.text.primary, 0.08)}`
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, px: 5, py: 4 }}>
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
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {mask ? (
              <Typography
                variant='body2'
                sx={{
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.04em',
                  fontWeight: 500
                }}
              >
                {mask}
              </Typography>
            ) : null}
            {chipLabel && chipIcon ? (
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color={resolvedChipColor}
                label={chipLabel}
                icon={
                  <i
                    className={chipIcon}
                    style={{ fontSize: 12, marginLeft: 4 }}
                    aria-hidden='true'
                  />
                }
              />
            ) : null}
          </Stack>
          {subtitle ? (
            <Typography variant='caption' color='text.secondary' component='div'>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Box>

      {preActionsBanner ? <Box sx={{ px: 5, pb: 3 }}>{preActionsBanner}</Box> : null}

      {actions ? (
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            px: 5,
            pb: 4,
            pt: 3,
            borderTop: `1px solid ${theme.palette.divider}`
          }}
        >
          {actions}
        </Box>
      ) : null}

      {expandedForm ? (
        <Box
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            background: `linear-gradient(180deg, ${alpha(theme.palette.text.primary, 0.02)}, ${theme.palette.background.paper})`
          }}
        >
          {expandedForm}
        </Box>
      ) : null}
    </Card>
  )
}

export default HrItemRow
