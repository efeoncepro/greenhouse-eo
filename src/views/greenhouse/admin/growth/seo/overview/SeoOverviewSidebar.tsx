'use client'

import Link from 'next/link'

import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GreenhouseChip } from '@/components/greenhouse/primitives'
import { GH_GROWTH_SEO_OVERVIEW } from '@/lib/copy/growth'
import type {
  SeoAeoGapSummary,
  SeoHealthSummary,
  SeoMoversSummary,
  SeoOverviewSidebar as SeoOverviewSidebarData,
  SeoSidebarRegion
} from '@/lib/growth/seo/overview/read-overview-sidebar'

/**
 * TASK-1306 — sidebar del cockpit: salud (4a) · movers (4b) · cruce AEO (4c).
 *
 * Cada card resuelve su PROPIA degradación: la razón viaja desde el reader y se muestra
 * como "Pendiente: {razón}". Nunca un 0/100 de salud ni una lista vacía que se lea como
 * "no hay movimientos" cuando en realidad la consulta falló — son cosas distintas y el
 * operador toma decisiones distintas con cada una.
 */

interface Props {
  sidebar: SeoOverviewSidebarData
  spaceId: string | null
}

const PENDING_REASONS = GH_GROWTH_SEO_OVERVIEW.states.pendingReasons

/** Slot honesto: dice que falta Y por qué. Nunca un número inventado. */
const PendingSlot = ({ reason }: { reason: keyof typeof PENDING_REASONS }) => (
  <Typography variant='body2' color='text.secondary'>
    {GH_GROWTH_SEO_OVERVIEW.states.pendingReason.replace('{reason}', PENDING_REASONS[reason])}
  </Typography>
)

const SidebarCard = ({
  title,
  subtitle,
  dataCapture,
  children
}: {
  title: string
  subtitle?: string
  dataCapture?: string
  children: React.ReactNode
}) => (
  <Card data-capture={dataCapture}>
    <CardContent>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant='h6' component='h2'>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant='body2' color='text.secondary'>
              {subtitle}
            </Typography>
          ) : null}
        </Stack>
        {children}
      </Stack>
    </CardContent>
  </Card>
)

/**
 * Gauge de salud — arco SVG determinista, NO una librería de charts.
 *
 * Un radialBar de ApexCharts depende de medir su contenedor al montar; dentro de una
 * columna fluida medía 0 y el arco no se dibujaba (hueco en blanco, verificado en GVC).
 * Un solo número entre 0 y 100 no justifica esa fragilidad: el arco se calcula con
 * `strokeDasharray` sobre un path fijo, así que rinde igual en SSR, en el primer paint y
 * en la captura, sin depender del ancho disponible ni de un import dinámico.
 *
 * El color sigue el umbral de salud y va acompañado SIEMPRE del número — nunca es la
 * única señal (a11y).
 */
const SeoHealthGauge = ({ score }: { score: number }) => {
  const theme = useTheme()
  const rounded = Math.round(score)

  // Arco de 270° (de -135° a 135°): el hueco inferior evita que un score bajo se lea
  // como un círculo casi completo.
  const RADIUS = 54
  const ARC_LENGTH = 2 * Math.PI * RADIUS * 0.75
  const progress = (Math.min(100, Math.max(0, rounded)) / 100) * ARC_LENGTH

  const tone =
    rounded >= 80 ? theme.palette.success.main : rounded >= 50 ? theme.palette.warning.main : theme.palette.error.main

  return (
    <Box
      role='img'
      aria-label={GH_GROWTH_SEO_OVERVIEW.health.scoreAria.replace('{score}', String(rounded))}
      sx={{ display: 'flex', justifyContent: 'center' }}
    >
      <Box component='svg' viewBox='0 0 140 140' sx={{ inlineSize: 160, blockSize: 160 }} aria-hidden='true'>
        <circle
          cx='70'
          cy='70'
          r={RADIUS}
          fill='none'
          stroke={theme.palette.divider}
          strokeWidth='12'
          strokeLinecap='round'
          strokeDasharray={`${ARC_LENGTH} ${2 * Math.PI * RADIUS}`}
          transform='rotate(135 70 70)'
        />
        <circle
          cx='70'
          cy='70'
          r={RADIUS}
          fill='none'
          stroke={tone}
          strokeWidth='12'
          strokeLinecap='round'
          strokeDasharray={`${progress} ${2 * Math.PI * RADIUS}`}
          transform='rotate(135 70 70)'
        />
        <text
          x='70'
          y='78'
          textAnchor='middle'
          fill={theme.palette.text.primary}
          style={{ fontSize: '2rem', fontWeight: 600 }}
        >
          {rounded}
        </text>
      </Box>
    </Box>
  )
}

const HealthCard = ({ health }: { health: SeoSidebarRegion<SeoHealthSummary> }) => {
  return (
    <SidebarCard
      title={GH_GROWTH_SEO_OVERVIEW.health.title}
      subtitle={GH_GROWTH_SEO_OVERVIEW.health.subtitle}
      dataCapture='seo-overview-health'
    >
      {!health.ok ? (
        <PendingSlot reason={health.reason} />
      ) : (
        <Stack spacing={3}>
          {health.data.healthScore === null ? (
            // Puntaje no calculado ≠ puntaje cero. Un 0/100 leería como "sitio roto".
            <PendingSlot reason='no_data' />
          ) : (
            <SeoHealthGauge score={health.data.healthScore} />
          )}

          {/* Severidad con etiqueta + número: nunca sólo un color (a11y). */}
          <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
            <GreenhouseChip
              kind='status'
              size='small'
              label={`${GH_GROWTH_SEO_OVERVIEW.health.severity.critical}: ${health.data.totals.critical}`}
              tone='error'
            />
            <GreenhouseChip
              kind='status'
              size='small'
              label={`${GH_GROWTH_SEO_OVERVIEW.health.severity.warning}: ${health.data.totals.warning}`}
              tone='warning'
            />
            <GreenhouseChip
              kind='status'
              size='small'
              label={`${GH_GROWTH_SEO_OVERVIEW.health.severity.notice}: ${health.data.totals.notice}`}
            />
          </Stack>

          <Typography variant='caption' color='text.secondary'>
            {GH_GROWTH_SEO_OVERVIEW.health.lastRun.replace('{date}', health.data.captureDate)}
          </Typography>
        </Stack>
      )}
    </SidebarCard>
  )
}

