'use client'

import { useMemo, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import ListItemButton from '@mui/material/ListItemButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import { Area, AreaChart, Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'

import { CompositionShell, GreenhouseBreadcrumbs } from '@/components/greenhouse/primitives'
import type { GreenhouseBreadcrumbItem } from '@/components/greenhouse/primitives/GreenhouseBreadcrumbs'
import type { OperationalStatusTone } from '@/components/greenhouse/primitives/OperationalStatusBadge'
import TeamAvatarGroup, { type TeamAvatarGroupBrand } from '@/components/greenhouse/TeamAvatarGroup'
import GreenhouseBrandLogoMark from '@/components/greenhouse/primitives/GreenhouseBrandLogoMark'
import type { GreenhouseBrandLogoKind } from '@/components/greenhouse/primitives/greenhouse-brand-logo-controller'
// Importamos del módulo `model` directo (NO del barrel): el barrel re-exporta el render PDF `server-only`
// (@react-pdf/renderer) y meterlo en el bundle de cliente rompería el build (server-only transitivo).
import { type ReportArtifactModel } from '@/components/growth/ai-visibility/report-artifact/model'
import AppRecharts from '@/libs/styles/AppRecharts'
import { GH_GROWTH_AI_VISIBILITY, GH_GROWTH_AI_VISIBILITY_CLIENT_REPORT } from '@/lib/copy/growth'
import { formatNumber } from '@/lib/format/number'
import type { GraderReportSeverity } from '@/lib/growth/ai-visibility/report/contracts'
// Type-only (erased): el módulo TASK-1275 es server-only; acá solo viaja el union de estados.
import type { RecommendationStatusValue } from '@/lib/growth/ai-visibility/recommendation-status'
import type { ScoreDimensionKey } from '@/lib/growth/ai-visibility/scoring/config'
import PlanStatusSection, { PlanStatusChip, type PlanStatusVM } from '../plan/PlanStatusSection'

/**
 * TASK-1248 — Portal cliente · AI Visibility (Split Workbench, concepto C).
 *
 * 4.º view-adapter del MISMO `ReportArtifactModel` (SSOT, TASK-1252): NO forkea scoring, NO embebe el
 * render vertical del artifact, NO introduce ECharts (charts Recharts). Recompone el modelo como un
 * workbench master-detail: navigator (Dimensiones + Recomendaciones) ↔ **detail canvas RICO** con todo el
 * detalle del ítem seleccionado (puntaje relacionado + 2 charts + ¿por qué importa? + señales de respaldo).
 * El `CompositionShell composition='masterDetail'` gobierna el split desktop y el drawer del detalle en
 * compact. V1-honest: la tendencia es el delta run-over-run real (no una serie multi-semana fabricada).
 */

const C = GH_GROWTH_AI_VISIBILITY_CLIENT_REPORT
const SEV = GH_GROWTH_AI_VISIBILITY.severity_label
const DIM_EXPLAINER = GH_GROWTH_AI_VISIBILITY.dimension_explainer
const DIM_LABEL = GH_GROWTH_AI_VISIBILITY.dimension_label

const fmt = (value: number): string => formatNumber(value)

// Severidad nombrada → token semántico (NUNCA color-only: siempre acompañada del label).
const severityThemeColor: Record<GraderReportSeverity, OperationalStatusTone> = {
  optimo: 'success',
  atencion: 'warning',
  critico: 'error',
  sin_dato: 'secondary'
}

type Selection = { type: 'dimension'; key: ScoreDimensionKey } | { type: 'recommendation'; gapKey: string }

/**
 * TASK-1276 — Extensiones ADITIVAS del workbench para la vista operador (S9). Sin estas props el
 * comportamiento cliente es EXACTAMENTE el previo (cero cambio para `/aeo`). No forkea el layout:
 * la vista operador es el MISMO workbench con chrome propio + control de estado del Plan AEO.
 */
export interface AiVisibilityReportChrome {
  /** Breadcrumb propio de la superficie (default: el del portal cliente "Inicio / AEO"). */
  breadcrumbItems?: GreenhouseBreadcrumbItem[]
  /** Oculta el bloque de soporte del cliente (no aplica al operador). */
  hideSupport?: boolean
}

export interface AiVisibilityPlanExtension {
  /** Estado por gapKey; ausencia = "sin seguimiento aún" (degradación honesta). */
  statuses: Readonly<Partial<Record<string, PlanStatusVM>>>
  /** gapKey con write en vuelo (deshabilita SU control, no el resto). */
  busyGapKey: string | null
  onSetStatus: (gapKey: string, status: RecommendationStatusValue, reason: string | null) => void
}

// Nombre de producto por proveedor (los isotipos los resuelve TeamAvatarGroup variante brand).
const ENGINE_DISPLAY_NAME: Record<string, string> = {
  openai: 'ChatGPT',
  anthropic: 'Claude',
  gemini: 'Gemini',
  google_ai_overview: 'Gemini',
  perplexity: 'Perplexity'
}

const engineBrands = (model: ReportArtifactModel): TeamAvatarGroupBrand[] =>
  (model.engineSnapshot ?? []).map(e => ({
    provider: e.provider,
    name: ENGINE_DISPLAY_NAME[e.provider] ?? e.provider.charAt(0).toUpperCase() + e.provider.slice(1)
  }))

// Isotipo de motor (bare, sin avatar) — usado como tick del eje X del chart "Menciones por plataforma".
// Espeja el mapeo de TeamAvatarGroup (misma fuente de marcas canónicas GreenhouseBrandLogoMark).
const ENGINE_LOGO_KIND: Record<string, GreenhouseBrandLogoKind> = {
  gemini: 'geminiColor',
  google_ai_overview: 'geminiColor',
  openai: 'gptIsotype',
  anthropic: 'claudeIsologo'
}

const EngineIsotype = ({ provider, size }: { provider: string; size: number }) => {
  const kind = ENGINE_LOGO_KIND[provider]

  if (provider === 'perplexity') return <i className='logos-perplexity-icon' aria-hidden style={{ fontSize: size }} />
  if (kind)
    return (
      <GreenhouseBrandLogoMark
        kind={kind}
        size='small'
        decorative
        sx={{ '& svg, & img': { width: size, height: size } }}
      />
    )

  return <i className='tabler-robot' aria-hidden style={{ fontSize: size }} />
}

// Color de marca por proveedor (identidad de 3ros — NO tokens Greenhouse, espejo de los isotipos). Tiñe la
// barra como canal de IDENTIDAD; el VALOR lo codifican longitud + label (Cleveland-McGill), no el color.
/* eslint-disable greenhouse/no-hardcoded-hex-color -- 3rd-party brand identity colors, no son tokens Greenhouse */
const ENGINE_BRAND_COLOR: Record<string, string> = {
  gemini: '#4285F4',
  google_ai_overview: '#4285F4',
  openai: '#10A37F',
  anthropic: '#D97757',
  perplexity: '#20808D'
}
/* eslint-enable greenhouse/no-hardcoded-hex-color */

// Tick del eje X: el isotipo del motor SUELTO (sin círculo — leen mejor a color, identidad propia);
// foreignObject embebe el HTML dentro del SVG del chart.
const EngineAxisTick = ({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string } }) => (
  <foreignObject x={(x ?? 0) - 16} y={(y ?? 0) + 8} width={32} height={32} style={{ overflow: 'visible' }}>
    <Box
      title={ENGINE_DISPLAY_NAME[payload?.value ?? ''] ?? payload?.value}
      sx={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <EngineIsotype provider={payload?.value ?? ''} size={28} />
    </Box>
  </foreignObject>
)

// ── Severity dot (named, never color-only) ────────────────────────────────────
const SeverityDot = ({ severity }: { severity: GraderReportSeverity }) => (
  <Box
    aria-hidden='true'
    sx={theme => ({
      flexShrink: 0,
      width: 10,
      height: 10,
      borderRadius: '50%',
      bgcolor: severity === 'sin_dato' ? theme.palette.text.disabled : theme.palette[severityThemeColor[severity]].main
    })}
  />
)

const scoreText = (score: number | null): string => (score === null ? '—' : fmt(score))

// Chip de severidad nombrado. `sin_dato` se pinta neutro (outlined), NO con el `secondary` olivo del tema.
const SeverityChip = ({ severity, size }: { severity: GraderReportSeverity; size?: 'small' | 'medium' }) =>
  severity === 'sin_dato' ? (
    <Chip size={size} variant='outlined' label={SEV[severity]} />
  ) : (
    <Chip size={size} variant='tonal' color={severityThemeColor[severity]} label={SEV[severity]} />
  )

// ── Navigator rail (aside region) ─────────────────────────────────────────────
const NavigatorRail = ({
  model,
  selection,
  onSelect,
  plan
}: {
  model: ReportArtifactModel
  selection: Selection
  onSelect: (next: Selection) => void
  plan?: AiVisibilityPlanExtension
}) => (
  <Stack spacing={5} sx={{ minWidth: 0 }}>
    <Stack spacing={2}>
      <Typography variant='overline' color='text.secondary'>
        {C.navigator.dimensionsHeader}
      </Typography>
      <Stack
        component='ul'
        role='listbox'
        aria-label={C.navigator.dimensionsHeader}
        sx={{ listStyle: 'none', p: 0, m: 0 }}
        spacing={1}
      >
        {model.dimensions.map((dim, i) => {
          const selected = selection.type === 'dimension' && selection.key === dim.key

          return (
            <ListItemButton
              key={dim.key}
              component='li'
              role='option'
              selected={selected}
              aria-selected={selected}
              onClick={() => onSelect({ type: 'dimension', key: dim.key })}
              sx={theme => ({
                borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                gap: 3,
                py: 2,
                border: '1px solid',
                borderColor: selected ? 'primary.main' : 'divider'
              })}
            >
              <Typography variant='monoId' color='text.secondary' sx={{ minWidth: 16 }}>
                {i + 1}
              </Typography>
              <Stack sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant='body2'
                  color={selected ? 'text.primary' : 'text.secondary'}
                  sx={{ fontWeight: selected ? 600 : undefined }}
                  noWrap
                >
                  {DIM_LABEL[dim.key]}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {SEV[dim.severity]}
                </Typography>
              </Stack>
              <Typography variant='monoId' color={selected ? 'text.primary' : 'text.secondary'}>
                {scoreText(dim.score)}
              </Typography>
              <SeverityDot severity={dim.severity} />
            </ListItemButton>
          )
        })}
      </Stack>
    </Stack>

    <Divider />

    <Stack spacing={2}>
      <Typography variant='overline' color='text.secondary'>
        {C.navigator.recommendationsHeader}
      </Typography>
      {model.recommendations.length === 0 ? (
        <Typography variant='body2' color='text.secondary'>
          {C.navigator.recommendationsEmpty}
        </Typography>
      ) : (
        <>
          <Stack
            component='ul'
            role='listbox'
            aria-label={C.navigator.recommendationsHeader}
            sx={{ listStyle: 'none', p: 0, m: 0 }}
            spacing={1}
          >
            {model.recommendations.map((rec, i) => {
              const selected = selection.type === 'recommendation' && selection.gapKey === rec.gapKey

              return (
                <ListItemButton
                  key={rec.gapKey}
                  component='li'
                  role='option'
                  selected={selected}
                  aria-selected={selected}
                  onClick={() => onSelect({ type: 'recommendation', gapKey: rec.gapKey })}
                  sx={theme => ({
                    borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                    gap: 3,
                    py: 2,
                    alignItems: 'center',
                    border: '1px solid',
                    borderColor: selected ? 'primary.main' : 'divider'
                  })}
                >
                  <Typography variant='monoId' color='text.secondary' sx={{ minWidth: 16 }}>
                    {i + 1}
                  </Typography>
                  <Stack spacing={1} sx={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
                    <Typography
                      variant='body2'
                      color={selected ? 'text.primary' : 'text.secondary'}
                      sx={{ fontWeight: selected ? 600 : undefined }}
                    >
                      {rec.title}
                    </Typography>
                    {plan ? <PlanStatusChip size='small' status={plan.statuses[rec.gapKey]?.status ?? null} /> : null}
                  </Stack>
                  <SeverityChip size='small' severity={rec.severity} />
                </ListItemButton>
              )
            })}
          </Stack>
          <Typography variant='caption' color='text.secondary'>
            {C.navigator.recommendationsCount(model.recommendations.length, model.recommendations.length)}
          </Typography>
        </>
      )}
    </Stack>
  </Stack>
)

// ── Chart panels (Recharts, honest, a11y) ─────────────────────────────────────
const PanelShell = ({ title, help, children }: { title: string; help?: string; children: ReactNode }) => (
  <Card variant='outlined' sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.md}px`, height: '100%' })}>
    <CardContent>
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant='h5' component='h3'>
          {title}
        </Typography>
        {help ? (
          <Typography variant='caption' color='text.secondary'>
            {help}
          </Typography>
        ) : null}
      </Stack>
      {children}
    </CardContent>
  </Card>
)

const TrendPanel = ({
  current,
  previous,
  tone
}: {
  current: number | null
  previous: number | null
  tone: OperationalStatusTone
}) => {
  const theme = useTheme()
  const accent = tone === 'secondary' ? theme.palette.text.secondary : theme.palette[tone].main
  const hasHistory = current !== null && previous !== null
  const delta = hasHistory ? current - previous : null

  return (
    <PanelShell title={C.detail.trendPanelTitle} help={C.detail.trendPanelHelp}>
      <Stack direction='row' spacing={3} alignItems='baseline' sx={{ mb: 2 }}>
        <Typography variant='kpiValue'>{scoreText(current)}</Typography>
        {delta !== null ? (
          <Typography
            variant='body2'
            sx={{ fontWeight: 600, color: delta > 0 ? 'success.main' : delta < 0 ? 'error.main' : 'text.secondary' }}
          >
            {delta > 0 ? '↑' : delta < 0 ? '↓' : ''} {fmt(Math.abs(delta))} {C.detail.comparePrevious}
          </Typography>
        ) : (
          <Typography variant='body2' color='text.secondary'>
            {C.detail.noPrevious}
          </Typography>
        )}
      </Stack>
      {hasHistory ? (
        <Box
          sx={{ height: 140 }}
          role='img'
          aria-label={`${C.detail.trendPanelTitle}: ${C.detail.trendAxisPrevious} ${fmt(previous)}, ${C.detail.trendAxisCurrent} ${fmt(current)}`}
        >
          <AppRecharts sx={{ height: '100%', width: '100%' }}>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart
                data={[
                  { label: C.detail.trendAxisPrevious, value: previous },
                  { label: C.detail.trendAxisCurrent, value: current }
                ]}
                margin={{ top: 8, right: 12, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient id='clientTrendFill' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor={accent} stopOpacity={0.24} />
                    <stop offset='100%' stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey='label' tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={32} />
                <Area
                  type='monotone'
                  dataKey='value'
                  stroke={accent}
                  strokeWidth={2}
                  fill='url(#clientTrendFill)'
                  dot
                />
              </AreaChart>
            </ResponsiveContainer>
          </AppRecharts>
        </Box>
      ) : (
        <Box
          sx={theme => ({
            height: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            backgroundColor: theme.palette.action.hover,
            px: 4
          })}
        >
          <Typography variant='body2' color='text.secondary' textAlign='center'>
            {C.detail.trendNoHistory}
          </Typography>
        </Box>
      )}
    </PanelShell>
  )
}

const PlatformPanel = ({ model }: { model: ReportArtifactModel }) => {
  const theme = useTheme()
  const engines = model.engineSnapshot ?? []

  if (engines.length === 0) return null

  const data = engines.map(e => ({
    provider: e.provider,
    name: ENGINE_DISPLAY_NAME[e.provider] ?? e.provider.charAt(0).toUpperCase() + e.provider.slice(1),
    value: e.present,
    resolved: e.resolved
  }))

  const maxResolved = Math.max(...engines.map(e => e.resolved), 1)
  const ariaSummary = data.map(d => `${d.name} ${d.value} ${C.detail.platformOf} ${d.resolved}`).join('; ')

  return (
    <PanelShell title={C.detail.platformPanelTitle} help={C.detail.platformPanelHelp}>
      <Box sx={{ height: 210 }} role='img' aria-label={`${C.detail.platformPanelAria}: ${ariaSummary}`}>
        <AppRecharts sx={{ height: '100%', width: '100%' }}>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={data} margin={{ top: 20, right: 8, left: -24, bottom: 0 }}>
              <XAxis
                dataKey='provider'
                tickLine={false}
                axisLine={false}
                interval={0}
                height={48}
                tick={<EngineAxisTick />}
              />
              <YAxis domain={[0, maxResolved]} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Bar dataKey='value' radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false}>
                <LabelList dataKey='value' position='top' />
                {data.map(d => (
                  <Cell key={d.provider} fill={ENGINE_BRAND_COLOR[d.provider] ?? theme.palette.primary.main} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AppRecharts>
      </Box>
    </PanelShell>
  )
}

// ── Signal tiles (señales de respaldo, honest) ────────────────────────────────
type SignalVisual =
  | { kind: 'progress'; value: number | null; tone: 'primary' | 'success' | 'warning' }
  | { kind: 'dots'; active: number; total: number }
  | { kind: 'rank'; value: string }

const clampPercent = (value: number | null): number => (value === null ? 0 : Math.max(0, Math.min(100, value)))

const SignalVisualCue = ({ visual }: { visual: SignalVisual }) => {
  if (visual.kind === 'dots') {
    const total = Math.max(visual.total, 1)

    return (
      <Box sx={{ display: 'flex', gap: 1 }} aria-hidden='true'>
        {Array.from({ length: total }).map((_, index) => (
          <Box
            key={index}
            sx={theme => ({
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: index < visual.active ? theme.palette.primary.main : theme.palette.action.selected
            })}
          />
        ))}
      </Box>
    )
  }

  if (visual.kind === 'rank') {
    return (
      <Box
        aria-hidden='true'
        sx={theme => ({
          minWidth: 34,
          height: 24,
          px: 2,
          borderRadius: '9999px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme.palette.action.hover,
          color: theme.palette.text.secondary,
          ...theme.typography.monoId
        })}
      >
        {visual.value}
      </Box>
    )
  }

  return (
    <Box
      aria-hidden='true'
      sx={theme => ({
        width: 76,
        height: 6,
        flexShrink: 0,
        borderRadius: '9999px',
        bgcolor: theme.palette.action.hover,
        overflow: 'hidden'
      })}
    >
      <Box
        sx={theme => ({
          width: `${clampPercent(visual.value)}%`,
          height: '100%',
          borderRadius: 'inherit',
          bgcolor: theme.palette[visual.tone].main
        })}
      />
    </Box>
  )
}

const SignalTile = ({
  label,
  value,
  help,
  visual
}: {
  label: string
  value: string
  help: string
  visual: SignalVisual
}) => (
  <Card variant='outlined' sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.md}px`, height: '100%' })}>
    <CardContent sx={{ p: 3 }}>
      <Stack spacing={2} sx={{ minHeight: 116 }}>
        <Stack direction='row' spacing={2} alignItems='baseline' justifyContent='space-between'>
          <Typography
            variant={value === C.signals.noData ? 'body2' : 'kpiValue'}
            color={value === C.signals.noData ? 'text.secondary' : 'text.primary'}
          >
            {value}
          </Typography>
          <SignalVisualCue visual={visual} />
        </Stack>
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Typography variant='h5' component='h4'>
            {label}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {help}
          </Typography>
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

