'use client'

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import { DataTableShell } from '@/components/greenhouse/data-table'
import {
  AdaptiveSidecarLayout,
  ContextualSidecar,
  ContextualSidecarProgress,
  ContextualSidecarSection,
  ContextualSidecarSignal,
  GreenhouseButton,
  GreenhouseChip,
  type GreenhouseButtonTone,
  type GreenhouseChipTone
} from '@/components/greenhouse/primitives'
import {
  reduceAdaptiveSidecarState,
  type AdaptiveSidecarControllerState
} from '@/components/greenhouse/primitives/adaptive-sidecar-controller'
import { GH_QUOTES_PIPELINE } from '@/lib/copy/finance'
import { getMicrocopy } from '@/lib/copy'
import { formatCurrency as formatGreenhouseCurrency, formatNumber } from '@/lib/format'
import { useListAnimation } from '@/hooks/useListAnimation'
import useQuotesList, { type QuoteListItem } from '@/hooks/useQuotesList'
import useViewTransitionRouter from '@/hooks/useViewTransitionRouter'

const GREENHOUSE_COPY = getMicrocopy()
const COPY = GH_QUOTES_PIPELINE

type Quote = QuoteListItem
type StatusBucket = 'all' | 'draft' | 'issued' | 'expired' | 'accepted'
type SortDirection = 'desc' | 'asc'
type QuoteSurfaceTone = Exclude<GreenhouseChipTone, 'default'> | 'neutral'

const DEFAULT_ROWS_PER_PAGE = 12

const STATUS_CONFIG: Record<string, { label: string; tone: GreenhouseChipTone }> = {
  draft: { label: GREENHOUSE_COPY.states.draft, tone: 'default' },
  pending_approval: { label: 'En aprobación', tone: 'warning' },
  approval_rejected: { label: 'Revisión requerida', tone: 'error' },
  issued: { label: 'Emitida', tone: 'info' },
  sent: { label: 'Enviada', tone: 'info' },
  approved: { label: 'Emitida', tone: 'info' },
  accepted: { label: 'Aceptada', tone: 'success' },
  rejected: { label: 'Revisión requerida', tone: 'error' },
  expired: { label: 'Vencida', tone: 'warning' },
  converted: { label: 'Facturada', tone: 'success' }
}

const SOURCE_OPTIONS = [
  { value: '', label: COPY.allSources },
  { value: 'nubox', label: 'Nubox' },
  { value: 'hubspot', label: 'HubSpot' },
  { value: 'manual', label: 'Manual' }
]

const SOURCE_CHIP_CONFIG: Record<string, { label: string; tone: GreenhouseChipTone; activity: string }> = {
  nubox: { label: 'Nubox', tone: 'info', activity: COPY.activitySourceNubox },
  hubspot: { label: 'HubSpot', tone: 'info', activity: COPY.activitySourceHubSpot },
  manual: { label: 'Manual', tone: 'default', activity: COPY.activitySourceManual }
}

const STATUS_BUCKETS: Array<{ value: StatusBucket; label: string; icon: string; tone: GreenhouseButtonTone }> = [
  { value: 'all', label: COPY.statusAll, icon: 'tabler-layout-list', tone: 'primary' },
  { value: 'draft', label: COPY.statusDraft, icon: 'tabler-pencil', tone: 'primary' },
  { value: 'issued', label: COPY.statusIssued, icon: 'tabler-send', tone: 'info' },
  { value: 'expired', label: COPY.statusExpired, icon: 'tabler-clock-exclamation', tone: 'warning' },
  { value: 'accepted', label: COPY.statusAccepted, icon: 'tabler-circle-check', tone: 'success' }
]

const EMPTY_SIDECAR_STATE: AdaptiveSidecarControllerState = {
  open: false,
  kind: 'preview',
  mode: 'push'
}

const SURFACE_GUTTER = { xs: 4, md: 5 } as const
const SURFACE_GUTTER_COMPACT = { xs: 3.5, md: 4 } as const

const neutralControlSx = (theme: Theme) => ({
  color: theme.palette.text.secondary,
  borderColor: alpha(theme.palette.divider, 0.9),
  bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.46 : 0.74),
  '&:hover': {
    color: theme.palette.text.primary,
    borderColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.28 : 0.2),
    bgcolor: alpha(theme.palette.action.hover, theme.palette.mode === 'dark' ? 0.36 : 0.72)
  }
})

