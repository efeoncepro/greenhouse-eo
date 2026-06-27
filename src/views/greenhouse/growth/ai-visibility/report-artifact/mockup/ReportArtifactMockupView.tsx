'use client'

// Mockup harness for the AI Visibility Report Artifact — WEB adapter (TASK-1252).
// Concept A "Executive cockpit" (product-design-loop): score gauge + 5-level
// readiness ladder + premium chart grid (dimensions radar tú-vs-benchmark,
// competitive Share of Voice, visibility trend) + sentiment. 5-level framework
// spine (Be Found / Readable / Correct / Actionable / Intrinsic). Tokens only
// (no raw hex / no inline fontSize); score gauge = inline SVG, dimensions radar =
// Recharts, trend = MetricTrendCard primitive. Brand = Efeonce SSOT (institutional
// artifact); header dates use the canonical GreenhouseDatePicker.

import { useState, useEffect } from 'react'

import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip
} from '@/libs/Recharts'
import AppRecharts from '@/libs/styles/AppRecharts'
import { GreenhouseBrandLogoMark, type GreenhouseBrandLogoKind } from '@/components/greenhouse/primitives'
import GreenhouseDatePicker from '@/components/greenhouse/GreenhouseDatePicker'
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import { resolveBrandAssets } from '@/components/greenhouse/brand-assets'
import useReducedMotion from '@/hooks/useReducedMotion'

import {
  LEVELS,
  REPORT_COPY,
  REPORT_VM,
  STATE_COPY,
  STATE_OPTIONS,
  VARIANT_OPTIONS,
  type ArtifactState,
  type ArtifactVariant,
  type ReportLevelVM,
  type ReportSeverity
} from './mock-data'

type MuiColor = 'success' | 'warning' | 'error' | 'secondary' | 'primary' | 'info'

const severityColor = (sev: ReportSeverity): MuiColor => {
  switch (sev) {
    case 'optimo':
      return 'success'
    case 'medium':
    case 'attention':
      return 'warning'
    case 'high':
    case 'critical':
      return 'error'
    default:
      return 'secondary'
  }
}

const severityIcon = (sev: ReportSeverity): string => {
  switch (sev) {
    case 'optimo':
      return 'tabler-circle-check'
    case 'high':
    case 'critical':
      return 'tabler-arrow-up-right'
    case 'medium':
    case 'attention':
      return 'tabler-alert-triangle'
    default:
      return 'tabler-minus'
  }
}

// Higher = better visibility → green is correct semantics here (semáforo).
const scoreTone = (score: number): MuiColor => (score >= 70 ? 'success' : score >= 55 ? 'warning' : 'error')

// Entrance "se arma": el dato se construye al montar (count-up + barras dibujándose).
// Reduced-motion → estado final inmediato (never-hidden, honesto). Compositor-only (transform).
const useEntrance = (): boolean => {
  const reduced = useReducedMotion()
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (reduced) {
      setEntered(true)

      return
    }

    const t = setTimeout(() => setEntered(true), 60)

    return () => clearTimeout(t)
  }, [reduced])

  return entered
}

// dataviz "AI insight" annotation — narrativa de <12 palabras bajo un chart.
const InsightLine = ({ text }: { text: string }) => (
  <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ mt: 3 }} role='note'>
    <Box sx={{ color: 'primary.main', mt: 0.25 }}>
      <i className='tabler-bulb' />
    </Box>
    <Typography variant='body2' color='text.secondary'>
      {text}
    </Typography>
  </Stack>
)

const SeverityChip = ({ sev }: { sev: ReportSeverity }) => (
  <Chip
    size='small'
    variant='tonal'
    color={severityColor(sev)}
    icon={<i className={severityIcon(sev)} />}
    label={REPORT_COPY.severity[sev]}
  />
)

const SectionCard = ({
  ordinal,
  title,
  action,
  children,
  dataCapture
}: {
  ordinal?: string
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  dataCapture?: string
}) => (
  <Card variant='outlined' sx={{ height: '100%' }} data-capture={dataCapture}>
    <CardContent>
      <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2} sx={{ mb: 4 }}>
        <Stack direction='row' alignItems='baseline' spacing={2}>
          {ordinal ? (
            <Typography variant='overline' color='text.disabled'>
              {ordinal}
            </Typography>
          ) : null}
          <Typography variant='h5'>{title}</Typography>
        </Stack>
        {action}
      </Stack>
      {children}
    </CardContent>
  </Card>
)

// ── Answer engines (who cites) ───────────────────────────────────────────────

type EngineEntry = { name: string; kind?: GreenhouseBrandLogoKind; iconClass?: string }

