'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

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
  titleComponent?: 'h1' | 'h2'
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
  dataCapture,
  titleComponent = 'h1'
}: WorkbenchHeaderProps) => {
  const reduced = useReducedMotion()
  const resolvedVariant = resolveWorkbenchHeaderVariant(kind, variant)
  const immersive = resolvedVariant === 'operational'
  const editorialPlane = resolvedVariant === 'report' || resolvedVariant === 'settings'

  return (
    <Box
      component={motion.header}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.28, ease: [0.2, 0, 0, 1] }}
      data-capture={dataCapture}
      data-kind={kind}
      data-variant={resolvedVariant}
      data-ui-surface={immersive ? 'immersive' : editorialPlane ? 'contained' : 'open'}
      sx={theme => ({
        position: 'relative',
        overflow: 'clip',
        isolation: 'isolate',
        border: immersive || editorialPlane ? '1px solid' : 'none',
        borderColor: immersive ? theme.palette.customColors.deepAzure : 'divider',
        borderRadius: immersive || editorialPlane ? `${theme.shape.customBorderRadius.xl}px` : 0,
        color: immersive ? 'primary.contrastText' : 'text.primary',
        background: immersive
          ? `radial-gradient(circle at 88% -18%, ${theme.palette.primary.main} 0%, transparent 36%), linear-gradient(135deg, ${theme.palette.customColors.midnight} 0%, ${theme.palette.customColors.deepAzure} 100%)`
          : resolvedVariant === 'settings'
            ? `radial-gradient(circle at 92% 0%, ${theme.palette.primary.lightOpacity} 0%, transparent 44%), ${theme.palette.background.paper}`
            : resolvedVariant === 'report'
              ? theme.palette.background.paper
              : 'transparent',
        boxShadow: immersive
          ? theme.greenhouseElevation.raised.boxShadow
          : editorialPlane
            ? theme.greenhouseElevation.raised.boxShadow
            : 'none',
        p: resolvedVariant === 'report' ? { xs: 3, md: 5 } : { xs: 3, sm: 4, md: 7 },
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
          : undefined,
        '& .MuiButton-outlined, & .MuiButton-text': immersive
          ? {
              color: theme.palette.primary.contrastText,
              borderColor: alpha(theme.palette.primary.contrastText, 0.58),
              bgcolor: alpha(theme.palette.primary.contrastText, 0.08),
              '&:hover': {
                borderColor: theme.palette.primary.contrastText,
                bgcolor: alpha(theme.palette.primary.contrastText, 0.16)
              }
            }
          : undefined,
        '& .MuiButton-containedPrimary': immersive
          ? {
              color: theme.palette.customColors.midnight,
              bgcolor: theme.palette.background.paper,
              '&:hover': { bgcolor: alpha(theme.palette.primary.contrastText, 0.88) }
            }
          : undefined
      })}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={{ xs: 2.5, md: 5 }}>
        <Stack spacing={1.5} sx={{ minWidth: 0, maxInlineSize: 760 }}>
          <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
            {eyebrow ? (
              <Typography variant='overline' color={immersive ? 'inherit' : 'primary.dark'} sx={{ opacity: immersive ? 0.76 : 1 }}>
                {eyebrow}
              </Typography>
            ) : null}
            {statusLabel ? <GreenhouseChip label={statusLabel} kind='status' variant='label' tone={statusTone} size='small' /> : null}
          </Stack>
          <Typography
            component={titleComponent}
            variant='surfaceHeroTitle'
            sx={{ maxInlineSize: immersive ? 780 : undefined, textWrap: 'balance' }}
          >
            {title}
          </Typography>
          {description ? (
            <Typography variant='body2' color={immersive ? 'inherit' : 'text.secondary'} sx={{ maxInlineSize: 720, opacity: immersive ? 0.82 : 1 }}>
              {description}
            </Typography>
          ) : null}
          {meta ? <Box sx={{ color: 'text.secondary' }}>{meta}</Box> : null}
        </Stack>
        {primaryAction || secondaryActions ? (
          <Stack
            direction='row'
            spacing={{ xs: 1, sm: 2 }}
            alignItems='flex-start'
            flexWrap='wrap'
            useFlexGap
            sx={{
              flexShrink: 0,
              inlineSize: { xs: '100%', md: 'auto' },
              '& > .MuiButton-root': {
                flex: { xs: '1 1 0', md: '0 0 auto' },
                minInlineSize: 0
              }
            }}
          >
            {secondaryActions}
            {primaryAction}
          </Stack>
        ) : null}
      </Stack>
      {supporting ? (
        <Box
          sx={{
            mt: { xs: 2.5, md: 5 },
            pt: { xs: 2.5, md: 4 },
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
