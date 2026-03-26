'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
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

// ── Types ──

interface CapacityBreakdown {
  contractedHoursMonth: number
  assignedHoursMonth: number
  usedHoursMonth: number
  availableHoursMonth: number
  overcommitted: boolean
}

interface TeamMember {
  memberId: string
  displayName: string
  roleTitle: string | null
  fteAllocation: number
  capacityHealth: string
  capacity: CapacityBreakdown
}

interface TeamData {
  team: CapacityBreakdown
  members: TeamMember[]
  memberCount: number
  overcommittedCount: number
  overcommittedMembers: Array<{ displayName: string; deficit: number }>
}

// ── Constants ──

const HEALTH_COLORS: Record<string, 'secondary' | 'success' | 'warning' | 'error'> = {
  idle: 'secondary', balanced: 'success', high: 'warning', overloaded: 'error'
}

const HEALTH_LABELS: Record<string, string> = {
  idle: 'Disponible', balanced: 'Balanceado', high: 'Alta carga', overloaded: 'Sobrecargado'
}

// ── Table columns ──

const columnHelper = createColumnHelper<TeamMember>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columns: ColumnDef<TeamMember, any>[] = [
  columnHelper.accessor('displayName', {
    header: 'Nombre',
    cell: ({ getValue }) => <Typography variant='body2' fontWeight={600}>{getValue()}</Typography>
  }),
  columnHelper.accessor('roleTitle', {
    header: 'Rol',
    cell: ({ getValue }) => <Typography variant='caption' color='text.secondary'>{getValue() || '—'}</Typography>
  }),
  columnHelper.accessor('fteAllocation', {
    header: 'FTE',
    cell: ({ getValue }) => getValue().toFixed(1),
    meta: { align: 'right' }
  }),
  columnHelper.accessor(row => row.capacity.contractedHoursMonth, {
    id: 'contracted',
    header: 'Contratadas',
    cell: ({ getValue }) => `${getValue()}h`,
    meta: { align: 'right' }
  }),
  columnHelper.accessor(row => row.capacity.assignedHoursMonth, {
    id: 'assigned',
    header: 'Asignadas',
    cell: ({ getValue }) => `${getValue()}h`,
    meta: { align: 'right' }
  }),
  columnHelper.accessor(row => row.capacity.usedHoursMonth, {
    id: 'used',
    header: 'Usadas',
    cell: ({ getValue }) => `${getValue()}h`,
    meta: { align: 'right' }
  }),
  columnHelper.accessor(row => row.capacity.availableHoursMonth, {
    id: 'available',
    header: 'Disponibles',
    cell: ({ getValue }) => {
      const v = getValue() as number

      return <Typography color={v < 0 ? 'error.main' : 'text.primary'}>{v}h</Typography>
    },
    meta: { align: 'right' }
  }),
  columnHelper.accessor('capacityHealth', {
    header: 'Estado',
    cell: ({ getValue }) => {
      const h = getValue()

      return <CustomChip round='true' size='small' variant='tonal' color={HEALTH_COLORS[h] || 'secondary'} label={HEALTH_LABELS[h] || h} />
    },
    meta: { align: 'center' }
  })
]

// ── Component ──

const AgencyTeamView = () => {
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'displayName', desc: false }])

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/team/capacity-breakdown')

      if (res.ok) setData(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const members = useMemo(() => data?.members ?? [], [data])

  const table = useReactTable({
    data: members,
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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  if (!data) return <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}><Box sx={{ textAlign: 'center', py: 6 }}><Typography variant='h6'>Sin datos de capacidad</Typography></Box></Card>

  const healthCounts = data.members.reduce((acc, m) => { acc[m.capacityHealth] = (acc[m.capacityHealth] || 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Equipo' subheader={`${data.memberCount} personas · Capacidad 4 tipos`} avatar={<Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}><i className='tabler-users-group' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} /></Avatar>} />
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Contratadas' stats={`${data.team.contractedHoursMonth}h`} avatarIcon='tabler-file-certificate' avatarColor='primary' subtitle='Horas contrato/mes' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Asignadas' stats={`${data.team.assignedHoursMonth}h`} avatarIcon='tabler-clock' avatarColor='info' subtitle='FTE comprometido' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Usadas' stats={`${data.team.usedHoursMonth}h`} avatarIcon='tabler-bolt' avatarColor='warning' subtitle='Horas efectivas' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Disponibles' stats={`${data.team.availableHoursMonth}h`} avatarIcon='tabler-calendar-stats' avatarColor={data.team.availableHoursMonth < 0 ? 'error' : 'success'} subtitle={data.team.overcommitted ? 'Sobrecomprometido' : 'Capacidad libre'} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {['idle', 'balanced', 'high', 'overloaded'].map(h => (
            <CustomChip key={h} round='true' variant='tonal' color={HEALTH_COLORS[h]} label={`${HEALTH_LABELS[h]}: ${healthCounts[h] || 0}`} />
          ))}
        </Box>
      </Grid>

      {data.overcommittedCount > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error' variant='outlined'>
            <strong>{data.overcommittedCount} sobrecargado{data.overcommittedCount !== 1 ? 's' : ''}:</strong>{' '}
            {data.overcommittedMembers.map(m => `${m.displayName} (${m.deficit}h)`).join(', ')}
          </Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Detalle por persona' />
          <Divider />
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
            <CustomTextField
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder='Buscar por nombre o rol…'
              sx={{ minWidth: 250 }}
            />
            <Typography variant='caption' color='text.secondary' sx={{ alignSelf: 'center' }}>
              {table.getFilteredRowModel().rows.length} de {data.memberCount} miembros
            </Typography>
          </CardContent>
          <div className='overflow-x-auto'>
            <table className={tableStyles.table}>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })}
                        style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' ↑',
                          desc: ' ↓'
                        }[header.column.getIsSorted() as string] ?? null}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                      <Typography variant='body2' color='text.secondary'>Sin resultados</Typography>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id} className={classnames({ 'hover:bg-actionHover': true })}>
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePaginationComponent table={table as ReturnType<typeof useReactTable>} />
        </Card>
      </Grid>
    </Grid>
  )
}

export default AgencyTeamView
