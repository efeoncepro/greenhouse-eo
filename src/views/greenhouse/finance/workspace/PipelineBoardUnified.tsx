'use client'

import { useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import { GH_PIPELINE_COMMERCIAL } from '@/config/greenhouse-nomenclature'
import type {
  UnifiedPipelineCategory,
  UnifiedPipelineFilters,
  UnifiedPipelineResult,
  UnifiedPipelineRow
} from '@/lib/commercial-intelligence/revenue-pipeline-reader'

type SemanticColor = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary'

interface PipelineBoardUnifiedProps {
  loading: boolean
  error: string | null
  data: UnifiedPipelineResult | null
  onFilterChange?: (filters: Partial<UnifiedPipelineFilters>) => void
}

const ONBOARDING_STORAGE_KEY = 'pipeline-commercial-onboarding-dismissed'

const CATEGORY_META: Record<
  UnifiedPipelineCategory,
  { label: string; color: SemanticColor; icon: string }
> = {
  deal: {
    label: GH_PIPELINE_COMMERCIAL.categoryDealLabel,
    color: 'primary',
    icon: 'tabler-briefcase'
  },
  contract: {
    label: GH_PIPELINE_COMMERCIAL.categoryContractLabel,
    color: 'info',
    icon: 'tabler-file-certificate'
  },
  'pre-sales': {
    label: GH_PIPELINE_COMMERCIAL.categoryPreSalesLabel,
    color: 'warning',
    icon: 'tabler-sparkles'
  }
}

const LIFECYCLE_LABELS: Record<string, string> = {
  customer: 'Customer',
  lead: 'Lead',
  subscriber: 'Subscriber',
  marketingqualifiedlead: 'MQL',
  salesqualifiedlead: 'SQL',
  opportunity: 'Opportunity',
  evangelist: 'Evangelist',
  other: 'Otro',
  unknown: 'Sin definir'
}

const formatCLP = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '—'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount)
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'

  const d = new Date(iso)

  if (Number.isNaN(d.getTime())) return '—'

  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatPct = (value: number | null | undefined, digits = 0): string => {
  if (value === null || value === undefined) return '—'

  return `${value.toFixed(digits)}%`
}

const uniqueSorted = <T,>(values: T[], extract: (v: T) => string | null): string[] => {
  const set = new Set<string>()

  for (const v of values) {
    const key = extract(v)

    if (key) set.add(key)
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))
}

