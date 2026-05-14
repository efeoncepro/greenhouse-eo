'use client'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { GH_WORKFORCE_INTAKE } from '@/lib/copy/workforce'

import type {
  ReliabilityConfidence,
  ReliabilityModuleSnapshot,
  ReliabilitySeverity,
  ReliabilitySignal,
  ReliabilitySignalKind
} from '@/types/reliability'

/**
 * TASK-873 Slice 5 — Mapeo canonical de signalId → CTA acción.
 *
 * Cuando un signal alerta (severity != 'ok'), surface el link operacional
 * relevante junto a la descripción en el ReliabilityModuleCard. Pattern
 * declarativo extensible: cada signal action-able tiene una entry aquí.
 * NO branch inline por signalId en el renderer — agregar entry al map.
 *
 * Forward-compat TASK-874: cuando emerjan los signals
 * `workforce.activation.ready_but_not_completed`,
 * `workforce.activation.completed_with_missing_readiness` y
 * `workforce.activation.blocker_backlog`, agregar entries aquí que apunten
 * a la nueva ruta primaria HR (`/hr/workforce/activation` o
 * `/workforce/activation`, per TASK-874 Plan Mode).
 */
type SignalActionCta = {
  readonly href: string
  readonly label: string
  readonly ariaLabel: string
}

const SIGNAL_ACTION_CTAS: ReadonlyMap<string, SignalActionCta> = new Map<string, SignalActionCta>([
  [
    'workforce.scim_members_pending_profile_completion',
    {
      href: '/hr/workforce/activation',
      label: GH_WORKFORCE_INTAKE.banner_link_to_queue,
      ariaLabel: GH_WORKFORCE_INTAKE.banner_link_to_queue_aria
    }
  ],
  [
    'workforce.activation.blocker_backlog',
    {
      href: '/hr/workforce/activation',
      label: GH_WORKFORCE_INTAKE.banner_link_to_queue,
      ariaLabel: GH_WORKFORCE_INTAKE.banner_link_to_queue_aria
    }
  ],
  [
    'workforce.activation.ready_not_completed',
    {
      href: '/hr/workforce/activation',
      label: GH_WORKFORCE_INTAKE.banner_link_to_queue,
      ariaLabel: GH_WORKFORCE_INTAKE.banner_link_to_queue_aria
    }
  ]
])

const SEVERITY_LABEL: Record<ReliabilitySeverity, string> = {
  ok: 'Óptimo',
  warning: 'Atención',
  error: 'Crítico',
  not_configured: 'Sin configurar',
  awaiting_data: 'Esperando datos',
  unknown: 'Sin estado'
}

type ChipColor = 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'default'

const SEVERITY_CHIP_COLOR: Record<ReliabilitySeverity, ChipColor> = {
  ok: 'success',
  warning: 'warning',
  error: 'error',
  not_configured: 'secondary',
  awaiting_data: 'info',
  unknown: 'default'
}

const SEVERITY_ICON: Record<ReliabilitySeverity, string> = {
  ok: 'tabler-circle-check',
  warning: 'tabler-alert-triangle',
  error: 'tabler-alert-octagon',
  not_configured: 'tabler-plug-connected-x',
  awaiting_data: 'tabler-hourglass',
  unknown: 'tabler-help-circle'
}

const CONFIDENCE_LABEL: Record<ReliabilityConfidence, string> = {
  high: 'Confianza alta',
  medium: 'Confianza media',
  low: 'Confianza baja',
  unknown: 'Sin señales aún'
}

const CONFIDENCE_TOOLTIP: Record<ReliabilityConfidence, string> = {
  high: 'Casi todas las señales esperadas tienen evidencia concreta.',
  medium: 'Algunas señales esperadas siguen pendientes de plomar.',
  low: 'La mayoría de señales esperadas aún no tienen evidencia.',
  unknown: 'No hay señales activas todavía. Esto se cierra con TASK-586 y TASK-599.'
}

const SIGNAL_KIND_LABEL: Record<ReliabilitySignalKind, string> = {
  runtime: 'Runtime check',
  posture: 'Posture',
  incident: 'Incidente',
  freshness: 'Freshness',
  data_quality: 'Data quality',
  cost_guard: 'Cost guard',
  subsystem: 'Subsistema',
  test_lane: 'Test lane',
  billing: 'Billing',
  ai_summary: 'AI summary',
  // TASK-765 Slice 7
  drift: 'Drift',
  dead_letter: 'Dead-letter',
  lag: 'Lag'
}

const VISIBLE_SIGNALS = 3

