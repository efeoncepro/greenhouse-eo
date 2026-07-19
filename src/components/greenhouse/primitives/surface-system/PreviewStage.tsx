'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import GreenhouseChip from '../GreenhouseChip'
import { resolvePreviewStageVariant } from './surface-system-controller'
import type { PreviewStageKind, PreviewStageVariant } from './surface-system-types'

export interface PreviewStageProps {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  toolbar?: ReactNode
  statusLabel?: ReactNode
  variant?: PreviewStageVariant
  kind?: PreviewStageKind
  dataCapture?: string
}

const PreviewStage = ({
  title,
  description,
  children,
  toolbar,
  statusLabel,
  variant,
  kind = 'artifact',
  dataCapture
}: PreviewStageProps) => {
  const resolvedVariant = resolvePreviewStageVariant(kind, variant)

  return (
    <Stack
      component='section'
      data-capture={dataCapture}
      data-kind={kind}
      data-variant={resolvedVariant}
      data-ui-surface='stage'
      sx={theme => ({
        position: 'relative',
        minWidth: 0,
        overflow: 'clip',
        borderRadius: `${theme.shape.customBorderRadius.xl}px`,
        border: '1px solid',
        borderColor: theme.palette.customColors.deepAzure,
        bgcolor: theme.palette.customColors.midnight,
        boxShadow: theme.greenhouseElevation.raised.boxShadow
      })}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={3}
        sx={theme => ({
          px: { xs: 4, md: 5 },
          py: 3,
          color: 'primary.contrastText',
          borderBlockEnd: '1px solid',
          borderColor: 'primary.mainOpacity',
          background: `linear-gradient(90deg, ${theme.palette.customColors.midnight}, ${theme.palette.customColors.deepAzure})`,
          '& .MuiTypography-root': { color: 'inherit' },
          '&::before': {
            content: "''",
            inlineSize: 42,
            blockSize: 10,
            flexShrink: 0,
            background: `radial-gradient(circle at 5px 5px, ${theme.palette.error.main} 0 4px, transparent 4px), radial-gradient(circle at 21px 5px, ${theme.palette.warning.main} 0 4px, transparent 4px), radial-gradient(circle at 37px 5px, ${theme.palette.success.main} 0 4px, transparent 4px)`
          }
        })}
      >
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Stack direction='row' spacing={2} alignItems='center'>
            <Typography component='h3' variant='subtitle1'>
              {title}
            </Typography>
            {statusLabel ? <GreenhouseChip label={statusLabel} kind='status' variant='signal' tone='success' size='small' /> : null}
          </Stack>
          {description ? (
            <Typography variant='caption' color='inherit' sx={{ opacity: 0.68 }}>
              {description}
            </Typography>
          ) : null}
        </Stack>
        {toolbar}
      </Stack>
      <Box
        sx={theme => ({
          position: 'relative',
          minWidth: 0,
          minBlockSize: { xs: 240, md: 360 },
          overflowX: 'clip',
          p: { xs: 4, md: 6 },
          background:
            resolvedVariant === 'evidence'
              ? `radial-gradient(circle at 18% 12%, ${theme.palette.primary.mainOpacity}, transparent 42%), linear-gradient(145deg, ${theme.palette.customColors.midnight}, ${theme.palette.customColors.deepAzure})`
              : theme.palette.background.default
        })}
      >
        {children}
      </Box>
    </Stack>
  )
}

export default PreviewStage
