'use client'

// TASK-947 — error boundary canonical (TASK-946 framework state #6 retriable).
//
// Solo se renderiza cuando el loader o el view throw — el reader canonical
// usa try/catch interno + state 'degraded' para PG fails, por lo que llegar
// aquí indica un fallo no anticipado (e.g. parse JSON, render crash).

import { useEffect } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_NEXA } from '@/config/greenhouse-nomenclature'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

const ErrorBoundary = ({ error, reset }: ErrorBoundaryProps) => {
  useEffect(() => {
    // Reportar al log del navegador (Sentry server-side cubre el throw del
    // loader — este boundary es client-side render fail).
     
    console.error('[NexaInsightDetail] render error:', error)
  }, [error])

  return (
    <Stack spacing={6} sx={{ py: 4 }} component='main' role='main'>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Link
          href='/home'
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'inherit', textDecoration: 'none' }}
        >
          <i className='tabler-arrow-left' style={{ fontSize: 16 }} aria-hidden='true' />
          <Typography variant='caption' color='text.secondary'>
            {GH_NEXA.detail_back_to_home}
          </Typography>
        </Link>
      </Box>

      <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}>
        <CardContent>
          <EmptyState
            icon='tabler-alert-triangle'
            title={GH_NEXA.detail_error_title}
            description={GH_NEXA.detail_error_body}
            minHeight={240}
            action={
              <Button
                variant='contained'
                color='primary'
                onClick={reset}
                startIcon={<i className='tabler-refresh' aria-hidden='true' />}
              >
                {GH_NEXA.detail_error_cta}
              </Button>
            }
          />
        </CardContent>
      </Card>
    </Stack>
  )
}

export default ErrorBoundary
