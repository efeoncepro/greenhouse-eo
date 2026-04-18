'use client'

import { useMemo } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import MuiTimeline from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import { styled } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import EmptyState from '@/components/greenhouse/EmptyState'
import NexaMentionText from '@/components/greenhouse/NexaMentionText'
import NexaInsightRootCauseSection from '@/components/greenhouse/NexaInsightRootCauseSection'
import { GH_NEXA } from '@/config/greenhouse-nomenclature'
import { getMetricById } from '@/lib/ico-engine/metric-registry'

// ─── Types ──────────────────────────────────────────────────────────────────

export type NexaTimelineItem = {
  id: string
  signalType: string
  metricId: string
  severity: string | null
  explanation: string | null
  rootCauseNarrative: string | null
  recommendedAction: string | null
  processedAt: string
}

export type NexaInsightsTimelineProps = {
  insights: NexaTimelineItem[]
}

// ─── Styled Timeline ────────────────────────────────────────────────────────

const Timeline = styled(MuiTimeline)({
  paddingLeft: 0,
  paddingRight: 0,
  marginTop: 0,
  marginBottom: 0,
  '& .MuiTimelineItem-root': {
    width: '100%',
    '&:before': { display: 'none' }
  }
})

// ─── Helpers ────────────────────────────────────────────────────────────────

const DAY_FORMATTER = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})

const TIME_FORMATTER = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  hour: '2-digit',
  minute: '2-digit'
})

const DAY_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

const getDayKey = (iso: string) => {
  try {
    const date = new Date(iso)

    if (isNaN(date.getTime())) return iso

    return DAY_KEY_FORMATTER.format(date)
  } catch {
    return iso
  }
}

