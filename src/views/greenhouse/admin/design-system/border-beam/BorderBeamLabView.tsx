'use client'

import { useMemo, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import {
  GreenhouseBorderBeam,
  GreenhouseButton,
  GreenhouseSpectrumBeam,
  NexaComposerActionButton,
  NexaComposerInput,
  type GreenhouseBorderBeamIntensity,
  type GreenhouseBorderBeamKind,
  type GreenhouseBorderBeamSpectrumPalette,
  type GreenhouseBorderBeamVariant
} from '@/components/greenhouse/primitives'
import { DESIGN_SYSTEM_LAB_TOKENS } from '../design-system-lab-tokens'

const KIND_OPTIONS: {
  kind: GreenhouseBorderBeamKind
  label: string
  use: string
}[] = [
  { kind: 'nexaSurface', label: 'Nexa surface', use: 'Superficies conversacionales o módulos asistidos por Nexa.' },
  { kind: 'promptDock', label: 'Prompt dock', use: 'Entrada contextual que aparece al interactuar con una surface.' },
  { kind: 'evidencePeek', label: 'Evidence peek', use: 'Pistas de evidencia, trazabilidad o fuente anclada.' },
  { kind: 'approvalCard', label: 'Approval card', use: 'Cards de revisión donde el usuario decide después de leer.' },
  { kind: 'asyncOperation', label: 'Async operation', use: 'Estados en progreso sin reemplazar loaders largos.' }
]

const VARIANTS: {
  variant: GreenhouseBorderBeamVariant
  label: string
  note: string
}[] = [
  { variant: 'ambient', label: 'Ambient', note: 'Presencia suave siempre visible.' },
  { variant: 'interactive', label: 'Interactive', note: 'Más útil en hover/focus o estados activos.' },
  { variant: 'progress', label: 'Progress', note: 'Movimiento más corto para una operación activa.' }
]

const INTENSITIES: GreenhouseBorderBeamIntensity[] = ['subtle', 'medium', 'strong']

const Section = ({
  children,
  description,
  eyebrow,
  title
}: {
  children: ReactNode
  description: string
  eyebrow: string
  title: string
}) => (
  <Stack spacing={3}>
    <Stack spacing={1}>
      <Typography variant='overline' color='primary'>
        {eyebrow}
      </Typography>
      <Typography variant='h5'>{title}</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}>
        {description}
      </Typography>
    </Stack>
    {children}
  </Stack>
)

const UsageSnippet = ({
  activeKind,
  activeVariant,
  intensity
}: {
  activeKind: GreenhouseBorderBeamKind
  activeVariant: GreenhouseBorderBeamVariant
  intensity: GreenhouseBorderBeamIntensity
}) => (
  <Box
    component='pre'
    sx={theme => ({
      m: 0,
      p: 3,
      overflowX: 'auto',
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.codeBackground),
      color: 'text.secondary',
      maxInlineSize: '100%',
      typography: 'body2',
      whiteSpace: 'pre'
    })}
  >
    {`<Box sx={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
  <SurfaceContent />
  <GreenhouseBorderBeam
    kind='${activeKind}'
    variant='${activeVariant}'
    intensity='${intensity}'
  />
</Box>`}
  </Box>
)

const SpecimenSurface = ({
  children,
  dataCapture,
  kind,
  variant,
  active = false
}: {
  children: ReactNode
  dataCapture: string
  kind: GreenhouseBorderBeamKind
  variant?: GreenhouseBorderBeamVariant
  active?: boolean
}) => (
  <Box
    data-capture={dataCapture}
    sx={theme => ({
      position: 'relative',
      minInlineSize: 0,
      overflow: 'hidden',
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      border: `1px solid ${theme.palette.divider}`,
      bgcolor: 'background.paper'
    })}
  >
    {children}
    <GreenhouseBorderBeam kind={kind} variant={variant} active={active} />
  </Box>
)

