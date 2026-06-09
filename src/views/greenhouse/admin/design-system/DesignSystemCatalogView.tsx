'use client'

import { useMemo, useRef, useState } from 'react'

import Link from 'next/link'

import { alpha } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { MOTION_DURATION_S, Motion, useGreenhouseGSAP } from '@/components/greenhouse/motion'
import { GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

type CatalogCategory = 'Foundations' | 'Primitives' | 'Patterns' | 'Governance'
type CatalogKind = 'Token' | 'Primitive' | 'Pattern' | 'Lab'
type CatalogStatus = 'Canonical' | 'Hardening' | 'Planned'
type CategoryFilter = CatalogCategory | 'Todos'

interface CatalogItem {
  id: string
  title: string
  description: string
  route: string
  category: CatalogCategory
  kind: CatalogKind
  status: CatalogStatus
  owner: string
  tags: string[]
  icon: string
}

const CATEGORY_FILTERS: CategoryFilter[] = ['Todos', 'Foundations', 'Primitives', 'Patterns', 'Governance']
const KIND_FILTERS: CatalogKind[] = ['Token', 'Primitive', 'Pattern', 'Lab']

const CATEGORY_LABELS = {
  Todos: 'Todo el sistema',
  Foundations: 'Foundations',
  Primitives: 'Primitives',
  Patterns: 'Patrones',
  Governance: 'Governance'
} as const satisfies Record<CategoryFilter, string>

const KIND_LABELS = {
  Token: 'Token',
  Primitive: 'Primitive',
  Pattern: 'Pattern',
  Lab: 'Lab'
} as const satisfies Record<CatalogKind, string>

const STATUS_LABELS = {
  Canonical: 'Canónico',
  Hardening: 'Hardening',
  Planned: 'Planificado'
} as const satisfies Record<CatalogStatus, string>

const AXIS_WORDMARK_ASSET_COLORS = {
  // Brand asset colors from public/branding/axis-full-color.svg. These are not semantic UI warning/primary tokens.
  ink: 'rgb(2 60 112)',
  accent: 'rgb(255 101 0)'
} as const

const CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'colors',
    title: 'Color AXIS',
    description: 'Usa esta entrada cuando necesites rampas, opacidades, contraste o neutrales del sistema.',
    route: '/admin/design-system/colors',
    category: 'Foundations',
    kind: 'Token',
    status: 'Canonical',
    owner: '@core/theme/axis-tokens.ts',
    tags: ['axis', 'palette', 'contrast'],
    icon: 'tabler-palette'
  },
  {
    id: 'typography',
    title: 'Tipografía',
    description: 'Revisa jerarquía, familias y frontera Poppins/Geist antes de tocar copy visible.',
    route: '/admin/design-system/typography',
    category: 'Foundations',
    kind: 'Token',
    status: 'Canonical',
    owner: 'theme typography tokens',
    tags: ['type', 'roles', 'accessibility'],
    icon: 'tabler-typography'
  },
  {
    id: 'geometry',
    title: 'Geometry',
    description: 'Consulta spacing, radius y extensiones xxl/display para superficies amplias.',
    route: '/admin/design-system/geometry',
    category: 'Foundations',
    kind: 'Token',
    status: 'Canonical',
    owner: 'theme.shape.customBorderRadius',
    tags: ['spacing', 'radius', 'layout'],
    icon: 'tabler-dimensions'
  },
  {
    id: 'elevation',
    title: 'Elevation',
    description: 'Elige roles de sombra por uso: raised, floating, overlay, modal u overflow.',
    route: '/admin/design-system/elevation',
    category: 'Foundations',
    kind: 'Token',
    status: 'Canonical',
    owner: 'theme.greenhouseElevation',
    tags: ['shadow', 'surface', 'forced-colors'],
    icon: 'tabler-stack-2'
  },
  {
    id: 'buttons',
    title: 'Buttons',
    description: 'Primitive para jerarquía de comandos, tono, iconos y estados async.',
    route: '/admin/design-system/buttons',
    category: 'Primitives',
    kind: 'Primitive',
    status: 'Canonical',
    owner: 'GreenhouseButton',
    tags: ['action', 'command', 'async'],
    icon: 'tabler-square-rounded-letter-b'
  },
  {
    id: 'chips',
    title: 'Chips',
    description: 'Primitive para estados compactos, atributos, identidad, filtros y entradas removibles.',
    route: '/admin/design-system/chips',
    category: 'Primitives',
    kind: 'Primitive',
    status: 'Canonical',
    owner: 'GreenhouseChip',
    tags: ['status', 'metadata', 'filter'],
    icon: 'tabler-badge'
  },
  {
    id: 'feedback-atoms',
    title: 'Feedback atoms',
    description: 'KPI delta inline (signo+flecha+color AA) y status dot (dot+label). Color nunca solo; consumen theme.greenhouseSemantic.',
    route: '/admin/design-system/chips',
    category: 'Primitives',
    kind: 'Primitive',
    status: 'Canonical',
    owner: 'GreenhouseKpiDelta · GreenhouseStatusDot',
    tags: ['kpi', 'delta', 'status', 'dot'],
    icon: 'tabler-activity-heartbeat'
  },
  {
    id: 'nexa-brand',
    title: 'Nexa brand mark',
    description: 'Primitive para el isotipo de Nexa, badge conversacional y kinds de marca.',
    route: '/admin/design-system/nexa-brand',
    category: 'Primitives',
    kind: 'Primitive',
    status: 'Canonical',
    owner: 'GreenhouseNexaBrandMark',
    tags: ['nexa', 'brand', 'assistant'],
    icon: 'tabler-sparkles'
  },
  {
    id: 'talent-profile',
    title: 'Talent profile',
    description: 'Dossier enterprise, badge Verificado por Efeonce y kind Talento verificado para perfiles verificables.',
    route: '/admin/design-system/talent-profile',
    category: 'Primitives',
    kind: 'Primitive',
    status: 'Canonical',
    owner: 'GreenhouseTalentProfileDossier · GreenhouseVerificationBadge',
    tags: ['talent', 'profile', 'verification', 'dossier'],
    icon: 'tabler-id-badge-2'
  },
  {
    id: 'floating-surfaces',
    title: 'Floating surfaces',
    description: 'Usa esto para popovers, menus, peeks de evidencia e inline editors anclados.',
    route: '/admin/design-system/floating-surfaces',
    category: 'Primitives',
    kind: 'Primitive',
    status: 'Canonical',
    owner: 'GreenhouseFloatingSurface',
    tags: ['popover', 'menu', 'positioning'],
    icon: 'tabler-layout-navbar-expand'
  },
  {
    id: 'loaders',
    title: 'Loading surfaces',
    description: 'Estados de carga nombrados para documentos, acciones seguras, handoffs y conciliación.',
    route: '/admin/design-system/loaders',
    category: 'Primitives',
    kind: 'Primitive',
    status: 'Canonical',
    owner: 'GreenhouseLoadingSurface',
    tags: ['loading', 'state', 'progress'],
    icon: 'tabler-loader-2'
  },
  {
    id: 'charts',
    title: 'Charts',
    description: 'Chart cards enterprise, Funnel Analysis Pattern, fallback accesible y geometría gobernada.',
    route: '/admin/design-system/charts',
    category: 'Primitives',
    kind: 'Primitive',
    status: 'Canonical',
    owner: 'GreenhouseChartCard · GreenhouseFunnelChartCard',
    tags: ['data', 'visualization', 'kpi', 'funnel', 'pattern'],
    icon: 'tabler-chart-bar'
  },
  {
    id: 'funnel-analysis-pattern',
    title: 'Funnel Analysis Pattern',
    description: 'Patrón para leer etapas, caídas, SLA, bloqueos y asistencia Nexa en una composición gobernada.',
    route: '/admin/design-system/charts',
    category: 'Patterns',
    kind: 'Pattern',
    status: 'Canonical',
    owner: 'GreenhouseFunnelChartCard',
    tags: ['funnel', 'analysis', 'operations', 'nexa'],
    icon: 'tabler-filter-cog'
  },
  {
    id: 'utilities',
    title: 'Utilities',
    description: 'Timelines y utilities para auditoría, handoff y trazas de documentos.',
    route: '/admin/design-system/utilities',
    category: 'Primitives',
    kind: 'Primitive',
    status: 'Canonical',
    owner: 'GreenhouseActivityTimeline',
    tags: ['timeline', 'activity', 'audit'],
    icon: 'tabler-list-details'
  },
  {
    id: 'motion',
    title: 'Motion',
    description: 'Primitive gobernada para entrance, stagger, scroll reveal y timelines GSAP.',
    route: '/admin/design-system/motion',
    category: 'Patterns',
    kind: 'Pattern',
    status: 'Canonical',
    owner: 'Motion / useGreenhouseGSAP',
    tags: ['gsap', 'reduced-motion', 'animation'],
    icon: 'tabler-wand'
  },
  {
    id: 'microinteractions',
    title: 'Microinteractions',
    description: 'Thinking beats, feedback de comandos, validación, procedencia, decisiones inline y evidencia.',
    route: '/admin/design-system/microinteractions',
    category: 'Patterns',
    kind: 'Pattern',
    status: 'Canonical',
    owner: 'microinteraction primitives',
    tags: ['feedback', 'thinking', 'validation', 'decision'],
    icon: 'tabler-click'
  },
  {
    id: 'catalog',
    title: 'Catalog index',
    description: 'Home canónica para encontrar tokens, primitives, patrones y labs internos.',
    route: '/admin/design-system',
    category: 'Governance',
    kind: 'Pattern',
    status: 'Canonical',
    owner: 'DesignSystemCatalogView',
    tags: ['navigation', 'catalog', 'governance'],
    icon: 'tabler-layout-list'
  }
]

