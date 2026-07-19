'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export interface InventoryListProps {
  title: ReactNode
  count?: ReactNode
  description?: ReactNode
  controls?: ReactNode
  children: ReactNode
  emptyState?: ReactNode
  isEmpty?: boolean
  dataCapture?: string
  variant?: 'contained' | 'rail'
}

const InventoryList = ({
  title,
  count,
  description,
  controls,
  children,
  emptyState,
  isEmpty = false,
  dataCapture,
  variant = 'rail'
}: InventoryListProps) => (
  <Stack
    component='section'
    aria-label={typeof title === 'string' ? title : 'Inventario'}
    data-capture={dataCapture}
    data-variant={variant}
    data-ui-surface={variant === 'rail' ? 'open' : 'contained'}
    spacing={4}
    sx={theme => ({
      minWidth: 0,
      borderRadius: variant === 'rail' ? 0 : `${theme.shape.customBorderRadius.xl}px`,
      bgcolor: variant === 'rail' ? 'transparent' : 'background.paper',
      border: variant === 'rail' ? 'none' : '1px solid',
      borderColor: 'divider',
      p: variant === 'rail' ? 0 : { xs: 3, md: 4 },
      pe: variant === 'rail' ? { md: 1 } : undefined
    })}
  >
    <Stack spacing={1}>
      <Stack direction='row' justifyContent='space-between' alignItems='baseline' spacing={2}>
        <Typography component='h2' variant='h6'>
          {title}
        </Typography>
        {count ? (
          <Typography variant='caption' color='text.secondary'>
            {count}
          </Typography>
        ) : null}
      </Stack>
      {description ? (
        <Typography variant='body2' color='text.secondary'>
          {description}
        </Typography>
      ) : null}
    </Stack>
    {controls ? <Box>{controls}</Box> : null}
    {isEmpty ? (
      <Box>{emptyState}</Box>
    ) : (
      <Stack role='listbox' aria-label={typeof title === 'string' ? title : 'Inventario'} spacing={variant === 'rail' ? 1 : 2}>
        {children}
      </Stack>
    )}
  </Stack>
)

export default InventoryList
