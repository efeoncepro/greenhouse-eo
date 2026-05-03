'use client'

/**
 * Dashboard Error Boundary — catches errors within the authenticated layout.
 * Has access to theme providers, so it can render with proper MUI styling.
 *
 * For chunk load errors: auto-recovers by reloading once.
 * For other errors: shows a friendly error UI with retry option.
 */

import { useEffect } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

import { isChunkLoadError, attemptChunkRecovery } from '@/lib/chunk-error'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isChunkError = isChunkLoadError(error)

  useEffect(() => {
    if (isChunkError) {
      const recovered = attemptChunkRecovery()

      if (recovered) return
    }

    console.error('[DashboardError]', error)
  }, [error, isChunkError])

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', p: 4 }}>
      <Card elevation={0} sx={{ maxWidth: 480, textAlign: 'center', border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, py: 6 }}>
          <CustomAvatar variant='rounded' color={isChunkError ? 'info' : 'warning'} skin='light' size={64}>
            <i className={isChunkError ? 'tabler-refresh' : 'tabler-alert-triangle'} style={{ fontSize: 32 }} />
          </CustomAvatar>

          <Box>
            <Typography variant='h5' sx={{ mb: 1 }}>
              {isChunkError ? 'Nueva version disponible' : 'Algo salio mal'}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.6 }}>
              {isChunkError
                ? 'Se ha desplegado una actualizacion del portal. Recarga la pagina para obtener la ultima version.'
                : 'Ocurrio un error al cargar esta seccion. Puedes intentar de nuevo o recargar la pagina.'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant='contained' onClick={() => window.location.reload()} startIcon={<i className='tabler-refresh' />}>
              Recargar pagina
            </Button>
            {!isChunkError && (
              <Button variant='outlined' onClick={() => reset()}>
                Reintentar
              </Button>
            )}
          </Box>

          {error.digest && (
            <Typography variant='caption' color='text.disabled'>
              Ref: {error.digest}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
