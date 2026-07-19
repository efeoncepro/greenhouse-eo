'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import useReducedMotion from '@/hooks/useReducedMotion'
import { motion } from '@/libs/FramerMotion'

import GreenhouseChip from '../GreenhouseChip'
import { resolveWorkbenchHeaderVariant } from './surface-system-controller'
import type { WorkbenchHeaderKind, WorkbenchHeaderVariant } from './surface-system-types'

export interface WorkbenchHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  meta?: ReactNode
  statusLabel?: ReactNode
  statusTone?: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
  primaryAction?: ReactNode
  secondaryActions?: ReactNode
  supporting?: ReactNode
  variant?: WorkbenchHeaderVariant
  kind?: WorkbenchHeaderKind
  dataCapture?: string
}

const WorkbenchHeader = ({
  eyebrow,
  title,
  description,
  meta,
  statusLabel,
  statusTone = 'default',
  primaryAction,
  secondaryActions,
  supporting,
  variant,
  kind = 'workbench',
  dataCapture
}: WorkbenchHeaderProps) => {
  const reduced = useReducedMotion()
  const resolvedVariant = resolveWorkbenchHeaderVariant(kind, variant)
  const immersive = resolvedVariant === 'operational'

  return (
    <Box
      component={motion.header}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.28, ease: [0.2, 0, 0, 1] }}
      data-capture={dataCapture}
      data-kind={kind}
      data-variant={resolvedVariant}
      data-ui-surface={immersive ? 'immersive' : 'open'}
      sx={theme => ({
        position: 'relative',
        overflow: 'clip',
        isolation: 'isolate',
        border: resolvedVariant === 'operational' ? '1px solid' : 'none',
        borderColor: immersive ? theme.palette.customColors.deepAzure : 'divider',
        borderRadius: resolvedVariant === 'operational' ? `${theme.shape.customBorderRadius.xl}px` : 0,
        color: immersive ? 'primary.contrastText' : 'text.primary',
        background: immersive
          ? `radial-gradient(circle at 88% -18%, ${theme.palette.primary.main} 0%, transparent 36%), linear-gradient(135deg, ${theme.palette.customColors.midnight} 0%, ${theme.palette.customColors.deepAzure} 100%)`
          : resolvedVariant === 'settings'
            ? `radial-gradient(circle at 92% 0%, ${theme.palette.primary.lightOpacity} 0%, transparent 44%), linear-gradient(135deg, transparent 0%, ${theme.palette.primary.lightOpacity} 180%)`
            : 'transparent',
        boxShadow: immersive ? theme.greenhouseElevation.raised.boxShadow : 'none',
        p: resolvedVariant === 'report' ? { xs: 2, md: 3 } : { xs: 5, md: 7 },
        '&::after': immersive
          ? {
              content: "''",
              position: 'absolute',
              zIndex: -1,
              insetBlockStart: -72,
              insetInlineEnd: -32,
              inlineSize: 260,
              blockSize: 260,
              border: `1px solid ${theme.palette.primary.main}`,
              borderRadius: '50%',
              opacity: 0.3
            }
          : undefined,
        '& .MuiTypography-root': immersive ? { color: 'inherit' } : undefined,
        '& .MuiChip-root': immersive
          ? { bgcolor: 'primary.contrastText', color: theme.palette.customColors.midnight, borderColor: 'transparent' }
          : undefined,
        '& .MuiButton-tonal': immersive
          ? {
              bgcolor: 'transparent',
              color: 'primary.contrastText',
              border: `1px solid ${theme.palette.primary.contrastText}`,
              '&:hover': { bgcolor: 'primary.main' }
            }
          : undefined
      })}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={5}>
        <Stack spacing={2} sx={{ minWidth: 0, maxInlineSize: 760 }}>
          <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
            {eyebrow ? (
              <Typography variant='overline' color={immersive ? 'inherit' : 'primary.dark'} sx={{ opacity: immersive ? 0.76 : 1 }}>
                {eyebrow}
              </Typography>
            ) : null}
            {statusLabel ? <GreenhouseChip label={statusLabel} kind='status' variant='label' tone={statusTone} size='small' /> : null}
          </Stack>
          <Typography component='h1' variant={resolvedVariant === 'report' ? 'h2' : 'h3'} sx={{ maxInlineSize: immersive ? 780 : undefined, textWrap: 'balance' }}>
            {title}
          </Typography>
          {description ? (
            <Typography variant='body1' color={immersive ? 'inherit' : 'text.secondary'} sx={{ maxInlineSize: 720, opacity: immersive ? 0.78 : 1 }}>
              {description}
            </Typography>
          ) : null}
          {meta ? <Box sx={{ color: 'text.secondary' }}>{meta}</Box> : null}
        </Stack>
        {primaryAction || secondaryActions ? (
          <Stack direction='row' spacing={2} alignItems='flex-start' flexWrap='wrap' useFlexGap sx={{ flexShrink: 0 }}>
            {secondaryActions}
            {primaryAction}
          </Stack>
        ) : null}
      </Stack>
      {supporting ? (
        <Box
          sx={{
            mt: 5,
            pt: 4,
            borderBlockStart: '1px solid',
            borderColor: immersive ? 'primary.mainOpacity' : 'divider'
          }}
        >
          {supporting}
        </Box>
      ) : null}
    </Box>
  )
}

export default WorkbenchHeader
