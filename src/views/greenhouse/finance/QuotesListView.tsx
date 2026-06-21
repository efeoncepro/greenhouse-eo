'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

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
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import { DataTableShell } from '@/components/greenhouse/data-table'
import {
  AdaptiveSidecarLayout,
  ContextualSidecar,
  ContextualSidecarMetricStrip,
  ContextualSidecarProgress,
  ContextualSidecarSection,
  ContextualSidecarSignal,
  ContextualSidecarTimeline,
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
  hubspot: { label: 'HubSpot', tone: 'warning', activity: COPY.activitySourceHubSpot },
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
  tone?: Exclude<GreenhouseChipTone, 'default'> | 'neutral'
}) => (
  <Box
    role='group'
    aria-label={`${label}: ${value}`}
    sx={theme => ({
      minWidth: 0,
      border: `1px solid ${alpha(theme.palette.divider, 0.76)}`,
      borderRadius: `${theme.shape.customBorderRadius.md}px`,
      bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.72 : 0.86),
      p: 2.5,
      boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.18 : 0.032)}`,
      transition: theme.transitions.create(['border-color', 'box-shadow', 'transform'], {
        duration: theme.transitions.duration.shorter,
        easing: 'cubic-bezier(0.2, 0, 0, 1)'
      }),
      '&:hover': {
        borderColor: tone === 'neutral'
          ? alpha(theme.palette.divider, 0.92)
          : alpha(theme.palette[tone].main, theme.palette.mode === 'dark' ? 0.48 : 0.28),
        boxShadow: tone === 'neutral'
          ? `0 10px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.18 : 0.05)}`
          : `0 10px 24px ${alpha(theme.palette[tone].main, theme.palette.mode === 'dark' ? 0.14 : 0.06)}`,
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
        <ContextualSidecarMetricStrip
          items={[
            {
              label: COPY.colValue,
              value: formatCompactCLP(quote.totalAmountClp),
              helper: quote.currency,
              color: 'primary',
              icon: 'tabler-cash'
            },
            {
              label: COPY.colMargin,
              value: quote.effectiveMarginPct === null ? '—' : `${quote.effectiveMarginPct.toFixed(1)}%`,
              helper: marginLabel(quote),
              color: currentMarginTone === 'default' ? 'primary' : currentMarginTone,
              icon: 'tabler-chart-dots'
            }
          ]}
        />

        <ContextualSidecarSection title={COPY.cycleTitle}>
          <ContextualSidecarTimeline
            items={[
              {
                id: 'draft',
                title: COPY.cycleDraft,
                meta: formatDate(quote.quoteDate),
                color: 'primary',
                icon: 'tabler-pencil'
              },
              {
                id: 'issued',
                title: COPY.cycleIssued,
                meta: statusMatchesBucket(quote.status, 'issued') || statusMatchesBucket(quote.status, 'accepted') ? statusConf.label : 'Pendiente',
                color: statusMatchesBucket(quote.status, 'issued') || statusMatchesBucket(quote.status, 'accepted') ? 'info' : 'primary',
                icon: 'tabler-send'
              },
              {
                id: 'due',
                title: quote.status === 'expired' ? COPY.cycleExpired : COPY.dateDue,
                meta: quote.dueDate ? formatDate(quote.dueDate) : COPY.noDueDate,
                color: quote.status === 'expired' ? 'warning' : 'info',
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

        <ContextualSidecarSignal
          color={sourceConf.tone === 'default' ? 'primary' : sourceConf.tone}
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

  const handleNewQuote = useCallback(() => {
    router.push('/finance/quotes/new')
  }, [router])

  const handleClearFilters = useCallback(() => {
    setStatusFilter('all')
    setSourceFilter('')
    setQuery('')
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
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
          justifyContent='space-between'
        >
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ minWidth: 0 }}>
              <Typography variant='h5' sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <GreenhouseButton
              kind='custom'
              variant='label'
              tone='primary'
              leadingIconClassName='tabler-filter-x'
              size='medium'
              onClick={handleClearFilters}
            >
              {COPY.savedFilters}
            </GreenhouseButton>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))',
              gap: 2.5,
              px: SURFACE_GUTTER,
              py: SURFACE_GUTTER_COMPACT,
              '& > *': { minWidth: 0 }
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
              tone={metrics.averageMargin === null ? 'primary' : 'success'}
            />
            <MetricTile
              icon='tabler-calendar-exclamation'
              label={COPY.metricDueThisWeek}
              value={String(metrics.dueThisWeek)}
              helper={metrics.dueThisWeek > 0 ? COPY.reviewAction : COPY.noDueDate}
              tone={metrics.dueThisWeek > 0 ? 'warning' : 'info'}
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
              spacing={3}
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
                  leadingIconClassName='tabler-arrows-sort'
                  onClick={() => setSortDirection(current => (current === 'desc' ? 'asc' : 'desc'))}
                >
                  {COPY.sortAction}
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
            <DataTableShell identifier='finance-quotes-list' ariaLabel='Listado comercial de cotizaciones'>
              <Box
                role='region'
                aria-label={COPY.tableAriaLabel}
                tabIndex={0}
                data-capture='finance-quotes-table'
                sx={{
                  px: SURFACE_GUTTER_COMPACT,
                  pb: SURFACE_GUTTER_COMPACT,
                  overflowX: 'auto',
                  '&:focus-visible': {
                    outline: theme => `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: -2
                  }
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
                    {filteredItems.map(quote => {
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
                                variant='body2'
                                fontWeight={700}
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
            </DataTableShell>
          )}
        </Box>
      </Stack>
    </AdaptiveSidecarLayout>
  )
}

export default QuotesListView
