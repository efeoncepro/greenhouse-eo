'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

type EmptyStateProps = {
  icon?: string
  title: string
  description: string
  action?: ReactNode
  minHeight?: number
}

const EmptyState = ({
  icon = 'tabler-layout-dashboard-off',
  title,
  description,
  action,
  minHeight = 220
}: EmptyStateProps) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        minHeight,
        p: 4,
        borderRadius: 3,
        border: `1px dashed ${alpha(theme.palette.text.secondary, 0.22)}`,
        backgroundColor: alpha(theme.palette.action.hover, 0.48),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Stack spacing={1.5} alignItems='center' textAlign='center' sx={{ maxWidth: 360 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.text.secondary, 0.08),
            color: 'text.secondary'
          }}
        >
          <i className={icon} style={{ fontSize: 24 }} />
        </Box>
        <Typography variant='h6'>{title}</Typography>
        <Typography variant='body2' color='text.secondary'>
          {description}
        </Typography>
        {action}
      </Stack>
    </Box>
  )
}

export default EmptyState