const ENGINES: EngineEntry[] = [
  { name: 'ChatGPT', kind: 'gptIsotype' },
  { name: 'Claude', kind: 'claudeIsologo' },
  // Perplexity full-color official mark (iconify logos — AXIS set has no Perplexity).
  { name: 'Perplexity', iconClass: 'logos-perplexity-icon' },
  // Gemini multicolor sparkle (new AXIS kind: official sparkle path + Gemini gradient).
  { name: 'Gemini', kind: 'geminiColor' }
]

// 36px circle; logos render ~20px (AXIS small mark = 28px → scale down to fit cleanly).
const EngineBadge = ({ engine, dimmed }: { engine: EngineEntry; dimmed: boolean }) => (
  <Box
    role='img'
    aria-label={engine.name}
    sx={theme => ({
      width: 36,
      height: 36,
      borderRadius: '50%',
      border: `1px solid ${theme.palette.divider}`,
      backgroundColor: 'var(--mui-palette-background-paper)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      opacity: dimmed ? 0.35 : 1
    })}
  >
    {engine.iconClass ? (
      <i className={`${engine.iconClass} text-[20px]`} />
    ) : engine.kind ? (
      <Box sx={{ display: 'inline-flex', transform: 'scale(0.72)' }}>
        <GreenhouseBrandLogoMark kind={engine.kind} size='small' decorative />
      </Box>
    ) : (
      <Typography variant='caption' sx={{ fontWeight: 700 }} color='text.secondary'>
        {engine.name.charAt(0)}
      </Typography>
    )}
  </Box>
)

const EnginesStrip = ({ partial }: { partial: boolean }) => (
  <Stack direction='row' spacing={2}>
    {ENGINES.map((e, i) => (
      <EngineBadge key={e.name} engine={e} dimmed={partial && i === ENGINES.length - 1} />
    ))}
  </Stack>
)

// ── Hero — Score gauge + executive verdict ───────────────────────────────────

const ScoreGauge = ({ value, tone }: { value: number; tone: MuiColor }) => {
  const theme = useTheme()
  const reduced = useReducedMotion()
  const entered = useEntrance()
  const r = 96
  const cx = 120
  const cy = 120
  const arcLen = Math.PI * r
  const f = Math.max(0, Math.min(1, value / 100))
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 260, mx: 'auto' }} role='img' aria-label={`Visibilidad estimada ${value} de 100`}>
      <Box component='svg' viewBox='0 0 240 132' sx={{ width: '100%', display: 'block' }}>
        <path d={arcPath} fill='none' stroke={theme.palette.divider} strokeWidth={16} strokeLinecap='round' />
        <path
          d={arcPath}
          fill='none'
          stroke={theme.palette[tone].main}
          strokeWidth={16}
          strokeLinecap='round'
          strokeDasharray={`${(entered ? f : 0) * arcLen} ${arcLen}`}
          style={{ transition: reduced ? 'none' : 'stroke-dasharray 900ms cubic-bezier(0.2, 0, 0, 1)' }}
        />
      </Box>
      <Stack alignItems='center' sx={{ position: 'absolute', insetInline: 0, bottom: 4, pointerEvents: 'none' }}>
        <Stack direction='row' alignItems='baseline' spacing={0.5}>
          <Typography variant='kpiValue' color={`${tone}.main`}>
            <AnimatedCounter value={value} format='integer' animateFrom={0} />
          </Typography>
          <Typography variant='h5' color='text.disabled'>
            /100
          </Typography>
        </Stack>
        <Typography variant='caption' color='text.secondary'>
          {REPORT_COPY.verdict.scoreLabel}
        </Typography>
      </Stack>
    </Box>
  )
}

const ScoreCard = ({ partial }: { partial: boolean }) => {
  const c = REPORT_COPY.verdict
  const tone = severityColor(REPORT_VM.scoreSeverity)

  return (
    <SectionCard ordinal='1' title={c.title} dataCapture='ai-visibility-report-score'>
      <Box sx={{ py: 2 }}>
        <ScoreGauge value={REPORT_VM.score} tone={tone} />
      </Box>
      <Stack alignItems='center' spacing={1} sx={{ mt: 2 }}>
        <SeverityChip sev={REPORT_VM.scoreSeverity} />
        <Typography variant='caption' color='text.secondary' sx={{ textAlign: 'center' }}>
          {c.scoreContext}
        </Typography>
        <Stack direction='row' alignItems='center' spacing={1}>
          <i className='tabler-info-circle' />
          <Typography variant='caption' color='text.disabled'>
            {c.scoreDisclaimer}
          </Typography>
        </Stack>
      </Stack>
      <Divider sx={{ my: 3 }} />
      <Stack spacing={3}>
        <Box>
          <Typography variant='caption' color='text.disabled' sx={{ display: 'block', mb: 2 }}>
            {c.coverageLabel}
          </Typography>
          <EnginesStrip partial={partial} />
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 2 }}>
            {c.coverageValue(partial ? ENGINES.length - 1 : ENGINES.length, ENGINES.length)}
            {partial ? ` · ${c.partialHelper}` : ''}
          </Typography>
        </Box>
        <Stack direction='row' spacing={2} alignItems='center'>
          <i className='tabler-shield-check' />
          <Typography variant='body2' color='text.secondary'>
            {c.contextValue} · {c.contextHelper}
          </Typography>
        </Stack>
      </Stack>
    </SectionCard>
  )
}

