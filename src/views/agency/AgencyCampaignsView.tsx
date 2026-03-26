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
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import TablePaginationComponent from '@components/TablePaginationComponent'
import { fuzzyFilter } from '@/components/tableUtils'

import tableStyles from '@core/styles/table.module.css'

interface CampaignItem {
  campaignId: string
  eoId: string
  displayName: string
  campaignType: string
  status: string
  plannedStartDate: string | null
  plannedEndDate: string | null
  projectCount: number
  budgetClp: number | null
  spaceId: string
}

const STATUS_COLORS: Record<string, 'secondary' | 'info' | 'success' | 'warning' | 'primary'> = {
  draft: 'secondary', planning: 'info', active: 'success', paused: 'warning', completed: 'primary', archived: 'secondary'
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', planning: 'Planificación', active: 'Activa', paused: 'Pausada', completed: 'Completada', archived: 'Archivada'
}

const TYPE_LABELS: Record<string, string> = {
  campaign: 'Campaña', launch: 'Lanzamiento', seasonal: 'Temporada', sprint_group: 'Grupo de ciclos', always_on: 'Always-on'
}

const TYPE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'secondary'> = {
  campaign: 'primary', launch: 'success', seasonal: 'warning', sprint_group: 'info', always_on: 'secondary'
}

const fmtClp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

const formatDate = (d: string | null) => {
  if (!d) return '—'

  return new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

// ── Table columns ──

const columnHelper = createColumnHelper<CampaignItem>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columns: ColumnDef<CampaignItem, any>[] = [
  columnHelper.accessor('displayName', {
    header: 'Campaña',
    cell: ({ row }) => (
      <>
        <Typography variant='body2' fontWeight={600}>{row.original.displayName}</Typography>
        <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} color='text.disabled'>{row.original.eoId}</Typography>
      </>
    )
  }),
  columnHelper.accessor('campaignType', {
    header: 'Tipo',
    cell: ({ getValue }) => {
      const v = getValue()

      return <CustomChip round='true' size='small' variant='tonal' color={TYPE_COLORS[v] || 'secondary'} label={TYPE_LABELS[v] || v} />
    },
    meta: { align: 'center' }
  }),
  columnHelper.accessor('status', {
    header: 'Estado',
    cell: ({ getValue }) => {
      const v = getValue()

      return <CustomChip round='true' size='small' variant='tonal' color={STATUS_COLORS[v] || 'secondary'} label={STATUS_LABELS[v] || v} />
    },
    meta: { align: 'center' }
  }),
  columnHelper.accessor('plannedStartDate', {
    header: 'Fechas',
    cell: ({ row }) => (
      <Typography variant='caption' color='text.secondary'>
        {formatDate(row.original.plannedStartDate)} — {formatDate(row.original.plannedEndDate)}
      </Typography>
    )
  }),
  columnHelper.accessor('projectCount', {
    header: 'Proyectos',
    cell: ({ getValue }) => getValue(),
    meta: { align: 'right' }
  }),
  columnHelper.accessor('budgetClp', {
    header: 'Budget',
    cell: ({ getValue }) => {
      const v = getValue() as number | null

      return v ? fmtClp(v) : '—'
    },
    meta: { align: 'right' }
  })
]

// ── Component ──

const AgencyCampaignsView = () => {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'displayName', desc: false }])

  const table = useReactTable({
    data: campaigns,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  const load = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/campaigns')

      if (res.ok) {
        const data = await res.json()

        setCampaigns(data.items ?? [])
      } else {
        const data = await res.json().catch(() => null)

        setCampaigns([])
        setErrorMessage(typeof data?.error === 'string' ? data.error : 'No pudimos cargar las campañas.')
      }
    } catch {
      setCampaigns([])
      setErrorMessage('No pudimos cargar las campañas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  const active = campaigns.filter(c => c.status === 'active').length
  const completed = campaigns.filter(c => c.status === 'completed').length
  const avgProjects = campaigns.length > 0 ? Math.round(campaigns.reduce((s, c) => s + c.projectCount, 0) / campaigns.length) : 0
  const totalBudget = campaigns.reduce((s, c) => s + (c.budgetClp ?? 0), 0)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Campañas' subheader='Iniciativas cross-space' avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-speakerphone' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} /></Avatar>} />
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Total' stats={String(campaigns.length)} avatarIcon='tabler-flag' avatarColor='primary' subtitle='Campañas registradas' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Activas' stats={String(active)} avatarIcon='tabler-flame' avatarColor='success' subtitle='En ejecución' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Completadas' stats={String(completed)} avatarIcon='tabler-check' avatarColor='info' subtitle='Finalizadas' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Budget total' stats={totalBudget > 0 ? fmtClp(totalBudget) : '—'} avatarIcon='tabler-cash' avatarColor='warning' subtitle={`Avg ${avgProjects} proyectos`} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Listado de campañas' />
          <Divider />
          {errorMessage ? (
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant='h6'>No pudimos cargar campañas</Typography>
              <Typography variant='body2' color='text.secondary'>{errorMessage}</Typography>
            </CardContent>
          ) : campaigns.length === 0 ? (
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant='h6'>Sin campañas registradas</Typography>
            </CardContent>
          ) : (
            <>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                <CustomTextField value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} placeholder='Buscar campaña…' sx={{ minWidth: 250 }} />
                <Typography variant='caption' color='text.secondary' sx={{ alignSelf: 'center' }}>{table.getFilteredRowModel().rows.length} de {campaigns.length}</Typography>
              </CardContent>
              <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                  <thead>
                    {table.getHeaderGroups().map(hg => (
                      <tr key={hg.id}>
                        {hg.headers.map(header => (
                          <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })} style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.length === 0 ? (
                      <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}><Typography variant='body2' color='text.secondary'>Sin resultados</Typography></td></tr>
                    ) : table.getRowModel().rows.map(row => (
                      <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePaginationComponent table={table as ReturnType<typeof useReactTable>} />
            </>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

export default AgencyCampaignsView
