'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import ExecutiveCardShell from '@/components/greenhouse/ExecutiveCardShell'
import StuckAssetsDrawer from '@/components/agency/StuckAssetsDrawer'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import { GH_AGENCY } from '@/lib/copy/agency'
import type { SpaceMetricSnapshot, MetricValue } from '@/lib/ico-engine/read-metrics'
import { THRESHOLD_ZONE_COLOR, type ThresholdZone } from '@/lib/ico-engine/metric-registry'
import { AgencyMetricStatusChip, getAgencyMetricUiState } from './metric-trust'
import { getMetric } from './IcoGlobalKpis'

import tableStyles from '@core/styles/table.module.css'

// ─── Types ─────────────────────────────────────────────────────────────────

type Props = {
  spaces: SpaceMetricSnapshot[]
}

/** Flat row model for TanStack table — one per space */
type ScorecardRow = {
  spaceId: string
  clientName: string
  totalTasks: number
  activeTasks: number
  trustSummaryMetric: MetricValue | null
  rpa: MetricValue | undefined
  otd: MetricValue | undefined
  ftr: MetricValue | undefined
  throughput: MetricValue | undefined
  cycle: MetricValue | undefined
  stuck: MetricValue | undefined
  overallZone: ThresholdZone
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const formatMetric = (m: MetricValue | undefined, unit: 'number' | 'pct' | 'days'): string => {
  if (!m || m.value === null) return '—'

  if (unit === 'pct') return `${Math.round(m.value)}%`
  if (unit === 'days') return `${m.value.toFixed(1)}d`

  return m.value % 1 === 0 ? String(m.value) : m.value.toFixed(2)
}

const zoneColor = (zone: ThresholdZone | null) =>
  zone ? THRESHOLD_ZONE_COLOR[zone] : ('secondary' as const)

const ZONE_LABEL: Record<ThresholdZone, string> = {
  optimal: 'Óptimo',
  attention: 'Atención',
  critical: 'Crítico'
}

const ZONE_ORDER: Record<ThresholdZone, number> = {
  critical: 0,
  attention: 1,
  optimal: 2
}

const getOverallZone = (snapshot: SpaceMetricSnapshot): ThresholdZone => {
  const zones = snapshot.metrics
    .map(m => m.zone)
    .filter((z): z is ThresholdZone => z !== null)

  if (zones.includes('critical')) return 'critical'
  if (zones.includes('attention')) return 'attention'

  return 'optimal'
}

const getTrustSummaryMetric = (snapshot: SpaceMetricSnapshot): MetricValue | null =>
  snapshot.metrics.find(metric => getAgencyMetricUiState(metric) === 'unavailable')
  ?? snapshot.metrics.find(metric => getAgencyMetricUiState(metric) === 'degraded')
  ?? snapshot.metrics.find(metric => getAgencyMetricUiState(metric) === 'valid')
  ?? null

/** Build a flat row from a SpaceMetricSnapshot */
const toRow = (snapshot: SpaceMetricSnapshot): ScorecardRow => ({
  spaceId: snapshot.spaceId,
  clientName: snapshot.clientName || snapshot.spaceId,
  totalTasks: snapshot.context.totalTasks,
  activeTasks: snapshot.context.activeTasks,
  trustSummaryMetric: getTrustSummaryMetric(snapshot),
  rpa: getMetric(snapshot, 'rpa'),
  otd: getMetric(snapshot, 'otd_pct'),
  ftr: getMetric(snapshot, 'ftr_pct'),
  throughput: getMetric(snapshot, 'throughput'),
  cycle: getMetric(snapshot, 'cycle_time'),
  stuck: getMetric(snapshot, 'stuck_assets'),
  overallZone: getOverallZone(snapshot)
})

// ─── Zone Dot with Tooltip ─────────────────────────────────────────────────

const ZoneDot = ({ zone }: { zone: ThresholdZone | null }) => {
  if (!zone) return null

  const color =
    zone === 'optimal'
      ? GH_COLORS.semaphore.green.source
      : zone === 'attention'
        ? GH_COLORS.semaphore.yellow.source
        : GH_COLORS.semaphore.red.source

  return (
    <Tooltip title={ZONE_LABEL[zone]} arrow placement='top'>
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: color,
          flexShrink: 0
        }}
      />
    </Tooltip>
  )
}