// ── Hero — 5-level readiness ladder (the spine) ──────────────────────────────

const LadderNode = ({ level, last }: { level: ReportLevelVM; last: boolean }) => {
  const measured = level.status === 'measured'
  const tone: MuiColor = measured ? severityColor(level.severity) : 'secondary'

  return (
    <Stack direction='row' alignItems='stretch' sx={{ flex: 1, minWidth: 0 }}>
      <Box
        sx={theme => ({
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 196,
          p: 3,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: measured ? 'var(--mui-palette-background-paper)' : 'var(--mui-palette-action-hover)'
        })}
      >
        <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2} sx={{ mb: 3 }}>
          <CustomAvatar skin='light-static' color={measured ? tone : undefined} size={36} variant='circular'>
            <i className={level.icon} />
          </CustomAvatar>
          {measured ? (
            <SeverityChip sev={level.severity} />
          ) : (
            <Chip
              size='small'
              variant='outlined'
              icon={<i className='tabler-clock' />}
              label={REPORT_COPY.levelsBand.coverageBadge}
              sx={{ color: 'text.secondary', borderColor: 'divider', '& .MuiChip-icon': { color: 'text.disabled' } }}
            />
          )}
        </Stack>
        <Typography variant='overline' color='text.disabled' sx={{ lineHeight: 1.3, display: 'block' }}>
          {level.ordinal} · {level.labelEn}
        </Typography>
        <Typography variant='subtitle1' sx={{ fontWeight: 600, lineHeight: 1.25 }}>
          {level.label}
        </Typography>
        <Box sx={{ flex: 1 }} />
        {measured && level.score != null ? (
          <Stack direction='row' alignItems='baseline' spacing={0.5}>
            <Typography variant='h4' color={`${tone}.main`}>
              {level.score}
            </Typography>
            <Typography variant='caption' color='text.disabled'>
              /100
            </Typography>
          </Stack>
        ) : (
          <Typography variant='caption' color='text.secondary'>
            {level.coverageNote}
          </Typography>
        )}
      </Box>
      {!last ? (
        <Stack justifyContent='center' sx={{ px: 0.5, color: 'text.disabled', display: { xs: 'none', md: 'flex' } }}>
          <i className='tabler-chevron-right' />
        </Stack>
      ) : null}
    </Stack>
  )
}

const ReadinessLadder = () => (
  <SectionCard
    ordinal='2'
    title={REPORT_COPY.levelsBand.title}
    dataCapture='ai-visibility-report-levels'
    action={
      <Stack direction='row' spacing={2} sx={{ display: { xs: 'none', lg: 'flex' } }}>
        <Chip size='small' variant='tonal' color='primary' icon={<i className='tabler-eye' />} label={REPORT_COPY.levelsBand.perceptionAxis} />
        <Chip size='small' variant='tonal' color='info' icon={<i className='tabler-robot' />} label={REPORT_COPY.levelsBand.agenticAxis} />
      </Stack>
    }
  >
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 3, md: 0 }} alignItems='stretch'>
      {LEVELS.map((level, i) => (
        <LadderNode key={level.id} level={level} last={i === LEVELS.length - 1} />
      ))}
    </Stack>
  </SectionCard>
)

// ── Dimensions radar (tú vs benchmark) ───────────────────────────────────────

