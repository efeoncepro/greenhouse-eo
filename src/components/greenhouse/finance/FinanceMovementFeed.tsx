'use client'

import { Fragment, useMemo, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useVirtualizer } from '@tanstack/react-virtual'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import EmptyState from '@/components/greenhouse/EmptyState'
import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'
import { INSTRUMENT_CATEGORIES, type InstrumentCategory } from '@/config/payment-instruments'

import type {
  FinanceMovementFeedItem,
  FinanceMovementFeedProps,
  FinanceMovementFeedSummaryItem,
  FinanceMovementVisual
} from './finance-movement-feed.types'
import {
  FINANCE_MOVEMENT_STATUS_COLORS,
  formatFinanceMovementAmount,
  getFinanceMovementInstrumentIcon,
  getFinanceMovementStatusLabel,
  groupFinanceMovementItems,
  resolveFinanceMovementVisual
} from './finance-movement-feed.utils'

type FeedEntry =
  | { type: 'day'; key: string; label: string; count: number; amount: number; currency: string }
  | { type: 'item'; key: string; item: FinanceMovementFeedItem }

const buildFeedEntries = (items: FinanceMovementFeedItem[]): FeedEntry[] =>
  groupFinanceMovementItems(items).flatMap(group => [
    {
      type: 'day' as const,
      key: group.key,
      label: group.label,
      count: group.items.length,
      amount: group.amount,
      currency: group.currency
    },
    ...group.items.map(item => ({ type: 'item' as const, key: item.id, item }))
  ])

const movementColor = (visual: FinanceMovementVisual) => visual.color ?? 'secondary'

const MovementVisual = ({ visual, compact }: { visual: FinanceMovementVisual; compact: boolean }) => {
  const color = movementColor(visual)
  const hasCustomTone = Boolean(visual.tone)

  return (
    <CustomAvatar
      variant='rounded'
      skin={hasCustomTone ? undefined : 'light'}
      color={color}
      sx={{
        flex: '0 0 auto',
        width: compact ? 38 : 48,
        height: compact ? 38 : 48,
        borderRadius: '50%',
        fontWeight: 600,
        textTransform: 'none',
        bgcolor: visual.tone?.bg,
        color: visual.tone?.text,
        border: visual.tone?.border ? `1px solid ${visual.tone.border}` : undefined
      }}
      aria-label={visual.label}
    >
      {visual.kind === 'provider_logo' && visual.logoUrl ? (
        <img src={visual.logoUrl} alt='' style={{ maxWidth: '70%', maxHeight: '70%', objectFit: 'contain' }} />
      ) : visual.kind === 'initials' ? (
        <Typography component='span' variant='caption' sx={{ fontWeight: 700, color: 'inherit', letterSpacing: 0 }}>
          {visual.initials}
        </Typography>
      ) : (
        <i className={visual.icon ?? 'tabler-arrows-exchange'} style={{ fontSize: compact ? 20 : 24 }} />
      )}
    </CustomAvatar>
  )
}

