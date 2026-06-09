'use client'

import { useId, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import useReducedMotion from '@/hooks/useReducedMotion'
import { motion } from '@/libs/FramerMotion'
import { GH_NEXA } from '@/lib/copy/nexa'
import { formatNumber as formatGreenhouseNumber } from '@/lib/format'

import GreenhouseButton from './GreenhouseButton'
import GreenhouseChip from './GreenhouseChip'
import GreenhouseNexaGreeting from './GreenhouseNexaGreeting'
import GreenhouseStatusDot, { type GreenhouseStatusDotTone } from './GreenhouseStatusDot'
import {
  GREENHOUSE_FUNNEL_STAGE_ROLE_LABELS,
  GREENHOUSE_FUNNEL_STAGE_ROLE_SEQUENCE,
  GREENHOUSE_FUNNEL_CHART_TOKENS,
  resolveGreenhouseFunnelChartVariant,
  type GreenhouseFunnelChartKind,
  type GreenhouseFunnelChartVariant,
  type GreenhouseFunnelStageRole
} from './greenhouse-funnel-chart-controller'

export type GreenhouseFunnelTone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'

export type GreenhouseFunnelDiagnosticTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export type GreenhouseFunnelStageHealth = GreenhouseFunnelDiagnosticTone

export type GreenhouseFunnelMetric = {
  id: string
  label: string
  value: string
  icon: string
  tone?: GreenhouseFunnelTone
  helperLabel?: string
}

export type GreenhouseFunnelStageDiagnostic = {
  blockers?: number
  blockersTone?: GreenhouseFunnelDiagnosticTone
  ownerName?: string
  ownerInitials?: string
  freshnessLabel?: string
  freshnessTone?: GreenhouseFunnelDiagnosticTone
}

export type GreenhouseFunnelStage = {
  id: string
  label: string
  value: number
  icon: string
  slaLabel?: string
  helperLabel?: string
  description?: string
  retainedRate?: number
  tone?: GreenhouseFunnelTone
  stageRole?: GreenhouseFunnelStageRole
  health?: GreenhouseFunnelStageHealth
  diagnostic?: GreenhouseFunnelStageDiagnostic
  ariaLabel?: string
}

export type GreenhouseFunnelInsight = {
  label: string
  tone?: Exclude<GreenhouseFunnelTone, 'neutral'>
  icon?: string
  actionLabel?: string
  onAction?: () => void
}

export type GreenhouseFunnelNexaPromptContext = {
  stage: GreenhouseFunnelStage & {
    stageRole: GreenhouseFunnelStageRole
    health: GreenhouseFunnelStageHealth
    roleLabel: string
    stepIndex: number
    dropFromPrevious: number
    dropRateFromPrevious: number
    previousStageLabel?: string
    retained: number
  }
  stages: Array<
    GreenhouseFunnelStage & {
      stageRole: GreenhouseFunnelStageRole
      health: GreenhouseFunnelStageHealth
      roleLabel: string
      stepIndex: number
      dropFromPrevious: number
      dropRateFromPrevious: number
      previousStageLabel?: string
      retained: number
    }
  >
  metrics: GreenhouseFunnelMetric[]
  summary: string
}

export type GreenhouseFunnelCopy = {
  metricGroupAriaLabel: string
  viewGroupAriaLabel: string
  emptyTitle: string
  emptyDescription: string
  stageFallbackLabel: string
  selectedStageTitle: string
  selectedStageStepLabel: string
  retainedFromStartLabel: string
  previousStepDeltaLabel: string
  blockerLabel: string
  ownerLabel: string
  freshnessLabel: string
  healthLabel: string
  noOwnerLabel: string
  noSignalLabel: string
  noSlaLabel: string
  retainedDefinition: string
  nexaAssistantTitle: string
  nexaAssistantDescription: string
  nexaAssistantTooltip: string
  nexaAssistantFocusLabel: string
  nexaAssistantActionLabel: string
  nexaAssistantPlaceholder: string
  nexaAssistantStageMessage: string
  nexaAssistantDropMessage: string
  nexaAssistantNextStepMessage: string
  nexaAssistantPromptExamples: string[]
  nexaPromptBottlenecks: string
  nexaPromptBlockers: string
  nexaPromptNextSteps: string
}

export type GreenhouseFunnelChartCardProps = {
  title: string
  subtitle?: string
  subtitleDisplay?: 'inline' | 'tooltip'
  headerMetaLabel?: string
  stagePathLabels?: string[]
  stages: GreenhouseFunnelStage[]
  metrics?: GreenhouseFunnelMetric[]
  insight?: GreenhouseFunnelInsight
  copy?: Partial<GreenhouseFunnelCopy>
  variant?: GreenhouseFunnelChartVariant
  kind?: GreenhouseFunnelChartKind
  metricOptions?: string[]
  defaultMetricOption?: string
  onMetricOptionChange?: (option: string) => void
  viewOptions?: string[]
  defaultViewOption?: string
  onViewOptionChange?: (option: string) => void
  actionLabel?: string
  selectedStageId?: string
  defaultSelectedStageId?: string
  onStageSelect?: (stage: GreenhouseFunnelStage) => void
  onNexaPromptSubmit?: (prompt: string, context: GreenhouseFunnelNexaPromptContext) => void
  valueFormatter?: (value: number) => string
  percentFormatter?: (value: number) => string
  chartAriaLabel?: string
  dataCapture?: string
}

const DEFAULT_METRIC_OPTIONS = ['Cuentas', 'Assets']
const DEFAULT_VIEW_OPTIONS = ['Funnel', 'Tabla']

const DEFAULT_FUNNEL_COPY: GreenhouseFunnelCopy = {
  metricGroupAriaLabel: 'Cambiar metrica del funnel',
  viewGroupAriaLabel: 'Cambiar vista del funnel',
  emptyTitle: 'Sin etapas para graficar',
  emptyDescription: 'Conecta al menos una etapa con volumen para renderizar el funnel operativo.',
  stageFallbackLabel: 'Etapa',
  selectedStageTitle: 'Lectura de etapa',
  selectedStageStepLabel: 'Paso',
  retainedFromStartLabel: 'Retención desde inicio',
  previousStepDeltaLabel: 'Cambio vs paso anterior',
  blockerLabel: 'Bloqueos',
  ownerLabel: 'Owner',
  freshnessLabel: 'Freshness',
  healthLabel: 'Señal',
  noOwnerLabel: 'Sin owner',
  noSignalLabel: 'Sin señal',
  noSlaLabel: 'SLA sin definir',
  retainedDefinition: '% retenido = cuentas que avanzan contra la etapa inicial.',
  nexaAssistantTitle: `Consulta a ${GH_NEXA.brand} sobre este funnel`,
  nexaAssistantDescription: 'Leo el funnel contigo sin repetir la tabla.',
  nexaAssistantTooltip:
    'Uso este funnel y la etapa activa para detectar bloqueos, caídas y próximos pasos sin repetir la tabla.',
  nexaAssistantFocusLabel: 'Foco actual',
  nexaAssistantActionLabel: `Consultar a ${GH_NEXA.brand}`,
  nexaAssistantPlaceholder: 'Pregunta por obstáculos, prioridad o próximos pasos...',
  nexaAssistantStageMessage: 'Estoy leyendo la etapa activa contra la cadena ICO; separo señal de ruido.',
  nexaAssistantDropMessage: 'Estoy conectando caídas con Cycle Time, TTM y Revenue Enabled.',
  nexaAssistantNextStepMessage: 'Puedo ordenar bloqueos, aprobaciones y el próximo movimiento.',
  nexaAssistantPromptExamples: [
    '¿Cómo te ayudo?',
    '¿Te preocupa {stage}?',
    '¿Qué frena {stage}?',
    '¿Dónde actúo primero?',
    '¿Qué bloqueo priorizo?',
    '¿Qué riesgo ves?',
    '¿Cómo destrabo {stage}?',
    '¿Qué dice la retención?',
    '¿Qué cambió antes?',
    '¿Qué alerta reviso?',
    '¿Quién necesita foco?',
    '¿Qué pasa si espero?',
    '¿Hay retrabajo crítico?',
    '¿Qué paso sigue?',
    '¿Qué conversación abro?',
    '¿Qué decisión acelera?',
    '¿Qué patrón ves en el atraso?',
    '¿Qué dato falta para decidir?',
    '¿Cómo lo explico?',
    '¿Qué hago hoy?'
  ],
  nexaPromptBottlenecks: 'Detectar cuellos de botella',
  nexaPromptBlockers: 'Priorizar bloqueos',
  nexaPromptNextSteps: 'Sugerir próximos pasos'
}

const defaultValueFormatter = (value: number): string => formatGreenhouseNumber(value, { maximumFractionDigits: 0 })
const defaultPercentFormatter = (value: number): string => `${value.toFixed(1)}%`

const FUNNEL_OPTION_ICON_BY_LABEL = {
  Cuentas: 'tabler-users',
  Assets: 'tabler-package',
  Funnel: 'tabler-chart-funnel',
  Tabla: 'tabler-table'
} as const satisfies Record<string, string>

const toneToStatusDotTone = (tone: GreenhouseFunnelDiagnosticTone): GreenhouseStatusDotTone =>
  tone === 'neutral' ? 'neutral' : tone

const clampPercent = (value: number): number => Math.min(Math.max(value, 0), 100)
const sanitizeValue = (value: number): number => (Number.isFinite(value) ? Math.max(value, 0) : 0)

const resolveFunnelOptionIcon = (option: string): string | undefined =>
  FUNNEL_OPTION_ICON_BY_LABEL[option as keyof typeof FUNNEL_OPTION_ICON_BY_LABEL]

const resolveStageRole = (stage: GreenhouseFunnelStage, index: number): GreenhouseFunnelStageRole =>
  stage.stageRole ?? GREENHOUSE_FUNNEL_STAGE_ROLE_SEQUENCE[index % GREENHOUSE_FUNNEL_STAGE_ROLE_SEQUENCE.length] ?? 'custom'

const resolveStageHealth = (stage: GreenhouseFunnelStage): GreenhouseFunnelStageHealth => {
  if (stage.health) return stage.health
  if (stage.diagnostic?.blockersTone && stage.diagnostic.blockersTone !== 'neutral') return stage.diagnostic.blockersTone
  if (stage.diagnostic?.freshnessTone) return stage.diagnostic.freshnessTone

  return 'neutral'
}

const RAIL_VIEWBOX_WIDTH = 1000
const RAIL_VIEWBOX_HEIGHT = 100

type RailPoint = readonly [number, number]

const getStagePolygonPointList = (index: number, total: number): RailPoint[] => {
  if (total <= 1) {
    return [
      [0, 0],
      [RAIL_VIEWBOX_WIDTH, 0],
      [RAIL_VIEWBOX_WIDTH, RAIL_VIEWBOX_HEIGHT],
      [0, RAIL_VIEWBOX_HEIGHT]
    ]
  }

  const segment = RAIL_VIEWBOX_WIDTH / total
  const depth = Math.min(GREENHOUSE_FUNNEL_CHART_TOKENS.rail.chevronDepth, segment * 0.22)
  const x0 = segment * index
  const x1 = segment * (index + 1)

  if (index === 0) {
    return [
      [0, 0],
      [x1 - depth, 0],
      [x1, RAIL_VIEWBOX_HEIGHT / 2],
      [x1 - depth, RAIL_VIEWBOX_HEIGHT],
      [0, RAIL_VIEWBOX_HEIGHT]
    ]
  }

  if (index === total - 1) {
    return [
      [x0 - depth, 0],
      [RAIL_VIEWBOX_WIDTH, 0],
      [RAIL_VIEWBOX_WIDTH, RAIL_VIEWBOX_HEIGHT],
      [x0 - depth, RAIL_VIEWBOX_HEIGHT],
      [x0, RAIL_VIEWBOX_HEIGHT / 2]
    ]
  }

  return [
    [x0 - depth, 0],
    [x1 - depth, 0],
    [x1, RAIL_VIEWBOX_HEIGHT / 2],
    [x1 - depth, RAIL_VIEWBOX_HEIGHT],
    [x0 - depth, RAIL_VIEWBOX_HEIGHT],
    [x0, RAIL_VIEWBOX_HEIGHT / 2]
  ]
}

const getRoundedStagePath = (points: readonly RailPoint[]): string => {
  if (points.length < 3) return ''

  const rounded = points.map((point, index) => {
    const radius = GREENHOUSE_FUNNEL_CHART_TOKENS.rail.cornerRadius
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    const previousVector = [previous[0] - point[0], previous[1] - point[1]] as const
    const nextVector = [next[0] - point[0], next[1] - point[1]] as const
    const previousLength = Math.hypot(previousVector[0], previousVector[1])
    const nextLength = Math.hypot(nextVector[0], nextVector[1])
    const offset = Math.min(radius, previousLength / 2, nextLength / 2)

    if (previousLength === 0 || nextLength === 0 || offset === 0) {
      return { start: point, control: point, end: point }
    }

    const start: RailPoint = [
      point[0] + (previousVector[0] / previousLength) * offset,
      point[1] + (previousVector[1] / previousLength) * offset
    ]

    const end: RailPoint = [
      point[0] + (nextVector[0] / nextLength) * offset,
      point[1] + (nextVector[1] / nextLength) * offset
    ]

    return { start, control: point, end }
  })

  const [first, ...rest] = rounded
  const commands = [`M ${first.start[0]} ${first.start[1]}`, `Q ${first.control[0]} ${first.control[1]} ${first.end[0]} ${first.end[1]}`]

  rest.forEach(corner => {
    commands.push(`L ${corner.start[0]} ${corner.start[1]}`)
    commands.push(`Q ${corner.control[0]} ${corner.control[1]} ${corner.end[0]} ${corner.end[1]}`)
  })

  commands.push('Z')

  return commands.join(' ')
}

const getRailBoundaryPath = (index: number, total: number): string => {
  if (total <= 1 || index >= total - 1) return ''

  const segment = RAIL_VIEWBOX_WIDTH / total
  const depth = Math.min(GREENHOUSE_FUNNEL_CHART_TOKENS.rail.chevronDepth, segment * 0.22)
  const x = segment * (index + 1) - depth
  const tip: RailPoint = [x + depth, RAIL_VIEWBOX_HEIGHT / 2]
  const top: RailPoint = [x, 0]
  const bottom: RailPoint = [x, RAIL_VIEWBOX_HEIGHT]
  const tipRadius = GREENHOUSE_FUNNEL_CHART_TOKENS.rail.cornerRadius * 1.8
  const topVectorLength = Math.hypot(top[0] - tip[0], top[1] - tip[1])
  const bottomVectorLength = Math.hypot(bottom[0] - tip[0], bottom[1] - tip[1])

  const topCurve: RailPoint = [
    tip[0] + ((top[0] - tip[0]) / topVectorLength) * tipRadius,
    tip[1] + ((top[1] - tip[1]) / topVectorLength) * tipRadius
  ]

  const bottomCurve: RailPoint = [
    tip[0] + ((bottom[0] - tip[0]) / bottomVectorLength) * tipRadius,
    tip[1] + ((bottom[1] - tip[1]) / bottomVectorLength) * tipRadius
  ]

  return `M ${top[0]} ${top[1]} L ${topCurve[0]} ${topCurve[1]} Q ${tip[0]} ${tip[1]} ${bottomCurve[0]} ${bottomCurve[1]} L ${bottom[0]} ${bottom[1]}`
}

const resolveToneColor = (tone: GreenhouseFunnelTone, theme: Theme) => {
  if (tone === 'neutral') {
    return {
      main: theme.palette.text.secondary,
      dark: theme.palette.text.primary,
      contrast: theme.palette.text.primary
    }
  }

  return {
    main: theme.palette[tone].main,
    dark: theme.palette[tone].dark ?? theme.palette[tone].main,
    contrast: theme.palette[tone].contrastText
  }
}

const resolveStageRoleColor = (role: GreenhouseFunnelStageRole, theme: Theme) => {
  const roleColorFamily = {
    intake: 'primary',
    production: 'secondary',
    quality: 'info',
    rework: 'warning',
    delivery: 'success',
    activation: 'success',
    custom: 'gray'
  } as const satisfies Record<GreenhouseFunnelStageRole, keyof Theme['axis']['ramp']>

  const family = roleColorFamily[role]
  const ramp = theme.axis?.ramp?.[family]

  if (!ramp) {
    if (family === 'gray') {
      return {
        main: theme.palette.text.secondary,
        dark: theme.palette.text.primary,
        surface: theme.palette.action.hover,
        quiet: theme.palette.action.selected,
        roleLabel: GREENHOUSE_FUNNEL_STAGE_ROLE_LABELS[role]
      }
    }

    const paletteColor = theme.palette[family]

    return {
      main: paletteColor.main,
      dark: paletteColor.dark ?? paletteColor.main,
      surface: alpha(paletteColor.main, 0.08),
      quiet: alpha(paletteColor.main, 0.14),
      roleLabel: GREENHOUSE_FUNNEL_STAGE_ROLE_LABELS[role]
    }
  }

  return {
    main: ramp[500],
    dark: ramp[700],
    surface: ramp[100],
    quiet: ramp[200],
    roleLabel: GREENHOUSE_FUNNEL_STAGE_ROLE_LABELS[role]
  }
}

const resolveStageRetention = (stage: GreenhouseFunnelStage, index: number, firstValue: number): number => {
  if (typeof stage.retainedRate === 'number' && Number.isFinite(stage.retainedRate)) return clampPercent(stage.retainedRate)
  if (index === 0) return 100
  if (firstValue <= 0) return 0

  return clampPercent((sanitizeValue(stage.value) / firstValue) * 100)
}

const resolveStageNexaPromptExamples = (
  stage: GreenhouseFunnelNexaPromptContext['stage'],
  baseExamples: string[]
) => {
  const stageScopedExamples = {
    intake: ['¿La entrada está lista?', '¿Qué falta validar?', '¿Qué briefing priorizo?'],
    production: ['¿Qué frena producción?', '¿Dónde se acumuló trabajo?', '¿Quién necesita foco?'],
    quality: ['¿Qué control está lento?', '¿Qué riesgo ves en revisión?', '¿Qué hallazgo priorizo?'],
    rework: ['¿Qué retrabajo pesa más?', '¿Qué aprobación falta?', '¿Cómo destrabo cambios?'],
    delivery: ['¿Qué impide entregar?', '¿Qué salida está en riesgo?', '¿Qué cierro primero?'],
    activation: ['¿Qué activación está trabada?', '¿Qué paso falta?', '¿Cómo acelero alta?'],
    custom: ['¿Qué bloqueo priorizo?', '¿Qué dato falta?', '¿Dónde actúo primero?']
  } satisfies Record<GreenhouseFunnelStageRole, string[]>

  const healthExamples =
    stage.health === 'error'
      ? ['¿Qué hace crítica esta etapa?', '¿Qué pasa si espero?']
      : stage.health === 'warning'
        ? ['¿Qué señal reviso antes?', '¿Cómo bajo el riesgo?']
        : []

  return [...stageScopedExamples[stage.stageRole], ...healthExamples, ...baseExamples].map(example =>
    example.replace('{stage}', stage.label)
  )
}

const resolveStageNexaContextMessages = (
  stage: GreenhouseFunnelNexaPromptContext['stage'],
  fallbackMessages: string[],
  valueFormatter: (value: number) => string,
  percentFormatter: (value: number) => string
) => {
  const blockers = stage.diagnostic?.blockers ?? 0
  const retentionMessage = `Estoy leyendo ${stage.label}: ese ${percentFormatter(stage.retained)} no viene solo; busco el driver que lo explica.`

  const dropMessage =
    stage.previousStageLabel && stage.dropFromPrevious > 0
      ? `Veo ${valueFormatter(stage.dropFromPrevious)} salidas entre ${stage.previousStageLabel} y ${stage.label}; eso suele tocar Cycle Time y TTM.`
      : `No veo una caída previa fuerte en ${stage.label}; igual reviso SLA, freshness y señales de riesgo.`

  const blockerMessage =
    blockers > 0
      ? `Tengo ${blockers} ${blockers === 1 ? 'bloqueo' : 'bloqueos'} en la mira; priorizarlos protege FTR, RpA y salida.`
      : `No veo bloqueos visibles; puedo buscar aprobaciones lentas, freshness flojo o el siguiente paso.`

  return [retentionMessage, dropMessage, blockerMessage, ...fallbackMessages]
}

export type GreenhouseFunnelResolvedStage = GreenhouseFunnelNexaPromptContext['stage']

const resolveStageVisualColor = (stage: GreenhouseFunnelResolvedStage, theme: Theme) => {
  const explicitToneColor = stage.tone ? resolveToneColor(stage.tone, theme) : null
  const roleColor = resolveStageRoleColor(stage.stageRole, theme)

  return explicitToneColor
    ? {
        ...explicitToneColor,
        surface: alpha(explicitToneColor.main, 0.08),
        quiet: alpha(explicitToneColor.main, 0.14),
        roleLabel: stage.roleLabel
      }
    : roleColor
}

type GreenhouseFunnelOptionGroup = {
  id: 'metric' | 'view'
  options: string[]
  resolved: string
  ariaLabel: string
  onChange: (option: string) => void
}

export type GreenhouseFunnelHeaderControlsProps = {
  title: string
  subtitle?: string
  subtitleDisplay?: 'inline' | 'tooltip'
  headerMetaLabel?: string
  stagePathLabels?: string[]
  metricOptions: string[]
  resolvedMetricOption: string
  metricGroupAriaLabel: string
  onMetricOptionChange: (option: string) => void
  viewOptions: string[]
  resolvedViewOption: string
  viewGroupAriaLabel: string
  onViewOptionChange: (option: string) => void
  actionLabel: string
  detailId: string
}

export const GreenhouseFunnelHeaderControls = ({
  title,
  subtitle,
  subtitleDisplay = 'inline',
  headerMetaLabel,
  stagePathLabels = [],
  metricOptions,
  resolvedMetricOption,
  metricGroupAriaLabel,
  onMetricOptionChange,
  viewOptions,
  resolvedViewOption,
  viewGroupAriaLabel,
  onViewOptionChange,
  actionLabel,
  detailId
}: GreenhouseFunnelHeaderControlsProps) => {
  const groups: GreenhouseFunnelOptionGroup[] = [
    {
      id: 'metric',
      options: metricOptions,
      resolved: resolvedMetricOption,
      ariaLabel: metricGroupAriaLabel,
      onChange: onMetricOptionChange
    },
    {
      id: 'view',
      options: viewOptions,
      resolved: resolvedViewOption,
      ariaLabel: viewGroupAriaLabel,
      onChange: onViewOptionChange
    }
  ]

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      alignItems={{ xs: 'stretch', md: 'center' }}
      justifyContent='space-between'
      spacing={4}
      sx={{ px: { xs: 4, md: 6 }, py: { xs: 4, md: 5 } }}
      data-capture='funnel-header-controls'
    >
      <Stack spacing={2} sx={{ minWidth: 0 }}>
        <Stack direction='row' alignItems='center' spacing={2} useFlexGap flexWrap='wrap' sx={{ minWidth: 0 }}>
          <Typography variant='h4' color='text.primary' sx={{ fontWeight: 500, letterSpacing: 0 }}>
            {title}
          </Typography>
          {subtitle && subtitleDisplay === 'tooltip' ? (
            <Tooltip id={`${detailId}-header-detail`} title={subtitle} enterTouchDelay={0}>
              <IconButton
                aria-label={`Ver detalle de ${title}`}
                size='small'
                sx={theme => ({
                  color: 'text.secondary',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '50%',
                  inlineSize: 28,
                  blockSize: 28,
                  '& i': { fontSize: 16 }
                })}
              >
                <i className='tabler-info-circle' aria-hidden='true' />
              </IconButton>
            </Tooltip>
          ) : null}
          {headerMetaLabel ? (
            <GreenhouseChip
              label={headerMetaLabel}
              variant='label'
              tone='secondary'
              size='small'
              kind='attribute'
              iconClassName='tabler-components'
            />
          ) : null}
        </Stack>

        {stagePathLabels.length > 0 ? (
          <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 620 }}>
            {stagePathLabels.join(' · ')}
          </Typography>
        ) : subtitle && subtitleDisplay === 'inline' ? (
          <Typography variant='body2' color='text.secondary'>
            {subtitle}
          </Typography>
        ) : null}
      </Stack>

      <Stack
        direction='row'
        sx={{
          alignItems: 'center',
          justifyContent: { xs: 'flex-start', md: 'flex-end' },
          gap: 1.5,
          minWidth: 0,
          alignSelf: { xs: 'stretch', md: 'center' },
          flexWrap: 'wrap'
        }}
      >
        <Box
          sx={theme => ({
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1,
            minWidth: 0,
            flexWrap: 'wrap',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            bgcolor: 'background.paper'
          })}
        >
          {groups.map(group => (
            <Box
              key={group.id}
              role='group'
              aria-label={group.ariaLabel}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                minWidth: 0,
                flexShrink: 0,
                pl: group.id === 'view' ? 1 : 0,
                borderInlineStart: theme => (group.id === 'view' ? `1px solid ${theme.palette.divider}` : 0)
              }}
            >
              <Box
                sx={theme => ({
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  p: 0.5,
                  borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                  bgcolor: 'background.paper'
                })}
              >
                {group.options.map(option => {
                  const active = option === group.resolved

                  return (
                    <GreenhouseButton
                      key={option}
                      variant={active ? 'label' : 'text'}
                      tone='primary'
                      kind='filter'
                      size='small'
                      aria-pressed={active}
                      leadingIconClassName={resolveFunnelOptionIcon(option)}
                      onClick={() => group.onChange(option)}
                      sx={{ minInlineSize: { xs: 68, sm: 82 }, px: { xs: 1.5, sm: 2 } }}
                    >
                      {option}
                    </GreenhouseButton>
                  )
                })}
              </Box>
            </Box>
          ))}
        </Box>

        <IconButton
          aria-label={actionLabel}
          size='small'
          sx={theme => ({
            color: 'text.secondary',
            flexShrink: 0,
            inlineSize: { xs: 44, sm: 48 },
            blockSize: { xs: 44, sm: 48 },
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            fontSize: 22,
            '&:hover': {
              color: 'text.primary',
              bgcolor: alpha(theme.palette.action.hover, 0.52)
            }
          })}
        >
          <i className='tabler-dots-vertical' aria-hidden='true' />
        </IconButton>
      </Stack>
    </Stack>
  )
}

