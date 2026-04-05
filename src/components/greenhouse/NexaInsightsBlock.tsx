'use client'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import EmptyState from '@/components/greenhouse/EmptyState'
import { motion, AnimatePresence } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'
import { GH_NEXA, GH_COLORS } from '@/config/greenhouse-nomenclature'
import { getMetricById } from '@/lib/ico-engine/metric-registry'
import NexaMentionText from '@/components/greenhouse/NexaMentionText'

// ─── Public Types ──────────────────────────────────────────────────────────

export type NexaInsightItem = {
  id: string
  signalType: string
  metricId: string
  severity: string | null
  explanation: string | null
  recommendedAction: string | null
}

export type NexaInsightsBlockProps = {
  insights: NexaInsightItem[]
  totalAnalyzed: number
  lastAnalysis: string | null
  runStatus: 'succeeded' | 'partial' | 'failed' | null
  defaultExpanded?: boolean
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const getMetricDisplayName = (metricId: string): string => {
  const metric = getMetricById(metricId) ?? getMetricById(metricId.replace('_avg', '').replace('_pct', ''))

  return metric?.shortName ?? metric?.label ?? metricId
}

const formatTimestamp = (iso: string | null) => {
  if (!iso) return '—'

  try {
    const date = new Date(iso)

    if (isNaN(date.getTime())) return '—'

    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '—'
  }
}

const getRunChip = (status: string | null) => ({
  label: GH_NEXA.run_status[status ?? ''] ?? GH_NEXA.insights_chip_no_data,
  color: (GH_NEXA.run_status_color[status ?? ''] ?? 'secondary') as 'success' | 'warning' | 'error' | 'secondary'
})

// ─── Subcomponents ─────────────────────────────────────────────────────────

const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: 'easeOut' as const }
  })
}