const getDayLabel = (iso: string, now: Date): string => {
  try {
    const date = new Date(iso)

    if (isNaN(date.getTime())) return '—'

    const today = DAY_KEY_FORMATTER.format(now)
    const yesterday = DAY_KEY_FORMATTER.format(new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const key = DAY_KEY_FORMATTER.format(date)

    if (key === today) return GH_NEXA.insights_timeline_day_today
    if (key === yesterday) return GH_NEXA.insights_timeline_day_yesterday

    return DAY_FORMATTER.format(date)
  } catch {
    return '—'
  }
}

const getTimeLabel = (iso: string): string => {
  try {
    const date = new Date(iso)

    if (isNaN(date.getTime())) return ''

    return TIME_FORMATTER.format(date)
  } catch {
    return ''
  }
}

const getMetricDisplayName = (metricId: string): string => {
  const metric = getMetricById(metricId) ?? getMetricById(metricId.replace('_avg', '').replace('_pct', ''))

  return metric?.shortName ?? metric?.label ?? metricId
}

const getSeverityDotColor = (severity: string | null): 'error' | 'warning' | 'info' | 'grey' => {
  if (severity === 'critical') return 'error'
  if (severity === 'warning') return 'warning'
  if (severity === 'info') return 'info'

  return 'grey'
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

const DayHeader = ({ label, count }: { label: string; count: number }) => (
  <Box sx={{ mb: 1.5, mt: 0.5 }}>
    <Typography
      variant='overline'
      sx={{
        color: 'text.secondary',
        letterSpacing: '0.5px',
        fontWeight: 600,
        textTransform: 'uppercase',
        display: 'block'
      }}
    >
      {label}
    </Typography>
    <Typography variant='caption' sx={{ color: 'text.disabled' }}>
      {count === 1 ? '1 señal' : `${count} señales`}
    </Typography>
  </Box>
)

const TimelineEntry = ({ item, isLast }: { item: NexaTimelineItem; isLast: boolean }) => {
  const signalLabel = GH_NEXA.signal_type[item.signalType] ?? item.signalType
  const severityColor = GH_NEXA.severity_color[item.severity ?? ''] ?? 'secondary'
  const metricName = getMetricDisplayName(item.metricId)
  const time = getTimeLabel(item.processedAt)
  const dotColor = getSeverityDotColor(item.severity)

  return (
    <TimelineItem>
      <TimelineSeparator>
        <TimelineDot color={dotColor} variant={dotColor === 'grey' ? 'outlined' : 'filled'} sx={{ my: 0.5 }} />
        {!isLast && <TimelineConnector />}
      </TimelineSeparator>
      <TimelineContent sx={{ pb: 2.5, pt: 0.25 }}>
        <Stack spacing={1}>
          <Stack direction='row' spacing={1} alignItems='center' sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={severityColor}
              label={signalLabel}
              sx={{ height: 20, fontSize: '0.64rem', fontWeight: 600 }}
            />
            <Typography variant='subtitle2' sx={{ color: theme => theme.palette.customColors.midnight }}>
              {metricName}
            </Typography>
            {time && (
              <Typography variant='caption' sx={{ color: 'text.disabled', ml: 'auto' }}>
                {GH_NEXA.insights_timeline_time_at(time)}
              </Typography>
            )}
          </Stack>

          {item.explanation && (
            <NexaMentionText
              text={item.explanation}
              variant='body2'
              sx={{
                color: 'text.secondary',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            />
          )}

          {item.rootCauseNarrative && item.rootCauseNarrative.trim() && (
            <NexaInsightRootCauseSection narrative={item.rootCauseNarrative} insightId={item.id} />
          )}

          {item.recommendedAction && (
            <Box
              sx={{
                mt: 0.5,
                pl: 1.5,
                borderLeft: t => `3px solid ${t.palette.warning.main}`
              }}
            >
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.25 }}
              >
                {GH_NEXA.insights_action_label}
              </Typography>
              <NexaMentionText
                text={item.recommendedAction}
                variant='body2'
                sx={{ color: theme => theme.palette.customColors.midnight }}
              />
            </Box>
          )}
        </Stack>
      </TimelineContent>
    </TimelineItem>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

const NexaInsightsTimeline = ({ insights }: NexaInsightsTimelineProps) => {
  const now = useMemo(() => new Date(), [])

  const groups = useMemo(() => {
    const map = new Map<string, NexaTimelineItem[]>()

    insights.forEach(item => {
      const key = getDayKey(item.processedAt)
      const bucket = map.get(key) ?? []

      bucket.push(item)
      map.set(key, bucket)
    })

    return [...map.entries()].map(([key, items], groupIndex, arr) => ({
      key,
      label: getDayLabel(items[0]?.processedAt ?? key, now),
      items,
      isLastGroup: groupIndex === arr.length - 1
    }))
  }, [insights, now])

  if (insights.length === 0) {
    return (
      <EmptyState
        icon='tabler-history'
        title={GH_NEXA.insights_timeline_empty_title}
        description={GH_NEXA.insights_timeline_empty_description}
        minHeight={180}
      />
    )
  }

  return (
    <Box
      role='region'
      aria-label={GH_NEXA.insights_timeline_title}
      sx={{ mt: 1 }}
    >
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography
          variant='overline'
          sx={{
            color: 'text.secondary',
            letterSpacing: '0.5px',
            fontWeight: 600,
            textTransform: 'uppercase'
          }}
        >
          {GH_NEXA.insights_timeline_title}
        </Typography>
        <Typography variant='caption' sx={{ color: 'text.disabled' }}>
          {GH_NEXA.insights_timeline_subtitle(insights.length)}
        </Typography>
      </Stack>

      {groups.map((group, groupIdx) => (
        <Box key={group.key} sx={{ mb: groupIdx === groups.length - 1 ? 0 : 1 }}>
          <DayHeader label={group.label} count={group.items.length} />
          <Timeline>
            {group.items.map((item, itemIdx) => {
              const isLastInAll = group.isLastGroup && itemIdx === group.items.length - 1

              return <TimelineEntry key={item.id} item={item} isLast={isLastInAll} />
            })}
          </Timeline>
        </Box>
      ))}
    </Box>
  )
}

export default NexaInsightsTimeline