const neutralSelectedControlSx = (theme: Theme) => ({
  color: theme.palette.text.primary,
  borderColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.3 : 0.18),
  bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.16 : 0.075),
  boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.1 : 0.06)}`,
  '&:hover': {
    bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.2 : 0.095),
    borderColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.38 : 0.24)
  }
})

const tonePalette = (theme: Theme, tone: QuoteSurfaceTone) => {
  if (tone === 'neutral') {
    return {
      main: theme.palette.text.secondary,
      soft: alpha(theme.palette.action.selected, theme.palette.mode === 'dark' ? 0.46 : 0.72),
      border: alpha(theme.palette.divider, 0.72),
      shadow: alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.18 : 0.05)
    }
  }

  return {
    main: theme.palette[tone].main,
    soft: alpha(theme.palette[tone].main, theme.palette.mode === 'dark' ? 0.14 : 0.08),
    border: alpha(theme.palette[tone].main, theme.palette.mode === 'dark' ? 0.4 : 0.22),
    shadow: alpha(theme.palette[tone].main, theme.palette.mode === 'dark' ? 0.14 : 0.07)
  }
}

const formatCLP = (amount: number) =>
  formatGreenhouseCurrency(amount, 'CLP', { maximumFractionDigits: 0 }, 'es-CL')

const formatCompactCLP = (amount: number) => {
  if (!Number.isFinite(amount)) return formatCLP(0)

  if (Math.abs(amount) >= 1_000_000) {
    return `$${formatNumber(amount / 1_000_000, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
      locale: 'es-CL'
    })}M`
  }

  return formatCLP(amount)
}

const formatDate = (date: string | null) => {
  if (!date) return '—'

  const [y, m, d] = date.split('-')

  return `${d}/${m}/${y}`
}

const parseDate = (date: string | null) => {
  if (!date) return null

  const [year, month, day] = date.split('-').map(Number)

  if (!year || !month || !day) return null

  return new Date(year, month - 1, day)
}

const statusMatchesBucket = (status: string, bucket: StatusBucket) => {
  if (bucket === 'all') return true
  if (bucket === 'draft') return ['draft', 'pending_approval', 'approval_rejected'].includes(status)
  if (bucket === 'issued') return ['issued', 'sent', 'approved'].includes(status)
  if (bucket === 'expired') return status === 'expired'
  if (bucket === 'accepted') return ['accepted', 'converted'].includes(status)

  return true
}

const marginTone = (effective: number | null, floor: number | null, target: number | null): GreenhouseChipTone => {
  if (effective === null) return 'default'
  if (floor !== null && effective < floor) return 'error'
  if (target !== null && effective < target) return 'warning'

  return 'success'
}

const marginLabel = (quote: Quote) => {
  if (quote.effectiveMarginPct === null) return COPY.marginUnknown

  const tone = marginTone(quote.effectiveMarginPct, quote.marginFloorPct, quote.targetMarginPct)

  if (tone === 'error') return COPY.marginRisk
  if (tone === 'warning') return COPY.marginWatch

  return COPY.marginHealthy
}

const isDueThisWeek = (dueDate: string | null) => {
  const due = parseDate(dueDate)

  if (!due) return false

  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = new Date(start)

  end.setDate(start.getDate() + 7)

  return due >= start && due <= end
}

const MetricTile = ({
  icon,
  label,
  value,
  helper,
  tone = 'primary'
}: {
  icon: string
  label: string
  value: string
  helper: string
  tone?: QuoteSurfaceTone
}) => (
  <Box
    role='group'
    aria-label={`${label}: ${value}`}
    sx={theme => ({
      minWidth: 0,
      border: `1px solid ${alpha(theme.palette.divider, 0.76)}`,
      borderRadius: `${theme.shape.customBorderRadius.md}px`,
      bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.62 : 0.72),
      p: 2.5,
      boxShadow: 'none',
      transition: theme.transitions.create(['border-color', 'box-shadow', 'transform'], {
        duration: theme.transitions.duration.shorter,
        easing: 'cubic-bezier(0.2, 0, 0, 1)'
      }),
      '&:hover': {
        borderColor: tone === 'neutral'
          ? alpha(theme.palette.divider, 0.92)
          : alpha(theme.palette[tone].main, theme.palette.mode === 'dark' ? 0.48 : 0.28),
        boxShadow: tone === 'neutral'
          ? `0 8px 20px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.16 : 0.035)}`
          : `0 8px 20px ${alpha(theme.palette[tone].main, theme.palette.mode === 'dark' ? 0.12 : 0.04)}`,
        transform: 'translateY(-1px)'
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:hover': {
          transform: 'none'
        }
      }
    })}
  >
    <Stack spacing={2}>
      <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
        <Typography variant='caption' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
          {label}
        </Typography>
        <Box
          aria-hidden='true'
          sx={theme => ({
            display: 'grid',
            placeItems: 'center',
            inlineSize: 30,
            blockSize: 30,
            flexShrink: 0,
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            color: tone === 'neutral' ? theme.palette.text.secondary : theme.palette[tone].main,
            bgcolor: tone === 'neutral'
              ? alpha(theme.palette.action.selected, theme.palette.mode === 'dark' ? 0.42 : 0.72)
              : alpha(theme.palette[tone].main, theme.palette.mode === 'dark' ? 0.14 : 0.08)
          })}
        >
          <i className={icon} />
        </Box>
      </Stack>
      <Typography variant='h6' sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      <Typography variant='caption' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
        {helper}
      </Typography>
    </Stack>
  </Box>
)

const QuotePreviewMetricStrip = ({
  items
}: {
  items: Array<{
    label: string
    value: string
    helper: string
    icon: string
    tone: QuoteSurfaceTone
  }>
}) => (
  <Box
    role='list'
    data-sidecar-block='metric-strip'
    sx={theme => ({
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: `repeat(${items.length}, minmax(0, 1fr))` },
      border: `1px solid ${alpha(theme.palette.divider, 0.78)}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      overflow: 'hidden',
      bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.7 : 0.92),
      boxShadow: `0 14px 38px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.22 : 0.05)}`
    })}
  >
    {items.map((item, index) => (
      <Box
        key={item.label}
        role='listitem'
        sx={theme => ({
          minWidth: 0,
          p: 3,
          borderInlineStart: { xs: 0, sm: index === 0 ? 0 : `1px solid ${alpha(theme.palette.divider, 0.72)}` },
          borderBlockStart: { xs: index === 0 ? 0 : `1px solid ${alpha(theme.palette.divider, 0.72)}`, sm: 0 },
          transition: theme.transitions.create(['background-color'], {
            duration: theme.transitions.duration.shorter,
            easing: 'cubic-bezier(0.2, 0, 0, 1)'
          }),
          '&:hover': {
            bgcolor: tonePalette(theme, item.tone).soft
          }
        })}
      >
        <Stack direction='row' spacing={2} alignItems='center'>
          <Box
            aria-hidden='true'
            sx={theme => {
              const palette = tonePalette(theme, item.tone)

              return {
                display: 'grid',
                placeItems: 'center',
                inlineSize: 28,
                blockSize: 28,
                flexShrink: 0,
                borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                color: palette.main,
                bgcolor: palette.soft
              }
            }}
          >
            <i className={item.icon} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='caption' color='text.secondary'>
              {item.label}
            </Typography>
            <Typography
              variant='h5'
              sx={theme => ({
                mt: 0.5,
                color: item.tone === 'neutral' ? theme.palette.text.primary : tonePalette(theme, item.tone).main,
                fontVariantNumeric: 'tabular-nums'
              })}
            >
              {item.value}
            </Typography>
          </Box>
        </Stack>
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1, overflowWrap: 'anywhere' }}>
          {item.helper}
        </Typography>
      </Box>
    ))}
  </Box>
)