export type GreenhouseFunnelKpiStripProps = {
  metrics: GreenhouseFunnelMetric[]
}

export const GreenhouseFunnelKpiStrip = ({ metrics }: GreenhouseFunnelKpiStripProps) => {
  const theme = useTheme()

  if (metrics.length === 0) return null

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 4,
        alignItems: 'stretch',
        mb: { xs: 4, md: 5 }
      }}
      data-capture='funnel-kpi-strip'
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(3, minmax(0, 1fr))'
          },
          gap: 3,
          minWidth: 0
        }}
      >
        {metrics.map(metric => {
          const tone = metric.tone ?? 'neutral'
          const toneColor = resolveToneColor(tone, theme)

          return (
            <Stack
              key={metric.id}
              direction='row'
              alignItems='center'
              spacing={3}
              sx={{
                minWidth: 0,
                pb: { xs: 0, sm: 1 }
              }}
            >
              <Box
                aria-hidden
                sx={theme => ({
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  inlineSize: GREENHOUSE_FUNNEL_CHART_TOKENS.icon.metricBubble,
                  blockSize: GREENHOUSE_FUNNEL_CHART_TOKENS.icon.metricBubble,
                  borderRadius: '50%',
                  color: toneColor.dark,
                  bgcolor:
                    tone === 'neutral'
                      ? theme.palette.action.hover
                      : alpha(
                          toneColor.main,
                          theme.palette.mode === 'dark'
                            ? GREENHOUSE_FUNNEL_CHART_TOKENS.opacity.metricSurface.dark
                            : GREENHOUSE_FUNNEL_CHART_TOKENS.opacity.metricSurface.light
                        ),
                  flexShrink: 0,
                  '& i': { fontSize: GREENHOUSE_FUNNEL_CHART_TOKENS.icon.glyph }
                })}
              >
                <i className={metric.icon} />
              </Box>
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.25 }}>
                  {metric.label}
                </Typography>
                <Typography variant='kpiValue' color='text.primary' sx={{ whiteSpace: 'nowrap' }}>
                  {metric.value}
                </Typography>
                {metric.helperLabel ? (
                  <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.25 }}>
                    {metric.helperLabel}
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
          )
        })}
      </Box>
      <Divider sx={{ borderColor: 'divider' }} />
    </Box>
  )
}