const SignalTiles = ({ model }: { model: ReportArtifactModel }) => {
  const citation =
    model.citationInsight.ownDomainShare === null
      ? C.signals.noData
      : `${fmt(Math.round(model.citationInsight.ownDomainShare))}%`

  const citationValue =
    model.citationInsight.ownDomainShare === null ? null : Math.round(model.citationInsight.ownDomainShare)

  const sentiment =
    model.sentimentSummary.evaluated > 0
      ? `${fmt(Math.round((model.sentimentSummary.positive / model.sentimentSummary.evaluated) * 100))}%`
      : C.signals.noData

  const sentimentValue =
    model.sentimentSummary.evaluated > 0
      ? Math.round((model.sentimentSummary.positive / model.sentimentSummary.evaluated) * 100)
      : null

  const engines = model.engineSnapshot ?? []
  const enginesActive = engines.filter(e => e.present > 0).length

  const enginesMentioning = engines.length > 0 ? `${fmt(enginesActive)} / ${fmt(engines.length)}` : C.signals.noData

  const position = model.positionSummary.average === null ? C.signals.noData : `#${fmt(model.positionSummary.average)}`

  const competitorTotal = model.competitiveSov.competitors.reduce((sum, c) => sum + c.mentions, 0)
  const sovDenom = model.competitiveSov.brandMentions + competitorTotal

  const sov =
    sovDenom > 0 ? `${fmt(Math.round((model.competitiveSov.brandMentions / sovDenom) * 100))}%` : C.signals.noData

  const sovValue = sovDenom > 0 ? Math.round((model.competitiveSov.brandMentions / sovDenom) * 100) : null

  const tiles: Array<{ label: string; value: string; help: string; visual: SignalVisual }> = [
    {
      label: C.signals.citationTitle,
      value: citation,
      help: C.signals.citationHelp,
      visual: { kind: 'progress', value: citationValue, tone: 'warning' }
    },
    {
      label: C.signals.sentimentTitle,
      value: sentiment,
      help: C.signals.sentimentHelp,
      visual: { kind: 'progress', value: sentimentValue, tone: 'success' }
    },
    {
      label: C.signals.enginesTitle,
      value: enginesMentioning,
      help: C.signals.enginesHelp,
      visual: { kind: 'dots', active: enginesActive, total: engines.length }
    },
    {
      label: C.signals.positionTitle,
      value: position,
      help: C.signals.positionHelp,
      visual: { kind: 'rank', value: position }
    },
    {
      label: C.signals.sovTitle,
      value: sov,
      help: C.signals.sovHelp,
      visual: { kind: 'progress', value: sovValue, tone: 'primary' }
    }
  ]

  return (
    <Stack spacing={2}>
      <Typography variant='h5' component='h3'>
        {C.detail.signalsTitle}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            xl: 'repeat(5, minmax(0, 1fr))'
          }
        }}
      >
        {tiles.map(t => (
          <SignalTile key={t.label} label={t.label} value={t.value} help={t.help} visual={t.visual} />
        ))}
      </Box>
    </Stack>
  )
}

