'use client'

import type { ReactNode } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

type ExecutiveCardShellProps = {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  cardSx?: SxProps<Theme>
  contentSx?: SxProps<Theme>
}

const ExecutiveCardShell = ({ title, subtitle, action, children, cardSx, contentSx }: ExecutiveCardShellProps) => {
  return (
    <Card sx={{ height: '100%', ...cardSx }}>
      <CardHeader
        title={<Typography variant='h5'>{title}</Typography>}
        subheader={subtitle ? <Typography variant='body2'>{subtitle}</Typography> : undefined}
        action={action}
        sx={{ pb: 0 }}
      />
      <CardContent sx={{ pt: 4, ...contentSx }}>{children}</CardContent>
    </Card>
  )
}

export default ExecutiveCardShell
