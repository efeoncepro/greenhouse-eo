'use client'

// ─── TASK-950 Slice 3 — Nexa Insight list item card canonical ──────────────
//
// Card compacto reusable que renderiza una observación de la lista
// `/nexa/insights`. UX spec source: greenhouse-ux + state-design +
// greenhouse-ux-writing skills audit (pre-write 2026-05-29).
//
// Visual contract canonical:
//   - Card outlined elevation=0 + borderLeft 4px severity color (visual anchor).
//   - Severity chip (icon + label, NUNCA color-only — WCAG 2.2 AA).
//   - Headline = explanationSummary (NexaMentionText, line-clamp 4).
//   - Caption = metricName + signalType (informational secondary).
//   - CTA "Ver causa raíz" → drill href canonical TASK-947 reader export.
//   - Card wrapped en Next.js Link (semantic anchor) — right-click "open in
//     new tab" funciona nativo, keyboard nav nativo, accessibility canonical.
//
// Cero literals JSX — toda copy via `GH_NEXA` (CLAUDE.md microcopy contract).

import Link from 'next/link'

import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import classNames from 'classnames'

import CustomChip from '@core/components/mui/Chip'

import NexaMentionText from '@/components/greenhouse/NexaMentionText'
import { GH_NEXA } from '@/lib/copy/nexa'
import { buildNexaInsightDrillHref } from '@/lib/ico-engine/ai/nexa-insight-href'

import type { NexaInsightDetailSnapshot } from '@/lib/ico-engine/ai/nexa-insight-drill-reader'

export interface NexaInsightListItemCardProps {
  insight: NexaInsightDetailSnapshot
}

// Severity icon canonical — Tabler icons matched a `severity` enum del reader.
const SEVERITY_ICON: Record<string, string> = {
  critical: 'tabler-alert-octagon',
  warning: 'tabler-alert-triangle',
  info: 'tabler-info-circle'
}

const SEVERITY_ICON_UNKNOWN = 'tabler-help-circle'

const NexaInsightListItemCard = ({ insight }: NexaInsightListItemCardProps) => {
  const drillHref = buildNexaInsightDrillHref(insight.signalId)

  const severityKey = insight.severity ?? 'unknown'
  const severityColor = GH_NEXA.severity_color[severityKey] ?? 'secondary'
  const severityLabel = GH_NEXA.severity_label[severityKey] ?? GH_NEXA.severity_label_unknown
  const severityIcon = SEVERITY_ICON[severityKey] ?? SEVERITY_ICON_UNKNOWN

  const signalTypeLabel = GH_NEXA.signal_type[insight.signalType] ?? insight.signalType

  const ariaLabel = GH_NEXA.list_card_aria_label(insight.metricName, severityLabel)

  return (
    <Card
      component={Link}
      href={drillHref}
      aria-label={ariaLabel}
      elevation={0}
      variant='outlined'
      sx={theme => ({
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '4px solid',
        borderLeftColor: theme.palette[severityColor]?.main ?? theme.palette.text.secondary,
        textDecoration: 'none',
        color: 'inherit',
        transition: theme.transitions.create(['box-shadow', 'transform'], {
          duration: theme.transitions.duration.shorter
        }),
        '&:hover': { boxShadow: theme.shadows[2] },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2
        },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
      })}
    >
      <CardContent sx={{ flex: 1, pb: 1 }}>
        <Stack spacing={2.5}>
          <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap'>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={severityColor}
              icon={<i className={classNames(severityIcon)} aria-hidden='true' />}
              label={severityLabel}
            />
            <Typography variant='caption' color='text.secondary'>
              {signalTypeLabel}
            </Typography>
          </Stack>

          {insight.explanationSummary ? (
            <NexaMentionText
              text={insight.explanationSummary}
              variant='body1'
              sx={{
                fontWeight: 500,
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            />
          ) : (
            <Typography variant='body1' color='text.secondary' fontStyle='italic'>
              {insight.metricName}
            </Typography>
          )}

          <Typography variant='caption' color='text.secondary'>
            {insight.metricName}
          </Typography>
        </Stack>
      </CardContent>
      <CardActions sx={{ mt: 'auto', px: 5, pb: 4 }}>
        <Typography
          variant='button'
          color='primary'
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontWeight: 600 }}
        >
          {GH_NEXA.list_card_drill_cta}
          <i className='tabler-arrow-right' aria-hidden='true' style={{ fontSize: 16 }} />
        </Typography>
      </CardActions>
    </Card>
  )
}

export default NexaInsightListItemCard