const PipelineBoardUnified = ({
  loading,
  error,
  data,
  onFilterChange
}: PipelineBoardUnifiedProps) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | UnifiedPipelineCategory>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [lifecyclestageFilter, setLifecyclestageFilter] = useState<string>('all')
  const [businessLineFilter, setBusinessLineFilter] = useState<string>('all')

  const [onboardingDismissed, setOnboardingDismissed] = useState(true)

  // Hydrate onboarding-dismiss state from localStorage after mount (SSR-safe)
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const dismissed = window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'

      setOnboardingDismissed(dismissed)
    } catch {
      // ignore storage errors (private browsing, etc.)
      setOnboardingDismissed(false)
    }
  }, [])

  const dismissOnboarding = () => {
    setOnboardingDismissed(true)

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
      } catch {
        // ignore
      }
    }
  }

  const items = useMemo(() => data?.items ?? [], [data])
  const totals = data?.totals ?? null

  // Build filter options from current dataset
  const stageOptions = useMemo(() => {
    const seen = new Map<string, string>()

    for (const it of items) seen.set(it.stage, it.stageLabel)

    return Array.from(seen.entries()).sort(([, a], [, b]) => a.localeCompare(b, 'es'))
  }, [items])

  const lifecyclestageOptions = useMemo(
    () => uniqueSorted(items, it => it.lifecyclestage),
    [items]
  )

  const businessLineOptions = useMemo(
    () => uniqueSorted(items, it => it.businessLineCode),
    [items]
  )

  // Client-side filter pass (mirrors server filters for instant feedback)
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (categoryFilter !== 'all' && it.category !== categoryFilter) return false
      if (stageFilter !== 'all' && it.stage !== stageFilter) return false
      if (lifecyclestageFilter !== 'all' && (it.lifecyclestage ?? '') !== lifecyclestageFilter) return false
      if (businessLineFilter !== 'all' && (it.businessLineCode ?? '') !== businessLineFilter) return false

      return true
    })
  }, [items, categoryFilter, stageFilter, lifecyclestageFilter, businessLineFilter])

  const hasActiveFilters =
    categoryFilter !== 'all' ||
    stageFilter !== 'all' ||
    lifecyclestageFilter !== 'all' ||
    businessLineFilter !== 'all'

  const clearFilters = () => {
    setCategoryFilter('all')
    setStageFilter('all')
    setLifecyclestageFilter('all')
    setBusinessLineFilter('all')
    onFilterChange?.({
      category: null,
      stage: null,
      lifecyclestage: null,
      businessLineCode: null
    })
  }

  // Notify parent on filter changes (server-side refetch if desired)
  const handleCategoryChange = (value: 'all' | UnifiedPipelineCategory) => {
    setCategoryFilter(value)
    onFilterChange?.({ category: value === 'all' ? null : value })
  }

  const handleStageChange = (value: string) => {
    setStageFilter(value)
    onFilterChange?.({ stage: value === 'all' ? null : value })
  }

  const handleLifecyclestageChange = (value: string) => {
    setLifecyclestageFilter(value)
    onFilterChange?.({ lifecyclestage: value === 'all' ? null : value })
  }

  const handleBusinessLineChange = (value: string) => {
    setBusinessLineFilter(value)
    onFilterChange?.({ businessLineCode: value === 'all' ? null : value })
  }

  // ── Loading state ────────────────────────────────────────────
  if (loading) {
    return (
      <Stack spacing={4} aria-busy='true' aria-live='polite'>
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant='rounded' height={96} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={320} />
      </Stack>
    )
  }

  // ── Error state ──────────────────────────────────────────────
  if (error) {
    return (
      <Alert severity='error' role='alert'>
        {error || GH_PIPELINE_COMMERCIAL.errorText}
      </Alert>
    )
  }

  // ── Empty state ──────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <Alert
        severity='info'
        role='status'
        icon={<i className='tabler-inbox' aria-hidden='true' />}
      >
        <AlertTitle>{GH_PIPELINE_COMMERCIAL.emptyTitle}</AlertTitle>
        {GH_PIPELINE_COMMERCIAL.emptyDescription}
      </Alert>
    )
  }

  // ── Main content ─────────────────────────────────────────────
  return (
    <Stack spacing={4}>
      {/* KPIs row */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title={GH_PIPELINE_COMMERCIAL.kpiOpenPipelineLabel}
            stats={formatCLP(totals?.openPipelineClp ?? 0)}
            subtitle={GH_PIPELINE_COMMERCIAL.kpiOpenPipelineSubtitle}
            titleTooltip={GH_PIPELINE_COMMERCIAL.kpiOpenPipelineTooltip}
            avatarIcon='tabler-stack-2'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title={GH_PIPELINE_COMMERCIAL.kpiWeightedPipelineLabel}
            stats={formatCLP(totals?.weightedPipelineClp ?? 0)}
            subtitle={GH_PIPELINE_COMMERCIAL.kpiWeightedPipelineSubtitle}
            titleTooltip={GH_PIPELINE_COMMERCIAL.kpiWeightedPipelineTooltip}
            avatarIcon='tabler-chart-dots'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title={GH_PIPELINE_COMMERCIAL.kpiMtdWonLabel}
            stats={formatCLP(totals?.mtdWonClp ?? 0)}
            subtitle={GH_PIPELINE_COMMERCIAL.kpiMtdWonSubtitle}
            titleTooltip={GH_PIPELINE_COMMERCIAL.kpiMtdWonTooltip}
            avatarIcon='tabler-circle-check'
            avatarColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title={GH_PIPELINE_COMMERCIAL.kpiMtdLostLabel}
            stats={formatCLP(totals?.mtdLostClp ?? 0)}
            subtitle={GH_PIPELINE_COMMERCIAL.kpiMtdLostSubtitle}
            titleTooltip={GH_PIPELINE_COMMERCIAL.kpiMtdLostTooltip}
            avatarIcon='tabler-x-octagon'
            avatarColor='error'
          />
        </Grid>
      </Grid>

      {/* Onboarding note (dismissible, persisted in localStorage) */}
      <Collapse in={!onboardingDismissed} unmountOnExit>
        <Alert
          severity='info'
          role='status'
          icon={<i className='tabler-bulb' aria-hidden='true' />}
          action={
            <Button
              size='small'
              color='inherit'
              onClick={dismissOnboarding}
              aria-label={GH_PIPELINE_COMMERCIAL.presalesOnboardingDismiss}
            >
              {GH_PIPELINE_COMMERCIAL.presalesOnboardingDismiss}
            </Button>
          }
        >
          <AlertTitle>{GH_PIPELINE_COMMERCIAL.presalesOnboardingTitle}</AlertTitle>
          {GH_PIPELINE_COMMERCIAL.presalesOnboardingNote}
        </Alert>
      </Collapse>

      {/* Table card with filters in header */}
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title={GH_PIPELINE_COMMERCIAL.subtabPipelineLabel}
          subheader={GH_PIPELINE_COMMERCIAL.subtabPipelineDescription}
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i
                className='tabler-layout-board-split'
                style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }}
                aria-hidden='true'
              />
            </Avatar>
          }
        />
        <Divider />

        {/* Filter bar */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Grid container spacing={3} alignItems='center'>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                size='small'
                label={GH_PIPELINE_COMMERCIAL.filterCategoryLabel}
                value={categoryFilter}
                onChange={e => handleCategoryChange(e.target.value as 'all' | UnifiedPipelineCategory)}
                SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } }}
              >
                <MenuItem value='all'>{GH_PIPELINE_COMMERCIAL.filterAllCategories}</MenuItem>
                <MenuItem value='deal'>{GH_PIPELINE_COMMERCIAL.categoryDealLabel}</MenuItem>
                <MenuItem value='contract'>{GH_PIPELINE_COMMERCIAL.categoryContractLabel}</MenuItem>
                <MenuItem value='pre-sales'>{GH_PIPELINE_COMMERCIAL.categoryPreSalesLabel}</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                size='small'
                label={GH_PIPELINE_COMMERCIAL.filterStageLabel}
                value={stageFilter}
                onChange={e => handleStageChange(e.target.value)}
                SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } }}
              >
                <MenuItem value='all'>{GH_PIPELINE_COMMERCIAL.filterAllStages}</MenuItem>
                {stageOptions.map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                size='small'
                label={GH_PIPELINE_COMMERCIAL.filterLifecyclestageLabel}
                value={lifecyclestageFilter}
                onChange={e => handleLifecyclestageChange(e.target.value)}
                SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } }}
              >
                <MenuItem value='all'>{GH_PIPELINE_COMMERCIAL.filterAllLifecycleStages}</MenuItem>
                {lifecyclestageOptions.map(code => (
                  <MenuItem key={code} value={code}>
                    {LIFECYCLE_LABELS[code.toLowerCase()] ?? code}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                size='small'
                label={GH_PIPELINE_COMMERCIAL.filterBusinessLineLabel}
                value={businessLineFilter}
                onChange={e => handleBusinessLineChange(e.target.value)}
                SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } }}
              >
                <MenuItem value='all'>{GH_PIPELINE_COMMERCIAL.filterAllBusinessLines}</MenuItem>
                {businessLineOptions.map(code => (
                  <MenuItem key={code} value={code}>
                    {code}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {hasActiveFilters && (
              <Grid size={{ xs: 12 }}>
                <Stack direction='row' justifyContent='flex-end'>
                  <Button
                    size='small'
                    variant='text'
                    color='secondary'
                    startIcon={<i className='tabler-filter-off' aria-hidden='true' />}
                    onClick={clearFilters}
                  >
                    {GH_PIPELINE_COMMERCIAL.filterClearAll}
                  </Button>
                </Stack>
              </Grid>
            )}
          </Grid>
        </Box>

        <Divider />

        {/* Table */}
        {filteredItems.length === 0 ? (
          <Box sx={{ p: 4 }}>
            <Alert
              severity='info'
              role='status'
              icon={<i className='tabler-filter' aria-hidden='true' />}
            >
              No hay oportunidades que coincidan con los filtros aplicados.
            </Alert>
          </Box>
        ) : (
          <TableContainer>
            <Table size='small' aria-label={GH_PIPELINE_COMMERCIAL.subtabPipelineLabel}>
              <TableHead>
                <TableRow>
                  <TableCell scope='col'>{GH_PIPELINE_COMMERCIAL.colCategory}</TableCell>
                  <TableCell scope='col'>{GH_PIPELINE_COMMERCIAL.colEntity}</TableCell>
                  <TableCell scope='col'>{GH_PIPELINE_COMMERCIAL.colClient}</TableCell>
                  <TableCell scope='col'>{GH_PIPELINE_COMMERCIAL.colStage}</TableCell>
                  <TableCell scope='col' align='right'>
                    {GH_PIPELINE_COMMERCIAL.colAmount}
                  </TableCell>
                  <TableCell scope='col' align='right'>
                    {GH_PIPELINE_COMMERCIAL.colProbability}
                  </TableCell>
                  <TableCell scope='col'>{GH_PIPELINE_COMMERCIAL.colCloseDate}</TableCell>
                  <TableCell scope='col' align='right'>
                    {GH_PIPELINE_COMMERCIAL.colQuoteCount}
                  </TableCell>
                  <TableCell scope='col'>{GH_PIPELINE_COMMERCIAL.colAction}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((row: UnifiedPipelineRow) => {
                  const meta = CATEGORY_META[row.category]
                  const closeDateToShow = row.closeDate ?? row.expiryDate

                  return (
                    <TableRow key={`${row.grain}-${row.id}`} hover>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color={meta.color}
                          label={meta.label}
                          icon={<i className={meta.icon} aria-hidden='true' />}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>
                          {row.entityName}
                        </Typography>
                        {row.businessLineCode && (
                          <Typography variant='caption' color='text.secondary'>
                            {row.businessLineCode}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{row.clientName ?? row.clientId ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{row.stageLabel}</Typography>
                        {row.stageLabel !== row.stage && (
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.7rem' }}
                          >
                            {row.stage}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatCLP(row.amountClp)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>{formatPct(row.probabilityPct)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{formatDate(closeDateToShow)}</Typography>
                        {row.daysUntilClose !== null && row.daysUntilClose !== undefined && (
                          <Typography
                            variant='caption'
                            color={row.daysUntilClose < 0 ? 'error.main' : 'text.secondary'}
                          >
                            {row.daysUntilClose < 0
                              ? `Hace ${Math.abs(row.daysUntilClose)} días`
                              : `En ${row.daysUntilClose} días`}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align='right'>
                        {row.grain === 'deal' ? (
                          <Typography variant='body2'>
                            {row.quoteCount ?? 0}
                            {row.approvedQuoteCount != null && row.approvedQuoteCount > 0 && (
                              <Typography
                                component='span'
                                variant='caption'
                                color='success.main'
                                sx={{ ml: 0.5 }}
                              >
                                ({row.approvedQuoteCount} aprob.)
                              </Typography>
                            )}
                          </Typography>
                        ) : (
                          <Typography variant='body2' color='text.secondary'>
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={row.linkUrl}
                          style={{ color: 'var(--mui-palette-primary-main)', textDecoration: 'none' }}
                          aria-label={`${GH_PIPELINE_COMMERCIAL.actionView} ${row.entityName}`}
                        >
                          {GH_PIPELINE_COMMERCIAL.actionView}
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Stack>
  )
}

export default PipelineBoardUnified
