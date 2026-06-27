/**
 * TASK-1252 — AI Visibility Report Artifact · PRINT/attachment render adapter (Slice D).
 *
 * Adapter de render SEPARADO del web: print/PDF-safe. Consume el MISMO
 * `ReportArtifactModel` (SoT compartido) pero NO usa JS de runtime, motion,
 * `@container`, Recharts ni AnimatedCounter — sólo HTML estático + SVG/divs
 * estáticos y tablas (el table-fallback dobla como representación del attachment).
 * Server-renderable (sin 'use client'). Standalone cover. Secciones gobernadas por
 * la disclosure matrix del variant `attachment` (sin trend ni engine snapshot).
 *
 * V1 = print-safe HTML/MUI estático; un renderer PDF premium (react-pdf) es un
 * follow-up declarado (Known visual debt en la spec).
 */

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { resolveBrandAssets } from '@/components/greenhouse/brand-assets'
import { GH_GROWTH_AI_VISIBILITY, GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT as C } from '@/lib/copy/growth'
import type { GraderReportSeverity } from '@/lib/growth/ai-visibility/report/contracts'

import { REPORT_SEVERITY_TONE, reportSectionVisible, type ReportArtifactModel } from '../model'
import type { ReportHeader } from '../web/AiVisibilityReportArtifact'

const toneColorVar = (severity: GraderReportSeverity): string => {
  const tone = REPORT_SEVERITY_TONE[severity]

  if (tone === 'success') return 'var(--mui-palette-success-main)'
  if (tone === 'warning') return 'var(--mui-palette-warning-main)'
  if (tone === 'error') return 'var(--mui-palette-error-main)'

  return 'var(--mui-palette-text-disabled)'
}

const PrintHeading = ({ title, helper }: { title: string; helper?: string }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant='h5'>{title}</Typography>
    {helper && (
      <Typography variant='body2' color='text.secondary'>
        {helper}
      </Typography>
    )}
  </Box>
)

/** Barra estática (sin animación) para dimensiones / SoV. */
const StaticBar = ({ value, color }: { value: number; color: string }) => (
  <Box sx={{ height: 8, borderRadius: 1, bgcolor: 'var(--mui-palette-action-hover)', overflow: 'hidden' }}>
    <Box sx={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, bgcolor: color }} />
  </Box>
)

export interface AiVisibilityReportPrintProps {
  model: ReportArtifactModel
  header: ReportHeader
}

/**
 * Render print-safe del informe. Pensado para envolverse en una página A4 con
 * print CSS por el attachment builder (TASK-1250); aquí va la estructura estática.
 */
