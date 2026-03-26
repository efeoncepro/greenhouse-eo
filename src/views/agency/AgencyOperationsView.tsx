'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import CustomerStats from '@components/card-statistics/CustomerStats'

import tableStyles from '@core/styles/table.module.css'

// ── Types ──

interface OpsKpis {
  outboxEvents24h: number
  pendingProjections: number
  notificationsSent24h: number
  activeSyncs: number
}

interface Subsystem {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  processed: number
  failed: number
  lastRun: string | null
}

interface RecentEvent {
  eventType: string
  aggregateType: string
  aggregateId: string
  occurredAt: string
  status: string
}

interface FailedProjection {
  projectionName: string
  entityType: string
  entityId: string
  failedAt: string
  errorMessage: string
}

interface OpsData {
  kpis: OpsKpis
  subsystems: Subsystem[]
  recentEvents: RecentEvent[]
  failedProjections: FailedProjection[]
}

// ── Helpers ──

const statusColor = (s: string): 'success' | 'warning' | 'error' | 'secondary' => {
  if (s === 'healthy' || s === 'processed') return 'success'
  if (s === 'degraded' || s === 'pending') return 'warning'
  if (s === 'not_configured') return 'secondary'

  return 'error'
}

const statusLabel = (s: string): string => {
  if (s === 'healthy') return 'Saludable'
  if (s === 'degraded') return 'Degradado'
  if (s === 'down') return 'Caído'
  if (s === 'not_configured') return 'No configurado'
  if (s === 'processed') return 'Procesado'
  if (s === 'pending') return 'Pendiente'
  if (s === 'failed') return 'Fallido'

  return s
}

const timeAgo = (iso: string | null): string => {
  if (!iso) return 'Nunca'

  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60_000)

  if (mins < 1) return 'Ahora'
  if (mins < 60) return `hace ${mins}m`

  const hrs = Math.floor(mins / 60)

  if (hrs < 24) return `hace ${hrs}h`

  const days = Math.floor(hrs / 24)

  return `hace ${days}d`
}

const subsystemIcon = (name: string): string => {
  const map: Record<string, string> = {
    Outbox: 'tabler-send',
    Proyecciones: 'tabler-refresh',
    Notificaciones: 'tabler-bell',
    'Notion Sync': 'tabler-brand-notion',
    'Services Sync': 'tabler-cloud-download',
    'ICO Sync': 'tabler-cpu'
  }

  return map[name] || 'tabler-server'
}

// ── TanStack columns ──

const eventColumnHelper = createColumnHelper<RecentEvent>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eventColumns: ColumnDef<RecentEvent, any>[] = [
  eventColumnHelper.accessor('eventType', {
    header: 'Tipo',
    cell: ({ getValue }) => <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{getValue()}</Typography>
  }),
  {
    id: 'aggregate',
    header: 'Agregado',
    accessorFn: (row: RecentEvent) => `${row.aggregateType}:${row.aggregateId}`,
    cell: ({ row }: { row: { original: RecentEvent } }) => <Typography variant='body2' color='text.secondary'>{row.original.aggregateType}:{row.original.aggregateId.slice(0, 12)}</Typography>
  },
  eventColumnHelper.accessor('occurredAt', {
    header: 'Hora',
    cell: ({ getValue }) => <Typography variant='caption' color='text.secondary'>{timeAgo(getValue())}</Typography>
  }),
  eventColumnHelper.accessor('status', {
    header: 'Estado',
    cell: ({ getValue }) => <CustomChip round='true' size='small' variant='tonal' color={statusColor(getValue())} label={statusLabel(getValue())} />,
    meta: { align: 'center' }
  })
]