const DimensionsRadar = () => {
  const theme = useTheme()
  const data = REPORT_VM.dimensions.map(d => ({ axis: d.shortLabel, brand: d.score ?? 0, benchmark: d.benchmark }))

  return (
    <SectionCard title={REPORT_COPY.dimensions.title} dataCapture='ai-visibility-report-dimensions'>
      <AppRecharts>
        <Box sx={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width='100%' height='100%'>
            <RadarChart data={data} outerRadius='72%'>
              <PolarGrid />
              <PolarAngleAxis dataKey='axis' />
              <Radar name='Benchmark' dataKey='benchmark' stroke={theme.palette.secondary.main} fill={theme.palette.secondary.main} fillOpacity={0.08} />
              <Radar name='Tu marca' dataKey='brand' stroke={theme.palette.primary.main} fill={theme.palette.primary.main} fillOpacity={0.28} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </Box>
      </AppRecharts>
      <InsightLine text={REPORT_COPY.insights.dimensions} />
    </SectionCard>
  )
}

// ── Multi-engine visibility trend ────────────────────────────────────────────

const MultiEngineTrend = () => {
  const theme = useTheme()

  const lines: { key: string; color: string }[] = [
    { key: 'ChatGPT', color: theme.palette.success.main },
    { key: 'Claude', color: theme.palette.warning.main },
    { key: 'Perplexity', color: theme.palette.info.main },
    { key: 'Gemini', color: theme.palette.primary.main }
  ]

  return (
    <SectionCard title={REPORT_COPY.signals.engineTrendTitle} dataCapture='ai-visibility-report-engine-trend'>
      <AppRecharts>
        <Box sx={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={REPORT_VM.engineTrend} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
              <CartesianGrid stroke={theme.palette.divider} strokeDasharray='4 4' vertical={false} />
              <XAxis dataKey='date' tickLine={false} axisLine={{ stroke: theme.palette.divider }} tickMargin={8} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} width={36} tickFormatter={v => `${v}`} />
              <RTooltip />
              <Legend iconType='circle' />
              {lines.map(l => (
                <Line
                  key={l.key}
                  type='monotone'
                  dataKey={l.key}
                  stroke={l.color}
                  strokeWidth={2.5}
                  dot={{ r: 2, strokeWidth: 0, fill: l.color }}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </AppRecharts>
      <Typography variant='caption' color='text.disabled' sx={{ display: 'block', mt: 1 }}>
        {REPORT_COPY.signals.engineTrendAxis}
      </Typography>
    </SectionCard>
  )
}

// ── Per-engine visibility snapshot (public, no history) ──────────────────────

const PerEngineSnapshot = () => {
  const entered = useEntrance()
  const rows = [...REPORT_VM.engineSnapshot].sort((a, b) => b.score - a.score)
  const spread = rows[0].score - rows[rows.length - 1].score
  const engineOf = (name: string): EngineEntry => ENGINES.find(e => e.name === name) ?? { name }

  return (
    <SectionCard
      title={REPORT_COPY.engines.snapshotTitle}
      dataCapture='ai-visibility-report-engine-snapshot'
      action={<Chip size='small' variant='tonal' color='primary' label={`${REPORT_COPY.engines.spreadLabel}: ${spread} pts`} />}
    >
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 4 }}>
        {REPORT_COPY.engines.snapshotHelper}
      </Typography>
      <Stack spacing={4}>
        {rows.map(r => {
          const tone = scoreTone(r.score)

          return (
            <Stack key={r.name} direction='row' spacing={3} alignItems='center'>
              <EngineBadge engine={engineOf(r.name)} dimmed={false} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction='row' alignItems='baseline' justifyContent='space-between' sx={{ mb: 1 }}>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {r.name}
                  </Typography>
                  <Stack direction='row' alignItems='baseline' spacing={0.5}>
                    <Typography variant='monoAmount' color={`${tone}.main`}>
                      {r.score}
                    </Typography>
                    <Typography variant='caption' color='text.disabled'>
                      /100
                    </Typography>
                  </Stack>
                </Stack>
                <LinearProgress
                  variant='determinate'
                  value={entered ? r.score : 0}
                  color={tone}
                  sx={{ height: 8, borderRadius: 1 }}
                  aria-label={`${r.name}: ${r.score} de 100`}
                />
              </Box>
            </Stack>
          )
        })}
      </Stack>
      <InsightLine text={REPORT_COPY.insights.engines} />
      <Divider sx={{ my: 4 }} />
      <Stack direction='row' spacing={2} alignItems='flex-start'>
        <i className='tabler-message-question' />
        <Typography variant='body2' color='text.secondary'>
          {REPORT_COPY.engines.promptCoverage(REPORT_VM.promptCoverage.appeared, REPORT_VM.promptCoverage.asked)}
        </Typography>
      </Stack>
    </SectionCard>
  )
}

// ── Competitive Share of Voice ───────────────────────────────────────────────

const CompetitiveSov = () => {
  const entered = useEntrance()
  const sov = REPORT_VM.competitiveSov

  const rows = [
    { name: sov.brandName, mentions: sov.brandMentions, isBrand: true },
    ...sov.competitors.map(comp => ({ name: comp.name, mentions: comp.mentions, isBrand: false }))
  ].sort((a, b) => b.mentions - a.mentions)

  const total = rows.reduce((sum, r) => sum + r.mentions, 0)
  const brandShare = Math.round((sov.brandMentions / total) * 100)

  return (
    <SectionCard
      title={REPORT_COPY.sov.title}
      dataCapture='ai-visibility-report-sov'
      action={<Chip size='small' variant='tonal' color='primary' label={`${REPORT_COPY.sov.shareLabel}: ${brandShare}%`} />}
    >
      <Stack spacing={3} sx={{ mt: 1 }}>
        {rows.map(r => {
          const share = Math.round((r.mentions / total) * 100)
          const initial = (r.name.split(' ').pop() ?? r.name).charAt(0).toUpperCase()

          return (
            <Box key={r.name}>
              <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2} sx={{ mb: 1 }}>
                <Stack direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
                  <CustomAvatar skin='light-static' color={r.isBrand ? 'primary' : undefined} size={28} variant='circular'>
                    <Typography variant='caption' sx={{ fontWeight: 700 }}>
                      {initial}
                    </Typography>
                  </CustomAvatar>
                  <Typography variant='body2' sx={{ fontWeight: r.isBrand ? 700 : 400 }} noWrap>
                    {r.name}
                  </Typography>
                  {r.isBrand ? <Chip size='small' variant='tonal' color='primary' label={REPORT_COPY.sov.brandLabel} /> : null}
                </Stack>
                <Typography variant='monoAmount'>{share}%</Typography>
              </Stack>
              <LinearProgress
                variant='determinate'
                value={entered ? share : 0}
                color='primary'
                sx={{
                  height: 8,
                  borderRadius: 1,
                  ...(r.isBrand ? {} : { '& .MuiLinearProgress-bar': { backgroundColor: 'var(--mui-palette-text-disabled)' } })
                }}
                aria-label={`${r.name}: ${share} por ciento share of voice, ${r.mentions} menciones`}
              />
            </Box>
          )
        })}
      </Stack>
      <InsightLine text={REPORT_COPY.insights.sov} />
    </SectionCard>
  )
}

// ── Sentiment (segmented) + KPI tiles ────────────────────────────────────────

const SentimentCard = () => {
  const s = REPORT_VM.signals.sentiment

  const segs: { label: string; value: number; bg: string }[] = [
    { label: REPORT_COPY.signals.sentimentLabels.positive, value: s.positive, bg: 'success.main' },
    { label: REPORT_COPY.signals.sentimentLabels.neutral, value: s.neutral, bg: 'var(--mui-palette-text-disabled)' },
    { label: REPORT_COPY.signals.sentimentLabels.negative, value: s.negative, bg: 'error.main' }
  ]

  return (
    <SectionCard
      title={REPORT_COPY.signals.sentimentTitle}
      dataCapture='ai-visibility-report-sentiment'
    >
      <Box
        role='img'
        aria-label={`Sentimiento: positivo ${s.positive} por ciento, neutral ${s.neutral} por ciento, negativo ${s.negative} por ciento`}
        sx={theme => ({ display: 'flex', height: 16, borderRadius: `${theme.shape.customBorderRadius.sm}px`, overflow: 'hidden' })}
      >
        {segs.map(seg => (
          <Box key={seg.label} sx={{ width: `${seg.value}%`, backgroundColor: seg.bg }} />
        ))}
      </Box>
      <Stack direction='row' spacing={4} sx={{ mt: 3 }} flexWrap='wrap' useFlexGap>
        {segs.map(seg => (
          <Stack key={seg.label} direction='row' spacing={1} alignItems='center'>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: seg.bg }} />
            <Typography variant='body2'>{seg.label}</Typography>
            <Typography variant='monoAmount'>{seg.value}%</Typography>
          </Stack>
        ))}
      </Stack>
      <Typography variant='caption' color='text.disabled' sx={{ display: 'block', mt: 2 }}>
        {REPORT_COPY.signals.sentimentBasis(s.sampleSize)}
      </Typography>
      <InsightLine text={REPORT_COPY.insights.sentiment} />
    </SectionCard>
  )
}