const statusTone = (status: CatalogStatus) => {
  if (status === 'Canonical') return 'success'
  if (status === 'Hardening') return 'warning'

  return 'default'
}

const kindTone = (kind: CatalogKind) => {
  if (kind === 'Token') return 'primary'
  if (kind === 'Primitive') return 'secondary'
  if (kind === 'Pattern') return 'info'
  if (kind === 'Lab') return 'warning'

  return 'default'
}

const normalize = (value: string) => value.toLocaleLowerCase('es-CL')

const AxisInteractiveWordmark = () => {
  const scopeRef = useRef<SVGSVGElement | null>(null)
  const dotMotionRef = useRef<() => void>(() => undefined)

  useGreenhouseGSAP(
    ctx => {
      const dot = scopeRef.current?.querySelector('.gh-axis-dot')

      if (!dot) return

      ctx.gsap.set(dot, {
        transformBox: 'fill-box',
        transformOrigin: '50% 50%',
        y: 0,
        scaleX: 1,
        scaleY: 1
      })

      const timeline = ctx.gsap.timeline({
        paused: true,
        defaults: {
          overwrite: 'auto'
        }
      })

      if (ctx.reduced) {
        timeline.set(dot, { y: 0, scaleX: 1, scaleY: 1 })
      } else {
        timeline
          .to(dot, {
            y: 2,
            scaleX: 1.035,
            scaleY: 0.965,
            duration: MOTION_DURATION_S.instant,
            ease: 'power1.out'
          })
          .to(dot, {
            y: -22,
            scaleX: 0.975,
            scaleY: 1.045,
            duration: MOTION_DURATION_S.short,
            ease: 'power2.out'
          })
          .to(dot, {
            y: 0,
            scaleX: 1,
            scaleY: 1,
            duration: MOTION_DURATION_S.standard,
            ease: 'back.out(1.25)'
          })
      }

      dotMotionRef.current = () => {
        timeline.restart()
      }
    },
    { scope: scopeRef }
  )

  const replayDotMotion = () => dotMotionRef.current()

  return (
    <Box
      component='svg'
      data-capture='axis-interactive-wordmark'
      ref={scopeRef}
      role='img'
      tabIndex={0}
      aria-label='AXIS Design System'
      viewBox='0 0 813.21 501.78'
      onMouseEnter={replayDotMotion}
      onFocus={replayDotMotion}
      sx={{
        display: 'block',
        inlineSize: { xs: 124, md: 204 },
        blockSize: 'auto',
        overflow: 'visible',
        outline: 'none',
        '& .gh-axis-fill-ink': {
          fill: AXIS_WORDMARK_ASSET_COLORS.ink
        },
        '& .gh-axis-fill-accent': {
          fill: AXIS_WORDMARK_ASSET_COLORS.accent
        },
        '& .gh-axis-dot': {
          transformBox: 'fill-box',
          transformOrigin: 'center'
        }
      }}
    >
      <g>
        <polygon
          className='gh-axis-fill-accent'
          points='416.9 223 415.33 223 413.62 223 413.62 225.36 415.33 225.36 415.33 498.36 501.91 498.36 501.91 223 416.9 223'
        />
        <path
          className='gh-axis-fill-ink'
          d='M498.12,498.37l-46.38-62.01-34.66,62.01h-119.13l92.28-145.01-97.16-130.36h121.08l46.38,62.49,35.15-62.49h119.13l-95.21,141.59,99.6,133.78h-121.08Z'
        />
        <circle className='gh-axis-fill-accent gh-axis-dot' cx='455.82' cy='100.83' r='100.83' />
        <path
          className='gh-axis-fill-ink'
          d='M14.89,285.25c9.93-21.32,23.51-37.59,40.77-48.82,17.25-11.23,36.62-16.84,58.1-16.84,17.9,0,33.36,3.66,46.38,10.99,13.01,7.32,22.95,17.33,29.78,30.03v-37.59h107.9v275.37h-107.9v-37.59c-6.84,12.69-16.77,22.7-29.78,30.03-13.02,7.32-28.49,10.99-46.38,10.99-21.48,0-40.85-5.61-58.1-16.84-17.26-11.23-30.84-27.5-40.77-48.82-9.93-21.31-14.89-46.46-14.89-75.43s4.96-54.11,14.89-75.43ZM178.7,326.51c-7.49-8.13-17.09-12.21-28.81-12.21s-21.32,4.07-28.81,12.21c-7.49,8.14-11.23,19.53-11.23,34.18s3.74,26.05,11.23,34.18c7.48,8.14,17.09,12.21,28.81,12.21s21.31-4.07,28.81-12.21c7.48-8.13,11.23-19.53,11.23-34.18s-3.75-26.04-11.23-34.18Z'
        />
        <path
          className='gh-axis-fill-ink'
          d='M626.46,489.09c-20.02-8.46-35.89-20.18-47.6-35.15-11.72-14.97-18.39-31.9-20.02-50.78h103.99c1.3,8.14,4.8,14.16,10.5,18.07,5.69,3.91,12.94,5.86,21.73,5.86,5.53,0,9.93-1.22,13.18-3.66,3.25-2.44,4.88-5.45,4.88-9.03,0-6.18-3.42-10.57-10.25-13.18-6.84-2.6-18.39-5.53-34.66-8.79-19.86-3.91-36.21-8.13-49.07-12.69-12.86-4.56-24.09-12.37-33.69-23.44-9.61-11.06-14.4-26.36-14.4-45.89,0-16.92,4.47-32.3,13.43-46.14,8.95-13.83,22.22-24.73,39.79-32.71,17.58-7.97,38.89-11.96,63.96-11.96,37.11,0,66.16,9.12,87.15,27.34,20.99,18.23,33.6,41.99,37.84,71.28h-96.18c-1.63-7.48-5.05-13.26-10.25-17.33-5.21-4.07-12.21-6.1-20.99-6.1-5.54,0-9.76,1.06-12.69,3.17-2.93,2.12-4.39,5.29-4.39,9.52,0,5.54,3.42,9.69,10.25,12.45,6.83,2.77,17.74,5.61,32.71,8.54,19.85,3.91,36.62,8.3,50.29,13.18,13.67,4.88,25.55,13.27,35.64,25.14,10.08,11.88,15.13,28.24,15.13,49.07,0,16.28-4.72,30.93-14.16,43.94-9.44,13.02-23.03,23.28-40.77,30.76-17.74,7.49-38.49,11.23-62.25,11.23-26.04,0-49.07-4.23-69.09-12.69Z'
        />
      </g>
    </Box>
  )
}