const BeamButtonSpecimen = () => (
  <Box
    data-capture='border-beam-button-specimen'
    sx={theme => ({
      position: 'relative',
      alignSelf: 'flex-start',
      display: 'inline-flex',
      inlineSize: 'fit-content',
      maxInlineSize: '100%',
      p: '2px',
      overflow: 'visible',
      isolation: 'isolate',
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      boxShadow: `0 18px 44px ${alpha(theme.axis.ramp.primary[700], 0.22)}`
    })}
  >
    <GreenhouseButton
      kind='primaryAction'
      leadingIconClassName='tabler-sparkles'
      reserveInlineSize={220}
      sx={theme => ({
        position: 'relative',
        zIndex: 1,
        color: theme.palette.common.white,
        bgcolor: theme.axis.ramp.primary[900],
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        boxShadow: 'none',
        '&:hover': {
          bgcolor: theme.axis.ramp.primary[800],
          boxShadow: 'none'
        }
      })}
    >
      Pregúntale a Nexa
    </GreenhouseButton>
    <GreenhouseSpectrumBeam
      kind='promptDock'
      variant='interactive'
      intensity='strong'
      borderWidth={2.5}
      durationSec={20}
      active
    />
  </Box>
)

const NexaSpectrumGlowBoxSpecimen = ({
  dataCapture = 'border-beam-nexa-spectrum-box',
  palette = 'axis',
  title = 'Nexa glow box · spectrum',
  description = 'Misma caja glow de Nexa, pero con el efecto spectrum: anillo completo, aura amplia y gradiente en movimiento.'
}: {
  dataCapture?: string
  palette?: GreenhouseBorderBeamSpectrumPalette
  title?: string
  description?: string
}) => (
  <Box
    data-capture={dataCapture}
    sx={theme => ({
      position: 'relative',
      overflow: 'visible',
      isolation: 'isolate',
      borderRadius: `${theme.shape.customBorderRadius.xxl}px`
    })}
  >
    <GreenhouseSpectrumBeam
      kind='nexaSurface'
      variant='ambient'
      spectrumPalette={palette}
      intensity='strong'
      borderWidth={2.5}
      durationSec={18}
      active
      contentSx={theme => ({
        p: { xs: 4, md: 5 },
        minBlockSize: 240,
        borderRadius: `${theme.shape.customBorderRadius.xxl}px`,
        border: `1px solid ${alpha(theme.palette.common.white, 0.14)}`,
        color: theme.palette.common.white,
        bgcolor: theme.axis.ramp.primary[900],
        background: `linear-gradient(135deg, ${theme.axis.ramp.primary[900]}, ${theme.axis.ramp.info[900]} 58%, ${theme.axis.ramp.primary[800]})`
      })}
    >
      <Stack spacing={2} sx={{ maxInlineSize: 520 }}>
        <Stack direction='row' spacing={1} alignItems='center'>
          <Box
            sx={theme => ({
              display: 'grid',
              placeItems: 'center',
              inlineSize: 36,
              blockSize: 36,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.common.white, 0.12)
            })}
          >
            <i className='tabler-sparkles' aria-hidden='true' />
          </Box>
          <Typography variant='h6' color='inherit'>
            {title}
          </Typography>
        </Stack>
        <Typography variant='body2' color='inherit' sx={{ opacity: 0.82 }}>
          {description}
        </Typography>
        <CustomChip
          label={palette === 'nexa' ? 'spectrumPalette=nexa' : 'GreenhouseSpectrumBeam'}
          size='small'
          variant='tonal'
          color='primary'
          round='true'
          sx={theme => ({
            alignSelf: 'flex-start',
            color: theme.palette.common.white,
            bgcolor: alpha(theme.palette.common.white, 0.14)
          })}
        />
      </Stack>
    </GreenhouseSpectrumBeam>
  </Box>
)

