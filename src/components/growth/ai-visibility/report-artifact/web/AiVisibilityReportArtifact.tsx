'use client'

/**
 * TASK-1252 — AI Visibility Report Artifact · WEB render adapter (Slice B).
 *
 * Render React/MUI del informe a partir del `ReportArtifactModel` (SoT compartido).
 * NO calcula score/gaps/tendencia: sólo presenta campos del modelo. Las secciones se
 * gobiernan por la disclosure matrix (`reportSectionVisible`); `engineSnapshot` (visibilidad
 * por motor: logo + nombre + presencia) es público-safe y se muestra en todas las variants.
 * Tokens AXIS (sin HEX/fontSize inline), copy es-CL desde
 * `src/lib/copy/growth.ts`, a11y: heading order, score semántico, charts con fallback,
 * severidad nombrada + ícono (nunca color-only). El attachment/print usa OTRO adapter.
 */

import { useId } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from 'recharts'

import AppRecharts from '@/libs/styles/AppRecharts'
import { visuallyHiddenSx } from '@/components/greenhouse/accessibility'
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import TeamAvatarGroup, { type TeamAvatarGroupBrand } from '@/components/greenhouse/TeamAvatarGroup'
import { GreenhouseBrandLogoMark, type GreenhouseBrandLogoKind } from '@/components/greenhouse/primitives'
import { resolveBrandAssets } from '@/components/greenhouse/brand-assets'
import { GH_GROWTH_AI_VISIBILITY, GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT as C } from '@/lib/copy/growth'
import type { GraderReportSeverity } from '@/lib/growth/ai-visibility/report/contracts'

import {
  REPORT_DIMENSION_LEVEL,
  REPORT_LEVEL_IDS,
  REPORT_SEVERITY_TONE,
  reportSectionVisible,
  type ReportArtifactLevel,
  type ReportArtifactModel,
  type ReportLevelId
} from '../model'

// ── Shared helpers ────────────────────────────────────────────────────────────

type MuiColor = 'success' | 'warning' | 'error' | 'secondary'

const toneToColor = (severity: GraderReportSeverity): MuiColor => {
  const tone = REPORT_SEVERITY_TONE[severity]

  if (tone === 'success') return 'success'
  if (tone === 'warning') return 'warning'
  if (tone === 'error') return 'error'

  return 'secondary'
}

const scoreTextColor = (severity: GraderReportSeverity): string => {
  const tone = REPORT_SEVERITY_TONE[severity]

  if (tone === 'success') return 'success.dark'
  if (tone === 'warning') return 'text.primary'
  if (tone === 'error') return 'error.main'

  return 'text.primary'
}

const scoreCssColor = (severity: GraderReportSeverity): string => {
  const tone = REPORT_SEVERITY_TONE[severity]

  if (tone === 'success') return 'var(--mui-palette-success-dark)'
  if (tone === 'warning') return 'var(--mui-palette-text-primary)'
  if (tone === 'error') return 'var(--mui-palette-error-main)'

  return 'var(--mui-palette-text-primary)'
}

const SEVERITY_ICON: Record<GraderReportSeverity, string> = {
  optimo: 'tabler-circle-check',
  atencion: 'tabler-alert-triangle',
  critico: 'tabler-alert-octagon',
  sin_dato: 'tabler-minus'
}

const LEVEL_ICON: Record<ReportLevelId, string> = {
  found: 'tabler-flag',
  readable: 'tabler-file-text',
  correct: 'tabler-circle-check',
  actionable: 'tabler-bolt',
  intrinsic: 'tabler-trophy'
}

// Logo por motor: AXIS brand kinds para Gemini/ChatGPT/Claude; Perplexity vía iconify
// bundleado (`logos:perplexity-icon`). NUNCA reusar un logo por otro (cada motor se identifica).
const ENGINE_LOGO_KIND: Record<string, GreenhouseBrandLogoKind> = {
  gemini: 'geminiColor',
  google_ai_overview: 'geminiColor',
  openai: 'gptIsotype',
  anthropic: 'claudeIsologo'
}

const ENGINE_DISPLAY_NAME: Record<string, string> = {
  openai: 'ChatGPT',
  anthropic: 'Claude',
  gemini: 'Gemini',
  google_ai_overview: 'Gemini',
  perplexity: 'Perplexity'
}

const engineBrandsFromProviders = (providers: string[]): TeamAvatarGroupBrand[] =>
  providers.map(provider => ({
    provider,
    name: ENGINE_DISPLAY_NAME[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1)
  }))

const EngineLogo = ({ provider }: { provider: string }) => {
  if (provider === 'perplexity') {
    return <i className='logos-perplexity-icon' aria-hidden style={{ fontSize: '1.5rem' }} />
  }

  const kind = ENGINE_LOGO_KIND[provider]

  if (kind) return <GreenhouseBrandLogoMark kind={kind} size='small' />

  return <i className='tabler-robot' aria-hidden style={{ fontSize: '1.5rem', color: 'var(--mui-palette-text-secondary)' }} />
}

