'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import GreenhouseBrandLogoMark from '@/components/greenhouse/primitives/GreenhouseBrandLogoMark'
import { GH_GROWTH_AI_VISIBILITY_CLIENT_TIERING } from '@/lib/copy/growth'

/**
 * TASK-1278 — Teaser/Locked AEO (nodo S6, EPIC-020). Estado para el cliente del portal SIN entitlement
 * AEO: cross-sell GRATIS (NO corre el motor, costo $0). Muestra el valor con honestidad — qué mide AEO,
 * en qué motores — y reencuadra hacia "Habla con tu equipo" (sin self-checkout). Server-safe (estático).
 * NUNCA promete monitoreo continuo ni expone costo/engine interno.
 */

const C = GH_GROWTH_AI_VISIBILITY_CLIENT_TIERING

// Isotipos de los motores evaluados (gancho concreto del teaser). Marca de 3ros (identidad propia), no
// tokens Greenhouse — espeja el mapeo del workbench TASK-1248.
const EngineIsotypes = () => (
  <Stack direction='row' spacing={2} alignItems='center' aria-hidden='true'>
    <GreenhouseBrandLogoMark kind='gptIsotype' size='small' decorative />
    <GreenhouseBrandLogoMark kind='geminiColor' size='small' decorative />
    <GreenhouseBrandLogoMark kind='claudeIsologo' size='small' decorative />
    <i className='logos-perplexity-icon' style={{ fontSize: 22 }} />
  </Stack>
)

const AeoLockedCard = () => (
  <Card
    variant='outlined'
    data-capture='aeo-locked'
    sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.lg}px`, overflow: 'hidden' })}
  >
    <CardContent sx={{ p: { xs: 5, md: 7 } }}>
      <Stack spacing={5}>
        <Stack spacing={3}>
          <Box
            aria-hidden='true'
            sx={theme => ({
              width: 52,
              height: 52,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.palette.primary.main,
              backgroundColor: theme.palette.action.hover,
              fontSize: 26
            })}
          >
            <i className='tabler-robot' />
          </Box>
          <Stack spacing={1.5}>
            <Typography variant='overline' color='primary.main'>
              {C.locked.eyebrow}
            </Typography>
            <Typography variant='surfaceHeroTitle' component='h1'>
              {C.locked.title}
            </Typography>
            <Typography variant='body1' color='text.secondary' sx={{ maxWidth: 560 }}>
              {C.locked.body}
            </Typography>
          </Stack>
        </Stack>

        <Stack
          component='ul'
          spacing={2}
          sx={{ listStyle: 'none', p: 0, m: 0 }}
          aria-label={C.locked.title}
        >
          {C.locked.bullets.map(bullet => (
            <Stack key={bullet} component='li' direction='row' spacing={2} alignItems='center'>
              <Box
                aria-hidden='true'
                sx={theme => ({
                  flexShrink: 0,
                  color: theme.palette.primary.main,
                  display: 'inline-flex',
                  fontSize: 20
                })}
              >
                <i className='tabler-circle-check' />
              </Box>
              <Typography variant='body2'>{bullet}</Typography>
            </Stack>
          ))}
        </Stack>

        <EngineIsotypes />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent='space-between'
          sx={theme => ({ pt: 4, borderTop: `1px solid ${theme.palette.divider}` })}
        >
          <Typography variant='caption' color='text.secondary' sx={{ maxWidth: 360 }}>
            {C.locked.note}
          </Typography>
          <Button
            variant='contained'
            href={C.teamMailto}
            aria-label={C.locked.ctaAria}
            startIcon={<i className='tabler-message-2' aria-hidden='true' />}
            sx={{ flexShrink: 0 }}
          >
            {C.locked.cta}
          </Button>
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

export default AeoLockedCard
