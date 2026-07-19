'use client'

import type { ReactNode } from 'react'

import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { resolveContextCommandBarVariant } from './surface-system-controller'
import type { ContextCommandBarKind, ContextCommandBarVariant } from './surface-system-types'

export interface ContextCommandBarProps {
  context?: ReactNode
  primaryAction: ReactNode
  secondaryActions?: ReactNode
  status?: ReactNode
  variant?: ContextCommandBarVariant
  kind?: ContextCommandBarKind
  sticky?: boolean
  dataCapture?: string
  ariaLabel: string
}

const ContextCommandBar = ({
  context,
  primaryAction,
  secondaryActions,
  status,
  variant,
  kind = 'workbench',
  sticky = false,
  dataCapture,
  ariaLabel
}: ContextCommandBarProps) => {
  const resolvedVariant = resolveContextCommandBarVariant(kind, variant)

  return (
    <Stack
      component='section'
      aria-label={ariaLabel}
      data-capture={dataCapture}
      data-kind={kind}
      data-variant={resolvedVariant}
      data-ui-surface={sticky ? 'floating' : 'open'}
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent='space-between'
      spacing={3}
      sx={theme => ({
        position: sticky ? { xs: 'relative', sm: 'sticky' } : 'relative',
        insetBlockEnd: sticky ? { sm: theme.spacing(3) } : undefined,
        zIndex: sticky ? { sm: theme.zIndex.appBar } : undefined,
        border: sticky || resolvedVariant !== 'contextual' ? '1px solid' : 'none',
        borderBlockStart: !sticky && resolvedVariant === 'contextual' ? '1px solid' : undefined,
        borderColor: resolvedVariant === 'review' ? 'primary.lightOpacity' : 'divider',
        borderRadius: sticky || resolvedVariant !== 'contextual' ? `${theme.shape.customBorderRadius.xl}px` : 0,
        bgcolor: sticky ? 'background.paper' : 'transparent',
        boxShadow: sticky
          ? theme.greenhouseElevation.overlay.boxShadow
          : 'none',
        px: sticky || resolvedVariant !== 'contextual' ? { xs: 4, md: 5 } : 0,
        py: 3.5,
        '&::before': {
          content: "''",
          position: 'absolute',
          insetBlock: 12,
          insetInlineStart: 0,
          inlineSize: sticky || resolvedVariant !== 'contextual' ? 3 : 0,
          borderRadius: 9999,
          bgcolor: resolvedVariant === 'review' ? 'success.main' : 'primary.main'
        }
      })}
    >
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        {context ? (
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {context}
          </Typography>
        ) : null}
        {status ? (
          <Typography variant='caption' color='text.secondary'>
            {status}
          </Typography>
        ) : null}
      </Stack>
      <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap justifyContent={{ xs: 'stretch', sm: 'flex-end' }}>
        {secondaryActions}
        {primaryAction}
      </Stack>
    </Stack>
  )
}

export default ContextCommandBar