const MoverRow = ({ mover }: { mover: SeoMoversSummary['gained'][number] }) => {
  const improved = mover.delta > 0
  const template = improved ? GH_GROWTH_SEO_OVERVIEW.movers.positionsUp : GH_GROWTH_SEO_OVERVIEW.movers.positionsDown

  const detail = template
    .replace('{n}', String(Math.abs(Math.round(mover.delta))))
    .replace('{from}', String(Math.round(mover.previous)))
    .replace('{to}', String(Math.round(mover.current)))

  return (
    <Stack direction='row' spacing={2} alignItems='flex-start' justifyContent='space-between'>
      <Stack spacing={0.5} sx={{ minInlineSize: 0 }}>
        <Typography variant='body2' sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
          {mover.keyword}
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          {detail}
        </Typography>
      </Stack>
      {/* Flecha + signo + color: la dirección nunca depende sólo del color. */}
      <GreenhouseChip
        kind='status'
        size='small'
        tone={improved ? 'success' : 'error'}
        label={`${improved ? '↑' : '↓'} ${Math.abs(Math.round(mover.delta))}`}
      />
    </Stack>
  )
}

const MoversCard = ({ movers, spaceId }: { movers: SeoSidebarRegion<SeoMoversSummary>; spaceId: string | null }) => (
  <SidebarCard
    title={GH_GROWTH_SEO_OVERVIEW.movers.title}
    subtitle={GH_GROWTH_SEO_OVERVIEW.movers.subtitle}
    dataCapture='seo-overview-movers'
  >
    {!movers.ok ? (
      movers.reason === 'no_data' ? (
        // "Nadie se movió 5 posiciones" es un resultado legítimo, no una falla.
        <Stack spacing={1}>
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {GH_GROWTH_SEO_OVERVIEW.movers.emptyTitle}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {GH_GROWTH_SEO_OVERVIEW.movers.emptyDescription}
          </Typography>
        </Stack>
      ) : (
        <PendingSlot reason={movers.reason} />
      )
    ) : (
      <Stack spacing={4}>
        {movers.data.gained.length > 0 ? (
          <Stack spacing={2}>
            <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600 }}>
              {GH_GROWTH_SEO_OVERVIEW.movers.gained}
            </Typography>
            {movers.data.gained.map(mover => (
              <MoverRow key={`gained-${mover.keyword}`} mover={mover} />
            ))}
          </Stack>
        ) : null}

        {movers.data.lost.length > 0 ? (
          <Stack spacing={2}>
            <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600 }}>
              {GH_GROWTH_SEO_OVERVIEW.movers.lost}
            </Typography>
            {movers.data.lost.map(mover => (
              <MoverRow key={`lost-${mover.keyword}`} mover={mover} />
            ))}
          </Stack>
        ) : null}

        <Button
          component={Link}
          href={spaceId ? `/admin/growth/seo/performance?space=${encodeURIComponent(spaceId)}` : '/admin/growth/seo'}
          variant='outlined'
          size='small'
          disabled
        >
          {GH_GROWTH_SEO_OVERVIEW.movers.cta}
        </Button>
      </Stack>
    )}
  </SidebarCard>
)

const AeoGapCard = ({ gap }: { gap: SeoSidebarRegion<SeoAeoGapSummary> }) => {
  // La card se OCULTA si el cruce no resuelve: un placeholder falso sugeriría que el
  // dato existe y da cero. Regla del wireframe 4c.
  if (!gap.ok) {
    return null
  }

  return (
    <SidebarCard title={GH_GROWTH_SEO_OVERVIEW.aeoGap.title} dataCapture='seo-overview-aeo-gap'>
      <Stack spacing={3}>
        {gap.data.riskCount > 0 ? (
          <>
            <Typography variant='h4' component='p'>
              {gap.data.riskCount}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {GH_GROWTH_SEO_OVERVIEW.aeoGap.subtitle}
            </Typography>
          </>
        ) : (
          <Stack spacing={1}>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {GH_GROWTH_SEO_OVERVIEW.aeoGap.noneTitle}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {GH_GROWTH_SEO_OVERVIEW.aeoGap.noneDescription}
            </Typography>
          </Stack>
        )}

        <Button component={Link} href='/admin/growth/ai-visibility' variant='outlined' size='small'>
          {GH_GROWTH_SEO_OVERVIEW.aeoGap.cta}
        </Button>
      </Stack>
    </SidebarCard>
  )
}

const SeoOverviewSidebar = ({ sidebar, spaceId }: Props) => (
  <Stack spacing={6} data-capture='seo-overview-sidebar'>
    <HealthCard health={sidebar.health} />
    <MoversCard movers={sidebar.movers} spaceId={spaceId} />
    <AeoGapCard gap={sidebar.gap} />
  </Stack>
)

export default SeoOverviewSidebar
