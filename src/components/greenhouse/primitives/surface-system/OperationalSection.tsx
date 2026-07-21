'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import useReducedMotion from '@/hooks/useReducedMotion'
import { motion } from '@/libs/FramerMotion'

import { useContainerDensity } from '../card-density'
import { cardDensityLayoutTransition } from '../card-density/card-density-motion'
import { resolveOperationalSectionVariant } from './surface-system-controller'
import type { OperationalSectionKind, OperationalSectionVariant } from './surface-system-types'

export interface OperationalSectionProps {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  action?: ReactNode
  children: ReactNode
  footer?: ReactNode
  variant?: OperationalSectionVariant
  kind?: OperationalSectionKind
  density?: 'auto' | 'full' | 'condensed' | 'peek'
  dataCapture?: string
}

const OperationalSection = ({
  title,
  description,
  eyebrow,
  action,
  children,
  footer,
  variant,
  kind = 'content',
  density = 'auto',
  dataCapture
}: OperationalSectionProps) => {
  const reduced = useReducedMotion()
  const { ref, density: resolvedDensity, containerType } = useContainerDensity(density)
  const resolvedVariant = resolveOperationalSectionVariant(kind, variant)
  const emphasized = resolvedVariant === 'emphasized'
  const open = resolvedVariant === 'open'
  const band = resolvedVariant === 'band'

  return (
    <Box
      ref={ref}
      component={motion.section}
      layout={reduced ? false : 'position'}
      transition={cardDensityLayoutTransition(reduced)}
      data-card-density={resolvedDensity}
      suppressHydrationWarning
      data-capture={dataCapture}
      data-kind={kind}
      data-variant={resolvedVariant}
      data-ui-surface={open ? 'open' : emphasized ? 'immersive' : band ? 'band' : 'contained'}
      sx={theme => ({
        containerType,
        border: open ? 'none' : band ? '1px solid' : '1px solid',
        borderWidth: band ? '1px 0' : undefined,
        borderColor: emphasized ? theme.palette.customColors.deepAzure : 'divider',
        borderRadius: open || band ? 0 : `${theme.shape.customBorderRadius.xl}px`,
        color: emphasized ? 'primary.contrastText' : 'text.primary',
        background: emphasized
          ? `radial-gradient(circle at 94% 0%, ${theme.palette.primary.main} 0%, transparent 32%), linear-gradient(135deg, ${theme.palette.customColors.midnight}, ${theme.palette.customColors.deepAzure})`
          : open
            ? 'transparent'
            : band
              ? `linear-gradient(110deg, ${theme.palette.action.hover}, ${theme.palette.primary.lightOpacity})`
              : resolvedVariant === 'quiet'
            ? theme.palette.action.hover
            : theme.palette.background.paper,
        boxShadow:
          emphasized || resolvedVariant === 'standard'
            ? theme.greenhouseElevation.raised.boxShadow
            : 'none',
        overflow: 'clip',
        '& .MuiTypography-root': emphasized ? { color: 'inherit' } : undefined,
        '& .MuiButton-root': emphasized ? { color: 'primary.contrastText' } : undefined
      })}
    >
      <Stack
        spacing={resolvedDensity === 'peek' ? 2 : 4}
        sx={{ p: open ? 0 : resolvedDensity === 'peek' ? 3 : band ? { xs: 4, md: 5 } : { xs: 4, md: 5 } }}
      >
        <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            {eyebrow && resolvedDensity === 'full' ? (
              <Typography variant='overline' color={emphasized ? 'inherit' : 'primary.dark'} sx={{ opacity: emphasized ? 0.7 : 1 }}>
                {eyebrow}
              </Typography>
            ) : null}
            <Typography component='h3' variant='h6' color={emphasized ? 'inherit' : 'text.primary'}>
              {title}
            </Typography>
            {description && resolvedDensity !== 'peek' ? (
              <Typography variant='body2' color={emphasized ? 'inherit' : 'text.primary'} sx={{ opacity: emphasized ? 0.82 : 1 }}>
                {description}
              </Typography>
            ) : null}
          </Stack>
          {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
        </Stack>
        <Box>{children}</Box>
        {footer && resolvedDensity === 'full' ? <Box sx={{ borderBlockStart: '1px solid', borderColor: 'divider', pt: 3 }}>{footer}</Box> : null}
      </Stack>
    </Box>
  )
}

export default OperationalSection
