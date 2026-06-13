'use client'

import { useMemo, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import {
  GreenhouseButton,
  GreenhouseGradientBackground,
  type GreenhouseGradientBackgroundIntensity,
  type GreenhouseGradientBackgroundKind
} from '@/components/greenhouse/primitives'
import { DESIGN_SYSTEM_LAB_TOKENS } from '../design-system-lab-tokens'

const KIND_OPTIONS: {
  kind: GreenhouseGradientBackgroundKind
  label: string
  use: string
}[] = [
  { kind: 'axisSurface', label: 'AXIS surface', use: 'Fondos internos claros, headers suaves y labs.' },
  { kind: 'nexaAurora', label: 'Nexa aurora', use: 'Momentos de asistente o conversación, con foreground invertido.' },
  { kind: 'efeonceBrand', label: 'Efeonce brand', use: 'Superficies institucionales o brand-zone internas.' },
  { kind: 'insightPanel', label: 'Insight panel', use: 'Panels de análisis, summaries y estados de lectura.' },
  { kind: 'calmBackdrop', label: 'Calm backdrop', use: 'Fondos de apoyo donde el contenido manda.' }
]

const INTENSITIES: GreenhouseGradientBackgroundIntensity[] = ['subtle', 'medium', 'strong']

const InlineCode = ({ children, inverted = false }: { children: string; inverted?: boolean }) => (
  <Box
    component='span'
    sx={theme => ({
      px: 1,
      py: 0.5,
      borderRadius: `${theme.shape.customBorderRadius.sm}px`,
      color: inverted ? theme.palette.common.white : theme.palette.text.primary,
      bgcolor: inverted ? alpha(theme.palette.common.white, 0.16) : alpha(theme.palette.text.primary, 0.08),
      typography: 'caption',
      fontWeight: 600,
      whiteSpace: 'nowrap'
    })}
  >
    {children}
  </Box>
)

const Section = ({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) => (
  <Stack spacing={3}>
    <Stack spacing={1}>
      <Typography variant='overline' color='primary'>
        {eyebrow}
      </Typography>
      <Typography variant='h5'>{title}</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: 820 }}>
        {description}
      </Typography>
    </Stack>
    {children}
  </Stack>
)

const UsageSnippet = ({ kind, intensity, animated }: { kind: GreenhouseGradientBackgroundKind; intensity: GreenhouseGradientBackgroundIntensity; animated: boolean }) => (
  <Box
    component='pre'
    sx={theme => ({
      m: 0,
      p: 3,
      overflowX: 'auto',
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: alpha(theme.palette.text.primary, 0.04),
      color: 'text.secondary',
      typography: 'body2',
      whiteSpace: 'pre'
    })}
  >
    {`<GreenhouseGradientBackground
  kind='${kind}'
  intensity='${intensity}'
  animated={${String(animated)}}
  overlay
  centerContent
>
  {content}
</GreenhouseGradientBackground>`}
  </Box>
)