const SectionHeading = ({ title, helper, ordinal }: { title: string; helper?: string; ordinal?: number }) => (
  <Box sx={{ mb: 3 }}>
    <Stack direction='row' spacing={2} alignItems='baseline'>
      {ordinal != null && (
        <Typography variant='overline' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {ordinal}
        </Typography>
      )}
      <Typography variant='h5'>{title}</Typography>
    </Stack>
    {helper && (
      <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
        {helper}
      </Typography>
    )}
  </Box>
)

// ── Masthead ──────────────────────────────────────────────────────────────────

const Masthead = ({
  header,
  isPublic
}: {
  header: ReportHeader
  isPublic: boolean
}) => (
  <Card variant='outlined' data-capture='ai-visibility-report-masthead'>
    <CardContent sx={{ py: 4 }}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        alignItems={{ xs: 'flex-start', lg: 'center' }}
        justifyContent='space-between'
        spacing={{ xs: 5, lg: 4 }}
      >
        <Stack
          direction='row'
          spacing={5}
          alignItems='center'
          divider={<Divider orientation='vertical' flexItem sx={{ my: 0.5 }} />}
        >
          <Box
            component='img'
            src={resolveBrandAssets('efeonce')?.wordmarkSrc}
            alt='Efeonce'
            sx={{ height: 30, width: 'auto', flexShrink: 0 }}
          />
          <Box>
            <Typography variant='h4' sx={{ textWrap: 'balance' }}>
              {C.header.title}
            </Typography>
            <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap sx={{ mt: 1 }}>
              <Stack direction='row' spacing={1.5} alignItems='center'>
                <i
                  className='tabler-world'
                  aria-hidden
                  style={{ fontSize: '1.125rem', color: 'var(--mui-palette-text-secondary)' }}
                />
                <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                  {header.organizationName}
                </Typography>
                <i
                  className='tabler-rosette-discount-check-filled'
                  role='img'
                  aria-label={C.header.verifiedOrgAria}
                  style={{ fontSize: '1.125rem', color: 'var(--mui-palette-primary-main)' }}
                />
              </Stack>
              {isPublic && (
                <Chip
                  size='small'
                  variant='tonal'
                  color='success'
                  icon={<i className='tabler-shield-check' aria-hidden />}
                  label={C.header.publicSafeChip}
                />
              )}
            </Stack>
          </Box>
        </Stack>
        <Stack
          direction='row'
          spacing={4}
          alignItems='center'
          flexWrap='wrap'
          useFlexGap
          divider={<Divider orientation='vertical' flexItem sx={{ display: { xs: 'none', sm: 'block' }, my: 0.5 }} />}
        >
          <Box>
            <Typography variant='overline' color='text.secondary' sx={{ display: 'block' }}>
              {C.header.reportDateLabel}
            </Typography>
            <Stack direction='row' spacing={1} alignItems='center' sx={{ mt: 0.5 }}>
              <i
                className='tabler-calendar-event'
                aria-hidden
                style={{ fontSize: '1.125rem', color: 'var(--mui-palette-text-secondary)' }}
              />
              <Typography variant='body2' sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {header.reportDate}
              </Typography>
            </Stack>
          </Box>
          <Box>
            <Typography variant='overline' color='text.secondary' sx={{ display: 'block' }}>
              {C.header.analyzedPeriodLabel}
            </Typography>
            <Typography variant='body2' sx={{ mt: 0.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {header.periodLabel}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

// ── Verdict — score hero ──────────────────────────────────────────────────────

const ScoreGauge = ({ score, severity }: { score: number | null; severity: GraderReportSeverity }) => {
  const theme = useTheme()
  const color = toneToColor(severity)
  const trackColor = theme.palette.divider
  const fillColor = color === 'warning' ? theme.palette.warning.dark : color === 'secondary' ? theme.palette.text.primary : theme.palette[color].main
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100
  const radius = 80
  const circumference = Math.PI * radius
  const dash = circumference * pct

  return (
    <Box sx={{ position: 'relative', width: 200, height: 116 }}>
      <Box component='svg' viewBox='0 0 200 110' sx={{ width: '100%', height: '100%' }} aria-hidden>
        <path d='M20 100 A 80 80 0 0 1 180 100' fill='none' stroke={trackColor} strokeWidth={14} strokeLinecap='round' />
        <path
          d='M20 100 A 80 80 0 0 1 180 100'
          fill='none'
          stroke={fillColor}
          strokeWidth={14}
          strokeLinecap='round'
          strokeDasharray={`${dash} ${circumference}`}
        />
      </Box>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', pb: 0.5 }}>
        {score === null ? (
          <Typography variant='h4' color='text.primary'>
            —
          </Typography>
        ) : (
          <Stack direction='row' alignItems='baseline' spacing={0.5}>
            <Typography variant='kpiValue' component='span'>
              <AnimatedCounter value={score} format='integer' />
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              /100
            </Typography>
          </Stack>
        )}
        <Typography variant='caption' color='text.secondary'>
          {C.verdict.scoreLabel}
        </Typography>
      </Box>
    </Box>
  )
}

const VerdictSection = ({ model }: { model: ReportArtifactModel }) => {
  const color = toneToColor(model.overallSeverity)
  const engineBrands = engineBrandsFromProviders(model.provenance.providersSampled)

  return (
    <Card variant='outlined' data-capture='ai-visibility-report-score'>
      <CardContent>
        <SectionHeading title={C.verdict.title} ordinal={1} />
        <Stack alignItems='center' spacing={2}>
          <ScoreGauge score={model.overallScore} severity={model.overallSeverity} />
          <Chip
            variant='tonal'
            color={color}
            icon={<i className={SEVERITY_ICON[model.overallSeverity]} aria-hidden />}
            label={GH_GROWTH_AI_VISIBILITY.severity_label[model.overallSeverity]}
          />
          <Typography variant='body2' color='text.secondary' align='center'>
            {C.verdict.scoreContext}
          </Typography>
          <Stack direction='row' spacing={1} alignItems='center'>
            <i className='tabler-info-circle' aria-hidden style={{ color: 'var(--mui-palette-text-secondary)' }} />
            <Typography variant='caption' color='text.secondary'>
              {C.verdict.scoreDisclaimer}
            </Typography>
          </Stack>
          <Divider flexItem />
          {engineBrands.length > 0 ? <TeamAvatarGroup brands={engineBrands} label={C.verdict.engineBrandsLabel} size={36} /> : null}
        </Stack>
      </CardContent>
    </Card>
  )
}

// ── Levels band (5-level framework) ───────────────────────────────────────────

const LevelCard = ({ level }: { level: ReportArtifactLevel }) => {
  const copy = C.level[level.id]
  const isCoverage = level.status === 'coverage'

  return (
    <Box
      sx={{
        height: '100%',
        minWidth: 0,
        border: theme => `1px solid ${theme.palette.divider}`,
        borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
        p: 3,
        bgcolor: level.axis === 'agentic' ? 'action.hover' : 'background.paper'
      }}
    >
      <Stack spacing={1.25} sx={{ height: '100%' }}>
        <Stack direction='row' justifyContent='space-between' alignItems='center'>
          <Typography variant='overline' color='text.secondary'>
            {copy.ordinal}
          </Typography>
          <i className={LEVEL_ICON[level.id]} aria-hidden style={{ color: 'var(--mui-palette-text-secondary)' }} />
        </Stack>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
            {copy.label}
          </Typography>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
            {copy.labelEn} · {copy.question}
          </Typography>
        </Box>
        {isCoverage ? (
          <Stack spacing={1}>
            <Chip size='small' variant='outlined' color='default' label={C.levelsBand.coverageBadge} />
            {'coverageNote' in copy && copy.coverageNote && (
              <Typography variant='caption' color='text.secondary'>
                {copy.coverageNote}
              </Typography>
            )}
          </Stack>
        ) : (
          <Stack direction='row' spacing={1} alignItems='baseline'>
            <Typography variant='h5' color={scoreTextColor(level.severity)} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {level.score}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              /100
            </Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  )
}

const LevelsSection = ({ model }: { model: ReportArtifactModel }) => {
  const perceptionLevels = model.levels.filter(level => level.axis === 'perception')
  const agenticLevel = model.levels.find(level => level.axis === 'agentic')

  return (
    <Card variant='outlined' data-capture='ai-visibility-report-levels'>
      <CardContent>
        <SectionHeading title={C.levelsBand.title} helper={C.levelsBand.helper} ordinal={2} />
        <Stack spacing={4}>
          <Box>
            <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap sx={{ mb: 2 }}>
              <Chip size='small' variant='tonal' color='info' label={C.levelsBand.perceptionAxis} />
              <Typography variant='subtitle2'>{C.levelsBand.perceptionTitle}</Typography>
            </Stack>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              {C.levelsBand.perceptionHelper}
            </Typography>
            <Grid container spacing={3}>
              {perceptionLevels.map(level => (
                <Grid key={level.id} size={{ xs: 12, sm: 6, lg: 3 }}>
                  <LevelCard level={level} />
                </Grid>
              ))}
            </Grid>
          </Box>

          {agenticLevel && (
            <Box>
              <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap sx={{ mb: 2 }}>
                <Chip size='small' variant='outlined' color='default' label={C.levelsBand.agenticAxis} />
                <Typography variant='subtitle2'>{C.levelsBand.agenticTitle}</Typography>
              </Stack>
              <Grid container spacing={3} alignItems='stretch'>
                <Grid size={{ xs: 12, lg: 4 }}>
                  <LevelCard level={agenticLevel} />
                </Grid>
                <Grid size={{ xs: 12, lg: 8 }}>
                  <Box
                    sx={{
                      border: theme => `1px dashed ${theme.palette.divider}`,
                      borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                      p: 3,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Stack direction='row' spacing={2} alignItems='flex-start'>
                      <i
                        className='tabler-route-square'
                        aria-hidden
                        style={{ color: 'var(--mui-palette-text-secondary)', marginTop: 2 }}
                      />
                      <Typography variant='body2' color='text.secondary'>
                        {C.levelsBand.agenticHelper}
                      </Typography>
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

// ── Dimensions ────────────────────────────────────────────────────────────────

const DimensionsSection = ({ model, ordinal = 5 }: { model: ReportArtifactModel; ordinal?: number }) => {
  const groups = REPORT_LEVEL_IDS.filter(levelId => levelId !== 'actionable')
    .map(levelId => ({
      levelId,
      level: model.levels.find(level => level.id === levelId),
      dimensions: model.dimensions.filter(dim => REPORT_DIMENSION_LEVEL[dim.key] === levelId)
    }))
    .filter(group => group.dimensions.length > 0)

  return (
    <Card variant='outlined' data-capture='ai-visibility-report-dimensions'>
      <CardContent>
        <SectionHeading title={C.dimensions.title} helper={C.dimensions.helper} ordinal={ordinal} />
        <Grid container spacing={4}>
          {groups.map(group => {
            const levelCopy = C.level[group.levelId]

            return (
              <Grid key={group.levelId} size={{ xs: 12, md: 6, xl: 3 }}>
                <Box
                  sx={{
                    height: '100%',
                    minWidth: 0,
                    border: theme => `1px solid ${theme.palette.divider}`,
                    borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                    p: 3
                  }}
                >
                  <Stack spacing={2.5}>
                    <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={2}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant='overline' color='text.secondary' sx={{ display: 'block' }}>
                          Nivel {levelCopy.ordinal}
                        </Typography>
                        <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                          {levelCopy.label}
                        </Typography>
                        <Typography variant='body2' color='text.secondary' sx={{ display: 'block' }}>
                          {levelCopy.question}
                        </Typography>
                      </Box>
                      {group.level && (
                        <Chip
                          size='small'
                          variant={group.level.status === 'coverage' ? 'outlined' : 'tonal'}
                          color={group.level.status === 'coverage' ? 'default' : toneToColor(group.level.severity)}
                          label={group.level.status === 'coverage' ? C.levelsBand.coverageBadge : `${group.level.score}/100`}
                          sx={{ flexShrink: 0 }}
                        />
                      )}
                    </Stack>
                    <Stack spacing={2.25} component='ul' sx={{ listStyle: 'none', p: 0, m: 0 }}>
                      {group.dimensions.map(dim => {
                        const color = toneToColor(dim.severity)
                        const empty = dim.score === null
                        const label = GH_GROWTH_AI_VISIBILITY.dimension_label[dim.key] ?? dim.label

                        return (
                          <Box key={dim.key} component='li'>
                            <Stack direction='row' justifyContent='space-between' alignItems='baseline' spacing={2} sx={{ mb: 0.5 }}>
                              <Typography variant='body2' sx={{ minWidth: 0, fontWeight: 600 }}>
                                {label}
                              </Typography>
                              <Typography variant='monoAmount' color={empty ? 'text.primary' : scoreTextColor(dim.severity)} sx={{ flexShrink: 0 }}>
                                {empty ? C.levelsBand.coverageBadge : `${dim.score}/100`}
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant='determinate'
                              value={empty ? 0 : (dim.score as number)}
                              color={empty ? 'inherit' : color}
                              aria-label={`${label}: ${empty ? 'sin dato' : `${dim.score} de 100`}`}
                              sx={{
                                height: 7,
                                borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: empty ? 'transparent' : scoreTextColor(dim.severity)
                                }
                              }}
                            />
                            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
                              {empty ? C.dimensions.coverageHelper : dim.explainer}
                            </Typography>
                          </Box>
                        )
                      })}
                    </Stack>
                  </Stack>
                </Box>
              </Grid>
            )
          })}
        </Grid>
      </CardContent>
    </Card>
  )
}

// ── Primary gap + recommended motion ──────────────────────────────────────────

const PrimaryGapSection = ({ model }: { model: ReportArtifactModel }) => {
  if (!model.primaryGap) return null
  const affectedLevelId = REPORT_DIMENSION_LEVEL[model.primaryGap.dimensionKey]
  const affectedLevelCopy = C.level[affectedLevelId]

  return (
    <Card variant='outlined' data-capture='ai-visibility-report-primary-gap' sx={{ height: '100%' }}>
      <CardContent sx={{ height: '100%' }}>
        <Stack spacing={4} sx={{ height: '100%' }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionHeading title={C.primaryGap.title} />
              <Stack direction='row' spacing={1.5} alignItems='flex-start'>
                <i className='tabler-target-arrow' aria-hidden style={{ color: scoreCssColor(model.primaryGap.severity), marginTop: 2 }} />
                <Typography variant='body1'>{model.primaryGap.title}</Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionHeading title={C.recommendedMotion.title} />
              <Stack direction='row' spacing={1.5} alignItems='flex-start'>
                <i className='tabler-arrow-up-right' aria-hidden style={{ color: 'var(--mui-palette-primary-main)', marginTop: 2 }} />
                <Typography variant='body1'>
                  {model.recommendations[0]?.action ?? GH_GROWTH_AI_VISIBILITY.outcome_note}
                </Typography>
              </Stack>
            </Grid>
          </Grid>

          <Box
            sx={{
              mt: 'auto',
              border: theme => `1px solid ${theme.palette.divider}`,
              borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
              p: 3,
              bgcolor: 'action.hover'
            }}
          >
            <Typography variant='overline' color='text.secondary' sx={{ display: 'block', mb: 2 }}>
              {C.primaryGap.executiveReadTitle}
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant='overline' color='text.secondary' sx={{ display: 'block' }}>
                  {C.primaryGap.affectedLevelLabel}
                </Typography>
                <Typography variant='h6' color='text.primary'>
                  {affectedLevelCopy.ordinal} · {affectedLevelCopy.label}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant='overline' color='text.secondary' sx={{ display: 'block' }}>
                  {C.primaryGap.evidenceLabel}
                </Typography>
                <Typography variant='h6' color='text.primary'>
                  {C.primaryGap.citationEvidence(model.citationInsight.ownDomainShare)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant='overline' color='text.secondary' sx={{ display: 'block' }}>
                  {C.primaryGap.nextProofLabel}
                </Typography>
                <Typography variant='body2' color='text.primary' sx={{ fontWeight: 600 }}>
                  {C.primaryGap.nextProof(model.provenance.promptPackVersion)}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ── AEO signals ───────────────────────────────────────────────────────────────

const SignalTile = ({
  label,
  value,
  helper,
  icon
}: {
  label: string
  value: string
  helper: string
  icon: string
}) => (
  <Box
    sx={{
      height: '100%',
      border: theme => `1px solid ${theme.palette.divider}`,
      borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
      p: 3,
      minWidth: 0
    }}
  >
    <Stack spacing={1}>
      <Stack direction='row' spacing={1.5} alignItems='center'>
        <i className={icon} aria-hidden style={{ color: 'var(--mui-palette-text-secondary)' }} />
        <Typography variant='overline' color='text.secondary'>
          {label}
        </Typography>
      </Stack>
      <Typography variant='h5' sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      <Typography variant='caption' color='text.secondary'>
        {helper}
      </Typography>
    </Stack>
  </Box>
)

const AeoSignalsSection = ({ model, ordinal = 6 }: { model: ReportArtifactModel; ordinal?: number }) => {
  const s = model.sentimentSummary
  const citation = model.citationInsight
  const pos = model.positionSummary
  const maxSourceCount = Math.max(1, ...model.sourceTypeSummary.map(source => source.count))

  return (
    <Card variant='outlined' data-capture='ai-visibility-report-aeo-signals'>
      <CardContent>
        <SectionHeading title={C.signals.title} helper={C.signals.helper} ordinal={ordinal} />
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <SignalTile
              icon='tabler-quote'
              label={C.signals.citationShareTitle}
              value={citation.ownDomainShare === null ? '—' : `${citation.ownDomainShare}%`}
              helper={C.signals.citationShareHelper(citation.findingsCitingOwnDomain, citation.findingsWithCitations)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <SignalTile
              icon='tabler-mood-smile'
              label={C.signals.sentimentTitle}
              value={GH_GROWTH_AI_VISIBILITY.sentiment_net_label[s.net]}
              helper={C.signals.sentimentBasis(s.evaluated)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <SignalTile
              icon='tabler-list-numbers'
              label={C.signals.prominenceTitle}
              value={pos.best === null ? '—' : `#${pos.best}`}
              helper={pos.average === null ? C.signals.prominenceHelper : C.signals.prominenceAverage(pos.average)}
            />
          </Grid>
          {model.sourceTypeSummary.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                  p: 3
                }}
              >
                <Grid container spacing={3} alignItems='center'>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant='overline' color='text.secondary'>
                      {C.signals.sourceMixTitle}
                    </Typography>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
                      {C.signals.sourceMixHelper}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Stack spacing={1.25}>
                      {model.sourceTypeSummary.map(source => (
                        <Box key={source.sourceType}>
                          <Stack direction='row' justifyContent='space-between' sx={{ mb: 0.5 }}>
                            <Typography variant='caption'>{source.sourceType}</Typography>
                            <Typography variant='monoAmount' color='text.secondary'>
                              {source.count}
                            </Typography>
                          </Stack>
                          <Box
                            sx={{
                              height: 6,
                              borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
                              bgcolor: 'action.hover',
                              overflow: 'hidden'
                            }}
                          >
                            <Box
                              sx={{
                                height: '100%',
                                width: `${(source.count / maxSourceCount) * 100}%`,
                                bgcolor: 'primary.main',
                                borderRadius: 'inherit'
                              }}
                            />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  )
}

// ── Competitive Share of Voice ────────────────────────────────────────────────

const CompetitiveSovSection = ({ model, ordinal = 4 }: { model: ReportArtifactModel; ordinal?: number }) => {
  const theme = useTheme()

  const rows = [
    { name: C.sov.brandLabel, mentions: model.competitiveSov.brandMentions, isBrand: true },
    ...model.competitiveSov.competitors.map(c => ({ name: c.name, mentions: c.mentions, isBrand: false }))
  ]

  const max = Math.max(1, ...rows.map(r => r.mentions))

  return (
    <Card variant='outlined' data-capture='ai-visibility-report-sov'>
      <CardContent>
        <SectionHeading title={C.sov.title} helper={C.sov.helper} ordinal={ordinal} />
        <Stack spacing={2.5}>
          {rows.map(row => (
            <Box key={row.name}>
              <Stack direction='row' justifyContent='space-between' sx={{ mb: 0.5 }}>
                <Typography variant='body2' sx={{ fontWeight: row.isBrand ? 700 : 400 }}>
                  {row.name}
                </Typography>
                <Typography variant='monoAmount' color={row.isBrand ? 'primary.main' : 'text.secondary'}>
                  {row.mentions} {C.sov.mentionsLabel}
                </Typography>
              </Stack>
              <Box
                sx={{
                  height: 10,
                  borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                  bgcolor: row.isBrand ? alpha(theme.palette.primary.main, 0.18) : theme.palette.action.hover,
                  overflow: 'hidden'
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${(row.mentions / max) * 100}%`,
                    bgcolor: row.isBrand ? 'primary.main' : alpha(theme.palette.text.primary, 0.42),
                    borderRadius: 'inherit'
                  }}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

// ── Trend ─────────────────────────────────────────────────────────────────────

const TrendSection = ({ model }: { model: ReportArtifactModel }) => {
  const theme = useTheme()
  const { trend } = model

  if (trend.status !== 'con_tendencia' || !trend.overall) {
    return (
      <Card variant='outlined' data-capture='ai-visibility-report-trend'>
        <CardContent>
          <SectionHeading title={C.signals.trendTitle} ordinal={7} />
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <i className='tabler-chart-line' aria-hidden style={{ color: 'var(--mui-palette-text-secondary)' }} />
            <Typography variant='body2' color='text.secondary'>
              {GH_GROWTH_AI_VISIBILITY.trend_status[trend.status]}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const data = [
    { label: 'Anterior', value: trend.overall.previous },
    { label: 'Actual', value: trend.overall.current }
  ]

  return (
    <Card variant='outlined' data-capture='ai-visibility-report-trend'>
      <CardContent sx={{ position: 'relative', minWidth: 0, overflowX: 'clip' }}>
        <SectionHeading title={C.signals.trendTitle} ordinal={7} />
        <Stack direction='row' spacing={2} alignItems='baseline' sx={{ mb: 2 }}>
          <Typography variant='kpiValue'>{trend.overall.current}</Typography>
          <Chip
            size='small'
            variant='tonal'
            color={trend.overall.direction === 'subio' ? 'success' : trend.overall.direction === 'bajo' ? 'error' : 'secondary'}
            label={`${GH_GROWTH_AI_VISIBILITY.trend_direction_label[trend.overall.direction]} ${
              trend.overall.delta === null ? '' : `${trend.overall.delta > 0 ? '+' : ''}${trend.overall.delta}`
            }`.trim()}
          />
        </Stack>
        <Box
          sx={{ position: 'relative', width: '100%', height: 160, minWidth: 0, overflowX: 'clip' }}
          role='img'
          aria-label={`${C.signals.trendAxisLabel}. ${GH_GROWTH_AI_VISIBILITY.trend_status.con_tendencia}`}
        >
          <AppRecharts sx={{ width: '100%', height: '100%', minWidth: 0 }}>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id='trendFill' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                    <stop offset='100%' stopColor={theme.palette.primary.main} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey='label' tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={32} />
                <RechartsTooltip />
                <Area type='monotone' dataKey='value' stroke={theme.palette.primary.main} strokeWidth={2} fill='url(#trendFill)' />
              </AreaChart>
            </ResponsiveContainer>
          </AppRecharts>
        </Box>
        <Box component='table' sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          <tbody>
            {data.map(d => (
              <tr key={d.label}>
                <th scope='row'>{d.label}</th>
                <td>{d.value}</td>
              </tr>
            ))}
          </tbody>
        </Box>
      </CardContent>
    </Card>
  )
}

// ── Recommendations ───────────────────────────────────────────────────────────

const RecommendationsSection = ({ model }: { model: ReportArtifactModel }) => (
  <Card variant='outlined' data-capture='ai-visibility-report-recommendations'>
    <CardContent>
      <SectionHeading title={C.recommendations.title} helper={C.recommendations.helper} ordinal={8} />
      <Stack spacing={3} component='ol' sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {model.recommendations.map((rec, idx) => {
          const color = toneToColor(rec.severity)
          const levelId = REPORT_DIMENSION_LEVEL[rec.dimensionKey]
          const levelCopy = C.level[levelId]

          return (
            <Stack key={rec.gapKey} direction='row' spacing={2} component='li' alignItems='flex-start'>
              <Chip
                size='small'
                variant='tonal'
                color={color}
                label={idx + 1}
                sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 32 }}
              />
              <Box>
                <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap sx={{ mb: 0.5 }}>
                  <Typography variant='subtitle2'>{rec.title}</Typography>
                  <Chip size='small' variant='outlined' color='default' label={`${levelCopy.ordinal} · ${levelCopy.label}`} />
                </Stack>
                <Typography variant='body2' color='text.secondary'>
                  {rec.action}
                </Typography>
              </Box>
            </Stack>
          )
        })}
      </Stack>
    </CardContent>
  </Card>
)

// ── Engine snapshot (INTERNAL-ONLY · adminPreview) ────────────────────────────

const EngineSnapshotSection = ({ model }: { model: ReportArtifactModel }) => {
  const theme = useTheme()

  if (!model.engineSnapshot?.length) return null

  const providerName = (provider: string) =>
    GH_GROWTH_AI_VISIBILITY.provider_label[provider as keyof typeof GH_GROWTH_AI_VISIBILITY.provider_label] ?? provider

  const weakestEngine = model.engineSnapshot.reduce((weakest, current) => {
    const weakestPct = weakest.resolved === 0 ? 0 : weakest.present / weakest.resolved
    const currentPct = current.resolved === 0 ? 0 : current.present / current.resolved

    return currentPct < weakestPct ? current : weakest
  }, model.engineSnapshot[0])

  return (
    <Card variant='outlined' data-capture='ai-visibility-report-engine-snapshot'>
      <CardContent>
        <SectionHeading title={C.engineSnapshot.title} helper={C.engineSnapshot.helper} ordinal={3} />
        <Stack spacing={2.5}>
          {model.engineSnapshot.map(engine => {
            const pct = engine.resolved === 0 ? 0 : Math.round((engine.present / engine.resolved) * 100)
            const barColor = pct >= 70 ? 'success' : pct >= 45 ? 'warning' : 'error'

            const name = providerName(engine.provider)

            return (
              <Stack key={engine.provider} direction='row' spacing={2} alignItems='center'>
                <Box sx={{ width: 28, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                  <EngineLogo provider={engine.provider} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Stack direction='row' justifyContent='space-between' sx={{ mb: 0.5 }}>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {name}
                    </Typography>
                    <Typography variant='monoAmount' color='text.secondary'>
                      {C.engineSnapshot.presentLabel(engine.present, engine.resolved)}
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 8, borderRadius: `${theme.shape.customBorderRadius.sm}px`, bgcolor: theme.palette.action.hover, overflow: 'hidden' }}>
                  <Box
                    sx={{
                      height: '100%',
                      width: `${pct}%`,
                      bgcolor: barColor === 'warning' ? 'warning.dark' : `${barColor}.main`,
                      borderRadius: 'inherit'
                    }}
                  />
                  </Box>
                </Box>
              </Stack>
            )
          })}
          <Box
            sx={{
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              bgcolor: 'action.hover',
              p: 3,
              minWidth: 0
            }}
          >
            <Typography variant='overline' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
              {C.engineSnapshot.takeawayTitle}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {C.engineSnapshot.weakestTakeaway(providerName(weakestEngine.provider))}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ── Provenance + disclaimer ───────────────────────────────────────────────────

const ProvenanceSection = ({ model }: { model: ReportArtifactModel }) => {
  const p = model.provenance

  const rows: { label: string; value: string }[] = [
    { label: C.provenance.asOf, value: p.asOfDate ?? '—' },
    { label: C.provenance.sampledProviders, value: `${p.providersSampled.length}` },
    { label: C.provenance.promptCount, value: `${p.promptCount}` },
    { label: C.provenance.scoreVersion, value: p.scoreVersion },
    { label: C.provenance.promptPackVersion, value: p.promptPackVersion }
  ]

  return (
    <Card variant='outlined' data-capture='ai-visibility-report-provenance'>
      <CardContent>
        <SectionHeading title={C.provenance.title} />
        <Grid container spacing={3}>
          {rows.map(row => (
            <Grid key={row.label} size={{ xs: 6, sm: 4 }}>
              <Typography variant='overline' color='text.secondary' sx={{ display: 'block' }}>
                {row.label}
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {row.value}
              </Typography>
            </Grid>
          ))}
        </Grid>
        <Box
          sx={{
            mt: 4,
            borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
            bgcolor: 'action.hover',
            p: 3
          }}
        >
          <Stack direction='row' spacing={1.5} alignItems='flex-start'>
            <i className='tabler-repeat' aria-hidden style={{ color: 'var(--mui-palette-text-secondary)', marginTop: 2 }} />
            <Box>
              <Typography variant='subtitle2'>{C.provenance.baselineTitle}</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                {C.provenance.baselineBody}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  )
}

const DisclaimerSection = ({ model, isPublic }: { model: ReportArtifactModel; isPublic: boolean }) => (
  <Box data-capture='ai-visibility-report-disclaimer'>
    <Typography variant='caption' color='text.secondary'>
      {model.disclaimer}
    </Typography>
    {isPublic && (
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
        {C.footer.publicSafeStamp}
      </Typography>
    )}
  </Box>
)

// ── Orchestrator ──────────────────────────────────────────────────────────────

export interface ReportHeader {
  organizationName: string
  reportDate: string
  periodLabel: string
}

export interface AiVisibilityReportArtifactProps {
  model: ReportArtifactModel
  header: ReportHeader
}

const AiVisibilityReportArtifact = ({ model, header }: AiVisibilityReportArtifactProps) => {
  const labelId = useId()
  const isPublic = model.audience === 'public'
  const show = (section: Parameters<typeof reportSectionVisible>[1]) => reportSectionVisible(model.variant, section)

  return (
    <Box
      component='article'
      aria-labelledby={labelId}
      data-capture='ai-visibility-report'
      sx={{
        minWidth: 0,
        overflowX: 'clip',
        '& .MuiTypography-caption, & .MuiTypography-body2, & .MuiTypography-overline, & .MuiTypography-subtitle1, & .MuiTypography-subtitle2, & .MuiTypography-monoAmount': {
          color: theme => alpha(theme.palette.text.primary, 0.84)
        },
        '& .MuiChip-colorWarning': {
          color: 'var(--mui-palette-text-primary)'
        },
        '& .MuiChip-colorWarning .MuiChip-label': {
          color: 'inherit',
          fontWeight: 600
        },
        '& .MuiChip-colorSuccess': {
          color: 'var(--mui-palette-success-dark)'
        },
        '& .MuiChip-colorSuccess .MuiChip-label': {
          color: 'inherit',
          fontWeight: 600
        },
        '& .MuiChip-colorInfo': {
          color: 'var(--mui-palette-info-dark)'
        },
        '& .MuiChip-colorInfo .MuiChip-label': {
          color: 'inherit',
          fontWeight: 600
        },
        '& .MuiChip-colorSecondary': {
          color: 'var(--mui-palette-text-primary)'
        },
        '& .MuiChip-colorSecondary .MuiChip-label': {
          color: 'inherit',
          fontWeight: 600
        },
        '& .recharts-cartesian-axis-tick-value': {
          fill: theme => alpha(theme.palette.text.primary, 0.78)
        },
        '& [data-capture^="ai-visibility-report"]': {
          scrollMarginTop: 12
        }
      }}
    >
      <Typography id={labelId} component='h2' sx={visuallyHiddenSx}>
        {C.header.title} — {header.organizationName}
      </Typography>
      <Stack spacing={6}>
        <Masthead header={header} isPublic={isPublic} />
        {show('verdict') && (
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 5, lg: 4 }}>
              <VerdictSection model={model} />
            </Grid>
            <Grid size={{ xs: 12, md: 7, lg: 8 }}>{show('primaryGap') && <PrimaryGapSection model={model} />}</Grid>
          </Grid>
        )}
        {show('levels') && <LevelsSection model={model} />}

        <Grid container spacing={6} alignItems='stretch' data-capture='ai-visibility-report-analysis-grid'>
          {show('engineSnapshot') && (
            <Grid size={{ xs: 12, lg: 6 }} sx={{ minWidth: 0 }}>
              <EngineSnapshotSection model={model} />
            </Grid>
          )}

          {show('competitiveSov') && (
            <Grid size={{ xs: 12, lg: 6 }} sx={{ minWidth: 0 }}>
              <CompetitiveSovSection model={model} />
            </Grid>
          )}

          {show('dimensions') && (
            <Grid size={{ xs: 12 }} sx={{ minWidth: 0 }}>
              <DimensionsSection model={model} />
            </Grid>
          )}

          {show('aeoSignals') && (
            <Grid size={{ xs: 12, lg: 8 }} sx={{ minWidth: 0 }}>
              <AeoSignalsSection model={model} />
            </Grid>
          )}

          <Grid size={{ xs: 12, lg: 4 }} sx={{ minWidth: 0 }}>
            {show('trend') && <TrendSection model={model} />}
          </Grid>

          {show('recommendations') && (
            <Grid size={{ xs: 12, lg: 8 }} sx={{ minWidth: 0 }}>
              <RecommendationsSection model={model} />
            </Grid>
          )}

          {show('provenance') && (
            <Grid size={{ xs: 12, lg: 4 }} sx={{ minWidth: 0 }}>
              <ProvenanceSection model={model} />
            </Grid>
          )}
        </Grid>

        {show('disclaimer') && <DisclaimerSection model={model} isPublic={isPublic} />}
      </Stack>
    </Box>
  )
}

export default AiVisibilityReportArtifact