const SignalKpis = () => {
  const s = REPORT_VM.signals

  return (
    <Grid container spacing={6} sx={{ height: '100%' }}>
      <Grid size={{ xs: 6 }}>
        <SectionCard title={REPORT_COPY.signals.citationShareTitle} dataCapture='ai-visibility-report-citation'>
          <Stack direction='row' alignItems='baseline' spacing={0.5}>
            <Typography variant='kpiValue' color='primary.main'>
              {s.citationSharePct}
            </Typography>
            <Typography variant='h5' color='text.disabled'>
              %
            </Typography>
          </Stack>
          <Typography variant='caption' color='text.secondary'>
            {REPORT_COPY.signals.citationShareHelper(s.citedMentions, s.totalMentions)}
          </Typography>
        </SectionCard>
      </Grid>
      <Grid size={{ xs: 6 }}>
        <SectionCard title={REPORT_COPY.signals.prominenceTitle} dataCapture='ai-visibility-report-prominence'>
          <Stack direction='row' alignItems='baseline' spacing={0.5}>
            <Typography variant='kpiValue'>{s.prominence}</Typography>
            <Typography variant='h5' color='text.disabled'>
              /5
            </Typography>
          </Stack>
          <Typography variant='caption' color='text.secondary'>
            {REPORT_COPY.signals.prominenceHelper}
          </Typography>
        </SectionCard>
      </Grid>
    </Grid>
  )
}

// ── Gap + Recommended motion ─────────────────────────────────────────────────

