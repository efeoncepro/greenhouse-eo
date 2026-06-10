'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { motionCss } from '@/components/theme/motion-tokens'
import { typographyScale } from '@/components/theme/typography-tokens'
import {
  FLOATING_SURFACE_VARIANTS,
  GreenhouseButton,
  GreenhouseChip,
  GreenhouseFloatingSurface,
  getFloatingSurfaceVariantConfig,
  type GreenhouseFloatingSurfaceAnchorProps,
  type GreenhouseFloatingSurfaceVariant
} from '@/components/greenhouse/primitives'

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

const anchorButtonSx: SxProps<Theme> = (theme: Theme) => ({
  appearance: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight,
  px: DESIGN_SYSTEM_LAB_TOKENS.spacing.related,
  py: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight,
  borderRadius: `${theme.shape.customBorderRadius.sm}px`,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  color: theme.palette.text.secondary,
  ...typographyScale.labelMd,
  transition: theme.transitions.create(['color', 'border-color'], {
    duration: theme.transitions.duration.shortest,
    easing: motionCss.ease.emphasized
  }),
  '&:hover': { color: theme.palette.primary.main, borderColor: theme.palette.primary.main },
  '&[data-state="open"]': { color: theme.palette.primary.main, borderColor: theme.palette.primary.main },
  '&:focus-visible': {
    outline: `${DESIGN_SYSTEM_LAB_TOKENS.focus.outlineWidth}px solid ${theme.palette.primary.main}`,
    outlineOffset: DESIGN_SYSTEM_LAB_TOKENS.focus.outlineOffset
  },
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
})

interface VariantDemo {
  variant: GreenhouseFloatingSurfaceVariant
  icon: string
  triggerLabel: string
  description: string
  ariaLabel: string
  renderContent: () => ReactNode
}

const ContentTitle = ({ children }: { children: string }) => (
  <Typography variant='h6'>
    {children}
  </Typography>
)

const DEMOS: VariantDemo[] = [
  {
    variant: 'richTooltip',
    icon: 'tabler-help-circle',
    triggerLabel: 'OTD%',
    description: 'Hover/focus, read-only, sin focus trap. Role tooltip.',
    ariaLabel: 'Cómo se calcula OTD%',
    renderContent: () => (
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
        <ContentTitle>On-Time Delivery</ContentTitle>
        <Typography variant='caption' color='text.secondary'>
          Porcentaje de tareas entregadas dentro de su fecha justa, descontando bloqueos y
          extensiones acordadas con el cliente.
        </Typography>
      </Stack>
    )
  },
  {
    variant: 'actionMenu',
    icon: 'tabler-dots-vertical',
    triggerLabel: 'Acciones',
    description: 'Click, role menu, foco gestionado + retorno al anchor.',
    ariaLabel: 'Acciones de la fila',
    renderContent: () => (
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline}>
        {[
          { icon: 'tabler-edit', label: 'Editar' },
          { icon: 'tabler-copy', label: 'Duplicar' },
          { icon: 'tabler-archive', label: 'Archivar' }
        ].map(item => (
          <Box
            key={item.label}
            component='button'
            type='button'
            role='menuitem'
            sx={theme => ({
              appearance: 'none',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight,
              width: '100%',
              px: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight,
              py: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              color: theme.palette.text.primary,
              ...typographyScale.labelMd,
              textAlign: 'left',
              '&:hover': { backgroundColor: theme.palette.action.hover },
              '&:focus-visible': {
                outline: `${DESIGN_SYSTEM_LAB_TOKENS.focus.outlineWidth}px solid ${theme.palette.primary.main}`,
                outlineOffset: DESIGN_SYSTEM_LAB_TOKENS.focus.insetOutlineOffset
              }
            })}
          >
            <Box
              component='i'
              className={item.icon}
              aria-hidden='true'
              sx={{ fontSize: DESIGN_SYSTEM_LAB_TOKENS.icon.inline }}
            />
            <span>{item.label}</span>
          </Box>
        ))}
      </Stack>
    )
  },
  {
    variant: 'evidencePeek',
    icon: 'tabler-eye-search',
    triggerLabel: 'Ver evidencia',
    description: 'Click, role dialog. Source + freshness + open-deeper.',
    ariaLabel: 'Detalle de evidencia',
    renderContent: () => (
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.related}>
        <ContentTitle>Trazabilidad del costo</ContentTitle>
        <Stack direction='row' spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight} useFlexGap flexWrap='wrap'>
          <GreenhouseChip size='small' tone='info' variant='label' label='Integración' kind='attribute' />
          <GreenhouseChip size='small' tone='success' variant='label' label='Verificado' kind='status' />
          <GreenhouseChip size='small' tone='success' variant='label' label='Reciente' kind='status' />
        </Stack>
        <Typography variant='caption' color='text.secondary'>
          Snapshot del 06/06/2026 · member_actual. Fuente conciliada con el último cierre.
        </Typography>
        <GreenhouseButton size='small' variant='text' leadingIcon={<i className='tabler-external-link' />} sx={{ alignSelf: 'flex-start', px: 0 }}>
          Abrir en detalle
        </GreenhouseButton>
      </Stack>
    )
  },
  {
    variant: 'inlineEditor',
    icon: 'tabler-pencil',
    triggerLabel: 'Editar factor',
    description: 'Click, role dialog. Outside-press NO descarta (dirty seguro).',
    ariaLabel: 'Editar factor',
    renderContent: () => (
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.related}>
        <ContentTitle>Factor de margen</ContentTitle>
        <Box
          component='input'
          aria-label='Factor'
          defaultValue='1,30'
          sx={theme => ({
            px: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight,
            py: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight,
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            border: `1px solid ${theme.palette.divider}`,
            ...typographyScale.numericId
          })}
        />
        <Stack direction='row' spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight} justifyContent='flex-end'>
          <GreenhouseButton size='small' variant='text' tone='secondary'>
            Cancelar
          </GreenhouseButton>
          <GreenhouseButton size='small' variant='solid'>
            Aplicar
          </GreenhouseButton>
        </Stack>
      </Stack>
    )
  },
  {
    variant: 'validationBubble',
    icon: 'tabler-alert-triangle',
    triggerLabel: 'RUT',
    description: 'Hover/focus, role tooltip. Guía anclada al control.',
    ariaLabel: 'Validación del RUT',
    renderContent: () => (
      <Stack direction='row' spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight} alignItems='flex-start'>
        <Box
          component='i'
          className='tabler-info-circle'
          aria-hidden='true'
          sx={{ fontSize: DESIGN_SYSTEM_LAB_TOKENS.icon.inline, mt: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline }}
        />
        <Typography variant='caption' color='text.secondary'>
          Ingresa el RUT con dígito verificador, sin puntos. Ej: 12345678-9.
        </Typography>
      </Stack>
    )
  },
  {
    variant: 'commandPreview',
    icon: 'tabler-command',
    triggerLabel: 'Resultado',
    description: 'Hover/focus, role tooltip. Preview de un resultado de búsqueda.',
    ariaLabel: 'Vista previa del resultado',
    renderContent: () => (
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
        <ContentTitle>Grupo Berel</ContentTitle>
        <Typography variant='caption' color='text.secondary'>
          Cliente activo · MX · Onboarding completo. 3 espacios, 12 colaboradores.
        </Typography>
      </Stack>
    )
  }
]