export type GreenhouseFunnelStageSegmentProps = {
  stage: GreenhouseFunnelResolvedStage
  index: number
  total: number
  selected: boolean
  reducedMotion: boolean
  blockerLabel: string
  ownerLabel: string
  noSlaLabel: string
  valueFormatter: (value: number) => string
  percentFormatter: (value: number) => string
  onStageSelect: (stage: GreenhouseFunnelResolvedStage) => void
}

export const GreenhouseFunnelStageSegment = ({
  stage,
  index,
  total,
  selected,
  reducedMotion,
  blockerLabel,
  ownerLabel,
  noSlaLabel,
  valueFormatter,
  percentFormatter,
  onStageSelect
}: GreenhouseFunnelStageSegmentProps) => {
  const theme = useTheme()
  const stageColor = resolveStageVisualColor(stage, theme)

  const stageTooltip = [
    `${stage.roleLabel} · ${valueFormatter(stage.value)}`,
    `${percentFormatter(stage.retained)} retenido`,
    stage.diagnostic?.blockers !== undefined ? `${stage.diagnostic.blockers} ${blockerLabel.toLowerCase()}` : null,
    stage.diagnostic?.ownerName ? `${ownerLabel}: ${stage.diagnostic.ownerName}` : null
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Box
      component={motion.div}
      initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.985 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      whileHover={reducedMotion ? undefined : { y: -3 }}
      whileTap={reducedMotion ? undefined : { scale: 0.995 }}
      transition={{
        duration: reducedMotion ? 0 : GREENHOUSE_FUNNEL_CHART_TOKENS.motion.stageDurationMs / 1000,
        delay: reducedMotion ? 0 : (GREENHOUSE_FUNNEL_CHART_TOKENS.motion.stageDelayMs * index) / 1000
      }}
      sx={{
        position: 'relative',
        minWidth: 0,
        zIndex: selected ? 2 : total - index
      }}
    >
      <Tooltip title={stageTooltip} enterTouchDelay={0} arrow>
        <Box
          component='button'
          type='button'
          aria-pressed={selected}
          aria-label={
            stage.ariaLabel ??
            `${stage.label}: ${valueFormatter(stage.value)}, ${percentFormatter(stage.retained)} retenido, ${stage.roleLabel}${
              stage.slaLabel ? `, ${stage.slaLabel}` : ''
            }`
          }
          onClick={() => onStageSelect(stage)}
          data-stage-id={stage.id}
          sx={theme => ({
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 2,
            width: '100%',
            minHeight: {
              xs: GREENHOUSE_FUNNEL_CHART_TOKENS.rail.stageBlockSize.compact,
              md: GREENHOUSE_FUNNEL_CHART_TOKENS.rail.stageBlockSize.comfortable
            },
            py: { xs: 3, md: 4 },
            px: { xs: 4, md: 4 },
            pl: index === 0 ? { xs: 4, md: 4 } : { xs: 7, md: 6 },
            pr: index === total - 1 ? { xs: 4, md: 4 } : { xs: 7, md: 6 },
            border: 0,
            overflow: 'hidden',
            color: 'text.primary',
            bgcolor: 'transparent',
            boxShadow: 'none',
            cursor: 'pointer',
            textAlign: 'start',
            transition: reducedMotion ? 'none' : `background-color 180ms cubic-bezier(0.2, 0, 0, 1)`,
            '&:hover': {
              bgcolor: 'transparent'
            },
            '&:hover [data-funnel-stage-icon="true"]': {
              bgcolor:
                theme.palette.mode === 'dark'
                  ? alpha(stageColor.main, selected ? 0.34 : 0.28)
                  : alpha(stageColor.main, selected ? 0.2 : 0.15),
              boxShadow: `0 0 0 5px ${alpha(stageColor.main, 0.08)}`
            },
            '&:focus-visible': {
              outline: `3px solid ${alpha(theme.palette.primary.main, 0.34)}`,
              outlineOffset: -4
            }
          })}
        >
          <Stack
            direction='row'
            alignItems='center'
            justifyContent='flex-start'
            spacing={2}
            sx={{ position: 'relative', zIndex: 1, minWidth: 0 }}
          >
            <Box
              aria-hidden
              data-funnel-stage-icon='true'
              sx={theme => ({
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                inlineSize: GREENHOUSE_FUNNEL_CHART_TOKENS.icon.bubble,
                blockSize: GREENHOUSE_FUNNEL_CHART_TOKENS.icon.bubble,
                borderRadius: '50%',
                color: stageColor.dark,
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? alpha(stageColor.main, selected ? 0.32 : 0.24)
                    : alpha(stageColor.main, selected ? 0.18 : 0.12),
                boxShadow: selected ? `0 0 0 4px ${alpha(stageColor.main, 0.08)}` : 'none',
                flexShrink: 0,
                '& i': { fontSize: GREENHOUSE_FUNNEL_CHART_TOKENS.icon.glyph }
              })}
            >
              <i className={stage.icon} />
            </Box>
          </Stack>
          <Stack
            spacing={1.5}
            sx={{
              position: 'relative',
              zIndex: 1,
              minWidth: 0,
              width: '100%'
            }}
          >
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography variant='h6' color='text.primary' noWrap>
                {stage.label}
              </Typography>
              {stage.helperLabel ? (
                <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.25 }}>
                  {stage.helperLabel}
                </Typography>
              ) : null}
            </Stack>
            <Typography variant='kpiValue' sx={{ color: stageColor.dark }}>
              {valueFormatter(stage.value)}
            </Typography>
            <Divider sx={{ borderStyle: 'dashed' }} />
            <Typography variant='body2' color='text.secondary'>
              {stage.slaLabel ?? noSlaLabel}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                minBlockSize: 24
              }}
            >
              <GreenhouseStatusDot
                tone={toneToStatusDotTone(stage.health)}
                label={percentFormatter(stage.retained)}
                size='md'
                halo={selected}
              />
            </Box>
          </Stack>
        </Box>
      </Tooltip>
    </Box>
  )
}

