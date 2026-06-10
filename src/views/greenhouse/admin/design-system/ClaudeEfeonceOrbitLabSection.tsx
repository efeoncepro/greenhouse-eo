'use client'

/**
 * ClaudeEfeonceOrbitLabSection — bloque de experimentación de CLAUDE dentro de
 * la hoja Efeonce Brand Motion. Marcado con el spark de Claude para distinguirlo
 * de los experimentos de Codex en la misma ruta.
 *
 * Contenido: la propuesta de órbita completa con profundidad 3D, ya con el
 * "hueco" del anillo relleno (puente cosido a los arcos canónicos).
 */

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { ClaudeEfeonceFilledOrbitMark } from '@/components/greenhouse/primitives'

// Spark de Claude (terracota) — marca de autoría del experimento.
const CLAUDE_TERRACOTTA = '#D97757'

const ClaudeMark = () => (
  <Box
    component='svg'
    viewBox='0 0 24 24'
    aria-hidden='true'
    sx={{ inlineSize: 18, blockSize: 18, display: 'block' }}
  >
    <path
      fill={CLAUDE_TERRACOTTA}
      d='M12 1.5l2.05 6.35 6.45-2.3-4.4 5.45 5.4 3.9-6.7-.35 1.1 6.6-3.5-5.7-3.5 5.7 1.1-6.6-6.7.35 5.4-3.9-4.4-5.45 6.45 2.3z'
    />
  </Box>
)

const ClaudeBadge = () => (
  <Stack
    direction='row'
    spacing={0.75}
    alignItems='center'
    sx={theme => ({
      alignSelf: 'flex-start',
      px: 1,
      py: 0.5,
      borderRadius: `${theme.shape.customBorderRadius.sm}px`,
      border: `1px solid ${alpha(CLAUDE_TERRACOTTA, 0.4)}`,
      backgroundColor: alpha(CLAUDE_TERRACOTTA, 0.08)
    })}
  >
    <ClaudeMark />
    <Typography variant='overline' sx={{ color: CLAUDE_TERRACOTTA, lineHeight: 1 }}>
      Claude
    </Typography>
  </Stack>
)

const ClaudeEfeonceOrbitLabSection = () => (
  <Box
    data-capture='claude-efeonce-orbit-filled'
    sx={theme => ({
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(260px, 340px)' },
      gap: 4,
      alignItems: 'center',
      mt: 5,
      p: 4,
      border: `1px solid ${theme.palette.divider}`,
      borderLeft: `3px solid ${CLAUDE_TERRACOTTA}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: 'background.paper'
    })}
  >
    <Box sx={{ display: 'grid', placeItems: 'center', minBlockSize: { xs: 180, md: 300 } }}>
      <ClaudeEfeonceFilledOrbitMark
        decorative
        dataCapture='claude-efeonce-filled-orbit-mark'
        sx={{ inlineSize: { xs: '92%', md: 540 } }}
      />
    </Box>

    <Stack spacing={2}>
      <ClaudeBadge />
      <Typography variant='overline' color='primary'>
        Experimento · órbita completa
      </Typography>
      <Typography variant='h5'>Círculo orbitando, sin el hueco</Typography>
      <Typography variant='body2' color='text.secondary'>
        El círculo recorre la elipse completa con profundidad 3D (atrás se achica y pasa por detrás de la nave;
        adelante crece y pasa por delante). La abertura superior de la “O” se rellena con un puente del mismo
        grosor cosido a los arcos canónicos, así el anillo se lee continuo durante toda la vuelta — sin el
        “mordisco”.
      </Typography>
      <Typography variant='caption' color='text.secondary'>
        En <Box component='code'>prefers-reduced-motion</Box> el círculo queda estático en el ápex (reposo del
        logo). Copia experimental; no toca el asset principal.
      </Typography>
    </Stack>
  </Box>
)

export default ClaudeEfeonceOrbitLabSection