const GapMotionCard = ({
  ordinal,
  icon,
  iconColor,
  title,
  name,
  body,
  impactLabel,
  impact,
  impactColor
}: {
  ordinal: string
  icon: string
  iconColor: MuiColor
  title: string
  name: string
  body: string
  impactLabel: string
  impact: string
  impactColor: MuiColor
}) => (
  <SectionCard ordinal={ordinal} title={title}>
    <Stack spacing={3}>
      <Stack direction='row' spacing={3} alignItems='flex-start'>
        <Box
          sx={theme => ({
            display: 'inline-flex',
            p: 2,
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            color: `${iconColor}.main`,
            backgroundColor: 'var(--mui-palette-action-hover)'
          })}
        >
          <i className={icon} />
        </Box>
        <Box>
          <Typography variant='h5'>{name}</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
            {body}
          </Typography>
        </Box>
      </Stack>
      <Chip size='small' variant='tonal' color={impactColor} sx={{ alignSelf: 'flex-start' }} label={`${impactLabel}: ${impact}`} />
    </Stack>
  </SectionCard>
)

// ── Recommendations ──────────────────────────────────────────────────────────

const Recommendations = () => (
  <SectionCard ordinal='6' title={REPORT_COPY.recommendations.title} dataCapture='ai-visibility-report-recommendations'>
    <Stack divider={<Divider flexItem />} spacing={1}>
      {REPORT_VM.recommendations.map(r => (
        <Grid container spacing={3} alignItems='center' key={r.rank} sx={{ py: 2 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack direction='row' spacing={3} alignItems='center'>
              <Chip size='small' variant='tonal' color='primary' label={r.rank} />
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {r.title}
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant='caption' color='text.secondary'>
              {r.body}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, md: 1.5 }}>
            <Typography variant='caption' color='text.disabled'>
              {REPORT_COPY.recommendations.colEffort}
            </Typography>
            <Typography variant='body2'>{REPORT_COPY.effort[r.effort]}</Typography>
          </Grid>
          <Grid size={{ xs: 6, md: 1.5 }}>
            <Typography variant='caption' color='text.disabled'>
              {REPORT_COPY.recommendations.colImpact}
            </Typography>
            <Typography variant='body2' color={r.impact === 'high' ? 'success.main' : 'warning.main'}>
              {REPORT_COPY.impact[r.impact]}
            </Typography>
          </Grid>
        </Grid>
      ))}
    </Stack>
  </SectionCard>
)

// ── Provenance ───────────────────────────────────────────────────────────────

const ProvenanceItem = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <Stack direction='row' spacing={3} alignItems='flex-start'>
    <i className={icon} />
    <Box>
      <Typography variant='caption' color='text.disabled'>
        {label}
      </Typography>
      <Typography variant='body2' sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  </Stack>
)

const Provenance = () => {
  const p = REPORT_VM.provenance
  const c = REPORT_COPY.provenance

  return (
    <SectionCard ordinal='7' title={c.title} dataCapture='ai-visibility-report-provenance'>
      <Grid container spacing={5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ProvenanceItem icon='tabler-id-badge-2' label={c.reportId} value={p.reportId} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ProvenanceItem icon='tabler-flask' label={c.methodology} value={p.methodology} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ProvenanceItem icon='tabler-users-group' label={c.sampledProviders} value={p.sampledProviders} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ProvenanceItem icon='tabler-versions' label={c.scoreVersion} value={p.scoreVersion} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ProvenanceItem icon='tabler-message-2-code' label={c.promptPackVersion} value={p.promptPackVersion} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ProvenanceItem icon='tabler-clock' label={c.generatedAt} value={p.generatedAt} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ProvenanceItem icon='tabler-currency-dollar' label={c.currency} value={p.currency} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ProvenanceItem icon='tabler-language' label={c.language} value={p.language} />
        </Grid>
      </Grid>
    </SectionCard>
  )
}

// ── Attachment / PDF preview (aside) ─────────────────────────────────────────

const AttachmentPreview = () => (
  <Card
    variant='outlined'
    data-capture='ai-visibility-report-attachment-preview'
    sx={{ position: { lg: 'sticky' }, top: { lg: 24 }, backgroundColor: 'var(--mui-palette-action-hover)' }}
  >
    <CardContent>
      <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2} sx={{ mb: 4 }}>
        <Typography variant='overline' color='text.disabled'>
          8 · {REPORT_COPY.preview.title}
        </Typography>
        <Chip size='small' variant='tonal' color='success' icon={<i className='tabler-shield-check' />} label={REPORT_COPY.header.publicSafeChip} />
      </Stack>
      <Card variant='outlined' sx={{ backgroundColor: 'var(--mui-palette-background-paper)' }}>
        <CardContent>
          <Box component='img' src={resolveBrandAssets('efeonce')?.wordmarkSrc} alt='Efeonce' sx={{ height: 22, width: 'auto', mb: 3 }} />
          <Typography variant='h5'>{REPORT_COPY.header.title}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {REPORT_VM.organizationName}
          </Typography>
          <Divider sx={{ my: 3 }} />
          <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
            {REPORT_COPY.preview.summaryTitle}
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
            {REPORT_COPY.preview.summaryBody}
          </Typography>
          <Divider sx={{ my: 3 }} />
          <Stack direction='row' alignItems='center' justifyContent='space-between'>
            <Typography variant='caption' color='text.disabled'>
              {REPORT_VM.provenance.reportId}
            </Typography>
            <Typography variant='caption' color='text.disabled'>
              {REPORT_COPY.preview.pageLabel(1, 12)}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </CardContent>
  </Card>
)

