'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_GROWTH_AI_VISIBILITY_CLIENT_TIERING } from '@/lib/copy/growth'

import AeoRunCta from './AeoRunCta'

/**
 * TASK-1278 — Banner de tier AEO (nodo S6, EPIC-020). Server-safe (sin estado): refleja el entitlement
 * resuelto server-side (`resolveAeoEntitlement`, TASK-1277) en dos variantes honestas:
 *
 *   - **disponible** (`blocked=false`): "Te quedan N de {cap} revisiones este mes" + reset + el run
 *     self-serve (isla `AeoRunCta`). El cupo es un número CON contexto, jamás solo color.
 *   - **agotado** (`blocked=true`, por cupo o por el tope global de costo): NO es un error — es el
 *     estado de UPSELL. Reencuadra hacia AEO recurrente con CTA al equipo (sin self-checkout).
 *
 * El tier `contracted` NO usa este banner (su experiencia es el workbench completo + re-grade recurrente);
 * sólo `trial`/`pilot` muestran cupo. NUNCA expone costo/engine interno.
 */

const C = GH_GROWTH_AI_VISIBILITY_CLIENT_TIERING

export interface AeoTierBannerProps {
  allowanceRemaining: number
  allowanceCap: number
  /** Fecha del reset mensual ya formateada es-CL (p. ej. "1 de julio"). */
  resetDateLabel: string
  /** El cupo está agotado (cupo=0 o tope de costo) → variante upsell. */
  blocked: boolean
  /** El run self-serve está habilitado en este ambiente (flags portal/trial ON). */
  runAvailable: boolean
}

const AeoTierBanner = ({
  allowanceRemaining,
  allowanceCap,
  resetDateLabel,
  blocked,
  runAvailable
}: AeoTierBannerProps) => {
  if (blocked) {
    return (
      <Card
        variant='outlined'
        data-capture='aeo-tier-banner'
        sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.lg}px` })}
      >
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent='space-between'
          >
            <Stack spacing={1} sx={{ minWidth: 0 }}>
              <Typography variant='overline' color='text.secondary'>
                {C.upsell.eyebrow}
              </Typography>
              <Typography variant='h5' component='h2'>
                {C.upsell.title}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {C.upsell.body(resetDateLabel)}
              </Typography>
            </Stack>
            <Button
              variant='contained'
              href={C.teamMailto}
              aria-label={C.upsell.ctaAria}
              startIcon={<i className='tabler-rocket' aria-hidden='true' />}
              sx={{ flexShrink: 0 }}
            >
              {C.upsell.cta}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      variant='outlined'
      data-capture='aeo-tier-banner'
      sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.lg}px` })}
    >
      <CardContent>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent='space-between'
        >
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Typography variant='overline' color='primary.main' aria-label={C.banner.eyebrowAria}>
              {C.banner.eyebrow}
            </Typography>
            <Typography variant='h5' component='h2'>
              {C.banner.remaining(allowanceRemaining, allowanceCap)}
            </Typography>
            <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
              <Typography variant='body2' color='text.secondary'>
                {C.banner.help}
              </Typography>
              <Stack direction='row' spacing={1} alignItems='center' sx={{ color: 'text.secondary' }}>
                <i className='tabler-calendar-repeat' aria-hidden='true' />
                <Typography variant='caption' color='text.secondary'>
                  {C.banner.resets(resetDateLabel)}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
          <Box sx={{ flexShrink: 0 }}>
            <AeoRunCta runAvailable={runAvailable} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default AeoTierBanner
