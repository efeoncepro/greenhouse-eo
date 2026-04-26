'use client'

import { useCallback, useEffect, useState } from 'react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import TablePaginationComponent from '@components/TablePaginationComponent'
import { fuzzyFilter } from '@/components/tableUtils'

import tableStyles from '@core/styles/table.module.css'

// ── Types ──

interface ReviewItem {
  taskId: string
  taskName: string
  projectId: string
  projectName: string
  status: string
  phase: string
  assigneeName: string | null
  assigneeRole: string | null
  rpa: number | null
  daysWaiting: number
  urgency: 'normal' | 'attention' | 'critical'
  pageUrl: string | null
}

interface ReviewHistory {
  taskId: string
  taskName: string
  rpa: number | null
}

interface ReviewData {
  pending: ReviewItem[]
  history: ReviewHistory[]
  stats: { total: number; urgent48h: number; critical96h: number }
}

// ── Helpers ──

const PHASE_LABELS: Record<string, string> = {
  cambios_cliente: 'Cambios solicitados',
  revision_interna: 'Revisión interna'
}

const urgencyColor = (u: string): 'secondary' | 'warning' | 'error' => {
  if (u === 'critical') return 'error'
  if (u === 'attention') return 'warning'

  return 'secondary'
}

// ── Component ──

// ── TanStack columns ──

const reviewColHelper = createColumnHelper<ReviewItem>()

 
const reviewColumns: ColumnDef<ReviewItem, any>[] = [
  reviewColHelper.accessor('taskName', { header: 'Asset', cell: ({ getValue }) => <Typography variant='body2' fontWeight={600}>{getValue()}</Typography> }),
  reviewColHelper.accessor('projectName', { header: 'Proyecto', cell: ({ getValue }) => <Typography variant='caption' color='text.secondary'>{getValue()}</Typography> }),
  reviewColHelper.accessor('assigneeName', {
    header: 'Asignado',
    cell: ({ row }) => row.original.assigneeName ? (
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography variant='body2'>{row.original.assigneeName}</Typography>
        {row.original.assigneeRole && <Typography variant='caption' color='text.disabled'>{row.original.assigneeRole}</Typography>}
      </Box>
    ) : <Typography variant='caption' color='text.disabled'>—</Typography>
  }),
  reviewColHelper.accessor('phase', {
    header: 'Estado',
    cell: ({ row }) => <CustomChip round='true' size='small' variant='tonal' color={row.original.phase === 'cambios_cliente' ? 'warning' : 'info'} label={PHASE_LABELS[row.original.phase] || row.original.status} />,
    meta: { align: 'center' }
  }),
  reviewColHelper.accessor('daysWaiting', {
    header: 'Esperando',
    cell: ({ row }) => <CustomChip round='true' size='small' variant='tonal' color={urgencyColor(row.original.urgency)} label={row.original.urgency === 'critical' ? `${row.original.daysWaiting}d — 96h+` : row.original.urgency === 'attention' ? `${row.original.daysWaiting}d — 48h+` : `${row.original.daysWaiting}d`} />,
    meta: { align: 'center' }
  }),
  reviewColHelper.accessor('pageUrl', {
    header: 'Acción',
    cell: ({ getValue }) => getValue() ? <Button size='small' variant='tonal' href={getValue()} target='_blank' rel='noopener'>Ver</Button> : <Typography variant='caption' color='text.disabled'>—</Typography>,
    enableSorting: false,
    meta: { align: 'center' }
  })
]

const historyColHelper = createColumnHelper<ReviewHistory>()

 
const historyColumns: ColumnDef<ReviewHistory, any>[] = [
  historyColHelper.accessor('taskName', { header: 'Asset' }),
  historyColHelper.accessor('rpa', {
    header: 'RPA',
    cell: ({ getValue }) => getValue() != null ? <CustomChip round='true' size='small' variant='tonal' color={getValue() <= 1.5 ? 'success' : getValue() <= 2.5 ? 'warning' : 'error'} label={getValue().toFixed(1)} /> : '—',
    meta: { align: 'right' }
  })
]