const QuoteCycleTimeline = ({
  items
}: {
  items: Array<{
    id: string
    title: string
    meta: string
    icon: string
    tone: QuoteSurfaceTone
  }>
}) => (
  <Stack spacing={0} role='list' data-sidecar-block='timeline'>
    {items.map((item, index) => (
      <Stack key={item.id} direction='row' spacing={3} alignItems='flex-start' role='listitem'>
        <Stack alignItems='center' sx={{ pt: 0.25 }}>
          <Box
            aria-hidden='true'
            sx={theme => {
              const palette = tonePalette(theme, item.tone)

              return {
                display: 'grid',
                placeItems: 'center',
                inlineSize: 30,
                blockSize: 30,
                borderRadius: '50%',
                color: palette.main,
                bgcolor: palette.soft,
                boxShadow: `0 0 0 4px ${alpha(palette.main, theme.palette.mode === 'dark' ? 0.08 : 0.045)}`
              }
            }}
          >
            <i className={item.icon} />
          </Box>
          {index < items.length - 1 ? (
            <Box
              sx={theme => {
                const palette = tonePalette(theme, item.tone)

                return {
                  width: 2,
                  minHeight: 34,
                  my: 1,
                  borderRadius: 999,
                  bgcolor: alpha(palette.main, theme.palette.mode === 'dark' ? 0.28 : 0.16)
                }
              }}
            />
          ) : null}
        </Stack>
        <Box sx={{ minWidth: 0, flex: 1, pb: index < items.length - 1 ? 3 : 0 }}>
          <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
            <Typography variant='body2' fontWeight={800}>
              {item.title}
            </Typography>
            <Box
              component='span'
              sx={theme => {
                const palette = tonePalette(theme, item.tone)

                return {
                  display: 'inline-flex',
                  alignItems: 'center',
                  maxInlineSize: 190,
                  border: `1px solid ${palette.border}`,
                  borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                  px: 1.5,
                  py: 0.5,
                  color: item.tone === 'neutral' ? theme.palette.text.secondary : palette.main,
                  bgcolor: palette.soft,
                  fontSize: theme.typography.caption.fontSize,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  fontVariantNumeric: 'tabular-nums',
                  overflowWrap: 'anywhere'
                }
              }}
            >
              {item.meta}
            </Box>
          </Stack>
        </Box>
      </Stack>
    ))}
  </Stack>
)

