'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import {
  GreenhouseAnchoredDisclosure,
  GreenhouseDisclosureTrigger,
  GreenhouseButton,
  DISCLOSURE_TRIGGER_VARIANT_CONFIG,
  ANCHORED_DISCLOSURE_VARIANT_CONFIG,
  type GreenhouseDisclosureTriggerVariant
} from '@/components/greenhouse/primitives'

const TRIGGER_VARIANTS = Object.values(DISCLOSURE_TRIGGER_VARIANT_CONFIG)
const ANCHORED_VARIANTS = Object.values(ANCHORED_DISCLOSURE_VARIANT_CONFIG)

const SectionCard = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <Card variant='outlined' sx={{ borderRadius: theme => `${theme.shape.customBorderRadius.lg}px` }}>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant='h5' sx={{ mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      </Box>
      {children}
    </CardContent>
  </Card>
)

const SpecimenLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
    {children}
  </Typography>
)

const InteractiveTrigger = ({ variant }: { variant: GreenhouseDisclosureTriggerVariant }) => {
  const [open, setOpen] = useState(false)

  return (
    <GreenhouseDisclosureTrigger
      variant={variant}
      open={open}
      onClick={() => setOpen(prev => !prev)}
      ariaLabel={`Alternar ${variant}`}
    />
  )
}

const SampleEditorContent = ({ onClose }: { onClose: () => void }) => (
  <Stack spacing={3} sx={{ p: 4 }}>
    <Typography variant='overline' sx={{ color: 'text.secondary', letterSpacing: '0.06em' }}>
      Editor contextual
    </Typography>
    <CustomTextField fullWidth placeholder='Escribe un valor…' />
    <Stack direction='row' spacing={2} justifyContent='flex-end'>
      <GreenhouseButton variant='outlined' onClick={onClose}>
        Cancelar
      </GreenhouseButton>
      <GreenhouseButton onClick={onClose}>Guardar</GreenhouseButton>
    </Stack>
  </Stack>
)

/**
 * DisclosureLabView — internal Lab for GreenhouseDisclosureTrigger (rotating "+" atom) +
 * GreenhouseAnchoredDisclosure (trigger + anchored surface). TASK-1072.
 */