// ─── Column definitions ────────────────────────────────────────────────────

const columnHelper = createColumnHelper<ScorecardRow>()

const buildColumns = (onStuckClick: (spaceId: string) => void) => [
  // Space
  columnHelper.accessor('clientName', {
    header: GH_AGENCY.ico_col_space,
    enableSorting: true,
    cell: ({ row }) => (
      <Stack sx={{ minWidth: 0 }}>
        <Stack direction='row' spacing={0.75} alignItems='center' flexWrap='wrap'>
          <Typography variant='body2' noWrap sx={{ fontWeight: 600, color: t => t.palette.customColors.midnight }}>
            {row.original.clientName}
          </Typography>
          <AgencyMetricStatusChip metric={row.original.trustSummaryMetric} />
        </Stack>
        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
          {row.original.totalTasks} tareas · {row.original.activeTasks} activas
        </Typography>
      </Stack>
    )
  }),

  // RpA
  columnHelper.display({
    id: 'rpa',
    header: GH_AGENCY.ico_col_rpa,
    enableSorting: true,
    sortingFn: (a, b) => {
      const va = a.original.rpa?.value ?? -Infinity
      const vb = b.original.rpa?.value ?? -Infinity

      return va - vb
    },
    cell: ({ row }) => (
      <Stack direction='row' spacing={0.5} alignItems='center' justifyContent='flex-end'>
        <ZoneDot zone={row.original.rpa?.zone ?? null} />
        <Typography variant='body2' sx={{ color: t => t.palette.customColors.midnight, fontWeight: 500 }}>
          {formatMetric(row.original.rpa, 'number')}
        </Typography>
      </Stack>
    )
  }),

  // OTD%
  columnHelper.display({
    id: 'otd',
    header: GH_AGENCY.ico_col_otd,
    enableSorting: true,
    sortingFn: (a, b) => {
      const va = a.original.otd?.value ?? -Infinity
      const vb = b.original.otd?.value ?? -Infinity

      return va - vb
    },
    cell: ({ row }) => (
      <Stack direction='row' spacing={0.5} alignItems='center' justifyContent='flex-end'>
        <ZoneDot zone={row.original.otd?.zone ?? null} />
        <Typography variant='body2' sx={{ color: t => t.palette.customColors.midnight, fontWeight: 500 }}>
          {formatMetric(row.original.otd, 'pct')}
        </Typography>
      </Stack>
    )
  }),

  // FTR%
  columnHelper.display({
    id: 'ftr',
    header: GH_AGENCY.ico_col_ftr,
    enableSorting: true,
    sortingFn: (a, b) => {
      const va = a.original.ftr?.value ?? -Infinity
      const vb = b.original.ftr?.value ?? -Infinity

      return va - vb
    },
    cell: ({ row }) => (
      <Stack direction='row' spacing={0.5} alignItems='center' justifyContent='flex-end'>
        <ZoneDot zone={row.original.ftr?.zone ?? null} />
        <Typography variant='body2' sx={{ color: t => t.palette.customColors.midnight, fontWeight: 500 }}>
          {formatMetric(row.original.ftr, 'pct')}
        </Typography>
      </Stack>
    )
  }),

  // Throughput
  columnHelper.display({
    id: 'throughput',
    header: GH_AGENCY.ico_col_throughput,
    enableSorting: true,
    sortingFn: (a, b) => {
      const va = a.original.throughput?.value ?? -Infinity
      const vb = b.original.throughput?.value ?? -Infinity

      return va - vb
    },
    cell: ({ row }) => (
      <Typography variant='body2' sx={{ color: t => t.palette.customColors.midnight, fontWeight: 500, textAlign: 'end' }}>
        {formatMetric(row.original.throughput, 'number')}
      </Typography>
    )
  }),

  // Cycle (days)
  columnHelper.display({
    id: 'cycle',
    header: GH_AGENCY.ico_col_cycle,
    enableSorting: true,
    sortingFn: (a, b) => {
      const va = a.original.cycle?.value ?? -Infinity
      const vb = b.original.cycle?.value ?? -Infinity

      return va - vb
    },
    cell: ({ row }) => (
      <Typography variant='body2' sx={{ color: t => t.palette.customColors.midnight, fontWeight: 500, textAlign: 'end' }}>
        {formatMetric(row.original.cycle, 'days')}
      </Typography>
    )
  }),

  // Stuck
  columnHelper.display({
    id: 'stuck',
    header: GH_AGENCY.ico_col_stuck,
    enableSorting: true,
    sortingFn: (a, b) => {
      const va = a.original.stuck?.value ?? 0
      const vb = b.original.stuck?.value ?? 0

      return va - vb
    },
    cell: ({ row }) => {
      const stuckCount = row.original.stuck?.value ?? 0

      if (stuckCount > 0) {
        return (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <CustomChip
              round='true'
              size='small'
              color='error'
              variant='tonal'
              label={String(stuckCount)}
              onClick={() => onStuckClick(row.original.spaceId)}
              aria-label={`Ver ${stuckCount} activos estancados de ${row.original.spaceId}`}
              sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}
            />
          </Box>
        )
      }

      return (
        <Typography variant='body2' sx={{ color: t => t.palette.customColors.midnight, fontWeight: 500, textAlign: 'end' }}>
          {formatMetric(row.original.stuck, 'number')}
        </Typography>
      )
    }
  }),

  // Zone (overall)
  columnHelper.accessor('overallZone', {
    header: GH_AGENCY.ico_col_zone,
    enableSorting: true,
    sortingFn: (a, b) => {
      const za = ZONE_ORDER[a.original.overallZone]
      const zb = ZONE_ORDER[b.original.overallZone]

      if (za !== zb) return za - zb

      return a.original.clientName.localeCompare(b.original.clientName)
    },
    cell: ({ row }) => (
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <CustomChip
          round='true'
          size='small'
          color={zoneColor(row.original.overallZone)}
          variant='tonal'
          label={ZONE_LABEL[row.original.overallZone]}
          sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
        />
      </Box>
    )
  })
]