const GreenhouseReviewQueue = () => {
  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'review' | 'changes'>('all')
  const [reviewSorting, setReviewSorting] = useState<SortingState>([{ id: 'daysWaiting', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [historySorting, setHistorySorting] = useState<SortingState>([])

  const fetchData = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/reviews/queue?history=true')

      if (res.ok) setData(await res.json())
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  const filtered = data?.pending.filter(r => {
    if (filter === 'review') return r.phase === 'revision_interna' || r.status.includes('revis')
    if (filter === 'changes') return r.phase === 'cambios_cliente'

    return true
  }) ?? []

  const reviewTable = useReactTable({
    data: filtered,
    columns: reviewColumns,
    state: { sorting: reviewSorting, globalFilter },
    onSortingChange: setReviewSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  const historyTable = useReactTable({
    data: data?.history ?? [],
    columns: historyColumns,
    state: { sorting: historySorting },
    onSortingChange: setHistorySorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Revisiones'
            subheader='Items que necesitan tu aprobación o feedback'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                <i className='tabler-clipboard-check' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
              </Avatar>
            }
          />
        </Card>
      </Grid>

      {/* Urgency banners */}
      {data && data.stats.critical96h > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error' variant='filled'>
            <strong>{data.stats.critical96h} item{data.stats.critical96h !== 1 ? 's' : ''}</strong> lleva{data.stats.critical96h !== 1 ? 'n' : ''} más de 96h esperando revisión
          </Alert>
        </Grid>
      )}
      {data && data.stats.urgent48h > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='warning' variant='outlined'>
            {data.stats.urgent48h} item{data.stats.urgent48h !== 1 ? 's' : ''} lleva{data.stats.urgent48h !== 1 ? 'n' : ''} más de 48h esperando
          </Alert>
        </Grid>
      )}

      {/* Filter chips */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <CustomChip
            label={`Todas (${data?.stats.total ?? 0})`}
            variant={filter === 'all' ? 'filled' : 'tonal'}
            color='primary'
            onClick={() => setFilter('all')}
            sx={{ cursor: 'pointer' }}
          />
          <CustomChip
            label='Revisión abierta'
            variant={filter === 'review' ? 'filled' : 'tonal'}
            color='info'
            onClick={() => setFilter('review')}
            sx={{ cursor: 'pointer' }}
          />
          <CustomChip
            label='Cambios solicitados'
            variant={filter === 'changes' ? 'filled' : 'tonal'}
            color='warning'
            onClick={() => setFilter('changes')}
            sx={{ cursor: 'pointer' }}
          />
        </Box>
      </Grid>

      {/* Review table */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : filtered.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-checks' style={{ fontSize: 48, color: 'var(--mui-palette-success-main)' }} />
                <Typography variant='h6' sx={{ mt: 2 }}>Sin items pendientes de revisión</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Todas las entregas están al día.
                </Typography>
              </Box>
            </CardContent>
          ) : (
            <>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <CustomTextField value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} placeholder='Buscar asset…' sx={{ minWidth: 220 }} />
                <Typography variant='caption' color='text.secondary' sx={{ alignSelf: 'center' }}>{reviewTable.getFilteredRowModel().rows.length} pendientes</Typography>
              </CardContent>
              <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                  <thead>
                    {reviewTable.getHeaderGroups().map(hg => (
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
                    {reviewTable.getRowModel().rows.length === 0 ? (
                      <tr><td colSpan={reviewColumns.length} style={{ textAlign: 'center', padding: '2rem' }}><Typography variant='body2' color='text.secondary'>Sin resultados</Typography></td></tr>
                    ) : reviewTable.getRowModel().rows.map(row => (
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
              <TablePaginationComponent table={reviewTable as ReturnType<typeof useReactTable>} />
            </>
          )}
        </Card>
      </Grid>

      {/* Review history */}
      {data && data.history.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <Accordion>
              <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity', width: 32, height: 32 }}>
                    <i className='tabler-history' style={{ fontSize: 18, color: 'var(--mui-palette-success-main)' }} />
                  </Avatar>
                  <Typography variant='subtitle1'>Historial reciente ({data.history.length})</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <Divider />
                <div className='overflow-x-auto'>
                  <table className={tableStyles.table}>
                    <thead>
                      {historyTable.getHeaderGroups().map(hg => (
                        <tr key={hg.id}>
                          {hg.headers.map(header => (
                            <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })} style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : 'left' }}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {historyTable.getRowModel().rows.map(row => (
                        <tr key={row.id}>
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : 'left' }}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AccordionDetails>
            </Accordion>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default GreenhouseReviewQueue