const DisclosureLabView = () => (
  <Stack spacing={6} data-capture='disclosure-lab' sx={{ maxInlineSize: 1100, mx: 'auto' }}>
    <Box>
      <Typography variant='h4' sx={{ mb: 1 }}>
        Disclosure — trigger rotatorio + anchored disclosure
      </Typography>
      <Typography variant='body2' sx={{ color: 'text.secondary' }}>
        El <strong>“+” rotatorio</strong> que señala abierto/cerrado, y el patrón que lo ancla a una superficie flotante
        para desplegar UI contextual en el lugar. Dos primitives con variants y kinds; la rotación es el único motion
        (tokenizada + reduced-motion horneado), todo desde tokens del tema.
      </Typography>
    </Box>

    <SectionCard
      title='GreenhouseDisclosureTrigger'
      subtitle='Átomo: botón icono que rota para señalar estado. Usable solo (acordeón, alternar) o como ancla de un disclosure.'
    >
      <Box data-capture='disclosure-trigger-specimens'>
        <Box
          sx={{
            display: 'grid',
            gap: 5,
            gridTemplateColumns: { xs: 'repeat(2, max-content)', sm: 'repeat(4, max-content)' }
          }}
        >
          {TRIGGER_VARIANTS.map(config => (
            <Stack key={`${config.variant}-closed`} spacing={2} alignItems='center'>
              <SpecimenLabel>{config.variant} · cerrado</SpecimenLabel>
              <GreenhouseDisclosureTrigger variant={config.variant} open={false} ariaLabel={`${config.variant} cerrado`} />
            </Stack>
          ))}
          {TRIGGER_VARIANTS.map(config => (
            <Stack key={`${config.variant}-open`} spacing={2} alignItems='center'>
              <SpecimenLabel>
                {config.variant} · abierto ({config.openRotationDeg}°)
              </SpecimenLabel>
              <GreenhouseDisclosureTrigger variant={config.variant} open ariaLabel={`${config.variant} abierto`} />
            </Stack>
          ))}
        </Box>
        <Divider sx={{ my: 4 }} />
        <Stack direction='row' spacing={3} alignItems='center'>
          <SpecimenLabel>Interactivo (click)</SpecimenLabel>
          {TRIGGER_VARIANTS.map(config => (
            <InteractiveTrigger key={`int-${config.variant}`} variant={config.variant} />
          ))}
        </Stack>
      </Box>
    </SectionCard>

    <SectionCard
      title='GreenhouseAnchoredDisclosure'
      subtitle='Higher-order primitive: compone el trigger + GreenhouseFloatingSurface + un companion opcional a la derecha. No forkea FloatingSurface.'
    >
      <Box data-capture='anchored-disclosure-specimen' sx={{ minBlockSize: 360 }}>
        <Stack direction='row' spacing={6} flexWrap='wrap' useFlexGap>
          <Stack spacing={2}>
            <SpecimenLabel>contextualEditor · abierto · con companion</SpecimenLabel>
            <GreenhouseAnchoredDisclosure
              variant='contextualEditor'
              triggerAriaLabel='Abrir editor'
              surfaceWidth={320}
              defaultOpen
              companion={<GreenhouseButton variant='outlined'>Acción</GreenhouseButton>}
              content={({ close }) => <SampleEditorContent onClose={close} />}
            />
          </Stack>
          <Stack spacing={2}>
            <SpecimenLabel>actionMenu · interactivo</SpecimenLabel>
            <GreenhouseAnchoredDisclosure
              variant='actionMenu'
              triggerAriaLabel='Abrir menú'
              content={() => (
                <Stack sx={{ p: 2 }}>
                  <GreenhouseButton variant='text'>Editar</GreenhouseButton>
                  <GreenhouseButton variant='text'>Duplicar</GreenhouseButton>
                  <GreenhouseButton variant='text' tone='error'>
                    Eliminar
                  </GreenhouseButton>
                </Stack>
              )}
            />
          </Stack>
        </Stack>
      </Box>
    </SectionCard>

    <SectionCard title='Variants & Kinds' subtitle='Contrato canónico. Variants = comportamiento; kinds = uso semántico que resuelve a una variant.'>
      <Stack spacing={4}>
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 1.5 }}>
            DisclosureTrigger
          </Typography>
          <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
            {TRIGGER_VARIANTS.map(c => (
              <CustomChip key={c.variant} label={`${c.variant} · ${c.openRotationDeg}°`} size='small' variant='tonal' round='true' />
            ))}
          </Stack>
          <Typography variant='caption' sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
            kinds: linkResource·addEntry → addToggle · expandSection·showFilters → expand · moreActions → reveal
          </Typography>
        </Box>
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 1.5 }}>
            AnchoredDisclosure
          </Typography>
          <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
            {ANCHORED_VARIANTS.map(c => (
              <CustomChip
                key={c.variant}
                label={`${c.variant} → ${c.floatingSurfaceVariant} + ${c.triggerVariant}`}
                size='small'
                variant='tonal'
                color='info'
                round='true'
              />
            ))}
          </Stack>
          <Typography variant='caption' sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
            kinds: figmaNodeLink → contextualEditor · quickAdd·contextualOptions → actionMenu · evidence → quickPeek
          </Typography>
        </Box>
      </Stack>
    </SectionCard>

    <SectionCard title='Reglas' subtitle='Cómo y cuándo usar estas primitives.'>
      <Stack component='ul' spacing={1.5} sx={{ pl: 4, m: 0, '& li': { color: 'text.secondary' } }}>
        <li>
          <strong>a11y horneado:</strong> el trigger es icon-only → <code>ariaLabel</code> obligatorio + <code>aria-expanded</code>;
          la superficie hereda role/foco/dismiss de GreenhouseFloatingSurface.
        </li>
        <li>
          <strong>Motion tokenizado:</strong> la rotación es el único motion, vía <code>theme.transitions</code> + reduced-motion
          horneado. No animar otra cosa en el trigger.
        </li>
        <li>
          <strong>Cero hardcode:</strong> bordes/hover/colores desde tokens del tema; nada de HEX/px crudos.
        </li>
        <li>
          <strong>Composición, no fork:</strong> AnchoredDisclosure compone FloatingSurface; para una superficie nueva, agregar
          una variant que resuelva a un par (surface + trigger), no un componente paralelo.
        </li>
        <li>
          <strong>Companion:</strong> el slot a la derecha es para una acción acompañante (ej. un botón de “abrir” el recurso),
          no para meter el contenido del disclosure.
        </li>
      </Stack>
    </SectionCard>
  </Stack>
)

export default DisclosureLabView