const projColumnHelper = createColumnHelper<FailedProjection>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const projColumns: ColumnDef<FailedProjection, any>[] = [
  projColumnHelper.accessor('projectionName', {
    header: 'Proyección',
    cell: ({ getValue }) => <Typography variant='body2' fontWeight={600}>{getValue()}</Typography>
  }),
  {
    id: 'entity',
    header: 'Entidad',
    accessorFn: (row: FailedProjection) => `${row.entityType}:${row.entityId}`,
    cell: ({ row }: { row: { original: FailedProjection } }) => <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.original.entityType}:{row.original.entityId.slice(0, 12)}</Typography>
  },
  projColumnHelper.accessor('failedAt', {
    header: 'Hora',
    cell: ({ getValue }) => <Typography variant='caption' color='text.secondary'>{timeAgo(getValue())}</Typography>
  }),
  projColumnHelper.accessor('errorMessage', {
    header: 'Error',
    cell: ({ getValue }) => <Typography variant='body2' color='error.main' sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getValue().length > 80 ? `${getValue().slice(0, 80)}…` : getValue()}</Typography>
  })
]

// ── Component ──

const AgencyOperationsView = () => {
  const [data, setData] = useState<OpsData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/agency/operations')

      if (res.ok) setData(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const [eventSorting, setEventSorting] = useState<SortingState>([])
  const [projSorting, setProjSorting] = useState<SortingState>([])

  const eventTable = useReactTable({
    data: data?.recentEvents ?? [],
    columns: eventColumns,
    state: { sorting: eventSorting },
    onSortingChange: setEventSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  const projTable = useReactTable({
    data: data?.failedProjections ?? [],
    columns: projColumns,
    state: { sorting: projSorting },
    onSortingChange: setProjSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  const kpis = data?.kpis ?? { outboxEvents24h: 0, pendingProjections: 0, notificationsSent24h: 0, activeSyncs: 0 }
  const subsystems = data?.subsystems ?? []
  const events = data?.recentEvents ?? []
  const failed = data?.failedProjections ?? []

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Operaciones'
            subheader='Salud del platform y subsistemas'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}><i className='tabler-server' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} /></Avatar>}
          />
        </Card>
      </Grid>

      {/* KPIs */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Eventos outbox' stats={String(kpis.outboxEvents24h)} avatarIcon='tabler-send' avatarColor='primary' subtitle='Últimas 24 horas' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Proyecciones pendientes' stats={String(kpis.pendingProjections)} avatarIcon='tabler-refresh' avatarColor={kpis.pendingProjections > 0 ? 'warning' : 'success'} subtitle={kpis.pendingProjections > 0 ? 'En cola' : 'Todo procesado'} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Notificaciones' stats={String(kpis.notificationsSent24h)} avatarIcon='tabler-bell-ringing' avatarColor='info' subtitle='Enviadas últimas 24h' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Syncs activos' stats={String(kpis.activeSyncs)} avatarIcon='tabler-plug-connected' avatarColor='success' subtitle='Fuentes configuradas' />
      </Grid>

      {/* Subsystem Health Grid */}
      {subsystems.map(s => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.name}>
          <CustomerStats
            title={s.name}
            avatarIcon={subsystemIcon(s.name)}
            color={statusColor(s.status)}
            description={s.lastRun ? `Última ejecución: ${timeAgo(s.lastRun)}` : `${s.processed} procesados, ${s.failed} fallidos`}
            chipLabel={statusLabel(s.status)}
          />
        </Grid>
      ))}

      {/* Recent Events Table */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Últimos eventos'
            subheader={`${events.length} eventos recientes del outbox`}
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}><i className='tabler-list' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} /></Avatar>}
          />
          <Divider />
          {events.length === 0 ? (
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant='body2' color='text.secondary'>Sin eventos recientes</Typography>
            </CardContent>
          ) : (
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {eventTable.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(header => (
                        <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })} style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {eventTable.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Grid>

      {/* Failed Projections Alert */}
      {failed.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, borderLeft: '4px solid', borderLeftColor: 'error.main' }}>
            <CardHeader
              title='Proyecciones fallidas'
              subheader={`${failed.length} proyecciones con errores`}
              avatar={<Avatar variant='rounded' sx={{ bgcolor: 'error.lightOpacity' }}><i className='tabler-alert-triangle' style={{ fontSize: 22, color: 'var(--mui-palette-error-main)' }} /></Avatar>}
            />
            <Divider />
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {projTable.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(header => (
                        <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {projTable.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default AgencyOperationsView