// ─── Alignment map for header/body cells ───────────────────────────────────

const COLUMN_ALIGN: Record<string, 'left' | 'right' | 'center'> = {
  clientName: 'left',
  rpa: 'right',
  otd: 'right',
  ftr: 'right',
  throughput: 'right',
  cycle: 'right',
  stuck: 'right',
  overallZone: 'center'
}

// ─── Component ─────────────────────────────────────────────────────────────

const SpaceIcoScorecard = ({ spaces }: Props) => {
  const [drawerSpaceId, setDrawerSpaceId] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'overallZone', desc: false }])

  const rows = useMemo(() => spaces.map(toRow), [spaces])

  const columns = useMemo(() => buildColumns(spaceId => setDrawerSpaceId(spaceId)), [])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  if (spaces.length === 0) return null

  return (
    <>
      <ExecutiveCardShell title='Scorecard por Space' subtitle='Métricas ICO por Space, ordenadas por estado de salud'>
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    const sorted = header.column.getIsSorted()
                    const align = COLUMN_ALIGN[header.id] ?? 'left'

                    return (
                      <th
                        key={header.id}
                        scope='col'
                        align={align}
                        aria-sort={
                          sorted === 'asc'
                            ? 'ascending'
                            : sorted === 'desc'
                              ? 'descending'
                              : header.column.getCanSort()
                                ? 'none'
                                : undefined
                        }
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 1,
                          backgroundColor: 'var(--mui-palette-background-paper)'
                        }}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={classnames({
                              'flex items-center gap-2': sorted,
                              'cursor-pointer select-none': header.column.getCanSort()
                            })}
                            style={{
                              justifyContent:
                                align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: <i className='tabler-chevron-up text-xl' aria-hidden='true' />,
                              desc: <i className='tabler-chevron-down text-xl' aria-hidden='true' />
                            }[sorted as 'asc' | 'desc'] ?? null}
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            {table.getRowModel().rows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                    Sin datos de Spaces
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} style={{ cursor: 'default' }}>
                    {row.getVisibleCells().map(cell => {
                      const align = COLUMN_ALIGN[cell.column.id] ?? 'left'

                      return (
                        <td key={cell.id} align={align}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </ExecutiveCardShell>

      {/* Stuck Assets Drawer */}
      <StuckAssetsDrawer
        open={drawerSpaceId !== null}
        spaceId={drawerSpaceId ?? ''}
        onClose={() => setDrawerSpaceId(null)}
      />
    </>
  )
}

export default SpaceIcoScorecard
