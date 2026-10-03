import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import OrbitLoader from '@/components/greenhouse/motion/OrbitLoader'
import { ORBIT_TOKENS } from '@/components/greenhouse/motion/orbit-geometry'
import { GH_MESSAGES } from '@/lib/copy/client-portal'

/**
 * TASK-1964 — Mientras `/auth/landing` resuelve la sesión: el mismo papel, logo y `OrbitLoader` con que termina la
 * apertura del login, para que la llegada al portal sea una sola escena.
 */
export default function AuthLandingLoading() {
  return (
    <Box
      role='status'
      aria-live='polite'
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        bgcolor: ORBIT_TOKENS.color.paper
      }}
    >
      <Box component='img' src='/branding/logo-full.svg' alt='Efeonce' sx={{ position: 'absolute', left: 32, top: 22, width: 108, height: 'auto' }} />
      <Stack spacing={3} alignItems='center'>
        <OrbitLoader size='lg' tone='light' />
        <Typography variant='body1' sx={{ color: 'text.secondary' }}>
          {GH_MESSAGES.login_preparing_workspace}
        </Typography>
      </Stack>
    </Box>
  )
}