const AiVisibilityReportPrint = ({ model, header }: AiVisibilityReportPrintProps) => {
  const show = (section: Parameters<typeof reportSectionVisible>[1]) => reportSectionVisible('attachment', section)

  const sovRows = [
    { name: C.sov.brandLabel, mentions: model.competitiveSov.brandMentions, isBrand: true },
    ...model.competitiveSov.competitors.map(c => ({ name: c.name, mentions: c.mentions, isBrand: false }))
  ]

  const sovMax = Math.max(1, ...sovRows.map(r => r.mentions))

  return (
    <Box
      component='article'
      aria-label={`${C.header.title} — ${header.organizationName}`}
      sx={{ maxWidth: 760, mx: 'auto', p: 6, bgcolor: 'background.paper', color: 'text.primary' }}
    >
      {/* Standalone cover */}
      <Stack spacing={3} sx={{ mb: 6 }}>
        <Box component='img' src={resolveBrandAssets('efeonce')?.wordmarkSrc} alt='Efeonce' sx={{ height: 28, width: 'auto' }} />
        <Box>
          <Typography variant='h4'>{C.header.title}</Typography>
          <Typography variant='subtitle1' sx={{ fontWeight: 600, mt: 0.5 }}>
            {header.organizationName}
          </Typography>
        </Box>
        <Stack direction='row' spacing={4} flexWrap='wrap' useFlexGap>
          <Box>
            <Typography variant='overline' color='text.secondary' sx={{ display: 'block' }}>
              {C.header.reportDateLabel}
            </Typography>
            <Typography variant='body2' sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {header.reportDate}
            </Typography>
          </Box>
          <Box>
            <Typography variant='overline' color='text.secondary' sx={{ display: 'block' }}>
              {C.header.analyzedPeriodLabel}
            </Typography>
            <Typography variant='body2' sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {header.periodLabel}
            </Typography>
          </Box>
        </Stack>
        <Divider />
      </Stack>

      {/* Verdict — static score (no gauge animation) */}
      {show('verdict') && (
        <Box sx={{ mb: 5 }} data-capture='ai-visibility-report-print-score'>
          <PrintHeading title={C.verdict.title} />
          <Stack direction='row' spacing={3} alignItems='baseline'>
            <Typography variant='kpiValue' sx={{ color: toneColorVar(model.overallSeverity) }}>
              {model.overallScore === null ? '—' : model.overallScore}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              /100 · {GH_GROWTH_AI_VISIBILITY.severity_label[model.overallSeverity]}
            </Typography>
          </Stack>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
            {C.verdict.scoreDisclaimer} · {C.verdict.coverageValue(model.provenance.providersSampled.length, model.provenance.providersSampled.length)}
          </Typography>
        </Box>
      )}

      {/* Levels (static) */}
      {show('levels') && (
        <Box sx={{ mb: 5 }}>
          <PrintHeading title={C.levelsBand.title} />
          <Stack spacing={1.5}>
            {model.levels.map(level => {
              const copy = C.level[level.id]

              return (
                <Stack key={level.id} direction='row' justifyContent='space-between'>
                  <Typography variant='body2'>
                    {copy.ordinal} · {copy.label} ({copy.labelEn})
                  </Typography>
                  <Typography variant='monoAmount' sx={{ color: toneColorVar(level.severity) }}>
                    {level.status === 'coverage' ? C.levelsBand.coverageBadge : `${level.score}/100`}
                  </Typography>
                </Stack>
              )
            })}
          </Stack>
        </Box>
      )}

      {/* Primary gap */}
      {show('primaryGap') && model.primaryGap && (
        <Box sx={{ mb: 5 }}>
          <PrintHeading title={C.primaryGap.title} />
          <Typography variant='body1'>{model.primaryGap.title}</Typography>
          {model.recommendations[0] && (
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              {C.recommendedMotion.title}: {model.recommendations[0].action}
            </Typography>
          )}
        </Box>
      )}

      {/* Dimensions (static bars) */}
      {show('dimensions') && (
        <Box sx={{ mb: 5 }} data-capture='ai-visibility-report-print-dimensions'>
          <PrintHeading title={C.dimensions.title} />
          <Stack spacing={2}>
            {model.dimensions.map(dim => {
              const empty = dim.score === null

              return (
                <Box key={dim.key}>
                  <Stack direction='row' justifyContent='space-between'>
                    <Typography variant='body2'>{dim.label}</Typography>
                    <Typography variant='monoAmount' sx={{ color: empty ? 'text.disabled' : toneColorVar(dim.severity) }}>
                      {empty ? C.levelsBand.coverageBadge : `${dim.score}/100`}
                    </Typography>
                  </Stack>
                  <StaticBar value={empty ? 0 : (dim.score as number)} color={empty ? 'var(--mui-palette-text-disabled)' : toneColorVar(dim.severity)} />
                </Box>
              )
            })}
          </Stack>
        </Box>
      )}

      {/* AEO signals (static numbers) */}
      {show('aeoSignals') && (
        <Box sx={{ mb: 5 }}>
          <PrintHeading title={C.signals.title} />
          <Stack direction='row' spacing={6} flexWrap='wrap' useFlexGap>
            <Box>
              <Typography variant='overline' color='text.secondary' sx={{ display: 'block' }}>
                {C.signals.citationShareTitle}
              </Typography>
              <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                {model.citationInsight.ownDomainShare === null ? '—' : `${model.citationInsight.ownDomainShare}%`}
              </Typography>
            </Box>
            <Box>
              <Typography variant='overline' color='text.secondary' sx={{ display: 'block' }}>
                {C.signals.sentimentTitle}
              </Typography>
              <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                {GH_GROWTH_AI_VISIBILITY.sentiment_net_label[model.sentimentSummary.net]}
              </Typography>
            </Box>
            <Box>
              <Typography variant='overline' color='text.secondary' sx={{ display: 'block' }}>
                {C.signals.prominenceTitle}
              </Typography>
              <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                {model.positionSummary.best === null ? '—' : `#${model.positionSummary.best}`}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}

      {/* Competitive SoV (static bars) */}
      {show('competitiveSov') && (
        <Box sx={{ mb: 5 }}>
          <PrintHeading title={C.sov.title} helper={C.sov.helper} />
          <Stack spacing={2}>
            {sovRows.map(row => (
              <Box key={row.name}>
                <Stack direction='row' justifyContent='space-between'>
                  <Typography variant='body2' sx={{ fontWeight: row.isBrand ? 700 : 400 }}>
                    {row.name}
                  </Typography>
                  <Typography variant='monoAmount' color={row.isBrand ? 'primary.main' : 'text.secondary'}>
                    {row.mentions} {C.sov.mentionsLabel}
                  </Typography>
                </Stack>
                <StaticBar
                  value={(row.mentions / sovMax) * 100}
                  color={row.isBrand ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-text-disabled)'}
                />
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Recommendations */}
      {show('recommendations') && (
        <Box sx={{ mb: 5 }} data-capture='ai-visibility-report-print-recommendations'>
          <PrintHeading title={C.recommendations.title} />
          <Stack spacing={2} component='ol' sx={{ pl: 3, m: 0 }}>
            {model.recommendations.map(rec => (
              <Box key={rec.gapKey} component='li'>
                <Typography variant='subtitle2'>{rec.title}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {rec.action}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Provenance */}
      {show('provenance') && (
        <Box sx={{ mb: 4 }} data-capture='ai-visibility-report-print-provenance'>
          <PrintHeading title={C.provenance.title} />
          <Box component='table' sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { textAlign: 'left', py: 0.5 } }}>
            <tbody>
              {[
                { label: C.provenance.asOf, value: model.provenance.asOfDate ?? '—' },
                { label: C.provenance.sampledProviders, value: `${model.provenance.providersSampled.length}` },
                { label: C.provenance.promptCount, value: `${model.provenance.promptCount}` },
                { label: C.provenance.scoreVersion, value: model.provenance.scoreVersion },
                { label: C.provenance.promptPackVersion, value: model.provenance.promptPackVersion }
              ].map(row => (
                <Box component='tr' key={row.label}>
                  <Box component='th' scope='row' sx={{ width: '50%' }}>
                    <Typography variant='caption' color='text.secondary'>
                      {row.label}
                    </Typography>
                  </Box>
                  <td>
                    <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {row.value}
                    </Typography>
                  </td>
                </Box>
              ))}
            </tbody>
          </Box>
        </Box>
      )}

      {/* Disclaimer */}
      {show('disclaimer') && (
        <Box>
          <Divider sx={{ mb: 2 }} />
          <Typography variant='caption' color='text.secondary'>
            {model.disclaimer}
          </Typography>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
            {C.footer.publicSafeStamp}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default AiVisibilityReportPrint
