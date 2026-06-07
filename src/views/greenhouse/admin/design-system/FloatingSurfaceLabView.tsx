'use client'

import type { ReactNode } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import {
  FLOATING_SURFACE_VARIANTS,
  GreenhouseFloatingSurface,
  getFloatingSurfaceVariantConfig,
  type GreenhouseFloatingSurfaceAnchorProps,
  type GreenhouseFloatingSurfaceVariant
} from '@/components/greenhouse/primitives'

const DESIGN_SYSTEM_ROUTE = '/admin/design-system'

const InlineCode = ({ children }: { children: string }) => (
  <Box
    component='span'
    sx={theme => ({
      px: 0.65,
      py: 0.15,
      borderRadius: 0.75,
      color: theme.palette.text.primary,
      backgroundColor: alpha(theme.palette.text.primary, 0.055),
      fontSize: '0.78em',
      fontWeight: 700,
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
  gap: 0.75,
  px: 1.25,
  py: 0.75,
  borderRadius: `${theme.shape.customBorderRadius.sm}px`,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
  color: theme.palette.text.secondary,
  fontSize: theme.typography.body2.fontSize,
  fontFamily: theme.typography.fontFamily,
  fontWeight: 600,
  transition: theme.transitions.create(['color', 'border-color'], { duration: 150 }),
  '&:hover': { color: theme.palette.primary.main, borderColor: theme.palette.primary.main },
  '&[data-state="open"]': { color: theme.palette.primary.main, borderColor: theme.palette.primary.main },
  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
})

interface VariantDemo {
  variant: GreenhouseFloatingSurfaceVariant
  icon: string
  triggerLabel: string
  description: string
  ariaLabel: string
  width?: number
  renderContent: () => ReactNode
}

const ContentTitle = ({ children }: { children: string }) => (
  <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
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
      <Stack spacing={0.75}>
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
    width: 220,
    renderContent: () => (
      <Stack spacing={0.25}>
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
              gap: 1,
              width: '100%',
              px: 1,
              py: 0.75,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              color: theme.palette.text.primary,
              fontSize: theme.typography.body2.fontSize,
              fontFamily: theme.typography.fontFamily,
              textAlign: 'left',
              '&:hover': { backgroundColor: theme.palette.action.hover },
              '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 }
            })}
          >
            <i className={item.icon} aria-hidden='true' style={{ fontSize: 16 }} />
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
      <Stack spacing={1.25}>
        <ContentTitle>Trazabilidad del costo</ContentTitle>
        <Stack direction='row' spacing={0.75} useFlexGap flexWrap='wrap'>
          <Chip size='small' color='info' variant='tonal' label='Integración' />
          <Chip size='small' color='success' variant='tonal' label='Verificado' />
          <Chip size='small' color='success' variant='tonal' label='Reciente' />
        </Stack>
        <Typography variant='caption' color='text.secondary'>
          Snapshot del 06/06/2026 · member_actual. Fuente conciliada con el último cierre.
        </Typography>
        <Button size='small' variant='text' startIcon={<i className='tabler-external-link' />} sx={{ alignSelf: 'flex-start', px: 0 }}>
          Abrir en detalle
        </Button>
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
      <Stack spacing={1.25}>
        <ContentTitle>Factor de margen</ContentTitle>
        <Box
          component='input'
          aria-label='Factor'
          defaultValue='1,30'
          sx={theme => ({
            px: 1,
            py: 0.75,
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            border: `1px solid ${theme.palette.divider}`,
            fontFamily: theme.typography.fontFamily,
            fontVariantNumeric: 'tabular-nums'
          })}
        />
        <Stack direction='row' spacing={1} justifyContent='flex-end'>
          <Button size='small' variant='text' color='secondary'>
            Cancelar
          </Button>
          <Button size='small' variant='contained'>
            Aplicar
          </Button>
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
      <Stack direction='row' spacing={1} alignItems='flex-start'>
        <i className='tabler-info-circle' aria-hidden='true' style={{ fontSize: 16, marginTop: 2 }} />
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
      <Stack spacing={0.75}>
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
        borderColor: alpha(theme.palette.text.primary, 0.08),
        boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 18px 42px rgba(47, 43, 61, 0.06)'
      })}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Stack direction='row' spacing={1} alignItems='center'>
          <Box
            aria-hidden='true'
            sx={theme => ({
              width: 32,
              height: 32,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              color: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              '& > i': { fontSize: 18 }
            })}
          >
            <i className={demo.icon} />
          </Box>
          <Typography variant='subtitle2' sx={{ fontWeight: 800 }}>
            {demo.variant}
          </Typography>
        </Stack>

        <Typography variant='caption' color='text.secondary'>
          {demo.description}
        </Typography>

        <Stack direction='row' spacing={0.5} useFlexGap flexWrap='wrap'>
          <Chip size='small' variant='tonal' color='primary' label={`role: ${config.role}`} />
          <Chip size='small' variant='tonal' color='info' label={config.interaction} />
          {config.focusManaged ? (
            <Chip size='small' variant='tonal' color='success' label='focus managed' />
          ) : null}
        </Stack>

        <Divider flexItem />

        <Box sx={{ pt: 0.5 }}>
          <GreenhouseFloatingSurface
            variant={demo.variant}
            width={demo.width}
            ariaLabel={demo.ariaLabel}
            dataCapture={`fs-surface-${demo.variant}`}
            anchor={(anchorProps: GreenhouseFloatingSurfaceAnchorProps) => (
              <Box component='button' type='button' id={`fs-anchor-${demo.variant}`} {...anchorProps} sx={anchorButtonSx}>
                <i className={demo.icon} aria-hidden='true' style={{ fontSize: 16 }} />
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
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 1100, mx: 'auto' }}>
    <Stack spacing={1.5}>
      <Button
        component={Link}
        href={DESIGN_SYSTEM_ROUTE}
        variant='text'
        color='secondary'
        size='small'
        startIcon={<i className='tabler-arrow-left' />}
        sx={{ alignSelf: 'flex-start', px: 0 }}
      >
        Design System
      </Button>
      <AxisWordmark variant='auto' height={32} sx={{ mb: 0.5 }} />
      <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
        Floating Surfaces Lab
      </Typography>
      <Typography variant='h4' sx={{ fontWeight: 800 }}>
        Greenhouse Floating Surface
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
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
        gap: 4,
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
