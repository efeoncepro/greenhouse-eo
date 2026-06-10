'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'

import LoadingLabSection from './LoadingLabSection'

const LoadingLabView = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 1100, mx: 'auto' }}>
    <Stack spacing={1.5}>
      <AxisWordmark variant='auto' height={32} sx={{ mb: 0.5 }} />
      <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
        Loading Lab
      </Typography>
      <Typography variant='h4' sx={{ fontWeight: 800 }}>
        Loaders modernos para Greenhouse
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 780 }}>
        Laboratorio interno para revisar, comparar y ajustar estados de carga antes de promoverlos a consumidores productivos. La
        pagina canonica de tokens queda reservada para AXIS; esta subseccion trabaja microinteracciones y experiencia.
      </Typography>
    </Stack>

    <LoadingLabSection />
  </Box>
)

export default LoadingLabView