const QuoteActivitySignal = ({
  icon,
  title,
  description,
  meta,
  secondaryMeta,
  tone
}: {
  icon: string
  title: string
  description: string
  meta: string
  secondaryMeta: string
  tone: QuoteSurfaceTone
}) => (
  <Box
    role='group'
    aria-label={title}
    data-sidecar-block='signal'
    sx={theme => {
      const palette = tonePalette(theme, tone)

      return {
        border: `1px solid ${palette.border}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        p: 4,
        bgcolor: tone === 'neutral'
          ? alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.72 : 0.92)
          : `linear-gradient(135deg, ${alpha(palette.main, 0.068)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 72%)`,
        boxShadow: `0 14px 38px ${palette.shadow}`,
        transition: theme.transitions.create(['border-color', 'box-shadow', 'transform'], {
          duration: theme.transitions.duration.shorter,
          easing: 'cubic-bezier(0.2, 0, 0, 1)'
        }),
        '&:hover': {
          borderColor: tone === 'neutral' ? alpha(theme.palette.divider, 0.9) : alpha(palette.main, 0.34),
          transform: 'translateY(-1px)'
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' }
        }
      }
    }}
  >
    <Stack direction='row' spacing={3} alignItems='flex-start'>
      <Box
        aria-hidden='true'
        sx={theme => {
          const palette = tonePalette(theme, tone)

          return {
            display: 'grid',
            placeItems: 'center',
            inlineSize: 38,
            blockSize: 38,
            flexShrink: 0,
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            color: palette.main,
            bgcolor: palette.soft
          }
        }}
      >
        <i className={icon} />
      </Box>
      <Stack spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction='row' spacing={2} alignItems='flex-start' justifyContent='space-between'>
          <Typography variant='body2' fontWeight={800}>
            {title}
          </Typography>
          <Stack spacing={0.5} alignItems='flex-end' sx={{ flexShrink: 0 }}>
            <Typography
              variant='caption'
              sx={theme => ({
                color: tone === 'neutral' ? theme.palette.text.secondary : tonePalette(theme, tone).main,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums'
              })}
            >
              {meta}
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {secondaryMeta}
            </Typography>
          </Stack>
        </Stack>
        <Typography variant='body2' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
          {description}
        </Typography>
      </Stack>
    </Stack>
  </Box>
)

const QuotePreview = ({
  quote,
  onClose,
  onOpenDetail
}: {
  quote: Quote | null
  onClose: () => void
  onOpenDetail: (quote: Quote) => void
}) => {
  if (!quote) {
    return (
      <ContextualSidecar
        kind='preview'
        icon='tabler-file-description'
        eyebrow={COPY.previewEyebrow}
        title={COPY.previewEmptyTitle}
        subtitle={COPY.previewEmptyBody}
        onClose={onClose}
        dataCapture='finance-quotes-preview'
      >
        <ContextualSidecarSignal
          color='info'
          icon='tabler-eye'
          title={COPY.previewEmptyTitle}
          description={COPY.previewEmptyBody}
        />
      </ContextualSidecar>
    )
  }

  const statusConf = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft
  const sourceConf = SOURCE_CHIP_CONFIG[quote.source] ?? SOURCE_CHIP_CONFIG.manual
  const currentMarginTone = marginTone(quote.effectiveMarginPct, quote.marginFloorPct, quote.targetMarginPct)
  const marginProgress = Math.max(0, Math.min(100, Math.round(quote.effectiveMarginPct ?? 0)))
  const version = quote.currentVersion ?? 1
  const quoteHasIssued = statusMatchesBucket(quote.status, 'issued') || statusMatchesBucket(quote.status, 'accepted')
  const dueTone: QuoteSurfaceTone = quote.status === 'expired' ? 'warning' : isDueThisWeek(quote.dueDate) ? 'warning' : 'neutral'

  return (
    <ContextualSidecar
      kind='preview'
      icon='tabler-file-description'
      eyebrow={COPY.previewEyebrow}
      title={quote.quoteNumber ?? '—'}
      subtitle={quote.clientName ?? '—'}
      onClose={onClose}
      motionKey={quote.quoteId}
      dataCapture='finance-quotes-preview'
      footer={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <GreenhouseButton
            fullWidth
            kind='primaryAction'
            leadingIconClassName='tabler-external-link'
            onClick={() => onOpenDetail(quote)}
          >
            {COPY.openDetail}
          </GreenhouseButton>
        </Stack>
      }
    >
      <Stack spacing={4}>
        <QuotePreviewMetricStrip
          items={[
            {
              label: COPY.colValue,
              value: formatCompactCLP(quote.totalAmountClp),
              helper: quote.currency,
              tone: quote.totalAmountClp > 0 ? 'primary' : 'neutral',
              icon: 'tabler-cash'
            },
            {
              label: COPY.colMargin,
              value: quote.effectiveMarginPct === null ? '—' : `${quote.effectiveMarginPct.toFixed(1)}%`,
              helper: marginLabel(quote),
              tone: currentMarginTone === 'default' ? 'neutral' : currentMarginTone,
              icon: 'tabler-chart-dots'
            }
          ]}
        />

        <ContextualSidecarSection title={COPY.cycleTitle}>
          <QuoteCycleTimeline
            items={[
              {
                id: 'draft',
                title: COPY.cycleDraft,
                meta: formatDate(quote.quoteDate),
                tone: 'neutral',
                icon: 'tabler-pencil'
              },
              {
                id: 'issued',
                title: COPY.cycleIssued,
                meta: quoteHasIssued ? statusConf.label : COPY.pendingStep,
                tone: quoteHasIssued ? 'info' : 'neutral',
                icon: 'tabler-send'
              },
              {
                id: 'due',
                title: quote.status === 'expired' ? COPY.cycleExpired : COPY.dateDue,
                meta: quote.dueDate ? formatDate(quote.dueDate) : COPY.noDueDate,
                tone: dueTone,
                icon: quote.status === 'expired' ? 'tabler-clock-exclamation' : 'tabler-calendar-due'
              }
            ]}
          />
        </ContextualSidecarSection>

        <ContextualSidecarSection title={COPY.marginHealth}>
          <ContextualSidecarProgress
            label={marginLabel(quote)}
            value={marginProgress}
            helper={
              quote.targetMarginPct === null
                ? COPY.metricNoMargin
                : `Target ${quote.targetMarginPct.toFixed(1)}% · Piso ${quote.marginFloorPct?.toFixed(1) ?? '—'}%`
            }
          />
        </ContextualSidecarSection>

        <ContextualSidecarSection title={COPY.commercialFacts}>
          <Stack spacing={2}>
            {[
              [COPY.dateCreated, formatDate(quote.quoteDate)],
              [COPY.dateDue, quote.dueDate ? formatDate(quote.dueDate) : COPY.noDueDate],
              ['Versión', COPY.versionLabel(version)],
              [COPY.colSource, sourceConf.label]
            ].map(([label, value]) => (
              <Stack key={label} direction='row' alignItems='center' justifyContent='space-between' spacing={3}>
                <Typography variant='caption' color='text.secondary'>
                  {label}
                </Typography>
                <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>
                  {value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </ContextualSidecarSection>

        <QuoteActivitySignal
          tone={sourceConf.tone === 'default' ? 'neutral' : sourceConf.tone}
          icon='tabler-activity'
          title={COPY.recentActivity}
          description={`${COPY.activityGenerated}. ${sourceConf.activity}.`}
          meta={statusConf.label}
          secondaryMeta={formatDate(quote.quoteDate)}
        />
      </Stack>
    </ContextualSidecar>
  )
}

const QuotesListView = () => {
  const router = useRouter()
  const morphRouter = useViewTransitionRouter()
  const [statusFilter, setStatusFilter] = useState<StatusBucket>('all')
  const [sourceFilter, setSourceFilter] = useState('')
  const [query, setQuery] = useState('')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [sidecarState, setSidecarState] = useState<AdaptiveSidecarControllerState>(EMPTY_SIDECAR_STATE)
  const [tableBodyRef] = useListAnimation()

  const { data: items = [] as Quote[], isPending: loading } = useQuotesList({
    source: sourceFilter || undefined
  })

  const statusCounts = useMemo(
    () =>
      STATUS_BUCKETS.reduce<Record<StatusBucket, number>>(
        (acc, bucket) => {
          acc[bucket.value] = items.filter(item => statusMatchesBucket(item.status, bucket.value)).length

          return acc
        },
        { all: items.length, draft: 0, issued: 0, expired: 0, accepted: 0 }
      ),
    [items]
  )

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return items.filter(item => {
      if (!statusMatchesBucket(item.status, statusFilter)) return false

      if (!normalizedQuery) return true

      return [
        item.quoteNumber,
        item.clientName,
        item.source,
        item.status
      ].some(value => value?.toLowerCase().includes(normalizedQuery))
    }).sort((first, second) => {
      const firstTime = parseDate(first.quoteDate)?.getTime() ?? 0
      const secondTime = parseDate(second.quoteDate)?.getTime() ?? 0

      return sortDirection === 'desc' ? secondTime - firstTime : firstTime - secondTime
    })
  }, [items, query, sortDirection, statusFilter])

  const pagedItems = useMemo(
    () => filteredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredItems, page, rowsPerPage]
  )

  const selectedQuote = useMemo(
    () => filteredItems.find(item => item.quoteId === selectedQuoteId) ?? items.find(item => item.quoteId === selectedQuoteId) ?? null,
    [filteredItems, items, selectedQuoteId]
  )

  const metrics = useMemo(() => {
    const totalPipeline = items.reduce((sum, item) => sum + (item.totalAmountClp ?? 0), 0)

    const issuedAmount = items
      .filter(item => statusMatchesBucket(item.status, 'issued') || statusMatchesBucket(item.status, 'accepted'))
      .reduce((sum, item) => sum + (item.totalAmountClp ?? 0), 0)

    const draftAmount = items
      .filter(item => statusMatchesBucket(item.status, 'draft'))
      .reduce((sum, item) => sum + (item.totalAmountClp ?? 0), 0)

    const margins = items
      .map(item => item.effectiveMarginPct)
      .filter((value): value is number => value !== null)

    const averageMargin = margins.length ? margins.reduce((sum, value) => sum + value, 0) / margins.length : null

    return {
      totalPipeline,
      issuedAmount,
      draftAmount,
      averageMargin,
      dueThisWeek: items.filter(item => isDueThisWeek(item.dueDate)).length
    }
  }, [items])

  useEffect(() => {
    if (!sidecarState.open || !selectedQuoteId) return

    const stillVisible = items.some(item => item.quoteId === selectedQuoteId)

    if (!stillVisible) {
      setSidecarState(state => reduceAdaptiveSidecarState(state, { type: 'close', force: true }))
      setSelectedQuoteId(null)
    }
  }, [items, selectedQuoteId, sidecarState.open])

  useEffect(() => {
    setPage(0)
  }, [query, sortDirection, sourceFilter, statusFilter])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredItems.length / rowsPerPage) - 1)

    if (page > maxPage) setPage(maxPage)
  }, [filteredItems.length, page, rowsPerPage])

  const handleNewQuote = useCallback(() => {
    router.push('/finance/quotes/new')
  }, [router])

  const handleClearFilters = useCallback(() => {
    setStatusFilter('all')
    setSourceFilter('')
    setQuery('')
  }, [])

  const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setRowsPerPage(Number(event.target.value))
    setPage(0)
  }, [])

  const handleOpenPreview = useCallback((quote: Quote) => {
    setSelectedQuoteId(quote.quoteId)
    setSidecarState(state =>
      reduceAdaptiveSidecarState(state, {
        type: 'open',
        kind: 'preview',
        sidecarId: quote.quoteId,
        mode: 'push',
        force: true
      })
    )
  }, [])

  const handleClosePreview = useCallback(() => {
    setSidecarState(state => reduceAdaptiveSidecarState(state, { type: 'close', force: true }))
  }, [])

  const handleOpenDetail = useCallback(
    (quote: Quote) => {
      morphRouter.push(`/finance/quotes/${quote.quoteId}`)
    },
    [morphRouter]
  )

  if (loading) {
    return (
      <Stack spacing={4} data-capture='finance-quotes-page'>
        <Skeleton variant='rounded' height={72} />
        <Skeleton variant='rounded' height={124} />
        <Skeleton variant='rounded' height={460} />
      </Stack>
    )
  }

  return (
    <AdaptiveSidecarLayout
      open={sidecarState.open}
      onOpenChange={open => {
        if (!open) handleClosePreview()
      }}
      kind='preview'
      preferredMode='push'
      sidecarWidth={420}
      sidecarMinWidth={360}
      sidecarMaxWidth={500}
      mainMinWidth={820}
      panelEntrance='slide'
      dataCapture='finance-quotes-page'
      sidecar={
        <QuotePreview
          quote={selectedQuote}
          onClose={handleClosePreview}
          onOpenDetail={handleOpenDetail}
        />
      }
    >
      <Stack spacing={4} data-capture='finance-quotes-ledger'>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems={{ xs: 'flex-start', md: 'flex-start' }}
          justifyContent='space-between'
        >
          <Stack spacing={1} sx={{ minWidth: 0, maxWidth: 760 }}>
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ minWidth: 0 }}>
              <Typography variant='h4' sx={{ overflowWrap: 'anywhere' }}>
                {COPY.pageTitle}
              </Typography>
              <GreenhouseChip
                size='small'
                variant='label'
                tone='primary'
                kind='metric'
                label={COPY.quotesCount(items.length)}
              />
            </Stack>
            <Typography variant='body2' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
              {COPY.pageSubtitle}
            </Typography>
          </Stack>
          <Stack direction='row' spacing={2} sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}>
            <GreenhouseButton
              kind='primaryAction'
              leadingIconClassName='tabler-plus'
              onClick={handleNewQuote}
              size='medium'
              dataCapture='quotes-new-quote'
            >
              {COPY.newQuote}
            </GreenhouseButton>
          </Stack>
        </Stack>

        <Box
          sx={theme => ({
            border: `1px solid ${alpha(theme.palette.divider, 0.78)}`,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.72 : 0.9),
            boxShadow: theme.greenhouseElevation.raised.boxShadow,
            overflow: 'hidden'
          })}
        >
          <Box
            sx={theme => ({
              px: SURFACE_GUTTER,
              py: { xs: 4, md: 4 },
              borderBlockEnd: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
              bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.78 : 0.96)
            })}
          >
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={3}
              alignItems={{ xs: 'stretch', lg: 'center' }}
              justifyContent='space-between'
            >
              <Stack spacing={1} sx={{ minWidth: 0 }}>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Box
                    aria-hidden='true'
                    sx={theme => ({
                      display: 'grid',
                      placeItems: 'center',
                      inlineSize: 38,
                      blockSize: 38,
                      flexShrink: 0,
                      borderRadius: `${theme.shape.customBorderRadius.md}px`,
                      color: theme.palette.primary.main,
                      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.15 : 0.08)
                    })}
                  >
                    <i className='tabler-file-analytics' />
                  </Box>
                  <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                    <Typography variant='h6'>{COPY.surfaceTitle}</Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
                      {COPY.surfaceSubtitle}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
              <Stack
                direction='row'
                spacing={0}
                role='tablist'
                aria-label={COPY.colStatus}
                sx={{
                  flexWrap: 'wrap',
                  gap: 1,
                  pb: 0.5,
                  '&::-webkit-scrollbar': { display: 'none' }
                }}
              >
                {STATUS_BUCKETS.map(bucket => {
                  const active = statusFilter === bucket.value

                  return (
                    <GreenhouseButton
                      key={bucket.value}
                      role='tab'
                      aria-selected={active}
                      kind={active ? 'primaryAction' : 'filter'}
                      variant={active ? 'solid' : 'label'}
                      tone={bucket.tone}
                      size='small'
                      leadingIconClassName={bucket.icon}
                      onClick={() => setStatusFilter(bucket.value)}
                      reserveInlineSize={112}
                      sx={bucket.value === 'draft' ? (active ? neutralSelectedControlSx : neutralControlSx) : undefined}
                    >
                      {bucket.label} {statusCounts[bucket.value]}
                    </GreenhouseButton>
                  )
                })}
              </Stack>
            </Stack>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' },
              gap: 2.5,
              px: SURFACE_GUTTER,
              py: SURFACE_GUTTER_COMPACT,
              '& > *': { minWidth: 0 },
              '& > :last-of-type': { gridColumn: { xs: 'span 2', lg: 'auto' } }
            }}
            data-capture='finance-quotes-summary'
          >
            <MetricTile
              icon='tabler-chart-bar'
              label={COPY.metricTotalPipeline}
              value={formatCompactCLP(metrics.totalPipeline)}
              helper={COPY.quotesCount(items.length)}
              tone='primary'
            />
            <MetricTile
              icon='tabler-send'
              label={COPY.metricIssued}
              value={formatCompactCLP(metrics.issuedAmount)}
              helper={`${statusCounts.issued + statusCounts.accepted} cotizaciones activas`}
              tone='info'
            />
            <MetricTile
              icon='tabler-pencil'
              label={COPY.metricDrafts}
              value={formatCompactCLP(metrics.draftAmount)}
              helper={`${statusCounts.draft} en preparación`}
              tone='neutral'
            />
            <MetricTile
              icon='tabler-chart-dots'
              label={COPY.metricAverageMargin}
              value={metrics.averageMargin === null ? '—' : `${metrics.averageMargin.toFixed(1)}%`}
              helper={metrics.averageMargin === null ? COPY.metricNoMargin : COPY.marginHealthy}
              tone={metrics.averageMargin === null ? 'neutral' : 'success'}
            />
            <MetricTile
              icon='tabler-calendar-exclamation'
              label={COPY.metricDueThisWeek}
              value={String(metrics.dueThisWeek)}
              helper={metrics.dueThisWeek > 0 ? COPY.reviewAction : COPY.noDueThisWeek}
              tone={metrics.dueThisWeek > 0 ? 'warning' : 'neutral'}
            />
          </Box>

          <Box
            sx={theme => ({
              px: SURFACE_GUTTER,
              py: SURFACE_GUTTER_COMPACT,
              borderBlockStart: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
              borderBlockEnd: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
              bgcolor: alpha(theme.palette.action.hover, theme.palette.mode === 'dark' ? 0.16 : 0.42)
            })}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', md: 'center' }}
              justifyContent='space-between'
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: 0, flex: 1 }}>
                <CustomTextField
                  size='small'
                  label={COPY.searchLabel}
                  placeholder={COPY.searchPlaceholder}
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  sx={{ minWidth: { xs: '100%', sm: 280 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <i className='tabler-search' aria-hidden='true' />
                      </InputAdornment>
                    )
                  }}
                />
                <CustomTextField
                  select
                  size='small'
                  label={COPY.sourceLabel}
                  value={sourceFilter}
                  onChange={event => setSourceFilter(event.target.value)}
                  sx={{ minWidth: { xs: '100%', sm: 190 } }}
                >
                  {SOURCE_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Stack>
              <Stack direction='row' spacing={1.5}>
                <GreenhouseButton
                  kind='filter'
                  variant='outlined'
                  tone='primary'
                  size='small'
                  leadingIconClassName='tabler-filter-x'
                  onClick={handleClearFilters}
                  sx={neutralControlSx}
                >
                  {COPY.savedFilters}
                </GreenhouseButton>
                <GreenhouseButton
                  kind='filter'
                  variant='outlined'
                  tone='primary'
                  size='small'
                  leadingIconClassName='tabler-arrows-sort'
                  onClick={() => setSortDirection(current => (current === 'desc' ? 'asc' : 'desc'))}
                  sx={neutralControlSx}
                >
                  {sortDirection === 'desc' ? COPY.sortNewest : COPY.sortOldest}
                </GreenhouseButton>
              </Stack>
            </Stack>
          </Box>

          {items.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, px: 3 }} role='status'>
              <Typography variant='h6' sx={{ mb: 1 }}>
                {COPY.noQuotesTitle}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {COPY.noQuotesBody}
              </Typography>
            </Box>
          ) : filteredItems.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, px: 3 }} role='status'>
              <Typography variant='h6' sx={{ mb: 1 }}>
                {COPY.noFilteredQuotesTitle}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {COPY.noFilteredQuotesBody}
              </Typography>
            </Box>
          ) : (
            <DataTableShell
              identifier='finance-quotes-list'
              ariaLabel='Listado comercial de cotizaciones'
              density='compact'
              stickyFirstColumn
            >
              <Box
                data-capture='finance-quotes-table'
                sx={{
                  px: SURFACE_GUTTER_COMPACT,
                  pt: 1,
                  pb: 1.5
                }}
              >
                <Table size='small' sx={{ minWidth: 980 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{COPY.colQuote}</TableCell>
                      <TableCell>{COPY.colClient}</TableCell>
                      <TableCell>{COPY.colDates}</TableCell>
                      <TableCell align='right'>{COPY.colValue}</TableCell>
                      <TableCell>{COPY.colMargin}</TableCell>
                      <TableCell>{COPY.colStatus}</TableCell>
                      <TableCell>{COPY.colSource}</TableCell>
                      <TableCell align='right'>{COPY.colActions}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody ref={tableBodyRef}>
                    {pagedItems.map(quote => {
                      const statusConf = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft
                      const sourceConf = SOURCE_CHIP_CONFIG[quote.source] ?? SOURCE_CHIP_CONFIG.manual

                      const currentMarginTone = marginTone(
                        quote.effectiveMarginPct,
                        quote.marginFloorPct,
                        quote.targetMarginPct
                      )

                      const selected = sidecarState.open && selectedQuoteId === quote.quoteId
                      const version = quote.currentVersion ?? 1

                      return (
                        <TableRow
                          key={quote.quoteId}
                          hover
                          selected={selected}
                          aria-selected={selected ? 'true' : undefined}
                          data-capture={selected ? 'quotes-row-selected' : undefined}
                          sx={theme => ({
                            cursor: 'default',
                            transition: theme.transitions.create(['background-color', 'box-shadow'], {
                              duration: theme.transitions.duration.shorter,
                              easing: 'cubic-bezier(0.2, 0, 0, 1)'
                            }),
                            '& .quote-row-actions': {
                              opacity: { xs: 1, md: selected ? 1 : 0 },
                              transform: { xs: 'none', md: selected ? 'none' : 'translateX(6px)' },
                              transition: theme.transitions.create(['opacity', 'transform'], {
                                duration: theme.transitions.duration.shorter,
                                easing: 'cubic-bezier(0.2, 0, 0, 1)'
                              })
                            },
                            '&:hover .quote-row-actions, &:focus-within .quote-row-actions': {
                              opacity: 1,
                              transform: 'none'
                            },
                            '&.Mui-selected': {
                              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.055),
                              boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`
                            },
                            '@media (prefers-reduced-motion: reduce)': {
                              transition: 'none',
                              '& .quote-row-actions': {
                                transition: 'none',
                                transform: 'none'
                              }
                            }
                          })}
                        >
                          <TableCell>
                            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                              <Typography
                                variant='monoId'
                                sx={{
                                  viewTransitionName: `quote-identity-${quote.quoteId}`,
                                  overflowWrap: 'anywhere'
                                }}
                              >
                                {quote.quoteNumber ?? '—'}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {COPY.versionLabel(version)}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant='body2'
                              sx={{
                                viewTransitionName: `quote-client-${quote.quoteId}`,
                                overflowWrap: 'anywhere'
                              }}
                            >
                              {quote.clientName ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant='caption' color='text.secondary'>
                                {COPY.dateCreated}: {formatDate(quote.quoteDate)}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {COPY.dateDue}: {quote.dueDate ? formatDate(quote.dueDate) : COPY.noDueDate}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {formatCLP(quote.totalAmountClp)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {quote.effectiveMarginPct !== null ? (
                              <GreenhouseChip
                                size='small'
                                variant='label'
                                tone={currentMarginTone}
                                kind='metric'
                                label={`${quote.effectiveMarginPct.toFixed(1)}%`}
                              />
                            ) : (
                              <Typography variant='caption' color='text.secondary'>
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <GreenhouseChip
                              size='small'
                              variant='label'
                              tone={statusConf.tone}
                              kind='status'
                              label={statusConf.label}
                            />
                          </TableCell>
                          <TableCell>
                            <GreenhouseChip
                              size='small'
                              variant='label'
                              tone={sourceConf.tone}
                              kind='attribute'
                              label={sourceConf.label}
                            />
                          </TableCell>
                          <TableCell align='right'>
                            <Stack
                              className='quote-row-actions'
                              direction='row'
                              justifyContent='flex-end'
                              spacing={1}
                              data-capture='finance-quotes-row-actions'
                            >
                              <GreenhouseButton
                                kind='inlineAction'
                                variant='outlined'
                                tone='primary'
                                size='small'
                                leadingIconClassName='tabler-eye'
                                onClick={() => handleOpenPreview(quote)}
                                aria-label={`${COPY.previewAction}: ${quote.quoteNumber ?? quote.clientName ?? quote.quoteId}`}
                                dataCapture='quotes-row-preview'
                              >
                                {COPY.previewAction}
                              </GreenhouseButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Box>
              <Box
                sx={theme => ({
                  borderBlockStart: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                  px: { xs: 1, md: 2 },
                  '& .MuiTablePagination-toolbar': {
                    minHeight: 48,
                    px: { xs: 1, md: 2 },
                    flexWrap: 'wrap',
                    rowGap: 1
                  },
                  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                    ...theme.typography.caption,
                    color: theme.palette.text.secondary
                  }
                })}
              >
                <TablePagination
                  component='div'
                  count={filteredItems.length}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={[12, 24, 48]}
                  labelRowsPerPage={COPY.rowsPerPage}
                  labelDisplayedRows={({ from, to, count }) => COPY.pageRange(from, to, count)}
                  onPageChange={(_, nextPage) => setPage(nextPage)}
                  onRowsPerPageChange={handleRowsPerPageChange}
                />
              </Box>
            </DataTableShell>
          )}
        </Box>
      </Stack>
    </AdaptiveSidecarLayout>
  )
}

export default QuotesListView