// ── Blocking states ──────────────────────────────────────────────────────────

const BlockingState = ({ state }: { state: ArtifactState }) => {
  const c = STATE_COPY[state]

  const icon =
    state === 'renderError' || state === 'denied'
      ? 'tabler-alert-circle'
      : state === 'expired'
        ? 'tabler-link-off'
        : state === 'reviewRequiredPublic'
          ? 'tabler-hourglass'
          : 'tabler-chart-bar-off'

  return (
    <Card variant='outlined'>
      <CardContent>
        <Stack alignItems='center' spacing={3} sx={{ py: 10, textAlign: 'center' }} role='status'>
          <Box sx={{ color: 'text.disabled' }}>
            <i className={icon} />
          </Box>
          <Typography variant='h5'>{c.title}</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 420 }}>
            {c.body}
          </Typography>
          {c.cta ? <Chip variant='tonal' color='primary' label={c.cta} /> : null}
        </Stack>
      </CardContent>
    </Card>
  )
}

// ── Header ───────────────────────────────────────────────────────────────────

const ArtifactHeader = () => {
  const [periodStart, setPeriodStart] = useState<Date | null>(new Date(2025, 4, 5))
  const [periodEnd, setPeriodEnd] = useState<Date | null>(new Date(2025, 4, 18))

  return (
    <Stack
      direction={{ xs: 'column', lg: 'row' }}
      alignItems={{ xs: 'flex-start', lg: 'center' }}
      justifyContent='space-between'
      spacing={4}
    >
      <Stack direction='row' spacing={6} alignItems='center' divider={<Divider orientation='vertical' flexItem />}>
        <Box component='img' src={resolveBrandAssets('efeonce')?.wordmarkSrc} alt='Efeonce' sx={{ height: 28, width: 'auto' }} />
        <Box>
          <Typography variant='h4'>{REPORT_COPY.header.title}</Typography>
          <Stack direction='row' spacing={2} alignItems='center' sx={{ mt: 0.5 }}>
            <i className='tabler-world' />
            <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
              {REPORT_VM.organizationName}
            </Typography>
            <i className='tabler-rosette-discount-check-filled' />
          </Stack>
        </Box>
      </Stack>
      <Stack direction='row' spacing={4} alignItems='flex-end' flexWrap='wrap' useFlexGap>
        <Box>
          <Typography variant='caption' color='text.disabled' sx={{ display: 'block' }}>
            {REPORT_COPY.header.reportDateLabel}
          </Typography>
          <Stack direction='row' spacing={1} alignItems='center' sx={{ mt: 0.5 }}>
            <i className='tabler-calendar-event' />
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {REPORT_VM.reportDate}
            </Typography>
          </Stack>
        </Box>
        <Box>
          <Typography variant='caption' color='text.disabled' sx={{ display: 'block', mb: 1 }}>
            {REPORT_COPY.header.analyzedPeriodLabel}
          </Typography>
          <Stack direction='row' spacing={2} alignItems='center'>
            <Box sx={{ width: 138 }}>
              <GreenhouseDatePicker label='Desde' value={periodStart} onChange={setPeriodStart} maxDate={periodEnd ?? undefined} dateFormat='dd MMM yyyy' />
            </Box>
            <Box sx={{ color: 'text.disabled' }}>–</Box>
            <Box sx={{ width: 138 }}>
              <GreenhouseDatePicker label='Hasta' value={periodEnd} onChange={setPeriodEnd} minDate={periodStart ?? undefined} dateFormat='dd MMM yyyy' />
            </Box>
          </Stack>
        </Box>
        <Chip variant='tonal' color='success' icon={<i className='tabler-shield-check' />} label={REPORT_COPY.header.publicSafeChip} sx={{ mb: 0.5 }} />
      </Stack>
    </Stack>
  )
}