export type GreenhouseFunnelStageRailProps = {
  stages: GreenhouseFunnelResolvedStage[]
  selectedStageId?: string
  chartAriaLabel: string
  descriptionId: string
  railClipId: string
  summary: string
  reducedMotion: boolean
  copy: Pick<GreenhouseFunnelCopy, 'blockerLabel' | 'ownerLabel' | 'noSlaLabel'>
  valueFormatter: (value: number) => string
  percentFormatter: (value: number) => string
  onStageSelect: (stage: GreenhouseFunnelResolvedStage) => void
}

export const GreenhouseFunnelStageRail = ({
  stages,
  selectedStageId,
  chartAriaLabel,
  descriptionId,
  railClipId,
  summary,
  reducedMotion,
  copy,
  valueFormatter,
  percentFormatter,
  onStageSelect
}: GreenhouseFunnelStageRailProps) => {
  const theme = useTheme()

  return (
    <Box role='group' aria-label={chartAriaLabel} aria-describedby={descriptionId} data-capture='funnel-stage-rail'>
      <Box
        sx={{
          overflowX: 'auto',
          pb: 1,
          scrollbarWidth: 'thin'
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'grid',
            overflow: 'hidden',
            borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
            gridTemplateColumns: {
              xs: `repeat(${stages.length}, minmax(${GREENHOUSE_FUNNEL_CHART_TOKENS.rail.stageMinInlineSize}px, 1fr))`,
              md: `repeat(${stages.length}, minmax(0, 1fr))`
            },
            minWidth: { xs: GREENHOUSE_FUNNEL_CHART_TOKENS.rail.minInlineSize, md: 0 },
            alignItems: 'stretch'
          }}
        >
          <Box
            component='svg'
            aria-hidden
            viewBox={`0 0 ${RAIL_VIEWBOX_WIDTH} ${RAIL_VIEWBOX_HEIGHT}`}
            preserveAspectRatio='none'
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            <defs>
              <clipPath id={railClipId}>
                <rect
                  x='0.5'
                  y='0.5'
                  width={RAIL_VIEWBOX_WIDTH - 1}
                  height={RAIL_VIEWBOX_HEIGHT - 1}
                  rx={GREENHOUSE_FUNNEL_CHART_TOKENS.rail.cornerRadius}
                  ry={GREENHOUSE_FUNNEL_CHART_TOKENS.rail.cornerRadius}
                />
              </clipPath>
            </defs>
            <g clipPath={`url(#${railClipId})`}>
              {stages.map((stage, index) => {
                const stageColor = resolveStageVisualColor(stage, theme)
                const selected = stage.id === selectedStageId

                const fill =
                  theme.palette.mode === 'dark'
                    ? alpha(
                        stageColor.main,
                        selected
                          ? GREENHOUSE_FUNNEL_CHART_TOKENS.opacity.stageHoverSurface.dark
                          : GREENHOUSE_FUNNEL_CHART_TOKENS.opacity.stageSurface.dark
                      )
                    : `color-mix(in srgb, ${stageColor.main} ${selected ? 11 : 8}%, ${theme.palette.background.paper})`

                return <path key={`rail-fill-${stage.id}`} d={getRoundedStagePath(getStagePolygonPointList(index, stages.length))} fill={fill} />
              })}
              {stages.slice(0, -1).map((stage, index) => {
                const nextStage = stages[index + 1]
                const stageColor = nextStage ? resolveStageVisualColor(nextStage, theme) : null

                return stageColor ? (
                  <path
                    key={`rail-boundary-${stage.id}`}
                    d={getRailBoundaryPath(index, stages.length)}
                    fill='none'
                    stroke={alpha(stageColor.main, 0.66)}
                    strokeWidth={1.1}
                    vectorEffect='non-scaling-stroke'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                ) : null
              })}
            </g>
            <rect
              x='0.5'
              y='0.5'
              width={RAIL_VIEWBOX_WIDTH - 1}
              height={RAIL_VIEWBOX_HEIGHT - 1}
              rx={GREENHOUSE_FUNNEL_CHART_TOKENS.rail.cornerRadius}
              ry={GREENHOUSE_FUNNEL_CHART_TOKENS.rail.cornerRadius}
              fill='none'
              stroke={alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.52 : 0.78)}
              strokeWidth='1'
              vectorEffect='non-scaling-stroke'
            />
          </Box>

          {stages.map((stage, index) => (
            <GreenhouseFunnelStageSegment
              key={stage.id}
              stage={stage}
              index={index}
              total={stages.length}
              selected={stage.id === selectedStageId}
              reducedMotion={reducedMotion}
              blockerLabel={copy.blockerLabel}
              ownerLabel={copy.ownerLabel}
              noSlaLabel={copy.noSlaLabel}
              valueFormatter={valueFormatter}
              percentFormatter={percentFormatter}
              onStageSelect={onStageSelect}
            />
          ))}
        </Box>
      </Box>

      <Box id={descriptionId} sx={visuallyHidden}>
        {summary}
      </Box>
    </Box>
  )
}