const NexaMessageComposerSpectrumSpecimen = ({
  dataCapture,
  defaultValue,
  state,
  title
}: {
  dataCapture: string
  defaultValue?: string
  state: 'inactive' | 'withText'
  title: string
}) => {
  const hasText = state === 'withText'

  return (
    <Box
      data-capture={dataCapture}
      sx={theme => ({
        position: 'relative',
        overflow: 'visible',
        isolation: 'isolate',
        borderRadius: `${theme.shape.customBorderRadius.xxl}px`
      })}
    >
      <GreenhouseSpectrumBeam
        kind='promptDock'
        variant='interactive'
        spectrumPalette='nexa'
        intensity={hasText ? 'strong' : 'subtle'}
        borderWidth={2.5}
        durationSec={hasText ? 18 : 24}
        active={hasText}
        contentSx={theme => ({
          p: 1,
          borderRadius: `${theme.shape.customBorderRadius.xxl}px`,
          bgcolor: 'background.paper',
          border: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
          boxShadow: `0 18px 44px ${alpha(theme.axis.ramp.primary[900], hasText ? 0.2 : 0.1)}`
        })}
      >
        <Stack spacing={1.5}>
          <Stack direction='row' spacing={1} alignItems='center' sx={{ px: 1.5, pt: 1, minInlineSize: 0 }}>
            <Box
              sx={theme => ({
                display: 'grid',
                flex: '0 0 auto',
                placeItems: 'center',
                inlineSize: 28,
                blockSize: 28,
                borderRadius: '50%',
                color: theme.palette.common.white,
                bgcolor: theme.axis.ramp.primary[900]
              })}
            >
              <i className='tabler-sparkles' aria-hidden='true' />
            </Box>
            <Stack spacing={0} sx={{ minInlineSize: 0 }}>
              <Typography variant='subtitle2' noWrap>
                {title}
              </Typography>
              <Typography variant='caption' color='text.secondary' noWrap>
                Lab-only: {hasText ? 'estado con texto listo para enviar.' : 'estado inactive sin texto escrito.'}
              </Typography>
            </Stack>
          </Stack>

          <NexaComposerInput
            kind='knowledgeAsk'
            defaultValue={defaultValue}
            placeholder='Pregúntale a Nexa'
            actionAdornment={<NexaComposerActionButton variant='send' aria-label='Enviar mensaje a Nexa' disabled={!hasText} />}
            sx={theme => ({
              '& .MuiInputBase-root, & .MuiFilledInput-root': {
                minBlockSize: 54,
                borderRadius: `${theme.shape.customBorderRadius.xl}px`,
                color: hasText ? 'text.primary' : 'text.disabled'
              }
            })}
          />
        </Stack>
      </GreenhouseSpectrumBeam>
    </Box>
  )
}