const ReportArtifactMockupView = () => {
  const [variant, setVariant] = useState<ArtifactVariant>('publicWeb')
  const [state, setState] = useState<ArtifactState>('ready')

  const isBlocking =
    state === 'insufficientData' ||
    state === 'reviewRequiredPublic' ||
    state === 'expired' ||
    state === 'renderError' ||
    state === 'denied'

  const partial = state === 'partial'
  const showTrend = state !== 'noTrend'

  return (
    <Box sx={{ p: { xs: 4, md: 6 } }} data-capture='ai-visibility-report'>
      <Stack spacing={6}>
        <Card variant='outlined' sx={{ borderStyle: 'dashed' }}>
          <CardContent>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={4} justifyContent='space-between'>
              <Box>
                <Typography variant='overline' color='text.disabled'>
                  {REPORT_COPY.variants.label}
                </Typography>
                <TabContext value={variant}>
                  <TabList onChange={(_, v: ArtifactVariant) => setVariant(v)} aria-label={REPORT_COPY.variants.label}>
                    {VARIANT_OPTIONS.map(v => (
                      <Tab key={v.id} value={v.id} icon={<i className={v.icon} />} iconPosition='start' label={v.label} />
                    ))}
                  </TabList>
                </TabContext>
                <Typography variant='caption' color='text.disabled' sx={{ display: 'block', mt: 1 }}>
                  {REPORT_COPY.variants.sharedModelNote}
                </Typography>
              </Box>
              <Box>
                <Typography variant='overline' color='text.disabled'>
                  Estado (mockup)
                </Typography>
                <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                  {STATE_OPTIONS.map(s => (
                    <Chip
                      key={s.id}
                      size='small'
                      variant={state === s.id ? 'filled' : 'outlined'}
                      color={state === s.id ? 'primary' : 'secondary'}
                      label={s.label}
                      onClick={() => setState(s.id)}
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <ArtifactHeader />

        {isBlocking ? (
          <BlockingState state={state} />
        ) : (
          <>
            <Box>
              <Typography variant='overline' color='primary.main'>
                {REPORT_COPY.narrative.eyebrow}
              </Typography>
              <Typography variant='h4' sx={{ mt: 0.5 }}>
                {REPORT_COPY.narrative.lead}
              </Typography>
              <Typography variant='body1' color='text.secondary' sx={{ mt: 1.5, maxWidth: 820 }}>
                {REPORT_COPY.narrative.sub}
              </Typography>
            </Box>

            <Grid container spacing={6}>
              <Grid size={{ xs: 12, md: 5, lg: 4 }}>
                <ScoreCard partial={partial} />
              </Grid>
              <Grid size={{ xs: 12, md: 7, lg: 8 }}>
                {variant === 'clientPortal' && showTrend ? <MultiEngineTrend /> : <PerEngineSnapshot />}
              </Grid>
            </Grid>

            <ReadinessLadder />

            <Grid container spacing={6}>
              <Grid size={{ xs: 12, lg: 7 }}>
                <DimensionsRadar />
              </Grid>
              <Grid size={{ xs: 12, lg: 5 }}>
                <CompetitiveSov />
              </Grid>
            </Grid>

            <Grid container spacing={6}>
              <Grid size={{ xs: 12, md: 7 }}>
                <SentimentCard />
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <SignalKpis />
              </Grid>
            </Grid>

            <Grid container spacing={6}>
              <Grid size={{ xs: 12, md: 6 }}>
                <GapMotionCard
                  ordinal='3'
                  icon='tabler-target-arrow'
                  iconColor='error'
                  title={REPORT_COPY.primaryGap.title}
                  name={REPORT_VM.primaryGap.title}
                  body={REPORT_VM.primaryGap.body}
                  impactLabel={REPORT_COPY.primaryGap.impactLabel}
                  impact={REPORT_COPY.impact[REPORT_VM.primaryGap.impact]}
                  impactColor='error'
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <GapMotionCard
                  ordinal='4'
                  icon='tabler-trending-up'
                  iconColor='success'
                  title={REPORT_COPY.recommendedMotion.title}
                  name={REPORT_VM.recommendedMotion.title}
                  body={REPORT_VM.recommendedMotion.body}
                  impactLabel={REPORT_COPY.recommendedMotion.impactLabel}
                  impact={REPORT_COPY.impact[REPORT_VM.recommendedMotion.impact]}
                  impactColor='success'
                />
              </Grid>
            </Grid>

            <Grid container spacing={6}>
              <Grid size={{ xs: 12, lg: 8 }}>
                <Stack spacing={6}>
                  <Recommendations />
                  <Provenance />
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, lg: 4 }}>
                <AttachmentPreview />
              </Grid>
            </Grid>

            <Card variant='outlined'>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }} justifyContent='space-between'>
                  <Stack direction='row' spacing={2} alignItems='flex-start'>
                    <i className='tabler-shield-check' />
                    <Typography variant='caption' color='text.secondary' sx={{ maxWidth: 640 }}>
                      {REPORT_COPY.footer.disclaimer} {REPORT_COPY.footer.noRawData}
                    </Typography>
                  </Stack>
                  <Chip size='small' variant='tonal' color='success' label={REPORT_COPY.footer.publicSafeStamp} />
                </Stack>
              </CardContent>
            </Card>
          </>
        )}
      </Stack>
    </Box>
  )
}

export default ReportArtifactMockupView
