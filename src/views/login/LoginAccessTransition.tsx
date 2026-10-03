'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { keyframes } from '@mui/material/styles'

import OrbitLoader from '@/components/greenhouse/motion/OrbitLoader'
import { MOTION_EASE, cssCubicBezier } from '@/components/greenhouse/motion/core/tokens'
import { ORBIT_TOKENS } from '@/components/greenhouse/motion/orbit-geometry'
import { GH_MESSAGES } from '@/lib/copy/client-portal'

/**
 * TASK-1964 — «La lente te lleva adentro»: tras validar el acceso, el espacio de trabajo se abre como un círculo desde
 * el centro de la lente activa (o desde el botón Entrar en móvil) hasta cubrir la ventana; el logo Efeonce queda en el
 * lugar del encabezado y aparece el `OrbitLoader` con el estado. Después el login cambia de ruta dentro de una view
 * transition y `/auth/landing` (loading.tsx) continúa con el mismo loader sobre el mismo papel.
 *
 * Con reduced motion no hay apertura: el papel y el loader aparecen de inmediato.
 */

/** Duración de la apertura antes de cambiar de ruta (`efeonceGraphicLine`: llega con `emphasized`). */
export const LOGIN_ACCESS_TRANSITION_MS = 900

const emphasized = cssCubicBezier(MOTION_EASE.emphasized.cubicBezier)

const reveal = keyframes`
  from { clip-path: circle(0 at var(--gh-access-x) var(--gh-access-y)); }
  to { clip-path: circle(150vmax at var(--gh-access-x) var(--gh-access-y)); }
`

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
`

const LoginAccessTransition = ({ origin }: { origin: { x: number; y: number } }) => (
  <Box
    role='status'
    aria-live='polite'
    style={{ ['--gh-access-x' as string]: `${origin.x}px`, ['--gh-access-y' as string]: `${origin.y}px` }}
    sx={{
      position: 'fixed',
      inset: 0,
      zIndex: theme => theme.zIndex.modal + 1,
      bgcolor: ORBIT_TOKENS.color.paper,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: `${reveal} ${LOGIN_ACCESS_TRANSITION_MS}ms ${emphasized} both`,
      '@media (prefers-reduced-motion: reduce)': { animation: 'none', '& *': { animation: 'none !important' } }
    }}
  >
    <Box
      component='img'
      src='/branding/logo-full.svg'
      alt=''
      sx={{
        position: 'absolute',
        left: 32,
        top: 22,
        width: 108,
        height: 'auto',
        animation: `${fadeIn} 400ms ${emphasized} 300ms both`
      }}
    />
    <Stack spacing={3} alignItems='center' sx={{ animation: `${fadeIn} 400ms ${emphasized} 350ms both` }}>
      <OrbitLoader size='lg' tone='light' />
      <Typography variant='body1' sx={{ color: 'text.secondary' }}>
        {GH_MESSAGES.login_preparing_workspace}
      </Typography>
    </Stack>
  </Box>
)

export default LoginAccessTransition