const SummaryStrip = ({ items }: { items: FinanceMovementFeedSummaryItem[] }) => {
  if (!items.length) return null

  return (
    <Box
      sx={{
        px: 4,
        py: 2.5,
        borderBottom: theme => `1px solid ${theme.palette.divider}`,
        bgcolor: theme => alpha(theme.palette.primary.main, 0.018),
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))`
        },
        gap: 2
      }}
    >
      {items.map(item => (
        <Box
          key={item.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            minWidth: 0,
            px: 2,
            py: 1.5,
            borderRadius: 1.5,
            border: theme => `1px solid ${alpha(theme.palette[item.tone ?? 'primary'].main, 0.14)}`,
            bgcolor: theme => alpha(theme.palette[item.tone ?? 'primary'].main, 0.055)
          }}
        >
          {item.icon && (
            <Box
              component='span'
              aria-hidden='true'
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                flex: '0 0 auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme => theme.palette[item.tone ?? 'primary'].main,
                bgcolor: theme => alpha(theme.palette[item.tone ?? 'primary'].main, 0.1)
              }}
            >
              <i className={item.icon} style={{ fontSize: 16 }} />
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}>
              {item.label}
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.primary', fontWeight: 600, lineHeight: 1.25, overflowWrap: 'anywhere' }}>
              {item.value}
            </Typography>
            {item.helper && (
              <Typography variant='caption' sx={{ color: 'text.disabled', display: 'block', mt: 0.25, overflowWrap: 'anywhere' }}>
                {item.helper}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  )
}

const DayHeader = ({
  label,
  count,
  amount,
  currency,
  showDayTotals
}: {
  label: string
  count: number
  amount: number
  currency: string
  showDayTotals: boolean
}) => (
  <Box
    sx={{
      px: 4,
      pt: 3,
      pb: 1.5,
      bgcolor: 'background.paper',
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
      gap: 2,
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 1
    }}
  >
    <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600 }}>
      {label}
    </Typography>
    <Stack direction='row' spacing={1.5} useFlexGap sx={{ justifyContent: { xs: 'flex-start', sm: 'flex-end' }, flexWrap: 'wrap' }}>
      <Typography variant='caption' sx={{ color: 'text.disabled' }}>
        {count === 1 ? '1 movimiento' : `${count} movimientos`}
      </Typography>
      {showDayTotals && (
        <Typography
          variant='caption'
          sx={{
            color: amount > 0 ? 'success.main' : theme => theme.palette.customColors?.midnight ?? theme.palette.text.primary,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {formatFinanceMovementAmount(amount, currency)}
        </Typography>
      )}
    </Stack>
  </Box>
)

const MovementDetails = ({ item }: { item: FinanceMovementFeedItem }) => {
  if (!item.details?.length) return null

  return (
    <Box
      sx={{
        mt: 2,
        p: 3,
        border: theme => `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        bgcolor: 'action.hover',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
        gap: 2
      }}
    >
      {item.details.map(detail => (
        <Box key={detail.label} sx={{ minWidth: 0 }}>
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
            {detail.label}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.primary', fontWeight: 600, overflowWrap: 'anywhere' }}>
            {detail.value}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

const resolveInstrumentCategory = (value: string | null | undefined): InstrumentCategory | undefined =>
  value && (INSTRUMENT_CATEGORIES as readonly string[]).includes(value) ? (value as InstrumentCategory) : undefined

const MovementInstrumentPill = ({ item }: { item: FinanceMovementFeedItem }) => {
  if (!item.instrumentName) return null

  const instrumentCategory = resolveInstrumentCategory(item.instrumentCategory)

  if (item.paymentProviderSlug) {
    return (
      <Box
        component='span'
        aria-label={`Instrumento: ${item.instrumentName}`}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          minHeight: 26,
          maxWidth: '100%',
          px: 1.5,
          py: 0.35,
          borderRadius: 999,
          border: theme => `1px solid ${alpha(theme.palette.divider, 0.88)}`,
          bgcolor: 'background.paper',
          overflow: 'hidden',
          '& > .MuiBox-root': {
            minWidth: 0,
            maxWidth: '100%'
          },
          '& .MuiTypography-root': {
            minWidth: 0,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: theme => theme.palette.customColors?.midnight ?? theme.palette.text.primary
          }
        }}
      >
        <PaymentInstrumentChip
          providerSlug={item.paymentProviderSlug}
          instrumentName={item.instrumentName}
          instrumentCategory={instrumentCategory}
          size='sm'
        />
      </Box>
    )
  }

  const icon = getFinanceMovementInstrumentIcon(item)

  return (
    <Box
      component='span'
      aria-label={`Instrumento: ${item.instrumentName}`}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        minHeight: 24,
        maxWidth: '100%',
        px: 2,
        py: 0.35,
        borderRadius: 999,
        border: theme => `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
        bgcolor: theme => alpha(theme.palette.info.main, 0.08),
        color: theme => theme.palette.customColors?.midnight ?? theme.palette.info.dark,
        fontSize: '0.72rem',
        fontWeight: 600,
        lineHeight: 1.2,
        overflowWrap: 'anywhere'
      }}
    >
      <i className={icon} aria-hidden='true' style={{ fontSize: 14, flex: '0 0 auto' }} />
      <Box component='span' sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        {item.instrumentName}
      </Box>
    </Box>
  )
}

const MovementRow = ({
  item,
  compact,
  visual,
  showRunningBalance,
  onItemSelect
}: {
  item: FinanceMovementFeedItem
  compact: boolean
  visual: FinanceMovementVisual
  showRunningBalance: boolean
  onItemSelect?: (item: FinanceMovementFeedItem) => void
}) => {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = Boolean(item.details?.length)
  const amount = formatFinanceMovementAmount(item.amount, item.currency)
  const runningBalance = item.runningBalance == null ? null : formatFinanceMovementAmount(item.runningBalance, item.currency)
  const statusColor = item.status ? FINANCE_MOVEMENT_STATUS_COLORS[item.status] : undefined
  const statusLabel = getFinanceMovementStatusLabel(item)
  const confidenceLabel = item.confidence == null ? null : `${Math.round(item.confidence * 100)}%`
  const titleId = `finance-movement-title-${item.id}`
  const metaId = `finance-movement-meta-${item.id}`

  const handleSelect = () => {
    if (item.disabled) return
    onItemSelect?.(item)
  }

  return (
    <Box
      sx={{
        px: 4,
        py: compact ? 2 : 3,
        borderTop: theme => `1px solid ${theme.palette.divider}`,
        bgcolor: expanded ? 'action.hover' : 'background.paper',
        transition: theme => theme.transitions.create(['background-color', 'box-shadow', 'border-color'], { duration: theme.transitions.duration.shortest }),
        '&:hover': {
          bgcolor: theme => alpha(theme.palette.primary.main, 0.025),
          boxShadow: theme => `inset 3px 0 0 ${alpha(theme.palette.primary.main, 0.25)}`
        },
        '&:focus-within': {
          boxShadow: theme => `inset 3px 0 0 ${alpha(theme.palette.primary.main, 0.5)}, inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.16)}`
        }
      }}
    >
      <Box
        component={onItemSelect ? ButtonBase : 'div'}
        onClick={onItemSelect ? handleSelect : undefined}
        disabled={item.disabled}
        aria-labelledby={titleId}
        aria-describedby={metaId}
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: {
            xs: `${compact ? 38 : 44}px minmax(0, 1fr)`,
            md: `${compact ? 40 : 52}px minmax(0, 1fr) minmax(132px, ${compact ? 164 : 192}px) 32px`
          },
          gap: compact ? 2 : 3,
          alignItems: 'center',
          textAlign: 'left',
          color: 'inherit',
          borderRadius: 1,
          '&:focus-visible': {
            outline: theme => `3px solid ${alpha(theme.palette.primary.main, 0.22)}`,
            outlineOffset: 3
          }
        }}
      >
        <MovementVisual visual={visual} compact={compact} />

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant='body2'
            id={titleId}
            sx={{
              color: theme => theme.palette.customColors?.midnight ?? 'text.primary',
              fontWeight: 500,
              lineHeight: 1.4,
              overflowWrap: 'anywhere'
            }}
          >
            {item.title}
          </Typography>

          <Stack id={metaId} direction='row' spacing={1} useFlexGap sx={{ mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {statusLabel && statusColor && (
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color={statusColor}
                label={confidenceLabel && item.status === 'suggested' ? `${statusLabel} ${confidenceLabel}` : statusLabel}
                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
              />
            )}
            <MovementInstrumentPill item={item} />
            {item.counterparty && (
              <Typography variant='caption' sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
                {item.counterparty}
              </Typography>
            )}
            <Typography variant='caption' sx={{ color: 'text.disabled', overflowWrap: 'anywhere' }}>
              {item.sourceId}
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ textAlign: { xs: 'left', md: 'right' }, gridColumn: { xs: '2 / 3', md: 'auto' } }}>
          <Typography
            variant='body2'
            sx={{
              fontWeight: 600,
              color: item.direction === 'in' ? 'success.main' : theme => theme.palette.customColors?.midnight ?? 'text.primary',
              whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {amount}
          </Typography>
          {showRunningBalance && runningBalance && (
            <Typography variant='caption' sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Saldo: {runningBalance}
            </Typography>
          )}
        </Box>

        <Tooltip title={hasDetails ? (expanded ? 'Ocultar trazabilidad' : 'Ver trazabilidad') : 'Abrir movimiento'} placement='left' arrow>
          <IconButton
            size='small'
            aria-label={hasDetails ? (expanded ? 'Ocultar trazabilidad' : 'Ver trazabilidad') : 'Abrir movimiento'}
            aria-expanded={expanded}
            onClick={event => {
              event.stopPropagation()
              if (hasDetails) setExpanded(current => !current)
              else handleSelect()
            }}
            sx={{
              display: { xs: 'none', md: 'inline-flex' },
              color: 'text.disabled',
              '&:hover': {
                color: 'primary.main',
                bgcolor: theme => alpha(theme.palette.primary.main, 0.08)
              },
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: theme => theme.transitions.create('transform', { duration: theme.transitions.duration.shortest })
            }}
          >
            <i className='tabler-chevron-right' />
          </IconButton>
        </Tooltip>
      </Box>

      {hasDetails && (
        <Collapse in={expanded} timeout='auto' unmountOnExit>
          <MovementDetails item={item} />
        </Collapse>
      )}
    </Box>
  )
}

const LoadingRows = ({ compact }: { compact: boolean }) => (
  <Stack spacing={0}>
    {Array.from({ length: 5 }).map((_, index) => (
      <Box key={index} sx={{ px: 4, py: compact ? 2 : 3, borderTop: theme => `1px solid ${theme.palette.divider}` }}>
        <Stack direction='row' spacing={3} alignItems='center'>
          <Skeleton variant='circular' width={compact ? 38 : 48} height={compact ? 38 : 48} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width='58%' height={22} />
            <Skeleton width='36%' height={18} />
          </Box>
          <Skeleton width={120} height={24} />
        </Stack>
      </Box>
    ))}
  </Stack>
)

const FinanceMovementFeed = ({
  items,
  title,
  subtitle,
  density = 'comfortable',
  loading = false,
  error = null,
  emptyTitle = 'Sin movimientos',
  emptyDescription = 'No hay movimientos financieros para mostrar en este momento.',
  showRunningBalance = true,
  summaryItems = [],
  lastUpdatedLabel = null,
  showDayTotals = true,
  virtualized,
  virtualizeThreshold = 80,
  estimateItemSize = 88,
  overscan = 8,
  maxHeight = 560,
  providerCatalog,
  paymentProviderCatalog,
  embedded = false,
  onItemSelect
}: FinanceMovementFeedProps) => {
  const compact = density === 'compact'
  const parentRef = useRef<HTMLDivElement | null>(null)
  const entries = useMemo(() => buildFeedEntries(items), [items])
  const shouldVirtualize = virtualized ?? items.length >= virtualizeThreshold

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: index => (entries[index]?.type === 'day' ? 38 : estimateItemSize),
    overscan
  })

  const renderEntry = (entry: FeedEntry) => {
    if (entry.type === 'day') {
      return (
        <DayHeader
          label={entry.label}
          count={entry.count}
          amount={entry.amount}
          currency={entry.currency}
          showDayTotals={showDayTotals}
        />
      )
    }

    const visual = resolveFinanceMovementVisual(entry.item, { providerCatalog, paymentProviderCatalog })

    return (
      <MovementRow
        item={entry.item}
        compact={compact}
        visual={visual}
        showRunningBalance={showRunningBalance}
        onItemSelect={onItemSelect}
      />
    )
  }

  return (
    <Box
      role='region'
      aria-label={title ?? 'Movimientos financieros'}
      sx={{
        border: theme => (embedded ? 'none' : `1px solid ${theme.palette.divider}`),
        borderRadius: embedded ? 0 : 2,
        bgcolor: 'background.paper',
        overflow: 'hidden'
      }}
    >
      {(title || subtitle) && (
        <Box sx={{ px: 4, py: 3, borderBottom: theme => `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: 0 }}>
            {title && (
              <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {lastUpdatedLabel && (
            <Typography variant='caption' sx={{ color: 'text.disabled', alignSelf: 'center' }}>
              {lastUpdatedLabel}
            </Typography>
          )}
        </Box>
      )}

      <SummaryStrip items={summaryItems} />

      {error ? (
        <EmptyState icon='tabler-alert-circle' title='No pudimos cargar los movimientos' description={error} minHeight={220} />
      ) : loading ? (
        <LoadingRows compact={compact} />
      ) : items.length === 0 ? (
        <EmptyState icon='tabler-list-search' title={emptyTitle} description={emptyDescription} minHeight={220} />
      ) : shouldVirtualize ? (
        <Box ref={parentRef} sx={{ maxHeight, overflow: 'auto', scrollbarColor: 'var(--mui-palette-divider) transparent' }}>
          <Box sx={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map(virtualRow => {
              const entry = entries[virtualRow.index]

              if (!entry) return null

              return (
                <Box
                  key={entry.key}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  {renderEntry(entry)}
                </Box>
              )
            })}
          </Box>
        </Box>
      ) : (
        <Box>
          {entries.map(entry => (
            <Fragment key={entry.key}>{renderEntry(entry)}</Fragment>
          ))}
        </Box>
      )}
    </Box>
  )
}

export default FinanceMovementFeed
