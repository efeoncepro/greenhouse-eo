'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { GREENHOUSE_ELEVATION_LEVELS, type GreenhouseElevationLevel } from '@/components/theme/elevation-tokens'

// Internal Elevation & Shadows Lab (TASK-1049). Live museum rendered from the
// elevation token SoT via the theme (`theme.greenhouseElevation`). NOT where the
// rules live — those live in DESIGN.md / V1 / CLAUDE.md; this is the visual
// reference. Specimens resolve for the CURRENT theme mode; switch the portal
// theme (light / dark) to compare modes. Everything visual is tokenized: colors
// from `theme.palette.*`, type from canonical variants, radius/spacing from the
// scale — zero hardcoded hex / font-size.

// Inline code chip — tokenized (action.hover bg + radius from the scale), inherits
// the surrounding type (Greenhouse anti-monospace: code refs use the body font).
const Code = ({ children }: { children: ReactNode }) => (
  <Box
    component='code'
    sx={theme => ({
      px: 1,
      py: 0.25,
      borderRadius: `${theme.shape.customBorderRadius.xs}px`,
      bgcolor: 'action.hover',
      fontFamily: 'inherit'
    })}
  >
    {children}
  </Box>
)

const ROLE_LABELS: Record<GreenhouseElevationLevel, string> = {
  none: 'none',
  raised: 'raised',
  floating: 'floating',
  overlay: 'overlay',
  modal: 'modal',
  overflow: 'overflow'
}

const ElevationLabView = () => {
  const theme = useTheme()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 1100, mx: 'auto' }}>
      <Stack spacing={1.5}>
        <AxisWordmark variant='auto' height={32} sx={{ mb: 0.5 }} />
        <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
          Elevation & Shadows
        </Typography>
        <Typography variant='h4' sx={{ fontWeight: 800 }}>
          Roles semánticos de elevación
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 780 }}>
          Referencia viva renderizada en vivo desde el theme (<Code>theme.greenhouseElevation</Code>). Un agente elige un
          rol, no un número. Los especímenes resuelven para el modo actual del portal — cambia el tema (claro / oscuro)
          para comparar. Superficie interna: los clientes nunca la ven.
        </Typography>
      </Stack>

      {/* Specimen grid — one card per role */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
          gap: 6
        }}
      >
        {GREENHOUSE_ELEVATION_LEVELS.map(level => {
          const token = theme.greenhouseElevation[level]
          const isReserved = Boolean(token.reserved)

          return (
            <Card key={level} variant='outlined' sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Backdrop so the shadow is legible — the specimen "floats" on it */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 128,
                    p: 4,
                    borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                    bgcolor: 'action.hover'
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      minHeight: 64,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: `${theme.shape.customBorderRadius.md}px`,
                      bgcolor: token.surfaceColor ?? 'background.paper',
                      border: token.borderColor ? `1px solid ${token.borderColor}` : '1px solid transparent',
                      boxShadow: token.boxShadow,
                      opacity: isReserved ? 0.55 : 1
                    }}
                  >
                    <Typography variant='monoId' sx={{ color: 'text.secondary' }}>
                      {ROLE_LABELS[level]}
                    </Typography>
                  </Box>
                </Box>

                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant='h6' sx={{ fontWeight: 800 }}>
                      {ROLE_LABELS[level]}
                    </Typography>
                    {isReserved ? (
                      <Chip label='Reservado' size='small' variant='tonal' color='secondary' />
                    ) : token.borderColor ? (
                      <Chip label='Border requerido' size='small' variant='tonal' color='info' />
                    ) : null}
                  </Box>
                  <Typography variant='body2' color='text.secondary'>
                    {token.intendedUse}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          )
        })}
      </Box>

      <Divider />

      {/* Contract notes */}
      <Card variant='outlined'>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant='h6' sx={{ fontWeight: 800 }}>
            Contrato
          </Typography>
          <Stack component='ul' spacing={1} sx={{ pl: 4, m: 0 }}>
            <Typography component='li' variant='body2' color='text.secondary'>
              Las primitives Greenhouse leen un <strong>rol</strong> (<Code>theme.greenhouseElevation.floating</Code>),
              nunca <Code>Paper elevation={'{n}'}</Code> ni <Code>theme.shadows[n]</Code>.
            </Typography>
            <Typography component='li' variant='body2' color='text.secondary'>
              Receta 2026: dos capas de sombra suaves + borde hairline de 1px. Ningún rol supera{' '}
              <Code>0 8px 24px rgba(0,0,0,0.1)</Code>.
            </Typography>
            <Typography component='li' variant='body2' color='text.secondary'>
              En <Code>floating</Code> / <Code>overlay</Code> / <Code>modal</Code> el <strong>borde</strong> carga la
              separación bajo <Code>forced-colors</Code> (el navegador elimina <Code>box-shadow</Code>); la sombra es el
              realce.
            </Typography>
            <Typography component='li' variant='body2' color='text.secondary'>
              Las cards de workbenches operativos quedan planas (<Code>none</Code>). <Code>raised</Code> no es atajo para
              re-elevar cards.
            </Typography>
            <Typography component='li' variant='body2' color='text.secondary'>
              SoT: <Code>src/components/theme/elevation-tokens.ts</Code>. Las reglas viven en DESIGN.md / V1 / CLAUDE.md;
              esta página es la referencia visual.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default ElevationLabView