const BorderBeamLabView = () => {
  const [activeKind, setActiveKind] = useState<GreenhouseBorderBeamKind>('promptDock')
  const [activeVariant, setActiveVariant] = useState<GreenhouseBorderBeamVariant>('interactive')
  const [activeIntensity, setActiveIntensity] = useState<GreenhouseBorderBeamIntensity>('medium')
  const activeOption = useMemo(() => KIND_OPTIONS.find(option => option.kind === activeKind) ?? KIND_OPTIONS[0], [activeKind])

  return (
    <Stack data-capture='border-beam-lab' spacing={6} sx={{ pb: 8 }}>
      <Stack spacing={2}>
        <Typography variant='overline' color='primary'>
          Design System · Border Beam
        </Typography>
        <Typography variant='h4'>Border beam</Typography>
        <Typography variant='body1' color='text.secondary' sx={{ maxInlineSize: 860 }}>
          Primitive para traer el patrón de borde animado al sistema Greenhouse sin Tailwind ni HEX locales. El beam vive como
          overlay decorativo, respeta el radio de la surface y se apaga con reduced motion.
        </Typography>
        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
          <CustomChip label='AXIS tokens' size='small' variant='tonal' color='primary' round='true' />
          <CustomChip label='Decorative overlay' size='small' variant='tonal' color='primary' round='true' />
          <CustomChip label='Reduced motion' size='small' variant='tonal' color='success' round='true' />
          <CustomChip label='No Tailwind config' size='small' variant='tonal' color='warning' round='true' />
        </Stack>
      </Stack>

      <Box
        data-capture='border-beam-hero'
        sx={theme => ({
          position: 'relative',
          overflow: 'hidden',
          borderRadius: `${theme.shape.customBorderRadius.xxl}px`,
          border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
          color: 'common.white',
          bgcolor: theme.axis.ramp.primary[900],
          background: `linear-gradient(135deg, ${theme.axis.ramp.primary[900]}, ${theme.axis.ramp.info[800]} 54%, ${theme.axis.ramp.secondary[700]})`,
          p: { xs: 5, md: 8 }
        })}
      >
        <Stack spacing={2} sx={{ maxInlineSize: 680 }}>
          <Typography variant='h4' color='inherit'>
            Una línea de luz, no otro componente suelto
          </Typography>
          <Typography variant='body1' color='inherit' sx={{ opacity: 0.82 }}>
            El mismo patrón sirve para entrada contextual, evidencia, aprobación y progreso cuando la surface necesita una
            señal perimetral sobria.
          </Typography>
        </Stack>
        <GreenhouseBorderBeam kind='nexaSurface' intensity='strong' active />
      </Box>

      <Divider />

      <Section
        eyebrow='Workbench'
        title='Ajusta el contrato antes de usarlo'
        description='Los colores y timings nacen del resolver. Si una surface necesita otro comportamiento, se agrega un kind oficial en vez de pegar un borde animado local.'
      >
        <Card variant='outlined' data-capture='border-beam-adjuster'>
          <CardContent sx={{ p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(0, 1.15fr)' },
                gap: 4,
                alignItems: 'start'
              }}
            >
              <Stack spacing={3} sx={{ minInlineSize: 0 }}>
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
                  <Typography variant='h6'>Variant</Typography>
                  <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                    {VARIANTS.map(option => (
                      <GreenhouseButton
                        key={option.variant}
                        size='small'
                        variant={activeVariant === option.variant ? 'solid' : 'label'}
                        tone='secondary'
                        onClick={() => setActiveVariant(option.variant)}
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
                        tone='primary'
                        onClick={() => setActiveIntensity(intensity)}
                      >
                        {intensity}
                      </GreenhouseButton>
                    ))}
                  </Stack>
                </Stack>

                <UsageSnippet activeKind={activeKind} activeVariant={activeVariant} intensity={activeIntensity} />
              </Stack>

              <SpecimenSurface dataCapture='border-beam-live-specimen' kind={activeKind} variant={activeVariant} active>
                <Stack spacing={2.5} sx={{ p: { xs: 4, md: 5 }, minBlockSize: 320, justifyContent: 'center' }}>
                  <Stack spacing={1}>
                    <Typography variant='overline' color='primary'>
                      {activeVariant}
                    </Typography>
                    <Typography variant='h5'>{activeOption.label}</Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
                      {activeOption.use}
                    </Typography>
                  </Stack>
                  <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                    <CustomChip label={`kind='${activeKind}'`} size='small' variant='tonal' color='primary' round='true' />
                    <CustomChip label={`intensity='${activeIntensity}'`} size='small' variant='tonal' color='secondary' round='true' />
                  </Stack>
                  <BeamButtonSpecimen />
                </Stack>
              </SpecimenSurface>
            </Box>
          </CardContent>
        </Card>
      </Section>

      <Section
        eyebrow='Specimens'
        title='Dónde usarlo'
        description='El beam no reemplaza loaders, sidecars ni `NexaGlowBorder`; es un acento perimetral reutilizable para superficies que ya tienen estructura propia.'
      >
        <Box
          data-capture='border-beam-specimen-grid'
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 3 }}
        >
          <SpecimenSurface dataCapture='border-beam-button-card' kind='promptDock' variant='interactive' active>
            <Stack spacing={2} sx={{ p: 4, minBlockSize: 220, justifyContent: 'center' }}>
              <Typography variant='h6'>Botón con Border Beam</Typography>
              <Typography variant='body2' color='text.secondary'>
                El caso directo del patrón: una acción primaria con línea de luz perimetral sin crear un botón paralelo.
              </Typography>
              <BeamButtonSpecimen />
            </Stack>
          </SpecimenSurface>

          <NexaSpectrumGlowBoxSpecimen />

          <NexaSpectrumGlowBoxSpecimen
            dataCapture='border-beam-nexa-brand-spectrum-box'
            palette='nexa'
            title='Nexa glow box · brand spectrum'
            description='La misma variación de caja, pero restringida a la marca Nexa: midnight navy, core blue, electric teal y blanco.'
          />

          <NexaMessageComposerSpectrumSpecimen
            dataCapture='border-beam-nexa-message-composer-inactive'
            state='inactive'
            title='Nexa composer · inactive'
          />

          <NexaMessageComposerSpectrumSpecimen
            dataCapture='border-beam-nexa-message-composer-with-text'
            state='withText'
            title='Nexa composer · with text'
            defaultValue='Resume y sugiere un paso.'
          />

          <SpecimenSurface dataCapture='border-beam-prompt-dock' kind='promptDock' variant='interactive' active>
            <Stack spacing={2} sx={{ p: 4, minBlockSize: 220 }}>
              <Typography variant='h6'>Prompt contextual</Typography>
              <Typography variant='body2' color='text.secondary'>
                Señala que una entrada está lista para continuar la conversación dentro de la surface actual.
              </Typography>
              <Box
                sx={theme => ({
                  mt: 'auto',
                  p: 2,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  color: 'text.secondary',
                  typography: 'body2'
                })}
              >
                Pregúntale a Nexa sobre esta vista
              </Box>
            </Stack>
          </SpecimenSurface>

          <SpecimenSurface dataCapture='border-beam-evidence-peek' kind='evidencePeek' variant='interactive' active>
            <Stack spacing={2} sx={{ p: 4, minBlockSize: 220 }}>
              <Typography variant='h6'>Evidencia disponible</Typography>
              <Typography variant='body2' color='text.secondary'>
                Ideal para un peek anclado que necesita distinguirse sin convertirse en modal.
              </Typography>
              <Stack spacing={1} sx={{ mt: 'auto' }}>
                <Typography variant='caption' color='text.secondary'>
                  Fuentes verificadas
                </Typography>
                <LinearProgress variant='determinate' value={78} sx={{ borderRadius: 999 }} />
              </Stack>
            </Stack>
          </SpecimenSurface>

          <SpecimenSurface dataCapture='border-beam-progress' kind='asyncOperation' variant='progress' active>
            <Stack spacing={2} sx={{ p: 4, minBlockSize: 220 }}>
              <Typography variant='h6'>Operación en curso</Typography>
              <Typography variant='body2' color='text.secondary'>
                Para una acción corta donde el contexto permanece visible y el usuario no necesita una pantalla de carga.
              </Typography>
              <CustomChip label='Procesando' size='small' variant='tonal' color='info' round='true' sx={{ alignSelf: 'flex-start', mt: 'auto' }} />
            </Stack>
          </SpecimenSurface>
        </Box>
      </Section>

      <Section
        eyebrow='Rules'
        title='Hacer / evitar'
        description='La primitive mantiene la animación en el borde. La semántica, acciones y datos siguen viviendo en la surface que la consume.'
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 3 }}>
          <Card variant='outlined'>
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={1.5}>
                <Typography variant='h6'>Hacer</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Usarlo como overlay decorativo, con `position: relative`, `overflow: hidden` y radio estable en la surface host.
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Extender el resolver cuando aparece una intención nueva repetible.
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card variant='outlined'>
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={1.5}>
                <Typography variant='h6'>Evitar</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Pegar gradientes, keyframes o colores locales en una view.
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Usarlo como único indicador de estado; el texto, icono o progreso debe seguir existiendo.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Section>
    </Stack>
  )
}

export default BorderBeamLabView
