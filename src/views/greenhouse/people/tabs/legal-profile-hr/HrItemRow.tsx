'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
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
  /** Acciones (botones) inline a la derecha */
  actions?: ReactNode
  /** Banner por encima del row (e.g. reject reason) */
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

/**
 * TASK-784 flat redesign — HR row primitive without Card wrapper.
 *
 * NO Card, NO border, NO borderRadius, NO box-shadow, NO borderLeft accent.
 * Estado se comunica por chip + icon tinted bg + subtitle tonal.
 *
 * Container raiz lo provee PersonLegalProfileSection con un solo borde y
 * <Divider/> entre rows.
 */
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

  // Sangrado: alineacion con el icon (px:6 + 36px + gap:4 = ~80px)
  const indentLeft = `calc(${theme.spacing(6)} + 36px + ${theme.spacing(4)})`

  return (
    <Box
      sx={{
        transition: theme.transitions.create('background-color', { duration: 150 }),
        '&:hover': { backgroundColor: alpha(theme.palette.text.primary, 0.025) }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          px: 6,
          py: 4
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
        {actions ? (
          <Box
            sx={{ display: 'flex', gap: 1, flexShrink: 0, flexWrap: 'wrap' }}
            role='group'
            aria-label={`Acciones para ${title}`}
          >
            {actions}
          </Box>
        ) : null}
      </Box>

      {preActionsBanner ? (
        <Box
          sx={{
            pl: indentLeft,
            pr: 6,
            pb: 4,
            mt: -1
          }}
        >
          {preActionsBanner}
        </Box>
      ) : null}

      {expandedForm ? (
        <Box
          sx={{
            backgroundColor: alpha(theme.palette.text.primary, 0.02),
            borderTop: `1px solid ${theme.palette.divider}`
          }}
        >
          {expandedForm}
        </Box>
      ) : null}
    </Box>
  )
}

export default HrItemRow
