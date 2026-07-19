'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import useReducedMotion from '@/hooks/useReducedMotion'
import { motion } from '@/libs/FramerMotion'

import { useContainerDensity } from '../card-density'
import { cardDensityLayoutTransition } from '../card-density/card-density-motion'
import GreenhouseChip from '../GreenhouseChip'
import { resolveSelectionRowVariant } from './surface-system-controller'
import type { SelectionRowKind, SelectionRowVariant } from './surface-system-types'

export interface SelectionRowProps {
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  statusLabel?: ReactNode
  statusTone?: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
  selected?: boolean
  onSelect?: () => void
  variant?: SelectionRowVariant
  kind?: SelectionRowKind
  density?: 'auto' | 'full' | 'condensed' | 'peek'
  dataCapture?: string
}

const SelectionRow = ({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  statusLabel,
  statusTone = 'default',
  selected = false,
  onSelect,
  variant,
  kind = 'inventory',
  density = 'auto',
  dataCapture
}: SelectionRowProps) => {
  const reduced = useReducedMotion()
  const { ref, density: resolvedDensity, containerType } = useContainerDensity(density)
  const resolvedVariant = resolveSelectionRowVariant(kind, variant)
  const compact = resolvedDensity !== 'full' || resolvedVariant === 'compact'

  return (
    <Box
      ref={ref}
      component={motion.div}
      layout={reduced ? false : 'position'}
      transition={cardDensityLayoutTransition(reduced)}
      data-card-density={resolvedDensity}
      suppressHydrationWarning
      data-capture={dataCapture}
      data-kind={kind}
      data-variant={resolvedVariant}
      data-ui-surface={selected ? 'selected' : 'open'}
      sx={{ containerType, minWidth: 0 }}
    >
      <ButtonBase
        onClick={onSelect}
        aria-pressed={selected}
        sx={theme => ({
          position: 'relative',
          inlineSize: '100%',
          justifyContent: 'stretch',
          textAlign: 'start',
          border: '1px solid',
          borderColor: selected ? 'primary.mainOpacity' : 'transparent',
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          bgcolor: selected ? 'background.paper' : 'transparent',
          boxShadow: selected ? theme.greenhouseElevation.raised.boxShadow : 'none',
          p: compact ? 3 : 4,
          overflow: 'hidden',
          transition: theme.transitions.create(['background-color', 'border-color', 'transform'], {
            duration: theme.transitions.duration.shorter
          }),
          '&::before': {
            content: "''",
            position: 'absolute',
            insetBlock: 0,
            insetInlineStart: 0,
            inlineSize: selected ? 4 : 0,
            bgcolor: 'primary.main',
            transition: theme.transitions.create('inline-size', { duration: theme.transitions.duration.shorter })
          },
          '&:hover': {
            bgcolor: 'background.paper',
            boxShadow: theme.greenhouseElevation.raised.boxShadow,
            transform: reduced ? 'none' : 'translateY(-2px)'
          },
          '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&::before': { transition: 'none' } }
        })}
      >
        <Stack direction='row' spacing={3} alignItems='flex-start' sx={{ inlineSize: '100%', minWidth: 0 }}>
          {leading ? <Box sx={{ flexShrink: 0 }}>{leading}</Box> : null}
          <Stack spacing={compact ? 0.5 : 1} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction='row' spacing={2} justifyContent='space-between' alignItems='flex-start'>
              <Typography variant='subtitle2' color='text.primary'>
                {title}
              </Typography>
              {statusLabel ? (
                <GreenhouseChip
                  label={statusLabel}
                  kind='status'
                  variant='label'
                  tone={statusTone}
                  size='small'
                  sx={{ flexShrink: 0, '& .MuiChip-label': { overflow: 'visible' } }}
                />
              ) : null}
            </Stack>
            {subtitle && resolvedDensity !== 'peek' ? (
              <Typography variant='body2' color='text.primary'>
                {subtitle}
              </Typography>
            ) : null}
            {meta && resolvedDensity === 'full' ? (
              <Typography variant='caption' color='text.primary'>
                {meta}
              </Typography>
            ) : null}
          </Stack>
          {trailing ? <Box sx={{ flexShrink: 0 }}>{trailing}</Box> : null}
        </Stack>
      </ButtonBase>
    </Box>
  )
}

export default SelectionRow
