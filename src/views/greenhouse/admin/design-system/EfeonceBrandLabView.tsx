'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { typographyScale } from '@/components/theme/typography-tokens'
import { EfeonceOrbitalLogoMark, GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'

import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

const InlineCode = ({ children }: { children: string }) => (
  <Box
    component='span'
    sx={theme => ({
      px: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight,
      py: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline,
      borderRadius: `${theme.shape.customBorderRadius.sm}px`,
      color: theme.palette.text.primary,
      backgroundColor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.codeBackground),
      ...typographyScale.labelSm,
      whiteSpace: 'nowrap'
    })}
  >
    {children}
  </Box>
)

const EfeonceBrandLabView = () => {
  const [replayKey, setReplayKey] = useState(0)

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: DESIGN_SYSTEM_LAB_TOKENS.layout.sectionGap,
        maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.pageMaxInlineSize,
        mx: 'auto'
      }}
    >
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.layout.headerGap}>
        <AxisWordmark
          variant='auto'
          height={DESIGN_SYSTEM_LAB_TOKENS.layout.logoBlockSize}
          sx={{ mb: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline }}
        />
        <Typography variant='overline' color='primary'>
          Efeonce Brand Motion
        </Typography>
        <Typography variant='h4'>Efeonce Orbital Signature</Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}
        >
          Hoja interna para probar una firma orbital del wordmark institucional. El asset fuente vive intacto; esta
          primitive usa una copia SVG con nodos semánticos para animar el círculo superior, los arcos y la nave de la O.
        </Typography>
      </Stack>

      <Box
        data-capture='efeonce-brand-orbital-hero'
        sx={theme => ({
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(280px, 360px)' },
          gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
          alignItems: 'center',
          p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          background: `radial-gradient(circle at 46% 34%, ${alpha(theme.palette.primary.main, 0.08)}, transparent 34%), ${theme.palette.background.paper}`
        })}
      >
        <Box
          sx={{
            display: 'grid',
            placeItems: 'center',
            minBlockSize: { xs: 176, md: 320 },
            px: { xs: 0, md: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset }
          }}
        >
          <EfeonceOrbitalLogoMark
            key={replayKey}
            kind='motionSpecimen'
            dataCapture='efeonce-orbital-signature'
            sx={{ inlineSize: { xs: '92%', md: 560 } }}
          />
        </Box>

        <Stack spacing={3}>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            <GreenhouseChip label='GSAP' size='small' tone='primary' variant='label' kind='attribute' />
            <GreenhouseChip label='SVG nodes' size='small' tone='secondary' variant='label' kind='attribute' />
            <GreenhouseChip label='Reduced motion' size='small' tone='success' variant='label' kind='attribute' />
          </Stack>
          <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
            <Typography variant='h6'>Dirección</Typography>
            <Typography variant='body2' color='text.secondary'>
              La entrada evita el loop de loader: primero aparece el wordmark, luego la O/nave toma cuerpo y el círculo
              recorre la órbita 360° del propio óvalo. Un puente superior completa la pista cuando el punto se mueve.
            </Typography>
          </Stack>
          <GreenhouseButton
            kind='secondaryAction'
            variant='outlined'
            tone='primary'
            leadingIcon={<i className='tabler-player-play' />}
            onClick={() => setReplayKey(value => value + 1)}
            sx={{ alignSelf: 'flex-start' }}
          >
            Reproducir firma
          </GreenhouseButton>
        </Stack>
      </Box>

      <Box
        data-capture='efeonce-brand-orbital-variants'
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
          gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap
        }}
      >
        <Box
          sx={theme => ({
            p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            bgcolor: 'background.paper'
          })}
        >
          <Stack spacing={3} alignItems='center'>
            <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
              <Typography variant='h6'>Signature once</Typography>
              <Typography variant='body2' color='text.secondary'>
                <InlineCode>variant orbitalSignature</InlineCode> corre una órbita completa una vez. Es la opción para
                brand zones institucionales donde la firma debe sentirse premium y terminar quieta.
              </Typography>
            </Stack>
            <EfeonceOrbitalLogoMark
              variant='orbitalSignature'
              decorative
              replayOnHover
              dataCapture='efeonce-orbital-signature-once'
              sx={{ inlineSize: { xs: '92%', sm: 360 } }}
            />
          </Stack>
        </Box>

        <Box
          sx={theme => ({
            p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            bgcolor: 'background.paper'
          })}
        >
          <Stack spacing={3} alignItems='center'>
            <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
              <Typography variant='h6'>Ambient specimen</Typography>
              <Typography variant='body2' color='text.secondary'>
                <InlineCode>variant ambient</InlineCode> suma respiración mínima al círculo, nave y arcos. Sirve para
                estudiar fluidez, no como default institucional.
              </Typography>
            </Stack>
            <EfeonceOrbitalLogoMark
              variant='ambient'
              decorative
              replayOnHover
              dataCapture='efeonce-orbital-ambient'
              sx={{ inlineSize: { xs: '92%', sm: 360 } }}
            />
          </Stack>
        </Box>
      </Box>

      <Box
        data-capture='efeonce-brand-orbital-notes'
        sx={theme => ({
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 0.42fr) minmax(320px, 1fr)' },
          gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
          p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          bgcolor: alpha(theme.palette.primary.main, 0.035)
        })}
      >
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='h6'>Motion contract</Typography>
          <Typography variant='body2' color='text.secondary'>
            Selectores gobernados para iterar sin tocar el asset principal.
          </Typography>
        </Stack>

        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.related}>
          <Typography variant='body2' color='text.secondary'>
            <InlineCode>#efeonce-orbit-top-bridge</InlineCode> rellena la pista superior de la O.{' '}
            <InlineCode>#efeonce-orbiting-satellite-circle</InlineCode> recorre el óvalo 360°.{' '}
            <InlineCode>#efeonce-orbit-rings</InlineCode> y{' '}
            <InlineCode>#efeonce-ship-upper-body</InlineCode> / <InlineCode>#efeonce-ship-lower-body</InlineCode> dan
            cuerpo a la O sin deformar el wordmark.
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            En <InlineCode>prefers-reduced-motion</InlineCode> la primitive renderiza el estado final estático. La copia
            experimental del asset queda en <InlineCode>public/branding/experiments</InlineCode>.
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}

export default EfeonceBrandLabView