// ── Detail canvas (primary region — the rich pane) ────────────────────────────
const DetailCanvas = ({
  model,
  selection,
  plan,
  hideSupport
}: {
  model: ReportArtifactModel
  selection: Selection
  plan?: AiVisibilityPlanExtension
  hideSupport?: boolean
}) => {
  const theme = useTheme()

  const rec =
    selection.type === 'recommendation' ? model.recommendations.find(r => r.gapKey === selection.gapKey) : undefined

  const recIndex = rec ? model.recommendations.findIndex(r => r.gapKey === rec.gapKey) + 1 : 0

  // Dimensión relevante: la que origina la recomendación, o la seleccionada.
  const dimKey = rec ? rec.dimensionKey : selection.type === 'dimension' ? selection.key : undefined

  const dim = dimKey ? model.dimensions.find(d => d.key === dimKey) : undefined

  const severity = rec?.severity ?? dim?.severity ?? 'sin_dato'

  const eyebrow = rec
    ? C.detail.recommendationEyebrow(recIndex, model.recommendations.length)
    : C.detail.dimensionEyebrow

  const title = rec ? rec.title : dim ? DIM_LABEL[dim.key] : ''
  const lead = rec ? rec.action : dim ? DIM_EXPLAINER[dim.key] : ''
  const relatedScorePercent = clampPercent(dim?.score ?? null)

  // Tendencia honesta de la dimensión relevante (run-over-run del snapshot).
  const dimTrend =
    model.trend.status === 'con_tendencia' && dim ? model.trend.dimensions.find(d => d.key === dim.key) : undefined

  return (
    <Card
      variant='outlined'
      data-capture='client-ai-visibility-detail'
      sx={{ borderRadius: `${theme.shape.customBorderRadius.lg}px`, height: '100%' }}
    >
      <CardContent sx={{ p: { xs: 4, md: 6 } }}>
        <Stack spacing={6}>
          {/* Header — eyebrow + chip, luego título a ancho completo, score relacionado como stat-card aparte */}
          <Stack spacing={4}>
            <Stack direction='row' spacing={3} alignItems='center' justifyContent='space-between'>
              <Typography variant='overline' color='primary.main'>
                {eyebrow}
              </Typography>
              <SeverityChip severity={severity} />
            </Stack>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={4}
              alignItems={{ xs: 'stretch', md: 'flex-start' }}
              justifyContent='space-between'
            >
              <Stack spacing={2} sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant='h5' component='h2'>
                  {title}
                </Typography>
                <Typography variant='body1' color='text.secondary'>
                  {lead}
                </Typography>
                {rec ? (
                  <Stack direction='row' spacing={1} alignItems='center' sx={{ color: 'text.secondary' }}>
                    <i className='tabler-users' aria-hidden='true' />
                    <Typography variant='caption' color='text.secondary'>
                      {C.detail.planAgencyNote}
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>
              {dim ? (
                <Box
                  sx={theme => ({
                    flexShrink: 0,
                    minWidth: { xs: '100%', md: 260 },
                    maxWidth: { md: 320 },
                    p: 3,
                    borderRadius: `${theme.shape.customBorderRadius.md}px`,
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.paper
                  })}
                >
                  <Stack spacing={2}>
                    <Typography variant='overline' color='text.secondary'>
                      {C.detail.relatedScoreLabel}
                    </Typography>
                    <Stack direction='row' spacing={1} alignItems='baseline'>
                      <Typography variant='kpiValue'>{scoreText(dim.score)}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {C.detail.scoreOutOf}
                      </Typography>
                    </Stack>
                    <Box
                      aria-hidden='true'
                      sx={theme => ({
                        height: 6,
                        borderRadius: '9999px',
                        bgcolor: theme.palette.action.hover,
                        overflow: 'hidden'
                      })}
                    >
                      <Box
                        sx={theme => ({
                          width: `${relatedScorePercent}%`,
                          height: '100%',
                          borderRadius: 'inherit',
                          bgcolor:
                            dim.severity === 'sin_dato'
                              ? theme.palette.text.disabled
                              : theme.palette[severityThemeColor[dim.severity]].main
                        })}
                      />
                    </Box>
                    <Stack spacing={0.5}>
                      <Typography variant='h5' component='p'>
                        {DIM_LABEL[dim.key]}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {C.detail.relatedScoreHelp}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              ) : null}
            </Stack>
          </Stack>

          {/* Estado de ejecución del Plan AEO (solo vista operador — write TASK-1275) */}
          {plan && rec ? (
            <PlanStatusSection
              key={rec.gapKey}
              current={plan.statuses[rec.gapKey] ?? null}
              busy={plan.busyGapKey === rec.gapKey}
              onSetStatus={(status, reason) => plan.onSetStatus(rec.gapKey, status, reason)}
            />
          ) : null}

          {/* Charts row */}
          <Box
            sx={{
              display: 'grid',
              gap: 5,
              gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }
            }}
          >
            <TrendPanel
              current={dimTrend?.current ?? dim?.score ?? model.overallScore}
              previous={dimTrend?.previous ?? null}
              tone={severityThemeColor[severity]}
            />
            <PlatformPanel model={model} />
          </Box>

          {/* ¿Por qué importa? */}
          {dim ? (
            <Box
              sx={theme => ({
                display: 'flex',
                gap: 4,
                p: 4,
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                backgroundColor: theme.palette.action.hover
              })}
            >
              <Box
                aria-hidden='true'
                sx={theme => ({
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.palette.primary.main,
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`
                })}
              >
                <i className='tabler-star' />
              </Box>
              <Stack spacing={1}>
                <Typography variant='h5' component='h3'>
                  {C.detail.whyItMatters}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {DIM_EXPLAINER[dim.key]}
                </Typography>
              </Stack>
            </Box>
          ) : null}

          {/* Señales de respaldo */}
          <SignalTiles model={model} />

          {/* Soporte contextual (NO venta — cliente ya contrató AEO; oculto en la vista operador) */}
          {hideSupport ? null : (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent='space-between'
            data-capture='client-ai-visibility-actions'
            sx={theme => ({ pt: 4, borderTop: `1px solid ${theme.palette.divider}` })}
          >
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography variant='h5' component='h3'>
                {C.support.title}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {C.support.body}
              </Typography>
            </Stack>
            <Button
              variant='tonal'
              startIcon={<i className='tabler-message-2' />}
              href='mailto:hola@efeonce.com'
              aria-label={C.support.ariaLabel}
              sx={{ flexShrink: 0 }}
            >
              {C.support.action}
            </Button>
          </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

// ── Top strip + compact overall summary ───────────────────────────────────────
const SummaryStrip = ({
  model,
  organizationName,
  asOfLabel,
  breadcrumbItems
}: {
  model: ReportArtifactModel
  organizationName: string
  asOfLabel: string | null
  breadcrumbItems?: GreenhouseBreadcrumbItem[]
}) => {
  const overall = model.trend.status === 'con_tendencia' ? model.trend.overall : null
  const delta = overall?.delta ?? null
  const engines = engineBrands(model)

  return (
    <Stack spacing={3} data-capture='client-ai-visibility-overview'>
      <GreenhouseBreadcrumbs
        items={
          breadcrumbItems ?? [
            { label: C.page.breadcrumbRoot, href: '/home' },
            { label: C.page.breadcrumbLeaf }
          ]
        }
      />
      <Stack direction='row' spacing={3} alignItems='center' justifyContent='space-between' flexWrap='wrap' useFlexGap>
        <Stack direction='row' spacing={3} alignItems='center' flexWrap='wrap' useFlexGap>
          <Typography variant='surfaceHeroTitle' component='h1'>
            {C.page.title}
          </Typography>
          <Chip
            variant='tonal'
            color='primary'
            icon={<i className='tabler-building' />}
            label={organizationName}
            aria-label={C.page.orgChipAria}
          />
        </Stack>
        {asOfLabel ? (
          <Stack direction='row' spacing={1} alignItems='center' sx={{ color: 'text.secondary' }}>
            <i className='tabler-calendar' aria-hidden='true' />
            <Typography variant='body2' color='text.secondary'>
              {C.page.asOfLabel} {asOfLabel}
            </Typography>
          </Stack>
        ) : null}
      </Stack>

      <Card variant='outlined' sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.lg}px` })}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={4}
            alignItems={{ xs: 'flex-start', lg: 'center' }}
            justifyContent='space-between'
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 4, md: 6 }}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              divider={<Divider orientation='vertical' flexItem sx={{ display: { xs: 'none', md: 'block' } }} />}
            >
              <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography variant='overline' color='text.secondary'>
                  {C.summary.scoreLabel}
                </Typography>
                <Stack direction='row' spacing={2} alignItems='baseline' flexWrap='wrap' useFlexGap>
                  <Typography variant='kpiValue'>{scoreText(model.overallScore)}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {C.summary.scoreOutOf}
                  </Typography>
                  <SeverityChip severity={model.overallSeverity} />
                </Stack>
                <Typography variant='caption' color='text.secondary'>
                  {delta !== null
                    ? `${delta > 0 ? '↑' : delta < 0 ? '↓' : ''} ${fmt(Math.abs(delta))} ${C.summary.comparePrevious}`.trim()
                    : C.summary.noPrevious}
                </Typography>
              </Stack>
              <Stack direction='row' spacing={6} flexWrap='wrap' useFlexGap>
                <Stack spacing={0.5}>
                  <Typography variant='overline' color='text.secondary'>
                    {C.summary.perceptionAxisLabel}
                  </Typography>
                  <Typography variant='monoId'>{scoreText(model.perceptionAxisScore)}</Typography>
                </Stack>
                <Stack spacing={0.5}>
                  <Typography variant='overline' color='text.secondary'>
                    {C.summary.agenticAxisLabel}
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ pt: 1.5 }}>
                    {C.summary.agenticCoverage}
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
            {engines.length > 0 ? <TeamAvatarGroup brands={engines} label={C.summary.evaluatedOn} size={40} /> : null}
          </Stack>
        </CardContent>
      </Card>
      <Typography variant='caption' color='text.secondary'>
        {C.page.samplingNote}
      </Typography>
    </Stack>
  )
}