const SignalRow = ({ signal }: { signal: ReliabilitySignal }) => {
  const color = SEVERITY_CHIP_COLOR[signal.severity]
  const cta = SIGNAL_ACTION_CTAS.get(signal.signalId)
  const showCta = cta && signal.severity !== 'ok' && signal.severity !== 'not_configured'

  return (
    <Stack direction='row' spacing={1.5} alignItems='flex-start'>
      <Box
        component='span'
        aria-hidden='true'
        sx={{
          mt: '2px',
          color: color === 'default' ? 'text.disabled' : `${color}.main`,
          fontSize: '1rem',
          lineHeight: 1
        }}
      >
        <i className={SEVERITY_ICON[signal.severity]} />
      </Box>
      <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant='body2' sx={{ fontWeight: 600 }} noWrap>
          {signal.label}
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          {signal.summary}
        </Typography>
        {showCta ? (
          <Box sx={{ mt: 0.5 }}>
            <Button
              component={Link}
              href={cta.href}
              size='small'
              variant='text'
              color='primary'
              endIcon={<i className='tabler-arrow-right' />}
              aria-label={cta.ariaLabel}
              sx={{ px: 1, minWidth: 0 }}
            >
              {cta.label}
            </Button>
          </Box>
        ) : null}
      </Stack>
    </Stack>
  )
}

interface Props {
  module: ReliabilityModuleSnapshot
}

const ReliabilityModuleCard = ({ module }: Props) => {
  const visibleSignals = module.signals.slice(0, VISIBLE_SIGNALS)
  const remainingCount = Math.max(0, module.signals.length - visibleSignals.length)

  const statusColor = SEVERITY_CHIP_COLOR[module.status]

  const accentColor =
    statusColor === 'success'
      ? 'success.main'
      : statusColor === 'warning'
        ? 'warning.main'
        : statusColor === 'error'
          ? 'error.main'
          : statusColor === 'info'
            ? 'info.main'
            : 'divider'

  return (
    <Card
      variant='outlined'
      sx={{
        height: '100%',
        borderLeft: '4px solid',
        borderLeftColor: accentColor
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Stack direction='row' spacing={2} alignItems='flex-start' justifyContent='space-between'>
            <Stack spacing={0.75} sx={{ minWidth: 0 }}>
              <Typography variant='overline' color='text.secondary'>
                {module.domain}
              </Typography>
              <Typography variant='h6' noWrap>
                {module.label}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {module.description}
              </Typography>
            </Stack>
            <Stack spacing={1} alignItems='flex-end'>
              <Chip
                size='small'
                color={statusColor === 'default' ? 'default' : statusColor}
                icon={
                  <Avatar
                    variant='rounded'
                    sx={{ width: 18, height: 18, bgcolor: 'transparent', color: 'inherit' }}
                    aria-hidden='true'
                  >
                    <i className={SEVERITY_ICON[module.status]} style={{ fontSize: 14 }} />
                  </Avatar>
                }
                label={SEVERITY_LABEL[module.status]}
              />
              <Tooltip title={CONFIDENCE_TOOLTIP[module.confidence]}>
                <Chip size='small' variant='outlined' label={CONFIDENCE_LABEL[module.confidence]} />
              </Tooltip>
            </Stack>
          </Stack>

          <Typography variant='body2'>{module.summary}</Typography>

          {visibleSignals.length > 0 && (
            <Stack spacing={1.5}>
              <Typography variant='overline' color='text.secondary'>
                Señales activas
              </Typography>
              <Stack spacing={1.5}>
                {visibleSignals.map(signal => (
                  <SignalRow key={signal.signalId} signal={signal} />
                ))}
              </Stack>
              {remainingCount > 0 && (
                <Typography variant='caption' color='text.secondary'>
                  +{remainingCount} señal{remainingCount === 1 ? '' : 'es'} adicional
                  {remainingCount === 1 ? '' : 'es'}
                </Typography>
              )}
            </Stack>
          )}

          {module.missingSignalKinds.length > 0 && (
            <Stack spacing={1}>
              <Typography variant='overline' color='text.secondary'>
                Pendiente de plomar
              </Typography>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                {module.missingSignalKinds.map(kind => (
                  <Chip key={kind} size='small' variant='outlined' label={SIGNAL_KIND_LABEL[kind]} />
                ))}
              </Stack>
            </Stack>
          )}

          <Divider />

          <Stack
            direction='row'
            spacing={2}
            sx={{ flexWrap: 'wrap', rowGap: 1 }}
            justifyContent='space-between'
          >
            <Typography variant='caption' color='text.secondary'>
              {module.routes.length} ruta{module.routes.length === 1 ? '' : 's'} crítica
              {module.routes.length === 1 ? '' : 's'}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {module.smokeTests.length} smoke test{module.smokeTests.length === 1 ? '' : 's'}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {module.dependencies.length} dependencia
              {module.dependencies.length === 1 ? '' : 's'}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default ReliabilityModuleCard