const VariantDemoCard = ({ demo }: { demo: VariantDemo }) => {
  const config = getFloatingSurfaceVariantConfig(demo.variant)

  return (
    <Card
      variant='outlined'
      data-capture={`floating-surface-${demo.variant}`}
      sx={theme => ({
        borderColor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.subtleBorder),
        boxShadow:
          theme.palette.mode === 'dark'
            ? 'none'
            : `0 ${DESIGN_SYSTEM_LAB_TOKENS.shadow.cardOffsetY}px ${DESIGN_SYSTEM_LAB_TOKENS.shadow.cardBlur}px ${alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.elevatedShadow)}`
      })}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup }}>
        <Stack direction='row' spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight} alignItems='center'>
          <Box
            aria-hidden='true'
            sx={theme => ({
              width: DESIGN_SYSTEM_LAB_TOKENS.icon.badgeContainer,
              height: DESIGN_SYSTEM_LAB_TOKENS.icon.badgeContainer,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              color: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, DESIGN_SYSTEM_LAB_TOKENS.opacity.softAccentSurface),
              '& > i': { fontSize: DESIGN_SYSTEM_LAB_TOKENS.icon.badge }
            })}
          >
            <i className={demo.icon} />
          </Box>
          <Typography variant='h6'>
            {demo.variant}
          </Typography>
        </Stack>

        <Typography variant='caption' color='text.secondary'>
          {demo.description}
        </Typography>

        <Stack direction='row' spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline} useFlexGap flexWrap='wrap'>
          <GreenhouseChip size='small' variant='label' tone='primary' label={`role: ${config.role}`} kind='attribute' />
          <GreenhouseChip size='small' variant='label' tone='info' label={config.interaction} kind='attribute' />
          <GreenhouseChip size='small' variant='label' tone='secondary' label={`motion: ${config.motion}`} kind='attribute' />
          {config.focusManaged ? (
            <GreenhouseChip size='small' variant='label' tone='success' label='focus managed' kind='status' />
          ) : null}
        </Stack>

        <Divider flexItem />

        <Box sx={{ pt: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline }}>
          <GreenhouseFloatingSurface
            variant={demo.variant}
            ariaLabel={demo.ariaLabel}
            dataCapture={`fs-surface-${demo.variant}`}
            anchor={(anchorProps: GreenhouseFloatingSurfaceAnchorProps) => (
              <Box component='button' type='button' id={`fs-anchor-${demo.variant}`} {...anchorProps} sx={anchorButtonSx}>
                <Box
                  component='i'
                  className={demo.icon}
                  aria-hidden='true'
                  sx={{ fontSize: DESIGN_SYSTEM_LAB_TOKENS.icon.inline }}
                />
                <span>{demo.triggerLabel}</span>
              </Box>
            )}
            content={() => demo.renderContent()}
          />
        </Box>
      </CardContent>
    </Card>
  )
}

const FloatingSurfaceLabView = () => (
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
        Floating Surfaces Lab
      </Typography>
      <Typography variant='h4'>
        Greenhouse Floating Surface
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}>
        Primitive canónica para UI contextual anclada sobre <InlineCode>@floating-ui/react</InlineCode>. Centraliza
        positioning, foco, dismissal, role, motion y hooks GVC detrás de una capa Greenhouse — los views de producto
        consumen la primitive en lugar de importar el engine. Complementa <InlineCode>AdaptiveSidecar</InlineCode>; no
        reemplaza drawers full-height ni diálogos destructivos.
      </Typography>
    </Stack>

    <Box
      data-capture='floating-surface-lab-grid'
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
        gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap,
        alignItems: 'start'
      }}
    >
      {DEMOS.map(demo => (
        <VariantDemoCard key={demo.variant} demo={demo} />
      ))}
    </Box>

    <Typography variant='caption' color='text.secondary'>
      Variants oficiales V1: {FLOATING_SURFACE_VARIANTS.join(' · ')}. ADR
      GREENHOUSE_FLOATING_SURFACE_DECISION_V1.
    </Typography>
  </Box>
)

export default FloatingSurfaceLabView