export interface AiVisibilityClientReportViewProps {
  model: ReportArtifactModel
  organizationName: string
  asOfLabel: string | null
  /** TASK-1276 — chrome propio de la superficie operador (breadcrumb + sin bloque de soporte). */
  chrome?: AiVisibilityReportChrome
  /** TASK-1276 — control de estado del Plan AEO (solo operador; ausente = workbench cliente puro). */
  plan?: AiVisibilityPlanExtension
}

const AiVisibilityClientReportView = ({
  model,
  organizationName,
  asOfLabel,
  chrome,
  plan
}: AiVisibilityClientReportViewProps) => {
  // Default: la brecha principal (primaryGap) si existe; sino la primera recomendación; sino la 1.ª dimensión.
  const defaultSelection = useMemo<Selection>(() => {
    if (model.primaryGap) {
      const rec = model.recommendations.find(r => r.gapKey === model.primaryGap?.gapKey)

      if (rec) return { type: 'recommendation', gapKey: rec.gapKey }
    }

    if (model.recommendations.length > 0) return { type: 'recommendation', gapKey: model.recommendations[0].gapKey }
    if (model.dimensions.length > 0) return { type: 'dimension', key: model.dimensions[0].key }

    return { type: 'dimension', key: 'ai_visibility' }
  }, [model])

  const [selection, setSelection] = useState<Selection>(defaultSelection)

  return (
    <Stack spacing={6} sx={{ p: { xs: 4, md: 6 }, minWidth: 0 }} data-capture='client-ai-visibility-report'>
      <SummaryStrip
        model={model}
        organizationName={organizationName}
        asOfLabel={asOfLabel}
        breadcrumbItems={chrome?.breadcrumbItems}
      />

      <CompositionShell
        composition='masterDetail'
        instanceId='client-ai-visibility'
        asideLabel={C.navigator.ariaLabel}
        detailLabel={C.detail.openDetail}
        regions={{
          aside: <NavigatorRail model={model} selection={selection} onSelect={setSelection} plan={plan} />,
          primary: (
            <DetailCanvas model={model} selection={selection} plan={plan} hideSupport={chrome?.hideSupport} />
          )
        }}
      />
    </Stack>
  )
}

export default AiVisibilityClientReportView