const DesignSystemCatalogView = () => {
  const [category, setCategory] = useState<CategoryFilter>('Todos')
  const [kind, setKind] = useState<CatalogKind | 'Todos'>('Todos')
  const [query, setQuery] = useState('')

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalize(query.trim())

    return CATALOG_ITEMS.filter(item => {
      const matchesCategory = category === 'Todos' || item.category === category
      const matchesKind = kind === 'Todos' || item.kind === kind
      const haystack = normalize([item.title, item.description, item.owner, ...item.tags].join(' '))
      const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery)

      return matchesCategory && matchesKind && matchesQuery
    })
  }, [category, kind, query])

  const categoryCounts = useMemo(
    () =>
      CATEGORY_FILTERS.map(filter => ({
        filter,
        count: filter === 'Todos' ? CATALOG_ITEMS.length : CATALOG_ITEMS.filter(item => item.category === filter).length
      })),
    []
  )

  const canonicalCount = CATALOG_ITEMS.filter(item => item.status === 'Canonical').length

  return (
    <Box
      data-capture='design-system-catalog'
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: DESIGN_SYSTEM_LAB_TOKENS.layout.sectionGap,
        maxWidth: 1280,
        mx: 'auto'
      }}
    >
      <Motion
        kind='heroIntro'
        duration='long'
        build={(ctx, timeline) => {
          timeline
            .set('.gh-axis-brand-accent', {
              transformOrigin: 'right center'
            })
            .from('.gh-axis-brand-logo', {
              autoAlpha: 0,
              x: ctx.reduced ? 0 : 28,
              scale: ctx.reduced ? 1 : 0.82,
              rotation: ctx.reduced ? 0 : -2
            })
            .from(
              '.gh-axis-brand-accent',
              {
                autoAlpha: 0,
                scaleX: ctx.reduced ? 1 : 0
              },
              '<0.18'
            )
            .from(
              '.gh-axis-brand-meta',
              {
                autoAlpha: 0,
                y: ctx.reduced ? 0 : 6
              },
              '<0.12'
            )
            .from(
              '.gh-catalog-copy',
              {
                autoAlpha: 0,
                y: ctx.reduced ? 0 : 10
              },
              '<0.08'
            )
            .from(
              '.gh-catalog-actions',
              {
                autoAlpha: 0,
                y: ctx.reduced ? 0 : 8
              },
              '<0.1'
            )
        }}
      >
        <Box
          sx={theme => ({
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(220px, 320px)' },
            gap: { xs: 3, md: 4 },
            alignItems: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: `${theme.shape.customBorderRadius.display}px`,
            p: { xs: 3, md: 4 },
            minBlockSize: { md: 188 },
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.background.paper, 0.94)} 46%, ${alpha(theme.palette.secondary.main, 0.08)})`
          })}
        >
          <Stack className='gh-catalog-copy' spacing={2.5}>
            <Stack spacing={1}>
              <Typography variant='overline' color='primary'>
                Catálogo interno
              </Typography>
              <Typography variant='h4'>Encuentra tokens y primitives AXIS</Typography>
              <Typography variant='body1' color='text.secondary' sx={{ maxWidth: '62ch' }}>
                Busca por contrato, token o primitive. Cada entrada indica qué usar, dónde vive y qué lab abrir antes de
                implementar.
              </Typography>
            </Stack>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              <GreenhouseChip label={`${CATALOG_ITEMS.length} entradas`} tone='primary' variant='label' kind='metric' />
              <GreenhouseChip label={`${canonicalCount} canónicas`} tone='success' variant='label' kind='status' />
              <GreenhouseChip label='Catálogo canónico' tone='info' variant='label' kind='status' />
            </Stack>
          </Stack>
          <Stack className='gh-axis-brand-lockup' spacing={2.5} alignItems='flex-end'>
            <Box
              className='gh-axis-brand-logo'
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                inlineSize: '100%'
              }}
            >
              <AxisInteractiveWordmark />
            </Box>
            <Stack className='gh-axis-brand-meta' spacing={1} alignItems='flex-end' sx={{ inlineSize: '100%' }}>
              <Box
                className='gh-axis-brand-accent'
                sx={theme => ({
                  inlineSize: { xs: 116, md: 172 },
                  blockSize: 4,
                  borderRadius: `${theme.shape.customBorderRadius.display}px`,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                })}
              />
              <Typography variant='button' color='text.secondary'>
                Design System
              </Typography>
            </Stack>
            <Stack className='gh-catalog-actions' direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <GreenhouseButton
                component={Link}
                href='/admin/design-system/colors'
                variant='label'
                kind='navigation'
                leadingIconClassName='tabler-arrow-left'
              >
                Ver color AXIS
              </GreenhouseButton>
              <GreenhouseButton
                component={Link}
                href='/admin/design-system/geometry'
                variant='outlined'
                kind='navigation'
                leadingIconClassName='tabler-dimensions'
              >
                Revisar geometry
              </GreenhouseButton>
            </Stack>
          </Stack>
        </Box>
      </Motion>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '280px minmax(0, 1fr)' },
          gap: 3,
          alignItems: 'start'
        }}
      >
        <Box
          sx={theme => ({
            position: { lg: 'sticky' },
            top: { lg: theme.spacing(3) },
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: `${theme.shape.customBorderRadius.xxl}px`,
            p: 2.5,
            backgroundColor: 'background.paper'
          })}
        >
          <Stack spacing={0.75}>
            <Typography variant='overline' color='primary'>
              Navegación
            </Typography>
            <Typography variant='h5'>Mapa del sistema</Typography>
            <Typography variant='body2' color='text.secondary'>
              Filtra por familia, tipo de entrada o búsqueda cuando ya sepas qué contrato necesitas.
            </Typography>
          </Stack>

          <Stack spacing={1}>
            {categoryCounts.map(({ filter, count }) => {
              const isActive = category === filter

              return (
                <GreenhouseButton
                  key={filter}
                  fullWidth
                  kind='filter'
                  tone={isActive ? 'primary' : 'secondary'}
                  variant={isActive ? 'solid' : 'label'}
                  size='small'
                  onClick={() => setCategory(filter)}
                  leadingIconClassName={filter === 'Todos' ? 'tabler-layout-grid' : 'tabler-folder'}
                  sx={{ justifyContent: 'space-between' }}
                >
                  {CATEGORY_LABELS[filter]} ({count})
                </GreenhouseButton>
              )
            })}
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Typography variant='overline' color='text.secondary'>
              Tipo de entrada
            </Typography>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              <GreenhouseChip
                label='Todos'
                tone={kind === 'Todos' ? 'primary' : 'default'}
                variant={kind === 'Todos' ? 'solid' : 'outlined'}
                kind='filter'
                onClick={() => setKind('Todos')}
              />
              {KIND_FILTERS.map(filter => (
                <GreenhouseChip
                  key={filter}
                  label={filter}
                  tone={kind === filter ? kindTone(filter) : 'default'}
                  variant={kind === filter ? 'solid' : 'outlined'}
                  kind='filter'
                  onClick={() => setKind(filter)}
                />
              ))}
            </Stack>
          </Stack>
        </Box>

        <Stack spacing={2.5}>
          <TextField
            fullWidth
            label='Buscar en AXIS'
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder='Ej. radius, buttons, motion, charts...'
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <i aria-hidden='true' className='tabler-search' />
                </InputAdornment>
              )
            }}
          />

          <Box
            sx={theme => ({
              display: 'grid',
              gridTemplateColumns: '1fr',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: `${theme.shape.customBorderRadius.xxl}px`,
              overflow: 'hidden',
              backgroundColor: 'background.paper'
            })}
          >
            <Box
              sx={{
                display: { xs: 'none', xl: 'grid' },
                gridTemplateColumns: 'minmax(360px, 1fr) minmax(260px, 0.54fr) 136px',
                columnGap: 3,
                alignItems: 'center',
                px: 3,
                py: 1.5,
                backgroundColor: 'action.hover',
                borderBlockEnd: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography variant='button' color='text.secondary'>
                Contrato
              </Typography>
              <Typography
                variant='button'
                color='text.secondary'
                sx={{ borderInlineStart: '1px solid', borderColor: 'divider', pl: 3 }}
              >
                SoT
              </Typography>
              <Typography variant='button' color='text.secondary'>
                Acción
              </Typography>
            </Box>

            {filteredItems.map((item, index) => (
              <Box
                key={item.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', xl: 'minmax(360px, 1fr) minmax(260px, 0.54fr) 136px' },
                  rowGap: { xs: 1.5, md: 2 },
                  columnGap: 3,
                  alignItems: { xs: 'start', xl: 'center' },
                  px: 3,
                  py: 2.5,
                  borderBlockStart: index === 0 ? 0 : '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Stack direction='row' spacing={1.5} alignItems='flex-start'>
                  <Box
                    sx={theme => ({
                      display: 'grid',
                      placeItems: 'center',
                      flex: '0 0 auto',
                      inlineSize: 40,
                      blockSize: 40,
                      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main'
                    })}
                  >
                    <i aria-hidden='true' className={item.icon} />
                  </Box>
                  <Stack spacing={1} sx={{ minWidth: 0 }}>
                    <Stack direction='row' spacing={0.75} flexWrap='wrap' useFlexGap>
                      <GreenhouseChip
                        label={KIND_LABELS[item.kind]}
                        tone={kindTone(item.kind)}
                        variant='label'
                        size='small'
                        kind='attribute'
                      />
                      <GreenhouseChip
                        label={STATUS_LABELS[item.status]}
                        tone={statusTone(item.status)}
                        variant='label'
                        size='small'
                        kind='status'
                      />
                      <GreenhouseChip
                        label={CATEGORY_LABELS[item.category]}
                        tone='default'
                        variant='outlined'
                        size='small'
                        kind='attribute'
                      />
                    </Stack>
                    <Stack spacing={0.5}>
                      <Typography variant='h6'>{item.title}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {item.description}
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>

                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{
                    overflowWrap: 'anywhere',
                    borderInlineStart: { xl: '1px solid' },
                    borderColor: 'divider',
                    pl: { xl: 3 }
                  }}
                >
                  <Box component='span' sx={{ display: { xl: 'none' }, color: 'text.primary' }}>
                    SoT:{' '}
                  </Box>
                  {item.owner}
                </Typography>
                <GreenhouseButton
                  component={Link}
                  href={item.route}
                  kind='navigation'
                  variant='label'
                  size='small'
                  trailingIconClassName='tabler-arrow-right'
                  sx={{ justifySelf: { xs: 'flex-start', xl: 'stretch' } }}
                >
                  Abrir
                </GreenhouseButton>
              </Box>
            ))}

            {filteredItems.length === 0 ? (
              <Box sx={{ px: 3, py: 5 }}>
                <Stack spacing={1} alignItems='flex-start'>
                  <GreenhouseChip label='Sin resultados' tone='warning' variant='label' kind='status' />
                  <Typography variant='h5'>No hay contratos para ese filtro</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Prueba con el nombre del token, primitive o lab. También puedes volver a Todo el sistema.
                  </Typography>
                </Stack>
              </Box>
            ) : null}
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}

export default DesignSystemCatalogView