const GradientBackgroundLabView = () => {
  const [activeKind, setActiveKind] = useState<GreenhouseGradientBackgroundKind>('nexaAurora')
  const [activeIntensity, setActiveIntensity] = useState<GreenhouseGradientBackgroundIntensity>('medium')
  const [animated, setAnimated] = useState(true)
  const activeOption = useMemo(() => KIND_OPTIONS.find(option => option.kind === activeKind) ?? KIND_OPTIONS[0], [activeKind])

  return (
    <Stack data-capture='gradient-background-lab' spacing={6} sx={{ pb: 8 }}>
      <Stack spacing={2}>
        <Typography variant='overline' color='primary'>
          Design System · Gradients
        </Typography>
        <Typography variant='h4'>Gradient backgrounds</Typography>
        <Typography variant='body1' color='text.secondary' sx={{ maxInlineSize: 860 }}>
          Primitive gobernada para fondos degradados. La intención del componente externo se conserva, pero en Greenhouse
          los colores salen de AXIS/MUI, la animación es CSS con reduced-motion y los presets viven como kinds.
        </Typography>
        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
          <CustomChip label='Sin Tailwind' size='small' variant='tonal' color='primary' round='true' />
          <CustomChip label='Sin HEX inline' size='small' variant='tonal' color='primary' round='true' />
          <CustomChip label='Reduced motion' size='small' variant='tonal' color='success' round='true' />
          <CustomChip label='No orbs' size='small' variant='tonal' color='warning' round='true' />
        </Stack>
      </Stack>

      <GreenhouseGradientBackground
        kind='efeonceBrand'
        intensity='medium'
        overlay
        centerContent
        dataCapture='gradient-background-hero'
        minBlockSize={360}
      >
        <Stack spacing={2} alignItems='center' sx={{ textAlign: 'center', maxInlineSize: 720 }}>
          <Typography variant='h4' color='inherit'>
            Fondos degradados, pero gobernados
          </Typography>
          <Typography variant='body1' color='inherit' sx={{ opacity: 0.82 }}>
            Presets reutilizables, intensidad controlada y animación sobria para surfaces que necesitan atmósfera sin perder
            estructura enterprise.
          </Typography>
        </Stack>
      </GreenhouseGradientBackground>

      <Divider />

      <Section
        eyebrow='Workbench'
        title='Ajusta el preset antes de usarlo'
        description='Estos controles demuestran las props públicas. Si necesitas otro color o comportamiento, se agrega un kind oficial al resolver en vez de pegar un gradiente local.'
      >
        <Card variant='outlined' data-capture='gradient-background-adjuster'>
          <CardContent sx={{ p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset }}>
            <Stack spacing={4}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1.2fr' }, gap: 4, alignItems: 'start' }}>
                <Stack spacing={3}>
                  <Stack spacing={1}>
                    <Typography variant='h6'>Kind</Typography>
                    <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                      {KIND_OPTIONS.map(option => (
                        <GreenhouseButton
                          key={option.kind}
                          size='small'
                          variant={activeKind === option.kind ? 'solid' : 'label'}
                          tone='primary'
                          onClick={() => setActiveKind(option.kind)}
                        >
                          {option.label}
                        </GreenhouseButton>
                      ))}
                    </Stack>
                  </Stack>
                  <Stack spacing={1}>
                    <Typography variant='h6'>Intensidad</Typography>
                    <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                      {INTENSITIES.map(intensity => (
                        <GreenhouseButton
                          key={intensity}
                          size='small'
                          variant={activeIntensity === intensity ? 'solid' : 'label'}
                          tone='secondary'
                          onClick={() => setActiveIntensity(intensity)}
                        >
                          {intensity}
                        </GreenhouseButton>
                      ))}
                    </Stack>
                  </Stack>
                  <GreenhouseButton
                    size='small'
                    variant={animated ? 'solid' : 'label'}
                    tone='primary'
                    leadingIconClassName={animated ? 'tabler-player-pause' : 'tabler-player-play'}
                    onClick={() => setAnimated(current => !current)}
                  >
                    {animated ? 'Animación activa' : 'Animación pausada'}
                  </GreenhouseButton>
                  <UsageSnippet kind={activeKind} intensity={activeIntensity} animated={animated} />
                </Stack>

                <GreenhouseGradientBackground
                  kind={activeKind}
                  intensity={activeIntensity}
                  animated={animated}
                  overlay
                  centerContent
                  minBlockSize={360}
                  sx={{ inlineSize: '100%' }}
                >
                  <Stack spacing={2} alignItems='center' sx={{ textAlign: 'center', maxInlineSize: 520 }}>
                    <Typography variant='h5' color='inherit'>
                      {activeOption.label}
                    </Typography>
                    <Typography variant='body2' color='inherit' sx={{ opacity: 0.8 }}>
                      {activeOption.use}
                    </Typography>
                    <CustomChip label={`kind='${activeKind}'`} size='small' variant='tonal' color='primary' round='true' />
                  </Stack>
                </GreenhouseGradientBackground>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Section>

      <Section
        eyebrow='Presets'
        title='Kinds oficiales'
        description='Los specimens muestran el mismo contrato visual con distintas intenciones semánticas. Todos usan bandas lineales, no blobs radiales.'
      >
        <Box
          data-capture='gradient-background-preset-grid'
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 3 }}
        >
          {KIND_OPTIONS.map(option => {
            const inverted = option.kind === 'nexaAurora' || option.kind === 'efeonceBrand'

            return (
              <GreenhouseGradientBackground
                key={option.kind}
                kind={option.kind}
                intensity='medium'
                animated={false}
                overlay={inverted}
                minBlockSize={220}
                contentSx={{ p: 4 }}
              >
                <Stack spacing={1.5}>
                  <Typography variant='h5' color='inherit'>
                    {option.label}
                  </Typography>
                  <Typography variant='body2' color='inherit' sx={{ opacity: inverted ? 0.82 : 0.72 }}>
                    {option.use}
                  </Typography>
                  <Typography variant='caption' color='inherit' sx={{ opacity: 0.72 }}>
                    <InlineCode inverted={inverted}>{`kind='${option.kind}'`}</InlineCode>
                  </Typography>
                </Stack>
              </GreenhouseGradientBackground>
            )
          })}
        </Box>
      </Section>
    </Stack>
  )
}

export default GradientBackgroundLabView