const InsightCard = ({ item, index, animate }: { item: NexaInsightItem; index: number; animate: boolean }) => {
  const signalLabel = GH_NEXA.signal_type[item.signalType] ?? item.signalType
  const severityColor = GH_NEXA.severity_color[item.severity ?? ''] ?? 'secondary'
  const metricName = getMetricDisplayName(item.metricId)

  const content = (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: `1px solid ${GH_COLORS.neutral.border}`,
        bgcolor: 'background.paper',
        '&:hover': { bgcolor: 'action.hover' }
      }}
    >
      <Stack spacing={1}>
        {/* Header: signal type + metric */}
        <Stack direction='row' spacing={1} alignItems='center'>
          <CustomChip
            round='true'
            size='small'
            variant='tonal'
            color={severityColor}
            label={signalLabel}
            sx={{ height: 20, fontSize: '0.64rem', fontWeight: 600 }}
          />
          <Typography variant='subtitle2' sx={{ color: GH_COLORS.neutral.textPrimary }}>
            {metricName}
          </Typography>
        </Stack>

        {/* Explanation */}
        {item.explanation && (
          <NexaMentionText
            text={item.explanation}
            variant='body2'
            sx={{
              color: GH_COLORS.neutral.textSecondary,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          />
        )}

        {/* Recommended action */}
        {item.recommendedAction && (
          <Box
            sx={{
              mt: 0.5,
              pl: 1.5,
              borderLeft: t => `3px solid ${t.palette.warning.main}`
            }}
          >
            <Typography variant='caption' sx={{ fontWeight: 600, color: GH_COLORS.neutral.textSecondary, display: 'block', mb: 0.25 }}>
              {GH_NEXA.insights_action_label}
            </Typography>
            <NexaMentionText
              text={item.recommendedAction}
              variant='body2'
              sx={{ color: GH_COLORS.neutral.textPrimary }}
            />
          </Box>
        )}
      </Stack>
    </Box>
  )

  if (!animate) return content

  return (
    <motion.div
      custom={index}
      initial='hidden'
      animate='visible'
      variants={STAGGER_ITEM}
    >
      {content}
    </motion.div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

const NexaInsightsBlock = ({
  insights,
  totalAnalyzed,
  lastAnalysis,
  runStatus,
  defaultExpanded
}: NexaInsightsBlockProps) => {
  const prefersReduced = useReducedMotion()
  const hasData = totalAnalyzed > 0
  const chip = getRunChip(runStatus)
  const countWithActions = insights.filter(i => i.recommendedAction).length

  if (!hasData) {
    return (
      <Card elevation={0} sx={{ border: `1px solid ${GH_COLORS.neutral.border}` }}>
        <Accordion disableGutters elevation={0} defaultExpanded={defaultExpanded}>
          <AccordionSummary expandIcon={<i className='tabler-chevron-down' aria-hidden='true' />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <i className='tabler-sparkles' style={{ fontSize: 20, color: '#7367F0' }} aria-hidden='true' />
              <Typography variant='h6'>{GH_NEXA.insights_title}</Typography>
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color='secondary'
                label={GH_NEXA.insights_chip_no_data}
                sx={{ height: 20, fontSize: '0.64rem', fontWeight: 600 }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <EmptyState
              icon='tabler-sparkles'
              animatedIcon='/animations/empty-inbox.json'
              title={GH_NEXA.empty_title}
              description={GH_NEXA.empty_description}
              minHeight={160}
            />
          </AccordionDetails>
        </Accordion>
      </Card>
    )
  }

  return (
    <Card elevation={0} sx={{ border: `1px solid ${GH_COLORS.neutral.border}` }}>
      <Accordion disableGutters elevation={0} defaultExpanded={defaultExpanded}>
        <AccordionSummary expandIcon={<i className='tabler-chevron-down' aria-hidden='true' />}>
          <Stack direction='row' alignItems='center' spacing={2} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
            <i className='tabler-sparkles' style={{ fontSize: 20, color: '#7367F0' }} aria-hidden='true' />
            <Typography variant='h6'>{GH_NEXA.insights_title}</Typography>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={chip.color}
              label={chip.label}
              sx={{ height: 20, fontSize: '0.64rem', fontWeight: 600 }}
            />
            {lastAnalysis && (
              <Typography
                variant='caption'
                sx={{ color: GH_COLORS.neutral.textSecondary, display: { xs: 'none', sm: 'inline' } }}
              >
                · {GH_NEXA.insights_last_analysis(formatTimestamp(lastAnalysis))}
              </Typography>
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={4}>
            {/* KPIs */}
            <Grid container spacing={6}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <HorizontalWithSubtitle
                  title={GH_NEXA.kpi_analyzed}
                  stats={<AnimatedCounter value={totalAnalyzed} format='integer' />}
                  avatarIcon='tabler-sparkles'
                  avatarColor='primary'
                  subtitle={GH_NEXA.kpi_analyzed_subtitle(totalAnalyzed)}
                  titleTooltip={GH_NEXA.kpi_analyzed_tooltip}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <HorizontalWithSubtitle
                  title={GH_NEXA.kpi_actionable}
                  stats={<AnimatedCounter value={countWithActions} format='integer' />}
                  avatarIcon='tabler-bulb'
                  avatarColor='warning'
                  subtitle={GH_NEXA.kpi_actionable_subtitle(countWithActions, totalAnalyzed)}
                  titleTooltip={GH_NEXA.kpi_actionable_tooltip}
                />
              </Grid>
            </Grid>

            {/* Insights list */}
            {insights.length > 0 && (
              <div>
                <Typography variant='overline' sx={{ color: GH_COLORS.neutral.textSecondary, mb: 1.5, display: 'block' }}>
                  {GH_NEXA.insights_list_title}
                </Typography>
                <AnimatePresence>
                  <Stack spacing={1.5}>
                    {insights.map((item, i) => (
                      <InsightCard key={item.id} item={item} index={i} animate={!prefersReduced} />
                    ))}
                  </Stack>
                </AnimatePresence>
              </div>
            )}

            {/* Nexa disclaimer */}
            <Typography
              variant='caption'
              sx={{
                color: GH_COLORS.neutral.textSecondary,
                textAlign: 'center',
                display: 'block',
                pt: 2,
                borderTop: `1px solid ${GH_COLORS.neutral.border}`
              }}
            >
              {GH_NEXA.disclaimer}
            </Typography>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Card>
  )
}

export default NexaInsightsBlock