export type GreenhouseFunnelDiagnosticsGridProps = {
  stages: GreenhouseFunnelResolvedStage[]
  selectedStageId?: string
  copy: Pick<
    GreenhouseFunnelCopy,
    'blockerLabel' | 'ownerLabel' | 'freshnessLabel' | 'noOwnerLabel' | 'noSignalLabel'
  >
}

export const GreenhouseFunnelDiagnosticsGrid = ({ stages, selectedStageId, copy }: GreenhouseFunnelDiagnosticsGridProps) => (
  <Box
    sx={theme => ({
      mt: 5,
      overflowX: 'auto',
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.md}px`,
      scrollbarWidth: 'thin'
    })}
    data-capture='funnel-diagnostics-grid'
  >
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: `${GREENHOUSE_FUNNEL_CHART_TOKENS.diagnostics.labelColumn.compact}px repeat(${stages.length}, minmax(132px, 1fr))`,
          md: `${GREENHOUSE_FUNNEL_CHART_TOKENS.diagnostics.labelColumn.comfortable}px repeat(${stages.length}, minmax(0, 1fr))`
        },
        minWidth: { xs: GREENHOUSE_FUNNEL_CHART_TOKENS.rail.minInlineSize, md: 0 }
      }}
    >
      {[
        { label: copy.blockerLabel, icon: 'tabler-ban' },
        { label: copy.ownerLabel, icon: 'tabler-user-circle' },
        { label: copy.freshnessLabel, icon: 'tabler-clock-up' }
      ].map((row, rowIndex) => (
        <Box key={row.label} sx={{ display: 'contents' }}>
          <Stack
            direction='row'
            alignItems='center'
            spacing={2}
            sx={theme => ({
              px: 4,
              minHeight: GREENHOUSE_FUNNEL_CHART_TOKENS.diagnostics.rowMinBlockSize,
              borderBlockStart: rowIndex === 0 ? 'none' : `1px solid ${theme.palette.divider}`,
              borderInlineEnd: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.action.hover, 0.42)
            })}
          >
            <i className={row.icon} aria-hidden='true' />
            <Typography variant='subtitle2' color='text.secondary'>
              {row.label}
            </Typography>
          </Stack>
          {stages.map(stage => {
            const diagnostic = stage.diagnostic
            const selected = stage.id === selectedStageId

            return (
              <Stack
                key={`${row.label}-${stage.id}`}
                direction='row'
                alignItems='center'
                justifyContent='center'
                spacing={2}
                sx={theme => ({
                  px: 3,
                  minHeight: GREENHOUSE_FUNNEL_CHART_TOKENS.diagnostics.rowMinBlockSize,
                  borderBlockStart: rowIndex === 0 ? 'none' : `1px solid ${theme.palette.divider}`,
                  borderInlineStart: `1px solid ${alpha(theme.palette.divider, 0.58)}`,
                  bgcolor: selected ? alpha(theme.palette.primary.main, 0.04) : 'background.paper'
                })}
              >
                {rowIndex === 0 ? (
                  <GreenhouseChip
                    size='small'
                    variant='label'
                    kind='metric'
                    tone={diagnostic?.blockersTone === 'neutral' ? 'default' : diagnostic?.blockersTone ?? 'default'}
                    label={String(diagnostic?.blockers ?? 0)}
                    iconClassName='tabler-point-filled'
                  />
                ) : rowIndex === 1 ? (
                  <Stack direction='row' alignItems='center' spacing={2} sx={{ minWidth: 0 }}>
                    <Box
                      aria-hidden
                      sx={theme => ({
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        inlineSize: 30,
                        blockSize: 30,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.24 : 0.12),
                        color: theme.palette.info.dark,
                        flexShrink: 0
                      })}
                    >
                      <Typography variant='caption'>{diagnostic?.ownerInitials ?? '--'}</Typography>
                    </Box>
                    <Typography variant='body2' color='text.primary' noWrap>
                      {diagnostic?.ownerName ?? copy.noOwnerLabel}
                    </Typography>
                  </Stack>
                ) : (
                  <GreenhouseStatusDot
                    tone={toneToStatusDotTone(diagnostic?.freshnessTone ?? 'neutral')}
                    label={diagnostic?.freshnessLabel ?? copy.noSignalLabel}
                  />
                )}
              </Stack>
            )
          })}
        </Box>
      ))}
    </Box>
  </Box>
)

const GreenhouseFunnelChartCard = ({
  title,
  subtitle,
  subtitleDisplay = 'inline',
  headerMetaLabel,
  stagePathLabels,
  stages,
  metrics = [],
  insight,
  copy,
  variant,
  kind = 'custom',
  metricOptions = DEFAULT_METRIC_OPTIONS,
  defaultMetricOption = metricOptions[0],
  onMetricOptionChange,
  viewOptions = DEFAULT_VIEW_OPTIONS,
  defaultViewOption = viewOptions[0],
  onViewOptionChange,
  actionLabel = 'Mas opciones',
  selectedStageId,
  defaultSelectedStageId,
  onStageSelect,
  onNexaPromptSubmit,
  valueFormatter = defaultValueFormatter,
  percentFormatter = defaultPercentFormatter,
  chartAriaLabel,
  dataCapture
}: GreenhouseFunnelChartCardProps) => {
  const reducedMotion = useReducedMotion()
  const chartDescriptionId = useId().replace(/:/g, '')
  const railClipId = `${chartDescriptionId}-rail-clip`
  const resolvedVariant = resolveGreenhouseFunnelChartVariant({ variant, kind })
  const resolvedCopy = { ...DEFAULT_FUNNEL_COPY, ...copy }
  const [internalMetricOption, setInternalMetricOption] = useState(defaultMetricOption)
  const [internalViewOption, setInternalViewOption] = useState(defaultViewOption)

  const normalizedStages = useMemo(
    () =>
      stages.map((stage, index) => ({
        ...stage,
        value: sanitizeValue(stage.value),
        stageRole: resolveStageRole(stage, index),
        health: resolveStageHealth(stage)
      })),
    [stages]
  )

  const firstValue = normalizedStages[0]?.value ?? 0

  const enrichedStages = useMemo<GreenhouseFunnelResolvedStage[]>(
    () =>
      normalizedStages.map((stage, index) => {
        const previousStage = normalizedStages[index - 1]
        const previousValue = previousStage?.value
        const dropFromPrevious = typeof previousValue === 'number' ? Math.max(previousValue - stage.value, 0) : 0

        const dropRateFromPrevious =
          typeof previousValue === 'number' && previousValue > 0 ? clampPercent((dropFromPrevious / previousValue) * 100) : 0

        return {
          ...stage,
          roleLabel: GREENHOUSE_FUNNEL_STAGE_ROLE_LABELS[stage.stageRole],
          stepIndex: index + 1,
          dropFromPrevious,
          dropRateFromPrevious,
          previousStageLabel: previousStage?.label,
          retained: resolveStageRetention(stage, index, firstValue)
        }
      }),
    [firstValue, normalizedStages]
  )

  const hasStages = enrichedStages.length > 0
  const hasSummaryStrip = metrics.length > 0

  const selectedFallbackStage =
    enrichedStages.reduce((current, stage) => {
      const blockers = stage.diagnostic?.blockers ?? 0
      const currentBlockers = current?.diagnostic?.blockers ?? -1

      return blockers > currentBlockers ? stage : current
    }, enrichedStages[0]) ?? null

  const fallbackSelectedId = defaultSelectedStageId ?? selectedFallbackStage?.id

  const [internalSelectedId, setInternalSelectedId] = useState(fallbackSelectedId)
  const resolvedSelectedId = selectedStageId ?? internalSelectedId
  const selectedStage = enrichedStages.find(stage => stage.id === resolvedSelectedId) ?? selectedFallbackStage

  const resolvedMetricOption = metricOptions.includes(internalMetricOption) ? internalMetricOption : metricOptions[0]
  const resolvedViewOption = viewOptions.includes(internalViewOption) ? internalViewOption : viewOptions[0]
  const resolvedStagePathLabels = stagePathLabels?.filter(Boolean) ?? []

  const summary = enrichedStages
    .map(stage => {
      const blockers = stage.diagnostic?.blockers
      const owner = stage.diagnostic?.ownerName

      return [
        `${stage.label}: ${valueFormatter(stage.value)}`,
        `${percentFormatter(stage.retained)} retenido`,
        `rol ${stage.roleLabel}`,
        typeof blockers === 'number' ? `${blockers} ${resolvedCopy.blockerLabel.toLowerCase()}` : null,
        owner ? `${resolvedCopy.ownerLabel} ${owner}` : null
      ]
        .filter(Boolean)
        .join(', ')
    })
    .join('; ')

  const resolvedChartAriaLabel =
    chartAriaLabel ?? `${title}${subtitle ? `, ${subtitle}` : ''}. Pipeline con ${enrichedStages.length} etapas`

  const handleMetricOption = (option: string) => {
    setInternalMetricOption(option)
    onMetricOptionChange?.(option)
  }

  const handleViewOption = (option: string) => {
    setInternalViewOption(option)
    onViewOptionChange?.(option)
  }

  const handleStageSelect = (stage: GreenhouseFunnelResolvedStage) => {
    if (selectedStageId === undefined) setInternalSelectedId(stage.id)
    onStageSelect?.(stage)
  }

  const handleNexaPromptSubmit = (prompt: string) => {
    if (!selectedStage) {
      insight?.onAction?.()

      return
    }

    onNexaPromptSubmit?.(prompt, {
      stage: selectedStage,
      stages: enrichedStages,
      metrics,
      summary
    })

    insight?.onAction?.()
  }

  const renderEmptyState = () => (
    <Box
      sx={theme => ({
        px: { xs: 4, md: 6 },
        py: { xs: 7, md: 8 },
        borderBlockStart: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.action.hover, 0.34)
      })}
    >
      <Stack direction='row' alignItems='center' spacing={3}>
        <Box
          aria-hidden
          sx={theme => ({
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            inlineSize: 48,
            blockSize: 48,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            color: theme.palette.text.secondary,
            bgcolor: theme.palette.background.paper,
            '& i': { fontSize: 26 }
          })}
        >
          <i className='tabler-chart-funnel' />
        </Box>
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          <Typography variant='h6'>{resolvedCopy.emptyTitle}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {resolvedCopy.emptyDescription}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  )

  return (
    <Card
      elevation={0}
      data-capture={dataCapture}
      data-chart-variant={resolvedVariant}
      data-chart-kind={kind}
      sx={{
        width: '100%',
        maxWidth: GREENHOUSE_FUNNEL_CHART_TOKENS.card.maxInlineSize,
        borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
        border: theme => `1px solid ${alpha(theme.palette.divider, GREENHOUSE_FUNNEL_CHART_TOKENS.opacity.border)}`,
        boxShadow: theme => theme.greenhouseElevation.raised.boxShadow,
        overflow: 'hidden'
      }}
    >
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <GreenhouseFunnelHeaderControls
          title={title}
          subtitle={subtitle}
          subtitleDisplay={subtitleDisplay}
          headerMetaLabel={headerMetaLabel}
          stagePathLabels={resolvedStagePathLabels}
          metricOptions={metricOptions}
          resolvedMetricOption={resolvedMetricOption}
          metricGroupAriaLabel={resolvedCopy.metricGroupAriaLabel}
          onMetricOptionChange={handleMetricOption}
          viewOptions={viewOptions}
          resolvedViewOption={resolvedViewOption}
          viewGroupAriaLabel={resolvedCopy.viewGroupAriaLabel}
          onViewOptionChange={handleViewOption}
          actionLabel={actionLabel}
          detailId={chartDescriptionId}
        />

        <Divider />

        {!hasStages ? renderEmptyState() : null}

        <Box sx={{ px: { xs: 4, md: 6 }, py: { xs: 4, md: 5 } }}>
          {hasSummaryStrip ? (
            <GreenhouseFunnelKpiStrip metrics={metrics} />
          ) : null}

          {hasStages ? (
            <>
              <GreenhouseFunnelStageRail
                stages={enrichedStages}
                selectedStageId={selectedStage?.id}
                chartAriaLabel={resolvedChartAriaLabel}
                descriptionId={chartDescriptionId}
                railClipId={railClipId}
                summary={summary}
                reducedMotion={reducedMotion}
                copy={resolvedCopy}
                valueFormatter={valueFormatter}
                percentFormatter={percentFormatter}
                onStageSelect={handleStageSelect}
              />

              {selectedStage ? (
                <Box sx={{ mt: 4 }}>
                  <GreenhouseNexaGreeting
                    kind='funnelStageAdvisor'
                    greeting={resolvedCopy.nexaAssistantTitle}
                    roleLine={`${resolvedCopy.nexaAssistantFocusLabel}: ${selectedStage.label}`}
                    disclaimer={resolvedCopy.nexaAssistantDescription}
                    tooltipLabel={resolvedCopy.nexaAssistantTooltip}
                    tooltipContent={
                      <Box component='span' sx={{ display: 'block' }}>
                        Uso{' '}
                        <Box component='strong' sx={{ fontWeight: 600, color: 'common.white' }}>
                          este funnel y la etapa activa
                        </Box>{' '}
                        para detectar{' '}
                        <Box component='strong' sx={{ fontWeight: 600, color: 'common.white' }}>
                          bloqueos, caídas y próximos pasos
                        </Box>{' '}
                        sin repetir la tabla.
                      </Box>
                    }
                    inputLabel={resolvedCopy.nexaAssistantActionLabel}
                    placeholder={resolvedCopy.nexaAssistantPlaceholder}
                    contextMessages={resolveStageNexaContextMessages(
                      selectedStage,
                      [
                        resolvedCopy.nexaAssistantStageMessage,
                        resolvedCopy.nexaAssistantDropMessage,
                        resolvedCopy.nexaAssistantNextStepMessage
                      ],
                      valueFormatter,
                      percentFormatter
                    )}
                    rotateContextMessages
                    rotatePlaceholderExamples={false}
                    placeholderExamples={resolveStageNexaPromptExamples(
                      selectedStage,
                      resolvedCopy.nexaAssistantPromptExamples
                    )}
                    onSubmitPrompt={handleNexaPromptSubmit}
                    nexaChipLabel={resolvedCopy.nexaAssistantActionLabel}
                  />
                </Box>
              ) : null}

              <GreenhouseFunnelDiagnosticsGrid
                stages={enrichedStages}
                selectedStageId={selectedStage?.id}
                copy={resolvedCopy}
              />

              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 4, maxWidth: 760 }}>
                {resolvedCopy.retainedDefinition}{' '}
                {selectedStage
                  ? `${resolvedCopy.selectedStageTitle}: ${selectedStage.label} (${percentFormatter(selectedStage.retained)}).`
                  : null}
              </Typography>
            </>
          ) : null}

        </Box>
      </CardContent>
    </Card>
  )
}

export default GreenhouseFunnelChartCard
